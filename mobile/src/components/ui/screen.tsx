import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, useTheme } from "@/theme";

/** Pantalla desplazable con jalar-para-actualizar, márgenes y área segura inferior. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  gap = spacing.lg,
  bottomSpace = 0,
  padded = true,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  gap?: number;
  /** Espacio extra al final (por ejemplo, para que un botón flotante no tape contenido). */
  bottomSpace?: number;
  padded?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: padded ? spacing.lg : 0,
        paddingBottom: (padded ? spacing.lg : 0) + insets.bottom + bottomSpace,
        gap,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[theme.primary]} progressBackgroundColor={theme.surface} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Formulario: sube con el teclado y deja el botón principal siempre alcanzable. */
export function FormScreen({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl + insets.bottom, gap: spacing.lg }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Row({
  children,
  gap = spacing.md,
  align = "center",
}: {
  children: React.ReactNode;
  gap?: number;
  align?: "center" | "flex-start" | "flex-end";
}) {
  return <View style={{ flexDirection: "row", alignItems: align, gap }}>{children}</View>;
}
