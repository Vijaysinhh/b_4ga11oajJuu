"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/db-supabase-types";
import { dateKey } from "@/lib/utils";
import {
  createOfflineId,
  executeWithOfflineDelete,
  executeWithOfflineUpsert,
  isBrowserOnline,
  readCachedCollection,
  upsertCachedRow,
  writeCachedCollection,
} from "@/lib/offline-sync";

// Types
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Unit = Database["public"]["Tables"]["units"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"];

function getStoredShopId() {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem("dukan-current-shop-id");
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveShopId(shopId?: number) {
  return shopId ?? getStoredShopId();
}

// Helper to map Supabase types to old types with camelCase
const mapCategory = (row: Partial<Category> | Record<string, unknown>) => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  nameMarathi: row.name_marathi || "",
  color: row.color || "#3b82f6",
  createdAt: new Date(row.created_at as string | number | Date).getTime(),
  updatedAt: new Date(row.updated_at as string | number | Date).getTime(),
});

const mapUnit = (row: Partial<Unit> | Record<string, unknown>) => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  nameMarathi: row.name_marathi || "",
  shortForm: row.short_form,
  createdAt: new Date(row.created_at as string | number | Date).getTime(),
  updatedAt: new Date(row.updated_at as string | number | Date).getTime(),
});

const mapItem = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  nameMarathi: row.name_marathi || "",
  brand: row.brand || "",
  brandMarathi: row.brand_marathi || "",
  categoryId: row.category_id,
  unitId: row.unit_id,
  quantity: row.quantity,
  expiryDate: row.expiry_date ?? null,
  buyPrice: row.buy_price,
  sellPrice: row.sell_price,
  marginAmount: row.margin_amount,
  marginPercent: row.margin_percent,
  lowStockLimit: row.low_stock_limit,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export function useCategories(shopId?: number) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadCategories = useCallback(async () => {
    if (!resolvedShopId) return;

    const cached = await readCachedCollection(resolvedShopId, "categories");
    if (cached.length > 0) {
      setCategories(cached.map(mapCategory));
      setIsLoading(false);
    }

    if (!isBrowserOnline()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("id");
      if (error) throw error;

      if (data) {
        await writeCachedCollection(resolvedShopId, "categories", data);
        setCategories(data.map(mapCategory));
      }
    } catch (error) {
      const fallback = await readCachedCollection(resolvedShopId, "categories");
      if (fallback.length > 0) {
        setCategories(fallback.map(mapCategory));
      }
    } finally {
      setIsLoading(false);
    }
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    void loadCategories();

    const handleConnectionChange = () => {
      void loadCategories();
    };

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, [loadCategories]);

  const addCategory = async (category: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    const now = new Date().toISOString();
    const { data } = await (supabase as any)
      .from("categories")
      .insert({
        shop_id: effectiveShopId,
        name: category.name,
        name_marathi: category.nameMarathi || null,
        color: category.color || null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (data) {
      setCategories((prev) => [...prev, mapCategory(data)]);
    }
    return (data as any)?.id;
  };

  const updateCategory = async (id: number, updates: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    const now = new Date().toISOString();
    const { data } = await (supabase as any)
      .from("categories")
      .update({
        name: updates.name,
        name_marathi: updates.nameMarathi || null,
        color: updates.color || null,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (data) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? mapCategory(data) : c)),
      );
    }
  };

  const deleteCategory = async (id: number) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    await (supabase as any).from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useUnits(shopId?: number) {
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadUnits = useCallback(async () => {
    if (!resolvedShopId) return;

    const cached = await readCachedCollection(resolvedShopId, "units");
    if (cached.length > 0) {
      setUnits(cached.map(mapUnit));
      setIsLoading(false);
    }

    if (!isBrowserOnline()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("units")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("id");
      if (error) throw error;

      if (data) {
        await writeCachedCollection(resolvedShopId, "units", data);
        setUnits(data.map(mapUnit));
      }
    } catch (error) {
      const fallback = await readCachedCollection(resolvedShopId, "units");
      if (fallback.length > 0) {
        setUnits(fallback.map(mapUnit));
      }
    } finally {
      setIsLoading(false);
    }
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    void loadUnits();

    const handleConnectionChange = () => {
      void loadUnits();
    };

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, [loadUnits]);

  const addUnit = async (unit: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    const now = new Date().toISOString();
    const { data } = await (supabase as any)
      .from("units")
      .insert({
        shop_id: effectiveShopId,
        name: unit.name,
        name_marathi: unit.nameMarathi || null,
        short_form: unit.shortForm,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (data) {
      setUnits((prev) => [...prev, mapUnit(data)]);
    }
    return (data as any)?.id;
  };

  const updateUnit = async (id: number, updates: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    const now = new Date().toISOString();
    const { data } = await (supabase as any)
      .from("units")
      .update({
        name: updates.name,
        name_marathi: updates.nameMarathi || null,
        short_form: updates.shortForm,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (data) {
      setUnits((prev) => prev.map((u) => (u.id === id ? mapUnit(data) : u)));
    }
  };

  const deleteUnit = async (id: number) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) return;
    await (supabase as any).from("units").delete().eq("id", id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  return {
    units,
    isLoading,
    addUnit,
    updateUnit,
    deleteUnit,
  };
}

export function useItems(shopId?: number) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadItems = useCallback(async () => {
    if (!resolvedShopId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const cached = await readCachedCollection(resolvedShopId, "items");
    if (cached.length > 0) {
      setItems(cached.map(mapItem));
      setIsLoading(false);
    }

    if (!isBrowserOnline()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("items")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("id");
      if (error) throw error;
      await writeCachedCollection(resolvedShopId, "items", data || []);
      setItems(data ? data.map(mapItem) : []);
    } catch (error) {
      const fallback = await readCachedCollection(resolvedShopId, "items");
      if (fallback.length > 0) {
        setItems(fallback.map(mapItem));
      }
    } finally {
      setIsLoading(false);
    }
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    void loadItems();

    const handleRefresh = () => loadItems();
    const handleConnectionChange = () => {
      void loadItems();
    };

    window.addEventListener("refresh-dukan-data", handleRefresh);
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("refresh-dukan-data", handleRefresh);
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, [loadItems]);

  const refreshItems = loadItems;

  const calculateMargins = (buyPrice: number, sellPrice: number) => {
    const marginAmount = sellPrice - buyPrice;
    const marginPercent = buyPrice > 0 ? (marginAmount / buyPrice) * 100 : 0;
    return { marginAmount, marginPercent };
  };

  const addItem = async (item: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) {
      throw new Error("Shop not selected");
    }
    const now = new Date().toISOString();
    const { marginAmount, marginPercent } = calculateMargins(
      item.buyPrice,
      item.sellPrice,
    );
    const offlineRow = {
      id: createOfflineId(),
      shop_id: effectiveShopId,
      name: item.name,
      name_marathi: item.nameMarathi || null,
      brand: item.brand || null,
      brand_marathi: item.brandMarathi || null,
      category_id: item.categoryId || null,
      unit_id: item.unitId || null,
      quantity: item.quantity,
      expiry_date: item.expiryDate || null,
      buy_price: item.buyPrice,
      sell_price: item.sellPrice,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
      low_stock_limit: item.lowStockLimit,
      created_at: now,
      updated_at: now,
    };
    const { data } = await executeWithOfflineUpsert({
      shopId: effectiveShopId,
      table: "items",
      row: offlineRow,
      request: async () => {
        const { id: _localId, ...insertRow } = offlineRow;
        const { data: savedItem, error } = await (supabase as any)
          .from("items")
          .insert(insertRow)
          .select("*")
          .single();
        if (error) throw error;
        return savedItem;
      },
    });
    const savedItem = data || offlineRow;
    setItems((prev) => [
      ...prev.filter((existing) => existing.id !== savedItem.id),
      mapItem(savedItem),
    ]);
    window.dispatchEvent(new Event("refresh-dukan-data"));
    return Number(savedItem.id);
  };

  const updateItem = async (id: number, updates: any) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) {
      throw new Error("Shop not selected");
    }
    const now = new Date().toISOString();
    const existingItem = items.find((i) => i.id === id);
    let updateData: any = {
      ...updates,
      updated_at: now,
    };

    if (updates.buyPrice !== undefined || updates.sellPrice !== undefined) {
      const buyPrice = updates.buyPrice ?? existingItem?.buyPrice;
      const sellPrice = updates.sellPrice ?? existingItem?.sellPrice;
      const { marginAmount, marginPercent } = calculateMargins(
        buyPrice,
        sellPrice,
      );
      updateData.margin_amount = marginAmount;
      updateData.margin_percent = marginPercent;
    }

    // Convert camelCase to snake_case for Supabase
    const row = {
      id,
      shop_id: effectiveShopId,
      name: updateData.name ?? existingItem?.name ?? null,
      name_marathi: updateData.nameMarathi ?? existingItem?.nameMarathi ?? null,
      brand: updateData.brand ?? existingItem?.brand ?? null,
      brand_marathi:
        updateData.brandMarathi ?? existingItem?.brandMarathi ?? null,
      category_id: updateData.categoryId ?? existingItem?.categoryId ?? null,
      unit_id: updateData.unitId ?? existingItem?.unitId ?? null,
      quantity: updateData.quantity ?? existingItem?.quantity ?? 0,
      expiry_date: updateData.expiryDate ?? existingItem?.expiryDate ?? null,
      buy_price: updateData.buyPrice ?? existingItem?.buyPrice ?? 0,
      sell_price: updateData.sellPrice ?? existingItem?.sellPrice ?? 0,
      margin_amount:
        updateData.margin_amount ?? existingItem?.marginAmount ?? 0,
      margin_percent:
        updateData.margin_percent ?? existingItem?.marginPercent ?? 0,
      low_stock_limit:
        updateData.lowStockLimit ?? existingItem?.lowStockLimit ?? 0,
      created_at: existingItem?.createdAt
        ? new Date(existingItem.createdAt).toISOString()
        : now,
      updated_at: now,
    };
    const { data } = await executeWithOfflineUpsert({
      shopId: effectiveShopId,
      table: "items",
      row,
      request: async () => {
        const { data: savedItem, error } = await (supabase as any)
          .from("items")
          .upsert(row, { onConflict: "id" })
          .select("*")
          .single();
        if (error) throw error;
        return savedItem;
      },
    });
    setItems((prev) =>
      prev.map((current) =>
        current.id === id ? mapItem(data || row) : current,
      ),
    );
    window.dispatchEvent(new Event("refresh-dukan-data"));
  };

  const deleteItem = async (id: number) => {
    const effectiveShopId = resolveShopId(shopId);
    if (!effectiveShopId) {
      throw new Error("Shop not selected");
    }
    await executeWithOfflineDelete({
      shopId: effectiveShopId,
      table: "items",
      id,
      request: async () => {
        const { error } = await (supabase as any)
          .from("items")
          .delete()
          .eq("id", id);
        if (error) throw error;
      },
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
    window.dispatchEvent(new Event("refresh-dukan-data"));
  };

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    refresh: refreshItems,
  };
}

// --- Price Tiers ---
const mapPriceTier = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  itemId: row.item_id,
  quantity: row.quantity,
  unitId: row.unit_id,
  price: row.price,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export function usePriceTiers(shopId?: number) {
  const [priceTiers, setPriceTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadPriceTiers = useCallback(async () => {
    if (!resolvedShopId) return;
    if (!isBrowserOnline()) {
      const cached = await readCachedCollection(resolvedShopId, "price_tiers");
      setPriceTiers(cached.map(mapPriceTier));
      setIsLoading(false);
      return;
    }

    const { data, error } = await (supabase as any)
      .from("price_tiers")
      .select("*")
      .eq("shop_id", resolvedShopId);
    if (data) {
      await writeCachedCollection(resolvedShopId, "price_tiers", data);
      setPriceTiers(data.map(mapPriceTier));
    } else if (error) {
      const cached = await readCachedCollection(resolvedShopId, "price_tiers");
      setPriceTiers(cached.map(mapPriceTier));
    }
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadPriceTiers();
  }, [loadPriceTiers]);

  const addPriceTier = useCallback(
    async (tierData: any) => {
      const effectiveShopId = resolvedShopId;
      if (!effectiveShopId) return null;
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("price_tiers")
        .insert({
          shop_id: effectiveShopId,
          item_id: tierData.itemId,
          quantity: tierData.quantity,
          unit_id: tierData.unitId,
          price: tierData.price,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[Supabase] Error adding price tier:", error);
        throw error;
      }

      if (data) {
        const newTier = mapPriceTier(data);
        setPriceTiers((prev) => [...prev, newTier]);
        return newTier.id;
      }
      return null;
    },
    [shopId, supabase],
  );

  const deletePriceTier = useCallback(
    async (tierId: number) => {
      const effectiveShopId = resolvedShopId;
      if (!effectiveShopId) return;
      const { error } = await (supabase as any)
        .from("price_tiers")
        .delete()
        .eq("id", tierId)
        .eq("shop_id", effectiveShopId);

      if (error) {
        console.error("[Supabase] Error deleting price tier:", error);
        throw error;
      }

      setPriceTiers((prev) => prev.filter((tier) => tier.id !== tierId));
    },
    [resolvedShopId, supabase],
  );

  return { priceTiers, isLoading, addPriceTier, deletePriceTier };
}

// --- Sales & Sale Items ---
const mapSale = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  date: row.date,
  timestamp: new Date(row.timestamp).getTime(),
  totalQuantityItems: row.total_quantity_items,
  subtotal: row.subtotal,
  totalCost: row.total_cost,
  totalProfit: row.total_profit,
  profitMarginPercent: row.profit_margin_percent,
  paymentMethod: row.payment_method === "udhari" ? "udhar" : row.payment_method,
  creditCustomerId: row.credit_customer_id,
  creditCustomerName: row.credit_customer_name,
  notes: row.notes,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const mapSaleItem = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  saleId: row.sale_id,
  itemId: row.item_id,
  itemName: row.item_name,
  quantity: Number(row.quantity),
  displayQuantity: row.display_quantity ?? undefined,
  unitId: row.unit_id,
  unitShortForm: row.unit_short_form,
  priceTierId: row.price_tier_id ?? undefined,
  packCount: row.pack_count != null ? Number(row.pack_count) : undefined,
  priceTierQuantity:
    row.price_tier_quantity != null
      ? Number(row.price_tier_quantity)
      : undefined,
  priceTierUnitShortForm: row.price_tier_unit_short_form ?? undefined,
  pricePerUnit: row.price_per_unit,
  totalPrice: row.total_price,
  costPerUnit: row.cost_per_unit,
  totalCost: row.total_cost,
  profit: row.profit,
  createdAt: new Date(row.created_at).getTime(),
});

export function useSales(shopId?: number) {
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadSales = useCallback(async () => {
    if (!resolvedShopId) return;
    if (!isBrowserOnline()) {
      const [cachedSales, cachedSaleItems] = await Promise.all([
        readCachedCollection(resolvedShopId, "sales"),
        readCachedCollection(resolvedShopId, "sale_items"),
      ]);
      setSales(cachedSales.map(mapSale));
      setSaleItems(cachedSaleItems.map(mapSaleItem));
      setIsLoading(false);
      return;
    }

    const [
      { data: salesData, error: salesError },
      { data: itemsData, error: itemsError },
    ] = await Promise.all([
      (supabase as any)
        .from("sales")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("timestamp", { ascending: false }),
      (supabase as any)
        .from("sale_items")
        .select("*")
        .eq("shop_id", resolvedShopId),
    ]);
    const cachedSales =
      salesData || (await readCachedCollection(resolvedShopId, "sales"));
    const cachedSaleItems =
      itemsData || (await readCachedCollection(resolvedShopId, "sale_items"));
    if (salesData)
      await writeCachedCollection(resolvedShopId, "sales", salesData);
    if (itemsData)
      await writeCachedCollection(resolvedShopId, "sale_items", itemsData);
    if (salesError)
      console.warn("[Supabase] Using cached sales:", salesError.message);
    if (itemsError)
      console.warn("[Supabase] Using cached sale items:", itemsError.message);
    setSales(cachedSales.map(mapSale));
    setSaleItems(cachedSaleItems.map(mapSaleItem));
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadSales();

    const handleRefresh = () => loadSales();
    window.addEventListener("refresh-dukan-data", handleRefresh);
    return () =>
      window.removeEventListener("refresh-dukan-data", handleRefresh);
  }, [loadSales]);

  // Now we need to map the old format (with `items` as a property) – let's make a combined format:
  const salesWithItems = useMemo(() => {
    return sales.map((sale) => {
      const items = saleItems.filter((item) => item.saleId === sale.id);
      return { ...sale, items };
    });
  }, [sales, saleItems]);

  const createSale = useCallback(
    async (saleData: any) => {
      const effectiveShopId = resolveShopId(shopId);
      if (!effectiveShopId) return null;
      const now = new Date().toISOString();
      const saleTimestamp =
        typeof saleData.timestamp === "number"
          ? new Date(saleData.timestamp).toISOString()
          : saleData.timestamp || now;
      const paymentMethod =
        saleData.paymentMethod === "udhar" ? "udhari" : saleData.paymentMethod;
      const saleRow = {
        id: createOfflineId(),
        shop_id: effectiveShopId,
        date: saleData.date,
        timestamp: saleTimestamp,
        total_quantity_items: saleData.totalQuantityItems,
        subtotal: saleData.subtotal,
        total_cost: saleData.totalCost,
        total_profit: saleData.totalProfit,
        profit_margin_percent: saleData.profitMarginPercent,
        payment_method: paymentMethod,
        credit_customer_id: saleData.creditCustomerId || null,
        credit_customer_name: saleData.creditCustomerName || null,
        notes: saleData.notes || null,
        created_at: now,
        updated_at: now,
      };
      const { data } = await executeWithOfflineUpsert({
        shopId: effectiveShopId,
        table: "sales",
        row: saleRow,
        request: async () => {
          const { id: _localId, ...insertRow } = saleRow;
          const { data: savedSale, error } = await (supabase as any)
            .from("sales")
            .insert(insertRow)
            .select("*")
            .single();
          if (error) throw error;
          return savedSale;
        },
      });
      const savedSale = data || saleRow;

      const saleItemRows = (saleData.items || []).map((item: any) => ({
        id: createOfflineId(),
        shop_id: effectiveShopId,
        sale_id: savedSale.id,
        item_id: item.itemId ?? null,
        item_name: item.itemName,
        quantity: Number(item.quantity),
        display_quantity: item.displayQuantity ?? null,
        unit_id: item.unitId ?? null,
        unit_short_form: item.unitShortForm ?? null,
        price_tier_id: item.priceTierId ?? null,
        pack_count: item.packCount != null ? Number(item.packCount) : null,
        price_tier_quantity:
          item.priceTierQuantity != null
            ? Number(item.priceTierQuantity)
            : null,
        price_tier_unit_short_form: item.priceTierUnitShortForm ?? null,
        price_per_unit: Number(item.pricePerUnit),
        total_price: Number(item.totalPrice),
        cost_per_unit: Number(item.costPerUnit),
        total_cost: Number(item.totalCost),
        profit: item.profit ?? Number(item.totalPrice) - Number(item.totalCost),
        created_at: now,
      }));

      for (const row of saleItemRows) {
        await executeWithOfflineUpsert({
          shopId: effectiveShopId,
          table: "sale_items",
          row,
          request: async () => {
            const { id: _localId, ...insertRow } = row;
            const { data: savedSaleItem, error } = await (supabase as any)
              .from("sale_items")
              .insert(insertRow)
              .select("*")
              .single();
            if (error) throw error;
            return savedSaleItem;
          },
        });
      }

      if (paymentMethod === "udhari" && saleData.creditCustomerId) {
        const cachedCustomers = await readCachedCollection(
          effectiveShopId,
          "credit_customers",
        );
        let customer = cachedCustomers.find(
          (entry) => Number(entry.id) === Number(saleData.creditCustomerId),
        );
        if (!customer && isBrowserOnline()) {
          const { data: fetchedCustomer } = await (supabase as any)
            .from("credit_customers")
            .select("*")
            .eq("id", saleData.creditCustomerId)
            .single();
          customer = fetchedCustomer || undefined;
        }

        if (customer) {
          const updatedCustomer = {
            ...customer,
            balance: Math.max(
              Number(customer.balance || 0) + Number(saleData.subtotal || 0),
              0,
            ),
            updated_at: now,
          };
          await executeWithOfflineUpsert({
            shopId: effectiveShopId,
            table: "credit_customers",
            row: updatedCustomer,
            request: async () => {
              const { data: savedCustomer, error } = await (supabase as any)
                .from("credit_customers")
                .upsert(updatedCustomer, { onConflict: "id" })
                .select("*")
                .single();
              if (error) throw error;
              return savedCustomer;
            },
          });
        }

        const entryRow = {
          id: createOfflineId(),
          shop_id: effectiveShopId,
          customer_id: saleData.creditCustomerId,
          customer_name: saleData.creditCustomerName || "",
          type: "credit",
          amount: saleData.subtotal,
          sale_id: savedSale.id,
          bill_items:
            saleData.items?.map((item: any) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              displayQuantity: item.displayQuantity,
              unitShortForm: item.unitShortForm,
              pricePerUnit: item.pricePerUnit,
              totalPrice: item.totalPrice,
            })) || null,
          date: saleData.date,
          timestamp: saleTimestamp,
          created_at: now,
        };
        await executeWithOfflineUpsert({
          shopId: effectiveShopId,
          table: "credit_entries",
          row: entryRow,
          request: async () => {
            const { id: _localId, ...insertRow } = entryRow;
            const { data: savedEntry, error } = await (supabase as any)
              .from("credit_entries")
              .insert(insertRow)
              .select("*")
              .single();
            if (error) throw error;
            return savedEntry;
          },
        });
      }

      setSales((prev) => [
        mapSale(savedSale),
        ...prev.filter((sale) => sale.id !== savedSale.id),
      ]);
      setSaleItems((prev) => [
        ...saleItemRows.map(mapSaleItem),
        ...prev.filter((saleItem) => saleItem.saleId !== savedSale.id),
      ]);
      window.dispatchEvent(new Event("refresh-dukan-data"));
      return Number(savedSale.id);
    },
    [shopId, loadSales, supabase],
  );

  const updateStockAfterSale = useCallback(
    async (saleItems: any[]) => {
      const effectiveShopId = resolveShopId(shopId);
      if (!effectiveShopId) return;

      let currentItems: any[] = [];
      if (isBrowserOnline()) {
        const { data } = await (supabase as any)
          .from("items")
          .select("*")
          .eq("shop_id", effectiveShopId);
        currentItems =
          data || (await readCachedCollection(effectiveShopId, "items"));
      } else {
        currentItems = await readCachedCollection(effectiveShopId, "items");
      }

      if (!currentItems) return;

      // Calculate quantity changes per item
      const quantityChanges = new Map<number, number>();
      for (const saleItem of saleItems) {
        const current = quantityChanges.get(saleItem.itemId) || 0;
        quantityChanges.set(saleItem.itemId, current + saleItem.quantity);
      }

      for (const [itemId, qtyToSubtract] of quantityChanges) {
        const currentItem = (currentItems as any[]).find(
          (i: any) => i.id === itemId,
        );
        if (!currentItem) continue;

        const expectedQty = Number(currentItem.quantity.toFixed(4));
        const newQty = Number((expectedQty - qtyToSubtract).toFixed(4));
        const updatedItem = {
          ...currentItem,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        };
        await executeWithOfflineUpsert({
          shopId: effectiveShopId,
          table: "items",
          row: updatedItem,
          request: async () => {
            const { data, error } = await (supabase as any)
              .from("items")
              .update({
                quantity: newQty,
                updated_at: updatedItem.updated_at,
              })
              .eq("id", itemId)
              .eq("quantity", expectedQty)
              .select("*")
              .single();
            if (error || !data) {
              throw new Error(
                "Inventory update failed due to concurrent changes or insufficient stock. Please try again.",
              );
            }
            return data;
          },
        });
      }

      // Create stock history entries with correct cumulative changes
      const historyEntries: any[] = [];
      const cumulativeChanges = new Map<number, number>();

      for (const saleItem of saleItems) {
        const currentItem = (currentItems as any[]).find(
          (i: any) => i.id === saleItem.itemId,
        );
        if (!currentItem) continue;

        const qty = Number(saleItem.quantity.toFixed(4));
        const prevChange = cumulativeChanges.get(saleItem.itemId) || 0;
        const beforeQty = Number(
          (currentItem.quantity - prevChange).toFixed(4),
        );
        const afterQty = Number((beforeQty - qty).toFixed(4));
        cumulativeChanges.set(saleItem.itemId, prevChange + qty);

        historyEntries.push({
          id: createOfflineId(),
          shop_id: effectiveShopId,
          item_id: saleItem.itemId,
          item_name: saleItem.itemName,
          type: "sale",
          quantity_changed: -qty,
          quantity_before: beforeQty,
          quantity_after: afterQty,
          cost_per_unit: saleItem.costPerUnit,
          created_at: new Date().toISOString(),
        });
      }

      if (historyEntries.length > 0) {
        for (const row of historyEntries) {
          await executeWithOfflineUpsert({
            shopId: effectiveShopId,
            table: "stock_history",
            row,
            request: async () => {
              const { id: _localId, ...insertRow } = row;
              const { data, error } = await (supabase as any)
                .from("stock_history")
                .insert(insertRow)
                .select("*")
                .single();
              if (error) throw error;
              return data;
            },
          });
        }
      }
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [shopId, supabase],
  );

  const getDailySummary = useCallback(
    async (dateKey: string) => {
      const effectiveShopId = resolveShopId(shopId);
      if (!effectiveShopId) return null;
      const dailySales = salesWithItems.filter((s) => s.date === dateKey);
      const totalRevenue = dailySales.reduce((sum, s) => sum + s.subtotal, 0);
      const totalCost = dailySales.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMarginPercent =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        totalSales: dailySales.length,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMarginPercent,
        sales: dailySales,
      };
    },
    [salesWithItems, shopId],
  );

  const updateSale = useCallback(
    async (saleId: number, updatedSaleData: any) => {
      const effectiveShopId = resolveShopId(shopId);
      if (!effectiveShopId) return;

      // First get the original sale and items
      const { data: originalSale } = await (supabase as any)
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();
      if (!originalSale) return;

      const { data: originalItems } = await (supabase as any)
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId);

      // Step 1: Restore original stock first (atomically)
      if (originalItems && originalItems.length > 0) {
        const { data: currentItems } = await (supabase as any)
          .from("items")
          .select("*")
          .in("id", originalItems.map((i: any) => i.item_id).filter(Boolean));
        if (currentItems) {
          const quantityChanges = new Map<number, number>();
          for (const item of originalItems) {
            if (!item.item_id) continue;
            quantityChanges.set(
              item.item_id,
              (quantityChanges.get(item.item_id) || 0) + item.quantity,
            );
          }
          const historyEntries: any[] = [];
          const cumulativeChanges = new Map<number, number>();

          // First, restore stock with optimistic locking
          for (const [itemId, qtyToAdd] of quantityChanges) {
            const currentItem = currentItems.find((i: any) => i.id === itemId);
            if (currentItem) {
              const expectedQty = Number(currentItem.quantity.toFixed(4));
              const newQty = Number((expectedQty + qtyToAdd).toFixed(4));

              await (supabase as any)
                .from("items")
                .update({
                  quantity: newQty,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", itemId)
                .eq("quantity", expectedQty);
            }
          }

          // Then create history entries with correct cumulative tracking
          for (const item of originalItems) {
            if (!item.item_id) continue;
            const currentItem = currentItems.find(
              (i: any) => i.id === item.item_id,
            );
            if (!currentItem) continue;

            const qty = Number(item.quantity.toFixed(4));
            const prevChange = cumulativeChanges.get(item.item_id) || 0;
            const beforeQty = Number(
              (currentItem.quantity + prevChange).toFixed(4),
            );
            const afterQty = Number((beforeQty + qty).toFixed(4));
            cumulativeChanges.set(item.item_id, prevChange + qty);

            historyEntries.push({
              shop_id: effectiveShopId,
              item_id: item.item_id,
              item_name: currentItem.name,
              type: "adjustment",
              quantity_changed: qty,
              quantity_before: beforeQty,
              quantity_after: afterQty,
              reason: `Restoring original stock from sale #${saleId}`,
              cost_per_unit: item.cost_per_unit,
              created_at: new Date().toISOString(),
            });
          }

          if (historyEntries.length > 0) {
            await (supabase as any)
              .from("stock_history")
              .insert(historyEntries);
          }
        }
      }

      // Step 2: Update the sale in Supabase
      const now = new Date().toISOString();
      const paymentMethod =
        updatedSaleData.paymentMethod === "udhar"
          ? "udhari"
          : updatedSaleData.paymentMethod;
      const saleTimestamp =
        typeof updatedSaleData.timestamp === "number"
          ? new Date(updatedSaleData.timestamp).toISOString()
          : updatedSaleData.timestamp || now;

      const { data: updatedSale } = await (supabase as any)
        .from("sales")
        .update({
          date: updatedSaleData.date,
          timestamp: saleTimestamp,
          total_quantity_items: updatedSaleData.totalQuantityItems,
          subtotal: updatedSaleData.subtotal,
          total_cost: updatedSaleData.totalCost,
          total_profit: updatedSaleData.totalProfit,
          profit_margin_percent: updatedSaleData.profitMarginPercent,
          payment_method: paymentMethod,
          credit_customer_id: updatedSaleData.creditCustomerId,
          credit_customer_name: updatedSaleData.creditCustomerName,
          notes: updatedSaleData.notes,
          updated_at: now,
        })
        .eq("id", saleId)
        .select("*")
        .single();

      // Step 3: Delete old sale items and insert new ones
      await (supabase as any).from("sale_items").delete().eq("sale_id", saleId);
      if (updatedSaleData.items && updatedSaleData.items.length > 0) {
        const newItems = updatedSaleData.items.map((item: any) => {
          const calculatedProfit =
            item.profit ?? Number(item.totalPrice) - Number(item.totalCost);
          return {
            shop_id: effectiveShopId,
            sale_id: saleId,
            item_id: item.itemId ?? null,
            item_name: item.itemName,
            quantity: Number(item.quantity),
            display_quantity: item.displayQuantity ?? null,
            unit_id: item.unitId ?? null,
            unit_short_form: item.unitShortForm ?? null,
            price_tier_id: item.priceTierId ?? null,
            pack_count: item.packCount != null ? Number(item.packCount) : null,
            price_tier_quantity:
              item.priceTierQuantity != null
                ? Number(item.priceTierQuantity)
                : null,
            price_tier_unit_short_form: item.priceTierUnitShortForm ?? null,
            price_per_unit: Number(item.pricePerUnit),
            total_price: Number(item.totalPrice),
            cost_per_unit: Number(item.costPerUnit),
            total_cost: Number(item.totalCost),
            profit: calculatedProfit,
            created_at: now,
          };
        });
        await (supabase as any).from("sale_items").insert(newItems);
      }

      // Step 4: Apply new stock changes (atomically)
      if (updatedSaleData.items && updatedSaleData.items.length > 0) {
        const { data: currentItems2 } = await (supabase as any)
          .from("items")
          .select("*")
          .eq("shop_id", effectiveShopId);
        if (currentItems2) {
          const quantityChanges2 = new Map<number, number>();
          for (const item of updatedSaleData.items) {
            quantityChanges2.set(
              item.itemId,
              (quantityChanges2.get(item.itemId) || 0) + item.quantity,
            );
          }

          // First, update stock with optimistic locking
          for (const [itemId, qtyToSubtract] of quantityChanges2) {
            const currentItem = (currentItems2 as any[]).find(
              (i) => i.id === itemId,
            );
            if (!currentItem) continue;

            const expectedQty = Number(currentItem.quantity.toFixed(4));
            const newQty = Number((expectedQty - qtyToSubtract).toFixed(4));

            await (supabase as any)
              .from("items")
              .update({
                quantity: newQty,
                updated_at: new Date().toISOString(),
              })
              .eq("id", itemId)
              .eq("quantity", expectedQty);
          }

          // Then create history entries with correct cumulative tracking
          const historyEntries: any[] = [];
          const cumulativeChanges = new Map<number, number>();

          for (const item of updatedSaleData.items) {
            const currentItem = (currentItems2 as any[]).find(
              (i) => i.id === item.itemId,
            );
            if (!currentItem) continue;

            const qty = Number(item.quantity.toFixed(4));
            const prevChange = cumulativeChanges.get(item.itemId) || 0;
            const beforeQty = Number(
              (currentItem.quantity - prevChange).toFixed(4),
            );
            const afterQty = Number((beforeQty - qty).toFixed(4));
            cumulativeChanges.set(item.itemId, prevChange + qty);

            historyEntries.push({
              shop_id: effectiveShopId,
              item_id: item.itemId,
              item_name: currentItem.name,
              type: "sale",
              quantity_changed: -qty,
              quantity_before: beforeQty,
              quantity_after: afterQty,
              cost_per_unit: item.costPerUnit,
              created_at: new Date().toISOString(),
            });
          }

          if (historyEntries.length > 0) {
            await (supabase as any)
              .from("stock_history")
              .insert(historyEntries);
          }
        }
      }

      // Step 5: Handle udhari balance changes if payment method or amount changed
      const originalSubtotal = originalSale.subtotal;
      const newSubtotal = updatedSaleData.subtotal;
      const originalWasUdhari = originalSale.payment_method === "udhari";
      const newIsUdhari = paymentMethod === "udhari";

      // First, fetch the original credit entry to preserve original date and timestamp
      let originalCreditEntry = null;
      if (originalWasUdhari && originalSale.credit_customer_id) {
        const { data: entry } = await (supabase as any)
          .from("credit_entries")
          .select("*")
          .eq("sale_id", saleId)
          .single();
        originalCreditEntry = entry;
      }

      if (originalWasUdhari && originalSale.credit_customer_id) {
        // Revert original balance first
        const { data: originalCustomer } = await (supabase as any)
          .from("credit_customers")
          .select("*")
          .eq("id", originalSale.credit_customer_id)
          .single();
        if (originalCustomer) {
          let newBalance = originalCustomer.balance - originalSubtotal;
          if (
            newIsUdhari &&
            updatedSaleData.creditCustomerId === originalSale.credit_customer_id
          ) {
            newBalance += newSubtotal;
          }
          newBalance = Math.max(newBalance, 0);
          await (supabase as any)
            .from("credit_customers")
            .update({ balance: newBalance, updated_at: now })
            .eq("id", originalSale.credit_customer_id);
        }
        // Delete old credit entry
        await (supabase as any)
          .from("credit_entries")
          .delete()
          .eq("sale_id", saleId);

        // If still udhari and same customer, re-insert new credit entry with original date/timestamp
        if (
          newIsUdhari &&
          updatedSaleData.creditCustomerId === originalSale.credit_customer_id
        ) {
          const entryDate =
            originalCreditEntry?.date ??
            dateKey(new Date(originalSale.timestamp));
          const entryTimestamp =
            originalCreditEntry?.timestamp ?? originalSale.timestamp;
          await (supabase as any).from("credit_entries").insert({
            shop_id: effectiveShopId,
            customer_id: updatedSaleData.creditCustomerId,
            customer_name: updatedSaleData.creditCustomerName,
            type: "credit",
            amount: newSubtotal,
            sale_id: saleId,
            bill_items:
              updatedSaleData.items?.map((i: any) => ({
                itemName: i.itemName,
                quantity: i.quantity,
                displayQuantity: i.displayQuantity,
                unitShortForm: i.unitShortForm,
                pricePerUnit: i.pricePerUnit,
                totalPrice: i.totalPrice,
              })) || null,
            date: entryDate,
            timestamp: entryTimestamp,
            created_at: now,
          });
        } else if (
          newIsUdhari &&
          updatedSaleData.creditCustomerId !== originalSale.credit_customer_id
        ) {
          // If switched to new customer, insert new entry for new customer
          const { data: newCustomer } = await (supabase as any)
            .from("credit_customers")
            .select("*")
            .eq("id", updatedSaleData.creditCustomerId)
            .single();
          if (newCustomer) {
            await (supabase as any)
              .from("credit_customers")
              .update({
                balance: Math.max(newCustomer.balance + newSubtotal, 0),
                updated_at: now,
              })
              .eq("id", updatedSaleData.creditCustomerId);
            const entryDate = dateKey(new Date(originalSale.timestamp));
            const entryTimestamp = originalSale.timestamp;
            await (supabase as any).from("credit_entries").insert({
              shop_id: effectiveShopId,
              customer_id: updatedSaleData.creditCustomerId,
              customer_name: updatedSaleData.creditCustomerName,
              type: "credit",
              amount: newSubtotal,
              sale_id: saleId,
              bill_items:
                updatedSaleData.items?.map((i: any) => ({
                  itemName: i.itemName,
                  quantity: i.quantity,
                  displayQuantity: i.displayQuantity,
                  unitShortForm: i.unitShortForm,
                  pricePerUnit: i.pricePerUnit,
                  totalPrice: i.totalPrice,
                })) || null,
              date: entryDate,
              timestamp: entryTimestamp,
              created_at: now,
            });
          }
        }
      } else if (
        !originalWasUdhari &&
        newIsUdhari &&
        updatedSaleData.creditCustomerId
      ) {
        // New udhari now
        const { data: newCustomer } = await (supabase as any)
          .from("credit_customers")
          .select("*")
          .eq("id", updatedSaleData.creditCustomerId)
          .single();
        if (newCustomer) {
          await (supabase as any)
            .from("credit_customers")
            .update({
              balance: Math.max(newCustomer.balance + newSubtotal, 0),
              updated_at: now,
            })
            .eq("id", updatedSaleData.creditCustomerId);
          const entryDate = dateKey(new Date(originalSale.timestamp));
          const entryTimestamp = originalSale.timestamp;
          await (supabase as any).from("credit_entries").insert({
            shop_id: effectiveShopId,
            customer_id: updatedSaleData.creditCustomerId,
            customer_name: updatedSaleData.creditCustomerName,
            type: "credit",
            amount: newSubtotal,
            sale_id: saleId,
            bill_items:
              updatedSaleData.items?.map((i: any) => ({
                itemName: i.itemName,
                quantity: i.quantity,
                displayQuantity: i.displayQuantity,
                unitShortForm: i.unitShortForm,
                pricePerUnit: i.pricePerUnit,
                totalPrice: i.totalPrice,
              })) || null,
            date: entryDate,
            timestamp: entryTimestamp,
            created_at: now,
          });
        }
      }

      await loadSales();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [shopId, supabase, loadSales],
  );

  const deleteSale = useCallback(
    async (saleId: number) => {
      const effectiveShopId = resolveShopId(shopId);
      if (!effectiveShopId) return;

      // Fetch sale and its items
      const { data: sale } = await (supabase as any)
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (!sale) return;

      const { data: saleItems } = await (supabase as any)
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId);

      // If udhari sale, revert customer balance and delete credit entry
      if (sale.payment_method === "udhari" && sale.credit_customer_id) {
        const { data: customer } = await (supabase as any)
          .from("credit_customers")
          .select("*")
          .eq("id", sale.credit_customer_id)
          .single();

        if (customer) {
          await (supabase as any)
            .from("credit_customers")
            .update({
              balance: Math.max(customer.balance - sale.subtotal, 0),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sale.credit_customer_id);
        }

        // Delete the specific credit entry created for this sale
        await (supabase as any)
          .from("credit_entries")
          .delete()
          .eq("sale_id", saleId);
      }

      // Restore stock (atomically)
      if (saleItems && saleItems.length > 0) {
        // Get current items
        const { data: currentItems } = await (supabase as any)
          .from("items")
          .select("*")
          .in("id", saleItems.map((i: any) => i.item_id).filter(Boolean));

        if (currentItems) {
          // Calculate quantity changes
          const quantityChanges = new Map<number, number>();
          for (const saleItem of saleItems) {
            if (!saleItem.item_id) continue;
            const current = quantityChanges.get(saleItem.item_id) || 0;
            quantityChanges.set(saleItem.item_id, current + saleItem.quantity);
          }

          // First, restore stock with optimistic locking
          for (const [itemId, qtyToAdd] of quantityChanges) {
            const currentItem = currentItems.find((i: any) => i.id === itemId);
            if (currentItem) {
              const expectedQty = Number(currentItem.quantity.toFixed(4));
              const newQty = Number((expectedQty + qtyToAdd).toFixed(4));

              await (supabase as any)
                .from("items")
                .update({
                  quantity: newQty,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", itemId)
                .eq("quantity", expectedQty);
            }
          }

          // Then create history entries with correct cumulative tracking
          const historyEntries: any[] = [];
          const cumulativeChanges = new Map<number, number>();

          for (const saleItem of saleItems) {
            if (!saleItem.item_id) continue;
            const currentItem = currentItems.find(
              (i: any) => i.id === saleItem.item_id,
            );
            if (!currentItem) continue;

            const qty = Number(saleItem.quantity.toFixed(4));
            const prevChange = cumulativeChanges.get(saleItem.item_id) || 0;
            const beforeQty = Number(
              (currentItem.quantity + prevChange).toFixed(4),
            );
            const afterQty = Number((beforeQty + qty).toFixed(4));
            cumulativeChanges.set(saleItem.item_id, prevChange + qty);

            historyEntries.push({
              shop_id: effectiveShopId,
              item_id: saleItem.item_id,
              item_name: currentItem.name,
              type: "adjustment",
              quantity_changed: qty,
              quantity_before: beforeQty,
              quantity_after: afterQty,
              reason: `Restored from deleted sale #${saleId}`,
              cost_per_unit: saleItem.cost_per_unit,
              created_at: new Date().toISOString(),
            });
          }

          if (historyEntries.length > 0) {
            await (supabase as any)
              .from("stock_history")
              .insert(historyEntries);
          }
        }
      }

      // Delete sale (cascading will delete sale_items in Supabase)
      await (supabase as any).from("sales").delete().eq("id", saleId);

      // Refresh globally
      await loadSales();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [shopId, supabase, loadSales],
  );

  return {
    sales: salesWithItems,
    saleItems,
    isLoading,
    refresh: loadSales,
    createSale,
    updateSale,
    updateStockAfterSale,
    getDailySummary,
    deleteSale,
  };
}

// --- Stock History ---
const mapStockHistory = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  itemId: row.item_id,
  itemName: row.item_name,
  type: row.type,
  quantityChanged: row.quantity_changed,
  quantityBefore: row.quantity_before,
  quantityAfter: row.quantity_after,
  reason: row.reason,
  costPerUnit: row.cost_per_unit,
  reference: row.reference,
  createdAt: new Date(row.created_at).getTime(),
});

export function useStockHistory(shopId?: number) {
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadStockHistory = useCallback(async () => {
    if (!resolvedShopId) return;
    if (!isBrowserOnline()) {
      const cached = await readCachedCollection(
        resolvedShopId,
        "stock_history",
      );
      setStockHistory(cached.map(mapStockHistory));
      setIsLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("stock_history")
      .select("*")
      .eq("shop_id", resolvedShopId)
      .order("created_at", { ascending: false });
    if (data)
      await writeCachedCollection(resolvedShopId, "stock_history", data);
    const rows =
      data || (await readCachedCollection(resolvedShopId, "stock_history"));
    setStockHistory(rows.map(mapStockHistory));
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadStockHistory();
  }, [loadStockHistory]);

  return { stockHistory, isLoading };
}

// --- Batches ---
const mapBatch = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  itemId: row.item_id,
  itemName: row.item_name,
  batchNumber: row.batch_number,
  purchaseDate: row.purchase_date,
  expiryDate: row.expiry_date,
  quantityReceived: row.quantity_received,
  quantitySold: row.quantity_sold,
  quantityAvailable: row.quantity_available,
  costPerUnit: row.cost_per_unit,
  supplierId: row.supplier_id,
  status: row.status,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

export function useBatches(shopId?: number) {
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadBatches = useCallback(async () => {
    if (!resolvedShopId) return;
    const { data } = await (supabase as any)
      .from("batches")
      .select("*")
      .eq("shop_id", resolvedShopId)
      .order("created_at", { ascending: false });
    setBatches(data ? data.map(mapBatch) : []);
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const createBatch = useCallback(
    async (batchData: any) => {
      if (!resolvedShopId) return;
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("batches")
        .insert({
          shop_id: resolvedShopId,
          item_id: batchData.itemId,
          item_name: batchData.itemName,
          batch_number: batchData.batchNumber || null,
          purchase_date: new Date(batchData.purchaseDate)
            .toISOString()
            .split("T")[0],
          expiry_date: batchData.expiryDate
            ? new Date(batchData.expiryDate).toISOString().split("T")[0]
            : null,
          quantity_received: batchData.quantityReceived,
          quantity_sold: batchData.quantitySold,
          quantity_available: batchData.quantityAvailable,
          cost_per_unit: batchData.costPerUnit,
          status: batchData.status,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (data) {
        await loadBatches();
      }
    },
    [resolvedShopId, loadBatches, supabase],
  );

  const deleteBatch = useCallback(
    async (batchId: number) => {
      if (!resolvedShopId) return;
      await (supabase as any).from("batches").delete().eq("id", batchId);
      await loadBatches();
    },
    [shopId, loadBatches, supabase],
  );

  const getExpiringBatches = useCallback(() => {
    return batches.filter(
      (b) => b.status === "expiring" || b.status === "expired",
    );
  }, [batches]);

  return { batches, isLoading, createBatch, deleteBatch, getExpiringBatches };
}

// --- Alerts ---
const mapAlert = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  itemId: row.item_id,
  itemName: row.item_name,
  alertType: row.alert_type,
  message: row.message,
  severity: row.severity,
  data: row.data,
  read: row.read,
  createdAt: new Date(row.created_at).getTime(),
});

export function useAlerts(shopId?: number) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadAlerts = useCallback(async () => {
    if (!resolvedShopId) return;
    if (!isBrowserOnline()) {
      const cached = await readCachedCollection(resolvedShopId, "alerts");
      setAlerts(cached.map(mapAlert));
      setIsLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("alerts")
      .select("*")
      .eq("shop_id", resolvedShopId)
      .order("created_at", { ascending: false });
    if (data) await writeCachedCollection(resolvedShopId, "alerts", data);
    const rows = data || (await readCachedCollection(resolvedShopId, "alerts"));
    setAlerts(rows.map(mapAlert));
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const markRead = async (id: number) => {
    if (!resolvedShopId) return;
    await (supabase as any).from("alerts").update({ read: true }).eq("id", id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
    );
  };

  return { alerts, isLoading, markRead };
}

// --- Credit Customers & Entries ---
const mapCreditCustomer = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  phone: row.phone,
  balance: row.balance,
  notes: row.notes,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const mapCreditEntry = (row: any) => ({
  id: row.id,
  shopId: row.shop_id,
  customerId: row.customer_id,
  customerName: row.customer_name,
  type: row.type,
  amount: row.amount,
  note: row.note,
  saleId: row.sale_id,
  billItems: row.bill_items,
  date: row.date,
  timestamp: new Date(row.timestamp).getTime(),
  createdAt: new Date(row.created_at).getTime(),
});

export function useUdhari(shopId?: number) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const resolvedShopId = resolveShopId(shopId);

  const loadUdhari = useCallback(async () => {
    if (!resolvedShopId) return;
    if (!isBrowserOnline()) {
      const [cachedCustomers, cachedEntries] = await Promise.all([
        readCachedCollection(resolvedShopId, "credit_customers"),
        readCachedCollection(resolvedShopId, "credit_entries"),
      ]);
      setCustomers(cachedCustomers.map(mapCreditCustomer));
      setEntries(cachedEntries.map(mapCreditEntry));
      setIsLoading(false);
      return;
    }

    const [{ data: customersData }, { data: entriesData }] = await Promise.all([
      (supabase as any)
        .from("credit_customers")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("name"),
      (supabase as any)
        .from("credit_entries")
        .select("*")
        .eq("shop_id", resolvedShopId)
        .order("timestamp", { ascending: false }),
    ]);
    if (customersData)
      await writeCachedCollection(
        resolvedShopId,
        "credit_customers",
        customersData,
      );
    if (entriesData)
      await writeCachedCollection(
        resolvedShopId,
        "credit_entries",
        entriesData,
      );
    setCustomers(customersData ? customersData.map(mapCreditCustomer) : []);
    setEntries(entriesData ? entriesData.map(mapCreditEntry) : []);
    setIsLoading(false);
  }, [resolvedShopId, supabase]);

  useEffect(() => {
    loadUdhari();

    const handleRefresh = () => loadUdhari();
    window.addEventListener("refresh-dukan-data", handleRefresh);
    return () =>
      window.removeEventListener("refresh-dukan-data", handleRefresh);
  }, [loadUdhari]);

  const totalPending = customers.reduce((sum, c) => sum + c.balance, 0);

  const addCustomer = useCallback(
    async (customerData: any) => {
      const effectiveShopId = resolvedShopId;
      if (!effectiveShopId) return null;
      const now = new Date().toISOString();
      const row = {
        id: createOfflineId(),
        shop_id: effectiveShopId,
        name: customerData.name,
        phone: customerData.phone || null,
        balance: 0,
        notes: null,
        created_at: now,
        updated_at: now,
      };
      const { data } = await executeWithOfflineUpsert({
        shopId: effectiveShopId,
        table: "credit_customers",
        row,
        request: async () => {
          const { id: _localId, ...insertRow } = row;
          const { data: savedCustomer, error } = await (supabase as any)
            .from("credit_customers")
            .insert(insertRow)
            .select("*")
            .single();
          if (error) throw error;
          return savedCustomer;
        },
      });
      const savedCustomer = data || row;
      setCustomers((prev) => [
        ...prev.filter((customer) => customer.id !== savedCustomer.id),
        mapCreditCustomer(savedCustomer),
      ]);
      window.dispatchEvent(new Event("refresh-dukan-data"));
      return Number(savedCustomer.id);
    },
    [resolvedShopId, loadUdhari, supabase],
  );

  const addCredit = useCallback(
    async (
      customerId: number,
      amount: number,
      note?: string,
      billItems?: any[],
      saleId?: number,
    ) => {
      const effectiveShopId = resolvedShopId;
      if (!effectiveShopId) return;
      const now = new Date().toISOString();
      const today = dateKey(new Date());
      const customer = customers.find((c) => c.id === customerId);
      const entryRow = {
        id: createOfflineId(),
        shop_id: effectiveShopId,
        customer_id: customerId,
        customer_name: customer?.name || "",
        type: "credit",
        amount,
        note: note || null,
        bill_items: billItems || null,
        sale_id: saleId || null,
        date: today,
        timestamp: now,
        created_at: now,
      };
      await executeWithOfflineUpsert({
        shopId: effectiveShopId,
        table: "credit_entries",
        row: entryRow,
        request: async () => {
          const { id: _localId, ...insertRow } = entryRow;
          const { data, error } = await (supabase as any)
            .from("credit_entries")
            .insert(insertRow)
            .select("*")
            .single();
          if (error) throw error;
          return data;
        },
      });

      if (customer) {
        const updatedCustomer = {
          id: customer.id,
          shop_id: effectiveShopId,
          name: customer.name,
          phone: customer.phone || null,
          balance: Number(customer.balance) + amount,
          notes: customer.notes || null,
          created_at: new Date(customer.createdAt).toISOString(),
          updated_at: now,
        };
        await executeWithOfflineUpsert({
          shopId: effectiveShopId,
          table: "credit_customers",
          row: updatedCustomer,
          request: async () => {
            const { data, error } = await (supabase as any)
              .from("credit_customers")
              .upsert(updatedCustomer, { onConflict: "id" })
              .select("*")
              .single();
            if (error) throw error;
            return data;
          },
        });
        setCustomers((prev) =>
          prev.map((entry) =>
            entry.id === customerId
              ? mapCreditCustomer(updatedCustomer)
              : entry,
          ),
        );
      }
      setEntries((prev) => [mapCreditEntry(entryRow), ...prev]);
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [resolvedShopId, customers, loadUdhari, supabase],
  );

  const receivePayment = useCallback(
    async (customerId: number, amount: number, note?: string) => {
      const effectiveShopId = resolvedShopId;
      if (!effectiveShopId) return;
      const now = new Date().toISOString();
      const today = dateKey(new Date());
      const customer = customers.find((c) => c.id === customerId);
      const entryRow = {
        id: createOfflineId(),
        shop_id: effectiveShopId,
        customer_id: customerId,
        customer_name: customer?.name || "",
        type: "payment",
        amount,
        note: note || null,
        date: today,
        timestamp: now,
        created_at: now,
      };
      await executeWithOfflineUpsert({
        shopId: effectiveShopId,
        table: "credit_entries",
        row: entryRow,
        request: async () => {
          const { id: _localId, ...insertRow } = entryRow;
          const { data, error } = await (supabase as any)
            .from("credit_entries")
            .insert(insertRow)
            .select("*")
            .single();
          if (error) throw error;
          return data;
        },
      });

      if (customer) {
        const updatedCustomer = {
          id: customer.id,
          shop_id: effectiveShopId,
          name: customer.name,
          phone: customer.phone || null,
          balance: Math.max(Number(customer.balance) - amount, 0),
          notes: customer.notes || null,
          created_at: new Date(customer.createdAt).toISOString(),
          updated_at: now,
        };
        await executeWithOfflineUpsert({
          shopId: effectiveShopId,
          table: "credit_customers",
          row: updatedCustomer,
          request: async () => {
            const { data, error } = await (supabase as any)
              .from("credit_customers")
              .upsert(updatedCustomer, { onConflict: "id" })
              .select("*")
              .single();
            if (error) throw error;
            return data;
          },
        });
        setCustomers((prev) =>
          prev.map((entry) =>
            entry.id === customerId
              ? mapCreditCustomer(updatedCustomer)
              : entry,
          ),
        );
      }
      setEntries((prev) => [mapCreditEntry(entryRow), ...prev]);
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [resolvedShopId, customers, loadUdhari, supabase],
  );

  const updateCustomer = useCallback(
    async (customerId: number, updates: any) => {
      if (!resolvedShopId) return;
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("credit_customers")
        .update({
          name: updates.name,
          phone: updates.phone || null,
          notes: updates.notes || null,
          updated_at: now,
        })
        .eq("id", customerId)
        .select("*")
        .single();
      if (data) {
        await loadUdhari();
      }
    },
    [resolvedShopId, supabase, loadUdhari],
  );

  const deleteCustomer = useCallback(
    async (customerId: number) => {
      if (!resolvedShopId) return;
      // Check if customer has balance
      const customer = customers.find((c) => c.id === customerId);
      if (customer && customer.balance !== 0) {
        throw new Error("Cannot delete customer with non-zero balance");
      }
      await (supabase as any)
        .from("credit_entries")
        .delete()
        .eq("customer_id", customerId);
      await (supabase as any)
        .from("credit_customers")
        .delete()
        .eq("id", customerId);
      await loadUdhari();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [resolvedShopId, customers, supabase, loadUdhari],
  );

  const updateCreditEntry = useCallback(
    async (entryId: number, updates: any) => {
      if (!resolvedShopId) return;
      const now = new Date().toISOString();
      // Get original entry
      const { data: originalEntry } = await (supabase as any)
        .from("credit_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      if (!originalEntry) return;

      // Update customer balance first
      const customer = customers.find(
        (c) => c.id === originalEntry.customer_id,
      );
      if (customer) {
        let newBalance = customer.balance;
        // Revert original change
        if (originalEntry.type === "credit") {
          newBalance -= originalEntry.amount;
        } else {
          newBalance += originalEntry.amount;
        }
        // Apply new change
        const newAmount = updates.amount ?? originalEntry.amount;
        const newType = updates.type ?? originalEntry.type;
        if (newType === "credit") {
          newBalance += newAmount;
        } else {
          newBalance -= newAmount;
        }
        newBalance = Math.max(newBalance, 0);
        await (supabase as any)
          .from("credit_customers")
          .update({ balance: newBalance, updated_at: now })
          .eq("id", originalEntry.customer_id);
      }

      // Update the entry itself
      await (supabase as any)
        .from("credit_entries")
        .update({
          amount: updates.amount ?? originalEntry.amount,
          type: updates.type ?? originalEntry.type,
          note: updates.note ?? originalEntry.note,
          bill_items: updates.billItems ?? originalEntry.bill_items,
          date: updates.date ?? originalEntry.date,
          timestamp: updates.timestamp
            ? new Date(updates.timestamp).toISOString()
            : originalEntry.timestamp,
        })
        .eq("id", entryId);

      await loadUdhari();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [resolvedShopId, customers, supabase, loadUdhari],
  );

  const deleteCreditEntry = useCallback(
    async (entryId: number) => {
      if (!resolvedShopId) return;
      const { data: entry } = await (supabase as any)
        .from("credit_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      if (!entry) return;

      // Update customer balance
      const customer = customers.find((c) => c.id === entry.customer_id);
      if (customer) {
        let newBalance = customer.balance;
        if (entry.type === "credit") {
          newBalance -= entry.amount;
        } else {
          newBalance += entry.amount;
        }
        newBalance = Math.max(newBalance, 0);
        await (supabase as any)
          .from("credit_customers")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", entry.customer_id);
      }

      // Delete the entry
      await (supabase as any).from("credit_entries").delete().eq("id", entryId);

      await loadUdhari();
      window.dispatchEvent(new Event("refresh-dukan-data"));
    },
    [shopId, customers, supabase, loadUdhari],
  );

  const getCustomerEntries = useCallback(
    (customerId: number) => {
      return entries.filter((e) => e.customerId === customerId);
    },
    [entries],
  );

  return {
    customers,
    entries,
    totalPending,
    isLoading,
    refresh: loadUdhari,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCredit,
    receivePayment,
    updateCreditEntry,
    deleteCreditEntry,
    getCustomerEntries,
  };
}

// --- Dashboard Stats ---
export function useDashboardStats(shopId?: number) {
  const { items } = useItems(shopId);
  const { sales } = useSales(shopId);
  const { totalPending } = useUdhari(shopId);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKey(today);

    const todaySales = sales.filter((s) => s.date === todayKey);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.subtotal, 0);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
    const todayTransactions = todaySales.length;

    const lowStockCount = items.filter(
      (i) => i.quantity <= i.lowStockLimit,
    ).length;
    const totalStockValue = items.reduce(
      (sum, i) => sum + i.quantity * i.buyPrice,
      0,
    );

    return {
      todayRevenue,
      todayProfit,
      todayTransactions,
      totalPendingUdhari: totalPending,
      lowStockCount,
      totalStockValue,
    };
  }, [items, sales, totalPending]);

  return stats;
}
