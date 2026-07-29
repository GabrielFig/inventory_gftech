import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { ProductListResponse } from "@/lib/types";

export function useProductSearch(search: string) {
  return useQuery({
    queryKey: ["products", "search", search],
    queryFn: () => apiFetch<ProductListResponse>("/products", { params: { search, limit: 10 } }),
    enabled: search.trim().length >= 2,
  });
}
