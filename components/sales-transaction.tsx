"use client";

import { useState } from "react";
import { useSales, useUdhari, useItems, useUnits } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { dateKey } from "@/lib/utils";
import { formatSaleLineSubtitle } from "@/lib/sale-item-display";
import { SalesItemSearch } from "./sales-item-search";
import { SaleQuantityControl } from "./sale-quantity-control";
import { editableSaleQuantity, isSaleQuantityApplied, maxBillLineQuantity, resizeSaleLine } from "@/lib/sale-quantity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cleanWholeNumberInput,
  formatMoney,
  formatNumber,
  formatPercent,
  formatWholeNumber,
} from "@/lib/number-format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ShoppingBag, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type PaymentMethod = "cash" | "card" | "partial" | "udhar";

interface LineItem {
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

export function SalesTransaction() {
  const { currentShopId } = useAuth();
  const { createSale, updateStockAfterSale, deleteSale } =
    useSales(currentShopId);
  const { customers, addCustomer, addCredit } = useUdhari(currentShopId);
  const { items: allItems } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { t, language } = useLanguage();

  const [items, setItems] = useState<LineItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [creditCustomerId, setCreditCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const totals = {
    subtotal: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    totalCost: items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    totalProfit: items.reduce(
      (sum, item) => sum + ((item.totalPrice || 0) - (item.totalCost || 0)),
      0,
    ),
  };

  const isUdharSale = paymentMethod === "udhar";
  const selectedCreditCustomer =
    customers.find((customer) => customer.id === creditCustomerId) || null;
  const profitMarginPercent =
    totals.subtotal > 0 ? (totals.totalProfit / totals.subtotal) * 100 : 0;

  const billLineMax = (index: number, lines = items) => maxBillLineQuantity(
    allItems.find((product) => product.id === lines[index]?.itemId)?.quantity ?? 0, lines, index,
  );
  const hasInvalidQuantity = items.some((item, index) => {
    const value = Number(quantityDrafts[index] ?? editableSaleQuantity(item));
    return !isSaleQuantityApplied(item, value, billLineMax(index));
  });

  const handleQuantityChange = (index: number, value: string) => {
    if (isProcessing || showConfirmDialog) return;
    setQuantityDrafts((current) => ({ ...current, [index]: value }));
    setItems((current) => {
      if (!current[index]) return current;
      const updated = resizeSaleLine(current[index], Number(value), billLineMax(index, current));
      return updated ? current.map((line, lineIndex) => lineIndex === index ? updated : line) : current;
    });
  };

  const handleItemAdded = (item: LineItem) => {
    setItems((current) => [...current, item]);
    toast.success(`${item.itemName} ${t("success")}`, { id: "sale-item-added" });
  };

  const handleRemoveItem = (index: number) => {
    if (isProcessing || showConfirmDialog) return;
    setItems((current) => current.filter((_, i) => i !== index));
    setQuantityDrafts((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => Number(key) !== index)
        .map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]),
    ));
  };

  const resetCreditFields = () => {
    setCreditCustomerId(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
  };

  const resetSale = () => {
    setItems([]);
    setQuantityDrafts({});
    setPaymentMethod("cash");
    resetCreditFields();
    setShowConfirmDialog(false);
  };

  const handlePaymentChange = (value: string) => {
    const nextPaymentMethod = value as PaymentMethod;
    setPaymentMethod(nextPaymentMethod);

    if (nextPaymentMethod !== "udhar") {
      resetCreditFields();
    }
  };

  const handleCompleteSale = async () => {
    if (isProcessing || hasInvalidQuantity) return;
    if (items.length === 0) {
      toast.error(t("error"));
      return;
    }

    if (isUdharSale && !selectedCreditCustomer && !newCustomerName.trim()) {
      toast.error(t("error"));
      return;
    }

    // Verify stock availability (sum quantities per item in cart)
    const quantityByItemId = items.reduce<Map<number, number>>(
      (acc, lineItem) => {
        acc.set(
          lineItem.itemId,
          Number(((acc.get(lineItem.itemId) || 0) + lineItem.quantity).toFixed(9)),
        );
        return acc;
      },
      new Map(),
    );

    const stockErrors: string[] = [];
    for (const [itemId, requestedQty] of quantityByItemId) {
      const currentItem = allItems.find((item) => item.id === itemId);
      const lineItem = items.find((item) => item.itemId === itemId);
      if (!currentItem || currentItem.quantity < requestedQty) {
        const availableQty = currentItem?.quantity || 0;
        stockErrors.push(
          `${lineItem?.itemName || "Item"}: Only ${formatNumber(availableQty)} ${lineItem?.unitShortForm || ""} available (tried to sell ${lineItem?.displayQuantity || formatNumber(requestedQty)})`,
        );
      }
    }

    if (stockErrors.length > 0) {
      toast.error(`Stock issue: ${stockErrors[0]}`);
      return;
    }

    setIsProcessing(true);

    let createdSaleId: number | null = null;
    try {
      const saleItems: any[] = items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        displayQuantity: item.displayQuantity,
        unitId: item.unitId,
        unitShortForm: item.unitShortForm,
        priceTierId: item.priceTierId,
        packCount: item.packCount,
        priceTierQuantity: item.priceTierQuantity,
        priceTierUnitShortForm: item.priceTierUnitShortForm,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
        costPerUnit: item.costPerUnit,
        totalCost: item.totalCost,
        profit: item.totalPrice - item.totalCost,
      }));

      let finalCreditCustomerId = creditCustomerId;
      let finalCreditCustomerName = selectedCreditCustomer?.name || "";

      if (isUdharSale && !finalCreditCustomerId) {
        const createdCustomerId = await addCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
        });

        finalCreditCustomerId = Number(createdCustomerId);
        finalCreditCustomerName = newCustomerName.trim();
      }

      const today = dateKey(new Date());
      createdSaleId = await createSale({
        date: today,
        timestamp: Date.now(),
        items: saleItems,
        totalQuantityItems: items.length,
        subtotal: totals.subtotal,
        totalCost: totals.totalCost,
        totalProfit: totals.totalProfit,
        profitMarginPercent,
        paymentMethod,
        creditCustomerId: isUdharSale
          ? finalCreditCustomerId || undefined
          : undefined,
        creditCustomerName: isUdharSale ? finalCreditCustomerName : undefined,
      });

      if (createdSaleId === null || createdSaleId === undefined) {
        throw new Error("Sale could not be saved");
      }

      await updateStockAfterSale(saleItems);

      toast.success(
        language === "mr"
          ? `छान! ₹${formatMoney(totals.subtotal)} विक्री जोडली`
          : `Nice! ₹${formatMoney(totals.subtotal)} sale added`,
        {
          description:
            totals.totalProfit > 0
              ? language === "mr"
                ? `आजचा नफा +₹${formatMoney(totals.totalProfit)}`
                : `Profit +₹${formatMoney(totals.totalProfit)}`
              : undefined,
        },
      );
      resetSale();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error, null, 2);
      console.group(
        "%cSale completion error",
        "color: #dc2626; font-weight: bold",
      );
      console.error("Error value:");
      console.dir(error, { depth: null });
      console.error("Error message:", errorMessage);
      if (error instanceof Error && error.cause) {
        console.error("Error cause:");
        console.dir(error.cause, { depth: null });
      }
      console.trace("Error thrown at:");
      console.groupEnd();
      const persistedSaleId = Number(createdSaleId ?? 0);
      if (persistedSaleId > 0) {
        try {
          await deleteSale(persistedSaleId);
          toast.error(
            language === "mr"
              ? "विक्री पूर्ण होऊ शकली नाही, त्यामुळे अर्धवट नोंद काढून टाकण्यात आली."
              : "The sale could not be completed cleanly, so the partial entry was rolled back.",
            {
              description: errorMessage.slice(0, 160),
            },
          );
        } catch (rollbackError) {
          const rollbackMsg =
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError);
          console.group(
            "%cSale rollback ALSO failed",
            "color: #b91c1c; font-weight: bold",
          );
          console.error("Rollback error:", rollbackError);
          console.groupEnd();
          toast.error(
            language === "mr"
              ? "विक्री पूर्ण होऊ शकली नाही आणि रोलबॅकही अपयशी ठरला."
              : "The sale could not be completed and rollback may be incomplete.",
            {
              description: `${errorMessage.slice(0, 100)} · Rollback: ${rollbackMsg.slice(0, 60)}`,
            },
          );
        }
      } else {
        toast.error(
          language === "mr"
            ? "विक्री जोडता आली नाही"
            : "Could not complete sale",
          {
            description: errorMessage.slice(0, 220),
          },
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-6">
      <div>
        <Card className="border-indigo-100 shadow-sm lg:sticky lg:top-24">
          <CardHeader className="border-b border-indigo-50 pb-3">
            <CardTitle className="text-base">{language === "mr" ? "वस्तू जोडा" : "Add products"}</CardTitle>
            <p className="text-sm text-muted-foreground">{language === "mr" ? "वस्तू शोधा किंवा ऑर्डर बोलून सांगा." : "Search a product or speak your order."}</p>
          </CardHeader>
          <CardContent>
            <SalesItemSearch onItemAdded={handleItemAdded} addedItems={items} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/70 py-4">
            <CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4 text-indigo-600" />{language === "mr" ? "चालू बिल" : "Current bill"}</CardTitle>
            <span aria-live="polite" className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{formatNumber(items.length)} {language === "mr" ? "वस्तू" : items.length === 1 ? "item" : "items"}</span>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-medium text-slate-700">{language === "mr" ? "बिलात अद्याप वस्तू नाहीत" : "Your bill is empty"}</p>
                <p className="mt-1 text-sm">{language === "mr" ? "सुरुवात करण्यासाठी वस्तू शोधा किंवा बोलून सांगा." : "Search or speak to add your first product."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  return (
                    <div
                      key={`${item.itemId}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold text-slate-900">{item.itemName}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{formatSaleLineSubtitle(item)}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1"><span className="text-base font-semibold tabular-nums text-slate-900">₹{formatMoney(item.totalPrice)}</span><button
                        onClick={() => handleRemoveItem(index)}
                        disabled={isProcessing || showConfirmDialog}
                        className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        aria-label={`${language === "mr" ? "काढा" : "Remove"} ${item.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        {language === "mr" ? "काढा" : "Remove"}
                      </button></div>
                      </div>
                      <div className="mt-2">
                        <SaleQuantityControl
                          value={quantityDrafts[index] ?? String(editableSaleQuantity(item))}
                          onChange={(value) => handleQuantityChange(index, value)}
                          max={billLineMax(index)}
                          unit={item.priceTierId != null && item.packCount != null ? (language === "mr" ? "पॅकेट" : "packs") : item.unitShortForm}
                          label={t("quantity")}
                          productName={item.itemName}
                          pending={quantityDrafts[index] !== undefined && Number(quantityDrafts[index]) !== editableSaleQuantity(item)}
                          language={language}
                          disabled={isProcessing || showConfirmDialog}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card className="overflow-hidden border-emerald-200 shadow-sm">
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                  <span className="font-medium text-slate-700">{language === "mr" ? "बिलाची एकूण रक्कम" : "Bill total"}</span>
                  <span aria-live="polite" className="text-2xl font-bold tabular-nums text-slate-900">₹{formatMoney(totals.subtotal)}</span>
                </div>
                <div>
                  <label htmlFor="sale-payment-method" className="mb-2 block text-sm font-medium text-gray-700">
                    {t("payment_method")}
                  </label>
                  <Select
                    value={paymentMethod}
                    onValueChange={handlePaymentChange}
                  >
                    <SelectTrigger id="sale-payment-method" className="h-12 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t("cash")}</SelectItem>
                      <SelectItem value="card">{t("card")}</SelectItem>
                      <SelectItem value="partial">{t("partial")}</SelectItem>
                      <SelectItem value="udhar">{t("udhar")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isUdharSale && (
                  <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-orange-900">
                        {t("udhari_customer")}
                      </label>
                      <Select
                        value={
                          creditCustomerId ? creditCustomerId.toString() : "new"
                        }
                        onValueChange={(value) =>
                          setCreditCustomerId(
                            value === "new" ? null : Number(value),
                          )
                        }
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">
                            {t("new_customer")}
                          </SelectItem>
                          {customers.map((customer) => (
                            <SelectItem
                              key={customer.id}
                              value={customer.id!.toString()}
                            >
                              {customer.name} - Rs.{" "}
                              {formatMoney(customer.balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!creditCustomerId && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-orange-900">
                            {t("customer_name")}
                          </label>
                          <Input
                            value={newCustomerName}
                            onChange={(event) =>
                              setNewCustomerName(event.target.value)
                            }
                            placeholder={t("name")}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-orange-900">
                            {t("mobile")}
                          </label>
                          <Input
                            value={newCustomerPhone}
                            onChange={(event) =>
                              setNewCustomerPhone(
                                cleanWholeNumberInput(event.target.value),
                              )
                            }
                            placeholder={t("optional")}
                            inputMode="tel"
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-orange-900">
                      <UserPlus className="h-4 w-4" />
                      <span>{t("udhari_bill_notice")}</span>
                    </div>
                  </div>
                )}

                {hasInvalidQuantity && <p role="alert" className="text-sm text-red-700">
                  {language === "mr" ? "विक्री पूर्ण करण्यापूर्वी प्रमाण दुरुस्त करून लागू करा किंवा वस्तू काढा." : "Correct and apply the quantities, or remove those items, before completing the sale."}
                </p>}
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isProcessing || hasInvalidQuantity}
                  className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isProcessing ? t("processing") : t("complete_sale")}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_sale_title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("items")}:</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("total_revenue")}:</span>
                  <span className="font-bold">
                    Rs. {formatMoney(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("payment")}:</span>
                  <span className="font-bold capitalize">
                    {t(paymentMethod)}
                  </span>
                </div>
                {isUdharSale && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{t("customer")}:</span>
                    <span className="text-right font-bold">
                      {selectedCreditCustomer?.name ||
                        newCustomerName ||
                        t("new_customer")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>{t("profit_amount")}:</span>
                  <span className="font-bold text-green-600">
                    Rs. {formatMoney(totals.totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("margin")}:</span>
                  <span className="font-bold">
                    {formatPercent(profitMarginPercent)}%
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isProcessing || hasInvalidQuantity} onClick={handleCompleteSale}>
              {t("complete_sale")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
