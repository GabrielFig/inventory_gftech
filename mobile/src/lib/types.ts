export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type UserRole = "admin" | "vendedor";

export interface CurrentUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export type StockStatus = "ok" | "bajo" | "agotado";

export interface Product {
  id: string;
  code: string;
  name: string;
  model_compatibility: string;
  sale_price: string;
  cost: string;
  current_stock: number;
  status: StockStatus;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface SaleCreate {
  product_id: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
}

export interface SaleRead {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  notes: string | null;
  sale_date: string;
  total: string;
  profit: string;
}
