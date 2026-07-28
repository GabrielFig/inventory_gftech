"use client";

import { useState } from "react";
import { Search, Smartphone, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { useCompatibilitySearch } from "@/hooks/use-compatibility";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const NOTE_ORDER = ["Funda", "Mica", "Mica Cámara"];

export function ModelFitSearch({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const [query, setQuery] = useState("");
  const { data, isFetching } = useCompatibilitySearch(query);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        variant === "hero" && "bg-gradient-to-br from-accent/50 via-card to-card p-6 sm:p-8",
        variant === "compact" && "p-4",
      )}
    >
      {variant === "hero" && (
        <div className="mb-5">
          <p className="font-display text-xl font-semibold sm:text-2xl">¿Qué le queda a este modelo?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe la marca o modelo del teléfono y te mostramos la funda, mica y mica de cámara exactas — con
            stock en tiempo real.
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="iPhone 15, Samsung A15, Moto G56..."
          className="h-11 pl-10 text-base"
        />
        {isFetching && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-4 space-y-3">
          {!isFetching && data?.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No encontramos “{query}” en la tabla de equivalencias.
            </p>
          )}

          {data?.map((result) => (
            <div key={`${result.brand}-${result.model}`} className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <p className="font-medium">
                  {result.brand} <span className="text-muted-foreground">·</span> {result.model}
                </p>
              </div>

              {result.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin accesorios registrados para este modelo todavía.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[...result.matches]
                    .sort((a, b) => NOTE_ORDER.indexOf(a.category.name) - NOTE_ORDER.indexOf(b.category.name))
                    .map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {product.category.name} · {formatCurrency(product.sale_price)}
                          </p>
                        </div>
                        <StatusBadge status={product.status} className="shrink-0" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
