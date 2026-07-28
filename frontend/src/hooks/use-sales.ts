"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Sale, SaleCreateInput, SaleListResponse } from "@/lib/types";

export interface SaleFilters {
  product_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: ["sales", filters],
    queryFn: () => apiFetch<SaleListResponse>("/sales", { params: { ...filters } }),
  });
}

export function useRegisterSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaleCreateInput) => apiFetch<Sale>("/sales", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
