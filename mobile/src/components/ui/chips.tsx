import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/text";
import { radius, spacing, useTheme } from "@/theme";

export function Chip({
  label,
  selected,
  onPress,
  count,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primary : theme.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <AppText variant="bodyStrong" tone={selected ? "onPrimary" : "default"}>
        {label}
      </AppText>
      {count !== undefined ? (
        <AppText variant="captionStrong" tone={selected ? "onPrimary" : "muted"}>
          {count}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Fila horizontal desplazable de chips (filtros y selectores cortos). */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      {children}
    </ScrollView>
  );
}

/** Selector segmentado de 2–4 opciones que ocupa todo el ancho. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: theme.surfaceMuted,
        borderRadius: radius.md,
        borderCurve: "continuous",
        padding: 3,
      }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.sm + 1,
              borderCurve: "continuous",
              backgroundColor: selected ? theme.surface : "transparent",
              boxShadow: selected ? "0 1px 2px rgba(10, 30, 38, 0.12)" : undefined,
            }}
          >
            <AppText variant="bodyStrong" tone={selected ? "default" : "muted"}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
