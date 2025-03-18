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
          // Get material details
          const { data: material, error: materialError } = await supabase
            .from('raw_materials')
            .select('name')
            .eq('id', ingredient.raw_material_id)
            .single()
            
          if (materialError) {
            console.error('Error fetching material details:', materialError)
            continue
          }
          
          // Get current inventory for this raw material
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_name', material?.name)
            .maybeSingle()

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
              
            // Create inventory movement record for consumption
            await createInventoryMovement(
              inventoryItem.id,
              'manufacturing_consume',
              -ingredient.quantity,  // Negative because it's consumption
              newBatch.id,
              'batch_manufacturing',
              `Used in batch ${newBatch.product_batch_number}`
            )
          }
        }
      }

      // Only add final product to inventory if the batch is finished
      if (newBatch.batch_finished) {
        // 4. Add or update the final product in inventory using BAGS not kg
        // Check if this product already exists in inventory
        const { data: existingProduct, error: existingProductError } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_name', product.name)
          .eq('is_final_product', true)
          .maybeSingle()

        if (existingProductError) throw existingProductError

        // Calculate the quantity produced in BAGS, not kg
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
          
          // Create inventory movement record for production
          await createInventoryMovement(
            existingProduct.id,
            'manufacturing_produce',
            producedQuantity,  // Positive because it's production
            newBatch.id,
            'batch_manufacturing',
            `Produced in batch ${newBatch.product_batch_number}`
          )
        } else {
          // Create new inventory entry for this final product
          const { data: newInventory, error: insertError } = await supabase
            .from('inventory')
            .insert({
              product_name: product.name,
              sku: product.sku || generateSKU(product.category),
              category: product.category,
              stock_level: producedQuantity,
              unit: 'bag', // Explicitly set unit to bag for final products
              unit_price: product.unit_selling_price || 0,
              reorder_point: 5, // Default value, could be customized
              is_recipe_based: true,
              is_final_product: true,
              last_updated: new Date().toISOString()
            })
            .select()
          
          if (insertError) throw insertError
          
          // Create inventory movement record for the new product
          if (newInventory && newInventory.length > 0) {
            await createInventoryMovement(
              newInventory[0].id,
              'manufacturing_produce',
              producedQuantity,
              newBatch.id,
              'batch_manufacturing',
              `Initial production in batch ${newBatch.product_batch_number}`
            )
          }
        }

        // 5. Create batch record in the unit_conversions table if needed
        // This helps with conversions between kg and bags for this product
        // Calculate kg per bag for this batch
        const kgPerBag = newBatch.batch_size / newBatch.bags_count
        
        try {
          // Check if a conversion already exists for this product
          const { data: existingConversion, error: conversionError } = await supabase
            .from('material_unit_conversions')
            .select('*')
            .eq('material_id', product.id)
            .maybeSingle()
            
          if (conversionError) throw conversionError
          
          if (existingConversion) {
            // Update the conversion rate with the latest value
            await supabase
              .from('material_unit_conversions')
              .update({
                conversion_rate: kgPerBag
              })
              .eq('id', existingConversion.id)
          } else {
            // Create a new conversion record
            await supabase
              .from('material_unit_conversions')
              .insert({
                material_id: product.id,
                base_unit: 'bag',
                conversion_unit: 'kg',
                conversion_rate: kgPerBag
              })
          }
        } catch (error) {
          console.error('Error updating unit conversion:', error)
          // Non-critical error, continue
        }
      }

      console.log('Batch inventory integration complete for new batch:', newBatch.id)
    } catch (error) {
      console.error('Error in batch inventory integration:', error)
    }
  }

  // Function to create inventory movement records
  const createInventoryMovement = async (
    inventoryId: string,
    movementType: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    notes: string
  ) => {
    try {
      await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: inventoryId,
          movement_type: movementType,
          quantity: quantity,
          reference_id: referenceId,
          reference_type: referenceType,
          notes: notes,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error creating inventory movement:', error)
      // Non-critical error, continue
    }
  }

  // Handle updates to existing batch records
  const handleUpdatedBatchRecord = async (payload: any) => {
    const oldBatch = payload.old
    const newBatch = payload.new
    
    if (!oldBatch || !newBatch || !newBatch.id) return
    
    // If batch status changed from in-progress to completed (batch_finished set)
    if (!oldBatch.batch_finished && newBatch.batch_finished) {
      try {
        // Handle as a new batch record but for the final product part only
        const { data: product, error: productError } = await supabase
          .from('final_products')
          .select('*')
          .eq('id', newBatch.product_id)
          .single()

        if (productError) throw productError
        
        // Add to inventory - follow the same steps as in handleNewBatchRecord
        // Check if this product already exists in inventory
        const { data: existingProduct, error: existingProductError } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_name', product.name)
          .eq('is_final_product', true)
          .maybeSingle()

        if (existingProductError) throw existingProductError

        const producedQuantity = newBatch.bags_count || 1

        if (existingProduct) {
          // Update existing inventory entry
          await supabase
            .from('inventory')
            .update({
              stock_level: existingProduct.stock_level + producedQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingProduct.id)
          
          // Create inventory movement record
          await createInventoryMovement(
            existingProduct.id,
            'manufacturing_produce',
            producedQuantity,
            newBatch.id,
            'batch_manufacturing',
            `Produced in batch ${newBatch.product_batch_number}, marked as completed`
          )
        } else {
          // Create new inventory entry
          const { data: newInventory, error: insertError } = await supabase
            .from('inventory')
            .insert({
              product_name: product.name,
              sku: product.sku || generateSKU(product.category),
              category: product.category,
              stock_level: producedQuantity,
              unit: 'bag',
              unit_price: product.unit_selling_price || 0,
              reorder_point: 5,
              is_recipe_based: true,
              is_final_product: true,
              last_updated: new Date().toISOString()
            })
            .select()
            
          if (insertError) throw insertError
            
          // Create inventory movement record
          if (newInventory && newInventory.length > 0) {
            await createInventoryMovement(
              newInventory[0].id,
              'manufacturing_produce',
              producedQuantity,
              newBatch.id,
              'batch_manufacturing',
              `Initial production in batch ${newBatch.product_batch_number}, marked as completed`
            )
          }
        }
      } catch (error) {
        console.error('Error handling batch completion:', error)
      }
    }
    
    // If bags_count changed, we need to update inventory
    else if (oldBatch.batch_finished && newBatch.batch_finished && oldBatch.bags_count !== newBatch.bags_count) {
      try {
        // Get the product details
        const { data: product, error: productError } = await supabase
          .from('final_products')
          .select('*')
          .eq('id', newBatch.product_id)
          .single()

        if (productError) throw productError
        
        // Find the inventory record for this product
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_name', product.name)
          .eq('is_final_product', true)
          .single()
          
        if (inventoryError) throw inventoryError
        
        if (inventoryItem) {
          // Calculate the difference in bags
          const bagsDifference = newBatch.bags_count - oldBatch.bags_count
          
          // Skip if no change
          if (bagsDifference === 0) return
          
          // Update inventory
          await supabase
            .from('inventory')
            .update({
              stock_level: Math.max(0, inventoryItem.stock_level + bagsDifference),
              last_updated: new Date().toISOString()
            })
            .eq('id', inventoryItem.id)
            
          // Create inventory movement record for the adjustment
          await createInventoryMovement(
            inventoryItem.id,
            'manufacturing_adjust',
            bagsDifference,
            newBatch.id,
            'batch_manufacturing',
            `Batch ${newBatch.product_batch_number} updated from ${oldBatch.bags_count} to ${newBatch.bags_count} bags`
          )
          
          // Update the unit conversion if batch_size also changed
          if (oldBatch.batch_size !== newBatch.batch_size) {
            const kgPerBag = newBatch.batch_size / newBatch.bags_count
            
            const { data: existingConversion, error: conversionError } = await supabase
              .from('material_unit_conversions')
              .select('*')
              .eq('material_id', product.id)
              .maybeSingle()
              
            if (conversionError) throw conversionError
            
            if (existingConversion) {
              await supabase
                .from('material_unit_conversions')
                .update({
                  conversion_rate: kgPerBag
                })
                .eq('id', existingConversion.id)
            }
          }
        }
      } catch (error) {
        console.error('Error handling batch update:', error)
      }
    }
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
