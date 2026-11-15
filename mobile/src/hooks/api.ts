import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { periodRange, type PeriodKey } from "@/lib/period";
import type {
  Category,
  DashboardResponse,
  IncomeResponse,
  ModelSearchResult,
  PhoneModel,
  Product,
  ProductInput,
  ProductListResponse,
  SaleBatchCreate,
  SaleBatchResult,
  SaleCreate,
  SaleListResponse,
  SaleRead,
  SaleUpdate,
  Service,
  ServiceInput,
  ServiceRecord,
  ServiceRecordCreate,
  ServiceRecordListResponse,
  Supplier,
} from "@/lib/types";

// ───────────────────────── Consultas ─────────────────────────

export interface ProductFilters {
  search?: string;
  status?: "ok" | "bajo" | "agotado";
  category_id?: string;
}

export const productsQuery = (filters: ProductFilters = {}) =>
  queryOptions({
    queryKey: ["products", "list", filters],
    queryFn: () => apiFetch<ProductListResponse>("/products", { params: { ...filters, limit: 200 } }),
    placeholderData: keepPreviousData,
  });

export const salesQuery = (period: PeriodKey | "all") =>
  queryOptions({
    queryKey: ["sales", period],
    queryFn: () =>
      apiFetch<SaleListResponse>("/sales", {
        params: { limit: 200, date_from: period === "all" ? undefined : periodRange(period).date_from },
      }),
    placeholderData: keepPreviousData,
  });

export const dashboardQuery = () =>
  queryOptions({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardResponse>("/dashboard") });

export const incomeQuery = (period: PeriodKey) =>
  queryOptions({
    queryKey: ["income", period],
    queryFn: () => {
      const { date_from, tz_offset_minutes } = periodRange(period);
      return apiFetch<IncomeResponse>("/dashboard/income", { params: { date_from, tz_offset_minutes } });
    },
    placeholderData: keepPreviousData,
  });

export const servicesQuery = () =>
  queryOptions({ queryKey: ["services"], queryFn: () => apiFetch<Service[]>("/services") });

export const serviceRecordsQuery = (period: PeriodKey | "all") =>
  queryOptions({
    queryKey: ["service-records", period],
    queryFn: () =>
      apiFetch<ServiceRecordListResponse>("/service-records", {
        params: { limit: 200, date_from: period === "all" ? undefined : periodRange(period).date_from },
      }),
    placeholderData: keepPreviousData,
  });

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("/categories"), staleTime: 600_000 });

export function useProducts(filters: ProductFilters = {}) {
  return useQuery(productsQuery(filters));
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => apiFetch<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useSales(period: PeriodKey | "all") {
  return useQuery(salesQuery(period));
}

export function useDashboard() {
  return useQuery(dashboardQuery());
}

export function useIncome(period: PeriodKey) {
  return useQuery(incomeQuery(period));
}

export function useServices() {
  return useQuery(servicesQuery());
}

export function useServiceRecords(period: PeriodKey | "all") {
  return useQuery(serviceRecordsQuery(period));
}

/**
 * Precarga lo que las pestañas van a pedir apenas se abran (Inicio ya lo pide solo),
 * para que Ventas, Inventario y Servicios aparezcan con datos y no con esqueletos.
 */
export function prefetchTabs(client: QueryClient) {
  const jobs = [
    client.prefetchQuery(productsQuery({})),
    client.prefetchQuery(categoriesQuery()),
    client.prefetchQuery(salesQuery("today")),
    client.prefetchQuery(servicesQuery()),
    client.prefetchQuery(serviceRecordsQuery("week")),
  ];
  return Promise.allSettled(jobs);
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[]>("/suppliers"), staleTime: 600_000 });
}

export function useCategories() {
  return useQuery(categoriesQuery());
}

export function useModelSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["compatibility", q],
    queryFn: () => apiFetch<ModelSearchResult[]>("/compatibility/search", { params: { q } }),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** Modelos del catálogo filtrados por marca y/o modelo (sin texto: los primeros alfabéticamente). */
export function usePhoneModels(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["phone-models", q],
    queryFn: () => apiFetch<PhoneModel[]>("/phone-models", { params: { q, limit: 30 } }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePhoneBrands(enabled = true) {
  return useQuery({
    queryKey: ["phone-brands"],
    queryFn: () => apiFetch<string[]>("/phone-models/brands"),
    enabled,
    staleTime: 300_000,
  });
}

// ───────────────────────── Mutaciones ─────────────────────────

/** Todo lo que cambia stock o dinero invalida junto: inventario, ventas, ingresos y resumen. */
function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: string[]) => {
    for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
  };
}

export function useRegisterSale() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: SaleCreate) => apiFetch<SaleRead>("/sales", { method: "POST", body: payload }),
    onSuccess: () => invalidate("sales", "products", "dashboard", "income", "compatibility"),
  });
}

/** Registra un carrito (una o varias líneas en un ticket); todo o nada en el servidor. */
export function useRegisterSaleBatch() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: SaleBatchCreate) => apiFetch<SaleBatchResult>("/sales/batch", { method: "POST", body: payload }),
    onSuccess: () => invalidate("sales", "products", "dashboard", "income", "compatibility"),
  });
}

export function useUpdateSale(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: SaleUpdate) => apiFetch<SaleRead>(`/sales/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => invalidate("sales", "products", "dashboard", "income"),
  });
}

export function useDeleteSale() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate("sales", "products", "dashboard", "income"),
  });
}

export function useCreateProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ProductInput) => apiFetch<Product>("/products", { method: "POST", body: payload }),
    onSuccess: () => invalidate("products", "dashboard", "compatibility", "phone-models", "phone-brands"),
  });
}

export function useUpdateProduct(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<Omit<ProductInput, "initial_stock">>) =>
      apiFetch<Product>(`/products/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => invalidate("products", "dashboard", "compatibility", "phone-models", "phone-brands"),
  });
}

export function useRestockProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, quantity, note }: { id: string; quantity: number; note?: string }) =>
      apiFetch<Product>(`/products/${id}/restock`, { method: "POST", body: { quantity, note } }),
    onSuccess: () => invalidate("products", "dashboard", "compatibility"),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate("products", "dashboard", "compatibility"),
  });
}

export function useCreateService() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ServiceInput) => apiFetch<Service>("/services", { method: "POST", body: payload }),
    onSuccess: () => invalidate("services"),
  });
}

export function useUpdateService(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<ServiceInput>) => apiFetch<Service>(`/services/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => invalidate("services"),
  });
}

export function useDeleteService() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate("services"),
  });
}

export function useRegisterServiceRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ServiceRecordCreate) =>
      apiFetch<ServiceRecord>("/service-records", { method: "POST", body: payload }),
    onSuccess: () => invalidate("service-records", "income"),
  });
}

export function useDeleteServiceRecord() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/service-records/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate("service-records", "income"),
  });
}
