'use client';

import { useState } from 'react';
import { useSales } from '@/hooks/use-db';
import { useLanguage } from '@/providers/language-provider';
import { SalesItemSearch } from './sales-item-search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { SaleItem } from '@/lib/db';

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
  const { t } = useLanguage();
  const { createSale, updateStockAfterSale } = useSales();

  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'partial'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const totals: { subtotal: number; totalCost: number; totalProfit: number } = {
    subtotal: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    totalCost: items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    totalProfit: items.reduce((sum, item) => sum + ((item.totalPrice || 0) - (item.totalCost || 0)), 0),
  };

  const profitMarginPercent = totals.subtotal > 0 ? ((totals.totalProfit / totals.subtotal) * 100) : 0;

  const handleItemAdded = (item: LineItem) => {
    setItems([...items, item]);
    toast.success(`${item.itemName} added to sale`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error('Add items to complete sale');
      return;
    }

    setIsProcessing(true);

    try {
      // Create sale items array for the sale
      const saleItems: any[] = items.map(item => ({
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

      // Create sale record
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
      });

      // Update stock after sale
      await updateStockAfterSale(saleItems);

      toast.success('Sale completed successfully!');

      // Reset form
      setItems([]);
      setPaymentMethod('cash');
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Item Search */}
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

      {/* Right: Sale Summary */}
      <div className="lg:col-span-2 space-y-3">
        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sale Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between bg-gray-50 p-3 rounded border hover:bg-gray-100 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {item.itemName} × {item.quantity}{item.unitShortForm}
                      </div>
                      {/* Price and Cost Breakdown */}
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        <div>
                          Selling: {item.quantity} × ₹{item.pricePerUnit.toFixed(2)} = <span className="font-semibold text-blue-600">₹{item.totalPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          Cost: {item.quantity} × ₹{item.costPerUnit.toFixed(2)} = <span className="font-semibold text-red-600">₹{item.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Profit calculation */}
                      <div className="text-xs font-semibold mt-1">
                        {(() => {
                          const profit = item.totalPrice - item.totalCost;
                          const marginPct = item.totalPrice > 0 ? ((profit / item.totalPrice) * 100).toFixed(1) : '0';
                          return (
                            <span className={profit > 0 ? 'text-green-700' : 'text-red-700'}>
                              Profit: ₹{profit.toFixed(2)} ({marginPct}%)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        {items.length > 0 && (
          <>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Revenue:</span>
                    <span className="font-bold">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-bold">₹{totals.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span>Total Profit:</span>
                    <span className={`font-bold ${totals.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ₹{totals.totalProfit.toFixed(2)}
                    </span>
                  </div>
                  {totals.subtotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Margin %:</span>
                      <span className="font-semibold">{profitMarginPercent.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Calculation Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-xs text-blue-900 space-y-1">
                  <div className="font-semibold mb-2">How Cost is Calculated:</div>
                  <div>• For each price tier, we convert to base unit (e.g., grams for weight)</div>
                  <div>• Cost = Quantity × (Buy Price ÷ Base Item Qty)</div>
                  <div>• Example: 50g of 1kg @ ₹90 = 50 × (90 ÷ 1000) = ₹4.50</div>
                  <div>• Profit = Selling Price - Cost</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Payment & Complete */}
        {items.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Payment Method
                </label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isProcessing}
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>Items:</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Revenue:</span>
                  <span className="font-bold">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Profit:</span>
                  <span className="font-bold text-green-600">₹{totals.totalProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Margin:</span>
                  <span className="font-bold">{profitMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSale}>Complete Sale</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
