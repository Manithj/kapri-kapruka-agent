"use client";

import { CalendarDays } from "lucide-react";

type Upcoming = { label: string; date: string; inDays: number; recipientName?: string; emoji?: string };

function whenLabel(inDays: number): string {
  if (inDays === 0) return "today";
  if (inDays === 1) return "tomorrow";
  return `in ${inDays} days`;
}

// "Coming up" strip on the empty-state hero: surfaces upcoming saved occasions +
// SL holidays as tappable gift prompts.
export default function OccasionStrip({
  occasions,
  onPick,
}: {
  occasions: Upcoming[];
  onPick: (text: string) => void;
}) {
  const top = occasions.slice(0, 4);

  if (top.length === 0) return null;

  return (
    <div className="mt-6 w-full max-w-xl">
      <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">
        <CalendarDays className="h-3.5 w-3.5" /> Coming up
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {top.map((o) => (
          <button
            key={o.label + o.date}
            onClick={() =>
              onPick(
                `Help me find a gift for ${o.recipientName ? o.recipientName + "'s " : ""}${o.label} (${whenLabel(
                  o.inDays
                )})`
              )
            }
            className="group flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-sm font-medium text-[#8a6d24] transition hover:-translate-y-0.5 hover:border-gold hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <span>{o.emoji ?? "🎁"}</span>
            <span>
              {o.recipientName ? `${o.recipientName}'s ` : ""}
              {o.label}
            </span>
            <span className="text-[#a98a3f]/80">· {whenLabel(o.inDays)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
