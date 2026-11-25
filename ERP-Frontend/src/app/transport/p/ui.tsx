"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import { Panel, SimpleTable } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";

/** Small pieces shared by the Transport portal's own pages. */
export const MAX_FILE = 5 * 1024 * 1024;
export const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
export const fileProblem = (f: File) => (!["application/pdf", "image/png", "image/jpeg"].includes(f.type) ? `${f.name}: use a PDF, JPG or PNG file.` : f.size > MAX_FILE ? `${f.name}: the file is larger than 5 MB.` : "");
/** Send a file as the request body to a Transport path. */
export async function sendFile(path: string, file: File) {
  const headers = { ...((await getAuthHeaders()) as Record<string, string>), "Content-Type": file.type };
  const res = await fetch(`${API_BASE}/transport${path}`, { method: "POST", headers, body: file });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Could not upload ${file.name}.`);
}
export const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-[#026f9b]">{hint}</span>}</label>;
export const police = (s: string) => (s ? <Chip tone={s === "Verified" ? "good" : "warn"}>{s}</Chip> : <span className="text-slate-400">—</span>);
export const Note = ({ children }: { children: ReactNode }) => <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">{children}</p>;
export const Done = ({ text }: { text: string }) => (text ? <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">{text}</p> : null);
/** The labelled selector in a pill above a table or panel. */
export const PillSelect = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) => <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{children}</select></label>;
export const Bar = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{children}</div>;

export interface Line { key: string; find: string; cells: ReactNode[]; out: (string | number | null | undefined)[] }
/** A table panel with a count, Export, a search box with an optional filter beside it, and the table. */
export function Filtered({ title, noun, exportName, head, rows, empty, filter, initial = "", search = true }: { title: string; noun: string; exportName: string; head: string[]; rows: Line[]; empty: string; filter?: ReactNode; initial?: string; search?: boolean }) {
  const [q, setQ] = useState(initial);
  const shown = rows.filter((r) => !q.trim() || r.find.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Panel title={title} sub={`${shown.length} ${noun}`} right={<ExportPrint name={exportName} head={head.filter(Boolean)} rows={shown.map((r) => r.out)} />}>
      {search && <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} className="w-full bg-transparent outline-none" /></label>
        {filter}
      </div>}
      <SimpleTable head={head.map((h) => ({ h }))} rows={shown.map((r) => r.cells)} empty={empty} />
    </Panel>
  );
}
export const select = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900";
