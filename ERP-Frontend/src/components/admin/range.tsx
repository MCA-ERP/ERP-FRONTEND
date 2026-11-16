"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatYmd } from "@/lib/locale-format";

export type Preset = "7d" | "30d" | "90d" | "month" | "lastmonth" | "fy" | "custom";

export interface DashRange {
  from: string;
  to: string;
  days: number;
  preset: Preset;
  /** "5 Oct 2026 - 3 Nov 2026", in the platform's date format. */
  label: string;
}

export const PRESETS: [Preset, string][] = [
  ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"], ["month", "This month"], ["lastmonth", "Last month"], ["fy", "This financial year"], ["custom", "Custom range"],
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Turns a choice into a range. The Indian financial year starts on 1 April. */
export function rangeFor(preset: Preset, custom: { from: string; to: string }, now = new Date()): { from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "7d": return { from: iso(addDays(today, -6)), to: iso(today) };
    case "90d": return { from: iso(addDays(today, -89)), to: iso(today) };
    case "month": return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case "lastmonth": return { from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: iso(new Date(today.getFullYear(), today.getMonth(), 0)) };
    case "fy": return { from: iso(new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1)), to: iso(today) };
    case "custom": return custom.from && custom.to && custom.from <= custom.to ? custom : { from: iso(addDays(today, -29)), to: iso(today) };
    default: return { from: iso(addDays(today, -29)), to: iso(today) };
  }
}

const show = (ymd: string) => { const [y, m, d] = ymd.split("-"); return formatYmd(y, m, d); };

function build(preset: Preset, custom: { from: string; to: string }): DashRange {
  const { from, to } = rangeFor(preset, custom);
  return { from, to, preset, days: Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1, label: `${show(from)} - ${show(to)}` };
}

interface Control { range: DashRange; setPreset: (p: Preset) => void; custom: { from: string; to: string }; setCustom: (c: { from: string; to: string }) => void }
const Ctx = createContext<Control | null>(null);

/** Holds the date range chosen in the bar above a Dashboard page, for every page below it to read. */
export function RangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState(() => rangeFor("30d", { from: "", to: "" }));
  const range = useMemo(() => build(preset, custom), [preset, custom]);
  const value = useMemo(() => ({ range, setPreset, custom, setCustom }), [range, custom]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const FALLBACK: DashRange = build("30d", { from: "", to: "" });

/** The range the person chose. Outside a Dashboard page it is the last 30 days. */
export function useRange(): DashRange {
  return useContext(Ctx)?.range ?? FALLBACK;
}

export function useRangeControl() {
  return useContext(Ctx);
}
