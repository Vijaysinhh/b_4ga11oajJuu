'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUdhari, useSales, useItems, useUnits, usePriceTiers } from '@/hooks/use-supabase';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/language-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  cleanWholeNumberInput,
  cleanNumberInput,
  formatMoney,
  formatPercent,
  formatNumber,
  formatWholeNumber,
  parseNumberInput,
  parseWholeNumberInput,
} from '@/lib/number-format';
import { formatSaleLineSubtitle, formatSaleLineQuantity } from '@/lib/sale-item-display';
import { SalesItemSearch } from '@/components/sales-item-search';
import {
  Plus,
  Phone,
  ReceiptText,
  WalletCards,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

type EntryMode = 'credit' | 'payment';
type DialogMode = 'add' | 'edit';

export default function UdhariPage() {
  const { currentShopId } = useAuth();
  const {
    customers,
    entries,
    totalPending,
    addCustomer,
    addCredit,
    receivePayment,
    updateCustomer,
    deleteCustomer,
    updateCreditEntry,
    deleteCreditEntry,
    getCustomerEntries,
  } = useUdhari(currentShopId);
  const { sales, updateSale, deleteSale } = useSales(currentShopId);
  const { items: allItems } = useItems(currentShopId);
  const { units } = useUnits(currentShopId);
  const { priceTiers } = usePriceTiers(currentShopId);
  const { t } = useLanguage();

  // Dialog states
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [customerDeleteDialogOpen, setCustomerDeleteDialogOpen] = useState(false);
  const [entryDeleteDialogOpen, setEntryDeleteDialogOpen] = useState(false);
  const [editSaleDialogOpen, setEditSaleDialogOpen] = useState(false);
  const [deleteSaleDialogOpen, setDeleteSaleDialogOpen] = useState(false);

  // Current selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('credit');
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);

  // Edit sale dialog state
  const [saleEditItems, setSaleEditItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [creditCustomerId, setCreditCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isSaleProcessing, setIsSaleProcessing] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const editingSale = useMemo(() => sales.find(s => s.id === editingSaleId), [sales, editingSaleId]);

  useEffect(() => {
    if (editingSale) {
      setSaleEditItems(editingSale.items || []);
      setPaymentMethod(editingSale.paymentMethod);
      setCreditCustomerId(editingSale.creditCustomerId || null);
    }
  }, [editingSale]);

  const handleItemAdded = (item: any) => {
    setSaleEditItems([...saleEditItems, item]);
    toast.success(`${item.itemName} ${t('success')}`);
  };

  const handleRemoveItem = (index: number) => {
    setSaleEditItems(saleEditItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
  };

  const handleItemEdited = (newItem: any) => {
    if (editingItemIndex === null) return;
    const updatedItems = [...saleEditItems];
    updatedItems[editingItemIndex] = newItem;
    setSaleEditItems(updatedItems);
    setEditingItemIndex(null);
  };

  const handlePaymentChange = (value: string) => {
    const nextPaymentMethod = value;
    setPaymentMethod(nextPaymentMethod);
    if (nextPaymentMethod !== 'udhar') {
      setCreditCustomerId(null);
      setNewCustomerName('');
      setNewCustomerPhone('');
    }
  };

  const handleUpdateSale = async () => {
    if (!editingSaleId || saleEditItems.length === 0) {
      toast.error(t('error'));
      return;
    }
    setIsSaleProcessing(true);
    try {
      const totals = {
        subtotal: saleEditItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
        totalCost: saleEditItems.reduce((sum, item) => sum + (item.totalCost || 0), 0),
      };
      const totalProfit = totals.subtotal - totals.totalCost;
      const profitMarginPercent = totals.subtotal > 0 ? (totalProfit / totals.subtotal) * 100 : 0;
      await updateSale(editingSaleId, {
        date: editingSale.date,
        timestamp: editingSale.timestamp,
        items: saleEditItems,
        totalQuantityItems: saleEditItems.length,
        subtotal: totals.subtotal,
        totalCost: totals.totalCost,
        totalProfit,
        profitMarginPercent,
        paymentMethod,
        creditCustomerId: paymentMethod === 'udhar' ? creditCustomerId : undefined,
        creditCustomerName: paymentMethod === 'udhar' ? (customers.find(c => c.id === creditCustomerId)?.name || newCustomerName) : undefined
      });
      toast.success('Sale updated successfully');
      setEditSaleDialogOpen(false);
      setEditingSaleId(null);
    } catch (error) {
      console.error('Error updating sale', error);
      toast.error(t('error'));
    } finally {
      setIsSaleProcessing(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!deletingSaleId) return;
    try {
      await deleteSale(deletingSaleId);
      toast.success('Sale deleted successfully');
      setDeleteSaleDialogOpen(false);
      setDeletingSaleId(null);
    } catch (error) {
      console.error('Error deleting sale', error);
      toast.error(t('error'));
    }
  };

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );
  const editingCustomer = useMemo(
    () => customers.find((customer) => customer.id === editingCustomerId) || null,
    [customers, editingCustomerId]
  );
  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingEntryId) || null,
    [entries, editingEntryId]
  );

  const recentEntries = entries.slice(0, 4);

  const resetCustomerForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerDialogOpen(false);
    setEditingCustomerId(null);
  };

  const resetEntryForm = () => {
    setAmount('');
    setNote('');
    setEntryDialogOpen(false);
    setSelectedCustomerId(null);
    setEditingEntryId(null);
    setEntryMode('credit');
  };

  const openAddCustomerDialog = () => {
    setEditingCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerDialogOpen(true);
  };

  const openEditCustomerDialog = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setEditingCustomerId(customerId);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!customerName.trim()) {
      toast.error(t('customer_name'));
      return;
    }

    if (editingCustomerId) {
      await updateCustomer(editingCustomerId, {
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
      });
      toast.success('Customer updated');
    } else {
      await addCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
      });
      toast.success(t('success'));
    }
    resetCustomerForm();
  };

  const openEntryDialog = (customerId: number, mode: EntryMode) => {
    setEditingEntryId(null);
    setSelectedCustomerId(customerId);
    setEntryMode(mode);
    setAmount('');
    setNote('');
    setEntryDialogOpen(true);
  };

  const openEditEntryDialog = (entry: any) => {
    setEditingEntryId(entry.id);
    setSelectedCustomerId(entry.customerId);
    setEntryMode(entry.type);
    setAmount(String(entry.amount));
    setNote(entry.note || '');
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    const value = parseWholeNumberInput(amount);

    if (!selectedCustomer || !Number.isFinite(value) || value <= 0) {
      toast.error(t('error'));
      return;
    }

    if (editingEntryId) {
      await updateCreditEntry(editingEntryId, {
        amount: value,
        type: entryMode,
        note: note.trim() || undefined,
      });
      toast.success('Entry updated');
    } else {
      if (entryMode === 'payment' && value > selectedCustomer.balance) {
        toast.error(t('error'));
        return;
      }

      if (entryMode === 'credit') {
        await addCredit(selectedCustomer.id!, value, note.trim() || undefined);
        toast.success(t('success'));
      } else {
        await receivePayment(selectedCustomer.id!, value, note.trim() || undefined);
        toast.success(t('success'));
      }
    }

    resetEntryForm();
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntryId) return;
    try {
      await deleteCreditEntry(deletingEntryId);
      toast.success('Entry deleted');
      setDeletingEntryId(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomerId) return;
    try {
      await deleteCustomer(deletingCustomerId);
      toast.success('Customer deleted');
      setDeletingCustomerId(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Cannot delete customer with outstanding balance');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('udhari')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('pending_amount')}</p>
        </div>
        <Button onClick={openAddCustomerDialog} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          {t('customer')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('pending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {formatMoney(totalPending)}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('customers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      {customers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{t('no_udhari_customers')}</p>
            <Button onClick={openAddCustomerDialog} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t('add_customer')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const customerEntries = getCustomerEntries(customer.id!).slice(0, 6);
            const isExpanded = expandedCustomerId === customer.id;

            return (
              <Card key={customer.id} className="overflow-hidden border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold">{customer.name}</h2>
                      {customer.phone && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('balance')}</p>
                      <p className="text-lg font-bold text-orange-700">Rs. {formatMoney(customer.balance)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    <Button
                      onClick={() => openEntryDialog(customer.id!, 'credit')}
                      className="h-9 bg-orange-600 text-xs hover:bg-orange-700 col-span-2"
                    >
                      {t('add')}
                    </Button>
                    <Button
                      onClick={() => openEntryDialog(customer.id!, 'payment')}
                      variant="outline"
                      className="h-9 text-xs col-span-2"
                      disabled={customer.balance <= 0}
                    >
                      {t('payment')}
                    </Button>
                    <Button
                      onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id!)}
                      variant="ghost"
                      className="h-9 text-xs"
                    >
                      {t('history')}
                    </Button>
                  </div>

                  <div className="mt-2 flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-blue-600"
                      onClick={() => openEditCustomerDialog(customer.id!)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      onClick={() => setDeletingCustomerId(customer.id!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      {customerEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('no_history')}</p>
                      ) : (
                        customerEntries.map((entry) => (
                          <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold">
                                    {entry.saleId
                                      ? `${t('sale_bill')} #${entry.saleId}`
                                      : entry.type === 'credit'
                                      ? t('udhari')
                                      : t('payment')}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-blue-600"
                                      onClick={() => {
                                        if (entry.saleId) {
                                          setEditingSaleId(entry.saleId);
                                          setEditSaleDialogOpen(true);
                                        } else {
                                          openEditEntryDialog(entry);
                                        }
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-600"
                                      onClick={() => {
                                        if (entry.saleId) {
                                          setDeletingSaleId(entry.saleId);
                                          setDeleteSaleDialogOpen(true);
                                        } else {
                                          setDeletingEntryId(entry.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleDateString('en-IN')}
                                  {entry.note ? ` - ${entry.note}` : ''}
                                </p>
                              </div>
                              <p
                                className={
                                  entry.type === 'credit'
                                    ? 'font-bold text-orange-700'
                                    : 'font-bold text-green-700'
                                }
                              >
                                {entry.type === 'credit' ? '+' : '-'} Rs. {formatMoney(entry.amount)}
                              </p>
                            </div>
                            {entry.billItems && entry.billItems.length > 0 && (
                              <div className="mt-2 space-y-1 border-t pt-2">
                                {entry.billItems.map((item: any, itemIndex: number) => (
                                  <div
                                    key={`${entry.id}-${item.itemName}-${itemIndex}`}
                                    className="flex justify-between gap-2"
                                  >
                                    <span className="min-w-0 truncate">
                                      {item.itemName} - {formatSaleLineQuantity(item)}
                                    </span>
                                    <span className="font-semibold">
                                      Rs. {formatMoney(item.totalPrice)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" />
              {t('recent')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">{entry.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.saleId
                        ? `${t('sale_bill')} #${entry.saleId}`
                        : entry.type === 'credit'
                        ? t('udhari')
                        : t('payment')}{' '}
                      - {new Date(entry.timestamp).toLocaleDateString('en-IN')}
                      {entry.note ? ` - ${entry.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-blue-600"
                      onClick={() => {
                        if (entry.saleId) {
                          setEditingSaleId(entry.saleId);
                          setEditSaleDialogOpen(true);
                        } else {
                          openEditEntryDialog(entry);
                        }
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600"
                      onClick={() => {
                        if (entry.saleId) {
                          setDeletingSaleId(entry.saleId);
                          setDeleteSaleDialogOpen(true);
                        } else {
                          setDeletingEntryId(entry.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <p
                      className={
                        entry.type === 'credit'
                          ? 'font-bold text-orange-700'
                          : 'font-bold text-green-700'
                      }
                    >
                      {entry.type === 'credit' ? '+' : '-'}{' '}
                      Rs. {formatMoney(entry.amount)}
                    </p>
                  </div>
                </div>
                {entry.billItems && entry.billItems.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {entry.billItems.map((item: any, itemIndex: number) => (
                      <div
                        key={`${entry.id}-${item.itemName}-${itemIndex}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="min-w-0 truncate">
                          {item.itemName} - {formatSaleLineQuantity(item)}
                        </span>
                        <span className="font-semibold">
                          Rs. {formatMoney(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomerId ? 'Edit Customer' : t('add_customer')}
            </DialogTitle>
            <DialogDescription>{t('name_is_enough')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={t('customer_name')}
            />
            <Input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(cleanWholeNumberInput(event.target.value))}
              placeholder={t('mobile_number')}
              inputMode="tel"
            />
            <div className="flex gap-2">
              <Button onClick={resetCustomerForm} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveCustomer} className="flex-1">
                {editingCustomerId ? 'Save Changes' : t('save_customer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntryId
                ? 'Edit Entry'
                : entryMode === 'credit'
                ? `${t('add')} ${t('udhari')}`
                : t('receive_payment')}
            </DialogTitle>
            <DialogDescription>{selectedCustomer?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <WalletCards className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={amount}
                onChange={(event) => setAmount(cleanWholeNumberInput(event.target.value))}
                placeholder={t('amount')}
                inputMode="numeric"
                pattern="[0-9]*"
                className="pl-10"
              />
            </div>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('note')}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={resetEntryForm} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveEntry} className="flex-1">
                {editingEntryId
                  ? 'Save Changes'
                  : entryMode === 'credit'
                  ? `${t('add')} ${t('udhari')}`
                  : t('save_payment')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCustomerId} onOpenChange={(open) => !open && setDeletingCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Only customers with zero balance can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the customer's balance accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Sale Dialog */}
      <Dialog open={editSaleDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditSaleDialogOpen(false);
          setEditingSaleId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('add_items')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingItemIndex !== null && (
                      <Button
                        variant="outline"
                        className="mb-2 w-full"
                        onClick={() => setEditingItemIndex(null)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Edit Item
                      </Button>
                    )}
                    <SalesItemSearch 
                      onItemAdded={handleItemAdded} 
                      addedItems={saleEditItems} 
                      itemToEdit={editingItemIndex !== null ? saleEditItems[editingItemIndex] : undefined} 
                      onItemEdited={handleItemEdited} 
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t('sale_items')} ({saleEditItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {saleEditItems.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <p>{t('no_items_added')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {saleEditItems.map((item, index) => {
                          const profit = item.totalPrice - item.totalCost;
                          const marginPct = item.totalPrice > 0 ? (profit / item.totalPrice) * 100 : 0;
                          return (
                            <div
                              key={`${item.itemId}-${index}`}
                              className="flex items-start justify-between rounded border bg-gray-50 p-3 transition hover:bg-gray-100"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold">
                                  {item.itemName} - {item.displayQuantity}
                                </div>
                                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                  <div>
                                    {t('selling')}: {formatSaleLineSubtitle(item)} ={' '}
                                    <span className="font-semibold text-blue-600">
                                      Rs. {formatMoney(item.totalPrice)}
                                    </span>
                                  </div>
                                  <div>
                                    {t('cost')}: Rs. {formatMoney(item.totalCost)}
                                  </div>
                                </div>
                                <div className="mt-1 text-xs font-semibold">
                                  <span className={profit > 0 ? "text-green-700" : "text-red-700"}>
                                    {t('profit_amount')}: Rs. {formatMoney(profit)} ({formatPercent(marginPct)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditItem(index)}
                                  className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                                  aria-label={`Edit ${item.itemName}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="flex-shrink-0 text-red-600 hover:text-red-800"
                                  aria-label={`Remove ${item.itemName}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {saleEditItems.length > 0 && (
                  <>
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>{t('total_revenue')}:</span>
                            <span className="font-bold">
                              Rs. {formatMoney(saleEditItems.reduce((sum, item) => sum + item.totalPrice, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('total_cost')}:</span>
                            <span className="font-bold">
                              Rs. {formatMoney(saleEditItems.reduce((sum, item) => sum + item.totalCost, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-bold">{t('profit')}:</span>
                            <span className="font-bold text-green-700">
                              Rs. {formatMoney(saleEditItems.reduce((sum, item) => sum + (item.totalPrice - item.totalCost), 0))}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('payment_method')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select value={paymentMethod} onValueChange={handlePaymentChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('cash')}</SelectItem>
                            <SelectItem value="card">{t('card')}</SelectItem>
                            <SelectItem value="udhar">{t('udhari')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {paymentMethod === 'udhar' && (
                          <div className="space-y-3">
                            {customers.length > 0 ? (
                              <Select
                                value={String(creditCustomerId || '')}
                                onValueChange={(val) => setCreditCustomerId(Number(val))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('select_customer')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                            {!creditCustomerId && (
                              <div className="space-y-2">
                                <Input
                                  placeholder={t('customer_name')}
                                  value={newCustomerName}
                                  onChange={(e) => setNewCustomerName(e.target.value)}
                                />
                                <Input
                                  placeholder={t('mobile_number')}
                                  value={newCustomerPhone}
                                  onChange={(e) => setNewCustomerPhone(cleanWholeNumberInput(e.target.value))}
                                  inputMode="tel"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditSaleDialogOpen(false);
                          setEditingSaleId(null);
                        }}
                        className="flex-1"
                      >
                        {t('cancel')}
                      </Button>
                      <Button onClick={handleUpdateSale} disabled={isSaleProcessing} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {t('save')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Sale Alert Dialog */}
      <AlertDialog open={deleteSaleDialogOpen} onOpenChange={(open) => !open && setDeletingSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the sale, update stock, and adjust customer balance if necessary. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

