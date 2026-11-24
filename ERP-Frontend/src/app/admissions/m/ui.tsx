"use client";

import type { ReactNode } from "react";
import { Panel, SimpleTable } from "@/components/admin/dash";
import { ExportPrint } from "@/components/admin/export-print";
import { inputCls } from "@/components/admin/ui";

/** 28 Sep 2026 */
export const dmy = (d: string | null | undefined) => (d ? new Date(d.length > 10 ? d : d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: d.length > 10 ? "Asia/Kolkata" : "UTC" }) : "—");
/** +91 98137 40911 */
export const phone = (m: string | null | undefined) => { const d = (m ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : m || "—"; };
export const has = (r: unknown, q: string) => !q.trim() || JSON.stringify(Object.values(r as object)).toLowerCase().includes(q.trim().toLowerCase());

export const BLUE = "bg-[#dceff9]", AMBER = "bg-[#f8ecd6]";
export const blueBtn = "rounded-full bg-[#026f9b] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
export const whiteBtn = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:border-slate-400 disabled:opacity-60";
export const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
export const Loading = () => <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;

export function Tile({ label, value, sub, bg, tone }: { label: string; value: ReactNode; sub?: ReactNode; bg: string; tone?: string }) {
  return <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[26px] font-bold leading-tight tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>{sub && <p className="mt-0.5 text-xs text-slate-700">{sub}</p>}</div>;
}

/** Horizontal bars: a label, the bar, and a count (or "34 / 60") on the right. */
export function BarRows({ rows }: { rows: { label: string; value: number; max: number; text: string }[] }) {
  if (!rows.length) return <p className="p-6 text-center text-sm text-slate-400">Nothing yet.</p>;
  return <div className="space-y-3 px-5 py-4">{rows.map((r) => <div key={r.label} className="flex items-center gap-3 text-[12.5px]"><span className="w-28 shrink-0 text-slate-900">{r.label}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${Math.min(100, r.max ? (r.value / r.max) * 100 : 0)}%` }} /></span><span className="w-16 shrink-0 text-right tabular-nums text-slate-700">{r.text}</span></div>)}</div>;
}

/** A table panel: heading, count, Export, a search box (and an optional filter beside it), the table. */
export function DataTable({ title, noun, search, onSearch, filter, exportName, exportHead, exportRows, head, rows, empty }: { title: string; noun: string; search: string; onSearch: (s: string) => void; filter?: ReactNode; exportName: string; exportHead: string[]; exportRows: (string | number | null | undefined)[][]; head: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <Panel title={title} sub={`${rows.length} ${noun}`} right={<ExportPrint name={exportName} head={exportHead} rows={exportRows} />}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <input className={`${inputCls} max-w-xs`} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} value={search} onChange={(e) => onSearch(e.target.value)} />
        {filter}
      </div>
      <SimpleTable head={head.map((h) => ({ h }))} rows={rows} empty={empty} />
    </Panel>
  );
}

/** The child cell: the name, and "Class 1 · APP-2027-0412" under it. */
export const ChildCell = ({ name, sub, onClick }: { name: string; sub: string; onClick?: () => void }) => (
  <span className="block leading-tight">{onClick ? <button type="button" onClick={onClick} className="font-semibold text-[#026f9b] hover:underline">{name}</button> : <b className="font-semibold text-[#026f9b]">{name}</b>}<span className="block text-[11.5px] text-slate-500">{sub}</span></span>
);
export const ParentCell = ({ name, mobile }: { name: string; mobile: string | null }) => <span className="block leading-tight"><span className="block text-slate-900">{name}</span><span className="block text-[11.5px] text-slate-500">{phone(mobile)}</span></span>;

export const INTEREST_TONE = { Hot: "good", Warm: "warn", Cold: "bad" } as const;
