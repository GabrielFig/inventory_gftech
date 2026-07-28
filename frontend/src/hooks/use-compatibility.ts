"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ModelSearchResult } from "@/lib/types";

export function useCompatibilitySearch(query: string) {
  return useQuery({
    queryKey: ["compatibility", query],
    queryFn: () => apiFetch<ModelSearchResult[]>("/compatibility/search", { params: { q: query } }),
    enabled: query.trim().length >= 2,
  });
}
