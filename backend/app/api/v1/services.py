import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.service import (
    ServiceCreate,
    ServiceRead,
    ServiceRecordCreate,
    ServiceRecordListResponse,
    ServiceRecordRead,
    ServiceUpdate,
)
from app.services import service_service

router = APIRouter(tags=["services"])


@router.get("/services", response_model=list[ServiceRead])
async def list_services(
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await service_service.list_services(db, active_only=active_only)


@router.post("/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: ServiceCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    return await service_service.create_service(db, payload)


@router.patch("/services/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = await service_service.get_service(db, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    return await service_service.update_service(db, service, payload)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> None:
    service = await service_service.get_service(db, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    await service_service.delete_service(db, service)


@router.get("/service-records", response_model=ServiceRecordListResponse)
async def list_service_records(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ServiceRecordListResponse:
    items, total = await service_service.list_records(
        db, date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )
    return ServiceRecordListResponse(items=items, total=total)


@router.post("/service-records", response_model=ServiceRecordRead, status_code=status.HTTP_201_CREATED)
async def register_service_record(
    payload: ServiceRecordCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    return await service_service.register_service_record(db, payload, created_by_id=user.id)


@router.delete("/service-records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_record(
    record_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> None:
    record = await service_service.get_record(db, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado")
    await service_service.delete_record(db, record)
