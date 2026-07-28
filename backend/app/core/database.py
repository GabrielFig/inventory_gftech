from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# statement_cache_size=0: Neon's pooled endpoint uses PgBouncer in transaction mode,
# which is incompatible with asyncpg's prepared-statement cache.
connect_args = {"ssl": "require", "statement_cache_size": 0} if settings.db_ssl_require else {}
engine = create_async_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
