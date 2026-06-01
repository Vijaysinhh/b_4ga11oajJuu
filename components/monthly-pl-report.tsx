"use client";

import { useState, useEffect, useMemo } from "react";
import { useSales } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { formatMoney, formatPercent, formatWholeNumber } from "@/lib/number-format";

export function MonthlyPLReport() {
  const { sales } = useSales();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [loading, setLoading] = useState(false);

  // Memoize the calculations to prevent unnecessary recalculations
  const {
    monthSales,
    dailyData,
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
  } = useMemo(() => {
    setLoading(true);

    try {
      const monthSalesData = sales.filter((s) =>
        s.date.startsWith(selectedMonth),
      );

      const dailyDataCalc = monthSalesData.reduce((acc, sale) => {
        const existing = acc.find((d) => d.date === sale.date);
        if (existing) {
          existing.revenue += sale.subtotal;
          existing.cost += sale.totalCost;
          existing.profit += sale.totalProfit;
        } else {
          acc.push({
            date: sale.date,
            revenue: sale.subtotal,
            cost: sale.totalCost,
            profit: sale.totalProfit,
          });
        }
        return acc;
      }, [] as any[]);

      const totalRevenueCalc = monthSalesData.reduce(
        (sum, s) => sum + s.subtotal,
        0,
      );
      const totalCostCalc = monthSalesData.reduce(
        (sum, s) => sum + s.totalCost,
        0,
      );
      const totalProfitCalc = totalRevenueCalc - totalCostCalc;
      const profitMarginCalc =
        totalRevenueCalc > 0
          ? (totalProfitCalc / totalRevenueCalc) * 100
          : 0;

      setLoading(false);

      return {
        monthSales: monthSalesData,
        dailyData: dailyDataCalc,
        totalRevenue: totalRevenueCalc,
        totalCost: totalCostCalc,
        totalProfit: totalProfitCalc,
        profitMargin: profitMarginCalc,
      };
    } catch (error) {
      console.error("[v0] Error calculating monthly data:", error);
      setLoading(false);
      return {
        monthSales: [],
        dailyData: [],
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
      };
    }
  }, [selectedMonth, sales]);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Monthly P&L Report</h1>
        <p className="text-muted-foreground mt-2">
          Profit and Loss analysis for your shop
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading report...
        </div>
      ) : monthSales.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No sales data for this month
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {formatMoney(totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost of Goods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {formatMoney(totalCost)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  Rs. {formatMoney(totalProfit)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(Number(profitMargin))}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs Cost Chart - Hidden on mobile */}
          {dailyData.length > 0 && (
            <Card className="border-2 hidden sm:block">
              <CardHeader>
                <CardTitle>Daily Revenue vs Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Profit Trend - Hidden on mobile */}
          {dailyData.length > 0 && (
            <Card className="border-2 hidden sm:block">
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Sales with Item Details */}
          {monthSales.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Sales</CardTitle>
                <CardDescription>
                  Latest transactions with item details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {monthSales
                    .slice(-10)
                    .reverse()
                    .map((sale: any, idx: number) => (
                      <div
                        key={sale.id}
                        className="border rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-sm">
                              Sale #{monthSales.length - idx}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(sale.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              Rs. {formatMoney(sale.subtotal)}
                            </div>
                            <div className="text-xs text-green-700">
                              +Rs. {formatMoney(sale.totalProfit)} profit
                            </div>
                          </div>
                        </div>

                        {/* Items in this sale */}
                        <div className="space-y-1">
                          {sale.items.map((item: any, itemIdx: number) => (
                            <div
                              key={itemIdx}
                              className="flex justify-between items-center text-xs bg-white p-2 rounded border"
                            >
                              <div className="flex-1">
                                <span className="font-medium">
                                  {item.itemName}
                                </span>
                                <span className="text-gray-500 ml-1">
                                  {formatWholeNumber(item.quantity)}
                                  {item.unitShortForm} x Rs. {formatMoney(item.pricePerUnit)}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  Rs. {formatMoney(item.totalPrice)}
                                </div>
                                <div className="text-green-600">
                                  +Rs. {formatMoney(item.profit)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {monthSales.length === 0 && !loading && (
            <Card className="border-2 border-dashed">
              <CardContent className="pt-8 pb-8 text-center">
                <p className="text-muted-foreground">
                  No sales data for this month
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
