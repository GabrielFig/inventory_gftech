import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { useTheme, type Palette } from "@/theme";

export type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  /** Nombre de un color del tema ("primary") o un color literal. */
  color?: keyof Palette | ColorValue;
}) {
  const theme = useTheme();
  const resolved: ColorValue =
    typeof color === "string" && color in theme ? theme[color as keyof Palette] : (color ?? theme.text);
  return <MaterialIcons name={name} size={size} color={resolved} />;
}
