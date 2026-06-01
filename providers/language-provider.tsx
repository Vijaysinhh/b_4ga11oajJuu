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

  // Navigation & General Layout
  'home': { en: 'Home', mr: 'मुख्यपृष्ठ' },
  'stock': { en: 'Stock', mr: 'स्टॉक' },
  'udhari': { en: 'Udhari', mr: 'उधारी' },
  'new_sale': { en: 'New Sale', mr: 'नवीन विक्री' },
  'logout': { en: 'Logout', mr: 'लॉगआउट' },
  'sale': { en: 'Sale', mr: 'विक्री' },
  'dukan': { en: 'Dukan', mr: 'दुकान' },
  'general': { en: 'General', mr: 'सामान्य' },

  // Dashboard Page
  'today_sales': { en: 'Today Sales', mr: 'आजची विक्री' },
  'today_profit': { en: 'Today Profit', mr: 'आजचा नफा' },
  'low_stock_limit_label': { en: 'Low Stock Limit', mr: 'कमी स्टॉक मर्यादा' },
  'low_stock_label': { en: 'Low Stock', mr: 'कमी स्टॉक' },
  'pending': { en: 'Pending', mr: 'प्रलंबित' },
  'products': { en: 'products', mr: 'उत्पादने' },
  'transactions': { en: 'transactions', mr: 'व्यवहार' },
  'reports': { en: 'Reports', mr: 'अहवाल' },
  'high_margin_items': { en: 'High Margin Items', mr: 'अधिक नफा देणाऱ्या वस्तू' },
  'stock_needed': { en: 'Stock Needed', mr: 'स्टॉक आवश्यक' },
  'no_items_yet': { en: 'No items yet. Add products from Stock.', mr: 'अद्याप कोणत्याही वस्तू नाहीत. स्टॉक मधून उत्पादने जोडा.' },
  'loading_shop_data': { en: 'Loading shop data...', mr: 'दुकान डेटा लोड होत आहे...' },
  'today': { en: 'Today', mr: 'आज' },
  'this_month': { en: 'This Month', mr: 'या महिन्यात' },
  'six_months': { en: '6 Months', mr: '६ महिने' },
  'this_year': { en: 'This Year', mr: 'या वर्षी' },
  'pdf_report': { en: 'PDF', mr: 'पीडीएफ' },
  'left_limit': { en: 'left, limit', mr: 'शिल्लक, मर्यादा' },

  // Udhari Page
  'customer': { en: 'Customer', mr: 'ग्राहक' },
  'add_customer': { en: 'Add Customer', mr: 'ग्राहक जोडा' },
  'pending_amount': { en: 'Pending Amount', mr: 'प्रलंबित रक्कम' },
  'customers': { en: 'Customers', mr: 'ग्राहक' },
  'no_udhari_customers': { en: 'No udhari customers yet', mr: 'अद्याप उधारीचे ग्राहक नाहीत' },
  'balance': { en: 'Balance', mr: 'बाकी' },
  'payment': { en: 'Payment', mr: 'जमा रक्कम' },
  'history': { en: 'History', mr: 'इतिहास' },
  'no_history': { en: 'No history yet', mr: 'अद्याप कोणताही इतिहास नाही' },
  'recent': { en: 'Recent', mr: 'अलीकडील' },
  'name_is_enough': { en: 'Name is enough. Mobile number is optional.', mr: 'फक्त नाव पुरेसे आहे. मोबाईल नंबर ऐच्छिक आहे.' },
  'customer_name': { en: 'Customer Name', mr: 'ग्राहकाचे नाव' },
  'mobile_number': { en: 'Mobile Number', mr: 'मोबाईल नंबर' },
  'save_customer': { en: 'Save Customer', mr: 'ग्राहक जतन करा' },
  'amount': { en: 'Amount', mr: 'रक्कम' },
  'note': { en: 'Note', mr: 'टीप' },
  'save_payment': { en: 'Save Payment', mr: 'पेमेंट जतन करा' },
  'receive_payment': { en: 'Receive Payment', mr: 'पेमेंट जमा करा' },
  'sale_bill': { en: 'Sale Bill', mr: 'विक्री बिल' },

  // Quick Sale / Sales Page
  'quick_sale': { en: 'Quick Sale', mr: 'त्वरित विक्री' },
  'quick_sale_desc': { en: 'Search for items, select quantity or price variant, add to cart, and finalize the sale', mr: 'वस्तू शोधा, प्रमाण किंवा किंमतीचा प्रकार निवडा, कार्टमध्ये जोडा आणि विक्री अंतिम करा' },
  'add_items_desc': { en: 'Add items and record transactions', mr: 'वस्तू जोडा आणि व्यवहारांची नोंद करा' },
  'add_items': { en: 'Add Items', mr: 'वस्तू जोडा' },
  'sale_items': { en: 'Sale Items', mr: 'विक्री वस्तू' },
  'no_items_added': { en: 'No items added yet', mr: 'अद्याप वस्तू जोडलेल्या नाहीत' },
  'selling': { en: 'Selling', mr: 'विक्री' },
  'cost': { en: 'Cost', mr: 'किंमत' },
  'profit_amount': { en: 'Profit', mr: 'नफा' },
  'total_revenue': { en: 'Total Revenue', mr: 'एकूण महसूल' },
  'total_cost': { en: 'Total Cost', mr: 'एकूण किंमत' },
  'total_profit': { en: 'Total Profit', mr: 'एकूण नफा' },
  'payment_method': { en: 'Payment Method', mr: 'पेमेंट पद्धत' },
  'udhari_customer': { en: 'Udhari Customer', mr: 'उधारी ग्राहक' },
  'new_customer': { en: 'New customer', mr: 'नवीन ग्राहक' },
  'mobile': { en: 'Mobile', mr: 'मोबाईल' },
  'optional': { en: 'Optional', mr: 'पर्यायी' },
  'udhari_bill_notice': { en: "This bill will appear in the customer's Udhari history.", mr: 'हे बिल ग्राहकाच्या उधारी इतिहासामध्ये दिसेल.' },
  'complete_sale': { en: 'Complete Sale', mr: 'विक्री पूर्ण करा' },
  'processing': { en: 'Processing...', mr: 'प्रक्रिया सुरू आहे...' },
  'cash': { en: 'Cash', mr: 'रोख' },
  'card': { en: 'Card', mr: 'कार्ड' },
  'partial': { en: 'Partial', mr: 'अंशतः' },
  'udhar': { en: 'Udhar', mr: 'उधार' },
  'confirm_sale_title': { en: 'Complete Sale?', mr: 'विक्री पूर्ण करायची?' },
  'buy': { en: 'Buy', mr: 'खरेदी' },
  'sell': { en: 'Sell', mr: 'विक्री' },
  'total_value_label': { en: 'Total Value', mr: 'एकूण मूल्य' },
  'price_variants': { en: 'Price Variants:', mr: 'किंमत प्रकार:' },
  'low_stock_alert': { en: 'Low Stock', mr: 'कमी स्टॉक' },
  'price_tier': { en: 'Price Tier', mr: 'किंमत स्तर' },
  'default_label': { en: 'Default', mr: 'डीफॉल्ट' },
  'total_price': { en: 'Total Price', mr: 'एकूण किंमत' },
  'add_to_sale': { en: 'Add to Sale', mr: 'विक्रीत जोडा' },
  'enter_quantity': { en: 'Enter quantity', mr: 'प्रमाण प्रविष्ट करा' },
  'search_items': { en: 'Search items...', mr: 'वस्तू शोधा...' },

  // Daily Sales Timeline
  'daily_sales': { en: 'Daily Sales', mr: 'दैनिक विक्री' },
  'no_sales_day': { en: 'No sales on this day', mr: 'या दिवशी विक्री नाही' },
  'no_sales_day_desc': { en: 'Sales recorded on this day will appear here.', mr: 'या दिवशी नोंदवलेली विक्री येथे दिसेल.' },
  'day_summary': { en: 'Day Summary', mr: 'दिवसाचा सारांश' },
  'revenue': { en: 'Revenue', mr: 'महसूल' },
  'items_sold': { en: 'Items Sold', mr: 'विकलेल्या वस्तू' },
  'stock_left': { en: 'Stock Left', mr: 'शिल्लक स्टॉक' },
  'per_unit': { en: 'per unit', mr: 'प्रति एकक' },
  'transaction': { en: 'Transaction', mr: 'व्यवहार' },
  'credit_sale': { en: 'Credit Sale', mr: 'उधार विक्री' },
  'tap_to_expand': { en: 'Tap to see details', mr: 'तपशील पाहण्यासाठी टॅप करा' },
  'previous_day': { en: 'Previous Day', mr: 'मागील दिवस' },
  'next_day': { en: 'Next Day', mr: 'पुढचा दिवस' },
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

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

