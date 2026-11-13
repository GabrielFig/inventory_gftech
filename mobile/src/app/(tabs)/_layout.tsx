import { Tabs } from "expo-router";

import { Icon, type IconName } from "@/components/ui/icon";
import { fonts, useTheme } from "@/theme";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Inicio", icon: "space-dashboard" },
  { name: "ventas", title: "Ventas", icon: "receipt-long" },
  { name: "inventario", title: "Inventario", icon: "inventory-2" },
  { name: "servicios", title: "Servicios", icon: "build" },
  { name: "mas", title: "Más", icon: "menu" },
];

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 20, color: theme.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
