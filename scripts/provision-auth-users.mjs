import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: users, error } = await supabase.from("users").select("id, shop_id, username, password, role, auth_user_id, shops(phone_number, password)");
if (error) throw error;

// Some legacy usernames are display names, not Supabase Auth identities. Supply
// a unique email or E.164 phone number for those accounts before production
// cut-over, for example: AUTH_LOGIN_OVERRIDES_JSON='{"12":"+919876543210"}'.
const overrides = process.env.AUTH_LOGIN_OVERRIDES_JSON
  ? JSON.parse(process.env.AUTH_LOGIN_OVERRIDES_JSON)
  : {};

function toIdentity(value, profileId) {
  const login = value.trim();
  if (login.includes("@")) {
    return { email: login.toLowerCase(), email_confirm: true, key: `email:${login.toLowerCase()}` };
  }

  const phone = login.replace(/[\s()-]/g, "");
  // The existing production phone records are Indian 10-digit mobile numbers.
  const e164 = /^\d{10}$/.test(phone) ? `+91${phone}` : phone;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error(`User ${profileId} needs a unique email or phone number in E.164 format`);
  }
  return { phone: e164, phone_confirm: true, key: `phone:${e164}` };
}

const pending = (users ?? []).filter((profile) => !profile.auth_user_id).map((profile) => {
  const legacyLogin = profile.role === "owner" ? profile.shops?.phone_number : profile.username;
  const login = overrides[String(profile.id)] || legacyLogin;
  const password = profile.password || (profile.role === "owner" ? profile.shops?.password : null);
  if (!login || !password) throw new Error(`User ${profile.id} has no usable login or password`);
  return { profile, identity: toIdentity(login, profile.id), password };
});

// Validate every account before creating any Auth records. This prevents a
// duplicate or malformed identity from leaving a partially migrated database.
const seenIdentities = new Map();
for (const entry of pending) {
  const duplicate = seenIdentities.get(entry.identity.key);
  if (duplicate) {
    throw new Error(`Users ${duplicate} and ${entry.profile.id} resolve to the same Auth login (${entry.identity.key.slice(entry.identity.key.indexOf(":") + 1)})`);
  }
  seenIdentities.set(entry.identity.key, entry.profile.id);
}

let provisioned = 0;
for (const { profile, identity, password } of pending) {
  const { key: _key, ...authIdentity } = identity;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ ...authIdentity, password });
  if (createError || !created.user) throw createError || new Error(`Could not create auth user ${profile.id}`);
  const { error: updateError } = await supabase.from("users").update({ auth_user_id: created.user.id }).eq("id", profile.id);
  if (updateError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw updateError;
  }
  provisioned += 1;
}

console.log(`Provisioned ${provisioned} Supabase Auth account(s). Re-run the production RLS migration now.`);
