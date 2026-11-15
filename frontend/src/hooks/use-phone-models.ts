"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PhoneModel } from "@/lib/types";

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Modelos del catálogo filtrados por marca y/o modelo (sin texto, los primeros por orden alfabético). */
export function usePhoneModels(query: string, enabled = true) {
  const q = useDebounced(query.trim());
  return useQuery({
    queryKey: ["phone-models", q],
    queryFn: () => apiFetch<PhoneModel[]>("/phone-models", { params: { q, limit: 30 } }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
  });
}

export function usePhoneBrands(enabled = true) {
  return useQuery({
    queryKey: ["phone-brands"],
    queryFn: () => apiFetch<string[]>("/phone-models/brands"),
    enabled,
    staleTime: 5 * 60_000,
  });
}
