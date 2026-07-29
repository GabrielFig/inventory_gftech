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
}

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
  product: SaleProductSummary;
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
