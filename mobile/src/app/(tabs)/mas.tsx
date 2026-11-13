import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Pressable, Switch, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/text";
import { useSession } from "@/lib/session";
import { hit, radius, spacing, useTheme } from "@/theme";

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  trailing,
  danger,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      android_ripple={{ color: theme.primarySoft }}
      style={{ minHeight: hit + 12, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
    >
      <Icon name={icon} size={24} color={danger ? "danger" : "primary"} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" tone={danger ? "danger" : "default"}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (onPress && !danger ? <Icon name="chevron-right" size={22} color="textMuted" /> : null)}
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, logout, biometricAvailable, biometricEnabled, enableBiometric, disableBiometric } = useSession();

  async function toggleBiometric(next: boolean) {
    if (!next) {
      await disableBiometric();
      return;
    }
    const result = await enableBiometric();
    if (result === "unsupported") {
      Alert.alert(
        "No disponible",
        "Registra una huella en los ajustes de tu teléfono y vuelve a intentarlo. Si ya lo hiciste, cierra sesión e inicia de nuevo.",
      );
    }
  }

  function confirmLogout() {
    Alert.alert("Cerrar sesión", "La próxima vez tendrás que entrar con correo y contraseña.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => logout() },
    ]);
  }

  const initials = (user?.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="title" tone="primary">
              {initials}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading">{user?.full_name}</AppText>
            <AppText variant="caption" tone="muted" selectable>
              {user?.email}
            </AppText>
            <AppText variant="captionStrong" tone="primary">
              {user?.role === "admin" ? "Administrador" : "Vendedor"}
            </AppText>
          </View>
        </View>
      </Card>

      <Card padded={false}>
        <MenuRow icon="payments" label="Ingresos" hint="Ventas y servicios por periodo" onPress={() => router.push("/ingresos")} />
        <Divider />
        <MenuRow icon="phone-android" label="Buscar por modelo" hint="¿Qué le queda a este teléfono?" onPress={() => router.push("/modelo")} />
      </Card>

      <Card padded={false}>
        <MenuRow
          icon="fingerprint"
          label="Entrar con huella"
          hint={
            biometricAvailable
              ? "Abre la app sin escribir correo ni contraseña"
              : "Registra una huella en tu teléfono para usarla"
          }
          trailing={
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!biometricAvailable && !biometricEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.surface}
              accessibilityLabel="Entrar con huella"
            />
          }
        />
      </Card>

      <Card padded={false}>
        <MenuRow icon="logout" label="Cerrar sesión" danger onPress={confirmLogout} />
      </Card>

      <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
        GF-Tech LM · versión {Constants.expoConfig?.version ?? "—"}
      </AppText>
    </Screen>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, marginLeft: spacing.lg + 36, backgroundColor: theme.border }} />;
}
