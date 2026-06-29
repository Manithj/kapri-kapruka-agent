"use client";

import { useEffect, useRef } from "react";

const BARS = 28;

// Live waveform driven by the recording mic stream — bars react to your voice.
export default function VoiceWaveform({ stream }: { stream: MediaStream }) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new Ctx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < BARS; i++) {
        const v = data[i % data.length] / 255; // 0..1
        const h = 12 + v * 76; // % height, min 12%
        const bar = barsRef.current[i];
        if (bar) bar.style.height = `${h}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return (
    <div className="flex h-9 flex-1 items-center gap-[3px] px-1" aria-hidden>
      {Array.from({ length: BARS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-[3px] shrink-0 rounded-full bg-clay/70 transition-[height] duration-75 ease-out"
          style={{ height: "12%" }}
        />
      ))}
    </div>
  );
}
