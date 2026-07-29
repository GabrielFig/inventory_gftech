import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { apiFetch, ApiClientError } from "@/lib/api-client";
import { clearToken, getToken } from "@/lib/auth-storage";
import type { CurrentUser } from "@/lib/types";

const MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) router.replace("/login");
          return;
        }

        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          try {
            await apiFetch<CurrentUser>("/auth/me");
            if (!cancelled) router.replace("/venta");
            return;
          } catch (error) {
            lastError = error;
            // A 401 means the token itself is invalid — apiFetch already
            // cleared it, so retrying with backoff won't help.
            if (error instanceof ApiClientError && error.status === 401) {
              break;
            }
            // Transient/network/5xx error: retry with the same backoff
            // shape as query-client.ts so a cold Render instance gets a
            // chance to wake up instead of bouncing the user to /login.
            if (attempt < MAX_ATTEMPTS - 1) {
              await delay(Math.min(1000 * 2 ** attempt, 15000));
            }
          }
        }

        if (lastError instanceof ApiClientError && lastError.status === 401) {
          await clearToken();
        }
        if (!cancelled) router.replace("/login");
      } catch {
        // Any unexpected failure (e.g. getToken() itself throwing) should
        // still resolve the loading state instead of leaving it stuck.
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
