import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { formatCompact, weekdayInitial } from "@/lib/format";
import type { IncomePoint } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

const CHART_HEIGHT = 132;

/**
 * Barras apiladas de ingresos por día: ventas (color primario) y servicios
 * (ámbar). Se dibuja con Views para no sumar una librería de gráficas al APK.
 */
export function IncomeChart({ days, daily }: { days: string[]; daily: IncomePoint[] }) {
  const theme = useTheme();
  const byDay = new Map(daily.map((p) => [p.date, p]));
  const bars = days.map((key) => {
    const point = byDay.get(key);
    return { key, sales: Number(point?.sales_revenue ?? 0), services: Number(point?.services_revenue ?? 0) };
  });
  const max = Math.max(1, ...bars.map((b) => b.sales + b.services));
  const dense = bars.length > 14;
  const labelEvery = dense ? Math.ceil(bars.length / 7) : 1;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ height: CHART_HEIGHT, flexDirection: "row", alignItems: "flex-end", gap: dense ? 1 : 6 }}>
        {bars.map((bar) => {
          const total = bar.sales + bar.services;
          const height = total === 0 ? 3 : Math.max(6, (total / max) * (CHART_HEIGHT - 18));
          return (
            <View key={bar.key} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: CHART_HEIGHT }}>
              {!dense && total > 0 ? (
                <AppText variant="caption" tone="muted" style={{ fontSize: 10, marginBottom: 2 }}>
                  {formatCompact(total)}
                </AppText>
              ) : null}
              <View
                accessibilityLabel={`${bar.key}: $${total}`}
                style={{
                  width: "100%",
                  height,
                  borderRadius: dense ? 2 : radius.sm - 2,
                  overflow: "hidden",
                  backgroundColor: total === 0 ? theme.surfaceMuted : theme.warning,
                  justifyContent: "flex-end",
                }}
              >
                {total > 0 ? <View style={{ height: `${(bar.sales / total) * 100}%`, backgroundColor: theme.primary }} /> : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: dense ? 1 : 6 }}>
        {bars.map((bar, i) => (
          <View key={bar.key} style={{ flex: 1, alignItems: "center" }}>
            {i % labelEvery === 0 ? (
              <AppText variant="caption" tone="muted" style={{ fontSize: 11 }}>
                {dense ? bar.key.slice(8) : weekdayInitial(bar.key)}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <Legend color={theme.primary} label="Ventas" />
        <Legend color={theme.warning} label="Servicios" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
