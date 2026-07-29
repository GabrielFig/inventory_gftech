import uuid

import pytest
from sqlalchemy import select

from app.models.sale import Sale
from app.models.stock_movement import MovementType, StockMovement


@pytest.fixture
async def test_sale(db_session, test_product, admin_user):
    sale = Sale(
        product_id=test_product.id,
        sold_by_id=admin_user.id,
        quantity=2,
        unit_price=test_product.sale_price,
        unit_cost=test_product.cost,
        notes=None,
    )
    test_product.sold_count += 2
    db_session.add(sale)
    await db_session.commit()
    await db_session.refresh(sale)
    await db_session.refresh(test_product)
    return sale


async def test_update_sale_quantity_adjusts_stock(client, admin_headers, test_sale, test_product):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 4},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["quantity"] == 4

    product_response = await client.get(f"/api/v1/products/{test_product.id}", headers=admin_headers)
    # sold_count: 2 (venta original) + 2 (delta del ajuste) = 4; stock inicial 10 -> current_stock 6
    assert product_response.json()["current_stock"] == 6


async def test_update_sale_records_who_made_the_change(
    client, db_session, admin_headers, admin_user, test_sale, test_product
):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 4},
        headers=admin_headers,
    )
    assert response.status_code == 200

    movement = (
        await db_session.execute(
            select(StockMovement)
            .where(
                StockMovement.product_id == test_product.id,
                StockMovement.type == MovementType.ADJUSTMENT,
            )
            .order_by(StockMovement.created_at.desc())
        )
    ).scalars().first()
    assert movement is not None
    assert movement.created_by_id == admin_user.id


async def test_update_sale_insufficient_stock_returns_400(client, admin_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 999},
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Stock insuficiente" in response.json()["detail"]


async def test_update_sale_price_and_notes_only(client, admin_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"unit_price": 99.99, "notes": "corrección de precio"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["unit_price"] == "99.99"
    assert body["notes"] == "corrección de precio"
    assert body["quantity"] == 2  # sin cambios


async def test_update_sale_forbidden_for_vendedor(client, vendedor_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 3},
        headers=vendedor_headers,
    )
    assert response.status_code == 403


async def test_update_sale_not_found_returns_404(client, admin_headers):
    response = await client.patch(
        f"/api/v1/sales/{uuid.uuid4()}",
        json={"quantity": 1},
        headers=admin_headers,
    )
    assert response.status_code == 404


async def test_delete_sale_restores_stock(client, admin_headers, test_sale, test_product):
    response = await client.delete(f"/api/v1/sales/{test_sale.id}", headers=admin_headers)
    assert response.status_code == 204

    product_response = await client.get(f"/api/v1/products/{test_product.id}", headers=admin_headers)
    assert product_response.json()["current_stock"] == test_product.initial_stock

    sales_response = await client.get("/api/v1/sales", headers=admin_headers)
    assert sales_response.json()["total"] == 0


async def test_delete_sale_records_who_made_the_change(
    client, db_session, admin_headers, admin_user, test_sale, test_product
):
    response = await client.delete(f"/api/v1/sales/{test_sale.id}", headers=admin_headers)
    assert response.status_code == 204

    movement = (
        await db_session.execute(
            select(StockMovement)
            .where(
                StockMovement.product_id == test_product.id,
                StockMovement.type == MovementType.ADJUSTMENT,
            )
            .order_by(StockMovement.created_at.desc())
        )
    ).scalars().first()
    assert movement is not None
    assert movement.created_by_id == admin_user.id


async def test_delete_sale_forbidden_for_vendedor(client, vendedor_headers, test_sale):
    response = await client.delete(f"/api/v1/sales/{test_sale.id}", headers=vendedor_headers)
    assert response.status_code == 403


async def test_delete_sale_not_found_returns_404(client, admin_headers):
    response = await client.delete(f"/api/v1/sales/{uuid.uuid4()}", headers=admin_headers)
    assert response.status_code == 404
