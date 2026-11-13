"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type {
  IncomeResponse,
  Service,
  ServiceCreateInput,
  ServiceRecord,
  ServiceRecordCreateInput,
  ServiceRecordListResponse,
  ServiceUpdateInput,
} from "@/lib/types";

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<Service[]>("/services"),
  });
}

export function useServiceRecords(limit = 100) {
  return useQuery({
    queryKey: ["service-records", limit],
    queryFn: () => apiFetch<ServiceRecordListResponse>("/service-records", { params: { limit } }),
  });
}

/** Ingresos (ventas + servicios) desde una fecha ISO; la zona horaria agrupa por día local. */
export function useIncome(dateFrom: string) {
  return useQuery({
    queryKey: ["income", dateFrom],
    queryFn: () =>
      apiFetch<IncomeResponse>("/dashboard/income", {
        params: { date_from: dateFrom, tz_offset_minutes: -new Date().getTimezoneOffset() },
      }),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceCreateInput) => apiFetch<Service>("/services", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useUpdateService(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceUpdateInput) =>
      apiFetch<Service>(`/services/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service-records"] });
    },
  });
}

export function useRegisterServiceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceRecordCreateInput) =>
      apiFetch<ServiceRecord>("/service-records", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-records"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

export function useDeleteServiceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/service-records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-records"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}
