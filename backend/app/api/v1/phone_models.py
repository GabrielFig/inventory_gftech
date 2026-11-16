from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.lookup import PhoneModelRead
from app.services import compatibility_service

router = APIRouter(prefix="/phone-models", tags=["phone-models"])


@router.get("", response_model=list[PhoneModelRead])
async def list_phone_models(
    q: str | None = Query(default=None, description="Busca por marca y/o modelo"),
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await compatibility_service.list_phone_models(db, q, limit)


@router.get("/brands", response_model=list[str])
async def list_brands(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await compatibility_service.list_brands(db)
