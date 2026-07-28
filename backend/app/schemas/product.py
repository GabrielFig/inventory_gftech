import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, computed_field

from app.core.config import settings
from app.schemas.lookup import CategoryRead, SupplierRead


class StockStatus(str, Enum):
    OK = "ok"
    LOW = "bajo"
    OUT = "agotado"


class ProductBase(BaseModel):
    supplier_id: uuid.UUID
    category_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    model_compatibility: str = Field(min_length=1, max_length=255)
    cost: Decimal = Field(gt=0, decimal_places=2)
    sale_price: Decimal = Field(gt=0, decimal_places=2)


class ProductCreate(ProductBase):
    initial_stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    supplier_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    model_compatibility: str | None = Field(default=None, min_length=1, max_length=255)
    cost: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    sale_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)


class RestockRequest(BaseModel):
    quantity: int = Field(gt=0)
    note: str | None = None


class ProductRead(ProductBase):
    id: uuid.UUID
    code: str
    initial_stock: int
    sold_count: int
    created_at: datetime
    updated_at: datetime

    supplier: SupplierRead
    category: CategoryRead

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def current_stock(self) -> int:
        return self.initial_stock - self.sold_count

    @computed_field
    @property
    def inventory_value(self) -> Decimal:
        return round(self.cost * self.current_stock, 2)

    @computed_field
    @property
    def margin_pct(self) -> float:
        if not self.cost:
            return 0.0
        return round(float((self.sale_price - self.cost) / self.cost) * 100, 2)

    @computed_field
    @property
    def status(self) -> StockStatus:
        if self.current_stock <= 0:
            return StockStatus.OUT
        if self.current_stock <= settings.low_stock_threshold:
            return StockStatus.LOW
        return StockStatus.OK


class ProductListResponse(BaseModel):
    items: list[ProductRead]
    total: int
