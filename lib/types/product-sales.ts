// Product Recipe Types
export interface RecipeItem {
  id?: string;
  recipe_id?: string;
  item_id: string;
  item_name?: string; // For display purposes
  item_type?: string; // For display purposes
  quantity: number;
  unit_price?: number; // For calculation purposes
  total_price?: number; // For calculation purposes
}

export interface ProductRecipe {
  id?: string;
  name: string;
  description?: string;
  product_type: string;
  sku?: string; // Auto-generated if not provided
  price?: number; // Calculated based on ingredients
  items: RecipeItem[];
  created_at?: string;
}

// Sales Types
export interface SalesItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name?: string; // For display purposes
  quantity: number;
  price_per_unit: number;
  total_price?: number; // Calculated as quantity * price_per_unit
  product?: ProductRecipe; // Added this line to include the joined product data
}

export interface SalesOrder {
  id?: string;
  date: string;
  order_number: string;
  customer_name: string;
  batch_number?: string;
  best_before_date?: string;
  production_date?: string;
  delivery_method: string;
  labelling_matches_specs: boolean;
  checked_by?: string;
  total_amount?: number; // Sum of all items total_price
  status?: string;
  items: SalesItem[];
  created_at?: string;
}

// Delivery method type
export interface DeliveryMethod {
  id?: string;
  name: string;
}
