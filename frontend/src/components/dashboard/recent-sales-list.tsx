import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Sale } from "@/lib/types";

export function RecentSalesList({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay ventas registradas.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {sales.map((sale) => (
        <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sale.product.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {sale.quantity} pza · {formatDateTime(sale.sale_date)}
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(sale.total)}</span>
        </li>
      ))}
      <li className="pt-3">
        <Link href="/ventas" className="text-xs font-medium text-primary hover:underline">
          Ver historial completo →
        </Link>
      </li>
    </ul>
  );
}
