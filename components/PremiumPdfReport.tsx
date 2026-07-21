"use client";

import React, { ReactNode, useMemo } from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatMoney, formatNumber, formatPercent } from "@/lib/number-format";
import type { PremiumReportData } from "@/lib/simple-pdf";

type Tone = "navy" | "green" | "blue" | "amber" | "red" | "purple" | "slate";
type StockReportItem = NonNullable<PremiumReportData["stockItems"]>[number];

const palette: Record<Tone, { ink: string; bg: string; border: string; soft: string }> = {
  navy: { ink: "#0b245c", bg: "#eef4ff", border: "#bfdbfe", soft: "#dbeafe" },
  green: { ink: "#147a3f", bg: "#f0fdf4", border: "#bbf7d0", soft: "#dcfce7" },
  blue: { ink: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", soft: "#dbeafe" },
  amber: { ink: "#b45309", bg: "#fffbeb", border: "#fde68a", soft: "#fef3c7" },
  red: { ink: "#dc2626", bg: "#fef2f2", border: "#fecaca", soft: "#fee2e2" },
  purple: { ink: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", soft: "#ede9fe" },
  slate: { ink: "#475569", bg: "#f8fafc", border: "#cbd5e1", soft: "#e2e8f0" },
};

const styles = StyleSheet.create({
  page: {
    padding: 14,
    paddingBottom: 28,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111827",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#0b245c",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  brand: {
    color: "#0b245c",
    fontSize: 17,
    fontWeight: "bold",
  },
  title: {
    color: "#0b245c",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 2,
  },
  meta: {
    color: "#64748b",
    fontSize: 8,
    marginTop: 2,
  },
  premiumBadge: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
    color: "#92400e",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  colLarge: {
    width: "58%",
    gap: 8,
  },
  colSmall: {
    width: "42%",
    gap: 8,
  },
  colHalf: {
    width: "50%",
    gap: 8,
  },
  colThird: {
    width: "33.33%",
    gap: 8,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 9,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIndex: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#0b245c",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 5,
    marginRight: 7,
  },
  sectionTitle: {
    color: "#0b245c",
    fontSize: 13,
    fontWeight: "bold",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 7,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 8,
  },
  metric: {
    flex: 1,
    minHeight: 62,
    borderRadius: 7,
    borderWidth: 1,
    padding: 9,
  },
  metricLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    marginBottom: 7,
  },
  metricValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "bold",
  },
  metricSub: {
    color: "#64748b",
    fontSize: 7.2,
    marginTop: 6,
  },
  table: {
    borderRadius: 7,
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
    minHeight: 24,
  },
  tableHeadCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#0b245c",
    fontSize: 7.2,
    fontWeight: "bold",
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 7.4,
    justifyContent: "center",
  },
  rowTitle: {
    color: "#111827",
    fontWeight: "bold",
  },
  subText: {
    color: "#64748b",
    fontSize: 7,
    marginTop: 2,
  },
  positive: {
    color: "#15803d",
    fontWeight: "bold",
  },
  negative: {
    color: "#dc2626",
    fontWeight: "bold",
  },
  warning: {
    color: "#b45309",
    fontWeight: "bold",
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 7,
  },
  chipLabel: {
    color: "#64748b",
    fontSize: 7,
  },
  chipValue: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 3,
  },
  barTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    marginTop: 4,
  },
  barFill: {
    height: 5,
    borderRadius: 999,
  },
  callout: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: 8,
    marginTop: 8,
  },
  calloutTitle: {
    color: "#78350f",
    fontSize: 8.4,
    fontWeight: "bold",
    marginBottom: 3,
  },
  calloutText: {
    color: "#78350f",
    fontSize: 7.6,
    lineHeight: 1.35,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 6.8,
    fontWeight: "bold",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 7,
  },
  actionNo: {
    width: 18,
    height: 18,
    borderRadius: 5,
    color: "#ffffff",
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 5,
    marginRight: 7,
  },
  actionText: {
    flex: 1,
    color: "#334155",
    fontSize: 8,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    paddingTop: 5,
    color: "#64748b",
    fontSize: 7,
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
  return chunks;
}

function text(value: unknown, fallback = "N/A", maxLength = 42) {
  const safe = String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const finalValue = safe || fallback;
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
  if (Number.isNaN(date.getTime())) return text(value, "N/A", 14);
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
  return labels[method] || text(method, "Other", 18);
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
  return labels[type] || text(type, "Update", 14);
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
      <View style={styles.sectionHeader}>
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
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: palette[tone].bg, borderColor: palette[tone].border },
      ]}
    >
      <Text style={[styles.metricLabel, { color: palette[tone].ink }]}>
        {label}
      </Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
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
            key={header}
            style={[styles.tableHeadCell, { width: widths[index] }]}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
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

function ReportHeader({
  data,
  generatedAt,
}: {
  data: PremiumReportData;
  generatedAt: Date;
}) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <View>
            <Text style={styles.brand}>DUKAN</Text>
            <Text style={styles.meta}>{text(data.shopName, "Dukan Shop")}</Text>
          </View>
        </View>
        <Text style={styles.title}>{text(data.label, "Selected Period")} Dukan Report</Text>
        <Text style={styles.meta}>
          Generated {generatedAt.toLocaleDateString("en-IN", {
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
      <Text style={styles.premiumBadge}>PREMIUM{"\n"}DUKAN REPORT</Text>
    </View>
  );
}

function Footer({ page }: { page: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>DUKAN premium report</Text>
      <Text>Page {page}</Text>
    </View>
  );
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
  const stockChunks = chunkArray(stockItems, 15);
  const stockPages = stockChunks.length ? stockChunks : [[]];
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
    .slice(0, 5);
  const lowMarginItems = [...itemPerformance]
    .filter((item) => item.profit >= 0 && item.margin < 10)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5);
  const lossItems = [...itemPerformance]
    .filter((item) => item.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);
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
  const actionItems =
    data.suggestions && data.suggestions.length > 0
      ? data.suggestions
      : [
          "Restock low and out-of-stock items before peak sale time.",
          "Check low-margin item prices against latest purchase cost.",
          "Use worker-wise sales to coach billing and margin habits.",
        ];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} />

        <View style={styles.grid}>
          <View style={styles.colLarge}>
            <Section index={1} title="Sales Data First" hint={`vs ${comparisonLabel}`} tone="green">
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
                    <View key={method} style={styles.chip}>
                      <Text style={styles.chipLabel}>{paymentName(method)}</Text>
                      <Text style={styles.chipValue}>{money(entry.amount)}</Text>
                      <Text style={styles.subText}>
                        {paymentTotal > 0
                          ? pct((entry.amount / paymentTotal) * 100)
                          : "0%"}{" "}
                        mix
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

            <Section index={2} title="Profit And Margin" tone="blue">
              <View style={styles.metricGrid}>
                <Metric label="Total Cost" value={money(data.cost)} sub="Sold stock cost" tone="slate" />
                <Metric label="Total Profit" value={money(data.profit)} sub={`${pct(data.margin)} margin`} tone={data.profit >= 0 ? "green" : "red"} />
                <Metric label="Best Profit Item" value={bestProfitItem ? money(bestProfitItem.profit) : money(0)} sub={bestProfitItem ? text(bestProfitItem.name, "Item", 22) : "No item"} tone="amber" />
              </View>

              {goodMarginItems.length > 0 ? (
                <Table
                  headers={["Good margin item", "Sales", "Profit", "Margin"]}
                  widths={["42%", "20%", "20%", "18%"]}
                  rows={goodMarginItems.map((item) => [
                    <Text style={styles.rowTitle}>{text(item.name, "Item", 28)}</Text>,
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
          </View>

          <View style={styles.colSmall}>
            <Section index={3} title="Worker Wise Sales" tone="purple">
              {data.staffSales?.length ? (
                <Table
                  headers={["Worker", "Sales", "Profit", "Bills", "Udhari"]}
                  widths={["30%", "22%", "20%", "13%", "15%"]}
                  rows={data.staffSales.slice(0, 7).map((worker) => [
                    <View>
                      <Text style={styles.rowTitle}>{text(worker.staffName, "Worker", 20)}</Text>
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
                <Empty>Worker-wise sales will appear when sales are linked to staff accounts.</Empty>
              )}

              {bestStaff ? (
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>Top worker</Text>
                  <Text style={styles.calloutText}>
                    {text(bestStaff.staffName, "Worker", 22)} made {money(bestStaff.revenue)} sales with {money(bestStaff.profit || 0)} profit.
                  </Text>
                </View>
              ) : null}
            </Section>

            <Section index={4} title="Top Sold Items" tone="green">
              {topItems.length > 0 ? (
                <Table
                  headers={["Item", "Qty", "Sales", "Profit"]}
                  widths={["42%", "16%", "22%", "20%"]}
                  rows={topItems.map((item) => [
                    <View>
                      <Text style={styles.rowTitle}>{text(item.name, "Item", 24)}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${clamp((item.revenue / topRevenue) * 100)}%`,
                              backgroundColor: palette.green.ink,
                            },
                          ]}
                        />
                      </View>
                    </View>,
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
          </View>
        </View>

        <Footer page={1} />
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} />

        <View style={styles.grid}>
          <View style={styles.colLarge}>
            <Section index={5} title="Stock Stats And Item Numbers" hint="current inventory" tone="amber">
              <View style={styles.metricGrid}>
                <Metric label="Total Stock Value" value={money(data.totalStockValue)} sub="Current inventory worth" tone="purple" />
                <Metric label="Total Items" value={formatNumber(data.productsCount)} sub={`${stockSummary.healthy} healthy`} tone="blue" />
                <Metric label="Need Attention" value={formatNumber(stockSummary.low + stockSummary.out + stockSummary.expired + stockSummary.expiring)} sub={`${stockSummary.out} out, ${stockSummary.low} low`} tone={stockSummary.low + stockSummary.out > 0 ? "red" : "green"} />
                <Metric label="Stock Health" value={pct(stockHealth)} sub={`${stockSummary.expired + stockSummary.expiring} expiry alerts`} tone={stockHealth >= 75 ? "green" : "amber"} />
              </View>

              {stockItems.length > 0 ? (
                <Table
                  headers={["Item", "Stock", "Value", "Margin", "Status", "Dates"]}
                  widths={["28%", "14%", "15%", "14%", "12%", "17%"]}
                  rows={stockPages[0].map((item) => {
                    const tone = statusTone(item.status);
                    return [
                      <View>
                        <Text style={styles.rowTitle}>{text(item.name, "Item", 24)}</Text>
                        <Text style={styles.subText}>{text(item.brand, "No brand", 20)}</Text>
                      </View>,
                      `${formatNumber(item.quantity)} ${text(item.unit, "unit", 6)}`,
                      money(item.stockValue),
                      <View>
                        <Text style={item.marginPercent >= 15 ? styles.positive : styles.warning}>
                          {pct(item.marginPercent)}
                        </Text>
                        <Text style={styles.subText}>{money(item.marginAmount)}/unit</Text>
                      </View>,
                      <Text
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
                      <View>
                        <Text>Updated {shortDate(item.lastUpdated)}</Text>
                        <Text style={styles.subText}>Sold {shortDate(item.lastSoldDate)}</Text>
                      </View>,
                    ];
                  })}
                />
              ) : (
                <Empty>No stock items are available for this shop.</Empty>
              )}
            </Section>
          </View>

          <View style={styles.colSmall}>
            <Section index={6} title="Date Wise Stock Updates" tone="blue">
              {stockMovements.length > 0 ? (
                <Table
                  headers={["Date", "Item", "Type", "Change", "After"]}
                  widths={["18%", "34%", "17%", "16%", "15%"]}
                  rows={stockMovements.slice(0, 12).map((movement) => [
                    shortDate(movement.date),
                    <Text style={styles.rowTitle}>{text(movement.itemName, "Item", 22)}</Text>,
                    movementLabel(movement.type),
                    <Text
                      style={movement.quantityChanged < 0 ? styles.negative : styles.positive}
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

            <Section index={7} title="Udhari Position" tone="red">
              <View style={styles.metricGrid}>
                <Metric label="Total Pending" value={money(data.totalPendingUdhari)} sub="All customers" tone="red" />
                <Metric label="Report Udhari" value={money(data.paymentBreakdown.udhar?.amount || 0)} sub={`${data.paymentBreakdown.udhar?.count || 0} bills`} tone="amber" />
              </View>
              {data.highestUdharCustomer ? (
                <View style={[styles.callout, { marginTop: 0 }]}>
                  <Text style={styles.calloutTitle}>Collect first</Text>
                  <Text style={styles.calloutText}>
                    {text(data.highestUdharCustomer.name, "Customer", 24)} has {money(data.highestUdharCustomer.balance)} pending.
                  </Text>
                </View>
              ) : (
                <Empty>No pending udhari customer in this report.</Empty>
              )}
            </Section>
          </View>
        </View>

        <Footer page={2} />
      </Page>

      {stockPages.slice(1).map((chunk, pageIndex) => (
        <Page
          key={`stock-${pageIndex}`}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          <ReportHeader data={data} generatedAt={generatedAt} />
          <Section
            index={8 + pageIndex}
            title="Full Stock List Continued"
            hint={`${stockItems.length} total items`}
            tone="amber"
          >
            <Table
              headers={["Item", "Stock", "Value", "Buy/Sell", "Margin", "Dates", "Status"]}
              widths={["25%", "12%", "13%", "15%", "12%", "15%", "8%"]}
              rows={chunk.map((item) => {
                const tone = statusTone(item.status);
                return [
                  <View>
                    <Text style={styles.rowTitle}>{text(item.name, "Item", 26)}</Text>
                    <Text style={styles.subText}>{text(item.brand, "No brand", 18)}</Text>
                  </View>,
                  `${formatNumber(item.quantity)} ${text(item.unit, "unit", 6)}`,
                  money(item.stockValue),
                  <View>
                    <Text>Buy {money(item.buyPrice)}</Text>
                    <Text style={styles.subText}>Sell {money(item.sellPrice)}</Text>
                  </View>,
                  <Text style={item.marginPercent >= 15 ? styles.positive : styles.warning}>
                    {pct(item.marginPercent)}
                  </Text>,
                  <View>
                    <Text>Upd {shortDate(item.lastUpdated)}</Text>
                    <Text style={styles.subText}>Sold {shortDate(item.lastSoldDate)}</Text>
                  </View>,
                  <Text
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
                ];
              })}
            />
          </Section>
          <Footer page={3 + pageIndex} />
        </Page>
      ))}

      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader data={data} generatedAt={generatedAt} />

        <View style={styles.grid}>
          <View style={styles.colThird}>
            <Section index={20} title="Brand Comparison" tone="purple">
              {data.brandDemand?.length ? (
                <Table
                  headers={["Product", "Winning brand", "Brand sales", "Share"]}
                  widths={["32%", "28%", "22%", "18%"]}
                  rows={data.brandDemand.slice(0, 8).map((item) => [
                    <Text style={styles.rowTitle}>{text(item.productName, "Product", 20)}</Text>,
                    text(item.topBrand, "Brand", 18),
                    money(item.topBrandRevenue),
                    <Text style={styles.positive}>
                      {pct(Math.abs(item.topBrandShare) <= 1 ? item.topBrandShare * 100 : item.topBrandShare)}
                    </Text>,
                  ])}
                />
              ) : (
                <Empty>Brand comparison appears when the same product sells across multiple brands.</Empty>
              )}
              {bestBrand ? (
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>Brand insight</Text>
                  <Text style={styles.calloutText}>
                    {text(bestBrand.topBrand, "Brand", 20)} is leading in {text(bestBrand.productName, "product", 20)}. Keep reorder priority aligned with demand.
                  </Text>
                </View>
              ) : null}
            </Section>
          </View>

          <View style={styles.colThird}>
            <Section index={21} title="Low Margin And Loss Items" tone="red">
              {lossItems.length > 0 ? (
                <Table
                  headers={["Loss item", "Sales", "Loss", "Margin"]}
                  widths={["40%", "20%", "20%", "20%"]}
                  rows={lossItems.map((item) => [
                    <Text style={styles.rowTitle}>{text(item.name, "Item", 22)}</Text>,
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
                    <Text style={styles.rowTitle}>{text(item.name, "Item", 22)}</Text>,
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

          <View style={styles.colThird}>
            <Section index={22} title="Insights And Suggestions" tone="amber">
              {actionItems.slice(0, 7).map((action, index) => (
                <View
                  key={index}
                  style={[
                    styles.actionRow,
                    index === Math.min(actionItems.length, 7) - 1
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
                  <Text style={styles.actionText}>{text(action, "Suggestion", 115)}</Text>
                </View>
              ))}

              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Owner focus</Text>
                <Text style={styles.calloutText}>
                  Start with sales change, worker performance, low stock, and loss items. These four points usually decide tomorrow's profit.
                </Text>
              </View>
            </Section>
          </View>
        </View>

        <Footer page={3 + Math.max(stockPages.length - 1, 0)} />
      </Page>
    </Document>
  );
};
