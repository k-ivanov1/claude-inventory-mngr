'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, Trash2 } from 'lucide-react'
import { ProductRecipe, RecipeItem } from '@/lib/types/stock'

interface ProductRecipeFormProps {
  onClose: () => void
  onSuccess?: () => void
  editRecipe?: ProductRecipe
}

export function ProductRecipeForm({ onClose, onSuccess, editRecipe }: ProductRecipeFormProps) {
  const [loading, setLoading] = useState(false)
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const supabase = createClientComponentClient()
  
  const [formData, setFormData] = useState<ProductRecipe>({
    name: '',
    description: '',
    items: []
  })

  useEffect(() => {
    if (editRecipe) {
      setFormData(editRecipe)
    }
    
    fetchInventoryItems()
  }, [editRecipe])

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product_name')
      
      if (error) throw error
      
      setAvailableItems(data || [])
    } catch (error) {
      console.error('Error fetching inventory items:', error)
      alert('Failed to load inventory items. Please try again.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <h2>Product Recipe Form</h2>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Recipe Name"
      />
      <input
        type="text"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Description"
      />
      {/* Render more inputs as needed */}
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Submit</button>
    </div>
  );
}
