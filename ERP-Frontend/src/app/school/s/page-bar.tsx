"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { armPrint, downloadCsv } from "@/components/admin/csv";

export interface YearOpt { id: string; name: string }

/** The bar above a Dashboard page: pick the academic year, search this page, and print it as a report. */
export function PageBar({ years, year, onYear, name }: { years: YearOpt[]; year: string; onYear: (id: string) => void; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const scope = () => ref.current?.closest<HTMLElement>("[data-report]") ?? null;

  const search = (value: string) => {
    setQ(value);
    const needle = value.trim().toLowerCase();
    scope()?.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => { row.hidden = !!needle && !(row.textContent ?? "").toLowerCase().includes(needle); });
  };

  const print = () => {
    const tables = Array.from(scope()?.querySelectorAll("table") ?? []);
    const cells = (t: Element) => Array.from(t.querySelectorAll("tr")).filter((r) => !(r as HTMLElement).hidden)
      .map((row) => Array.from(row.querySelectorAll("th,td")).filter((c) => !c.querySelector("button, a[href]") || (c.textContent ?? "").trim().length > 12).map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim())).filter((r) => r.length);
    const header: string[] = [];
    const rows: string[][] = [];
    tables.forEach((t, i) => {
      const all = cells(t);
      if (!all.length) return;
      const title = t.closest("section")?.querySelector("h2")?.textContent?.trim();
      if (i && rows.length) rows.push([]);
      if (title && tables.length > 1) rows.push([title]);
      if (!header.length) { header.push(...all[0]); rows.push(...all.slice(1)); } else rows.push(...all);
    });
    if (!rows.length) { window.alert("There is no table on this page to print."); return; }
    armPrint();
    downloadCsv(name, header, rows);
  };

  return (
    <div ref={ref} className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 print:hidden">
      <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">
        Academic year
        <select aria-label="Academic year" value={year} onChange={(e) => onYear(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
          {years.length === 0 && <option value="">—</option>}
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </label>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <label className="flex min-w-[200px] max-w-[280px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Search className="size-4 text-slate-400" aria-hidden="true" />
          <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search this page" aria-label="Search this page" className="w-full bg-transparent text-[13px] outline-none" />
        </label>
        <button type="button" onClick={print} className="rounded-full bg-[#026f9b] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#014a67]">Print</button>
      </div>
    </div>
  );
}
