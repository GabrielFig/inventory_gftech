import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, computed_field


class SaleCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=255)
    # Para registrar una venta que no se capturó en su momento. Sin fecha = ahora.
    sale_date: datetime | None = None


class SaleItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)


class SaleBatchCreate(BaseModel):
    items: list[SaleItemCreate] = Field(min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=255)
    sale_date: datetime | None = None


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
    ticket_id: uuid.UUID | None = None
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


class SaleBatchRead(BaseModel):
    ticket_id: uuid.UUID
    items: list[SaleRead]

    @computed_field
    @property
    def total(self) -> Decimal:
        return round(sum((item.total for item in self.items), Decimal("0")), 2)

    @computed_field
    @property
    def profit(self) -> Decimal:
        return round(sum((item.profit for item in self.items), Decimal("0")), 2)


class SaleListResponse(BaseModel):
    items: list[SaleRead]
    total: int
