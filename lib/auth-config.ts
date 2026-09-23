export type AuthLoginIdentifier =
  | { kind: "email"; normalized: string; authEmail: string }
  | { kind: "phone"; normalized: string; authEmail: string };

export function normalizePhoneIdentifier(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  const e164 = /^\d{10}$/.test(compact) ? `+91${compact}` : compact;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error("Login must be a valid email or mobile number");
  }
  return e164;
}

export function phoneAuthEmail(phone: string) {
  const e164 = normalizePhoneIdentifier(phone);
  return `phone-${e164.slice(1)}@login.invalid`;
}

export function resolveAuthLoginIdentifier(identifier: string): AuthLoginIdentifier {
  const value = identifier.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return { kind: "email", normalized: email, authEmail: email };
  }

  const phone = normalizePhoneIdentifier(value);
  return { kind: "phone", normalized: phone, authEmail: phoneAuthEmail(phone) };
}

export function getAuthCredentials(identifier: string, password: string) {
  const identity = resolveAuthLoginIdentifier(identifier);
  // Phone/password authentication is optional in Supabase and is disabled in
  // these projects. Phone numbers therefore map to a private, deterministic
  // email identity while the user continues to type their mobile number.
  return { email: identity.authEmail, password };
}
