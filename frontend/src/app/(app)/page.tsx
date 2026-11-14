"use client";

import { Package, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { IncomeCard } from "@/components/dashboard/income-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { LowStockList } from "@/components/dashboard/low-stock-list";
import { RecentSalesList } from "@/components/dashboard/recent-sales-list";
import { ModelFitSearch } from "@/components/compatibility/model-fit-search";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-6">
      <IncomeCard />
      <ModelFitSearch variant="hero" />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Piezas en inventario"
            value={formatNumber(data.summary.total_pieces_in_stock)}
            hint={`${data.summary.total_products} productos activos`}
            icon={Package}
          />
          <StatCard
            label="Valor de inventario"
            value={formatCurrency(data.summary.inventory_value)}
            hint="Al costo actual"
            icon={Wallet}
          />
          <StatCard
            label="Ganancia total"
            value={formatCurrency(data.summary.total_profit)}
            hint={`${formatNumber(data.summary.total_pieces_sold)} piezas vendidas`}
            icon={TrendingUp}
          />
          <StatCard
            label="Requieren atención"
            value={formatNumber(data.summary.products_low_stock + data.summary.products_out_of_stock)}
            hint={`${data.summary.products_out_of_stock} agotados`}
            icon={AlertTriangle}
            tone={data.summary.products_out_of_stock > 0 ? "danger" : "warning"}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <p className="mb-1 font-display text-base font-semibold">Ventas · últimos 14 días</p>
          <p className="mb-4 text-xs text-muted-foreground">Ingresos diarios por ventas registradas</p>
          {isLoading || !data ? <Skeleton className="h-64 w-full" /> : <SalesTrendChart data={data.sales_trend} />}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <p className="mb-1 font-display text-base font-semibold">Valor por categoría</p>
          <p className="mb-4 text-xs text-muted-foreground">Inventario valorizado al costo</p>
          {isLoading || !data ? <Skeleton className="h-64 w-full" /> : <CategoryChart data={data.category_breakdown} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 font-display text-base font-semibold">Stock bajo o agotado</p>
          <p className="mb-2 text-xs text-muted-foreground">Prioriza tu próximo pedido</p>
          {isLoading || !data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <LowStockList products={data.low_stock_products} />
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 font-display text-base font-semibold">Ventas recientes</p>
          <p className="mb-2 text-xs text-muted-foreground">Últimos movimientos de mostrador</p>
          {isLoading || !data ? <Skeleton className="h-48 w-full" /> : <RecentSalesList sales={data.recent_sales} />}
        </div>
      </div>
    </div>
  );
}
