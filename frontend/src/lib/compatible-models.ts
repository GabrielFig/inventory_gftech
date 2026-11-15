import type { CompatibleModelInput, PhoneModel } from "@/lib/types";

/** Un modelo elegido en el formulario: ya existe (`id`) o se creará al guardar. */
export interface ModelDraft {
  id?: string;
  brand: string;
  model: string;
}

export function draftKey(draft: ModelDraft): string {
  return draft.id ?? `new:${draft.brand.trim().toLowerCase()}|${draft.model.trim().toLowerCase()}`;
}

export function toInputs(drafts: ModelDraft[]): CompatibleModelInput[] {
  return drafts.map((d) => (d.id ? { id: d.id } : { brand: d.brand.trim(), model: d.model.trim() }));
}

export function fromPhoneModels(models: PhoneModel[]): ModelDraft[] {
  return models.map((m) => ({ id: m.id, brand: m.brand, model: m.model }));
}

/** Los modelos del catálogo llevan la marca en el nombre ("Samsung A15"); se quita al repetirla. */
function withoutBrand(brand: string, model: string): string {
  const prefix = `${brand.toLowerCase()} `;
  return model.toLowerCase().startsWith(prefix) ? model.slice(prefix.length) : model;
}

const MAX_TEXT = 255;

/** Texto sugerido para `model_compatibility`: "Samsung A15 / A35 / Moto G05". */
export function suggestCompatibilityText(drafts: ModelDraft[]): string {
  const byBrand = new Map<string, string[]>();
  for (const d of drafts) {
    const group = byBrand.get(d.brand) ?? [];
    group.push(group.length === 0 ? d.model : withoutBrand(d.brand, d.model));
    byBrand.set(d.brand, group);
  }
  const text = [...byBrand.values()].map((names) => names.join(" / ")).join(" / ");
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1).trimEnd()}…` : text;
}
