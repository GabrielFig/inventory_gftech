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
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { QuantityStepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProduct, useProducts, useRegisterSale } from "@/hooks/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoney, parseAmount } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Product, SaleRead } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

export default function NewSaleScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const preselected = useProduct(productId);
  const [picked, setPicked] = useState<Product | null>(null);
  const [done, setDone] = useState<{ sale: SaleRead; product: Product } | null>(null);
  const product = picked ?? preselected.data ?? null;

  if (done) {
    return (
      <SaleSuccess
        done={done}
        onAnother={() => {
          setDone(null);
          setPicked(null);
        }}
      />
    );
  }
  if (productId && preselected.isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={3} />
      </FormScreen>
    );
  }
  if (!product) return <ProductPicker onPick={setPicked} />;
  return <SaleForm key={product.id} product={product} onChange={() => setPicked(null)} onDone={(sale) => setDone({ sale, product })} />;
}

function ProductPicker({ onPick }: { onPick: (product: Product) => void }) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, isPending, isError, error, refetch } = useProducts({ search: debounced || undefined });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <TextField
          label="¿Qué vendiste?"
          value={search}
          onChangeText={setSearch}
          placeholder="Nombre, modelo o ID (INV-001)"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <FormScreenList>
        {isPending ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState icon="search-off" title="Sin resultados" message={`No encontramos “${debounced}”.`} />
        ) : (
          data.items.map((p, i) => (
            <View key={p.id} style={{ opacity: p.current_stock <= 0 ? 0.45 : 1 }}>
              {i > 0 ? <RowSeparator /> : null}
              <ProductRow product={p} onPress={() => (p.current_stock > 0 ? onPick(p) : undefined)} />
            </View>
          ))
        )}
      </FormScreenList>
    </View>
  );
}

function FormScreenList({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {children}
    </ScrollView>
  );
}

function SaleForm({ product, onChange, onDone }: { product: Product; onChange: () => void; onDone: (sale: SaleRead) => void }) {
  const theme = useTheme();
  const { isAdmin } = useSession();
  const register = useRegisterSale();
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(String(Number(product.sale_price)));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unitPrice = parseAmount(price);
  const priceValid = Number.isFinite(unitPrice) && unitPrice > 0;
  const total = priceValid ? unitPrice * quantity : 0;
  const profit = priceValid ? (unitPrice - Number(product.cost)) * quantity : 0;

  async function submit() {
    if (!priceValid) {
      setError("Escribe un precio mayor a 0.");
      return;
    }
    setError(null);
    try {
      const sale = await register.mutateAsync({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(sale);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof ApiClientError ? e.message : "No se pudo registrar la venta.");
    }
  }

  return (
    <FormScreen>
      <Card>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading">{product.name}</AppText>
              <AppText variant="caption" tone="muted">
                {product.model_compatibility}
              </AppText>
              <AppText variant="caption" tone="muted">
                {product.code} · Disponible: {product.current_stock} pza{product.current_stock === 1 ? "" : "s"}
              </AppText>
            </View>
            <StatusBadge status={product.status} />
          </View>
          <Button title="Cambiar producto" variant="ghost" icon="swap-horiz" onPress={onChange} style={{ alignSelf: "flex-start" }} />
        </View>
      </Card>

      <QuantityStepper label="Cantidad" value={quantity} onChange={setQuantity} max={product.current_stock} />
      <TextField label="Precio por pieza" prefix="$" value={price} onChangeText={setPrice} keyboardType="decimal-pad" hint={`Precio de lista: ${formatMoney(product.sale_price)}`} />
      <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Cliente, forma de pago…" maxLength={255} />

      <View style={{ gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: theme.primarySoft }}>
        <DetailRow label="Total a cobrar" value={formatMoney(total)} />
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

      <Button title={`Cobrar ${formatMoney(total)}`} icon="check" onPress={submit} loading={register.isPending} disabled={!priceValid} />
    </FormScreen>
  );
}

function SaleSuccess({ done, onAnother }: { done: { sale: SaleRead; product: Product }; onAnother: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useSession();
  const remaining = done.product.current_stock - done.sale.quantity;
  return (
    <FormScreen>
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={44} color="success" />
        </View>
        <AppText variant="title">Venta registrada</AppText>
        <AppText variant="hero" style={{ fontSize: 34 }}>
          {formatMoney(done.sale.total)}
        </AppText>
        <AppText tone="muted" style={{ textAlign: "center" }}>
          {done.sale.quantity} × {done.product.name}
        </AppText>
      </View>
      <Card>
        <DetailRow label="Quedan en stock" value={`${remaining} pza${remaining === 1 ? "" : "s"}`} tone={remaining <= 2 ? "danger" : undefined} />
        {isAdmin ? <DetailRow label="Ganancia" value={formatMoney(done.sale.profit)} tone="success" /> : null}
      </Card>
      <Button title="Registrar otra venta" icon="add" onPress={onAnother} />
      <Button title="Listo" variant="secondary" onPress={() => router.back()} />
    </FormScreen>
  );
}
