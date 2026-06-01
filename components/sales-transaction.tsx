'use client';

import { useState } from 'react';
import { useSales, useUdhari } from '@/hooks/use-db';
import { SalesItemSearch } from './sales-item-search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanWholeNumberInput, formatMoney, formatPercent } from '@/lib/number-format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = 'cash' | 'card' | 'partial' | 'udhar';

interface LineItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitId: number;
  unitShortForm: string;
  priceTierId?: number;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
  totalCost: number;
}

export function SalesTransaction() {
  const { createSale, updateStockAfterSale } = useSales();
  const { customers, addCustomer, addCredit } = useUdhari();

  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [creditCustomerId, setCreditCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const totals = {
    subtotal: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    totalCost: items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    totalProfit: items.reduce((sum, item) => sum + ((item.totalPrice || 0) - (item.totalCost || 0)), 0),
  };

  const isUdharSale = paymentMethod === 'udhar';
  const selectedCreditCustomer = customers.find((customer) => customer.id === creditCustomerId) || null;
  const profitMarginPercent = totals.subtotal > 0 ? (totals.totalProfit / totals.subtotal) * 100 : 0;

  const handleItemAdded = (item: LineItem) => {
    setItems([...items, item]);
    toast.success(`${item.itemName} added to sale`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const resetCreditFields = () => {
    setCreditCustomerId(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const resetSale = () => {
    setItems([]);
    setPaymentMethod('cash');
    resetCreditFields();
    setShowConfirmDialog(false);
  };

  const handlePaymentChange = (value: string) => {
    const nextPaymentMethod = value as PaymentMethod;
    setPaymentMethod(nextPaymentMethod);

    if (nextPaymentMethod !== 'udhar') {
      resetCreditFields();
    }
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error('Add items to complete sale');
      return;
    }

    if (isUdharSale && !selectedCreditCustomer && !newCustomerName.trim()) {
      toast.error('Select or create a customer for udhar sale');
      return;
    }

    setIsProcessing(true);

    try {
      const saleItems: any[] = items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitId: item.unitId,
        unitShortForm: item.unitShortForm,
        priceTierId: item.priceTierId,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
        costPerUnit: item.costPerUnit,
        totalCost: item.totalCost,
        profit: item.totalPrice - item.totalCost,
      }));

      let finalCreditCustomerId = creditCustomerId;
      let finalCreditCustomerName = selectedCreditCustomer?.name || '';

      if (isUdharSale && !finalCreditCustomerId) {
        const createdCustomerId = await addCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
        });

        finalCreditCustomerId = Number(createdCustomerId);
        finalCreditCustomerName = newCustomerName.trim();
      }

      const today = new Date().toISOString().split('T')[0];
      const saleId = await createSale({
        date: today,
        timestamp: Date.now(),
        items: saleItems,
        totalQuantityItems: items.length,
        subtotal: totals.subtotal,
        totalCost: totals.totalCost,
        totalProfit: totals.totalProfit,
        profitMarginPercent,
        paymentMethod,
        creditCustomerId: isUdharSale ? finalCreditCustomerId || undefined : undefined,
        creditCustomerName: isUdharSale ? finalCreditCustomerName : undefined,
      });

      await updateStockAfterSale(saleItems);

      if (isUdharSale && finalCreditCustomerId) {
        await addCredit(
          finalCreditCustomerId,
          totals.subtotal,
          `Sale bill - ${items.length} item${items.length === 1 ? '' : 's'}`,
          items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitShortForm: item.unitShortForm,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
          })),
          Number(saleId),
        );
      }

      toast.success(isUdharSale ? 'Sale added to udhari!' : 'Sale completed successfully!');
      resetSale();
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Items</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesItemSearch onItemAdded={handleItemAdded} addedItems={items} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sale Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No items added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const profit = item.totalPrice - item.totalCost;
                  const marginPct = item.totalPrice > 0 ? (profit / item.totalPrice) * 100 : 0;

                  return (
                    <div
                      key={`${item.itemId}-${index}`}
                      className="flex items-start justify-between rounded border bg-gray-50 p-3 transition hover:bg-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {item.itemName} x {item.quantity}{item.unitShortForm}
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-gray-600">
                          <div>
                            Selling: {formatMoney(item.quantity)} x Rs. {formatMoney(item.pricePerUnit)} ={' '}
                            <span className="font-semibold text-blue-600">Rs. {formatMoney(item.totalPrice)}</span>
                          </div>
                          <div>
                            Cost: {formatMoney(item.quantity)} x Rs. {formatMoney(item.costPerUnit)} ={' '}
                            <span className="font-semibold text-red-600">Rs. {formatMoney(item.totalCost)}</span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs font-semibold">
                          <span className={profit > 0 ? 'text-green-700' : 'text-red-700'}>
                            Profit: Rs. {formatMoney(profit)} ({formatPercent(marginPct)}%)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="ml-2 flex-shrink-0 text-red-600 hover:text-red-800"
                        aria-label={`Remove ${item.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Revenue:</span>
                    <span className="font-bold">Rs. {formatMoney(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-bold">Rs. {formatMoney(totals.totalCost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span>Total Profit:</span>
                    <span className={`font-bold ${totals.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Rs. {formatMoney(totals.totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Margin %:</span>
                    <span className="font-semibold">{formatPercent(profitMarginPercent)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Payment Method
                  </label>
                  <Select value={paymentMethod} onValueChange={handlePaymentChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="udhar">Udhar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isUdharSale && (
                  <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-orange-900">
                        Udhari Customer
                      </label>
                      <Select
                        value={creditCustomerId ? creditCustomerId.toString() : 'new'}
                        onValueChange={(value) => setCreditCustomerId(value === 'new' ? null : Number(value))}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New customer</SelectItem>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id!.toString()}>
                              {customer.name} - Rs. {formatMoney(customer.balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!creditCustomerId && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-orange-900">
                            Customer Name
                          </label>
                          <Input
                            value={newCustomerName}
                            onChange={(event) => setNewCustomerName(event.target.value)}
                            placeholder="Name"
                            className="h-9 bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-orange-900">
                            Mobile
                          </label>
                          <Input
                            value={newCustomerPhone}
                            onChange={(event) => setNewCustomerPhone(cleanWholeNumberInput(event.target.value))}
                            placeholder="Optional"
                            inputMode="tel"
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-orange-900">
                      <UserPlus className="h-4 w-4" />
                      <span>This bill will appear in the customer&apos;s Udhari history.</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isProcessing}
                  className="h-10 w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Complete Sale'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Sale?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items:</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Revenue:</span>
                  <span className="font-bold">Rs. {formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment:</span>
                  <span className="font-bold capitalize">{paymentMethod}</span>
                </div>
                {isUdharSale && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span>Customer:</span>
                    <span className="text-right font-bold">{selectedCreditCustomer?.name || newCustomerName || 'New customer'}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Profit:</span>
                  <span className="font-bold text-green-600">Rs. {formatMoney(totals.totalProfit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Margin:</span>
                  <span className="font-bold">{formatPercent(profitMarginPercent)}%</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSale}>Complete Sale</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
