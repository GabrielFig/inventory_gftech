import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Switch, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chips";
import { TextField } from "@/components/ui/field";
import { FormScreen } from "@/components/ui/screen";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useCreateService, useDeleteService, useServices, useUpdateService } from "@/hooks/api";
import { parseAmount } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Service } from "@/lib/types";
import { spacing, useTheme } from "@/theme";

const SUGGESTIONS = ["Cambio de pantalla", "Cambio de batería", "Formateo", "Limpieza de bocina", "Cambio de puerto de carga"];

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin } = useSession();
  const services = useServices();

  if (!isAdmin) {
    return (
      <FormScreen>
        <ErrorState error={new ApiClientError("Solo el administrador puede editar las tarifas.", 403)} />
      </FormScreen>
    );
  }
  if (services.isPending) {
    return (
      <FormScreen>
        <ListSkeleton rows={4} />
      </FormScreen>
    );
  }
  if (services.isError) {
    return (
      <FormScreen>
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      </FormScreen>
    );
  }
  const service = id ? services.data.find((s) => s.id === id) : undefined;
  return <ServiceForm key={id ?? "new"} service={service} existingNames={services.data.map((s) => s.name)} />;
}

function ServiceForm({ service, existingNames }: { service?: Service; existingNames: string[] }) {
  const router = useRouter();
  const theme = useTheme();
  const create = useCreateService();
  const update = useUpdateService(service?.id ?? "");
  const remove = useDeleteService();
  const editing = !!service;

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service ? String(Number(service.price)) : "");
  const [active, setActive] = useState(service?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const priceValue = parseAmount(price);
  const pending = create.isPending || update.isPending;
  const suggestions = SUGGESTIONS.filter((s) => !existingNames.includes(s));

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Escribe el nombre del servicio.";
    if (!Number.isFinite(priceValue) || priceValue < 0) next.price = "Escribe lo que cobras por este servicio.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setServerError(null);
    try {
      const body = { name: name.trim(), description: description.trim() || null, price: priceValue };
      if (editing) await update.mutateAsync({ ...body, is_active: active });
      else await create.mutateAsync(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setServerError(e instanceof ApiClientError ? e.message : "No se pudo guardar el servicio.");
    }
  }

  function confirmDelete() {
    Alert.alert("Eliminar servicio", `Se eliminará “${service?.name}” de tus tarifas. Los servicios ya cobrados se conservan en el historial.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(service!.id);
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
      <Stack.Screen options={{ title: editing ? "Editar servicio" : "Nuevo servicio" }} />

      {!editing && suggestions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="captionStrong" tone="muted">
            Ideas rápidas
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={name === s} onPress={() => setName(s)} />
            ))}
          </View>
        </View>
      ) : null}

      <TextField label="Servicio" value={name} onChangeText={setName} placeholder="Cambio de pantalla" error={errors.name} maxLength={120} />
      <TextField label="Lo que cobras" prefix="$" value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} hint="Puedes cambiar el monto al cobrar cada servicio." />
      <TextField label="Detalle (opcional)" value={description} onChangeText={setDescription} placeholder="Incluye mano de obra y mica" multiline maxLength={255} />

      {editing ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Servicio activo</AppText>
            <AppText variant="caption" tone="muted">
              Si lo desactivas ya no se puede cobrar, pero se conserva el historial.
            </AppText>
          </View>
          <Switch value={active} onValueChange={setActive} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={theme.surface} />
        </View>
      ) : null}

      {serverError ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {serverError}
        </AppText>
      ) : null}

      <Button title={editing ? "Guardar cambios" : "Agregar servicio"} icon="check" onPress={submit} loading={pending} />
      {editing ? <Button title="Eliminar servicio" icon="delete-outline" variant="danger" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </FormScreen>
  );
}
