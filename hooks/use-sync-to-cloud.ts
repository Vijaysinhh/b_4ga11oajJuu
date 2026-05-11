'use client';

import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import {
  fetchItemsFromSupabase,
  fetchSalesFromSupabase,
  saveItemToSupabase,
  saveSaleToSupabase,
  syncUserData,
} from '@/lib/supabase-sync';

export function useSyncToCloud() {
  const { session } = useSupabaseAuth();
  const userId = session?.user.id;

  const syncItemToCloud = async (item: any) => {
    if (!userId) return item;

    try {
      const result = await saveItemToSupabase(userId, item);
      console.log('[v0] Item synced to Supabase:', result?.id || item.id);
      return result || item;
    } catch (error) {
      console.warn('[v0] Failed to sync item to cloud:', error);
      return item;
    }
  };

  const syncSaleToCloud = async (sale: any) => {
    if (!userId) return sale;

    try {
      const result = await saveSaleToSupabase(userId, sale);
      console.log('[v0] Sale synced to Supabase:', result?.id || sale.id);
      return result || sale;
    } catch (error) {
      console.warn('[v0] Failed to sync sale to cloud:', error);
      return sale;
    }
  };

  const loadItemsFromCloud = async () => {
    if (!userId) return [];

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
    if (!userId) return [];

    try {
      const sales = await fetchSalesFromSupabase(userId);
      console.log('[v0] Loaded sales from Supabase:', sales.length);
      return sales;
    } catch (error) {
      console.warn('[v0] Failed to load sales from cloud:', error);
      return [];
    }
  };

  const refreshCloudData = async () => {
    if (!userId) return;

    try {
      await syncUserData(userId);
      console.log('[v0] Refreshed cloud data for user:', userId);
    } catch (error) {
      console.warn('[v0] Failed to refresh cloud data:', error);
    }
  };

  return {
    syncItemToCloud,
    syncSaleToCloud,
    loadItemsFromCloud,
    loadSalesFromCloud,
    refreshCloudData,
  };
}
