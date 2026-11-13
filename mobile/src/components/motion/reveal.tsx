import type { StyleProp, ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";

/** Máximo de elementos escalonados: más allá, aparecen juntos para no alargar la espera. */
const MAX_STAGGER = 8;

/** Entrada suave (sube y aparece) con retraso según la posición; solo al montarse. */
export function Reveal({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, MAX_STAGGER) * 50)
        .duration(340)
        .easing(Easing.out(Easing.cubic))}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
