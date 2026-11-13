import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/ui/text";
import { hit, noOutline, radius, spacing, useTheme } from "@/theme";

export interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string | null;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export function TextField({ label, error, hint, prefix, suffix, multiline, ...props }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="captionStrong" tone="muted">
        {label}
      </AppText>
      <View
        style={{
          minHeight: hit,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.sm : 0,
          borderRadius: radius.md,
          borderCurve: "continuous",
          borderWidth: focused || error ? 2 : 1,
          borderColor,
          backgroundColor: theme.surface,
        }}
      >
        {prefix ? <AppText tone="muted">{prefix}</AppText> : null}
        <TextInput
          {...props}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            minHeight: multiline ? 72 : hit,
            fontSize: 16,
            color: theme.text,
            textAlignVertical: multiline ? "top" : "center",
            paddingVertical: 0,
            ...noOutline,
          }}
        />
        {suffix ? <AppText tone="muted">{suffix}</AppText> : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
