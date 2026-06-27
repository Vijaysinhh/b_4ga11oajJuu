'use client';

import { useLanguage } from '@/providers/language-provider';
import { useAuth } from '@/providers/auth-provider';
import type { User } from '@/providers/auth-provider';
import { PageContainer, PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { CategoriesManagement } from '@/app/categories/components';
import { UnitsManagement } from '@/app/units/components';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  // If not owner, don't show settings
  if (!user || user.role !== 'owner') {
    return (
      <PageContainer>
        <PageHeader title="Access Denied" description="Only owners can access settings" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={t('settings')} description={t('settings_desc')} />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="general">{t("general")}</TabsTrigger>
          <TabsTrigger value="categories">{t("categories")}</TabsTrigger>
          <TabsTrigger value="units">{t("units")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <Globe className="h-5 w-5" />
                {t('language')}
              </CardTitle>
              <CardDescription>{t('language_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'mr')}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="mr">{t('marathi')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-4 text-sm text-muted-foreground">
                {language === 'mr' ? t('language_note_mr') : t('language_note_en')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesManagement embedded />
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <UnitsManagement embedded />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function WorkersManagement() {
  const { user: currentUser, currentShopId } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (currentShopId) {
      loadWorkers();
    }
  }, [currentShopId]);

  const loadWorkers = async () => {
    if (!currentShopId) return;
    const { data } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('shop_id', currentShopId)
      .eq('role', 'worker');
    setWorkers(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.password) {
      toast({ title: 'Error', description: 'Please fill all required fields' });
      return;
    }

    if (!currentShopId) return;

    const now = new Date().toISOString();
    if (editingWorker) {
      await (supabase as any)
        .from('users')
        .update({
          username: formData.username,
          password: formData.password,
          updated_at: now,
        })
        .eq('id', editingWorker.id);
      toast({ title: 'Success', description: 'Worker updated!' });
    } else {
      await (supabase as any)
        .from('users')
        .insert({
          shop_id: currentShopId,
          username: formData.username,
          password: formData.password,
          role: 'worker',
          created_at: now,
          updated_at: now,
        });
      toast({ title: 'Success', description: 'Worker created!' });
    }

    setIsDialogOpen(false);
    resetForm();
    loadWorkers();
  };

  const deleteWorker = async (worker: any) => {
    if (!confirm(`Are you sure you want to delete ${worker.username}?`)) return;
    await (supabase as any).from('users').delete().eq('id', worker.id);
    toast({ title: 'Success', description: 'Worker deleted!' });
    loadWorkers();
  };

  const resetForm = () => {
    setFormData({ username: '', password: '' });
    setEditingWorker(null);
  };

  const openEditDialog = (worker: User) => {
    setEditingWorker(worker);
    setFormData({
      username: worker.username,
      password: worker.password,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Worker Management</h3>
          <p className="text-sm text-gray-500">Add and manage workers for your shop</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
      </div>

      <div className="space-y-3">
        {workers.map((worker) => (
          <Card key={worker.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">{worker.username}</p>
                  <p className="text-xs text-gray-500">Worker Account</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(worker)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteWorker(worker)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {workers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No workers yet. Add your first worker!</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingWorker ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
