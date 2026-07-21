"use client";

import React, { ReactNode, useMemo } from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatMoney, formatNumber, formatPercent } from "@/lib/number-format";
import type { PremiumReportData } from "@/lib/simple-pdf";

type Tone = "navy" | "green" | "blue" | "amber" | "red" | "purple" | "slate";
type StockReportItem = NonNullable<PremiumReportData["stockItems"]>[number];

const ROWS_PER_STOCK_PAGE = 14;
const ROWS_PER_TABLE = 8;

const palette: Record<Tone, { ink: string; bg: string; border: string }> = {
  navy: { ink: "#0b245c", bg: "#eef4ff", border: "#bfdbfe" },
  green: { ink: "#147a3f", bg: "#f0fdf4", border: "#bbf7d0" },
  blue: { ink: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  amber: { ink: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  red: { ink: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  purple: { ink: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  slate: { ink: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#0b245c",
  },
  headerCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  brandBlock: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#0b245c",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoText: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  brand: { color: "#0b245c", fontSize: 11, fontWeight: "bold", letterSpacing: 1.2 },
  shopName: { color: "#64748b", fontSize: 8.5, marginTop: 1 },
  title: { color: "#0b245c", fontSize: 18, fontWeight: "bold", marginTop: 4 },
  titleCompact: { color: "#0b245c", fontSize: 13, fontWeight: "bold" },
  meta: { color: "#64748b", fontSize: 8, marginTop: 3 },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
    color: "#92400e",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  pageLabel: { color: "#64748b", fontSize: 8, textAlign: "right" },
  heroRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  heroMain: {
    flex: 1.6,
    borderRadius: 8,
    backgroundColor: "#0b245c",
    padding: 16,
  },
  heroSide: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 14,
  },
  heroKicker: {
    color: "#bfdbfe",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  heroTitle: { color: "#ffffff", fontSize: 13, fontWeight: "bold", marginTop: 4 },
  heroValue: { color: "#ffffff", fontSize: 26, fontWeight: "bold", marginTop: 6 },
  heroSub: { color: "#dbeafe", fontSize: 8.5, lineHeight: 1.4, marginTop: 6 },
  heroStats: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroStat: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  heroStatLabel: { color: "#64748b", fontSize: 7 },
  heroStatValue: { color: "#0b245c", fontSize: 11, fontWeight: "bold", marginTop: 2 },
  scoreLabel: {
    color: "#64748b",
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  scoreValue: { color: "#0b245c", fontSize: 24, fontWeight: "bold", marginTop: 2 },
  scoreText: { color: "#111827", fontSize: 10, fontWeight: "bold", marginTop: 2 },
  scoreTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
  },
  scoreFill: { height: 6, borderRadius: 999 },
  section: {
    marginBottom: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  sectionTitleWrap: { flexDirection: "row", alignItems: "center" },
  sectionIndex: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#0b245c",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 4,
    marginRight: 8,
  },
  sectionTitle: { color: "#0b245c", fontSize: 11, fontWeight: "bold" },
  sectionHint: { color: "#64748b", fontSize: 7.5 },
  twoCol: { flexDirection: "row", gap: 12 },
  colHalf: { width: "48%" },
  colFull: { width: "100%" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  metric: {
    width: "23%",
    minHeight: 58,
    borderRadius: 6,
    borderWidth: 1,
    padding: 8,
  },
  metricWide: { width: "48%" },
  metricLabel: { fontSize: 7.5, fontWeight: "bold", marginBottom: 4 },
  metricValue: { color: "#111827", fontSize: 14, fontWeight: "bold" },
  metricSub: { color: "#64748b", fontSize: 7, marginTop: 4 },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  snapshotCard: {
    width: "48%",
    borderRadius: 6,
    borderWidth: 1,
    padding: 8,
    minHeight: 58,
  },
  snapshotLabel: { fontSize: 7.5, fontWeight: "bold", marginBottom: 4 },
  snapshotValue: { color: "#111827", fontSize: 11, fontWeight: "bold" },
  snapshotNote: { color: "#64748b", fontSize: 7, marginTop: 4, lineHeight: 1.25 },
  table: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#eef4ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    minHeight: 22,
  },
  tableHeadCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    color: "#0b245c",
    fontSize: 7.5,
    fontWeight: "bold",
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 7.8,
    justifyContent: "center",
  },
  rowTitle: { color: "#111827", fontWeight: "bold", fontSize: 7.8 },
  subText: { color: "#64748b", fontSize: 6.8, marginTop: 1 },
  positive: { color: "#15803d", fontWeight: "bold" },
  negative: { color: "#dc2626", fontWeight: "bold" },
  warning: { color: "#b45309", fontWeight: "bold" },
  callout: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: 8,
    marginTop: 8,
  },
  calloutTitle: { color: "#78350f", fontSize: 8.5, fontWeight: "bold", marginBottom: 3 },
  calloutText: { color: "#78350f", fontSize: 8, lineHeight: 1.35 },
  actionRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
  },
  actionNo: {
    width: 16,
    height: 16,
    borderRadius: 4,
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 3,
    marginRight: 8,
  },
  actionText: { flex: 1, color: "#334155", fontSize: 8, lineHeight: 1.35 },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  trendDate: { width: "22%", color: "#475569", fontSize: 7.5 },
  trendTrack: {
    width: "40%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    marginRight: 6,
  },
  trendFill: { height: 6, borderRadius: 999 },
  trendValue: { width: "38%", color: "#111827", fontSize: 7.5, textAlign: "right" },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  chip: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 6,
  },
  chipLabel: { color: "#64748b", fontSize: 7 },
  chipValue: { color: "#111827", fontSize: 10, fontWeight: "bold", marginTop: 2 },
  pill: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 6.5,
    fontWeight: "bold",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    paddingTop: 6,
    color: "#64748b",
    fontSize: 7.5,
  },
});

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function safeText(value: unknown, fallback = "N/A", maxLength = 42) {
  const cleaned = String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const finalValue = cleaned || fallback;
  return finalValue.length > maxLength
    ? `${finalValue.slice(0, maxLength - 3)}...`
    : finalValue;
}

function money(value: number | undefined | null) {
  return `Rs. ${formatMoney(value)}`;
}

function pct(value: number | undefined | null) {
  return `${formatPercent(value)}%`;
}

function signedPct(value: number | undefined | null) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${safe >= 0 ? "+" : ""}${formatPercent(safe)}%`;
}

function shortDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return safeText(value, "N/A", 14);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function paymentName(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card/UPI",
    partial: "Partial",
    udhar: "Udhari",
  };
  return labels[method] || safeText(method, "Other", 18);
}

function statusTone(status: StockReportItem["status"]): Tone {
  if (status === "out" || status === "expired") return "red";
  if (status === "low" || status === "expiring") return "amber";
  return "green";
}

function statusLabel(status: StockReportItem["status"]) {
  const labels: Record<StockReportItem["status"], string> = {
    good: "Good",
    low: "Low",
    out: "Out",
    expired: "Expired",
    expiring: "Expiring",
  };
  return labels[status];
}

function movementLabel(type: string) {
  const labels: Record<string, string> = {
    purchase: "Stock In",
    sale: "Sale",
    adjustment: "Adjust",
    damage: "Damage",
    expiry: "Expiry",
  };
  return labels[type] || safeText(type, "Update", 14);
}

function PageFooter({ label }: { label: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>DUKAN · {label}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

function ReportHeader({
  data,
  generatedAt,
  compact = false,
}: {
  data: PremiumReportData;
  generatedAt: Date;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <View style={styles.headerCompact}>
        <View>
          <Text style={styles.titleCompact}>
            {safeText(data.label, "Selected Period")} Report
          </Text>
          <Text style={styles.meta}>
            {safeText(data.shopName, "Dukan Shop")} ·{" "}
            {generatedAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <Text style={styles.badge}>PREMIUM REPORT</Text>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <View>
            <Text style={styles.brand}>DUKAN</Text>
            <Text style={styles.shopName}>{safeText(data.shopName, "Dukan Shop")}</Text>
          </View>
        </View>
        <Text style={styles.title}>
          {safeText(data.label, "Selected Period")} Business Report
        </Text>
        <Text style={styles.meta}>
          Generated{" "}
          {generatedAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          at{" "}
          {generatedAt.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </Text>
      </View>
      <Text style={styles.badge}>PREMIUM{"\n"}DUKAN REPORT</Text>
    </View>
  );
}

function Section({
  index,
  title,
  hint,
  tone = "navy",
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { borderColor: palette[tone].border }]}>
      <View style={styles.sectionHeader} minPresenceAhead={40}>
        <View style={styles.sectionTitleWrap}>
          <Text style={[styles.sectionIndex, { backgroundColor: palette[tone].ink }]}>
            {index}
          </Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "blue",
  wide = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  wide?: boolean;
}) {
  return (
    <View
      wrap={false}
      style={[
        wide ? styles.metricWide : styles.metric,
        { backgroundColor: palette[tone].bg, borderColor: palette[tone].border },
      ]}
    >
      <Text style={[styles.metricLabel, { color: palette[tone].ink }]}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

function SnapshotCard({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
}) {
  return (
    <View
      wrap={false}
      style={[
        styles.snapshotCard,
        { backgroundColor: palette[tone].bg, borderColor: palette[tone].border },
      ]}
    >
      <Text style={[styles.snapshotLabel, { color: palette[tone].ink }]}>{label}</Text>
      <Text style={styles.snapshotValue}>{value}</Text>
      <Text style={styles.snapshotNote}>{note}</Text>
    </View>
  );
}

function Table({
  headers,
  widths,
  rows,
}: {
  headers: string[];
  widths: string[];
  rows: ReactNode[][];
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        {headers.map((header, index) => (
          <Text
            key={`${header}-${index}`}
            style={[styles.tableHeadCell, { width: widths[index] }]}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          wrap={false}
          style={[
            styles.tableRow,
            rowIndex === rows.length - 1 ? { borderBottomWidth: 0 } : {},
          ]}
        >
          {row.map((cell, cellIndex) => (
            <View
              key={`${rowIndex}-${cellIndex}`}
              style={[styles.tableCell, { width: widths[cellIndex] }]}
            >
              {typeof cell === "string" || typeof cell === "number" ? (
                <Text>{cell}</Text>
              ) : (
                cell
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <View
      style={[
        styles.callout,
        { marginTop: 0, backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
      ]}
    >
      <Text style={[styles.calloutText, { color: "#64748b" }]}>{children}</Text>
    </View>
  );
}

function TrendRow({
  label,
  revenue,
  profit,
  maxRevenue,
}: {
  label: string;
  revenue: number;
  profit: number;
  maxRevenue: number;
}) {
  return (
    <View wrap={false} style={styles.trendRow}>
      <Text style={styles.trendDate}>{label}</Text>
      <View style={styles.trendTrack}>
        <View
          style={[
            styles.trendFill,
            {
              width: `${clamp((revenue / Math.max(maxRevenue, 1)) * 100)}%`,
              backgroundColor: profit >= 0 ? palette.green.ink : palette.red.ink,
            },
          ]}
        />
      </View>
      <Text style={styles.trendValue}>
        {money(revenue)} / {money(profit)}
      </Text>
    </View>
  );
}

function buildStockRows(items: StockReportItem[]) {
  return items.map((item) => {
    const tone = statusTone(item.status);
    return [
      <View key={`name-${item.name}`}>
        <Text style={styles.rowTitle}>{safeText(item.name, "Item", 28)}</Text>
        <Text style={styles.subText}>{safeText(item.brand, "No brand", 20)}</Text>
      </View>,
      `${formatNumber(item.quantity)} ${safeText(item.unit, "unit", 6)}`,
      money(item.stockValue),
      <View key={`margin-${item.name}`}>
        <Text style={item.marginPercent >= 15 ? styles.positive : styles.warning}>
          {pct(item.marginPercent)}
        </Text>
        <Text style={styles.subText}>{money(item.marginAmount)}/unit</Text>
      </View>,
      <Text
        key={`status-${item.name}`}
        style={[
          styles.pill,
          {
            color: palette[tone].ink,
            backgroundColor: palette[tone].bg,
            borderColor: palette[tone].border,
            borderWidth: 1,
          },
        ]}
      >
        {statusLabel(item.status)}
      </Text>,
      <View key={`dates-${item.name}`}>
        <Text>Upd {shortDate(item.lastUpdated)}</Text>
        <Text style={styles.subText}>Sold {shortDate(item.lastSoldDate)}</Text>
      </View>,
    ];
  });
}

export const PremiumPdfReport = ({ data }: { data: PremiumReportData }) => {
  const generatedAt = useMemo(() => new Date(), []);

  const dailyData = useMemo(() => {
    if (data.dailyData?.length) return data.dailyData;
    const byDate = new Map<string, { revenue: number; cost: number; profit: number }>();
    data.sales.forEach((sale) => {
      const date = typeof sale?.date === "string" ? sale.date : "Unknown";
      const existing = byDate.get(date) || { revenue: 0, cost: 0, profit: 0 };
      byDate.set(date, {
        revenue: existing.revenue + Number(sale.subtotal || 0),
        cost: existing.cost + Number(sale.totalCost || 0),
        profit: existing.profit + Number(sale.totalProfit || 0),
      });
    });
    return Array.from(byDate.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.dailyData, data.sales]);

  const itemPerformance = useMemo(() => {
    if (data.itemPerformance?.length) return data.itemPerformance;
    return data.topItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: item.revenue,
      cost: item.revenue - item.profit,
      profit: item.profit,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
    }));
  }, [data.itemPerformance, data.topItems]);

  const stockItems = data.stockItems || [];
  const stockPages = chunkArray(stockItems, ROWS_PER_STOCK_PAGE);
  const stockSummary = {
    out: stockItems.filter((item) => item.status === "out").length,
    low: stockItems.filter((item) => item.status === "low").length,
    expired: stockItems.filter((item) => item.status === "expired").length,
    expiring: stockItems.filter((item) => item.status === "expiring").length,
    healthy: stockItems.filter((item) => item.status === "good").length,
  };

  const paymentRows = Object.entries(data.paymentBreakdown)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 4);
  const paymentTotal = paymentRows.reduce((sum, [, entry]) => sum + entry.amount, 0);

  const topItems = itemPerformance.slice(0, 6);
  const topRevenue = Math.max(...topItems.map((item) => item.revenue), 1);
  const goodMarginItems = [...itemPerformance]
    .filter((item) => item.profit > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, ROWS_PER_TABLE);
  const lowMarginItems = [...itemPerformance]
    .filter((item) => item.profit >= 0 && item.margin < 10)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, ROWS_PER_TABLE);
  const lossItems = [...itemPerformance]
    .filter((item) => item.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, ROWS_PER_TABLE);
  const bestProfitItem = [...itemPerformance].sort((a, b) => b.profit - a.profit)[0];
  const bestStaff = data.staffSales?.[0];
  const bestBrand = data.brandDemand?.[0];
  const comparisonLabel = data.comparison?.label || "Previous period";

  const stockHealth = data.productsCount
    ? ((data.productsCount - data.lowStockItems.length - stockSummary.out) /
        data.productsCount) *
      100
    : 0;

  const stockMovements = data.stockMovements || [];
  const movementPages = chunkArray(stockMovements.slice(0, 24), ROWS_PER_TABLE);
  const actionItems =
    data.suggestions && data.suggestions.length > 0
      ? data.suggestions
      : [
          "Restock low and out-of-stock items before peak sale time.",
          "Check low-margin item prices against latest purchase cost.",
          "Use worker-wise sales to coach billing and margin habits.",
        ];

  const stockRiskCount =
    stockSummary.out + stockSummary.low + stockSummary.expired + stockSummary.expiring;
  const creditPressure =
    data.revenue > 0
      ? (data.totalPendingUdhari / data.revenue) * 100
      : data.totalPendingUdhari > 0
        ? 100
        : 0;

  const reportScore = Math.round(
    clamp(
      55 +
        clamp(data.margin, -20, 35) * 0.7 +
        (data.profit > 0 ? 8 : data.profit < 0 ? -18 : 0) +
        clamp(data.comparison?.revenueChange ?? 0, -40, 40) * 0.25 -
        Math.min(stockRiskCount * 2, 16) -
        (creditPressure > 70 ? 8 : creditPressure > 35 ? 4 : 0),
    ),
  );

  const scoreTone: Tone =
    reportScore >= 75 ? "green" : reportScore >= 55 ? "amber" : "red";
  const scoreLabel =
    reportScore >= 80
      ? "Strong period"
      : reportScore >= 65
        ? "Healthy period"
        : reportScore >= 50
          ? "Needs attention"
          : "At risk";

  const urgentStock = stockItems.find((item) => item.status !== "good");
  const biggestRisk = lossItems[0]
    ? `${safeText(lossItems[0].name, "Item", 22)} sold at ${money(lossItems[0].profit)} profit.`
    : urgentStock
      ? `${safeText(urgentStock.name, "Item", 22)} stock is ${statusLabel(urgentStock.status).toLowerCase()}.`
      : data.totalPendingUdhari > 0
        ? `${money(data.totalPendingUdhari)} total udhari is pending.`
        : "No major risk found in this report.";

  const bestOpportunity = bestProfitItem
    ? `${safeText(bestProfitItem.name, "Item", 22)} gave ${money(bestProfitItem.profit)} profit.`
    : bestBrand
      ? `${safeText(bestBrand.topBrand, "Brand", 18)} is leading demand.`
      : "Add more sales data to reveal the strongest opportunity.";

  const trendRows = dailyData.slice(-7);
  const maxTrendRevenue = Math.max(...trendRows.map((entry) => entry.revenue), 1);

  const stockSectionIndex = 9;
  const movementSectionIndex = 10;
  let sectionIndex = 1;

  return (
    <Document title={`${data.label} Dukan Report`} author="Dukan">
      {/* Page 1 — Executive summary */}
      <Page size="A4" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} />

        <View style={styles.heroRow}>
          <View style={styles.heroMain}>
            <Text style={styles.heroKicker}>Executive summary</Text>
            <Text style={styles.heroTitle}>
              {safeText(data.label, "Selected period", 32)} performance
            </Text>
            <Text style={styles.heroValue}>{money(data.revenue)}</Text>
            <Text style={styles.heroSub}>
              {data.comparison
                ? `${signedPct(data.comparison.revenueChange)} sales and ${signedPct(data.comparison.profitChange)} profit vs ${comparisonLabel}.`
                : `${formatNumber(data.transactions)} bills · ${formatNumber(data.totalItemsSold)} items sold`}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Profit</Text>
                <Text style={styles.heroStatValue}>{money(data.profit)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Margin</Text>
                <Text style={styles.heroStatValue}>{pct(data.margin)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Stock value</Text>
                <Text style={styles.heroStatValue}>{money(data.totalStockValue)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroSide}>
            <Text style={styles.scoreLabel}>Health score</Text>
            <Text style={styles.scoreValue}>{reportScore}/100</Text>
            <Text style={[styles.scoreText, { color: palette[scoreTone].ink }]}>
              {scoreLabel}
            </Text>
            <View style={styles.scoreTrack}>
              <View
                style={[
                  styles.scoreFill,
                  { width: `${reportScore}%`, backgroundColor: palette[scoreTone].ink },
                ]}
              />
            </View>
            <Text style={[styles.meta, { marginTop: 8 }]}>
              {stockRiskCount} stock alerts · {lossItems.length} loss item(s) ·{" "}
              {pct(creditPressure)} udhari pressure
            </Text>
          </View>
        </View>

        <Section index={sectionIndex++} title="Owner Snapshot" tone="navy">
          <View style={styles.snapshotGrid}>
            <SnapshotCard
              label="Best seller"
              value={topItems[0] ? safeText(topItems[0].name, "Item", 22) : "No sale"}
              note={
                topItems[0]
                  ? `${money(topItems[0].revenue)} sales`
                  : "No item sold in period"
              }
              tone="green"
            />
            <SnapshotCard
              label="Profit leader"
              value={bestProfitItem ? safeText(bestProfitItem.name, "Item", 22) : "No item"}
              note={
                bestProfitItem
                  ? `${money(bestProfitItem.profit)} profit`
                  : "Profit appears after sales"
              }
              tone="blue"
            />
            <SnapshotCard
              label="Worker leader"
              value={bestStaff ? safeText(bestStaff.staffName, "Worker", 22) : "No worker"}
              note={
                bestStaff
                  ? `${money(bestStaff.revenue)} sales`
                  : "Link sales to staff users"
              }
              tone="purple"
            />
            <SnapshotCard
              label="Stock focus"
              value={urgentStock ? safeText(urgentStock.name, "Item", 22) : "Stock OK"}
              note={
                urgentStock
                  ? `${statusLabel(urgentStock.status)} · ${formatNumber(urgentStock.quantity)} ${safeText(urgentStock.unit, "unit", 6)}`
                  : `${stockSummary.healthy} healthy items`
              }
              tone={urgentStock ? statusTone(urgentStock.status) : "green"}
            />
          </View>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Priority action</Text>
            <Text style={styles.calloutText}>
              {safeText(actionItems[0], "Review today's sales and stock.", 160)}
            </Text>
          </View>
        </Section>

        <PageFooter label={safeText(data.label, "Report")} />
      </Page>

      {/* Page 2 — Profit watch & daily trend */}
      <Page size="A4" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} compact />

        <Section
          index={sectionIndex++}
          title="Profit Watch"
          tone={lossItems.length > 0 ? "red" : "green"}
        >
          <Table
            headers={["Point", "Value", "Meaning"]}
            widths={["28%", "22%", "50%"]}
            rows={[
              [
                "Opportunity",
                bestProfitItem ? money(bestProfitItem.profit) : "N/A",
                bestOpportunity,
              ],
              ["Biggest risk", lossItems[0] ? money(lossItems[0].profit) : "N/A", biggestRisk],
              ["Low margin", formatNumber(lowMarginItems.length), "Items below 10% margin"],
              ["Stock alerts", formatNumber(stockRiskCount), "Low, out, expired, or expiring"],
            ]}
          />
        </Section>

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Section index={sectionIndex++} title="Immediate Actions" tone="amber">
              {actionItems.slice(0, 5).map((action, index) => (
                <View
                  key={index}
                  wrap={false}
                  style={[
                    styles.actionRow,
                    index === Math.min(actionItems.length, 5) - 1
                      ? { borderBottomWidth: 0 }
                      : {},
                  ]}
                >
                  <Text
                    style={[
                      styles.actionNo,
                      {
                        backgroundColor:
                          index === 0
                            ? palette.red.ink
                            : index === 1
                              ? palette.amber.ink
                              : palette.blue.ink,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                  <Text style={styles.actionText}>{safeText(action, "Suggestion", 130)}</Text>
                </View>
              ))}
            </Section>
          </View>

          <View style={styles.colHalf}>
            <Section index={sectionIndex++} title="Daily Sales Movement" tone="green">
              {trendRows.length > 0 ? (
                trendRows.slice(-6).map((entry, index) => (
                  <TrendRow
                    key={`${entry.date}-${index}`}
                    label={shortDate(entry.date)}
                    revenue={entry.revenue}
                    profit={entry.profit}
                    maxRevenue={maxTrendRevenue}
                  />
                ))
              ) : (
                <Empty>No daily sale movement for this report period.</Empty>
              )}
              <Text style={styles.subText}>Format: sales / profit</Text>
            </Section>
          </View>
        </View>

        <PageFooter label={safeText(data.label, "Report")} />
      </Page>

      {/* Page 3 — Sales analysis */}
      <Page size="A4" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} compact />

        <Section
          index={sectionIndex++}
          title="Sales Analysis"
          hint={`vs ${comparisonLabel}`}
          tone="green"
        >
          <View style={styles.metricGrid}>
            <Metric
              label="Total Sales"
              value={money(data.revenue)}
              sub={
                data.comparison
                  ? `${signedPct(data.comparison.revenueChange)} from ${comparisonLabel}`
                  : `${formatNumber(data.transactions)} bills`
              }
              tone="green"
            />
            <Metric
              label="Total Bills"
              value={formatNumber(data.transactions)}
              sub={`Average bill ${money(data.averageBill)}`}
              tone="blue"
            />
            <Metric
              label="Items Sold"
              value={formatNumber(data.totalItemsSold)}
              sub="Quantity moved"
              tone="purple"
            />
            <Metric
              label="Udhari Sales"
              value={money(data.paymentBreakdown.udhar?.amount || 0)}
              sub={`${data.paymentBreakdown.udhar?.count || 0} bills`}
              tone="amber"
            />
          </View>

          <Table
            headers={["Metric", "This report", comparisonLabel, "Change"]}
            widths={["28%", "24%", "24%", "24%"]}
            rows={[
              [
                <Text style={styles.rowTitle}>Sales</Text>,
                money(data.revenue),
                data.comparison ? money(data.comparison.revenue) : "N/A",
                <Text
                  style={
                    data.comparison && data.comparison.revenueChange < 0
                      ? styles.negative
                      : styles.positive
                  }
                >
                  {data.comparison ? signedPct(data.comparison.revenueChange) : "N/A"}
                </Text>,
              ],
              [
                <Text style={styles.rowTitle}>Profit</Text>,
                money(data.profit),
                data.comparison ? money(data.comparison.profit) : "N/A",
                <Text
                  style={
                    data.comparison && data.comparison.profitChange < 0
                      ? styles.negative
                      : styles.positive
                  }
                >
                  {data.comparison ? signedPct(data.comparison.profitChange) : "N/A"}
                </Text>,
              ],
              [
                <Text style={styles.rowTitle}>Margin</Text>,
                pct(data.margin),
                data.comparison ? pct(data.comparison.margin) : "N/A",
                <Text
                  style={
                    data.comparison && data.comparison.marginChange < 0
                      ? styles.negative
                      : styles.positive
                  }
                >
                  {data.comparison ? signedPct(data.comparison.marginChange) : "N/A"}
                </Text>,
              ],
              [
                <Text style={styles.rowTitle}>Bills</Text>,
                formatNumber(data.transactions),
                data.comparison ? formatNumber(data.comparison.transactions) : "N/A",
                data.comparison
                  ? formatNumber(data.transactions - data.comparison.transactions)
                  : "N/A",
              ],
            ]}
          />

          <View style={styles.chipRow}>
            {paymentRows.length > 0 ? (
              paymentRows.map(([method, entry]) => (
                <View key={method} wrap={false} style={styles.chip}>
                  <Text style={styles.chipLabel}>{paymentName(method)}</Text>
                  <Text style={styles.chipValue}>{money(entry.amount)}</Text>
                  <Text style={styles.subText}>
                    {paymentTotal > 0 ? pct((entry.amount / paymentTotal) * 100) : "0%"} mix
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Payments</Text>
                <Text style={styles.chipValue}>No sale</Text>
              </View>
            )}
          </View>
        </Section>

        <PageFooter label={safeText(data.label, "Report")} />
      </Page>

      {/* Page 4 — Profit, workers, top items */}
      <Page size="A4" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} compact />

        <Section index={sectionIndex++} title="Profit & Margin" tone="blue">
          <View style={styles.metricGrid}>
            <Metric
              label="Total Cost"
              value={money(data.cost)}
              sub="Sold stock cost"
              tone="slate"
              wide
            />
            <Metric
              label="Total Profit"
              value={money(data.profit)}
              sub={`${pct(data.margin)} margin`}
              tone={data.profit >= 0 ? "green" : "red"}
              wide
            />
          </View>

          {goodMarginItems.length > 0 ? (
            <Table
              headers={["Good margin item", "Sales", "Profit", "Margin"]}
              widths={["42%", "20%", "20%", "18%"]}
              rows={goodMarginItems.map((item) => [
                <Text style={styles.rowTitle}>{safeText(item.name, "Item", 28)}</Text>,
                money(item.revenue),
                money(item.profit),
                <Text style={styles.positive}>{pct(item.margin)}</Text>,
              ])}
            />
          ) : (
            <Empty>No good-margin item found in this period.</Empty>
          )}

          {(lowMarginItems.length > 0 || lossItems.length > 0) && (
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Margin watch</Text>
              <Text style={styles.calloutText}>
                {lossItems.length > 0
                  ? `${lossItems.length} item(s) sold at loss. Fix price or purchase rate before next sale.`
                  : `${lowMarginItems.length} item(s) sold below 10% margin. Review pricing.`}
              </Text>
            </View>
          )}
        </Section>

        <Section index={sectionIndex++} title="Worker-wise Sales" tone="purple">
          {data.staffSales?.length ? (
            <Table
              headers={["Worker", "Sales", "Profit", "Bills", "Udhari"]}
              widths={["30%", "22%", "20%", "13%", "15%"]}
              rows={data.staffSales.slice(0, 7).map((worker) => [
                <View>
                  <Text style={styles.rowTitle}>{safeText(worker.staffName, "Worker", 20)}</Text>
                  <Text style={styles.subText}>Avg {money(worker.averageBill)}</Text>
                </View>,
                money(worker.revenue),
                <Text style={(worker.profit || 0) >= 0 ? styles.positive : styles.negative}>
                  {money(worker.profit || 0)}
                </Text>,
                formatNumber(worker.transactions),
                money(worker.udhariAmount || 0),
              ])}
            />
          ) : (
            <Empty>Worker-wise sales appear when sales are linked to staff accounts.</Empty>
          )}
        </Section>

        <Section index={sectionIndex++} title="Top Sold Items" tone="green">
          {topItems.length > 0 ? (
            <Table
              headers={["Item", "Qty", "Sales", "Profit"]}
              widths={["42%", "16%", "22%", "20%"]}
              rows={topItems.map((item) => [
                <Text style={styles.rowTitle}>{safeText(item.name, "Item", 28)}</Text>,
                formatNumber(item.quantity),
                money(item.revenue),
                <Text style={item.profit >= 0 ? styles.positive : styles.negative}>
                  {money(item.profit)}
                </Text>,
              ])}
            />
          ) : (
            <Empty>No sold item data for this report period.</Empty>
          )}
        </Section>

        <PageFooter label={safeText(data.label, "Report")} />
      </Page>

      {/* Stock inventory — one dedicated page per chunk */}
      {stockPages.map((chunk, pageIndex) => (
        <Page key={`stock-page-${pageIndex}`} size="A4" style={styles.page}>
          <ReportHeader data={data} generatedAt={generatedAt} compact />

          <Section
            index={stockSectionIndex}
            title={pageIndex === 0 ? "Stock Inventory" : "Stock Inventory (continued)"}
            hint={
              pageIndex === 0
                ? `${stockItems.length} items · current inventory`
                : `Items ${pageIndex * ROWS_PER_STOCK_PAGE + 1}–${Math.min((pageIndex + 1) * ROWS_PER_STOCK_PAGE, stockItems.length)} of ${stockItems.length}`
            }
            tone="amber"
          >
            {pageIndex === 0 && (
              <View style={styles.metricGrid}>
                <Metric
                  label="Stock Value"
                  value={money(data.totalStockValue)}
                  sub="Current inventory worth"
                  tone="purple"
                  wide
                />
                <Metric
                  label="Total Items"
                  value={formatNumber(data.productsCount)}
                  sub={`${stockSummary.healthy} healthy`}
                  tone="blue"
                  wide
                />
                <Metric
                  label="Need Attention"
                  value={formatNumber(
                    stockSummary.low +
                      stockSummary.out +
                      stockSummary.expired +
                      stockSummary.expiring,
                  )}
                  sub={`${stockSummary.out} out · ${stockSummary.low} low`}
                  tone={stockSummary.low + stockSummary.out > 0 ? "red" : "green"}
                  wide
                />
                <Metric
                  label="Stock Health"
                  value={pct(stockHealth)}
                  sub={`${stockSummary.expired + stockSummary.expiring} expiry alerts`}
                  tone={stockHealth >= 75 ? "green" : "amber"}
                  wide
                />
              </View>
            )}

            {chunk.length > 0 ? (
              <Table
                headers={["Item", "Stock", "Value", "Margin", "Status", "Dates"]}
                widths={["30%", "14%", "15%", "14%", "12%", "15%"]}
                rows={buildStockRows(chunk)}
              />
            ) : (
              <Empty>No stock items are available for this shop.</Empty>
            )}
          </Section>

          <PageFooter label={safeText(data.label, "Report")} />
        </Page>
      ))}

      {/* Stock movements */}
      {stockMovements.length > 0 &&
        movementPages.map((chunk, pageIndex) => (
        <Page key={`movement-page-${pageIndex}`} size="A4" style={styles.page}>
          <ReportHeader data={data} generatedAt={generatedAt} compact />

          <Section
            index={movementSectionIndex}
            title={pageIndex === 0 ? "Stock Movements" : "Stock Movements (continued)"}
            tone="blue"
          >
            {chunk.length > 0 ? (
              <Table
                headers={["Date", "Item", "Type", "Change", "After"]}
                widths={["18%", "34%", "17%", "16%", "15%"]}
                rows={chunk.map((movement) => [
                  shortDate(movement.date),
                  <Text style={styles.rowTitle}>
                    {safeText(movement.itemName, "Item", 24)}
                  </Text>,
                  movementLabel(movement.type),
                  <Text
                    style={
                      movement.quantityChanged < 0 ? styles.negative : styles.positive
                    }
                  >
                    {formatNumber(movement.quantityChanged)}
                  </Text>,
                  formatNumber(movement.quantityAfter),
                ])}
              />
            ) : (
              <Empty>No stock movement entries were found for this report period.</Empty>
            )}
          </Section>

          <PageFooter label={safeText(data.label, "Report")} />
        </Page>
      ))}

      {/* Udhari & insights */}
      <Page size="A4" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} compact />

        <Section index={11} title="Udhari Position" tone="red">
          <View style={styles.metricGrid}>
            <Metric
              label="Total Pending"
              value={money(data.totalPendingUdhari)}
              sub="All customers"
              tone="red"
              wide
            />
            <Metric
              label="Report Udhari"
              value={money(data.paymentBreakdown.udhar?.amount || 0)}
              sub={`${data.paymentBreakdown.udhar?.count || 0} bills`}
              tone="amber"
              wide
            />
          </View>
          {data.highestUdharCustomer ? (
            <View style={[styles.callout, { marginTop: 0 }]}>
              <Text style={styles.calloutTitle}>Collect first</Text>
              <Text style={styles.calloutText}>
                {safeText(data.highestUdharCustomer.name, "Customer", 24)} has{" "}
                {money(data.highestUdharCustomer.balance)} pending.
              </Text>
            </View>
          ) : (
            <Empty>No pending udhari customer in this report.</Empty>
          )}
        </Section>

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Section index={12} title="Brand Comparison" tone="purple">
              {data.brandDemand?.length ? (
                <Table
                  headers={["Product", "Top brand", "Sales", "Share"]}
                  widths={["32%", "28%", "22%", "18%"]}
                  rows={data.brandDemand.slice(0, 6).map((item) => [
                    <Text style={styles.rowTitle}>
                      {safeText(item.productName, "Product", 20)}
                    </Text>,
                    safeText(item.topBrand, "Brand", 18),
                    money(item.topBrandRevenue),
                    <Text style={styles.positive}>
                      {pct(
                        Math.abs(item.topBrandShare) <= 1
                          ? item.topBrandShare * 100
                          : item.topBrandShare,
                      )}
                    </Text>,
                  ])}
                />
              ) : (
                <Empty>
                  Brand comparison appears when the same product sells across multiple brands.
                </Empty>
              )}
            </Section>
          </View>

          <View style={styles.colHalf}>
            <Section
              index={13}
              title="Low Margin & Loss Items"
              tone="red"
            >
              {lossItems.length > 0 ? (
                <Table
                  headers={["Loss item", "Sales", "Loss", "Margin"]}
                  widths={["40%", "20%", "20%", "20%"]}
                  rows={lossItems.map((item) => [
                    <Text style={styles.rowTitle}>{safeText(item.name, "Item", 22)}</Text>,
                    money(item.revenue),
                    <Text style={styles.negative}>{money(item.profit)}</Text>,
                    <Text style={styles.negative}>{pct(item.margin)}</Text>,
                  ])}
                />
              ) : lowMarginItems.length > 0 ? (
                <Table
                  headers={["Low margin", "Sales", "Profit", "Margin"]}
                  widths={["40%", "20%", "20%", "20%"]}
                  rows={lowMarginItems.map((item) => [
                    <Text style={styles.rowTitle}>{safeText(item.name, "Item", 22)}</Text>,
                    money(item.revenue),
                    money(item.profit),
                    <Text style={styles.warning}>{pct(item.margin)}</Text>,
                  ])}
                />
              ) : (
                <Empty>No loss-making or very low-margin item found.</Empty>
              )}
            </Section>
          </View>
        </View>

        <Section index={14} title="Recommendations" tone="amber">
          {actionItems.slice(0, 6).map((action, index) => (
            <View
              key={index}
              wrap={false}
              style={[
                styles.actionRow,
                index === Math.min(actionItems.length, 6) - 1
                  ? { borderBottomWidth: 0 }
                  : {},
              ]}
            >
              <Text
                style={[
                  styles.actionNo,
                  {
                    backgroundColor:
                      index === 0
                        ? palette.red.ink
                        : index === 1
                          ? palette.amber.ink
                          : palette.blue.ink,
                  },
                ]}
              >
                {index + 1}
              </Text>
              <Text style={styles.actionText}>{safeText(action, "Suggestion", 120)}</Text>
            </View>
          ))}
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Owner focus</Text>
            <Text style={styles.calloutText}>
              Start with sales change, worker performance, low stock, and loss items. These
              four points usually decide tomorrow&apos;s profit.
            </Text>
          </View>
        </Section>

        <PageFooter label={safeText(data.label, "Report")} />
      </Page>
    </Document>
  );
};
