import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductListResponse, ProductRead, ProductUpdate, RestockRequest
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    search: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    supplier_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductListResponse:
    items, total = await product_service.list_products(
        db, search=search, category_id=category_id, supplier_id=supplier_id, status=status_filter,
        limit=limit, offset=offset,
    )
    return ProductListResponse(items=items, total=total)


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> ProductRead:
    product = await product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)
) -> ProductRead:
    return await product_service.create_product(db, payload, created_by_id=user.id)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ProductRead:
    product = await product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return await product_service.update_product(db, product, payload)


@router.post("/{product_id}/restock", response_model=ProductRead)
async def restock_product(
    product_id: uuid.UUID,
    payload: RestockRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProductRead:
    product = await product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return await product_service.restock_product(db, product, payload.quantity, payload.note, created_by_id=user.id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> None:
    product = await product_service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    await product_service.delete_product(db, product)
