// Unit conversion helper
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Weight conversions
  kg: { g: 1000, mg: 1000000 },
  g: { kg: 0.001, mg: 1000 },
  mg: { kg: 0.000001, g: 0.001 },

  // Volume conversions
  l: { ml: 1000, cl: 100 },
  ml: { l: 0.001, cl: 0.1 },
  cl: { l: 0.01, ml: 10 },

  // Piece conversions (no conversion needed, 1:1)
  pcs: { pcs: 1, dozen: 1 / 12 },
  dozen: { dozen: 1, pcs: 12 },

  // Packet/Box (1:1)
  packet: { packet: 1, box: 1 },
  box: { box: 1, packet: 1 },
};

export const convertUnits = (
  value: number,
  fromUnitShortForm: string,
  toUnitShortForm: string
): number => {
  if (fromUnitShortForm === toUnitShortForm) return value;

  const conversions = UNIT_CONVERSIONS[fromUnitShortForm];
  if (!conversions || !conversions[toUnitShortForm]) {
    // If no conversion found, assume 1:1 (incompatible units)
    console.warn(`[v0] No conversion found from ${fromUnitShortForm} to ${toUnitShortForm}`);
    return value;
  }

  return value * conversions[toUnitShortForm];
};
