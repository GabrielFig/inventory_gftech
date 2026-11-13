import { addDays, dayKey, startOfDay } from "@/lib/format";

export type PeriodKey = "today" | "week" | "month" | "year";

export const PERIODS: { key: PeriodKey; label: string; long: string }[] = [
  { key: "today", label: "Hoy", long: "hoy" },
  { key: "week", label: "7 días", long: "los últimos 7 días" },
  { key: "month", label: "30 días", long: "los últimos 30 días" },
  { key: "year", label: "Año", long: "el último año" },
];

const DAYS_BACK: Record<PeriodKey, number> = { today: 0, week: 6, month: 29, year: 364 };

export interface PeriodRange {
  /** Inicio del periodo (medianoche local) en ISO UTC, listo para el API. */
  date_from: string;
  /** Minutos de diferencia con UTC (-420 en Los Mochis) para agrupar por día local. */
  tz_offset_minutes: number;
  /** Claves "YYYY-MM-DD" de cada día del periodo, para rellenar días sin ventas. */
  days: string[];
}

export function periodRange(key: PeriodKey, now: Date = new Date()): PeriodRange {
  const today = startOfDay(now);
  const start = addDays(today, -DAYS_BACK[key]);
  const days: string[] = [];
  for (let i = 0; i <= DAYS_BACK[key]; i++) days.push(dayKey(addDays(start, i)));
  return {
    date_from: start.toISOString(),
    tz_offset_minutes: -now.getTimezoneOffset(),
    days,
  };
}

/** El año se muestra por semanas/meses en la gráfica; el resto, día por día. */
export function chartDays(key: PeriodKey): number {
  return key === "today" ? 7 : DAYS_BACK[key] + 1;
}
