"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, ColumnChart } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, useLoad } from "@/components/admin/ui";
import { printScope } from "../../school/s/page-bar";
import { Row } from "../../school/s/dash-pages";
import { Head, redBtn } from "../../teacher/t/head";
import { AMBER, BLUE, BarRows, DataTable, Loading, Tile, dmy, has } from "../../admissions/m/ui";
import { usePrincipal } from "../context";

const GREEN = "bg-[#d9efe8]", RED = "bg-[#fde3e1]";
const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const Tiles = ({ children }: { children: ReactNode }) => <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{children}</div>;
const crore = (n: number) => (n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(2).replace(/\.?0+$/, "")} Cr` : n >= 100_000 ? `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L` : `₹${n.toLocaleString("en-IN")}`);
function Details({ title, rows, onClose }: { title: string; rows: [string, ReactNode][] | null; onClose: () => void }) {
  return <Modal open={!!rows} title={title} onClose={onClose}>{rows && <><dl>{rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={onClose}>Close</button></div></>}</Modal>;
}

// ═════════════ Reports > School Reports ═════════════
interface Rep {
  kind: string; classes: { id: string; name: string }[]; year: string; exam?: string;
  tiles?: Record<string, number | null>; months?: { key: string; label: string; pct: number; current: boolean }[];
  rows: Record<string, string | number | null>[];
}
const TEXT: Record<string, string> = { academic: "School performance for the board meeting: results, syllabus and attendance, class by class.", attendance: "Attendance across the school this year, class by class.", finance: "Fees billed and collected, class by class." };
const TITLE: Record<string, string> = { academic: "Academic", attendance: "Attendance", finance: "Finance" };

export function SchoolReportPage({ kind }: { kind: "academic" | "attendance" | "finance" }) {
  const [cls, setCls] = useState(""); const [q, setQ] = useState(""); const [view, setView] = useState<Rep["rows"][number] | null>(null);
  const r = useLoad(() => schoolFetch<Rep>(`/principal/reports/${kind}${cls ? `?grade=${cls}` : ""}`), [kind, cls]);
  const d = r.data; const rows = (d?.rows ?? []).filter((x) => has(x, q));
  const t = d?.tiles; const pc = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n}%`);
  return (
    <div data-report>
      <Head title={TITLE[kind]} subtitle={TEXT[kind]} action={<button type="button" className={redBtn} onClick={() => printScope(document.querySelector<HTMLElement>("[data-report]"), `school-report-${kind}`)}>Generate report</button>} />
      <ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Class<select aria-label="Class" value={cls} onChange={(e) => setCls(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none"><option value="">All classes</option>{d.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><span className="text-[11.5px] text-slate-500">{cls ? d.classes.find((c) => c.id === cls)?.name : "Whole school"} · {d.year}</span></div>
        {kind === "academic" && t && <>
          <Tiles><Tile label="Pass rate" value={pc(t.pass_rate)} sub={d.exam || "No marks yet"} bg={GREEN} tone="text-[#065740]" /><Tile label="School average" value={pc(t.average)} sub={d.exam || undefined} bg={BLUE} /><Tile label="Syllabus" value={pc(t.syllabus)} sub="Of planned periods" bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Attendance" value={pc(t.attendance)} sub="This year" bg={GREEN} tone="text-[#065740]" /></Tiles>
          <div className="mb-5"><Panel title="Average by class" sub={`${d.exam || "Latest exam"}, %`}><BarRows rows={d.rows.filter((x) => x.average !== null).map((x) => ({ label: String(x.class_label), value: Number(x.average), max: 100, text: `${x.average}%` }))} /></Panel></div>
        </>}
        {kind === "attendance" && <div className="mb-5"><Panel title="Monthly attendance" sub={`${d.year}, ${cls ? "this class" : "whole school"}`}>{d.months?.length ? <ColumnChart data={d.months.map((m) => ({ label: m.label, value: m.pct, partial: m.current }))} format={(n) => `${n}%`} title="Monthly attendance" /> : <p className="p-6 text-center text-sm text-slate-400">Nothing marked yet.</p>}</Panel></div>}
        {kind === "finance" && t && <>
          <Tiles><Tile label="Billed" value={crore(Number(t.billed))} sub={cls ? undefined : "All classes"} bg={BLUE} /><Tile label="Collected" value={crore(Number(t.collected))} sub={pc(t.pct)} bg={GREEN} tone="text-[#065740]" /><Tile label="Outstanding" value={crore(Number(t.outstanding))} bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Defaulters" value={Number(t.defaulters)} sub="Overdue 30+ days" bg={RED} tone="text-[#ac2c28]" /></Tiles>
          <div className="mb-5"><Panel title="Collected by class" sub="% of fees billed"><BarRows rows={d.rows.filter((x) => x.pct !== null).map((x) => ({ label: String(x.class_label), value: Number(x.pct), max: 100, text: `${x.pct}%` }))} /></Panel></div>
        </>}
        {kind === "academic" && <DataTable title="Class-wise academic report" noun="classes" search={q} onSearch={setQ} exportName="academic-report" exportHead={["Class", "Students", "Sections", "Average", "Pass rate", "Syllabus done", "Strongest", "Weakest"]} exportRows={rows.map((x) => [String(x.class_label), x.students, x.sections, pc(x.average as number), pc(x.pass_rate as number), pc(x.syllabus as number), String(x.strongest), String(x.weakest)])} head={["Class", "Students", "Sections", "Average", "Pass rate", "Syllabus done", "Strongest", "Weakest", ""]} empty="No classes yet."
          rows={rows.map((x) => [<b key="c" className="font-semibold text-slate-900">{String(x.class_label)}</b>, x.students, x.sections, pc(x.average as number), pc(x.pass_rate as number), pc(x.syllabus as number), String(x.strongest) || "—", String(x.weakest) || "—", <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />}
        {kind === "attendance" && <DataTable title="Class-wise attendance" noun="classes" search={q} onSearch={setQ} exportName="attendance-report" exportHead={["Class", "Students", "Today", "This year", "Below 75%", "Status"]} exportRows={rows.map((x) => [String(x.class_label), x.students, pc(x.today as number), pc(x.year as number), x.below_75, String(x.status)])} head={["Class", "Students", "Today", "This year", "Below 75%", "Status", ""]} empty="No classes yet."
          rows={rows.map((x) => [<b key="c" className="font-semibold text-slate-900">{String(x.class_label)}</b>, x.students, pc(x.today as number), pc(x.year as number), <span key="b" className={Number(x.below_75) ? "text-[#026f9b]" : ""}>{x.below_75}</span>, <Chip key="s" tone={x.status === "On track" ? "good" : "warn"}>{String(x.status)}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />}
        {kind === "finance" && <DataTable title="Class-wise fees" noun="classes" search={q} onSearch={setQ} exportName="finance-report" exportHead={["Class", "Students", "Fee per student", "Billed", "Collected", "Outstanding", "Collected %", "Defaulters"]} exportRows={rows.map((x) => [String(x.class_label), x.students, x.per_student, x.billed, x.collected, x.outstanding, pc(x.pct as number), x.defaulters])} head={["Class", "Students", "Fee per student", "Billed", "Collected", "Outstanding", "Collected %", "Defaulters", ""]} empty="No classes yet."
          rows={rows.map((x) => [<b key="c" className="font-semibold text-slate-900">{String(x.class_label)}</b>, x.students, `₹${Number(x.per_student).toLocaleString("en-IN")}`, crore(Number(x.billed)), crore(Number(x.collected)), crore(Number(x.outstanding)), pc(x.pct as number), x.defaulters, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />}
        <Details title={view ? String(view.class_label) : ""} onClose={() => setView(null)} rows={view ? Object.entries(view).filter(([k]) => k !== "id" && k !== "class_label").map(([k, v]) => [k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), v === null ? "—" : String(v)] as [string, ReactNode]) : null} />
      </>}
    </div>
  );
}

// ═════════════ Communication > Parent Concerns ═════════════
interface Cmp { id: string; code: string; parent: string; student: string; about: string; comment: string; rating: number | null; date: string; status: string }
export function ComplaintsPage() {
  const r = useLoad(() => schoolFetch<{ items: Cmp[] }>("/principal/concerns/complaints"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Cmp | null>(null);
  const all = r.data?.items ?? []; const rows = all.filter((x) => has(x, q));
  const n = (s: string) => all.filter((x) => x.status === s).length; const p = (x: number) => `${all.length ? Math.round((x / all.length) * 100) : 0}% of shown`;
  return (
    <div data-report><Head title="Complaints" subtitle="Parent feedback marked “Complaint”." /><ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Parent feedback" value={all.length} sub="Latest 500" bg={BLUE} /><Tile label="In progress" value={n("In progress")} sub={p(n("In progress"))} bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Open" value={n("Open")} sub={p(n("Open"))} bg={BLUE} /></Tiles>
        <DataTable title="Parent feedback" noun="feedback" search={q} onSearch={setQ} exportName="parent-complaints" exportHead={["Ref.", "Parent", "Student", "Type", "About", "Rating", "Date", "Status"]} exportRows={rows.map((x) => [x.code, x.parent, x.student, "Complaint", x.about, x.rating, x.date, x.status])} head={["Ref.", "Parent", "Student", "Type", "About", "Rating", "Date", "Status", ""]} empty="No complaints."
          rows={rows.map((x) => [x.code, x.parent, <b key="s" className="font-semibold text-[#026f9b]">{x.student}</b>, "Complaint", x.about, x.rating ?? "—", dmy(x.date), <Chip key="t" tone={x.status === "Open" ? "warn" : x.status === "Resolved" ? "good" : "info"}>{x.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />
        <Details title={view ? `${view.code} · ${view.about}` : ""} onClose={() => setView(null)} rows={view ? [["Parent", view.parent], ["Student", view.student || "—"], ["About", view.about], ["Comment", view.comment || "—"], ["Rating", String(view.rating ?? "—")], ["Date", dmy(view.date)], ["Status", view.status]] : null} />
      </>}
    </div>
  );
}

interface HD { tiles: { open: number; urgent: number; within: number | null; satisfaction: number | null }; items: { id: string; code: string; subject: string; category: string; by: string; by_kind: string; with: string; priority: string; status: string; hours_left: number }[] }
export function HelpDeskPage() {
  const r = useLoad(() => schoolFetch<HD>("/principal/concerns/help-desk"), []);
  const act = useAction(r.reload); const { refreshBadges } = usePrincipal();
  const [q, setQ] = useState(""); const [view, setView] = useState<HD["items"][number] | null>(null);
  const d = r.data; const rows = (d?.items ?? []).filter((x) => has(x, q));
  const left = (h: number) => (h < 0 ? `Overdue ${Math.abs(h) < 48 ? `${Math.abs(h)} h` : `${Math.floor(Math.abs(h) / 24)} d`}` : `Due in ${h} h`);
  return (
    <div data-report><Head title="Help Desk" subtitle="Help desk tickets that are urgent or past their reply time. The School Admin runs the help desk day to day." /><ErrorBanner message={r.error || act.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Open tickets" value={d.tiles.open} bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Urgent or overdue" value={d.tiles.urgent} sub="Needs a look" bg={RED} tone="text-[#ac2c28]" /><Tile label="Within reply time" value={d.tiles.within === null ? "—" : `${d.tiles.within}%`} sub="This month" bg={BLUE} /><Tile label="Satisfaction" value={d.tiles.satisfaction === null ? "—" : `${d.tiles.satisfaction} / 5`} bg={BLUE} /></Tiles>
        <DataTable title="Urgent or overdue" noun="tickets" search={q} onSearch={setQ} exportName="urgent-tickets" exportHead={["Number", "Subject", "Raised by", "With", "Reply time"]} exportRows={rows.map((x) => [x.code, x.subject, x.by, x.with, left(x.hours_left)])} head={["Number", "Subject", "Raised by", "With", "Reply time", ""]} empty="Nothing urgent or overdue."
          rows={rows.map((x) => [x.code, <span key="s" className="block leading-tight">{x.subject}<span className="block text-[11.5px] text-slate-500">{x.category}</span></span>, <span key="b" className="block leading-tight">{x.by}<span className="block text-[11.5px] text-slate-500">{x.by_kind}</span></span>, x.with || "—", <Chip key="r" tone={x.hours_left < 0 ? "bad" : "info"}>{left(x.hours_left)}</Chip>, <span key="a" className="flex justify-end gap-1.5"><button type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/principal/concerns/help-desk/${x.id}/update`, json("POST", {}))).then(refreshBadges)}>Ask for update</button><button type="button" className={pill} onClick={() => setView(x)}>View details</button></span>])} />
        <Details title={view ? `${view.code} · ${view.subject}` : ""} onClose={() => setView(null)} rows={view ? [["Category", view.category], ["Raised by", `${view.by} (${view.by_kind})`], ["With", view.with || "—"], ["Priority", view.priority], ["Status", view.status], ["Reply time", left(view.hours_left)]] : null} />
      </>}
    </div>
  );
}

// ═════════════ Finance > School Store ═════════════
interface Store { since: string; sales: number; bills: number; month: { amount: number; bills: number }; stock_value: number; low: number; low_items: string[]; by_month: { label: string; amount: number }[] }
export function SchoolStorePage() {
  const r = useLoad(() => schoolFetch<Store>("/principal/store"), []);
  const d = r.data; const mx = Math.max(1, ...(d?.by_month ?? []).map((m) => m.amount));
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <div data-report><Head title="School Store" subtitle="How the school store is doing. Run in the Inventory portal." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <p className="mb-4 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">Totals cover the whole school and every bill since the start of the year.</p>
        <Tiles><Tile label="Store sales this year" value={inr(d.sales)} sub={`${d.bills.toLocaleString("en-IN")} bills`} bg={BLUE} /><Tile label="This month" value={inr(d.month.amount)} sub={`${d.month.bills} bills`} bg={BLUE} /><Tile label="Stock value" value={inr(d.stock_value)} sub="At the stock price" bg={BLUE} /><Tile label="Low stock" value={d.low} sub="Items to reorder" bg={AMBER} tone="text-[#8a5a0b]" /></Tiles>
        <Panel title="Sales by month"><BarRows rows={d.by_month.map((m) => ({ label: m.label, value: m.amount, max: mx, text: inr(m.amount) }))} /></Panel>
        {d.low_items.length > 0 && <p className="mt-4 rounded-xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-2.5 text-[12.5px] text-slate-800"><b>Low stock:</b> {d.low_items.join(", ")}.</p>}
      </>}
    </div>
  );
}
