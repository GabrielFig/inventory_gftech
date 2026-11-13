from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.category import Category
from app.models.product import Product
from app.models.sale import Sale
from app.models.service import ServiceRecord
from app.schemas.dashboard import (
    CategoryBreakdown,
    DashboardSummary,
    IncomePoint,
    IncomeResponse,
    IncomeSummary,
    SalesTrendPoint,
)
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


async def get_income(
    db: AsyncSession,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    tz_offset_minutes: int = 0,
) -> IncomeResponse:
    """Ingresos de ventas + servicios en un rango. La serie diaria se agrupa en la
    zona horaria del cliente (tz_offset_minutes, ej. -420 para Los Mochis)."""
    sales_query = select(Sale)
    records_query = select(ServiceRecord)
    if date_from:
        sales_query = sales_query.where(Sale.sale_date >= date_from)
        records_query = records_query.where(ServiceRecord.performed_at >= date_from)
    if date_to:
        sales_query = sales_query.where(Sale.sale_date <= date_to)
        records_query = records_query.where(ServiceRecord.performed_at <= date_to)

    sales = (await db.execute(sales_query)).scalars().all()
    records = (await db.execute(records_query)).scalars().all()

    offset = timedelta(minutes=tz_offset_minutes)

    def local_day(value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return (value + offset).date().isoformat()

    sales_by_day: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    services_by_day: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    sales_revenue = Decimal(0)
    sales_profit = Decimal(0)
    for sale in sales:
        revenue = Decimal(str(sale.total))
        sales_revenue += revenue
        sales_profit += Decimal(str(sale.profit))
        sales_by_day[local_day(sale.sale_date)] += revenue
    services_revenue = Decimal(0)
    for record in records:
        price = Decimal(str(record.price))
        services_revenue += price
        services_by_day[local_day(record.performed_at)] += price

    days = sorted(set(sales_by_day) | set(services_by_day))
    return IncomeResponse(
        summary=IncomeSummary(
            sales_count=len(sales),
            sales_units=sum(s.quantity for s in sales),
            sales_revenue=round(sales_revenue, 2),
            sales_profit=round(sales_profit, 2),
            services_count=len(records),
            services_revenue=round(services_revenue, 2),
            total_revenue=round(sales_revenue + services_revenue, 2),
            total_profit=round(sales_profit + services_revenue, 2),
        ),
        daily=[
            IncomePoint(
                date=day,
                sales_revenue=round(sales_by_day[day], 2),
                services_revenue=round(services_by_day[day], 2),
            )
            for day in days
        ],
    )
