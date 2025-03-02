// Common fields for all stock types
export interface StockBaseFields {
  id?: string;
  date: string;
  product_name: string;
  supplier: string;
  invoice_number: string;
  quantity: number;
  price_per_unit: number;
  is_damaged: boolean;
  is_accepted: boolean;
  checked_by: string;
  created_at?: string;
}

// Tea/Coffee specific fields
export interface TeaCoffeeStock extends StockBaseFields {
  type: 'tea' | 'coffee';
  batch_number: string;
  best_before_date: string;
  package_size: number; // in grams
  labelling_matches_specifications: boolean;
  total_kg?: number; // Calculated field (quantity * package_size / 1000)
  price_per_kg?: number; // Calculated field (price_per_unit / (package_size / 1000))
  total_cost?: number; // Calculated field (quantity * price_per_unit)
}

// Other inventory items
export interface OtherStock extends StockBaseFields {
  type: 'packaging' | 'gear' | 'books' | string; // Flexible type
  batch_number: string;
  best_before_date: string;
  package_size: number;  // Added field
  total_cost?: number;   // Calculated field
}

// Union type for all stock kinds
export type StockItem = TeaCoffeeStock | OtherStock;

// Product recipe item
export interface RecipeItem {
  item_id: string;
  item_name: string;
  item_type: string;
  quantity: number;
}

// Product recipe (card)
export interface ProductRecipe {
  id?: string;
  name: string;
  description?: string;
  items: RecipeItem[];
  created_at?: string;
}
