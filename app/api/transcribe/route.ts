import OpenAI from "openai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STT_MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";

// Style/context hint for Whisper. We deliberately do NOT lock a language —
// auto-detect lets a single utterance mix Sinhala and English ("Singlish").
// The code-mixed, Sinhala-script examples bias the model toward preserving
// that switching and toward Kapruka gift-shopping vocabulary + brand names.
const STT_PROMPT =
  "Kapruka gift and grocery shopping in Sri Lanka. The speaker mixes Sinhala " +
  "(written in Sinhala script) with English words. Examples: " +
  "අම්මට chocolate cake එකක් order කරන්න ඕනේ. " +
  "Birthday එකට මල් bouquet එකක් find කරන්න. " +
  "Samsung phone එකක තියෙනවද? Munchee biscuits, perfume, gift voucher.";

// Transcribe a recorded audio clip with OpenAI Whisper. Used by the Composer's
// mic button as a browser-independent replacement for the Web Speech API
// (which fails in Brave/Chromium and can't handle Sinhala/code-mixed speech).
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
      prompt: STT_PROMPT,
      temperature: 0,
    });
    return Response.json({ text: result.text });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Transcription failed" },
      { status: 500 },
    );
  }
}
