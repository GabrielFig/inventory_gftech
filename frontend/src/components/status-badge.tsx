import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/types";

const STATUS_CONFIG: Record<StockStatus, { label: string; className: string; dot: string }> = {
  ok: {
    label: "En stock",
    className: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  bajo: {
    label: "Stock bajo",
    className: "bg-warning/15 text-warning-foreground border-warning/40",
    dot: "bg-warning",
  },
  agotado: {
    label: "Agotado",
    className: "bg-danger/15 text-danger border-danger/30",
    dot: "bg-danger",
  },
};

export function StatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
