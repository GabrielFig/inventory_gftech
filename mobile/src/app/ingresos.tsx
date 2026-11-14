import { useState } from "react";
import { View } from "react-native";

import { IncomeChart } from "@/components/income-chart";
import { StatTile } from "@/components/tiles";
import { Card, Divider, SectionHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/chips";
import { Screen } from "@/components/ui/screen";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useIncome } from "@/hooks/api";
import { formatDayHeading, formatMoney, formatNumber } from "@/lib/format";
import { PERIODS, periodRange, type PeriodKey } from "@/lib/period";
import { useSession } from "@/lib/session";
import { radius, spacing, useTheme } from "@/theme";

export default function IncomeScreen() {
  const theme = useTheme();
  const { isAdmin } = useSession();
  const [period, setPeriod] = useState<PeriodKey>("week");
  const { data, isPending, isError, error, refetch, isRefetching } = useIncome(period);
  const range = periodRange(period);

  const daily = data ? [...data.daily].sort((a, b) => (a.date < b.date ? 1 : -1)) : [];

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Segmented options={PERIODS.map((p) => ({ key: p.key, label: p.label }))} value={period} onChange={setPeriod} />

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={120} radiusSize={radius.xl} />
          <Skeleton height={90} radiusSize={radius.lg} />
          <Skeleton height={180} radiusSize={radius.lg} />
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <View style={{ backgroundColor: theme.hero, borderRadius: radius.xl, borderCurve: "continuous", padding: spacing.lg, gap: spacing.xs }}>
            <AppText variant="label" tone="heroMuted">
              Ingresos totales
            </AppText>
            <AppText variant="hero" tone="hero">
              {formatMoney(data.summary.total_revenue)}
            </AppText>
            {isAdmin ? (
              <AppText tone="hero">
                Ganancia <AppText variant="bodyStrong" style={{ color: theme.heroAccent }}>{formatMoney(data.summary.total_profit)}</AppText>
              </AppText>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatTile label="Ventas" value={formatMoney(data.summary.sales_revenue)} hint={`${data.summary.sales_count} venta${data.summary.sales_count === 1 ? "" : "s"} · ${formatNumber(data.summary.sales_units)} pzas`} />
            <StatTile label="Servicios" value={formatMoney(data.summary.services_revenue)} hint={`${data.summary.services_count} cobrado${data.summary.services_count === 1 ? "" : "s"}`} />
          </View>

          {isAdmin ? (
            <AppText variant="caption" tone="muted">
              La ganancia de ventas es precio menos costo; los servicios cuentan completos porque no registras el costo de refacciones.
            </AppText>
          ) : null}

          <Card>
            <View style={{ gap: spacing.md }}>
              <SectionHeader title="Por día" />
              <IncomeChart days={range.days} daily={data.daily} />
            </View>
          </Card>

          {daily.length > 0 ? (
            <Card padded={false}>
              {daily.map((point, i) => {
                const total = Number(point.sales_revenue) + Number(point.services_revenue);
                return (
                  <View key={point.date}>
                    {i > 0 ? <Divider /> : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="bodyStrong">{formatDayHeading(point.date)}</AppText>
                        <AppText variant="caption" tone="muted">
                          Ventas {formatMoney(point.sales_revenue)} · Servicios {formatMoney(point.services_revenue)}
                        </AppText>
                      </View>
                      <AppText variant="number">{formatMoney(total)}</AppText>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <AppText tone="muted" style={{ textAlign: "center" }}>
              Sin movimientos en este periodo.
            </AppText>
          )}
        </>
      )}
    </Screen>
  );
}
