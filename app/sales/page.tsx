'use client';

import { SalesTransaction } from './components';
import { HelpTooltip } from '@/components/help-tooltip';
import { useLanguage } from '@/providers/language-provider';

export default function SalesPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{t('quick_sale')}</h1>
            <HelpTooltip text={t('quick_sale_desc')} />
          </div>
          <p className="text-gray-600 text-sm mt-1">{t('add_items_desc')}</p>
        </div>
        <SalesTransaction />
      </div>
    </div>
  );
}

