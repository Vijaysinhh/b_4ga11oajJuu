'use client';

import Dexie, { type Table } from 'dexie';

export interface PriceTier {
  id?: number;
  itemId: number;
  quantity: number; // e.g., 50, 100, 250, 500
  unitId: number;
  price: number; // Retail price for this tier
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id?: number;
  name: string;
  nameMarathi: string;
  categoryId: number;
  unitId: number;
  quantity: number;
  buyPrice: number; // Buy price per unit
  sellPrice: number; // Sell price per unit
  marginAmount?: number; // Auto-calculated: sellPrice - buyPrice
  marginPercent?: number; // Auto-calculated: (marginAmount / buyPrice) * 100
  lowStockLimit: number; // User-defined limit
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id?: number;
  name: string;
  nameMarathi: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Unit {
  id?: number;
  name: string;
  nameMarathi: string;
  shortForm: string; // kg, g, l, ml, pcs, dozen, packet, box
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id?: number;
  language: 'en' | 'mr'; // en = English, mr = Marathi
  theme: 'light' | 'dark' | 'system';
  setupComplete: boolean;
  lastBackup?: number;
  updatedAt: number;
}

export interface SaleItem {
  id?: number;
  saleId: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitId: number;
  unitShortForm: string;
  priceTierId?: number; // Which price tier was used
  pricePerUnit: number; // Actual selling price used
  totalPrice: number; // quantity * pricePerUnit
  costPerUnit: number; // For profit calculation
  totalCost: number; // quantity * costPerUnit
  profit: number; // totalPrice - totalCost
  createdAt: number;
}

export interface StockHistory {
  id?: number;
  itemId: number;
  itemName: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'expiry'; // Type of stock change
  quantityChanged: number; // Positive or negative
  quantityBefore: number; // Stock before change
  quantityAfter: number; // Stock after change
  reason?: string; // Explanation for adjustment
  costPerUnit?: number; // Cost at time of transaction
  reference?: string; // Sale ID or purchase order number
  createdAt: number;
}

export interface Batch {
  id?: number;
  itemId: number;
  itemName: string;
  batchNumber?: string; // Batch/Lot number from supplier
  purchaseDate: number; // When purchased
  expiryDate?: number; // When it expires
  quantityReceived: number; // Original quantity
  quantitySold: number; // How much sold so far
  quantityAvailable: number; // quantityReceived - quantitySold
  costPerUnit: number; // Cost when purchased
  supplierId?: string; // Which supplier
  status: 'active' | 'expiring' | 'expired'; // Status
  createdAt: number;
  updatedAt: number;
}

export interface Alert {
  id?: number;
  itemId: number;
  itemName: string;
  alertType: 'low_stock' | 'expiring' | 'slow_moving' | 'expired'; // Type of alert
  message: string; // Alert message
  severity: 'info' | 'warning' | 'critical'; // Alert level
  data?: any; // Additional data (quantity, days until expiry, etc)
  read: boolean; // Has user seen this?
  createdAt: number;
}

export interface Sale {
  id?: number;
  date: string; // YYYY-MM-DD format
  timestamp: number; // Unix timestamp
  items: (Omit<SaleItem, 'saleId'> & { saleId?: number })[]; // Array of items sold (saleId optional for new sales)
  totalQuantityItems: number; // Count of item types
  subtotal: number; // Sum of all item prices
  totalCost: number; // Sum of all item costs
  totalProfit: number; // subtotal - totalCost
  profitMarginPercent: number; // (totalProfit / subtotal) * 100
  paymentMethod: 'cash' | 'card' | 'partial'; // How they paid
  notes?: string; // Optional notes
  createdAt: number;
  updatedAt: number;
}

export class DukanDB extends Dexie {
  items!: Table<Item>;
  priceTiers!: Table<PriceTier>;
  categories!: Table<Category>;
  units!: Table<Unit>;
  appSettings!: Table<AppSettings>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  stockHistory!: Table<StockHistory>;
  batches!: Table<Batch>;
  alerts!: Table<Alert>;

  constructor() {
    super('DukanDB');
    this.version(1).stores({
      items: '++id, categoryId, updatedAt',
      priceTiers: '++id, itemId, updatedAt',
      categories: '++id, updatedAt',
      units: '++id, updatedAt',
      appSettings: '++id',
      sales: '++id, date, timestamp',
      saleItems: '++id, saleId, itemId',
      stockHistory: '++id, itemId, createdAt',
      batches: '++id, itemId, expiryDate',
      alerts: '++id, itemId, alertType, createdAt',
    });
  }
}

export const db = new DukanDB();

// Pre-loaded default categories for quick setup
export function getDefaultCategories(): Omit<Category, 'id'>[] {
  const now = Date.now();
  return [
    { name: 'Grocery', nameMarathi: 'किराणा', color: '#3b82f6', createdAt: now, updatedAt: now },
    { name: 'Dairy & Milk', nameMarathi: 'दुग्ध', color: '#f59e0b', createdAt: now, updatedAt: now },
    { name: 'Beverages', nameMarathi: 'पेय पदार्थ', color: '#ef4444', createdAt: now, updatedAt: now },
    { name: 'Snacks & Sweets', nameMarathi: 'स्नॅक्स', color: '#8b5cf6', createdAt: now, updatedAt: now },
    { name: 'Household Items', nameMarathi: 'घरेलू', color: '#06b6d4', createdAt: now, updatedAt: now },
    { name: 'Personal Care', nameMarathi: 'व्यक्तिगत', color: '#ec4899', createdAt: now, updatedAt: now },
  ];
}

// Pre-loaded default units for quick setup
export function getDefaultUnits(): Omit<Unit, 'id'>[] {
  const now = Date.now();
  return [
    { name: 'Kilogram', nameMarathi: 'किलोग्राम', shortForm: 'kg', createdAt: now, updatedAt: now },
    { name: 'Gram', nameMarathi: 'ग्राम', shortForm: 'g', createdAt: now, updatedAt: now },
    { name: 'Liter', nameMarathi: 'लिटर', shortForm: 'l', createdAt: now, updatedAt: now },
    { name: 'Milliliter', nameMarathi: 'मिली लिटर', shortForm: 'ml', createdAt: now, updatedAt: now },
    { name: 'Piece', nameMarathi: 'तुकडे', shortForm: 'pcs', createdAt: now, updatedAt: now },
    { name: 'Box', nameMarathi: 'डिब्बा', shortForm: 'box', createdAt: now, updatedAt: now },
  ];
}

export const DEMO_ITEMS: Omit<Item, 'id'>[] = [];

// Initialize database with default categories and units on first load
export async function initializeDatabase() {
  try {
    const settingsCount = await db.appSettings.count();
    
    if (settingsCount === 0) {
      // First time setup - clear everything and reinitialize
      await db.delete();
      await db.open();
      
      // Initialize with default categories and units
      await db.categories.bulkAdd(getDefaultCategories());
      await db.units.bulkAdd(getDefaultUnits());

      await db.appSettings.add({
        language: 'mr',
        theme: 'light',
        setupComplete: true,
        updatedAt: Date.now(),
      });

      console.log('[Dukan] Database initialized with default categories and units');
    }
  } catch (error) {
    console.error('[Dukan] Database initialization error:', error);
  }
}
