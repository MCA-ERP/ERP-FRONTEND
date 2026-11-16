"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, fmtDay, inr, useAction } from "@/components/admin/dash";
import { Chip, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, SchoolBar, small, smallPrimary } from "../../schools/pages/shared";
import { usePlans } from "./plans";

export type ChangeTab = "change" | "upgrade" | "downgrade";
interface Req {
  id: string; kind: "upgrade" | "downgrade"; status: "pending" | "approved" | "rejected"; note: string | null; decision_note: string | null; created_at: string; institution_id: string;
  institutions: { name: string } | null; to_plan: { code: string; name: string } | null; from_plan: { name: string } | null; students: number; change_paise: number;
}

export function PlanChanges({ tab }: { tab: ChangeTab }) {
  return tab === "change" ? <SchoolBar>{(s) => <ChangePlan id={s.id} name={s.name} current={s.plan_code} students={s.students} />}</SchoolBar> : <Requests kind={tab} />;
}

function ChangePlan({ id, name, current, students }: { id: string; name: string; current: string | null; students: number }) {
  const plans = usePlans();
  const [plan, setPlan] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const act = useAction(() => undefined);
  const list = (plans.data?.plans ?? []).filter((p) => p.is_active);
  const from = list.find((p) => p.code === current);
  const to = list.find((p) => p.code === (plan || list.find((p2) => p2.code !== current)?.code));
  const diff = from && to ? (to.price_per_student_paise - from.price_per_student_paise) * students : 0;

  return (
    <div className="space-y-5">
      <ErrorBanner message={plans.error} />
      <FormCard title={`Change plan for ${name}`} saveLabel="Change plan" busy={act.busy} saved={done} error={act.error} disabled={!to || to.code === current}
        onDiscard={() => { setPlan(""); setReason(""); setDone(false); }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!to || !window.confirm(`Move ${name} to ${to.name}?`)) return;
          if (await act.run(() => adminFetch(`/subscriptions/schools/${id}/change-plan`, json("POST", { plan_code: to.code, reason: reason.trim() || undefined })))) setDone(true);
        }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="New plan"><select className={inputCls} value={to?.code ?? ""} onChange={(e) => { setPlan(e.target.value); setDone(false); }}>{list.filter((p) => p.code !== current).map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}</select></Labelled>
          <Labelled label="Takes effect" hint="The change applies as soon as you save"><select className={inputCls} disabled><option>Immediately</option></select></Labelled>
        </div>
        <Labelled label="Reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Kept in the school's history" /></Labelled>
      </FormCard>
      {from && to && to.code !== current && (
        <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">
          Moving {students.toLocaleString("en-IN")} students from {from.name} to {to.name} {diff >= 0 ? "adds" : "reduces the year's charge by"} about {inr(Math.abs(diff))} a year before GST. A move to a smaller plan is refused if the school is bigger than the plan allows.
        </p>
      )}
    </div>
  );
}

function Requests({ kind }: { kind: "upgrade" | "downgrade" }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Req>>(`/subscriptions/requests${qs({ kind, page })}`), [kind, page]);
  const act = useAction(reload);
  const q = search.trim().toLowerCase();
  const items = (data?.items ?? []).filter((r) => !q || `${r.institutions?.name} ${r.note ?? ""}`.toLowerCase().includes(q));
  const decide = (r: Req, approve: boolean) => {
    let note: string | undefined;
    if (!approve) { const why = window.prompt("Why is this request declined? The school will see it."); if (!why?.trim()) return; note = why.trim(); }
    else if (!window.confirm(`Move ${r.institutions?.name} to ${r.to_plan?.name}?`)) return;
    void act.run(() => adminFetch(`/subscriptions/requests/${r.id}/decide`, json("POST", { approve, note })));
  };
  const word = kind === "upgrade" ? "Upgrade" : "Downgrade";
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={`${word} requests`} sub={`${data?.total ?? 0} request${data?.total === 1 ? "" : "s"}`}
        right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv(`${kind}-requests`, ["School", "From", "To", "Reason", "Change per year", "Requested", "Status"], items.map((r) => [r.institutions?.name, r.from_plan?.name, r.to_plan?.name, r.note, r.change_paise / 100, r.created_at.slice(0, 10), r.status]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv(`${kind}-requests`, ["School", "From", "To", "Reason", "Change per year", "Requested", "Status"], items.map((r) => [r.institutions?.name, r.from_plan?.name, r.to_plan?.name, r.note, r.change_paise / 100, r.created_at.slice(0, 10), r.status])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${kind} requests`} aria-label="Search requests" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "School" }, { h: "From" }, { h: "To" }, { h: "Reason" }, { h: "Change per year", right: true }, { h: "Requested" }, { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : `No ${kind} requests.`}
          rows={items.map((r) => [
            <b key="s" className="font-semibold text-slate-900">{r.institutions?.name}</b>, r.from_plan?.name ?? "—", <b key="t" className="font-semibold text-[#026f9b]">{r.to_plan?.name}</b>,
            <span key="n">{r.note || "—"}{r.decision_note && <small className="block text-xs text-slate-500">Decision: {r.decision_note}</small>}</span>,
            <span key="c" className={r.change_paise >= 0 ? "text-[#065740]" : "text-[#ac2c28]"}>{r.change_paise >= 0 ? "+" : "−"}{inr(Math.abs(r.change_paise))}</span>,
            fmtDay(r.created_at.slice(0, 10)),
            <Chip key="st" tone={r.status === "approved" ? "good" : r.status === "rejected" ? "bad" : "warn"}>{r.status === "pending" ? "Requested" : r.status === "approved" ? "Approved" : "Rejected"}</Chip>,
            <span key="a" className="flex gap-1.5">
              {r.status === "pending" && <><button type="button" className={small} disabled={act.busy} onClick={() => decide(r, false)}>Reject</button><button type="button" className={smallPrimary} disabled={act.busy} onClick={() => decide(r, true)}>Approve</button></>}
              <ViewButton href={`/super-admin/subscriptions/${r.institution_id}`} />
            </span>,
          ])}
        />
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <button type="button" className={small} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button><span className="text-xs text-slate-500">Page {page}</span>
            <button type="button" className={small} disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Older</button>
          </div>
        )}
      </Panel>
    </div>
  );
}
