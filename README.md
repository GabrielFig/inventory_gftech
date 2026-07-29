# GF-Tech LM — Sistema de Inventario y Ventas

Reemplazo del inventario en Excel/VBA de GF-Tech LM (Los Mochis, Sinaloa): fundas, micas,
cables y cargadores para celulares. Incluye control de stock, registro de ventas, alertas
de stock bajo y un buscador de compatibilidad por modelo de teléfono.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL + Alembic + JWT auth
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query
- **Infraestructura:** Docker Compose (Postgres + API + Web)

## Levantar todo con Docker

```bash
cp backend/.env.example backend/.env   # ya incluido con valores de desarrollo
docker compose up --build
```

- Frontend: http://localhost:3010
- API: http://localhost:8010 (docs interactivas en http://localhost:8010/docs)
- Postgres: localhost:5434

Los puertos (3010/8010/5434) están remapeados para no chocar con otros proyectos corriendo
en la misma máquina. Ajusta `docker-compose.yml` si prefieres los puertos estándar
(3000/8000/5432) y no tienes conflictos.

El backend aplica las migraciones y siembra el catálogo real (65 productos, proveedores,
categorías y tabla de equivalencias por modelo) al iniciar.

### Usuarios de prueba

| Rol      | Correo             | Contraseña   |
|----------|---------------------|--------------|
| Admin    | admin@gftech.mx     | GFTech2026!  |
| Vendedor | ventas@gftech.mx    | Ventas2026!  |

Cambia estos valores en `backend/.env` antes de usar en producción.

## Desarrollo local sin Docker

### Backend

```bash
cd backend
uv venv .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
export DATABASE_URL=postgresql+asyncpg://gftech:gftech@localhost:5432/gftech_inventario
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.seed
.venv/bin/python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Estructura

```
backend/
  app/
    core/        # config, database, security (JWT)
    models/      # SQLAlchemy: User, Supplier, Category, Product, PhoneModel, Sale, StockMovement
    schemas/     # Pydantic request/response models
    services/    # lógica de negocio (ventas, resurtido, dashboard, compatibilidad)
    api/v1/      # routers FastAPI
  alembic/       # migraciones
frontend/
  src/app/       # rutas (App Router): login, dashboard, productos, ventas, buscador, alertas
  src/components/
  src/hooks/     # TanStack Query hooks por dominio
  src/lib/       # cliente API, tipos, formato
```

## Producción

- Web: https://inventory-gftech.vercel.app
- API: https://inventory-gftech.onrender.com/api/v1 (docs: https://inventory-gftech.onrender.com/docs)
- DB: Neon (base `neondb`, región us-east-2, endpoint con pooler)

## Funcionalidades (mapeadas desde las macros originales)

| Macro VBA original     | Equivalente en la app                                   |
|-------------------------|-----------------------------------------------------------|
| `RegistrarVenta`        | Modal de venta rápida (topbar) + página Ventas            |
| `AgregarProducto`       | Botón "Agregar" en Productos (ID autogenerado)             |
| `ResurtirInventario`    | Acción "Resurtir" en la tabla de productos y en Alertas    |
| `AlertaStockBajo`       | Página Alertas de stock                                    |
| `BuscarPorModelo`       | Buscador por modelo (con tabla de equivalencias normalizada) |
| Hoja Resumen             | Dashboard con KPIs, tendencia de ventas y valor por categoría |
