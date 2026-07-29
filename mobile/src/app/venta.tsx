import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { Product } from "@/lib/types";

const STATUS_LABEL: Record<Product["status"], string> = {
  ok: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

export default function VentaScreen() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isFetching } = useProductSearch(debouncedSearch);

  if (selectedProduct) {
    // La Task 7 reemplaza este bloque por el formulario de confirmación de venta.
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setSelectedProduct(null)}>
          <Text style={styles.back}>← Cambiar producto</Text>
        </Pressable>
        <Text style={styles.title}>{selectedProduct.name}</Text>
        <Text>{selectedProduct.code}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar venta</Text>
      <TextInput
        style={styles.input}
        placeholder="INV-001, Ghostic Acrigel, iPhone 15..."
        value={search}
        onChangeText={setSearch}
      />
      {isFetching ? <ActivityIndicator style={styles.spinner} /> : null}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => setSelectedProduct(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultCode}>
                {item.code} · {item.model_compatibility}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.resultPrice}>${item.sale_price}</Text>
              <Text style={styles.resultStatus}>{STATUS_LABEL[item.status]}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  spinner: { marginVertical: 8 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultName: { fontSize: 16, fontWeight: "600" },
  resultCode: { color: "#666", fontSize: 13 },
  resultPrice: { fontSize: 16, fontWeight: "600" },
  resultStatus: { color: "#666", fontSize: 13 },
  back: { color: "#208AEF", marginBottom: 8 },
});
