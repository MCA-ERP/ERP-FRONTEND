"use client";

import { useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, daysTo, fmtDay, num, useAction } from "@/components/admin/dash";
import { Chip, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small, smallPrimary } from "../../schools/pages/shared";
import { RenewModal } from "../renew-modal";
import { useBillingForm } from "./billing";

export type TrialTab = "period" | "expiry";
interface TrialData {
  trials: { id: string; code: string; name: string; plan_name: string | null; trial_ends_on: string | null; students: number }[];
  expired: { id: string; summary: string; created_at: string; institution_id: string; institutions: { name: string } | null }[];
}

const DEFAULTS = { "general.trial_days": 14, "trial.runs_on": "chosen", "trial.student_limit": 200, "trial.max_extension_days": 7, "trial.require_payment_details": false, "trial.auto_convert": true, "trial.reminder_emails": true };
const KEYS = Object.keys(DEFAULTS);

export function TrialManagement({ tab }: { tab: TrialTab }) {
  return tab === "period" ? <Period /> : <Expiry />;
}

function Period() {
  const f = useBillingForm(DEFAULTS, KEYS);
  const d = f.draft;
  const n = (k: string) => String(d[k] ?? "");
  const cast = (e: { preventDefault: () => void }) => {
    for (const k of ["general.trial_days", "trial.student_limit", "trial.max_extension_days"]) d[k] = Number(d[k]);
    return f.save(e);
  };
  return (
    <div className="space-y-5">
      <FormCard title="Trial rules" saveLabel="Save trial rules" busy={f.busy} saved={f.saved} error={f.error} disabled={!f.ready} onDiscard={f.reset} onSubmit={cast}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Labelled label="Trial length"><select className={inputCls} value={n("general.trial_days")} onChange={(e) => f.set("general.trial_days", Number(e.target.value))}>{[7, 14, 21, 30, 45, 60].map((x) => <option key={x} value={x}>{x} days</option>)}</select></Labelled>
          <Labelled label="Trial runs on"><select className={inputCls} value={n("trial.runs_on")} onChange={(e) => f.set("trial.runs_on", e.target.value)}><option value="chosen">The plan the school chose</option><option value="lowest">The lowest plan</option><option value="highest">The highest plan</option></select></Labelled>
          <Labelled label="Student limit during trial"><input type="number" min={1} className={inputCls} value={n("trial.student_limit")} onChange={(e) => f.set("trial.student_limit", e.target.value)} /></Labelled>
          <Labelled label="Maximum extension"><select className={inputCls} value={n("trial.max_extension_days")} onChange={(e) => f.set("trial.max_extension_days", Number(e.target.value))}>{[0, 3, 7, 14, 30].map((x) => <option key={x} value={x}>{x === 0 ? "No extension" : `${x} days`}</option>)}</select></Labelled>
        </div>
        <ToggleRow label="Ask for payment details at sign-up" hint="Off means more trials, fewer conversions" checked={d["trial.require_payment_details"] === true} onChange={(v) => f.set("trial.require_payment_details", v)} />
        <ToggleRow label="Convert to paid automatically" hint="Only if payment details were added" checked={d["trial.auto_convert"] === true} onChange={(v) => f.set("trial.auto_convert", v)} />
        <ToggleRow label="Reminder emails" hint="7, 3 and 1 days before the trial ends" checked={d["trial.reminder_emails"] === true} onChange={(v) => f.set("trial.reminder_emails", v)} />
      </FormCard>
      <p className="text-xs text-slate-500">Trial length and the maximum extension apply now. The student limit, payment details, automatic conversion and reminders are recorded and take effect once those parts are connected.</p>
    </div>
  );
}

function Expiry() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<TrialData>("/subscriptions/trials"), []);
  const act = useAction(reload);
  const [renew, setRenew] = useState<{ id: string; name: string } | null>(null);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
  const trials = (data?.trials ?? []).filter((t) => has(`${t.name} ${t.code}`, s1));
  const past = (data?.expired ?? []).filter((e) => has(e.institutions?.name ?? "", s2));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Ending soon" sub={`${trials.length} school${trials.length === 1 ? "" : "s"}`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv("trials-ending-soon", ["School", "Plan", "Students", "Ends", "Days left"], trials.map((t) => [t.name, t.plan_name, t.students, t.trial_ends_on, daysTo(t.trial_ends_on)]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv("trials-ending-soon", ["School", "Plan", "Students", "Ends", "Days left"], trials.map((t) => [t.name, t.plan_name, t.students, t.trial_ends_on, daysTo(t.trial_ends_on)])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search ending soon" aria-label="Search ending soon" value={s1} onChange={(e) => setS1(e.target.value)} /></div>
        <SimpleTable head={[{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Ends" }, { h: "Days left", right: true }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No school is on a trial."}
          rows={trials.map((t) => [
            <div key="s"><p className="font-semibold text-slate-900">{t.name}</p><p className="text-xs text-slate-400">{t.code}</p></div>, t.plan_name ?? "—", num(t.students), fmtDay(t.trial_ends_on), daysTo(t.trial_ends_on) ?? "—", <Chip key="c" tone="info">Trial</Chip>,
            <span key="a" className="flex gap-1.5">
              <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/subscriptions/schools/${t.id}/extend-trial`, json("POST", { days: 7 })))}>Extend 7 days</button>
              <button type="button" className={smallPrimary} onClick={() => setRenew({ id: t.id, name: t.name })}>Convert to paid</button>
              <ViewButton href={`/super-admin/subscriptions/${t.id}`} />
            </span>,
          ])} />
      </Panel>
      <Panel title="Past trials" sub={`${past.length} trial${past.length === 1 ? "" : "s"} in the last 90 days`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv("past-trials", ["School", "Ended", "Result"], past.map((e) => [e.institutions?.name, e.created_at.slice(0, 10), "Expired"]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv("past-trials", ["School", "Ended", "Result"], past.map((e) => [e.institutions?.name, e.created_at.slice(0, 10), "Expired"])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search past trials" aria-label="Search past trials" value={s2} onChange={(e) => setS2(e.target.value)} /></div>
        <SimpleTable head={[{ h: "School" }, { h: "Ended" }, { h: "Result" }, { h: "" }]} empty={loading ? "Loading…" : "No trial has ended lately."}
          rows={past.map((e) => [<b key="s" className="font-semibold text-slate-900">{e.institutions?.name ?? "—"}</b>, fmtDay(e.created_at.slice(0, 10)), <Chip key="c" tone="bad">Expired</Chip>, <ViewButton key="v" href={`/super-admin/subscriptions/${e.institution_id}`} />])} />
      </Panel>
      <RenewModal school={renew} onClose={() => setRenew(null)} onDone={reload} />
    </div>
  );
}
