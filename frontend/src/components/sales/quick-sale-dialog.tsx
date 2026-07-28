"use client";

import { useState } from "react";
import { Search, Minus, Plus, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { useProducts } from "@/hooks/use-products";
import { useRegisterSale } from "@/hooks/use-sales";
import { formatCurrency } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data, isFetching } = useProducts({ search, limit: 8 });
  const registerSale = useRegisterSale();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setSearch("");
      setSelected(null);
      setQuantity(1);
      setUnitPrice("");
      setNotes("");
    }
  }

  function handleSelectProduct(product: Product) {
    setSelected(product);
    setUnitPrice(product.sale_price);
  }

  const total = selected ? (Number(unitPrice || 0) * quantity).toFixed(2) : "0.00";
  const maxQty = selected?.current_stock ?? 0;

  async function handleSubmit() {
    if (!selected) return;
    try {
      const sale = await registerSale.mutateAsync({
        product_id: selected.id,
        quantity,
        unit_price: unitPrice ? Number(unitPrice) : undefined,
        notes: notes || undefined,
      });
      toast.success("Venta registrada", {
        description: `${selected.name} · ${quantity} pza(s) · Ganancia ${formatCurrency(sale.profit)}`,
      });
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo registrar la venta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
          <DialogDescription>Busca el producto por ID, nombre o modelo, y confirma la venta.</DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="INV-001, Ghostic Acrigel, iPhone 15..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {isFetching && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {!isFetching && search.trim().length > 0 && data?.items.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados para “{search}”.</p>
              )}
              {!isFetching &&
                data?.items.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    disabled={product.current_stock <= 0}
                    onClick={() => handleSelectProduct(product)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {product.code} · {product.model_compatibility}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(product.sale_price)}
                      </span>
                      <StatusBadge status={product.status} />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              ← Cambiar producto
            </button>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {selected.code} · {selected.model_compatibility}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Disponible: {maxQty} pieza(s)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
                    className="text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-price">Precio unitario</Label>
                <Input
                  id="unit-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cliente, forma de pago..." />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3">
              <span className="text-sm font-medium text-accent-foreground">Total</span>
              <span className="font-display text-xl font-semibold tabular-nums text-accent-foreground">
                {formatCurrency(total)}
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={registerSale.isPending || quantity < 1 || quantity > maxQty}
              className="w-full cursor-pointer gap-2"
            >
              {registerSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Confirmar venta
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
