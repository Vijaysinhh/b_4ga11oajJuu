"use client";

import { Bell, CircleAlert, CircleCheck } from "lucide-react";
import { useAlerts } from "@/hooks/use-db";
import { useLanguage } from "@/providers/language-provider";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const severityClassNames = {
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
};

export default function AlertsPage() {
  const { t } = useLanguage();
  const { alerts, isLoading } = useAlerts();
  const unreadCount = alerts.filter((alert) => !alert.read).length;

  const severityLabel = (severity: keyof typeof severityClassNames) => {
    const key = `severity_${severity}` as const;
    return t(key);
  };

  return (
    <PageContainer>
      <PageHeader title={t("alerts_title")} description={t("alerts_desc")} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("unread")}</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_label")}
            </CardTitle>
            <CircleAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id ?? `${alert.itemId}-${alert.createdAt}`}
              className="border-2"
            >
              <CardContent className="flex gap-3 p-4">
                <div className="mt-0.5">
                  {alert.read ? (
                    <CircleCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <CircleAlert className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{alert.itemName}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        severityClassNames[alert.severity],
                      )}
                    >
                      {severityLabel(alert.severity)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alert.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
            <Bell className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-medium text-muted-foreground">
              {t("no_alerts")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t("no_alerts_desc")}
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
