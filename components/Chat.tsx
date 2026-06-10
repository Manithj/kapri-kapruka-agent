"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Package, ShoppingBag, Sparkles, SquarePen } from "lucide-react";
import Composer from "./Composer";
import CartDrawer from "./CartDrawer";
import OrdersPanel from "./OrdersPanel";
import KapriAvatar, { type AvatarState } from "./KapriAvatar";
import OccasionStrip from "./OccasionStrip";
import { CardRenderer } from "./Cards";
import RichText from "./RichText";
import { cartCount } from "@/lib/format";
import {
  loadProfile,
  saveProfile,
  applyProfileOp,
  logOrder,
  addOccasion,
  upcomingOccasions,
  profileToWire,
} from "@/lib/profile";
import type {
  BundleItem,
  CartItem,
  ChatMessage,
  KapriProfile,
  MessagePart,
  Product,
  StreamEvent,
  UICard,
  WireMessage,
} from "@/lib/types";

const SUGGESTIONS = [
  "🎂 Birthday gift under Rs 5,000",
  "🌹 Red roses to Colombo",
  "📱 Looking for a Samsung phone",
  "🎁 Surprise gift for my amma",
  "සිංහලෙන් කතා කරමු",
];

let idSeq = 0;
const nextId = () => `m${Date.now()}_${idSeq++}`;

/* Summaries appended to assistant wire history so the model remembers what the
   user is currently looking at (tool results aren't replayed otherwise). */
function noteForCard(card: UICard): string | null {
  switch (card.component) {
    case "products":
      return (
        "Products shown — " +
        card.data.products
          .slice(0, 12)
          .map((p) => `${p.name} (id:${p.id}, ${p.price.currency} ${p.price.amount ?? "?"})`)
          .join("; ")
      );
    case "product": {
      const p = card.data.product;
      return `Product detail — ${p.name} (id:${p.id}, ${p.price.currency} ${p.price.amount ?? "?"})`;
    }
    case "delivery":
      return `Delivery quote — ${card.data.city} ${card.data.checked_date ?? ""}: ${
        card.data.available ? `available, fee ${card.data.currency} ${card.data.rate}` : "not available"
      }`;
    case "order":
      return `Order created — ref ${card.data.order_ref}, total ${card.data.summary?.currency} ${card.data.summary?.grand_total}`;
    case "tracking":
      return `Tracking — order ${card.data.order_number}: ${card.data.status_display || card.data.status}`;
    case "cart":
      return `Cart — ${card.data.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "empty"}`;
    case "categories":
      return `Categories listed: ${card.data.categories.map((c) => c.name).join(", ")}`;
    case "cities":
      return `Cities listed: ${card.data.cities.map((c) => c.name).join(", ")}`;
    case "bundle":
      return (
        `Bundle "${card.data.title}" shown (${card.data.currency} ${card.data.total} total) — ` +
        card.data.items.map((i) => `${i.quantity}× ${i.product.name} (id:${i.product.id})`).join("; ")
      );
    case "compare":
      return (
        "Comparison shown — " +
        card.data.products.map((p) => `${p.name} (id:${p.id}, ${p.price.currency} ${p.price.amount ?? "?"})`).join("; ")
      );
    default:
      return null;
  }
}

function toWire(msgs: ChatMessage[]): WireMessage[] {
  // Only the latest user message keeps its image bytes (bounds payload + vision tokens).
  let lastUserIdx = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  return msgs.map((m, idx) => {
    const text = m.parts
      .filter((p): p is Extract<MessagePart, { kind: "text" }> => p.kind === "text")
      .map((p) => p.text)
      .join("");
    if (m.role === "user") {
      const images =
        idx === lastUserIdx
          ? (m.parts.filter((p) => p.kind === "image") as Extract<MessagePart, { kind: "image" }>[]).map((p) => p.url)
          : [];
      const content = text || (images.length ? "(see attached photo)" : "(empty)");
      return images.length ? { role: "user", content, images } : { role: "user", content };
    }
    const notes = m.parts
      .filter((p): p is Extract<MessagePart, { kind: "card" }> => p.kind === "card")
      .map((p) => noteForCard(p.card))
      .filter(Boolean) as string[];
    const content =
      (text + (notes.length ? `\n\n[Visuals shown to the user now:\n${notes.join("\n")}]` : "")).trim() ||
      "(showed visual cards)";
    return { role: "assistant", content };
  });
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<KapriProfile>(() => ({ v: 1, recipients: [], occasions: [], orders: [] }));
  const [streaming, setStreaming] = useState(false);
  const [toolRunning, setToolRunning] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [foundPulse, setFoundPulse] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; image?: string | null } | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<CartItem[]>(cart);
  cartRef.current = cart;
  const profileRef = useRef<KapriProfile>(profile);
  profileRef.current = profile;
  const prevCount = useRef(0);
  const foundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, image?: string | null) => {
    const id = Date.now();
    setToast({ id, text, image });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2300);
  }, []);

  // load / persist cart
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kapri_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kapri_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // load / persist the unified profile (memory, occasions, orders, budget)
  useEffect(() => {
    setProfile(loadProfile());
  }, []);
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, toolRunning, streaming]);

  // pop the cart badge whenever the item count grows
  useEffect(() => {
    const c = cartCount(cart);
    if (c > prevCount.current) setBadgeKey((k) => k + 1);
    prevCount.current = c;
  }, [cart]);

  const appendToAssistant = useCallback((id: string, fn: (parts: MessagePart[]) => MessagePart[]) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, parts: fn(m.parts) } : m)));
  }, []);

  const addProductToCart = useCallback(
    (p: Product, qty = 1, opts?: { icing_text?: string }) => {
      setCart((prev) => {
        const next = [...prev];
        const ex = next.find((c) => c.product_id === p.id);
        if (ex) {
          ex.quantity = Math.min(99, ex.quantity + qty);
          if (opts?.icing_text) ex.icing_text = opts.icing_text;
        } else
          next.push({
            product_id: p.id,
            name: p.name,
            image: p.image_url ?? null,
            price: p.price.amount,
            currency: p.price.currency,
            quantity: qty,
            icing_text: opts?.icing_text ?? null,
          });
        return next;
      });
      showToast(`Added ${p.name}`, p.image_url);
    },
    [showToast]
  );

  // Add a whole gift bundle at once.
  const addManyToCart = useCallback(
    (items: BundleItem[]) => {
      setCart((prev) => {
        const next = [...prev];
        for (const { product: p, quantity } of items) {
          const ex = next.find((c) => c.product_id === p.id);
          if (ex) ex.quantity = Math.min(99, ex.quantity + quantity);
          else
            next.push({
              product_id: p.id,
              name: p.name,
              image: p.image_url ?? null,
              price: p.price.amount,
              currency: p.price.currency,
              quantity,
              icing_text: null,
            });
        }
        return next;
      });
      showToast(`Added ${items.length} items to your cart 🎁`, items[0]?.product.image_url);
    },
    [showToast]
  );

  // Edit the icing message on a cart line (live preview in the drawer).
  const setIcing = useCallback((id: string, text: string) => {
    setCart((prev) =>
      prev.map((c) => (c.product_id === id ? { ...c, icing_text: text.trim() ? text : null } : c))
    );
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setToolRunning(null);
    setDrawerOpen(false);
    setOrdersOpen(false);
    setChips([]);
  }, []);

  const send = useCallback(
    async (text: string, images?: string[]) => {
      if (streaming) return;
      const userParts: MessagePart[] = [];
      if (text) userParts.push({ kind: "text", text });
      for (const url of images || []) userParts.push({ kind: "image", url });
      if (userParts.length === 0) return;
      const userMsg: ChatMessage = { id: nextId(), role: "user", parts: userParts };
      const assistantId = nextId();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", parts: [] };

      const wire = toWire([...messages, userMsg]);
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);
      setToolRunning(null);
      setChips([]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: wire,
            cart: cartRef.current,
            currency: "LKR",
            profile: profileToWire(profileRef.current, new Date().toISOString().slice(0, 10)),
          }),
        });
        if (!res.ok || !res.body) throw new Error(`Server responded ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handle = (ev: StreamEvent) => {
          if (ev.type === "text") {
            setToolRunning(null);
            appendToAssistant(assistantId, (parts) => {
              const out = [...parts];
              const last = out[out.length - 1];
              if (last && last.kind === "text") out[out.length - 1] = { kind: "text", text: last.text + ev.value };
              else out.push({ kind: "text", text: ev.value });
              return out;
            });
          } else if (ev.type === "tool") {
            setToolRunning(ev.tool);
          } else if (ev.type === "chips") {
            setChips(ev.values);
          } else if (ev.type === "ui") {
            if (ev.card.component === "cart_op") {
              setCart(ev.card.data.items);
              if (ev.card.data.op === "add") {
                const last = ev.card.data.items[ev.card.data.items.length - 1];
                showToast("Added to your cart 🛒", last?.image);
              }
            } else if (ev.card.component === "profile_op") {
              setProfile((p) => applyProfileOp(p, (ev.card as Extract<UICard, { component: "profile_op" }>).data));
              showToast("Kapri will remember that ✨");
            } else {
              setToolRunning(null);
              if (ev.card.component === "products" || ev.card.component === "bundle") {
                if (foundTimer.current) clearTimeout(foundTimer.current);
                setFoundPulse(true);
                foundTimer.current = setTimeout(() => setFoundPulse(false), 1600);
              }
              if (ev.card.component === "order") {
                const o = ev.card.data;
                setProfile((p) =>
                  logOrder(p, {
                    order_ref: o.order_ref,
                    placedAt: new Date().toISOString(),
                    total: o.summary?.grand_total ?? 0,
                    currency: o.summary?.currency ?? "LKR",
                    recipient: o.recipient?.name,
                    city: o.recipient?.city,
                    items: (o.items || []).map((it) => ({ name: it.name, quantity: it.quantity })),
                  })
                );
                if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
                setCelebrate(true);
                celebrateTimer.current = setTimeout(() => setCelebrate(false), 2500);
              }
              const card = ev.card;
              appendToAssistant(assistantId, (parts) => [...parts, { kind: "card", card }]);
            }
          } else if (ev.type === "error") {
            appendToAssistant(assistantId, (parts) => [...parts, { kind: "text", text: `⚠️ ${ev.value}` }]);
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = block.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              handle(JSON.parse(json) as StreamEvent);
            } catch {}
          }
        }
      } catch (e: any) {
        appendToAssistant(assistantId, (parts) => [
          ...parts,
          { kind: "text", text: `⚠️ Aiyo, something went wrong reaching Kapri. ${e?.message || ""}`.trim() },
        ]);
      } finally {
        setStreaming(false);
        setToolRunning(null);
      }
    },
    [messages, streaming, appendToAssistant, showToast]
  );

  const count = cartCount(cart);
  const empty = messages.length === 0;
  const today = new Date().toISOString().slice(0, 10);
  const occasions = useMemo(() => upcomingOccasions(profile, today, 30), [profile, today]);

  const avatarState: AvatarState = celebrate
    ? "celebrating"
    : foundPulse
    ? "found"
    : toolRunning && /search|get_product|list|propose_bundle|compare/.test(toolRunning)
    ? "searching"
    : streaming
    ? "thinking"
    : "idle";

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-cream-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={newChat} className="flex items-center gap-2.5 text-left" aria-label="Go to home">
            <KapriAvatar state={avatarState} size={36} className="shadow" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold text-emerald-ink">Kapri</p>
              <p className="text-[11px] text-ink/45">Your Kapruka gift concierge 🇱🇰</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {profile.orders.length > 0 ? (
              <button
                onClick={() => setOrdersOpen(true)}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-emerald-deep transition hover:bg-cream-200"
                aria-label="Open my orders"
              >
                <Package className="h-5 w-5" />
              </button>
            ) : null}
            {!empty ? (
              <button
                onClick={newChat}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-emerald-deep transition hover:bg-cream-200"
                aria-label="Start a new chat"
              >
                <SquarePen className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            ) : null}
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-emerald-deep transition hover:bg-cream-200"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span
                  key={badgeKey}
                  className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] animate-pop place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-emerald-ink"
                >
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Conversation with Kapri">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {empty ? (
            <Hero
              onPick={send}
              avatarState={avatarState}
              occasions={occasions}
              onAddOccasion={(o) => setProfile((p) => addOccasion(p, o))}
            />
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  streaming={streaming}
                  toolRunning={toolRunning}
                  avatarState={avatarState}
                  onAdd={addProductToCart}
                  onAddMany={addManyToCart}
                  onPrompt={send}
                />
              ))}
              {chips.length > 0 && !streaming ? (
                <div className="flex flex-wrap gap-2 pl-11 animate-fade-up">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => send(c)}
                      className="rounded-full border border-emerald-deep/15 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-deep shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-deep/40 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep/40"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-black/5 bg-cream-50/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Composer onSend={send} disabled={streaming} />
          <p className="mt-1.5 text-center text-[11px] text-ink/40">
            Kapri can make mistakes — confirm details before you pay. Powered by the Kapruka MCP.
          </p>
        </div>
      </div>

      {/* Add-to-cart toast */}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="animate-toast-in flex items-center gap-2.5 rounded-full border border-black/5 bg-white py-2 pl-2 pr-4 shadow-float">
            {toast.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={toast.image} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-soft">
                <Check className="h-4 w-4 text-emerald-deep" />
              </span>
            )}
            <span className="max-w-[220px] truncate text-sm font-medium text-ink">{toast.text}</span>
          </div>
        </div>
      ) : null}

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={cart}
        budget={profile.budget ?? null}
        onClearBudget={() => setProfile((p) => ({ ...p, budget: null }))}
        onQty={(id, delta) =>
          setCart((prev) =>
            prev
              .map((c) => (c.product_id === id ? { ...c, quantity: c.quantity + delta } : c))
              .filter((c) => c.quantity > 0)
          )
        }
        onRemove={(id) => setCart((prev) => prev.filter((c) => c.product_id !== id))}
        onIcing={setIcing}
        onCheckout={() => {
          setDrawerOpen(false);
          send("I'd like to checkout the items in my cart");
        }}
      />

      <OrdersPanel
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        orders={profile.orders}
        onTrack={(ref) => {
          setOrdersOpen(false);
          send(`Track my order ${ref}`);
        }}
        onReorder={(ref) => {
          setOrdersOpen(false);
          send(`I'd like to order the same items as order ${ref} again`);
        }}
      />
    </div>
  );
}

/* ---------- sub-views ---------- */

function MessageRow({
  message,
  isLast,
  streaming,
  toolRunning,
  avatarState,
  onAdd,
  onAddMany,
  onPrompt,
}: {
  message: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  toolRunning: string | null;
  avatarState: AvatarState;
  onAdd: (p: Product, qty?: number, opts?: { icing_text?: string }) => void;
  onAddMany: (items: BundleItem[]) => void;
  onPrompt: (t: string) => void;
}) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.kind === "text" ? p.text : "")).join("");
    const images = message.parts.filter((p) => p.kind === "image") as Extract<MessagePart, { kind: "image" }>[];
    return (
      <div className="flex flex-col items-end gap-1.5 animate-fade-up">
        {images.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {images.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={p.url}
                alt="Attached photo"
                className="h-28 w-28 rounded-2xl rounded-br-md object-cover shadow-card"
              />
            ))}
          </div>
        ) : null}
        {text ? (
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-deep px-4 py-2.5 text-[15px] leading-relaxed text-cream-50 shadow-card">
            <span className="whitespace-pre-wrap">{text}</span>
          </div>
        ) : null}
      </div>
    );
  }

  const showThinking = isLast && streaming && message.parts.length === 0;
  return (
    <div className="flex gap-3 animate-fade-up">
      <KapriAvatar state={isLast ? avatarState : "idle"} size={32} />
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.parts.map((part, i) =>
          part.kind === "text" ? (
            part.text.trim() ? (
              <div
                key={i}
                className="inline-block max-w-[92%] break-words rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-[15px] leading-relaxed text-ink shadow-card"
              >
                <RichText text={part.text} />
              </div>
            ) : null
          ) : part.kind === "card" ? (
            <div key={i}>
              <CardRenderer card={part.card} onAdd={onAdd} onAddMany={onAddMany} onPrompt={onPrompt} />
            </div>
          ) : null
        )}
        {(showThinking || (isLast && toolRunning)) && <Thinking tool={toolRunning} />}
      </div>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  search_products: "Searching the catalog",
  get_product: "Fetching product details",
  list_categories: "Browsing categories",
  list_delivery_cities: "Checking delivery cities",
  check_delivery: "Quoting delivery",
  add_to_cart: "Adding to your cart",
  remove_from_cart: "Updating your cart",
  view_cart: "Opening your cart",
  create_order: "Creating your order",
  track_order: "Tracking your order",
  propose_bundle: "Curating a gift bundle",
  compare_products: "Comparing your options",
  remember: "Making a note",
};

function Thinking({ tool }: { tool: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-ink/60 shadow-card">
      {tool ? (
        <>
          <Sparkles className="h-3.5 w-3.5 animate-bounce-sm text-gold" />
          <span>{TOOL_LABELS[tool] || "Working"}…</span>
        </>
      ) : (
        <span className="flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      )}
    </div>
  );
}

function Hero({
  onPick,
  avatarState,
  occasions,
  onAddOccasion,
}: {
  onPick: (t: string) => void;
  avatarState: AvatarState;
  occasions: { label: string; date: string; inDays: number; recipientName?: string; emoji?: string }[];
  onAddOccasion: (o: Omit<import("@/lib/types").ProfileOccasion, "id">) => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <KapriAvatar state={avatarState} size={64} className="mb-5 shadow-float" />
      <h1 className="font-display text-3xl font-semibold text-emerald-ink sm:text-4xl">
        Ayubowan 🙏 I'm Kapri
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink/60">
        Sri Lanka's warmest way to shop &amp; gift. Tell me who it's for and the occasion — I'll find
        something lovely and take you all the way to checkout. English, Tanglish, හෝ සිංහලෙන්.
      </p>
      <OccasionStrip occasions={occasions} onPick={onPick} onAdd={onAddOccasion} />
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-emerald-deep/15 bg-white px-4 py-2 text-sm font-medium text-emerald-deep shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-deep/40 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
