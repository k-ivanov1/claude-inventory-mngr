// lib/utils/raw-material-utils.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Gets the current average cost for a raw material
 * 
 * @param materialId The ID of the raw material
 * @returns The average cost of the raw material
 */
export async function getRawMaterialAvgCost(materialId: string): Promise<number> {
  const supabase = createClientComponentClient()
  
  try {
    // Try to use the RPC function first (more efficient)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_raw_material_avg_cost', { material_id: materialId })
    
    if (!rpcError && rpcData !== null) {
      return rpcData
    }
    
    // Fall back to a manual calculation if the RPC function doesn't exist
    console.log('Falling back to manual average cost calculation')
    const { data: stockData, error: stockError } = await supabase
      .from('stock_receiving')
      .select('quantity, unit_price')
      .eq('item_type', 'raw_material')
      .eq('item_id', materialId)
      .eq('is_accepted', true)
    
    if (stockError) throw stockError
    
    if (!stockData || stockData.length === 0) {
      console.log(`No stock records found for material ${materialId}`)
      return 0
    }
    
    let totalCost = 0
    let totalQuantity = 0
    
    for (const record of stockData) {
      totalCost += record.quantity * record.unit_price
      totalQuantity += record.quantity
    }
    
    return totalQuantity > 0 ? totalCost / totalQuantity : 0
  } catch (error) {
    console.error('Error calculating average cost:', error)
    return 0
  }
}

/**
 * Updates the recipe items with current average costs and recalculates the recipe total cost
 * 
 * @param recipeId The ID of the recipe to update
 * @returns True if the update was successful, false otherwise
 */
export async function updateRecipeCosts(recipeId: string): Promise<boolean> {
  const supabase = createClientComponentClient()
  
  try {
    // 1. Get the recipe items
    const { data: recipeItems, error: itemsError } = await supabase
      .from('recipe_items')
      .select('id, raw_material_id, quantity')
      .eq('recipe_id', recipeId)
    
    if (itemsError) throw itemsError
    
    if (!recipeItems || recipeItems.length === 0) {
      console.log(`No items found for recipe ${recipeId}`)
      return false
    }
    
    // 2. Update each recipe item with the current average cost
    let totalRecipeCost = 0
    
    for (const item of recipeItems) {
      const avgCost = await getRawMaterialAvgCost(item.raw_material_id)
      const itemTotalCost = avgCost * item.quantity
      totalRecipeCost += itemTotalCost
      
      // Update the recipe item with the current costs
      const { error: updateError } = await supabase
        .from('recipe_items')
        .update({
          unit_cost: avgCost,
          total_cost: itemTotalCost
        })
        .eq('id', item.id)
      
      if (updateError) throw updateError
    }
    
    // 3. Update the recipe total price
    const { error: recipeUpdateError } = await supabase
      .from('product_recipes')
      .update({
        total_price: totalRecipeCost
      })
      .eq('id', recipeId)
    
    if (recipeUpdateError) throw recipeUpdateError
    
    return true
  } catch (error) {
    console.error('Error updating recipe costs:', error)
    return false
  }
}

/**
 * Updates all final products that use a specific recipe
 * 
 * @param recipeId The ID of the recipe
 * @returns True if the update was successful, false otherwise
 */
export async function updateFinalProductsForRecipe(recipeId: string): Promise<boolean> {
  const supabase = createClientComponentClient()
  
  try {
    // 1. Get the recipe cost
    const { data: recipeData, error: recipeError } = await supabase
      .from('product_recipes')
      .select('total_price')
      .eq('id', recipeId)
      .single()
    
    if (recipeError) throw recipeError
    
    const recipeCost = recipeData?.total_price || 0
    
    // 2. Get all final products that use this recipe
    const { data: productsData, error: productsError } = await supabase
      .from('final_products')
      .select('id, unit_price')
      .eq('recipe_id', recipeId)
    
    if (productsError) throw productsError
    
    if (!productsData || productsData.length === 0) {
      console.log(`No final products found for recipe ${recipeId}`)
      return true // Not an error, just nothing to update
    }
    
    // 3. Update each final product with the new recipe cost and recalculate margins
    for (const product of productsData) {
      const sellingPrice = product.unit_price || 0
      
      // Calculate new financial metrics
      const markup = recipeCost > 0 
        ? ((sellingPrice - recipeCost) / recipeCost) * 100 
        : 0
      const profitPerItem = sellingPrice - recipeCost
      const profitMargin = sellingPrice > 0 
        ? (profitPerItem / sellingPrice) * 100 
        : 0
      
      // Update the final product
      const { error: updateError } = await supabase
        .from('final_products')
        .update({
          recipe_cost: recipeCost,
          markup: Number(markup.toFixed(2)),
          profit_margin: Number(profitMargin.toFixed(2)),
          profit_per_item: Number(profitPerItem.toFixed(2))
        })
        .eq('id', product.id)
      
      if (updateError) throw updateError
    }
    
    return true
  } catch (error) {
    console.error('Error updating final products:', error)
    return false
  }
}

/**
 * Updates recipe costs and all associated final products when new stock is received
 * 
 * @param materialId The ID of the raw material that was received
 * @returns True if all updates were successful, false otherwise
 */
export async function updateCostsForMaterial(materialId: string): Promise<boolean> {
  const supabase = createClientComponentClient()
  
  try {
    // 1. Find all recipes that use this material
    const { data: recipeItems, error: itemsError } = await supabase
      .from('recipe_items')
      .select('recipe_id')
      .eq('raw_material_id', materialId)
    
    if (itemsError) throw itemsError
    
    if (!recipeItems || recipeItems.length === 0) {
      console.log(`No recipes found using material ${materialId}`)
      return true // Not an error, just nothing to update
    }
    
    // Get unique recipe IDs
    const recipeIds = [...new Set(recipeItems.map(item => item.recipe_id))]
    
    // 2. Update each recipe and its final products
    for (const recipeId of recipeIds) {
      await updateRecipeCosts(recipeId)
      await updateFinalProductsForRecipe(recipeId)
    }
    
    return true
  } catch (error) {
    console.error('Error updating costs for material:', error)
    return false
  }
}

/**
 * Updates all recipes and final products in the system with current costs
 * 
 * @returns True if all updates were successful, false otherwise
 */
export async function updateAllCosts(): Promise<boolean> {
  const supabase = createClientComponentClient()
  
  try {
    // 1. Get all recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('product_recipes')
      .select('id')
    
    if (recipesError) throw recipesError
    
    if (!recipes || recipes.length === 0) {
      console.log('No recipes found')
      return true
    }
    
    // 2. Update each recipe and its final products
    for (const recipe of recipes) {
      await updateRecipeCosts(recipe.id)
      await updateFinalProductsForRecipe(recipe.id)
    }
    
    return true
  } catch (error) {
    console.error('Error updating all costs:', error)
    return false
  }
}
