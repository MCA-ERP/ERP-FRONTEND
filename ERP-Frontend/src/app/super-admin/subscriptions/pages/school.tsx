"use client";

import Link from "next/link";
import { adminFetch, type ModuleRow } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, inr, num } from "@/components/admin/dash";
import { Chip, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { SchoolBar, small } from "../../schools/pages/shared";
import { UsageBar, type Quote } from "../shared";
import { limitText } from "./plans";

export type SchoolSubTab = "details" | "plan";
interface Detail {
  school: { id: string; code: string; name: string; status: string; students: number; arr_paise: number };
  subscription: {
    id: string; started_on: string; renews_on: string | null; trial_ends_on: string | null; billing_cycle: "annual" | "quarterly"; cancelled_at: string | null; cancel_reason: string | null;
    plans: { code: string; name: string; description: string | null; price_per_student_paise: number; student_limit: number | null; staff_limit: number | null; campus_limit: number | null; storage_gb: number | null };
  } | null;
  usage: { students: number; staff: number; campuses: number; sms_this_year?: number };
  special_pricing: { id: string; price_per_student_paise: number; is_active: boolean; reason: string }[];
  recent_invoices: { id: string; number: string; description: string; due_on: string; total_paise: number; paid_paise: number; status: string }[];
  quote: Quote | null;
}
interface Matrix { modules: ModuleRow[]; plans: { code: string; module_codes: string[] }[] }

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-[13px] last:border-0"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v}</dd></div>;

/** School subscription: one school's plan, dates, usage and billing (Subscription details), or what its plan includes (Assigned plan). */
export function SchoolSubscriptionPage({ tab }: { tab: SchoolSubTab }) {
  return <SchoolBar>{(s) => <Body id={s.id} tab={tab} />}</SchoolBar>;
}

function Body({ id, tab }: { id: string; tab: SchoolSubTab }) {
  const d = useLoad(() => adminFetch<Detail>(`/subscriptions/schools/${id}`), [id]);
  const matrix = useLoad(() => (tab === "plan" ? adminFetch<Matrix>("/plan-modules") : Promise.resolve(null)), [tab]);
  const data = d.data;
  const sub = data?.subscription;
  const p = sub?.plans;
  const cancelled = !!sub?.cancelled_at;

  if (d.loading && !data) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  if (data && !sub) return <><ErrorBanner message={d.error} /><p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This school has no subscription yet. Assign a plan from the school&apos;s profile.</p></>;
  if (!data || !sub || !p) return <ErrorBanner message={d.error} />;

  const gst = Math.round(data.school.arr_paise * 1.18);
  const open = <Link href={`/super-admin/subscriptions/${id}`} className={small}>Open full subscription</Link>;

  if (tab === "details") {
    return (
      <div className="space-y-5">
        <ErrorBanner message={d.error} />
        <Tiles items={[
          { label: "Plan", value: <span className="text-xl">{p.name}</span>, sub: `${inr(p.price_per_student_paise)} per student / year` },
          { label: "Annual value", value: inr(data.school.arr_paise), sub: `${inr(gst)} with 18% GST` },
          { label: "Status", value: <span className="text-xl">{cancelled ? "Cancelled" : data.school.status}</span>, sub: sub.trial_ends_on ? `Trial ends ${fmtDay(sub.trial_ends_on)}` : sub.renews_on ? `Renews ${fmtDay(sub.renews_on)}` : undefined },
          { label: "Students", value: `${num(data.usage.students)}${p.student_limit ? ` / ${num(p.student_limit)}` : ""}`, sub: p.student_limit ? `${Math.round((data.usage.students / p.student_limit) * 100)}% of the limit` : "No limit" },
        ]} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Subscription" right={open}>
            <dl className="px-5 py-2">
              <Row k="School" v={data.school.name} />
              <Row k="Plan" v={p.name} />
              <Row k="Billing" v={sub.billing_cycle === "annual" ? "Annual" : "Quarterly"} />
              <Row k="Started" v={fmtDay(sub.started_on)} />
              <Row k={sub.trial_ends_on ? "Trial ends" : "Renews"} v={fmtDay(sub.trial_ends_on ?? sub.renews_on)} />
              <Row k="Special pricing" v={data.special_pricing.find((x) => x.is_active) ? `${inr(data.special_pricing.find((x) => x.is_active)!.price_per_student_paise)} per student` : "None"} />
              {cancelled && <Row k="Cancelled" v={sub.cancel_reason ?? fmtDay(sub.cancelled_at?.slice(0, 10))} />}
            </dl>
          </Panel>
          <Panel title="Usage">
            <div className="space-y-4 p-5">
              <UsageBar label="Students" used={data.usage.students} cap={p.student_limit} />
              <UsageBar label="Staff accounts" used={data.usage.staff} cap={p.staff_limit} />
              <UsageBar label="Campuses" used={data.usage.campuses} cap={p.campus_limit} />
              <p className="text-xs text-slate-500">SMS this year: {num(data.usage.sms_this_year ?? 0)}. Storage: {p.storage_gb ? `${p.storage_gb} GB included` : "unlimited"}; usage is not measured yet.</p>
            </div>
          </Panel>
        </div>
        <Panel title="Billing history" sub="Latest invoices">
          <SimpleTable head={[{ h: "Invoice" }, { h: "For" }, { h: "Due" }, { h: "Amount", right: true }, { h: "Status" }]} empty="No invoices yet."
            rows={data.recent_invoices.map((i) => [i.number, i.description, fmtDay(i.due_on), inr(i.total_paise), <Chip key="c" tone={i.status === "Paid" ? "good" : i.status === "Overdue" ? "bad" : "warn"}>{i.status}</Chip>])} />
        </Panel>
      </div>
    );
  }

  const included = new Set(matrix.data?.plans.find((x) => x.code === p.code)?.module_codes ?? []);
  const mods = (matrix.data?.modules ?? []).filter((m) => m.is_core || included.has(m.code));
  return (
    <div className="space-y-5">
      <ErrorBanner message={d.error || matrix.error} />
      <Panel title="Assigned plan" sub={data.school.name} right={<span className="flex gap-2"><Link href={`/super-admin/subscriptions/${id}`} className={small}>Change plan</Link></span>}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#0294ce] bg-[#f3f9fd] p-5">
            <h3 className="text-[17px] font-semibold text-slate-900">{p.name}</h3>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{inr(p.price_per_student_paise)}<small className="ml-1 text-xs font-normal text-slate-500">/ student / year</small></p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-slate-800">
              <li>{p.student_limit === null ? "Unlimited students" : `Up to ${num(p.student_limit)} students`}</li>
              <li>{limitText(p.staff_limit)} staff accounts · {p.storage_gb ? `${p.storage_gb} GB` : "Unlimited"} storage</li>
              <li>{limitText(p.campus_limit)} campuses</li>
            </ul>
            {p.description && <p className="mt-3 text-xs text-slate-600">{p.description}</p>}
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-slate-900">Included modules ({mods.length})</p>
            <ul className="flex flex-wrap gap-1.5">
              {!mods.length && <li className="text-sm text-slate-400">{matrix.loading ? "Loading…" : "None"}</li>}
              {mods.map((m) => <li key={m.code} className="rounded-full bg-[#d9efe8] px-2.5 py-0.5 text-xs font-medium text-[#065740]">✓ {m.name}</li>)}
            </ul>
            <div className="mt-4"><ViewButton href="/super-admin/subscriptions/features?tab=modules" label="Edit plan features" /></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
