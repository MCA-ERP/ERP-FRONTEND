"use client";

import { useEffect, useRef, useState } from "react";
import { onReport, reportHtml, reportTitle, saveCsv, saveExcel, type Report, type ReportMode } from "./csv";

const btn = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-800 hover:border-slate-400";
const primary = "rounded-full bg-[#026f9b] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67]";

/** The window behind every Export and Print button. Export: pick Excel, PDF or CSV. Print: preview, then print. Mounted once in the layout. */
export function ReportHost() {
  const [report, setReport] = useState<Report | null>(null);
  const [mode, setMode] = useState<ReportMode>("export");
  const [kind, setKind] = useState<"excel" | "pdf" | "csv">("excel");
  const [preview, setPreview] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { onReport((r, m) => { setReport(r); setMode(m); setKind("excel"); setPreview(m === "print"); }); return () => onReport(null); }, []);
  useEffect(() => {
    if (!report) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setReport(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [report]);
  if (!report) return null;
  const close = () => setReport(null);
  const print = () => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); };
  const doExport = () => {
    if (kind === "pdf") { setPreview(true); return; }
    (kind === "csv" ? saveCsv : saveExcel)(report);
    close();
  };
  const title = preview ? (mode === "print" ? "Print preview" : "PDF preview") : "Export";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-xl ${preview ? "max-w-5xl" : "max-w-sm"}`}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <span className="text-xs text-slate-500">{reportTitle(report.filename)} · {report.rows.length} row{report.rows.length === 1 ? "" : "s"}</span>
          <button type="button" className={`${btn} ml-auto !px-3 !py-1`} onClick={close}>Close</button>
        </div>
        {!preview ? (
          <>
            <fieldset className="space-y-1 p-5">
              <legend className="sr-only">Format</legend>
              {([["excel", "Excel"], ["pdf", "PDF"], ["csv", "CSV"]] as const).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-900 hover:bg-slate-50">
                  <input type="radio" name="report-format" className="h-4 w-4 accent-[#026f9b]" checked={kind === k} onChange={() => setKind(k)} />{label}
                </label>
              ))}
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className={btn} onClick={close}>Cancel</button>
              <button type="button" className={primary} onClick={doExport}>Export</button>
            </div>
          </>
        ) : (
          <>
            <iframe ref={frame} title="Report preview" srcDoc={reportHtml(report)} className="h-[65vh] w-full flex-1 border-0 bg-slate-100" />
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              {mode === "export" && <span className="mr-auto text-xs text-slate-500">Choose “Save as PDF” as the printer to get a PDF file.</span>}
              {mode === "export" && <button type="button" className={btn} onClick={() => setPreview(false)}>Back</button>}
              <button type="button" className={primary} onClick={print}>{mode === "print" ? "Print" : "Save as PDF"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
