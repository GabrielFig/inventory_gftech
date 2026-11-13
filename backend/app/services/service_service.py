import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service, ServiceRecord
from app.schemas.service import ServiceCreate, ServiceRecordCreate, ServiceUpdate


async def list_services(db: AsyncSession, active_only: bool = False) -> list[Service]:
    query = select(Service).order_by(Service.name)
    if active_only:
        query = query.where(Service.is_active.is_(True))
    return list((await db.execute(query)).scalars().all())


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> Service | None:
    return await db.get(Service, service_id)


async def create_service(db: AsyncSession, payload: ServiceCreate) -> Service:
    service = Service(**payload.model_dump())
    db.add(service)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un servicio con ese nombre")
    await db.refresh(service)
    return service


async def update_service(db: AsyncSession, service: Service, payload: ServiceUpdate) -> Service:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un servicio con ese nombre")
    await db.refresh(service)
    return service


async def delete_service(db: AsyncSession, service: Service) -> None:
    await db.delete(service)
    await db.commit()


async def register_service_record(
    db: AsyncSession, payload: ServiceRecordCreate, created_by_id: uuid.UUID | None
) -> ServiceRecord:
    service = await get_service(db, payload.service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    if not service.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El servicio está desactivado")

    record = ServiceRecord(
        service_id=service.id,
        created_by_id=created_by_id,
        service_name=service.name,
        price=payload.price if payload.price is not None else service.price,
        notes=payload.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_record(db: AsyncSession, record_id: uuid.UUID) -> ServiceRecord | None:
    return await db.get(ServiceRecord, record_id)


async def delete_record(db: AsyncSession, record: ServiceRecord) -> None:
    await db.delete(record)
    await db.commit()


async def list_records(
    db: AsyncSession,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ServiceRecord], int]:
    query = select(ServiceRecord)
    count_query = select(func.count()).select_from(ServiceRecord)
    if date_from:
        query = query.where(ServiceRecord.performed_at >= date_from)
        count_query = count_query.where(ServiceRecord.performed_at >= date_from)
    if date_to:
        query = query.where(ServiceRecord.performed_at <= date_to)
        count_query = count_query.where(ServiceRecord.performed_at <= date_to)

    total = (await db.execute(count_query)).scalar_one()
    query = query.order_by(ServiceRecord.performed_at.desc()).limit(limit).offset(offset)
    return list((await db.execute(query)).scalars().all()), total
