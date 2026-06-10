"use client";

import { useEffect, useRef } from "react";
import { PackageCheck, RotateCcw, Truck, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { ProfileOrder } from "@/lib/types";

// Slide-in panel listing locally-saved orders, with Track / Re-order actions.
export default function OrdersPanel({
  open,
  onClose,
  orders,
  onTrack,
  onReorder,
}: {
  open: boolean;
  onClose: () => void;
  orders: ProfileOrder[];
  onTrack: (ref: string) => void;
  onReorder: (ref: string) => void;
}) {
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

  const sorted = [...orders].reverse();

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-emerald-ink/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="My orders"
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(400px,92vw)] flex-col bg-cream-50 shadow-float outline-none transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-deep" />
            <h2 className="font-display text-lg font-semibold text-emerald-ink">My orders</h2>
          </div>
          <button onClick={onClose} aria-label="Close orders" className="rounded-lg p-1.5 text-ink/50 hover:bg-cream-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {sorted.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-ink/50">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-soft">
                <PackageCheck className="h-7 w-7 text-emerald-deep/50" />
              </div>
              <p className="text-sm">No orders yet. Once you place one with Kapri, it'll show up here.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sorted.map((o) => (
                <li key={o.order_ref} className="rounded-xl border border-black/5 bg-white p-3.5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-emerald-deep">Ref {o.order_ref}</p>
                      <p className="text-xs text-ink/50">
                        {new Date(o.placedAt).toLocaleDateString()} {o.recipient ? `· for ${o.recipient}` : ""}
                        {o.city ? ` · ${o.city}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-deep">
                      {formatMoney(o.total, o.currency)}
                    </span>
                  </div>
                  {o.items.length ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-ink/60">
                      {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => onTrack(o.order_ref)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-deep px-3 py-1.5 text-sm font-medium text-cream-50 transition hover:bg-emerald-ink"
                    >
                      <Truck className="h-4 w-4" /> Track
                    </button>
                    <button
                      onClick={() => onReorder(o.order_ref)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-cream-200"
                    >
                      <RotateCcw className="h-4 w-4" /> Re-order
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
