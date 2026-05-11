"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const SUPABASE_REQUEST_TIMEOUT_MS = 4000;
export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Unable to reach Supabase. Check the project URL, project status, or network/DNS access.";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseAnonKey.includes("placeholder"),
);

function createSupabaseUnavailableResponse() {
  return new Response(
    JSON.stringify({
      error: SUPABASE_UNAVAILABLE_MESSAGE,
      error_description: SUPABASE_UNAVAILABLE_MESSAGE,
      message: SUPABASE_UNAVAILABLE_MESSAGE,
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

const supabaseFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SUPABASE_REQUEST_TIMEOUT_MS,
  );
  const originalSignal = init?.signal;
  const abortFromOriginalSignal = () => controller.abort();

  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort();
    } else {
      originalSignal.addEventListener("abort", abortFromOriginalSignal, {
        once: true,
      });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    return createSupabaseUnavailableResponse();
  } finally {
    clearTimeout(timeout);
    originalSignal?.removeEventListener("abort", abortFromOriginalSignal);
  }
};

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    global: {
      fetch: supabaseFetch,
    },
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
}

export function isSupabaseNetworkError(error: unknown) {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : formatSupabaseError(error);

  return /unable to reach supabase|failed to fetch|fetch failed|networkerror|timed out|abort|authretryablefetcherror|service unavailable|503/i.test(
    text,
  );
}

/* ------------------------------------------------------- */
/* -------------------- HELPERS --------------------------- */
/* ------------------------------------------------------- */

function formatSupabaseError(error: any) {
  try {
    return typeof error === "object" ? JSON.stringify(error) : String(error);
  } catch {
    return String(error);
  }
}

function isForeignKeyError(error: any) {
  return /23503|foreign key/i.test(formatSupabaseError(error));
}

function isRowLevelSecurityError(error: any) {
  return /violates row-level security policy|permission denied|42501/i.test(
    formatSupabaseError(error),
  );
}

function isTableMissingError(error: any) {
  return /Could not find the table .* in the schema cache|relation .* does not exist|table .* does not exist|missing relation|PGRST205/i.test(
    formatSupabaseError(error),
  );
}

/* ------------------------------------------------------- */
/* ---------------- USER (CRITICAL FIX) ------------------- */
/* ------------------------------------------------------- */

export async function ensureUserExists(
  userId: string,
  userInfo: { email?: string; shopName?: string } = {},
) {
  const payload: any = {
    id: userId,
    email: userInfo.email || `unknown+${userId}@dukan.local`,
    password_hash: "",
  };

  if (userInfo.shopName) {
    payload.shop_name = userInfo.shopName;
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    if (isRowLevelSecurityError(error)) {
      console.warn(
        "[v0] Supabase user row sync skipped due to row-level security policy:",
        formatSupabaseError(error),
      );
      return null;
    }

    console.error(
      "[CRITICAL] User creation failed:",
      formatSupabaseError(error),
    );
    throw error;
  }

  return data;
}

/* ------------------------------------------------------- */
/* ---------------- SAVE FUNCTIONS ------------------------ */
/* ------------------------------------------------------- */

export async function saveUnitToSupabase(userId: string, unit: any) {
  const { error } = await supabase.from("units").upsert({
    id: unit.id,
    user_id: userId,
    name: unit.name,
    short_form: unit.shortForm,
  });

  if (error) throw error;
}

export async function saveCategoryToSupabase(userId: string, category: any) {
  const { error } = await supabase.from("categories").upsert({
    id: category.id,
    user_id: userId,
    name: category.name,
    description: category.description || "",
  });

  if (error) throw error;
}

export async function saveItemToSupabase(userId: string, item: any) {
  const { error } = await supabase.from("items").upsert({
    id: item.id,
    user_id: userId,
    name: item.name,
    category_id: item.categoryId,
    base_unit_id: item.unitId,
    quantity: item.quantity,
    wholesale_cost: item.buyPrice || 0,
    wholesale_quantity: 1,
    low_stock_limit: item.lowStockLimit || 0,
  });

  if (error) {
    if (isForeignKeyError(error)) {
      console.error("[FK ERROR ITEM]", formatSupabaseError(error));
    }
    throw error;
  }

  return item;
}

export async function savePriceTierToSupabase(userId: string, tier: any) {
  const { error } = await supabase.from("price_tiers").upsert({
    id: tier.id,
    item_id: tier.itemId,
    unit_id: tier.unitId,
    quantity: tier.quantity,
    price: tier.price,
  });

  if (error) {
    if (isRowLevelSecurityError(error)) {
      console.warn(
        "[v0] Skipping price tier sync due to row-level security policy:",
        formatSupabaseError(error),
      );
      return null;
    }
    if (isTableMissingError(error)) {
      console.warn(
        "[v0] Skipping price tier sync because price_tiers table is missing:",
        formatSupabaseError(error),
      );
      return null;
    }
    throw error;
  }
}

export async function saveSaleToSupabase(userId: string, sale: any) {
  const { error } = await supabase.from("sales").upsert({
    id: sale.id,
    user_id: userId,
    date: sale.date,
    total_profit: sale.totalProfit,
    total_cost: sale.totalCost,
  });

  if (error) {
    if (isRowLevelSecurityError(error)) {
      console.warn(
        "[v0] Skipping sale sync due to row-level security policy:",
        formatSupabaseError(error),
      );
      return null;
    }
    if (isTableMissingError(error)) {
      console.warn(
        "[v0] Skipping sale sync because sales table is missing:",
        formatSupabaseError(error),
      );
      return null;
    }
    throw error;
  }

  return sale;
}

/* ------------------------------------------------------- */
/* ---------------- FETCH FUNCTIONS (FIXED) --------------- */
/* ------------------------------------------------------- */

export async function fetchItemsFromSupabase(userId: string) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[Fetch Items Error]", error);
    return [];
  }

  return data || [];
}

export async function fetchSalesFromSupabase(userId: string) {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[Fetch Sales Error]", error);
    return [];
  }

  return data || [];
}

/* ------------------------------------------------------- */
/* ---------------- MAIN SYNC (FIXED ORDER) --------------- */
/* ------------------------------------------------------- */

export async function syncToSupabase(
  userId: string,
  userInfo: { email?: string; shopName?: string } = {},
) {
  if (!userId) throw new Error("User ID required");

  const { db } = await import("./db");

  console.log("🚀 Starting sync...");

  try {
    // 1. USER
    const userRow = await ensureUserExists(userId, userInfo);
    if (!userRow) {
      console.warn(
        "[v0] Supabase user row sync skipped; continuing cloud sync without user row creation.",
      );
    }

    // 2. UNITS
    const units = await db.units.toArray();
    for (const unit of units) {
      await saveUnitToSupabase(userId, unit).catch((error) => {
        console.warn('[v0] Failed to sync unit:', unit.id, formatSupabaseError(error));
      });
    }

    // 3. CATEGORIES
    const categories = await db.categories.toArray();
    for (const cat of categories) {
      await saveCategoryToSupabase(userId, cat).catch((error) => {
        console.warn('[v0] Failed to sync category:', cat.id, formatSupabaseError(error));
      });
    }

    // 4. ITEMS
    const items = await db.items.toArray();
    for (const item of items) {
      await saveItemToSupabase(userId, item).catch((error) => {
        console.warn('[v0] Failed to sync item:', item.id, formatSupabaseError(error));
      });
    }

    // 5. PRICE TIERS
    const tiers = await db.priceTiers.toArray();
    for (const tier of tiers) {
      await savePriceTierToSupabase(userId, tier).catch((error) => {
        console.warn('[v0] Failed to sync price tier:', tier.id, formatSupabaseError(error));
      });
    }

    // 6. SALES
    const sales = await db.sales.toArray();
    for (const sale of sales) {
      await saveSaleToSupabase(userId, sale).catch((error) => {
        console.warn('[v0] Failed to sync sale:', sale.id, formatSupabaseError(error));
      });
    }

    console.log('✅ Sync completed');

  } catch (error) {
    console.error("❌ Sync failed:", formatSupabaseError(error));
    throw error;
  }
}

/* ------------------------------------------------------- */
/* ---------------- ENTRY FUNCTION ------------------------ */
/* ------------------------------------------------------- */

export async function syncUserData(
  userId: string,
  userInfo: { email?: string; shopName?: string } = {},
) {
  if (!userId) throw new Error("User ID required");

  await syncToSupabase(userId, userInfo);
}
