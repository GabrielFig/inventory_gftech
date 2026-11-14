import { useColorScheme } from "react-native";

/**
 * Tokens de diseño de GF-Tech LM (misma identidad que la web: teal "cristal"
 * sobre fondos neutros fríos). Una sola fuente de verdad: los componentes leen
 * de aquí con useTheme(); las pantallas nunca definen colores propios.
 */
const light = {
  background: "#F2F6F7",
  surface: "#FFFFFF",
  surfaceMuted: "#E8EFF1",
  border: "#D8E2E5",
  text: "#0D1A1F",
  textMuted: "#56676E",
  primary: "#0C7580",
  primaryContrast: "#FFFFFF",
  primarySoft: "#D6EEF0",
  hero: "#0E2B34",
  heroSurface: "#16404B",
  heroText: "#F2F9FA",
  heroMuted: "#9CC3C9",
  heroAccent: "#2BF5D1",
  success: "#14733A",
  successSoft: "#DBF2E3",
  warning: "#9A5A06",
  warningSoft: "#FBEBCB",
  danger: "#BA2424",
  dangerSoft: "#FADEDE",
  overlay: "rgba(8, 20, 25, 0.45)",
} as const;

const dark = {
  background: "#0A1317",
  surface: "#121F25",
  surfaceMuted: "#1A2B33",
  border: "#25373F",
  text: "#EAF3F5",
  textMuted: "#94A9B1",
  primary: "#3FC4CE",
  primaryContrast: "#04242A",
  primarySoft: "#12383E",
  hero: "#0F2D37",
  heroSurface: "#17434F",
  heroText: "#F2F9FA",
  heroMuted: "#9CC3C9",
  heroAccent: "#2BF5D1",
  success: "#5BD08A",
  successSoft: "#133323",
  warning: "#F2B65A",
  warningSoft: "#37290F",
  danger: "#F28B82",
  dangerSoft: "#3B1C1C",
  overlay: "rgba(0, 0, 0, 0.6)",
} as const;

export type Palette = { [K in keyof typeof light]: string };

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_500Medium",
  displaySemi: "SpaceGrotesk_600SemiBold",
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44, letterSpacing: -0.5 },
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  title: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: "400" },
  captionStrong: { fontSize: 12.5, lineHeight: 17, fontWeight: "600" },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  number: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22 },
} as const;

export type TypeVariant = keyof typeof type;

export const shadows = {
  card: "0 1px 2px rgba(10, 30, 38, 0.06)",
  raised: "0 6px 18px rgba(10, 30, 38, 0.14)",
} as const;

export const hit = 48; // alto mínimo de elementos táctiles

/** En web el navegador dibuja su propio contorno al enfocar; el campo ya muestra su borde de foco. */
// outlineStyle existe en react-native-web pero no en los tipos de TextStyle.
export const noOutline = (process.env.EXPO_OS === "web" ? { outlineStyle: "none" } : {}) as object;
