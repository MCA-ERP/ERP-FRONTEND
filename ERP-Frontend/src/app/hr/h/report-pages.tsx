"use client";

import { useState } from "react";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { BarRows, Panel } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { day } from "../../school/s/dash-pages";
import { Head, redBtn } from "../../teacher/t/head";
import { Table, Tile, Tiles, name, pill, share } from "./ui";

/** HR and payroll reports: attendance (the figures payroll uses), leave, job applications and deductions. */
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const KV = ({ rows }: { rows: [string, string | number][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;

interface Att { id: string; name: string; emp_code: string; department: string; working_days: number; present: number; paid_leave: number; lop: number; late_marks: number }

export function AttendanceReport() {
  const month = nowIst().slice(0, 7);
  const p = useLoad(() => schoolFetch<{ working_days: number; items: Att[] }>(`/school/pay/attendance?month=${month}`), [month]);
  const [view, setView] = useState<Att | null>(null);
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const items = p.data?.items ?? [];
  return (
    <div data-report><Head title="Attendance" subtitle={`Staff attendance for ${label}${p.data ? `: ${p.data.working_days} working days` : ""}. This is what payroll uses.`} /><ErrorBanner message={p.error} />
      <Table title={label} noun="staff" exportName={`attendance-${month}`} empty={p.loading ? "Loading…" : "No staff."}
        head={[{ h: "Staff" }, { h: "Department" }, { h: "Working days" }, { h: "Present" }, { h: "Paid leave" }, { h: "Loss of pay" }, { h: "Late marks" }, { h: "" }]}
        rows={items.map((i) => ({ key: i.id, find: `${i.name} ${i.emp_code} ${i.department}`, out: [i.name, i.department, i.working_days, i.present, i.paid_leave, i.lop, i.late_marks], cells: [
          name(i.name, i.emp_code), i.department || "—", i.working_days, i.present, <span key="p" className={i.paid_leave ? "text-[#0b6b4f]" : ""}>{i.paid_leave}</span>, <span key="l" className={i.lop ? "text-[#ac2c28]" : ""}>{i.lop}</span>, i.late_marks,
          <span key="v" className="flex justify-end"><button type="button" className={pill} onClick={() => setView(i)}>View details</button></span>] }))} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <KV rows={[["Employee ID", view.emp_code], ["Department", view.department || "—"], ["Working days", view.working_days], ["Present", view.present], ["Paid leave", view.paid_leave], ["Loss of pay", view.lop], ["Late marks", view.late_marks]]} />}</Modal>
    </div>
  );
}

interface App { id: string; ref: string; name: string; department: string; leave_type: string; reason: string; from_date: string; days: number; applied_on: string; status: string }

export function LeaveReport() {
  const p = useLoad(() => schoolFetch<{ staff: App[] }>("/school/attendance/leaves"), []);
  const [view, setView] = useState<App | null>(null);
  const today = nowIst(); const start = `${Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 4 ? 1 : 0)}-04-01`; // the school year starts in April
  const all = (p.data?.staff ?? []).filter((x) => x.from_date >= start); const n = (s: string) => all.filter((x) => x.status === s).length;
  const types = [...all.reduce((m, x) => m.set(x.leave_type, (m.get(x.leave_type) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  return (
    <div data-report className="space-y-5"><Head title="Leave" subtitle="Summary of applications for the current academic year." action={<button type="button" className={redBtn} onClick={() => window.print()}>Download report</button>} /><ErrorBanner message={p.error} />
      <Tiles><Tile label="Staff leave" value={all.length} sub="Records shown" /><Tile tone="green" label="Approved" value={n("Approved")} sub={share(n("Approved"), all.length)} /><Tile tone="amber" label="Pending" value={n("Pending")} sub={share(n("Pending"), all.length)} /><Tile tone="red" label="Rejected" value={n("Rejected")} sub={share(n("Rejected"), all.length)} /></Tiles>
      <Panel title="Leave type" sub="Count by leave type" right={<button type="button" className={pill} disabled={!types.length} onClick={() => downloadCsv("leave-by-type", ["Leave type", "Applications"], types)}>Download</button>}><BarRows rows={types} /></Panel>
      <Table title="Staff leave" noun="applications" exportName="leave-report" empty={p.loading ? "Loading…" : "No leave applications this year."}
        head={[{ h: "Ref." }, { h: "Staff" }, { h: "Department" }, { h: "Leave type" }, { h: "From" }, { h: "Days" }, { h: "Applied" }, { h: "Status" }, { h: "" }]}
        rows={all.map((l) => ({ key: l.id, find: `${l.ref} ${l.name} ${l.department} ${l.leave_type} ${l.status}`, out: [l.ref, l.name, l.department, l.leave_type, day(l.from_date), l.days, day(l.applied_on), l.status], cells: [l.ref, l.name, l.department || "—", l.leave_type, day(l.from_date), l.days, day(l.applied_on),
          <Chip key="s" tone={l.status === "Approved" ? "good" : l.status === "Rejected" ? "bad" : l.status === "Pending" ? "warn" : "mute"}>{l.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(l)}>View details</button>] }))} />
      <Modal open={!!view} title={view ? `${view.ref} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <KV rows={[["Department", view.department || "—"], ["Leave type", view.leave_type], ["From", day(view.from_date)], ["Days", view.days], ["Reason", view.reason || "—"], ["Applied", day(view.applied_on)], ["Status", view.status]]} />}</Modal>
    </div>
  );
}

interface Cand { id: string; app_code: string; name: string; position: string; qualification: string; experience: number; source: string; stage: string; applied_on: string }

export function RecruitmentReport() {
  const p = useLoad(() => schoolFetch<{ items: Cand[] }>("/school/hr/candidates"), []);
  const [view, setView] = useState<Cand | null>(null);
  const today = nowIst(); const start = `${Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 4 ? 1 : 0)}-04-01`;
  const all = (p.data?.items ?? []).filter((x) => x.applied_on >= start); const n = (s: string) => all.filter((x) => x.stage === s).length;
  const yrs = (v: number) => `${v} ${v === 1 ? "yr" : "yrs"}`;
  const spread = [...all.reduce((m, x) => m.set(x.experience, (m.get(x.experience) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[1] - a[1]).map(([v, c]): [string, number] => [yrs(v), c]);
  return (
    <div data-report className="space-y-5"><Head title="Recruitment" subtitle="Summary of applications for the current academic year." action={<button type="button" className={redBtn} onClick={() => window.print()}>Download report</button>} /><ErrorBanner message={p.error} />
      <Tiles><Tile label="Job applications" value={all.length} sub="Records shown" /><Tile label="New" value={n("New")} sub={share(n("New"), all.length)} /><Tile label="Shortlisted" value={n("Shortlisted")} sub={share(n("Shortlisted"), all.length)} /><Tile label="Interview scheduled" value={n("Interview scheduled")} sub={share(n("Interview scheduled"), all.length)} /></Tiles>
      <Panel title="Experience" sub="Count by experience" right={<button type="button" className={pill} disabled={!spread.length} onClick={() => downloadCsv("applications-by-experience", ["Experience", "Applications"], spread)}>Download</button>}><BarRows rows={spread} /></Panel>
      <Table title="Job applications" noun="applications" exportName="recruitment-report" empty={p.loading ? "Loading…" : "No applications this year."}
        head={[{ h: "Ref." }, { h: "Candidate" }, { h: "Position" }, { h: "Experience" }, { h: "Applied" }, { h: "Status" }, { h: "" }]}
        rows={all.map((c) => ({ key: c.id, find: `${c.app_code} ${c.name} ${c.position} ${c.stage}`, out: [c.app_code, c.name, c.position, yrs(c.experience), day(c.applied_on), c.stage], cells: [c.app_code, c.name, c.position || "—", yrs(c.experience), day(c.applied_on),
          <Chip key="s" tone={c.stage === "New" || c.stage === "On hold" ? "warn" : c.stage === "Rejected" ? "bad" : ["Selected", "Accepted", "Offered"].includes(c.stage) ? "good" : "info"}>{c.stage}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(c)}>View details</button>] }))} />
      <Modal open={!!view} title={view ? `${view.app_code} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <KV rows={[["Position", view.position || "—"], ["Qualification", view.qualification || "—"], ["Experience", yrs(view.experience)], ["Source", view.source], ["Applied", day(view.applied_on)], ["Status", view.stage]]} />}</Modal>
    </div>
  );
}

interface Ded { id: string; name: string; emp_code: string; gross: number; pf: number; esi: number; pt: number; other: number; total: number }
const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;

export function DeductionReport() {
  const p = useLoad(() => schoolFetch<{ items: Ded[] }>("/school/pay/deduction-report"), []);
  const [view, setView] = useState<Ded | null>(null);
  const items = (p.data?.items ?? []).filter((i) => i.total > 0);
  return (
    <div data-report className="space-y-5"><Head title="Deduction Report" /><ErrorBanner message={p.error} />
      <Tiles><Tile label="Staff covered" value={`${items.length} shown`} /><Tile label="This month" value={rupees(items.reduce((n, i) => n + i.total, 0))} sub="Employee share" /></Tiles>
      <Table title="Deduction Report" noun="staff" exportName="deduction-report" empty={p.loading ? "Loading…" : "Nobody has this deduction."}
        head={[{ h: "Staff" }, { h: "Gross" }, { h: "Deduction report" }, { h: "" }]}
        rows={items.map((i) => ({ key: i.id, find: `${i.name} ${i.emp_code}`, out: [i.name, i.gross, i.total], cells: [name(i.name, i.emp_code), rupees(i.gross), rupees(i.total), <span key="v" className="flex justify-end"><button type="button" className={pill} onClick={() => setView(i)}>View details</button></span>] }))} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <KV rows={[["Gross", rupees(view.gross)], ["Provident fund", rupees(view.pf)], ["ESI", rupees(view.esi)], ["Professional tax", rupees(view.pt)], ["TDS / other", rupees(view.other)], ["Total deductions", rupees(view.total)]]} />}</Modal>
    </div>
  );
}
