"use client";

import { SalesTransaction } from "./components";
import { HelpTooltip } from "@/components/help-tooltip";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSales, useItems, useUnits, usePriceTiers, useUdhari } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  X,
  Search,
} from "lucide-react";
import { dateKey } from "@/lib/utils";
import { formatMoney, formatPercent, formatWholeNumber, cleanWholeNumberInput } from "@/lib/number-format";
import {
  formatSaleLineSubtitle,
  inferSaleLineDisplayFields,
} from "@/lib/sale-item-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SalesItemSearch } from "@/components/sales-item-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Let's make a modified version of SalesTransaction that can edit an existing sale
function EditSaleDialog({ 
  sale, 
  open, 
  onClose 
}: { 
  sale: any; 
  open: boolean; 
  onClose: () => void; 
}) {
  const { currentShopId } = useAuth();
  const { updateSale, updateStockAfterSale } = useSales(currentShopId);
  const { customers, addCustomer, addCredit } = useUdhari(currentShopId);
  const { items: allItems } = useItems(currentShopId);
  const { t } = useLanguage();
  
  // Initialize state from the existing sale
  const [items, setItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [creditCustomerId, setCreditCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (sale) {
      setItems(sale.items || []);
      setPaymentMethod(sale.paymentMethod);
      setCreditCustomerId(sale.creditCustomerId || null);
    }
  }, [sale]);

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

  const handleItemAdded = (item: any) => {
    setItems([...items, item]);
    toast.success(`${item.itemName} ${t("success")}`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
  };

  const handleItemEdited = (newItem: any) => {
    if (editingItemIndex === null) return;
    const updatedItems = [...items];
    updatedItems[editingItemIndex] = newItem;
    setItems(updatedItems);
    setEditingItemIndex(null);
  };

  const handlePaymentChange = (value: string) => {
    const nextPaymentMethod = value;
    setPaymentMethod(nextPaymentMethod);
    if (nextPaymentMethod !== "udhar") {
      setCreditCustomerId(null);
      setNewCustomerName("");
      setNewCustomerPhone("");
    }
  };

  const handleUpdateSale = async () => {
    if (items.length === 0) {
      toast.error(t("error"));
      return;
    }

    if (isUdharSale && !selectedCreditCustomer && !newCustomerName.trim()) {
      toast.error(t("error"));
      return;
    }

    setIsProcessing(true);
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

      await updateSale(sale.id, {
        date: sale.date,
        timestamp: sale.timestamp,
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

      toast.success("Sale updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error(t("error"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sale</DialogTitle>
        </DialogHeader>
        {/* Reuse the sales transaction UI for editing */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("add_items")}</CardTitle>
              </CardHeader>
              <CardContent>
                {editingItemIndex !== null && (
                  <Button
                    variant="outline"
                    className="mb-2 w-full"
                    onClick={() => setEditingItemIndex(null)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Edit Item
                  </Button>
                )}
                <SalesItemSearch 
                  onItemAdded={handleItemAdded} 
                  addedItems={items} 
                  itemToEdit={editingItemIndex !== null ? items[editingItemIndex] : undefined} 
                  onItemEdited={handleItemEdited} 
                />
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
                              {item.itemName} - {item.displayQuantity}
                            </div>
                            <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                              <div>
                                {t("selling")}: {formatSaleLineSubtitle(item)} ={" "}
                                <span className="font-semibold text-blue-600">
                                  Rs. {formatMoney(item.totalPrice)}
                                </span>
                              </div>
                              <div>
                                {t("cost")}: Rs. {formatMoney(item.totalCost)}
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
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditItem(index)}
                              className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                              aria-label={`Edit ${item.itemName}`}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="flex-shrink-0 text-red-600 hover:text-red-800"
                              aria-label={`Remove ${item.itemName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={onClose} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateSale}
                        disabled={isProcessing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isProcessing ? "Updating..." : "Update Sale"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const paymentBadgeStyles: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  card: "bg-blue-100 text-blue-800",
  partial: "bg-purple-100 text-purple-800",
  udhar: "bg-orange-100 text-orange-800",
};

function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLabel(date: Date, lang: "en" | "mr") {
  const today = new Date();
  const todayKey = dateKey(today);
  const key = dateKey(date);

  if (key === todayKey) return lang === "mr" ? "आज" : "Today";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dateKey(yesterday)) return lang === "mr" ? "काल" : "Yesterday";

  return date.toLocaleDateString(lang === "mr" ? "mr-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SalesPage() {
  const { t } = useLanguage();
  const { user, currentShopId } = useAuth();
  const isWorker = user?.role === "worker";
  const { sales, deleteSale } = useSales(currentShopId);
  const { items } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { priceTiers } = usePriceTiers(currentShopId);
  const { customers } = useUdhari(currentShopId);

  // --- Date navigation state ---
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<number | null>(null);

  // --- Search & Filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  const isToday = dateKey(selectedDate) === dateKey(new Date());
  const selectedDayKey = dateKey(selectedDate);

  // --- Build an item lookup map for stock info ---
  const itemMap = useMemo(() => {
    const map = new Map<
      number,
      { name: string; nameMarathi: string; quantity: number }
    >();
    for (const item of items) {
      if (item.id !== undefined) {
        map.set(item.id, {
          name: item.name,
          nameMarathi: item.nameMarathi,
          quantity: item.quantity,
        });
      }
    }
    return map;
  }, [items]);

  // --- Data for the SELECTED filters ---
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // --- Date range filter ---
    const today = new Date();
    today.setHours(0,0,0,0);
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    if (dateRangePreset === 'today') {
      minDate = new Date(today);
      maxDate = new Date(today);
    } else if (dateRangePreset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      minDate = new Date(yesterday);
      maxDate = new Date(yesterday);
    } else if (dateRangePreset === 'last7') {
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 6);
      minDate = last7;
      maxDate = new Date(today);
    } else if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      minDate = new Date(customStartDate);
      maxDate = new Date(customEndDate);
    }

    if (minDate && maxDate) {
      const minKey = dateKey(minDate);
      const maxKey = dateKey(maxDate);
      filtered = filtered.filter(sale => sale.date >= minKey && sale.date <= maxKey);
    } else if (dateRangePreset === 'today') {
      filtered = filtered.filter(sale => sale.date === selectedDayKey);
    }

    // --- Payment method filter ---
    if (paymentMethodFilter) {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }

    // --- Search filter ---
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => {
        // Check customer name
        if (sale.creditCustomerName && sale.creditCustomerName.toLowerCase().includes(q)) return true;
        // Check item names
        const itemsMatch = sale.items?.some((item: any) => item.itemName.toLowerCase().includes(q)) || false;
        if (itemsMatch) return true;
        // Check amount
        const amountStr = sale.subtotal.toString();
        if (amountStr.includes(q)) return true;
        return false;
      });
    }

    // --- Customer filter ---
    if (customerFilter) {
      if (customerFilter === 'all') {
        // no filter
      } else if (customerFilter === 'udhari-only') {
        filtered = filtered.filter(sale => sale.paymentMethod === 'udhar');
      } else {
        filtered = filtered.filter(sale => 
          sale.creditCustomerId === Number(customerFilter)
        );
      }
    }

    // Sort newest first
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    sales,
    dateRangePreset,
    customStartDate,
    customEndDate,
    paymentMethodFilter,
    customerFilter,
    searchQuery,
    selectedDayKey
  ]);

  const filteredSummary = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
    const cost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const profit = revenue - cost;
    const totalItems = filteredSales.reduce(
      (sum, s) =>
        sum +
        (s.items || []).reduce(
          (isum: number, item: any) => isum + Number(item.quantity || 0),
          0,
        ),
      0,
    );
    return {
      transactions: filteredSales.length,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      totalItems,
    };
  }, [filteredSales]);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
    setExpandedSaleId(null);
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      // Don't go beyond today
      const today = new Date();
      if (dateKey(d) > dateKey(today)) return prev;
      return d;
    });
    setExpandedSaleId(null);
  }, []);

  const handleDeleteSale = async () => {
    if (!deleteSaleId) return;
    try {
      await deleteSale(deleteSaleId);
      toast.success("Sale deleted successfully!");
      setDeleteSaleId(null);
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sale");
    }
  };

  return (
    <PageContainer size="wide">
      <PageHeader
        title={t("quick_sale")}
        description={t("add_items_desc")}
        help={<HelpTooltip text={t("quick_sale_desc")} />}
      />

      <div className="space-y-6">
        <SalesTransaction />

        {/* Search & Filters section */}
        <section className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sales, customers, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Date Range */}
            <Select
              value={dateRangePreset}
              onValueChange={(v: any) => setDateRangePreset(v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {dateRangePreset === 'custom' && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full sm:w-auto"
                />
                <span className="self-center text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
            )}

            {/* Payment Method */}
            <Select
              value={paymentMethodFilter || 'all'}
              onValueChange={(v) => setPaymentMethodFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="udhar">Udhari</SelectItem>
              </SelectContent>
            </Select>

            {/* Customer Filter */}
            <Select
              value={customerFilter || 'all'}
              onValueChange={(v) => setCustomerFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="udhari-only">Udhari Only</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Recent sales section for everyone */}
        <section className="space-y-3">
            {/* Filtered summary bar */}
            {filteredSales.length > 0 && (
              <Card className="border-2 bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="py-3">
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="text-sm font-bold">
                        ₹{formatMoney(filteredSummary.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className="text-sm font-bold text-green-700">
                        ₹{formatMoney(filteredSummary.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p className="text-sm font-bold">
                        {formatPercent(filteredSummary.margin)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="text-sm font-bold">
                        {filteredSummary.transactions}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {filteredSales.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-10 text-center">
                  <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">
                    {searchQuery || paymentMethodFilter || customerFilter || dateRangePreset !== 'today' 
                      ? "No sales found for selected filters" 
                      : t("no_sales_day")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {t("no_sales_day_desc")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Transaction list */}
            <div className="space-y-2">
              {filteredSales.map((sale, index) => {
                const isExpanded = expandedSaleId === sale.id;
                const saleItems = sale.items || [];
                const isUdhar = sale.paymentMethod === "udhar";

                return (
                  <Card
                    key={sale.id ?? index}
                    className={`overflow-hidden border-2 transition-all duration-200 ${
                      isUdhar ? "border-orange-200" : ""
                    }`}
                  >
                    {/* Collapsed header – always visible */}
                    <div className="flex w-full items-center justify-between gap-3 px-3 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSaleId(isExpanded ? null : (sale.id ?? null))
                        }
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left transition-colors hover:bg-muted/40 -mx-3 -my-3 px-3 py-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {formatTime(sale.timestamp)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                paymentBadgeStyles[sale.paymentMethod] ||
                                paymentBadgeStyles.cash
                              }`}
                            >
                              {sale.paymentMethod === "udhar" &&
                              sale.creditCustomerName
                                ? sale.creditCustomerName
                                : t(
                                    sale.paymentMethod === "udhar"
                                      ? "udhar"
                                      : sale.paymentMethod,
                                  )}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {saleItems.length} {t("items_sold")} · ₹
                            {formatMoney(sale.subtotal)}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSale(sale);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSaleId(sale.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="text-right mr-2">
                          <p className="text-sm font-bold">
                            ₹{formatMoney(sale.subtotal)}
                          </p>
                          <p className="text-[11px] font-medium text-green-600">
                            +₹{formatMoney(sale.totalProfit)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSaleId(isExpanded ? null : (sale.id ?? null))
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail – per-item breakdown */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-3 pb-3 pt-2">
                        <div className="space-y-2">
                          {saleItems.map((saleItem: any, idx: number) => {
                            const displayItem = inferSaleLineDisplayFields(
                              saleItem,
                              priceTiers,
                              units,
                              saleItem.itemId,
                            );
                            const currentStock = saleItem.itemId
                              ? itemMap.get(saleItem.itemId)
                              : null;
                            const itemProfit = Number(saleItem.profit || 0);
                            const itemMargin =
                              Number(saleItem.totalPrice) > 0
                                ? (itemProfit / Number(saleItem.totalPrice)) * 100
                                : 0;

                            return (
                              <div
                                key={idx}
                                className="rounded-lg border bg-background p-2.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                      {t("english") &&
                                      currentStock?.nameMarathi
                                        ? currentStock.nameMarathi
                                        : saleItem.itemName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatSaleLineSubtitle(displayItem)}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-sm font-bold">
                                    ₹{formatMoney(saleItem.totalPrice)}
                                  </p>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                  <span className="text-green-600">
                                    {t("profit_amount")}: ₹{formatMoney(itemProfit)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {t("margin")}: {formatPercent(itemMargin)}%
                                  </span>
                                  {currentStock && (
                                    <span className="text-blue-600">
                                      {t("stock_left")}:{" "}
                                      {formatWholeNumber(currentStock.quantity)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Transaction-level footer with Edit/Delete buttons */}
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-2 text-xs">
                            <div className="flex gap-3">
                              <span>
                                {t("cost")}:{" "}
                                <span className="font-semibold">
                                  ₹{formatMoney(sale.totalCost)}
                                </span>
                              </span>
                              <span className="text-green-700">
                                {t("profit_amount")}:{" "}
                                <span className="font-semibold">
                                  ₹{formatMoney(sale.totalProfit)}
                                </span>
                              </span>
                            </div>
                            <span className="font-semibold">
                              {formatPercent(sale.profitMarginPercent)}%
                            </span>
                          </div>
                          
                          {/* Edit and Delete buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setEditingSale(sale)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => setDeleteSaleId(sale.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
      </div>

      {editingSale && (
        <EditSaleDialog
          sale={editingSale}
          open={!!editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}

      <AlertDialog open={!!deleteSaleId} onOpenChange={(open) => !open && setDeleteSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the stock and reverse any udhari entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
