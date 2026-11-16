export type UserRole = "admin" | "vendedor";

export interface CurrentUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

/** Modelo de teléfono (catálogo `phone_models`). */
export interface PhoneModel {
  id: string;
  brand: string;
  model: string;
}

/** Modelo enlazado a un producto; `note` es opcional (p. ej. "Funda"). */
export interface CompatibleModel extends PhoneModel {
  note: string | null;
}

/** Lo que se manda al guardar: un modelo existente (`id`) o uno nuevo (marca + modelo). */
export type CompatibleModelInput = { id: string } | { brand: string; model: string };

export type StockStatus = "ok" | "bajo" | "agotado";

export interface Product {
  id: string;
  code: string;
  supplier_id: string;
  category_id: string;
  name: string;
  model_compatibility: string;
  cost: string;
  sale_price: string;
  initial_stock: number;
  sold_count: number;
  created_at: string;
  updated_at: string;
  supplier: Supplier;
  category: Category;
  compatible_models: CompatibleModel[];
  current_stock: number;
  inventory_value: string;
  margin_pct: number;
  status: StockStatus;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface ProductCreateInput {
  supplier_id: string;
  category_id: string;
  name: string;
  model_compatibility: string;
  cost: number;
  sale_price: number;
  initial_stock: number;
  compatible_models?: CompatibleModelInput[];
}

/** En PATCH, `compatible_models` omitido no toca los modelos; una lista (aun vacía) los reemplaza. */
export type ProductUpdateInput = Partial<Omit<ProductCreateInput, "initial_stock">>;

export interface SaleProductSummary {
  id: string;
  code: string;
  name: string;
  model_compatibility: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  notes: string | null;
  sale_date: string;
  ticket_id: string | null;
  product: SaleProductSummary;
  total: string;
  profit: string;
}

export interface SaleBatchItemInput {
  product_id: string;
  quantity: number;
  unit_price?: number;
}

export interface SaleBatchInput {
  items: SaleBatchItemInput[];
  notes?: string;
  /** ISO 8601; sin fecha se registra con la hora actual. */
  sale_date?: string;
}

export interface SaleBatchResult {
  ticket_id: string;
  items: Sale[];
  total: string;
  profit: string;
}

export interface SaleListResponse {
  items: Sale[];
  total: number;
}

export interface SaleCreateInput {
  product_id: string;
  quantity: number;
  sale_date?: string;
  unit_price?: number;
  notes?: string;
}

export type SaleUpdateInput = Partial<Pick<SaleCreateInput, "quantity" | "unit_price" | "notes">>;

export interface DashboardSummary {
  total_pieces_in_stock: number;
  inventory_value: string;
  total_pieces_sold: number;
  total_revenue: string;
  total_profit: string;
  products_low_stock: number;
  products_out_of_stock: number;
  total_products: number;
}

export interface SalesTrendPoint {
  date: string;
  revenue: string;
  units: number;
}

export interface CategoryBreakdown {
  category: string;
  inventory_value: string;
  pieces: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  sales_trend: SalesTrendPoint[];
  category_breakdown: CategoryBreakdown[];
  low_stock_products: Product[];
  recent_sales: Sale[];
}

export interface ModelSearchResult {
  brand: string;
  model: string;
  matches: Product[];
}

export interface ApiError {
  detail: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCreateInput {
  name: string;
  description?: string | null;
  price: number;
}

export type ServiceUpdateInput = Partial<ServiceCreateInput> & { is_active?: boolean };

export interface ServiceRecord {
  id: string;
  service_id: string | null;
  service_name: string;
  price: string;
  notes: string | null;
  performed_at: string;
}

export interface ServiceRecordListResponse {
  items: ServiceRecord[];
  total: number;
}

export interface ServiceRecordCreateInput {
  service_id: string;
  price?: number;
  notes?: string;
}

export interface IncomeSummary {
  sales_count: number;
  sales_units: number;
  sales_revenue: string;
  sales_profit: string;
  services_count: number;
  services_revenue: string;
  total_revenue: string;
  total_profit: string;
}

export interface IncomePoint {
  date: string;
  sales_revenue: string;
  services_revenue: string;
}

export interface IncomeResponse {
  summary: IncomeSummary;
  daily: IncomePoint[];
}
