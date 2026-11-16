"use client";

import { useId, useMemo, useState } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhoneBrands, usePhoneModels } from "@/hooks/use-phone-models";
import { draftKey, type ModelDraft } from "@/lib/compatible-models";
import { cn } from "@/lib/utils";

/**
 * Selector multiselección de modelos de teléfono: chips de lo elegido, búsqueda del catálogo
 * y alta de un modelo nuevo (marca + modelo) cuando no existe.
 */
export function CompatibleModelsPicker({
  value,
  onChange,
}: {
  value: ModelDraft[];
  onChange: (next: ModelDraft[]) => void;
}) {
  const listId = useId();
  const brandsListId = useId();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");

  const { data: results, isFetching } = usePhoneModels(query);
  const { data: brands } = usePhoneBrands(creating);

  const selectedKeys = useMemo(() => new Set(value.map(draftKey)), [value]);
  const selectedNames = useMemo(
    () => new Set(value.map((d) => `${d.brand.toLowerCase()}|${d.model.toLowerCase()}`)),
    [value],
  );

  function toggle(draft: ModelDraft) {
    const key = draftKey(draft);
    onChange(selectedKeys.has(key) ? value.filter((d) => draftKey(d) !== key) : [...value, draft]);
  }

  function openCreate() {
    setNewModel(query.trim());
    setCreating(true);
  }

  function addNew() {
    const brand = newBrand.trim().replace(/\s+/g, " ");
    const model = newModel.trim().replace(/\s+/g, " ");
    if (!brand || !model) return;
    const existing = results?.find(
      (m) => m.brand.toLowerCase() === brand.toLowerCase() && m.model.toLowerCase() === model.toLowerCase(),
    );
    const draft: ModelDraft = existing ? { id: existing.id, brand: existing.brand, model: existing.model } : { brand, model };
    if (!selectedKeys.has(draftKey(draft)) && !selectedNames.has(`${brand.toLowerCase()}|${model.toLowerCase()}`)) {
      onChange([...value, draft]);
    }
    setCreating(false);
    setNewModel("");
    setQuery("");
  }

  const canAddNew = newBrand.trim().length > 0 && newModel.trim().length > 0;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Modelos seleccionados">
          {value.map((draft) => (
            <li key={draftKey(draft)}>
              <Badge variant="secondary" className="h-6 gap-1 pr-1">
                {draft.model}
                {!draft.id && <span className="text-[10px] uppercase text-muted-foreground">nuevo</span>}
                <button
                  type="button"
                  onClick={() => toggle(draft)}
                  aria-label={`Quitar ${draft.model}`}
                  className="grid size-4 cursor-pointer place-items-center rounded-full hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar modelo: iPhone 15, Samsung A15…"
          className="pl-9"
          aria-controls={listId}
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <ul
        id={listId}
        className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border"
        aria-label="Modelos del catálogo"
      >
        {results?.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            {query.trim() ? `Sin resultados para “${query.trim()}”.` : "Todavía no hay modelos en el catálogo."}
          </li>
        )}
        {results?.map((m) => {
          const selected = selectedKeys.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggle({ id: m.id, brand: m.brand, model: m.model })}
                aria-pressed={selected}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
                  selected && "bg-accent/40",
                )}
              >
                <span className="truncate">{m.model}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {m.brand}
                  {selected && <Check className="size-4 text-primary" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground">
            Modelo nuevo: se agrega al catálogo al guardar el producto.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Marca (Samsung)"
              list={brandsListId}
              aria-label="Marca del modelo nuevo"
              maxLength={60}
            />
            <datalist id={brandsListId}>
              {brands?.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <Input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="Modelo (Samsung A15)"
              aria-label="Nombre del modelo nuevo"
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNew();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="cursor-pointer" disabled={!canAddNew} onClick={addNew}>
              Agregar modelo
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          ¿No está? Crear modelo nuevo
        </Button>
      )}
    </div>
  );
}
