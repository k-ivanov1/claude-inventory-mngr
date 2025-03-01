import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ProductFormProps {
  onClose: () => void;
  editProduct?: any; // adjust your type accordingly
}

export default function ProductForm({ onClose, editProduct }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    items: [] as { item_id: string; quantity: number; total_price?: number }[],
  });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const totalPrice = formData.items.reduce((acc, item) => acc + (item.total_price || 0), 0);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    // Update the specific field for the ingredient at the given index
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', quantity: 1 }],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Form submission logic here
  };

  return (
    <div>
      <div>
        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Ingredients Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900">Product Ingredients</h4>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
                No ingredients added yet. Add ingredients to create your product recipe.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-3">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Item
                      </label>
                      <select
                        value={item.item_id}
                        onChange={(e) => handleIngredientChange(index, 'item_id', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Select an item</option>
                        {inventoryItems.map((inventoryItem) => (
                          <option key={inventoryItem.id} value={inventoryItem.id}>
                            {inventoryItem.product_name} ({inventoryItem.product_type}) - £
                            {inventoryItem.unit_price?.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleIngredientChange(index, 'quantity', parseInt(e.target.value) || 0)
                        }
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cost
                      </label>
                      <div className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                        £{item.total_price?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Cost */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-medium text-gray-900">Total Product Cost</h4>
              <div className="text-lg font-medium text-gray-900">£{totalPrice.toFixed(2)}</div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              This is the calculated cost based on the current prices of ingredients.
            </p>
          </div>

          <div className="flex justify-end gap-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
