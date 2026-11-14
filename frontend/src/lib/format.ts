export function formatCurrency(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(numeric);
}

export function formatNumber(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-MX").format(numeric);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/** Clave "YYYY-MM-DD" del día local de una fecha, para agrupar ventas por día. */
export function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** "Hoy", "Ayer" o "lun 24 ago" a partir de una clave de día. */
export function formatDayHeading(key: string): string {
  const now = new Date();
  if (key === dayKey(now)) return "Hoy";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === dayKey(yesterday)) return "Ayer";
  const [y, m, d] = key.split("-").map(Number);
  const text = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d))
    .replace(/[.,]/g, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
