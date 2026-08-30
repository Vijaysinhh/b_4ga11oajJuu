import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

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

    const response = await client.models.generateContent({
      model: modelName,
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
