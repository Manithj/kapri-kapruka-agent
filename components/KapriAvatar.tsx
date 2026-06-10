"use client";

import { Search, Sparkles } from "lucide-react";

export type AvatarState = "idle" | "thinking" | "searching" | "found" | "celebrating";

// Kapri's little face — the ක monogram tile evolved into a character with
// expression states tied to what the agent is doing. All motion is gated behind
// motion-safe so reduced-motion users get a calm, static avatar.
export default function KapriAvatar({
  state = "idle",
  size = 36,
  className = "",
}: {
  state?: AvatarState;
  size?: number;
  className?: string;
}) {
  const radius = Math.round(size * 0.28);
  const bob =
    state === "searching"
      ? "motion-safe:animate-bounce-sm"
      : state === "celebrating"
      ? "motion-safe:animate-pop"
      : "";

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-visible rounded-xl bg-gradient-to-br from-emerald-deep to-emerald-ink text-cream-50 ${bob} ${className}`}
      style={{ height: size, width: size, borderRadius: radius }}
      aria-hidden="true"
    >
      <span className="font-display leading-none" style={{ fontSize: size * 0.46 }}>
        ක
      </span>

      {/* blinking eyes overlay for a touch of life when idle/thinking */}
      {(state === "idle" || state === "thinking") && (
        <span
          className="pointer-events-none absolute rounded-full bg-cream-50/90 motion-safe:animate-blink"
          style={{ width: Math.max(2, size * 0.07), height: Math.max(2, size * 0.07), top: size * 0.3, right: size * 0.24 }}
        />
      )}

      {/* status emblem in the corner */}
      {state === "searching" && (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-gold text-emerald-ink shadow"
          style={{ height: size * 0.42, width: size * 0.42 }}
        >
          <Search style={{ height: size * 0.24, width: size * 0.24 }} />
        </span>
      )}
      {(state === "found" || state === "celebrating") && (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-gold text-emerald-ink shadow motion-safe:animate-pop"
          style={{ height: size * 0.42, width: size * 0.42 }}
        >
          <Sparkles style={{ height: size * 0.24, width: size * 0.24 }} />
        </span>
      )}
      {state === "thinking" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold motion-safe:animate-ping"
          aria-hidden
        />
      )}
    </div>
  );
}
