export function getAuthCredentials(identifier: string, password: string) {
  const value = identifier.trim();
  if (value.includes("@")) return { email: value.toLowerCase(), password };
  const phone = value.replace(/[\s()-]/g, "");
  // Legacy shop-owner logins are stored as 10-digit Indian mobile numbers.
  return { phone: /^\d{10}$/.test(phone) ? `+91${phone}` : phone, password };
}
