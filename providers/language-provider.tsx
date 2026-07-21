"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { db, initializeDatabase } from "@/lib/db";

export type AppLanguage = "en" | "mr";

interface LanguageContextType {
  language: AppLanguage;
  locale: string;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: string) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const translations: Record<string, Record<"en" | "mr", string>> = {
  dashboard: { en: "Dashboard", mr: "डॅशबोर्ड" },
  items: { en: "Items", mr: "वस्तु" },
  categories: { en: "Categories", mr: "श्रेणी" },
  units: { en: "Units", mr: "एकक" },
  settings: { en: "Settings", mr: "सेटिंग्ज" },
  add: { en: "Add", mr: "जोडा" },
  edit: { en: "Edit", mr: "संपादित करा" },
  delete: { en: "Delete", mr: "हटवा" },
  save: { en: "Save", mr: "जतन करा" },
  cancel: { en: "Cancel", mr: "रद्द करा" },
  search: { en: "Search", mr: "शोध" },
  voice_search: { en: "Voice Search", mr: "व्वाईस शोध" },
  name: { en: "Name", mr: "नाव" },
  price: { en: "Price", mr: "किंमत" },
  quantity: { en: "Quantity", mr: "प्रमाण" },
  category: { en: "Category", mr: "श्रेणी" },
  unit: { en: "Unit", mr: "एकक" },
  buy_price: { en: "Buy Price", mr: "खरेदी किंमत" },
  sell_price: { en: "Sell Price", mr: "विक्रय किंमत" },
  margin: { en: "Margin", mr: "मार्जिन" },
  low_stock: { en: "Low Stock Limit", mr: "कमी स्टॉक मर्यादा" },
  total_items: { en: "Total Items", mr: "एकूण वस्तु" },
  low_stock_items: { en: "Low Stock Items", mr: "कमी स्टॉक वस्तु" },
  total_value: { en: "Total Inventory Value", mr: "एकूण इन्व्हेंटरी मूल्य" },
  avg_margin: { en: "Average Margin", mr: "सरासरी मार्जिन" },
  language: { en: "Language", mr: "भाषा" },
  english: { en: "English", mr: "इंग्रजी" },
  marathi: { en: "Marathi", mr: "मराठी" },
  no_items: { en: "No items found", mr: "कोणतीही वस्तु आढळली नाही" },
  add_item: { en: "Add Item", mr: "वस्तू जोडा" },
  edit_item: { en: "Edit Item", mr: "वस्तू संपादित करा" },
  add_category: { en: "Add Category", mr: "श्रेणी जोडा" },
  edit_category: { en: "Edit Category", mr: "श्रेणी संपादित करा" },
  add_unit: { en: "Add Unit", mr: "एकक जोडा" },
  edit_unit: { en: "Edit Unit", mr: "एकक संपादित करा" },
  confirm_delete: { en: "Are you sure?", mr: "तुम्हाला खरोखर हवे का?" },
  success: { en: "Success", mr: "यशस्वी" },
  error: { en: "Error", mr: "त्रुटी" },

  // Navigation & General Layout
  home: { en: "Home", mr: "मुख्यपृष्ठ" },
  stock: { en: "Stock", mr: "स्टॉक" },
  udhari: { en: "Udhari", mr: "उधारी" },
  new_sale: { en: "New Sale", mr: "नवीन विक्री" },
  logout: { en: "Logout", mr: "लॉगआउट" },
  sale: { en: "Sale", mr: "विक्री" },
  dukan: { en: "Dukan", mr: "दुकान" },
  general: { en: "General", mr: "सामान्य" },

  // Dashboard Page
  today_sales: { en: "Today Sales", mr: "आजची विक्री" },
  today_profit: { en: "Today Profit", mr: "आजचा नफा" },
  low_stock_limit_label: { en: "Low Stock Limit", mr: "कमी स्टॉक मर्यादा" },
  low_stock_label: { en: "Low Stock", mr: "कमी स्टॉक" },
  pending: { en: "Pending", mr: "प्रलंबित" },
  products: { en: "products", mr: "उत्पादने" },
  transactions: { en: "transactions", mr: "व्यवहार" },
  reports: { en: "Reports", mr: "अहवाल" },
  high_margin_items: { en: "High Margin Items", mr: "अधिक नफा देणाऱ्या वस्तू" },
  stock_needed: { en: "Stock Needed", mr: "स्टॉक आवश्यक" },
  restock: { en: "Restock", mr: "स्टॉक भरा" },
  no_items_yet: {
    en: "No items yet. Add products from Stock.",
    mr: "अद्याप कोणत्याही वस्तू नाहीत. स्टॉक मधून उत्पादने जोडा.",
  },
  loading_shop_data: {
    en: "Loading shop data...",
    mr: "दुकान डेटा लोड होत आहे...",
  },
  today: { en: "Today", mr: "आज" },
  this_month: { en: "This Month", mr: "या महिन्यात" },
  six_months: { en: "6 Months", mr: "६ महिने" },
  this_year: { en: "This Year", mr: "या वर्षी" },
  pdf_report: { en: "PDF", mr: "पीडीएफ" },
  premium_pdf_report: { en: "Premium PDF", mr: "प्रीमियम पीडीएफ" },
  premium_pdf_requires_subscription: {
    en: "Premium subscription required to download detailed PDF.",
    mr: "सविस्तर पीडीएफ डाउनलोड करण्यासाठी प्रीमियम सदस्यत्व आवश्यक आहे.",
  },
  premium_pdf_downloaded: {
    en: "Premium PDF generated successfully.",
    mr: "प्रीमियम पीडीएफ यशस्वीरित्या तयार झाला.",
  },
  premium_pdf_fallback: {
    en: "Premium PDF failed, falling back to basic PDF.",
    mr: "प्रीमियम पीडीएफ अयशस्वी झाला, मुलभूत पीडीएफवर परत जात आहे.",
  },
  left_limit: { en: "left, limit", mr: "शिल्लक, मर्यादा" },
  highest_udhar: { en: "Highest Udhar", mr: "सर्वाधिक उधार" },

  // Udhari Page
  customer: { en: "Customer", mr: "ग्राहक" },
  add_customer: { en: "Add Customer", mr: "ग्राहक जोडा" },
  pending_amount: { en: "Pending Amount", mr: "प्रलंबित रक्कम" },
  customers: { en: "Customers", mr: "ग्राहक" },
  no_udhari_customers: {
    en: "No udhari customers yet",
    mr: "अद्याप उधारीचे ग्राहक नाहीत",
  },
  balance: { en: "Balance", mr: "बाकी" },
  payment: { en: "Payment", mr: "जमा रक्कम" },
  history: { en: "History", mr: "इतिहास" },
  no_history: { en: "No history yet", mr: "अद्याप कोणताही इतिहास नाही" },
  recent: { en: "Recent", mr: "अलीकडील" },
  name_is_enough: {
    en: "Name is enough. Mobile number is optional.",
    mr: "फक्त नाव पुरेसे आहे. मोबाईल नंबर ऐच्छिक आहे.",
  },
  customer_name: { en: "Customer Name", mr: "ग्राहकाचे नाव" },
  mobile_number: { en: "Mobile Number", mr: "मोबाईल नंबर" },
  save_customer: { en: "Save Customer", mr: "ग्राहक जतन करा" },
  amount: { en: "Amount", mr: "रक्कम" },
  note: { en: "Note", mr: "टीप" },
  save_payment: { en: "Save Payment", mr: "पेमेंट जतन करा" },
  receive_payment: { en: "Receive Payment", mr: "पेमेंट जमा करा" },
  sale_bill: { en: "Sale Bill", mr: "विक्री बिल" },

  // Quick Sale / Sales Page
  quick_sale: { en: "Quick Sale", mr: "त्वरित विक्री" },
  quick_sale_desc: {
    en: "Search for items, select quantity or price variant, add to cart, and finalize the sale",
    mr: "वस्तू शोधा, प्रमाण किंवा किंमतीचा प्रकार निवडा, कार्टमध्ये जोडा आणि विक्री अंतिम करा",
  },
  add_items_desc: {
    en: "Add items and record transactions",
    mr: "वस्तू जोडा आणि व्यवहारांची नोंद करा",
  },
  add_items: { en: "Add Items", mr: "वस्तू जोडा" },
  sale_items: { en: "Sale Items", mr: "विक्री वस्तू" },
  no_items_added: {
    en: "No items added yet",
    mr: "अद्याप वस्तू जोडलेल्या नाहीत",
  },
  selling: { en: "Selling", mr: "विक्री" },
  cost: { en: "Cost", mr: "किंमत" },
  profit_amount: { en: "Profit", mr: "नफा" },
  total_revenue: { en: "Total Revenue", mr: "एकूण महसूल" },
  total_cost: { en: "Total Cost", mr: "एकूण किंमत" },
  total_profit: { en: "Total Profit", mr: "एकूण नफा" },
  payment_method: { en: "Payment Method", mr: "पेमेंट पद्धत" },
  udhari_customer: { en: "Udhari Customer", mr: "उधारी ग्राहक" },
  new_customer: { en: "New customer", mr: "नवीन ग्राहक" },
  mobile: { en: "Mobile", mr: "मोबाईल" },
  optional: { en: "Optional", mr: "पर्यायी" },
  udhari_bill_notice: {
    en: "This bill will appear in the customer's Udhari history.",
    mr: "हे बिल ग्राहकाच्या उधारी इतिहासामध्ये दिसेल.",
  },
  complete_sale: { en: "Complete Sale", mr: "विक्री पूर्ण करा" },
  processing: { en: "Processing...", mr: "प्रक्रिया सुरू आहे..." },
  cash: { en: "Cash", mr: "रोख" },
  card: { en: "Card", mr: "कार्ड" },
  partial: { en: "Partial", mr: "अंशतः" },
  udhar: { en: "Udhar", mr: "उधार" },
  confirm_sale_title: { en: "Complete Sale?", mr: "विक्री पूर्ण करायची?" },
  buy: { en: "Buy", mr: "खरेदी" },
  sell: { en: "Sell", mr: "विक्री" },
  total_value_label: { en: "Total Value", mr: "एकूण मूल्य" },
  price_variants: { en: "Price Variants:", mr: "किंमत प्रकार:" },
  low_stock_alert: { en: "Low Stock", mr: "कमी स्टॉक" },
  price_tier: { en: "Price Tier", mr: "किंमत स्तर" },
  default_label: { en: "Default", mr: "डीफॉल्ट" },
  total_price: { en: "Total Price", mr: "एकूण किंमत" },
  add_to_sale: { en: "Add to Sale", mr: "विक्रीत जोडा" },
  enter_quantity: { en: "Enter quantity", mr: "प्रमाण प्रविष्ट करा" },
  search_items: { en: "Search items...", mr: "वस्तू शोधा..." },

  // Daily Sales Timeline
  daily_sales: { en: "Daily Sales", mr: "दैनिक विक्री" },
  no_sales_day: { en: "No sales on this day", mr: "या दिवशी विक्री नाही" },
  no_sales_day_desc: {
    en: "Sales recorded on this day will appear here.",
    mr: "या दिवशी नोंदवलेली विक्री येथे दिसेल.",
  },
  day_summary: { en: "Day Summary", mr: "दिवसाचा सारांश" },
  revenue: { en: "Revenue", mr: "महसूल" },
  items_sold: { en: "Items Sold", mr: "विकलेल्या वस्तू" },
  stock_left: { en: "Stock Left", mr: "शिल्लक स्टॉक" },
  per_unit: { en: "per unit", mr: "प्रति एकक" },
  transaction: { en: "Transaction", mr: "व्यवहार" },
  credit_sale: { en: "Credit Sale", mr: "उधार विक्री" },
  tap_to_expand: { en: "Tap to see details", mr: "तपशील पाहण्यासाठी टॅप करा" },
  previous_day: { en: "Previous Day", mr: "मागील दिवस" },
  next_day: { en: "Next Day", mr: "पुढचा दिवस" },

  // Shared / shell
  shop: { en: "Shop", mr: "दुकान" },
  loading: { en: "Loading...", mr: "लोड होत आहे..." },
  loading_dukan: { en: "Loading Dukan...", mr: "दुकान लोड होत आहे..." },
  no_data: { en: "No data available", mr: "डेटा उपलब्ध नाही" },
  expand_menu: { en: "Expand menu", mr: "मेनू विस्तारा" },
  collapse_menu: { en: "Collapse menu", mr: "मेनू संकुचित करा" },
  unread: { en: "Unread", mr: "न वाचलेले" },
  total_label: { en: "Total", mr: "एकूण" },
  unknown: { en: "Unknown", mr: "अज्ञात" },
  color: { en: "Color", mr: "रंग" },
  short_form: { en: "Short form", mr: "संक्षिप्त रूप" },
  update: { en: "Update", mr: "अद्यतनित करा" },
  actions: { en: "Actions", mr: "क्रिया" },
  select_all: { en: "Select All", mr: "सर्व निवडा" },
  deselect_all: { en: "Deselect All", mr: "निवड रद्द करा" },
  delete_confirm_title: { en: "Delete?", mr: "हटवायचे?" },
  cannot_undo: {
    en: "This action cannot be undone.",
    mr: "ही क्रिया पूर्ववत करता येणार नाही.",
  },

  // Login
  login_title: { en: "Dukan", mr: "दुकान" },
  login_subtitle: {
    en: "Sign in to manage your shop",
    mr: "तुमचे दुकान व्यवस्थापित करण्यासाठी साइन इन करा",
  },
  email: { en: "Email", mr: "ईमेल" },
  password: { en: "Password", mr: "पासवर्ड" },
  enter_email: { en: "Enter your email", mr: "तुमचा ईमेल प्रविष्ट करा" },
  enter_password: {
    en: "Enter your password",
    mr: "तुमचा पासवर्ड प्रविष्ट करा",
  },
  logging_in: { en: "Logging in...", mr: "लॉग इन होत आहे..." },
  login: { en: "Login", mr: "लॉग इन" },
  login_success: { en: "Login successful!", mr: "लॉग इन यशस्वी!" },
  login_fill_fields: {
    en: "Please enter both email and password",
    mr: "कृपया ईमेल आणि पासवर्ड दोन्ही प्रविष्ट करा",
  },
  redirecting_dashboard: {
    en: "Redirecting to dashboard...",
    mr: "डॅशबोर्डवर पुनर्निर्देशित करत आहे...",
  },

  // Reports
  reports_help: {
    en: "View daily sales breakdowns or monthly profit and loss analysis",
    mr: "दैनिक विक्री तपशील किंवा मासिक नफा-तोटा विश्लेषण पहा",
  },
  daily_report: { en: "Daily Report", mr: "दैनिक अहवाल" },
  monthly_pl: { en: "Monthly P&L", mr: "मासिक नफा-तोटा" },
  daily_report_title: { en: "Daily Report", mr: "दैनिक अहवाल" },
  monthly_report_title: {
    en: "Monthly P&L Report",
    mr: "मासिक नफा-तोटा अहवाल",
  },
  monthly_report_desc: {
    en: "Profit and loss analysis for your shop",
    mr: "तुमच्या दुकानासाठी नफा आणि तोटा विश्लेषण",
  },
  back_to_sales: { en: "Back to Sales", mr: "विक्रीकडे परत" },
  total_transactions: { en: "Total Transactions", mr: "एकूण व्यवहार" },
  sales_completed: { en: "Sales completed", mr: "पूर्ण झालेल्या विक्री" },
  cost_of_goods: { en: "Cost of Goods", mr: "मालाची किंमत" },
  loading_report: { en: "Loading report...", mr: "अहवाल लोड होत आहे..." },
  no_sales_month: {
    en: "No sales data for this month",
    mr: "या महिन्यात विक्री डेटा नाही",
  },
  daily_breakdown: { en: "Daily Breakdown", mr: "दैनिक तपशील" },
  top_selling_items: {
    en: "Top Selling Items",
    mr: "सर्वाधिक विक्री होणाऱ्या वस्तू",
  },
  sold: { en: "sold", mr: "विक्री" },

  // Alerts
  alerts_title: { en: "Alerts", mr: "सूचना" },
  alerts_desc: {
    en: "Stock and expiry notifications for your shop.",
    mr: "तुमच्या दुकानासाठी स्टॉक आणि कालबाह्य सूचना.",
  },
  no_alerts: { en: "No alerts right now", mr: "सध्या कोणत्याही सूचना नाहीत" },
  no_alerts_desc: {
    en: "Low stock and expiry alerts will appear here.",
    mr: "कमी स्टॉक आणि कालबाह्य सूचना येथे दिसतील.",
  },
  severity_info: { en: "info", mr: "माहिती" },
  severity_warning: { en: "warning", mr: "इशारा" },
  severity_critical: { en: "critical", mr: "गंभीर" },

  // Settings
  settings_desc: {
    en: "Manage your app preferences and inventory settings",
    mr: "अॅप प्राधान्ये आणि इन्व्हेंटरी सेटिंग्ज व्यवस्थापित करा",
  },
  language_desc: {
    en: "Choose your preferred language",
    mr: "तुमची पसंतीची भाषा निवडा",
  },
  language_note_en: {
    en: "The application will be displayed in your selected language.",
    mr: "अॅप तुमच्या निवडलेल्या भाषेत दिसेल.",
  },
  language_note_mr: {
    en: "The application will be displayed in Marathi.",
    mr: "तुमच्या अनुमतीने, या अनुप्रयोगातील सर्व मराठी भाषेत दिसेल.",
  },
  about_title: { en: "About Dukan", mr: "दुकान बद्दल" },
  about_subtitle: {
    en: "Shop inventory management app",
    mr: "दुकान इन्व्हेंटरी व्यवस्थापन अॅप",
  },
  about_body1: {
    en: "Dukan is a simple inventory system for small grocery shops and retail businesses.",
    mr: "दुकान हे छोट्या किराणा दुकानांसाठी सोपे इन्व्हेंटरी व्यवस्थापन आहे.",
  },
  about_body2: {
    en: "Your data is stored locally on your device and works offline.",
    mr: "तुमचा डेटा डिव्हाइसवर स्थानिकरित्या साठवला जातो आणि ऑफलाइन काम करतो.",
  },
  version: { en: "Version", mr: "आवृत्ती" },

  // Categories
  categories_desc: {
    en: "Manage your product categories",
    mr: "तुमच्या उत्पादन श्रेणी व्यवस्थापित करा",
  },
  category_name_label: { en: "Category Name", mr: "श्रेणीचे नाव" },
  category_name_marathi: {
    en: "Category Name (Marathi)",
    mr: "श्रेणीचे नाव (मराठी)",
  },
  update_category_desc: {
    en: "Update category details",
    mr: "श्रेणी तपशील अद्यतनित करा",
  },
  create_category_desc: {
    en: "Create a new product category",
    mr: "नवीन उत्पादन श्रेणी तयार करा",
  },
  no_categories: {
    en: "No categories added yet",
    mr: "अद्याप श्रेणी जोडलेल्या नाहीत",
  },
  category_name_required: {
    en: "Please enter a category name",
    mr: "कृपया श्रेणीचे नाव प्रविष्ट करा",
  },
  category_updated: {
    en: "Category updated successfully",
    mr: "श्रेणी यशस्वीरित्या अद्यतनित केली",
  },
  category_added: {
    en: "Category added successfully",
    mr: "श्रेणी यशस्वीरित्या जोडली",
  },
  category_deleted: {
    en: "Category deleted successfully",
    mr: "श्रेणी यशस्वीरित्या हटवली",
  },
  category_save_error: {
    en: "Error saving category",
    mr: "श्रेणी जतन करताना त्रुटी",
  },
  category_delete_error: {
    en: "Error deleting category",
    mr: "श्रेणी हटवताना त्रुटी",
  },
  delete_category_title: { en: "Delete Category?", mr: "श्रेणी हटवायची?" },
  delete_category_desc: {
    en: "The category will be deleted permanently.",
    mr: "श्रेणी कायमस्वरूपी हटवली जाईल.",
  },

  // Units
  units_desc: {
    en: "Manage measurement units for your products",
    mr: "उत्पादनांसाठी मापन एकके व्यवस्थापित करा",
  },
  unit_name_label: { en: "Unit Name", mr: "एककाचे नाव" },
  unit_name_marathi: { en: "Unit Name (Marathi)", mr: "एककाचे नाव (मराठी)" },
  short_form_label: {
    en: "Short Form (e.g., kg, L)",
    mr: "संक्षिप्त रूप (उदा. kg, L)",
  },
  update_unit_desc: { en: "Update unit details", mr: "एकक तपशील अद्यतनित करा" },
  create_unit_desc: {
    en: "Create a new measurement unit",
    mr: "नवीन मापन एकक तयार करा",
  },
  no_units: { en: "No units added yet", mr: "अद्याप एकके जोडलेली नाहीत" },
  fill_all_fields: { en: "Please fill all fields", mr: "कृपया सर्व फील्ड भरा" },
  unit_updated: {
    en: "Unit updated successfully",
    mr: "एकक यशस्वीरित्या अद्यतनित केले",
  },
  unit_added: { en: "Unit added successfully", mr: "एकक यशस्वीरित्या जोडले" },
  unit_deleted: {
    en: "Unit deleted successfully",
    mr: "एकक यशस्वीरित्या हटवले",
  },
  unit_save_error: { en: "Error saving unit", mr: "एकक जतन करताना त्रुटी" },
  unit_delete_error: { en: "Error deleting unit", mr: "एकक हटवताना त्रुटी" },
  delete_unit_title: { en: "Delete Unit?", mr: "एकक हटवायचे?" },
  delete_unit_desc: {
    en: "The unit will be deleted permanently.",
    mr: "एकक कायमस्वरूपी हटवले जाईल.",
  },

  // Items
  items_desc: {
    en: "Manage inventory, prices, and stock levels",
    mr: "इन्व्हेंटरी, किंमती आणि स्टॉक पातळी व्यवस्थापित करा",
  },
  add_new_item: { en: "Add New Item", mr: "नवीन वस्तू जोडा" },
  item_validation_error: {
    en: "Please fill all fields correctly. Selling price must be greater than buying price.",
    mr: "कृपया सर्व फील्ड योग्यरित्या भरा. विक्री किंमत खरेदी किंमतीपेक्षा जास्त असावी.",
  },
  item_updated: {
    en: "Item updated successfully",
    mr: "वस्तू यशस्वीरित्या अद्यतनित केली",
  },
  item_added: { en: "Item added successfully", mr: "वस्तू यशस्वीरित्या जोडली" },
  item_save_error: {
    en: "Error saving item. Please try again.",
    mr: "वस्तू जतन करताना त्रुटी. पुन्हा प्रयत्न करा.",
  },
  item_deleted: {
    en: "Item deleted successfully",
    mr: "वस्तू यशस्वीरित्या हटवली",
  },
  item_delete_error: { en: "Error deleting item", mr: "वस्तू हटवताना त्रुटी" },
  items_bulk_deleted: {
    en: "Deleted {count} item(s)",
    mr: "{count} वस्तू हटवल्या",
  },
  items_bulk_delete_error: {
    en: "Error deleting items",
    mr: "वस्तू हटवताना त्रुटी",
  },
  item_name_en: { en: "Item Name", mr: "वस्तूचे नाव" },
  item_name_mr: { en: "Item Name (Marathi)", mr: "वस्तूचे नाव (मराठी)" },
  item_name_tooltip: {
    en: "Product name as shown in your shop (e.g., Basmati Rice, Salt)",
    mr: "दुकानात दिसणारे उत्पादनाचे नाव (उदा. बासमती तांदूळ, मीठ)",
  },
  item_name_mr_tooltip: {
    en: "Product name in Marathi for local customers",
    mr: "स्थानिक ग्राहकांसाठी मराठी उत्पादनाचे नाव",
  },
  category_tooltip: {
    en: "Group products by type (Grains, Oils, Spices, etc.)",
    mr: "उत्पादने प्रकारानुसार गटबद्ध करा (धान्य, तेल, मसाले इ.)",
  },
  unit_tooltip: {
    en: "Measurement unit (kg, L, pcs, g, ml) for stock and sales",
    mr: "स्टॉक आणि विक्रीसाठी मापन एकक (kg, L, pcs, g, ml)",
  },
  quantity_tooltip: {
    en: "Current stock quantity in your shop",
    mr: "दुकानातील सध्याचे स्टॉक प्रमाण",
  },
  buy_price_tooltip: {
    en: "Cost price from supplier (Rs.)",
    mr: "पुरवठादाराकडून खरेदी किंमत (रु.)",
  },
  sell_price_tooltip: {
    en: "Retail price for customers (Rs.)",
    mr: "ग्राहकांसाठी विक्री किंमत (रु.)",
  },
  low_stock_tooltip: {
    en: "Alert when stock falls below this level. Leave empty to disable.",
    mr: "स्टॉक या पातळीखाली गेल्यास सूचना. बंद करण्यासाठी रिकामे ठेवा.",
  },
  leave_empty_alerts: {
    en: "Leave empty to disable alerts",
    mr: "सूचना बंद करण्यासाठी रिकामे ठेवा",
  },
  basic_info: { en: "Basic Info", mr: "मूलभूत माहिती" },
  pricing: { en: "Pricing", mr: "किंमत" },
  price_tiers_tab: { en: "Price Tiers", mr: "किंमत स्तर" },
  not_enough_stock: { en: "Not enough stock", mr: "पुरेसा स्टॉक नाही" },
  stock_issue: { en: "Stock issue", mr: "स्टॉक समस्या" },
  only_available: {
    en: "Only {qty} {unit} available",
    mr: "फक्त {qty} {unit} उपलब्ध",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<"en" | "mr">("mr");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await initializeDatabase();
        const settings = await db.appSettings.toCollection().first();
        if (settings) {
          setLanguageState(settings.language || "mr");
        }
      } catch (error) {
        console.error("[Dukan] Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = async (lang: "en" | "mr") => {
    setLanguageState(lang);
    try {
      const settings = await db.appSettings.toCollection().first();
      if (settings && settings.id) {
        await db.appSettings.update(settings.id, { language: lang });
      }
    } catch (error) {
      console.error("[Dukan] Error updating language:", error);
    }
  };

  const locale = language === "mr" ? "mr-IN" : "en-IN";

  const t = useCallback(
    (key: string): string => translations[key]?.[language] || key,
    [language],
  );

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) =>
      date.toLocaleDateString(locale, options),
    [locale],
  );

  const value = useMemo(
    () => ({ language, locale, setLanguage, t, formatDate }),
    [language, locale, setLanguage, t, formatDate],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
