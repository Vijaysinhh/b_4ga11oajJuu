import crypto from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd(), true);

if (process.env.ALLOW_DESTRUCTIVE_AUTH_FLOW_TEST !== "development") {
  throw new Error(
    "Refusing to create test data. Set ALLOW_DESTRUCTIVE_AUTH_FLOW_TEST=development explicitly.",
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = process.env.TEST_SUPER_ADMIN_EMAIL;
const superAdminPassword = process.env.TEST_SUPER_ADMIN_PASSWORD;
const appUrl = process.env.TEST_APP_URL || "http://localhost:3000";

if (!url || !anonKey || !serviceKey || !superAdminEmail || !superAdminPassword) {
  throw new Error("Missing development Supabase or test super-admin credentials");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const superAdmin = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const localPhone = `9${String(Date.now()).slice(-9)}`;
const phone = `+91${localPhone}`;
const authEmail = `phone-${phone.slice(1)}@login.invalid`;
const password = crypto.randomBytes(24).toString("base64url");
let shopId = null;
let authUserId = null;

try {
  const signedAdmin = await superAdmin.auth.signInWithPassword({
    email: superAdminEmail,
    password: superAdminPassword,
  });
  if (signedAdmin.error || !signedAdmin.data.session) {
    throw signedAdmin.error || new Error("Could not sign in test super-admin");
  }

  const response = await fetch(`${appUrl}/api/shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${signedAdmin.data.session.access_token}`,
    },
    body: JSON.stringify({
      ownerName: "Automated Auth Test",
      shopName: "Temporary Auth Flow Test",
      address: "Development only",
      phoneNumber: localPhone,
      password,
      includeStarterProducts: true,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.shop?.id) {
    throw new Error(`Shop API failed (${response.status}): ${body.error || "unknown error"}`);
  }
  shopId = body.shop.id;

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const authUser = listed.data.users.find(
    (user) => user.email?.toLowerCase() === authEmail,
  );
  if (!authUser) throw new Error("Created owner Auth identity was not found");
  authUserId = authUser.id;

  const ownerClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ownerLogin = await ownerClient.auth.signInWithPassword({
    email: authEmail,
    password,
  });
  if (ownerLogin.error || !ownerLogin.data.user) {
    throw ownerLogin.error || new Error("Created owner could not sign in");
  }

  const profileResult = await ownerClient
    .from("users")
    .select("id, shop_id, role, auth_user_id")
    .eq("auth_user_id", ownerLogin.data.user.id)
    .single();
  if (profileResult.error || profileResult.data?.role !== "owner") {
    throw profileResult.error || new Error("Owner profile did not load after login");
  }
  if (profileResult.data.shop_id !== shopId) {
    throw new Error("Owner profile points to the wrong shop");
  }

  const shopResult = await ownerClient
    .from("shops")
    .select("id, shop_name")
    .eq("id", shopId)
    .single();
  if (shopResult.error || shopResult.data?.id !== shopId) {
    throw shopResult.error || new Error("Owner shop did not load after login");
  }

  const seededCounts = {};
  for (const table of ["categories", "units", "items"]) {
    const result = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (result.error) throw result.error;
    seededCounts[table] = result.count;
  }

  console.log(
    JSON.stringify({
      shopApi: "passed",
      ownerPasswordLogin: "passed",
      profileLoad: "passed",
      shopLoad: "passed",
      seededCounts,
    }),
  );
} finally {
  if (shopId !== null) {
    const deletedShop = await admin.from("shops").delete().eq("id", shopId);
    if (deletedShop.error) {
      console.error("Temporary shop cleanup failed", deletedShop.error.message);
    }
  }
  if (authUserId) {
    const deletedAuth = await admin.auth.admin.deleteUser(authUserId);
    if (deletedAuth.error) {
      console.error("Temporary Auth cleanup failed", deletedAuth.error.message);
    }
  }
}
