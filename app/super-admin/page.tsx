'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase-sync';
import type { Database } from '@/lib/db-supabase-types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Store, User, Phone, MapPin, Shield, Play, Pause, LogOut, Upload, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QrCodeGenerator } from '@/components/QrCodeGenerator';

// Import error formatting from supabase-sync
function formatSupabaseError(error: unknown): string {
  try {
    return typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error);
  } catch {
    return String(error);
  }
}


// Convert Supabase shop type
type Shop = Database['public']['Tables']['shops']['Row'] & {
  ownerName?: string;
  shopName?: string;
  phoneNumber?: string;
  isPaused?: boolean;
  subscriptionEndDate?: string | null;
  lastPaymentDate?: string | null;
};

const mapShop = (shop: Database['public']['Tables']['shops']['Row']): Shop => ({
  ...shop,
  ownerName: shop.owner_name,
  shopName: shop.shop_name,
  phoneNumber: shop.phone_number,
  isPaused: shop.is_paused,
  subscriptionEndDate: shop.subscription_end_date,
  lastPaymentDate: shop.last_payment_date,
});

const endOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopQrById, setShopQrById] = useState<Record<number, string>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [billingShop, setBillingShop] = useState<Shop | null>(null);
  const [billingQrImageUrl, setBillingQrImageUrl] = useState<string>('');
  const [billingTxnId, setBillingTxnId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
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
      router.push('/login/superadmin');
    }
    loadShops();
  }, [user, router]);

  const loadShops = async () => {
    const { data } = await (supabase as any)
      .from('shops')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) {
      const mapped = data.map(mapShop);
      setShops(mapped);

      const shopIds = mapped.map((s: Shop) => s.id).filter(Boolean);
      if (shopIds.length) {
        try {
          const { data: paymentRows } = await (supabase as any)
            .from('shop_payment_info')
            .select('*')
            .in('shop_id', shopIds);

          const nextQrMap: Record<number, string> = {};
          (paymentRows || []).forEach((r: any) => {
            if (typeof r?.shop_id === 'number' && typeof r?.qr_code_url === 'string') {
              nextQrMap[r.shop_id] = r.qr_code_url;
            }
          });
          setShopQrById(nextQrMap);
        } catch (error) {
          // If shop_payment_info table doesn't exist yet, continue without QR data
          console.warn('shop_payment_info table not found yet, skipping QR data load');
          setShopQrById({});
        }
      } else {
        setShopQrById({});
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.ownerName || !formData.shopName || !formData.phoneNumber || !formData.password) {
      toast({ title: 'Error', description: 'Please fill all required fields' });
      return;
    }

    const now = new Date().toISOString();
    try {
      if (editingShop) {
        const { error } = await (supabase as any)
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
        
        if (error) {
          console.error('Update shop error:', error);
          toast({ title: 'Error', description: `Failed to update shop: ${error.message}` });
          return;
        }
        
        toast({ title: 'Success', description: 'Shop updated!' });
      } else {
        // Create shop
        const { data: newShop, error: shopError } = await (supabase as any)
          .from('shops')
          .insert({
            owner_name: formData.ownerName,
            shop_name: formData.shopName,
            address: formData.address,
            phone_number: formData.phoneNumber,
            password: formData.password,
            is_paused: false,
            subscription_end_date: endOfMonth(new Date()).toISOString(),
            last_payment_date: now,
            created_at: now,
            updated_at: now,
          })
          .select('*')
          .single();

        if (shopError) {
          console.error('Create shop error:', shopError);
          toast({ title: 'Error', description: `Failed to create shop: ${shopError.message}` });
          return;
        }

        if (newShop) {
          // Create owner user
          const { error: userError } = await (supabase as any).from('users').insert({
            shop_id: newShop.id,
            username: formData.ownerName,
            password: formData.password,
            role: 'owner',
            created_at: now,
            updated_at: now,
          });
          
          if (userError) {
            console.error('Create user error:', userError);
            toast({ title: 'Error', description: `Failed to create user: ${userError.message}` });
            return;
          }

          // Create default categories
          const defaultCategories = [
            { name: 'Grocery', name_marathi: 'किराणा', color: '#3b82f6' },
            { name: 'Dairy & Milk', name_marathi: 'दुग्ध', color: '#f59e0b' },
            { name: 'Beverages', name_marathi: 'पेय पदార్థ', color: '#ef4444' },
            { name: 'Snacks & Sweets', name_marathi: 'स्नॅक्स', color: '#8b5cf6' },
            { name: 'Household Items', name_marathi: 'घरेलू', color: '#06b6d4' },
            { name: 'Personal Care', name_marathi: 'व्यक्तिगत', color: '#ec4899' },
          ];

          const { error: categoryError } = await (supabase as any).from('categories').insert(
            defaultCategories.map(cat => ({
              shop_id: newShop.id,
              ...cat,
              created_at: now,
              updated_at: now,
            }))
          );
          
          if (categoryError) {
            console.error('Create categories error:', categoryError);
            toast({ title: 'Error', description: `Failed to create categories: ${categoryError.message}` });
            return;
          }

          // Create default units
          const defaultUnits = [
            { name: 'Kilogram', name_marathi: 'किलोग्राम', short_form: 'kg' },
            { name: 'Gram', name_marathi: 'ग्राम', short_form: 'g' },
            { name: 'Liter', name_marathi: 'लिटर', short_form: 'L' },
            { name: 'Milliliter', name_marathi: 'मिली लिटर', short_form: 'ml' },
            { name: 'Piece', name_marathi: 'तुकडे', short_form: 'pcs' },
            { name: 'Box', name_marathi: 'डिब्बा', short_form: 'box' },
          ];

          const { error: unitError } = await (supabase as any).from('units').insert(
            defaultUnits.map(unit => ({
              shop_id: newShop.id,
              ...unit,
              created_at: now,
              updated_at: now,
            }))
          );
          
          if (unitError) {
            console.error('Create units error:', unitError);
            toast({ title: 'Error', description: `Failed to create units: ${unitError.message}` });
            return;
          }

          toast({ title: 'Success', description: 'Shop created with default categories and units!' });
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadShops();
    } catch (e) {
      console.error('Unexpected error:', e);
      toast({ title: 'Error', description: 'An unexpected error occurred' });
    }
  };

  const togglePause = async (shop: Shop) => {
    try {
      const { error } = await (supabase as any)
        .from('shops')
        .update({
          is_paused: !shop.isPaused,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);
      
      if (error) {
        console.error('Toggle pause error:', error);
        toast({ title: 'Error', description: `Failed to update shop: ${error.message}` });
        return;
      }
      
      toast({ title: 'Success', description: shop.isPaused ? 'Shop unpaused!' : 'Shop paused!' });
      loadShops();
    } catch (e) {
      console.error('Unexpected error:', e);
      toast({ title: 'Error', description: 'An unexpected error occurred' });
    }
  };

  const deleteShop = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to delete ${shop.shopName}?`)) return;
    
    try {
      // Delete users first (because of foreign key constraint)
      const { error: userDeleteError } = await (supabase as any).from('users').delete().eq('shop_id', shop.id);
      
      if (userDeleteError) {
        console.error('Delete users error:', userDeleteError);
        toast({ title: 'Error', description: `Failed to delete users: ${userDeleteError.message}` });
        return;
      }
      
      const { error: shopDeleteError } = await (supabase as any).from('shops').delete().eq('id', shop.id);
      
      if (shopDeleteError) {
        console.error('Delete shop error:', shopDeleteError);
        toast({ title: 'Error', description: `Failed to delete shop: ${shopDeleteError.message}` });
        return;
      }
      
      toast({ title: 'Success', description: 'Shop deleted!' });
      loadShops();
    } catch (e) {
      console.error('Unexpected error:', e);
      toast({ title: 'Error', description: 'An unexpected error occurred' });
    }
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

  const openBillingDialog = (shop: Shop) => {
    setBillingShop(shop);
    setBillingQrImageUrl('');
    setBillingTxnId('');

    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('shop_payment_info')
          .select('*')
          .eq('shop_id', shop.id)
          .single();

        if (data) {
          if (typeof data.qr_code_url === 'string') setBillingQrImageUrl(data.qr_code_url);
        }
      } catch (error) {
        // Ignore errors from missing table
        console.warn('shop_payment_info table not found yet, skipping existing data load');
      }
    })();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('File selected:', file);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        console.log('File loaded successfully');
        setBillingQrImageUrl(result);
      }
    };
    reader.onerror = (error) => {
      console.error('File reader error:', error);
      toast({ title: 'Error', description: 'Failed to read the image file' });
    };
    reader.readAsDataURL(file);
  };

  const saveBillingPaymentInfo = async () => {
    if (!billingShop) return;
    if (!billingQrImageUrl) {
      toast({ title: 'Error', description: 'Please upload a QR image first' });
      return;
    }
    setIsSaving(true);
    const now = new Date().toISOString();
    try {
      const shopId = billingShop.id;
      console.log('Saving QR for shop:', shopId);
      
      try {
        // First check if record exists
        const { data: existing, error: fetchError } = await (supabase as any)
          .from('shop_payment_info')
          .select('*')
          .eq('shop_id', shopId);
        
        if (fetchError) {
          // If table doesn't exist yet, show helpful error
          const formattedError = formatSupabaseError(fetchError);
          console.error('Fetch error:', formattedError);
          toast({ 
            title: 'Database Setup Required', 
            description: 'Please apply the latest database schema to your Supabase project first. See the instructions in the schema.sql file.' 
          });
          return;
        }

        let result;
        if (existing && existing.length > 0) {
          // Update existing
          console.log('Updating existing payment info for shop:', shopId);
          result = await (supabase as any)
            .from('shop_payment_info')
            .update({
              qr_code_url: billingQrImageUrl,
              updated_at: now,
            })
            .eq('id', existing[0].id)
            .select()
            .single();
        } else {
          // Insert new
          console.log('Inserting new payment info for shop:', shopId);
          result = await (supabase as any)
            .from('shop_payment_info')
            .insert({
              shop_id: shopId,
              qr_code_url: billingQrImageUrl,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();
        }

        if (result.error) {
          const formattedError = formatSupabaseError(result.error);
          console.error('Save error:', formattedError);
          toast({ 
            title: 'Error', 
            description: `Failed to save payment info: ${formattedError}` 
          });
          return;
        }

        console.log('Saved successfully:', result.data);
        toast({ title: 'Saved', description: 'Payment QR updated successfully' });
        await loadShops(); // Reload shops to show updated QR status
      } catch (dbError: any) {
        // Handle database errors gracefully
        const formattedError = formatSupabaseError(dbError);
        console.error('Database error:', formattedError);
        
        if (formattedError.includes('Could not find the table')) {
          toast({ 
            title: 'Database Setup Required', 
            description: 'Please apply the latest database schema to your Supabase project first. See the instructions in the schema.sql file.' 
          });
        } else {
          toast({ 
            title: 'Error', 
            description: 'An error occurred while saving. Please check your database connection.' 
          });
        }
      }
      
    } catch (e: any) {
      const formattedError = formatSupabaseError(e);
      console.error('Unexpected save error:', formattedError);
      toast({ 
        title: 'Error', 
        description: 'An unexpected error occurred while saving' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const markPaidAndExtend = async () => {
    if (!billingShop) return;
    setIsMarkingPaid(true);
    const now = new Date();
    const currentEnd = billingShop.subscriptionEndDate ? new Date(billingShop.subscriptionEndDate) : null;
    const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
    const nextEnd = endOfMonth(addMonths(base, 1));

    try {
      // First update the shop's subscription_end_date
      const { error: shopError } = await (supabase as any)
        .from('shops')
        .update({
          subscription_end_date: nextEnd.toISOString(),
          last_payment_date: now.toISOString(),
          is_paused: false,
          updated_at: now.toISOString(),
        })
        .eq('id', billingShop.id);
      
      if (shopError) {
        const formattedError = formatSupabaseError(shopError);
        console.error('Update shop error:', formattedError);
        toast({ 
          title: 'Error', 
          description: `Failed to update shop subscription: ${formattedError}` 
        });
        return;
      }

      // Try to insert subscription record (table might not exist yet)
      try {
        const { error: subError } = await (supabase as any).from('subscriptions').insert({
          shop_id: billingShop.id,
          amount: 299,
          start_date: now.toISOString(),
          end_date: nextEnd.toISOString(),
          payment_method: 'qr',
          transaction_id: billingTxnId || null,
          status: 'active',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
        
        if (subError) {
          const formattedError = formatSupabaseError(subError);
          console.warn('Could not create subscription record (table might not exist yet):', formattedError);
          // Continue even if subscription record fails - we already updated the shop
        }
      } catch (subError) {
        console.warn('Error creating subscription record (table might not exist yet)');
        // Continue even if subscription record fails
      }

      toast({ title: 'Success', description: 'Subscription extended' });
      setBillingShop(null);
      await loadShops();
    } catch (e: any) {
      const formattedError = formatSupabaseError(e);
      console.error('Unexpected error:', formattedError);
      toast({ 
        title: 'Error', 
        description: `Failed to update subscription: ${e?.message || formattedError}` 
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-gray-500">Manage all shops and their operations</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
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
                    <div className="mt-2 text-xs text-gray-500">
                      <div>Subscription ends: {shop.subscriptionEndDate ? new Date(shop.subscriptionEndDate).toLocaleDateString() : 'Not set'}</div>
                      <div className="flex items-center gap-1">
                        Payment QR: {shopQrById[shop.id] ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Set</>
                        ) : 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <Button variant="outline" size="sm" onClick={() => openBillingDialog(shop)} className="flex-1 lg:flex-none">
                    Billing
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => togglePause(shop)} className="flex-1 lg:flex-none">
                    {shop.isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                    {shop.isPaused ? 'Unpause' : 'Pause'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(shop)} className="flex-1 lg:flex-none">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteShop(shop)} className="flex-1 lg:flex-none">
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
        <DialogContent className="sm:max-w-md">
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
                inputMode="tel"
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
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto">{editingShop ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!billingShop} onOpenChange={(open) => { if (!open) setBillingShop(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Billing & Subscription</DialogTitle>
          </DialogHeader>
          {billingShop && (
            <div className="space-y-4 py-2">
              <div className="text-sm p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-base">{billingShop.shopName}</div>
                <div className="text-gray-500">Owner: {billingShop.ownerName}</div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Payment QR Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {billingQrImageUrl ? (
                  <div className="flex justify-center">
                    <img 
                      src={billingQrImageUrl} 
                      alt="Uploaded QR" 
                      className="max-w-[200px] max-h-[200px] w-auto h-auto rounded-lg border shadow-sm" 
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Upload the QR image (Google Pay, PhonePe, etc.)
                  </div>
                )}
                <Button 
                  type="button" 
                  onClick={saveBillingPaymentInfo}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Save QR
                    </div>
                  )}
                </Button>
              </div>

              <div className="pt-2">
                <QrCodeGenerator 
                  qrImageUrl={billingQrImageUrl || null} 
                  amount={299} 
                  name={billingShop.shopName || 'Dukan'} 
                  note="Monthly Subscription" 
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Transaction ID (optional)</label>
                <Input 
                  value={billingTxnId} 
                  onChange={(e) => setBillingTxnId(e.target.value)} 
                  placeholder="UTR / transaction id" 
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setBillingShop(null)} 
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button 
              onClick={markPaidAndExtend}
              disabled={isMarkingPaid}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isMarkingPaid ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                'Mark Paid & Extend'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
