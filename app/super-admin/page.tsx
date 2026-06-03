'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/db-supabase-types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Store, User, Phone, MapPin, Shield, Play, Pause, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Convert Supabase shop type
type Shop = Database['public']['Tables']['shops']['Row'] & {
  ownerName?: string;
  shopName?: string;
  phoneNumber?: string;
  isPaused?: boolean;
};

const mapShop = (shop: Database['public']['Tables']['shops']['Row']): Shop => ({
  ...shop,
  ownerName: shop.owner_name,
  shopName: shop.shop_name,
  phoneNumber: shop.phone_number,
  isPaused: shop.is_paused,
});

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({
    ownerName: '',
    shopName: '',
    address: '',
    phoneNumber: '',
    password: '',
  });

  // Redirect if not super admin
  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/');
    }
    loadShops();
  }, [user, router]);

  const loadShops = async () => {
    const { data } = await (supabase as any)
      .from('shops')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) {
      setShops(data.map(mapShop));
    }
  };

  const handleSubmit = async () => {
    if (!formData.ownerName || !formData.shopName || !formData.phoneNumber || !formData.password) {
      toast({ title: 'Error', description: 'Please fill all required fields' });
      return;
    }

    const now = new Date().toISOString();
    if (editingShop) {
      await (supabase as any)
        .from('shops')
        .update({
          owner_name: formData.ownerName,
          shop_name: formData.shopName,
          address: formData.address,
          phone_number: formData.phoneNumber,
          password: formData.password,
          updated_at: now,
        })
        .eq('id', editingShop.id);
      toast({ title: 'Success', description: 'Shop updated!' });
    } else {
      // Create shop
      const { data: newShop } = await (supabase as any)
        .from('shops')
        .insert({
          owner_name: formData.ownerName,
          shop_name: formData.shopName,
          address: formData.address,
          phone_number: formData.phoneNumber,
          password: formData.password,
          is_paused: false,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (newShop) {
        // Create owner user
        await (supabase as any).from('users').insert({
          shop_id: newShop.id,
          username: formData.ownerName,
          password: formData.password,
          role: 'owner',
        });

        // Create default categories
        const defaultCategories = [
          { name: 'Grocery', name_marathi: 'किराणा', color: '#3b82f6' },
          { name: 'Dairy & Milk', name_marathi: 'दुग्ध', color: '#f59e0b' },
          { name: 'Beverages', name_marathi: 'पेय पदार्थ', color: '#ef4444' },
          { name: 'Snacks & Sweets', name_marathi: 'स्नॅक्स', color: '#8b5cf6' },
          { name: 'Household Items', name_marathi: 'घरेलू', color: '#06b6d4' },
          { name: 'Personal Care', name_marathi: 'व्यक्तिगत', color: '#ec4899' },
        ];

        await (supabase as any).from('categories').insert(
          defaultCategories.map(cat => ({
            shop_id: newShop.id,
            ...cat,
            created_at: now,
            updated_at: now,
          }))
        );

        // Create default units
        const defaultUnits = [
          { name: 'Kilogram', name_marathi: 'किलोग्राम', short_form: 'kg' },
          { name: 'Gram', name_marathi: 'ग्राम', short_form: 'g' },
          { name: 'Liter', name_marathi: 'लिटर', short_form: 'L' },
          { name: 'Milliliter', name_marathi: 'मिली लिटर', short_form: 'ml' },
          { name: 'Piece', name_marathi: 'तुकडे', short_form: 'pcs' },
          { name: 'Box', name_marathi: 'डिब्बा', short_form: 'box' },
        ];

        await (supabase as any).from('units').insert(
          defaultUnits.map(unit => ({
            shop_id: newShop.id,
            ...unit,
            created_at: now,
            updated_at: now,
          }))
        );

        toast({ title: 'Success', description: 'Shop created with default categories and units!' });
      }
    }

    setIsDialogOpen(false);
    resetForm();
    loadShops();
  };

  const togglePause = async (shop: Shop) => {
    await (supabase as any)
      .from('shops')
      .update({
        is_paused: !shop.isPaused,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shop.id);
    toast({ title: 'Success', description: shop.isPaused ? 'Shop unpaused!' : 'Shop paused!' });
    loadShops();
  };

  const deleteShop = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to delete ${shop.shopName}?`)) return;
    // Delete users first (because of foreign key constraint)
    await (supabase as any).from('users').delete().eq('shop_id', shop.id);
    await (supabase as any).from('shops').delete().eq('id', shop.id);
    toast({ title: 'Success', description: 'Shop deleted!' });
    loadShops();
  };

  const resetForm = () => {
    setFormData({ ownerName: '', shopName: '', address: '', phoneNumber: '', password: '' });
    setEditingShop(null);
  };

  const openEditDialog = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({
      ownerName: shop.ownerName || '',
      shopName: shop.shopName || '',
      address: shop.address || '',
      phoneNumber: shop.phoneNumber || '',
      password: shop.password || '',
    });
    setIsDialogOpen(true);
  };

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-gray-500">Manage all shops and their operations</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shop
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{shops.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{shops.filter(s => !s.isPaused).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Paused Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{shops.filter(s => s.isPaused).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {shops.map((shop) => (
          <Card key={shop.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${shop.isPaused ? 'bg-orange-100' : 'bg-green-100'}`}>
                    <Store className={`h-6 w-6 ${shop.isPaused ? 'text-orange-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{shop.shopName}</h3>
                    <p className="text-gray-500 flex items-center gap-2">
                      <User className="h-4 w-4" /> {shop.ownerName}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {shop.phoneNumber}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {shop.address}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                      shop.isPaused 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {shop.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => togglePause(shop)}>
                    {shop.isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                    {shop.isPaused ? 'Unpause' : 'Pause'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(shop)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteShop(shop)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {shops.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No shops yet. Create your first shop!</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShop ? 'Edit Shop' : 'Add New Shop'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop Name</label>
              <Input
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                placeholder="Enter shop name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner Name</label>
              <Input
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="Enter owner name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number (Login)</label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
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
            <Button onClick={handleSubmit}>{editingShop ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
