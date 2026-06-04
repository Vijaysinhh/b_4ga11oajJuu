"use client";

import { useMemo, useState, useEffect } from "react";
import { useItems, useUnits, usePriceTiers } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, X } from "lucide-react";
import { HelpTooltip } from "@/components/help-tooltip";
import { calculatePriceTierCost, convertUnit } from "@/lib/unit-conversion";
import { toast } from "sonner";
import {
  cleanNumberInput,
  formatMoney,
  formatNumber,
  formatWholeNumber,
  parseNumberInput,
} from "@/lib/number-format";
import type { Item, PriceTier } from "@/lib/db";

interface SaleLineItem {
  itemId: number;
  itemName: string;
  quantity: number;
  displayQuantity: string;
  unitId: number;
  unitShortForm: string;
  priceTierId?: number;
  packCount?: number;
  priceTierQuantity?: number;
  priceTierUnitShortForm?: string;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
  totalCost: number;
}

interface SalesItemSearchProps {
  onItemAdded: (item: SaleLineItem) => void;
  addedItems: SaleLineItem[];
  itemToEdit?: SaleLineItem;
  onItemEdited?: (item: SaleLineItem) => void;
}

export function SalesItemSearch({
  onItemAdded,
  addedItems,
  itemToEdit,
  onItemEdited,
}: SalesItemSearchProps) {
  const { currentShopId } = useAuth();
  const { items } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { priceTiers } = usePriceTiers(currentShopId);
  const { t, language } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState("");
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(
    null,
  );

  // Initialize from itemToEdit if provided
  useEffect(() => {
    if (itemToEdit) {
      const originalItem = items.find(i => i.id === itemToEdit.itemId);
      if (originalItem) {
        setSelectedItem(originalItem);
        // Try to guess original quantity and price tier
        setQuantity(itemToEdit.packCount ? itemToEdit.packCount.toString() : itemToEdit.quantity.toString());
        if (itemToEdit.priceTierId) {
          const tier = priceTiers.find(t => t.id === itemToEdit.priceTierId);
          setSelectedPriceTier(tier || null);
        } else {
          setSelectedPriceTier(null);
        }
      }
    } else {
      // Reset if no item to edit
      setSelectedItem(null);
      setQuantity("");
      setSelectedPriceTier(null);
    }
  }, [itemToEdit, items, priceTiers]);

  // Helper function to calculate actual quantity in item's base unit
  const calculateActualQuantity = (
    qty: number,
    priceTier: PriceTier | null,
  ): number => {
    if (!selectedItem || qty <= 0) return 0;

    if (priceTier) {
      const priceTierUnit = units.find((u) => u.id === priceTier.unitId);
      const itemUnit = units.find((u) => u.id === selectedItem.unitId);

      const tierQtyInItemUnit = convertUnit(
        priceTier.quantity,
        priceTierUnit?.shortForm || "",
        itemUnit?.shortForm || "",
      );

      return qty * tierQtyInItemUnit;
    }

    return qty;
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return items
      .filter((item) => {
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesNameMr = item.nameMarathi
          ? item.nameMarathi.toLowerCase().includes(term)
          : false;
        return matchesName || matchesNameMr;
      })
      .slice(0, 10);
  }, [searchTerm, items]);

  const itemPriceTiers = useMemo(() => {
    if (!selectedItem) return [];
    return priceTiers.filter((tier) => tier.itemId === selectedItem.id);
  }, [selectedItem, priceTiers]);

  const getRemainingStock = (item: Item) => {
    // Calculate total quantity in cart, but exclude the item we're currently editing
    let inCart = addedItems
      .filter((line) => line.itemId === item.id)
      .reduce((sum, line) => sum + line.quantity, 0);
    // If editing an item, subtract its original quantity from inCart since we are replacing it
    if (itemToEdit && itemToEdit.itemId === item.id) {
      inCart -= itemToEdit.quantity;
    }
    // Now calculate remaining stock: current stock minus (other items in cart)
    const remaining = item.quantity - inCart + (itemToEdit && itemToEdit.itemId === item.id ? itemToEdit.quantity : 0);
    return remaining;
  };

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm("");
    setQuantity("");
    setSelectedPriceTier(null);
  };

  const handleAddToCart = () => {
    const qty = parseNumberInput(quantity);
    if (!selectedItem || !quantity || qty <= 0) return;

    // Calculate actual quantity to be sold in item's base unit
    let totalQuantityToSell = qty;
    let availableQuantity = getRemainingStock(selectedItem);
    let quantityDisplay = `${formatNumber(qty)} ${units.find((u) => u.id === selectedItem.unitId)?.shortForm}`;

    if (selectedPriceTier) {
      const priceTierUnit = units.find(
        (u) => u.id === selectedPriceTier.unitId,
      );
      const itemUnit = units.find((u) => u.id === selectedItem.unitId);

      // Convert price tier quantity to item's base unit
      const tierQtyInItemUnit = convertUnit(
        selectedPriceTier.quantity,
        priceTierUnit?.shortForm || "",
        itemUnit?.shortForm || "",
      );

      // Total quantity to sell = number of price tiers * converted quantity per tier
      totalQuantityToSell = qty * tierQtyInItemUnit;
      quantityDisplay = `${formatNumber(qty)} x ${formatNumber(selectedPriceTier.quantity)} ${priceTierUnit?.shortForm}`;
    }

    // Check if quantity exceeds available stock (in same unit)
    if (totalQuantityToSell > availableQuantity) {
      const itemUnit = units.find(
        (u) => u.id === selectedItem.unitId,
      )?.shortForm;
      toast.error(
        `Not enough stock. Available: ${formatNumber(availableQuantity)} ${itemUnit}. Trying to sell: ${quantityDisplay}`,
      );
      return;
    }

    const itemUnit = units.find((u) => u.id === selectedItem.unitId);
    let pricePerUnit = selectedItem.sellPrice;
    const priceTierId = selectedPriceTier?.id;

    let costPerUnit = selectedItem.buyPrice;

    if (selectedPriceTier) {
      const priceTierUnit = units.find(
        (u) => u.id === selectedPriceTier.unitId,
      );

      // Convert price tier quantity to item's base unit
      const tierQtyInItemUnit = convertUnit(
        selectedPriceTier.quantity,
        priceTierUnit?.shortForm || "",
        itemUnit?.shortForm || "",
      );

      // Price per base unit = price for tier / tier quantity in base units
      // E.g., Rs. 50 for 200g (0.2 kg) = Rs. 250/kg
      pricePerUnit =
        tierQtyInItemUnit > 0
          ? selectedPriceTier.price / tierQtyInItemUnit
          : selectedItem.sellPrice;

      const calculatedCost = calculatePriceTierCost(
        selectedItem.buyPrice,
        selectedPriceTier.quantity,
        priceTierUnit?.shortForm || "",
        1,
        itemUnit?.shortForm || "",
      );

      // Cost per base unit = cost for tier / tier quantity in base units
      // E.g., Rs. 4.50 for 50g (0.05 kg) = Rs. 90/kg
      costPerUnit =
        tierQtyInItemUnit > 0
          ? typeof calculatedCost === "number" && !isNaN(calculatedCost)
            ? calculatedCost / tierQtyInItemUnit
            : selectedItem.buyPrice
          : selectedItem.buyPrice;
    }

    const priceTierUnit = selectedPriceTier
      ? units.find((u) => u.id === selectedPriceTier.unitId)
      : undefined;

    const newItem = {
      itemId: selectedItem.id || 0,
      itemName:
        language === "mr" && selectedItem.nameMarathi
          ? selectedItem.nameMarathi
          : selectedItem.name,
      quantity: totalQuantityToSell,
      displayQuantity: quantityDisplay,
      unitId: selectedItem.unitId,
      unitShortForm: itemUnit?.shortForm || "unit",
      priceTierId,
      packCount: selectedPriceTier ? qty : undefined,
      priceTierQuantity: selectedPriceTier?.quantity,
      priceTierUnitShortForm: priceTierUnit?.shortForm,
      pricePerUnit,
      totalPrice: totalQuantityToSell * pricePerUnit,
      costPerUnit: costPerUnit || selectedItem.buyPrice,
      totalCost: totalQuantityToSell * (costPerUnit || selectedItem.buyPrice),
    };

    if (itemToEdit && onItemEdited) {
      onItemEdited(newItem);
    } else {
      onItemAdded(newItem);
    }

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
          placeholder={t("search_items")}
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
              <div className="text-sm font-semibold">
                {language === "mr" && item.nameMarathi
                  ? item.nameMarathi
                  : item.name}
              </div>
              <div className="text-xs text-gray-600">
                {t("stock")}: {formatNumber(item.quantity)}
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
              <div className="text-sm font-bold">
                {language === "mr" && selectedItem.nameMarathi
                  ? selectedItem.nameMarathi
                  : selectedItem.name}
              </div>
              <div className="text-xs text-gray-600">
                {t("stock")}: {formatNumber(getRemainingStock(selectedItem))}
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
                {t("quantity")}
              </label>
              <HelpTooltip
                text={
                  language === "mr"
                    ? "तुम्ही आता दशांश (उदा. १.५) प्रविष्ट करू शकता."
                    : "You can enter fractional quantities (e.g. 1.5)."
                }
              />
              <span className="text-xs text-orange-600 font-semibold">
                (Max: {formatNumber(getRemainingStock(selectedItem))}{" "}
                {units.find((u) => u.id === selectedItem.unitId)?.shortForm})
              </span>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(event) =>
                setQuantity(cleanNumberInput(event.target.value))
              }
              placeholder={t("enter_quantity")}
              className={`h-9 text-sm ${
                quantity &&
                calculateActualQuantity(
                  parseNumberInput(quantity),
                  selectedPriceTier,
                ) > getRemainingStock(selectedItem)
                  ? "border-red-500 bg-red-50"
                  : ""
              }`}
            />
            {quantity &&
              calculateActualQuantity(
                parseNumberInput(quantity),
                selectedPriceTier,
              ) > getRemainingStock(selectedItem) && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  ❌ Only {formatNumber(getRemainingStock(selectedItem))}{" "}
                  {units.find((u) => u.id === selectedItem.unitId)?.shortForm}{" "}
                  available
                </p>
              )}
          </div>

          {itemPriceTiers.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t("price_tier")}
                </label>
                <HelpTooltip
                  text={
                    language === "mr"
                      ? "५० ग्रॅम, १०० ग्रॅम किंवा ५०० मिली सारखे पॅकेज निवडा."
                      : "Choose a package like 50g, 100g, or 500ml."
                  }
                />
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
                  {t("default_label")} Rs. {formatMoney(selectedItem.sellPrice)}
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
                      {formatNumber(tier.quantity)}
                      {tierUnit?.shortForm} @ Rs. {formatMoney(tier.price)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {quantity && parseNumberInput(quantity) > 0 && (
            <div className="mb-3 rounded border border-blue-100 bg-white p-2">
              <div className="text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>{t("total_price")}:</span>
                  <span className="font-bold text-green-700">
                    Rs.{" "}
                    {formatMoney(
                      parseNumberInput(quantity) *
                        (selectedPriceTier?.price || selectedItem.sellPrice),
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={
              !quantity ||
              parseNumberInput(quantity) <= 0 ||
              calculateActualQuantity(
                parseNumberInput(quantity),
                selectedPriceTier,
              ) > getRemainingStock(selectedItem)
            }
            className="h-10 w-full bg-green-600 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t("add_to_sale")}
          </Button>
        </Card>
      )}
    </div>
  );
}
