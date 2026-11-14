import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { BrandMark, BrandScreen, BrandTitle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { useSession } from "@/lib/session";
import { spacing, useTheme } from "@/theme";

export default function ConnectingScreen() {
  const theme = useTheme();
  const { status, retryConnection } = useSession();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  const offline = status === "offline";

  return (
    <BrandScreen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl, padding: spacing.xl }}>
        <BrandMark size={88} />
        <BrandTitle />
        {offline ? (
          <View style={{ alignItems: "center", gap: spacing.lg }}>
            <AppText tone="hero" style={{ textAlign: "center" }}>
              No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.
            </AppText>
            <Button title="Reintentar" icon="refresh" onPress={retryConnection} />
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <ActivityIndicator color={theme.heroAccent} />
            <AppText tone="heroMuted" style={{ textAlign: "center" }}>
              {slow
                ? "El servidor está despertando, puede tardar hasta un minuto…"
                : "Conectando con el servidor…"}
            </AppText>
          </View>
        )}
      </View>
    </BrandScreen>
  );
}
