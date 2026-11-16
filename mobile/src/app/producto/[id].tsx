import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { DetailRow } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chips";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { FormScreen } from "@/components/ui/screen";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { QuantityStepper } from "@/components/ui/stepper";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppText } from "@/components/ui/text";
import { useDeleteProduct, useProduct, useRestockProduct } from "@/hooks/api";
import { formatMoney } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Product } from "@/lib/types";
import { spacing } from "@/theme";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useProduct(id);

  if (isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={5} />
      </FormScreen>
    );
  }
  if (isError) {
    return (
      <FormScreen>
        <ErrorState error={error} onRetry={() => refetch()} />
      </FormScreen>
    );
  }
  return <ProductDetail product={data} />;
}

function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { isAdmin } = useSession();
  const restock = useRestockProduct();
  const remove = useDeleteProduct();
  const [restocking, setRestocking] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  async function confirmRestock() {
    try {
      await restock.mutateAsync({ id: product.id, quantity, note: note.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRestocking(false);
      setQuantity(1);
      setNote("");
    } catch (e) {
      Alert.alert("No se pudo resurtir", e instanceof ApiClientError ? e.message : "Intenta de nuevo.");
    }
  }

  function confirmDelete() {
    Alert.alert("Eliminar producto", `Se eliminará “${product.name}” (${product.code}) del catálogo. Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(product.id);
            router.back();
          } catch (e) {
            Alert.alert(
              "No se pudo eliminar",
              e instanceof ApiClientError && e.status >= 500
                ? "Este producto tiene ventas registradas, por eso no se puede borrar."
                : e instanceof ApiClientError
                  ? e.message
                  : "Intenta de nuevo.",
            );
          }
        },
      },
    ]);
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: product.code }} />
      <View style={{ gap: spacing.sm }}>
        <StatusBadge status={product.status} />
        <AppText variant="display">{product.name}</AppText>
        <AppText tone="muted">{product.model_compatibility}</AppText>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            En stock
          </AppText>
          <AppText variant="display">{product.current_stock}</AppText>
          <AppText variant="caption" tone="muted">
            {product.sold_count} vendidas
          </AppText>
        </Card>
        <Card style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            Precio
          </AppText>
          <AppText variant="display">{formatMoney(product.sale_price)}</AppText>
          <AppText variant="caption" tone="muted">
            Margen {product.margin_pct.toFixed(0)}%
          </AppText>
        </Card>
      </View>

      <Card>
        <DetailRow label="Costo" value={formatMoney(product.cost)} />
        <DetailRow label="Valor en inventario" value={formatMoney(product.inventory_value)} />
        <DetailRow label="Categoría" value={product.category.name} />
        <DetailRow label="Proveedor" value={product.supplier.name} />
        <DetailRow label="ID" value={product.code} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="captionStrong" tone="muted">
          Modelos compatibles
        </AppText>
        {product.compatible_models.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {product.compatible_models.map((m) => (
              <Chip key={m.id} label={m.model} selected={false} onPress={() => router.push({ pathname: "/modelo", params: { q: m.model } })} />
            ))}
          </View>
        ) : (
          <AppText tone="muted">
            Sin modelos enlazados: este producto no aparece en “Buscar por modelo”.
            {isAdmin ? " Edítalo para elegirlos." : ""}
          </AppText>
        )}
      </View>

      {restocking ? (
        <Card>
          <View style={{ gap: spacing.lg }}>
            <AppText variant="heading">Resurtir inventario</AppText>
            <QuantityStepper label="Piezas que llegaron" value={quantity} onChange={setQuantity} />
            <TextField label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Pedido a proveedor…" />
            <Button title={`Agregar ${quantity} pieza${quantity === 1 ? "" : "s"}`} icon="check" onPress={confirmRestock} loading={restock.isPending} />
            <Button title="Cancelar" variant="secondary" onPress={() => setRestocking(false)} />
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Button
            title="Vender"
            icon="point-of-sale"
            disabled={product.current_stock <= 0}
            onPress={() => router.push({ pathname: "/venta/nueva", params: { productId: product.id } })}
          />
          <Button title="Resurtir" icon="add-box" variant="secondary" onPress={() => setRestocking(true)} />
          {isAdmin ? (
            <>
              <Button title="Editar producto" icon="edit" variant="secondary" onPress={() => router.push({ pathname: "/producto/form", params: { id: product.id } })} />
              <Button title="Eliminar producto" icon="delete-outline" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
            </>
          ) : null}
        </View>
      )}
    </FormScreen>
  );
}
