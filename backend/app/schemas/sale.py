import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, computed_field


class SaleCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=255)


class SaleUpdate(BaseModel):
    quantity: int | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=255)


class SaleProductSummary(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    model_compatibility: str

    model_config = {"from_attributes": True}


class SaleRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    notes: str | None
    sale_date: datetime
    product: SaleProductSummary

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def total(self) -> Decimal:
        return round(self.unit_price * self.quantity, 2)

    @computed_field
    @property
    def profit(self) -> Decimal:
        return round((self.unit_price - self.unit_cost) * self.quantity, 2)


class SaleListResponse(BaseModel):
    items: list[SaleRead]
    total: int
