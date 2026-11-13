import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { PressableScale } from "@/components/motion/pressable-scale";
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
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      scaleTo={0.94}
      style={{
        minHeight: 40,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primary : theme.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
      }}
    >
      <AppText variant="bodyStrong" tone={selected ? "onPrimary" : "default"}>
        {label}
      </AppText>
      {count !== undefined ? (
        <AppText variant="captionStrong" tone={selected ? "onPrimary" : "muted"}>
          {count}
        </AppText>
      ) : null}
    </PressableScale>
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

/** Selector segmentado de 2–4 opciones que ocupa todo el ancho, con indicador deslizante. */
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
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );
  const segmentWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (segmentWidth === 0) return;
    const target = index * segmentWidth;
    // La primera vez se coloca sin animar; los cambios siguientes se deslizan.
    x.set(placed.current ? withSpring(target, { damping: 20, stiffness: 260, mass: 0.7 }) : target);
    placed.current = true;
  }, [index, segmentWidth, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        backgroundColor: theme.surfaceMuted,
        borderRadius: radius.md,
        borderCurve: "continuous",
        padding: PADDING,
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: PADDING,
              left: PADDING,
              bottom: PADDING,
              width: segmentWidth,
              borderRadius: radius.sm + 1,
              borderCurve: "continuous",
              backgroundColor: theme.surface,
              boxShadow: "0 1px 2px rgba(10, 30, 38, 0.12)",
            },
            indicator,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center" }}
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

const PADDING = 3;
