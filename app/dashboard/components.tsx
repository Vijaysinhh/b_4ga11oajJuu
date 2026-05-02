'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { useDashboardStats, useItems } from '@/hooks/use-db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

export function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const { t } = useLanguage();
  const stats = useDashboardStats();
  const { items, isLoading } = useItems();
  const [isClientReady, setIsClientReady] = useState(false);

  // Check if component is mounted on client
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show header immediately with loading state for content
  // This prevents blank screen and improves perceived performance
  if (!isClientReady || authLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Loading your shop data...</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2 animate-pulse">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Get low stock items
  const lowStockItems = items.filter((item) => item.quantity <= item.lowStockLimit);

  // Top 5 items by margin
  const topMarginItems = [...items]
    .sort((a, b) => (b.marginPercent || 0) - (a.marginPercent || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Shop: {user?.shopName}</p>
      </div>

      {/* Stats Cards - 2x2 Grid Mobile First */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-base font-semibold">{t('total_items')}</CardTitle>
            <Package className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Products</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-base font-semibold">{t('low_stock_items')}</CardTitle>
            <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Low stock</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-base font-semibold">{t('total_value')}</CardTitle>
            <DollarSign className="h-4 sm:h-5 w-4 sm:w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-3xl font-bold">₹{stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Stock Value</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-base font-semibold">{t('avg_margin') || 'Avg Margin'}</CardTitle>
            <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats.avgMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Average Margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Margin Items */}
      {topMarginItems.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg">Top High Margin Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topMarginItems.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex-1">
                    <p className="font-bold text-base">{idx + 1}. {item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">₹{(item.marginAmount || 0).toFixed(0)} profit/unit</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700 text-lg">{(item.marginPercent || 0).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 border-2 border-orange-300 rounded">
                  <div className="flex-1">
                    <p className="font-bold text-base text-orange-900">{item.name}</p>
                    <p className="text-xs text-orange-700 mt-0.5">Min: {item.lowStockLimit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600 text-lg">{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">No items yet. Go to Items tab to add products.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
