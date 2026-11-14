"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  Sale,
  SaleBatchInput,
  SaleBatchResult,
  SaleCreateInput,
  SaleListResponse,
  SaleUpdateInput,
} from "@/lib/types";

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
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

/** Registra un carrito: una o varias líneas en un solo ticket (todo o nada). */
export function useRegisterSaleBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaleBatchInput) =>
      apiFetch<SaleBatchResult>("/sales/batch", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

export function useUpdateSale(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaleUpdateInput) => apiFetch<Sale>(`/sales/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}
