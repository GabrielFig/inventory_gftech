import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

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
        {bars.map((bar, i) => {
          const total = bar.sales + bar.services;
          const height = total === 0 ? 3 : Math.max(6, (total / max) * (CHART_HEIGHT - 18));
          return (
            <View key={bar.key} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: CHART_HEIGHT }}>
              {!dense && total > 0 ? (
                <AppText variant="caption" tone="muted" style={{ fontSize: 10, marginBottom: 2 }}>
                  {formatCompact(total)}
                </AppText>
              ) : null}
              <Bar
                label={bar.key + ": $" + total}
                height={height}
                delay={i * 40}
                rounded={dense ? 2 : radius.sm - 2}
                empty={total === 0}
                salesShare={total > 0 ? bar.sales / total : 0}
              />
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

/** Barra que crece desde la base al aparecer (y al cambiar de valor), en el hilo de UI. */
function Bar({
  label,
  height,
  delay,
  rounded,
  empty,
  salesShare,
}: {
  label: string;
  height: number;
  delay: number;
  rounded: number;
  empty: boolean;
  salesShare: number;
}) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(0);
    progress.set(withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [height, delay, progress]);

  const style = useAnimatedStyle(() => ({ height: 3 + (height - 3) * progress.get() }));

  return (
    <Animated.View
      accessibilityLabel={label}
      style={[
        {
          width: "100%",
          borderRadius: rounded,
          overflow: "hidden",
          backgroundColor: empty ? theme.surfaceMuted : theme.warning,
          justifyContent: "flex-end",
        },
        style,
      ]}
    >
      {!empty ? <View style={{ height: `${salesShare * 100}%`, backgroundColor: theme.primary }} /> : null}
    </Animated.View>
  );
}
