"use client";

import { useState } from "react";
import { useSales, useUdhari, useItems } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { dateKey } from "@/lib/utils";
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
import { Check, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type PaymentMethod = "cash" | "card" | "partial" | "udhar";

interface LineItem {
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

export function SalesTransaction() {
  const { currentShopId } = useAuth();
  const { createSale, updateStockAfterSale } = useSales(currentShopId);
  const { customers, addCustomer, addCredit } = useUdhari(currentShopId);
  const { items: allItems } = useItems(currentShopId);
  const { t } = useLanguage();

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
    setItems([...items, item]);
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
    const quantityByItemId = items.reduce<Map<number, number>>((acc, lineItem) => {
      acc.set(
        lineItem.itemId,
        (acc.get(lineItem.itemId) || 0) + lineItem.quantity,
      );
      return acc;
    }, new Map());

    const stockErrors: string[] = [];
    for (const [itemId, requestedQty] of quantityByItemId) {
      const currentItem = allItems.find((item) => item.id === itemId);
      const lineItem = items.find((item) => item.itemId === itemId);
      if (!currentItem || currentItem.quantity < requestedQty) {
        const availableQty = currentItem?.quantity || 0;
        stockErrors.push(
          `${lineItem?.itemName || "Item"}: Only ${formatWholeNumber(availableQty)} ${lineItem?.unitShortForm || ""} available (tried to sell ${formatWholeNumber(requestedQty)})`,
        );
      }
    }

    if (stockErrors.length > 0) {
      toast.error(`Stock issue: ${stockErrors[0]}`);
      return;
    }

    setIsProcessing(true);

    try {
      const saleItems: any[] = items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitId: item.unitId,
        unitShortForm: item.unitShortForm,
        priceTierId: item.priceTierId,
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
      const saleId = await createSale({
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

      await updateStockAfterSale(saleItems);

      if (isUdharSale && finalCreditCustomerId) {
        await addCredit(
          finalCreditCustomerId,
          totals.subtotal,
          `Sale bill - ${items.length} item${items.length === 1 ? "" : "s"}`,
          items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitShortForm: item.unitShortForm,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
          })),
          Number(saleId),
        );
      }

      toast.success(t("success"));
      resetSale();
      window.dispatchEvent(new Event('refresh-dukan-data'));
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error(t("error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("add_items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesItemSearch onItemAdded={handleItemAdded} addedItems={items} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("sale_items")} ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>{t("no_items_added")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const profit = item.totalPrice - item.totalCost;
                  const marginPct =
                    item.totalPrice > 0 ? (profit / item.totalPrice) * 100 : 0;

                  return (
                    <div
                      key={`${item.itemId}-${index}`}
                      className="flex items-start justify-between rounded border bg-gray-50 p-3 transition hover:bg-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {item.itemName} x {item.quantity}
                          {item.unitShortForm}
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-gray-600">
                          <div>
                            {t("selling")}: {formatMoney(item.quantity)} x Rs.{" "}
                            {formatMoney(item.pricePerUnit)} ={" "}
                            <span className="font-semibold text-blue-600">
                              Rs. {formatMoney(item.totalPrice)}
                            </span>
                          </div>
                          <div>
                            {t("cost")}: {formatMoney(item.quantity)} x Rs.{" "}
                            {formatMoney(item.costPerUnit)} ={" "}
                            <span className="font-semibold text-red-600">
                              Rs. {formatMoney(item.totalCost)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs font-semibold">
                          <span
                            className={
                              profit > 0 ? "text-green-700" : "text-red-700"
                            }
                          >
                            {t("profit_amount")}: Rs. {formatMoney(profit)} (
                            {formatPercent(marginPct)}%)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="ml-2 flex-shrink-0 text-red-600 hover:text-red-800"
                        aria-label={`Remove ${item.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t("total_revenue")}:</span>
                    <span className="font-bold">
                      Rs. {formatMoney(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("total_cost")}:</span>
                    <span className="font-bold">
                      Rs. {formatMoney(totals.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span>{t("total_profit")}:</span>
                    <span
                      className={`font-bold ${totals.totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}
                    >
                      Rs. {formatMoney(totals.totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{t("margin")} %:</span>
                    <span className="font-semibold">
                      {formatPercent(profitMarginPercent)}%
                    </span>
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
