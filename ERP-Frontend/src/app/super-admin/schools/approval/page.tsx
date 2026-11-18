"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, json, type SchoolList } from "@/lib/admin-api";
import { fmtDay, num, useAction } from "@/components/admin/dash";
import { Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { small, smallPrimary } from "../pages/shared";

interface Readiness {
  ready: boolean;
  checks: { key: string; label: string; done: boolean; required: boolean; detail: string }[];
}
interface Stats { waiting: number; oldest: string | null; approved_this_month: number; average_days: number | null; rejected_this_month: number; rejected_reason: string | null }

/** Approval: each school waiting to go live, with what is done and what is missing, and Approve or Reject. */
export default function ApprovalPage() {
  const list = useLoad(() => adminFetch<SchoolList>("/schools?group=pending&pageSize=50"), []);
  const stats = useLoad(() => adminFetch<Stats>("/schools/approval-stats"), []);
  const [ready, setReady] = useState<Record<string, Readiness>>({});
  const act = useAction(() => { list.reload(); stats.reload(); });

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

  const approve = (id: string, docsDone: boolean) => act.run(() => adminFetch(`/schools/${id}/approve`, json("POST", { status: "Trial", force: !docsDone })));
  const reject = (id: string, name: string) => {
    const why = window.prompt(`Why is ${name} being rejected? The reason is kept in its history.`);
    if (!why?.trim()) return;
    void act.run(() => adminFetch(`/schools/${id}/reject`, json("POST", { reason: why.trim() })));
  };

  const items = list.data?.items ?? [];
  const s = stats.data;

  return (
    <div className="space-y-5">
      <ErrorBanner message={list.error || stats.error || act.error} />
      <Tiles items={[
        { label: "Waiting for approval", value: s ? num(s.waiting) : "…", sub: s?.oldest ? `Oldest: ${fmtDay(s.oldest.slice(0, 10))}` : "Nothing waiting" },
        { label: "Approved this month", value: s ? num(s.approved_this_month) : "…", sub: s?.average_days != null ? `Average ${s.average_days} days to approve` : "None yet" },
        { label: "Rejected this month", value: s ? num(s.rejected_this_month) : "…", sub: s?.rejected_reason ?? "None" },
      ]} />

      {!items.length && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">{list.loading ? "Loading…" : "No schools are waiting for approval."}</p>}
      {items.map((sc) => {
        const r = ready[sc.id];
        const docsDone = r?.checks.find((c) => c.key === "documents")?.done ?? false;
        return (
          <section key={sc.id} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">{sc.name}</h2>
              <span className="text-[13px] text-slate-500">{sc.code}{sc.city ? ` · ${sc.city}` : ""}{sc.board ? ` · ${sc.board}` : ""} · {num(sc.students)} students</span>
              <span className="ml-auto flex items-center gap-2">
                <Link href={`/super-admin/schools/${sc.id}?tab=setup`} className={small}>Review</Link>
                <button type="button" className={small} disabled={act.busy} onClick={() => reject(sc.id, sc.name)}>Reject</button>
                <button type="button" className={smallPrimary} disabled={act.busy || !r?.ready} title={!r?.ready ? "A campus, plan and admin are needed first" : undefined}
                  onClick={() => (docsDone || window.confirm(`No document has been verified for ${sc.name}. Approve anyway?`)) && approve(sc.id, docsDone)}>
                  Approve
                </button>
              </span>
            </div>
            {!r ? <p className="px-5 py-4 text-sm text-slate-400">Checking…</p> : (
              <div className="grid gap-1 p-3 sm:grid-cols-2 lg:grid-cols-5">
                {r.checks.filter((c) => c.key !== "modules").map((c) => (
                  <div key={c.key} className="flex items-start gap-2.5 p-2">
                    <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-xs font-bold ${c.done ? "bg-[#d9efe8] text-[#065740]" : "bg-[#fce0df] text-[#ac2c28]"}`}>{c.done ? "✓" : "!"}</span>
                    <div><b className="block text-sm font-semibold text-slate-900">{c.label.replace(" verified", "").replace(" created", "").replace(" assigned", "")}</b><small className="text-xs text-slate-500">{c.detail}</small></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <p className="text-xs text-slate-500">Approving starts the school&apos;s free trial and lets its administrators sign in. Rejecting switches the school off; its data is kept.</p>
    </div>
  );
}
