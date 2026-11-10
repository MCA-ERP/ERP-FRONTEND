"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, json, type SchoolList } from "@/lib/admin-api";
import { PlanTag, useAction } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, PageHeader, Th, btnGhost, btnPrimary, fmtDate, useLoad } from "@/components/admin/ui";

interface Readiness {
  ready: boolean;
  checks: { key: string; label: string; done: boolean; required: boolean; detail: string }[];
}

/** Schools waiting for approval, with what is still missing for each. */
export default function ApprovalPage() {
  const list = useLoad(() => adminFetch<SchoolList>("/schools?group=pending&pageSize=50"), []);
  const [ready, setReady] = useState<Record<string, Readiness>>({});
  const act = useAction(list.reload);

  useEffect(() => {
    let live = true;
    (async () => {
      for (const s of list.data?.items ?? []) {
        try {
          const r = await adminFetch<Readiness>(`/schools/${s.id}/readiness`);
          if (live) setReady((m) => ({ ...m, [s.id]: r }));
        } catch { /* a school that vanished is simply not shown ready */ }
      }
    })();
    return () => { live = false; };
  }, [list.data]);

  const approve = (id: string, status: "Trial" | "Active", docsDone: boolean) =>
    act.run(() => adminFetch(`/schools/${id}/approve`, json("POST", { status, force: !docsDone })));

  return (
    <>
      <PageHeader title="Approval" subtitle="Check each school's documents, campus, plan and admin, then approve it." />
      <ErrorBanner message={list.error || act.error} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50"><tr><Th>School</Th><Th>Checklist</Th><Th>Registered</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!list.data?.items.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{list.loading ? "Loading…" : "Nothing is waiting for approval."}</td></tr>}
              {list.data?.items.map((s) => {
                const r = ready[s.id];
                const docsDone = r?.checks.find((c) => c.key === "documents")?.done ?? false;
                return (
                  <tr key={s.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""} · <PlanTag code={s.plan_code} name={s.plan_name} /></p></td>
                    <td className="px-4 py-3">
                      {!r ? <span className="text-xs text-slate-400">Checking…</span> : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.checks.map((c) => <Badge key={c.key} tone={c.done ? "green" : c.required ? "red" : "gray"}>{c.done ? "✓" : "✗"} {c.label}</Badge>)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(s.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/schools/${s.id}?tab=setup`} className={`${btnGhost} !px-2.5 !py-1 text-xs`}>Review</Link>
                        <button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy || !r?.ready}
                          title={!r?.ready ? "A campus, plan and admin are needed first" : undefined}
                          onClick={() => (docsDone || window.confirm(`No document has been verified for ${s.name}. Approve anyway?`)) && approve(s.id, "Trial", docsDone)}>
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-400">Approving starts the school&apos;s free trial and lets its administrators sign in. A paying school can be approved from its Setup tab.</p>
    </>
  );
}
