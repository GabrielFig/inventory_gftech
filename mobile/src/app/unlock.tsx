import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { BrandMark, BrandScreen, BrandTitle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { useSession, type UnlockResult } from "@/lib/session";
import { radius, spacing, useTheme } from "@/theme";

const MESSAGES: Partial<Record<UnlockResult, string>> = {
  cancelled: "Toca el sensor para desbloquear.",
  offline: "No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.",
};

export default function UnlockScreen() {
  const theme = useTheme();
  const { unlock, switchToPassword } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await unlock();
    // En "ok" o "expired" la sesión cambia y esta pantalla se cierra sola.
    setMessage(MESSAGES[result] ?? null);
    setBusy(false);
  }

  // Pide la huella en cuanto aparece la pantalla, sin tocar nada.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrandScreen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl, padding: spacing.xl }}>
        <BrandMark size={72} />
        <BrandTitle subtitle="Desbloquea para continuar" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Desbloquear con huella"
          onPress={run}
          style={({ pressed }) => ({
            width: 112,
            height: 112,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? theme.heroSurface : theme.hero,
            borderWidth: 2,
            borderColor: theme.heroAccent,
          })}
        >
          <Icon name="fingerprint" size={60} color="heroAccent" />
        </Pressable>

        <View style={{ minHeight: 44, alignItems: "center" }}>
          {message ? (
            <AppText tone="hero" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
              {message}
            </AppText>
          ) : null}
        </View>

        <Button title="Entrar con contraseña" variant="ghost" onPress={switchToPassword} />
      </View>
    </BrandScreen>
  );
}
