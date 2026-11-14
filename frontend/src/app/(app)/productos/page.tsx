"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductsTable } from "@/components/products/products-table";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { RestockDialog } from "@/components/products/restock-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useProducts } from "@/hooks/use-products";
import { useCategories, useSuppliers } from "@/hooks/use-lookups";
import { useDeleteProduct } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";

const ALL = "__all__";
const PAGE_SIZE = 50;
const MAX_LIMIT = 200;

const STATUS_ITEMS: Record<string, string> = {
  [ALL]: "Todo el stock",
  ok: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

type SortKey = "code" | "stock_asc" | "name" | "price_desc";

const SORT_ITEMS: Record<SortKey, string> = {
  code: "Orden: ID",
  stock_asc: "Orden: menos stock",
  name: "Orden: nombre",
  price_desc: "Orden: mayor precio",
};

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  code: (a, b) => a.code.localeCompare(b.code),
  stock_asc: (a, b) => a.current_stock - b.current_stock || a.code.localeCompare(b.code),
  name: (a, b) => a.name.localeCompare(b.name, "es") || a.model_compatibility.localeCompare(b.model_compatibility, "es"),
  price_desc: (a, b) => Number(b.sale_price) - Number(a.sale_price),
};

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [supplierId, setSupplierId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("code");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data, isLoading, isFetching } = useProducts({
    search: search || undefined,
    category_id: categoryId === ALL ? undefined : categoryId,
    supplier_id: supplierId === ALL ? undefined : supplierId,
    status: status === ALL ? undefined : status,
    limit,
  });
  const deleteProduct = useDeleteProduct();

  // Base UI muestra el valor crudo si no conoce las etiquetas: se las pasamos con `items`.
  const categoryItems = useMemo(
    () => ({ [ALL]: "Todas las categorías", ...Object.fromEntries((categories ?? []).map((c) => [c.id, c.name])) }),
    [categories],
  );
  const supplierItems = useMemo(
    () => ({ [ALL]: "Todos los proveedores", ...Object.fromEntries((suppliers ?? []).map((s) => [s.id, s.name])) }),
    [suppliers],
  );

  const items = useMemo(() => [...(data?.items ?? [])].sort(SORTERS[sort]), [data, sort]);
  const hasFilters = !!searchInput || categoryId !== ALL || supplierId !== ALL || status !== ALL;
  const canLoadMore = !!data && data.items.length < data.total && limit < MAX_LIMIT;

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId(ALL);
    setSupplierId(ALL);
    setStatus(ALL);
    setLimit(PAGE_SIZE);
  }

  /** Cambiar un filtro vuelve a la primera página. */
  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setLimit(PAGE_SIZE);
    };
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    try {
      await deleteProduct.mutateAsync(deletingProduct.id);
      toast.success("Producto eliminado");
      setDeletingProduct(null);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo eliminar el producto");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Buscar por ID, nombre o modelo..."
              aria-label="Buscar producto"
              className="h-10 pl-9 sm:h-9"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setFormOpen(true);
              }}
              className="h-10 cursor-pointer gap-1.5 sm:ml-auto sm:h-9"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Select
            items={categoryItems}
            value={categoryId}
            onValueChange={(v) => withReset(setCategoryId)(v ?? ALL)}
          >
            <SelectTrigger className="col-span-2 h-10 w-full sm:h-9 lg:col-span-1" aria-label="Filtrar por categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{categoryItems[ALL]}</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={supplierItems}
            value={supplierId}
            onValueChange={(v) => withReset(setSupplierId)(v ?? ALL)}
          >
            <SelectTrigger className="col-span-2 h-10 w-full sm:h-9 lg:col-span-1" aria-label="Filtrar por proveedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{supplierItems[ALL]}</SelectItem>
              {suppliers?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select items={STATUS_ITEMS} value={status} onValueChange={(v) => withReset(setStatus)(v ?? ALL)}>
            <SelectTrigger className="h-10 w-full sm:h-9" aria-label="Filtrar por estado de stock">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select items={SORT_ITEMS} value={sort} onValueChange={(v) => setSort((v as SortKey) ?? "code")}>
            <SelectTrigger className="h-10 w-full sm:h-9" aria-label="Ordenar productos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground" aria-live="polite">
        <p>
          {data
            ? `Mostrando ${data.items.length} de ${data.total} producto${data.total === 1 ? "" : "s"}`
            : "Cargando..."}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 cursor-pointer gap-1 px-2">
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <ProductsTable
        products={items}
        isLoading={isLoading}
        canManage={isAdmin}
        onEdit={(p) => {
          setEditingProduct(p);
          setFormOpen(true);
        }}
        onRestock={setRestockProduct}
        onDelete={setDeletingProduct}
      />

      {canLoadMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => setLimit((l) => Math.min(l + PAGE_SIZE, MAX_LIMIT))}
            className="h-10 cursor-pointer px-6"
          >
            {isFetching ? "Cargando..." : "Mostrar más"}
          </Button>
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <RestockDialog open={!!restockProduct} onOpenChange={(o) => !o && setRestockProduct(null)} product={restockProduct} />
      <ConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(o) => !o && setDeletingProduct(null)}
        title="Eliminar producto"
        description={`Esta acción eliminará "${deletingProduct?.name}" (${deletingProduct?.code}) del catálogo de forma permanente.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
