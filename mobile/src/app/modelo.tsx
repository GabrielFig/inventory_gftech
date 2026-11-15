import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ProductRow, RowSeparator } from "@/components/rows";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { AppText } from "@/components/ui/text";
import { useModelSearch } from "@/hooks/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { spacing, useTheme } from "@/theme";
import { useBottomInset } from "@/lib/layout";

const ORDER = ["Funda", "Mica", "Mica Cámara", "Cable", "Cargador"];

export default function ModelSearchScreen() {
  const bottomInset = useBottomInset();
  const router = useRouter();
  const theme = useTheme();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q ?? "");
  const debounced = useDebouncedValue(query.trim(), 300);
  const { data, isFetching, isError, error, refetch } = useModelSearch(debounced);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.lg }}>
        <TextField
          label="Marca o modelo del teléfono"
          value={query}
          onChangeText={setQuery}
          placeholder="iPhone 15, Samsung A15, Moto G56…"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxl + bottomInset }}>
        {debounced.length < 2 ? (
          <EmptyState icon="phone-android" title="¿Qué le queda a este modelo?" message="Escribe el teléfono del cliente y te mostramos la funda, mica y accesorios que tienes para él, con su stock." />
        ) : isFetching && !data ? (
          <ListSkeleton rows={4} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data && data.length === 0 ? (
          <EmptyState icon="search-off" title="Sin coincidencias" message={`No tenemos “${debounced}” en la tabla de equivalencias.`} />
        ) : (
          data?.map((result) => {
            const matches = [...result.matches].sort((a, b) => ORDER.indexOf(a.category.name) - ORDER.indexOf(b.category.name));
            return (
              <Card key={`${result.brand}-${result.model}`} padded={false}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.md }}>
                  <Icon name="smartphone" size={20} color="primary" />
                  <AppText variant="heading">{result.model}</AppText>
                  <AppText tone="muted">{result.brand}</AppText>
                </View>
                {matches.length === 0 ? (
                  <AppText tone="muted" style={{ padding: spacing.lg, paddingTop: 0 }}>
                    Sin accesorios registrados para este modelo.
                  </AppText>
                ) : (
                  matches.map((product) => (
                    <View key={product.id}>
                      <RowSeparator />
                      <ProductRow product={product} onPress={() => router.push({ pathname: "/producto/[id]", params: { id: product.id } })} />
                    </View>
                  ))
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
