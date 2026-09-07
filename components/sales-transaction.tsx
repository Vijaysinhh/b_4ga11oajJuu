"use client";

import { useState } from "react";
import { useSales, useUdhari, useItems, useUnits } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { dateKey } from "@/lib/utils";
import { formatSaleLineSubtitle } from "@/lib/sale-item-display";
import { SalesItemSearch } from "./sales-item-search";
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

  const handleItemAdded = (item: LineItem) => {
    setItems((current) => [...current, item]);
    toast.success(`${item.itemName} ${t("success")}`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const resetCreditFields = () => {
    setCreditCustomerId(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
  };

  const resetSale = () => {
    setItems([]);
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
          (acc.get(lineItem.itemId) || 0) + lineItem.quantity,
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card className="border-indigo-100 shadow-sm lg:sticky lg:top-24">
          <CardHeader className="border-b border-indigo-50 pb-3">
            <CardTitle className="text-base">Add products</CardTitle>
            <p className="text-xs text-muted-foreground">Search is quickest. Use voice only when it helps.</p>
          </CardHeader>
          <CardContent>
            <SalesItemSearch onItemAdded={handleItemAdded} addedItems={items} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/70 py-4">
            <CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4 text-indigo-600" />Current bill</CardTitle>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{items.length} {items.length === 1 ? "item" : "items"}</span>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-medium text-slate-700">Your bill is empty</p>
                <p className="mt-1 text-sm">Search a product to start this sale.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  return (
                    <div
                      key={`${item.itemId}-${index}`}
                      className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{item.itemName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatSaleLineSubtitle(item)} · ₹{formatMoney(item.pricePerUnit)} each</div>
                      </div>
                      <div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-900">₹{formatMoney(item.totalPrice)}</span><button
                        onClick={() => handleRemoveItem(index)}
                        className="ml-2 flex-shrink-0 text-red-600 hover:text-red-800"
                        aria-label={`Remove ${item.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button></div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-emerald-900">Bill total</span>
                    <span className="text-xl font-bold text-emerald-800">₹{formatMoney(totals.subtotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    {t("payment_method")}
                  </label>
                  <Select
                    value={paymentMethod}
                    onValueChange={handlePaymentChange}
                  >
                    <SelectTrigger className="h-9">
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

                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isProcessing}
                  className="h-10 w-full bg-green-600 text-white hover:bg-green-700"
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
            <AlertDialogAction onClick={handleCompleteSale}>
              {t("complete_sale")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
