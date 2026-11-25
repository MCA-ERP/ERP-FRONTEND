"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Row, day, small } from "./dash-pages";
import { useSchool } from "../context";
import { useGoTab } from "./tab-context";

interface Balance { type: "Casual" | "Sick" | "Earned"; allowed: number; taken: number; pending: number; balance: number; details: string }
interface Request { id: string; leave_type: "Casual" | "Sick" | "Earned"; from_date: string; to_date: string; half_day: boolean; days: number; reason: string; cover_note: string | null; status: "Pending" | "Approved" | "Rejected" | "Cancelled" }
interface Leave {
  year: string; person: { name: string; role: string } | null; approver: string;
  balance: Balance[]; requests: Request[]; policy: { rule: string; allowance: string; details: string }[];
}
interface CompOff { id: string; worked_on: string; reason: string; use_by: string; status: "Available" | "Used" | "Expired" }

const p2 = (n: number) => String(n).padStart(2, "0");
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const n1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const TONE = { Approved: "good", Pending: "warn", Rejected: "bad", Cancelled: "mute" } as const;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

export type LeaveTab = "apply" | "my-requests" | "balance-and-policy" | "comp-off";
export function MyLeave({ tab }: { tab: LeaveTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Leave>("/school/me/leave"), []);
  return (
    <div data-report>
      <ErrorBanner message={error} />
      {tab === "apply" && <Apply data={data} loading={loading} onApplied={reload} />}
      {tab === "my-requests" && <Requests data={data} loading={loading} />}
      {tab === "balance-and-policy" && <BalancePolicy data={data} loading={loading} />}
      {tab === "comp-off" && <CompOffs />}
    </div>
  );
}

const label = (t: string) => `${t} leave`;

function Apply({ data, loading, onApplied }: { data: Leave | null; loading: boolean; onApplied: () => void }) {
  const go = useGoTab();
  const blank = { leave_type: "Casual", from_date: todayIso(), to_date: todayIso(), half_day: false, reason: "", cover_note: "" };
  const [f, setF] = useState(blank);
  const act = useAction(onApplied);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/school/me/leave", json("POST", { ...f, half_day: f.half_day && f.from_date === f.to_date })))) { setF(blank); go("my-requests"); }
  };
  const left = data?.balance.find((b) => b.type === f.leave_type);
  return (
    <div className="space-y-5">
      <Tiles items={(data?.balance ?? []).map((b) => ({ label: label(b.type), value: `${n1(b.balance)} left`, sub: `Used ${n1(b.taken)} of ${n1(b.allowed)}` }))} />
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Apply for leave</h2>{data?.person && <span className="text-xs text-slate-500">{data.person.name} · {data.person.role}</span>}</div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <Field label="Leave type"><select className={inputCls} value={f.leave_type} onChange={(e) => setF({ ...f, leave_type: e.target.value })}>{(data?.balance ?? []).map((b) => <option key={b.type} value={b.type}>{label(b.type)}</option>)}</select></Field>
          <Field label="From"><input type="date" className={inputCls} required value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value, to_date: e.target.value > f.to_date ? e.target.value : f.to_date })} /></Field>
          <Field label="To"><input type="date" className={inputCls} required min={f.from_date} value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-[12.5px] font-medium text-slate-900"><input type="checkbox" className="size-4 accent-[#026f9b]" checked={f.half_day} disabled={f.leave_type === "Earned" || f.from_date !== f.to_date} onChange={(e) => setF({ ...f, half_day: e.target.checked })} />Half day</label>
          <div className="sm:col-span-2 lg:col-span-4"><Field label="Reason"><textarea className={`${inputCls} min-h-[5.5rem]`} maxLength={1000} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field></div>
          <div className="sm:col-span-2 lg:col-span-1"><Field label="Who covers my work"><input className={inputCls} maxLength={300} placeholder="Name and what they'll handle" value={f.cover_note} onChange={(e) => setF({ ...f, cover_note: e.target.value })} /></Field></div>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600">Route: goes to <b>{data?.approver ?? "…"}</b> only. Sick leave over 2 days needs a medical certificate; earned leave needs 7 days&apos; notice.{left && left.balance <= 0 ? " Your balance for this type has run out, so extra days are without pay." : ""}</p>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || loading}>{act.busy ? "Applying…" : "Apply"}</button></div>
      </form>
    </div>
  );
}

function Requests({ data, loading }: { data: Leave | null; loading: boolean }) {
  const [view, setView] = useState<Request | null>(null);
  const isHr = useSchool().user.role === "HR"; // this portal's table has no row actions
  const reqs = data?.requests ?? [];
  const pending = reqs.filter((r) => r.status === "Pending");
  return (
    <div className="space-y-5">
      {!pending.length && !loading && <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{isHr ? "No leave requests yet." : "No leave requests waiting."} Apply from the Apply tab and it appears here with its approval route.</p>}
      {!!pending.length && <p className="rounded-2xl border border-[#f0d9a8] bg-[#fdf6e7] px-4 py-3 text-[13px] text-slate-800">{pending.length} {pending.length === 1 ? "request is" : "requests are"} waiting for {data?.approver}.</p>}
      <Panel title="Earlier this year" sub={`${reqs.length} ${reqs.length === 1 ? "request" : "requests"}`} right={<ExportPrint name="my-leave-requests" head={["Leave", "From", "To", "Days", "Status"]} rows={reqs.map((r) => [label(r.leave_type), day(r.from_date), day(r.to_date), n1(r.days), r.status])} />}>
        <SimpleTable head={[{ h: "Leave" }, { h: "From" }, { h: "To" }, { h: "Days" }, { h: "Status" }, ...(isHr ? [] : [{ h: "" }])]} empty={loading ? "Loading…" : "No leave requests yet."}
          rows={reqs.map((r) => [<b key="l" className="font-semibold text-slate-900">{label(r.leave_type)}</b>, day(r.from_date), day(r.to_date), n1(r.days), <Chip key="s" tone={TONE[r.status]}>{r.status}</Chip>, ...(isHr ? [] : [<button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])])} />
      </Panel>
      <Modal open={!!view} title={view ? label(view.leave_type) : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="From" v={day(view.from_date)} /><Row k="To" v={day(view.to_date)} /><Row k="Days" v={`${n1(view.days)}${view.half_day ? " (half day)" : ""}`} /><Row k="Reason" v={view.reason || "—"} /><Row k="Cover" v={view.cover_note ?? "—"} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
    </div>
  );
}

function BalancePolicy({ data, loading }: { data: Leave | null; loading: boolean }) {
  const bal = data?.balance ?? [];
  return (
    <div className="space-y-5">
      <Panel title={`Leave balance · ${data?.year ?? ""}`} sub={`${bal.length} leave types`} right={<ExportPrint name="my-leave-balance" head={["Type", "Allowed", "Taken", "Pending", "Balance"]} rows={bal.map((b) => [label(b.type), b.allowed, b.taken, b.pending, b.balance])} />}>
        <SimpleTable head={[{ h: "Type" }, { h: "Allowed" }, { h: "Taken" }, { h: "Pending" }, { h: "Balance" }]} empty={loading ? "Loading…" : "No leave types set up."}
          rows={bal.map((b) => [<b key="t" className="font-semibold text-slate-900">{label(b.type)}</b>, n1(b.allowed), n1(b.taken), n1(b.pending), <b key="b" className="font-bold text-slate-900">{n1(b.balance)}</b>])} />
      </Panel>
      <Panel title="Leave policy" sub="From HR · Leave Policies">
        <SimpleTable head={[{ h: "Rule" }, { h: "Allowance" }, { h: "Details" }]} empty="No policy set up." rows={(data?.policy ?? []).map((p) => [<b key="r" className="font-semibold text-slate-900">{p.rule}</b>, p.allowance, p.details || ""])} />
      </Panel>
    </div>
  );
}

function CompOffs() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: CompOff[] }>("/school/me/comp-offs"), []);
  const rows = data?.items ?? [];
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="My comp-offs" sub={`${rows.length} ${rows.length === 1 ? "comp-off" : "comp-offs"}`} right={<ExportPrint name="my-comp-offs" head={["Worked on", "Reason", "Use by", "Status"]} rows={rows.map((r) => [day(r.worked_on), r.reason, day(r.use_by), r.status])} />}>
        <SimpleTable head={[{ h: "Worked on" }, { h: "Reason" }, { h: "Use by" }, { h: "Status" }]} empty={loading ? "Loading…" : "No comp-offs yet. HR adds one when you work on a Sunday or a holiday."}
          rows={rows.map((r) => [day(r.worked_on), <b key="r" className="font-semibold text-slate-900">{r.reason}</b>, day(r.use_by), <Chip key="s" tone={r.status === "Available" ? "good" : "mute"}>{r.status}</Chip>])} />
      </Panel>
    </div>
  );
}


