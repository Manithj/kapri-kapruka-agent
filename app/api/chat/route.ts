import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { TOOLS, executeTool, type AgentContext } from "@/lib/agent";
import { buildSystemPrompt, buildContextMessage, buildChipContext } from "@/lib/prompt";
import type { CartItem, StreamEvent, WireMessage, WireProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const CHIP_MODEL = process.env.OPENAI_CHIP_MODEL || "gpt-4o-mini";
const MAX_TURNS = 8;

function todayInColombo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

// Map a wire message to an OpenAI message, attaching images as multimodal parts
// (user messages only). Only the latest user turn carries image bytes.
function toOpenAIMessage(m: WireMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (m.role === "user" && m.images && m.images.length) {
    return {
      role: "user",
      content: [
        { type: "text", text: m.content },
        ...m.images.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "auto" as const } })),
      ],
    };
  }
  return { role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
}

// Cheap, non-streamed follow-up: 2–3 tappable quick replies in the user's language.
async function generateChips(
  client: OpenAI,
  userText: string,
  assistantText: string,
  cart: CartItem[],
  profile?: WireProfile
): Promise<string[]> {
  if (!assistantText && !userText) return [];
  const completion = await client.chat.completions.create({
    model: CHIP_MODEL,
    max_tokens: 90,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate quick-reply chips for a Sri Lankan shopping assistant. Given the last exchange, return JSON {\"chips\": string[]} with 2-3 SHORT (<=6 words) replies the shopper would plausibly tap next to keep shopping or move toward checkout. Write them in the SAME language/script the user used (English, Sinhala, or Tanglish). No numbering, no quotes inside. If nothing useful, return {\"chips\":[]}.",
      },
      {
        role: "user",
        content: `Context: ${buildChipContext(cart, profile)}\nUser said: ${userText}\nKapri replied: ${assistantText.slice(0, 600)}`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  const chips = Array.isArray(parsed?.chips) ? parsed.chips : [];
  return chips
    .filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0)
    .slice(0, 3)
    .map((c: string) => c.trim().slice(0, 60));
}

export async function POST(req: NextRequest) {
  let body: { messages?: WireMessage[]; cart?: CartItem[]; currency?: string; profile?: WireProfile };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const history = (body.messages || []).slice(-24);
  const currency = body.currency || "LKR";
  const profile = body.profile;
  const ctx: AgentContext = {
    cart: Array.isArray(body.cart) ? structuredClone(body.cart) : [],
    currency,
  };

  const encoder = new TextEncoder();
  const today = todayInColombo();
  const lastUser = [...history].reverse().find((m) => m.role === "user");

  const oaMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "system", content: buildContextMessage(ctx.cart, today, profile) },
    ...history.map(toOpenAIMessage),
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      if (!process.env.OPENAI_API_KEY) {
        send({
          type: "error",
          value:
            "Kapri isn't fully set up yet — the server is missing its OPENAI_API_KEY. Add it to the environment and reload.",
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let finalText = "";

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const completion = await client.chat.completions.create({
            model: MODEL,
            messages: oaMessages,
            tools: TOOLS,
            tool_choice: "auto",
            stream: true,
          });

          let content = "";
          const toolCalls: { id: string; name: string; args: string }[] = [];
          finalText = "";

          for await (const chunk of completion) {
            const choice = chunk.choices[0];
            if (!choice) continue;
            const delta = choice.delta;
            if (delta?.content) {
              content += delta.content;
              send({ type: "text", value: delta.content });
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) toolCalls[idx] = { id: "", name: "", args: "" };
                if (tc.id) toolCalls[idx].id = tc.id;
                if (tc.function?.name) toolCalls[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
              }
            }
          }

          const calls = toolCalls.filter((t) => t.name);
          if (calls.length === 0) {
            finalText = content; // model produced a final answer
            break;
          }

          oaMessages.push({
            role: "assistant",
            content: content || null,
            tool_calls: calls.map((t) => ({
              id: t.id,
              type: "function",
              function: { name: t.name, arguments: t.args || "{}" },
            })),
          });

          for (const t of calls) {
            send({ type: "tool", tool: t.name, status: "running" });
            let parsed: any = {};
            try {
              parsed = JSON.parse(t.args || "{}");
            } catch {
              parsed = {};
            }
            let exec;
            try {
              exec = await executeTool(t.name, parsed, ctx);
            } catch (e: any) {
              exec = { result: `Tool ${t.name} failed: ${e?.message || "error"}`, cards: [] as const };
            }
            for (const card of exec.cards) send({ type: "ui", card });
            oaMessages.push({ role: "tool", tool_call_id: t.id, content: exec.result });
          }

          // refresh the live-context system message with the updated cart
          oaMessages[1] = { role: "system", content: buildContextMessage(ctx.cart, today, profile) };
        }

        // Suggestion chips: one cheap, best-effort call. Never block the reply.
        try {
          const chips = await generateChips(client, lastUser?.content || "", finalText, ctx.cart, profile);
          if (chips.length) send({ type: "chips", values: chips });
        } catch {
          /* chips are optional — ignore failures */
        }

        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", value: e?.message || "Something went wrong while Kapri was thinking." });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
