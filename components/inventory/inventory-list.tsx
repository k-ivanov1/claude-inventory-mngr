'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface InventoryItem {
  id: string
  product_name: string
  sku: string
  category: string
  stock_level: number
  reorder_point: number
  unit_price: number
  supplier: string
}

export function InventoryList({ inventory }: { inventory: InventoryItem[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClientComponentClient()

  const filteredInventory = inventory.filter((item) =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?')
    if (confirmed) {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      if (!error) {
        window.location.reload()
      }
    }
  }

  return
