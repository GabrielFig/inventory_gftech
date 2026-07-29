import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleListResponse, SaleRead, SaleUpdate
from app.services import sale_service

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=SaleListResponse)
async def list_sales(
    product_id: uuid.UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleListResponse:
    items, total = await sale_service.list_sales(
        db, product_id=product_id, date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )
    return SaleListResponse(items=items, total=total)


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
async def register_sale(
    payload: SaleCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> SaleRead:
    return await sale_service.register_sale(db, payload, sold_by_id=user.id)


@router.patch("/{sale_id}", response_model=SaleRead)
async def update_sale(
    sale_id: uuid.UUID,
    payload: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> SaleRead:
    sale = await sale_service.get_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    return await sale_service.update_sale(db, sale, payload)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(
    sale_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    sale = await sale_service.get_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    await sale_service.delete_sale(db, sale)
