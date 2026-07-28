from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.lookup import CategoryRead, SupplierRead

router = APIRouter(tags=["lookups"])


@router.get("/suppliers", response_model=list[SupplierRead])
async def list_suppliers(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return result.scalars().all()


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()
