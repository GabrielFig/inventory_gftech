import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { DetailRow } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { FormScreen } from "@/components/ui/screen";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { QuantityStepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { useDeleteSale, useSales, useUpdateSale } from "@/hooks/api";
import { formatLongDate, formatMoney, formatTime, parseAmount, parseDate } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { SaleRead } from "@/lib/types";
import { spacing } from "@/theme";

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // El API no tiene "venta por id": se toma del historial (ya en caché casi siempre).
  const sales = useSales("all");
  const sale = sales.data?.items.find((s) => s.id === id);

  if (sales.isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={4} />
      </FormScreen>
    );
  }
  if (sales.isError) {
    return (
      <FormScreen>
        <ErrorState error={sales.error} onRetry={() => sales.refetch()} />
      </FormScreen>
    );
  }
  if (!sale) {
    return (
      <FormScreen>
        <ErrorState error={new ApiClientError("Esta venta ya no existe (pudo haberse eliminado).", 404)} />
      </FormScreen>
    );
  }
  return <SaleDetail sale={sale} />;
}

function SaleDetail({ sale }: { sale: SaleRead }) {
  const router = useRouter();
  const { isAdmin } = useSession();
  const update = useUpdateSale(sale.id);
  const remove = useDeleteSale();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(sale.quantity);
  const [price, setPrice] = useState(String(Number(sale.unit_price)));
  const [notes, setNotes] = useState(sale.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const date = parseDate(sale.sale_date);

  async function save() {
    const unitPrice = parseAmount(price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setError("Escribe un precio mayor a 0.");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ quantity, unit_price: unitPrice, notes: notes.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "No se pudo guardar la venta.");
    }
  }

  function confirmDelete() {
    Alert.alert("Eliminar venta", `Se eliminará la venta de “${sale.product.name}” y las ${sale.quantity} pieza(s) regresarán al inventario.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(sale.id);
            router.back();
          } catch (e) {
            Alert.alert("No se pudo eliminar", e instanceof ApiClientError ? e.message : "Intenta de nuevo.");
          }
        },
      },
    ]);
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: editing ? "Editar venta" : "Venta" }} />
      <View style={{ alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md }}>
        <AppText variant="hero" style={{ fontSize: 34 }}>
          {formatMoney(sale.total)}
        </AppText>
        <AppText tone="muted">
          {formatLongDate(date)} · {formatTime(date)}
        </AppText>
      </View>

      <Card>
        <DetailRow label="Producto" value={sale.product.name} />
        <DetailRow label="Modelo" value={sale.product.model_compatibility} />
        <DetailRow label="ID" value={sale.product.code} />
        <DetailRow label="Cantidad" value={`${sale.quantity}`} />
        <DetailRow label="Precio por pieza" value={formatMoney(sale.unit_price)} />
        {isAdmin ? <DetailRow label="Costo por pieza" value={formatMoney(sale.unit_cost)} /> : null}
        {isAdmin ? <DetailRow label="Ganancia" value={formatMoney(sale.profit)} tone="success" /> : null}
        {sale.notes ? <DetailRow label="Notas" value={sale.notes} /> : null}
      </Card>

      {isAdmin && editing ? (
        <View style={{ gap: spacing.lg }}>
          <QuantityStepper label="Cantidad" value={quantity} onChange={setQuantity} />
          <TextField label="Precio por pieza" prefix="$" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <TextField label="Notas" value={notes} onChangeText={setNotes} maxLength={255} />
          {error ? (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button title="Guardar cambios" icon="check" onPress={save} loading={update.isPending} />
          <Button title="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
        </View>
      ) : isAdmin ? (
        <View style={{ gap: spacing.md }}>
          <Button title="Editar venta" icon="edit" variant="secondary" onPress={() => setEditing(true)} />
          <Button title="Eliminar venta" icon="delete-outline" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
        </View>
      ) : null}
    </FormScreen>
  );
}
