# Editar / Eliminar Venta — Design Spec

## Goal

Permitir corregir o anular una venta ya registrada (error de cantidad, precio, o venta duplicada/equivocada) sin tener que ajustar el stock a mano — solo desde la web, solo Admin.

## Contexto

- Hoy `backend/app/api/v1/sales.py` solo tiene `GET /sales` y `POST /sales` — no existe edición ni borrado.
- El stock se deriva (`Product.current_stock = initial_stock - sold_count`), así que cualquier cambio a una venta ya registrada debe ajustar `sold_count` para que el stock no quede desincronizado.
- Ya existe un enum `MovementType.ADJUSTMENT` en `backend/app/models/stock_movement.py` sin usar — es el hook natural para dejar rastro de auditoría de estas correcciones, igual que ya se hace con `INITIAL` y `SALE`.
- El control de acceso por rol hoy es **solo backend** (`require_admin` en `backend/app/api/deps.py:36`) — el frontend no oculta nada según rol todavía. Esta feature introduce el primer caso de gateo por rol en la UI.
- Alcance: solo web (backend + frontend Next.js). No toca el móvil (que ni siquiera tiene pantalla de historial de ventas todavía).

## Decisiones

- **Quién:** solo Admin — Vendedor ni ve los botones de Editar/Eliminar en la UI, y el backend los rechaza con 403 igual que ya hace con productos.
- **Qué se edita:** `quantity`, `unit_price`, `notes`. El `product_id` de una venta no es editable — si se equivocaron de producto, se borra la venta y se registra una nueva.
- **Auditoría:** cada edición o borrado genera un `StockMovement` tipo `ADJUSTMENT`, igual que ya pasa con `INITIAL` y `SALE`.

## Backend

### `PATCH /api/v1/sales/{sale_id}` (admin)

- Body: `{quantity?: int, unit_price?: Decimal, notes?: str}` (todos opcionales, como `ProductUpdate`).
- Si `quantity` cambia: `delta = new_quantity - old_quantity`. Si `delta > 0` (piden más), validar que `product.current_stock >= delta` antes de aplicar (mismo mensaje de error que `register_sale`: `"Stock insuficiente. Disponible: N pieza(s)"`). Aplicar `product.sold_count += delta`.
- Crear `StockMovement(type=ADJUSTMENT, quantity_delta=-delta, resulting_stock=product.current_stock, note="Edición de venta")` — solo si `delta != 0` (si solo cambió precio/notas, no hay movimiento de stock que registrar).
- Actualizar los campos de `Sale` que vinieron en el payload.
- Devuelve `SaleRead` (mismo shape que `POST /sales`).

### `DELETE /api/v1/sales/{sale_id}` (admin)

- Revierte el stock: `product.sold_count -= sale.quantity`.
- Crea `StockMovement(type=ADJUSTMENT, quantity_delta=+sale.quantity, resulting_stock=product.current_stock, note="Venta eliminada")`.
- Borra la fila de `Sale`.
- `204 No Content`, mismo patrón que `DELETE /products/{id}`.

### Archivos

- Modify: `backend/app/api/v1/sales.py` (agregar los dos endpoints)
- Modify: `backend/app/schemas/sale.py` (agregar `SaleUpdate`)
- Modify: `backend/app/services/sale_service.py` (agregar `update_sale`, `delete_sale`)
- Test: `backend/tests/` (nuevos casos — stock insuficiente al editar, ajuste correcto de stock al borrar, 403 para vendedor)

## Frontend

### Archivos

- Modify: `frontend/src/lib/types.ts` — agregar `SaleUpdateInput` (mismo patrón que `ProductUpdateInput`)
- Modify: `frontend/src/hooks/use-sales.ts` — agregar `useUpdateSale(id)` y `useDeleteSale()`, invalidando `["sales"]`, `["products"]`, `["dashboard"]` (mismas tres keys que `useRegisterSale`)
- Create: `frontend/src/components/sales/sale-edit-dialog.tsx` — diálogo de edición (cantidad, precio, notas), mismo patrón `react-hook-form` + `zod` que `product-form-dialog.tsx`, reusando los campos del `QuickSaleDialog`
- Modify: `frontend/src/app/(app)/ventas/page.tsx` — agregar columna de acciones a la tabla, con el mismo `DropdownMenu` (Editar/Eliminar) que ya usa `products-table.tsx`; reutilizar `ConfirmDialog` para el borrado, igual que en Productos
- Gateo por rol: `const { user } = useAuth(); const isAdmin = user?.role === "admin";` — la columna de acciones (o el `DropdownMenu` completo) solo se renderiza si `isAdmin`

## Fuera de alcance

- Móvil: no se toca — no tiene pantalla de historial de ventas.
- Editar el producto de una venta ya registrada: no soportado, por diseño (borrar + volver a registrar es más simple y menos propenso a errores de reconciliación de stock cruzado entre dos productos).
- Ventana de tiempo para permitir edición (ej. "solo el mismo día"): no se pide, cualquier venta se puede editar/borrar sin importar su fecha.
