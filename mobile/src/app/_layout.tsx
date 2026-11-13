import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { warmUpServer } from "@/lib/http";
import { queryClient } from "@/lib/query-client";
import { SessionProvider, useSession } from "@/lib/session";
import { fonts, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});
warmUpServer();

function RootStack() {
  const { status } = useSession();
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const ready = (fontsLoaded || !!fontError) && status !== "loading";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const header = {
    headerStyle: { backgroundColor: theme.surface },
    headerTintColor: theme.text,
    headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 18 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background },
  } as const;

  return (
    <Stack screenOptions={header}>
      <Stack.Protected guard={status === "loading" || status === "offline"}>
        <Stack.Screen name="connecting" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === "locked"}>
        <Stack.Screen name="unlock" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="venta/nueva" options={{ title: "Nueva venta", presentation: "modal" }} />
        <Stack.Screen name="venta/[id]" options={{ title: "Venta" }} />
        <Stack.Screen name="producto/[id]" options={{ title: "Producto" }} />
        <Stack.Screen name="producto/form" options={{ title: "Producto", presentation: "modal" }} />
        <Stack.Screen name="servicio/form" options={{ title: "Servicio", presentation: "modal" }} />
        <Stack.Screen name="servicio/cobrar" options={{ title: "Cobrar servicio", presentation: "modal" }} />
        <Stack.Screen name="ingresos" options={{ title: "Ingresos" }} />
        <Stack.Screen name="modelo" options={{ title: "Buscar por modelo" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="auto" />
            <RootStack />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
