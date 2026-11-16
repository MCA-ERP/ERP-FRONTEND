"use client";

import { armPrint, downloadCsv } from "./csv";

const cls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400 disabled:opacity-50";

/** The Export and Print buttons at the top right of a table panel. */
export function ExportPrint({ name, head, rows }: { name: string; head: string[]; rows: (string | number | null | undefined)[][] }) {
  return (
    <span className="flex gap-2">
      <button type="button" className={cls} onClick={() => downloadCsv(name, head, rows)}>Export</button>
      <button type="button" className={cls} onClick={() => { armPrint(); downloadCsv(name, head, rows); }}>Print</button>
    </span>
  );
}
