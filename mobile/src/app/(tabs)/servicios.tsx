import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, SectionList, View, FlatList } from "react-native";

import { Reveal } from "@/components/motion/reveal";
import { RowSeparator, ServiceRecordRow, ServiceRow } from "@/components/rows";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/chips";
import { Fab } from "@/components/ui/fab";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useServiceRecords, useServices } from "@/hooks/api";
import { dayKey, formatDayHeading, formatMoney, parseDate } from "@/lib/format";
import type { PeriodKey } from "@/lib/period";
import { useListBottomPadding } from "@/lib/layout";
import { useSession } from "@/lib/session";
import type { ServiceRecord } from "@/lib/types";
import { spacing, useTheme } from "@/theme";

type View_ = "tarifas" | "cobrados";
type RecordPeriod = Extract<PeriodKey, "today" | "week" | "month">;

const PERIOD_OPTIONS: { key: RecordPeriod; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7 días" },
  { key: "month", label: "30 días" },
];

function groupRecords(records: ServiceRecord[]) {
  const map = new Map<string, { key: string; total: number; data: ServiceRecord[] }>();
  for (const record of records) {
    const key = dayKey(parseDate(record.performed_at));
    const section = map.get(key) ?? { key, total: 0, data: [] };
    section.total += Number(record.price);
    section.data.push(record);
    map.set(key, section);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export default function ServicesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useSession();
  const bottomPadding = useListBottomPadding(true);
  const [view, setView] = useState<View_>("tarifas");
  const [period, setPeriod] = useState<RecordPeriod>("week");
  const services = useServices();
  const records = useServiceRecords(period);

  const header = (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      <Segmented
        options={[
          { key: "tarifas", label: "Mis tarifas" },
          { key: "cobrados", label: "Cobrados" },
        ]}
        value={view}
        onChange={setView}
      />
    </View>
  );

  if (view === "tarifas") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <FlatList
          data={services.data ?? []}
          keyExtractor={(s) => s.id}
          refreshControl={<RefreshControl refreshing={services.isRefetching} onRefresh={services.refetch} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          ItemSeparatorComponent={RowSeparator}
          ListHeaderComponent={
            <View>
              {header}
              {(services.data?.length ?? 0) > 0 ? (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
                  <AppText variant="caption" tone="muted">
                    Toca un servicio para cobrarlo{isAdmin ? ". Usa Editar para cambiar su tarifa." : "."}
                  </AppText>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <Reveal index={index}>
            <ServiceRow
              service={item}
              onPress={
                item.is_active
                  ? () => router.push({ pathname: "/servicio/cobrar", params: { serviceId: item.id } })
                  : isAdmin
                    ? () => router.push({ pathname: "/servicio/form", params: { id: item.id } })
                    : undefined
              }
              trailing={
                isAdmin ? (
                  <Button
                    title="Editar"
                    variant="ghost"
                    onPress={() => router.push({ pathname: "/servicio/form", params: { id: item.id } })}
                  />
                ) : undefined
              }
            />
            </Reveal>
          )}
          ListEmptyComponent={
            services.isPending ? (
              <ListSkeleton rows={5} />
            ) : services.isError ? (
              <ErrorState error={services.error} onRetry={() => services.refetch()} />
            ) : (
              <EmptyState
                icon="build"
                title="Aún no tienes servicios"
                message={
                  isAdmin
                    ? "Agrega los servicios técnicos que ofreces con lo que cobras por cada uno: cambio de pantalla, formateo, cambio de batería…"
                    : "El administrador aún no ha dado de alta servicios."
                }
                action={isAdmin ? <Button title="Agregar servicio" icon="add" onPress={() => router.push("/servicio/form")} /> : undefined}
              />
            )
          }
        />
        {isAdmin && (services.data?.length ?? 0) > 0 ? (
          <Fab icon="add" label="Servicio" onPress={() => router.push("/servicio/form")} />
        ) : null}
      </View>
    );
  }

  const sections = records.data ? groupRecords(records.data.items) : [];
  const total = records.data?.items.reduce((sum, r) => sum + Number(r.price), 0) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={records.isRefetching} onRefresh={records.refetch} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <View>
            {header}
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
              <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
              {records.data ? (
                <View style={{ flexDirection: "row", gap: spacing.xl }}>
                  <View>
                    <AppText variant="caption" tone="muted">
                      Cobrado
                    </AppText>
                    <AppText variant="display" style={{ fontSize: 26 }}>
                      {formatMoney(total)}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="caption" tone="muted">
                      Servicios
                    </AppText>
                    <AppText variant="display" style={{ fontSize: 26 }}>
                      {records.data.total}
                    </AppText>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: theme.background }}>
            <AppText variant="label" tone="muted">
              {formatDayHeading(section.key)}
            </AppText>
            <AppText variant="captionStrong" tone="muted">
              {formatMoney(section.total)}
            </AppText>
          </View>
        )}
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <ServiceRecordRow record={item} />
          </Reveal>
        )}
        ListEmptyComponent={
          records.isPending ? (
            <ListSkeleton rows={5} />
          ) : records.isError ? (
            <ErrorState error={records.error} onRetry={() => records.refetch()} />
          ) : (
            <EmptyState icon="paid" title="Sin servicios cobrados" message="Cuando cobres un servicio quedará registrado aquí y sumará a tus ingresos." />
          )
        }
      />
      <Fab icon="add" label="Cobrar" onPress={() => router.push("/servicio/cobrar")} />
    </View>
  );
}
