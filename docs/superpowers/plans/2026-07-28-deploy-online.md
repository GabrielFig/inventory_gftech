# Deploy Online (DB + Backend + Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner GF-Tech LM en línea con una base de datos, API y frontend accesibles desde internet, como base para los clientes de escritorio y móvil futuros.

**Architecture:** Postgres gestionado (Neon) + API FastAPI dockerizada desplegada en Railway + frontend Next.js desplegado en Vercel. El frontend habla con la API únicamente por HTTP con JWT en el header `Authorization` (ya implementado así en `frontend/src/lib/api-client.ts`), por lo que no hay dependencia de cookies cross-domain ni de acceso directo a la DB desde el cliente — esto es lo que hace posible reusar la misma API para desktop/mobile más adelante sin cambios.

**Tech Stack:** FastAPI + SQLAlchemy async + asyncpg, Alembic, Next.js 16 (standalone output), Docker, Neon Postgres, Railway, Vercel, GitHub.

## Global Constraints

- No modificar el flujo de Docker Compose local — debe seguir funcionando igual para desarrollo (`docker compose up --build`).
- No romper la conexión a Postgres local sin SSL; el soporte SSL para producción debe ser opt-in por variable de entorno.
- Las credenciales sembradas (`admin@gftech.mx` / `GFTech2026!`, `ventas@gftech.mx` / `Ventas2026!`) deben rotarse antes de que la URL pública se comparta con nadie fuera del propio Gabriel.
- Commits pequeños, uno por tarea.

---

### Task 1: Inicializar git y subir a GitHub

**Files:**
- Create: `.git/` (vía `git init`, en la raíz del proyecto)
- Verify: `.gitignore` (raíz), `backend/.gitignore`, `frontend/.gitignore` ya existen

**Interfaces:**
- Produces: repositorio remoto en GitHub que Railway y Vercel usarán como fuente para sus despliegues (Tasks 3 y 5 se conectan a este repo).

- [ ] **Step 1: Verificar que no hay repo git todavía**

Run: `git -C /home/gabriel/Documentos/portafolio/inventario_gftech status`
Expected: `fatal: not a git repository`

- [ ] **Step 2: Revisar que los `.gitignore` excluyan artefactos y secretos**

Confirmar que `backend/.gitignore` incluye `.venv/`, `__pycache__/`, `.env` (no `.env.example`), y que `frontend/.gitignore` incluye `node_modules/`, `.next/`, `.env.local`. Si falta alguno de estos patrones, agregarlo antes de continuar — **no** se debe commitear `backend/.env` (contiene `SECRET_KEY` y contraseñas semilla) ni `frontend/.env.local`.

- [ ] **Step 3: Inicializar el repo y hacer el primer commit**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
git init
git add .
git status   # revisar que .env, .venv, node_modules, .next NO aparezcan listados
git commit -m "Initial commit: GF-Tech LM inventario"
```

- [ ] **Step 4: Crear el repo en GitHub y hacer push — CHECKPOINT: confirmar con el usuario antes de este paso**

Este paso publica código en GitHub (acción visible externamente) — pedir confirmación explícita antes de ejecutar, incluyendo si el repo debe ser público o privado.

```bash
gh repo create gftech-inventario --private --source=. --remote=origin
git push -u origin main
```

- [ ] **Step 5: Verificar**

Run: `gh repo view gftech-inventario --web` (o revisar en github.com) — confirmar que todos los archivos esperados están presentes y que `backend/.env` / `frontend/.env.local` NO están en el repo.

---

### Task 2: Soporte SSL opcional para Postgres en producción

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/database.py`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `Settings` de `backend/app/core/config.py` (ya existente)
- Produces: `settings.db_ssl_require: bool` — usado por `database.py` para decidir si pasa `connect_args={"ssl": "require"}` al engine. Neon (Task 3) requiere SSL; Postgres local en Docker Compose no lo soporta, así que debe ser opt-in.

- [ ] **Step 1: Agregar el campo a `Settings`**

En `backend/app/core/config.py`, agregar después de `database_url`:

```python
    database_url: str = "postgresql+asyncpg://gftech:gftech@localhost:5432/gftech_inventario"
    db_ssl_require: bool = False
```

- [ ] **Step 2: Usar el campo al crear el engine**

En `backend/app/core/database.py`, reemplazar:

```python
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
```

por:

```python
connect_args = {"ssl": "require"} if settings.db_ssl_require else {}
engine = create_async_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
```

- [ ] **Step 3: Documentar la variable nueva**

En `backend/.env.example`, agregar debajo de `DATABASE_URL`:

```
DB_SSL_REQUIRE=false
```

- [ ] **Step 4: Verificar que el desarrollo local sigue funcionando**

Run: `docker compose up --build` (desde la raíz del proyecto)
Expected: el backend conecta a Postgres local sin SSL, igual que antes; `curl http://localhost:8010/health` devuelve `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config.py backend/app/core/database.py backend/.env.example
git commit -m "feat: soporte SSL opcional para Postgres en producción"
```

---

### Task 3: Provisionar Postgres en Neon

**Files:** ninguno (trabajo manual en la consola de Neon)

**Interfaces:**
- Produces: connection string de Neon en formato `postgresql+asyncpg://<user>:<password>@<host>/<db>` — lo usa Task 4 como `DATABASE_URL` en Railway.

- [ ] **Step 1: Crear proyecto en Neon (manual — requiere cuenta del usuario)**

En https://console.neon.tech: crear proyecto `gftech-inventario`, región `aws-us-west-2` (Oregon — la más cercana a Los Mochis, Sinaloa entre las disponibles), Postgres 16, base de datos `gftech_inventario`.

- [ ] **Step 2: Copiar el connection string**

Neon muestra algo como:
```
postgresql://gftech_inventario_owner:AbC123XyZ@ep-cool-forest-12345.us-west-2.aws.neon.tech/gftech_inventario?sslmode=require
```

- [ ] **Step 3: Convertirlo al formato que usa SQLAlchemy+asyncpg**

Cambiar el esquema de `postgresql://` a `postgresql+asyncpg://` y quitar `?sslmode=require` (el SSL ahora lo maneja `connect_args` de Task 2, no la query string — asyncpg no acepta `sslmode` como parámetro de DSN, solo `ssl`):

```
postgresql+asyncpg://gftech_inventario_owner:AbC123XyZ@ep-cool-forest-12345.us-west-2.aws.neon.tech/gftech_inventario
```

Guardar este valor — se usa como `DATABASE_URL` en Task 4.

- [ ] **Step 4: Verificar la conexión desde tu máquina (opcional pero recomendado)**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://gftech_inventario_owner:AbC123XyZ@ep-cool-forest-12345.us-west-2.aws.neon.tech/gftech_inventario" \
DB_SSL_REQUIRE=true \
.venv/bin/python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def check():
    engine = create_async_engine('postgresql+asyncpg://gftech_inventario_owner:AbC123XyZ@ep-cool-forest-12345.us-west-2.aws.neon.tech/gftech_inventario', connect_args={'ssl': 'require'})
    async with engine.connect():
        print('conectado OK')
    await engine.dispose()

asyncio.run(check())
"
```
Expected: `conectado OK` (sustituir con el connection string real del Step 2).

---

### Task 4: Desplegar el backend en Render

**Files:** ninguno (trabajo manual en la consola de Render + variables de entorno)

**Interfaces:**
- Consumes: connection string de Task 3, código del repo de Task 1
- Produces: URL pública del backend (ej. `https://gftech-backend.onrender.com`) — la usa Task 5 como `NEXT_PUBLIC_API_URL`.

- [ ] **Step 1: Crear el Web Service en Render (manual — requiere cuenta del usuario)**

En https://dashboard.render.com: New → Web Service → conectar el repo `GabrielFig/inventory_gftech`. **Root Directory** = `backend`. Render detecta el `Dockerfile` automáticamente (Runtime: Docker). Instance Type: **Free**.

- [ ] **Step 2: Configurar variables de entorno del servicio**

En la sección Environment del Web Service en Render:

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_uDEaLwPG34qi@ep-polished-term-aynyderv-pooler.c-5.us-east-2.aws.neon.tech/neondb
DB_SSL_REQUIRE=true
PORT=8000
SECRET_KEY=JESRy7VD_MfBK0tUOQuls2s-2z9laQY9-i4pdfmYB18
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=["http://localhost:3000"]
LOW_STOCK_THRESHOLD=2
SEED_ADMIN_EMAIL=admin@gftech.mx
SEED_ADMIN_PASSWORD=9X9XX7Wr9ShWnz0D!
SEED_VENDEDOR_EMAIL=ventas@gftech.mx
SEED_VENDEDOR_PASSWORD=KIzzrzXx7kbXKxAJ!
```

`PORT=8000` es necesario porque Render, en servicios Docker, espera que el contenedor escuche en el puerto indicado por la variable `PORT` (por defecto 10000) — nuestro `entrypoint.sh` tiene el puerto 8000 fijo (`uvicorn ... --port 8000`), así que se lo decimos a Render explícitamente en vez de tocar el entrypoint.

`CORS_ORIGINS` se deja con el valor local por ahora — se actualiza en Task 5 Step 4 una vez que exista la URL de Vercel.

- [ ] **Step 3: Confirmar la URL pública**

Render asigna automáticamente un dominio del tipo `https://<nombre-del-servicio>.onrender.com` al crear el Web Service — visible arriba del dashboard del servicio, no requiere paso extra.

- [ ] **Step 4: Verificar el despliegue**

Run: `curl https://<dominio-render>/health`
Expected: `{"status":"ok"}` (el primer request puede tardar ~30-50s si el servicio free estaba dormido).

Run: `curl https://<dominio-render>/docs` (o abrir en el navegador)
Expected: la UI de Swagger carga correctamente.

---

### Task 5: Desplegar el frontend en Vercel

**Files:** ninguno (trabajo manual en la consola de Vercel), más una actualización de variable en Render

**Interfaces:**
- Consumes: URL de Render de Task 4 (como `NEXT_PUBLIC_API_URL`)
- Produces: URL pública del frontend (ej. `https://gftech-inventario.vercel.app`)

- [ ] **Step 1: Crear proyecto en Vercel (manual — requiere cuenta del usuario)**

En https://vercel.com: Add New → Project → importar `gftech-inventario` desde GitHub. En "Root Directory" seleccionar `frontend`. Vercel detecta Next.js automáticamente.

- [ ] **Step 2: Configurar variable de entorno**

En Settings → Environment Variables del proyecto Vercel:

```
NEXT_PUBLIC_API_URL=https://<dominio-render>/api/v1
```

Aplicar a Production, Preview y Development.

- [ ] **Step 3: Deploy y obtener la URL**

Vercel despliega automáticamente al importar. Confirmar la URL asignada, ej. `https://gftech-inventario.vercel.app`.

- [ ] **Step 4: Actualizar CORS en Render**

Volver a Render → Environment del backend → actualizar:

```
CORS_ORIGINS=["https://gftech-inventario.vercel.app"]
```

Guardar — Render redeploya el servicio automáticamente con la nueva variable.

- [ ] **Step 5: Verificar**

Abrir `https://gftech-inventario.vercel.app/login` en el navegador. Revisar la consola del navegador (Network tab): la petición a `/api/v1/auth/login` debe responder sin error de CORS.

---

### Task 6: Verificación end-to-end y hardening antes de compartir la URL

**Files:**
- Modify: `README.md` (raíz del proyecto)

**Interfaces:** ninguna — tarea de verificación y documentación.

- [ ] **Step 1: Flujo de login completo en producción**

En `https://gftech-inventario.vercel.app/login`, iniciar sesión con las credenciales **nuevas** configuradas en Task 4 Step 2 (no las de desarrollo). Verificar que el dashboard carga con los KPIs.

- [ ] **Step 2: Probar una venta de extremo a extremo**

Registrar una venta de prueba desde la UI, confirmar que el stock del producto baja y que aparece en la página de Ventas — esto ejercita frontend → API → Neon en un solo flujo.

- [ ] **Step 3: Confirmar que las credenciales de desarrollo ya no funcionan en producción**

Intentar login con `admin@gftech.mx` / `GFTech2026!` (las de desarrollo) contra la URL de producción — debe fallar, confirmando que Task 4 Step 2 sí tomó las contraseñas nuevas.

- [ ] **Step 4: Documentar las URLs de producción en el README**

Agregar una sección al final de `README.md`:

```markdown
## Producción

- Web: https://gftech-inventario.vercel.app
- API: https://<dominio-render>/api/v1 (docs: https://<dominio-render>/docs)
- DB: Neon (base `neondb`, región us-east-2, endpoint con pooler)
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: agregar URLs de producción"
git push
```

---

## Fuera de alcance de este plan (fases futuras, planes separados)

- **Fase 2 — Desktop (Tauri):** requiere su propio plan (elección de auth storage nativo, empaquetado por SO, distribución de instaladores). Depende de que la API de este plan esté online y estable.
- **Fase 3 — Mobile (React Native/Expo):** requiere su propio plan (Expo Secure Store en vez de cookies para el token, navegación nativa, publicación en stores). También depende de la API online.

Ambas reusan la misma API REST desplegada aquí sin cambios — solo hacen falta clientes nuevos que hablen el mismo protocolo JWT que ya usa `frontend/src/lib/api-client.ts`.
