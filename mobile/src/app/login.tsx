import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BRAND_NAVY, BrandMark, BrandTitle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { ApiClientError } from "@/lib/http";
import { useSession } from "@/lib/session";
import { hit, noOutline, radius, spacing, useTheme } from "@/theme";

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login, enableBiometric } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  async function submit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      offerBiometric();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof ApiClientError ? e.message : "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  /** Tras el primer ingreso se ofrece la huella para no volver a escribir la contraseña. */
  function offerBiometric() {
    Alert.alert(
      "Entrar con tu huella",
      "¿Quieres abrir la app con tu huella la próxima vez, sin escribir correo y contraseña?",
      [
        { text: "Ahora no", style: "cancel" },
        {
          text: "Activar",
          onPress: async () => {
            const result = await enableBiometric();
            if (result === "unsupported") {
              Alert.alert(
                "No disponible",
                "Este teléfono no tiene huella registrada o el servidor aún no soporta sesiones largas. Puedes activarla después en Más.",
              );
            }
          },
        },
      ],
    );
  }

  const inputStyle = {
    flex: 1,
    minHeight: hit,
    fontSize: 16,
    color: theme.text,
    paddingVertical: 0,
    ...noOutline,
  } as const;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: BRAND_NAVY }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
      >
        <View style={{ alignItems: "center", gap: spacing.lg, paddingTop: insets.top + spacing.xxl, paddingBottom: spacing.xl }}>
          <BrandMark size={84} />
          <BrandTitle subtitle="Inventario, ventas y servicios de tu negocio" />
        </View>

        <View
          style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            paddingBottom: spacing.xl + insets.bottom,
            gap: spacing.lg,
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <AppText variant="title">Iniciar sesión</AppText>
            <AppText tone="muted">Solo la primera vez. Después podrás entrar con tu huella.</AppText>
          </View>

          <View style={{ gap: spacing.xs }}>
            <AppText variant="captionStrong" tone="muted">
              Correo
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              <Icon name="mail-outline" size={20} color="textMuted" />
              <TextInput
                accessibilityLabel="Correo"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="tu@gftech.mx"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <AppText variant="captionStrong" tone="muted">
              Contraseña
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: spacing.md, gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
              <Icon name="lock-outline" size={20} color="textMuted" />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onPress={() => setShowPassword((v) => !v)}
                style={{ width: hit, height: hit, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name={showPassword ? "visibility-off" : "visibility"} size={22} color="textMuted" />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.dangerSoft }}
            >
              <Icon name="error-outline" size={20} color="danger" />
              <AppText tone="danger" style={{ flex: 1 }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button title="Entrar" onPress={submit} loading={loading} disabled={!canSubmit} />
          {loading ? (
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              Si el servidor estaba dormido, puede tardar hasta un minuto.
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
