"use client";

import { SalesTransaction } from "./components";
import { HelpTooltip } from "@/components/help-tooltip";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSales, useItems, useUnits } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { dateKey } from "@/lib/utils";
import { formatMoney, formatPercent, formatWholeNumber } from "@/lib/number-format";

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
  const { sales } = useSales(currentShopId);
  const { items } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);

  // --- Date navigation state ---
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

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
          (isum: number, item: any) => isum + Number(item.quantity || 0),
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

  return (
    <PageContainer size="wide">
      <PageHeader
        title={t("quick_sale")}
        description={t("add_items_desc")}
        help={<HelpTooltip text={t("quick_sale_desc")} />}
      />

      <div className="space-y-6">
        <SalesTransaction />

        {/* Show recent sales only for workers */}
        {isWorker && (
          <section className="space-y-3">
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
                  {formatDateLabel(selectedDate, t("english") ? "en" : "mr")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString(
                    t("english") ? "en-IN" : "mr-IN",
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
              <Card className="border-2 bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="py-3">
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="text-sm font-bold">
                        ₹{formatMoney(daySummary.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className="text-sm font-bold text-green-700">
                        ₹{formatMoney(daySummary.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p className="text-sm font-bold">
                        {formatPercent(daySummary.margin)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="text-sm font-bold">
                        {daySummary.transactions}
                      </p>
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
                      isUdhar ? "border-orange-200" : ""
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
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            ₹{formatMoney(sale.subtotal)}
                          </p>
                          <p className="text-[11px] font-medium text-green-600">
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
                          {saleItems.map((saleItem: any, idx: number) => {
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
                                      {saleItem.quantity} {saleItem.unitShortForm} ×
                                      ₹{formatMoney(saleItem.pricePerUnit)}
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

                        {/* Transaction-level footer */}
                        <div className="mt-2 flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-2 text-xs">
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
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
