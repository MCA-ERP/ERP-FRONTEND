"use client";

import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/** A width the user can drag (sidebar, chat panel). Remembered in localStorage.
 *  `edge` is the screen edge the panel is attached to. `onRaw` sees the unclamped width while dragging. */
export function useDragWidth(key: string, def: number, min: number, max: number, edge: "left" | "right", onRaw?: (raw: number) => void) {
  const [w, setW] = useState(() => {
    try { const v = Number(localStorage.getItem(key)); return v >= min && v <= max ? v : def; } catch { return def; }
  });
  const begin = (e: ReactPointerEvent) => {
    e.preventDefault();
    let last = w;
    const prevSelect = document.body.style.userSelect; const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize";
    const move = (ev: PointerEvent) => {
      const raw = edge === "left" ? window.innerWidth - ev.clientX : ev.clientX;
      onRaw?.(raw);
      last = Math.min(max, Math.max(min, raw));
      setW(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      document.body.style.userSelect = prevSelect; document.body.style.cursor = prevCursor;
      try { localStorage.setItem(key, String(last)); } catch { /* storage unavailable */ }
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return { w, begin, reset: () => setW(def) };
}
