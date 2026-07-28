from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.category import Category
from app.models.product import Product
from app.models.sale import Sale
from app.schemas.dashboard import CategoryBreakdown, DashboardSummary, SalesTrendPoint
from app.services.product_service import PRODUCT_LOADS
from app.services.sale_service import SALE_LOADS


async def get_summary(db: AsyncSession) -> DashboardSummary:
    products = (await db.execute(select(Product))).scalars().all()

    total_pieces_in_stock = sum(p.current_stock for p in products)
    inventory_value = sum(p.inventory_value for p in products)
    products_low_stock = sum(1 for p in products if 0 < p.current_stock <= settings.low_stock_threshold)
    products_out_of_stock = sum(1 for p in products if p.current_stock <= 0)

    sales_agg = (
        await db.execute(
            select(
                func.coalesce(func.sum(Sale.quantity), 0),
                func.coalesce(func.sum(Sale.unit_price * Sale.quantity), 0),
                func.coalesce(func.sum((Sale.unit_price - Sale.unit_cost) * Sale.quantity), 0),
            )
        )
    ).one()

    return DashboardSummary(
        total_pieces_in_stock=total_pieces_in_stock,
        inventory_value=round(inventory_value, 2),
        total_pieces_sold=sales_agg[0],
        total_revenue=round(sales_agg[1], 2),
        total_profit=round(sales_agg[2], 2),
        products_low_stock=products_low_stock,
        products_out_of_stock=products_out_of_stock,
        total_products=len(products),
    )


async def get_sales_trend(db: AsyncSession, days: int = 14) -> list[SalesTrendPoint]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    query = (
        select(
            func.date(Sale.sale_date).label("day"),
            func.sum(Sale.unit_price * Sale.quantity).label("revenue"),
            func.sum(Sale.quantity).label("units"),
        )
        .where(Sale.sale_date >= since)
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
    )
    rows = (await db.execute(query)).all()
    return [
        SalesTrendPoint(date=str(row.day), revenue=round(row.revenue or 0, 2), units=row.units or 0) for row in rows
    ]


async def get_category_breakdown(db: AsyncSession) -> list[CategoryBreakdown]:
    query = select(Category).options(selectinload(Category.products))
    categories = (await db.execute(query)).scalars().all()

    breakdown = []
    for category in categories:
        pieces = sum(p.current_stock for p in category.products)
        value = sum(p.inventory_value for p in category.products)
        breakdown.append(CategoryBreakdown(category=category.name, inventory_value=round(value, 2), pieces=pieces))
    return sorted(breakdown, key=lambda c: c.inventory_value, reverse=True)


async def get_low_stock_products(db: AsyncSession, limit: int = 10) -> list[Product]:
    query = select(Product).options(*PRODUCT_LOADS)
    products = (await db.execute(query)).scalars().all()
    low_stock = [p for p in products if p.current_stock <= settings.low_stock_threshold]
    return sorted(low_stock, key=lambda p: p.current_stock)[:limit]


async def get_recent_sales(db: AsyncSession, limit: int = 8):
    query = select(Sale).options(*SALE_LOADS).order_by(Sale.sale_date.desc()).limit(limit)
    return (await db.execute(query)).scalars().all()
