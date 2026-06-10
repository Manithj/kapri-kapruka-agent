# Kapri 🇱🇰 — Sri Lanka's warmest AI shopping concierge

A full-screen, chat-first shopping experience built on the **[Kapruka MCP](https://mcp.kapruka.com/)** for the Kapruka Agent Challenge 2026.

Kapri helps you discover the perfect gift, shows products as rich visual cards, quotes
delivery to any Sri Lankan city, builds a multi-item cart, and takes you all the way to a
working guest checkout with a pay link — in **English, Tanglish, or Sinhala (සිංහල)**.

## Highlights

- **Full-screen conversational UI** with streaming replies and generative product cards (carousels, detail views, delivery quotes, animated order confirmation + confetti).
- **Photo search** — attach or paste a photo and Kapri identifies the product and searches for it.
- **Gift Bundle Builder** — describe an occasion and budget, get a curated multi-item bundle with reasons, total-vs-budget bar, and "Add all to cart" in one tap.
- **Product compare** — when torn between two items, Kapri lines them up side-by-side.
- **Kapri remembers** — recipients, occasions, city, language, and budget are saved locally and woven into every response ("Kapri will remember that ✨").
- **Occasion calendar** — upcoming personal occasions + 2026 Sri Lankan holidays shown as "Coming up" chips so you never miss a gifting moment.
- **Suggestion chips** — 2–3 smart quick-replies generated after each response, translated to your language.
- **Icing preview** — live cake-message preview with Sinhala script rendered natively (`Noto Sans Sinhala`), directly in the product card and cart.
- **Animated Kapri avatar** — reacts to idle / thinking / searching / found / celebrating states in real time.
- **Order history** — past orders saved locally with Track and Re-order shortcuts.
- **Live cart** with a budget progress bar, icing edits, and persistence across reloads.
- **End-to-end**: discovery → compare → bundle → cart → recipient/delivery/date → icing → real Kapruka pay link → countdown timer → tracking.
- **Trilingual**: English, Tanglish, Sinhala (සිංහල) — replies in whatever you write.
- **Resilient search**: Kapri retries with synonyms and falls back to category browsing when the catalog returns zero results.
- **PWA-ready**: installable on mobile with a custom ක icon and standalone display.
- **Accessible**: `aria-live` conversation log, focus-trapped drawers, full `prefers-reduced-motion` support.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **OpenAI API** — gpt-4o function-calling + streaming agent loop; gpt-4o-mini for suggestion chips
- A dependency-free **Kapruka MCP client** (`lib/kapruka.ts`) — jittered retry, stale-on-error cache, session reconnect
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
| `OPENAI_CHIP_MODEL` | — | `gpt-4o-mini` | Model used for the post-reply suggestion chips call. |
| `KAPRUKA_MCP_URL` | — | `https://mcp.kapruka.com/mcp` | Override the MCP endpoint. |

## Deploy (Vercel)

1. Push to a Git repo and import into Vercel.
2. Add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in **Project → Settings → Environment Variables**.
3. Deploy. The `/api/chat` route streams SSE; the agent loop can run several tool calls per turn, so allow up to ~60s (`maxDuration` is set in the route — Vercel Pro honours it; on Hobby keep turns short).

## How it works

```
Browser (Chat.tsx)  ──POST /api/chat──▶  Agent loop (OpenAI + tools)
   ▲   SSE: text │ ui │ chips │ done          │  executes tools in parallel
   │                                          ▼
   └──── generative UI cards  ◀──── Kapruka MCP (search/delivery/order/track)
         + suggestion chips
         + profile_op (silent state channel)
```

**Tools exposed to the model:**

| Tool | What it does |
|---|---|
| `search_products` | Keyword + filter search with synonym retry |
| `get_product` | Full product details + images |
| `list_categories` | Catalog category tree (fallback when search returns 0) |
| `list_delivery_cities` | Autocomplete city list |
| `check_delivery` | Delivery availability + date for a city |
| `add_to_cart` / `remove_from_cart` / `view_cart` | Cart mutations (silent UI cards) |
| `create_order` | Guest checkout → real Kapruka pay link |
| `track_order` | Live order status |
| `propose_bundle` | Curated multi-item gift bundle with budget awareness |
| `compare_products` | Side-by-side product comparison card |
| `remember` | Persist recipient / occasion / city / budget / language to local profile |

> Built with care for the Kapruka tech team. Be gentle with the live order tools 🙏
