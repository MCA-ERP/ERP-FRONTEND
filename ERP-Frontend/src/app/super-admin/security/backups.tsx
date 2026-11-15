"use client";

import { adminFetch, type BackupInfo } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { ErrorBanner, Th, fmtDate, useLoad } from "@/components/admin/ui";

export function Backups() {
  const { data, error, loading } = useLoad(() => adminFetch<BackupInfo>("/backups"), []);
  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <Panel title="Backups">
        <div className="space-y-2 p-5 text-sm text-slate-600">
          <p>{loading && !data ? "Loading…" : data?.note}</p>
          <p className="text-xs text-slate-400">Backup schedules, a Back up now button and restores are run from the Supabase dashboard, because the database lives there. This portal cannot start or restore them for you.</p>
        </div>
      </Panel>
      <Panel title="Database changes applied" sub={`${data?.migrations.length ?? 0} migrations`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Migration</Th><Th>Applied</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data?.migrations.map((m) => (
              <tr key={m.version}><td className="px-4 py-2.5 font-mono text-xs">{m.version}</td><td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(m.applied_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
