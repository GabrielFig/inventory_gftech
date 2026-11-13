import { Tabs } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useEffect } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/icon";
import { TabsScreenLayout } from "@/lib/layout";
import { fonts, useTheme } from "@/theme";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Inicio", icon: "space-dashboard" },
  { name: "ventas", title: "Ventas", icon: "receipt-long" },
  { name: "inventario", title: "Inventario", icon: "inventory-2" },
  { name: "servicios", title: "Servicios", icon: "build" },
  { name: "mas", title: "Más", icon: "menu" },
];

/** El ícono activo "salta" un poco para confirmar a qué pestaña entraste. */
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.set(withSpring(focused ? 1.14 : 1, { damping: 11, stiffness: 260, mass: 0.6 }));
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={style}>
      <Icon name={name} size={24} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  // Alto = contenido de la barra + hueco del sistema (botones de navegación o barra de gestos).
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenLayout={({ children }) => <TabsScreenLayout>{children}</TabsScreenLayout>}
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 20, color: theme.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
        // Las pestañas que no se ven dejan de renderizar: menos trabajo en segundo plano.
        freezeOnBlur: true,
        animation: "fade",
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => <TabIcon name={tab.icon} color={color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
