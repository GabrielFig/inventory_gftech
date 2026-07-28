"""Idempotent seed script — populates suppliers, categories, products,
phone-model compatibilities and default users from the original GF-Tech
workbook data. Run with: python -m app.seed
"""

import asyncio
import os

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.category import Category
from app.models.phone_model import PhoneModel, ProductCompatibility
from app.models.product import Product
from app.models.stock_movement import MovementType, StockMovement
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.seed_data import BRAND_LABELS, CATEGORIES, EQUIVALENCIAS, PRODUCTS, SUPPLIERS


async def seed_users(db):
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@gftech.mx")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "GFTech2026!")
    vendedor_email = os.getenv("SEED_VENDEDOR_EMAIL", "ventas@gftech.mx")
    vendedor_password = os.getenv("SEED_VENDEDOR_PASSWORD", "Ventas2026!")

    existing = (await db.execute(select(User))).scalars().first()
    if existing:
        return

    db.add_all(
        [
            User(
                full_name="Administrador GF-Tech",
                email=admin_email,
                hashed_password=hash_password(admin_password),
                role=UserRole.ADMIN,
            ),
            User(
                full_name="Vendedor GF-Tech",
                email=vendedor_email,
                hashed_password=hash_password(vendedor_password),
                role=UserRole.VENDEDOR,
            ),
        ]
    )
    print(f"  Usuarios creados: {admin_email} / {vendedor_email}")


async def seed_lookups(db) -> tuple[dict[str, Supplier], dict[str, Category]]:
    suppliers = {}
    for name in SUPPLIERS:
        existing = (await db.execute(select(Supplier).where(Supplier.name == name))).scalar_one_or_none()
        suppliers[name] = existing or Supplier(name=name)
        if not existing:
            db.add(suppliers[name])

    categories = {}
    for name in CATEGORIES:
        existing = (await db.execute(select(Category).where(Category.name == name))).scalar_one_or_none()
        categories[name] = existing or Category(name=name)
        if not existing:
            db.add(categories[name])

    await db.flush()
    return suppliers, categories


async def seed_products(db, suppliers, categories) -> dict[str, Product]:
    products = {}
    for code, supplier_name, category_name, name, model, cost, price, initial_stock, sold in PRODUCTS:
        existing = (await db.execute(select(Product).where(Product.code == code))).scalar_one_or_none()
        if existing:
            products[code] = existing
            continue

        product = Product(
            code=code,
            supplier_id=suppliers[supplier_name].id,
            category_id=categories[category_name].id,
            name=name,
            model_compatibility=model,
            cost=cost,
            sale_price=price,
            initial_stock=initial_stock,
            sold_count=sold,
        )
        db.add(product)
        await db.flush()
        db.add(
            StockMovement(
                product_id=product.id,
                type=MovementType.INITIAL,
                quantity_delta=initial_stock,
                resulting_stock=product.current_stock,
                note="Carga inicial desde Excel",
            )
        )
        products[code] = product

    await db.flush()
    return products


def _parse_ids(raw: str) -> list[str]:
    if not raw or raw.strip() in ("—", "-", ""):
        return []
    return [part.strip() for part in raw.split("+") if part.strip()]


async def seed_compatibilities(db, products: dict[str, Product]):
    existing_count = (await db.execute(select(ProductCompatibility.id))).first()
    if existing_count:
        return

    for brand_code, model, funda_ids, mica_id, mica_camara_id in EQUIVALENCIAS:
        brand = BRAND_LABELS.get(brand_code, brand_code.title())
        phone_model = (
            await db.execute(select(PhoneModel).where(PhoneModel.brand == brand, PhoneModel.model == model))
        ).scalar_one_or_none()
        if not phone_model:
            phone_model = PhoneModel(brand=brand, model=model)
            db.add(phone_model)
            await db.flush()

        for note, ids in (
            ("Funda", _parse_ids(funda_ids)),
            ("Mica", _parse_ids(mica_id)),
            ("Mica Cámara", _parse_ids(mica_camara_id)),
        ):
            for pid in ids:
                product = products.get(pid)
                if product:
                    db.add(ProductCompatibility(product_id=product.id, phone_model_id=phone_model.id, note=note))

    await db.flush()


async def main():
    async with SessionLocal() as db:
        print("Sembrando usuarios...")
        await seed_users(db)

        print("Sembrando proveedores y categorías...")
        suppliers, categories = await seed_lookups(db)

        print("Sembrando productos...")
        products = await seed_products(db, suppliers, categories)

        print("Sembrando equivalencias de modelos...")
        await seed_compatibilities(db, products)

        await db.commit()
        print(f"Listo. {len(products)} productos en catálogo.")


if __name__ == "__main__":
    asyncio.run(main())
