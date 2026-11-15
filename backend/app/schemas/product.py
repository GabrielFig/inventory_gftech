import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, computed_field, model_validator

from app.core.config import settings
from app.schemas.lookup import CategoryRead, SupplierRead


class StockStatus(str, Enum):
    OK = "ok"
    LOW = "bajo"
    OUT = "agotado"


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    return " ".join(value.split()) or None


class CompatibleModelInput(BaseModel):
    """Modelo compatible: un `id` existente, o `brand` + `model` (se crea si no existe)."""

    id: uuid.UUID | None = None
    brand: str | None = Field(default=None, max_length=60)
    model: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _needs_id_or_name(self) -> "CompatibleModelInput":
        self.brand = _clean(self.brand)
        self.model = _clean(self.model)
        self.note = _clean(self.note)
        if self.id is None and not (self.brand and self.model):
            raise ValueError("Indica el id del modelo, o su marca y modelo")
        return self


class CompatibleModelRead(BaseModel):
    id: uuid.UUID
    brand: str
    model: str
    note: str | None = None

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    supplier_id: uuid.UUID
    category_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    model_compatibility: str = Field(min_length=1, max_length=255)
    cost: Decimal = Field(gt=0, decimal_places=2)
    sale_price: Decimal = Field(gt=0, decimal_places=2)


class ProductCreate(ProductBase):
    initial_stock: int = Field(default=0, ge=0)
    compatible_models: list[CompatibleModelInput] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    supplier_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    model_compatibility: str | None = Field(default=None, min_length=1, max_length=255)
    cost: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    sale_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    # None (omitido) = no tocar; lista (incluso vacía) = reemplazar los modelos del producto.
    compatible_models: list[CompatibleModelInput] | None = None


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
    compatible_models: list[CompatibleModelRead] = Field(default_factory=list)

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
