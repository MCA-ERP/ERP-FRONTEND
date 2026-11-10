"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { adminFetch, json, type Plan, type SchoolStatus } from "@/lib/admin-api";
import { Panel, StatusPill, fmtDay, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { RenewModal } from "../renew-modal";
import { PricingBadge, UsageBar, rupees, small, type Quote } from "../shared";

interface Detail {
  school: { id: string; code: string; name: string; status: SchoolStatus; students: number; arr_paise: number };
  subscription: {
    id: string; started_on: string; renews_on: string | null; trial_ends_on: string | null; billing_cycle: "annual" | "quarterly"; cancelled_at: string | null; cancel_reason: string | null;
    plans: { code: string; name: string; description: string | null; price_per_student_paise: number; student_limit: number | null; staff_limit: number | null; campus_limit: number | null; storage_gb: number | null };
  } | null;
  status_reason: string | null;
  usage: { students: number; staff: number; campuses: number };
  pending_request: { id: string; kind: string; note: string | null; to_plan: { name: string } } | null;
  special_pricing: { id: string; price_per_student_paise: number; valid_from: string; valid_until: string | null; reason: string; is_active: boolean }[];
  recent_invoices: { id: string; number: string; description: string; due_on: string; total_paise: number; paid_paise: number; status: string }[];
  quote: Quote | null;
}

export default function SchoolSubscriptionPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useLoad(() => adminFetch<Detail>(`/subscriptions/schools/${id}`), [id]);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const act = useAction(reload);
  const [renew, setRenew] = useState(false);
  const [planCode, setPlanCode] = useState("");

  const sub = data?.subscription;
  const p = sub?.plans;

  const extend = () => {
    const v = window.prompt("Extend the trial by how many days? (1-60)", "7");
    const n = Number(v);
    if (v && Number.isInteger(n) && n >= 1 && n <= 60) void act.run(() => adminFetch(`/subscriptions/schools/${id}/extend-trial`, json("POST", { days: n })));
  };
  const cancel = () => {
    const why = window.prompt("Why is this school leaving? This is kept in its history.");
    if (why?.trim().length) void act.run(() => adminFetch(`/subscriptions/schools/${id}/cancel`, json("POST", { reason: why.trim() })));
  };

  return (
    <>
      <Link href="/admin/subscriptions?tab=list" className="mb-2 inline-block text-sm font-semibold text-mca-blue">← All subscriptions</Link>
      <PageHeader
        title={data?.school.name ?? "Subscription"}
        subtitle={data ? `${data.school.code} · ${p?.name ?? "No plan"}` : undefined}
        action={data && <div className="flex items-center gap-3">{sub?.cancelled_at && <Badge tone="red">Cancelled</Badge>}<StatusPill status={data.school.status} /><Link href={`/admin/schools/${id}`} className={btnGhost}>Open school</Link></div>}
      />
      <ErrorBanner message={error || act.error} />
      {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}

      {data && !sub && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This school has no subscription. Assign a plan from the school&apos;s Plan &amp; modules tab.</p>}

      {data && sub && p && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Subscription details" sub="Billing and key dates">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Started</dt><dd>{fmtDay(sub.started_on)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">{sub.trial_ends_on ? "Trial ends" : "Renews"}</dt><dd>{fmtDay(sub.trial_ends_on ?? sub.renews_on)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Billing cycle</dt>
                <dd><select className={`${inputCls} !py-1`} aria-label="Billing cycle" value={sub.billing_cycle} disabled={act.busy} onChange={(e) => act.run(() => adminFetch(`/subscriptions/schools/${id}/cycle`, json("PATCH", { cycle: e.target.value })))}><option value="annual">Annual</option><option value="quarterly">Quarterly</option></select></dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Yearly value</dt><dd className="tabular-nums">{rupees(data.school.arr_paise)}</dd></div>
              {sub.cancelled_at && <div className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-800">Cancelled on {fmtDay(sub.cancelled_at.slice(0, 10))}: {sub.cancel_reason}</div>}
              {data.status_reason && !sub.cancelled_at && <div className="col-span-2 text-xs text-slate-500">Status reason: {data.status_reason}</div>}
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
              {!sub.cancelled_at && <button type="button" className={btnPrimary} onClick={() => setRenew(true)}>Raise renewal invoice</button>}
              {data.school.status === "Trial" && <button type="button" className={btnGhost} disabled={act.busy} onClick={extend}>Extend trial</button>}
              {sub.cancelled_at
                ? <button type="button" className={btnGhost} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/subscriptions/schools/${id}/reinstate`, json("POST", {})))}>Reinstate</button>
                : <button type="button" className={`${btnGhost} text-rose-700`} disabled={act.busy} onClick={cancel}>Cancel subscription</button>}
            </div>
          </Panel>

          <Panel title="Assigned plan" sub={p.description ?? undefined}>
            <div className="space-y-4 p-5">
              <div className="flex items-baseline justify-between"><p className="text-lg font-bold text-slate-900">{p.name}</p><p className="text-sm text-slate-600">{rupees(p.price_per_student_paise)} per student / year</p></div>
              <UsageBar label="Students" used={data.usage.students} cap={p.student_limit} />
              <UsageBar label="Staff accounts" used={data.usage.staff} cap={p.staff_limit} />
              <UsageBar label="Campuses" used={data.usage.campuses} cap={p.campus_limit} />
              <p className="text-xs text-slate-400">Storage: {p.storage_gb ? p.storage_gb + " GB included" : "unlimited"}.</p>
              {data.pending_request && <p className="rounded-lg bg-mca-blue-sky/60 px-3 py-2 text-sm text-mca-blue-dark">The school asked for a <b>{data.pending_request.kind}</b> to {data.pending_request.to_plan.name}. <Link className="font-semibold underline" href="/admin/subscriptions?tab=changes">Decide</Link></p>}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <select className={`${inputCls} max-w-[12rem]`} aria-label="Move to plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                  <option value="">Move to…</option>{plans.data?.plans.filter((x) => x.code !== p.code).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>
                <button type="button" className={btnGhost} disabled={act.busy || !planCode} onClick={() => window.confirm("Move this school to the new plan now?") && act.run(() => adminFetch(`/subscriptions/schools/${id}/change-plan`, json("POST", { plan_code: planCode })).then(() => setPlanCode(""))) }>Change plan</button>
              </div>
            </div>
          </Panel>

          <Panel title="Next renewal price" sub="What the next renewal invoice would be">
            <div className="space-y-2 p-5 text-sm">
              {data.quote ? (
                <>
                  <div className="flex items-center justify-between"><span className="text-slate-600">{data.quote.students.toLocaleString("en-IN")} students × {rupees(data.quote.unit_price_paise)} ({data.quote.cycle})</span><PricingBadge applied={data.quote.applied} /></div>
                  <p className="text-xl font-bold text-slate-900">{rupees(data.quote.total_paise)} <span className="text-xs font-normal text-slate-500">before GST{data.quote.addons.length ? ", including " + data.quote.addons.length + " add-on" + (data.quote.addons.length === 1 ? "" : "s") : ""}</span></p>
                  <p className="text-xs text-slate-400">For {fmtDay(data.quote.period_start)} to {fmtDay(data.quote.period_end)}</p>
                </>
              ) : <p className="text-slate-400">No price can be worked out yet.</p>}
              {data.special_pricing.filter((s) => s.is_active).map((s) => <p key={s.id} className="text-xs text-slate-500">Special price {rupees(s.price_per_student_paise)} ({s.reason}) {s.valid_until ? "until " + fmtDay(s.valid_until) : ""}</p>)}
            </div>
          </Panel>

          <Panel title="Recent invoices" right={<Link href="/admin/payments" className={`${small}`}>All payments</Link>}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><Th>Invoice</Th><Th>Due</Th><Th>Total</Th><Th>Status</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!data.recent_invoices.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No invoices yet.</td></tr>}
                {data.recent_invoices.map((i) => (
                  <tr key={i.id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{i.number}</p><p className="text-xs text-slate-400">{i.description}</p></td><td className="px-4 py-3 text-xs text-slate-600">{fmtDay(i.due_on)}</td><td className="px-4 py-3 tabular-nums">{rupees(i.total_paise)}</td><td className="px-4 py-3"><Badge tone={i.status === "Paid" ? "green" : i.status === "Overdue" ? "red" : "gray"}>{i.status}</Badge></td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
      <RenewModal school={renew && data ? { id, name: data.school.name } : null} onClose={() => setRenew(false)} onDone={reload} />
    </>
  );
}
