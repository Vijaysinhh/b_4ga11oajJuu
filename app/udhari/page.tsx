'use client';

import { useMemo, useState } from 'react';
import { useUdhari } from '@/hooks/use-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cleanWholeNumberInput, formatMoney, formatWholeNumber, parseWholeNumberInput } from '@/lib/number-format';
import { Plus, Phone, ReceiptText, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

type EntryMode = 'credit' | 'payment';

export default function UdhariPage() {
  const {
    customers,
    entries,
    totalPending,
    addCustomer,
    addCredit,
    receivePayment,
    getCustomerEntries,
  } = useUdhari();

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('credit');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );

  const recentEntries = entries.slice(0, 4);

  const resetCustomerForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerDialogOpen(false);
  };

  const resetEntryForm = () => {
    setAmount('');
    setNote('');
    setEntryDialogOpen(false);
    setSelectedCustomerId(null);
  };

  const handleAddCustomer = async () => {
    if (!customerName.trim()) {
      toast.error('Enter customer name');
      return;
    }

    await addCustomer({
      name: customerName.trim(),
      phone: customerPhone.trim() || undefined,
    });

    toast.success('Customer added');
    resetCustomerForm();
  };

  const openEntryDialog = (customerId: number, mode: EntryMode) => {
    setSelectedCustomerId(customerId);
    setEntryMode(mode);
    setAmount('');
    setNote('');
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    const value = parseWholeNumberInput(amount);

    if (!selectedCustomer || !Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (entryMode === 'payment' && value > selectedCustomer.balance) {
      toast.error('Payment cannot be more than balance');
      return;
    }

    if (entryMode === 'credit') {
      await addCredit(selectedCustomer.id!, value, note.trim() || undefined);
      toast.success('Udhari added');
    } else {
      await receivePayment(selectedCustomer.id!, value, note.trim() || undefined);
      toast.success('Payment received');
    }

    resetEntryForm();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Udhari</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer credit balances</p>
        </div>
        <Button onClick={() => setCustomerDialogOpen(true)} className="h-10 gap-2">
          <Plus className="h-4 w-4" />
          Customer
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {formatMoney(totalPending)}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      {customers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No udhari customers yet</p>
            <Button onClick={() => setCustomerDialogOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
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
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold text-orange-700">Rs. {formatMoney(customer.balance)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => openEntryDialog(customer.id!, 'credit')}
                      className="h-9 bg-orange-600 text-xs hover:bg-orange-700"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => openEntryDialog(customer.id!, 'payment')}
                      variant="outline"
                      className="h-9 text-xs"
                      disabled={customer.balance <= 0}
                    >
                      Payment
                    </Button>
                    <Button
                      onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id!)}
                      variant="ghost"
                      className="h-9 text-xs"
                    >
                      History
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      {customerEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No history yet</p>
                      ) : (
                        customerEntries.map((entry) => (
                          <div key={entry.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {entry.saleId ? `Sale Bill #${entry.saleId}` : entry.type === 'credit' ? 'Udhari' : 'Payment'}
                                </p>
                                <p className="text-muted-foreground">
                                  {new Date(entry.timestamp).toLocaleDateString('en-IN')}
                                  {entry.note ? ` - ${entry.note}` : ''}
                                </p>
                              </div>
                              <p className={entry.type === 'credit' ? 'font-bold text-orange-700' : 'font-bold text-green-700'}>
                                {entry.type === 'credit' ? '+' : '-'} Rs. {formatMoney(entry.amount)}
                              </p>
                            </div>
                            {entry.billItems && entry.billItems.length > 0 && (
                              <div className="mt-2 space-y-1 border-t pt-2">
                                {entry.billItems.map((item, itemIndex) => (
                                  <div key={`${entry.id}-${item.itemName}-${itemIndex}`} className="flex justify-between gap-2">
                                    <span className="min-w-0 truncate">
                                      {item.itemName} x {formatWholeNumber(item.quantity)}{item.unitShortForm}
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
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">{entry.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.saleId ? `Sale Bill #${entry.saleId}` : entry.type === 'credit' ? 'Udhari' : 'Payment'} - {new Date(entry.timestamp).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <p className={entry.type === 'credit' ? 'font-bold text-orange-700' : 'font-bold text-green-700'}>
                  {entry.type === 'credit' ? '+' : '-'} Rs. {formatMoney(entry.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Name is enough. Mobile number is optional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
            />
            <Input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(cleanWholeNumberInput(event.target.value))}
              placeholder="Mobile number"
              inputMode="tel"
            />
            <Button onClick={handleAddCustomer} className="w-full">
              Save Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entryMode === 'credit' ? 'Add Udhari' : 'Receive Payment'}</DialogTitle>
            <DialogDescription>{selectedCustomer?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <WalletCards className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={amount}
                onChange={(event) => setAmount(cleanWholeNumberInput(event.target.value))}
                placeholder="Amount"
                inputMode="numeric"
                pattern="[0-9]*"
                className="pl-10"
              />
            </div>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note"
              rows={3}
            />
            <Button onClick={handleSaveEntry} className="w-full">
              {entryMode === 'credit' ? 'Add Udhari' : 'Save Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
