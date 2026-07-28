import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { Product } from "@/lib/types";

export function LowStockList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todo el inventario tiene stock suficiente.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {products.map((product) => (
        <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {product.code} · {product.model_compatibility}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">{product.current_stock} pza</span>
            <StatusBadge status={product.status} />
          </div>
        </li>
      ))}
      <li className="pt-3">
        <Link href="/alertas" className="text-xs font-medium text-primary hover:underline">
          Ver todas las alertas →
        </Link>
      </li>
    </ul>
  );
}
