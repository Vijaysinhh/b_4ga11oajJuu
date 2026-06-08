'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase-sync';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

interface AuditLog {
  id: number;
  action: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  user_id?: number;
  shop_id?: number;
  created_at: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: 'all' as 'all' | 'create' | 'update' | 'delete',
    tableName: 'all',
    search: '',
  });

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);

      if (filter.action !== 'all') {
        query = query.eq('action', filter.action);
      }
      if (filter.tableName !== 'all') {
        query = query.eq('table_name', filter.tableName);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !filter.search ||
      log.table_name.toLowerCase().includes(filter.search.toLowerCase()) ||
      log.action.toLowerCase().includes(filter.search.toLowerCase());
    return matchesSearch;
  });

  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5" />
          <CardTitle>Audit Logs</CardTitle>
        </div>
        <CardDescription>Track all changes made to the system</CardDescription>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filter.action}
            onValueChange={(v: any) => setFilter({ ...filter, action: v })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.tableName}
            onValueChange={(v) => setFilter({ ...filter, tableName: v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = ACTION_ICONS[log.action as keyof typeof ACTION_ICONS] || FileText;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`w-4 h-4 ${
                              log.action === 'create'
                                ? 'text-green-500'
                                : log.action === 'update'
                                ? 'text-blue-500'
                                : 'text-red-500'
                            }`}
                          />
                          <Badge className={ACTION_COLORS[log.action as keyof typeof ACTION_COLORS]}>
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.table_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.record_id || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
