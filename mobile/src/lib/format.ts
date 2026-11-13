const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAYS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** $1,234 o $1,234.50 — sin depender de Intl (Hermes en Android no siempre lo trae). */
export function formatMoney(value: number | string, options: { cents?: "auto" | "always" } = {}): string {
  const n = Number(value) || 0;
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  const hasCents = Math.round(rounded * 100) % 100 !== 0;
  const showCents = options.cents === "always" || hasCents;
  const [int, dec] = rounded.toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}$${group(int)}${showCents ? `.${dec}` : ""}`;
}

/** 1.2k / 3.4 mil para etiquetas de gráfica. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(value / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(".0", "")}k`;
  return String(Math.round(value));
}

export function formatNumber(value: number | string): string {
  return group(String(Math.round(Number(value) || 0)));
}

/** El backend manda microsegundos ("...:48.570198Z"); Hermes solo asegura milisegundos. */
export function parseDate(iso: string): Date {
  const normalized = iso.replace(/(\.\d{3})\d+/, "$1");
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
}

export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatTime(date: Date): string {
  let h = date.getHours();
  const suffix = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  return `${h}:${String(date.getMinutes()).padStart(2, "0")} ${suffix}`;
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`;
}

/** "Hoy", "Ayer" o "lun 3 nov" para encabezados de listas agrupadas por día. */
export function formatDayHeading(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = startOfDay();
  if (dayKey(date) === dayKey(today)) return "Hoy";
  if (dayKey(date) === dayKey(addDays(today, -1))) return "Ayer";
  return `${WEEKDAYS[date.getDay()].slice(0, 3)} ${d} ${MONTHS[m - 1]}`;
}

export function weekdayInitial(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAYS_SHORT[new Date(y, m - 1, d).getDay()];
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Interpreta lo que se escribe en un campo de dinero ("1,250.50", "80", "80,5"). NaN si no es número. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/\s/g, "").replace(/\$/g, "");
  // "1,250.50" → quita comas de miles; "80,5" → coma decimal.
  const normalized = /,\d{1,2}$/.test(cleaned) && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  return normalized === "" ? NaN : Number(normalized);
}
