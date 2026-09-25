export const EXPIRY_WARNING_DAYS = 7;

export type StockMovementType =
  | "purchase"
  | "adjustment"
  | "damage"
  | "expiry";

export function roundStockQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function calculateGrossMargin(buyPrice: number, sellPrice: number) {
  const marginAmount = sellPrice - buyPrice;
  const marginPercent =
    sellPrice > 0 ? (marginAmount / sellPrice) * 100 : 0;
  return { marginAmount, marginPercent };
}

export function calculateStockChange(
  currentQuantity: number,
  mode: "receive" | "return" | "damage" | "expired" | "correction",
  enteredQuantity: number,
) {
  if (!Number.isFinite(enteredQuantity) || enteredQuantity < 0) {
    throw new Error("Enter a valid stock quantity.");
  }

  if (mode !== "correction" && enteredQuantity === 0) {
    throw new Error("Stock quantity must be greater than zero.");
  }

  const change =
    mode === "correction"
      ? enteredQuantity - currentQuantity
      : mode === "damage" || mode === "expired"
        ? -enteredQuantity
        : enteredQuantity;
  const roundedChange = roundStockQuantity(change);
  const resultingQuantity = roundStockQuantity(currentQuantity + roundedChange);

  if (roundedChange === 0) {
    throw new Error("The stock quantity has not changed.");
  }
  if (resultingQuantity < 0) {
    throw new Error("You cannot remove more stock than is available.");
  }

  return { change: roundedChange, resultingQuantity };
}

export function stockMovementType(
  mode: "receive" | "return" | "damage" | "expired" | "correction",
): StockMovementType {
  if (mode === "receive") return "purchase";
  if (mode === "damage") return "damage";
  if (mode === "expired") return "expiry";
  return "adjustment";
}
