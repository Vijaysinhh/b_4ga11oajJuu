'use client';

import { useState } from 'react';
import { DailySalesReport } from '@/components/daily-sales-report';
import { MonthlyPLReport } from '@/components/monthly-pl-report';
import { Button } from '@/components/ui/button';
import { HelpTooltip } from '@/components/help-tooltip';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Help */}
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          <HelpTooltip text="View your daily sales summary or monthly profit & loss analysis" />
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('daily')}
            variant={activeTab === 'daily' ? 'default' : 'outline'}
            className="flex-1"
          >
            Daily Report
          </Button>
          <Button
            onClick={() => setActiveTab('monthly')}
            variant={activeTab === 'monthly' ? 'default' : 'outline'}
            className="flex-1"
          >
            Monthly P&L
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'daily' && <DailySalesReport />}
        {activeTab === 'monthly' && <MonthlyPLReport />}
      </div>
    </div>
  );
}
