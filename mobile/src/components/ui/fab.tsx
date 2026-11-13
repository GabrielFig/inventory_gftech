import Animated, { Easing, ZoomIn } from "react-native-reanimated";

import { PressableScale } from "@/components/motion/pressable-scale";
import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { useBottomInset } from "@/lib/layout";
import { radius, shadows, spacing, useTheme } from "@/theme";

/** Botón de acción principal flotante (Material). `label` lo vuelve "extendido". */
export function Fab({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  const bottomInset = useBottomInset();
  return (
    <Animated.View
      entering={ZoomIn.delay(200).duration(280).easing(Easing.out(Easing.back(1.4)))}
      style={{ position: "absolute", right: spacing.lg, bottom: spacing.lg + bottomInset }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        scaleTo={0.94}
        style={{
          minHeight: 56,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: theme.primary,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          boxShadow: shadows.raised,
        }}
      >
        <Icon name={icon} size={24} color="primaryContrast" />
        <AppText variant="bodyStrong" tone="onPrimary">
          {label}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}
