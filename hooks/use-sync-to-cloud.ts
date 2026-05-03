'use client';

import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { saveItemToSupabase, saveSaleToSupabase, fetchItemsFromSupabase, fetchSalesFromSupabase, DEMO_USER_ID } from '@/lib/supabase-sync';

/**
 * Hook to sync Dexie data with Supabase for multi-device support
 * When user is authenticated, all items and sales are also saved to Supabase
 * This allows data to sync across devices for the same account
 */
export function useSyncToCloud() {
  const { user } = useSupabaseAuth();
  const userId = user?.id || DEMO_USER_ID;

  const syncItemToCloud = async (item: any) => {
    if (!user) return item; // Don't sync if not logged in
    
    try {
      const result = await saveItemToSupabase(userId, item);
      if (result?.id) {
        console.log('[v0] Item synced to Supabase:', result.id);
      }
      return result || item;
    } catch (error) {
      console.warn('[v0] Failed to sync item to cloud:', error);
      return item; // Fallback to local item
    }
  };

  const syncSaleToCloud = async (sale: any) => {
    if (!user) return sale;
    
    try {
      const result = await saveSaleToSupabase(userId, sale);
      if (result?.id) {
        console.log('[v0] Sale synced to Supabase:', result.id);
      }
      return result || sale;
    } catch (error) {
      console.warn('[v0] Failed to sync sale to cloud:', error);
      return sale;
    }
  };

  const loadItemsFromCloud = async () => {
    if (!user) return [];
    
    try {
      const items = await fetchItemsFromSupabase(userId);
      console.log('[v0] Loaded items from Supabase:', items.length);
      return items;
    } catch (error) {
      console.warn('[v0] Failed to load items from cloud:', error);
      return [];
    }
  };

  const loadSalesFromCloud = async () => {
    if (!user) return [];
    
    try {
      const sales = await fetchSalesFromSupabase(userId);
      console.log('[v0] Loaded sales from Supabase:', sales.length);
      return sales;
    } catch (error) {
      console.warn('[v0] Failed to load sales from cloud:', error);
      return [];
    }
  };

  return {
    syncItemToCloud,
    syncSaleToCloud,
    loadItemsFromCloud,
    loadSalesFromCloud,
  };
}
