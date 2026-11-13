from decimal import Decimal

from pydantic import BaseModel

from app.schemas.product import ProductRead
from app.schemas.sale import SaleRead


class DashboardSummary(BaseModel):
    total_pieces_in_stock: int
    inventory_value: Decimal
    total_pieces_sold: int
    total_revenue: Decimal
    total_profit: Decimal
    products_low_stock: int
    products_out_of_stock: int
    total_products: int


class SalesTrendPoint(BaseModel):
    date: str
    revenue: Decimal
    units: int


class CategoryBreakdown(BaseModel):
    category: str
    inventory_value: Decimal
    pieces: int


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    sales_trend: list[SalesTrendPoint]
    category_breakdown: list[CategoryBreakdown]
    low_stock_products: list[ProductRead]
    recent_sales: list[SaleRead]


class IncomePoint(BaseModel):
    date: str
    sales_revenue: Decimal
    services_revenue: Decimal


class IncomeSummary(BaseModel):
    sales_count: int
    sales_units: int
    sales_revenue: Decimal
    sales_profit: Decimal
    services_count: int
    services_revenue: Decimal
    total_revenue: Decimal
    # Los servicios no llevan costo de insumo registrado: cuentan completos como ganancia.
    total_profit: Decimal


class IncomeResponse(BaseModel):
    summary: IncomeSummary
    daily: list[IncomePoint]
