"use client";

// Unit conversion map - defines conversion factors for each unit to base units
// Weight: all convert to grams (g)
// Volume: all convert to milliliters (ml)
// Pieces: no conversion (1 piece = 1 piece)
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Weight conversions to grams (g)
  g: { g: 1, kg: 0.001, mg: 0.001 },
  kg: { g: 1000, kg: 1, mg: 1000000 },
  mg: { g: 0.001, kg: 0.000001, mg: 1 },

  // Volume conversions to milliliters (ml)
  ml: { ml: 1, l: 0.001, lt: 0.001 },
  l: { ml: 1000, l: 1, lt: 1 },
  lt: { ml: 1000, l: 1, lt: 1 },

  // Piece-based (no conversion)
  pcs: { pcs: 1, piece: 1, pce: 1 },
  piece: { pcs: 1, piece: 1, pce: 1 },
  pce: { pcs: 1, piece: 1, pce: 1 },
  dozen: { dozen: 1 },
  packet: { packet: 1 },
  box: { box: 1 },
};

/**
 * Convert a quantity from one unit to another
 * E.g., 1 kg to grams = 1000 g
 */
const UNIT_ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  gm: "g",
  gms: "g",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  piece: "pcs",
  pieces: "pcs",
  pc: "pcs",
  pkt: "packet",
};

function normalizeUnit(unit: string): string {
  const key = (unit || "").toLowerCase().trim();
  return UNIT_ALIASES[key] || key;
}

export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return quantity;

  const conversions = UNIT_CONVERSIONS[from];
  if (!conversions || conversions[to] === undefined) {
    console.warn(
      `[v0] Cannot convert ${from} to ${to}, using original quantity`,
    );
    return quantity;
  }

  // Avoid JavaScript floating point errors by rounding to 4 decimal places
  const result = quantity * conversions[to];
  return Number(result.toFixed(4));
}

/**
 * Calculate ACTUAL cost per price tier unit
 *
 * CORRECT LOGIC:
 * 1. Convert base item cost to per-base-unit cost (e.g., ₹90/kg = ₹0.09/g)
 * 2. Convert price tier quantity to base unit (e.g., 50g = 50g, 1kg = 1000g)
 * 3. Calculate: cost = price_tier_qty_in_base_unit × cost_per_base_unit
 *
 * Example:
 * - Base: 1kg @ ₹90 buy → ₹0.09 per gram
 * - Price tier: 50g sold at ₹7
 * - Cost of 50g = 50 × 0.09 = ₹4.50
 * - Profit = ₹7 - ₹4.50 = ₹2.50
 */
export function calculatePriceTierCost(
  baseBuyPrice: number, // ₹90 (per 1 base unit)
  basePriceTierQuantity: number, // 50 (quantity of tier)
  basePriceTierUnit: string, // 'g' (unit of tier)
  baseItemQuantity: number, // 1000 (1kg = 1000g)
  baseItemUnit: string, // 'kg' (base unit)
): number {
  // Step 1: Convert base item to its smallest unit
  // E.g., 1kg in grams = 1000g
  const baseItemQtyInBaseUnit = convertUnit(
    baseItemQuantity,
    baseItemUnit,
    baseItemUnit,
  );

  // Step 2: Convert price tier quantity to base unit for calculation
  // E.g., 50g stays 50g if base is in grams
  const priceTierQtyInBaseUnit = convertUnit(
    basePriceTierQuantity,
    basePriceTierUnit,
    baseItemUnit,
  );

  // Step 3: Calculate cost per base unit
  // E.g., ₹90 per 1000g = ₹0.09 per gram
  const costPerBaseUnit = baseBuyPrice / baseItemQtyInBaseUnit;

  // Step 4: Calculate cost of price tier
  // E.g., 50g × ₹0.09/g = ₹4.50
  const costOfPriceTier = priceTierQtyInBaseUnit * costPerBaseUnit;

  return costOfPriceTier;
}
