'use client';

import { useState, useMemo } from 'react';
import { useItems, useUnits, usePriceTiers } from '@/hooks/use-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Plus, X } from 'lucide-react';
import { HelpTooltip } from '@/components/help-tooltip';
import { calculatePriceTierCost } from '@/lib/unit-conversion';
import type { Item, PriceTier } from '@/lib/db';

interface SaleLineItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitId: number;
  unitShortForm: string;
  priceTierId?: number;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
  totalCost: number;
}

interface SalesItemSearchProps {
  onItemAdded: (item: SaleLineItem) => void;
  addedItems: SaleLineItem[];
}

export function SalesItemSearch({ onItemAdded, addedItems }: SalesItemSearchProps) {
  const { items } = useItems();
  const { units } = useUnits();
  const { priceTiers } = usePriceTiers();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(null);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return items
      .filter(item =>
        item.name.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchTerm, items]);

  // Get price tiers for selected item
  const itemPriceTiers = useMemo(() => {
    if (!selectedItem) return [];
    return priceTiers.filter(tier => tier.itemId === selectedItem.id);
  }, [selectedItem, priceTiers]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm('');
    setQuantity('');
    setSelectedPriceTier(null);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !quantity || parseFloat(quantity) <= 0) return;

    const itemUnit = units.find(u => u.id === selectedItem.unitId);
    const qty = parseFloat(quantity);

    // Use selected price tier if available, otherwise use default sell price
    const pricePerUnit = selectedPriceTier?.price || selectedItem.sellPrice;
    const priceTierId = selectedPriceTier?.id;

    // Calculate cost properly for price tiers with unit conversion
    let costPerUnit = selectedItem.buyPrice;
    
    if (selectedPriceTier) {
      // Get the unit of the price tier
      const priceTierUnit = units.find(u => u.id === selectedPriceTier.unitId);
      
      // Calculate proportional cost using proper unit conversion
      // This handles cases where price tier unit differs from base item unit
      // E.g., 1kg @ ₹100 -> 50g @ ₹5 (with proper kg->g conversion)
      const calculatedCost = calculatePriceTierCost(
        selectedItem.buyPrice,           // Base item buy price
        selectedPriceTier.quantity,      // Price tier quantity (e.g., 50)
        priceTierUnit?.shortForm || '',  // Price tier unit (e.g., 'g')
        selectedItem.quantity,           // Base item quantity (e.g., 1000)
        itemUnit?.shortForm || ''        // Base item unit (e.g., 'kg')
      );
      
      // Ensure costPerUnit is always a number
      costPerUnit = typeof calculatedCost === 'number' && !isNaN(calculatedCost) ? calculatedCost : selectedItem.buyPrice;
    }

    const saleItem: SaleLineItem = {
      itemId: selectedItem.id || 0,
      itemName: selectedItem.name,
      quantity: qty,
      unitId: selectedItem.unitId,
      unitShortForm: itemUnit?.shortForm || 'unit',
      priceTierId,
      pricePerUnit,
      totalPrice: qty * pricePerUnit,
      costPerUnit: costPerUnit || selectedItem.buyPrice,
      totalCost: qty * (costPerUnit || selectedItem.buyPrice),
    };

    onItemAdded(saleItem);

    // Reset form
    setSelectedItem(null);
    setQuantity('');
    setSelectedPriceTier(null);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10"
          autoFocus
        />
      </div>

      {/* Search Results */}
      {searchTerm && filteredItems.length > 0 && !selectedItem && (
        <div className="border rounded-lg overflow-hidden">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemSelect(item)}
              className="w-full text-left p-3 sm:p-2 hover:bg-gray-100 border-b last:border-b-0 h-auto sm:auto min-h-12"
            >
              <div className="font-semibold text-sm">{item.name}</div>
              <div className="text-xs text-gray-600">
                Stock: {item.quantity}{units.find(u => u.id === item.unitId)?.shortForm}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Item Details */}
      {selectedItem && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-bold text-sm">{selectedItem.name}</div>
              <div className="text-xs text-gray-600">
                Stock: {selectedItem.quantity}{units.find(u => u.id === selectedItem.unitId)?.shortForm}
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quantity Input */}
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-gray-700">Quantity</label>
              <HelpTooltip text="Enter how many units you're selling" />
            </div>
            <Input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="h-9 text-sm"
            />
          </div>

          {/* Price Tier Selection */}
          {itemPriceTiers.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-semibold text-gray-700">Price Tier (Optional)</label>
                <HelpTooltip text="Choose a different quantity package (e.g., 50g, 100g, 500g) with its own price" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setSelectedPriceTier(null)}
                  className={`text-xs p-1.5 border rounded ${
                    !selectedPriceTier
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  Default (₹{selectedItem.sellPrice})
                </button>
                {itemPriceTiers.map((tier) => {
                  const tierUnit = units.find(u => u.id === tier.unitId);
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedPriceTier(tier)}
                      className={`flex-1 text-xs sm:text-xs p-2 sm:p-1.5 border rounded min-h-12 sm:min-h-auto flex items-center justify-center font-medium ${
                        selectedPriceTier?.id === tier.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {tier.quantity}{tierUnit?.shortForm} @ ₹{tier.price}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total Price Preview */}
          {quantity && parseFloat(quantity) > 0 && (
            <div className="bg-white p-2 rounded mb-3 border border-blue-100">
              <div className="text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Total Price:</span>
                  <span className="font-bold text-green-700">
                    ₹{(parseFloat(quantity) * (selectedPriceTier?.price || selectedItem.sellPrice)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!quantity || parseFloat(quantity) <= 0}
            className="w-full h-10 text-sm font-semibold bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add to Sale
          </Button>
        </Card>
      )}
    </div>
  );
}
