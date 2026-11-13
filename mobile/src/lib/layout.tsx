import { createContext, useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme";

/**
 * Área segura inferior que le toca a la pantalla.
 *
 * Con la barra de pestañas, ella ya se encarga del hueco del sistema (botones o
 * barra de gestos) y la pantalla queda arriba de ella: sumar el inset otra vez
 * dejaría un vacío. Fuera de las pestañas (formularios, detalle) la pantalla
 * llega hasta el borde y sí debe respetarlo.
 */
const InTabsContext = createContext(false);

export function TabsScreenLayout({ children }: { children: React.ReactNode }) {
  return <InTabsContext.Provider value>{children}</InTabsContext.Provider>;
}

export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  return useContext(InTabsContext) ? 0 : insets.bottom;
}

/** Alto del botón flotante + sus márgenes: lo que una lista debe dejar libre al final. */
const FAB_CLEARANCE = 56 + spacing.lg * 2;

export function useListBottomPadding(withFab = false): number {
  return useBottomInset() + (withFab ? FAB_CLEARANCE : spacing.lg);
}
