'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, Lock, HardDrive, Globe } from 'lucide-react';
import { HealthChecker, HealthCheckResult, HealthStatus, CheckType } from '@/lib/health-check';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_ICONS = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  unhealthy: XCircle,
};

const CHECK_TYPE_ICONS: Record<CheckType, React.ComponentType<any>> = {
  database: Database,
  api: Globe,
  storage: HardDrive,
  auth: Lock,
};

const CHECK_TYPE_NAMES: Record<CheckType, string> = {
  database: 'Database',
  api: 'API',
  storage: 'Storage',
  auth: 'Authentication',
};

function HealthCheckItem({ check }: { check: HealthCheckResult }) {
  const StatusIcon = STATUS_ICONS[check.status];
  const TypeIcon = CHECK_TYPE_ICONS[check.checkType];

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <TypeIcon className="w-5 h-5 text-muted-foreground" />
        <StatusIcon
          className={`w-5 h-5 ${
            check.status === 'healthy'
              ? 'text-green-500'
              : check.status === 'degraded'
              ? 'text-yellow-500'
              : 'text-red-500'
          }`}
        />
        <div>
          <p className="font-medium">{CHECK_TYPE_NAMES[check.checkType]}</p>
          <p className="text-sm text-muted-foreground">{check.errorMessage}</p>
          {check.responseTimeMs && (
            <p className="text-xs text-muted-foreground">
              Response: {check.responseTimeMs}ms
            </p>
          )}
        </div>
      </div>
      <Badge
        className={
          check.status === 'healthy'
            ? 'bg-green-100 text-green-800'
            : check.status === 'degraded'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }
      >
        {check.status}
      </Badge>
    </div>
  );
}

export function SystemHealthStatus() {
  const [checks, setChecks] = useState<HealthCheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = async () => {
    setIsLoading(true);
    const results = await HealthChecker.runAllChecks();
    setChecks(results);
    setLastChecked(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    runChecks();
    // Auto-check every 5 minutes
    const interval = setInterval(runChecks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = checks.length > 0 ? HealthChecker.getOverallStatus(checks) : 'healthy';
  const OverallIcon = STATUS_ICONS[overallStatus];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </CardTitle>
            <CardDescription>
              {lastChecked
                ? `Last checked: ${lastChecked.toLocaleString()}`
                : 'Checking system status...'}
            </CardDescription>
          </div>
          <Button onClick={runChecks} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-6 p-4 border rounded-lg">
          <OverallIcon
            className={`w-8 h-8 ${
              overallStatus === 'healthy'
                ? 'text-green-500'
                : overallStatus === 'degraded'
                ? 'text-yellow-500'
                : 'text-red-500'
            }`}
          />
          <div>
            <p className="font-semibold text-lg">
              System Status:{' '}
              <span
                className={
                  overallStatus === 'healthy'
                    ? 'text-green-600'
                    : overallStatus === 'degraded'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }
              >
                {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {checks.length} checks completed
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))
          ) : (
            checks.map((check, i) => <HealthCheckItem key={i} check={check} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
