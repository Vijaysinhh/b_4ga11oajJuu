export type VoiceSaleRequest = {
  quantity: number;
  productQuery: string;
  requestedUnit?: string;
};

const numberWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  don: 2,
  dhon: 2,
  एक: 1,
  दोन: 2,
  तीन: 3,
  चार: 4,
  पाच: 5,
  सहा: 6,
  सात: 7,
  आठ: 8,
  नऊ: 9,
  दहा: 10,
  अकरा: 11,
  बारा: 12,
  तेरा: 13,
  चौदा: 14,
  पंधरा: 15,
  सोळा: 16,
  सतरा: 17,
  अठरा: 18,
  एकोणीस: 19,
  वीस: 20,
  दीड: 1.5,
  अर्धा: 0.5,
  अर्धी: 0.5,
  पाव: 0.25,
  सव्वा: 1.25,
  अडीच: 2.5,
  साडेतीन: 3.5,
  half: 0.5,
};

const unitAliases: Record<string, string> = {
  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
  नग: "pcs",
  नगा: "pcs",
  packet: "packet",
  packets: "packet",
  pkt: "packet",
  पॅकेट: "packet",
  पॅकेट्स: "packet",
  sachet: "sachet",
  sachets: "sachet",
  सॅशे: "sachet",
  box: "box",
  boxes: "box",
  डबा: "box",
  dozen: "dozen",
  dz: "dozen",
  डझन: "dozen",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  kilos: "kg",
  किलो: "kg",
  किलोग्राम: "kg",
  g: "g",
  gram: "g",
  grams: "g",
  ग्रॅम: "g",
  l: "l",
  liter: "l",
  litre: "l",
  लिटर: "l",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  मिली: "ml",
};

const priceVariantWords = new Set([
  "wale",
  "वाले",
  "rupees",
  "रुपये",
  "रुपयाचे",
  "price",
  "rate",
]);

const commandWords = new Set([
  "add",
  "please",
  "qty",
  "quantity",
  "करा",
  "टाका",
  "द्या",
  "द्याना",
  "हवे",
  "पाहिजे",
  "वस्तू",
  "आणून",
  "घ्या",
  "wale",
  "वाले",
  "रुपये",
  "रुपयाचे",
  "चा",
  "ची",
  "चे",
]);

export function normalizeVoiceText(value: string) {
  return value
    .toLowerCase()
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(
      /\b(?:i|ek|एक)\s+(?=(?:kilo|kilos|kg|kilogram|kilograms|किलो|किलोग्राम)\b)/g,
      "1 ",
    )
    .replace(/[,.!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFromToken(token: string) {
  if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
  return numberWords[token];
}

function quantityStartIndexes(tokens: string[]) {
  const indexes: number[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];
    if (numberFromToken(token) === undefined) continue;
    if (nextToken && priceVariantWords.has(nextToken)) continue;
    if (index > 0 && numberFromToken(tokens[index - 1]) !== undefined) continue;
    indexes.push(index);
  }

  return indexes;
}

function splitRequests(value: string) {
  const normalized = normalizeVoiceText(value)
    .replace(/\b(?:and|then|plus|ani|mag|aani)\b/g, "|")
    .replace(/[,;]+/g, "|")
    .replace(/\b(?:आणि|मग|तथा)\b/g, "|");

  const clauses = normalized
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const resolved: string[] = [];

  for (const clause of clauses) {
    const tokens = clause.split(" ").filter(Boolean);
    const starts = quantityStartIndexes(tokens);

    if (starts.length <= 1) {
      resolved.push(clause);
      continue;
    }

    for (let index = 0; index < starts.length; index += 1) {
      const start = starts[index];
      const end = starts[index + 1] ?? tokens.length;
      const segment = tokens.slice(start, end).join(" ").trim();
      if (segment) resolved.push(segment);
    }
  }

  return resolved.length > 0 ? resolved : clauses;
}

export function parseVoiceSaleCommand(value: string): VoiceSaleRequest[] {
  return splitRequests(value)
    .map((part) => {
      const tokens = part.split(" ").filter(Boolean);
      const ignoredIndexes = new Set<number>();

      for (let index = 0; index < tokens.length - 1; index += 1) {
        const token = tokens[index];
        const nextToken = tokens[index + 1];
        if (
          numberFromToken(token) !== undefined &&
          nextToken &&
          priceVariantWords.has(nextToken)
        ) {
          ignoredIndexes.add(index);
          ignoredIndexes.add(index + 1);
        }
      }

      const quantityIndex = tokens.findIndex(
        (token, index) =>
          !ignoredIndexes.has(index) && numberFromToken(token) !== undefined,
      );

      let quantity =
        quantityIndex >= 0 ? numberFromToken(tokens[quantityIndex]) || 1 : 1;

      const productTokens = tokens.filter(
        (_, index) =>
          index !== quantityIndex &&
          !ignoredIndexes.has(index) &&
          !commandWords.has(tokens[index]),
      );

      let requestedUnit: string | undefined;
      const filteredTokens = productTokens.filter((token) => {
        const unit = unitAliases[token];
        if (unit) requestedUnit = unit;
        return !unit;
      });

      if (requestedUnit === "dozen") quantity *= 12;

      return {
        quantity,
        productQuery: filteredTokens.join(" ").trim(),
        ...(requestedUnit ? { requestedUnit } : {}),
      };
    })
    .filter((request) => request.productQuery.length > 0);
}
