'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db, type AppSettings, initializeDatabase } from '@/lib/db';

interface LanguageContextType {
  language: 'en' | 'mr';
  setLanguage: (lang: 'en' | 'mr') => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<'en' | 'mr', string>> = {
  'dashboard': { en: 'Dashboard', mr: 'डॅशबोर्ड' },
  'items': { en: 'Items', mr: 'वस्तु' },
  'categories': { en: 'Categories', mr: 'श्रेणी' },
  'units': { en: 'Units', mr: 'एकक' },
  'settings': { en: 'Settings', mr: 'सेटिंग्ज' },
  'add': { en: 'Add', mr: 'जोडा' },
  'edit': { en: 'Edit', mr: 'संपादित करा' },
  'delete': { en: 'Delete', mr: 'हटवा' },
  'save': { en: 'Save', mr: 'जतन करा' },
  'cancel': { en: 'Cancel', mr: 'रद्द करा' },
  'search': { en: 'Search', mr: 'शोध' },
  'voice_search': { en: 'Voice Search', mr: 'व्वाईस शोध' },
  'name': { en: 'Name', mr: 'नाव' },
  'price': { en: 'Price', mr: 'किंमत' },
  'quantity': { en: 'Quantity', mr: 'प्रमाण' },
  'category': { en: 'Category', mr: 'श्रेणी' },
  'unit': { en: 'Unit', mr: 'एकक' },
  'buy_price': { en: 'Buy Price', mr: 'खरेदी किंमत' },
  'sell_price': { en: 'Sell Price', mr: 'विक्रय किंमत' },
  'margin': { en: 'Margin', mr: 'मार्जिन' },
  'low_stock': { en: 'Low Stock Limit', mr: 'कमी स्टॉक मर्यादा' },
  'total_items': { en: 'Total Items', mr: 'एकूण वस्तु' },
  'low_stock_items': { en: 'Low Stock Items', mr: 'कमी स्टॉक वस्तु' },
  'total_value': { en: 'Total Inventory Value', mr: 'एकूण इन्व्हेंटरी मूल्य' },
  'avg_margin': { en: 'Average Margin', mr: 'सरासरी मार्जिन' },
  'language': { en: 'Language', mr: 'भाषा' },
  'english': { en: 'English', mr: 'इंग्रजी' },
  'marathi': { en: 'Marathi', mr: 'मराठी' },
  'no_items': { en: 'No items found', mr: 'कोणतीही वस्तु आढळली नाही' },
  'add_item': { en: 'Add Item', mr: 'वस्तू जोडा' },
  'edit_item': { en: 'Edit Item', mr: 'वस्तू संपादित करा' },
  'add_category': { en: 'Add Category', mr: 'श्रेणी जोडा' },
  'edit_category': { en: 'Edit Category', mr: 'श्रेणी संपादित करा' },
  'add_unit': { en: 'Add Unit', mr: 'एकक जोडा' },
  'edit_unit': { en: 'Edit Unit', mr: 'एकक संपादित करा' },
  'confirm_delete': { en: 'Are you sure?', mr: 'तुम्हाला खरोखर हवे का?' },
  'success': { en: 'Success', mr: 'यशस्वी' },
  'error': { en: 'Error', mr: 'त्रुटी' },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'mr'>('mr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await initializeDatabase();
        const settings = await db.appSettings.toCollection().first();
        if (settings) {
          setLanguageState(settings.language || 'mr');
        }
      } catch (error) {
        console.error('[Dukan] Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const setLanguage = async (lang: 'en' | 'mr') => {
    setLanguageState(lang);
    try {
      const settings = await db.appSettings.toCollection().first();
      if (settings && settings.id) {
        await db.appSettings.update(settings.id, { language: lang });
      }
    } catch (error) {
      console.error('[Dukan] Error updating language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
