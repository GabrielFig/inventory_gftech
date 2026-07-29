# Editar / Eliminar Venta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin puede editar (cantidad/precio/notas) o eliminar una venta ya registrada desde la web, con el stock ajustándose correctamente y quedando rastro de auditoría — según `docs/superpowers/specs/2026-07-29-edit-delete-sale-design.md`.

**Architecture:** Dos endpoints nuevos (`PATCH`/`DELETE /api/v1/sales/{id}`, gateados con `require_admin`) que ajustan `Product.sold_count` y registran un `StockMovement` tipo `ADJUSTMENT`. En el frontend, dos hooks nuevos (`useUpdateSale`/`useDeleteSale`), un diálogo de edición, y una columna de acciones en la tabla de Ventas que solo se renderiza si `user.role === "admin"`.

**Tech Stack:** FastAPI + SQLAlchemy async (backend), Next.js + TanStack Query + react-hook-form + zod (frontend), pytest + pytest-asyncio + httpx + aiosqlite (tests backend, ya en `requirements-dev.txt` pero sin usar todavía — este plan escribe el primer archivo de tests del proyecto).

## Global Constraints

- `product_id` de una venta NO es editable — `PATCH` solo acepta `quantity`, `unit_price`, `notes`.
- Editar/eliminar es exclusivo de Admin — backend con `require_admin` (403 para Vendedor) y frontend ocultando los controles si `user.role !== "admin"`.
- Todo ajuste de stock por edición/borrado debe crear un `StockMovement` tipo `ADJUSTMENT` (igual patrón que `INITIAL`/`SALE`/`RESTOCK` ya existentes).
- Si aumentar la cantidad de una venta deja el stock en negativo, rechazar con 400 y el mismo mensaje que ya usa `register_sale`: `"Stock insuficiente. Disponible: N pieza(s)"`.
- No se toca el móvil (`mobile/`) — no tiene pantalla de historial de ventas.

---

### Task 1: Infraestructura de tests del backend

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Produces: fixtures `db_session`, `client`, `admin_user`, `vendedor_user`, `admin_headers`, `vendedor_headers`, `test_product` — usadas por la Task 2. Este es el primer archivo de tests del proyecto (las dependencias `pytest`/`pytest-asyncio`/`httpx`/`aiosqlite` ya están en `requirements-dev.txt` sin usar).

- [ ] **Step 1: Fixtures compartidas**

Crear `backend/tests/conftest.py`:

```python
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
```

- [ ] **Step 2: Test de humo — probar que el harness funciona**

Crear `backend/tests/test_health.py`:

```python
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 3: Correr los tests**

```bash
cd backend
uv venv .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
.venv/bin/python -m pytest tests/ -v
```
Expected: `tests/test_health.py::test_health_check PASSED`, 1 passed.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/conftest.py backend/tests/test_health.py
git commit -m "test(backend): infraestructura de tests con SQLite en memoria"
```

---

### Task 2: Backend — editar y eliminar venta

**Files:**
- Modify: `backend/app/schemas/sale.py`
- Modify: `backend/app/services/sale_service.py`
- Modify: `backend/app/api/v1/sales.py`
- Create: `backend/tests/test_sales.py`

**Interfaces:**
- Consumes: fixtures de Task 1 (`client`, `admin_headers`, `vendedor_headers`, `test_product`)
- Produces: `PATCH /api/v1/sales/{id}` y `DELETE /api/v1/sales/{id}` — no hay tareas frontend que dependan de la forma exacta del código Python, solo del contrato HTTP (ya documentado en el spec).

- [ ] **Step 1: Escribir los tests primero (fallarán — los endpoints no existen todavía)**

Crear `backend/tests/test_sales.py`:

```python
import uuid

import pytest

from app.models.sale import Sale


@pytest.fixture
async def test_sale(db_session, test_product, admin_user):
    sale = Sale(
        product_id=test_product.id,
        sold_by_id=admin_user.id,
        quantity=2,
        unit_price=test_product.sale_price,
        unit_cost=test_product.cost,
        notes=None,
    )
    test_product.sold_count += 2
    db_session.add(sale)
    await db_session.commit()
    await db_session.refresh(sale)
    await db_session.refresh(test_product)
    return sale


async def test_update_sale_quantity_adjusts_stock(client, admin_headers, test_sale, test_product):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 4},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["quantity"] == 4

    product_response = await client.get(f"/api/v1/products/{test_product.id}", headers=admin_headers)
    # sold_count: 2 (venta original) + 2 (delta del ajuste) = 4; stock inicial 10 -> current_stock 6
    assert product_response.json()["current_stock"] == 6


async def test_update_sale_insufficient_stock_returns_400(client, admin_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 999},
        headers=admin_headers,
    )
    assert response.status_code == 400
    assert "Stock insuficiente" in response.json()["detail"]


async def test_update_sale_price_and_notes_only(client, admin_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"unit_price": 99.99, "notes": "corrección de precio"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["unit_price"] == "99.99"
    assert body["notes"] == "corrección de precio"
    assert body["quantity"] == 2  # sin cambios


async def test_update_sale_forbidden_for_vendedor(client, vendedor_headers, test_sale):
    response = await client.patch(
        f"/api/v1/sales/{test_sale.id}",
        json={"quantity": 3},
        headers=vendedor_headers,
    )
    assert response.status_code == 403


async def test_update_sale_not_found_returns_404(client, admin_headers):
    response = await client.patch(
        f"/api/v1/sales/{uuid.uuid4()}",
        json={"quantity": 1},
        headers=admin_headers,
    )
    assert response.status_code == 404


async def test_delete_sale_restores_stock(client, admin_headers, test_sale, test_product):
    response = await client.delete(f"/api/v1/sales/{test_sale.id}", headers=admin_headers)
    assert response.status_code == 204

    product_response = await client.get(f"/api/v1/products/{test_product.id}", headers=admin_headers)
    assert product_response.json()["current_stock"] == test_product.initial_stock

    sales_response = await client.get("/api/v1/sales", headers=admin_headers)
    assert sales_response.json()["total"] == 0


async def test_delete_sale_forbidden_for_vendedor(client, vendedor_headers, test_sale):
    response = await client.delete(f"/api/v1/sales/{test_sale.id}", headers=vendedor_headers)
    assert response.status_code == 403


async def test_delete_sale_not_found_returns_404(client, admin_headers):
    response = await client.delete(f"/api/v1/sales/{uuid.uuid4()}", headers=admin_headers)
    assert response.status_code == 404
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd backend
.venv/bin/python -m pytest tests/test_sales.py -v
```
Expected: FAIL — `404 Not Found` en las peticiones PATCH/DELETE (las rutas no existen todavía) o `AttributeError` si `sale_service.update_sale`/`delete_sale` no existen.

- [ ] **Step 3: Agregar el schema `SaleUpdate`**

En `backend/app/schemas/sale.py`, agregar después de `SaleCreate`:

```python
class SaleUpdate(BaseModel):
    quantity: int | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=255)
```

- [ ] **Step 4: Agregar `update_sale` y `delete_sale` al servicio**

En `backend/app/services/sale_service.py`, la línea 12 ya importa `SaleCreate` y la línea 13 ya importa `get_product` — solo hace falta agregar `SaleUpdate` al import existente:

```python
from app.schemas.sale import SaleCreate, SaleUpdate
```

`HTTPException`/`status` (línea 4) y `MovementType`/`StockMovement` (línea 11) también ya están importados — no hace falta tocar nada más de los imports.

Agregar al final del archivo:

```python
async def update_sale(db: AsyncSession, sale: Sale, payload: SaleUpdate) -> Sale:
    product = await get_product(db, sale.product_id)
    data = payload.model_dump(exclude_unset=True)

    if "quantity" in data and data["quantity"] != sale.quantity:
        delta = data["quantity"] - sale.quantity
        if delta > 0 and delta > product.current_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente. Disponible: {product.current_stock} pieza(s)",
            )
        product.sold_count += delta
        db.add(
            StockMovement(
                product_id=product.id,
                type=MovementType.ADJUSTMENT,
                quantity_delta=-delta,
                resulting_stock=product.current_stock,
                note="Edición de venta",
            )
        )

    for field, value in data.items():
        setattr(sale, field, value)

    await db.flush()
    await db.commit()
    return await get_sale(db, sale.id)


async def delete_sale(db: AsyncSession, sale: Sale) -> None:
    product = await get_product(db, sale.product_id)
    product.sold_count -= sale.quantity
    db.add(
        StockMovement(
            product_id=product.id,
            type=MovementType.ADJUSTMENT,
            quantity_delta=sale.quantity,
            resulting_stock=product.current_stock,
            note="Venta eliminada",
        )
    )
    await db.delete(sale)
    await db.commit()
```

- [ ] **Step 5: Agregar los endpoints**

En `backend/app/api/v1/sales.py`, actualizar los imports:

```python
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleListResponse, SaleRead, SaleUpdate
from app.services import sale_service
```

(`require_admin`, `HTTPException`, y `SaleUpdate` son los agregados nuevos — no duplicar lo que ya esté.)

Agregar al final del archivo, después de `register_sale`:

```python
@router.patch("/{sale_id}", response_model=SaleRead)
async def update_sale(
    sale_id: uuid.UUID,
    payload: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> SaleRead:
    sale = await sale_service.get_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    return await sale_service.update_sale(db, sale, payload)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(
    sale_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    sale = await sale_service.get_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    await sale_service.delete_sale(db, sale)
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

```bash
.venv/bin/python -m pytest tests/test_sales.py -v
```
Expected: 8 passed.

- [ ] **Step 7: Correr toda la suite (nada se rompió)**

```bash
.venv/bin/python -m pytest tests/ -v
```
Expected: 9 passed (los 8 de `test_sales.py` + el de `test_health.py`).

- [ ] **Step 8: Verificar manualmente contra Docker Compose**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
docker compose up --build -d backend
curl -s -X POST http://localhost:8010/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@gftech.mx","password":"GFTech2026!"}'
```
Con el `access_token` de la respuesta, probar un `PATCH /api/v1/sales/{id}` real contra una venta existente del catálogo sembrado, y confirmar en `/docs` (Swagger) que los dos endpoints nuevos aparecen documentados.

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/sale.py backend/app/services/sale_service.py backend/app/api/v1/sales.py backend/tests/test_sales.py
git commit -m "feat(backend): editar y eliminar venta con ajuste de stock y auditoría"
```

---

### Task 3: Frontend — tipos y hooks

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/hooks/use-sales.ts`

**Interfaces:**
- Consumes: contrato HTTP de la Task 2 (`PATCH`/`DELETE /sales/{id}`)
- Produces: `SaleUpdateInput`, `useUpdateSale(id)`, `useDeleteSale()` — usados por las Tasks 4 y 5.

- [ ] **Step 1: Agregar el tipo `SaleUpdateInput`**

En `frontend/src/lib/types.ts`, agregar después de `SaleCreateInput`:

```ts
export type SaleUpdateInput = Partial<Pick<SaleCreateInput, "quantity" | "unit_price" | "notes">>;
```

- [ ] **Step 2: Agregar los hooks**

En `frontend/src/hooks/use-sales.ts`, actualizar el import de tipos:

```ts
import type { Sale, SaleCreateInput, SaleListResponse, SaleUpdateInput } from "@/lib/types";
```

Agregar al final del archivo:

```ts
export function useUpdateSale(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaleUpdateInput) => apiFetch<Sale>(`/sales/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd frontend
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/hooks/use-sales.ts
git commit -m "feat(frontend): tipos y hooks para editar/eliminar venta"
```

---

### Task 4: Frontend — diálogo de edición de venta

**Files:**
- Create: `frontend/src/components/sales/sale-edit-dialog.tsx`

**Interfaces:**
- Consumes: `useUpdateSale` de la Task 3; tipo `Sale` de `frontend/src/lib/types.ts`
- Produces: componente `SaleEditDialog({ open, onOpenChange, sale })` — usado por la Task 5.

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/sales/sale-edit-dialog.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateSale } from "@/hooks/use-sales";
import { ApiClientError } from "@/lib/api-client";
import type { Sale } from "@/lib/types";

const schema = z.object({
  quantity: z.coerce.number().int().positive("Debe ser mayor a 0"),
  unit_price: z.coerce.number().positive("Debe ser mayor a 0"),
  notes: z.string().max(255).optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function SaleEditDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}) {
  const updateSale = useUpdateSale(sale?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, unit_price: 0, notes: "" },
  });

  useEffect(() => {
    if (open && sale) {
      reset({
        quantity: sale.quantity,
        unit_price: Number(sale.unit_price),
        notes: sale.notes ?? "",
      });
    }
  }, [open, sale, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await updateSale.mutateAsync({
        quantity: values.quantity,
        unit_price: values.unit_price,
        notes: values.notes || undefined,
      });
      toast.success("Venta actualizada");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo actualizar la venta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar venta</DialogTitle>
          <DialogDescription>{sale ? `${sale.product.name} · ${sale.product.code}` : ""}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-danger">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Precio unitario</Label>
              <Input id="unit_price" type="number" step="0.01" {...register("unit_price")} />
              {errors.unit_price && <p className="text-xs text-danger">{errors.unit_price.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register("notes")} placeholder="Cliente, forma de pago..." />
          </div>

          <Button type="submit" disabled={updateSale.isPending} className="w-full cursor-pointer gap-2">
            {updateSale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/sales/sale-edit-dialog.tsx
git commit -m "feat(frontend): diálogo de edición de venta"
```

---

### Task 5: Frontend — acciones en la tabla de Ventas (solo Admin)

**Files:**
- Modify: `frontend/src/app/(app)/ventas/page.tsx`

**Interfaces:**
- Consumes: `useDeleteSale` (Task 3), `SaleEditDialog` (Task 4), `useAuth` (ya existente), `ConfirmDialog` (ya existente)
- Produces: ninguna — última tarea del plan.

- [ ] **Step 1: Reemplazar el archivo completo**

Reemplazar el contenido completo de `frontend/src/app/(app)/ventas/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QuickSaleDialog } from "@/components/sales/quick-sale-dialog";
import { SaleEditDialog } from "@/components/sales/sale-edit-dialog";
import { useDeleteSale, useSales } from "@/hooks/use-sales";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import type { Sale } from "@/lib/types";

export default function SalesPage() {
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const { data, isLoading } = useSales({ limit: 100 });
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const deleteSale = useDeleteSale();

  const totalRevenue = data?.items.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;
  const totalProfit = data?.items.reduce((sum, s) => sum + Number(s.profit), 0) ?? 0;

  async function handleDelete() {
    if (!deletingSale) return;
    try {
      await deleteSale.mutateAsync(deletingSale.id);
      toast.success("Venta eliminada");
      setDeletingSale(null);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo eliminar la venta");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Ingresos (mostrados)</p>
            <p className="font-display text-lg font-semibold tabular-nums">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ganancia (mostrada)</p>
            <p className="font-display text-lg font-semibold tabular-nums text-success">{formatCurrency(totalProfit)}</p>
          </div>
        </div>
        <Button onClick={() => setQuickSaleOpen(true)} className="cursor-pointer gap-1.5">
          <Plus className="h-4 w-4" />
          Registrar venta
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead>Notas</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(sale.sale_date)}</TableCell>
                  <TableCell className="font-medium">{sale.product.name}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                    {sale.product.model_compatibility}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{sale.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(sale.unit_price)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{formatCurrency(sale.profit)}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{sale.notes ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label="Acciones" />}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSale(sale)} className="cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingSale(sale)}
                            className="cursor-pointer text-danger focus:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Aún no hay ventas registradas.
        </div>
      )}

      <QuickSaleDialog open={quickSaleOpen} onOpenChange={setQuickSaleOpen} />
      <SaleEditDialog open={!!editingSale} onOpenChange={(o) => !o && setEditingSale(null)} sale={editingSale} />
      <ConfirmDialog
        open={!!deletingSale}
        onOpenChange={(o) => !o && setDeletingSale(null)}
        title="Eliminar venta"
        description={
          deletingSale
            ? `Esta acción eliminará la venta de "${deletingSale.product.name}" (${deletingSale.quantity} pza) y devolverá el stock.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Verificación manual end-to-end**

```bash
cd /home/gabriel/Documentos/portafolio/inventario_gftech
docker compose up --build -d
```
Abrir `http://localhost:3010`, login como `admin@gftech.mx` / `GFTech2026!`, ir a Ventas:
1. Confirmar que aparece la columna de acciones (⋯) por fila.
2. Editar una venta (cambiar cantidad y precio) → confirmar que la tabla y el stock del producto (en Productos) se actualizan.
3. Eliminar una venta → confirmar el diálogo de confirmación, y que el stock se restaura.
4. Cerrar sesión, entrar como `ventas@gftech.mx` / `Ventas2026!` → confirmar que la columna de acciones NO aparece en Ventas.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(app)/ventas/page.tsx"
git commit -m "feat(frontend): editar y eliminar venta desde la tabla (solo Admin)"
```
