"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Panel, SimpleTable } from "@/components/admin/dash";
import { ExportPrint } from "@/components/admin/export-print";

/** Small pieces shared by the HR portal's own pages. */
export function Tile({ label, value, sub, tone = "blue" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const bg = { blue: "bg-[#e8f4fb]", green: "bg-[#d9efe8]", amber: "bg-[#f8ecd6]", red: "bg-[#fce0df]" }[tone];
  const ink = { blue: "text-slate-900", green: "text-slate-900", amber: "text-[#8a5a0b]", red: "text-[#ac2c28]" }[tone];
  return <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[24px] font-bold leading-tight tabular-nums ${ink}`}>{value}</p>{sub && <p className="mt-0.5 text-xs text-slate-600">{sub}</p>}</div>;
}
export const Tiles = ({ children }: { children: ReactNode }) => <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{children}</div>;
export const share = (n: number, of: number) => `${of ? Math.round((n / of) * 100) : 0}% of shown`;

export const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
export const solid = "rounded-full bg-[#026f9b] px-3.5 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
export const name = (main: ReactNode, sub?: ReactNode) => <span><b className="font-semibold text-slate-900">{main}</b>{sub && <span className="block text-[11px] text-slate-500">{sub}</span>}</span>;

/** A table panel with a count, Export, a search box and the table. */
export function Table({ title, noun, exportName, head, rows, empty, search = true }: { title: string; noun: string; exportName: string; head: { h: string; right?: boolean }[]; rows: { key: string; find: string; cells: ReactNode[]; out: (string | number | null | undefined)[] }[]; empty: string; search?: boolean }) {
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => !q.trim() || r.find.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Panel title={title} sub={`${shown.length} ${noun}`} right={<ExportPrint name={exportName} head={head.map((h) => h.h).filter(Boolean)} rows={shown.map((r) => r.out)} />}>
      {search && <div className="border-b border-slate-100 px-4 py-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-[#41afda]" /></div>}
      <SimpleTable head={head} empty={empty} rows={shown.map((r) => r.cells)} />
    </Panel>
  );
}
