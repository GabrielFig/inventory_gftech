from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)) -> DashboardResponse:
    summary = await dashboard_service.get_summary(db)
    sales_trend = await dashboard_service.get_sales_trend(db)
    category_breakdown = await dashboard_service.get_category_breakdown(db)
    low_stock_products = await dashboard_service.get_low_stock_products(db)
    recent_sales = await dashboard_service.get_recent_sales(db)

    return DashboardResponse(
        summary=summary,
        sales_trend=sales_trend,
        category_breakdown=category_breakdown,
        low_stock_products=low_stock_products,
        recent_sales=recent_sales,
    )
