import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.sale import Sale
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.sale import SaleCreate, SaleUpdate
from app.services.product_service import get_product

SALE_LOADS = (selectinload(Sale.product),)


async def register_sale(db: AsyncSession, payload: SaleCreate, sold_by_id: uuid.UUID | None) -> Sale:
    product = await get_product(db, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    if payload.quantity > product.current_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock insuficiente. Disponible: {product.current_stock} pieza(s)",
        )

    unit_price = payload.unit_price if payload.unit_price is not None else product.sale_price

    sale = Sale(
        product_id=product.id,
        sold_by_id=sold_by_id,
        quantity=payload.quantity,
        unit_price=unit_price,
        unit_cost=product.cost,
        notes=payload.notes,
    )
    db.add(sale)

    product.sold_count += payload.quantity

    db.add(
        StockMovement(
            product_id=product.id,
            created_by_id=sold_by_id,
            type=MovementType.SALE,
            quantity_delta=-payload.quantity,
            resulting_stock=product.current_stock,
            note=f"Venta de {payload.quantity} pieza(s)",
        )
    )

    await db.flush()
    await db.commit()

    return await get_sale(db, sale.id)


async def get_sale(db: AsyncSession, sale_id: uuid.UUID) -> Sale | None:
    query = select(Sale).options(*SALE_LOADS).where(Sale.id == sale_id)
    return (await db.execute(query)).scalar_one_or_none()


async def list_sales(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Sale], int]:
    query = select(Sale).options(*SALE_LOADS)
    count_query = select(func.count()).select_from(Sale)

    conditions = []
    if product_id:
        conditions.append(Sale.product_id == product_id)
    if date_from:
        conditions.append(Sale.sale_date >= date_from)
    if date_to:
        conditions.append(Sale.sale_date <= date_to)

    for condition in conditions:
        query = query.where(condition)
        count_query = count_query.where(condition)

    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Sale.sale_date.desc()).limit(limit).offset(offset)
    sales = (await db.execute(query)).scalars().all()
    return list(sales), total


async def update_sale(
    db: AsyncSession, sale: Sale, payload: SaleUpdate, updated_by_id: uuid.UUID | None = None
) -> Sale:
    product = await get_product(db, sale.product_id)
    data = payload.model_dump(exclude_unset=True)

    if "quantity" in data and data["quantity"] != sale.quantity:
        delta = data["quantity"] - sale.quantity
        if delta > 0 and delta > product.current_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente. Disponible: {product.current_stock} pieza(s)",
            )
        product.sold_count += delta
        db.add(
            StockMovement(
                product_id=product.id,
                created_by_id=updated_by_id,
                type=MovementType.ADJUSTMENT,
                quantity_delta=-delta,
                resulting_stock=product.current_stock,
                note="Edición de venta",
            )
        )

    for field, value in data.items():
        setattr(sale, field, value)

    await db.flush()
    await db.commit()
    return await get_sale(db, sale.id)


async def delete_sale(db: AsyncSession, sale: Sale, deleted_by_id: uuid.UUID | None = None) -> None:
    product = await get_product(db, sale.product_id)
    product.sold_count -= sale.quantity
    db.add(
        StockMovement(
            product_id=product.id,
            created_by_id=deleted_by_id,
            type=MovementType.ADJUSTMENT,
            quantity_delta=sale.quantity,
            resulting_stock=product.current_stock,
            note="Venta eliminada",
        )
    )
    await db.delete(sale)
    await db.commit()
