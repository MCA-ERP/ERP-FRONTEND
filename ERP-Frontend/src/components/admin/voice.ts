"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";

/**
 * Asking the assistant by voice, like dictation in a chat app: tap the microphone, speak, and the question is sent when you
 * stop talking. The recording goes to the server, which understands English, Hindi and Telugu on its own, so there is no
 * language to pick. Nothing is played back.
 */
export type VoiceState = "idle" | "listening" | "transcribing";

const SILENCE_MS = 1400; // stop this long after the person stops talking
const NO_SPEECH_MS = 8000; // give up if nothing is said
const MAX_MS = 30_000;
const LEVEL = 0.018; // how loud counts as talking

const pickType = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";

export function useDictation({ onText, onError, endpoint = "/admin/assist/transcribe" }: { onText: (text: string) => void; onError: (message: string) => void; endpoint?: string }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [supported, setSupported] = useState(false);
  const handlers = useRef({ onText, onError });
  const session = useRef<{ stop: (send: boolean) => void } | null>(null);
  const alive = useRef(true);

  useEffect(() => { handlers.current = { onText, onError }; });
  useEffect(() => {
    alive.current = true;
    setSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
    return () => { alive.current = false; session.current?.stop(false); };
  }, []);

  const start = useCallback(async () => {
    if (session.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      handlers.current.onError(name === "NotFoundError" ? "No microphone was found." : "The microphone is blocked. Allow it from the lock icon in the address bar, then try again.");
      return;
    }
    const type = pickType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    let spoke = false;
    let lastLoud = Date.now();
    const began = Date.now();
    let discard = false;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) { const d = (v - 128) / 128; sum += d * d; }
      const loud = Math.sqrt(sum / buf.length) > LEVEL;
      const now = Date.now();
      if (loud) { spoke = true; lastLoud = now; }
      if ((spoke && now - lastLoud > SILENCE_MS) || (!spoke && now - began > NO_SPEECH_MS) || now - began > MAX_MS) stop(true);
    }, 150);

    const cleanup = () => { window.clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => undefined); session.current = null; };
    function stop(send: boolean) { discard = !send; if (recorder.state !== "inactive") recorder.stop(); else cleanup(); }

    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      cleanup();
      if (discard || !alive.current) { if (alive.current) setState("idle"); return; }
      if (!spoke) { setState("idle"); handlers.current.onError("I did not hear anything. Tap the microphone and speak again."); return; }
      setState("transcribing");
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const headers = { ...((await getAuthHeaders()) as Record<string, string>), "Content-Type": blob.type.split(";")[0] };
        const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", headers, body: blob, cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok || !body.text) throw new Error(body.error || "I could not understand that. Try again.");
        if (alive.current) { setState("idle"); handlers.current.onText(body.text); }
      } catch (e) {
        if (alive.current) { setState("idle"); handlers.current.onError(e instanceof Error ? e.message : "Voice did not work. Try again."); }
      }
    };

    session.current = { stop };
    recorder.start();
    setState("listening");
  }, []);

  const stop = useCallback(() => { session.current?.stop(true); }, []);
  const cancel = useCallback(() => { session.current?.stop(false); setState("idle"); }, []);

  return { state, supported, start, stop, cancel, listening: state === "listening", transcribing: state === "transcribing" };
}
