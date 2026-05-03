'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fixed demo user ID - all devices with demo account share this ID
export const DEMO_USER_ID = 'demo-bharat-shop-001';

/**
 * Sync items to Supabase
 */
export async function saveItemToSupabase(userId: string, item: any) {
  try {
    const { data, error } = await supabase
      .from('items')
      .upsert({
        id: item.id,
        user_id: userId,
        name: item.name,
        category_id: item.categoryId,
        unit_id: item.unitId,
        quantity: item.quantity,
        buy_price: item.buyPrice,
        sell_price: item.sellPrice,
        low_stock_limit: item.lowStockLimit || 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving item to Supabase:', error);
    throw error;
  }
}

/**
 * Sync sales to Supabase
 */
export async function saveSaleToSupabase(userId: string, sale: any) {
  try {
    const { data, error } = await supabase
      .from('sales')
      .upsert({
        id: sale.id,
        user_id: userId,
        date: sale.date,
        timestamp: sale.timestamp,
        items: sale.items,
        total_quantity_items: sale.totalQuantityItems,
        subtotal: sale.subtotal,
        total_cost: sale.totalCost,
        total_profit: sale.totalProfit,
        profit_margin_percent: sale.profitMarginPercent,
        payment_method: sale.paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving sale to Supabase:', error);
    throw error;
  }
}

/**
 * Sync categories to Supabase
 */
export async function saveCategoryToSupabase(userId: string, category: any) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .upsert({
        id: category.id,
        user_id: userId,
        name: category.name,
        description: category.description || '',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving category to Supabase:', error);
    throw error;
  }
}

/**
 * Sync units to Supabase
 */
export async function saveUnitToSupabase(userId: string, unit: any) {
  try {
    const { data, error } = await supabase
      .from('units')
      .upsert({
        id: unit.id,
        user_id: userId,
        name: unit.name,
        short_form: unit.shortForm,
        description: unit.description || '',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving unit to Supabase:', error);
    throw error;
  }
}

/**
 * Sync price tiers to Supabase
 */
export async function savePriceTierToSupabase(userId: string, priceTier: any) {
  try {
    const { data, error } = await supabase
      .from('price_tiers')
      .upsert({
        id: priceTier.id,
        user_id: userId,
        item_id: priceTier.itemId,
        quantity: priceTier.quantity,
        unit_id: priceTier.unitId,
        price: priceTier.price,
        buy_price: priceTier.buyPrice || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving price tier to Supabase:', error);
    throw error;
  }
}

/**
 * Sync batches to Supabase
 */
export async function saveBatchToSupabase(userId: string, batch: any) {
  try {
    const { data, error } = await supabase
      .from('batches')
      .upsert({
        id: batch.id,
        user_id: userId,
        item_id: batch.itemId,
        batch_number: batch.batchNumber,
        quantity: batch.quantity,
        purchase_date: batch.purchaseDate,
        expiry_date: batch.expiryDate || null,
        cost_per_unit: batch.costPerUnit,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving batch to Supabase:', error);
    throw error;
  }
}

/**
 * Sync alerts to Supabase
 */
export async function saveAlertToSupabase(userId: string, alert: any) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .upsert({
        id: alert.id,
        user_id: userId,
        item_id: alert.itemId,
        alert_type: alert.alertType,
        message: alert.message,
        is_resolved: alert.isResolved || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error saving alert to Supabase:', error);
    throw error;
  }
}

/**
 * Fetch items from Supabase for a user
 */
export async function fetchItemsFromSupabase(userId: string) {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching items from Supabase:', error);
    return [];
  }
}

/**
 * Fetch sales from Supabase for a user
 */
export async function fetchSalesFromSupabase(userId: string) {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching sales from Supabase:', error);
    return [];
  }
}

/**
 * Sync all local data to Supabase
 * This is called on login to ensure cloud is up-to-date
 */
export async function syncToSupabase(userId: string) {
  try {
    // Import db dynamically to avoid circular dependencies
    const { db } = await import('./db');
    
    console.log('[v0] Starting full sync to Supabase...');

    // Sync all items
    const items = await db.items.toArray();
    for (const item of items) {
      await saveItemToSupabase(userId, item).catch(err => 
        console.warn('[v0] Failed to sync item:', item.id, err)
      );
    }

    // Sync all sales
    const sales = await db.sales.toArray();
    for (const sale of sales) {
      await saveSaleToSupabase(userId, sale).catch(err =>
        console.warn('[v0] Failed to sync sale:', sale.id, err)
      );
    }

    // Sync all categories
    const categories = await db.categories.toArray();
    for (const category of categories) {
      await saveCategoryToSupabase(userId, category).catch(err =>
        console.warn('[v0] Failed to sync category:', category.id, err)
      );
    }

    // Sync all units
    const units = await db.units.toArray();
    for (const unit of units) {
      await saveUnitToSupabase(userId, unit).catch(err =>
        console.warn('[v0] Failed to sync unit:', unit.id, err)
      );
    }

    // Sync all price tiers
    const priceTiers = await db.priceTiers.toArray();
    for (const tier of priceTiers) {
      await savePriceTierToSupabase(userId, tier).catch(err =>
        console.warn('[v0] Failed to sync price tier:', tier.id, err)
      );
    }

    // Sync all batches
    const batches = await db.batches.toArray();
    for (const batch of batches) {
      await saveBatchToSupabase(userId, batch).catch(err =>
        console.warn('[v0] Failed to sync batch:', batch.id, err)
      );
    }

    // Sync all alerts
    const alerts = await db.alerts.toArray();
    for (const alert of alerts) {
      await saveAlertToSupabase(userId, alert).catch(err =>
        console.warn('[v0] Failed to sync alert:', alert.id, err)
      );
    }

    console.log('[v0] Full sync to Supabase completed');
  } catch (error) {
    console.error('[v0] Error during full sync:', error);
    throw error;
  }
}
