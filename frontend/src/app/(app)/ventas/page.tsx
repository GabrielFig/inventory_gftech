"use client";

import { Fragment, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SaleEditDialog } from "@/components/sales/sale-edit-dialog";
import { useDeleteSale, useSales } from "@/hooks/use-sales";
import { useIncome } from "@/hooks/use-services";
import { useAuth } from "@/hooks/use-auth";
import { dayKey, formatCurrency, formatDayHeading, formatNumber, formatTime } from "@/lib/format";
import { PERIODS, periodStart, type PeriodKey } from "@/lib/period";
import { ApiClientError } from "@/lib/api-client";
import type { Sale } from "@/lib/types";

const PAGE_SIZE = 50;
const MAX_LIMIT = 200;

interface DayGroup {
  key: string;
  total: number;
  sales: Sale[];
}

function groupByDay(sales: Sale[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const sale of sales) {
    const key = dayKey(sale.sale_date);
    const group = map.get(key) ?? { key, total: 0, sales: [] };
    group.total += Number(sale.total);
    group.sales.push(sale);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

function SaleActions({
  sale,
  onEdit,
  onDelete,
  className,
}: {
  sale: Sale;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={`cursor-pointer ${className ?? ""}`}
            aria-label={`Acciones de la venta de ${sale.product.name}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(sale)} className="cursor-pointer">
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(sale)} className="cursor-pointer text-danger focus:text-danger">
          <Trash2 className="h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function SalesPage() {
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [searchInput, setSearchInput] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const deleteSale = useDeleteSale();

  const dateFrom = periodStart(period);
  const { data, isLoading, isFetching } = useSales({ date_from: dateFrom, limit });
  // Totales exactos del periodo (no solo de las filas cargadas).
  const income = useIncome(dateFrom);

  const term = searchInput.trim().toLowerCase();
  const visible = useMemo(() => {
    const items = data?.items ?? [];
    if (!term) return items;
    return items.filter((s) =>
      [s.product.name, s.product.model_compatibility, s.notes ?? ""].some((text) => text.toLowerCase().includes(term)),
    );
  }, [data, term]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const canLoadMore = !!data && data.items.length < data.total && limit < MAX_LIMIT;
  const summary = income.data?.summary;

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
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={period}
            onValueChange={(v) => {
              setPeriod(v as PeriodKey);
              setLimit(PAGE_SIZE);
            }}
          >
            <TabsList className="h-10! w-full p-1 sm:w-fit" aria-label="Periodo de ventas">
              {PERIODS.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="cursor-pointer px-3 sm:min-w-16">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar producto, modelo o nota..."
              aria-label="Buscar en las ventas"
              className="h-10 pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Borrar búsqueda"
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <dl className="flex gap-8" aria-live="polite">
          <div>
            <dt className="text-xs text-muted-foreground">Vendido</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">
              {summary ? formatCurrency(summary.sales_revenue) : <Skeleton className="mt-1 h-6 w-24" />}
            </dd>
          </div>
          {isAdmin && (
            <div>
              <dt className="text-xs text-muted-foreground">Ganancia</dt>
              <dd className="font-display text-xl font-semibold tabular-nums text-success">
                {summary ? formatCurrency(summary.sales_profit) : <Skeleton className="mt-1 h-6 w-24" />}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Ventas</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">
              {summary ? formatNumber(summary.sales_count) : <Skeleton className="mt-1 h-6 w-12" />}
            </dd>
          </div>
        </dl>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
          {term
            ? `Ninguna venta cargada coincide con “${searchInput.trim()}”.`
            : period === "all"
              ? "Aún no hay ventas registradas."
              : "Sin ventas en este periodo. Prueba con un rango más amplio."}
        </div>
      ) : (
        <>
          {/* Celular: tarjetas agrupadas por día. */}
          <div className="space-y-5 md:hidden">
            {groups.map((group) => (
              <section key={group.key} aria-label={formatDayHeading(group.key)}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold">{formatDayHeading(group.key)}</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(group.total)}</span>
                </div>
                <ul className="space-y-2">
                  {group.sales.map((sale) => (
                    <li key={sale.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{sale.product.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{sale.product.model_compatibility}</p>
                        </div>
                        {isAdmin && (
                          <SaleActions
                            sale={sale}
                            onEdit={setEditingSale}
                            onDelete={setDeletingSale}
                            className="-mr-1 -mt-1 size-11"
                          />
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatTime(sale.sale_date)} · {sale.quantity} × {formatCurrency(sale.unit_price)}
                        </span>
                        <span className="font-display text-lg font-semibold tabular-nums">
                          {formatCurrency(sale.total)}
                        </span>
                      </div>
                      {(sale.notes || isAdmin) && (
                        <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                          <span className="truncate">{sale.notes ?? ""}</span>
                          {isAdmin && (
                            <span className="shrink-0 tabular-nums text-success">+{formatCurrency(sale.profit)}</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {isAdmin && <TableHead className="text-right">Ganancia</TableHead>}
                  <TableHead>Notas</TableHead>
                  {isAdmin && (
                    <TableHead className="w-10">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={isAdmin ? 9 : 7} className="py-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-semibold">{formatDayHeading(group.key)}</span>
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatCurrency(group.total)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {formatTime(sale.sale_date)}
                        </TableCell>
                        <TableCell className="font-medium">{sale.product.name}</TableCell>
                        <TableCell
                          className="max-w-36 truncate text-sm text-muted-foreground"
                          title={sale.product.model_compatibility}
                        >
                          {sale.product.model_compatibility}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{sale.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(sale.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(sale.total)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right tabular-nums text-success">
                            {formatCurrency(sale.profit)}
                          </TableCell>
                        )}
                        <TableCell className="max-w-32 truncate text-sm text-muted-foreground" title={sale.notes ?? ""}>
                          {sale.notes ?? "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <SaleActions sale={sale} onEdit={setEditingSale} onDelete={setDeletingSale} />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {canLoadMore && (
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                disabled={isFetching}
                onClick={() => setLimit((l) => Math.min(l + PAGE_SIZE, MAX_LIMIT))}
                className="h-10 cursor-pointer px-6"
              >
                {isFetching ? "Cargando..." : "Mostrar más ventas"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Mostrando {data?.items.length} de {data?.total}
              </p>
            </div>
          )}
        </>
      )}

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
