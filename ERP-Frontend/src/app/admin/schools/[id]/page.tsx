"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch, json, type Plan, type SchoolDetail, type SchoolModuleAccess } from "@/lib/admin-api";
import { Panel, PlanTag, StatusPill, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { AdminsSection, CampusSection, ConfigSection, DocumentsSection, HistorySection, ProfileSection } from "./sections";

type Tab = "setup" | "profile" | "config" | "campuses" | "admins" | "documents" | "plan" | "status" | "history";
const TABS: [Tab, string][] = [
  ["setup", "Setup"], ["profile", "Profile"], ["config", "Configuration"], ["campuses", "Campuses"], ["admins", "School admins"],
  ["documents", "Documents"], ["plan", "Plan & modules"], ["status", "Status"], ["history", "History"],
];

interface Readiness {
  status: string;
  ready: boolean;
  checks: { key: string; label: string; done: boolean; required: boolean; detail: string; tab: Tab }[];
}

export default function SchoolHubPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("setup");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some(([k]) => k === t)) setTab(t);
  }, []);

  const school = useLoad(() => adminFetch<SchoolDetail>(`/schools/${id}`), [id]);
  const ready = useLoad(() => adminFetch<Readiness>(`/schools/${id}/readiness`), [id]);
  const refresh = () => { school.reload(); ready.reload(); };
  const s = school.data?.school;

  return (
    <>
      <Link href="/admin/schools" className="mb-2 inline-block text-sm font-semibold text-mca-blue">← All schools</Link>
      <PageHeader
        title={s?.name ?? "School"}
        subtitle={s ? `${s.code}${s.city ? " · " + s.city : ""}${s.board ? " · " + s.board : ""}` : undefined}
        action={s && <div className="flex items-center gap-3"><PlanTag code={s.plan_code} name={s.plan_name} /><StatusPill status={s.status} /></div>}
      />
      <ErrorBanner message={school.error} />
      <TabBar value={tab} onChange={setTab} tabs={TABS} />

      {tab === "setup" && <Setup id={id} ready={ready.data} loading={ready.loading} go={setTab} onChanged={refresh} />}
      {tab === "profile" && <ProfileSection id={id} onSaved={refresh} />}
      {tab === "config" && <ConfigSection id={id} />}
      {tab === "campuses" && <CampusSection id={id} />}
      {tab === "admins" && <AdminsSection id={id} />}
      {tab === "documents" && <DocumentsSection id={id} onChanged={refresh} />}
      {tab === "plan" && <PlanSection id={id} current={s?.plan_code ?? null} onChanged={refresh} />}
      {tab === "status" && s && <StatusSection id={id} status={s.status} onChanged={refresh} />}
      {tab === "history" && <HistorySection id={id} />}
    </>
  );
}

// ── Setup: the registration flow as a checklist, then approval ──
function Setup({ id, ready, loading, go, onChanged }: { id: string; ready: Readiness | null; loading: boolean; go: (t: Tab) => void; onChanged: () => void }) {
  const act = useAction(onChanged);
  const [anyway, setAnyway] = useState(false);
  const docsDone = ready?.checks.find((c) => c.key === "documents")?.done ?? false;

  return (
    <Panel title="Setting up this school" sub="Add the school, upload documents, create a campus, assign a plan, create an admin, configure modules, then activate.">
      <div className="space-y-5 p-5">
        <ErrorBanner message={act.error} />
        {loading && !ready && <p className="text-sm text-slate-400">Loading…</p>}
        <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {ready?.checks.map((c, i) => (
            <li key={c.key} className="flex items-center gap-3 px-4 py-3">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${c.done ? "bg-mca-green-mint text-mca-green-deep" : "bg-slate-100 text-slate-500"}`}>{c.done ? "✓" : i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{c.label}{!c.required && <span className="ml-2 text-xs font-normal text-slate-400">optional</span>}</p>
                <p className="text-xs text-slate-500">{c.detail}</p>
              </div>
              <button type="button" className={`${btnGhost} !px-3 !py-1 text-xs`} onClick={() => go(c.tab)}>{c.done ? "Review" : "Do this"}</button>
            </li>
          ))}
        </ol>
        {ready?.status === "Pending" ? (
          <div className="rounded-xl bg-mca-blue-sky/50 p-4">
            <p className="text-sm font-semibold text-slate-900">{ready.ready ? "Ready for approval" : "Not ready yet"}</p>
            <p className="mb-3 text-xs text-slate-600">{ready.ready ? "Approving lets the school sign in." : "A campus, a plan and an administrator are needed before approval."}</p>
            {ready.ready && !docsDone && (
              <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} />Approve even though no document is verified</label>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={act.busy || !ready.ready || (!docsDone && !anyway)} onClick={() => act.run(() => adminFetch(`/schools/${id}/approve`, json("POST", { status: "Trial", force: anyway })))}>Approve and start trial</button>
              <button type="button" className={btnGhost} disabled={act.busy || !ready.ready || (!docsDone && !anyway)} onClick={() => act.run(() => adminFetch(`/schools/${id}/approve`, json("POST", { status: "Active", force: anyway })))}>Approve as paying</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">This school is {ready?.status.toLowerCase()}. Use the Status tab to change that.</p>
        )}
      </div>
    </Panel>
  );
}

// ── Plan & modules ──
function PlanSection({ id, current, onChanged }: { id: string; current: string | null; onChanged: () => void }) {
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const mods = useLoad(() => adminFetch<SchoolModuleAccess>(`/schools/${id}/modules`), [id, current]);
  const act = useAction(onChanged);
  const [choice, setChoice] = useState("");
  useEffect(() => setChoice(current ?? ""), [current]);

  return (
    <>
      <Panel title="Assigned plan" sub="The plan decides which modules the school gets and how many students it may enrol.">
        <div className="space-y-3 p-5">
          <ErrorBanner message={act.error || plans.error} />
          <div className="flex flex-wrap items-end gap-3">
            <select className={`${inputCls} max-w-xs`} aria-label="Plan" value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">Choose a plan</option>
              {plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name} — ₹{p.price_per_student_paise / 100} per student{p.student_limit ? `, up to ${p.student_limit}` : ""}</option>)}
            </select>
            <button type="button" className={btnPrimary} disabled={act.busy || !choice || choice === current} onClick={() => act.run(() => adminFetch(`/schools/${id}/plan`, json("POST", { plan_code: choice })))}>Change plan</button>
          </div>
        </div>
      </Panel>
      <div className="mt-6">
        <Panel title="Modules this school can use" right={<Link href="/admin/modules" className={`${btnGhost} !px-3 !py-1.5 text-xs`}>Manage modules</Link>}>
          <div className="space-y-2 p-5">
            <ErrorBanner message={mods.error} />
            <div className="flex flex-wrap gap-2">
              {mods.data?.modules.filter((m) => m.effective).map((m) => <Badge key={m.code} tone="green">{m.name}</Badge>)}
            </div>
            {mods.data && !mods.data.modules.some((m) => m.effective) && <p className="text-sm text-slate-400">No modules yet. Assign a plan first.</p>}
            {mods.data && mods.data.modules.some((m) => !m.effective) && (
              <p className="pt-2 text-xs text-slate-400">Not included: {mods.data.modules.filter((m) => !m.effective).map((m) => m.name).join(", ")}</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ── Status actions ──
const ACTIONS = [
  { key: "activate", title: "Activate", text: "Turn on a school that is approved but not yet live.", from: ["Pending", "Trial", "Expired", "Overdue"], reason: false },
  { key: "deactivate", title: "Deactivate", text: "Turn the school off temporarily. Data is kept and nobody can sign in.", from: ["Trial", "Active", "Overdue"], reason: true },
  { key: "suspend", title: "Suspend", text: "Block the school, usually for non-payment or a policy breach.", from: ["Trial", "Active", "Overdue", "Inactive", "Expired"], reason: true },
  { key: "reactivate", title: "Reactivate", text: "Bring back a suspended, expired or deactivated school.", from: ["Suspended", "Expired", "Inactive"], reason: false },
] as const;

function StatusSection({ id, status, onChanged }: { id: string; status: string; onChanged: () => void }) {
  const act = useAction(onChanged);
  const [reason, setReason] = useState("");
  return (
    <Panel title="School status" sub={`This school is currently ${status.toLowerCase()}.`}>
      <div className="space-y-4 p-5">
        <ErrorBanner message={act.error} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reason (needed to deactivate or suspend)</span>
          <input className={inputCls} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Closed for summer break" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => {
            const allowed = (a.from as readonly string[]).includes(status);
            return (
              <div key={a.key} className={`rounded-xl border p-4 ${allowed ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                <p className="font-bold text-slate-900">{a.title}</p>
                <p className="mb-3 mt-0.5 text-sm text-slate-600">{a.text}</p>
                <button type="button" className={a.key === "suspend" ? `${btnGhost} text-rose-700` : btnGhost} disabled={act.busy || !allowed || (a.reason && !reason.trim())}
                  onClick={() => window.confirm(`${a.title} this school?`) && act.run(() => adminFetch(`/schools/${id}/status-action`, json("POST", { action: a.key, reason: reason.trim() || undefined })).then(() => setReason("")))}>
                  {a.title}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">A new school is activated from the Setup tab, once approved. Every change is kept in the History tab with who made it and why.</p>
      </div>
    </Panel>
  );
}
