'use client';

import { useMemo, useState } from 'react';
import { useItems, useUnits, usePriceTiers } from '@/hooks/use-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Plus, X } from 'lucide-react';
import { HelpTooltip } from '@/components/help-tooltip';
import { calculatePricingMetrics } from '@/lib/pricing-calculator';
import { convertUnits } from '@/lib/unit-converter';
import type { Item, PriceTier } from '@/lib/db';
import { toast } from 'sonner';

interface SaleLineItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitId: number;
  unitShortForm: string;
  priceTierId?: number;
  priceTierQuantity?: number;
  priceTierUnitId?: number;
  priceTierUnitShortForm?: string;
  priceTierPrice?: number;
  packageCount?: number;
  stockQuantity?: number;
  stockUnitId?: number;
  stockUnitShortForm?: string;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
  totalCost: number;
}

interface SalesItemSearchProps {
  onItemAdded: (item: SaleLineItem) => void;
  addedItems: SaleLineItem[];
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(3).replace(/\.?0+$/, '');
}

export function SalesItemSearch({ onItemAdded, addedItems }: SalesItemSearchProps) {
  const { items } = useItems();
  const { units } = useUnits();
  const { priceTiers } = usePriceTiers();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(null);

  const getUnit = (unitId?: number) => units.find((unit) => unit.id === unitId);
  const getUnitShortForm = (unitId?: number) => getUnit(unitId)?.shortForm || 'unit';

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return items
      .filter((item) => item.name.toLowerCase().includes(term))
      .slice(0, 10);
  }, [searchTerm, items]);

  const itemPriceTiers = useMemo(() => {
    if (!selectedItem?.id) return [];
    return priceTiers
      .filter((tier) => Number(tier.itemId) === Number(selectedItem.id))
      .sort((a, b) => a.quantity - b.quantity);
  }, [selectedItem, priceTiers]);

  const selectedItemUnitShortForm = selectedItem ? getUnitShortForm(selectedItem.unitId) : 'unit';
  const selectedTierUnitShortForm = selectedPriceTier ? getUnitShortForm(selectedPriceTier.unitId) : '';
  const selectedItemCartCount = selectedItem
    ? addedItems.filter((item) => item.itemId === selectedItem.id).length
    : 0;
  const parsedQuantity = parseFloat(quantity);
  const validQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  const preview = useMemo(() => {
    if (!selectedItem || !validQuantity) return null;

    if (!selectedPriceTier) {
      return {
        label: `${formatQuantity(parsedQuantity)} ${selectedItemUnitShortForm}`,
        totalPrice: parsedQuantity * selectedItem.sellPrice,
        totalCost: parsedQuantity * selectedItem.buyPrice,
        stockQuantity: parsedQuantity,
        stockUnit: selectedItemUnitShortForm,
      };
    }

    const soldQuantity = parsedQuantity * selectedPriceTier.quantity;
    const stockQuantity = convertUnits(soldQuantity, selectedTierUnitShortForm, selectedItemUnitShortForm);
    const metrics = calculatePricingMetrics(
      selectedItem.buyPrice,
      selectedItemUnitShortForm,
      selectedPriceTier.quantity,
      selectedTierUnitShortForm,
      selectedPriceTier.price,
    );

    return {
      label: `${formatQuantity(parsedQuantity)} x ${formatQuantity(selectedPriceTier.quantity)}${selectedTierUnitShortForm}`,
      totalPrice: parsedQuantity * selectedPriceTier.price,
      totalCost: parsedQuantity * metrics.cost,
      stockQuantity,
      stockUnit: selectedItemUnitShortForm,
    };
  }, [
    selectedItem,
    selectedItemUnitShortForm,
    selectedPriceTier,
    selectedTierUnitShortForm,
    parsedQuantity,
    validQuantity,
  ]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm('');
    setQuantity('');
    setSelectedPriceTier(null);
  };

  const handleTierSelect = (tier: PriceTier | null) => {
    setSelectedPriceTier(tier);
    setQuantity((current) => current || '1');
  };

  const handleAddToCart = () => {
    if (!selectedItem || !selectedItem.id || !validQuantity) return;

    const itemUnitShortForm = getUnitShortForm(selectedItem.unitId);

    if (!selectedPriceTier) {
      if (parsedQuantity > selectedItem.quantity) {
        toast.error(`Only ${formatQuantity(selectedItem.quantity)}${itemUnitShortForm} in stock`);
        return;
      }

      onItemAdded({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity: parsedQuantity,
        unitId: selectedItem.unitId,
        unitShortForm: itemUnitShortForm,
        stockQuantity: parsedQuantity,
        stockUnitId: selectedItem.unitId,
        stockUnitShortForm: itemUnitShortForm,
        pricePerUnit: selectedItem.sellPrice,
        totalPrice: parsedQuantity * selectedItem.sellPrice,
        costPerUnit: selectedItem.buyPrice,
        totalCost: parsedQuantity * selectedItem.buyPrice,
      });
    } else {
      const tierUnitShortForm = getUnitShortForm(selectedPriceTier.unitId);
      const soldQuantity = parsedQuantity * selectedPriceTier.quantity;
      const stockQuantity = convertUnits(soldQuantity, tierUnitShortForm, itemUnitShortForm);

      if (stockQuantity > selectedItem.quantity) {
        toast.error(`Only ${formatQuantity(selectedItem.quantity)}${itemUnitShortForm} in stock`);
        return;
      }

      const metrics = calculatePricingMetrics(
        selectedItem.buyPrice,
        itemUnitShortForm,
        selectedPriceTier.quantity,
        tierUnitShortForm,
        selectedPriceTier.price,
      );

      onItemAdded({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity: soldQuantity,
        unitId: selectedPriceTier.unitId,
        unitShortForm: tierUnitShortForm,
        priceTierId: selectedPriceTier.id,
        priceTierQuantity: selectedPriceTier.quantity,
        priceTierUnitId: selectedPriceTier.unitId,
        priceTierUnitShortForm: tierUnitShortForm,
        priceTierPrice: selectedPriceTier.price,
        packageCount: parsedQuantity,
        stockQuantity,
        stockUnitId: selectedItem.unitId,
        stockUnitShortForm: itemUnitShortForm,
        pricePerUnit: selectedPriceTier.price / selectedPriceTier.quantity,
        totalPrice: parsedQuantity * selectedPriceTier.price,
        costPerUnit: metrics.cost / selectedPriceTier.quantity,
        totalCost: parsedQuantity * metrics.cost,
      });
    }

    setSelectedItem(null);
    setQuantity('');
    setSelectedPriceTier(null);
  };

  return (
    <div className="space-y-3">
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

      {searchTerm && filteredItems.length > 0 && !selectedItem && (
        <div className="border rounded-lg overflow-hidden">
          {filteredItems.map((item) => {
            const itemUnitShortForm = getUnitShortForm(item.unitId);
            const tiersForItem = priceTiers
              .filter((tier) => Number(tier.itemId) === Number(item.id))
              .sort((a, b) => a.quantity - b.quantity);

            return (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item)}
                className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-600">
                      Stock: {formatQuantity(item.quantity)}{itemUnitShortForm}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-green-700">Rs {item.sellPrice}</div>
                </div>
                {tiersForItem.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tiersForItem.map((tier) => (
                      <span key={tier.id} className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                        {formatQuantity(tier.quantity)}{getUnitShortForm(tier.unitId)} Rs {tier.price}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-sm">{selectedItem.name}</div>
              <div className="text-xs text-gray-600">
                Stock: {formatQuantity(selectedItem.quantity)}{selectedItemUnitShortForm}
              </div>
              {selectedItemCartCount > 0 && (
                <div className="text-xs font-semibold text-blue-700">
                  Already in sale: {selectedItemCartCount}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
              title="Clear item"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-gray-700">Selling Option</label>
              <HelpTooltip text="Choose normal base-unit sale or one of the saved item price tiers" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleTierSelect(null)}
                className={`rounded border p-2 text-left text-xs ${
                  !selectedPriceTier
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">Base price</div>
                <div>{selectedItemUnitShortForm} @ Rs {selectedItem.sellPrice}</div>
              </button>
              {itemPriceTiers.map((tier) => {
                const tierUnitShortForm = getUnitShortForm(tier.unitId);
                return (
                  <button
                    key={tier.id}
                    onClick={() => handleTierSelect(tier)}
                    className={`rounded border p-2 text-left text-xs ${
                      selectedPriceTier?.id === tier.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">
                      {formatQuantity(tier.quantity)}{tierUnitShortForm}
                    </div>
                    <div>Rs {tier.price}</div>
                  </button>
                );
              })}
            </div>
            {itemPriceTiers.length === 0 && (
              <p className="mt-1 text-xs text-gray-600">No price tiers saved for this item yet.</p>
            )}
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-gray-700">
                {selectedPriceTier
                  ? `How many ${formatQuantity(selectedPriceTier.quantity)}${selectedTierUnitShortForm} packs?`
                  : `Quantity (${selectedItemUnitShortForm})`}
              </label>
              <HelpTooltip text={selectedPriceTier ? 'Enter number of selected tier packs sold' : 'Enter quantity sold in the item base unit'} />
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={selectedPriceTier ? 'e.g., 1' : `e.g., 1 ${selectedItemUnitShortForm}`}
              className="h-9 text-sm"
            />
          </div>

          {preview && (
            <div className="bg-white p-2 rounded mb-3 border border-blue-100 text-xs text-gray-700 space-y-1">
              <div className="flex justify-between gap-3">
                <span>Sale:</span>
                <span className="font-semibold text-right">{preview.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Stock deduct:</span>
                <span className="font-semibold text-right">
                  {formatQuantity(preview.stockQuantity)}{preview.stockUnit}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Total price:</span>
                <span className="font-bold text-green-700">Rs {preview.totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Profit:</span>
                <span className="font-semibold text-green-700">
                  Rs {(preview.totalPrice - preview.totalCost).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={!validQuantity}
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
