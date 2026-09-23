export type ReportPeriod =
  | "today"
  | "month"
  | "sixMonths"
  | "year"
  | "specificMonth";

const DAY_MS = 24 * 60 * 60 * 1000;

export const reportNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function localDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export interface ReportDateRange {
  start: Date;
  end: Date;
}

export function getReportDateRange(
  period: ReportPeriod,
  selectedDate: string,
  selectedMonth: string,
  now = new Date(),
): ReportDateRange {
  const anchor = localDate(selectedDate) || startOfDay(now);
  let start = startOfDay(anchor);
  let end = endOfDay(anchor);

  if (period === "month") start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  if (period === "sixMonths") {
    start = new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1);
  }
  if (period === "year") start = new Date(anchor.getFullYear(), 0, 1);

  if (period === "specificMonth" && /^\d{4}-\d{2}$/.test(selectedMonth)) {
    const [year, month] = selectedMonth.split("-").map(Number);
    start = new Date(year, month - 1, 1);
    end = endOfDay(new Date(year, month, 0));
    const todayEnd = endOfDay(now);
    if (end > todayEnd) end = todayEnd;
  }

  return { start, end };
}

export function getPreviousReportDateRange(range: ReportDateRange): ReportDateRange {
  const currentDays = Math.max(
    1,
    Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / DAY_MS) + 1,
  );
  const end = endOfDay(new Date(startOfDay(range.start).getTime() - DAY_MS));
  const start = startOfDay(new Date(end.getTime() - (currentDays - 1) * DAY_MS));
  return { start, end };
}

export function reportDayCount(range: ReportDateRange) {
  if (range.end < range.start) return 0;
  return Math.max(
    1,
    Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / DAY_MS) + 1,
  );
}

export function dateIsInReportRange(date: string | undefined, range: ReportDateRange) {
  if (!date) return false;
  const parsed = localDate(date);
  return parsed !== null && parsed >= range.start && parsed <= range.end;
}

export function timestampIsInReportRange(
  timestamp: number | string | Date | undefined,
  range: ReportDateRange,
) {
  if (timestamp === undefined || timestamp === null) return false;
  const parsed = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return !Number.isNaN(parsed.getTime()) && parsed >= range.start && parsed <= range.end;
}

export interface ReportSaleLike {
  subtotal?: unknown;
  totalCost?: unknown;
  totalProfit?: unknown;
  paymentMethod?: unknown;
  paidAmount?: unknown;
  dueAmount?: unknown;
  paidVia?: unknown;
  items?: Array<{
    totalPrice?: unknown;
    totalCost?: unknown;
    costPerUnit?: unknown;
    quantity?: unknown;
  }>;
}

export function saleFinancials(sale: ReportSaleLike) {
  const revenue = reportNumber(sale.subtotal);
  const cost = reportNumber(sale.totalCost);
  const storedProfit = Number(sale.totalProfit);
  const profit = Number.isFinite(storedProfit) ? storedProfit : revenue - cost;
  return { revenue, cost, profit };
}

export function saleLineVariance(sale: ReportSaleLike) {
  if (!sale.items?.length) return { hasLineData: false, revenue: 0, cost: 0, mismatched: false };
  const revenue = sale.items.reduce((sum, line) => sum + reportNumber(line.totalPrice), 0);
  const cost = sale.items.reduce(
    (sum, line) =>
      sum +
      (line.totalCost == null
        ? reportNumber(line.costPerUnit) * reportNumber(line.quantity)
        : reportNumber(line.totalCost)),
    0,
  );
  const header = saleFinancials(sale);
  return {
    hasLineData: true,
    revenue,
    cost,
    mismatched: Math.abs(header.revenue - revenue) > 0.01 || Math.abs(header.cost - cost) > 0.01,
  };
}

export interface ReportPaymentSplit {
  cash: number;
  online: number;
  partial: number;
  credit: number;
  moneyIn: number;
}

export function salePaymentSplit(sale: ReportSaleLike): ReportPaymentSplit {
  const total = Math.max(reportNumber(sale.subtotal), 0);
  const method = String(sale.paymentMethod || "cash").toLowerCase();
  const storedPaid = Math.max(reportNumber(sale.paidAmount), 0);
  const storedDue = Math.max(reportNumber(sale.dueAmount), 0);
  const hasStoredSplit = storedPaid > 0 || storedDue > 0;
  const defaultsToUnpaid = ["partial", "udhar", "udhari"].includes(method);
  const paid = Math.min(hasStoredSplit ? storedPaid : defaultsToUnpaid ? 0 : total, total);
  const due = Math.min(
    hasStoredSplit ? storedDue : defaultsToUnpaid ? total : 0,
    Math.max(total - paid, 0),
  );

  if (method === "partial") {
    return { cash: 0, online: 0, partial: paid, credit: due, moneyIn: paid };
  }
  if (["udhar", "udhari"].includes(method)) {
    return { cash: 0, online: 0, partial: paid, credit: Math.max(due, total - paid), moneyIn: paid };
  }
  if (["card", "upi", "online"].includes(method)) {
    return { cash: 0, online: paid, partial: 0, credit: due, moneyIn: paid };
  }
  return { cash: paid, online: 0, partial: 0, credit: due, moneyIn: paid };
}

export function combinePaymentSplits(sales: ReportSaleLike[]): ReportPaymentSplit {
  return sales.reduce(
    (total, sale) => {
      const split = salePaymentSplit(sale);
      total.cash += split.cash;
      total.online += split.online;
      total.partial += split.partial;
      total.credit += split.credit;
      total.moneyIn += split.moneyIn;
      return total;
    },
    { cash: 0, online: 0, partial: 0, credit: 0, moneyIn: 0 },
  );
}

export interface CreditEntryLike {
  date?: string;
  type?: string;
  amount?: unknown;
}

export function creditCollectionSummary(entries: CreditEntryLike[], range: ReportDateRange) {
  let openingBalance = 0;
  let creditGiven = 0;
  let collected = 0;

  for (const entry of entries) {
    const amount = Math.max(reportNumber(entry.amount), 0);
    const parsed = entry.date ? localDate(entry.date) : null;
    if (!parsed) continue;
    if (parsed < range.start) {
      openingBalance += entry.type === "payment" ? -amount : entry.type === "credit" ? amount : 0;
    } else if (parsed <= range.end) {
      if (entry.type === "credit") creditGiven += amount;
      if (entry.type === "payment") collected += amount;
    }
  }

  openingBalance = Math.max(openingBalance, 0);
  const collectable = openingBalance + creditGiven;
  const collectionRate = collectable > 0 ? Math.min((collected / collectable) * 100, 100) : 0;
  return { openingBalance, creditGiven, collected, collectable, collectionRate };
}

export interface BatchLike {
  expiryDate?: string | null;
  expiry_date?: string | null;
  status?: string;
  quantityAvailable?: unknown;
  quantity_available?: unknown;
}

export function classifyBatchExpiry(batch: BatchLike, now = new Date()) {
  const available = Math.max(
    reportNumber(batch.quantityAvailable ?? batch.quantity_available),
    0,
  );
  if (available <= 0) return "none" as const;
  const rawExpiry = batch.expiryDate ?? batch.expiry_date;
  const expiry = rawExpiry ? localDate(rawExpiry) : null;
  const today = startOfDay(now);
  const expiringCutoff = new Date(today);
  expiringCutoff.setDate(expiringCutoff.getDate() + 30);

  if (expiry) {
    if (expiry < today) return "expired" as const;
    if (expiry <= expiringCutoff) return "expiring" as const;
    return "none" as const;
  }
  if (batch.status === "expired") return "expired" as const;
  if (batch.status === "expiring") return "expiring" as const;
  return "none" as const;
}
