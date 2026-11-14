import { View } from "react-native";

import { PressableScale } from "@/components/motion/pressable-scale";

import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { hit, radius, shadows, spacing, useTheme } from "@/theme";

/** Acceso rápido de la pantalla de inicio (acciones frecuentes del mostrador). */
export function ActionTile({
  icon,
  label,
  onPress,
  emphasis,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  emphasis?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: hit + 40,
        padding: spacing.md,
        gap: spacing.sm,
        justifyContent: "space-between",
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: emphasis ? theme.primary : theme.surface,
        borderWidth: emphasis ? 0 : 1,
        borderColor: theme.border,
        boxShadow: shadows.card,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: emphasis ? "rgba(255,255,255,0.18)" : theme.primarySoft,
        }}
      >
        <Icon name={icon} size={22} color={emphasis ? "primaryContrast" : "primary"} />
      </View>
      <AppText variant="bodyStrong" tone={emphasis ? "onPrimary" : "default"}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      scaleTo={onPress ? 0.97 : 1}
      style={{
        flex: 1,
        padding: spacing.lg,
        gap: 2,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        boxShadow: shadows.card,
      }}
    >
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="display" tone={tone === "default" ? "default" : tone} style={{ fontSize: 24, lineHeight: 30 }}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </PressableScale>
  );
}

export function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "muted" }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, minHeight: 36 }}>
      <AppText tone="muted" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" tone={tone ?? "default"} style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
}
