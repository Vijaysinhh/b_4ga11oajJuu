'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { useLanguage } from '@/providers/language-provider';
import { useDashboardStats, useItems, useSales, useUdhari } from '@/hooks/use-db';
import { downloadSimplePdf, type PdfSection } from '@/lib/simple-pdf';
import { formatMoney, formatPercent, formatWholeNumber } from '@/lib/number-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileDown, Package, TrendingUp, WalletCards } from 'lucide-react';

type ReportKey = 'today' | 'month' | 'sixMonths' | 'year';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

export function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const { t, language } = useLanguage();
  const stats = useDashboardStats();
  const { items } = useItems();
  const { sales } = useSales();
  const { totalPending } = useUdhari();
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.quantity <= item.lowStockLimit),
    [items],
  );

  const reportData = useMemo(() => {
    const now = new Date();
    const today = dateKey(now);
    const thisMonth = monthKey(now);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthStart = dateKey(sixMonthsAgo);
    const thisYear = `${now.getFullYear()}`;

    const makeReport = (labelKey: string, key: ReportKey, filteredSales: typeof sales) => {
      const itemMap = new Map<string, { quantity: number; revenue: number; profit: number }>();

      for (const sale of filteredSales) {
        for (const item of sale.items || []) {
          const existing = itemMap.get(item.itemName) || { quantity: 0, revenue: 0, profit: 0 };
          itemMap.set(item.itemName, {
            quantity: existing.quantity + Number(item.quantity || 0),
            revenue: existing.revenue + Number(item.totalPrice || 0),
            profit: existing.profit + Number(item.profit || 0),
          });
        }
      }

      const revenue = filteredSales.reduce((sum, sale) => sum + sale.subtotal, 0);
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
        topItems: Array.from(itemMap.entries())
          .map(([name, value]) => ({ name, ...value }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
      };
    };

    return [
      makeReport('today', 'today', sales.filter((sale) => sale.date === today)),
      makeReport('this_month', 'month', sales.filter((sale) => sale.date.startsWith(thisMonth))),
      makeReport('six_months', 'sixMonths', sales.filter((sale) => sale.date >= sixMonthStart)),
      makeReport('this_year', 'year', sales.filter((sale) => sale.date.startsWith(thisYear))),
    ];
  }, [sales, t]);

  const todayReport = reportData[0];
  const topMarginItems = useMemo(
    () => [...items].sort((a, b) => (b.marginPercent || 0) - (a.marginPercent || 0)).slice(0, 4),
    [items],
  );

  const handleDownloadReport = (report: (typeof reportData)[number]) => {
    const sections: PdfSection[] = [
      {
        heading: 'Summary',
        rows: [
          ['Transactions', `${report.transactions}`],
          ['Sales', `Rs. ${formatMoney(report.revenue)}`],
          ['Profit', `Rs. ${formatMoney(report.profit)}`],
          ['Margin', `${formatPercent(report.margin)}%`],
          ['Pending Udhari', `Rs. ${formatMoney(totalPending)}`],
          ['Low Stock Items', `${lowStockItems.length}`],
        ],
      },
      {
        heading: 'Top Items',
        rows: report.topItems.length
          ? report.topItems.map((item) => [
              item.name,
              `${formatWholeNumber(item.quantity)} sold, Rs. ${formatMoney(item.revenue)} sales`,
            ])
          : [['Items', 'No sales in this period']],
      },
      {
        heading: 'Stock Alerts',
        rows: lowStockItems.length
          ? lowStockItems.slice(0, 8).map((item) => [
              item.name,
              `${item.quantity} left, limit ${item.lowStockLimit}`,
            ])
          : [['Low Stock', 'No low stock items']],
      },
    ];

    downloadSimplePdf({
      title: `Dukan ${report.label} Report`,
      subtitle: user?.shopName || 'Shop report',
      sections,
      fileName: `dukan-${report.key}-report.pdf`,
    });
  };

  if (!isClientReady || authLoading) {
    return (
      <div className="space-y-6 pb-24 sm:pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('home')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('loading_shop_data')}</p>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('home')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.shopName || 'Shop'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('today_sales')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {formatMoney(todayReport.revenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{todayReport.transactions} {t('transactions')}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('today_profit')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {formatMoney(todayReport.profit)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{formatPercent(todayReport.margin)}% {t('margin')}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('udhari')}</CardTitle>
            <WalletCards className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {formatMoney(totalPending)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t('pending')}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('low_stock_label')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{stats.totalItems} {t('products')}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{t('reports')}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {reportData.map((report) => (
            <Card key={report.key} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{report.label}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{report.transactions} {t('transactions')}</p>
                  </div>
                  <Button
                    onClick={() => handleDownloadReport(report)}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {t('pdf_report')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sale')}</p>
                    <p className="font-bold">Rs. {formatMoney(report.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('profit_amount')}</p>
                    <p className="font-bold text-green-700">Rs. {formatMoney(report.profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('margin')}</p>
                    <p className="font-bold">{formatPercent(report.margin)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {topMarginItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t('high_margin_items')}</h2>
          <div className="grid gap-2">
            {topMarginItems.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border bg-green-50 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{index + 1}. {language === 'mr' && item.nameMarathi ? item.nameMarathi : item.name}</p>
                  <p className="text-xs text-green-800">Rs. {formatMoney(item.marginAmount || 0)} {t('profit_amount')}/{t('unit')}</p>
                </div>
                <p className="font-bold text-green-700">{formatPercent(item.marginPercent || 0)}%</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {lowStockItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t('stock_needed')}</h2>
          <div className="grid gap-2">
            {lowStockItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-orange-950">{language === 'mr' && item.nameMarathi ? item.nameMarathi : item.name}</p>
                  <p className="text-xs text-orange-800">{t('low_stock_limit_label')} {item.lowStockLimit}</p>
                </div>
                <p className="font-bold text-orange-700">
                  {item.quantity} {t('quantity')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('no_items_yet')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

