import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.sale import Sale
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.sale import SaleBatchCreate, SaleCreate, SaleUpdate
from app.services.product_service import get_product

SALE_LOADS = (selectinload(Sale.product),)


def resolve_sale_date(value: datetime | None) -> datetime:
    """Fecha de la venta: ahora si no se indica; las fechas futuras se rechazan."""
    now = datetime.now(timezone.utc)
    if value is None:
        return now
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    if value > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de la venta no puede ser futura"
        )
    return value.astimezone(timezone.utc)


async def register_sale(db: AsyncSession, payload: SaleCreate, sold_by_id: uuid.UUID | None) -> Sale:
    sale_date = resolve_sale_date(payload.sale_date)
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
        sale_date=sale_date,
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
            created_at=sale_date,
        )
    )

    await db.flush()
    await db.commit()

    return await get_sale(db, sale.id)


async def register_sales_batch(
    db: AsyncSession, payload: SaleBatchCreate, sold_by_id: uuid.UUID | None
) -> tuple[uuid.UUID, list[Sale]]:
    """Registra un carrito: una venta por producto, todas con el mismo ticket y fecha.

    Todo o nada: se valida producto y stock de todo el carrito antes de escribir nada.
    """
    sale_date = resolve_sale_date(payload.sale_date)

    products: dict[uuid.UUID, Product] = {}
    requested: dict[uuid.UUID, int] = {}
    for item in payload.items:
        if item.product_id not in products:
            product = await get_product(db, item.product_id)
            if product is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
            products[item.product_id] = product
        requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity

    for product_id, quantity in requested.items():
        product = products[product_id]
        if quantity > product.current_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente de «{product.name}». Disponible: {product.current_stock} pieza(s)",
            )

    ticket_id = uuid.uuid4()
    for item in payload.items:
        product = products[item.product_id]
        unit_price = item.unit_price if item.unit_price is not None else product.sale_price
        db.add(
            Sale(
                product_id=product.id,
                sold_by_id=sold_by_id,
                ticket_id=ticket_id,
                quantity=item.quantity,
                unit_price=unit_price,
                unit_cost=product.cost,
                notes=payload.notes,
                sale_date=sale_date,
            )
        )
        product.sold_count += item.quantity
        db.add(
            StockMovement(
                product_id=product.id,
                created_by_id=sold_by_id,
                type=MovementType.SALE,
                quantity_delta=-item.quantity,
                resulting_stock=product.current_stock,
                note=f"Venta de {item.quantity} pieza(s)",
                created_at=sale_date,
            )
        )

    await db.flush()
    await db.commit()

    query = select(Sale).options(*SALE_LOADS).where(Sale.ticket_id == ticket_id).order_by(Sale.id)
    sales = (await db.execute(query)).scalars().all()
    return ticket_id, list(sales)


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
