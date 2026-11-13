import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { RowSeparator, ServiceRow } from "@/components/rows";
import { DetailRow } from "@/components/tiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { FormScreen } from "@/components/ui/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useRegisterServiceRecord, useServices } from "@/hooks/api";
import { formatMoney, parseAmount } from "@/lib/format";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import type { Service } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

export default function ChargeServiceScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const router = useRouter();
  const { isAdmin } = useSession();
  const services = useServices();
  const [picked, setPicked] = useState<Service | null>(null);
  const [done, setDone] = useState<{ name: string; price: number } | null>(null);

  const active = services.data?.filter((s) => s.is_active) ?? [];
  const service = picked ?? active.find((s) => s.id === serviceId) ?? null;

  if (done) {
    return (
      <Success
        done={done}
        onAnother={() => {
          setDone(null);
          setPicked(null);
        }}
      />
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
  if (!service) {
    return (
      <FormScreen>
        {active.length === 0 ? (
          <EmptyState
            icon="build"
            title="Primero agrega tus servicios"
            message="Da de alta los servicios que ofreces y lo que cobras por cada uno para poder registrarlos aquí."
            action={isAdmin ? <Button title="Agregar servicio" icon="add" onPress={() => router.replace("/servicio/form")} /> : undefined}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            <AppText variant="title">¿Qué servicio hiciste?</AppText>
            <Card padded={false}>
              {active.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <RowSeparator /> : null}
                  <ServiceRow service={s} onPress={() => setPicked(s)} />
                </View>
              ))}
            </Card>
          </View>
        )}
      </FormScreen>
    );
  }
  return <ChargeForm key={service.id} service={service} onChange={() => setPicked(null)} onDone={(price) => setDone({ name: service.name, price })} />;
}

function ChargeForm({ service, onChange, onDone }: { service: Service; onChange: () => void; onDone: (price: number) => void }) {
  const theme = useTheme();
  const register = useRegisterServiceRecord();
  const [price, setPrice] = useState(String(Number(service.price)));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const priceValue = parseAmount(price);
  const valid = Number.isFinite(priceValue) && priceValue >= 0;

  async function submit() {
    if (!valid) {
      setError("Escribe el monto que cobraste.");
      return;
    }
    setError(null);
    try {
      await register.mutateAsync({ service_id: service.id, price: priceValue, notes: notes.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(priceValue);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof ApiClientError ? e.message : "No se pudo registrar el servicio.");
    }
  }

  return (
    <FormScreen>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="heading">{service.name}</AppText>
          {service.description ? (
            <AppText variant="caption" tone="muted">
              {service.description}
            </AppText>
          ) : null}
          <Button title="Cambiar servicio" variant="ghost" icon="swap-horiz" onPress={onChange} style={{ alignSelf: "flex-start" }} />
        </View>
      </Card>

      <TextField label="Monto cobrado" prefix="$" value={price} onChangeText={setPrice} keyboardType="decimal-pad" hint={`Tarifa: ${formatMoney(service.price)}`} />
      <TextField label="Cliente o equipo (opcional)" value={notes} onChangeText={setNotes} placeholder="Ej. iPhone 13 de Marcos" maxLength={255} />

      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.dangerSoft }}>
          <Icon name="error-outline" size={20} color="danger" />
          <AppText tone="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button title={`Cobrar ${valid ? formatMoney(priceValue) : ""}`.trim()} icon="check" onPress={submit} loading={register.isPending} disabled={!valid} />
    </FormScreen>
  );
}

function Success({ done, onAnother }: { done: { name: string; price: number }; onAnother: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <FormScreen>
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={44} color="success" />
        </View>
        <AppText variant="title">Servicio cobrado</AppText>
        <AppText variant="hero" style={{ fontSize: 34 }}>
          {formatMoney(done.price)}
        </AppText>
        <AppText tone="muted">{done.name}</AppText>
      </View>
      <Card>
        <DetailRow label="Suma a tus ingresos" value={formatMoney(done.price)} tone="success" />
      </Card>
      <Button title="Cobrar otro servicio" icon="add" onPress={onAnother} />
      <Button title="Listo" variant="secondary" onPress={() => router.back()} />
    </FormScreen>
  );
}
