import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    price: Decimal = Field(ge=0, decimal_places=2)


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_active: bool | None = None


class ServiceRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ServiceRecordCreate(BaseModel):
    service_id: uuid.UUID
    # Si no se manda, se cobra la tarifa del catálogo.
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=255)


class ServiceRecordRead(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID | None
    service_name: str
    price: Decimal
    notes: str | None
    performed_at: datetime

    model_config = {"from_attributes": True}


class ServiceRecordListResponse(BaseModel):
    items: list[ServiceRecordRead]
    total: int
