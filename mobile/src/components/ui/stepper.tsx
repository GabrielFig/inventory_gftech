import * as Haptics from "expo-haptics";
import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { hit, noOutline, radius, spacing, useTheme } from "@/theme";

export function QuantityStepper({
  label,
  value,
  onChange,
  min = 1,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const theme = useTheme();
  const clamp = (n: number) => Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, n));
  const step = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(clamp(value + delta));
  };

  const button = (icon: "remove" | "add", delta: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "add" ? "Aumentar cantidad" : "Disminuir cantidad"}
      disabled={disabled}
      onPress={() => step(delta)}
      style={({ pressed }) => ({
        width: hit,
        height: hit,
        borderRadius: radius.md,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.primarySoft,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={24} color="primary" />
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="captionStrong" tone="muted">
        {label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {button("remove", -1, value <= min)}
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          value={String(value)}
          onChangeText={(text) => {
            const n = parseInt(text.replace(/\D/g, ""), 10);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          selectTextOnFocus
          style={{
            flex: 1,
            height: hit,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "600",
            color: theme.text,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            ...noOutline,
          }}
        />
        {button("add", 1, max !== undefined && value >= max)}
      </View>
    </View>
  );
}
