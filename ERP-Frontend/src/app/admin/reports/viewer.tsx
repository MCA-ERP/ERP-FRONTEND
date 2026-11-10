"use client";

import { useEffect, useState } from "react";
import { adminFetch, qs, type ReportColumn, type ReportInfo, type ReportResult } from "@/lib/admin-api";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import { Panel, fmtDay, inr2, num } from "@/components/admin/dash";
import { ErrorBanner, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { Chart, type ChartData } from "./chart";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const firstOfMonth = () => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
/** The Indian financial year starts on 1 April. */
const fyStart = () => {
  const now = new Date();
  return iso(new Date(Date.UTC(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)));
};
const PRESETS: { label: string; from: () => string }[] = [
  { label: "Last 7 days", from: () => daysAgo(7) },
  { label: "Last 30 days", from: () => daysAgo(30) },
  { label: "This month", from: firstOfMonth },
  { label: "Last 90 days", from: () => daysAgo(90) },
  { label: "This financial year", from: fyStart },
];

const fmtCell = (c: ReportColumn, v: string | number | null) => {
  if (v === null || v === undefined || v === "") return "—";
  if (c.kind === "money" && typeof v === "number") return inr2(v);
  if (c.kind === "int" && typeof v === "number") return num(v);
  if (c.kind === "date" && typeof v === "string") return fmtDay(v.slice(0, 10));
  return String(v);
};

type Full = ReportResult & { chart?: ChartData };

/** Runs a report straight away, and again whenever the dates change. */
export function ReportViewer({ report, range, setRange }: { report: ReportInfo; range: { from: string; to: string }; setRange: (r: { from: string; to: string }) => void }) {
  const [result, setResult] = useState<Full | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const params = report.usesRange ? range : {};

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    adminFetch<Full>(`/reports/${report.key}${qs(params)}`).then(
      (r) => live && setResult(r),
      (e) => live && (setResult(null), setError(e instanceof Error ? e.message : "The report could not be run."))
    ).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.key, report.usesRange ? range.from : "", report.usesRange ? range.to : ""]);

  const download = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/reports/${report.key}/export${qs(params)}`, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Download failed (${res.status}).`);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.key}${report.usesRange ? `-${range.from}-to-${range.to}` : ""}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    }
  };

  return (
    <Panel title={report.name} sub={report.description} right={<button type="button" className={btnPrimary} onClick={download}>Download CSV</button>}>
      <div className="space-y-5 p-5">
        {report.usesRange ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">From
              <input type="date" className={`${inputCls} mt-1`} value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">To
              <input type="date" className={`${inputCls} mt-1`} value={range.to} min={range.from} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} />
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => <button key={p.label} type="button" className={`${btnGhost} !px-3 !py-1.5 text-xs`} onClick={() => setRange({ from: p.from(), to: iso(new Date()) })}>{p.label}</button>)}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">A snapshot of today. The date range does not apply.</p>
        )}
        <ErrorBanner message={error} />
        {loading && !result && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-label="Running the report" />}
        {result && (
          <div className={loading ? "opacity-60 transition" : "transition"} aria-busy={loading}>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {result.summary.map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{s.label}</dt>
                  <dd className="text-lg font-bold tabular-nums text-slate-900">{s.kind === "money" ? inr2(Number(s.value)) : typeof s.value === "number" ? num(s.value) : s.value}</dd>
                </div>
              ))}
            </dl>
            {result.chart && <div className="mt-5 rounded-xl border border-slate-200 p-4"><Chart chart={result.chart} title={report.name} /></div>}
            <div className="mt-5 max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{result.columns.map((c) => <th key={c.key} scope="col" className={`whitespace-nowrap px-3 py-2 ${c.kind === "money" || c.kind === "int" ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.length === 0 && <tr><td colSpan={result.columns.length} className="px-3 py-8 text-center text-slate-400">No data for this period.</td></tr>}
                  {result.rows.slice(0, 300).map((row, i) => (
                    <tr key={i}>{result.columns.map((c) => <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${c.kind === "money" || c.kind === "int" ? "text-right tabular-nums" : ""}`}>{fmtCell(c, row[c.key])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(result.rows.length > 300 || result.truncated) && (
              <p className="mt-2 text-xs text-slate-500">{result.truncated ? "This report is capped at 10,000 rows. Narrow the dates for the rest. " : ""}Showing the first 300 rows; download the CSV for all {num(result.rows.length)}.</p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
