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
import { VoiceSaleAssistant } from "./voice-sale-assistant";
import { normalizeVoiceText } from "@/lib/voice-sale-parser";

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
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(
    null,
  );

  useEffect(() => {
    if (!searchTerm.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => setIsSearching(false), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Initialize from itemToEdit if provided
  useEffect(() => {
    if (itemToEdit) {
      const originalItem = items.find((i) => i.id === itemToEdit.itemId);
      if (originalItem) {
        setSelectedItem(originalItem);
        // Try to guess original quantity and price tier
        setQuantity(
          itemToEdit.packCount
            ? itemToEdit.packCount.toString()
            : itemToEdit.quantity.toString(),
        );
        if (itemToEdit.priceTierId) {
          const tier = priceTiers.find((t) => t.id === itemToEdit.priceTierId);
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
    const ignoredWords = new Set([
      "add",
      "please",
      "and",
      "ani",
      "aani",
      "then",
      "plus",
      "wale",
      "वाले",
      "रुपये",
      "रुपयाचे",
    ]);
    const tokens = normalizeVoiceText(searchTerm)
      .split(" ")
      .filter(
        (token) =>
          token.length > 1 &&
          !ignoredWords.has(token) &&
          !/^\d+(?:\.\d+)?$/.test(token),
      );

    return items
      .map((item) => {
        const searchable = normalizeVoiceText(
          [item.name, item.nameMarathi, item.brand, item.brandMarathi]
            .filter(Boolean)
            .join(" "),
        );
        const score = tokens.reduce(
          (total, token) => total + (searchable.includes(token) ? 1 : 0),
          0,
        );
        const exactPhrase = searchable.includes(normalizeVoiceText(searchTerm));
        return { item, score: score + (exactPhrase ? 2 : 0) };
      })
      .filter(({ score }) => score > 0)
      .sort((first, second) => second.score - first.score)
      .filter(
        ({ item }, index, results) =>
          results.findIndex((entry) => entry.item.id === item.id) === index,
      )
      .slice(0, 10)
      .map(({ item }) => item);
  }, [searchTerm, items]);

  const filteredWithTierSummary = useMemo(() => {
    return filteredItems.map((item) => {
      const tiers = priceTiers.filter((t) => t.itemId === item.id);
      const tierSummaries: Array<{ price: number; label: string }> = [];
      for (const tier of tiers.slice(0, 3)) {
        const unit = units.find((u) => u.id === tier.unitId);
        tierSummaries.push({
          price: tier.price,
          label: `${formatWholeNumber(tier.quantity)}${unit?.shortForm ? " " + unit.shortForm : ""}`,
        });
      }
      const matchText = normalizeVoiceText(searchTerm);
      const exactMatch =
        normalizeVoiceText(
          [item.name, item.nameMarathi, item.brand, item.brandMarathi]
            .filter(Boolean)
            .join(" "),
        ).includes(matchText) && matchText.length > 1;
      return {
        item,
        tierSummaries,
        tierCount: tiers.length,
        exactMatch,
      };
    });
  }, [filteredItems, priceTiers, searchTerm, units]);

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
    const remaining =
      item.quantity -
      inCart +
      (itemToEdit && itemToEdit.itemId === item.id ? itemToEdit.quantity : 0);
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
      itemName: (() => {
        const baseName =
          language === "mr" && selectedItem.nameMarathi
            ? selectedItem.nameMarathi
            : selectedItem.name;
        const brandName =
          language === "mr" && selectedItem.brandMarathi
            ? selectedItem.brandMarathi
            : selectedItem.brand;
        return brandName ? `${baseName} (${brandName})` : baseName;
      })(),
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
          className="h-10 pl-10 pr-20"
          autoFocus
        />
        {searchTerm.trim() && isSearching && (
          <div className="absolute right-3 top-2.5 flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
            Searching
          </div>
        )}
      </div>

      <VoiceSaleAssistant items={items} units={units} onAdd={onItemAdded} />

      {searchTerm && !selectedItem && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {isSearching ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2 h-3 w-28 rounded bg-slate-200" />
                  <div className="mb-2 h-3 w-40 rounded bg-slate-200" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-4 w-16 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            filteredWithTierSummary.map(
              ({ item, tierSummaries, tierCount, exactMatch }) => {
                const unitShort =
                  units.find((u) => u.id === item.unitId)?.shortForm || "unit";
                const remaining = getRemainingStock(item);
                const profitPer = Math.max(
                  0,
                  Number(item.sellPrice || 0) - Number(item.buyPrice || 0),
                );
                const marginPct =
                  Number(item.sellPrice || 0) > 0
                    ? (profitPer / Number(item.sellPrice || 0)) * 100
                    : 0;
                const lowStock = remaining <= Number(item.lowStockLimit || 0);
                const outOfStock = remaining <= 0;
                const baseName =
                  language === "mr" && item.nameMarathi
                    ? item.nameMarathi
                    : item.name;
                const brandName =
                  language === "mr" && item.brandMarathi
                    ? item.brandMarathi
                    : item.brand;
                const displayName = brandName
                  ? `${baseName} (${brandName})`
                  : baseName;

                return (
                  <div
                    key={item.id}
                    className={`border-b border-slate-200 bg-white p-3 last:border-b-0 transition ${
                      outOfStock
                        ? "bg-gray-50/70 opacity-60"
                        : "hover:bg-violet-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">
                            {displayName}
                          </span>
                          {brandName && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {brandName}
                            </span>
                          )}
                          {exactMatch && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              exact match
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                            {t("stock")}: {formatWholeNumber(remaining)}{" "}
                            {unitShort}
                          </span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
                            ₹{formatMoney(item.sellPrice)}/{unitShort}
                          </span>
                          {item.category && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                              {item.category}
                            </span>
                          )}
                        </div>

                        {tierSummaries.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-violet-700">
                            <span className="font-semibold">Packs:</span>
                            {tierSummaries.slice(0, 2).map((t, idx) => (
                              <span
                                key={`${item.id}-${t.label}-${idx}`}
                                className="rounded bg-violet-50 px-1.5 py-0.5"
                              >
                                ₹{formatMoney(t.price)}/{t.label}
                              </span>
                            ))}
                            {tierCount > 2 && (
                              <span className="rounded bg-violet-50 px-1.5 py-0.5">
                                +{tierCount - 2}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="text-[11px] text-slate-500">
                            {lowStock && !outOfStock
                              ? "Low stock"
                              : outOfStock
                                ? "Out of stock"
                                : "In stock"}
                          </div>
                          {marginPct >= 0 && (
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                marginPct >= 20
                                  ? "bg-emerald-100 text-emerald-800"
                                  : marginPct >= 10
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {marginPct.toFixed(0)}% margin
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-base font-extrabold leading-tight text-blue-700">
                          ₹{formatMoney(item.sellPrice)}
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                          Buy: ₹{formatMoney(item.buyPrice)}
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-green-700">
                          Profit: ₹{formatMoney(profitPer)}
                        </div>
                        <button
                          type="button"
                          onClick={() => !outOfStock && handleItemSelect(item)}
                          disabled={outOfStock}
                          className={`mt-2 inline-flex items-center rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition ${
                            outOfStock
                              ? "cursor-not-allowed bg-slate-200 text-slate-400"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {outOfStock ? "Unavailable" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )
          ) : (
            <div className="p-4 text-sm text-slate-500">
              No matching products found for “{searchTerm}”. Try a different
              item name or brand.
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <Card className="border-blue-200 bg-blue-50 p-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-bold truncate">
                  {(() => {
                    const baseName =
                      language === "mr" && selectedItem.nameMarathi
                        ? selectedItem.nameMarathi
                        : selectedItem.name;
                    const brandName =
                      language === "mr" && selectedItem.brandMarathi
                        ? selectedItem.brandMarathi
                        : selectedItem.brand;
                    return brandName ? `${baseName} (${brandName})` : baseName;
                  })()}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <span>
                  {t("stock")}:{" "}
                  {formatWholeNumber(getRemainingStock(selectedItem))}{" "}
                  {units.find((u) => u.id === selectedItem.unitId)?.shortForm}
                </span>
                <span className="font-semibold text-blue-700">
                  {t("selling")}: ₹{formatMoney(selectedItem.sellPrice)}/
                  {units.find((u) => u.id === selectedItem.unitId)?.shortForm}
                </span>
                <span>
                  {t("buy")}: ₹{formatMoney(selectedItem.buyPrice)}
                </span>
                {(() => {
                  const ppu =
                    Number(selectedItem.sellPrice || 0) -
                    Number(selectedItem.buyPrice || 0);
                  const mp =
                    Number(selectedItem.sellPrice || 0) > 0
                      ? (ppu / Number(selectedItem.sellPrice || 0)) * 100
                      : 0;
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        mp >= 20
                          ? "bg-emerald-100 text-emerald-800"
                          : mp >= 10
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      +₹{formatMoney(Math.max(0, ppu))} · {mp.toFixed(0)}%
                    </span>
                  );
                })()}
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
