"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useIncome } from "@/hooks/use-services";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PERIODS, periodStart, type PeriodKey } from "@/lib/period";

const SHOWN: PeriodKey[] = ["today", "week", "month"];

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-display text-xl font-semibold tabular-nums ${tone === "success" ? "text-success" : ""}`}>
        {value}
      </dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Lo primero que quiere saber quien abre la tienda: cuánto entró hoy, esta semana y este mes. */
export function IncomeCard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [period, setPeriod] = useState<PeriodKey>("today");
  const { data, isLoading, isError, refetch } = useIncome(periodStart(period));
  const current = PERIODS.find((p) => p.key === period);

  return (
    <section aria-labelledby="income-title" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="income-title" className="font-display text-base font-semibold">
          Ingresos
        </h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <TabsList className="h-10! p-1" aria-label="Periodo de ingresos">
            {PERIODS.filter((p) => SHOWN.includes(p.key)).map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="min-w-16 cursor-pointer px-3">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          No se pudieron cargar los ingresos.
          <button type="button" onClick={() => refetch()} className="cursor-pointer font-medium text-primary hover:underline">
            Reintentar
          </button>
        </div>
      ) : isLoading || !data ? (
        <Skeleton className="mt-4 h-16 w-full" />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">Entró {current?.long}</p>
            <p className="font-display text-4xl font-semibold tabular-nums" aria-live="polite">
              {formatCurrency(data.summary.total_revenue)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Figure
              label="Ventas"
              value={formatCurrency(data.summary.sales_revenue)}
              hint={`${formatNumber(data.summary.sales_count)} venta${data.summary.sales_count === 1 ? "" : "s"}`}
            />
            <Figure
              label="Servicios"
              value={formatCurrency(data.summary.services_revenue)}
              hint={`${formatNumber(data.summary.services_count)} cobrado${data.summary.services_count === 1 ? "" : "s"}`}
            />
            {isAdmin ? <Figure label="Ganancia" value={formatCurrency(data.summary.total_profit)} tone="success" /> : null}
          </dl>
        </div>
      )}
    </section>
  );
}
