import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { IncomeChart } from "@/components/income-chart";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { PressableScale } from "@/components/motion/pressable-scale";
import { Reveal } from "@/components/motion/reveal";
import { RowSeparator, SaleRow } from "@/components/rows";
import { ActionTile, StatTile } from "@/components/tiles";
import { Card, SectionHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useDashboard, useIncome } from "@/hooks/api";
import { formatLongDate, formatMoney, formatNumber, greeting } from "@/lib/format";
import { PERIODS, periodRange, type PeriodKey } from "@/lib/period";
import { useSession } from "@/lib/session";
import { radius, spacing, useTheme } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isAdmin } = useSession();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const income = useIncome(period);
  const week = useIncome("week");
  const dashboard = useDashboard();

  const refreshing = income.isRefetching || dashboard.isRefetching || week.isRefetching;
  const refresh = () => {
    income.refetch();
    week.refetch();
    dashboard.refetch();
  };

  const firstName = user?.full_name.split(" ")[0] ?? "";
  const summary = dashboard.data?.summary;
  const attention = (summary?.products_low_stock ?? 0) + (summary?.products_out_of_stock ?? 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} bottomSpace={spacing.lg}>
      <Reveal index={0} style={{ gap: 2 }}>
        <AppText variant="title">
          {greeting()}, {firstName}
        </AppText>
        <AppText tone="muted">{formatLongDate(new Date())}</AppText>
      </Reveal>

      {/* Ingresos: el dato que más se consulta, arriba y grande */}
      <Reveal
        index={1}
        style={{
          backgroundColor: theme.hero,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          padding: spacing.lg,
          gap: spacing.md,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: theme.heroSurface, opacity: 0.55 }}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {PERIODS.map((p) => {
            const selected = p.key === period;
            return (
              <PressableScale
                key={p.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPeriod(p.key)}
                scaleTo={0.94}
                style={{
                  minHeight: 36,
                  paddingHorizontal: spacing.md,
                  justifyContent: "center",
                  borderRadius: radius.full,
                  backgroundColor: selected ? theme.heroText : "transparent",
                  borderWidth: 1,
                  borderColor: selected ? theme.heroText : theme.heroSurface,
                }}
              >
                <AppText variant="captionStrong" style={{ color: selected ? theme.hero : theme.heroMuted }}>
                  {p.label}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver detalle de ingresos"
          onPress={() => router.push("/ingresos")}
        >
        {income.isPending ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={44} width="55%" />
            <Skeleton height={14} width="75%" />
          </View>
        ) : income.isError ? (
          <AppText tone="hero">No pudimos cargar los ingresos. Jala para reintentar.</AppText>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" tone="heroMuted">
              Ingresos · {PERIODS.find((p) => p.key === period)?.long}
            </AppText>
            <AnimatedMoney
              variant="hero"
              tone="hero"
              value={Number(income.data.summary.total_revenue)}
              accessibilityLabel={"Ingresos " + formatMoney(income.data.summary.total_revenue)}
            />
            <View style={{ flexDirection: "row", gap: spacing.lg, flexWrap: "wrap", marginTop: spacing.xs }}>
              <HeroFigure label="Ventas" value={formatMoney(income.data.summary.sales_revenue)} />
              <HeroFigure label="Servicios" value={formatMoney(income.data.summary.services_revenue)} />
              <HeroFigure label="Ganancia" value={formatMoney(income.data.summary.total_profit)} highlight />
            </View>
          </View>
        )}
        </Pressable>
      </Reveal>

      <Reveal index={2} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <ActionTile icon="point-of-sale" label="Vender" emphasis onPress={() => router.push("/venta/nueva")} />
          <ActionTile icon="build" label="Cobrar servicio" onPress={() => router.push("/servicio/cobrar")} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {isAdmin ? (
            <ActionTile icon="add-box" label="Nuevo producto" onPress={() => router.push("/producto/form")} />
          ) : null}
          <ActionTile icon="phone-android" label="Buscar por modelo" onPress={() => router.push("/modelo")} />
        </View>
      </Reveal>

      <Reveal index={3}>
      <Card>
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Últimos 7 días" />
          {week.isPending ? (
            <Skeleton height={150} />
          ) : week.isError ? (
            <ErrorState error={week.error} onRetry={() => week.refetch()} />
          ) : (
            <IncomeChart days={periodRange("week").days} daily={week.data.daily} />
          )}
        </View>
      </Card>
      </Reveal>

      <Reveal index={4} style={{ gap: spacing.md }}>
        <SectionHeader title="Inventario" />
        {dashboard.isPending ? (
          <Skeleton height={96} radiusSize={radius.lg} />
        ) : dashboard.isError ? (
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <StatTile label="Valor al costo" value={formatMoney(summary!.inventory_value)} hint={`${summary!.total_products} productos`} />
              <StatTile label="Piezas en stock" value={formatNumber(summary!.total_pieces_in_stock)} />
            </View>
            {attention > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate({ pathname: "/inventario", params: { status: "bajo" } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderRadius: radius.lg,
                  borderCurve: "continuous",
                  backgroundColor: theme.warningSoft,
                }}
              >
                <Icon name="warning-amber" size={26} color="warning" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" tone="warning">
                    {attention} producto{attention === 1 ? "" : "s"} por resurtir
                  </AppText>
                  <AppText variant="caption" tone="warning">
                    {summary!.products_out_of_stock} agotados · {summary!.products_low_stock} con stock bajo
                  </AppText>
                </View>
                <Icon name="chevron-right" size={24} color="warning" />
              </Pressable>
            ) : null}
          </>
        )}
      </Reveal>

      <Reveal index={5} style={{ gap: spacing.md }}>
        <SectionHeader
          title="Ventas recientes"
          action={
            <Pressable accessibilityRole="button" onPress={() => router.navigate("/ventas")} hitSlop={8}>
              <AppText variant="bodyStrong" tone="primary">
                Ver todas
              </AppText>
            </Pressable>
          }
        />
        {dashboard.isPending ? (
          <Skeleton height={120} radiusSize={radius.lg} />
        ) : dashboard.isError ? null : dashboard.data.recent_sales.length === 0 ? (
          <Card>
            <AppText tone="muted" style={{ textAlign: "center" }}>
              Aún no hay ventas. Registra la primera con “Vender”.
            </AppText>
          </Card>
        ) : (
          <Card padded={false}>
            {dashboard.data.recent_sales.slice(0, 5).map((sale, i) => (
              <View key={sale.id}>
                {i > 0 ? <RowSeparator /> : null}
                <SaleRow sale={sale} showProfit={isAdmin} onPress={() => router.push({ pathname: "/venta/[id]", params: { id: sale.id } })} />
              </View>
            ))}
          </Card>
        )}
      </Reveal>
    </Screen>
  );
}

function HeroFigure({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 1 }}>
      <AppText variant="caption" tone="heroMuted">
        {label}
      </AppText>
      <AppText variant="number" style={{ color: highlight ? theme.heroAccent : theme.heroText }}>
        {value}
      </AppText>
    </View>
  );
}
