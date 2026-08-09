"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BadgeIndianRupee,
  BarChart3,
  Boxes,
  CreditCard,
  Printer,
  Scale,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  useBatches,
  useCategories,
  useItems,
  useSales,
  useStockHistory,
  useUdhari,
} from "@/hooks/use-supabase";
import { getCreditPressure } from "@/lib/dukan-insights";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent } from "@/lib/number-format";
import { cn, dateKey } from "@/lib/utils";

type Period = "today" | "month" | "sixMonths" | "year" | "specificMonth";
type Tone = "green" | "amber" | "red" | "blue" | "purple" | "slate";
export type ReportSection = "overview" | "sales" | "stock" | "udhari";

const copy = {
  en: {
    title: "Business Report",
    description: "Clear sales, profit, stock, payment, and udhari insights.",
    print: "Print / Save",
    today: "Today",
    sixMonths: "6 months",
    specificMonth: "Specific month",
    month: "This month",
    year: "This year",
    totalStock: "Total stock value",
    cashCredit: "Cash vs credit sales",
    netProfit: "Net profit",
    margin: "Profit margin",
    cash: "Cash",
    credit: "Credit",
    partial: "Partial",
    averageBill: "Average bill",
    unitsSold: "Units sold",
    salesTrend: "Sales trend",
    categoryPerformance: "Category performance",
    inventoryExposure: "Inventory exposure",
    stockMovement: "Stock movement",
    purchased: "Purchased",
    damaged: "Damaged",
    expired: "Expired",
    expiredLoss: "Expired loss",
    expiredProducts: "Expired products",
    damagedLoss: "Damage loss",
    pendingTotal: "Total pending",
    oldestDebt: "Oldest pending",
    salesStory: "Sales story",
    profitStory: "Profit story",
    stockStory: "Stock story",
    brandComparison: "Brand comparison",
    udhariRecovery: "Udhari recovery",
    rawExplore: "Raw data overview",
    topSellers: "Top sellers",
    paymentSplit: "Payment split",
    highMargin: "High-margin items",
    lowMargin: "Low-margin watch",
    lowStock: "Restock soon",
    expiry: "Expiry watch",
    noData: "No useful data yet for this period.",
    noBrands:
      "Add the same product under multiple brands to compare performance.",
    collectFirst: "Collect first",
    stockOk: "Stock is mostly okay.",
    item: "Item",
    sales: "Sales",
    profit: "Profit",
    stock: "Stock",
    brand: "Brand",
    customer: "Customer",
    balance: "Balance",
    quantity: "Qty",
    comparison: "vs previous period",
    salesChange: "Sales change",
    profitChange: "Profit change",
    lossChange: "Loss change",
    insight: "Owner insight",
    billRegister: "Bill register",
    bill: "Bill",
    date: "Date",
    payment: "Payment",
    aging: "Aging overview",
    customers: "Customers",
    collected: "Collected",
    creditGiven: "Credit given",
    collectionRate: "Collection rate",
    days: "days",
    profitContribution: "Profit contribution",
    slowStock: "Slow-moving stock",
    deadStock: "No recent sales",
    stockAtRisk: "Stock value at risk",
    reviewStock: "Review, discount, or bundle these products.",
    lossBreakdown: "Loss by product",
    lossBreakdownHint: "Find the products responsible for realized stock loss.",
    marginLeak: "High sales, low profit",
    marginLeakHint: "These products bring revenue but weaken your margin.",
  },
  mr: {
    title: "व्यवसाय अहवाल",
    description:
      "विक्री, नफा, स्टॉक, ब्रँड आणि उधारी यासाठी सोपा निर्णय अहवाल.",
    print: "प्रिंट / सेव्ह",
    today: "आज",
    sixMonths: "६ महिने",
    specificMonth: "निवडलेला महिना",
    month: "हा महिना",
    year: "हे वर्ष",
    totalStock: "एकूण स्टॉक मूल्य",
    cashCredit: "रोख विरुद्ध उधारी विक्री",
    netProfit: "निव्वळ नफा",
    margin: "नफा मार्जिन",
    cash: "रोख",
    credit: "उधारी",
    partial: "अंशतः",
    averageBill: "सरासरी बिल",
    unitsSold: "विकलेले युनिट",
    salesTrend: "विक्रीचा ट्रेंड",
    categoryPerformance: "वर्गनिहाय विक्री",
    inventoryExposure: "स्टॉक स्थिती",
    stockMovement: "स्टॉक हालचाल",
    purchased: "खरेदी",
    damaged: "नुकसान",
    expired: "कालबाह्य",
    expiredLoss: "कालबाह्य नुकसान",
    expiredProducts: "कालबाह्य वस्तू",
    damagedLoss: "नुकसान मूल्य",
    pendingTotal: "एकूण बाकी",
    oldestDebt: "सर्वात जुनी बाकी",
    salesStory: "विक्रीची गोष्ट",
    profitStory: "नफ्याची गोष्ट",
    stockStory: "स्टॉकची गोष्ट",
    brandComparison: "ब्रँड तुलना",
    udhariRecovery: "उधारी वसुली",
    rawExplore: "डेटा आढावा",
    topSellers: "सर्वाधिक विक्री",
    paymentSplit: "पेमेंट वाटा",
    highMargin: "जास्त मार्जिन वस्तू",
    lowMargin: "कमी मार्जिन लक्ष",
    lowStock: "लवकर स्टॉक भरा",
    expiry: "कालबाह्य लक्ष",
    noData: "या कालावधीसाठी अजून उपयोगी डेटा नाही.",
    noBrands: "तुलनेसाठी एकाच उत्पादनाचे वेगवेगळे ब्रँड जोडा.",
    collectFirst: "आधी वसूल करा",
    stockOk: "स्टॉक बऱ्यापैकी ठीक आहे.",
    item: "वस्तू",
    sales: "विक्री",
    profit: "नफा",
    stock: "स्टॉक",
    brand: "ब्रँड",
    customer: "ग्राहक",
    balance: "बाकी",
    quantity: "प्रमाण",
    comparison: "मागील कालावधीशी तुलना",
    salesChange: "विक्री बदल",
    profitChange: "नफा बदल",
    lossChange: "तोटा बदल",
    insight: "मालकासाठी निरीक्षण",
    billRegister: "बिल नोंद",
    bill: "बिल",
    date: "दिनांक",
    payment: "पेमेंट",
    aging: "बाकी वयाचा आढावा",
    customers: "ग्राहक",
    collected: "वसूल",
    creditGiven: "दिलेली उधारी",
    collectionRate: "वसुली दर",
    days: "दिवस",
    profitContribution: "नफ्यातील योगदान",
    slowStock: "हळू विकला जाणारा स्टॉक",
    deadStock: "अलीकडील विक्री नाही",
    stockAtRisk: "धोक्यातील स्टॉक मूल्य",
    reviewStock: "या वस्तूंचा आढावा घ्या, सवलत द्या किंवा बंडल करा.",
    lossBreakdown: "वस्तूनुसार तोटा",
    lossBreakdownHint: "झालेला स्टॉक तोटा कोणत्या वस्तूंमुळे झाला ते पहा.",
    marginLeak: "जास्त विक्री, कमी नफा",
    marginLeakHint: "या वस्तू विक्री आणतात पण मार्जिन कमी करतात.",
  },
} as const;

function money(value: number | undefined | null) {
  return `₹${formatMoney(value)}`;
}

function pct(value: number | undefined | null) {
  return `${formatPercent(value)}%`;
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getPeriodStart(
  period: Period,
  selectedDate: string,
  selectedMonth: string,
) {
  const start = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "month") start.setDate(1);
  if (period === "sixMonths") {
    start.setMonth(start.getMonth() - 5, 1);
  }
  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  if (period === "specificMonth" && selectedMonth) {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  return start;
}

function inPeriod(
  date: string | undefined,
  period: Period,
  selectedDate: string,
  selectedMonth: string,
) {
  if (!date) return false;
  if (period === "today") return date === selectedDate;
  if (period === "specificMonth" && selectedMonth) {
    return date.startsWith(selectedMonth);
  }
  const saleDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(saleDate.getTime())) return false;
  return saleDate >= getPeriodStart(period, selectedDate, selectedMonth);
}

function getPreviousPeriodSales(
  sales: any[],
  period: Period,
  selectedDate: string,
  selectedMonth: string,
) {
  const anchor = new Date(`${selectedDate}T12:00:00`);
  const start = getPeriodStart(period, selectedDate, selectedMonth);
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  const duration = Math.max(
    end.getTime() - start.getTime(),
    24 * 60 * 60 * 1000,
  );
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return sales.filter((sale: any) => {
    const saleDate = new Date(`${sale.date}T12:00:00`);
    return saleDate >= previousStart && saleDate <= previousEnd;
  });
}

function textFor(language: "en" | "mr", en: string, mr: string) {
  return language === "mr" ? mr : en;
}

function metricToneClasses(tone: Tone) {
  const tones = {
    green:
      "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/20 dark:text-green-100",
    amber:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100",
    red: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-100",
    blue: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100",
    purple:
      "border-purple-200 bg-purple-50 text-purple-950 dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-100",
    slate:
      "border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-100",
  };
  return tones[tone];
}

function MetricCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  icon: typeof BadgeIndianRupee;
}) {
  return (
    <Card className={cn("gap-3 border-2 py-4", metricToneClasses(tone))}>
      <CardContent className="space-y-2 px-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium opacity-75">{label}</p>
          <Icon className="h-4 w-4 opacity-70" />
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs opacity-75">{note}</p>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function PaymentPie({
  cash,
  online,
  partial,
  credit,
  labels,
}: {
  cash: number;
  online: number;
  partial: number;
  credit: number;
  labels: { cash: string; online: string; partial: string; credit: string };
}) {
  const total = Math.max(cash + online + partial + credit, 1);
  const cashDeg = (cash / total) * 360;
  const onlineDeg = cashDeg + (online / total) * 360;
  const partialDeg = onlineDeg + (partial / total) * 360;
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card/80 p-4">
      <div
        className="h-28 w-28 shrink-0 rounded-full border"
        style={{
          background: `conic-gradient(#16a34a 0deg ${cashDeg}deg, #2563eb ${cashDeg}deg ${onlineDeg}deg, #a855f7 ${onlineDeg}deg ${partialDeg}deg, #f97316 ${partialDeg}deg 360deg)`,
        }}
      />
      <div className="grid flex-1 gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
            {labels.cash}
          </span>
          <strong>
            {money(cash)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({pct((cash / total) * 100)})
            </span>
          </strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            {labels.partial}
          </span>
          <strong>
            {money(partial)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({pct((partial / total) * 100)})
            </span>
          </strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            {labels.online}
          </span>
          <strong>
            {money(online)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({pct((online / total) * 100)})
            </span>
          </strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            {labels.credit}
          </span>
          <strong>
            {money(credit)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({pct((credit / total) * 100)})
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
}

export function ReportsDashboard({
  section = "overview",
}: {
  section?: ReportSection;
}) {
  const { currentShopId, currentShop } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const t = copy[language];
  const periodParam = searchParams.get("period") as Period | null;
  const period: Period =
    periodParam === "today" ||
    periodParam === "month" ||
    periodParam === "sixMonths" ||
    periodParam === "year" ||
    periodParam === "specificMonth"
      ? periodParam
      : "month";
  const selectedDate = searchParams.get("date") || dateKey(new Date());
  const selectedMonth =
    searchParams.get("month") ||
    selectedDate.slice(0, 7) ||
    dateKey(new Date()).slice(0, 7);
  const periodLabel =
    period === "specificMonth"
      ? new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString(
          language === "mr" ? "mr-IN" : "en-IN",
          { month: "long", year: "numeric" },
        )
      : t[period];
  const query = searchParams.toString();
  const sectionLinks: Array<[ReportSection, string]> = [
    ["overview", textFor(language, "Overview", "आढावा")],
    ["sales", textFor(language, "Sales", "विक्री")],
    ["stock", textFor(language, "Stock", "स्टॉक")],
    ["udhari", textFor(language, "Udhari", "उधारी")],
  ];

  const { items, isLoading: itemsLoading } = useItems(currentShopId);
  const { categories, isLoading: categoriesLoading } =
    useCategories(currentShopId);
  const { sales, isLoading: salesLoading } = useSales(currentShopId);
  const {
    customers,
    entries: udhariEntries,
    totalPending,
    isLoading: udhariLoading,
  } = useUdhari(currentShopId);
  const { batches, isLoading: batchesLoading } = useBatches(currentShopId);
  const { stockHistory, isLoading: stockHistoryLoading } =
    useStockHistory(currentShopId);

  const report = useMemo(() => {
    const periodSales = sales.filter((sale: any) =>
      inPeriod(sale.date, period, selectedDate, selectedMonth),
    );
    const previousSales = getPreviousPeriodSales(
      sales,
      period,
      selectedDate,
      selectedMonth,
    );
    const revenue = periodSales.reduce(
      (sum: number, sale: any) => sum + safeNumber(sale.subtotal),
      0,
    );
    const cost = periodSales.reduce(
      (sum: number, sale: any) => sum + safeNumber(sale.totalCost),
      0,
    );
    const profit = periodSales.reduce(
      (sum: number, sale: any) =>
        sum +
        safeNumber(
          sale.totalProfit ??
            safeNumber(sale.subtotal) - safeNumber(sale.totalCost),
        ),
      0,
    );
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const previousRevenue = previousSales.reduce(
      (sum: number, sale: any) => sum + safeNumber(sale.subtotal),
      0,
    );
    const previousProfit = previousSales.reduce(
      (sum: number, sale: any) => sum + safeNumber(sale.totalProfit),
      0,
    );
    const unitsSold = periodSales.reduce(
      (sum: number, sale: any) =>
        sum +
        (sale.items || []).reduce(
          (lineSum: number, line: any) => lineSum + safeNumber(line.quantity),
          0,
        ),
      0,
    );
    const averageBill =
      periodSales.length > 0 ? revenue / periodSales.length : 0;
    const dailySales = new Map<
      string,
      { revenue: number; profit: number; transactions: number }
    >();
    periodSales.forEach((sale: any) => {
      const current = dailySales.get(sale.date) || {
        revenue: 0,
        profit: 0,
        transactions: 0,
      };
      current.revenue += safeNumber(sale.subtotal);
      current.profit += safeNumber(sale.totalProfit);
      current.transactions += 1;
      dailySales.set(sale.date, current);
    });
    const salesTrend = Array.from(dailySales.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, values]) => ({ date, ...values }));
    const amountByPayment = (methods: string[]) =>
      periodSales
        .filter((sale: any) => methods.includes(String(sale.paymentMethod)))
        .reduce((sum: number, sale: any) => sum + safeNumber(sale.subtotal), 0);
    const cashSales = amountByPayment(["cash"]);
    const partialSales = amountByPayment(["partial"]);
    const creditSales = amountByPayment(["udhar", "udhari"]);
    const totalStockValue = items.reduce(
      (sum: number, item: any) =>
        sum + safeNumber(item.quantity) * safeNumber(item.buyPrice),
      0,
    );
    const lowStock = items
      .filter(
        (item: any) =>
          safeNumber(item.quantity) <= safeNumber(item.lowStockLimit),
      )
      .sort(
        (a: any, b: any) => safeNumber(a.quantity) - safeNumber(b.quantity),
      );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiring = batches
      .filter((batch: any) => {
        if (batch.status === "expired" || batch.status === "expiring")
          return true;
        if (!batch.expiryDate) return false;
        const expiryDate = new Date(batch.expiryDate);
        return !Number.isNaN(expiryDate.getTime()) && expiryDate <= today;
      })
      .slice(0, 5);
    const expiredBatches = batches.filter(
      (batch: any) => batch.status === "expired",
    );
    const expiredProductCount = new Set(
      expiredBatches.map((batch: any) => Number(batch.itemId ?? batch.item_id)),
    ).size;
    const badStockValue = expiredBatches.reduce(
      (sum: number, batch: any) =>
        sum +
        safeNumber(batch.quantityAvailable ?? batch.quantity_available) *
          safeNumber(batch.costPerUnit ?? batch.cost_per_unit),
      0,
    );
    const expiringStockValue = batches
      .filter((batch: any) => batch.status === "expiring")
      .reduce(
        (sum: number, batch: any) =>
          sum +
          safeNumber(batch.quantityAvailable ?? batch.quantity_available) *
            safeNumber(batch.costPerUnit ?? batch.cost_per_unit),
        0,
      );
    const stockMovement = stockHistory.reduce(
      (
        summary: {
          purchased: number;
          damaged: number;
          expired: number;
          damagedValue: number;
          expiredValue: number;
        },
        entry: any,
      ) => {
        const quantity = Math.abs(safeNumber(entry.quantityChanged));
        if (entry.type === "purchase") summary.purchased += quantity;
        if (entry.type === "damage") {
          summary.damaged += quantity;
          summary.damagedValue += quantity * safeNumber(entry.costPerUnit);
        }
        if (entry.type === "expiry") {
          summary.expired += quantity;
          summary.expiredValue += quantity * safeNumber(entry.costPerUnit);
        }
        return summary;
      },
      {
        purchased: 0,
        damaged: 0,
        expired: 0,
        damagedValue: 0,
        expiredValue: 0,
      },
    );
    const onlineSales = amountByPayment(["card", "upi", "online"]);
    const realizedLoss = badStockValue + stockMovement.damagedValue;
    const previousPeriod = {
      revenue: previousRevenue,
      profit: previousProfit,
      margin:
        previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0,
    };
    const percentChange = (current: number, previous: number) =>
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) / Math.abs(previous)) * 100;
    const agingBuckets = [
      { label: "0-15", amount: 0, customers: 0 },
      { label: "16-30", amount: 0, customers: 0 },
      { label: "31-60", amount: 0, customers: 0 },
      { label: "60+", amount: 0, customers: 0 },
    ];
    customers
      .filter((customer: any) => safeNumber(customer.balance) > 0)
      .forEach((customer: any) => {
        const daysPending = getCreditPressure(
          Number(customer.id),
          safeNumber(customer.balance),
          udhariEntries,
        ).daysPending;
        const bucket =
          daysPending <= 15
            ? agingBuckets[0]
            : daysPending <= 30
              ? agingBuckets[1]
              : daysPending <= 60
                ? agingBuckets[2]
                : agingBuckets[3];
        bucket.amount += safeNumber(customer.balance);
        bucket.customers += 1;
      });
    const periodCreditEntries = udhariEntries.filter((entry: any) =>
      inPeriod(entry.date, period, selectedDate, selectedMonth),
    );
    const creditGiven = periodCreditEntries
      .filter((entry: any) => entry.type === "credit")
      .reduce((sum: number, entry: any) => sum + safeNumber(entry.amount), 0);
    const collected = periodCreditEntries
      .filter((entry: any) => entry.type === "payment")
      .reduce((sum: number, entry: any) => sum + safeNumber(entry.amount), 0);

    const itemSales = new Map<string, any>();
    const categorySales = new Map<
      string,
      { name: string; revenue: number; profit: number; quantity: number }
    >();
    const categoryLookup = new Map(
      categories.map((category: any) => [Number(category.id), category]),
    );
    const lossByProduct = new Map<
      string,
      {
        name: string;
        category: string;
        value: number;
        quantity: number;
        reasons: Set<string>;
      }
    >();
    const addLoss = (
      itemId: unknown,
      itemName: string,
      quantity: number,
      value: number,
      reason: string,
    ) => {
      const item = items.find(
        (candidate: any) => Number(candidate.id) === Number(itemId),
      );
      const category = categoryLookup.get(Number(item?.categoryId));
      const name =
        item?.name ||
        itemName ||
        textFor(language, "Unknown item", "अज्ञात वस्तू");
      const current = lossByProduct.get(name) || {
        name,
        category:
          category?.name || textFor(language, "Uncategorized", "वर्गीकृत नाही"),
        value: 0,
        quantity: 0,
        reasons: new Set<string>(),
      };
      current.value += value;
      current.quantity += quantity;
      current.reasons.add(reason);
      lossByProduct.set(name, current);
    };
    expiredBatches.forEach((batch: any) => {
      const quantity = safeNumber(
        batch.quantityAvailable ?? batch.quantity_available,
      );
      addLoss(
        batch.itemId ?? batch.item_id,
        batch.itemName || batch.item_name,
        quantity,
        quantity * safeNumber(batch.costPerUnit ?? batch.cost_per_unit),
        "expired",
      );
    });
    stockHistory.forEach((entry: any) => {
      if (entry.type !== "damage") return;
      const quantity = Math.abs(safeNumber(entry.quantityChanged));
      addLoss(
        entry.itemId,
        entry.itemName,
        quantity,
        quantity * safeNumber(entry.costPerUnit),
        entry.type,
      );
    });
    const lossByProductList = Array.from(lossByProduct.values())
      .map((entry) => ({ ...entry, reasons: Array.from(entry.reasons) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    periodSales.forEach((sale: any) => {
      (sale.items || []).forEach((line: any) => {
        const key = String(line.itemId || line.itemName);
        const item = items.find(
          (candidate: any) => Number(candidate.id) === Number(line.itemId),
        );
        const current = itemSales.get(key) || {
          name: line.itemName || "Item",
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
        current.quantity += safeNumber(line.quantity);
        current.revenue += safeNumber(line.totalPrice);
        current.profit += safeNumber(
          line.profit ??
            safeNumber(line.totalPrice) - safeNumber(line.totalCost),
        );
        itemSales.set(key, current);
        const category = categoryLookup.get(Number(item?.categoryId));
        const categoryName =
          category?.name || textFor(language, "Uncategorized", "वर्गीकृत नाही");
        const categoryCurrent = categorySales.get(categoryName) || {
          name: categoryName,
          revenue: 0,
          profit: 0,
          quantity: 0,
        };
        categoryCurrent.revenue += safeNumber(line.totalPrice);
        categoryCurrent.profit += safeNumber(
          line.profit ??
            safeNumber(line.totalPrice) - safeNumber(line.totalCost),
        );
        categoryCurrent.quantity += safeNumber(line.quantity);
        categorySales.set(categoryName, categoryCurrent);
      });
    });
    const performance = Array.from(itemSales.values()).map((item) => ({
      ...item,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      contribution: profit > 0 ? (item.profit / profit) * 100 : 0,
    }));
    const topSellers = [...performance]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const highMargin = [...performance]
      .filter((item) => item.revenue > 0 && item.margin >= 15)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    const lowMargin = [...performance]
      .filter((item) => item.revenue > 0 && item.margin < 10)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 5);
    const marginLeaks = [...performance]
      .filter((item) => item.revenue > 0 && item.margin < 10)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const itemLastSold = new Map<number, string>();
    sales.forEach((sale: any) => {
      (sale.items || []).forEach((line: any) => {
        if (!line.itemId) return;
        const current = itemLastSold.get(Number(line.itemId));
        if (!current || String(sale.date) > current) {
          itemLastSold.set(Number(line.itemId), String(sale.date));
        }
      });
    });
    const todayKey = dateKey(new Date());
    const slowStock = items
      .filter((item: any) => safeNumber(item.quantity) > 0)
      .map((item: any) => {
        const lastSold = itemLastSold.get(Number(item.id));
        const daysSinceSale = lastSold
          ? Math.max(
              0,
              Math.floor(
                (new Date(`${todayKey}T12:00:00`).getTime() -
                  new Date(`${lastSold}T12:00:00`).getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : null;
        return {
          ...item,
          lastSold,
          daysSinceSale,
          stockValue: safeNumber(item.quantity) * safeNumber(item.buyPrice),
          potentialProfit:
            safeNumber(item.quantity) *
            (safeNumber(item.sellPrice) - safeNumber(item.buyPrice)),
        };
      })
      .filter(
        (item: any) => item.daysSinceSale === null || item.daysSinceSale >= 30,
      )
      .sort((a: any, b: any) => b.stockValue - a.stockValue)
      .slice(0, 8);
    const stockAtRiskValue = slowStock.reduce(
      (sum: number, item: any) => sum + item.stockValue,
      0,
    );

    const itemLookup = new Map(
      items.map((item: any) => [Number(item.id), item]),
    );
    const productGroups = new Map<string, any>();
    items.forEach((item: any) => {
      const key = String(item.name || item.nameMarathi || "")
        .trim()
        .toLowerCase();
      if (!key) return;
      const group = productGroups.get(key) || {
        name:
          language === "mr"
            ? item.nameMarathi || item.name
            : item.name || item.nameMarathi,
        brands: new Map<string, any>(),
      };
      const brand =
        language === "mr"
          ? item.brandMarathi || item.brand || "ब्रँड नाही"
          : item.brand || item.brandMarathi || "No brand";
      group.brands.set(brand, {
        brand,
        revenue: 0,
        profit: 0,
        quantity: 0,
        margin: 0,
      });
      productGroups.set(key, group);
    });
    periodSales.forEach((sale: any) => {
      (sale.items || []).forEach((line: any) => {
        const item = itemLookup.get(Number(line.itemId));
        if (!item) return;
        const key = String(item.name || item.nameMarathi || "")
          .trim()
          .toLowerCase();
        const group = productGroups.get(key);
        if (!group) return;
        const brand =
          language === "mr"
            ? item.brandMarathi || item.brand || "ब्रँड नाही"
            : item.brand || item.brandMarathi || "No brand";
        const brandData = group.brands.get(brand);
        if (!brandData) return;
        brandData.revenue += safeNumber(line.totalPrice);
        brandData.profit += safeNumber(
          line.profit ??
            safeNumber(line.totalPrice) - safeNumber(line.totalCost),
        );
        brandData.quantity += safeNumber(line.quantity);
        brandData.margin =
          brandData.revenue > 0
            ? (brandData.profit / brandData.revenue) * 100
            : 0;
      });
    });
    const brandComparisons = Array.from(productGroups.values())
      .map((group) => ({
        ...group,
        brands: Array.from(group.brands.values()).sort(
          (a: any, b: any) => b.revenue - a.revenue,
        ),
      }))
      .filter((group) => group.brands.length >= 2)
      .sort(
        (a, b) =>
          b.brands.reduce((sum: number, brand: any) => sum + brand.revenue, 0) -
          a.brands.reduce((sum: number, brand: any) => sum + brand.revenue, 0),
      )
      .slice(0, 4);

    const topCustomers = [...customers]
      .filter((customer: any) => safeNumber(customer.balance) > 0)
      .sort((a: any, b: any) => safeNumber(b.balance) - safeNumber(a.balance))
      .slice(0, 5);
    const creditFrequency = new Map<
      number,
      { customer: any; count: number; amount: number }
    >();
    udhariEntries
      .filter((entry: any) => entry.type === "credit")
      .forEach((entry: any) => {
        const customer = customers.find(
          (item: any) => Number(item.id) === Number(entry.customerId),
        );
        if (!customer) return;
        const current = creditFrequency.get(Number(customer.id)) || {
          customer,
          count: 0,
          amount: 0,
        };
        current.count += 1;
        current.amount += safeNumber(entry.amount);
        creditFrequency.set(Number(customer.id), current);
      });
    const frequentCreditCustomers = Array.from(creditFrequency.values())
      .sort((a, b) => b.count - a.count || b.amount - a.amount)
      .slice(0, 3);
    const longPendingCustomers = [...customers]
      .filter((customer: any) => safeNumber(customer.balance) > 0)
      .map((customer: any) => ({
        ...customer,
        creditPressure: getCreditPressure(
          Number(customer.id),
          safeNumber(customer.balance),
          udhariEntries,
        ),
      }))
      .sort(
        (a: any, b: any) =>
          b.creditPressure.daysPending - a.creditPressure.daysPending,
      )
      .slice(0, 3);

    return {
      revenue,
      profit,
      margin,
      previousPeriod,
      changes: {
        revenue: percentChange(revenue, previousRevenue),
        profit: percentChange(profit, previousProfit),
        margin: margin - previousPeriod.margin,
        loss: realizedLoss,
      },
      realizedLoss,
      agingBuckets,
      creditGiven,
      collected,
      collectionRate: creditGiven > 0 ? (collected / creditGiven) * 100 : 0,
      billRegister: [...periodSales].sort(
        (a: any, b: any) => safeNumber(b.timestamp) - safeNumber(a.timestamp),
      ),
      unitsSold,
      averageBill,
      salesTrend,
      categorySales: Array.from(categorySales.values()).sort(
        (a, b) => b.revenue - a.revenue,
      ),
      cashSales,
      partialSales,
      creditSales,
      onlineSales,
      totalStockValue,
      expiredProductCount,
      stockMovement,
      badStockValue,
      expiringStockValue,
      lowStock,
      expiring,
      topSellers,
      highMargin,
      lowMargin,
      marginLeaks,
      slowStock,
      stockAtRiskValue,
      lossByProduct: lossByProductList,
      brandComparisons,
      topCustomers,
      frequentCreditCustomers,
      longPendingCustomers,
      transactionCount: periodSales.length,
    };
  }, [
    batches,
    categories,
    customers,
    items,
    language,
    period,
    sales,
    selectedDate,
    selectedMonth,
    stockHistory,
    udhariEntries,
  ]);

  const isLoading =
    itemsLoading ||
    categoriesLoading ||
    salesLoading ||
    udhariLoading ||
    batchesLoading ||
    stockHistoryLoading;

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <PageHeader
          title={t.title}
          description={`${currentShop?.shopName || "Dukan"} · ${periodLabel}`}
        />
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {textFor(
            language,
            "Loading recorded business data...",
            "नोंदवलेला व्यवसाय डेटा लोड होत आहे...",
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title={t.title}
        description={`${currentShop?.shopName || "Dukan"} · ${periodLabel} · ${t.description}`}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        }
      />

      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1"
        aria-label={textFor(language, "Report sections", "अहवाल विभाग")}
      >
        {sectionLinks.map(([href, label]) => (
          <Link
            key={href}
            href={`/reports/${href}${query ? `?${query}` : ""}`}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              section === href
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {section === "overview" && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t.totalStock}
            value={money(report.totalStockValue)}
            note={`${formatNumber(items.length)} ${textFor(language, "items in inventory", "वस्तू स्टॉकमध्ये")}`}
            tone="purple"
            icon={Boxes}
          />
          <MetricCard
            label={t.cashCredit}
            value={`${money(report.cashSales)} / ${money(report.creditSales)}`}
            note={`${t.cash} / ${t.credit}`}
            tone={report.creditSales > report.cashSales ? "amber" : "green"}
            icon={CreditCard}
          />
          <MetricCard
            label={t.netProfit}
            value={money(report.profit)}
            note={`${formatNumber(report.transactionCount)} ${textFor(language, "bills", "बिले")}`}
            tone={report.profit >= 0 ? "green" : "red"}
            icon={TrendingUp}
          />
          <MetricCard
            label={t.margin}
            value={pct(report.margin)}
            note={`${t.sales}: ${money(report.revenue)}`}
            tone={
              report.margin >= 15
                ? "green"
                : report.margin >= 8
                  ? "amber"
                  : "red"
            }
            icon={BadgeIndianRupee}
          />
          <MetricCard
            label={t.averageBill}
            value={money(report.averageBill)}
            note={`${formatNumber(report.transactionCount)} ${textFor(language, "bills", "बिले")}`}
            tone="blue"
            icon={BarChart3}
          />
          <MetricCard
            label={t.unitsSold}
            value={formatNumber(report.unitsSold)}
            note={textFor(
              language,
              "Across sold items",
              "विकलेल्या वस्तूंमधून",
            )}
            tone="slate"
            icon={Boxes}
          />
        </section>
      )}

      {section === "overview" && (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ListCard
            title={textFor(language, "Overview", "आढावा")}
            description={textFor(
              language,
              "The most important numbers for this selected report period.",
              "निवडलेल्या कालावधीतील सर्वात महत्त्वाचे आकडे.",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t.sales}</p>
                <p className="mt-1 text-2xl font-bold">
                  {money(report.revenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t.profit}</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {money(report.profit)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t.margin}</p>
                <p className="mt-1 text-2xl font-bold">{pct(report.margin)}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{t.totalStock}</p>
                <p className="mt-1 text-2xl font-bold">
                  {money(report.totalStockValue)}
                </p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950">
                <p className="text-xs opacity-75">
                  {textFor(language, "Bad stock value", "खराब स्टॉक मूल्य")}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {money(report.badStockValue)}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <p className="text-xs opacity-75">
                  {textFor(
                    language,
                    "Going-expiry value",
                    "लवकर कालबाह्य मूल्य",
                  )}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {money(report.expiringStockValue)}
                </p>
              </div>
              <div className="rounded-2xl border border-red-300 bg-red-100 p-4 text-red-950 sm:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      {textFor(
                        language,
                        "Realized stock losses",
                        "झालेला स्टॉक तोटा",
                      )}
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {money(
                        report.badStockValue +
                          report.stockMovement.damagedValue,
                      )}
                    </p>
                    <p className="mt-1 text-xs opacity-75">
                      {t.expiredLoss} {money(report.badStockValue)} ·{" "}
                      {t.damagedLoss} {money(report.stockMovement.damagedValue)}
                    </p>
                  </div>
                  <Scale className="h-5 w-5 opacity-70" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-white/70 px-3 py-1">
                    {formatNumber(report.expiredProductCount)}{" "}
                    {t.expiredProducts}
                  </span>
                  <span className="rounded-full bg-white/70 px-3 py-1">
                    {formatNumber(report.stockMovement.expired)} {t.expired}
                  </span>
                  <span className="rounded-full bg-white/70 px-3 py-1">
                    {formatNumber(report.stockMovement.damaged)} {t.damaged}
                  </span>
                </div>
              </div>
            </div>
          </ListCard>
          <ListCard title={t.paymentSplit} description={t.cashCredit}>
            <PaymentPie
              cash={report.cashSales}
              online={report.onlineSales}
              partial={report.partialSales}
              credit={report.creditSales}
              labels={{
                cash: t.cash,
                online: textFor(language, "Online", "ऑनलाइन"),
                partial: t.partial,
                credit: t.credit,
              }}
            />
          </ListCard>
        </section>
      )}

      {section === "overview" && (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <ListCard
            title={t.comparison}
            description={textFor(
              language,
              "See whether the selected period is moving in the right direction.",
              "निवडलेला कालावधी योग्य दिशेने जात आहे का ते पहा.",
            )}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                [t.sales, report.changes.revenue, "blue"],
                [t.profit, report.changes.profit, "green"],
                [t.margin, report.changes.margin, "amber"],
              ].map(([label, change, tone]) => (
                <div key={String(label)} className="rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div
                    className={cn(
                      "mt-1 text-xl font-bold",
                      Number(change) >= 0 ? "text-emerald-700" : "text-red-700",
                    )}
                  >
                    {Number(change) >= 0 ? "+" : ""}
                    {formatNumber(Number(change))}
                    {label === t.margin ? " pts" : "%"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.comparison}
                  </div>
                </div>
              ))}
            </div>
          </ListCard>
          <ListCard
            title={t.insight}
            description={textFor(
              language,
              "A concise explanation of the selected period.",
              "निवडलेल्या कालावधीचे थोडक्यात स्पष्टीकरण.",
            )}
          >
            <p className="text-sm leading-6 text-muted-foreground">
              {report.revenue === 0
                ? t.noData
                : report.changes.profit < report.changes.revenue
                  ? textFor(
                      language,
                      "Sales grew faster than profit, so review pricing and product mix.",
                      "विक्री नफ्यापेक्षा वेगाने वाढली; किंमत आणि उत्पादन मिश्रण तपासा.",
                    )
                  : report.realizedLoss > 0
                    ? textFor(
                        language,
                        `Realized stock loss is ${money(report.realizedLoss)}. Review expiry and damage records first.`,
                        `झालेला स्टॉक तोटा ${money(report.realizedLoss)} आहे. आधी कालबाह्य आणि नुकसान नोंदी तपासा.`,
                      )
                    : textFor(
                        language,
                        "Profit is keeping pace with sales. Protect the products and categories driving the margin.",
                        "नफा विक्रीसोबत चालला आहे. मार्जिन देणाऱ्या वस्तू आणि वर्गांचा साठा जपा.",
                      )}
            </p>
          </ListCard>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {section === "sales" && (
          <>
            <div id="sales" className="scroll-mt-24">
              <ListCard title={t.salesStory} description={t.topSellers}>
                {report.topSellers.length ? (
                  report.topSellers.map((item: any) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.quantity}: {formatNumber(item.quantity)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {money(item.revenue)}
                        </div>
                        <div className="text-xs text-green-600">
                          {money(item.profit)} {t.profit} ·{" "}
                          {pct(item.contribution)} {t.profitContribution}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyLine>{t.noData}</EmptyLine>
                )}
              </ListCard>
            </div>

            <ListCard
              title={t.profitStory}
              description={`${t.highMargin} / ${t.lowMargin}`}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    {t.highMargin}
                  </Badge>
                  {report.highMargin.length ? (
                    report.highMargin.slice(0, 3).map((item: any) => (
                      <div
                        key={item.name}
                        className="rounded-xl border border-green-100 p-3 text-sm"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground">
                          {money(item.profit)} · {pct(item.margin)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyLine>{t.noData}</EmptyLine>
                  )}
                </div>
                <div className="space-y-2">
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700"
                  >
                    {t.lowMargin}
                  </Badge>
                  {report.lowMargin.length ? (
                    report.lowMargin.slice(0, 3).map((item: any) => (
                      <div
                        key={item.name}
                        className="rounded-xl border border-amber-100 p-3 text-sm"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground">
                          {money(item.profit)} · {pct(item.margin)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyLine>
                      {textFor(
                        language,
                        "No low-margin issue found.",
                        "कमी मार्जिन समस्या नाही.",
                      )}
                    </EmptyLine>
                  )}
                </div>
              </div>
            </ListCard>

            <ListCard title={t.marginLeak} description={t.marginLeakHint}>
              {report.marginLeaks.length ? (
                <div className="space-y-2">
                  {report.marginLeaks.map((item: any) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(item.quantity)} {t.quantity} ·{" "}
                          {pct(item.margin)} {t.margin}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold">
                          {money(item.revenue)}
                        </div>
                        <div className="text-xs text-red-700">
                          {money(item.profit)} {t.profit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyLine>{t.noData}</EmptyLine>
              )}
            </ListCard>

            <ListCard
              title={t.brandComparison}
              description={textFor(
                language,
                "Same product, different brands.",
                "एकच उत्पादन, वेगवेगळे ब्रँड.",
              )}
            >
              {report.brandComparisons.length ? (
                report.brandComparisons.map((group: any) => (
                  <div key={group.name} className="rounded-2xl border p-3">
                    <div className="font-semibold">{group.name}</div>
                    <div className="mt-3 grid gap-2">
                      {group.brands.slice(0, 3).map((brand: any) => (
                        <div
                          key={brand.brand}
                          className="flex items-center justify-between rounded-xl bg-muted/40 p-2 text-sm"
                        >
                          <span>{brand.brand}</span>
                          <span className="font-medium">
                            {money(brand.revenue)} · {pct(brand.margin)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyLine>{t.noBrands}</EmptyLine>
              )}
            </ListCard>

            <ListCard
              title={t.salesTrend}
              description={textFor(
                language,
                "Revenue and profit across the latest days in this period.",
                "या कालावधीतील अलीकडच्या दिवसांची विक्री आणि नफा.",
              )}
            >
              {report.salesTrend.length ? (
                <div className="space-y-3">
                  <div className="flex h-40 items-end gap-1 border-b border-border/70 px-1">
                    {report.salesTrend.map((day: any) => {
                      const maxRevenue = Math.max(
                        ...report.salesTrend.map((entry: any) => entry.revenue),
                        1,
                      );
                      return (
                        <div
                          key={day.date}
                          className="group flex h-full flex-1 items-end justify-center gap-0.5"
                          title={`${day.date}: ${money(day.revenue)}`}
                        >
                          <div
                            className="w-1/2 rounded-t bg-blue-500 transition-all group-hover:bg-blue-700"
                            style={{
                              height: `${Math.max((day.revenue / maxRevenue) * 100, 3)}%`,
                            }}
                          />
                          <div
                            className="w-1/2 rounded-t bg-emerald-500 transition-all group-hover:bg-emerald-700"
                            style={{
                              height: `${Math.max((Math.max(day.profit, 0) / maxRevenue) * 100, 3)}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{report.salesTrend[0].date}</span>
                    <span>
                      {report.salesTrend[report.salesTrend.length - 1].date}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <i className="h-2 w-2 rounded-full bg-blue-500" />
                      {t.sales}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="h-2 w-2 rounded-full bg-emerald-500" />
                      {t.profit}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyLine>{t.noData}</EmptyLine>
              )}
            </ListCard>

            <ListCard
              title={t.categoryPerformance}
              description={textFor(
                language,
                "Where your sales are coming from.",
                "विक्री कोणत्या वर्गातून येते.",
              )}
            >
              {report.categorySales.length ? (
                report.categorySales.slice(0, 6).map((category: any) => {
                  const share =
                    report.revenue > 0
                      ? (category.revenue / report.revenue) * 100
                      : 0;
                  return (
                    <div key={category.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span>
                          {money(category.revenue)} · {pct(share)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyLine>{t.noData}</EmptyLine>
              )}
            </ListCard>

            <ListCard
              title={t.billRegister}
              description={textFor(
                language,
                "Every bill in the selected period, with payment and profit context.",
                "निवडलेल्या कालावधीतील प्रत्येक बिल, पेमेंट आणि नफ्यासह.",
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">{t.bill}</th>
                      <th className="pb-2 font-medium">{t.date}</th>
                      <th className="pb-2 font-medium">{t.payment}</th>
                      <th className="pb-2 text-right font-medium">{t.sales}</th>
                      <th className="pb-2 text-right font-medium">
                        {t.profit}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.billRegister.slice(0, 25).map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="py-2 font-medium">#{sale.id}</td>
                        <td className="py-2 text-muted-foreground">
                          {sale.date}
                        </td>
                        <td className="py-2 capitalize">
                          {sale.paymentMethod}
                        </td>
                        <td className="py-2 text-right">
                          {money(sale.subtotal)}
                        </td>
                        <td
                          className={cn(
                            "py-2 text-right font-medium",
                            safeNumber(sale.totalProfit) >= 0
                              ? "text-emerald-700"
                              : "text-red-700",
                          )}
                        >
                          {money(sale.totalProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!report.billRegister.length && (
                  <EmptyLine>{t.noData}</EmptyLine>
                )}
              </div>
            </ListCard>
          </>
        )}

        {section === "stock" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <MetricCard
                label={t.totalStock}
                value={money(report.totalStockValue)}
                note={`${formatNumber(items.length)} ${t.item}`}
                tone="purple"
                icon={Boxes}
              />
              <MetricCard
                label={textFor(language, "Bad stock", "खराब स्टॉक")}
                value={money(report.badStockValue)}
                note={t.expiry}
                tone="red"
                icon={Scale}
              />
              <MetricCard
                label={textFor(language, "Going expiry", "लवकर कालबाह्य")}
                value={money(report.expiringStockValue)}
                note={t.expiry}
                tone="amber"
                icon={CreditCard}
              />
            </div>
            <ListCard
              title={t.stockMovement}
              description={textFor(
                language,
                "Recorded inventory movements across the shop.",
                "दुकानातील नोंदवलेल्या स्टॉक हालचाली.",
              )}
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
                  <div className="text-lg font-bold">
                    {formatNumber(report.stockMovement.purchased)}
                  </div>
                  <div className="text-xs">{t.purchased}</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
                  <div className="text-lg font-bold">
                    {formatNumber(report.stockMovement.damaged)}
                  </div>
                  <div className="text-xs">{t.damaged}</div>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-red-900">
                  <div className="text-lg font-bold">
                    {formatNumber(report.stockMovement.expired)}
                  </div>
                  <div className="text-xs">{t.expired}</div>
                </div>
              </div>
            </ListCard>
            <ListCard
              title={t.slowStock}
              description={`${t.stockAtRisk}: ${money(report.stockAtRiskValue)}`}
            >
              {report.slowStock.length ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t.reviewStock}
                  </p>
                  <div className="space-y-2">
                    {report.slowStock.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {language === "mr"
                              ? item.nameMarathi || item.name
                              : item.name || item.nameMarathi}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.lastSold
                              ? `${textFor(language, "Last sold", "शेवटची विक्री")}: ${item.lastSold}`
                              : t.deadStock}{" "}
                            · {formatNumber(item.quantity)} {t.quantity}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold">
                            {money(item.stockValue)}
                          </div>
                          <div className="text-xs text-emerald-700">
                            {money(item.potentialProfit)} {t.profit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyLine>{t.noData}</EmptyLine>
              )}
            </ListCard>
            <ListCard title={t.lossBreakdown} description={t.lossBreakdownHint}>
              {report.lossByProduct.length ? (
                <div className="space-y-2">
                  {report.lossByProduct.map((entry: any) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-950"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{entry.name}</div>
                        <div className="text-xs opacity-70">
                          {entry.category} · {formatNumber(entry.quantity)}{" "}
                          {t.quantity} · {entry.reasons.join(" + ")}
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-semibold">
                        {money(entry.value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyLine>
                  {textFor(
                    language,
                    "No realized product loss recorded.",
                    "वस्तूनुसार झालेला तोटा नोंदलेला नाही.",
                  )}
                </EmptyLine>
              )}
            </ListCard>
            <div id="stock" className="scroll-mt-24">
              <ListCard
                title={t.stockStory}
                description={`${t.lowStock} / ${t.expiry}`}
              >
                <div className="grid gap-3">
                  <div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700"
                    >
                      {t.lowStock}
                    </Badge>
                    <div className="mt-2 space-y-2">
                      {report.lowStock.length ? (
                        report.lowStock.slice(0, 5).map((item: any) => (
                          <div
                            key={item.id || item.name}
                            className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
                          >
                            <span className="font-medium">
                              {language === "mr"
                                ? item.nameMarathi || item.name
                                : item.name || item.nameMarathi}
                            </span>
                            <span>
                              {formatNumber(item.quantity)} /{" "}
                              {formatNumber(item.lowStockLimit)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <EmptyLine>{t.stockOk}</EmptyLine>
                      )}
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {t.expiry}
                    </Badge>
                    <div className="mt-2 space-y-2">
                      {report.expiring.length ? (
                        report.expiring.map((batch: any) => (
                          <div
                            key={
                              batch.id ||
                              `${batch.itemName}-${batch.expiryDate}`
                            }
                            className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-950"
                          >
                            <div>
                              <div className="font-medium">
                                {batch.itemName || batch.item_name || t.item}
                              </div>
                              <div className="text-xs opacity-70">
                                {batch.expiryDate || batch.expiry_date || "NA"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {money(
                                  safeNumber(
                                    batch.quantityAvailable ??
                                      batch.quantity_available,
                                  ) *
                                    safeNumber(
                                      batch.costPerUnit ?? batch.cost_per_unit,
                                    ),
                                )}
                              </div>
                              <div className="text-xs opacity-70">
                                {formatNumber(
                                  batch.quantityAvailable ??
                                    batch.quantity_available,
                                )}{" "}
                                {t.quantity}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyLine>
                          {textFor(
                            language,
                            "No expired or near-expiry stock.",
                            "कालबाह्य किंवा लवकर कालबाह्य स्टॉक नाही.",
                          )}
                        </EmptyLine>
                      )}
                    </div>
                  </div>
                </div>
              </ListCard>
            </div>
          </>
        )}

        {section === "udhari" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              <MetricCard
                label={t.pendingTotal}
                value={money(totalPending)}
                note={`${formatNumber(report.topCustomers.length)} ${t.customer}`}
                tone="red"
                icon={CreditCard}
              />
              <MetricCard
                label={t.oldestDebt}
                value={
                  report.longPendingCustomers[0]
                    ? `${formatNumber(report.longPendingCustomers[0].creditPressure.daysPending)} ${textFor(language, "days", "दिवस")}`
                    : "0"
                }
                note={report.longPendingCustomers[0]?.name || t.noData}
                tone="amber"
                icon={TrendingUp}
              />
            </div>
            <ListCard
              title={t.aging}
              description={textFor(
                language,
                "Pending balances grouped by the age of the oldest unpaid credit.",
                "न भरलेल्या उधारीच्या वयानुसार बाकीचे वर्गीकरण.",
              )}
            >
              <div className="grid gap-3 sm:grid-cols-4">
                {report.agingBuckets.map((bucket: any) => {
                  const share =
                    totalPending > 0 ? (bucket.amount / totalPending) * 100 : 0;
                  return (
                    <div
                      key={bucket.label}
                      className="rounded-xl bg-muted/40 p-3"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{bucket.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {bucket.customers} {t.customers}
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold">
                        {money(bucket.amount)}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {pct(share)} {t.pendingTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-2 border-t pt-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">{t.creditGiven}</span>
                  <strong className="ml-2">{money(report.creditGiven)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.collected}</span>
                  <strong className="ml-2 text-emerald-700">
                    {money(report.collected)}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t.collectionRate}
                  </span>
                  <strong className="ml-2">{pct(report.collectionRate)}</strong>
                </div>
              </div>
            </ListCard>
            <div id="udhari" className="scroll-mt-24">
              <ListCard title={t.udhariRecovery} description={t.collectFirst}>
                <div className="grid gap-4">
                  <div>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {textFor(language, "Most udhari", "सर्वाधिक उधारी")}
                    </Badge>
                    <div className="mt-2 space-y-2">
                      {report.topCustomers.length ? (
                        report.topCustomers.slice(0, 3).map((customer: any) => (
                          <div
                            key={customer.id || customer.name}
                            className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-950"
                          >
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs opacity-70">
                                {customer.phone || t.customer}
                              </div>
                            </div>
                            <div className="font-semibold">
                              {money(customer.balance)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyLine>
                          {textFor(
                            language,
                            "No pending udhari customers.",
                            "उधारी बाकी ग्राहक नाहीत.",
                          )}
                        </EmptyLine>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700"
                      >
                        {textFor(language, "Most frequent", "वारंवार उधारी")}
                      </Badge>
                      <div className="mt-2 space-y-2">
                        {report.frequentCreditCustomers.length ? (
                          report.frequentCreditCustomers.map((entry: any) => (
                            <div
                              key={entry.customer.id}
                              className="rounded-xl bg-muted/40 p-3 text-sm"
                            >
                              <div className="font-medium">
                                {entry.customer.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatNumber(entry.count)}{" "}
                                {textFor(
                                  language,
                                  "credit bills",
                                  "उधारी बिले",
                                )}{" "}
                                · {money(entry.amount)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyLine>{t.noData}</EmptyLine>
                        )}
                      </div>
                    </div>
                    <div>
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700"
                      >
                        {textFor(language, "Long-time pending", "जुनी उधारी")}
                      </Badge>
                      <div className="mt-2 space-y-2">
                        {report.longPendingCustomers.length ? (
                          report.longPendingCustomers.map((customer: any) => (
                            <div
                              key={customer.id || customer.name}
                              className="rounded-xl bg-muted/40 p-3 text-sm"
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {money(customer.balance)} ·{" "}
                                {formatNumber(
                                  customer.creditPressure.daysPending,
                                )}{" "}
                                {textFor(language, "days pending", "दिवस बाकी")}
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyLine>{t.noData}</EmptyLine>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ListCard>
            </div>
          </>
        )}

        {section === "overview" && (
          <ListCard
            title={t.rawExplore}
            description={textFor(
              language,
              "Quick counts for deeper follow-up.",
              "पुढील तपासणीसाठी झटपट आकडे.",
            )}
          >
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-muted-foreground">{t.sales}</div>
                <div className="text-lg font-bold">
                  {formatNumber(report.transactionCount)}
                </div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-muted-foreground">{t.stock}</div>
                <div className="text-lg font-bold">
                  {formatNumber(items.length)}
                </div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-muted-foreground">{t.lowStock}</div>
                <div className="text-lg font-bold">
                  {formatNumber(report.lowStock.length)}
                </div>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="text-muted-foreground">{t.credit}</div>
                <div className="text-lg font-bold">{money(totalPending)}</div>
              </div>
            </div>
          </ListCard>
        )}
      </div>

      {isLoading ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background px-4 py-2 text-sm shadow">
          {textFor(
            language,
            "Loading report data...",
            "अहवाल डेटा लोड होत आहे...",
          )}
        </div>
      ) : null}
    </PageContainer>
  );
}
