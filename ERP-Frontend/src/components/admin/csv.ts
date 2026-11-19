import { buildXlsx } from "./xlsx";

type Cell = string | number | null | undefined;
export interface Report { filename: string; header: string[]; rows: Cell[][] }

const today = () => new Date().toISOString().slice(0, 10);
const clean = (v: Cell) => String(v ?? "").replace(/\s+/g, " ").trim();
export const escapeHtml = (v: Cell) => clean(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const reportTitle = (filename: string) => { const t = filename.replace(/[-_]+/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Saves the rows as a CSV file (opens in Excel, with Hindi and Telugu names intact). */
export function saveCsv({ filename, header, rows }: Report): void {
  const cell = (v: Cell) => { const t = clean(v); return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  save(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }), `${filename}-${today()}.csv`);
}

/** Saves the rows as an Excel sheet. */
export function saveExcel({ filename, header, rows }: Report): void {
  const sub = `My Class Assist · ${today()} · ${rows.length} row${rows.length === 1 ? "" : "s"}`;
  save(buildXlsx(reportTitle(filename), sub, header, rows), `${filename}-${today()}.xlsx`);
}

/** A printable page: the title, the date and the table. Shown in the preview and printed from there. */
export function reportHtml({ filename, header, rows }: Report): string {
  const th = header.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportTitle(filename))}</title><style>
    @page { size: A4 landscape; margin: 12mm }
    body { font: 11.5px/1.45 "Segoe UI", system-ui, Arial, sans-serif; color: #111827; margin: 0; padding: 18px }
    .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0294ce; padding-bottom: 8px; margin-bottom: 14px }
    h1 { font-size: 20px; margin: 0; color: #026f9b } p { margin: 0; color: #6b7280; font-size: 11px }
    table { width: 100%; border-collapse: collapse } th, td { border-bottom: 1px solid #e1e5ea; padding: 6px 9px; text-align: left; vertical-align: top }
    th { background: #0294ce; color: #fff; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em } tbody tr:nth-child(even) td { background: #f3f9fd }
    thead { display: table-header-group } tr { page-break-inside: avoid }
  </style></head><body><div class="top"><h1>${escapeHtml(reportTitle(filename))}</h1><p>My Class Assist · ${today()} · ${rows.length} row${rows.length === 1 ? "" : "s"}</p></div><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

// The Export / Print window: every Export and Print button calls downloadCsv, which opens it.
export type ReportMode = "export" | "print";
type Listener = (r: Report, mode: ReportMode) => void;
let listener: Listener | null = null;
let armed = false;
export const onReport = (l: Listener | null) => { listener = l; };
/** Makes the next downloadCsv call open the print preview instead of the export choices. */
export const armPrint = () => { armed = true; };

/** Opens the Export window (Excel, PDF, CSV) for these rows, or the print preview after armPrint(). */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]): void {
  const mode: ReportMode = armed ? "print" : "export";
  armed = false;
  if (listener) listener({ filename, header, rows }, mode);
  else saveCsv({ filename, header, rows });
}
