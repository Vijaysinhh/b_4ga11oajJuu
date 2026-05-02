'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Unit, PriceTier } from '@/lib/db';
import { calculatePricingMetrics } from '@/lib/pricing-calculator';
import { convertUnit } from '@/lib/unit-conversion';

interface PriceTierManagerProps {
  itemId?: number;
  priceTiers: PriceTier[];
  units: Unit[];
  wholesaleCost: number;
  wholesaleQty: number;
  wholesaleUnitId: number; // Add this
  onAdd: (tier: Omit<PriceTier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete: (tierId: number) => void;
}

export function PriceTierManager({
  itemId,
  priceTiers,
  units,
  wholesaleCost,
  wholesaleQty,
  wholesaleUnitId,
  onAdd,
  onDelete,
}: PriceTierManagerProps) {
  const [newTier, setNewTier] = useState({
    quantity: '',
    unitId: units[0]?.id || 0,
    price: '',
  });

  const handleAdd = () => {
    if (!newTier.quantity || !newTier.price || !itemId) {
      return;
    }

    onAdd({
      itemId,
      quantity: parseFloat(newTier.quantity),
      unitId: newTier.unitId,
      price: parseFloat(newTier.price),
    });

    setNewTier({
      quantity: '',
      unitId: units[0]?.id || 0,
      price: '',
    });
  };

  const calculateMargin = (price: number, quantity: number, tierUnitId: number) => {
    if (wholesaleQty === 0 || wholesaleCost === 0) return 0;
    
    // Get unit short forms
    const wholesaleUnit = units.find(u => u.id === wholesaleUnitId)?.shortForm || 'unit';
    const tierUnit = units.find(u => u.id === tierUnitId)?.shortForm || 'unit';
    
    // Convert tier quantity to wholesale unit for consistent calculation
    const tierQtyInWholesaleUnit = convertUnit(quantity, tierUnit, wholesaleUnit);
    
    // Cost per unit in wholesale unit
    const costPerUnit = wholesaleCost / wholesaleQty;
    const totalCost = costPerUnit * tierQtyInWholesaleUnit;
    
    const margin = price - totalCost;
    return margin;
  };

  const calculateMarginPercent = (price: number, quantity: number, tierUnitId: number) => {
    if (wholesaleQty === 0 || wholesaleCost === 0) return 0;
    
    const wholesaleUnit = units.find(u => u.id === wholesaleUnitId)?.shortForm || 'unit';
    const tierUnit = units.find(u => u.id === tierUnitId)?.shortForm || 'unit';
    
    const tierQtyInWholesaleUnit = convertUnit(quantity, tierUnit, wholesaleUnit);
    const costPerUnit = wholesaleCost / wholesaleQty;
    const totalCost = costPerUnit * tierQtyInWholesaleUnit;
    
    if (price === 0) return 0;
    // Margin % = (profit / selling price) × 100
    return ((price - totalCost) / price) * 100;
  };

  const calculateMarkupPercent = (price: number, quantity: number, tierUnitId: number) => {
    if (wholesaleQty === 0 || wholesaleCost === 0) return 0;
    
    const wholesaleUnit = units.find(u => u.id === wholesaleUnitId)?.shortForm || 'unit';
    const tierUnit = units.find(u => u.id === tierUnitId)?.shortForm || 'unit';
    
    const tierQtyInWholesaleUnit = convertUnit(quantity, tierUnit, wholesaleUnit);
    const costPerUnit = wholesaleCost / wholesaleQty;
    const totalCost = costPerUnit * tierQtyInWholesaleUnit;
    
    if (totalCost === 0) return 0;
    // Markup % = (profit / cost) × 100
    return ((price - totalCost) / totalCost) * 100;
  };

  const getUnitName = (unitId: number) => {
    const unit = units.find((u) => u.id === unitId);
    return unit?.shortForm || unit?.name || 'N/A';
  };

  const getMetrics = (price: number, quantity: number, tierUnitId: number) => {
    if (!wholesaleCost || !wholesaleQty) {
      return { cost: 0, profit: 0, margin: 0, markup: 0 };
    }

    const wholesaleUnit = units.find(u => u.id === wholesaleUnitId)?.shortForm || 'unit';
    const tierUnit = units.find(u => u.id === tierUnitId)?.shortForm || 'unit';
    
    // wholesaleCost is already per-unit price (e.g., ₹100/kg)
    // No need to divide again
    const costPerUnit = wholesaleCost;

    return calculatePricingMetrics(
      costPerUnit,
      wholesaleUnit,
      quantity,
      tierUnit,
      price
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold mb-3">Multi-Level Pricing Tiers</h3>
      
      {/* Legend with Examples */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4 text-xs space-y-2">
        <div className="font-bold text-blue-900 mb-2">How Calculations Work (Auto-Converted)</div>
        
        <div className="grid grid-cols-1 gap-2 text-blue-900">
          <div className="bg-white rounded p-2 border border-blue-100">
            <span className="font-semibold">Example: Buy 3kg rice at ₹200/kg, sell 50g at ₹15</span>
            <div className="text-xs text-gray-700 mt-1 space-y-0.5">
              <div>Step 1: Convert 50g → 0.05kg automatically</div>
              <div>Step 2: Cost = ₹200 × 0.05kg = ₹10</div>
              <div>Step 3: Profit = ₹15 - ₹10 = ₹5</div>
              <div className="font-semibold text-green-700">✓ Margin: 33.33% | Markup: 50%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="font-semibold text-green-900">Margin % (Better for shopkeepers)</div>
              <div className="text-xs text-green-800 mt-1">
                Shows % of selling price that is profit
                <br/>
                Formula: (Profit ÷ Selling Price) × 100
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <div className="font-semibold text-orange-900">Markup % (For comparison)</div>
              <div className="text-xs text-orange-800 mt-1">
                Shows % markup above cost price
                <br/>
                Formula: (Profit ÷ Cost) × 100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Tiers */}
      {priceTiers.length > 0 && (
        <div className="space-y-2 mb-4">
          {priceTiers.map((tier) => (
            <Card key={tier.id} className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {tier.quantity} {getUnitName(tier.unitId)}
                  </span>
                  <span className="text-sm text-gray-600">@ ₹{tier.price.toFixed(2)}</span>
                </div>
                <div className="text-xs text-green-700 mt-1 space-y-0.5">
                  <div>
                    {(() => {
                      const metrics = getMetrics(tier.price, tier.quantity, tier.unitId);
                      return <>
                        <div>Cost: ₹{metrics.cost.toFixed(2)} | Profit: ₹{metrics.profit.toFixed(2)}</div>
                        <div className="flex gap-3">
                          <span>Margin: {metrics.margin.toFixed(1)}%</span>
                          <span className="text-gray-500">Markup: {metrics.markup.toFixed(1)}%</span>
                        </div>
                      </>;
                    })()}
                  </div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(tier.id || 0)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-semibold">Add New Price Tier</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Qty</label>
            <Input
              type="number"
              step="0.01"
              value={newTier.quantity}
              onChange={(e) => setNewTier({ ...newTier, quantity: e.target.value })}
              placeholder="e.g., 50"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Unit</label>
            <Select
              value={newTier.unitId.toString()}
              onValueChange={(value) => setNewTier({ ...newTier, unitId: Number(value) })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id!.toString()}>
                    {unit.shortForm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Price</label>
            <Input
              type="number"
              step="0.01"
              value={newTier.price}
              onChange={(e) => setNewTier({ ...newTier, price: e.target.value })}
              placeholder="₹ Price"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {newTier.price && newTier.quantity && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs space-y-1">
            {(() => {
              const metrics = getMetrics(parseFloat(newTier.price), parseFloat(newTier.quantity), newTier.unitId);
              return (
                <>
                  <div className="font-semibold text-blue-900">
                    Cost: ₹{metrics.cost.toFixed(2)} | Profit: ₹{metrics.profit.toFixed(2)}
                  </div>
                  <div className="text-blue-800 flex gap-3">
                    <span>Margin: {metrics.margin.toFixed(1)}%</span>
                    <span className="text-blue-600">Markup: {metrics.markup.toFixed(1)}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <Button
          onClick={handleAdd}
          disabled={!newTier.quantity || !newTier.price}
          className="w-full h-9 text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Tier
        </Button>
      </div>
    </div>
  );
}
