export type PeriodKey = "today" | "week" | "month" | "all";

export const PERIODS: { key: PeriodKey; label: string; long: string }[] = [
  { key: "today", label: "Hoy", long: "hoy" },
  { key: "week", label: "7 días", long: "los últimos 7 días" },
  { key: "month", label: "30 días", long: "los últimos 30 días" },
  { key: "all", label: "Todo", long: "todo el historial" },
];

const DAYS_BACK: Record<Exclude<PeriodKey, "all">, number> = { today: 0, week: 6, month: 29 };

/** Medianoche local del primer día del periodo, en ISO UTC (lo que espera el API). */
export function periodStart(key: PeriodKey, now: Date = new Date()): string {
  if (key === "all") return new Date(2000, 0, 1).toISOString();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS_BACK[key]).toISOString();
}
