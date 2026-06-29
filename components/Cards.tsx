"use client";

import { useEffect, useRef, useState } from "react";
import {
  Apple,
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Cake,
  CakeSlice,
  Camera,
  Candy,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Cookie,
  Crown,
  Dumbbell,
  ExternalLink,
  Flower2,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Grid3x3,
  HandHeart,
  Heart,
  HeartHandshake,
  Home,
  Laptop,
  Leaf,
  MapPin,
  Milk,
  Package,
  PackageCheck,
  PartyPopper,
  PawPrint,
  Plus,
  Ribbon,
  Scale,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Smile,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  Tag,
  Truck,
  User,
  Users,
  Utensils,
  Watch,
  Wine,
  X,
} from "lucide-react";
import { formatMoney, cartTotal, isCake, isPersonalizable, needsPhoto, customTextLabel } from "@/lib/format";
import IcingPreview from "./IcingPreview";
import Confetti from "./Confetti";
import type { BundleItem, Product, UICard } from "@/lib/types";

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
      draggable={false}
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
  onAdd?: (p: Product, qty?: number, opts?: { icing_text?: string; custom_text?: string; custom_photo?: string }) => void;
  onAddMany?: (items: BundleItem[]) => void;
  // wireText (optional) is sent to the model in place of the visible bubble text.
  onPrompt?: (text: string, wireText?: string) => void;
}

/* Click-and-drag ("grab") horizontal scrolling for the product carousel on
   desktop — touch devices already swipe natively. While dragging we disable
   scroll-snap and text selection so the motion is smooth, and we swallow the
   click that follows a real drag so it doesn't trigger a card button. */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;
    let dragged = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // left mouse only
      down = true;
      dragged = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      // NOTE: do NOT capture the pointer here — that would steal the click from
      // child buttons (Details / +). We only capture once a real drag begins.
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) > 4) {
        dragged = true;
        el.setPointerCapture(e.pointerId); // capture only now that we're dragging
        el.style.userSelect = "none";
        el.style.cursor = "grabbing";
        el.style.scrollSnapType = "none";
      }
      if (dragged) {
        e.preventDefault();
        el.scrollLeft = startScroll - dx;
      }
    };
    const endDrag = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      el.style.userSelect = "";
      el.style.cursor = "";
      el.style.scrollSnapType = "";
      // suppress the click that fires right after a real drag, then reset
      if (dragged) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", swallow, true), 0);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
    };
  }, []);
  return ref;
}

/* ---------- product card (used in carousel) ---------- */

// "Choose-your-amount" products (gift vouchers / gift cards) ship many price
// denominations as variants, but search only exposes the base price. Detected by
// name/category since the search result carries no variant signal.
function isChooseAmount(p: Product): boolean {
  return /gift\s*voucher|e-?\s*gift|gift\s*card|gift\s*cert/i.test(`${p.name} ${p.category?.name ?? ""}`);
}

// Whether a quick-add (+) should instead open the detail view: vouchers (pick a
// denomination) and personalizable products (add a name/message/photo).
function shouldOpenDetail(p: Product): boolean {
  return isChooseAmount(p) || isPersonalizable(p);
}

function ProductCard({
  p,
  onAdd,
  onPrompt,
}: {
  p: Product;
  onAdd?: (p: Product) => void;
  onPrompt?: (t: string) => void;
}) {
  const discounted = p.compare_at_price?.amount && p.price.amount && p.compare_at_price.amount > p.price.amount;
  const [added, setAdded] = useState(false);
  // Vouchers open the detail view to pick a denomination; personalizable products
  // (name mugs, photo frames…) open it to collect a name/message/photo. Either
  // way the + opens details rather than quick-adding blind.
  const chooseAmount = isChooseAmount(p);
  const needsDetail = shouldOpenDetail(p);
  const handleAdd = () => {
    if (p.in_stock === false) return;
    if (needsDetail) {
      onPrompt?.(`Show me details for ${p.name}`);
      return;
    }
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
          {chooseAmount ? <span className="text-xs font-medium text-ink/50">from</span> : null}
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
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onPrompt?.(`Show me details for ${p.name}`)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white px-2 py-2 text-sm font-medium text-ink/70 transition hover:bg-cream-200"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleAdd}
            disabled={p.in_stock === false}
            aria-label={
              chooseAmount
                ? `Choose an amount for ${p.name}`
                : needsDetail
                ? `Personalize ${p.name}`
                : `Add ${p.name} to cart`
            }
            title={chooseAmount ? "Choose an amount" : needsDetail ? "Personalize first" : undefined}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-emerald-ink transition disabled:cursor-not-allowed disabled:opacity-40 ${
              added ? "bg-gold" : "bg-gold hover:brightness-110"
            }`}
          >
            {added ? <Check className="h-4 w-4 animate-pop" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsCard({
  data,
  onAdd,
  onPrompt,
}: {
  data: { title?: string; products: Product[]; query?: string; nextCursor?: string; maxPrice?: number; minPrice?: number };
  onAdd?: (p: Product) => void;
  onPrompt?: (t: string, wireText?: string) => void;
}) {
  const swipeable = data.products.length > 2;
  const dragRef = useDragScroll();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = () => {
    const el = dragRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };
  useEffect(() => {
    updateArrows();
    const el = dragRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.products.length]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = dragRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(220, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-deep">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="capitalize">{data.title ?? "Picks for you"}</span>
          <span className="text-ink/40">· {data.products.length} picks</span>
        </div>
        {swipeable ? (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-ink/35">
            Swipe <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="relative">
        {swipeable ? (
          <>
            <button
              onClick={() => scrollByCards(-1)}
              disabled={atStart}
              aria-label="Previous products"
              className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-deep text-white shadow-float ring-2 ring-white transition hover:bg-emerald-ink disabled:pointer-events-none disabled:opacity-0 md:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollByCards(1)}
              disabled={atEnd}
              aria-label="Next products"
              className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-deep text-white shadow-float ring-2 ring-white transition hover:bg-emerald-ink disabled:pointer-events-none disabled:opacity-0 md:grid"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <div
          ref={dragRef}
          className="snap-x-cards -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:cursor-grab md:active:cursor-grabbing"
        >
          {data.products.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={onAdd} onPrompt={onPrompt} />
          ))}
        </div>
      </div>
      {onPrompt && data.nextCursor && data.query ? (
        <div className="mt-1 text-center">
          <button
            onClick={() =>
              onPrompt(
                "Show me more",
                `Load more "${data.query}" — call search_products with q:"${data.query}"${
                  data.maxPrice != null ? ` max_price:${data.maxPrice}` : ""
                }${data.minPrice != null ? ` min_price:${data.minPrice}` : ""} cursor:"${data.nextCursor}" and show the next page.`
              )
            }
            className="rounded-full border border-emerald-deep/20 bg-white px-5 py-2 text-sm font-medium text-emerald-deep shadow-sm transition hover:bg-emerald-soft"
          >
            Load more products
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- product detail ---------- */

// The MCP reports weight as "0" for items with no real weight set — treat those
// (and blank values) as "no weight" so we don't show a meaningless "Weight: 0".
function hasWeight(w?: string | number | null): w is string | number {
  if (w == null) return false;
  const s = String(w).trim();
  return s !== "" && parseFloat(s) > 0;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-ink/50">{label}</span>
      <span className="text-right text-sm text-ink/90">{value}</span>
    </div>
  );
}

function ProductDetailCard({ data, onAdd }: { data: { product: Product }; onAdd?: CardActions["onAdd"] }) {
  const p = data.product;
  const [active, setActive] = useState(0);
  const [icing, setIcing] = useState("");
  // Selectable variant (e.g. gift-voucher denomination). Default to the first
  // in-stock variant so "Add to Basket" never silently adds an out-of-stock one.
  const variants = p.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(() => {
    if (!variants.length) return null;
    return (variants.find((v) => v.in_stock !== false) ?? variants[0]).id;
  });
  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;
  const cake = isCake(p);
  // Personalizable (non-cake) products: a custom-text field + optional photo.
  const personalizable = isPersonalizable(p);
  const photoItem = needsPhoto(p);
  const [customText, setCustomText] = useState("");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const imgs = p.images && p.images.length ? p.images : p.image_url ? [p.image_url] : [];
  const attrs = p.attributes;
  const hasDetails = attrs && (attrs.type || attrs.subtype || hasWeight(attrs.weight) || attrs.vendor);
  const name = p.name.replace(/\s+/g, " ").trim();
  // The price shown + added reflects the chosen variant when there is one.
  const shownPrice = selectedVariant?.price ?? p.price;
  const addDisabled = selectedVariant ? selectedVariant.in_stock === false : p.in_stock === false;
  // Build the cart item: a selected variant carries its own id/name/price so it
  // flows through checkout as that exact denomination.
  const handleAddToBasket = () => {
    const target: Product = selectedVariant
      ? { ...p, id: selectedVariant.id, name: selectedVariant.name, price: selectedVariant.price }
      : p;
    const opts: { icing_text?: string; custom_text?: string; custom_photo?: string } = {};
    if (cake && icing.trim()) opts.icing_text = icing.trim();
    if (personalizable && customText.trim()) opts.custom_text = customText.trim();
    if (personalizable && customPhoto) opts.custom_photo = customPhoto;
    onAdd?.(target, 1, Object.keys(opts).length ? opts : undefined);
  };

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      {/* gallery — full width */}
      <div className="p-3">
        {cake && icing.trim() ? (
          <IcingPreview image={imgs[active]} text={icing} className="aspect-[4/3] w-full rounded-xl" />
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream-200">
            <Img src={imgs[active]} alt={name} className="h-full w-full object-cover" />
            {imgs.length > 1 ? (
              <>
                <button
                  onClick={() => setActive((a) => Math.max(0, a - 1))}
                  disabled={active === 0}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow transition disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActive((a) => Math.min(imgs.length - 1, a + 1))}
                  disabled={active === imgs.length - 1}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow transition disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                  {active + 1} / {imgs.length}
                </span>
              </>
            ) : null}
          </div>
        )}
        {imgs.length > 1 ? (
          <div className="mt-2 flex gap-2">
            {imgs.slice(0, 5).map((u, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                  i === active ? "border-kapruka-purple" : "border-black/5"
                }`}
              >
                <Img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-4">
        {/* category + stock */}
        <div className="flex items-center gap-2">
          {p.category?.name ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{p.category.name}</span>
          ) : null}
          <StockBadge inStock={p.in_stock} level={p.stock_level} />
        </div>

        {/* name + id */}
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-kapruka-purple">{name}</h3>
        <p className="mt-0.5 font-mono text-[11px] text-ink/35">{p.id.toLowerCase()}</p>

        {/* price */}
        <p className="mt-2 font-display text-2xl font-semibold text-ink">
          {formatMoney(shownPrice.amount, shownPrice.currency)}
        </p>

        {/* description */}
        {p.description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{p.description.replace(/\s+/g, " ").trim()}</p>
        ) : null}

        {/* variants — selectable; the chosen one drives the price + Add to Basket */}
        {variants.length ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/45">
              Choose an option
            </p>
            <div className="space-y-2">
              {variants.map((v) => {
                const selected = v.id === variantId;
                const soldOut = v.in_stock === false;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => !soldOut && setVariantId(v.id)}
                    disabled={soldOut}
                    aria-pressed={selected}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      selected ? "border-kapruka-purple bg-kapruka-purple/5 ring-1 ring-kapruka-purple/30" : "border-black/10 hover:border-kapruka-purple/40"
                    } ${soldOut ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition ${
                          selected ? "border-kapruka-purple" : "border-black/25"
                        }`}
                      >
                        {selected ? <span className="h-2 w-2 rounded-full bg-kapruka-purple" /> : null}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{v.name}</p>
                        {hasWeight(v.attributes?.weight) ? (
                          <p className="text-xs text-ink/55">Weight: {v.attributes!.weight}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ink">{formatMoney(v.price.amount, v.price.currency)}</p>
                      {v.stock_level === "low" && !soldOut ? (
                        <p className="text-[11px] font-medium text-[#9a7a2c]">Low stock</p>
                      ) : soldOut ? (
                        <p className="text-[11px] font-medium text-clay">Out of stock</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* details */}
        {hasDetails ? (
          <div className="mt-4">
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink/45">Details</p>
            <div className="divide-y divide-black/5">
              {attrs?.type ? <DetailRow label="Type" value={attrs.type} /> : null}
              {attrs?.subtype ? <DetailRow label="Subtype" value={attrs.subtype} /> : null}
              {hasWeight(attrs?.weight) ? <DetailRow label="Weight" value={attrs!.weight} /> : null}
              {attrs?.vendor ? <DetailRow label="Vendor" value={attrs.vendor} /> : null}
            </div>
          </div>
        ) : null}

        {/* shipping */}
        {p.shipping && (p.shipping.ships_from || p.shipping.ships_internationally != null) ? (
          <div className="mt-4 rounded-xl border border-black/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Truck className="h-4 w-4 text-kapruka-purple" /> Shipping
            </div>
            {p.shipping.ships_from ? (
              <p className="text-sm text-ink/70">Ships from {p.shipping.ships_from}</p>
            ) : null}
            {p.shipping.ships_internationally != null ? (
              <p className="text-sm text-ink/70">
                {p.shipping.ships_internationally ? "International delivery available" : "Delivery within Sri Lanka only"}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* icing for cakes */}
        {cake ? (
          <label className="mt-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-ink/60">✍️ Icing message (preview updates live)</span>
            <input
              value={icing}
              onChange={(e) => setIcing(e.target.value.slice(0, 40))}
              placeholder="Happy Birthday Amma! · සුබ උපන්දිනයක්"
              className="w-full rounded-xl border border-black/10 bg-cream-50 px-3 py-2 text-sm outline-none transition focus:border-kapruka-purple/50 focus:bg-white"
            />
          </label>
        ) : null}

        {/* personalization for custom products (name/message + optional photo) */}
        {personalizable ? (
          <div className="mt-4 rounded-xl border border-kapruka-purple/25 bg-kapruka-purple/[0.04] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-kapruka-purple">
              <Sparkles className="h-4 w-4" /> Make it personal
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink/60">{customTextLabel(p)}</span>
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, 80))}
                placeholder={photoItem ? "e.g. Happy Birthday Amma!" : "e.g. Adithya"}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-kapruka-purple/50"
              />
            </label>
            {photoItem ? (
              <div className="mt-2">
                {customPhoto ? (
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-cream-200">
                      <Img src={customPhoto} alt="Your photo" className="h-full w-full object-cover" />
                    </div>
                    <button
                      onClick={() => setCustomPhoto(null)}
                      className="text-xs font-medium text-clay underline-offset-2 hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-kapruka-purple/40 bg-white px-3 py-2.5 text-sm font-medium text-kapruka-purple transition hover:bg-kapruka-purple/5">
                    <Camera className="h-4 w-4" /> Add your photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setCustomPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
                <p className="mt-1.5 text-[11px] leading-snug text-ink/45">
                  Photo preview is saved with your order note — Kapruka will confirm the final image with you before printing.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleAddToBasket}
            disabled={addDisabled}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-kapruka-purple px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-kapruka-dark disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
            {selectedVariant ? `Add ${formatMoney(shownPrice.amount, shownPrice.currency)}` : "Add to Basket"}
          </button>
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition hover:bg-cream-200"
            >
              View on Kapruka <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- categories ---------- */

// Best-effort icon for a category name (keyword match). Ordered most-specific
// first so e.g. "GreetingCards" hits cards before generic matches.
function categoryIcon(name: string) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  const rules: [RegExp, typeof Tag][] = [
    // occasions & seasonal
    [/valentine|lover|youandme|romance/, Heart],
    [/wedding|bridetobe|marriage/, Ribbon],
    [/anniversary/, HandHeart],
    [/birthday/, Cake],
    [/christmas|newyear|diwali|halloween|party|pongal|pongle|avurudu|poya|festival/, PartyPopper],
    [/sympath|funeral|condolen/, Flower2],
    [/mother|momtobe|momtobe/, Smile],
    [/father/, User],
    [/women|girl/, User],
    [/teacher/, GraduationCap],
    [/graduation|schoolpride/, GraduationCap],
    [/children|childrens|kids|kid|softtoy|toy|baby/, Baby],
    [/corporate|office|business/, Briefcase],
    // product departments
    [/flower|bouquet|rose/, Flower2],
    [/cakeslice|pastry|bakery|dessert/, CakeSlice],
    [/cake/, Cake],
    [/chocolate/, Cookie],
    [/candy|sweet|confection/, Candy],
    [/curd|dairy|milk/, Milk],
    [/coffee|tea|beverage/, Coffee],
    [/fruit/, Apple],
    [/vegetable/, Sprout],
    [/grocery|food/, Utensils],
    [/liquor|wine|spirit|adultproduct/, Wine],
    [/perfume|cosmetic|fragrance|beauty/, Sparkles],
    [/ayurved|herbal|pirikara|spa/, Leaf],
    [/pharmac|health|medic|wellness/, Heart],
    [/automobile|car|motor|vehicle/, Car],
    [/bicycle|bike|cycle/, Bike],
    [/phone|mobile|smart/, Smartphone],
    [/electronic|computer|laptop|gadget|tech/, Laptop],
    [/camera|photo/, Camera],
    [/game|gaming/, Gamepad2],
    [/watch|clock/, Watch],
    [/jewel|ornament|gem|ring|gold/, Gem],
    [/perfume/, Sparkles],
    [/clothing|fashion|apparel|wear|dress/, Shirt],
    [/book|stationer/, BookOpen],
    [/greetingcard|card/, Gift],
    [/sport|fitness|gym/, Dumbbell],
    [/pet|animal/, PawPrint],
    [/household|home|furnitur|decor|garden/, Home],
    [/personalized|uniquegift|giftset|giftcert|combopack|hamper|gift/, Gift],
    [/bestseller|newaddition|promotion|popular/, Star],
    [/sameday|delivery|service/, Truck],
    [/crown|premium|luxury/, Crown],
    [/uniquegift/, PartyPopper],
    [/people|group|family/, Users],
    [/snow|winter/, Snowflake],
    [/care|kind/, HeartHandshake],
  ];
  for (const [re, Icon] of rules) if (re.test(n)) return Icon;
  return Tag;
}

// Most shopper-relevant gifting categories float to the top; everything else
// keeps the API's original order behind them.
const POPULAR_CATEGORY_ORDER = [
  /cake/,
  /flower/,
  /chocolate/,
  /birthday/,
  /anniversary/,
  /wedding/,
  /valentine/,
  /personalized|uniquegift/,
  /perfume/,
  /jewel/,
  /electronic/,
  /clothing|fashion/,
  /grocery/,
  /bestseller/,
];

function popularRank(name: string): number {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  const i = POPULAR_CATEGORY_ORDER.findIndex((re) => re.test(n));
  return i === -1 ? POPULAR_CATEGORY_ORDER.length : i;
}

function CategoriesCard({
  data,
  onPrompt,
}: {
  data: { categories: { name: string; url?: string }[] };
  onPrompt?: (t: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = data.categories
    .filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => popularRank(a.c.name) - popularRank(b.c.name) || a.i - b.i)
    .map((x) => x.c);
  const showFilter = data.categories.length > 8;
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3">
        <Grid3x3 className="h-4 w-4 text-emerald-deep" />
        <div>
          <p className="text-sm font-semibold text-emerald-deep">Shop by category</p>
          <p className="text-[11px] text-ink/50">{data.categories.length} departments on Kapruka</p>
        </div>
      </div>
      {showFilter ? (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink/40" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter categories…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink/40">No categories match “{filter}”.</p>
      ) : (
        <div className="grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto p-3 sm:grid-cols-3">
          {filtered.map((c) => {
            const Icon = categoryIcon(c.name);
            return (
              <button
                key={c.name}
                onClick={() => onPrompt?.(`Show me some ${c.name.toLowerCase()}`)}
                className="group relative flex flex-col items-center gap-2 rounded-2xl border border-black/[0.07] bg-cream-50 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-emerald-deep/30 hover:bg-white hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-soft text-emerald-deep transition group-hover:bg-emerald-deep group-hover:text-cream-50">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="line-clamp-2 text-sm font-medium capitalize leading-tight text-ink">{c.name}</span>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open ${c.name} on Kapruka`}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-lg text-ink/30 opacity-0 transition hover:bg-cream-200 hover:text-ink group-hover:opacity-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
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
          className="w-full rounded-xl bg-kapruka-purple px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-kapruka-dark"
        >
          Proceed to checkout →
        </button>
      </div>
    </div>
  );
}

/* ---------- order confirmation ---------- */

function PayCountdown({ expiresAt }: { expiresAt?: string }) {
  const [target] = useState(() => {
    const t = expiresAt ? Date.parse(expiresAt) : NaN;
    return Number.isFinite(t) ? t : Date.now() + 60 * 60 * 1000;
  });
  const [remaining, setRemaining] = useState(() => target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining <= 0) {
    return (
      <p className="mt-2 text-center text-xs font-medium text-clay">
        Pay link expired — ask Kamala to re-create the order.
      </p>
    );
  }
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 10 * 60 * 1000;
  return (
    <p className={`mt-2 text-center text-xs ${urgent ? "font-semibold text-clay" : "text-ink/50"}`}>
      Secure Kapruka guest checkout · link expires in {mins}:{secs.toString().padStart(2, "0")}
    </p>
  );
}

function OrderCard({ data }: { data: Extract<UICard, { component: "order" }>["data"] }) {
  const s = data.summary;
  return (
    <div className="relative animate-fade-up overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-float">
      <Confetti />
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
        <PayCountdown expiresAt={data.expires_at} />
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
        <Check className="h-4 w-4" /> Details submitted — Kamala is placing your order…
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

/* ---------- gift bundle ---------- */

function BundleCard({
  data,
  onAddMany,
  onPrompt,
}: {
  data: Extract<UICard, { component: "bundle" }>["data"];
  onAddMany?: CardActions["onAddMany"];
  onPrompt?: (t: string) => void;
}) {
  const { items, total, currency, budget, title, occasion } = data;
  const [added, setAdded] = useState(false);
  const pct = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const over = budget ? total > budget : false;
  const barColor = over ? "bg-clay" : pct > 80 ? "bg-gold" : "bg-emerald-deep";

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-card">
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-deep to-emerald-ink px-4 py-3 text-cream-50">
        <Gift className="h-5 w-5 text-gold-soft" />
        <div>
          <p className="font-display text-base font-semibold leading-tight">{title}</p>
          {occasion ? <p className="text-xs text-cream-50/75">{occasion}</p> : null}
        </div>
      </div>
      <div className="divide-y divide-black/5">
        {items.map((it) => (
          <div key={it.product.id} className="flex items-center gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-200">
              <Img src={it.product.image_url} alt={it.product.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">
                {it.quantity > 1 ? `${it.quantity}× ` : ""}
                {it.product.name}
              </p>
              {it.reason ? <p className="line-clamp-1 text-xs text-ink/50">{it.reason}</p> : null}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-emerald-deep">
                {formatMoney((it.product.price.amount ?? 0) * it.quantity, it.product.price.currency)}
              </span>
              {onPrompt ? (
                <button
                  onClick={() => onPrompt(`Suggest an alternative to "${it.product.name}" in the bundle`)}
                  className="text-[11px] text-ink/45 underline-offset-2 hover:text-emerald-deep hover:underline"
                >
                  Swap
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink/60">Bundle total</span>
          <span className="font-display text-lg font-semibold text-emerald-deep">{formatMoney(total, currency)}</span>
        </div>
        {budget ? (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-cream-200">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${over ? 100 : pct}%` }} />
            </div>
            <p className={`mt-1 text-xs ${over ? "font-medium text-clay" : "text-ink/50"}`}>
              {over
                ? `${formatMoney(total - budget, currency)} over your ${formatMoney(budget, currency)} budget`
                : `${formatMoney(budget - total, currency)} left of your ${formatMoney(budget, currency)} budget`}
            </p>
          </div>
        ) : null}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => {
            onAddMany?.(items);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            added ? "bg-emerald-deep text-cream-50" : "bg-gold text-emerald-ink hover:brightness-105"
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4 animate-pop" /> Added to cart
            </>
          ) : (
            <>
              <Gift className="h-4 w-4" /> Add all to cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- product comparison ---------- */

function CompareCard({
  data,
  onAdd,
  onPrompt,
}: {
  data: { products: Product[] };
  onAdd?: CardActions["onAdd"];
  onPrompt?: (t: string) => void;
}) {
  const products = data.products.slice(0, 4);
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
      <div className="flex items-center gap-2 bg-emerald-soft px-4 py-2.5 text-sm font-semibold text-emerald-deep">
        <Scale className="h-4 w-4 text-gold" /> Comparing {products.length} options
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}>
        {products.map((p) => {
          const needsDetail = shouldOpenDetail(p);
          return (
            <div key={p.id} className="flex flex-col gap-2 border-l border-black/5 p-3 first:border-l-0">
              <div className="aspect-square overflow-hidden rounded-lg bg-cream-200">
                <Img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">{p.name}</p>
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-sm font-semibold text-emerald-deep">{formatMoney(p.price.amount, p.price.currency)}</span>
                {p.compare_at_price?.amount && p.price.amount && p.compare_at_price.amount > p.price.amount ? (
                  <span className="text-[11px] text-ink/40 line-through">
                    {formatMoney(p.compare_at_price.amount, p.compare_at_price.currency)}
                  </span>
                ) : null}
              </div>
              <StockBadge inStock={p.in_stock} level={p.stock_level} />
              {p.category?.name ? <p className="text-[11px] capitalize text-ink/45">{p.category.name}</p> : null}
              <button
                onClick={() => (needsDetail ? onPrompt?.(`Show me details for ${p.name}`) : onAdd?.(p))}
                disabled={p.in_stock === false}
                className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-emerald-deep px-2 py-1.5 text-xs font-medium text-cream-50 transition hover:bg-emerald-ink disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> {needsDetail ? "Options" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- renderer ---------- */

export function CardRenderer({ card, onAdd, onAddMany, onPrompt }: { card: UICard } & CardActions) {
  switch (card.component) {
    case "products":
      return <ProductsCard data={card.data} onAdd={onAdd} onPrompt={onPrompt} />;
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
    case "bundle":
      return <BundleCard data={card.data} onAddMany={onAddMany} onPrompt={onPrompt} />;
    case "compare":
      return <CompareCard data={card.data} onAdd={onAdd} onPrompt={onPrompt} />;
    case "checkout_form":
      return <CheckoutFormCard data={card.data} onSubmit={onPrompt} />;
    case "cart_op":
    case "profile_op":
      // mutate live state; nothing inline to render.
      return null;
    default:
      return null;
  }
}

export { X };
