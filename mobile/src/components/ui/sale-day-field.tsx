import { View } from "react-native";

import { Chip, Segmented } from "@/components/ui/chips";
import { IconButton } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { addDays, formatLongDate, startOfDay } from "@/lib/format";
import { radius, spacing, useTheme } from "@/theme";

type When = "today" | "other";

const OPTIONS: { key: When; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "other", label: "Otro día" },
];

const QUICK: { days: number; label: string }[] = [
  { days: 1, label: "Ayer" },
  { days: 3, label: "Hace 3 días" },
  { days: 7, label: "Hace 1 semana" },
];

const MAX_DAYS_AGO = 730;

/** Fecha en que se hizo la venta: una venta que no se capturó a tiempo se guarda a mediodía de ese día. */
export function saleDateISO(daysAgo: number): string | undefined {
  if (daysAgo <= 0) return undefined;
  const day = addDays(startOfDay(), -daysAgo);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0).toISOString();
}

/** `daysAgo` = 0 es hoy; 1 es ayer; etc. */
export function SaleDayField({ daysAgo, onChange }: { daysAgo: number; onChange: (daysAgo: number) => void }) {
  const theme = useTheme();
  const when: When = daysAgo > 0 ? "other" : "today";
  const day = addDays(startOfDay(), -daysAgo);

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="captionStrong" tone="muted">
        ¿Cuándo fue la venta?
      </AppText>
      <Segmented options={OPTIONS} value={when} onChange={(key) => onChange(key === "today" ? 0 : Math.max(1, daysAgo))} />
      {when === "other" ? (
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <IconButton
              icon="chevron-left"
              label="Un día antes"
              onPress={() => onChange(Math.min(MAX_DAYS_AGO, daysAgo + 1))}
            />
            <AppText variant="bodyStrong" accessibilityLiveRegion="polite" accessibilityLabel={`Fecha de la venta: ${formatLongDate(day)}`}>
              {formatLongDate(day)}
            </AppText>
            <View style={{ opacity: daysAgo <= 1 ? 0.35 : 1 }}>
              <IconButton
                icon="chevron-right"
                label="Un día después"
                onPress={() => (daysAgo > 1 ? onChange(daysAgo - 1) : undefined)}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {QUICK.map((q) => (
              <Chip key={q.days} label={q.label} selected={daysAgo === q.days} onPress={() => onChange(q.days)} />
            ))}
          </View>
          <AppText variant="caption" tone="muted">
            Para ventas que no se capturaron a tiempo. Se guarda como de ese día; el stock se descuenta hoy.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
