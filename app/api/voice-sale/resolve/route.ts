import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { voiceAIRequest, voiceAIInstructions, voiceAIJsonSchema, validateVoiceAIResult } from "@/lib/voice-sale-ai";

export const runtime = "nodejs";
export const maxDuration = 20;
// Per-instance protection; provider quotas remain the global spending limit.
const limits = new Map<string, { count: number; until: number }>();
function allow(key: string, max: number) {
  const now = Date.now();
  for (const [id, bucket] of limits) if (bucket.until < now) limits.delete(id);
  const bucket = limits.get(key) || { count: 0, until: now + 60_000 };
  if (bucket.count >= max || limits.size > 5000) return false;
  bucket.count++; limits.set(key, bucket); return true;
}
const reply = (error: string, status: number) => NextResponse.json({ error }, {status, headers: {"Cache-Control": "no-store"}});

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return reply("unavailable", 503);
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return reply("forbidden", 403);
  if (!allow(`ip:${request.headers.get("x-forwarded-for") || "unknown"}`, 30)) return reply("rate_limited", 429);
  const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]);
  try {
    if (Number(request.headers.get("content-length")) > 16000) return reply("too_large", 413);
    const raw = await request.text();
    if (raw.length > 16000) return reply("too_large", 413);
    const input = voiceAIRequest.safeParse(JSON.parse(raw));
    if (!input.success) return reply("invalid_request", 400);
    const { shopId, userId, password, transcript, lines } = input.data;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return reply("unavailable", 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // The app currently uses custom users, not Supabase Auth sessions. Verify
    // those credentials server-side; never trust its client-generated cookie.
    const { data: user, error: authError } = await db.from("users").select("id,password,role,shop_id")
      .eq("id", userId).eq("shop_id", shopId).abortSignal(deadline).maybeSingle();
    const supplied = Buffer.from(password), stored = Buffer.from(user?.password || "");
    if (authError || !user || supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) return reply("unauthorized", 401);
    if (user.role !== "owner") {
      const { data: role, error } = await db.from("user_roles").select("permissions").eq("user_id", userId).eq("shop_id", shopId).abortSignal(deadline).maybeSingle();
      if (error || role?.permissions?.canCreateSales === false || !["worker", "super_admin"].includes(user.role)) return reply("forbidden", 403);
    }
    if (!allow(`user:${userId}`, 12)) return reply("rate_limited", 429);
    const ids = [...new Set(lines.flatMap((line) => line.candidateIds))];
    if (ids.length > 60) return reply("too_many_candidates", 400);
    const { data: products, error } = await db.from("items")
      .select("id,name,name_marathi,brand,brand_marathi,unit_id,quantity,expiry_date,sell_price")
      .eq("shop_id", shopId).in("id", ids).abortSignal(deadline);
    if (error) return reply("unavailable", 503);
    const { data: units, error: unitsError } = await db.from("units").select("id,short_form").eq("shop_id", shopId).abortSignal(deadline);
    if (unitsError) return reply("unavailable", 503);
    const { data: tiers, error: tiersError } = await db.from("price_tiers").select("item_id,quantity,unit_id,price").eq("shop_id", shopId).in("item_id", products?.map((product) => product.id) || []).abortSignal(deadline);
    if (tiersError) return reply("unavailable", 503);
    const authorizedLines = lines.map((line) => ({...line, candidateIds: line.candidateIds.filter((id) => products?.some((product) => product.id === id))}));
    const context = authorizedLines.map((line) => ({...line, candidates: line.candidateIds.map((id) => {
      const product = products!.find((item) => item.id === id)!;
      return {...product, unit: units?.find((unit) => unit.id === product.unit_id)?.short_form,
        variants: tiers?.filter((tier) => tier.item_id === id).slice(0, 8).map((tier) => ({quantity: tier.quantity, price: tier.price, unit: units?.find((unit) => unit.id === tier.unit_id)?.short_form}))};
    })}));
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite",
      contents: JSON.stringify({ transcript, lines: context }),
      config: { systemInstruction: voiceAIInstructions, temperature: 0, maxOutputTokens: 2048,
        responseMimeType: "application/json", responseJsonSchema: voiceAIJsonSchema, abortSignal: deadline },
    });
    const validated = validateVoiceAIResult(JSON.parse(result.text || "{}"), authorizedLines);
    return NextResponse.json(validated, {headers: {"Cache-Control": "no-store"}});
  } catch {
    // Never log transcripts, credentials or provider error payloads.
    return reply("unavailable", 503);
  }
}
