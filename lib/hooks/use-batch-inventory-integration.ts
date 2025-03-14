'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// This hook handles inventory updates when batch records are created or modified
export function useBatchInventoryIntegration() {
  const supabase = createClientComponentClient()

  // Sets up listeners for batch-related database events
  useEffect(() => {
    // Create a channel to listen for database changes
    const channel = supabase
      .channel('batch-inventory-sync')
      // Listen for new batch manufacturing records
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'batch_manufacturing_records' },
        handleNewBatchRecord
      )
      // Listen for inventory changes
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'batch_manufacturing_records' },
        handleUpdatedBatchRecord
      )
      .subscribe()

    // Cleanup function
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Handles new batch record creation
  const handleNewBatchRecord = async (payload: any) => {
    // Get the new batch record
    const newBatch = payload.new

    if (!newBatch || !newBatch.id) return

    try {
      // 1. Fetch the batch ingredients to know what raw materials were used
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('batch_ingredients')
        .select('*')
        .eq('batch_id', newBatch.id)

      if (ingredientsError) throw ingredientsError

      // 2. Get the product details
      const { data: product, error: productError } = await supabase
        .from('final_products')
        .select('*')
        .eq('id', newBatch.product_id)
        .single()

      if (productError) throw productError

      // 3. Reduce the inventory of raw materials used
      if (ingredients && ingredients.length > 0) {
        for (const ingredient of ingredients) {
          // Get current inventory for this raw material
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', ingredient.raw_material_id)
            .single()

          if (inventoryError) {
            console.error('Error fetching inventory for ingredient:', inventoryError)
            continue
          }

          if (inventoryItem) {
            // Update inventory with reduced quantity
            await supabase
              .from('inventory')
              .update({
                stock_level: Math.max(0, inventoryItem.stock_level - ingredient.quantity),
                last_updated: new Date().toISOString()
              })
              .eq('id', inventoryItem.id)
          }
        }
      }

      // 4. Add or update the final product in inventory
      // Check if this product already exists in inventory
      const { data: existingProduct, error: existingProductError } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_name', product.name)
        .eq('is_final_product', true)
        .maybeSingle()

      if (existingProductError) throw existingProductError

      // Calculate the quantity produced (batch_size represents kg, may need conversion)
      const producedQuantity = newBatch.bags_count || 1 // Default to 1 if not specified

      if (existingProduct) {
        // Update existing inventory entry
        await supabase
          .from('inventory')
          .update({
            stock_level: existingProduct.stock_level + producedQuantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingProduct.id)
      } else {
        // Create new inventory entry for this final product
        await supabase
          .from('inventory')
          .insert({
            product_name: product.name,
            sku: product.sku || generateSKU(product.category),
            category: product.category,
            stock_level: producedQuantity,
            unit: 'piece', // Assuming final products are counted in pieces
            unit_price: product.unit_selling_price || 0,
            reorder_point: 5, // Default value, could be customized
            is_recipe_based: true,
            is_final_product: true,
            last_updated: new Date().toISOString()
          })
      }

      console.log('Batch inventory integration complete for new batch:', newBatch.id)
    } catch (error) {
      console.error('Error in batch inventory integration:', error)
    }
  }

  // Handle updates to existing batch records
  const handleUpdatedBatchRecord = async (payload: any) => {
    // Similar to handleNewBatchRecord but handles differences between old and new
    // This would be used when a batch record is modified
    // Implement if needed for your workflow
  }

  // Helper function to generate SKU
  const generateSKU = (category: string) => {
    const prefix = (category || 'prod').substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}-${timestamp}${random}`
  }

  return null // This hook doesn't render anything
}
