from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.product import Product
from app.models.sale import Sale
from app.models.stock_movement import MovementType, StockMovement


@pytest.fixture
async def second_product(db_session, test_product) -> Product:
    product = Product(
        code="TEST-002",
        supplier_id=test_product.supplier_id,
        category_id=test_product.category_id,
        name="Segundo producto",
        model_compatibility="Modelo Y",
        cost=5,
        sale_price=12,
        initial_stock=4,
        sold_count=0,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product


def _utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


AUG_24_NOON_MX = datetime(2026, 8, 24, 18, 0, tzinfo=timezone.utc)  # 12:00 en UTC-6


async def _stock(client, headers, product_id) -> int:
    response = await client.get(f"/api/v1/products/{product_id}", headers=headers)
    return response.json()["current_stock"]


async def test_batch_creates_one_sale_per_item_sharing_a_ticket(
    client, admin_headers, test_product, second_product
):
    response = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 2},
                {"product_id": str(second_product.id), "quantity": 1, "unit_price": "15.00"},
            ],
            "notes": "Cliente de mostrador",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert len(body["items"]) == 2
    assert {item["ticket_id"] for item in body["items"]} == {body["ticket_id"]}
    assert len({item["sale_date"] for item in body["items"]}) == 1
    assert all(item["notes"] == "Cliente de mostrador" for item in body["items"])
    # 2 × 20 (precio del producto) + 1 × 15 (precio editado)
    assert body["total"] == "55.00"
    # ganancia: 2 × (20 − 10) + 1 × (15 − 5)
    assert body["profit"] == "30.00"

    assert await _stock(client, admin_headers, test_product.id) == 8
    assert await _stock(client, admin_headers, second_product.id) == 3


async def test_batch_is_all_or_nothing_when_one_item_lacks_stock(
    client, db_session, admin_headers, test_product, second_product
):
    response = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 2},
                {"product_id": str(second_product.id), "quantity": 99},
            ]
        },
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Segundo producto" in response.json()["detail"]

    assert (await db_session.execute(select(Sale))).scalars().all() == []
    assert await _stock(client, admin_headers, test_product.id) == 10
    assert await _stock(client, admin_headers, second_product.id) == 4


async def test_batch_adds_up_repeated_products_before_checking_stock(client, admin_headers, test_product):
    response = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 6},
                {"product_id": str(test_product.id), "quantity": 6},
            ]
        },
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert await _stock(client, admin_headers, test_product.id) == 10


async def test_batch_unknown_product_is_404_and_registers_nothing(
    client, db_session, admin_headers, test_product
):
    response = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 1},
                {"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 1},
            ]
        },
        headers=admin_headers,
    )
    assert response.status_code == 404
    assert (await db_session.execute(select(Sale))).scalars().all() == []


async def test_batch_requires_at_least_one_item(client, admin_headers):
    response = await client.post("/api/v1/sales/batch", json={"items": []}, headers=admin_headers)
    assert response.status_code == 422


async def test_vendedor_can_register_a_batch(client, vendedor_headers, test_product):
    response = await client.post(
        "/api/v1/sales/batch",
        json={"items": [{"product_id": str(test_product.id), "quantity": 1}]},
        headers=vendedor_headers,
    )
    assert response.status_code == 201


async def test_single_sale_can_be_dated_in_the_past(client, db_session, admin_headers, test_product):
    response = await client.post(
        "/api/v1/sales",
        json={
            "product_id": str(test_product.id),
            "quantity": 1,
            "sale_date": "2026-08-24T12:00:00-06:00",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert _utc(response.json()["sale_date"]) == AUG_24_NOON_MX

    movement = (
        await db_session.execute(
            select(StockMovement).where(
                StockMovement.product_id == test_product.id, StockMovement.type == MovementType.SALE
            )
        )
    ).scalar_one()
    assert movement.created_at.date().isoformat() == "2026-08-24"


async def test_batch_can_be_dated_in_the_past(client, admin_headers, test_product, second_product):
    response = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 1},
                {"product_id": str(second_product.id), "quantity": 1},
            ],
            "sale_date": "2026-08-24T12:00:00-06:00",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert all(_utc(item["sale_date"]) == AUG_24_NOON_MX for item in response.json()["items"])


async def test_future_sale_date_is_rejected(client, admin_headers, test_product):
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    for url, body in (
        ("/api/v1/sales", {"product_id": str(test_product.id), "quantity": 1, "sale_date": tomorrow}),
        (
            "/api/v1/sales/batch",
            {"items": [{"product_id": str(test_product.id), "quantity": 1}], "sale_date": tomorrow},
        ),
    ):
        response = await client.post(url, json=body, headers=admin_headers)
        assert response.status_code == 400
        assert "futura" in response.json()["detail"]
    assert await _stock(client, admin_headers, test_product.id) == 10


async def test_sale_without_date_still_uses_now(client, admin_headers, test_product):
    before = datetime.now(timezone.utc) - timedelta(seconds=5)
    response = await client.post(
        "/api/v1/sales", json={"product_id": str(test_product.id), "quantity": 1}, headers=admin_headers
    )
    assert response.status_code == 201
    sale_date = datetime.fromisoformat(response.json()["sale_date"])
    if sale_date.tzinfo is None:
        sale_date = sale_date.replace(tzinfo=timezone.utc)
    assert sale_date >= before
    assert response.json()["ticket_id"] is None


async def test_ticket_id_is_listed_with_each_sale(client, admin_headers, test_product, second_product):
    created = await client.post(
        "/api/v1/sales/batch",
        json={
            "items": [
                {"product_id": str(test_product.id), "quantity": 1},
                {"product_id": str(second_product.id), "quantity": 1},
            ]
        },
        headers=admin_headers,
    )
    ticket_id = created.json()["ticket_id"]
    listing = await client.get("/api/v1/sales", headers=admin_headers)
    assert [s["ticket_id"] for s in listing.json()["items"]] == [ticket_id, ticket_id]
