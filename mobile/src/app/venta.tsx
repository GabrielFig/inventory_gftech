import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useRegisterSale } from "@/hooks/useRegisterSale";
import { ApiClientError } from "@/lib/api-client";
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

  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const registerSale = useRegisterSale();

  useEffect(() => {
    if (selectedProduct) setUnitPrice(selectedProduct.sale_price);
  }, [selectedProduct]);

  if (selectedProduct) {
    const errorMessage =
      registerSale.error instanceof ApiClientError ? registerSale.error.message : null;

    return (
      <View style={styles.container}>
        <Pressable
          onPress={() => {
            setSelectedProduct(null);
            registerSale.reset();
          }}
        >
          <Text style={styles.back}>← Cambiar producto</Text>
        </Pressable>
        <Text style={styles.title}>{selectedProduct.name}</Text>
        <Text style={styles.resultCode}>
          {selectedProduct.code} · Disponible: {selectedProduct.current_stock} pieza(s)
        </Text>

        <Text>Cantidad</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <Text>Precio unitario</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={unitPrice}
          onChangeText={setUnitPrice}
        />

        <Text>Notas (opcional)</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable
          style={styles.button}
          disabled={registerSale.isPending}
          onPress={() => {
            const parsedQuantity = Number(quantity);
            const parsedPrice = Number(unitPrice);
            if (!parsedQuantity || parsedQuantity <= 0) return;

            registerSale.mutate(
              {
                product_id: selectedProduct.id,
                quantity: parsedQuantity,
                unit_price: parsedPrice || undefined,
                notes: notes || undefined,
              },
              {
                onSuccess: (sale) => {
                  Alert.alert("Venta registrada", `Total: $${sale.total}`);
                  setSelectedProduct(null);
                  setSearch("");
                  setQuantity("1");
                  setNotes("");
                },
              },
            );
          }}
        >
          {registerSale.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirmar venta</Text>
          )}
        </Pressable>
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
  button: { backgroundColor: "#208AEF", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626" },
});
