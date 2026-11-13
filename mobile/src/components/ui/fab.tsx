import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { radius, shadows, spacing, useTheme } from "@/theme";

/** Botón de acción principal flotante (Material). `label` lo vuelve "extendido". */
export function Fab({
  icon,
  label,
  onPress,
  bottomOffset = 0,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  bottomOffset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        right: spacing.lg,
        bottom: spacing.lg + bottomOffset + (bottomOffset ? 0 : insets.bottom),
        minHeight: 56,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: theme.primary,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        boxShadow: shadows.raised,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name={icon} size={24} color="primaryContrast" />
      <AppText variant="bodyStrong" tone="onPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}
