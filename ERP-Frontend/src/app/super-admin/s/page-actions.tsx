"use client";

import { useState } from "react";
import type { RefObject } from "react";
import { CalendarDays, Search } from "lucide-react";
import { PRESETS, useRangeControl, type Preset } from "@/components/admin/range";

/**
 * The bar above a Dashboard page: search this page, export what is on screen as a spreadsheet, and print or save the page as a report.
 * It works on whatever the page shows (every table in the page body), so it fits every Dashboard page without each one wiring it up.
 */
export function PageActions({ target, name }: { target: RefObject<HTMLElement | null>; name: string }) {
  const [q, setQ] = useState("");
  const ctl = useRangeControl();

  const search = (value: string) => {
    setQ(value);
    const needle = value.trim().toLowerCase();
    target.current?.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      row.hidden = !!needle && !(row.textContent ?? "").toLowerCase().includes(needle);
    });
  };

  const exportCsv = () => {
    const tables = Array.from(target.current?.querySelectorAll("table") ?? []);
    const cell = (t: string) => `"${t.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`;
    const out: string[] = [];
    tables.forEach((t, i) => {
      if (i) out.push("");
      const title = t.closest("section")?.querySelector("h2")?.textContent?.trim();
      if (title) out.push(cell(title));
      t.querySelectorAll("tr").forEach((row) => {
        if ((row as HTMLElement).hidden) return;
        const cells = Array.from(row.querySelectorAll("th,td"))
          .filter((c) => !c.querySelector("button, a[href]") || (c.textContent ?? "").trim().length > 12)
          .map((c) => cell(c.textContent ?? ""));
        if (cells.length) out.push(cells.join(","));
      });
    });
    if (!out.length) { window.alert("There is no table on this page to export."); return; }
    const blob = new Blob(["﻿" + out.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 print:hidden">
      {ctl && (
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3 pr-1.5 text-[#026f9b]">
            <CalendarDays className="size-4" aria-hidden="true" />
            <select aria-label="Date range" value={ctl.range.preset} onChange={(e) => ctl.setPreset(e.target.value as Preset)} className="cursor-pointer bg-transparent py-1.5 text-[13px] font-semibold text-slate-900 outline-none">
              {PRESETS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          {ctl.range.preset === "custom" ? (
            <span className="flex items-center gap-1.5 text-[12.5px]">
              <input type="date" aria-label="From" value={ctl.custom.from} max={ctl.custom.to} onChange={(e) => e.target.value && ctl.setCustom({ ...ctl.custom, from: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
              to
              <input type="date" aria-label="To" value={ctl.custom.to} min={ctl.custom.from} onChange={(e) => e.target.value && ctl.setCustom({ ...ctl.custom, to: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
            </span>
          ) : (
            <span className="text-[12.5px] text-slate-600">{ctl.range.label}</span>
          )}
        </div>
      )}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <label className="flex min-w-[200px] max-w-[280px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Search className="size-4 text-slate-400" aria-hidden="true" />
          <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search this page" aria-label="Search this page" className="w-full bg-transparent text-[13px] outline-none" />
        </label>
        <button type="button" onClick={exportCsv} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold hover:border-slate-400">Export</button>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-[#026f9b] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#014a67]">Download report</button>
      </div>
    </div>
  );
}
