import { View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/text";
import { radius, shadows, spacing, useTheme } from "@/theme";

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: shadows.card,
          padding: padded ? spacing.lg : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {action}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}
