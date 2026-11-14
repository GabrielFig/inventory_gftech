"use client";

import { useState } from "react";
import { Search, Minus, Plus, Loader2, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { useProducts } from "@/hooks/use-products";
import { useRegisterSaleBatch } from "@/hooks/use-sales";
import { useAuth } from "@/hooks/use-auth";
import { dayKey, formatCurrency } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CartLine {
  product: Product;
  quantity: number;
  /** Texto del input: se valida al registrar. */
  unitPrice: string;
}

/** Una venta que no se capturó a tiempo se guarda a mediodía de ese día (la hora exacta no importa). */
function noonOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function yesterdayKey(): string {
  const now = new Date();
  return dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

export function QuickSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [otherDay, setOtherDay] = useState(false);
  const [day, setDay] = useState(yesterdayKey);
  const [notes, setNotes] = useState("");

  const { data, isFetching } = useProducts({ search, limit: 8 });
  const registerSale = useRegisterSaleBatch();

  function reset() {
    setSearch("");
    setCart([]);
    setOtherDay(false);
    setDay(yesterdayKey());
    setNotes("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function addToCart(product: Product) {
    setCart((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      if (existing) {
        return lines.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(product.current_stock, l.quantity + 1) } : l,
        );
      }
      return [...lines, { product, quantity: 1, unitPrice: product.sale_price }];
    });
  }

  function updateLine(id: string, patch: Partial<Pick<CartLine, "quantity" | "unitPrice">>) {
    setCart((lines) => lines.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setCart((lines) => lines.filter((l) => l.product.id !== id));
  }

  const today = dayKey(new Date());
  const lineTotal = (l: CartLine) => Number(l.unitPrice || 0) * l.quantity;
  const total = cart.reduce((sum, l) => sum + lineTotal(l), 0);
  const pieces = cart.reduce((sum, l) => sum + l.quantity, 0);
  const dayInvalid = otherDay && (!day || day > today);
  const priceInvalid = cart.some((l) => !(Number(l.unitPrice) > 0));
  const canSubmit = cart.length > 0 && !dayInvalid && !priceInvalid && !registerSale.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const result = await registerSale.mutateAsync({
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: Number(l.unitPrice),
        })),
        notes: notes.trim() || undefined,
        sale_date: otherDay ? noonOf(day) : undefined,
      });
      toast.success(cart.length === 1 ? "Venta registrada" : `Venta registrada · ${cart.length} productos`, {
        description: `${pieces} pza(s) · ${formatCurrency(result.total)}${isAdmin ? ` · Ganancia ${formatCurrency(result.profit)}` : ""}${otherDay ? " · con fecha anterior" : ""}`,
      });
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo registrar la venta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
          <DialogDescription>Agrega uno o varios productos y confirma. Se registran juntos en un ticket.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar por ID, nombre o modelo..."
              aria-label="Buscar producto para agregar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>

          <ul className="max-h-52 space-y-1 overflow-y-auto" aria-label="Resultados de búsqueda">
            {isFetching && (
              <li className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </li>
            )}
            {!isFetching && search.trim().length > 0 && data?.items.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">Sin resultados para “{search}”.</li>
            )}
            {!isFetching &&
              data?.items.map((product) => {
                const inCart = cart.find((l) => l.product.id === product.id)?.quantity ?? 0;
                const soldOut = product.current_stock <= 0;
                const maxed = inCart >= product.current_stock;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={soldOut || maxed}
                      onClick={() => addToCart(product)}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {product.code} · {product.model_compatibility}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {inCart > 0 && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            {inCart} en venta
                          </span>
                        )}
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(product.sale_price)}
                        </span>
                        <StatusBadge status={product.status} />
                        {!soldOut && !maxed && <Plus className="h-4 w-4 text-primary" aria-hidden />}
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>

        <section aria-label="Productos de la venta" className="space-y-2">
          <h3 className="text-sm font-semibold">
            {cart.length === 0 ? "La venta está vacía" : `En esta venta (${pieces} pza${pieces === 1 ? "" : "s"})`}
          </h3>
          {cart.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Toca un producto de la lista para agregarlo.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((line) => (
                <li key={line.product.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.product.model_compatibility} · quedan {line.product.current_stock}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.product.id)}
                      aria-label={`Quitar ${line.product.name} de la venta`}
                      className="-mr-1 -mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 cursor-pointer"
                        aria-label="Disminuir cantidad"
                        disabled={line.quantity <= 1}
                        onClick={() => updateLine(line.product.id, { quantity: Math.max(1, line.quantity - 1) })}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={line.product.current_stock}
                        value={line.quantity}
                        aria-label={`Cantidad de ${line.product.name}`}
                        onChange={(e) =>
                          updateLine(line.product.id, {
                            quantity: Math.min(line.product.current_stock, Math.max(1, Number(e.target.value) || 1)),
                          })
                        }
                        className="h-10 w-14 text-center tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 cursor-pointer"
                        aria-label="Aumentar cantidad"
                        disabled={line.quantity >= line.product.current_stock}
                        onClick={() =>
                          updateLine(line.product.id, {
                            quantity: Math.min(line.product.current_stock, line.quantity + 1),
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`price-${line.product.id}`} className="text-xs text-muted-foreground">
                        Precio
                      </Label>
                      <Input
                        id={`price-${line.product.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={line.unitPrice}
                        aria-invalid={!(Number(line.unitPrice) > 0)}
                        onChange={(e) => updateLine(line.product.id, { unitPrice: e.target.value })}
                        className="h-10 w-24 tabular-nums"
                      />
                      <span className="w-20 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(lineTotal(line))}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">¿Cuándo fue la venta?</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={otherDay ? "outline" : "default"}
              aria-pressed={!otherDay}
              onClick={() => setOtherDay(false)}
              className="h-10 cursor-pointer px-4"
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant={otherDay ? "default" : "outline"}
              aria-pressed={otherDay}
              onClick={() => setOtherDay(true)}
              className="h-10 cursor-pointer px-4"
            >
              Otro día
            </Button>
            {otherDay && (
              <Input
                type="date"
                value={day}
                max={today}
                aria-label="Fecha de la venta"
                aria-invalid={dayInvalid}
                onChange={(e) => setDay(e.target.value)}
                className="h-10 w-44"
              />
            )}
          </div>
          {otherDay && (
            <p className={cn("text-xs", dayInvalid ? "text-danger" : "text-muted-foreground")}>
              {dayInvalid
                ? "Elige un día que no sea futuro."
                : "Para ventas que no se capturaron a tiempo. Se guarda como de ese día; el stock se descuenta hoy."}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="sale-notes">Notas (opcional)</Label>
          <Input
            id="sale-notes"
            value={notes}
            maxLength={255}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cliente, forma de pago..."
            className="h-10"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3" aria-live="polite">
          <span className="text-sm font-medium text-accent-foreground">Total</span>
          <span className="font-display text-xl font-semibold tabular-nums text-accent-foreground">
            {formatCurrency(total)}
          </span>
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="h-11 w-full cursor-pointer gap-2">
          {registerSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          {cart.length > 1 ? `Confirmar venta de ${cart.length} productos` : "Confirmar venta"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
