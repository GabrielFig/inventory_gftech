import { Text as RNText, type TextProps } from "react-native";

import { type, useTheme, type Palette, type TypeVariant } from "@/theme";

type Tone = "default" | "muted" | "primary" | "success" | "warning" | "danger" | "onPrimary" | "hero" | "heroMuted";

const TONE: Record<Tone, keyof Palette> = {
  default: "text",
  muted: "textMuted",
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  onPrimary: "primaryContrast",
  hero: "heroText",
  heroMuted: "heroMuted",
};

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
}

export function AppText({ variant = "body", tone = "default", style, ...props }: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...props}
      style={[type[variant] as object, { color: theme[TONE[tone]] }, variant === "number" && { fontVariant: ["tabular-nums"] }, style]}
    />
  );
}
