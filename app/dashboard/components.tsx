"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  useDashboardStats,
  useItems,
  useUnits,
  useSales,
  useUdhari,
} from "@/hooks/use-supabase";
import { downloadSimplePdf, type PdfSection } from "@/lib/simple-pdf";
import {
  formatMoney,
  formatPercent,
  formatWholeNumber,
} from "@/lib/number-format";
import { dateKey, monthKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  FileDown,
  Package,
  ShoppingBag,
  TrendingUp,
  WalletCards,
} from "lucide-react";

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

export function Dashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, currentShopId } = useAuth();
  const { t, language } = useLanguage();
  const stats = useDashboardStats(currentShopId);
  const { items } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { sales } = useSales(currentShopId);
  const { totalPending } = useUdhari(currentShopId);
  const [isClientReady, setIsClientReady] = useState(false);

  // --- Date navigation state ---
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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
    const revenue = daySales.reduce((sum, s) => sum + s.subtotal, 0);
    const cost = daySales.reduce((sum, s) => sum + s.totalCost, 0);
    const profit = revenue - cost;
    const totalItems = daySales.reduce(
      (sum, s) =>
        sum +
        (s.items || []).reduce(
          (isum, item) => isum + Number(item.quantity || 0),
          0,
        ),
      0,
    );
    return {
      transactions: daySales.length,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      totalItems,
    };
  }, [daySales]);

  // --- Low stock items ---
  const lowStockItems = useMemo(
    () => items.filter((item) => item.quantity <= item.lowStockLimit),
    [items],
  );

  // --- Period reports (kept for the summary cards section) ---
  const reportData = useMemo(() => {
    const selectedDayForReport = selectedDate;
    const selectedDateKey = dateKey(selectedDayForReport);
    const thisMonth = monthKey(selectedDayForReport); // Also use selectedDate for month
    const sixMonthsAgo = new Date(
      selectedDayForReport.getFullYear(),
      selectedDayForReport.getMonth() - 5,
      1,
    );
    const sixMonthStart = dateKey(sixMonthsAgo);
    const thisYear = `${selectedDayForReport.getFullYear()}`;

    const makeReport = (
      labelKey: string,
      key: ReportKey,
      filteredSales: typeof sales,
    ) => {
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
        key,
        labelKey,
        label: t(labelKey),
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

    return [
      makeReport(
        "today",
        "today",
        sales.filter((sale) => sale.date === selectedDateKey),
      ),
      makeReport(
        "this_month",
        "month",
        sales.filter((sale) => sale.date.startsWith(thisMonth)),
      ),
      makeReport(
        "six_months",
        "sixMonths",
        sales.filter((sale) => sale.date >= sixMonthStart),
      ),
      makeReport(
        "this_year",
        "year",
        sales.filter((sale) => sale.date.startsWith(thisYear)),
      ),
    ];
  }, [sales, selectedDate, t]);

  const todayReport = reportData[0];
  const topMarginItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => (b.marginPercent || 0) - (a.marginPercent || 0))
        .slice(0, 4),
    [items],
  );

  const handleDownloadReport = (report: (typeof reportData)[number]) => {
    const sections: PdfSection[] = [
      {
        heading: "Summary",
        rows: [
          ["Transactions", `${report.transactions}`],
          ["Sales", `Rs. ${formatMoney(report.revenue)}`],
          ["Profit", `Rs. ${formatMoney(report.profit)}`],
          ["Margin", `${formatPercent(report.margin)}%`],
          ["Pending Udhari", `Rs. ${formatMoney(totalPending)}`],
          ["Low Stock Items", `${lowStockItems.length}`],
        ],
      },
      {
        heading: "Top Items",
        rows: report.topItems.length
          ? report.topItems.map((item) => [
              item.name,
              `${formatWholeNumber(item.quantity)} sold, Rs. ${formatMoney(item.revenue)} sales`,
            ])
          : [["Items", "No sales in this period"]],
      },
      {
        heading: "Stock Alerts",
        rows: lowStockItems.length
          ? lowStockItems
              .slice(0, 8)
              .map((item) => [
                item.name,
                `${item.quantity} left, limit ${item.lowStockLimit}`,
              ])
          : [["Low Stock", "No low stock items"]],
      },
    ];

    downloadSimplePdf({
      title: `Dukan ${report.label} Report`,
      subtitle: user?.shopName || "Shop report",
      sections,
      fileName: `dukan-${report.key}-report.pdf`,
    });
  };

  // --- Loading state ---
  if (!isClientReady || authLoading) {
    return (
      <div className="space-y-6 pb-24 sm:pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("home")}</h1>
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
    <div className="mx-auto max-w-5xl space-y-6 pb-24 sm:pb-10">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("home")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.shopName || "Shop"}
        </p>
      </div>

      {/* ─── Top 4 Summary Cards (unchanged) ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("today_sales")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {formatMoney(todayReport.revenue)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {todayReport.transactions} {t("transactions")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("today_profit")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {formatMoney(todayReport.profit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(todayReport.margin)}% {t("margin")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("udhari")}</CardTitle>
            <WalletCards className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {formatMoney(totalPending)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("pending")}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("low_stock_label")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.totalItems} {t("products")}
            </p>
          </CardContent>
        </Card>
      </div>

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
          <Card className="border-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
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

        {/* Empty state */}
        {daySales.length === 0 && (
          <Card className="border-2 border-dashed">
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
                className={`overflow-hidden border-2 transition-all duration-200 ${
                  isUdhar ? "border-orange-200 dark:border-orange-800/50" : ""
                }`}
              >
                {/* Collapsed header – always visible */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSaleId(isExpanded ? null : (sale.id ?? null))
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
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
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        ₹{formatMoney(sale.subtotal)}
                      </p>
                      <p className="text-[11px] font-medium text-green-600 dark:text-green-400">
                        +₹{formatMoney(sale.totalProfit)}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded detail – per-item breakdown */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 px-3 pb-3 pt-2">
                    <div className="space-y-2">
                      {saleItems.map((saleItem, idx) => {
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
                                  {saleItem.quantity} {saleItem.unitShortForm} ×
                                  ₹{formatMoney(saleItem.pricePerUnit)}
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
                                  {formatWholeNumber(currentStock.quantity)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Transaction-level footer */}
                    <div className="mt-2 flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-2 text-xs">
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
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── Reports Section (unchanged) ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{t("reports")}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {reportData.map((report) => (
            <Card key={report.key} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{report.label}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.transactions} {t("transactions")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadReport(report)}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {t("pdf_report")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("sale")}</p>
                    <p className="font-bold">
                      Rs. {formatMoney(report.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("profit_amount")}
                    </p>
                    <p className="font-bold text-green-700">
                      Rs. {formatMoney(report.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("margin")}
                    </p>
                    <p className="font-bold">{formatPercent(report.margin)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
                  className={`flex items-center justify-between rounded-md border-2 px-3 py-3 ${
                    isVeryLow
                      ? "border-red-500 bg-red-50"
                      : isCritical
                        ? "border-orange-400 bg-orange-50"
                        : "border-yellow-300 bg-yellow-50"
                  }`}
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

      {/* ─── Empty state (unchanged) ─── */}
      {items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("no_items_yet")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
