import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { Reveal } from "@/components/motion/reveal";
import { ProductRow, RowSeparator } from "@/components/rows";
import { Chip, ChipRow } from "@/components/ui/chips";
import { Fab } from "@/components/ui/fab";
import { SearchField } from "@/components/ui/search-field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useCategories, useProducts, type ProductFilters } from "@/hooks/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListBottomPadding } from "@/lib/layout";
import { useSession } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import { spacing, useTheme } from "@/theme";

type StatusFilter = "all" | "bajo" | "agotado";

export default function InventoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isAdmin } = useSession();
  const bottomPadding = useListBottomPadding(isAdmin);
  const params = useLocalSearchParams<{ status?: string }>();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [pickedStatus, setPickedStatus] = useState<StatusFilter | null>(null);
  // El resumen de Inicio puede abrir esta pestaña ya filtrada en "Stock bajo".
  const status: StatusFilter = pickedStatus ?? (params.status === "bajo" ? "bajo" : "all");
  const debounced = useDebouncedValue(search.trim(), 300);

  const filters: ProductFilters = {
    search: debounced || undefined,
    category_id: categoryId,
    status: status === "all" ? undefined : status,
  };
  const { data, isPending, isError, error, refetch, isRefetching } = useProducts(filters);
  const categories = useCategories();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        initialNumToRender={14}
        windowSize={7}
        maxToRenderPerBatch={12}
        removeClippedSubviews
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SearchField
                accessibilityLabel="Buscar producto"
                value={search}
                onChangeText={setSearch}
                placeholder="Nombre, modelo o ID (INV-001)"
              />
            </View>

            <ChipRow>
              <Chip label="Todo" selected={status === "all"} onPress={() => setPickedStatus("all")} />
              <Chip label="Stock bajo" selected={status === "bajo"} onPress={() => setPickedStatus("bajo")} />
              <Chip label="Agotados" selected={status === "agotado"} onPress={() => setPickedStatus("agotado")} />
            </ChipRow>
            <ChipRow>
              <Chip label="Todas las categorías" selected={!categoryId} onPress={() => setCategoryId(undefined)} />
              {categories.data?.map((c) => (
                <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
              ))}
            </ChipRow>

            <View style={{ paddingHorizontal: spacing.lg }}>
              <AppText variant="caption" tone="muted">
                {data ? `${formatNumber(data.total)} producto${data.total === 1 ? "" : "s"}` : " "}
              </AppText>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <ProductRow product={item} onPress={() => router.push({ pathname: "/producto/[id]", params: { id: item.id } })} />
          </Reveal>
        )}
        ListEmptyComponent={
          isPending ? (
            <ListSkeleton rows={8} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <EmptyState
              icon="inventory-2"
              title="Sin resultados"
              message={debounced ? `No encontramos “${debounced}” con estos filtros.` : "No hay productos con estos filtros."}
            />
          )
        }
      />
      {isAdmin ? <Fab icon="add" label="Producto" onPress={() => router.push("/producto/form")} /> : null}
    </View>
  );
}
