import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.phone_model import PhoneModel, ProductCompatibility
from app.models.product import Product
from app.schemas.compatibility import ModelSearchResult
from app.schemas.product import CompatibleModelInput


class InvalidCompatibleModel(ValueError):
    """Un id de modelo no existe."""


def _norm(value: str) -> str:
    return " ".join(value.split())


async def resolve_compatible_models(
    db: AsyncSession, items: list[CompatibleModelInput]
) -> list[tuple[PhoneModel, str | None]]:
    """Convierte lo que manda el cliente en PhoneModel existentes, creando los nuevos
    (marca + modelo, sin distinguir mayúsculas). Quita duplicados conservando el orden."""
    resolved: dict[uuid.UUID, tuple[PhoneModel, str | None]] = {}
    for item in items:
        if item.id is not None:
            phone_model = await db.get(PhoneModel, item.id)
            if phone_model is None:
                raise InvalidCompatibleModel(f"Modelo no encontrado: {item.id}")
        else:
            brand, model = _norm(item.brand or ""), _norm(item.model or "")
            phone_model = (
                await db.execute(
                    select(PhoneModel).where(
                        func.lower(PhoneModel.brand) == brand.lower(), func.lower(PhoneModel.model) == model.lower()
                    )
                )
            ).scalar_one_or_none()
            if phone_model is None:
                phone_model = PhoneModel(brand=brand, model=model)
                db.add(phone_model)
                await db.flush()
        previous = resolved.get(phone_model.id)
        resolved[phone_model.id] = (phone_model, item.note or (previous[1] if previous else None))
    return list(resolved.values())


async def replace_product_models(db: AsyncSession, product: Product, links: list[tuple[PhoneModel, str | None]]) -> None:
    """Deja en el producto exactamente `links`. Los que ya estaban conservan su nota
    (salvo que venga una nueva); los demás se quitan o se crean."""
    existing = {c.phone_model_id: c for c in product.compatibilities}
    wanted = {phone_model.id for phone_model, _ in links}
    for phone_model_id, compat in existing.items():
        if phone_model_id not in wanted:
            product.compatibilities.remove(compat)
    for phone_model, note in links:
        compat = existing.get(phone_model.id)
        if compat is None:
            product.compatibilities.append(ProductCompatibility(phone_model_id=phone_model.id, note=note))
        elif note:
            compat.note = note
    await db.flush()


async def list_phone_models(db: AsyncSession, q: str | None = None, limit: int = 50) -> list[PhoneModel]:
    stmt = select(PhoneModel)
    for token in (q or "").split():
        like = f"%{token}%"
        stmt = stmt.where(PhoneModel.model.ilike(like) | PhoneModel.brand.ilike(like))
    stmt = stmt.order_by(func.lower(PhoneModel.brand), func.lower(PhoneModel.model)).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def list_brands(db: AsyncSession) -> list[str]:
    rows = await db.execute(select(PhoneModel.brand).distinct().order_by(PhoneModel.brand))
    return list(rows.scalars().all())


async def search_by_model(db: AsyncSession, query: str, limit: int = 15) -> list[ModelSearchResult]:
    like = f"%{query}%"
    stmt = (
        select(PhoneModel)
        .options(
            selectinload(PhoneModel.compatibilities)
            .selectinload(ProductCompatibility.product)
            .selectinload(Product.supplier),
            selectinload(PhoneModel.compatibilities)
            .selectinload(ProductCompatibility.product)
            .selectinload(Product.category),
            selectinload(PhoneModel.compatibilities)
            .selectinload(ProductCompatibility.product)
            .selectinload(Product.compatibilities)
            .selectinload(ProductCompatibility.phone_model),
        )
        .where((PhoneModel.model.ilike(like)) | (PhoneModel.brand.ilike(like)))
        .limit(limit)
    )
    models = (await db.execute(stmt)).scalars().unique().all()

    results = []
    for phone_model in models:
        products = [c.product for c in phone_model.compatibilities]
        results.append(ModelSearchResult(brand=phone_model.brand, model=phone_model.model, matches=products))
    return results
