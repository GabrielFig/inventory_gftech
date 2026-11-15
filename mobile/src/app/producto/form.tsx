import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chips";
import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { FormScreen } from "@/components/ui/screen";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useCategories, useCreateProduct, useProduct, useSuppliers, useUpdateProduct } from "@/hooks/api";
import { fromPhoneModels, suggestCompatibilityText, toInputs, type ModelDraft } from "@/lib/compatible-models";
import { formatMoney, parseAmount } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Product } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin } = useSession();
  const product = useProduct(id);

  if (!isAdmin) {
    return (
      <FormScreen>
        <ErrorState error={new ApiClientError("Solo el administrador puede dar de alta o editar productos.", 403)} />
      </FormScreen>
    );
  }
  if (id && product.isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={6} />
      </FormScreen>
    );
  }
  if (id && product.isError) {
    return (
      <FormScreen>
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      </FormScreen>
    );
  }
  return <ProductForm product={id ? product.data : undefined} />;
}

function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const theme = useTheme();
  const suppliers = useSuppliers();
  const categories = useCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");
  const editing = !!product;

  const [supplierId, setSupplierId] = useState(product?.supplier_id ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [model, setModel] = useState(product?.model_compatibility ?? "");
  const [models, setModels] = useState<ModelDraft[]>(product ? fromPhoneModels(product.compatible_models) : []);
  const [cost, setCost] = useState(product ? String(Number(product.cost)) : "");
  const [price, setPrice] = useState(product ? String(Number(product.sale_price)) : "");
  const [stock, setStock] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const costValue = parseAmount(cost);
  const priceValue = parseAmount(price);
  const margin = costValue > 0 && priceValue > 0 ? ((priceValue - costValue) / costValue) * 100 : null;
  const suggestion = models.length > 0 ? suggestCompatibilityText(models) : "";
  const pending = create.isPending || update.isPending;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!supplierId) next.supplier = "Elige un proveedor.";
    if (!categoryId) next.category = "Elige una categoría.";
    if (!name.trim()) next.name = "Escribe el nombre del producto.";
    if (!model.trim()) next.model = "Indica el modelo o compatibilidad.";
    if (!(costValue > 0)) next.cost = "El costo debe ser mayor a 0.";
    if (!(priceValue > 0)) next.price = "El precio debe ser mayor a 0.";
    const stockValue = parseInt(stock, 10);
    if (!editing && !(stockValue >= 0)) next.stock = "Escribe cuántas piezas tienes (0 si aún no llegan).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setServerError(null);
    const body = {
      supplier_id: supplierId,
      category_id: categoryId,
      name: name.trim(),
      model_compatibility: model.trim(),
      cost: costValue,
      sale_price: priceValue,
      compatible_models: toInputs(models),
    };
    try {
      if (editing) await update.mutateAsync(body);
      else await create.mutateAsync({ ...body, initial_stock: parseInt(stock, 10) || 0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiClientError ? e.message : "No se pudo guardar el producto.");
    }
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: editing ? `Editar ${product.code}` : "Nuevo producto" }} />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="captionStrong" tone="muted">
          Proveedor
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {suppliers.data?.map((s) => (
            <Chip key={s.id} label={s.name} selected={supplierId === s.id} onPress={() => setSupplierId(s.id)} />
          ))}
        </View>
        {errors.supplier ? (
          <AppText variant="caption" tone="danger">
            {errors.supplier}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="captionStrong" tone="muted">
          Categoría
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {categories.data?.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>
        {errors.category ? (
          <AppText variant="caption" tone="danger">
            {errors.category}
          </AppText>
        ) : null}
      </View>

      <TextField label="Nombre del producto" value={name} onChangeText={setName} placeholder="Ghostic Acrigel" error={errors.name} maxLength={150} />
      <ModelPicker value={models} onChange={setModels} />

      <TextField label="Modelo / compatibilidad (texto)" value={model} onChangeText={setModel} placeholder="iPhone 15 / 15 Pro" error={errors.model} maxLength={255} />
      {suggestion && suggestion !== model.trim() ? (
        <Button title="Sugerir texto desde los modelos" icon="auto-fix-high" variant="ghost" onPress={() => setModel(suggestion)} />
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField label="Costo" prefix="$" value={cost} onChangeText={setCost} keyboardType="decimal-pad" error={errors.cost} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Precio de venta" prefix="$" value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} />
        </View>
      </View>

      {margin !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: margin >= 0 ? theme.successSoft : theme.dangerSoft }}>
          <Icon name={margin >= 0 ? "trending-up" : "trending-down"} size={20} color={margin >= 0 ? "success" : "danger"} />
          <AppText tone={margin >= 0 ? "success" : "danger"}>
            Ganas {formatMoney(priceValue - costValue)} por pieza ({margin.toFixed(0)}% sobre el costo)
          </AppText>
        </View>
      ) : null}

      {!editing ? (
        <TextField label="Piezas en existencia" value={stock} onChangeText={setStock} keyboardType="number-pad" error={errors.stock} hint="Después puedes sumar más con “Resurtir”." />
      ) : null}

      {serverError ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {serverError}
        </AppText>
      ) : null}

      <Button title={editing ? "Guardar cambios" : "Agregar al inventario"} icon="check" onPress={submit} loading={pending} />
    </FormScreen>
  );
}
