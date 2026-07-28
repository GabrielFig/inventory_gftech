from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.compatibility import ModelSearchResult
from app.services import compatibility_service

router = APIRouter(prefix="/compatibility", tags=["compatibility"])


@router.get("/search", response_model=list[ModelSearchResult])
async def search_by_model(
    q: str = Query(min_length=2),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ModelSearchResult]:
    return await compatibility_service.search_by_model(db, q)
