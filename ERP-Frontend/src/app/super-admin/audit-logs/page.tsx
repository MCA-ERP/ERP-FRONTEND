"use client";

import { Fragment, useState } from "react";
import { adminFetch, qs, type AuditLog, type Paged } from "@/lib/admin-api";
import {
  Card, EmptyRow, ErrorBanner, PageHeader, Pagination, Th, fmtDate, inputCls, useDebounced, useLoad,
} from "@/components/admin/ui";

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const { data, error, loading } = useLoad(
    () => adminFetch<Paged<AuditLog>>(`/audit-logs${qs({ search: debounced, page, pageSize: 25 })}`),
    [debounced, page]
  );

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Every successful change made through the API." />
      <ErrorBanner message={error} />

      <Card>
        <div className="p-4">
          <input
            className={`${inputCls} max-w-xs`} placeholder="Search actor, action or entity…" aria-label="Search audit logs"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50">
              <tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>IP</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={6} loading={loading} text="No audit events found." />}
              {data?.items.map((l) => (
                <Fragment key={l.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3 text-slate-800">{l.actor_email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                    <td className="px-4 py-3 text-slate-600">{l.entity_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{l.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {l.new_data != null && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-mca-blue hover:underline"
                          aria-expanded={open === l.id}
                          onClick={() => setOpen(open === l.id ? null : l.id)}
                        >
                          {open === l.id ? "Hide" : "Details"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                          {JSON.stringify(l.new_data, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
