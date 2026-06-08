"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-card focus-within:border-emerald-deep/40">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask Kapri anything… e.g. “a birthday gift for my amma under Rs 5000”"
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-ink/35"
      />
      <button
        onClick={submit}
        disabled={disabled || !text.trim()}
        aria-label="Send"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-deep text-cream-50 transition hover:bg-emerald-ink disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
