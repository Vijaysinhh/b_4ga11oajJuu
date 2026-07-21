"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  useItems,
  useUnits,
  useSales,
  useStockHistory,
  useUdhari,
  usePriceTiers,
} from "@/hooks/use-supabase";
import { useStaff } from "@/hooks/use-staff";
import {
  getCreditPressure,
  getPreviousDateKey,
  getSalesStreak,
  getSignedPercentChange,
  getTopSellingItem,
  summarizeSales,
} from "@/lib/dukan-insights";
import { downloadPremiumPdf } from "@/lib/premium-pdf";
import {
  formatMoney,
  formatPercent,
  formatNumber,
  formatWholeNumber,
} from "@/lib/number-format";
import { dateKey, monthKey } from "@/lib/utils";
import {
  formatSaleLineSubtitle,
  inferSaleLineDisplayFields,
} from "@/lib/sale-item-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Crown,
  Edit,
  FileDown,
  Package,
  ShoppingBag,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
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
import { BrandComparison } from "@/app/brand-comparison/components";

type ReportKey = "today" | "month" | "sixMonths" | "year";

/** Format a unix timestamp as a 12-hour time string (e.g. 2:35 PM) */
function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a Date as a user-friendly label, e.g. "Today", "Yesterday", or "1 Jun 2026" */
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

const paymentBadgeStyles: Record<string, string> = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  card: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  partial:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  udhar:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

// Let's make a modified version of SalesTransaction that can edit an existing sale
function EditSaleDialog({
  sale,
  open,
  onClose,
}: {
  sale: any;
  open: boolean;
  onClose: () => void;
}) {
  const { currentShopId } = useAuth();
  const { updateSale } = useSales(currentShopId);
  const { customers } = useUdhari(currentShopId);
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
                  itemToEdit={
                    editingItemIndex !== null
                      ? items[editingItemIndex]
                      : undefined
                  }
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
                        item.totalPrice > 0
                          ? (profit / item.totalPrice) * 100
                          : 0;
                      return (
                        <div
                          key={`${item.itemId}-${index}`}
                          className="flex items-start justify-between rounded border bg-gray-50 p-2.5 transition hover:bg-gray-100"
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
                                {t("profit_amount")}: Rs. {formatMoney(profit)}{" "}
                                ({formatPercent(marginPct)}%)
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
                      <div className="flex justify-between">
                        <span>{t("profit_amount")}:</span>
                        <span className="font-bold text-green-700">
                          Rs. {formatMoney(totals.totalProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
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
                          <SelectItem value="partial">
                            {t("partial")}
                          </SelectItem>
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
                              creditCustomerId
                                ? creditCustomerId.toString()
                                : "new"
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
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1"
                      >
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

const paymentBadgeStylesDashboard: Record<string, string> = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  card: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  partial:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  udhar:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export function Dashboard() {
  const router = useRouter();
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    currentShopId,
    currentShop,
  } = useAuth();
  const { t, language } = useLanguage();
  const { items } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { sales, updateSale, deleteSale } = useSales(currentShopId);
  const { stockHistory } = useStockHistory(currentShopId);
  const { staff } = useStaff();
  const { priceTiers } = usePriceTiers(currentShopId);
  const { totalPending, customers, entries } = useUdhari(currentShopId);
  const [isClientReady, setIsClientReady] = useState(false);

  const isPremium = useMemo(
    () =>
      Boolean(
        currentShop?.subscriptionEndDate &&
        currentShop.subscriptionEndDate > Date.now(),
      ),
    [currentShop?.subscriptionEndDate],
  );

  // --- Date navigation state ---
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<number | null>(null);

  // --- Report Selection State ---
  const [selectedReportType, setSelectedReportType] = useState<
    "today" | "month" | "sixMonths" | "year" | "specificMonth"
  >("today");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM format
  });

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

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!isClientReady || authLoading || isAuthenticated) return;
    router.push("/login");
  }, [authLoading, isAuthenticated, isClientReady, router]);

  // Navigate date
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

  // --- Data for the SELECTED day ---
  const daySales = useMemo(() => {
    return sales
      .filter((sale) => sale.date === selectedDayKey)
      .sort((a, b) => b.timestamp - a.timestamp); // newest first
  }, [sales, selectedDayKey]);

  const daySummary = useMemo(() => {
    const summary = summarizeSales(daySales);
    const totalItems = daySales.reduce(
      (sum, s) =>
        sum +
        (s.items || []).reduce(
          (isum: number, item: any) => isum + Number(item.quantity || 0),
          0,
        ),
      0,
    );
    return {
      ...summary,
      totalItems,
    };
  }, [daySales]);

  // --- Low stock items ---
  const lowStockItems = useMemo(
    () => items.filter((item) => item.quantity <= item.lowStockLimit),
    [items],
  );

  const totalStockValue = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.buyPrice || 0),
        0,
      ),
    [items],
  );

  // --- Expiry items ---
  const { expiredItems, expiringItems } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const nextWeek = new Date(todayStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expired: typeof items = [];
    const expiring: typeof items = [];

    for (const item of items) {
      if (!item.expiryDate) continue;
      const expiryDate = new Date(item.expiryDate);
      const expiryStart = new Date(expiryDate);
      expiryStart.setHours(0, 0, 0, 0);

      if (expiryStart < todayStart) {
        expired.push(item);
      } else if (expiryStart <= nextWeek) {
        expiring.push(item);
      }
    }

    return { expiredItems: expired, expiringItems: expiring };
  }, [items]);

  // --- Generate single report based on selection ---
  const currentReport = useMemo(() => {
    const makeReport = (label: string, filteredSales: typeof sales) => {
      const itemAgg = new Map<
        string,
        { quantity: number; revenue: number; profit: number }
      >();

      for (const sale of filteredSales) {
        for (const item of sale.items || []) {
          const existing = itemAgg.get(item.itemName) || {
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
          itemAgg.set(item.itemName, {
            quantity: existing.quantity + Number(item.quantity || 0),
            revenue: existing.revenue + Number(item.totalPrice || 0),
            profit: existing.profit + Number(item.profit || 0),
          });
        }
      }

      const revenue = filteredSales.reduce(
        (sum, sale) => sum + sale.subtotal,
        0,
      );
      const cost = filteredSales.reduce((sum, sale) => sum + sale.totalCost, 0);
      const profit = revenue - cost;

      return {
        label,
        sales: filteredSales,
        transactions: filteredSales.length,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        topItems: Array.from(itemAgg.entries())
          .map(([name, value]) => ({ name, ...value }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
      };
    };

    const selectedDateKey = dateKey(selectedDate);
    const thisMonth = monthKey(selectedDate);
    const thisYear = `${selectedDate.getFullYear()}`;

    let filteredSales: typeof sales;
    let reportLabel: string;

    switch (selectedReportType) {
      case "today":
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate === selectedDateKey;
        });
        reportLabel = t("today");
        break;
      case "month":
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate.startsWith(thisMonth);
        });
        reportLabel = t("this_month");
        break;
      case "sixMonths":
        const sixMonthsAgo = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() - 5,
          1,
        );
        const sixMonthStart = dateKey(sixMonthsAgo);
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate >= sixMonthStart;
        });
        reportLabel = t("six_months");
        break;
      case "year":
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate.startsWith(thisYear);
        });
        reportLabel = t("this_year");
        break;
      case "specificMonth":
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate.startsWith(selectedMonth);
        });
        const [year, monthNum] = selectedMonth.split("-");
        const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        reportLabel = monthDate.toLocaleDateString(
          language === "mr" ? "mr-IN" : "en-IN",
          {
            month: "long",
            year: "numeric",
          },
        );
        break;
      default:
        filteredSales = sales.filter((sale) => {
          const saleDate = typeof sale?.date === "string" ? sale.date : "";
          return saleDate === selectedDateKey;
        });
        reportLabel = t("today");
    }

    return makeReport(reportLabel, filteredSales);
  }, [sales, selectedDate, selectedReportType, selectedMonth, t, language]);

  const previousDaySummary = useMemo(() => {
    const previousSales = sales.filter(
      (sale) => sale.date === getPreviousDateKey(selectedDate),
    );
    return summarizeSales(previousSales);
  }, [sales, selectedDate]);

  const profitChangePercent = useMemo(
    () => getSignedPercentChange(daySummary.profit, previousDaySummary.profit),
    [daySummary.profit, previousDaySummary.profit],
  );

  const revenueChangePercent = useMemo(
    () =>
      getSignedPercentChange(daySummary.revenue, previousDaySummary.revenue),
    [daySummary.revenue, previousDaySummary.revenue],
  );

  const salesStreak = useMemo(() => getSalesStreak(sales), [sales]);

  const dayTopProduct = useMemo(() => getTopSellingItem(daySales), [daySales]);

  const urgentStockInsight = useMemo(() => {
    const expiredTarget = [...expiredItems].sort(
      (a, b) =>
        new Date(a.expiryDate || 0).getTime() -
        new Date(b.expiryDate || 0).getTime(),
    )[0];
    const expiringTarget = [...expiringItems].sort(
      (a, b) =>
        new Date(a.expiryDate || 0).getTime() -
        new Date(b.expiryDate || 0).getTime(),
    )[0];
    const expiringValue = expiringItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.buyPrice || 0),
      0,
    );
    const expiredValue = expiredItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.buyPrice || 0),
      0,
    );
    const lowestStockItem = [...lowStockItems].sort(
      (a, b) => Number(a.quantity || 0) - Number(b.quantity || 0),
    )[0];

    return {
      expiringValue,
      expiredValue,
      lowestStockItem,
      targetItem: expiredTarget || expiringTarget || lowestStockItem || null,
      targetFilter: expiredTarget
        ? "expired"
        : expiringTarget
          ? "expiring"
          : lowestStockItem
            ? "lowStock"
            : null,
    };
  }, [expiredItems, expiringItems, lowStockItems]);

  const udhariPressures = useMemo(
    () =>
      customers
        .filter((customer) => Number(customer.balance || 0) > 0)
        .map((customer) => ({
          customer,
          pressure: getCreditPressure(
            customer.id,
            Number(customer.balance || 0),
            entries,
          ),
        }))
        .sort((a, b) => {
          if (b.pressure.daysPending !== a.pressure.daysPending) {
            return b.pressure.daysPending - a.pressure.daysPending;
          }
          return (
            Number(b.customer.balance || 0) - Number(a.customer.balance || 0)
          );
        }),
    [customers, entries],
  );

  const urgentUdhari = udhariPressures[0] || null;

  const weeklySummary = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - 6);
    previousStart.setHours(0, 0, 0, 0);

    const inRange = (key: string, start: Date, end: Date) => {
      const time = new Date(`${key}T12:00:00`).getTime();
      return time >= start.getTime() && time <= end.getTime();
    };

    const currentWeekSales = sales.filter((sale) =>
      inRange(sale.date, currentStart, today),
    );
    const previousWeekSales = sales.filter((sale) =>
      inRange(sale.date, previousStart, previousEnd),
    );
    const currentWeek = summarizeSales(currentWeekSales);
    const previousWeek = summarizeSales(previousWeekSales);
    const currentWeekUdhari = entries
      .filter((entry) => entry.type === "credit")
      .filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= currentStart && entryDate <= today;
      })
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const previousWeekUdhari = entries
      .filter((entry) => entry.type === "credit")
      .filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= previousStart && entryDate <= previousEnd;
      })
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    return {
      show:
        new Date().getDay() === 0 &&
        (currentWeek.transactions > 0 || currentWeekUdhari > 0),
      salesChange: getSignedPercentChange(
        currentWeek.revenue,
        previousWeek.revenue,
      ),
      profitChange: getSignedPercentChange(
        currentWeek.profit,
        previousWeek.profit,
      ),
      udhariChange: getSignedPercentChange(
        currentWeekUdhari,
        previousWeekUdhari,
      ),
    };
  }, [entries, sales]);

  const signedPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${formatPercent(value)}%`;

  const selectedDayLabel = isToday
    ? language === "mr"
      ? "आजचा"
      : "Today's"
    : formatDateLabel(selectedDate, language);
  const comparisonLabel = language === "mr" ? "कालपेक्षा" : "vs yesterday";
  const profitPraise =
    daySummary.transactions === 0
      ? language === "mr"
        ? "विक्री झाली की नफा दिसेल"
        : "Profit appears after sales"
      : daySummary.profit > previousDaySummary.profit
        ? language === "mr"
          ? "नफा कालपेक्षा जास्त आहे"
          : "Profit is higher than yesterday"
        : language === "mr"
          ? "आज छान विक्री झाली"
          : "Good sales recorded today";
  const streakText =
    salesStreak > 0
      ? language === "mr"
        ? `${salesStreak} दिवस सतत विक्री`
        : `${salesStreak} days continuous sales`
      : language === "mr"
        ? "आजची विक्री अजून सुरू नाही"
        : "No sales streak yet";
  const streakSubtext =
    daySummary.transactions > 0
      ? language === "mr"
        ? `${daySummary.transactions} व्यवहार झाले`
        : `${daySummary.transactions} transactions done`
      : language === "mr"
        ? "पहिली विक्री जोडा"
        : "Add the first sale";
  const stockUnit = urgentStockInsight.lowestStockItem
    ? units.find(
        (unit) => unit.id === urgentStockInsight.lowestStockItem?.unitId,
      )?.shortForm
    : "";
  const stockTargetName = urgentStockInsight.targetItem
    ? language === "mr"
      ? urgentStockInsight.targetItem.nameMarathi ||
        urgentStockInsight.targetItem.name
      : urgentStockInsight.targetItem.name ||
        urgentStockInsight.targetItem.nameMarathi
    : "";
  const stockRiskTitle =
    urgentStockInsight.expiredValue > 0
      ? language === "mr"
        ? `${stockTargetName}: ₹${formatMoney(urgentStockInsight.expiredValue)} चा माल एक्सपायर झाला`
        : `${stockTargetName}: ₹${formatMoney(urgentStockInsight.expiredValue)} stock expired`
      : urgentStockInsight.expiringValue > 0
        ? language === "mr"
          ? `${stockTargetName}: ₹${formatMoney(urgentStockInsight.expiringValue)} चा माल एक्सपायर होण्याच्या मार्गावर आहे`
          : `${stockTargetName}: ₹${formatMoney(urgentStockInsight.expiringValue)} stock near expiry`
        : urgentStockInsight.lowestStockItem
          ? language === "mr"
            ? `${stockTargetName}: फक्त ${formatWholeNumber(urgentStockInsight.lowestStockItem.quantity)} ${stockUnit} बाकी`
            : `${stockTargetName}: Only ${formatWholeNumber(urgentStockInsight.lowestStockItem.quantity)} ${stockUnit} left`
          : language === "mr"
            ? "Stock ठीक आहे"
            : "Stock is healthy";
  const stockRiskSubtext =
    urgentStockInsight.expiredValue > 0 || urgentStockInsight.expiringValue > 0
      ? language === "mr"
        ? `${expiredItems.length + expiringItems.length} expiry alert`
        : `${expiredItems.length + expiringItems.length} expiry alerts`
      : lowStockItems.length > 0
        ? language === "mr"
          ? `${lowStockItems.length} माल कमी आहे`
          : `${lowStockItems.length} low-stock items`
        : language === "mr"
          ? "सध्या मोठा धोका नाही"
          : "No urgent stock risk";
  const udhariRiskLabel =
    urgentUdhari?.pressure.riskLevel === "high"
      ? "🔴 High risk"
      : urgentUdhari?.pressure.riskLevel === "recover"
        ? language === "mr"
          ? "🟠 लवकर वसूल करा"
          : "🟠 Recover soon"
        : language === "mr"
          ? "🟢 Fresh"
          : "🟢 Fresh";
  const udhariSubtext = urgentUdhari
    ? language === "mr"
      ? `₹${formatMoney(urgentUdhari.customer.balance)} ${urgentUdhari.pressure.daysPending} दिवस pending`
      : `₹${formatMoney(urgentUdhari.customer.balance)} pending for ${urgentUdhari.pressure.daysPending} days`
    : language === "mr"
      ? "उधारी pending नाही"
      : "No pending udhari";
  const itemFocusHref = (itemId?: number, filter?: string | null) => {
    if (!itemId) return "/items";
    const params = new URLSearchParams({ focusItemId: String(itemId) });
    if (filter) params.set("filter", filter);
    return `/items?${params.toString()}`;
  };
  const customerFocusHref = (customerId?: number) =>
    customerId ? `/udhari?focusCustomerId=${customerId}` : "/udhari";

  const topMarginItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => (b.marginPercent || 0) - (a.marginPercent || 0))
        .slice(0, 4),
    [items],
  );

  // Generate list of available months for selector
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const sale of sales) {
      const saleDate = typeof sale?.date === "string" ? sale.date : "";
      if (saleDate.length >= 7) {
        months.add(saleDate.slice(0, 7)); // Extract YYYY-MM part
      }
    }
    return Array.from(months).sort().reverse(); // Newest first
  }, [sales]);

  // Find customer with highest udhar
  const highestUdharCustomer = useMemo(() => {
    if (!customers.length) return null;
    return customers.reduce((highest, current) => {
      return current.balance > highest.balance ? current : highest;
    }, customers[0]);
  }, [customers]);

  const handleDownloadReport = async () => {
    const report = currentReport;
    const averageBill =
      report.transactions > 0 ? report.revenue / report.transactions : 0;
    const totalItemsSold = report.sales.reduce((sum, sale) => {
      return (
        sum +
        (sale.items || []).reduce(
          (innerSum: number, item: any) =>
            innerSum + Number(item.quantity || 0),
          0,
        )
      );
    }, 0);

    const paymentBreakdown = report.sales.reduce(
      (acc, sale) => {
        const key = sale.paymentMethod || "cash";
        const current = acc[key] || { count: 0, amount: 0 };
        acc[key] = {
          count: current.count + 1,
          amount: current.amount + Number(sale.subtotal || 0),
        };
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

    const getPreviousPeriodSales = () => {
      const current = new Date(selectedDate);
      current.setHours(0, 0, 0, 0);

      switch (selectedReportType) {
        case "today": {
          const prev = new Date(current);
          prev.setDate(prev.getDate() - 1);
          return sales.filter((sale) => sale.date === dateKey(prev));
        }
        case "month": {
          const prev = new Date(current);
          prev.setMonth(prev.getMonth() - 1);
          const prevMonthKey = monthKey(prev);
          return sales.filter((sale) => sale.date.startsWith(prevMonthKey));
        }
        case "sixMonths": {
          const prevEnd = new Date(
            current.getFullYear(),
            current.getMonth() - 5,
            0,
          );
          const prevStart = new Date(
            current.getFullYear(),
            current.getMonth() - 11,
            1,
          );
          return sales.filter((sale) => {
            const saleDate = new Date(`${sale.date}T12:00:00`);
            return saleDate >= prevStart && saleDate <= prevEnd;
          });
        }
        case "year": {
          const prevYear = current.getFullYear() - 1;
          const prevStart = new Date(prevYear, 0, 1);
          const prevEnd = new Date(prevYear, 11, 31);
          return sales.filter((sale) => {
            const saleDate = new Date(`${sale.date}T12:00:00`);
            return saleDate >= prevStart && saleDate <= prevEnd;
          });
        }
        case "specificMonth": {
          const [year, month] = selectedMonth.split("-").map(Number);
          const prev = new Date(year, month - 2, 1);
          const prevMonthKey = monthKey(prev);
          return sales.filter((sale) => sale.date.startsWith(prevMonthKey));
        }
        default:
          return [];
      }
    };

    const previousSales = getPreviousPeriodSales();
    const previousSummary = summarizeSales(previousSales);
    const comparison = {
      label:
        selectedReportType === "today"
          ? t("yesterday")
          : selectedReportType === "month"
            ? t("previous_month")
            : selectedReportType === "year"
              ? t("previous_year")
              : selectedReportType === "specificMonth"
                ? t("previous_month")
                : t("comparison"),
      revenue: previousSummary.revenue,
      profit: previousSummary.profit,
      margin: previousSummary.margin,
      transactions: previousSummary.transactions,
      revenueChange: getSignedPercentChange(
        report.revenue,
        previousSummary.revenue,
      ),
      profitChange: getSignedPercentChange(
        report.profit,
        previousSummary.profit,
      ),
      marginChange: report.margin - previousSummary.margin,
    };

    const getSelectedPeriodRange = () => {
      const current = new Date(selectedDate);
      current.setHours(0, 0, 0, 0);

      switch (selectedReportType) {
        case "today": {
          const end = new Date(current);
          end.setHours(23, 59, 59, 999);
          return { start: current, end };
        }
        case "month": {
          const start = new Date(current.getFullYear(), current.getMonth(), 1);
          const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        case "sixMonths": {
          const start = new Date(
            current.getFullYear(),
            current.getMonth() - 5,
            1,
          );
          const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        case "year": {
          const start = new Date(current.getFullYear(), 0, 1);
          const end = new Date(current.getFullYear(), 11, 31);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        case "specificMonth": {
          const [year, month] = selectedMonth.split("-").map(Number);
          const start = new Date(year, month - 1, 1);
          const end = new Date(year, month, 0);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        default: {
          const end = new Date(current);
          end.setHours(23, 59, 59, 999);
          return { start: current, end };
        }
      }
    };

    const selectedPeriodRange = getSelectedPeriodRange();

    const expiryAlerts = [
      ...expiredItems.map((item) => ({
        name: item.name,
        expiryDate: item.expiryDate || "",
        status: "expired" as const,
        quantity: item.quantity,
        value: Number(item.quantity || 0) * Number(item.buyPrice || 0),
      })),
      ...expiringItems.map((item) => ({
        name: item.name,
        expiryDate: item.expiryDate || "",
        status: "expiring" as const,
        quantity: item.quantity,
        value: Number(item.quantity || 0) * Number(item.buyPrice || 0),
      })),
    ].sort(
      (a, b) => a.status.localeCompare(b.status) || b.quantity - a.quantity,
    );

    const itemLookup = new Map<number, any>();
    items.forEach((item) => {
      if (item.id !== undefined) {
        itemLookup.set(item.id, item);
      }
    });

    const unitLookup = new Map<number, string>();
    units.forEach((unit) => {
      if (unit.id !== undefined) {
        unitLookup.set(unit.id, unit.shortForm || unit.name || "");
      }
    });

    const lastSoldByItemId = new Map<number, string>();
    sales.forEach((sale) => {
      const saleDate = typeof sale?.date === "string" ? sale.date : "";
      (sale.items || []).forEach((saleItem: any) => {
        const itemId = Number(saleItem.itemId);
        if (!itemId || !saleDate) return;
        const previousDate = lastSoldByItemId.get(itemId);
        if (!previousDate || saleDate > previousDate) {
          lastSoldByItemId.set(itemId, saleDate);
        }
      });
    });

    const itemPerformanceMap = new Map<
      string,
      {
        name: string;
        brand?: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
        lastSoldDate?: string;
      }
    >();

    report.sales.forEach((sale) => {
      const saleDate = typeof sale?.date === "string" ? sale.date : "";
      (sale.items || []).forEach((saleItem: any) => {
        const item = itemLookup.get(Number(saleItem.itemId));
        const key = String(saleItem.itemId || saleItem.itemName);
        const current = itemPerformanceMap.get(key) || {
          name: item?.name || item?.nameMarathi || saleItem.itemName || "Unknown",
          brand: item?.brand || item?.brandMarathi || undefined,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          lastSoldDate: saleDate,
        };
        const revenueValue = Number(saleItem.totalPrice || 0);
        const costValue = Number(saleItem.totalCost || 0);
        current.quantity += Number(saleItem.quantity || 0);
        current.revenue += revenueValue;
        current.cost += costValue;
        current.profit += Number(saleItem.profit ?? revenueValue - costValue);
        if (saleDate && (!current.lastSoldDate || saleDate > current.lastSoldDate)) {
          current.lastSoldDate = saleDate;
        }
        itemPerformanceMap.set(key, current);
      });
    });

    const itemPerformance = Array.from(itemPerformanceMap.values())
      .map((item) => ({
        ...item,
        margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const nextWeek = new Date(todayStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const stockItems = items
      .map((item) => {
        const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
        const expiryStart = expiryDate ? new Date(expiryDate) : null;
        if (expiryStart) expiryStart.setHours(0, 0, 0, 0);
        const quantity = Number(item.quantity || 0);
        const buyPrice = Number(item.buyPrice || 0);
        const sellPrice = Number(item.sellPrice || 0);
        const marginAmount =
          Number(item.marginAmount ?? sellPrice - buyPrice) || 0;
        const marginPercent =
          Number(item.marginPercent ?? (buyPrice > 0 ? (marginAmount / buyPrice) * 100 : 0)) ||
          0;
        const status =
          quantity <= 0
            ? ("out" as const)
            : expiryStart && expiryStart < todayStart
              ? ("expired" as const)
              : expiryStart && expiryStart <= nextWeek
                ? ("expiring" as const)
                : quantity <= Number(item.lowStockLimit || 0)
                  ? ("low" as const)
                  : ("good" as const);

        return {
          name: item.name || item.nameMarathi || "Unknown",
          brand: item.brand || item.brandMarathi || undefined,
          quantity,
          unit: unitLookup.get(Number(item.unitId)) || "unit",
          stockValue: quantity * buyPrice,
          buyPrice,
          sellPrice,
          marginAmount,
          marginPercent,
          lowStockLimit: Number(item.lowStockLimit || 0),
          lastUpdated: item.updatedAt
            ? new Date(item.updatedAt).toISOString().slice(0, 10)
            : undefined,
          lastSoldDate: item.id ? lastSoldByItemId.get(Number(item.id)) : undefined,
          expiryDate: item.expiryDate
            ? new Date(item.expiryDate).toISOString().slice(0, 10)
            : undefined,
          status,
        };
      })
      .sort((a, b) => {
        const priority = { out: 0, expired: 1, low: 2, expiring: 3, good: 4 };
        const priorityDiff = priority[a.status] - priority[b.status];
        if (priorityDiff !== 0) return priorityDiff;
        return b.stockValue - a.stockValue;
      });

    const stockMovements = stockHistory
      .filter((movement) => {
        const movementTime = Number(movement.createdAt || 0);
        return (
          movementTime >= selectedPeriodRange.start.getTime() &&
          movementTime <= selectedPeriodRange.end.getTime()
        );
      })
      .slice(0, 24)
      .map((movement) => ({
        date: new Date(movement.createdAt).toISOString().slice(0, 10),
        itemName: movement.itemName || "Unknown",
        type: movement.type,
        quantityChanged: Number(movement.quantityChanged || 0),
        quantityBefore: Number(movement.quantityBefore || 0),
        quantityAfter: Number(movement.quantityAfter || 0),
        reason: movement.reason || movement.reference || undefined,
      }));

    const productDemand = new Map<
      string,
      {
        productName: string;
        totalRevenue: number;
        brandTotals: Map<string, number>;
      }
    >();

    report.sales.forEach((sale) => {
      (sale.items || []).forEach((saleItem: any) => {
        const item = itemLookup.get(saleItem.itemId);
        const productName =
          item?.name || item?.nameMarathi || saleItem.itemName || "Unknown";
        const brand = item?.brand || item?.brandMarathi || "Unknown Brand";
        const product = productDemand.get(productName) || {
          productName,
          totalRevenue: 0,
          brandTotals: new Map(),
        };
        const currentBrandRevenue = product.brandTotals.get(brand) || 0;
        product.brandTotals.set(
          brand,
          currentBrandRevenue + Number(saleItem.totalPrice || 0),
        );
        product.totalRevenue += Number(saleItem.totalPrice || 0);
        productDemand.set(productName, product);
      });
    });

    const brandDemand = Array.from(productDemand.values())
      .map((group) => {
        const brandTotals = Array.from(group.brandTotals.entries()).sort(
          (a, b) => b[1] - a[1],
        );
        const topBrandEntry = brandTotals[0];
        return {
          productName: group.productName,
          totalRevenue: group.totalRevenue,
          topBrand: topBrandEntry?.[0] ?? "Unknown",
          topBrandRevenue: topBrandEntry?.[1] ?? 0,
          topBrandShare: group.totalRevenue
            ? (topBrandEntry?.[1] ?? 0) / group.totalRevenue
            : 0,
          brandCount: brandTotals.length,
          topBrands: brandTotals.slice(0, 3).map(([brand]) => brand),
        };
      })
      .filter((group) => group.brandCount >= 2)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    const staffSalesMap = new Map<
      string,
      {
        staffName: string;
        revenue: number;
        cost: number;
        profit: number;
        transactions: number;
        udhariAmount: number;
        totalItems: number;
      }
    >();
    report.sales.forEach((sale) => {
      const staffId =
        sale.userId || sale.user_id || sale.createdBy || sale.staffId;
      if (!staffId) return;
      const staffKey = String(staffId);
      const staffName =
        staff.find((member: any) => member.id === Number(staffId))?.username ||
        `Staff ${staffKey}`;
      const currentEntry = staffSalesMap.get(staffKey) || {
        staffName,
        revenue: 0,
        cost: 0,
        profit: 0,
        transactions: 0,
        udhariAmount: 0,
        totalItems: 0,
      };
      currentEntry.revenue += Number(sale.subtotal || 0);
      currentEntry.cost += Number(sale.totalCost || 0);
      currentEntry.profit += Number(
        sale.totalProfit ?? Number(sale.subtotal || 0) - Number(sale.totalCost || 0),
      );
      currentEntry.transactions += 1;
      currentEntry.udhariAmount +=
        sale.paymentMethod === "udhar" ? Number(sale.subtotal || 0) : 0;
      currentEntry.totalItems += (sale.items || []).reduce(
        (sum: number, saleItem: any) => sum + Number(saleItem.quantity || 0),
        0,
      );
      staffSalesMap.set(staffKey, currentEntry);
    });

    const staffSales = Array.from(staffSalesMap.values())
      .map((entry) => ({
        ...entry,
        margin: entry.revenue > 0 ? (entry.profit / entry.revenue) * 100 : 0,
        averageBill:
          entry.transactions > 0 ? entry.revenue / entry.transactions : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lossItems = itemPerformance.filter((item) => item.profit < 0);
    const lowMarginSoldItems = itemPerformance.filter(
      (item) => item.profit >= 0 && item.margin < 10,
    );
    const strongMarginItems = itemPerformance.filter(
      (item) => item.margin >= 25 && item.profit > 0,
    );

    const suggestions: string[] = [];
    if (report.revenue === 0) {
      suggestions.push(
        "No sales are recorded for this period. Check whether sales were entered or select another period.",
      );
    }
    if (comparison.revenueChange < 0) {
      suggestions.push(
        `Sales are down ${formatPercent(Math.abs(comparison.revenueChange))}% compared with ${comparison.label}. Review top-selling items and worker coverage.`,
      );
    }
    if (lowStockItems.length > 0) {
      suggestions.push(
        `Reorder ${lowStockItems.length} low-stock item${
          lowStockItems.length > 1 ? "s" : ""
        } to avoid stockouts.`,
      );
    }
    if (expiredItems.length > 0) {
      suggestions.push(
        `Dispose or discount ${expiredItems.length} expired item${
          expiredItems.length > 1 ? "s" : ""
        } to reduce losses.`,
      );
    } else if (expiringItems.length > 0) {
      suggestions.push(
        `Promote ${expiringItems.length} item${
          expiringItems.length > 1 ? "s" : ""
        } nearing expiry to clear stock.`,
      );
    }
    if (urgentUdhari?.pressure.riskLevel === "high") {
      suggestions.push(
        "Collect overdue udhari from high-risk credit customers immediately.",
      );
    } else if (urgentUdhari?.pressure.riskLevel === "recover") {
      suggestions.push(
        "Follow up with credit customers to recover pending balances soon.",
      );
    }
    if (brandDemand.length > 0) {
      suggestions.push(
        "Focus on top-performing brands for products with high customer demand.",
      );
    }
    if (lossItems.length > 0) {
      suggestions.push(
        `Fix selling price for ${lossItems.length} loss-making item${
          lossItems.length > 1 ? "s" : ""
        } before the next sale.`,
      );
    } else if (lowMarginSoldItems.length > 0) {
      suggestions.push(
        `Review purchase price or selling price for ${lowMarginSoldItems.length} low-margin item${
          lowMarginSoldItems.length > 1 ? "s" : ""
        }.`,
      );
    }
    if (strongMarginItems.length > 0) {
      suggestions.push(
        `Promote ${strongMarginItems[0].name}; it has a strong ${formatPercent(strongMarginItems[0].margin)}% margin.`,
      );
    }
    if (report.profit < 0) {
      suggestions.push(
        "Reduce costs or adjust prices to improve profitability.",
      );
    }

    console.info("handleDownloadReport: isPremium", isPremium);
    if (!isPremium) {
      toast.error(t("premium_pdf_requires_subscription"));
      return;
    }

    console.info("handleDownloadReport: invoking premium PDF export");
    try {
      await downloadPremiumPdf(
        {
          label: report.label,
          sales: report.sales,
          transactions: report.transactions,
          revenue: report.revenue,
          cost: report.cost,
          profit: report.profit,
          margin: report.margin,
          topItems: report.topItems,
          itemPerformance,
          shopName: currentShop?.shopName || "Dukan",
          totalStockValue,
          productsCount: items.length,
          lowStockItems: lowStockItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            lowStockLimit: item.lowStockLimit,
          })),
          totalPendingUdhari: totalPending,
          highestUdharCustomer: highestUdharCustomer
            ? {
                name: highestUdharCustomer.name,
                balance: highestUdharCustomer.balance,
              }
            : null,
          paymentBreakdown,
          totalItemsSold,
          averageBill,
          comparison,
          expiryAlerts,
          brandDemand,
          staffSales,
          stockItems,
          stockMovements,
          suggestions,
          notifications: [],
        },
        `dukan-report-premium-${Date.now()}.pdf`,
      );
      toast.success(t("premium_pdf_downloaded"));
    } catch (error) {
      console.error("Failed to generate premium PDF:", error);
      toast.error(
        `Premium report failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  };

  // --- Loading state ---
  if (!isClientReady || authLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-24 pt-2 sm:pb-10 sm:pt-4">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5">
          <h1 className="text-2xl font-semibold tracking-tight">{t("home")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("loading_shop_data")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse border-2">
              <CardContent className="h-28" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 pt-2 sm:pb-10 sm:pt-4">
      {/* ─── Header ─── */}
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("home")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentShop?.shopName || "Shop"}
        </p>
      </div>

      {/* ─── Top 4 Summary Cards ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border border-green-200 bg-green-50/70 shadow-sm dark:border-green-900/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              🟢 Today's Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Sales:</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  ₹{formatMoney(daySummary.revenue)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Profit:</span>
                <span className="text-lg font-bold text-green-800 dark:text-green-300">
                  ₹{formatMoney(daySummary.profit)}
                </span>
              </div>
              <p
                className={`text-xs font-semibold text-right ${
                  profitChangePercent >= 0
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {comparisonLabel} {signedPercent(profitChangePercent)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔥 Streak</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold leading-tight">{streakText}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {streakSubtext}
            </p>
            <p
              className={`mt-1 text-xs font-semibold ${
                revenueChangePercent >= 0
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {comparisonLabel} {signedPercent(revenueChangePercent)}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border border-orange-200 bg-orange-50/70 shadow-sm transition hover:border-orange-400 dark:border-orange-900/50 dark:bg-orange-950/20"
          onClick={() =>
            router.push(
              itemFocusHref(
                urgentStockInsight.targetItem?.id,
                urgentStockInsight.targetFilter,
              ),
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(
                itemFocusHref(
                  urgentStockInsight.targetItem?.id,
                  urgentStockInsight.targetFilter,
                ),
              );
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">⚠️ Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="line-clamp-2 text-lg font-bold leading-tight text-orange-900 dark:text-orange-200">
              {stockRiskTitle}
            </div>
            <p className="mt-2 text-xs text-orange-800/80 dark:text-orange-200/80">
              {stockRiskSubtext}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border shadow-sm transition hover:border-orange-400"
          onClick={() =>
            router.push(customerFocusHref(urgentUdhari?.customer.id))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(customerFocusHref(urgentUdhari?.customer.id));
            }
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("udhari")}</CardTitle>
            <WalletCards className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{udhariRiskLabel}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {udhariSubtext}
            </p>
            {urgentUdhari && (
              <p className="mt-1 truncate text-xs font-semibold text-orange-700 dark:text-orange-300">
                {urgentUdhari.customer.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {weeklySummary.show && (
        <Card className="border border-blue-200 bg-blue-50/70 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === "mr" ? "या आठवड्यात" : "This week"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Sales</p>
                <p
                  className={`font-bold ${
                    weeklySummary.salesChange >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {signedPercent(weeklySummary.salesChange)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("profit_amount")}
                </p>
                <p
                  className={`font-bold ${
                    weeklySummary.profitChange >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {signedPercent(weeklySummary.profitChange)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("udhari")}</p>
                <p
                  className={`font-bold ${
                    weeklySummary.udhariChange <= 0
                      ? "text-green-700"
                      : "text-orange-700"
                  }`}
                >
                  {signedPercent(weeklySummary.udhariChange)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── DAILY SALES TIMELINE (new section) ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        {/* Date navigation header */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-9 w-9 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-bold leading-tight">
              {formatDateLabel(selectedDate, language)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedDate.toLocaleDateString(
                language === "mr" ? "mr-IN" : "en-IN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            disabled={isToday}
            className="h-9 w-9 shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day summary bar */}
        {daySales.length > 0 && (
          <Card className="border bg-gradient-to-r from-green-50 to-blue-50 shadow-sm dark:from-green-950/30 dark:to-blue-950/30">
            <CardContent className="py-3">
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">{t("revenue")}</p>
                  <p className="text-sm font-bold">
                    ₹{formatMoney(daySummary.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("profit_amount")}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    ₹{formatMoney(daySummary.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("margin")}</p>
                  <p className="text-sm font-bold">
                    {formatPercent(daySummary.margin)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("transactions")}</p>
                  <p className="text-sm font-bold">{daySummary.transactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {dayTopProduct && (
          <Card className="border border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  🏆{" "}
                  {language === "mr"
                    ? "आजचा बेस्ट विकणारा माल"
                    : "Today's best seller"}
                </p>
                <p className="truncate text-base font-bold">
                  {dayTopProduct.name}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  ₹{formatMoney(dayTopProduct.revenue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(dayTopProduct.quantity)} {t("sold")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {daySales.length === 0 && (
          <Card className="border border-dashed shadow-sm">
            <CardContent className="py-10 text-center">
              <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                {t("no_sales_day")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {t("no_sales_day_desc")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transaction list */}
        <div className="space-y-2">
          {daySales.map((sale, index) => {
            const isExpanded = expandedSaleId === sale.id;
            const saleItems = sale.items || [];
            const isUdhar = sale.paymentMethod === "udhar";

            return (
              <Card
                key={sale.id ?? index}
                className={`overflow-hidden border shadow-sm transition-all duration-200 ${
                  isUdhar ? "border-orange-200 dark:border-orange-800/50" : ""
                }`}
              >
                {/* Collapsed header – always visible */}
                <div className="flex items-center gap-3 px-3 py-3">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatTime(sale.timestamp)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${paymentBadgeStyles[sale.paymentMethod] || paymentBadgeStyles.cash}`}
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

                  <div className="flex items-center gap-2 shrink-0 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600"
                      onClick={() => setEditingSale(sale)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setDeleteSaleId(sale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        ₹{formatMoney(sale.subtotal)}
                      </p>
                      <p className="text-[11px] font-medium text-green-600 dark:text-green-400">
                        +₹{formatMoney(sale.totalProfit)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setExpandedSaleId(isExpanded ? null : (sale.id ?? null))
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
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
                                  {language === "mr" &&
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
                              <span className="text-green-600 dark:text-green-400">
                                {t("profit_amount")}: ₹{formatMoney(itemProfit)}
                              </span>
                              <span className="text-muted-foreground">
                                {t("margin")}: {formatPercent(itemMargin)}%
                              </span>
                              {currentStock && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {t("stock_left")}:{" "}
                                  {formatNumber(currentStock.quantity)}
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
                          <span className="text-green-700 dark:text-green-400">
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

      {/* ─── Reports Section (Updated) ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t("reports")}</h2>
              <p className="text-xs text-muted-foreground">
                Visual PDF with sales, profit, stock, brand, udhari, and staff insights
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={selectedReportType}
                  onValueChange={(val) => setSelectedReportType(val as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t("today")}</SelectItem>
                    <SelectItem value="month">{t("this_month")}</SelectItem>
                    <SelectItem value="sixMonths">{t("six_months")}</SelectItem>
                    <SelectItem value="year">{t("this_year")}</SelectItem>
                    <SelectItem value="specificMonth">
                      Specific Month
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedReportType === "specificMonth" &&
                  availableMonths.length > 0 && (
                    <Select
                      value={selectedMonth}
                      onValueChange={setSelectedMonth}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map((month) => {
                          const [year, monthNum] = month.split("-");
                          const date = new Date(
                            parseInt(year),
                            parseInt(monthNum) - 1,
                            1,
                          );
                          const monthLabel = date.toLocaleDateString(
                            language === "mr" ? "mr-IN" : "en-IN",
                            {
                              month: "long",
                              year: "numeric",
                            },
                          );
                          return (
                            <SelectItem key={month} value={month}>
                              {monthLabel}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {currentReport.transactions} {t("transactions")}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    onClick={handleDownloadReport}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    disabled={!isPremium}
                  >
                    <FileDown className="h-4 w-4" />
                    Download visual PDF
                  </Button>
                  {!isPremium && (
                    <p className="text-xs text-orange-700">
                      {t("premium_pdf_requires_subscription")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <CardTitle className="mt-2 flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              {currentReport.label}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
              <div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("sale")}</p>
                    <p className="font-bold">
                      Rs. {formatMoney(currentReport.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profit_amount")}
                    </p>
                    <p className="font-bold text-green-700">
                      Rs. {formatMoney(currentReport.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("margin")}</p>
                    <p className="font-bold">
                      {formatPercent(currentReport.margin)}%
                    </p>
                  </div>
                </div>

                {/* Top Items */}
                {currentReport.topItems.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold">
                      Top Items
                    </p>
                    <div className="space-y-1">
                      {currentReport.topItems.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-bold">
                            Rs. {formatMoney(item.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-950">
                      Premium visual report
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Numbered blocks, health score, smart tables, and next actions.
                    </p>
                  </div>
                  <FileDown className="h-5 w-5 shrink-0 text-blue-700" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-md bg-white/80 px-2 py-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    <span>Sales + profit</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white/80 px-2 py-2">
                    <Package className="h-3.5 w-3.5 text-amber-600" />
                    <span>Stock alerts</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white/80 px-2 py-2">
                    <WalletCards className="h-3.5 w-3.5 text-orange-600" />
                    <span>Udhari control</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white/80 px-2 py-2">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Brand + staff</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Brand Comparison Section ─── */}
      <BrandComparison
        showOnlyTop5={true}
        selectedReportType={selectedReportType}
        setSelectedReportType={setSelectedReportType}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
      />

      {/* ─── Highest Udhar Customer ─── */}
      {highestUdharCustomer && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("highest_udhar")}</h2>
          <Card
            className="border-2 cursor-pointer hover:border-orange-400 transition-all"
            onClick={() =>
              router.push(customerFocusHref(highestUdharCustomer.id))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(customerFocusHref(highestUdharCustomer.id));
              }
            }}
            role="button"
            tabIndex={0}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {highestUdharCustomer.name}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                Rs. {formatMoney(highestUdharCustomer.balance)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pending")}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── High Margin Items (unchanged) ─── */}
      {topMarginItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("high_margin_items")}</h2>
          <div className="grid gap-2">
            {topMarginItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border bg-green-50 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {index + 1}.{" "}
                    {language === "mr" && item.nameMarathi
                      ? item.nameMarathi
                      : item.name}
                  </p>
                  <p className="text-xs text-green-800">
                    Rs. {formatMoney(item.marginAmount || 0)}{" "}
                    {t("profit_amount")}/{t("unit")}
                  </p>
                </div>
                <p className="font-bold text-green-700">
                  {formatPercent(item.marginPercent || 0)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Stock Needed (IMPROVED) ─── */}
      {lowStockItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold text-red-700">
                {t("stock_needed")}
              </h2>
              <span className="inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full">
                {lowStockItems.length}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/items")}
              className="text-xs"
            >
              {t("restock")}
            </Button>
          </div>
          <div className="grid gap-2">
            {lowStockItems.slice(0, 8).map((item) => {
              const stockPercentage =
                item.lowStockLimit > 0
                  ? (item.quantity / item.lowStockLimit) * 100
                  : 0;
              const isVeryLow = item.quantity === 0;
              const isCritical =
                item.quantity < Math.ceil(item.lowStockLimit * 0.5);

              return (
                <div
                  key={item.id}
                  className={`flex cursor-pointer items-center justify-between rounded-md border-2 px-3 py-3 transition hover:shadow-sm ${
                    isVeryLow
                      ? "border-red-500 bg-red-50"
                      : isCritical
                        ? "border-orange-400 bg-orange-50"
                        : "border-yellow-300 bg-yellow-50"
                  }`}
                  onClick={() =>
                    router.push(itemFocusHref(item.id, "lowStock"))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(itemFocusHref(item.id, "lowStock"));
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${
                        isVeryLow
                          ? "text-red-900"
                          : isCritical
                            ? "text-orange-900"
                            : "text-yellow-900"
                      }`}
                    >
                      {language === "mr" && item.nameMarathi
                        ? item.nameMarathi
                        : item.name}
                    </p>
                    <div className="text-xs mt-1 space-y-0.5">
                      <p
                        className={
                          isVeryLow
                            ? "text-red-700"
                            : isCritical
                              ? "text-orange-700"
                              : "text-yellow-700"
                        }
                      >
                        {t("low_stock_limit_label")}:{" "}
                        {formatWholeNumber(item.lowStockLimit)}{" "}
                        {units.find((u) => u.id === item.unitId)?.shortForm}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            isVeryLow
                              ? "bg-red-600"
                              : isCritical
                                ? "bg-orange-500"
                                : "bg-yellow-500"
                          }`}
                          style={{
                            width: `${Math.min(stockPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p
                      className={`font-bold text-lg ${
                        isVeryLow
                          ? "text-red-700"
                          : isCritical
                            ? "text-orange-700"
                            : "text-yellow-700"
                      }`}
                    >
                      {formatWholeNumber(item.quantity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {units.find((u) => u.id === item.unitId)?.shortForm}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {lowStockItems.length > 8 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{lowStockItems.length - 8} more items with low stock
            </p>
          )}
        </section>
      )}

      {/* ─── Expiry Alerts ─── */}
      {(expiredItems.length > 0 || expiringItems.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-orange-700">
                Expiry Alerts
              </h2>
              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-600 text-white text-xs font-bold rounded-full">
                {expiredItems.length + expiringItems.length}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/items")}
              className="text-xs"
            >
              Manage Items
            </Button>
          </div>

          {/* Expired Items */}
          {expiredItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Expired ({expiredItems.length})
              </h3>
              <div className="grid gap-2">
                {expiredItems.slice(0, 5).map((item) => {
                  const expiryDate = new Date(item.expiryDate!);
                  return (
                    <div
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between rounded-md border-2 border-red-400 bg-red-50 px-3 py-3 transition hover:shadow-sm"
                      onClick={() =>
                        router.push(itemFocusHref(item.id, "expired"))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(itemFocusHref(item.id, "expired"));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-red-900">
                          {language === "mr" && item.nameMarathi
                            ? item.nameMarathi
                            : item.name}
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Expired on:{" "}
                          {expiryDate.toLocaleDateString(
                            language === "mr" ? "mr-IN" : "en-IN",
                          )}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="font-bold text-red-700">
                          {formatWholeNumber(item.quantity)}
                        </p>
                        <p className="text-xs text-red-600">
                          {units.find((u) => u.id === item.unitId)?.shortForm}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {expiredItems.length > 5 && (
                <p className="text-xs text-red-600 text-center pt-1">
                  +{expiredItems.length - 5} more expired items
                </p>
              )}
            </div>
          )}

          {/* Near Expiry Items */}
          {expiringItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                Near Expiry (Next 7 Days) ({expiringItems.length})
              </h3>
              <div className="grid gap-2">
                {expiringItems.slice(0, 5).map((item) => {
                  const expiryDate = new Date(item.expiryDate!);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil(
                    (expiryDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between rounded-md border-2 border-orange-400 bg-orange-50 px-3 py-3 transition hover:shadow-sm"
                      onClick={() =>
                        router.push(itemFocusHref(item.id, "expiring"))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(itemFocusHref(item.id, "expiring"));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-orange-900">
                          {language === "mr" && item.nameMarathi
                            ? item.nameMarathi
                            : item.name}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          Expires on:{" "}
                          {expiryDate.toLocaleDateString(
                            language === "mr" ? "mr-IN" : "en-IN",
                          )}
                          <span className="ml-2 font-semibold">
                            ({daysLeft} {daysLeft === 1 ? "day" : "days"} left)
                          </span>
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="font-bold text-orange-700">
                          {formatWholeNumber(item.quantity)}
                        </p>
                        <p className="text-xs text-orange-600">
                          {units.find((u) => u.id === item.unitId)?.shortForm}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {expiringItems.length > 5 && (
                <p className="text-xs text-orange-600 text-center pt-1">
                  +{expiringItems.length - 5} more near-expiry items
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Empty state (unchanged) ─── */}
      {items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("no_items_yet")}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Sale Dialog */}
      <EditSaleDialog
        sale={editingSale}
        open={!!editingSale}
        onClose={() => setEditingSale(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteSaleId}
        onOpenChange={(open) => !open && setDeleteSaleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sale? This action cannot be
              undone. Stock levels will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
