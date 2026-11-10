"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type Plan } from "@/lib/admin-api";
import { Panel, PlanTag, StatusPill, TabBar, fmtDay, daysTo, useAction } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, Field, Modal, PageHeader, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { BillingSection, DiscountsSection } from "./discounts";
import { RenewModal } from "./renew-modal";
import { limitText, rupees, small, type PlanFull, type SubRow } from "./shared";
import type { SchoolStatus } from "@/lib/admin-api";

type Tab = "plans" | "list" | "renewals" | "changes" | "trials" | "discounts" | "billing";
const TABS: [Tab, string][] = [["plans", "Plans"], ["list", "Subscriptions"], ["renewals", "Renewals"], ["changes", "Upgrades & downgrades"], ["trials", "Trials"], ["discounts", "Discounts"], ["billing", "Billing"]];

const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>("plans");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some(([k]) => k === t)) setTab(t);
  }, []);
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Plans, who is on them, renewals, trials, discounts and billing rules." />
      <TabBar value={tab} onChange={setTab} tabs={TABS} />
      {tab === "plans" && <Plans />}
      {tab === "list" && <SubscriptionList />}
      {tab === "renewals" && <Renewals />}
      {tab === "changes" && <Changes />}
      {tab === "trials" && <Trials />}
      {tab === "discounts" && <DiscountsSection />}
      {tab === "billing" && <BillingSection />}
    </>
  );
}

// ═════════════ Plans ═════════════
const blankPlan = { code: "", name: "", description: "", price: "", student_limit: "", staff_limit: "", campus_limit: "", storage_gb: "", trial_days: "", sort_order: "10" };

function Plans() {
  const [view, setView] = useState<"list" | "limits">("list");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ plans: PlanFull[] }>("/subscriptions/plans"), []);
  const act = useAction(reload);
  const [open, setOpen] = useState<PlanFull | "new" | null>(null);
  const [f, setF] = useState(blankPlan);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const openForm = (p: PlanFull | "new") => {
    setF(p === "new" ? blankPlan : {
      code: p.code, name: p.name, description: p.description ?? "", price: String(p.price_per_student_paise / 100),
      student_limit: p.student_limit?.toString() ?? "", staff_limit: p.staff_limit?.toString() ?? "", campus_limit: p.campus_limit?.toString() ?? "",
      storage_gb: p.storage_gb?.toString() ?? "", trial_days: p.trial_days?.toString() ?? "", sort_order: String(p.sort_order),
    });
    setOpen(p);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      name: f.name, description: f.description, price_per_student_paise: Math.round(Number(f.price) * 100),
      student_limit: num(f.student_limit), staff_limit: num(f.staff_limit), campus_limit: num(f.campus_limit),
      storage_gb: num(f.storage_gb), trial_days: num(f.trial_days), sort_order: Number(f.sort_order || 0),
    };
    const ok = await act.run(() =>
      open === "new" ? adminFetch("/subscriptions/plans", json("POST", { ...body, code: f.code })) : adminFetch(`/subscriptions/plans/${(open as PlanFull).id}`, json("PATCH", body))
    );
    if (ok) setOpen(null);
  };
  const set = (k: keyof typeof blankPlan) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <TabBar value={view} onChange={setView} tabs={[["list", "Plan list"], ["limits", "Features & limits"]]} />
      <Panel title={view === "list" ? "Plans" : "What each plan includes"} sub={view === "list" ? "A price change applies to renewals issued from now on; invoices already issued keep their price." : "Students, staff, campuses and storage. Limits are enforced when a school adds students, staff or campuses."}
        right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Create plan</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
        {view === "list" ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Plan</Th><Th>Price per student / year</Th><Th>Schools</Th><Th>Modules</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.plans.length && <Empty cols={6} loading={loading} text="No plans." />}
              {data?.plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.code}{p.description ? " · " + p.description : ""}</p></td>
                  <td className="px-4 py-3 tabular-nums">{rupees(p.price_per_student_paise)}</td>
                  <td className="px-4 py-3 tabular-nums">{p.schools}</td>
                  <td className="px-4 py-3"><Link href="/admin/modules" className="font-semibold text-mca-blue">{p.module_count} modules</Link></td>
                  <td className="px-4 py-3">{p.is_active ? <Badge tone="green">Offered</Badge> : <Badge tone="gray">Retired</Badge>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={small} onClick={() => openForm(p)}>Edit</button>
                      <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/subscriptions/plans/${p.id}/active`, json("PATCH", { is_active: !p.is_active })))}>{p.is_active ? "Retire" : "Offer again"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><Th>Plan</Th><Th>Students</Th><Th>Staff accounts</Th><Th>Campuses</Th><Th>Storage</Th><Th>Trial</Th><Th>Modules</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data?.plans.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3">{limitText(p.student_limit)}</td><td className="px-4 py-3">{limitText(p.staff_limit)}</td>
                    <td className="px-4 py-3">{limitText(p.campus_limit)}</td><td className="px-4 py-3">{limitText(p.storage_gb, " GB")}</td>
                    <td className="px-4 py-3">{p.trial_days === null ? "Platform default" : p.trial_days + " days"}</td>
                    <td className="px-4 py-3"><Link href="/admin/modules" className="font-semibold text-mca-blue">{p.module_count}</Link></td>
                    <td className="px-4 py-3 text-right"><button type="button" className={small} onClick={() => openForm(p)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Storage is recorded per plan; it is enforced once schools can upload files. Module access is set under Modules.</p>
          </div>
        )}
      </Panel>

      <Modal open={open !== null} title={open === "new" ? "Create plan" : "Edit plan"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code" hint={open === "new" ? "Cannot change later" : undefined}><input className={inputCls} required disabled={open !== "new"} value={f.code} onChange={set("code")} placeholder="gold" /></Field>
            <div className="col-span-2"><Field label="Name"><input className={inputCls} required value={f.name} onChange={set("name")} /></Field></div>
          </div>
          <Field label="Description"><input className={inputCls} value={f.description} onChange={set("description")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price per student per year (₹)"><input type="number" min={0} step="0.01" className={inputCls} required value={f.price} onChange={set("price")} /></Field>
            <Field label="Position in lists"><input type="number" min={0} className={inputCls} value={f.sort_order} onChange={set("sort_order")} /></Field>
            <Field label="Student limit" hint="Empty = unlimited"><input type="number" min={1} className={inputCls} value={f.student_limit} onChange={set("student_limit")} /></Field>
            <Field label="Staff accounts" hint="Empty = unlimited"><input type="number" min={1} className={inputCls} value={f.staff_limit} onChange={set("staff_limit")} /></Field>
            <Field label="Campuses" hint="Empty = unlimited"><input type="number" min={1} className={inputCls} value={f.campus_limit} onChange={set("campus_limit")} /></Field>
            <Field label="Storage (GB)" hint="Empty = unlimited"><input type="number" min={1} className={inputCls} value={f.storage_gb} onChange={set("storage_gb")} /></Field>
            <Field label="Trial days" hint="Empty = platform default"><input type="number" min={0} max={90} className={inputCls} value={f.trial_days} onChange={set("trial_days")} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Save</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ═════════════ Subscription list ═════════════
function SubscriptionList() {
  const [group, setGroup] = useState<"active" | "trial" | "expired" | "cancelled">("active");
  const [plan, setPlan] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans?all=1"), []);
  const { data, error, loading } = useLoad(() => adminFetch<Paged<SubRow>>(`/subscriptions${qs({ group, plan, search: q, page })}`), [group, plan, q, page]);
  const desc = { active: "Paid subscriptions in force.", trial: "Schools on a free trial.", expired: "Subscriptions that ended or lapsed.", cancelled: "Schools that cancelled and left the platform." };

  return (
    <>
      <TabBar value={group} onChange={(g) => { setGroup(g); setPage(1); }} tabs={[["active", "Active"], ["trial", "Trial"], ["expired", "Expired"], ["cancelled", "Cancelled"]]} />
      <ErrorBanner message={error} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search school or code…" aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
            <option value="">All plans</option>{plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
          <span className="text-xs text-slate-500">{desc[group]}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>School</Th><Th>Plan</Th><Th>Students</Th><Th>Yearly value</Th><Th>Status</Th><Th>{group === "trial" ? "Trial ends" : "Renews"}</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <Empty cols={7} loading={loading} text="No subscriptions here." />}
              {data?.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}</p></td>
                  <td className="px-4 py-3"><PlanTag code={s.plan_code} name={s.plan_name} /></td>
                  <td className="px-4 py-3 tabular-nums">{s.students.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 tabular-nums">{rupees(s.arr_paise)}</td>
                  <td className="px-4 py-3"><StatusPill status={s.status as SchoolStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDay(s.trial_ends_on ?? s.renews_on)}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/subscriptions/${s.id}`} className={small}>Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>
    </>
  );
}

// ═════════════ Renewals ═════════════
interface Upcoming extends SubRow { open_invoice: string | null }
interface Hist { id: string; type: string; summary: string; created_at: string; institution_id: string; institutions: { name: string } | null }

function Renewals() {
  const [view, setView] = useState<"upcoming" | "history">("upcoming");
  const [page, setPage] = useState(1);
  const up = useLoad(() => (view === "upcoming" ? adminFetch<{ renewals: Upcoming[] }>("/subscriptions/renewals/upcoming?days=90") : Promise.resolve(null)), [view]);
  const hist = useLoad(() => (view === "history" ? adminFetch<Paged<Hist>>(`/subscriptions/renewals/history?page=${page}`) : Promise.resolve(null)), [view, page]);
  const [renew, setRenew] = useState<{ id: string; name: string } | null>(null);
  const tone: Record<string, "green" | "red" | "blue" | "gray"> = { renewed: "green", lapsed: "red", expired: "red", cancelled: "red", trial_expired: "red", plan_changed: "blue", reinstated: "green", plan_request_approved: "blue" };
  const label: Record<string, string> = { renewed: "Renewed", lapsed: "Lapsed", expired: "Expired", cancelled: "Cancelled", trial_expired: "Trial ended", plan_changed: "Plan changed", reinstated: "Reinstated", plan_request_approved: "Plan change approved" };

  return (
    <>
      <TabBar value={view} onChange={(v) => { setView(v); setPage(1); }} tabs={[["upcoming", "Upcoming renewals"], ["history", "Renewal history"]]} />
      <ErrorBanner message={up.error || hist.error} />
      {view === "upcoming" ? (
        <Panel title="Renewing in the next 90 days" sub="Issue the invoice ahead of time. When it is paid, the subscription renews by itself.">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>School</Th><Th>Plan</Th><Th>Renews</Th><Th>Value</Th><Th>Invoice</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!up.data?.renewals.length && <Empty cols={6} loading={up.loading} text="Nothing renews soon." />}
              {up.data?.renewals.map((r) => {
                const d = daysTo(r.renews_on);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={`/admin/subscriptions/${r.id}`} className="font-semibold text-slate-900 hover:text-mca-blue">{r.name}</Link><p className="text-xs text-slate-400">{r.code}</p></td>
                    <td className="px-4 py-3"><PlanTag code={r.plan_code} name={r.plan_name} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{fmtDay(r.renews_on)}{d !== null && <span className={d < 0 ? " font-semibold text-rose-700" : " text-slate-400"}> · {d < 0 ? Math.abs(d) + " days late" : d === 0 ? "today" : "in " + d + " days"}</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{rupees(r.arr_paise)}</td>
                    <td className="px-4 py-3">{r.open_invoice ? <Badge tone="blue">{r.open_invoice}</Badge> : <span className="text-xs text-slate-400">Not raised</span>}</td>
                    <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={!!r.open_invoice} onClick={() => setRenew({ id: r.id, name: r.name })}>Renew</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      ) : (
        <Panel title="Renewal history" sub="Renewals, plan changes, lapses and cancellations across all schools">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>When</Th><Th>School</Th><Th>What happened</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!hist.data?.items.length && <Empty cols={3} loading={hist.loading} text="Nothing yet." />}
              {hist.data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{e.institutions?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={tone[e.type] ?? "gray"}>{label[e.type] ?? e.type}</Badge> <span className="text-slate-600">{e.summary}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {hist.data && <Pagination page={hist.data.page} pageSize={hist.data.pageSize} total={hist.data.total} onChange={setPage} />}
        </Panel>
      )}
      <RenewModal school={renew} onClose={() => setRenew(null)} onDone={up.reload} />
    </>
  );
}

// ═════════════ Upgrades & downgrades ═════════════
interface Req { id: string; kind: "upgrade" | "downgrade"; status: "pending" | "approved" | "rejected"; note: string | null; decision_note: string | null; created_at: string; institution_id: string; institutions: { name: string } | null; to_plan: { code: string; name: string } | null; from_plan: { name: string } | null }

function Changes() {
  const [kind, setKind] = useState<"" | "upgrade" | "downgrade">("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [page, setPage] = useState(1);
  const reqs = useLoad(() => adminFetch<Paged<Req>>(`/subscriptions/requests${qs({ kind, status, page })}`), [kind, status, page]);
  const act = useAction(reqs.reload);
  const schools = useLoad(() => adminFetch<Paged<SubRow>>("/schools?pageSize=100"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const [school, setSchool] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [done, setDone] = useState("");

  const decide = (r: Req, approve: boolean) => {
    let note: string | undefined;
    if (!approve) {
      const why = window.prompt("Why is this request declined? The school will see it.");
      if (!why?.trim()) return;
      note = why.trim();
    } else if (!window.confirm(`Move ${r.institutions?.name} to ${r.to_plan?.name}?`)) return;
    void act.run(() => adminFetch(`/subscriptions/requests/${r.id}/decide`, json("POST", { approve, note })));
  };

  return (
    <>
      <Panel title="Change a school's plan" sub="Moves the school now. A downgrade is refused if the school is bigger than the new plan allows.">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <select className={`${inputCls} max-w-xs`} aria-label="School" value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">Choose a school</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={`${inputCls} max-w-xs`} aria-label="New plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            <option value="">Choose a plan</option>{plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
          <button type="button" className={btnPrimary} disabled={act.busy || !school || !planCode}
            onClick={() => act.run(async () => { await adminFetch(`/subscriptions/schools/${school}/change-plan`, json("POST", { plan_code: planCode })); setDone("Plan changed."); })}>Change plan</button>
          {done && <span role="status" className="text-sm font-semibold text-mca-green">{done}</span>}
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="Requests from schools" sub="Schools ask from their Billing page">
          <div className="space-y-3 p-4 pb-0">
            <ErrorBanner message={reqs.error || act.error} />
            <div className="flex flex-wrap gap-2">
              <select className={`${inputCls} max-w-[11rem]`} aria-label="Type" value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setPage(1); }}>
                <option value="">Upgrades and downgrades</option><option value="upgrade">Upgrade requests</option><option value="downgrade">Downgrade requests</option>
              </select>
              <select className={`${inputCls} max-w-[10rem]`} aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
                <option value="pending">Waiting</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="">All</option>
              </select>
            </div>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>School</Th><Th>Request</Th><Th>Note</Th><Th>Status</Th><Th>When</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!reqs.data?.items.length && <Empty cols={6} loading={reqs.loading} text="No requests here." />}
              {reqs.data?.items.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.institutions?.name}</td>
                  <td className="px-4 py-3"><Badge tone={r.kind === "upgrade" ? "green" : "gray"}>{r.kind}</Badge><p className="mt-1 text-xs text-slate-500">{r.from_plan?.name ?? "—"} → {r.to_plan?.name}</p></td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{r.note || "—"}{r.decision_note && <p className="mt-1 text-xs text-slate-400">Decision: {r.decision_note}</p>}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "blue"}>{r.status === "rejected" ? "declined" : r.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(r.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.status === "pending" && <div className="flex justify-end gap-2"><button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy} onClick={() => decide(r, true)}>Approve</button><button type="button" className={small} disabled={act.busy} onClick={() => decide(r, false)}>Decline</button></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reqs.data && <Pagination page={reqs.data.page} pageSize={reqs.data.pageSize} total={reqs.data.total} onChange={setPage} />}
        </Panel>
      </div>
    </>
  );
}

// ═════════════ Trials ═════════════
interface TrialData {
  trials: { id: string; code: string; name: string; plan_name: string | null; trial_ends_on: string | null; students: number }[];
  expired: { id: string; summary: string; created_at: string; institution_id: string; institutions: { name: string } | null }[];
  settings: { trial_days: number; grace_days: number };
}

function Trials() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<TrialData>("/subscriptions/trials"), []);
  const act = useAction(reload);
  const [view, setView] = useState<"period" | "expiry">("expiry");
  const [days, setDays] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setDays(String(data.settings.trial_days)); }, [data]);

  const extend = (id: string, name: string) => {
    const v = window.prompt(`Extend ${name}'s trial by how many days? (1-60)`, "7");
    const n = Number(v);
    if (v && Number.isInteger(n) && n >= 1 && n <= 60) void act.run(() => adminFetch(`/subscriptions/schools/${id}/extend-trial`, json("POST", { days: n })));
  };

  return (
    <>
      <TabBar value={view} onChange={setView} tabs={[["expiry", "Trial expiry"], ["period", "Trial period"]]} />
      <ErrorBanner message={error || act.error} />
      {view === "period" ? (
        <Panel title="How free trials work" sub="New schools that start on a trial get this many days. A plan can set its own length under Plans.">
          <form className="space-y-4 p-5" onSubmit={async (e) => { e.preventDefault(); setSaved(false); if (await act.run(() => adminFetch("/subscriptions/billing-settings", json("PUT", { values: { "general.trial_days": Number(days) } })))) setSaved(true); }}>
            <Field label="Default trial length (days)" hint="0 to 90. Applies to schools created from now on."><input type="number" min={0} max={90} className={`${inputCls} max-w-[10rem]`} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>When a trial ends without a paid renewal, the school becomes <b>Expired</b> automatically and goes read-only.</li>
              <li>You can extend a trial from the Trial expiry tab, or from the school&apos;s subscription page.</li>
              <li>Paying the first invoice ends the trial and activates the school.</li>
            </ul>
            <div className="flex items-center gap-3"><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button>{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}</div>
          </form>
        </Panel>
      ) : (
        <>
          <Panel title="Trials in progress" sub="Soonest to end first">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><Th>School</Th><Th>Plan</Th><Th>Students</Th><Th>Trial ends</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.trials.length && <Empty cols={5} loading={loading} text="No school is on a trial." />}
                {data?.trials.map((t) => {
                  const d = daysTo(t.trial_ends_on);
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3"><Link href={`/admin/subscriptions/${t.id}`} className="font-semibold text-slate-900 hover:text-mca-blue">{t.name}</Link><p className="text-xs text-slate-400">{t.code}</p></td>
                      <td className="px-4 py-3 text-slate-600">{t.plan_name}</td><td className="px-4 py-3 tabular-nums">{t.students}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{fmtDay(t.trial_ends_on)}{d !== null && <span className={d <= 3 ? " font-semibold text-rose-700" : " text-slate-400"}> · {d < 0 ? "ended" : d === 0 ? "today" : d + " days left"}</span>}</td>
                      <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={act.busy} onClick={() => extend(t.id, t.name)}>Extend</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <div className="mt-6">
            <Panel title="Trials that ended" sub="Last 90 days">
              <ul className="divide-y divide-slate-100">
                {!data?.expired.length && <li className="px-5 py-6 text-center text-sm text-slate-400">None.</li>}
                {data?.expired.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm"><span><b className="text-slate-900">{e.institutions?.name}</b> <span className="text-slate-500">{e.summary}</span></span><span className="text-xs text-slate-400">{fmtDate(e.created_at)}</span></li>)}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
