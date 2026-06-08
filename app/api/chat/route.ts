import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { TOOLS, executeTool, type AgentContext } from "@/lib/agent";
import { buildSystemPrompt, buildContextMessage } from "@/lib/prompt";
import type { CartItem, StreamEvent, WireMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_TURNS = 8;

function todayInColombo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

export async function POST(req: NextRequest) {
  let body: { messages?: WireMessage[]; cart?: CartItem[]; currency?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const history = (body.messages || []).slice(-24);
  const currency = body.currency || "LKR";
  const ctx: AgentContext = {
    cart: Array.isArray(body.cart) ? structuredClone(body.cart) : [],
    currency,
  };

  const encoder = new TextEncoder();
  const today = todayInColombo();

  const oaMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "system", content: buildContextMessage(ctx.cart, today) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
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
          if (calls.length === 0) break; // model produced a final answer

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
          oaMessages[1] = { role: "system", content: buildContextMessage(ctx.cart, today) };
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
