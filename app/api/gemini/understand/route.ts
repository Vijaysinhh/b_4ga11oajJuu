import { NextRequest, NextResponse } from "next/server";
import {
  understandUserInput,
  parseVoiceCommandWithGemini,
  generateSearchSuggestions,
} from "@/lib/gemini-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/gemini/understand
 *
 * Understand user input and extract intent
 *
 * Body:
 * - input: string - The user input to understand
 * - type: "voice" | "text" | "search" (default: "text")
 * - items?: array - Available inventory items (for better context)
 * - units?: array - Available units (for voice commands)
 * - language?: "en" | "mr" (default: "en")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      input,
      type = "text",
      items = [],
      units = [],
      language = "en",
    } = body;

    // Validate required fields
    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Invalid input: 'input' must be a non-empty string" },
        { status: 400 },
      );
    }

    if (input.trim().length === 0) {
      return NextResponse.json(
        { error: "Input cannot be empty" },
        { status: 400 },
      );
    }

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API is not configured" },
        { status: 503 },
      );
    }

    let result: any;

    if (type === "voice" && items.length > 0 && units.length > 0) {
      // Parse as voice command for sale
      result = await parseVoiceCommandWithGemini(input, items, units);
      return NextResponse.json({
        ok: true,
        type: "voice",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else if (type === "search") {
      // Generate search suggestions
      result = await generateSearchSuggestions(input, items);
      return NextResponse.json({
        ok: true,
        type: "search",
        suggestions: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      // General input understanding
      result = await understandUserInput(input, {
        availableItems: items,
        language: language as "en" | "mr",
      });

      return NextResponse.json({
        ok: true,
        type: "understanding",
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error in /api/gemini/understand:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process input",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/gemini/health
 * Check if Gemini API is configured and working
 */
export async function GET() {
  const isConfigured = !!process.env.GEMINI_API_KEY;

  if (!isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        message: "Gemini API is not configured",
        configured: false,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Gemini API is configured and ready",
    configured: true,
    timestamp: new Date().toISOString(),
  });
}
