import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, SectionList, View } from "react-native";

import { RowSeparator, SaleRow } from "@/components/rows";
import { Segmented } from "@/components/ui/chips";
import { Fab } from "@/components/ui/fab";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useSales } from "@/hooks/api";
import { dayKey, formatDayHeading, formatMoney, parseDate } from "@/lib/format";
import type { PeriodKey } from "@/lib/period";
import { useSession } from "@/lib/session";
import type { SaleRead } from "@/lib/types";
import { spacing, useTheme } from "@/theme";

type SalesPeriod = PeriodKey | "all";

const OPTIONS: { key: SalesPeriod; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7 días" },
  { key: "month", label: "30 días" },
  { key: "all", label: "Todo" },
];

interface DaySection {
  key: string;
  total: number;
  data: SaleRead[];
}

function groupByDay(sales: SaleRead[]): DaySection[] {
  const map = new Map<string, DaySection>();
  for (const sale of sales) {
    const key = dayKey(parseDate(sale.sale_date));
    const section = map.get(key) ?? { key, total: 0, data: [] };
    section.total += Number(sale.total);
    section.data.push(sale);
    map.set(key, section);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export default function SalesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useSession();
  const [period, setPeriod] = useState<SalesPeriod>("today");
  const { data, isPending, isError, error, refetch, isRefetching } = useSales(period);

  const sections = data ? groupByDay(data.items) : [];
  const total = data?.items.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;
  const profit = data?.items.reduce((sum, s) => sum + Number(s.profit), 0) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(sale) => sale.id}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            <Segmented options={OPTIONS} value={period} onChange={setPeriod} />
            {data ? (
              <View style={{ flexDirection: "row", gap: spacing.xl }}>
                <View>
                  <AppText variant="caption" tone="muted">
                    Vendido
                  </AppText>
                  <AppText variant="display" style={{ fontSize: 26 }}>
                    {formatMoney(total)}
                  </AppText>
                </View>
                {isAdmin ? (
                  <View>
                    <AppText variant="caption" tone="muted">
                      Ganancia
                    </AppText>
                    <AppText variant="display" tone="success" style={{ fontSize: 26 }}>
                      {formatMoney(profit)}
                    </AppText>
                  </View>
                ) : null}
                <View>
                  <AppText variant="caption" tone="muted">
                    Ventas
                  </AppText>
                  <AppText variant="display" style={{ fontSize: 26 }}>
                    {data.total}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              backgroundColor: theme.background,
            }}
          >
            <AppText variant="label" tone="muted">
              {formatDayHeading(section.key)}
            </AppText>
            <AppText variant="captionStrong" tone="muted">
              {formatMoney(section.total)}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => (
          <SaleRow sale={item} showProfit={isAdmin} onPress={() => router.push({ pathname: "/venta/[id]", params: { id: item.id } })} />
        )}
        ItemSeparatorComponent={RowSeparator}
        ListEmptyComponent={
          isPending ? (
            <ListSkeleton />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <EmptyState
              icon="receipt-long"
              title="Sin ventas en este periodo"
              message="Cuando registres una venta aparecerá aquí con su ganancia."
            />
          )
        }
      />
      <Fab icon="add" label="Vender" onPress={() => router.push("/venta/nueva")} />
    </View>
  );
}
