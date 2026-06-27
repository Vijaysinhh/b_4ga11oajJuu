"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  useAlerts,
  useItems,
  useSales,
  useStockHistory,
  useUdhari,
} from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadPremiumPdf } from "@/lib/premium-pdf";
import { formatMoney, formatNumber, formatPercent } from "@/lib/number-format";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Clock3,
  CreditCard,
  FileDown,
  Package,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  category: "stock" | "expiry" | "credit" | "activity";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  meta?: string;
  createdAt: number;
  href?: string;
  staffName?: string;
}

function getExpiryStatus(item: any, today: Date) {
  if (!item.expiryDate) return null;
  const expiryDate = new Date(item.expiryDate);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const expiryStart = new Date(expiryDate);
  expiryStart.setHours(0, 0, 0, 0);
  const sevenDaysAhead = new Date(today);
  sevenDaysAhead.setDate(today.getDate() + 7);
  if (expiryStart < today) return "expired";
  if (expiryStart <= sevenDaysAhead) return "expiring";
  return null;
}

export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const { user, currentShopId } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const { items } = useItems(currentShopId);
  const { sales } = useSales(currentShopId);
  const { stockHistory } = useStockHistory(currentShopId);
  const { customers, entries, totalPending } = useUdhari(currentShopId);
  const { alerts } = useAlerts(currentShopId);
  const [exporting, setExporting] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const lastNotifiedRef = useRef<string[]>([]);
  const actorName = useMemo(() => {
    const currentUser = user as any;
    return (
      currentUser?.fullName ||
      currentUser?.username ||
      currentUser?.name ||
      currentUser?.email ||
      "staff"
    ) as string;
  }, [user]);

  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const derived: NotificationItem[] = [];

    items.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const lowLimit = Number(item.lowStockLimit || 0);
      if (qty <= lowLimit && qty > 0) {
        derived.push({
          id: `low-stock-${item.id}`,
          category: "stock",
          severity: qty === 0 ? "critical" : "warning",
          title: language === "mr" ? "स्टॉक कमी" : "Low stock",
          message: `${item.name || item.nameMarathi || "Item"} ${language === "mr" ? "खूप कमी आहे" : "is running low"}`,
          meta: `${formatNumber(qty)} ${item.unitShortForm || ""}`.trim(),
          createdAt: item.updatedAt || Date.now(),
          href: "/items",
        });
      }

      const expiryStatus = getExpiryStatus(item, today);
      if (expiryStatus) {
        derived.push({
          id: `expiry-${item.id}`,
          category: "expiry",
          severity: expiryStatus === "expired" ? "critical" : "warning",
          title:
            expiryStatus === "expired"
              ? language === "mr"
                ? "मुदत संपली"
                : "Expired"
              : language === "mr"
                ? "लवकर मुदत संपते"
                : "Expiring soon",
          message: `${item.name || item.nameMarathi || "Item"} ${expiryStatus === "expired" ? (language === "mr" ? "ची मुदत संपली आहे" : "has expired") : language === "mr" ? "ची मुदत लवकर संपणार आहे" : "is nearing expiry"}`,
          meta: item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString(
                language === "mr" ? "mr-IN" : "en-IN",
              )
            : undefined,
          createdAt: item.updatedAt || Date.now(),
          href: "/items",
        });
      }
    });

    customers.forEach((customer) => {
      const balance = Number(customer.balance || 0);
      if (balance > 0) {
        const entriesForCustomer = entries
          .filter((entry) => entry.customerId === customer.id)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const lastActivity = entriesForCustomer[0];
        const daysSinceActivity = lastActivity
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - (lastActivity.timestamp || Date.now())) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 999;
        if (daysSinceActivity >= 15) {
          derived.push({
            id: `credit-${customer.id}`,
            category: "credit",
            severity: daysSinceActivity >= 30 ? "critical" : "warning",
            title: language === "mr" ? "उधारी थकले" : "Credit overdue",
            message: `${customer.name} ${language === "mr" ? "कडून उधारी बाकी आहे" : "has outstanding credit"}`,
            meta: `₹${formatMoney(balance)}`,
            createdAt:
              lastActivity?.timestamp || customer.updatedAt || Date.now(),
            href: "/udhari",
          });
        }
      }
    });

    sales.slice(0, 8).forEach((sale) => {
      derived.push({
        id: `sale-${sale.id}`,
        category: "activity",
        severity: "info",
        title: language === "mr" ? "विक्री नोंदवली" : "Sale recorded",
        message: `${sale.creditCustomerName ? `${sale.creditCustomerName} • ` : ""}₹${formatMoney(sale.subtotal || 0)} • ${language === "mr" ? "कर्मचारी" : "staff"}: ${actorName}`,
        meta: sale.date,
        createdAt: sale.timestamp || sale.createdAt || Date.now(),
        href: `/sales?focusSaleId=${sale.id}`,
        staffName: actorName,
      });
    });

    stockHistory.slice(0, 8).forEach((entry) => {
      derived.push({
        id: `stock-${entry.id}`,
        category: "activity",
        severity:
          entry.quantityChanged && entry.quantityChanged < 0
            ? "warning"
            : "info",
        title: language === "mr" ? "स्टॉक बदल" : "Stock change",
        message: `${entry.itemName || "Item"} ${entry.quantityChanged > 0 ? (language === "mr" ? "जोडले" : "added") : language === "mr" ? "कमी झाले" : "updated"} • ${language === "mr" ? "कर्मचारी" : "staff"}: ${actorName}`,
        meta: `${entry.type || "adjustment"}`,
        createdAt: entry.createdAt || Date.now(),
        href: "/items",
        staffName: actorName,
      });
    });

    entries
      .filter((entry) => entry.type === "credit")
      .slice(0, 6)
      .forEach((entry) => {
        derived.push({
          id: `udhari-${entry.id}`,
          category: "activity",
          severity: "info",
          title: language === "mr" ? "उधारी नोंद" : "Udhari entry",
          message: `${entry.customerName || "Customer"} ${language === "mr" ? "कडून उधारी नोंदवली" : "credit entry recorded"} • ${language === "mr" ? "कर्मचारी" : "staff"}: ${actorName}`,
          meta: `₹${formatMoney(entry.amount || 0)}`,
          createdAt: entry.timestamp || entry.createdAt || Date.now(),
          href: "/udhari",
          staffName: actorName,
        });
      });

    const persisted: NotificationItem[] = alerts.map((alert: any) => {
      const category: NotificationItem["category"] =
        alert.alertType === "low_stock" ||
        alert.alertType === "expiring" ||
        alert.alertType === "expired"
          ? "stock"
          : "activity";
      const severity: NotificationItem["severity"] =
        (alert.severity || "warning") as NotificationItem["severity"];

      return {
        id: `alert-${alert.id}`,
        category,
        severity,
        title:
          alert.alertType === "low_stock"
            ? language === "mr"
              ? "स्टॉक कमी"
              : "Low stock"
            : alert.alertType === "expiring" || alert.alertType === "expired"
              ? language === "mr"
                ? "मुदत संपते"
                : "Expiring"
              : language === "mr"
                ? "क्रियाकलाप"
                : "Activity",
        message: alert.message || "",
        meta: alert.data ? `${alert.data?.itemName || ""}`.trim() : undefined,
        createdAt: alert.createdAt || Date.now(),
        href:
          alert.alertType === "low_stock" ||
          alert.alertType === "expiring" ||
          alert.alertType === "expired"
            ? "/items"
            : "/reports",
      };
    });

    return [...persisted, ...derived]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 25);
  }, [
    alerts,
    actorName,
    customers,
    entries,
    items,
    language,
    sales,
    stockHistory,
  ]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((item) => !dismissedIds.includes(item.id));
  }, [dismissedIds, notifications]);

  const stats = useMemo(() => {
    const critical = visibleNotifications.filter(
      (item) => item.severity === "critical",
    ).length;
    const warning = visibleNotifications.filter(
      (item) => item.severity === "warning",
    ).length;
    return { critical, warning, total: visibleNotifications.length };
  }, [visibleNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(
        "dukan-notifications-dismissed",
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setDismissedIds(parsed);
      }
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "dukan-notifications-dismissed",
        JSON.stringify(dismissedIds),
      );
    } catch {
      // ignore storage issues
    }
  }, [dismissedIds]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.Notification === "undefined"
    )
      return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.Notification === "undefined"
    )
      return;
    const incoming = visibleNotifications.filter(
      (item) => !lastNotifiedRef.current.includes(item.id),
    );

    if (
      incoming.length > 0 &&
      document.visibilityState === "hidden" &&
      Notification.permission === "granted"
    ) {
      incoming.slice(0, 3).forEach((item) => {
        new Notification(item.title, {
          body: item.message,
          tag: item.id,
        });
      });
    }

    lastNotifiedRef.current = visibleNotifications.map((item) => item.id);
  }, [visibleNotifications]);

  const handleDismiss = (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleOpenNotification = (item: NotificationItem) => {
    handleDismiss(item.id);
    if (item.href) router.push(item.href);
  };

  const handleClearAll = () => {
    setDismissedIds((prev) =>
      Array.from(new Set([...prev, ...notifications.map((item) => item.id)])),
    );
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const revenue = sales.reduce(
        (sum, sale) => sum + Number(sale.subtotal || 0),
        0,
      );
      const cost = sales.reduce(
        (sum, sale) => sum + Number(sale.totalCost || 0),
        0,
      );
      const profit = revenue - cost;
      const paymentBreakdown = sales.reduce<
        Record<string, { count: number; amount: number }>
      >((acc, sale) => {
        const method = sale.paymentMethod || sale.payment_method || "cash";
        if (!acc[method]) acc[method] = { count: 0, amount: 0 };
        acc[method].count += 1;
        acc[method].amount += Number(sale.subtotal || 0);
        return acc;
      }, {});
      const topItems = Object.values(
        sales.reduce<
          Record<
            string,
            { name: string; quantity: number; revenue: number; profit: number }
          >
        >((acc, sale) => {
          (sale.items || []).forEach((item: any) => {
            const key = item.itemName || item.item_name || "item";
            if (!acc[key])
              acc[key] = { name: key, quantity: 0, revenue: 0, profit: 0 };
            acc[key].quantity += Number(item.quantity || 0);
            acc[key].revenue += Number(item.totalPrice || 0);
            acc[key].profit += Number(item.profit || 0);
          });
          return acc;
        }, {}),
      )
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      const totalStockValue = items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.buyPrice || 0),
        0,
      );
      const highestUdharCustomer =
        customers
          .filter((customer) => Number(customer.balance || 0) > 0)
          .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0] ||
        null;
      await downloadPremiumPdf(
        {
          label:
            language === "mr"
              ? "सूचना केंद्र अहवाल"
              : "Notification center report",
          sales,
          transactions: sales.length,
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
          topItems,
          shopName: "Dukan",
          totalStockValue,
          productsCount: items.length,
          lowStockItems: items
            .filter(
              (item) =>
                Number(item.quantity || 0) <= Number(item.lowStockLimit || 0),
            )
            .map((item) => ({
              name: item.name || item.nameMarathi || "Item",
              quantity: Number(item.quantity || 0),
              lowStockLimit: Number(item.lowStockLimit || 0),
            })),
          totalPendingUdhari: totalPending,
          highestUdharCustomer: highestUdharCustomer
            ? {
                name: highestUdharCustomer.name,
                balance: Number(highestUdharCustomer.balance || 0),
              }
            : null,
          paymentBreakdown,
          totalItemsSold: sales.reduce(
            (sum, sale) =>
              sum +
              (sale.items || []).reduce(
                (carry: number, item: any) =>
                  carry + Number(item.quantity || 0),
                0,
              ),
            0,
          ),
          averageBill: sales.length > 0 ? revenue / sales.length : 0,
          notifications: notifications.slice(0, 12),
        },
        `notification-center-${Date.now()}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  };

  const title = language === "mr" ? "सूचना केंद्र" : "Notification center";
  const subtitle =
    language === "mr"
      ? "स्टॉक, उधारी आणि recent कार्ये यांचे सारांश"
      : "A live overview of stock, credit, and recent activity";

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col gap-3 rounded-xl border bg-background/70 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Button
            onClick={handleExportPdf}
            disabled={exporting}
            variant="outline"
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            {exporting
              ? language === "mr"
                ? "PDF तयार करत आहे..."
                : "Preparing PDF..."
              : language === "mr"
                ? "PDF डाउनलोड करा"
                : "Download PDF"}
          </Button>
        </div>
      )}

      {compact ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
            <div>
              <p className="text-sm font-semibold">
                {language === "mr" ? "अलीकडील सूचना" : "Recent alerts"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? `${stats.total} ${language === "mr" ? "सूचना" : "notifications"}`
                  : language === "mr"
                    ? "सध्या कोणतीही सूचना नाही"
                    : "No alerts right now"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {visibleNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {language === "mr" ? "साफ करा" : "Clear"}
                </button>
              )}
              <Link
                href="/reports"
                className="flex items-center gap-1 text-sm font-medium text-primary"
              >
                {language === "mr" ? "सर्व पहा" : "View all"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {visibleNotifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              {language === "mr"
                ? "सध्या कोणतीही सूचना नाहीत."
                : "You are all caught up."}
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleNotifications.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-background p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(item)}
                      className="flex flex-1 items-start gap-2 text-left"
                    >
                      <div className="mt-0.5 rounded-full bg-muted p-1.5">
                        {item.category === "stock" && (
                          <Package className="h-3.5 w-3.5" />
                        )}
                        {item.category === "expiry" && (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        {item.category === "credit" && (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        {item.category === "activity" && (
                          <Activity className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {item.title}
                          </p>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                item.severity === "critical"
                                  ? "#ef4444"
                                  : item.severity === "warning"
                                    ? "#f59e0b"
                                    : "#3b82f6",
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.message}
                        </p>
                        {item.meta ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {item.meta}
                          </p>
                        ) : null}
                        {item.staffName ? (
                          <p className="mt-1 text-[11px] font-medium text-primary">
                            {language === "mr"
                              ? "कर्मचारी क्रिया"
                              : "Staff action"}
                            : {item.staffName}
                          </p>
                        ) : null}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleDismiss(item.id, event)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        language === "mr" ? "सूचना हटवा" : "Clear notification"
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "mr" ? "एकूण सूचना" : "Total alerts"}
                    </p>
                    <p className="text-2xl font-semibold">{stats.total}</p>
                  </div>
                  <BellRing className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "mr" ? "महत्वाचे" : "Critical"}
                    </p>
                    <p className="text-2xl font-semibold text-red-600">
                      {stats.critical}
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "mr" ? "धोक्याची पातळी" : "Needs attention"}
                    </p>
                    <p className="text-2xl font-semibold text-amber-600">
                      {stats.warning}
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {visibleNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {language === "mr"
                  ? "सध्या कोणतीही सूचना नाहीत."
                  : "No notifications right now."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleNotifications.map((item) => (
                <Card
                  key={item.id}
                  className="border-l-4"
                  style={{
                    borderLeftColor:
                      item.severity === "critical"
                        ? "#ef4444"
                        : item.severity === "warning"
                          ? "#f59e0b"
                          : "#3b82f6",
                  }}
                >
                  <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(item)}
                      className="flex flex-1 gap-3 text-left"
                    >
                      <div className="mt-0.5 rounded-full bg-muted p-2">
                        {item.category === "stock" && (
                          <Package className="h-4 w-4" />
                        )}
                        {item.category === "expiry" && (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        {item.category === "credit" && (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {item.category === "activity" && (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{item.title}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.message}
                        </p>
                        {item.meta ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.meta}
                          </p>
                        ) : null}
                        {item.staffName ? (
                          <p className="mt-1 text-xs font-medium text-primary">
                            {language === "mr"
                              ? "कर्मचारी क्रिया"
                              : "Staff action"}
                            : {item.staffName}
                          </p>
                        ) : null}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleDismiss(item.id, event)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        language === "mr" ? "सूचना हटवा" : "Clear notification"
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
