from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse, IncomeResponse
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


@router.get("/income", response_model=IncomeResponse)
async def get_income(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    tz_offset_minutes: int = Query(default=0, ge=-840, le=840),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> IncomeResponse:
    return await dashboard_service.get_income(
        db, date_from=date_from, date_to=date_to, tz_offset_minutes=tz_offset_minutes
    )
