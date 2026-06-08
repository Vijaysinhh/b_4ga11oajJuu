'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { BackupService, BackupData } from '@/lib/backup-service';
import { Download, Upload, HardDrive, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DataBackupManager({ shopId }: { shopId?: string | number }) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setProgress(30);
      const backup = await BackupService.createBackup(shopId);
      setProgress(70);
      BackupService.downloadBackup(backup);
      setProgress(100);

      toast({
        title: 'Backup Created',
        description: 'Your data has been successfully backed up and downloaded.',
      });
    } catch (e: any) {
      toast({
        title: 'Backup Failed',
        description: e?.message || 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      setProgress(20);

      const content = await file.text();
      const backupData = JSON.parse(content);

      if (!BackupService.validateBackup(backupData)) {
        throw new Error('Invalid backup file format');
      }

      setProgress(50);

      const results = await BackupService.restoreBackup(backupData, shopId);
      setProgress(100);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      toast({
        title: 'Restore Complete',
        description: `Restored ${successCount} tables successfully${
          failCount > 0 ? `, ${failCount} failed` : ''
        }`,
      });
    } catch (e: any) {
      toast({
        title: 'Restore Failed',
        description: e?.message || 'Failed to restore backup',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setProgress(0), 2000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-5 h-5" />
          <CardTitle>Data Backup & Restore</CardTitle>
        </div>
        <CardDescription>Backup your data and restore from previous backups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Create & Download Backup
            </Button>

            <div className="flex-1">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={isRestoring}
                className="cursor-pointer"
              />
            </div>
          </div>

          {(isCreatingBackup || isRestoring) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {isCreatingBackup ? 'Creating backup...' : 'Restoring backup...'}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Important Notes
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Store your backups securely in a safe location</li>
            <li>• Restoring a backup will overwrite existing data</li>
            <li>• Always create a backup before restoring</li>
            <li>• Backups are not stored on our servers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
