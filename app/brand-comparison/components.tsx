"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { useItems, useSales } from "@/hooks/use-supabase";
import { formatMoney, formatPercent, formatWholeNumber } from "@/lib/number-format";
import { monthKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

type ReportType = "today" | "month" | "sixMonths" | "year" | "specificMonth";

interface BrandComparisonProps {
  showOnlyTop5?: boolean;
  selectedReportType?: ReportType;
  setSelectedReportType?: (type: ReportType) => void;
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
}

export function BrandComparison({ 
    showOnlyTop5 = false, 
    selectedReportType: externalSelectedReportType, 
    setSelectedReportType: externalSetSelectedReportType, 
    selectedMonth: externalSelectedMonth, 
    setSelectedMonth: externalSetSelectedMonth 
  }: BrandComparisonProps) {
  const router = useRouter();
  const { currentShopId } = useAuth();
  const { language } = useLanguage();
  const { items } = useItems(currentShopId);
  const { sales } = useSales(currentShopId);
  
  const [internalSelectedReportType, setInternalSelectedReportType] = useState<ReportType>("month");
  const [internalSelectedMonth, setInternalSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const selectedReportType = externalSelectedReportType || internalSelectedReportType;
  const setSelectedReportType = externalSetSelectedReportType || setInternalSelectedReportType;
  const selectedMonth = externalSelectedMonth || internalSelectedMonth;
  const setSelectedMonth = externalSetSelectedMonth || setInternalSelectedMonth;

  // Generate list of available months for selector
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const sale of sales) {
      months.add(sale.date.slice(0, 7)); // Extract YYYY-MM part
    }
    return Array.from(months).sort().reverse(); // Newest first
  }, [sales]);

  // Filter sales based on selected report period
  const filteredSales = useMemo(() => {
    const selectedDate = new Date();
    const selectedDateKey = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const thisMonth = monthKey(selectedDate);
    const thisYear = `${selectedDate.getFullYear()}`;
    const sixMonthsAgo = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() - 5,
      1
    );
    const sixMonthStart = `${sixMonthsAgo.getFullYear()}-${String(
      sixMonthsAgo.getMonth() + 1
    ).padStart(2, "0")}-01`;

    switch (selectedReportType) {
      case "today":
        return sales.filter((sale) => sale.date === selectedDateKey);
      case "month":
        return sales.filter((sale) => sale.date.startsWith(thisMonth));
      case "sixMonths":
        return sales.filter((sale) => sale.date >= sixMonthStart);
      case "year":
        return sales.filter((sale) => sale.date.startsWith(thisYear));
      case "specificMonth":
        return sales.filter((sale) => sale.date.startsWith(selectedMonth));
      default:
        return sales.filter((sale) => sale.date.startsWith(thisMonth));
    }
  }, [sales, selectedReportType, selectedMonth]);

  // Group items by name and filter for groups with ≥ 2 brands
  const productGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        itemName: string;
        items: any[];
        totalSalesQuantity: number;
        totalSalesAmount: number;
        totalProfit: number;
      }
    > = {};

    // 1. Group items by name
    for (const item of items) {
      const nameKey = item.name.toLowerCase().trim();
      if (!groups[nameKey]) {
        groups[nameKey] = {
          itemName: item.name,
          items: [],
          totalSalesQuantity: 0,
          totalSalesAmount: 0,
          totalProfit: 0,
        };
      }
      groups[nameKey].items.push(item);
    }

    // 2. Filter groups that have ≥ 2 different brands
    const validGroups = Object.values(groups).filter((group) => {
      const uniqueBrands = new Set<string>();
      for (const item of group.items) {
        const brandKey =
          (item.brand?.toLowerCase().trim() || "") +
          "|||" +
          (item.brandMarathi?.toLowerCase().trim() || "");
        if (item.brand || item.brandMarathi) {
          uniqueBrands.add(brandKey);
        } else {
          uniqueBrands.add(`no-brand-${item.id}`);
        }
      }
      return uniqueBrands.size >= 2;
    });

    // 3. Calculate sales data for each item in group
    for (const group of validGroups) {
      for (const item of group.items) {
        // Find all sales items for this item in filtered period
        let itemSalesQty = 0;
        let itemSalesAmount = 0;
        let itemSalesProfit = 0;

        for (const sale of filteredSales) {
          for (const saleItem of sale.items || []) {
            if (saleItem.itemId === item.id) {
              itemSalesQty += Number(saleItem.quantity || 0);
              itemSalesAmount += Number(saleItem.totalPrice || 0);
              itemSalesProfit += Number(saleItem.profit || 0);
            }
          }
        }

        // Attach sales data to item
        item.salesData = {
          quantity: itemSalesQty,
          amount: itemSalesAmount,
          profit: itemSalesProfit,
        };

        group.totalSalesQuantity += itemSalesQty;
        group.totalSalesAmount += itemSalesAmount;
        group.totalProfit += itemSalesProfit;
      }
    }

    // 4. Sort valid groups by total profit descending (then by sales quantity)
    validGroups.sort((a, b) => {
      if (b.totalProfit !== a.totalProfit) {
        return b.totalProfit - a.totalProfit;
      }
      return b.totalSalesQuantity - a.totalSalesQuantity;
    });

    // 5. If showOnlyTop5 is true, slice to first 5 groups
    return showOnlyTop5 ? validGroups.slice(0, 5) : validGroups;
  }, [items, filteredSales]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 sm:pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {language === "mr" ? "ब्रँड तुलना" : "Brand Comparison"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {language === "mr"
              ? "एकाच उत्पादनाच्या वेगवेगळ्या ब्रँड्सचे मार्जिन आणि विक्री पहा"
              : "Compare margins and sales of different brands for the same product"}
          </p>
        </div>
        {showOnlyTop5 && (
          <Button onClick={() => router.push("/brand-comparison")}>
            {language === "mr" ? "सर्व पहा" : "View All"}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Report Type Selector (same as dashboard) */}
      <div className="flex items-center gap-4">
        <select
          value={selectedReportType}
          onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="today">{language === "mr" ? "आज" : "Today"}</option>
          <option value="month">{language === "mr" ? "या महिन्यात" : "This Month"}</option>
          <option value="sixMonths">{language === "mr" ? "6 महिने" : "6 Months"}</option>
          <option value="year">{language === "mr" ? "या वर्षी" : "This Year"}</option>
          {availableMonths.length > 0 && (
            <option value="specificMonth">{language === "mr" ? "विशिष्ट महिना" : "Specific Month"}</option>
          )}
        </select>

        {selectedReportType === "specificMonth" && availableMonths.length > 0 && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {availableMonths.map((month) => {
              const [year, monthNum] = month.split("-");
              const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
              return (
                <option key={month} value={month}>
                  {monthDate.toLocaleDateString(
                    language === "mr" ? "mr-IN" : "en-IN",
                    {
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Product Groups */}
      {productGroups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">
              {language === "mr"
                ? "दोन किंवा अधिक ब्रँड्ससह उत्पादने सापडली नाही"
                : "No products with 2 or more brands found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        productGroups.map((group) => (
          <Card key={group.itemName} className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{group.itemName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">
                        {language === "mr" ? "ब्रँड" : "Brand"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "स्टॉक" : "Stock"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "मार्जिन %" : "Margin %"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "नफा/युनिट" : "Profit/Unit"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "विक्री प्रमाण" : "Sales Qty"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "एकूण विक्री" : "Total Sale"}
                      </th>
                      <th className="text-right py-2 px-2">
                        {language === "mr" ? "एकूण नफा" : "Total Profit"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const brandName =
                        (language === "mr" && item.brandMarathi
                          ? item.brandMarathi
                          : item.brand) ||
                        (language === "mr" ? "ब्रँड नाही" : "No Brand");
                      const marginPercent =
                        item.buyPrice > 0
                          ? ((item.sellPrice - item.buyPrice) / item.buyPrice) *
                            100
                          : 0;
                      const profitPerUnit = item.sellPrice - item.buyPrice;

                      return (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="py-3 px-2 font-medium">{brandName}</td>
                          <td className="py-3 px-2 text-right">
                            {formatWholeNumber(item.quantity)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span
                              className={
                                marginPercent >= 30
                                  ? "text-green-600 font-semibold"
                                  : marginPercent >= 15
                                  ? "text-blue-600"
                                  : "text-orange-600"
                              }
                            >
                              {formatPercent(marginPercent)}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            Rs. {formatMoney(profitPerUnit)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatWholeNumber(item.salesData.quantity)}
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-blue-700">
                            Rs. {formatMoney(item.salesData.amount)}
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-green-700">
                            Rs. {formatMoney(item.salesData.profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
