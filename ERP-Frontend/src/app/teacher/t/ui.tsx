"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

/** The pill above a page: "Section  Class 7 B ▾". */
export function PillSelect({ label, value, onChange, options, right }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </label>
      {right && <div className="ml-auto text-[12px] text-slate-500">{right}</div>}
    </div>
  );
}

export function SearchBox({ q, onQ, label }: { q: string; onQ: (v: string) => void; label: string }) {
  return <label className="flex w-72 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => onQ(e.target.value)} placeholder={label} aria-label={label} className="w-full bg-transparent outline-none" /></label>;
}

export const smallBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
export const blueBtn = "rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";

export function Bars({ rows, unit = "%", max = 100 }: { rows: { label: string; value: number | null; note?: string }[]; unit?: string; max?: number }) {
  return (
    <div className="space-y-3 px-5 py-4">{rows.map((r) => (
      <div key={r.label} className="flex items-center gap-3 text-[12.5px]"><span className="w-28 shrink-0 text-slate-900">{r.label}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${Math.min(100, ((r.value ?? 0) / max) * 100)}%` }} /></span>
        <span className="w-24 text-right tabular-nums text-slate-700">{r.note ?? (r.value === null ? "—" : `${r.value}${unit}`)}</span></div>
    ))}</div>
  );
}

// the section the teacher is working on, kept in the browser so every page opens on it
const KEY = "teacher-section";
const subs = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };
export function useSelectedSection(): [string, (id: string) => void] {
  const v = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, read, () => "");
  return [v, (id: string) => { try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ } subs.forEach((f) => f()); }];
}

/** The section to show: the one chosen (if it is still one of the options), else the first option. */
export function usePickedSection(options: { id: string }[], preferred?: string | null): [string, (id: string) => void] {
  const [saved, save] = useSelectedSection();
  const ids = options.map((o) => o.id);
  const id = ids.includes(saved) ? saved : preferred && ids.includes(preferred) ? preferred : ids[0] ?? "";
  return [id, save];
}
