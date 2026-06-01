"use client";

import { useMemo, useState } from "react";
import { useItems, useUnits, usePriceTiers } from "@/hooks/use-db";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, X } from "lucide-react";
import { HelpTooltip } from "@/components/help-tooltip";
import { calculatePriceTierCost } from "@/lib/unit-conversion";
import {
  cleanWholeNumberInput,
  formatMoney,
  formatWholeNumber,
  parseWholeNumberInput,
} from "@/lib/number-format";
import type { Item, PriceTier } from "@/lib/db";

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

export function SalesItemSearch({
  onItemAdded,
}: SalesItemSearchProps) {
  const { items } = useItems();
  const { units } = useUnits();
  const { priceTiers } = usePriceTiers();
  const { t, language } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState("");
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return items
      .filter((item) => {
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesNameMr = item.nameMarathi ? item.nameMarathi.toLowerCase().includes(term) : false;
        return matchesName || matchesNameMr;
      })
      .slice(0, 10);
  }, [searchTerm, items]);

  const itemPriceTiers = useMemo(() => {
    if (!selectedItem) return [];
    return priceTiers.filter((tier) => tier.itemId === selectedItem.id);
  }, [selectedItem, priceTiers]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm("");
    setQuantity("");
    setSelectedPriceTier(null);
  };

  const handleAddToCart = () => {
    const qty = parseWholeNumberInput(quantity);
    if (!selectedItem || !quantity || qty <= 0) return;

    const itemUnit = units.find((u) => u.id === selectedItem.unitId);
    const pricePerUnit = selectedPriceTier?.price || selectedItem.sellPrice;
    const priceTierId = selectedPriceTier?.id;

    let costPerUnit = selectedItem.buyPrice;

    if (selectedPriceTier) {
      const priceTierUnit = units.find((u) => u.id === selectedPriceTier.unitId);
      const calculatedCost = calculatePriceTierCost(
        selectedItem.buyPrice,
        selectedPriceTier.quantity,
        priceTierUnit?.shortForm || "",
        1,
        itemUnit?.shortForm || "",
      );

      costPerUnit =
        typeof calculatedCost === "number" && !isNaN(calculatedCost)
          ? calculatedCost
          : selectedItem.buyPrice;
    }

    onItemAdded({
      itemId: selectedItem.id || 0,
      itemName: language === 'mr' && selectedItem.nameMarathi ? selectedItem.nameMarathi : selectedItem.name,
      quantity: qty,
      unitId: selectedItem.unitId,
      unitShortForm: itemUnit?.shortForm || "unit",
      priceTierId,
      pricePerUnit,
      totalPrice: qty * pricePerUnit,
      costPerUnit: costPerUnit || selectedItem.buyPrice,
      totalCost: qty * (costPerUnit || selectedItem.buyPrice),
    });

    setSelectedItem(null);
    setQuantity("");
    setSelectedPriceTier(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={t('search_items')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-10 pl-10"
          autoFocus
        />
      </div>

      {searchTerm && filteredItems.length > 0 && !selectedItem && (
        <div className="overflow-hidden rounded-lg border">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemSelect(item)}
              className="h-auto min-h-12 w-full border-b p-3 text-left last:border-b-0 hover:bg-gray-100 sm:p-2"
            >
              <div className="text-sm font-semibold">{language === 'mr' && item.nameMarathi ? item.nameMarathi : item.name}</div>
              <div className="text-xs text-gray-600">
                {t('stock')}: {formatWholeNumber(item.quantity)}
                {units.find((u) => u.id === item.unitId)?.shortForm}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedItem && (
        <Card className="border-blue-200 bg-blue-50 p-3">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div className="text-sm font-bold">{language === 'mr' && selectedItem.nameMarathi ? selectedItem.nameMarathi : selectedItem.name}</div>
              <div className="text-xs text-gray-600">
                {t('stock')}: {formatWholeNumber(selectedItem.quantity)}
                {units.find((u) => u.id === selectedItem.unitId)?.shortForm}
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Clear selected item"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-semibold text-gray-700">
                {t('quantity')}
              </label>
              <HelpTooltip text={language === 'mr' ? 'फक्त पूर्ण संख्या प्रविष्ट करा. दशांशांऐवजी ग्रॅम/मिली एकके वापरा.' : 'Enter whole quantity only. Use grams/ml units instead of decimals.'} />
            </div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(event) => setQuantity(cleanWholeNumberInput(event.target.value))}
              placeholder={t('enter_quantity')}
              className="h-9 text-sm"
            />
          </div>

          {itemPriceTiers.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('price_tier')}
                </label>
                <HelpTooltip text={language === 'mr' ? '५० ग्रॅम, १०० ग्रॅम किंवा ५०० मिली सारखे पॅकेज निवडा.' : 'Choose a package like 50g, 100g, or 500ml.'} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setSelectedPriceTier(null)}
                  className={`rounded border p-1.5 text-xs ${
                    !selectedPriceTier
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {t('default_label')} Rs. {formatMoney(selectedItem.sellPrice)}
                </button>
                {itemPriceTiers.map((tier) => {
                  const tierUnit = units.find((u) => u.id === tier.unitId);
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedPriceTier(tier)}
                      className={`flex min-h-12 flex-1 items-center justify-center rounded border p-2 text-xs font-medium sm:min-h-auto sm:p-1.5 ${
                        selectedPriceTier?.id === tier.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {formatWholeNumber(tier.quantity)}
                      {tierUnit?.shortForm} @ Rs. {formatMoney(tier.price)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {quantity && parseWholeNumberInput(quantity) > 0 && (
            <div className="mb-3 rounded border border-blue-100 bg-white p-2">
              <div className="text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>{t('total_price')}:</span>
                  <span className="font-bold text-green-700">
                    Rs. {formatMoney(parseWholeNumberInput(quantity) * (selectedPriceTier?.price || selectedItem.sellPrice))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={!quantity || parseWholeNumberInput(quantity) <= 0}
            className="h-10 w-full bg-green-600 text-sm font-semibold hover:bg-green-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('add_to_sale')}
          </Button>
        </Card>
      )}
    </div>
  );
}
