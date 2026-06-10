"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import { downscaleImage } from "@/lib/image";

export default function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string, images?: string[]) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setProcessing(true);
    try {
      const next: string[] = [];
      for (const f of list.slice(0, 3)) {
        next.push(await downscaleImage(f));
      }
      setImages((prev) => [...prev, ...next].slice(0, 3));
    } catch {
      /* ignore unreadable images */
    } finally {
      setProcessing(false);
    }
  }

  function submit() {
    const t = text.trim();
    if ((!t && images.length === 0) || disabled || processing) return;
    onSend(t, images.length ? images : undefined);
    setText("");
    setImages([]);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-2 shadow-card focus-within:border-emerald-deep/40">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-1 pb-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Attachment preview" className="h-16 w-16 rounded-xl object-cover" />
              <button
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove image"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-ink text-cream-50 shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || images.length >= 3}
          aria-label="Attach a photo"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-deep transition hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
            if (imgs.length) {
              e.preventDefault();
              addFiles(imgs);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask Kapri anything — or attach a photo of something you love…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-ink/35"
        />
        <button
          onClick={submit}
          disabled={disabled || processing || (!text.trim() && images.length === 0)}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-deep text-cream-50 transition hover:bg-emerald-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
