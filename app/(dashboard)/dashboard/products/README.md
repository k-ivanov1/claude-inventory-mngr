# Final Products and Inventory Management

## Overview

This module provides comprehensive management for final products and inventory tracking within the advanced inventory dashboard.

## Final Products Module

### Features
- Create, read, update, and delete final products
- Support for recipe-based and purchased finished products
- Integration with suppliers and product recipes
- Categorization and SKU generation
- Active/inactive product management

### Key Functionality
- Generate unique SKUs automatically
- Specify product details:
  * Name
  * Category
  * Unit of measurement
  * Unit price
  * Reorder point
- Mark products as recipe-based or purchased
- Link to existing recipes or suppliers

## Inventory Management Module

### Features
- Unified view of raw materials and final product inventory
- Real-time stock level tracking
- Manual stock adjustments
- Comprehensive inventory valuation

### Key Functionality
- View inventory across different item types
- Search and filter inventory items
- Color-coded stock level indicators
- Total inventory value calculation
- Manual stock adjustment with reason tracking

## Database Schema

### Final Products Table
```sql
CREATE TABLE final_products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    is_recipe_based BOOLEAN NOT NULL DEFAULT FALSE,
    recipe_id UUID REFERENCES product_recipes(id),
    supplier_id UUID REFERENCES suppliers(id),
    unit_price DECIMAL(10,2) NOT NULL,
    reorder_point NUMERIC NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Inventory Table
```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('raw_material', 'final_product')),
    item_id UUID NOT NULL,
    current_stock NUMERIC NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reorder_point NUMERIC NOT NULL DEFAULT 10
);
```

## Workflow Scenarios

### Recipe-Based Product
1. Create a recipe for the product
2. Create a final product linked to the recipe
3. When sold, automatically:
   - Reduce final product inventory
   - Reduce raw material inventory based on recipe

### Purchased Finished Product
1. Create a final product with a supplier
2. Receive stock via Stock Receiving module
3. When sold, reduce only final product inventory

## Inventory Adjustment
- Manual adjustments allowed with mandatory reason
- Supports both adding and removing stock
- Logs all adjustments for audit purposes

## Best Practices
- Always maintain accurate reorder points
- Regularly review inventory levels
- Use recipe-based tracking for complex products
- Keep product and inventory information up to date
