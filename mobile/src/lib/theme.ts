export const colors = {
  primary: "#208AEF",
  primaryDark: "#1971C2",
  background: "#F7F9FC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  success: "#15803D",
  successBg: "#DCFCE7",
  warning: "#B45309",
  warningBg: "#FEF3C7",
} as const;

export const statusColors: Record<"ok" | "bajo" | "agotado", { bg: string; text: string }> = {
  ok: { bg: colors.successBg, text: colors.success },
  bajo: { bg: colors.warningBg, text: colors.warning },
  agotado: { bg: colors.dangerBg, text: colors.danger },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
