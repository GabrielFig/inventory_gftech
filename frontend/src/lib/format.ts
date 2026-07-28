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

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
