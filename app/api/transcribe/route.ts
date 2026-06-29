import OpenAI from "openai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STT_MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";

// Transcribe a recorded audio clip with OpenAI Whisper. Used by the Composer's
// mic button as a browser-independent replacement for the Web Speech API
// (which fails in Brave/Chromium and can't handle Sinhala/Tamil).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "No audio file provided" }, { status: 400 });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.audio.transcriptions.create({
      file: audio,
      model: STT_MODEL,
    });
    return Response.json({ text: result.text });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Transcription failed" },
      { status: 500 },
    );
  }
}
