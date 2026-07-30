import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useRegisterSale } from "@/hooks/useRegisterSale";
import { ApiClientError } from "@/lib/api-client";
import { colors, radius, spacing, statusColors } from "@/lib/theme";
import type { Product } from "@/lib/types";

const STATUS_LABEL: Record<Product["status"], string> = {
  ok: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

function StatusPill({ status }: { status: Product["status"] }) {
  const tone = statusColors[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.text }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

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
    const errorMessage = registerSale.error
      ? registerSale.error instanceof ApiClientError
        ? registerSale.error.message
        : "No se pudo conectar con el servidor. Intenta de nuevo."
      : null;

    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.container}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setSelectedProduct(null);
                registerSale.reset();
              }}
            >
              <Text style={styles.back}>← Cambiar producto</Text>
            </Pressable>

            <View style={styles.card}>
              <Text style={styles.title}>{selectedProduct.name}</Text>
              <Text style={styles.resultCode}>
                {selectedProduct.code} · Disponible: {selectedProduct.current_stock} pieza(s)
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Cantidad</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Precio unitario</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notas (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Cliente, forma de pago..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  registerSale.isPending && styles.buttonDisabled,
                ]}
                disabled={registerSale.isPending}
                onPress={() => {
                  const parsedQuantity = Number(quantity);
                  const parsedPrice = Number(unitPrice);
                  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return;
                  if (!unitPrice.trim() || !(parsedPrice > 0)) return;

                  registerSale.mutate(
                    {
                      product_id: selectedProduct.id,
                      quantity: parsedQuantity,
                      unit_price: parsedPrice,
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Registrar venta</Text>
        <TextInput
          style={styles.input}
          placeholder="INV-001, Ghostic Acrigel, iPhone 15..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {isFetching ? <ActivityIndicator style={styles.spinner} /> : null}
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              onPress={() => setSelectedProduct(item)}
            >
              <View style={styles.flex1}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultCode}>
                  {item.code} · {item.model_compatibility}
                </Text>
              </View>
              <View style={styles.resultRight}>
                <Text style={styles.resultPrice}>${item.sale_price}</Text>
                <StatusPill status={item.status} />
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  spinner: { marginVertical: spacing.sm },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  resultRowPressed: { backgroundColor: colors.background },
  resultName: { fontSize: 15, fontWeight: "600", color: colors.text },
  resultCode: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  resultRight: { alignItems: "flex-end", gap: spacing.xs },
  resultPrice: { fontSize: 15, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },
  back: { color: colors.primary, fontWeight: "600", marginBottom: spacing.sm },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: radius.sm, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
