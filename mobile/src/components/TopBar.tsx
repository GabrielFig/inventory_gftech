import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearToken } from "@/lib/auth-storage";
import { colors, radius, spacing } from "@/lib/theme";

const NAV_ITEMS = [{ label: "Venta", active: true }];

function initialsOf(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function TopBar() {
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const router = useRouter();

  async function handleLogout() {
    setAccountOpen(false);
    await clearToken();
    router.replace("/login");
  }

  return (
    <View style={styles.bar}>
      <Pressable
        hitSlop={10}
        onPress={() => setNavOpen(true)}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Abrir menú de navegación"
      >
        <Text style={styles.hamburger}>☰</Text>
      </Pressable>

      <View style={styles.brandRow}>
        <Image source={require("../../assets/images/gftech-logo.png")} style={styles.brandLogo} resizeMode="contain" />
        <Text style={styles.brand}>GF-Tech LM</Text>
      </View>

      <Pressable
        hitSlop={10}
        onPress={() => setAccountOpen(true)}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel="Menú de cuenta"
      >
        <Text style={styles.avatarText}>{initialsOf(user?.full_name)}</Text>
      </Pressable>

      <BottomSheet visible={navOpen} onClose={() => setNavOpen(false)}>
        <Text style={styles.sheetTitle}>GF-Tech LM</Text>
        <Text style={styles.sheetSubtitle}>Los Mochis, Sinaloa</Text>
        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <View key={item.label} style={[styles.navItem, item.active && styles.navItemActive]}>
              <Text style={[styles.navItemText, item.active && styles.navItemTextActive]}>{item.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sheetHint}>Más secciones próximamente.</Text>
      </BottomSheet>

      <BottomSheet visible={accountOpen} onClose={() => setAccountOpen(false)}>
        <Text style={styles.sheetTitle}>{user?.full_name ?? "Cuenta"}</Text>
        <Text style={styles.sheetSubtitle}>{user?.email ?? ""}</Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: { padding: spacing.xs },
  hamburger: { fontSize: 22, color: colors.text },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  brandLogo: { width: 22, height: 22 },
  brand: { fontSize: 16, fontWeight: "700", color: colors.text },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sheetSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  navList: { gap: spacing.xs, marginTop: spacing.xs },
  navItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  navItemActive: { backgroundColor: colors.background },
  navItemText: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  navItemTextActive: { color: colors.primary },
  sheetHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
  logoutButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
