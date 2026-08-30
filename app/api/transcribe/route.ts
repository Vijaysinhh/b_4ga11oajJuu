import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const defaultGeminiModels = [
  "gemini-3-flash",
  "gemini-3-flash-preview",
  "gemini-3-flash-lite",
  "gemini-2.5-flash-lite-preview-06-17",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

const resolveGeminiModels = () => {
  const envValue = process.env.GEMINI_MODEL || process.env.GEMINI_MODELS || "";
  const preferredList = envValue
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const fallbackList = defaultGeminiModels.filter(
    (model) => !preferredList.includes(model),
  );

  return [...new Set([...preferredList, ...fallbackList])];
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const language = String(formData.get("language") || "mr-IN");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "No audio provided" },
        { status: 400 },
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gemini API is not configured for voice transcription",
        },
        { status: 503 },
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = toBase64(arrayBuffer);
    const mimeType = audio.type || "audio/webm";

    let lastError: unknown = null;
    let response;

    for (const model of resolveGeminiModels()) {
      try {
        response = await client.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Transcribe this audio into plain text for a shop sales workflow. Use Marathi + English naturally. Keep the raw spoken transcript, including product names, numbers, quantity and price phrases. Do not add commentary or bullet points. Return only the final transcript text. Language hint: ${language}`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        });
        break;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isUnavailableError =
          /404|not found|model.*unavailable|not available/i.test(message);

        if (!isUnavailableError) {
          throw error;
        }

        console.warn(
          `[transcribe-route] Model unavailable: ${model}. Retrying with next fallback.`,
        );
      }
    }

    if (!response) {
      throw lastError instanceof Error
        ? lastError
        : new Error("No Gemini model is available for this request");
    }

    const transcript = (response.text || "").trim();

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "No transcript detected from audio" },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      transcript,
      language,
    });
  } catch (error) {
    console.error("Voice transcription failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to transcribe audio",
      },
      { status: 500 },
    );
  }
}
