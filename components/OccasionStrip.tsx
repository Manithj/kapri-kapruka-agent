"use client";

import { useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import type { ProfileOccasion } from "@/lib/types";

type Upcoming = { label: string; date: string; inDays: number; recipientName?: string; emoji?: string };

function whenLabel(inDays: number): string {
  if (inDays === 0) return "today";
  if (inDays === 1) return "tomorrow";
  return `in ${inDays} days`;
}

// "Coming up" strip on the empty-state hero: merges saved occasions + SL holidays
// into tappable gift prompts, plus a small inline form to add a new occasion.
export default function OccasionStrip({
  occasions,
  onPick,
  onAdd,
}: {
  occasions: Upcoming[];
  onPick: (text: string) => void;
  onAdd?: (o: Omit<ProfileOccasion, "id">) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<ProfileOccasion["type"]>("birthday");

  const top = occasions.slice(0, 4);

  function submit() {
    if (!label.trim() || !date) return;
    onAdd?.({ label: label.trim(), date, recurring: type !== "custom", type });
    setLabel("");
    setDate("");
    setAdding(false);
  }

  if (top.length === 0 && !onAdd) return null;

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
        {onAdd && !adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-emerald-deep/30 bg-white px-3 py-1.5 text-sm font-medium text-emerald-deep transition hover:border-emerald-deep/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep/40"
          >
            <Plus className="h-3.5 w-3.5" /> Add an occasion
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mx-auto mt-3 flex max-w-md flex-wrap items-end justify-center gap-2 rounded-2xl border border-black/5 bg-white p-3 shadow-card">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Amma's birthday"
            className="min-w-[140px] flex-1 rounded-lg border border-black/10 bg-cream-50 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-deep/50"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-black/10 bg-cream-50 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-deep/50"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProfileOccasion["type"])}
            className="rounded-lg border border-black/10 bg-cream-50 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-deep/50"
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="custom">One-off</option>
          </select>
          <button
            onClick={submit}
            disabled={!label.trim() || !date}
            className="rounded-lg bg-emerald-deep px-3 py-1.5 text-sm font-medium text-cream-50 transition hover:bg-emerald-ink disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => setAdding(false)}
            aria-label="Cancel"
            className="rounded-lg p-1.5 text-ink/40 hover:bg-cream-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
