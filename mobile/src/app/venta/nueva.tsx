import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ProductRow, RowSeparator } from "@/components/rows";
import { DetailRow } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { FormScreen } from "@/components/ui/screen";
import { SaleDayField, saleDateISO } from "@/components/ui/sale-day-field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { QuantityStepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { useProduct, useProducts, useRegisterSaleBatch } from "@/hooks/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { addDays, formatLongDate, formatMoney, parseAmount, startOfDay } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Product, SaleBatchResult } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

/** Una línea del carrito: el precio se guarda como texto para poder escribirlo con comodidad. */
interface Line {
  product: Product;
  quantity: number;
  price: string;
}

interface Done {
  result: SaleBatchResult;
  lines: Line[];
  daysAgo: number;
}

const lineOf = (product: Product): Line => ({ product, quantity: 1, price: String(Number(product.sale_price)) });

export default function NewSaleScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const preselected = useProduct(productId);

  if (productId && preselected.isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={3} />
      </FormScreen>
    );
  }
  return <SaleFlow initialProduct={preselected.data ?? null} />;
}

function SaleFlow({ initialProduct }: { initialProduct: Product | null }) {
  const [lines, setLines] = useState<Line[]>(() => (initialProduct ? [lineOf(initialProduct)] : []));
  const [picking, setPicking] = useState(!initialProduct);
  const [done, setDone] = useState<Done | null>(null);

  function addProduct(product: Product) {
    setLines((current) => {
      const existing = current.find((l) => l.product.id === product.id);
      if (!existing) return [...current, lineOf(product)];
      return current.map((l) =>
        l.product.id === product.id ? { ...l, quantity: Math.min(product.current_stock, l.quantity + 1) } : l,
      );
    });
    setPicking(false);
  }

  if (done) {
    return (
      <SaleSuccess
        done={done}
        onAnother={() => {
          setDone(null);
          setLines([]);
          setPicking(true);
        }}
      />
    );
  }
  if (picking || lines.length === 0) {
    return <ProductPicker onPick={addProduct} onBack={lines.length > 0 ? () => setPicking(false) : undefined} inCart={lines} />;
  }
  return (
    <CartForm
      lines={lines}
      onLinesChange={setLines}
      onAddAnother={() => setPicking(true)}
      onDone={(result, daysAgo) => setDone({ result, lines, daysAgo })}
    />
  );
}

function ProductPicker({ onPick, onBack, inCart }: { onPick: (product: Product) => void; onBack?: () => void; inCart: Line[] }) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, isPending, isError, error, refetch } = useProducts({ search: debounced || undefined });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <TextField
          label={inCart.length > 0 ? "Agregar otro producto" : "¿Qué vendiste?"}
          value={search}
          onChangeText={setSearch}
          placeholder="Nombre, modelo o ID (INV-001)"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        {onBack ? (
          <Button
            title={`Volver a la venta (${inCart.length} producto${inCart.length === 1 ? "" : "s"})`}
            variant="secondary"
            icon="shopping-cart"
            onPress={onBack}
          />
        ) : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {isPending ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon="search-off" title="Sin resultados" message={`No encontramos “${debounced}”.`} />
        ) : (
          data.items.map((p, i) => {
            const taken = inCart.find((l) => l.product.id === p.id)?.quantity ?? 0;
            const unavailable = p.current_stock <= 0 || taken >= p.current_stock;
            return (
              <View key={p.id} style={{ opacity: unavailable ? 0.45 : 1 }}>
                {i > 0 ? <RowSeparator /> : null}
                <ProductRow product={p} onPress={() => (unavailable ? undefined : onPick(p))} />
                {taken > 0 ? (
                  <AppText variant="captionStrong" tone="muted" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                    {taken} en esta venta
                  </AppText>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function CartForm({
  lines,
  onLinesChange,
  onAddAnother,
  onDone,
}: {
  lines: Line[];
  onLinesChange: (lines: Line[]) => void;
  onAddAnother: () => void;
  onDone: (result: SaleBatchResult, daysAgo: number) => void;
}) {
  const theme = useTheme();
  const { isAdmin } = useSession();
  const register = useRegisterSaleBatch();
  const [daysAgo, setDaysAgo] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const priced = lines.map((l) => ({ ...l, unit: parseAmount(l.price) }));
  const allValid = priced.every((l) => Number.isFinite(l.unit) && l.unit > 0);
  const total = priced.reduce((sum, l) => sum + (Number.isFinite(l.unit) ? l.unit * l.quantity : 0), 0);
  const profit = priced.reduce(
    (sum, l) => sum + (Number.isFinite(l.unit) ? (l.unit - Number(l.product.cost)) * l.quantity : 0),
    0,
  );
  const pieces = lines.reduce((sum, l) => sum + l.quantity, 0);

  const patch = (id: string, change: Partial<Line>) =>
    onLinesChange(lines.map((l) => (l.product.id === id ? { ...l, ...change } : l)));

  async function submit() {
    if (!allValid) {
      setError("Revisa los precios: deben ser mayores a 0.");
      return;
    }
    setError(null);
    try {
      const result = await register.mutateAsync({
        items: priced.map((l) => ({ product_id: l.product.id, quantity: l.quantity, unit_price: l.unit })),
        notes: notes.trim() || undefined,
        sale_date: saleDateISO(daysAgo),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(result, daysAgo);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof ApiClientError ? e.message : "No se pudo registrar la venta.");
    }
  }

  return (
    <FormScreen>
      {lines.map((line, i) => (
        <Card key={line.product.id}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading">{line.product.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {line.product.model_compatibility}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {line.product.code} · Disponible: {line.product.current_stock} pza{line.product.current_stock === 1 ? "" : "s"}
                </AppText>
              </View>
              <Button
                title={lines.length === 1 ? "Cambiar" : "Quitar"}
                variant="ghost"
                icon={lines.length === 1 ? "swap-horiz" : "delete-outline"}
                onPress={() => onLinesChange(lines.filter((_, idx) => idx !== i))}
              />
            </View>
            <QuantityStepper
              label="Cantidad"
              value={line.quantity}
              onChange={(quantity) => patch(line.product.id, { quantity })}
              max={line.product.current_stock}
            />
            <TextField
              label="Precio por pieza"
              prefix="$"
              value={line.price}
              onChangeText={(price) => patch(line.product.id, { price })}
              keyboardType="decimal-pad"
              hint={`Precio de lista: ${formatMoney(line.product.sale_price)}`}
            />
          </View>
        </Card>
      ))}

      <Button title="Agregar otro producto" variant="secondary" icon="add" onPress={onAddAnother} />

      <SaleDayField daysAgo={daysAgo} onChange={setDaysAgo} />
      <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Cliente, forma de pago…" maxLength={255} />

      <View style={{ gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: theme.primarySoft }}>
        <DetailRow label={lines.length > 1 ? `Total (${pieces} piezas)` : "Total a cobrar"} value={formatMoney(total)} />
        {isAdmin ? <DetailRow label="Ganancia" value={formatMoney(profit)} tone={profit < 0 ? "danger" : "success"} /> : null}
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.dangerSoft }}>
          <Icon name="error-outline" size={20} color="danger" />
          <AppText tone="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button title={`Cobrar ${formatMoney(total)}`} icon="check" onPress={submit} loading={register.isPending} disabled={!allValid} />
    </FormScreen>
  );
}

function SaleSuccess({ done, onAnother }: { done: Done; onAnother: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useSession();
  const { result, lines, daysAgo } = done;
  const low = lines
    .map((l) => ({ name: l.product.name, remaining: l.product.current_stock - l.quantity }))
    .filter((l) => l.remaining <= 2);

  return (
    <FormScreen>
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={44} color="success" />
        </View>
        <AppText variant="title">Venta registrada</AppText>
        <AppText variant="hero" style={{ fontSize: 34 }}>
          {formatMoney(result.total)}
        </AppText>
        <AppText tone="muted" style={{ textAlign: "center" }}>
          {lines.length === 1
            ? `${lines[0].quantity} × ${lines[0].product.name}`
            : `${lines.length} productos · ${lines.reduce((s, l) => s + l.quantity, 0)} piezas`}
        </AppText>
        {daysAgo > 0 ? (
          <AppText variant="captionStrong" tone="muted">
            Guardada como del {formatLongDate(addDays(startOfDay(), -daysAgo))}
          </AppText>
        ) : null}
      </View>
      <Card>
        {lines.length > 1
          ? result.items.map((sale) => (
              <DetailRow
                key={sale.id}
                label={`${sale.quantity} × ${sale.product.name} · ${sale.product.model_compatibility}`}
                value={formatMoney(sale.total)}
              />
            ))
          : null}
        {low.map((l) => (
          <DetailRow key={l.name} label={`Quedan de ${l.name}`} value={`${l.remaining} pza${l.remaining === 1 ? "" : "s"}`} tone="danger" />
        ))}
        {lines.length === 1 && low.length === 0 ? (
          <DetailRow
            label="Quedan en stock"
            value={`${lines[0].product.current_stock - lines[0].quantity} pzas`}
          />
        ) : null}
        {isAdmin ? <DetailRow label="Ganancia" value={formatMoney(result.profit)} tone="success" /> : null}
      </Card>
      <Button title="Registrar otra venta" icon="add" onPress={onAnother} />
      <Button title="Listo" variant="secondary" onPress={() => router.back()} />
    </FormScreen>
  );
}
