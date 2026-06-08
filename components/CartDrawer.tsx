"use client";

import { Minus, Package, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cartTotal } from "@/lib/format";
import { formatMoney } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export default function CartDrawer({
  open,
  onClose,
  items,
  onQty,
  onRemove,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const currency = items[0]?.currency ?? "LKR";
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
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(380px,90vw)] flex-col bg-cream-50 shadow-float transition-transform duration-300 ${
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
                <li key={it.product_id} className="flex gap-3 rounded-xl border border-black/5 bg-white p-2.5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                    {it.image ? (
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
                    {it.icing_text ? <p className="text-xs text-ink/50">Icing: “{it.icing_text}”</p> : null}
                    <span className="text-sm font-semibold text-emerald-deep">
                      {formatMoney((it.price ?? 0) * it.quantity, it.currency)}
                    </span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-black/10">
                        <button onClick={() => onQty(it.product_id, -1)} className="grid h-7 w-7 place-items-center text-ink/60 hover:text-emerald-deep">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm">{it.quantity}</span>
                        <button onClick={() => onQty(it.product_id, 1)} className="grid h-7 w-7 place-items-center text-ink/60 hover:text-emerald-deep">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button onClick={() => onRemove(it.product_id)} aria-label="Remove" className="ml-auto rounded-lg p-1.5 text-ink/40 hover:bg-clay/10 hover:text-clay">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <footer className="border-t border-black/5 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-ink/60">Subtotal</span>
              <span className="font-display text-xl font-semibold text-emerald-deep">{formatMoney(cartTotal(items), currency)}</span>
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
