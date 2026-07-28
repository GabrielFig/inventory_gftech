#!/bin/sh
set -e

echo "Esperando base de datos..."
python -c "
import asyncio, sys
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def wait():
    for _ in range(30):
        try:
            engine = create_async_engine(settings.database_url)
            async with engine.connect():
                pass
            await engine.dispose()
            return
        except Exception:
            await asyncio.sleep(1)
    sys.exit('No se pudo conectar a la base de datos')

asyncio.run(wait())
"

echo "Aplicando migraciones..."
alembic upgrade head

echo "Sembrando datos iniciales (si aplica)..."
python -m app.seed

echo "Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
