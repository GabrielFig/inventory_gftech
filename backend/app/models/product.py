import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. INV-001

    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"))

    name: Mapped[str] = mapped_column(String(150))
    model_compatibility: Mapped[str] = mapped_column(String(255))

    cost: Mapped[float] = mapped_column(Numeric(10, 2))
    sale_price: Mapped[float] = mapped_column(Numeric(10, 2))

    initial_stock: Mapped[int] = mapped_column(default=0)
    sold_count: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    supplier: Mapped["Supplier"] = relationship(back_populates="products")
    category: Mapped["Category"] = relationship(back_populates="products")
    sales: Mapped[list["Sale"]] = relationship(back_populates="product")
    stock_movements: Mapped[list["StockMovement"]] = relationship(back_populates="product")
    compatibilities: Mapped[list["ProductCompatibility"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )

    @property
    def compatible_models(self) -> list[dict]:
        """Modelos de teléfono enlazados (requiere compatibilities.phone_model cargado)."""
        items = [
            {"id": c.phone_model.id, "brand": c.phone_model.brand, "model": c.phone_model.model, "note": c.note}
            for c in self.compatibilities
        ]
        return sorted(items, key=lambda m: (m["brand"].lower(), m["model"].lower()))

    @property
    def current_stock(self) -> int:
        return self.initial_stock - self.sold_count

    @property
    def inventory_value(self) -> float:
        return float(self.cost) * self.current_stock

    @property
    def margin_pct(self) -> float:
        if not self.cost:
            return 0.0
        return round((float(self.sale_price) - float(self.cost)) / float(self.cost) * 100, 2)
