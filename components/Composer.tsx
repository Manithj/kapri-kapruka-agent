"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, Mic, Send, Trash2, X } from "lucide-react";
import { downscaleImage } from "@/lib/image";
import VoiceWaveform from "./VoiceWaveform";

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
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  useEffect(() => {
    setVoiceSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof window !== "undefined" &&
        "MediaRecorder" in window,
    );
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Send a recorded clip to OpenAI Whisper (browser-independent, multilingual).
  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Transcription failed");
      const t = (data.text || "").trim();
      if (t) setText((prev) => (prev ? prev + " " : "") + t);
      else setVoiceError("Didn't catch that — try speaking again.");
    } catch (err: any) {
      setVoiceError(err?.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  async function startVoice() {
    setVoiceError(null);
    cancelledRef.current = false;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(mic);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        mic.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setListening(false);
        setStream(null);
        setElapsed(0);
        recorderRef.current = null;
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) transcribe(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setStream(mic);
      setListening(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Mic blocked. Allow microphone access in the address bar."
          : err?.name === "NotFoundError"
            ? "No microphone found."
            : `Couldn't start mic: ${err?.message || err}`;
      setVoiceError(msg);
    }
  }

  // Stop recording and transcribe into the box.
  function finishVoice() {
    cancelledRef.current = false;
    recorderRef.current?.stop();
  }

  // Stop recording and discard — no transcription.
  function cancelVoice() {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  }

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

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  function submit() {
    const t = text.trim();
    if ((!t && images.length === 0) || disabled || processing) return;
    onSend(t, images.length ? images : undefined);
    setText("");
    setImages([]);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-2 shadow-card focus-within:border-emerald-deep/40">
      {voiceError ? (
        <div className="mb-1 px-2 text-xs text-clay">{voiceError}</div>
      ) : null}
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
      {listening && stream ? (
        <div className="flex items-center gap-2">
          <button
            onClick={cancelVoice}
            aria-label="Cancel recording"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink/50 transition hover:bg-cream-200 hover:text-clay"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <span className="grid h-10 shrink-0 place-items-center px-1 text-sm font-medium tabular-nums text-clay">
            {mmss}
          </span>
          <VoiceWaveform stream={stream} />
          <button
            onClick={finishVoice}
            aria-label="Stop and transcribe"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-emerald-ink transition hover:brightness-105"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
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
        {voiceSupported ? (
          <button
            onClick={startVoice}
            disabled={disabled || transcribing}
            aria-label="Voice input"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-emerald-deep transition hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {transcribing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          </button>
        ) : null}
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
          placeholder="Ask Kamala anything — or attach a photo of something you love…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-ink/35"
        />
        <button
          onClick={submit}
          disabled={disabled || processing || (!text.trim() && images.length === 0)}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-emerald-ink transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
      )}
    </div>
  );
}
