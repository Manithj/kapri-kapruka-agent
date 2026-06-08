"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { formatMoney, cartTotal } from "@/lib/format";
import type { Product, UICard } from "@/lib/types";

/* ---------- shared bits ---------- */

function Img({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-emerald-soft text-emerald-deep/40 ${className}`}>
        <Package className="h-8 w-8" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={className}
    />
  );
}

function StockBadge({ inStock, level }: { inStock?: boolean; level?: string }) {
  if (inStock === false) {
    return <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">Out of stock</span>;
  }
  if (level === "low") {
    return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-[#9a7a2c]">Only a few left</span>;
  }
  return <span className="rounded-full bg-emerald-soft px-2 py-0.5 text-[11px] font-medium text-emerald-deep">In stock</span>;
}

interface CardActions {
  onAdd?: (p: Product) => void;
  onPrompt?: (text: string) => void;
}

/* ---------- product card (used in carousel) ---------- */

function ProductCard({ p, onAdd }: { p: Product; onAdd?: (p: Product) => void }) {
  const discounted = p.compare_at_price?.amount && p.price.amount && p.compare_at_price.amount > p.price.amount;
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    if (p.in_stock === false) return;
    onAdd?.(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };
  return (
    <div className="group flex w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card transition hover:shadow-float">
      <div className="relative aspect-square overflow-hidden bg-cream-200">
        <Img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {discounted ? (
          <span className="absolute left-2 top-2 rounded-full bg-clay px-2 py-0.5 text-[11px] font-semibold text-white shadow">
            Sale
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{p.name}</p>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="font-display text-base font-semibold text-emerald-deep">
            {formatMoney(p.price.amount, p.price.currency)}
          </span>
          {discounted ? (
            <span className="text-xs text-ink/40 line-through">
              {formatMoney(p.compare_at_price!.amount, p.compare_at_price!.currency)}
            </span>
          ) : null}
        </div>
        <div className="pt-0.5">
          <StockBadge inStock={p.in_stock} level={p.stock_level} />
        </div>
        <button
          onClick={handleAdd}
          disabled={p.in_stock === false}
          className={`mt-2 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            added ? "bg-gold text-emerald-ink" : "bg-emerald-deep text-cream-50 hover:bg-emerald-ink"
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4 animate-pop" /> Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ProductsCard({
  data,
  onAdd,
}: {
  data: { title?: string; products: Product[] };
  onAdd?: (p: Product) => void;
}) {
  return (
    <div className="animate-fade-up">
      {data.title ? (
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-deep">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="capitalize">{data.title}</span>
          <span className="text-ink/40">· {data.products.length} picks</span>
        </div>
      ) : null}
      <div className="snap-x-cards -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {data.products.map((p) => (
          <ProductCard key={p.id} p={p} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

/* ---------- product detail ---------- */

function ProductDetailCard({ data, onAdd }: { data: { product: Product }; onAdd?: (p: Product) => void }) {
  const p = data.product;
  const [active, setActive] = useState(0);
  const imgs = p.images && p.images.length ? p.images : p.image_url ? [p.image_url] : [];
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-2">
          <div className="aspect-square overflow-hidden rounded-xl bg-cream-200">
            <Img src={imgs[active]} alt={p.name} className="h-full w-full object-cover" />
          </div>
          {imgs.length > 1 ? (
            <div className="flex gap-1.5">
              {imgs.slice(0, 5).map((u, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-10 w-10 overflow-hidden rounded-lg border ${
                    i === active ? "border-emerald-deep" : "border-black/5"
                  }`}
                >
                  <Img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="font-display text-lg font-semibold leading-tight text-ink">{p.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-xl font-semibold text-emerald-deep">
              {formatMoney(p.price.amount, p.price.currency)}
            </span>
            <StockBadge inStock={p.in_stock} level={p.stock_level} />
          </div>
          {p.description ? (
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink/70">
              {p.description.replace(/\s+/g, " ").trim()}
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            <button
              onClick={() => onAdd?.(p)}
              disabled={p.in_stock === false}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-deep px-4 py-2 text-sm font-medium text-cream-50 transition hover:bg-emerald-ink disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-cream-200"
              >
                View on Kapruka <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- categories ---------- */

function CategoriesCard({ data, onPrompt }: { data: { categories: { name: string }[] }; onPrompt?: (t: string) => void }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-black/5 bg-white p-4 shadow-card">
      <p className="mb-2 text-sm font-medium text-emerald-deep">Browse by category</p>
      <div className="flex flex-wrap gap-2">
        {data.categories.map((c) => (
          <button
            key={c.name}
            onClick={() => onPrompt?.(`Show me some ${c.name.toLowerCase()}`)}
            className="rounded-full border border-emerald-deep/15 bg-emerald-soft/60 px-3 py-1.5 text-sm font-medium capitalize text-emerald-deep transition hover:bg-emerald-deep hover:text-cream-50"
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- cities ---------- */

function CitiesCard({
  data,
  onPrompt,
}: {
  data: { query?: string; cities: { name: string }[] };
  onPrompt?: (t: string) => void;
}) {
  return (
    <div className="animate-fade-up rounded-2xl border border-black/5 bg-white p-4 shadow-card">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-deep">
        <MapPin className="h-4 w-4 text-gold" /> Delivery cities {data.query ? `matching "${data.query}"` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {data.cities.map((c) => (
          <button
            key={c.name}
            onClick={() => onPrompt?.(`Deliver to ${c.name}`)}
            className="rounded-full border border-black/10 bg-cream-100 px-3 py-1.5 text-sm font-medium text-ink/80 transition hover:border-emerald-deep hover:text-emerald-deep"
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- delivery quote ---------- */

function DeliveryCard({ data }: { data: Extract<UICard, { component: "delivery" }>["data"] }) {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className={`flex items-center gap-2 px-4 py-2.5 ${data.available ? "bg-emerald-soft" : "bg-clay/10"}`}>
        {data.available ? <Truck className="h-4 w-4 text-emerald-deep" /> : <Clock className="h-4 w-4 text-clay" />}
        <span className={`text-sm font-semibold ${data.available ? "text-emerald-deep" : "text-clay"}`}>
          {data.available ? "Delivery available" : "Not available that day"}
        </span>
      </div>
      <div className="space-y-1.5 p-4 text-sm">
        <Row label="City" value={data.city} />
        {data.checked_date ? <Row label="Date" value={data.checked_date} /> : null}
        {data.available ? (
          <Row label="Delivery fee" value={<span className="font-semibold text-emerald-deep">{formatMoney(data.rate, data.currency)}</span>} />
        ) : (
          <>
            {data.reason ? <Row label="Reason" value={data.reason} /> : null}
            {data.next_available_date ? <Row label="Next available" value={data.next_available_date} /> : null}
          </>
        )}
        {data.perishable_warning ? (
          <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-[13px] text-[#8a6d24]">⚠️ {data.perishable_warning}</p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/50">{label}</span>
      <span className="text-right text-ink/90">{value}</span>
    </div>
  );
}

/* ---------- cart card (inline) ---------- */

function CartCard({
  data,
  onPrompt,
}: {
  data: { items: import("@/lib/types").CartItem[] };
  onPrompt?: (t: string) => void;
}) {
  const items = data.items;
  const currency = items[0]?.currency ?? "LKR";
  if (items.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-black/5 bg-white p-5 text-center text-sm text-ink/60 shadow-card">
        Your cart is empty for now. Tell me what you're looking for!
      </div>
    );
  }
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="flex items-center gap-2 bg-emerald-soft px-4 py-2.5 text-sm font-semibold text-emerald-deep">
        <ShoppingBag className="h-4 w-4" /> Your cart
      </div>
      <div className="divide-y divide-black/5">
        {items.map((it) => (
          <div key={it.product_id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
              <Img src={it.image} alt={it.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">{it.name}</p>
              {it.icing_text ? <p className="text-xs text-ink/50">Icing: “{it.icing_text}”</p> : null}
              <p className="text-xs text-ink/50">Qty {it.quantity}</p>
            </div>
            <span className="text-sm font-semibold text-emerald-deep">{formatMoney((it.price ?? 0) * it.quantity, it.currency)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-ink/60">Subtotal</span>
        <span className="font-display text-lg font-semibold text-emerald-deep">{formatMoney(cartTotal(items), currency)}</span>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => onPrompt?.("I'd like to checkout")}
          className="w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-emerald-ink transition hover:brightness-105"
        >
          Proceed to checkout →
        </button>
      </div>
    </div>
  );
}

/* ---------- order confirmation ---------- */

function OrderCard({ data }: { data: Extract<UICard, { component: "order" }>["data"] }) {
  const s = data.summary;
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-float">
      <div className="bg-gradient-to-r from-emerald-deep to-emerald-ink px-5 py-4 text-cream-50">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-gold-soft" />
          <span className="font-display text-lg font-semibold">Order ready to pay</span>
        </div>
        <p className="mt-0.5 text-sm text-cream-50/80">
          Ref {data.order_ref}
          {data.recipient?.name ? ` · for ${data.recipient.name}` : ""}
          {data.recipient?.city ? ` · ${data.recipient.city}` : ""}
        </p>
      </div>
      {data.items && data.items.length ? (
        <div className="divide-y divide-black/5">
          {data.items.map((it) => (
            <div key={it.product_id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-cream-200">
                <Img src={it.image} alt={it.name} className="h-full w-full object-cover" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{it.quantity}× {it.name}</span>
              <span className="text-sm text-ink/70">{formatMoney((it.price ?? 0) * it.quantity, it.currency)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-1 px-5 py-3 text-sm">
        {s ? (
          <>
            <Row label="Items" value={formatMoney(s.items_total, s.currency)} />
            <Row label="Delivery" value={formatMoney(s.delivery_fee, s.currency)} />
            {s.addons_total ? <Row label="Add-ons" value={formatMoney(s.addons_total, s.currency)} /> : null}
            <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-2">
              <span className="font-medium">Grand total</span>
              <span className="font-display text-xl font-semibold text-emerald-deep">{formatMoney(s.grand_total, s.currency)}</span>
            </div>
          </>
        ) : null}
      </div>
      <div className="px-5 pb-5">
        <a
          href={data.checkout_url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-base font-semibold text-emerald-ink shadow transition hover:brightness-105"
        >
          Pay now <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-2 text-center text-xs text-ink/50">
          Secure Kapruka guest checkout · link expires in ~60 minutes
        </p>
      </div>
    </div>
  );
}

/* ---------- order tracking ---------- */

function TrackingCard({ data }: { data: Extract<UICard, { component: "tracking" }>["data"] }) {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="flex items-center justify-between bg-emerald-soft px-4 py-2.5">
        <span className="text-sm font-semibold text-emerald-deep">Order {data.order_number}</span>
        <span className="rounded-full bg-emerald-deep px-2.5 py-0.5 text-xs font-medium text-cream-50">
          {data.status_display || data.status}
        </span>
      </div>
      <div className="p-4 text-sm">
        {data.delivery_date ? <Row label="Delivery date" value={data.delivery_date} /> : null}
        {data.recipient?.name ? <Row label="Recipient" value={data.recipient.name} /> : null}
        {data.recipient?.city ? <Row label="City" value={data.recipient.city} /> : null}
        {data.amount ? <Row label="Amount" value={`Rs ${data.amount}`} /> : null}

        {data.progress && data.progress.length ? (
          <ol className="mt-3 space-y-2 border-l-2 border-emerald-soft pl-4">
            {data.progress.map((p, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full bg-emerald-deep">
                  <Check className="h-2 w-2 text-cream-50" />
                </span>
                <p className="text-[13px] font-medium text-ink">{p.step}</p>
                <p className="text-xs text-ink/50">{p.timestamp}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- checkout form ---------- */

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink/60">
        {label} {required ? <span className="text-clay">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-black/10 bg-cream-50 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald-deep/50 focus:bg-white";

function CheckoutFormCard({
  data,
  onSubmit,
}: {
  data: Extract<UICard, { component: "checkout_form" }>["data"];
  onSubmit?: (text: string) => void;
}) {
  const pre = data.prefill || {};
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    recipient_name: pre.recipient_name || "",
    phone: "",
    address: "",
    city: pre.city || "",
    date: pre.date || "",
    location_type: "house",
    sender_name: "",
    anonymous: false,
    gift_message: "",
    instructions: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF((s) => ({ ...s, [k]: v }));

  const valid =
    f.recipient_name.trim() &&
    f.phone.trim() &&
    f.address.trim() &&
    f.city.trim() &&
    f.date.trim() &&
    (f.anonymous || f.sender_name.trim());

  function submit() {
    if (!valid) return;
    const msg = [
      "Here are my checkout details:",
      `- Recipient: ${f.recipient_name}, phone ${f.phone}`,
      `- Deliver to: ${f.address}, ${f.city} on ${f.date} (${f.location_type})`,
      `- Sender: ${f.anonymous ? "Anonymous" : f.sender_name}`,
      f.gift_message.trim() ? `- Gift message: ${f.gift_message.trim()}` : null,
      f.instructions.trim() ? `- Delivery instructions: ${f.instructions.trim()}` : null,
      "Please validate the city and date, then place the order.",
    ]
      .filter(Boolean)
      .join("\n");
    onSubmit?.(msg);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="animate-fade-up flex items-center gap-2 rounded-2xl border border-emerald-deep/20 bg-emerald-soft px-4 py-3 text-sm font-medium text-emerald-deep">
        <Check className="h-4 w-4" /> Details submitted — Kapri is placing your order…
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="flex items-center gap-2 bg-emerald-soft px-4 py-2.5 text-sm font-semibold text-emerald-deep">
        <Truck className="h-4 w-4" /> Delivery &amp; gift details
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Recipient name" required>
          <input className={inputCls} value={f.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} placeholder="e.g. Amma" />
        </Field>
        <Field label="Recipient phone" required>
          <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="077XXXXXXX" inputMode="tel" />
        </Field>
        <Field label="Delivery address" required className="sm:col-span-2">
          <input className={inputCls} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="No 12, Galle Road" />
        </Field>
        <Field label="City" required>
          <input className={inputCls} value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Colombo 03" />
        </Field>
        <Field label="Delivery date" required>
          <input type="date" min={today} className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Location type">
          <select className={inputCls} value={f.location_type} onChange={(e) => set("location_type", e.target.value)}>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Sender name" required={!f.anonymous}>
          <input
            className={inputCls}
            value={f.sender_name}
            onChange={(e) => set("sender_name", e.target.value)}
            placeholder="Your name"
            disabled={f.anonymous}
          />
        </Field>
        <Field label="Gift message" className="sm:col-span-2">
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            maxLength={300}
            value={f.gift_message}
            onChange={(e) => set("gift_message", e.target.value)}
            placeholder="Happy Birthday Amma, with all my love 💛"
          />
        </Field>
        <Field label="Delivery instructions (optional)" className="sm:col-span-2">
          <input className={inputCls} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Call before delivery" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-2">
          <input type="checkbox" checked={f.anonymous} onChange={(e) => set("anonymous", e.target.checked)} className="h-4 w-4 accent-emerald-deep" />
          Sign the gift card as “Anonymous”
        </label>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={submit}
          disabled={!valid}
          className="w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-emerald-ink transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Review &amp; place order →
        </button>
      </div>
    </div>
  );
}

/* ---------- renderer ---------- */

export function CardRenderer({ card, onAdd, onPrompt }: { card: UICard } & CardActions) {
  switch (card.component) {
    case "products":
      return <ProductsCard data={card.data} onAdd={onAdd} />;
    case "product":
      return <ProductDetailCard data={card.data} onAdd={onAdd} />;
    case "categories":
      return <CategoriesCard data={card.data} onPrompt={onPrompt} />;
    case "cities":
      return <CitiesCard data={card.data} onPrompt={onPrompt} />;
    case "delivery":
      return <DeliveryCard data={card.data} />;
    case "cart":
      return <CartCard data={card.data} onPrompt={onPrompt} />;
    case "order":
      return <OrderCard data={card.data} />;
    case "tracking":
      return <TrackingCard data={card.data} />;
    case "checkout_form":
      return <CheckoutFormCard data={card.data} onSubmit={onPrompt} />;
    case "cart_op":
      // cart_op mutates the live cart drawer; nothing inline to render.
      return null;
    default:
      return null;
  }
}

export { X };
