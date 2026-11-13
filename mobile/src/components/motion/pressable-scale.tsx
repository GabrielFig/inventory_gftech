import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 18, stiffness: 420, mass: 0.6 } as const;

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (1 = sin efecto). */
  scaleTo?: number;
}

/** Pressable que "se hunde" al tocarlo; corre en el hilo de UI, sin renders de React. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
