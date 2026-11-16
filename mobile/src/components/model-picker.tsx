import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chips";
import { TextField } from "@/components/ui/field";
import { AppText } from "@/components/ui/text";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePhoneBrands, usePhoneModels } from "@/hooks/api";
import { draftKey, type ModelDraft } from "@/lib/compatible-models";
import { spacing } from "@/theme";

/**
 * Selector multiselección de modelos de teléfono: chips de lo elegido (toca para quitar),
 * búsqueda en el catálogo y alta de un modelo nuevo (marca + modelo) si no existe.
 */
export function ModelPicker({ value, onChange }: { value: ModelDraft[]; onChange: (next: ModelDraft[]) => void }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const results = usePhoneModels(useDebouncedValue(query.trim(), 250));
  const brands = usePhoneBrands(creating);

  const selected = new Set(value.map(draftKey));

  function toggle(draft: ModelDraft) {
    const key = draftKey(draft);
    onChange(selected.has(key) ? value.filter((d) => draftKey(d) !== key) : [...value, draft]);
  }

  function addNew() {
    const brand = newBrand.trim().replace(/\s+/g, " ");
    const model = newModel.trim().replace(/\s+/g, " ");
    if (!brand || !model) return;
    const existing = results.data?.find(
      (m) => m.brand.toLowerCase() === brand.toLowerCase() && m.model.toLowerCase() === model.toLowerCase(),
    );
    const draft: ModelDraft = existing ? { id: existing.id, brand: existing.brand, model: existing.model } : { brand, model };
    const sameName = value.some((d) => d.brand.toLowerCase() === brand.toLowerCase() && d.model.toLowerCase() === model.toLowerCase());
    if (!selected.has(draftKey(draft)) && !sameName) onChange([...value, draft]);
    setCreating(false);
    setNewModel("");
    setQuery("");
  }

  const term = query.trim();
  const suggestedBrands = (brands.data ?? []).filter((b) => b.toLowerCase().includes(newBrand.trim().toLowerCase()) && b !== newBrand.trim());

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="captionStrong" tone="muted">
        Modelos compatibles
      </AppText>

      {value.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} accessibilityLabel="Modelos seleccionados">
          {value.map((draft) => (
            <Chip key={draftKey(draft)} label={`${draft.model}${draft.id ? "" : " (nuevo)"}  ✕`} selected onPress={() => toggle(draft)} />
          ))}
        </View>
      ) : null}

      <TextField
        label="Buscar en el catálogo"
        value={query}
        onChangeText={setQuery}
        placeholder="iPhone 15, Samsung A15…"
        autoCapitalize="none"
        autoCorrect={false}
        hint="Con estos modelos el producto aparece en “Buscar por modelo”."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {results.data?.map((m) => (
          <Chip key={m.id} label={m.model} selected={selected.has(m.id)} onPress={() => toggle({ id: m.id, brand: m.brand, model: m.model })} />
        ))}
      </View>
      {results.data?.length === 0 ? (
        <AppText variant="caption" tone="muted">
          {term ? `Sin resultados para “${term}”.` : "Todavía no hay modelos en el catálogo."}
        </AppText>
      ) : null}

      {creating ? (
        <View style={{ gap: spacing.sm }}>
          <TextField label="Marca del modelo nuevo" value={newBrand} onChangeText={setNewBrand} placeholder="Samsung" maxLength={60} />
          {newBrand.trim() && suggestedBrands.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {suggestedBrands.slice(0, 6).map((b) => (
                <Chip key={b} label={b} selected={false} onPress={() => setNewBrand(b)} />
              ))}
            </View>
          ) : null}
          <TextField label="Nombre del modelo nuevo" value={newModel} onChangeText={setNewModel} placeholder="Samsung A15" maxLength={120} onSubmitEditing={addNew} />
          <AppText variant="caption" tone="muted">
            Se agrega al catálogo al guardar el producto.
          </AppText>
          <Button title="Agregar modelo" icon="add" onPress={addNew} disabled={!newBrand.trim() || !newModel.trim()} />
          <Button title="Cancelar" variant="ghost" onPress={() => setCreating(false)} />
        </View>
      ) : (
        <Button
          title="¿No está? Crear modelo nuevo"
          icon="add"
          variant="secondary"
          onPress={() => {
            setNewModel(term);
            setCreating(true);
          }}
        />
      )}
    </View>
  );
}
