import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/motion/pressable-scale";

import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { hit, radius, spacing, useTheme } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.primaryContrast, border: theme.primary },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: "transparent", fg: theme.primary, border: "transparent" },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
  }[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: theme.overlay, borderless: false }}
      style={[
        {
          minHeight: hit,
          borderRadius: radius.md,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          opacity: inactive ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {loading ? <ActivityIndicator color={palette.fg} size="small" /> : icon ? <Icon name={icon} size={20} color={palette.fg} /> : null}
        <AppText variant="bodyStrong" style={{ color: palette.fg }}>
          {title}
        </AppText>
      </View>
    </PressableScale>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      scaleTo={0.88}
      style={{ width: hit, height: hit, alignItems: "center", justifyContent: "center", borderRadius: radius.full }}
    >
      <Icon name={icon} size={24} color={color} />
    </PressableScale>
  );
}
