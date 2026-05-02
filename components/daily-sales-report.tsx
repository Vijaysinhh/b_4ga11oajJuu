'use client';

import { useEffect, useState } from 'react';
import { useSales, useItems } from '@/hooks/use-db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, DollarSign, Zap } from 'lucide-react';
import Link from 'next/link';

export function DailySalesReport() {
  const { getDailySummary } = useSales();
  const { items } = useItems();
  const [dailyData, setDailyData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const summary = await getDailySummary(selectedDate);
        setDailyData(summary);
      } catch (error) {
        console.error('[v0] Error fetching daily summary:', error);
        setDailyData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!dailyData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 px-3 py-2 border rounded-lg w-full sm:w-auto"
          />
        </div>
        <Link href="/sales" className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-9">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyData.totalSales}</div>
            <p className="text-xs text-gray-500 mt-1">Sales completed</p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">₹{dailyData.totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-blue-600 mt-1">Amount earned</p>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">₹{dailyData.totalProfit.toFixed(0)}</div>
            <p className="text-xs text-green-600 mt-1">Pure profit</p>
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{dailyData.profitMarginPercent.toFixed(1)}%</div>
            <p className="text-xs text-purple-600 mt-1">% of revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Revenue</span>
              <span className="font-bold">₹{dailyData.totalRevenue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center text-red-700">
              <span>Total Cost</span>
              <span className="font-bold">-₹{dailyData.totalCost.toFixed(0)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold">Net Profit</span>
              <span className="font-bold text-green-700">₹{dailyData.totalProfit.toFixed(0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      {dailyData.sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Transactions Today</CardTitle>
            <CardDescription>{dailyData.sales.length} sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dailyData.sales.map((sale: any, idx: number) => (
                <div key={sale.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium">Sale #{idx + 1}</div>
                    <div className="text-xs text-gray-500">{sale.items.length} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{sale.subtotal.toFixed(0)}</div>
                    <div className="text-xs text-green-700">+₹{sale.totalProfit.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dailyData.sales.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-gray-500">No sales recorded for {selectedDate}</p>
        </Card>
      )}
    </div>
  );
}
