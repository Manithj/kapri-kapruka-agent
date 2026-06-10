"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Package, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cartTotal, formatMoney, isCake } from "@/lib/format";
import IcingPreview from "./IcingPreview";
import type { CartItem } from "@/lib/types";

export default function CartDrawer({
  open,
  onClose,
  items,
  budget,
  onClearBudget,
  onQty,
  onRemove,
  onIcing,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  budget?: { amount: number; currency: string } | null;
  onClearBudget?: () => void;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onIcing?: (id: string, text: string) => void;
  onCheckout: () => void;
}) {
  const currency = items[0]?.currency ?? "LKR";
  const total = cartTotal(items);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // budget bar maths
  const pct = budget ? Math.min(100, Math.round((total / budget.amount) * 100)) : 0;
  const over = budget ? total > budget.amount : false;
  const barColor = over ? "bg-clay" : pct > 80 ? "bg-gold" : "bg-emerald-deep";

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-emerald-ink/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(380px,90vw)] flex-col bg-cream-50 shadow-float outline-none transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-deep" />
            <h2 className="font-display text-lg font-semibold text-emerald-ink">Your cart</h2>
          </div>
          <button onClick={onClose} aria-label="Close cart" className="rounded-lg p-1.5 text-ink/50 hover:bg-cream-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-ink/50">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-soft">
                <Package className="h-7 w-7 text-emerald-deep/50" />
              </div>
              <p className="text-sm">Your cart is empty.<br />Ask Kapri to find you something lovely 🎁</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <CartLine key={it.product_id} item={it} onQty={onQty} onRemove={onRemove} onIcing={onIcing} />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <footer className="border-t border-black/5 px-5 py-4">
            {budget ? (
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink/55">Budget</span>
                  <button
                    onClick={onClearBudget}
                    className="flex items-center gap-1 text-ink/40 hover:text-clay"
                    aria-label="Clear budget"
                  >
                    {formatMoney(budget.amount, budget.currency)} <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cream-200">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${over ? 100 : pct}%` }} />
                </div>
                <p className={`mt-1 text-xs ${over ? "font-medium text-clay" : "text-ink/50"}`}>
                  {over
                    ? `${formatMoney(total - budget.amount, budget.currency)} over budget`
                    : `${formatMoney(budget.amount - total, budget.currency)} left of your budget`}
                </p>
              </div>
            ) : null}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-ink/60">Subtotal</span>
              <span className="font-display text-xl font-semibold text-emerald-deep">{formatMoney(total, currency)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-emerald-ink transition hover:brightness-105"
            >
              Checkout with Kapri →
            </button>
            <p className="mt-2 text-center text-xs text-ink/45">Delivery fee added at checkout</p>
          </footer>
        ) : null}
      </aside>
    </>
  );
}

function CartLine({
  item: it,
  onQty,
  onRemove,
  onIcing,
}: {
  item: CartItem;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onIcing?: (id: string, text: string) => void;
}) {
  const cake = isCake(it);
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex gap-3 rounded-xl border border-black/5 bg-white p-2.5">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-200">
        {cake && it.icing_text ? (
          <IcingPreview image={it.image} text={it.icing_text} className="h-full w-full" />
        ) : it.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-emerald-deep/30">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{it.name}</p>
        {cake && onIcing ? (
          editing ? (
            <input
              autoFocus
              defaultValue={it.icing_text ?? ""}
              onBlur={(e) => {
                onIcing(it.product_id, e.target.value.slice(0, 40));
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="Icing message…"
              className="mt-0.5 w-full rounded-md border border-black/10 bg-cream-50 px-2 py-1 text-xs outline-none focus:border-emerald-deep/50"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-0.5 flex items-center gap-1 text-left text-xs text-ink/50 hover:text-emerald-deep"
            >
              <Pencil className="h-3 w-3" />
              {it.icing_text ? `Icing: “${it.icing_text}”` : "Add icing message"}
            </button>
          )
        ) : it.icing_text ? (
          <p className="text-xs text-ink/50">Icing: “{it.icing_text}”</p>
        ) : null}
        <span className="text-sm font-semibold text-emerald-deep">
          {formatMoney((it.price ?? 0) * it.quantity, it.currency)}
        </span>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-black/10">
            <button
              onClick={() => onQty(it.product_id, -1)}
              aria-label="Decrease quantity"
              className="grid h-7 w-7 place-items-center text-ink/60 hover:text-emerald-deep"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm">{it.quantity}</span>
            <button
              onClick={() => onQty(it.product_id, 1)}
              aria-label="Increase quantity"
              className="grid h-7 w-7 place-items-center text-ink/60 hover:text-emerald-deep"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => onRemove(it.product_id)}
            aria-label="Remove"
            className="ml-auto rounded-lg p-1.5 text-ink/40 hover:bg-clay/10 hover:text-clay"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
