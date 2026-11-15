"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Th, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

interface Status { login_events: { days: number; rows: number; oldest: string | null }; audit_logs: { days: number; rows: number; oldest: string | null } }

const KEPT: { what: string; period: string; why: string }[] = [
  { what: "Invoices and payments", period: "Never removed", why: "Billing records cannot be deleted; they are needed for tax rules." },
  { what: "Student records", period: "Never removed by the platform", why: "Each school owns its student data." },
  { what: "Support tickets", period: "Never removed", why: "Kept as the history of each school's requests." },
];

export function Retention() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Status>("/security/retention"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [draft, setDraft] = useState({ login: "", audit: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setDraft({ login: String(data.login_events.days), audit: String(data.audit_logs.days) }); }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (await run(() => adminFetch("/security/retention", json("PUT", { login_events_days: Number(draft.login), audit_logs_days: Number(draft.audit) })))) setSaved(true);
  };

  const days = (n: number) => (n % 365 === 0 ? `${n / 365} year${n === 365 ? "" : "s"}` : `${n} days`);

  return (
    <div className="space-y-4">
      <Panel title="Retention policies" sub="How long records are kept. Older records are deleted automatically, checked every six hours.">
        <form onSubmit={save} className="p-4">
          <ErrorBanner message={error || actionError} />
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Data</Th><Th>Keep for (days)</Th><Th>Now holds</Th><Th>Oldest record</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">Sign-in history</p><p className="text-xs text-slate-400">Every sign-in and failed attempt. At least 30 days.</p></td>
                <td className="px-4 py-3"><input type="number" min={30} max={3650} className={`${inputCls} w-28`} aria-label="Days to keep sign-in history" value={draft.login} onChange={(e) => setDraft({ ...draft, login: e.target.value })} /><p className="mt-1 text-xs text-slate-400">{draft.login && days(Number(draft.login))}</p></td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{loading && !data ? "…" : data?.login_events.rows.toLocaleString("en-IN")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{data?.login_events.oldest ? fmtDate(data.login_events.oldest) : "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">Audit logs</p><p className="text-xs text-slate-400">Who changed what. At least 180 days; 3 years is the usual period.</p></td>
                <td className="px-4 py-3"><input type="number" min={180} max={3650} className={`${inputCls} w-28`} aria-label="Days to keep audit logs" value={draft.audit} onChange={(e) => setDraft({ ...draft, audit: e.target.value })} /><p className="mt-1 text-xs text-slate-400">{draft.audit && days(Number(draft.audit))}</p></td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{loading && !data ? "…" : data?.audit_logs.rows.toLocaleString("en-IN")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{data?.audit_logs.oldest ? fmtDate(data.audit_logs.oldest) : "—"}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-end gap-3">
            {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
            <button type="submit" className={btnPrimary} disabled={busy || !data}>Save policies</button>
          </div>
        </form>
      </Panel>
      <Panel title="Kept for good" sub="These are not on a timer. The platform never deletes them by itself.">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Data</Th><Th>Kept</Th><Th>Why</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {KEPT.map((k) => <tr key={k.what}><td className="px-4 py-3 font-semibold text-slate-900">{k.what}</td><td className="px-4 py-3 text-slate-600">{k.period}</td><td className="px-4 py-3 text-xs text-slate-500">{k.why}</td></tr>)}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
