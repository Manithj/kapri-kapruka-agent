"use client";

import { Package } from "lucide-react";

// Detect Sinhala script so we can switch to a Sinhala-capable font (Latin
// handwriting fonts don't shape Sinhala glyphs).
function hasSinhala(s: string): boolean {
  return /[඀-෿]/.test(s);
}

// Renders a cake image with the icing message piped on top via a CSS text
// overlay (native text shaping → Sinhala renders correctly). Used in the product
// detail card and the cart drawer.
export default function IcingPreview({
  image,
  text,
  className = "",
}: {
  image?: string | null;
  text: string;
  className?: string;
}) {
  const sinhala = hasSinhala(text);
  const fontFamily = sinhala
    ? "var(--font-sinhala), sans-serif"
    : "var(--font-handwriting), cursive";

  return (
    <div className={`relative overflow-hidden rounded-xl bg-cream-200 ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="Cake preview" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-emerald-deep/30">
          <Package className="h-8 w-8" />
        </div>
      )}
      {text.trim() ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <span
            className="max-w-[85%] text-center leading-tight"
            style={{
              fontFamily,
              fontSize: sinhala ? "clamp(13px, 5vw, 22px)" : "clamp(15px, 6vw, 26px)",
              color: "#fff",
              textShadow:
                "0 1px 2px rgba(0,0,0,.45), 0 0 1px rgba(120,60,20,.6), 1px 1px 0 rgba(196,91,60,.5)",
              fontWeight: 600,
              wordBreak: "break-word",
            }}
          >
            {text}
          </span>
        </div>
      ) : null}
    </div>
  );
}
