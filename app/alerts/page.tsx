'use client';

import { Bell, CircleAlert, CircleCheck } from 'lucide-react';
import { useAlerts } from '@/hooks/use-db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const severityClassNames = {
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
};

export default function AlertsPage() {
  const { alerts, isLoading } = useAlerts();
  const unreadCount = alerts.filter((alert) => !alert.read).length;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Stock and expiry notifications for your shop.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Unread</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total</CardTitle>
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
            <Card key={alert.id ?? `${alert.itemId}-${alert.createdAt}`} className="border-2">
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
                    <p className="font-semibold truncate">{alert.itemName}</p>
                    <Badge
                      variant="outline"
                      className={cn('capitalize', severityClassNames[alert.severity])}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No alerts right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Low stock and expiry alerts will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
