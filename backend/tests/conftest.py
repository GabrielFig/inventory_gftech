from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — registra todos los modelos en Base.metadata
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User, UserRole

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        full_name="Admin Test",
        email="admin@test.mx",
        hashed_password=hash_password("test1234"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def vendedor_user(db_session: AsyncSession) -> User:
    user = User(
        full_name="Vendedor Test",
        email="vendedor@test.mx",
        hashed_password=hash_password("test1234"),
        role=UserRole.VENDEDOR,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def admin_headers(admin_user: User) -> dict[str, str]:
    token = create_access_token(subject=str(admin_user.id), role=admin_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def vendedor_headers(vendedor_user: User) -> dict[str, str]:
    token = create_access_token(subject=str(vendedor_user.id), role=vendedor_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_product(db_session: AsyncSession) -> Product:
    supplier = Supplier(name="Proveedor Test")
    category = Category(name="Categoría Test")
    db_session.add_all([supplier, category])
    await db_session.flush()

    product = Product(
        code="TEST-001",
        supplier_id=supplier.id,
        category_id=category.id,
        name="Producto de prueba",
        model_compatibility="Modelo X",
        cost=10,
        sale_price=20,
        initial_stock=10,
        sold_count=0,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product
