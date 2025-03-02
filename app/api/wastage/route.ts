import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET handler to retrieve wastage records with optional filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  
  const supabase = createRouteHandlerClient({ cookies })
  
  // Note: We use the relationship alias "final_products" from the foreign key on product_id.
  let query = supabase
    .from('wastage')
    .select(`
      *,
      final_products:product_id(name, category, unit)
    `)
    .order('date', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)
  
  // Apply filters if provided
  if (category) {
    query = query.eq('final_products.category', category)
  }
  
  if (startDate) {
    query = query.gte('date', startDate)
  }
  
  if (endDate) {
    query = query.lte('date', endDate)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data, count })
}

// POST handler to create a new wastage record
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    
    // Validate the request data
    const { product_id, quantity, reason, recorded_by, date, notes } = requestData
    
    if (!product_id || !quantity || !reason || !recorded_by || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // First, check if there's enough stock in inventory for a final product.
    // We check using current_stock and filtering by item_type and item_id.
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('current_stock, unit')
      .eq('item_id', product_id)
      .eq('item_type', 'final_product')
      .single()
    
    if (inventoryError) {
      return NextResponse.json(
        { error: 'Failed to check inventory: ' + inventoryError.message },
        { status: 500 }
      )
    }
    
    if (!inventoryData || inventoryData.current_stock < quantity) {
      return NextResponse.json(
        { 
          error: `Not enough stock available. Current stock: ${inventoryData?.current_stock || 0} ${inventoryData?.unit || 'units'}` 
        },
        { status: 400 }
      )
    }
    
    // Create the wastage record
    const { data, error } = await supabase
      .from('wastage')
      .insert({
        product_id,
        quantity,
        reason,
        recorded_by,
        date,
        notes: notes || null
      })
      .select()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to record wastage: ' + error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data, success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}

// DELETE handler to remove a wastage record
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json(
      { error: 'Missing wastage ID' },
      { status: 400 }
    )
  }
  
  const supabase = createRouteHandlerClient({ cookies })
  
  const { error } = await supabase
    .from('wastage')
    .delete()
    .eq('id', id)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete wastage record: ' + error.message },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true })
}
