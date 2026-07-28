"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickSaleDialog } from "@/components/sales/quick-sale-dialog";
import { useSales } from "@/hooks/use-sales";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function SalesPage() {
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const { data, isLoading } = useSales({ limit: 100 });

  const totalRevenue = data?.items.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;
  const totalProfit = data?.items.reduce((sum, s) => sum + Number(s.profit), 0) ?? 0;

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
    </div>
  );
}
