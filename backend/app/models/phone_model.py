import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PhoneModel(Base):
    __tablename__ = "phone_models"
    __table_args__ = (UniqueConstraint("brand", "model", name="uq_phone_brand_model"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    brand: Mapped[str] = mapped_column(String(60), index=True)
    model: Mapped[str] = mapped_column(String(120), index=True)

    compatibilities: Mapped[list["ProductCompatibility"]] = relationship(
        back_populates="phone_model", cascade="all, delete-orphan"
    )


class ProductCompatibility(Base):
    """Links a product to a phone model it fits — the normalized equivalent
    of the original workbook's 'Equivalencias' sheet."""

    __tablename__ = "product_compatibilities"
    __table_args__ = (UniqueConstraint("product_id", "phone_model_id", name="uq_product_phone_model"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    phone_model_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("phone_models.id", ondelete="CASCADE"), index=True)
    note: Mapped[str | None] = mapped_column(String(200), default=None)

    product: Mapped["Product"] = relationship(back_populates="compatibilities")
    phone_model: Mapped["PhoneModel"] = relationship(back_populates="compatibilities")
