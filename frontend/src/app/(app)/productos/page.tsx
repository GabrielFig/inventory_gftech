"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
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
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";

const ALL = "__all__";

export default function ProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [supplierId, setSupplierId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

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
  const { data, isLoading } = useProducts({
    search: search || undefined,
    category_id: categoryId === ALL ? undefined : categoryId,
    supplier_id: supplierId === ALL ? undefined : supplierId,
    status: status === ALL ? undefined : status,
    limit: 100,
  });
  const deleteProduct = useDeleteProduct();

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por ID, nombre o modelo..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? ALL)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las categorías</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? ALL)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los proveedores</SelectItem>
              {suppliers?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todo el stock</SelectItem>
              <SelectItem value="ok">En stock</SelectItem>
              <SelectItem value="bajo">Stock bajo</SelectItem>
              <SelectItem value="agotado">Agotado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
            className="cursor-pointer gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{data ? `${data.total} producto(s) en catálogo` : "Cargando..."}</p>

      <ProductsTable
        products={data?.items ?? []}
        isLoading={isLoading}
        onEdit={(p) => {
          setEditingProduct(p);
          setFormOpen(true);
        }}
        onRestock={setRestockProduct}
        onDelete={setDeletingProduct}
      />

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
