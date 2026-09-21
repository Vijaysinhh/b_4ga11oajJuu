import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireOwner(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = adminClient();
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return null;
  const { data: profile } = await admin
    .from("users")
    .select("id, shop_id, role")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (!profile || !["owner", "super_admin"].includes(profile.role)) return null;
  return { admin, profile };
}

function identity(username: string) {
  const value = username.trim();
  if (value.includes("@")) return { email: value.toLowerCase() };
  const phone = value.replace(/[\s()-]/g, "");
  const e164 = /^\d{10}$/.test(phone) ? `+91${phone}` : phone;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error("Staff login must be an email or an international phone number (for example +919876543210)");
  }
  return { phone: e164 };
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireOwner(request);
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "A valid login and password of at least 8 characters are required" }, { status: 400 });
    }
    const shopId = context.profile.shop_id;
    if (!shopId) return NextResponse.json({ error: "Owner has no shop" }, { status: 400 });
    const { data: created, error: authError } = await context.admin.auth.admin.createUser({
      ...identity(username), password, email_confirm: true, phone_confirm: true,
    });
    if (authError || !created.user) throw authError || new Error("Could not create auth user");
    const { data: profile, error: profileError } = await context.admin
      .from("users")
      .insert({ shop_id: shopId, username: username.trim(), password: null, role: "worker", auth_user_id: created.user.id })
      .select("*")
      .single();
    if (profileError) {
      await context.admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }
    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create staff" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireOwner(request);
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId, username, password } = await request.json();
    const query = context.admin.from("users").select("auth_user_id, shop_id").eq("id", userId);
    if (context.profile.role !== "super_admin") query.eq("shop_id", context.profile.shop_id);
    const { data: target } = await query.single();
    if (!target?.auth_user_id) return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    const authPatch = { ...(username ? identity(username) : {}), ...(password ? { password } : {}) };
    if (Object.keys(authPatch).length) {
      const { error } = await context.admin.auth.admin.updateUserById(target.auth_user_id, authPatch);
      if (error) throw error;
    }
    if (username) await context.admin.from("users").update({ username: username.trim() }).eq("id", userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update staff" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await requireOwner(request);
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = Number(request.nextUrl.searchParams.get("userId"));
    const query = context.admin.from("users").select("auth_user_id, shop_id").eq("id", userId);
    if (context.profile.role !== "super_admin") query.eq("shop_id", context.profile.shop_id);
    const { data: target } = await query.single();
    if (!target?.auth_user_id) return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    const { error } = await context.admin.auth.admin.deleteUser(target.auth_user_id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete staff" }, { status: 400 });
  }
}
