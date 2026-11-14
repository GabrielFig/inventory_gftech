import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), index=True)
    sold_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), default=None)
    # Las ventas de un mismo carrito (varios productos en una sola venta) comparten ticket_id.
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(index=True, default=None)

    quantity: Mapped[int]
    # Snapshots at time of sale so historical reports stay accurate even if
    # the product's current cost/price change later.
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2))

    notes: Mapped[str | None] = mapped_column(String(255), default=None)
    sale_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship(back_populates="sales")
    sold_by: Mapped["User | None"] = relationship()

    @property
    def total(self) -> float:
        return round(float(self.unit_price) * self.quantity, 2)

    @property
    def profit(self) -> float:
        return round((float(self.unit_price) - float(self.unit_cost)) * self.quantity, 2)
