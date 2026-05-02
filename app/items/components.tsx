'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { useItems, useCategories, useUnits, usePriceTiers } from '@/hooks/use-db';
import { useSyncToCloud } from '@/hooks/use-sync-to-cloud';
import { PriceTierManager } from '@/components/price-tier-manager';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit2, Plus, Search } from 'lucide-react';
import { HelpTooltip, LabelWithTooltip } from '@/components/help-tooltip';

interface ItemFormData {
  name: string;
  nameMarathi: string;
  categoryId: number;
  unitId: number;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  lowStockLimit: number;
}

export function ItemsManagement() {
  const { t } = useLanguage();
  const { items, addItem, updateItem, deleteItem } = useItems();
  const { syncItemToCloud } = useSyncToCloud();
  const { categories } = useCategories();
  const { units } = useUnits();
  const { priceTiers, addPriceTier, deletePriceTier } = usePriceTiers();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    nameMarathi: '',
    categoryId: categories[0]?.id || 1,
    unitId: units[0]?.id || 1,
    quantity: 0,
    buyPrice: 0,
    sellPrice: 0,
    lowStockLimit: 0,
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategoryId === null || item.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategoryId]);

  const handleOpenDialog = (item?: (typeof items)[0]) => {
    if (item) {
      setEditingId(item.id || null);
      setFormData({
        name: item.name,
        nameMarathi: item.nameMarathi || '',
        categoryId: item.categoryId,
        unitId: item.unitId,
        quantity: item.quantity,
        buyPrice: item.buyPrice,
        sellPrice: item.sellPrice,
        lowStockLimit: item.lowStockLimit,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        nameMarathi: '',
        categoryId: categories[0]?.id || 1,
        unitId: units[0]?.id || 1,
        quantity: 0,
        buyPrice: 0,
        sellPrice: 0,
        lowStockLimit: 5,
      });
    }
    setIsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameMarathi: '',
      categoryId: categories[0]?.id || 1,
      unitId: units[0]?.id || 1,
      quantity: 0,
      buyPrice: 0,
      sellPrice: 0,
      lowStockLimit: 0,
    });
    setEditingId(null);
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      formData.categoryId === 0 ||
      formData.unitId === 0 ||
      formData.quantity < 0 ||
      formData.buyPrice <= 0 ||
      formData.sellPrice <= 0 ||
      formData.sellPrice < formData.buyPrice
    ) {
      toast.error('Please fill all fields correctly. Selling price must be greater than buying price.');
      return;
    }

    try {
      if (editingId) {
        await updateItem(editingId, {
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          categoryId: formData.categoryId,
          unitId: formData.unitId,
          quantity: formData.quantity,
          buyPrice: formData.buyPrice,
          sellPrice: formData.sellPrice,
          lowStockLimit: formData.lowStockLimit,
        });
        // Sync updated item to cloud
        const updatedItem = items.find(i => i.id === editingId);
        if (updatedItem) {
          await syncItemToCloud(updatedItem).catch(() => {/* sync failed but local save succeeded */});
        }
        toast.success('Item updated successfully');
      } else {
        const newItemId = await addItem({
          name: formData.name,
          nameMarathi: formData.nameMarathi,
          categoryId: formData.categoryId,
          unitId: formData.unitId,
          quantity: formData.quantity,
          buyPrice: formData.buyPrice,
          sellPrice: formData.sellPrice,
          lowStockLimit: formData.lowStockLimit,
        });
        // Sync new item to cloud
        const newItem = items.find(i => i.id === newItemId);
        if (newItem) {
          await syncItemToCloud(newItem).catch(() => {/* sync failed but local save succeeded */});
        }
        toast.success('Item added successfully');
      }
      resetForm();
    } catch (error) {
      console.error('[v0] Error saving item:', error);
      toast.error('Error saving item. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteItem(deleteId);
        setDeleteId(null);
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(deleteId);
          return newSet;
        });
        toast.success('Item deleted successfully');
      } catch (error) {
        console.error('[v0] Error deleting item:', error);
        toast.error('Error deleting item');
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      const itemsToDelete = Array.from(selectedItems);
      for (const id of itemsToDelete) {
        await deleteItem(id);
      }
      setSelectedItems(new Set());
      toast.success(`Deleted ${itemsToDelete.length} item(s)`);
    } catch (error) {
      console.error('[v0] Error batch deleting items:', error);
      toast.error('Error deleting items');
    }
  };

  const toggleItemSelection = (id: number | undefined) => {
    if (!id) return;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id || 0)));
    }
  };

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category?.name || 'Unknown';
  };

  const getUnitName = (id: number) => {
    const unit = units.find((u) => u.id === id);
    return unit?.shortForm || unit?.name || 'N/A';
  };

  const calculateMargin = (buyPrice: number, sellPrice: number): string => {
    if (buyPrice === 0) return '0';
    return (((sellPrice - buyPrice) / buyPrice) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('items')}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage your product inventory</p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>Fill in the details below</DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing" disabled={!editingId}>Price Variants</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <LabelWithTooltip 
                  label="Item Name" 
                  tooltip="Enter the product name as it appears in your shop (e.g., Basmati Rice, Sunflower Oil, Salt)"
                  required
                />
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rice, Oil, Salt"
                  className="mt-1"
                />
              </div>

              <div>
                <LabelWithTooltip 
                  label="Item Name (Marathi)" 
                  tooltip="Enter the product name in Marathi for better local understanding"
                />
                <Input
                  value={formData.nameMarathi}
                  onChange={(e) => setFormData({ ...formData, nameMarathi: e.target.value })}
                  placeholder="उदा., तांदूळ, तेल, मीठ"
                  className="mt-1"
                />
              </div>

              <div>
                <LabelWithTooltip 
                  label="Category" 
                  tooltip="Organize products by type (Grains, Oils, Spices, etc.) for better inventory management"
                  required
                />
                <Select
                  value={formData.categoryId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: Number(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id!.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <LabelWithTooltip 
                  label="Unit" 
                  tooltip="The measurement unit for this product (kg, L, pcs, g, ml, etc.). Used to track and sell quantities"
                  required
                />
                <Select
                  value={formData.unitId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, unitId: Number(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id!.toString()}>
                        {unit.name} ({unit.shortForm})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <LabelWithTooltip 
                  label="Current Quantity" 
                  tooltip="How much stock you have right now in the shop"
                  required
                />
                <Input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <LabelWithTooltip 
                  label="Buying Price" 
                  tooltip="The cost price - how much you pay to buy this item from your supplier (in ₹)"
                  required
                />
                <Input
                  type="number"
                  value={formData.buyPrice || ''}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <LabelWithTooltip 
                  label="Selling Price" 
                  tooltip="The retail price - how much you sell this item for to customers (in ₹)"
                  required
                />
                <Input
                  type="number"
                  value={formData.sellPrice || ''}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
                {formData.buyPrice > 0 && formData.sellPrice > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Margin: {calculateMargin(formData.buyPrice, formData.sellPrice)}%
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-semibold">Low Stock Alert Limit</label>
                  <HelpTooltip text="When stock goes below this level, you'll get an alert to reorder. Leave empty to disable alerts" />
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={formData.lowStockLimit === 0 ? '' : formData.lowStockLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, lowStockLimit: value === '' ? 0 : Math.max(0, parseFloat(value) || 0) });
                    }}
                    placeholder="Leave empty to disable alerts"
                    className="mt-0"
                  />
                  {formData.lowStockLimit > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, lowStockLimit: 0 })}
                      className="whitespace-nowrap"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editingId ? 'Update Item' : 'Add Item'}
              </Button>
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              {editingId && (
                <PriceTierManager
                  itemId={editingId}
                  priceTiers={priceTiers.filter(tier => tier.itemId === editingId)}
                  units={units}
                  wholesaleCost={formData.buyPrice}
                  wholesaleQty={formData.quantity}
                  wholesaleUnitId={formData.unitId}
                  onAdd={addPriceTier}
                  onDelete={deletePriceTier}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={selectedCategoryId?.toString() || 'all'}
          onValueChange={(value) => setSelectedCategoryId(value === 'all' ? null : Number(value))}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id!.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Batch Operations Toolbar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedItems.size === filteredItems.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-sm">{selectedItems.size} item(s) selected</span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={toggleSelectAll}
              variant="outline"
              size="sm"
            >
              {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              onClick={handleBatchDelete}
              variant="destructive"
              size="sm"
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground">{searchTerm ? 'No items found' : 'No items added yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => {
            const itemPriceTiers = priceTiers.filter(tier => tier.itemId === item.id);
            const isSelected = selectedItems.has(item.id || 0);
            return (
              <div key={item.id} className={`flex gap-2 items-start ${isSelected ? 'opacity-75' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItemSelection(item.id)}
                  className="w-4 h-4 cursor-pointer mt-4"
                />
                <Card className={`flex-1 overflow-hidden ${isSelected ? 'border-blue-300 bg-blue-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Item Name and Category */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{getCategoryName(item.categoryId)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">{item.quantity} {getUnitName(item.unitId)}</p>
                        {item.quantity <= item.lowStockLimit && (
                          <p className="text-xs font-semibold text-orange-600">Low Stock</p>
                        )}
                      </div>
                    </div>

                    {/* Default Prices */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Buy:</span>
                        <p className="font-semibold">₹{item.buyPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sell:</span>
                        <p className="font-semibold">₹{item.sellPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>
                        <p className="font-semibold text-green-600">{calculateMargin(item.buyPrice, item.sellPrice)}%</p>
                      </div>
                    </div>

                    {/* Price Tiers */}
                    {itemPriceTiers.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Price Variants:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {itemPriceTiers.map((tier) => (
                            <div key={tier.id} className="bg-amber-50 p-2 rounded border border-amber-200">
                              <p className="text-xs font-semibold text-amber-900">
                                {tier.quantity}{getUnitName(tier.unitId)}
                              </p>
                              <p className="text-xs text-amber-700">₹{(tier.price || 0).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stock Value */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Total Value: <span className="font-semibold text-foreground">₹{(item.quantity * item.buyPrice).toFixed(2)}</span>
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(item)}
                        className="flex-1 gap-1 h-8"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialog open={deleteId === item.id} onOpenChange={(open) => {
                          if (!open) setDeleteId(null);
                        }}>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(item.id || null)}
                            className="flex-1 gap-1 h-8"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
