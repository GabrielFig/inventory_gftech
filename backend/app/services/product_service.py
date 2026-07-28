import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.product import Product
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.product import ProductCreate, ProductUpdate

PRODUCT_LOADS = (selectinload(Product.supplier), selectinload(Product.category))


async def generate_next_code(db: AsyncSession) -> str:
    result = await db.execute(select(func.max(Product.code)))
    last_code = result.scalar_one_or_none()
    next_number = 1
    if last_code:
        try:
            next_number = int(last_code.split("-")[1]) + 1
        except (IndexError, ValueError):
            next_number = 1
    return f"INV-{next_number:03d}"


async def list_products(
    db: AsyncSession,
    search: str | None = None,
    category_id: uuid.UUID | None = None,
    supplier_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Product], int]:
    query = select(Product).options(*PRODUCT_LOADS)
    count_query = select(func.count()).select_from(Product)

    conditions = []
    if search:
        like = f"%{search}%"
        conditions.append(
            or_(Product.name.ilike(like), Product.model_compatibility.ilike(like), Product.code.ilike(like))
        )
    if category_id:
        conditions.append(Product.category_id == category_id)
    if supplier_id:
        conditions.append(Product.supplier_id == supplier_id)

    for condition in conditions:
        query = query.where(condition)
        count_query = count_query.where(condition)

    if status == "bajo":
        query = query.where(
            (Product.initial_stock - Product.sold_count) <= settings.low_stock_threshold,
            (Product.initial_stock - Product.sold_count) > 0,
        )
        count_query = count_query.where(
            (Product.initial_stock - Product.sold_count) <= settings.low_stock_threshold,
            (Product.initial_stock - Product.sold_count) > 0,
        )
    elif status == "agotado":
        query = query.where((Product.initial_stock - Product.sold_count) <= 0)
        count_query = count_query.where((Product.initial_stock - Product.sold_count) <= 0)
    elif status == "ok":
        query = query.where((Product.initial_stock - Product.sold_count) > settings.low_stock_threshold)
        count_query = count_query.where((Product.initial_stock - Product.sold_count) > settings.low_stock_threshold)

    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Product.code).limit(limit).offset(offset)
    products = (await db.execute(query)).scalars().all()
    return list(products), total


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    query = select(Product).options(*PRODUCT_LOADS).where(Product.id == product_id)
    return (await db.execute(query)).scalar_one_or_none()


async def create_product(db: AsyncSession, payload: ProductCreate, created_by_id: uuid.UUID | None) -> Product:
    code = await generate_next_code(db)
    product = Product(code=code, **payload.model_dump())
    db.add(product)
    await db.flush()

    db.add(
        StockMovement(
            product_id=product.id,
            created_by_id=created_by_id,
            type=MovementType.INITIAL,
            quantity_delta=product.initial_stock,
            resulting_stock=product.current_stock,
            note="Alta de producto",
        )
    )
    await db.commit()
    return await get_product(db, product.id)


async def update_product(db: AsyncSession, product: Product, payload: ProductUpdate) -> Product:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    return await get_product(db, product.id)


async def restock_product(
    db: AsyncSession, product: Product, quantity: int, note: str | None, created_by_id: uuid.UUID | None
) -> Product:
    product.initial_stock += quantity
    db.add(
        StockMovement(
            product_id=product.id,
            created_by_id=created_by_id,
            type=MovementType.RESTOCK,
            quantity_delta=quantity,
            resulting_stock=product.current_stock,
            note=note,
        )
    )
    await db.commit()
    return await get_product(db, product.id)


async def delete_product(db: AsyncSession, product: Product) -> None:
    await db.delete(product)
    await db.commit()
