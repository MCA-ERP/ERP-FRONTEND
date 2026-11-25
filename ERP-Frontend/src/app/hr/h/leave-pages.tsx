"use client";

import { Fragment, useState } from "react";
import { schoolFetch } from "@/lib/school-api";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { day } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, pill, share } from "./ui";

/** Staff leave, on the same requests the staff send from their portals and the approval chain the Principal shares. */
const H = "/school/hr";
const KV = ({ rows }: { rows: [string, string | number][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const span = (from: string, to: string) => (to && to !== from ? `${day(from)} – ${day(to)}` : day(from));
const tone = (s: string) => (s === "Approved" ? "good" : s === "Rejected" ? "bad" : s === "Pending" ? "warn" : "mute") as "good" | "bad" | "warn" | "mute";

interface App { id: string; ref: string; name: string; department: string; detail: string; reason: string; leave_type: string; from_date: string; to_date: string; days: number; applied_on: string; status: string }
export function Applications() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ staff: App[] }>("/school/attendance/leaves"), []);
  const [view, setView] = useState<App | null>(null);
  const all = data?.staff ?? []; const n = (s: string) => all.filter((x) => x.status === s).length;
  return (
    <div data-report className="space-y-5">
      <Head title="Applications" subtitle="All applications, newest first." />
      <ErrorBanner message={error} />
      <Tiles><Tile label="Staff leave" value={all.length} sub="Records shown" /><Tile tone="green" label="Approved" value={n("Approved")} sub={share(n("Approved"), all.length)} /><Tile tone="amber" label="Pending" value={n("Pending")} sub={share(n("Pending"), all.length)} /><Tile tone="red" label="Rejected" value={n("Rejected")} sub={share(n("Rejected"), all.length)} /></Tiles>
      <Table title="Staff leave" noun="applications" exportName="staff-leave" empty={loading ? "Loading…" : "No leave applications yet."}
        head={[{ h: "Ref." }, { h: "Staff" }, { h: "Department" }, { h: "Leave type" }, { h: "From" }, { h: "Days" }, { h: "Applied" }, { h: "Status" }, { h: "" }]}
        rows={all.map((l) => ({ key: l.id, find: `${l.ref} ${l.name} ${l.department} ${l.leave_type} ${l.status}`, out: [l.ref, l.name, l.department, l.leave_type, day(l.from_date), l.days, day(l.applied_on), l.status], cells: [l.ref, l.name, l.department || "—", l.leave_type, day(l.from_date), l.days, day(l.applied_on), <Chip key="s" tone={tone(l.status)}>{l.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(l)}>View details</button>] }))} />
      {view && <Modal open title={`${view.ref} · ${view.name}`} onClose={() => setView(null)}><KV rows={[["Designation", view.detail], ["Department", view.department || "—"], ["Leave type", view.leave_type], ["Dates", `${span(view.from_date, view.to_date)} · ${view.days} day${view.days === 1 ? "" : "s"}`], ["Reason", view.reason || "—"], ["Applied", day(view.applied_on)], ["Status", view.status]]} /></Modal>}
    </div>
  );
}

interface Wait { id: string; code: string; employee: string; detail: string; leave: string; from: string; to: string; days: number; route: string[]; level: number; waiting: string; overdue: boolean; status: string }
export function Approvals() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ levels: { label: string; count: number; overdue: number }[]; items: Wait[] }>(`${H}/leave-approvals`), []);
  const rows = data?.items ?? [];
  return (
    <div data-report className="space-y-5">
      <Head title="Approvals" subtitle="Leave goes up the chain only as far as it needs to. Each level has a time limit; overdue requests move up on their own and the applicant always sees where theirs is." />
      <ErrorBanner message={error} />
      {data && <Tiles>{data.levels.map((l) => <Tile key={l.label} label={l.label} value={l.count} sub={l.overdue ? `${l.overdue} overdue` : "None overdue"} />)}</Tiles>}
      <Table title="Leave waiting for approval" noun="requests" exportName="leave-approvals" empty={loading ? "Loading…" : "Nothing is waiting."}
        head={[{ h: "Request" }, { h: "Employee" }, { h: "Leave" }, { h: "Route" }, { h: "Waiting" }, { h: "Status" }]}
        rows={rows.map((i) => ({ key: i.id, find: `${i.code} ${i.employee} ${i.leave} ${i.status}`, out: [i.code, i.employee, `${i.leave} · ${span(i.from, i.to)} · ${i.days} days`, i.route.join(" > "), i.waiting, i.status], cells: [i.code, name(i.employee, i.detail),
          <span key="l">{i.leave}<span className="block text-[11px] text-slate-500">{span(i.from, i.to)} · {i.days} {i.days === 1 ? "day" : "days"}</span></span>,
          <span key="r" className="flex flex-wrap items-center gap-1">{i.route.map((r, k) => <Fragment key={r}>{k > 0 && <span aria-hidden="true">→</span>}<span className={`rounded-full px-2 py-0.5 text-[11.5px] ${k + 1 < i.level ? "bg-[#d9efe8] text-[#065740]" : k + 1 === i.level ? "bg-[#dceff9] font-semibold text-[#026f9b]" : "bg-slate-100 text-slate-600"}`}>{r}</span></Fragment>)}</span>,
          <span key="w" className={i.overdue ? "font-semibold text-[#ac2c28]" : ""}>{i.waiting}</span>, <Chip key="s" tone={i.overdue ? "bad" : "info"}>{i.overdue ? "Overdue" : i.status}</Chip>] }))} />
      <p className="text-xs text-slate-500">The HOD, Vice principal and Principal approve or send back leave from their own portals; HR follows each request here. <button type="button" className="font-semibold text-[#026f9b] hover:underline" onClick={reload}>Refresh</button></p>
    </div>
  );
}

interface Bal { allowed: number; used: number; left: number }
interface Person { id: string; name: string; department: string; casual: Bal; sick: Bal; earned: Bal; lop: number }
export function LeaveBalance() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ year: string; items: Person[] }>(`${H}/leave-balance`), []);
  const [view, setView] = useState<Person | null>(null);
  const all = data?.items ?? [];
  const allowed = (k: "casual" | "sick" | "earned") => (all[0] ? ` (${all[0][k].allowed})` : "");
  const year = data ? `${data.year}–${String(Number(data.year) + 1).slice(2)}` : "";
  return (
    <div data-report>
      <Head title="Leave Balance" subtitle="Leave left this year for each employee." />
      <ErrorBanner message={error} />
      <Table title={`Leave balance · ${year}`} noun="staff" exportName="leave-balance" empty={loading ? "Loading…" : "No staff."}
        head={[{ h: "Staff" }, { h: `Casual${allowed("casual")}` }, { h: `Sick${allowed("sick")}` }, { h: `Earned${allowed("earned")}` }, { h: "Loss of pay this year" }, { h: "" }]}
        rows={all.map((i) => ({ key: i.id, find: `${i.name} ${i.department}`, out: [i.name, i.casual.left, i.sick.left, i.earned.left, i.lop], cells: [name(i.name, i.department), i.casual.left, i.sick.left, i.earned.left, i.lop, <button key="v" type="button" className={pill} onClick={() => setView(i)}>View details</button>] }))} />
      {view && <Modal open title={view.name} onClose={() => setView(null)}><KV rows={[["Casual", `${view.casual.left} left of ${view.casual.allowed}`], ["Sick", `${view.sick.left} left of ${view.sick.allowed}`], ["Earned", `${view.earned.left} left of ${view.earned.allowed}`], ["Loss of pay this year", `${view.lop} days`]]} /></Modal>}
    </div>
  );
}
