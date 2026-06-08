# Kapri 🇱🇰 — Sri Lanka's warmest AI shopping concierge

A full-screen, chat-first shopping experience built on the **[Kapruka MCP](https://mcp.kapruka.com/)** for the Kapruka Agent Challenge 2026.

Kapri helps you discover the perfect gift, shows products as rich visual cards, quotes
delivery to any Sri Lankan city, builds a multi-item cart, and takes you all the way to a
working guest checkout with a pay link — in **English, Tanglish, or Sinhala (සිංහල)**.

## Highlights

- **Full-screen conversational UI** with streaming replies and generative product cards (carousels, detail views, delivery quotes, animated order confirmation).
- **A live cart** that the agent and the user both control, persisted across reloads.
- **End-to-end**: discovery → cart → recipient/delivery/date validation → gift message → real Kapruka pay link → order tracking.
- **Trilingual**: replies in whatever you write, including Sinhala script.
- **Resilient search**: the Kapruka catalog search is keyword-quirky (e.g. "cake" can return nothing), so Kapri automatically retries with synonyms and falls back to category browsing.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- **OpenAI API** (function-calling + streaming) driving the agent loop
- A dependency-free **Kapruka MCP client** (`lib/kapruka.ts`) speaking the MCP Streamable-HTTP transport
- Custom SSE protocol → React generative UI (no chat-framework lock-in)

## Run locally

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

### Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI key. |
| `OPENAI_MODEL` | — | `gpt-4o` | Any tool-calling + streaming model (`gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, …). |
| `KAPRUKA_MCP_URL` | — | `https://mcp.kapruka.com/mcp` | Override the MCP endpoint. |

## Deploy (Vercel)

1. Push to a Git repo and import into Vercel.
2. Add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in **Project → Settings → Environment Variables**.
3. Deploy. The `/api/chat` route streams Server-Sent Events; the agent loop can run several
   tool calls per turn, so allow up to ~60s of execution (`maxDuration` is set in the route —
   Vercel Pro honours it; on Hobby keep turns short).

## How it works

```
Browser (Chat.tsx)  ──POST /api/chat──▶  Agent loop (OpenAI + tools)
   ▲   SSE: text deltas + UI cards            │  executes tools
   │                                          ▼
   └──────── generative UI cards ◀──── Kapruka MCP (search/delivery/order/track)
```

Tools exposed to the model: `search_products`, `get_product`, `list_categories`,
`list_delivery_cities`, `check_delivery`, `add_to_cart`, `remove_from_cart`, `view_cart`,
`create_order`, `track_order`. Each returns both a concise text result (for the model) and a
structured card (for the UI).

> Built with care for the Kapruka tech team. Be gentle with the live order tools 🙏
