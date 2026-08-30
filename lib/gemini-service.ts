import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

const generateContent = (
  contents: string | Array<{ role: "user"; parts: Array<{ text: string }> }>,
) =>
  client
    ? client.models.generateContent({ model: modelName, contents })
    : Promise.reject(
        new Error("GEMINI_API_KEY is not set in environment variables"),
      );

export interface ParsedInput {
  intent: "sale" | "search" | "inventory" | "report" | "unknown";
  confidence: number;
  action?: string;
  details: Record<string, any>;
  rawParsing?: string;
  suggestions?: string[];
}

export interface SaleIntent {
  productName: string;
  quantity: number;
  unit?: string;
  priceOverride?: number;
  variant?: string;
  customerName?: string;
}

export interface SearchIntent {
  query: string;
  filters?: Record<string, any>;
  sortBy?: "relevance" | "price" | "stock";
}

export interface InventoryIntent {
  action: "add" | "update" | "remove" | "check";
  productName?: string;
  quantity?: number;
  details?: Record<string, any>;
}

/**
 * Understand user input and extract intent and details using Gemini
 * Supports multiple languages (English, Marathi)
 */
export async function understandUserInput(
  userInput: string,
  context?: {
    availableItems?: Array<{
      id: number;
      name: string;
      nameMarathi: string;
      quantity: number;
    }>;
    availableActions?: string[];
    language?: "en" | "mr";
    availableCustomers?: Array<{
      name: string;
      phone?: string;
      balance: number;
    }>;
    salesSummary?: {
      today?: number;
      month?: number;
      transactionCount?: number;
    };
    conversationHistory?: Array<{ role: "user" | "assistant"; text: string }>;
  },
): Promise<ParsedInput> {
  if (!userInput || userInput.trim().length === 0) {
    return {
      intent: "unknown",
      confidence: 0,
      details: {},
      rawParsing: "Empty input",
    };
  }

  try {
    const availableItems = context?.availableItems
      ? context.availableItems
          .map((item) => `${item.name} (${item.nameMarathi})`)
          .join(", ")
      : "No items provided";
    const availableCustomers = context?.availableCustomers
      ? context.availableCustomers
          .map(
            (customer) =>
              `${customer.name} (${customer.phone || "no phone"}) - balance: ${customer.balance}`,
          )
          .join(", ")
      : "No customers provided";
    const salesSummary = context?.salesSummary
      ? JSON.stringify(context.salesSummary)
      : "No sales summary provided";

    const systemPrompt = `You are an intelligent inventory assistant for a shop management system called "Dukan".
Your task is to understand user inputs and extract structured information.

Respond ONLY with valid JSON (no markdown, no code blocks, just pure JSON object).

Available items: ${availableItems}
Available customers and udhari balances: ${availableCustomers}
Sales summary: ${salesSummary}
Recent conversation: ${context?.conversationHistory?.map((message) => `${message.role}: ${message.text}`).join("\n") || "No previous conversation"}
Available actions: ${context?.availableActions?.join(", ") || "sale, search, inventory, report"}
Language: ${context?.language === "mr" ? "Marathi (or mixed English-Marathi)" : "English"}

You must respond with this exact JSON structure (adapt details based on intent):
{
  "intent": "sale|search|inventory|report|unknown",
  "confidence": 0.0-1.0,
  "action": "description of action",
  "details": {
    // Specific fields based on intent
  },
  "rawParsing": "explanation of what was parsed",
  "suggestions": ["suggestion1", "suggestion2"]
}

For SALE intent, details should include: productName (string), quantity (number), unit (string), customerName (optional), priceOverride (optional)
For SEARCH intent, details should include: query (string), filters (object), sortBy ("relevance"|"price"|"stock")
For INVENTORY intent, details should include: action ("add"|"update"|"remove"|"check"), productName (string), quantity (number)
For REPORT intent, details should include: reportType ("daily"|"monthly"|"custom"), dateRange (optional)

Be smart about handling:
- Quantity variations (एक, दोन, one, two, half, दीड, etc.)
- Unit aliases (पीस, kg, लिटर, box, etc.)
- Product name variations (with/without brand)
- Mixed language input (English + Marathi)
- Typos and abbreviations`;

    const prompt = `User input: "${userInput}"

Please analyze this input and extract the intent and details. Be flexible with language and spelling variations.`;

    const response = await generateContent([
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\n" + prompt,
          },
        ],
      },
    ]);

    const responseText = response.text?.trim() ?? "";

    // Clean up response if it has markdown code blocks
    let cleanedText = responseText;
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleanedText.trim());

    return {
      intent: parsed.intent || "unknown",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      action: parsed.action,
      details: parsed.details || {},
      rawParsing: parsed.rawParsing,
      suggestions: parsed.suggestions || [],
    };
  } catch (error) {
    console.error("Error parsing input with Gemini:", error);
    return {
      intent: "unknown",
      confidence: 0,
      details: {},
      rawParsing: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      suggestions: ["Please rephrase your input"],
    };
  }
}

/**
 * Enhance voice command parsing with Gemini
 * Takes raw voice transcript and extracts structured sale information
 */
export async function parseVoiceCommandWithGemini(
  voiceTranscript: string,
  items: Array<{
    id: number;
    name: string;
    nameMarathi: string;
    quantity: number;
    sellPrice: number;
    brand?: string;
  }>,
  units: Array<{ id: number; shortForm: string; name: string }>,
): Promise<SaleIntent[]> {
  if (!voiceTranscript || voiceTranscript.trim().length === 0) {
    return [];
  }

  try {
    const itemsList = items
      .map(
        (item) =>
          `${item.name} (${item.nameMarathi}), Brand: ${item.brand || "N/A"}, Stock: ${item.quantity}`,
      )
      .join("\n");

    const unitsList = units
      .map((unit) => `${unit.shortForm} - ${unit.name}`)
      .join(", ");

    const systemPrompt = `You are a voice command parser for a shop inventory system.
Extract sale line items from voice input.

Available items:
${itemsList}

Available units: ${unitsList}

Respond ONLY with a valid JSON array. Example:
[
  {
    "productName": "Milk",
    "quantity": 2,
    "unit": "liter",
    "customerName": null,
    "priceOverride": null
  }
]

Rules:
1. Match product names intelligently (handle typos, abbreviations, brand names)
2. Convert number words to digits (एक->1, two->2, दीड->1.5, etc.)
3. Default unit to product's standard unit if not mentioned
4. Return empty array if no valid sale items found
5. Handle mixed English-Marathi input
6. Important: phrases like "5 wale biscuit", "5 rupaye biscuit", "five rupees biscuit", or "₹5 biscuit" mean the biscuit's price/pack variant is 5, NOT a quantity of 5. Return quantity 1 and priceOverride 5 for that phrase unless another quantity is explicitly spoken.
7. Keep the price/pack variant attached to productName or variant, and return variant such as "₹5 pack" when understood.

Example: "dhon parle biscuit 5 wale" => [{"productName":"Parle biscuit","quantity":2,"priceOverride":5,"variant":"₹5 pack"}]`;

    const prompt = `Voice transcript: "${voiceTranscript}"

Extract all sale line items from this voice command. Match products with the available inventory.`;

    const response = await generateContent([
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\n" + prompt,
          },
        ],
      },
    ]);

    const responseText = response.text?.trim() ?? "";

    // Clean up response if it has markdown code blocks
    let cleanedText = responseText;
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleanedText.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing voice command with Gemini:", error);
    return [];
  }
}

/**
 * Generate intelligent search suggestions based on user query
 */
export async function generateSearchSuggestions(
  query: string,
  items: Array<{ name: string; nameMarathi: string; category?: string }>,
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const itemsList = items
      .map(
        (item) =>
          `${item.name} (${item.nameMarathi})${item.category ? ` - ${item.category}` : ""}`,
      )
      .slice(0, 50) // Limit to avoid token overflow
      .join(", ");

    const prompt = `User search query: "${query}"

Available items: ${itemsList}

Provide 3-5 search suggestions as a JSON array of strings. Only suggest items or relevant searches.
Respond with ONLY the JSON array, no other text.

Example response: ["Milk", "Milk Packets", "Dairy Products"]`;

    const response = await generateContent(prompt);
    const responseText = response.text?.trim() ?? "";

    let cleanedText = responseText;
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleanedText.trim());
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (error) {
    console.error("Error generating search suggestions:", error);
    return [];
  }
}

/**
 * Analyze business context from user input (for reports, analysis)
 */
export async function analyzeBusinessContext(
  userQuery: string,
  shopData?: {
    totalSales?: number;
    lowStockItems?: number;
    expiredItems?: number;
  },
): Promise<{
  analysis: string;
  recommendedAction?: string;
  metrics?: Record<string, any>;
}> {
  try {
    const dataContext = shopData
      ? `
Shop Status:
- Total Sales: ${shopData.totalSales || 0}
- Low Stock Items: ${shopData.lowStockItems || 0}
- Expired Items: ${shopData.expiredItems || 0}
`
      : "";

    const prompt = `User query: "${userQuery}"
${dataContext}

Analyze this query in business context and provide:
1. What the user is trying to understand
2. Recommended action
3. Relevant metrics to track

Respond with ONLY this JSON structure:
{
  "analysis": "explanation of what user is asking",
  "recommendedAction": "what should be done",
  "metrics": {}
}`;

    const response = await generateContent(prompt);
    const responseText = response.text?.trim() ?? "";

    let cleanedText = responseText;
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    return JSON.parse(cleanedText.trim());
  } catch (error) {
    console.error("Error analyzing business context:", error);
    return {
      analysis: "Unable to analyze",
      recommendedAction: "Please provide more details",
      metrics: {},
    };
  }
}
