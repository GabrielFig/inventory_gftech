import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { apiFetch, ApiClientError } from "@/lib/api-client";
import { clearToken, getToken } from "@/lib/auth-storage";
import type { CurrentUser } from "@/lib/types";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        await apiFetch<CurrentUser>("/auth/me");
        if (!cancelled) router.replace("/venta");
      } catch (error) {
        if (error instanceof ApiClientError) await clearToken();
        if (!cancelled) router.replace("/login");
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size="large" />
      <Text>Conectando con el servidor…</Text>
    </View>
  );
}
