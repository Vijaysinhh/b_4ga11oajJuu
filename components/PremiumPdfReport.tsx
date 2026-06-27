import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatMoney, formatPercent, formatNumber } from "@/lib/number-format";

interface ReportData {
  label: string;
  sales: any[];
  transactions: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  shopName: string;
  totalStockValue: number;
  productsCount: number;
  lowStockItems: Array<{
    name: string;
    quantity: number;
    lowStockLimit: number;
  }>;
  totalPendingUdhari: number;
  highestUdharCustomer: { name: string; balance: number } | null;
  paymentBreakdown: Record<
    string,
    { count: number; amount: number }
  >;
  totalItemsSold: number;
  averageBill: number;
  dailyData?: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    meta?: string;
    severity: string;
    category: string;
  }>;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
    padding: 16,
    backgroundColor: "#1e40af",
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#dbeafe",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: 2,
    borderBottomColor: "#dbeafe",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    padding: 12,
    backgroundColor: "white",
    borderRadius: 6,
    border: 1,
    borderColor: "#e5e7eb",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
  },
  table: {
    width: "100%",
    border: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    backgroundColor: "white",
  },
  tableHeader: {
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    borderBottom: 2,
    borderBottomColor: "#bfdbfe",
  },
  tableHeaderCell: {
    padding: 8,
    fontWeight: "bold",
    fontSize: 10,
    color: "#1e40af",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    color: "#374151",
  },
  mutedText: {
    color: "#6b7280",
  },
  greenText: {
    color: "#059669",
  },
  redText: {
    color: "#dc2626",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
  },
  chartContainer: {
    padding: 12,
    backgroundColor: "white",
    borderRadius: 6,
    border: 1,
    borderColor: "#e5e7eb",
    marginTop: 10,
  },
  barChartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  barLabel: {
    width: "20%",
    fontSize: 9,
    color: "#4b5563",
    fontWeight: 500,
  },
  barWrapper: {
    width: "70%",
    height: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginRight: 8,
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  barValue: {
    width: "10%",
    fontSize: 9,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "right",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    color: "#4b5563",
  },
});

const truncateText = (text: string, maxLength: number = 12) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
};

export const PremiumPdfReport = ({ data }: { data: ReportData }) => {
  const dailyData = useMemo(() => {
    if (data.dailyData && data.dailyData.length > 0) return data.dailyData;
    const dailyMap = new Map<string, { revenue: number; cost: number; profit: number }>();
    data.sales.forEach(sale => {
      const date = sale.date;
      const existing = dailyMap.get(date) || { revenue: 0, cost: 0, profit: 0 };
      dailyMap.set(date, {
        revenue: existing.revenue + (sale.subtotal || 0),
        cost: existing.cost + (sale.totalCost || 0),
        profit: existing.profit + (sale.totalProfit || 0),
      });
    });
    return Array.from(dailyMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [data.sales, data.dailyData]);

  const maxRevenue = useMemo(() => Math.max(...dailyData.map(d => d.revenue), 1), [dailyData]);
  const maxTopItemRevenue = useMemo(() => Math.max(...data.topItems.map(d => d.revenue), 1), [data.topItems]);
  const totalPaymentAmount = useMemo(() => Object.values(data.paymentBreakdown).reduce((sum, val) => sum + val.amount, 0), [data.paymentBreakdown]);
  const stockLevels = useMemo(() => {
    const lowStock = data.lowStockItems.length;
    const normalStock = data.productsCount - lowStock;
    return [
      { name: "Normal Stock", value: normalStock, color: "#059669" },
      { name: "Low Stock", value: lowStock, color: "#f59e0b" },
    ];
  }, [data.lowStockItems, data.productsCount]);
  const maxStockLevelValue = useMemo(() => Math.max(...stockLevels.map(s => s.value), 1), [stockLevels]);
  const paymentColors = ["#2563eb", "#059669", "#7c3aed", "#f59e0b"];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.shopName || "Dukan Report"}</Text>
          <Text style={styles.subtitle}>{data.label}</Text>
          <Text style={[styles.subtitle, { fontSize: 11, marginTop: 8 }]}>
            Generated on {new Date().toLocaleDateString("en-IN", { 
              weekday: "long", year: "numeric", month: "long", day: "numeric" 
            })} at {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{data.transactions}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Items Sold</Text>
              <Text style={styles.summaryValue}>{formatNumber(data.totalItemsSold)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={[styles.summaryValue, { color: "#2563eb" }]}>
                Rs. {formatMoney(data.revenue)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Cost</Text>
              <Text style={[styles.summaryValue, { color: "#7c3aed" }]}>
                Rs. {formatMoney(data.cost)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={[
                styles.summaryValue,
                data.profit >= 0 ? styles.greenText : styles.redText,
              ]}>
                Rs. {formatMoney(data.profit)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Margin</Text>
              <Text style={[styles.summaryValue, { color: "#059669" }]}>
                {formatPercent(data.margin)}%
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Average Bill</Text>
              <Text style={styles.summaryValue}>
                Rs. {formatMoney(data.averageBill)}
              </Text>
            </View>
          </View>
        </View>

        {dailyData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            <View style={styles.chartContainer}>
              {dailyData.map((day, index) => (
                <View key={index} style={styles.barChartRow}>
                  <Text style={styles.barLabel}>
                    {new Date(day.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View style={[
                      styles.bar, 
                      { width: `${(day.revenue / maxRevenue) * 100}%`, backgroundColor: "#2563eb" }
                    ]} />
                  </View>
                  <Text style={styles.barValue}>Rs. {formatMoney(day.revenue)}</Text>
                </View>
              ))}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#2563eb" }]} />
                  <Text style={styles.legendText}>Revenue</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {data.topItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Items by Revenue</Text>
            <View style={styles.chartContainer}>
              {data.topItems.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.barChartRow}>
                  <Text style={styles.barLabel}>{truncateText(item.name)}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[
                      styles.bar, 
                      { width: `${(item.revenue / maxTopItemRevenue) * 100}%`, backgroundColor: "#059669" }
                    ]} />
                  </View>
                  <Text style={styles.barValue}>Rs. {formatMoney(item.revenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Levels</Text>
          <View style={styles.chartContainer}>
            {stockLevels.map((level, index) => (
              <View key={index} style={styles.barChartRow}>
                <Text style={styles.barLabel}>{level.name}</Text>
                <View style={styles.barWrapper}>
                  <View style={[
                    styles.bar, 
                    { width: `${(level.value / maxStockLevelValue) * 100}%`, backgroundColor: level.color }
                  ]} />
                </View>
                <Text style={styles.barValue}>{level.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {Object.keys(data.paymentBreakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.chartContainer}>
              {Object.entries(data.paymentBreakdown).map(([method, breakdown], index) => (
                <View key={method} style={styles.barChartRow}>
                  <Text style={styles.barLabel}>{method.charAt(0).toUpperCase() + method.slice(1)}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[
                      styles.bar, 
                      { width: `${(breakdown.amount / totalPaymentAmount) * 100}%`, backgroundColor: paymentColors[index % paymentColors.length] }
                    ]} />
                  </View>
                  <Text style={styles.barValue}>Rs. {formatMoney(breakdown.amount)}</Text>
                </View>
              ))}
              <View style={styles.legend}>
                {Object.entries(data.paymentBreakdown).map(([method, breakdown], index) => (
                  <View key={method} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: paymentColors[index % paymentColors.length] }]} />
                    <Text style={styles.legendText}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}: {formatPercent((breakdown.amount / totalPaymentAmount) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { width: "25%" }]}>
                <Text>Method</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: "25%" }]}>
                <Text>Count</Text>
              </View>
              <View style={[styles.tableHeaderCell, { width: "50%" }]}>
                <Text>Amount</Text>
              </View>
            </View>
            {Object.entries(data.paymentBreakdown).map(([method, breakdown]) => (
              <View style={styles.tableRow} key={method}>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{method.charAt(0).toUpperCase() + method.slice(1)}</Text>
                </View>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{breakdown.count}</Text>
                </View>
                <View style={[styles.tableCell, { width: "50%" }]}>
                  <Text>Rs. {formatMoney(breakdown.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Items</Text>
          {data.topItems.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: "40%" }]}>
                  <Text>Item</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Qty Sold</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Revenue</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Profit</Text>
                </View>
              </View>
              {data.topItems.map((item, index) => (
                <View style={styles.tableRow} key={index}>
                  <View style={[styles.tableCell, { width: "40%" }]}>
                    <Text>{item.name}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text>{formatNumber(item.quantity)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text>Rs. {formatMoney(item.revenue)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text style={styles.greenText}>Rs. {formatMoney(item.profit)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 10, color: "#6b7280" }}>
              No items sold in this period
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Stock Worth</Text>
              <Text style={[styles.summaryValue, { color: "#7c3aed" }]}>
                Rs. {formatMoney(data.totalStockValue)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Products</Text>
              <Text style={styles.summaryValue}>{data.productsCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Low Stock Items</Text>
              <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>
                {data.lowStockItems.length}
              </Text>
            </View>
          </View>
        </View>

        {data.lowStockItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: "60%" }]}>
                  <Text>Item</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Current</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Limit</Text>
                </View>
              </View>
              {data.lowStockItems.map((item, index) => (
                <View style={styles.tableRow} key={index}>
                  <View style={[styles.tableCell, { width: "60%" }]}>
                    <Text>{item.name}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text style={styles.redText}>{item.quantity}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text>{item.lowStockLimit}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.notifications && data.notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: "35%" }]}>
                  <Text>Title</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "45%" }]}>
                  <Text>Details</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: "20%" }]}>
                  <Text>Meta</Text>
                </View>
              </View>
              {data.notifications.slice(0, 10).map((item, index) => (
                <View style={styles.tableRow} key={item.id || index}>
                  <View style={[styles.tableCell, { width: "35%" }]}>
                    <Text>{truncateText(item.title, 26)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "45%" }]}>
                    <Text>{truncateText(item.message, 70)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "20%" }]}>
                    <Text style={styles.mutedText}>{item.meta || item.category}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Udhari Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Udhari Sales</Text>
              <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>
                Rs. {formatMoney(data.paymentBreakdown.udhar?.amount || 0)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Pending</Text>
              <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>
                Rs. {formatMoney(data.totalPendingUdhari)}
              </Text>
            </View>
            {data.highestUdharCustomer && (
              <View style={[styles.summaryCard, { width: "100%" }]}>
                <Text style={styles.summaryLabel}>Highest Udhari Customer</Text>
                <Text style={styles.summaryValue}>
                  {data.highestUdharCustomer.name} - Rs.{" "}
                  {formatMoney(data.highestUdharCustomer.balance)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>© {new Date().getFullYear()} Dukan Management System</Text>
        </View>
      </Page>
    </Document>
  );
};
