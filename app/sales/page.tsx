'use client';

import { SalesTransaction } from './components';
import { HelpTooltip } from '@/components/help-tooltip';

export default function SalesPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Quick Sale</h1>
            <HelpTooltip text="Search for items, select quantity or price variant, add to cart, and finalize the sale" />
          </div>
          <p className="text-gray-600 text-sm mt-1">Add items and record transactions</p>
        </div>
        <SalesTransaction />
      </div>
    </div>
  );
}
