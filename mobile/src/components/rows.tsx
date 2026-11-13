import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, formatTime, parseDate } from "@/lib/format";
import type { Product, SaleRead, Service, ServiceRecord } from "@/lib/types";
import { hit, spacing, useTheme } from "@/theme";

function RowShell({
  children,
  onPress,
  label,
  trailing,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label?: string;
  /** Acción propia de la fila (ej. "Editar"): va fuera del área tocable para no anidar botones. */
  trailing?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface }}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={label}
        disabled={!onPress}
        onPress={onPress}
        android_ripple={{ color: theme.primarySoft }}
        style={{
          flex: 1,
          minHeight: hit + 12,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        {children}
      </Pressable>
      {trailing ? <View style={{ paddingRight: spacing.sm }}>{trailing}</View> : null}
    </View>
  );
}

export function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <RowShell onPress={onPress} label={`${product.name}, ${product.model_compatibility}, ${product.current_stock} piezas`}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {product.model_compatibility}
        </AppText>
        <AppText variant="caption" tone="muted">
          {product.code} · {product.category.name}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText variant="number">{formatMoney(product.sale_price)}</AppText>
        <AppText variant="captionStrong" tone="muted">
          {product.current_stock} pza{product.current_stock === 1 ? "" : "s"}
        </AppText>
        <StatusBadge status={product.status} />
      </View>
    </RowShell>
  );
}

export function SaleRow({ sale, showProfit, onPress }: { sale: SaleRead; showProfit?: boolean; onPress?: () => void }) {
  return (
    <RowShell onPress={onPress} label={`Venta de ${sale.product.name}, ${formatMoney(sale.total)}`}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {sale.product.name}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {sale.product.model_compatibility}
        </AppText>
        <AppText variant="caption" tone="muted">
          {sale.quantity} × {formatMoney(sale.unit_price)} · {formatTime(parseDate(sale.sale_date))}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <AppText variant="number">{formatMoney(sale.total)}</AppText>
        {showProfit ? (
          <AppText variant="captionStrong" tone="success">
            +{formatMoney(sale.profit)}
          </AppText>
        ) : null}
      </View>
    </RowShell>
  );
}

export function ServiceRow({
  service,
  onPress,
  trailing,
}: {
  service: Service;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <RowShell onPress={onPress} label={`${service.name}, ${formatMoney(service.price)}`} trailing={trailing}>
      <View style={{ flex: 1, gap: 2, opacity: service.is_active ? 1 : 0.55 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {service.name}
        </AppText>
        {service.description ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {service.description}
          </AppText>
        ) : null}
        {!service.is_active ? (
          <AppText variant="captionStrong" tone="warning">
            Desactivado
          </AppText>
        ) : null}
      </View>
      <AppText variant="number" style={{ opacity: service.is_active ? 1 : 0.55 }}>
        {formatMoney(service.price)}
      </AppText>
    </RowShell>
  );
}

export function ServiceRecordRow({ record, onPress }: { record: ServiceRecord; onPress?: () => void }) {
  return (
    <RowShell onPress={onPress} label={`${record.service_name}, ${formatMoney(record.price)}`}>
      <View
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="build" size={20} color="primary" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {record.service_name}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {formatTime(parseDate(record.performed_at))}
          {record.notes ? ` · ${record.notes}` : ""}
        </AppText>
      </View>
      <AppText variant="number">{formatMoney(record.price)}</AppText>
    </RowShell>
  );
}

export function RowSeparator() {
  const theme = useTheme();
  return <View style={{ height: 1, marginLeft: spacing.lg, backgroundColor: theme.border }} />;
}
