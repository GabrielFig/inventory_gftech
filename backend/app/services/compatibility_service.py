from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.phone_model import PhoneModel, ProductCompatibility
from app.models.product import Product
from app.schemas.compatibility import ModelSearchResult


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
