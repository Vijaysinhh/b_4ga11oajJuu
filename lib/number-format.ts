export function formatWholeNumber(value: number | undefined | null) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(safeValue).toLocaleString('en-IN');
}

export function formatMoney(value: number | undefined | null) {
  return formatWholeNumber(value);
}

export function formatPercent(value: number | undefined | null) {
  return formatWholeNumber(value);
}

export function cleanWholeNumberInput(value: string) {
  return value.split('.')[0].replace(/\D/g, '');
}

export function parseWholeNumberInput(value: string) {
  const cleanValue = cleanWholeNumberInput(value);
  return cleanValue ? Number(cleanValue) : 0;
}
