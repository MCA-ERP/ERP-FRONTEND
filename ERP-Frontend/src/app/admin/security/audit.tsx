"use client";

import { useState } from "react";
import { adminFetch, qs, type AuditLog, type Paged } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { ErrorBanner, Pagination, Th, fmtDate, useLoad } from "@/components/admin/ui";
import AuditLogsPage from "../audit-logs/page";

export function AuditSection() {
  const [view, setView] = useState<"activity" | "changes">("activity");
  return (
    <>
      <Pills label="Audit logs" value={view} onChange={setView} items={[["activity", "User activity"], ["changes", "Data changes"]]} />
      {view === "activity" ? <AuditLogsPage /> : <DataChanges />}
    </>
  );
}

const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** The fields that differ between the old and the new record. */
function changedFields(oldData: unknown, newData: unknown): { field: string; from: unknown; to: unknown }[] {
  const a = asObject(oldData);
  const b = asObject(newData);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((field) => ({ field, from: a[field], to: b[field] }));
}

function DataChanges() {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => adminFetch<Paged<AuditLog>>(`/security/data-changes${qs({ page, pageSize: 25 })}`), [page]);
  return (
    <Panel title="Data changes" sub="Changes to important records, with the old and the new value side by side.">
      <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>When</Th><Th>By</Th><Th>Record</Th><Th>What changed</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No recorded changes yet. School details, plan changes and status changes appear here."}</td></tr>}
          {data?.items.map((l) => {
            const diffs = changedFields(l.old_data, l.new_data);
            return (
              <tr key={l.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(l.created_at)}</td>
                <td className="px-4 py-3 text-slate-800">{l.actor_email || "System"}</td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{l.entity_name}</p><p className="font-mono text-xs text-slate-400">{l.action}</p></td>
                <td className="px-4 py-3">
                  {!diffs.length && <span className="text-slate-400">No field differences</span>}
                  {diffs.slice(0, 6).map((d) => (
                    <p key={d.field} className="text-xs"><b className="text-slate-700">{d.field}</b>: <span className="text-rose-700">{show(d.from)}</span> → <span className="text-emerald-700">{show(d.to)}</span></p>
                  ))}
                  {diffs.length > 6 && <p className="text-xs text-slate-400">and {diffs.length - 6} more</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </Panel>
  );
}
