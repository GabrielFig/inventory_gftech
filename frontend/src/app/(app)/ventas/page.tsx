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
