import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import {
  resolveAuthLoginIdentifier,
  type AuthLoginIdentifier,
} from "@/lib/auth-config";

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ServerConfigurationError(
      "Production setup is incomplete. Add SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) to the server environment, then redeploy.",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

class ServerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
  }
}

function isDuplicateIdentityError(error: { code?: string; message?: string }) {
  return (
    error.code === "phone_exists" ||
    error.code === "email_exists" ||
    /already registered|already exists/i.test(error.message || "")
  );
}

function canonicalPhone(value: string) {
  return value.replace(/\D/g, "");
}

function identityMatches(user: User, identity: AuthLoginIdentifier) {
  if (user.email?.toLowerCase() === identity.authEmail) {
    return true;
  }

  if (identity.kind !== "phone") return false;

  // Match legacy Auth users that were created directly with a phone number.
  const userPhone = user.phone;
  return (
    typeof userPhone === "string" &&
    canonicalPhone(userPhone) === canonicalPhone(identity.normalized)
  );
}

async function findAuthUserByIdentity(
  admin: ReturnType<typeof adminClient>,
  identity: AuthLoginIdentifier,
) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => identityMatches(user, identity));
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
}

async function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = adminClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) {
    console.error("[api/shops] token verification failed", {
      message: authError?.message,
    });
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, role")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    console.error("[api/shops] super-admin profile check failed", {
      authUserId: auth.user.id,
      message: profileError?.message,
      role: profile?.role,
    });
    return null;
  }
  return admin;
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function POST(request: NextRequest) {
  let authUserId: string | null = null;
  let createdAuthUser = false;
  let reusedOrphanIdentity: AuthLoginIdentifier | null = null;
  let shopId: number | null = null;

  try {
    const admin = await requireSuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Super-admin login required" }, { status: 401 });
    }

    const body = await request.json();
    const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
    const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const ownerLogin = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const includeStarterProducts = body.includeStarterProducts !== false;

    if (!ownerName || !shopName || !ownerLogin || password.length < 8) {
      return NextResponse.json(
        { error: "Shop name, owner name, valid login, and a password of at least 8 characters are required" },
        { status: 400 },
      );
    }

    const identity = resolveAuthLoginIdentifier(ownerLogin);
    let existingAuthUser = await findAuthUserByIdentity(admin, identity);

    if (!existingAuthUser) {
      const { data: createdAuth, error: authCreateError } =
        await admin.auth.admin.createUser({
          email: identity.authEmail,
          email_confirm: true,
          password,
        });

      if (createdAuth.user) {
        authUserId = createdAuth.user.id;
        createdAuthUser = true;
      } else if (authCreateError && isDuplicateIdentityError(authCreateError)) {
        // Handle a concurrent request that created the same identity after the
        // lookup above but before createUser completed.
        existingAuthUser = await findAuthUserByIdentity(admin, identity);
        if (!existingAuthUser) throw authCreateError;
      } else {
        throw authCreateError || new Error("Could not create owner login");
      }
    }

    if (existingAuthUser) {
      console.info("[api/shops] found existing Auth identity", {
        authUserId: existingAuthUser.id,
        identityType: identity.kind,
      });

      const { data: linkedProfiles, error: linkedProfileError } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", existingAuthUser.id)
        .limit(1);
      if (linkedProfileError) throw linkedProfileError;

      if (linkedProfiles && linkedProfiles.length > 0) {
        return NextResponse.json(
          {
            error:
              "This owner login already belongs to another account. Use a different email or mobile number.",
          },
          { status: 409 },
        );
      }

      // Database cleanup can leave an Auth-only account behind. It is safe to
      // reuse only when no application profile is linked to that Auth user.
      authUserId = existingAuthUser.id;
      reusedOrphanIdentity = identity;
    }

    const now = new Date().toISOString();
    const { data: shop, error: shopError } = await admin
      .from("shops")
      .insert({
        owner_name: ownerName,
        shop_name: shopName,
        address,
        phone_number: ownerLogin,
        // Keep legacy NOT NULL development schemas compatible without storing
        // the real password. Authentication is handled only by Supabase Auth.
        password: "",
        is_paused: false,
        subscription_end_date: endOfMonth(new Date()).toISOString(),
        last_payment_date: now,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (shopError || !shop) throw shopError || new Error("Could not create shop");
    shopId = shop.id;

    const { error: ownerError } = await admin.from("users").insert({
      shop_id: shop.id,
      username: ownerName,
      password: "",
      role: "owner",
      auth_user_id: authUserId,
      created_at: now,
      updated_at: now,
    });
    if (ownerError) throw ownerError;

    const { error: categoryError } = await admin.from("categories").insert(
      [
        { name: "Grocery", name_marathi: "किराणा", color: "#3b82f6" },
        { name: "Dairy & Milk", name_marathi: "दुग्ध", color: "#f59e0b" },
        { name: "Beverages", name_marathi: "पेय पदार्थ", color: "#ef4444" },
        { name: "Snacks & Sweets", name_marathi: "स्नॅक्स", color: "#8b5cf6" },
        { name: "Household Items", name_marathi: "घरगुती", color: "#06b6d4" },
        { name: "Personal Care", name_marathi: "वैयक्तिक", color: "#ec4899" },
      ].map((category) => ({
        ...category,
        shop_id: shop.id,
        created_at: now,
        updated_at: now,
      })),
    );
    if (categoryError) throw categoryError;

    const { error: unitError } = await admin.from("units").insert(
      [
        { name: "Kilogram", name_marathi: "किलोग्राम", short_form: "kg" },
        { name: "Gram", name_marathi: "ग्राम", short_form: "g" },
        { name: "Liter", name_marathi: "लिटर", short_form: "L" },
        { name: "Milliliter", name_marathi: "मिली लिटर", short_form: "ml" },
        { name: "Piece", name_marathi: "तुकडे", short_form: "pcs" },
        { name: "Box", name_marathi: "डिब्बा", short_form: "box" },
      ].map((unit) => ({
        ...unit,
        shop_id: shop.id,
        created_at: now,
        updated_at: now,
      })),
    );
    if (unitError) throw unitError;

    if (includeStarterProducts) {
      const { error: catalogError } = await admin.rpc("seed_shop_starter_catalog", {
        p_shop_id: shop.id,
      });
      if (catalogError) throw catalogError;
    }

    if (reusedOrphanIdentity && authUserId) {
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(authUserId, {
        email: reusedOrphanIdentity.authEmail,
        email_confirm: true,
        password,
      });
      if (updateAuthError) throw updateAuthError;
    }

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    try {
      const admin = adminClient();
      if (shopId !== null) {
        await admin.from("shops").delete().eq("id", shopId);
      }
      if (authUserId && createdAuthUser) {
        await admin.auth.admin.deleteUser(authUserId);
      }
    } catch (cleanupError) {
      console.error("[api/shops] cleanup failed", cleanupError);
    }

    console.error("[api/shops] create failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create shop" },
      { status: error instanceof ServerConfigurationError ? 503 : 400 },
    );
  }
}
