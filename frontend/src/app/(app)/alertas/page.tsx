"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { RestockDialog } from "@/components/products/restock-dialog";
import { useProducts } from "@/hooks/use-products";
import type { Product } from "@/lib/types";

export default function AlertsPage() {
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const outOfStock = useProducts({ status: "agotado", limit: 100 });
  const lowStock = useProducts({ status: "bajo", limit: 100 });

  const isLoading = outOfStock.isLoading || lowStock.isLoading;
  const total = (outOfStock.data?.total ?? 0) + (lowStock.data?.total ?? 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Cargando..." : `${total} producto(s) requieren atención en tu próximo pedido.`}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Agotados" products={outOfStock.data?.items ?? []} onRestock={setRestockProduct} />
          <Section title="Stock bajo" products={lowStock.data?.items ?? []} onRestock={setRestockProduct} />
        </>
      )}

      <RestockDialog open={!!restockProduct} onOpenChange={(o) => !o && setRestockProduct(null)} product={restockProduct} />
    </div>
  );
}

function Section({
  title,
  products,
  onRestock,
}: {
  title: string;
  products: Product[];
  onRestock: (product: Product) => void;
}) {
  if (products.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{product.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{product.code}</p>
              </div>
              <StatusBadge status={product.status} />
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">{product.model_compatibility}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm tabular-nums">{product.current_stock} pza(s)</span>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer gap-1.5"
                onClick={() => onRestock(product)}
              >
                <PackagePlus className="h-3.5 w-3.5" />
                Resurtir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
