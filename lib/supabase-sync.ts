'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Dukan] Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);

function formatSupabaseError(error: any) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function isSupabaseTableMissingError(error: any) {
  const message =
    (typeof error === 'string' && error) ||
    (error && (error.message || error.msg || error.error || error.code)) ||
    '';

  return /relation .* does not exist|table .* does not exist|table not found|missing relation/i.test(String(message));
}

async function safeFetchFromSupabase(table: string, userId: string, selectExpr = '*'): Promise<any[]> {
  try {
    const { data, error } = await supabase.from(table).select(selectExpr).eq('user_id', userId);
    if (error) {
      const errorText = formatSupabaseError(error);
      if (isSupabaseTableMissingError(error)) {
        console.warn(`[v0] Supabase table missing: ${table}. Skipping sync for this table. ${errorText}`);
        return [];
      }
      throw new Error(errorText);
    }
    return data || [];
  } catch (error) {
    console.error(`[v0] Error fetching ${table} from Supabase:`, formatSupabaseError(error));
    return [];
  }
}

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
  return safeFetchFromSupabase('items', userId);
}

/**
 * Fetch sales from Supabase for a user
 */
export async function fetchSalesFromSupabase(userId: string) {
  return safeFetchFromSupabase('sales', userId);
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

function normalizeTimestamp(value: any, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function buildItemMargin(item: { buyPrice?: number; sellPrice?: number }) {
  const buyPrice = item.buyPrice ?? 0;
  const sellPrice = item.sellPrice ?? 0;
  const marginAmount = sellPrice - buyPrice;
  const marginPercent = buyPrice > 0 ? (marginAmount / buyPrice) * 100 : 0;
  return { marginAmount, marginPercent };
}

function mapCloudItem(row: any) {
  const buyPrice = Number(row.buy_price ?? row.buyPrice ?? 0);
  const sellPrice = Number(row.sell_price ?? row.sellPrice ?? 0);
  const { marginAmount, marginPercent } = buildItemMargin({ buyPrice, sellPrice });

  return {
    id: row.id,
    name: row.name || '',
    nameMarathi: row.name_marathi || row.nameMarathi || row.name || '',
    categoryId: Number(row.category_id ?? row.categoryId ?? 0),
    unitId: Number(row.unit_id ?? row.unitId ?? 0),
    quantity: Number(row.quantity ?? 0),
    buyPrice,
    sellPrice,
    marginAmount,
    marginPercent,
    lowStockLimit: Number(row.low_stock_limit ?? row.lowStockLimit ?? 0),
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
    updatedAt: normalizeTimestamp(row.updated_at ?? row.updatedAt, Date.now()),
  };
}

function mapCloudCategory(row: any) {
  return {
    id: row.id,
    name: row.name || '',
    nameMarathi: row.name_marathi || row.nameMarathi || row.name || '',
    color: row.color || '#1f2937',
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
    updatedAt: normalizeTimestamp(row.updated_at ?? row.updatedAt, Date.now()),
  };
}

function mapCloudUnit(row: any) {
  return {
    id: row.id,
    name: row.name || '',
    nameMarathi: row.name_marathi || row.nameMarathi || row.name || '',
    shortForm: row.short_form || row.shortForm || '',
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
    updatedAt: normalizeTimestamp(row.updated_at ?? row.updatedAt, Date.now()),
  };
}

function mapCloudPriceTier(row: any) {
  return {
    id: row.id,
    itemId: Number(row.item_id ?? row.itemId ?? 0),
    quantity: Number(row.quantity ?? 0),
    unitId: Number(row.unit_id ?? row.unitId ?? 0),
    price: Number(row.price ?? 0),
    buyPrice: Number(row.buy_price ?? row.buyPrice ?? 0),
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
    updatedAt: normalizeTimestamp(row.updated_at ?? row.updatedAt, Date.now()),
  };
}

function mapCloudBatch(row: any) {
  const quantityReceived = Number(row.quantity ?? row.quantity_received ?? 0);
  const quantitySold = Number(row.quantity_sold ?? 0);
  const quantityAvailable = Number(row.quantity_available ?? quantityReceived - quantitySold);

  return {
    id: row.id,
    itemId: Number(row.item_id ?? row.itemId ?? 0),
    itemName: row.item_name || row.itemName || '',
    batchNumber: row.batch_number || row.batchNumber || '',
    purchaseDate: normalizeTimestamp(row.purchase_date ?? row.purchaseDate, Date.now()),
    expiryDate: row.expiry_date ? normalizeTimestamp(row.expiry_date, Date.now()) : undefined,
    quantityReceived,
    quantitySold,
    quantityAvailable,
    costPerUnit: Number(row.cost_per_unit ?? row.costPerUnit ?? 0),
    supplierId: row.supplier_id || row.supplierId || undefined,
    status: row.status || 'active',
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
    updatedAt: normalizeTimestamp(row.updated_at ?? row.updatedAt, Date.now()),
  };
}

function mapCloudAlert(row: any) {
  return {
    id: row.id,
    itemId: Number(row.item_id ?? row.itemId ?? 0),
    itemName: row.item_name || row.itemName || '',
    alertType: row.alert_type || row.alertType || 'low_stock',
    message: row.message || '',
    severity: row.severity || 'warning',
    data: row.data ?? row.payload ?? null,
    read: Boolean(row.is_resolved ?? row.read ?? false),
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, Date.now()),
  };
}

function mapCloudSaleItem(row: any, saleCreatedAt: number) {
  return {
    id: row.id,
    saleId: Number(row.sale_id ?? row.saleId ?? 0),
    itemId: Number(row.item_id ?? row.itemId ?? 0),
    itemName: row.item_name || row.itemName || '',
    quantity: Number(row.quantity ?? 0),
    unitId: Number(row.unit_id ?? row.unitId ?? 0),
    unitShortForm: row.unit_short_form || row.unitShortForm || '',
    priceTierId: row.price_tier_id ?? row.priceTierId,
    priceTierQuantity: Number(row.price_tier_quantity ?? row.priceTierQuantity ?? 0),
    priceTierUnitId: Number(row.price_tier_unit_id ?? row.priceTierUnitId ?? 0),
    priceTierUnitShortForm: row.price_tier_unit_short_form || row.priceTierUnitShortForm || '',
    priceTierPrice: Number(row.price_tier_price ?? row.priceTierPrice ?? 0),
    packageCount: Number(row.package_count ?? row.packageCount ?? 0),
    stockQuantity: Number(row.stock_quantity ?? row.stockQuantity ?? 0),
    stockUnitId: Number(row.stock_unit_id ?? row.stockUnitId ?? 0),
    stockUnitShortForm: row.stock_unit_short_form || row.stockUnitShortForm || '',
    pricePerUnit: Number(row.price_per_unit ?? row.pricePerUnit ?? 0),
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    costPerUnit: Number(row.cost_per_unit ?? row.costPerUnit ?? 0),
    totalCost: Number(row.total_cost ?? row.totalCost ?? 0),
    profit: Number(row.profit ?? row.profit ?? 0),
    createdAt: normalizeTimestamp(row.created_at ?? row.createdAt, saleCreatedAt),
  };
}

function mapCloudSale(row: any) {
  const createdAt = normalizeTimestamp(row.created_at ?? row.createdAt, Date.now());
  const updatedAt = normalizeTimestamp(row.updated_at ?? row.updatedAt, createdAt);
  const items = Array.isArray(row.items)
    ? row.items.map((item: any) => mapCloudSaleItem(item, createdAt))
    : [];

  return {
    id: row.id,
    date: row.date || new Date(createdAt).toISOString().split('T')[0],
    timestamp: Number(row.timestamp ?? Date.now()),
    items,
    totalQuantityItems: Number(row.total_quantity_items ?? row.totalQuantityItems ?? items.length),
    subtotal: Number(row.subtotal ?? row.subtotal ?? 0),
    totalCost: Number(row.total_cost ?? row.totalCost ?? 0),
    totalProfit: Number(row.total_profit ?? row.totalProfit ?? 0),
    profitMarginPercent: Number(row.profit_margin_percent ?? row.profitMarginPercent ?? 0),
    paymentMethod: row.payment_method || row.paymentMethod || 'cash',
    notes: row.notes || row.notes || undefined,
    createdAt,
    updatedAt,
  };
}

async function mergeCloudTable(table: any, cloudRows: any[], mapper: (row: any) => any) {
  if (!Array.isArray(cloudRows) || cloudRows.length === 0) {
    return;
  }

  const normalizedRows = cloudRows.map(mapper);
  const localRows = await table.toArray();
  const localRowMap = new Map<number, any>();

  for (const localRow of localRows) {
    if (typeof localRow.id === 'number') {
      localRowMap.set(localRow.id, localRow);
    }
  }

  const rowsToWrite: any[] = [];

  for (const row of normalizedRows) {
    if (typeof row.id !== 'number') {
      continue;
    }

    const local = localRowMap.get(row.id);
    if (!local) {
      rowsToWrite.push(row);
      continue;
    }

    const remoteUpdated = normalizeTimestamp(row.updatedAt, 0);
    const localUpdated = normalizeTimestamp(local.updatedAt, 0);

    if (remoteUpdated > localUpdated) {
      rowsToWrite.push(row);
    }
  }

  if (rowsToWrite.length > 0) {
    await table.bulkPut(rowsToWrite);
  }
}

export async function fetchAllUserData(userId: string) {
  const [items, categories, units, priceTiers, batches, alerts, sales] = await Promise.all([
    fetchItemsFromSupabase(userId),
    safeFetchFromSupabase('categories', userId),
    safeFetchFromSupabase('units', userId),
    safeFetchFromSupabase('price_tiers', userId),
    safeFetchFromSupabase('batches', userId),
    safeFetchFromSupabase('alerts', userId),
    fetchSalesFromSupabase(userId),
  ]);

  return {
    items,
    categories,
    units,
    priceTiers,
    batches,
    alerts,
    sales,
  };
}

export async function mergeCloudDataToLocal(userId: string) {
  try {
    const { db } = await import('./db');
    const cloudData = await fetchAllUserData(userId);

    await db.transaction(
      'rw',
      [db.items, db.categories, db.units, db.priceTiers, db.batches, db.alerts, db.sales, db.saleItems],
      async () => {
        await mergeCloudTable(db.items, cloudData.items, mapCloudItem).catch((error) => {
          console.warn('[v0] Skipping items merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.categories, cloudData.categories, mapCloudCategory).catch((error) => {
          console.warn('[v0] Skipping categories merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.units, cloudData.units, mapCloudUnit).catch((error) => {
          console.warn('[v0] Skipping units merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.priceTiers, cloudData.priceTiers, mapCloudPriceTier).catch((error) => {
          console.warn('[v0] Skipping price tiers merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.batches, cloudData.batches, mapCloudBatch).catch((error) => {
          console.warn('[v0] Skipping batches merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.alerts, cloudData.alerts, mapCloudAlert).catch((error) => {
          console.warn('[v0] Skipping alerts merge due to error:', formatSupabaseError(error));
        });
        await mergeCloudTable(db.sales, cloudData.sales, mapCloudSale).catch((error) => {
          console.warn('[v0] Skipping sales merge due to error:', formatSupabaseError(error));
        });

        const existingSaleItems = await db.saleItems.toArray();
        const existingSaleItemSet = new Set(
          existingSaleItems.map((item) => `${item.saleId}:${item.itemId}:${item.quantity}:${item.pricePerUnit}`),
        );

        const saleItemsToAdd: any[] = [];
        for (const sale of cloudData.sales) {
          const localSale = await db.sales.get(sale.id);
          if (!localSale || !Array.isArray(localSale.items)) {
            continue;
          }

          for (const item of localSale.items) {
            const key = `${item.saleId}:${item.itemId}:${item.quantity}:${item.pricePerUnit}`;
            if (!existingSaleItemSet.has(key)) {
              saleItemsToAdd.push({
                ...item,
                saleId: localSale.id as number,
                createdAt: normalizeTimestamp(item.createdAt, localSale.createdAt || Date.now()),
              });
              existingSaleItemSet.add(key);
            }
          }
        }

        if (saleItemsToAdd.length > 0) {
          await db.saleItems.bulkAdd(saleItemsToAdd).catch((error) => {
            console.warn('[v0] Skipping sale item merge due to error:', formatSupabaseError(error));
          });
        }
      },
    );

    console.log('[v0] Loaded cloud data into local database for user:', userId);
  } catch (error) {
    console.error('[v0] Failed to merge cloud data to local DB:', error);
    throw error;
  }
}

export async function syncUserData(userId: string) {
  if (!userId) {
    throw new Error('User ID is required to synchronize data');
  }

  try {
    await mergeCloudDataToLocal(userId);
    await syncToSupabase(userId);
  } catch (error) {
    console.warn('[v0] Full user sync error:', error);
    throw error;
  }
}
