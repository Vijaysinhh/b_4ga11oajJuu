'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { SystemHealthStatus } from '@/components/SystemHealthStatus';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { DataBackupManager } from '@/components/DataBackupManager';
import { Activity, FileText, HardDrive, ArrowLeft } from 'lucide-react';

export default function AdminToolsPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || user.role !== 'super_admin') {
    router.push('/login/superadmin');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/super-admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Tools</h1>
            <p className="text-muted-foreground">System administration and monitoring tools</p>
          </div>
        </div>

        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Backup & Restore
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4">
            <SystemHealthStatus />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <DataBackupManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
