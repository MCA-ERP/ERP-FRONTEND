"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { schoolFetch } from "@/lib/school-api";
import { Panel } from "@/components/admin/dash";
import { downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { useParent } from "../context";

export const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400 disabled:opacity-50";
export const bluePill = "rounded-full bg-[#026f9b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-60";

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const asDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
export const dmy = (iso?: string | null) => (iso ? asDate(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const dm = (iso?: string | null) => (iso ? asDate(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
export const weekday = (iso: string) => asDate(iso).toLocaleDateString("en-IN", { weekday: "long" });
export const initials = (s: string) => s.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

const GOOD = ["paid", "present", "resolved", "approved", "completed", "done", "given", "submitted", "checked", "issued", "returned", "registered", "met", "normal", "accepted", "linked", "opted", "ready to collect", "boarded", "booked", "active"];
const BAD = ["absent", "overdue", "rejected", "declined", "withdrawn", "failed", "not submitted", "lost", "cancelled", "returned for correction", "missing at stop", "referred", "unpaid"];
const WARN = ["pending", "late", "half day", "part paid", "in progress", "under review", "info asked", "reassessment", "waiting", "needs attention", "fee pending", "code sent", "number verified", "due"];
export function Status({ value }: { value: string }) {
  const v = value.toLowerCase();
  const cls = GOOD.includes(v) ? "bg-[#d9efe8] text-[#065740]" : BAD.includes(v) ? "bg-[#fce0df] text-[#ac2c28]" : WARN.includes(v) ? "bg-[#f8ecd6] text-[#8a5a0b]" : "bg-[#dceff9] text-[#026f9b]";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{value}</span>;
}

export type Tone = "blue" | "green" | "red" | "amber";
const TONE: Record<Tone, [string, string]> = { blue: ["bg-[#e8f4fb] border-[#e8f4fb]", "text-slate-900"], green: ["bg-[#d9efe8] border-[#d9efe8]", "text-slate-900"], red: ["bg-[#fce0df] border-[#fce0df]", "text-[#ac2c28]"], amber: ["bg-[#f8ecd6] border-[#f8ecd6]", "text-[#8a5a0b]"] };
export function Tiles({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }[] }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
      {items.map((s) => { const [box, num] = TONE[s.tone ?? "blue"]; return (
        <div key={s.label} className={`rounded-2xl border px-3.5 py-3 ${box}`}>
          <p className="text-[11.5px] text-slate-600">{s.label}</p>
          <p className={`mt-0.5 text-[24px] font-bold leading-tight tabular-nums ${num}`}>{s.value}</p>
          {s.sub && <p className="mt-1 text-[11.5px] text-slate-600">{s.sub}</p>}
        </div>
      ); })}
    </div>
  );
}

export const Loading = ({ on }: { on: boolean }) => (on ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-label="Loading" /> : null);
export const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-[13px] text-slate-500">{children}</p>;
export const Note = ({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" }) => <p role="status" className={`rounded-xl border px-4 py-2.5 text-[13px] text-slate-800 ${tone === "green" ? "border-[#b4ded0] bg-[#eaf6f2]" : tone === "amber" ? "border-[#f1d9a6] bg-[#fff8e6]" : "border-[#c0e4f3] bg-[#f3f9fd]"}`}>{children}</p>;
export const Pairs = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-[12.5px]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v || "—"}</dd></div>)}</dl>;
export const Lbl = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => <label className={`block ${className}`}><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

/** Reads a parent path; reloads when the path (and so the child) changes. */
export function useGet<T>(path: string | null) {
  return useLoad(() => (path ? schoolFetch<T>(path) : Promise.resolve(null as T)), [path]);
}
/** The path for the chosen child. */
export function useChildPath(path: string) {
  const { child } = useParent();
  return child ? `${path}${path.includes("?") ? "&" : "?"}child=${child.id}` : null;
}

/** "Child: Aarav · Class 7 B" with the child's roll number and class teacher, plus any further selectors. */
export function ChildBar({ children }: { children?: ReactNode }) {
  const { me, child, setChild } = useParent();
  if (!child) return <Empty>No child is linked to your account yet. Please contact the school office.</Empty>;
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <Select label="Child" value={child.id} onChange={setChild} options={me.children.map((c) => [c.id, [c.first_name, c.class_label].filter(Boolean).join(" · ")])} />
      {children}
      <p className="ml-auto pr-1 text-[11.5px] text-slate-500">{[child.name, child.roll_no ? `roll ${child.roll_no}` : "", child.class_teacher ? `class teacher ${child.class_teacher}` : ""].filter(Boolean).join(" · ")}</p>
    </div>
  );
}
export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2.5 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-1 pl-3 pr-2 text-[12.5px]">
      <span className="text-[#026f9b]">{label}</span>
      <span className="relative flex items-center">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent pr-5 font-semibold text-slate-900 outline-none">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
      </span>
    </label>
  );
}

export interface Col { h: string; right?: boolean }
export interface Row { /** what the row shows */ cells: ReactNode[]; /** the plain values, for sorting, searching and export */ values: (string | number)[]; action?: ReactNode }
/** A table panel with sortable columns, an optional search box and an Export button. */
export function DataTable({ title, sub, name, head, rows, empty = "Nothing here yet.", search = false, extra }: { title: string; sub?: string; name?: string; head: Col[]; rows: Row[]; empty?: string; search?: boolean; extra?: ReactNode }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: number; up: boolean } | null>(null);
  const shown = useMemo(() => {
    const list = q ? rows.filter((r) => r.values.join(" ").toLowerCase().includes(q.toLowerCase())) : rows;
    if (!sort) return list;
    return [...list].sort((a, b) => { const x = a.values[sort.col] ?? "", y = b.values[sort.col] ?? ""; const n = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return sort.up ? n : -n; });
  }, [rows, q, sort]);
  const acts = rows.some((r) => r.action);
  return (
    <Panel title={title} sub={sub} right={<span className="flex gap-2">{extra}{name && <button type="button" className={pill} disabled={!shown.length} onClick={() => downloadCsv(name, head.map((c) => c.h), shown.map((r) => r.values.slice(0, head.length)))}>Export</button>}</span>}>
      {search && <div className="border-b border-slate-100 px-4 py-2.5"><label className="flex w-72 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12.5px]"><Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} className="w-full bg-transparent outline-none" /></label></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[#f3f9fd]">
            <tr>
              {head.map((c, i) => <th key={c.h} aria-sort={sort?.col === i ? (sort.up ? "ascending" : "descending") : "none"} className={`px-4 py-2 ${c.right ? "text-right" : "text-left"}`}><button type="button" onClick={() => setSort({ col: i, up: sort?.col === i ? !sort.up : true })} className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{c.h}<ArrowUpDown className={`h-3 w-3 ${sort?.col === i ? "text-[#026f9b]" : "text-slate-300"}`} aria-hidden="true" /></button></th>)}
              {acts && <th className="px-4 py-2"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!shown.length && <tr><td colSpan={head.length + (acts ? 1 : 0)} className="px-4 py-8 text-center text-slate-400">{q ? "Nothing matches your search." : empty}</td></tr>}
            {shown.map((r, i) => <tr key={i} className="hover:bg-slate-50">{r.cells.map((cell, j) => <td key={j} className={`px-4 py-2.5 ${j === 0 ? "whitespace-nowrap" : ""} ${head[j]?.right ? "text-right tabular-nums" : ""}`}>{cell}</td>)}{acts && <td className="whitespace-nowrap px-4 py-2 text-right">{r.action}</td>}</tr>)}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
export const row = (values: (string | number)[], cells?: ReactNode[], action?: ReactNode): Row => ({ values, cells: cells ?? values, action });
export const bold = (v: ReactNode) => <span className="font-semibold text-slate-900">{v}</span>;

/** A page body: error, loading, then the content once the data is there. */
export function Loaded<T>({ r, children }: { r: { data: T | null; error: string; loading: boolean }; children: (data: T) => ReactNode }) {
  return (
    <div className="space-y-4">
      <ErrorBanner message={r.error} />
      <Loading on={r.loading && !r.data} />
      {r.data && !r.error && children(r.data)}
    </div>
  );
}
