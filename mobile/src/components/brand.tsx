import { Image } from "expo-image";
import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { spacing } from "@/theme";

export const BRAND_NAVY = "#081528";

export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/images/gftech-logo.png")}
      accessibilityLabel="Logo de GF-Tech LM"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      contentFit="contain"
    />
  );
}

/** Pantalla completa sobre fondo de marca (conexión, login, desbloqueo). */
export function BrandScreen({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: BRAND_NAVY }}>{children}</View>;
}

export function BrandTitle({ subtitle }: { subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", gap: spacing.xs }}>
      <AppText variant="display" tone="hero">
        GF-Tech LM
      </AppText>
      {subtitle ? (
        <AppText tone="heroMuted" style={{ textAlign: "center" }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
