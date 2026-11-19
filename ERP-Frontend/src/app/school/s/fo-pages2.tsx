"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, hm, mask, pct, todayIso, useRegister, useStaff } from "./fo-pages";
import type { Items } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { printScope } from "./page-bar";
import { useGoTab } from "./tab-context";

const countBy = <T,>(rows: T[], key: (r: T) => string): [string, number][] => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const ModalFooter = ({ left, close }: { left?: React.ReactNode; close: () => void }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const rejectCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";

// ═════════════ Complaint register ═════════════
interface Complaint { id: string; code: string; raised_by: string; about: string; details: string; assigned_to: string | null; assigned_name: string | null; raised_on: string; status: "Open" | "In progress" | "Resolved" }
const ABOUT = ["Transport", "Classroom", "Canteen food", "Housekeeping", "Fees", "Bullying", "Other"];
const cmpTone = (s: Complaint["status"]): "warn" | "info" | "good" => (s === "Open" ? "warn" : s === "In progress" ? "info" : "good");

export type ComplaintTab = "new-complaint" | "complaint-list" | "resolution";
export function ComplaintPages({ tab }: { tab: ComplaintTab }) {
  return tab === "new-complaint" ? <NewComplaint /> : <ComplaintList resolution={tab === "resolution"} />;
}

function NewComplaint() {
  const go = useGoTab();
  const staff = useStaff();
  const blank = { raised_by: "", about: ABOUT[0], details: "", assigned_to: "", raised_on: todayIso() };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/complaints", json("POST", { ...f, assigned_to: f.assigned_to || null })))) { setF(blank); go("complaint-list"); } };
  return (
    <FormCard title="New Complaint" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error || staff.error}>
      <Field label="Raised by"><input className={inputCls} required maxLength={150} value={f.raised_by} onChange={(e) => setF({ ...f, raised_by: e.target.value })} /></Field>
      <Field label="About"><select className={inputCls} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })}>{ABOUT.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Details"><input className={inputCls} required minLength={2} maxLength={500} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
      <Field label="Assigned to"><select className={inputCls} value={f.assigned_to} onChange={(e) => setF({ ...f, assigned_to: e.target.value })}><option value="">Nobody yet</option>{(staff.data?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Raised on"><input type="date" className={inputCls} value={f.raised_on} onChange={(e) => setF({ ...f, raised_on: e.target.value })} /></Field>
    </FormCard>
  );
}

function ComplaintList({ resolution }: { resolution: boolean }) {
  const { rows: all, loading, error, reload } = useRegister<Complaint>("complaints");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Complaint | null>(null);
  const base = resolution ? all.filter((r) => r.status !== "Resolved") : all;
  const rows = base.filter((r) => has(r, search));
  const n = (s: Complaint["status"]) => base.filter((r) => r.status === s).length;
  const set = async (c: Complaint, status: Complaint["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/complaints/${c.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Complaints", value: base.length, sub: "All records" }, { label: "Open", value: n("Open"), sub: pct(n("Open"), base.length) }, { label: "In progress", value: n("In progress"), sub: pct(n("In progress"), base.length) }, ...(resolution ? [] : [{ label: "Resolved", value: n("Resolved"), sub: pct(n("Resolved"), base.length) }])]} />
      <ListPanel title="Complaints" noun="complaints" search={search} onSearch={setSearch} exportName={resolution ? "open-complaints" : "complaints"} head={["Complaint no.", "Raised by", "About", "Details", "Assigned to", "Raised on", "Status"]}
        exportRows={rows.map((r) => [r.code, r.raised_by, r.about, r.details, r.assigned_name, day(r.raised_on), r.status])}
        tableHead={["Complaint no.", "Raised by", "About", "Details", "Assigned to", "Raised on", "Status", ""]} empty={loading ? "Loading…" : resolution ? "Nothing waiting to be resolved." : "No complaints yet."}
        rows={rows.map((r) => [r.code, r.raised_by, r.about, r.details, r.assigned_name ?? "—", day(r.raised_on), <Chip key="s" tone={cmpTone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{resolution && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Resolved")}>Mark resolved</button>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.about}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Raised by" v={view.raised_by} /><Row k="About" v={view.about} /><Row k="Details" v={view.details} /><Row k="Assigned to" v={view.assigned_name ?? "—"} /><Row k="Raised on" v={day(view.raised_on)} /><Row k="Status" v={view.status} /></dl>
        <ModalFooter close={() => setView(null)} left={<>{view.status === "Open" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "In progress")}>Start work</button>}{view.status !== "Resolved" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Resolved")}>Mark resolved</button>}</>} /></>}</Modal>
    </div>
  );
}

// ═════════════ Gate pass ═════════════
interface Gate { id: string; code: string; kind: "Student" | "Staff"; person_name: string; class_dept: string | null; reason: string; out_time: string | null; picked_up_by: string | null; pass_date: string; status: "Pending approval" | "Expected" | "Left" | "Out" | "Returned" | "Rejected"; assigned_name: string | null }
const gStatus = (g: Gate) => (g.kind === "Staff" && (g.status === "Out" || g.status === "Returned") && g.assigned_name ? `${g.status} · ${g.assigned_name}` : g.status);

export type GateTab = "student-gate-pass" | "staff-gate-pass" | "approval";
export function GatePassPages({ tab }: { tab: GateTab }) {
  const kind = tab === "student-gate-pass" ? "Student" : tab === "staff-gate-pass" ? "Staff" : undefined;
  const { rows: all, loading, error, reload } = useRegister<Gate>("gate-passes", { kind });
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Gate | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { kind: kind ?? "Student", person_name: "", class_dept: "", reason: "", out_time: "", picked_up_by: "", pass_date: todayIso() };
  const [f, setF] = useState(blank);
  const base = tab === "approval" ? all.filter((g) => g.status === "Pending approval") : all;
  const rows = base.filter((g) => has(g, search));
  const n = (s: Gate["status"]) => base.filter((g) => g.status === s).length;
  const set = async (g: Gate, status: Gate["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/gate-passes/${g.id}`, json("PATCH", { status })))) setView(null); };
  const approve = (g: Gate) => set(g, g.kind === "Student" ? "Expected" : "Out");
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/gate-passes", json("POST", f)))) setAdding(false); };
  const tiles = tab === "approval" ? [{ label: "Gate passes", value: base.length, sub: "All records" }, { label: "Pending approval", value: n("Pending approval"), sub: pct(n("Pending approval"), base.length) }]
    : tab === "student-gate-pass" ? [{ label: "Gate passes", value: base.length, sub: "All records" }, { label: "Left", value: n("Left"), sub: pct(n("Left"), base.length) }, { label: "Expected", value: n("Expected"), sub: pct(n("Expected"), base.length) }, { label: "Pending approval", value: n("Pending approval"), sub: pct(n("Pending approval"), base.length) }]
      : [{ label: "Gate passes", value: base.length, sub: "All records" }, { label: "Out", value: n("Out"), sub: pct(n("Out"), base.length) }, { label: "Returned", value: n("Returned"), sub: pct(n("Returned"), base.length) }, { label: "Pending approval", value: n("Pending approval"), sub: pct(n("Pending approval"), base.length) }];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Gate passes" noun="passes" search={search} onSearch={setSearch} exportName={tab} head={["Pass no.", "For", "Name", "Class / dept", "Reason", "Out at", "Picked up by", "Date", "Status"]}
        extra={<button type="button" className={small} onClick={() => { setF(blank); setAdding(true); }}>+ New gate pass</button>}
        exportRows={rows.map((g) => [g.code, g.kind, g.person_name, g.class_dept, g.reason, hm(g.out_time), g.picked_up_by, day(g.pass_date), gStatus(g)])}
        tableHead={["Pass no.", "For", "Name", "Class / dept", "Reason", "Out at", "Picked up by", "Date", "Status", ""]} empty={loading ? "Loading…" : tab === "approval" ? "Nothing is waiting for a decision." : "No gate passes yet."}
        rows={rows.map((g) => [g.code, g.kind, g.person_name, g.class_dept ?? "—", g.reason, hm(g.out_time), g.picked_up_by ?? "—", day(g.pass_date), <Chip key="s" tone={g.status === "Pending approval" ? "warn" : "mute"}>{gStatus(g)}</Chip>,
          <span key="a" className="flex gap-1.5">{g.status === "Pending approval" && <><button type="button" className={rejectCls} disabled={act.busy} onClick={() => void set(g, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void approve(g)}>Approve</button></>}<button type="button" className={small} onClick={() => setView(g)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.person_name}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="For" v={view.kind} /><Row k="Class / dept" v={view.class_dept ?? "—"} /><Row k="Reason" v={view.reason} /><Row k="Out at" v={hm(view.out_time)} /><Row k="Picked up by" v={view.picked_up_by ?? "—"} /><Row k="Date" v={day(view.pass_date)} /><Row k="Status" v={gStatus(view)} /></dl>
        <ModalFooter close={() => setView(null)} left={<>
          {view.status === "Pending approval" && <><button type="button" className={rejectCls} disabled={act.busy} onClick={() => void set(view, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void approve(view)}>Approve</button></>}
          {view.status === "Expected" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Left")}>Mark left</button>}
          {view.status === "Out" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Returned")}>Mark returned</button>}</>} /></>}</Modal>
      <Modal open={adding} title="New gate pass" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="For"><select className={inputCls} value={f.kind} disabled={!!kind} onChange={(e) => setF({ ...f, kind: e.target.value as "Student" | "Staff" })}><option>Student</option><option>Staff</option></select></Field>
          <Field label="Name"><input className={inputCls} required maxLength={150} value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} /></Field>
          <Field label="Class / dept"><input className={inputCls} maxLength={60} value={f.class_dept} onChange={(e) => setF({ ...f, class_dept: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} required minLength={2} maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <Field label="Out at"><input type="time" className={inputCls} value={f.out_time} onChange={(e) => setF({ ...f, out_time: e.target.value })} /></Field>
          <Field label="Picked up by"><input className={inputCls} maxLength={150} placeholder="Name and relation" value={f.picked_up_by} onChange={(e) => setF({ ...f, picked_up_by: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} value={f.pass_date} onChange={(e) => setF({ ...f, pass_date: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Front office reports ═════════════
export type ReportTab = "enquiry-report" | "visitor-report" | "complaint-report";
interface RepEnquiry { id: string; code: string; visitor: string; purpose: string; mobile: string | null; assigned_name: string | null; enquiry_date: string; next_followup: string | null; status: string }
interface RepVisitor { id: string; visit_date: string; visitor: string; purpose: string; details: string | null; meeting: string | null; id_proof: string | null; in_time: string | null; out_time: string | null }

function usePrintEvent(name: string, scope: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const h = () => printScope(scope.current, name);
    window.addEventListener("school-print", h);
    return () => window.removeEventListener("school-print", h);
  }, [name, scope]);
}

export function ReportPages({ tab }: { tab: ReportTab }) {
  const ref = useRef<HTMLDivElement>(null);
  usePrintEvent(tab, ref);
  return <div ref={ref} data-report>{tab === "enquiry-report" ? <EnquiryReport /> : tab === "visitor-report" ? <VisitorReport /> : <ComplaintReport />}</div>;
}

function Chart({ title, sub, rows }: { title: string; sub: string; rows: [string, number][] }) {
  return <Panel title={title} sub={sub} right={<ExportPrint name={title.toLowerCase()} head={[title, "Count"]} rows={rows} />}><BarRows rows={rows} /></Panel>;
}

function EnquiryReport() {
  const { rows, loading, error } = useRegister<RepEnquiry>("enquiries");
  const [search, setSearch] = useState("");
  const n = (s: string) => rows.filter((r) => r.status === s).length;
  const list = rows.filter((r) => has(r, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Enquiries", value: rows.length, sub: "All records" }, { label: "Open", value: n("Open"), sub: pct(n("Open"), rows.length) }, { label: "Follow-up", value: n("Follow-up"), sub: pct(n("Follow-up"), rows.length) }, { label: "Converted", value: n("Converted"), sub: pct(n("Converted"), rows.length) }]} />
      <Chart title="Purpose" sub="Count by purpose" rows={countBy(rows, (r) => r.purpose)} />
      <ListPanel title="Enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName="enquiry-report" head={["Enquiry no.", "Visitor", "Purpose", "Mobile", "Assigned to", "Date", "Next follow-up", "Status"]}
        exportRows={list.map((r) => [r.code, r.visitor, r.purpose, r.mobile, r.assigned_name, day(r.enquiry_date), day(r.next_followup), r.status])}
        tableHead={["Enquiry no.", "Visitor", "Purpose", "Mobile", "Assigned to", "Date", "Next follow-up", "Status"]} empty={loading ? "Loading…" : "No enquiries yet."}
        rows={list.map((r) => [r.code, r.visitor, r.purpose, mask(r.mobile), r.assigned_name ?? "—", day(r.enquiry_date), day(r.next_followup), r.status])} />
    </div>
  );
}

function VisitorReport() {
  const { rows, loading, error } = useRegister<RepVisitor>("visitors");
  const [search, setSearch] = useState("");
  const out = rows.filter((r) => r.out_time).length;
  const list = rows.filter((r) => has(r, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Visitors", value: rows.length, sub: "All records" }, { label: "Checked out", value: out, sub: pct(out, rows.length) }, { label: "Checked in", value: rows.length - out, sub: pct(rows.length - out, rows.length) }]} />
      <Chart title="Purpose" sub="Count by purpose" rows={countBy(rows, (r) => r.purpose)} />
      <ListPanel title="Visitors" noun="visitors" search={search} onSearch={setSearch} exportName="visitor-report" head={["Date", "Visitor", "Purpose", "Details", "Meeting", "ID proof", "In", "Out", "Status"]}
        exportRows={list.map((r) => [day(r.visit_date), r.visitor, r.purpose, r.details, r.meeting, r.id_proof, hm(r.in_time), hm(r.out_time), r.out_time ? "Checked out" : "Checked in"])}
        tableHead={["Date", "Visitor", "Purpose", "Details", "Meeting", "ID proof", "In", "Out", "Status"]} empty={loading ? "Loading…" : "No visitors yet."}
        rows={list.map((r) => [day(r.visit_date), r.visitor, r.purpose, r.details ?? "—", r.meeting ?? "—", r.id_proof ?? "—", hm(r.in_time), hm(r.out_time), r.out_time ? "Checked out" : "Checked in"])} />
    </div>
  );
}

function ComplaintReport() {
  const { rows, loading, error } = useRegister<Complaint>("complaints");
  const [search, setSearch] = useState("");
  const n = (s: string) => rows.filter((r) => r.status === s).length;
  const list = rows.filter((r) => has(r, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Complaints", value: rows.length, sub: "All records" }, { label: "Open", value: n("Open"), sub: pct(n("Open"), rows.length) }, { label: "In progress", value: n("In progress"), sub: pct(n("In progress"), rows.length) }, { label: "Resolved", value: n("Resolved"), sub: pct(n("Resolved"), rows.length) }]} />
      <Chart title="About" sub="Count by about" rows={countBy(rows, (r) => r.about)} />
      <ListPanel title="Complaints" noun="complaints" search={search} onSearch={setSearch} exportName="complaint-report" head={["Complaint no.", "Raised by", "About", "Details", "Assigned to", "Raised on", "Status"]}
        exportRows={list.map((r) => [r.code, r.raised_by, r.about, r.details, r.assigned_name, day(r.raised_on), r.status])}
        tableHead={["Complaint no.", "Raised by", "About", "Details", "Assigned to", "Raised on", "Status"]} empty={loading ? "Loading…" : "No complaints yet."}
        rows={list.map((r) => [r.code, r.raised_by, r.about, r.details, r.assigned_name ?? "—", day(r.raised_on), r.status])} />
    </div>
  );
}

// ═════════════ Help desk ═════════════
interface Ticket { id: string; code: string; subject: string; category: string; raised_by_name: string; raised_by_kind: "Parent" | "Teacher" | "Staff"; priority: "High" | "Normal" | "Low"; assigned_name: string | null; status: "Open" | "In progress" | "Waiting on you" | "Resolved"; rating: number | null; first_reply_at: string | null; resolved_at: string | null; created_at: string }
interface Category { name: string; raised_by: string; handled_by: string; reply_hours: number }
const useCategories = () => useLoad(() => schoolFetch<Items<Category>>("/school/front-office/help-desk/categories"), []);

const hours = (ms: number) => ms / 3_600_000;
const fmtH = (h: number) => (h >= 24 ? `${Math.round(h / 24)}d` : `${Math.round(h)}h`);
/** Where a ticket stands against its reply time: hours left (negative once late). Resolved or paused tickets have none. */
function dueIn(t: Ticket, cats: Category[]): number | null {
  if (t.status === "Resolved" || t.status === "Waiting on you") return null;
  const limit = cats.find((c) => c.name === t.category)?.reply_hours ?? 48;
  return limit - hours(Date.now() - new Date(t.created_at).getTime());
}

export type HelpDeskTab = "all-tickets" | "categories-and-reply-times" | "help-desk-reports";
export function HelpDeskPages({ tab }: { tab: HelpDeskTab }) {
  return tab === "all-tickets" ? <AllTickets /> : tab === "categories-and-reply-times" ? <Categories /> : <HelpDeskReports />;
}

const CHIPS = ["All", "Open", "In progress", "Waiting on you", "Overdue", "Parents", "Staff", "Resolved"] as const;
function AllTickets() {
  const { rows, loading, error, reload } = useRegister<Ticket>("tickets");
  const cats = useCategories();
  const act = useAction(reload);
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ticket | null>(null);
  const [adding, setAdding] = useState(false);
  const c = cats.data?.items ?? [];
  const blank = { subject: "", category: c[0]?.name ?? "", raised_by_name: "", raised_by_kind: "Parent", priority: "Normal", assigned_name: "" };
  const [f, setF] = useState(blank);
  const open = rows.filter((r) => r.status !== "Resolved");
  const overdue = open.filter((r) => (dueIn(r, c) ?? 1) < 0);
  const replied = rows.filter((r) => r.first_reply_at);
  const avg = replied.length ? replied.reduce((s, r) => s + hours(new Date(r.first_reply_at!).getTime() - new Date(r.created_at).getTime()), 0) / replied.length : null;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const resolvedMonth = rows.filter((r) => r.resolved_at && new Date(r.resolved_at) >= monthStart);
  const rated = rows.filter((r) => r.rating);
  const sat = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null;
  const shown = rows.filter((r) => {
    if (chip === "Overdue") return open.includes(r) && (dueIn(r, c) ?? 1) < 0;
    if (chip === "Parents") return r.raised_by_kind === "Parent";
    if (chip === "Staff") return r.raised_by_kind !== "Parent";
    return chip === "All" || r.status === chip;
  }).filter((r) => has(r, search));
  const set = async (t: Ticket, body: Record<string, unknown>) => { if (await act.run(() => schoolFetch(`/school/front-office/tickets/${t.id}`, json("PATCH", body)))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/tickets", json("POST", { ...f, assigned_name: f.assigned_name || null })))) setAdding(false); };
  const replyChip = (t: Ticket) => { if (t.status === "Waiting on you") return "Paused"; const d = dueIn(t, c); if (d === null) return "—"; return d < 0 ? <Chip tone="bad">Overdue {fmtH(-d)}</Chip> : <Chip tone="info">Due in {fmtH(d)}</Chip>; };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || cats.error || act.error} />
      <Tiles items={[
        { label: "Open now", value: open.length, sub: `${open.filter((r) => r.raised_by_kind === "Parent").length} from parents` },
        { label: "Overdue", value: overdue.length, sub: "Past reply time" },
        { label: "Avg first reply", value: avg === null ? "—" : `${avg.toFixed(1)} h`, sub: avg === null ? "No replies yet" : "From raised to first reply" },
        { label: "Resolved this month", value: resolvedMonth.length, sub: sat === null ? "No ratings yet" : `Satisfaction ${sat.toFixed(1)} / 5` },
      ]} />
      <div className="flex flex-wrap gap-2">{CHIPS.map((x) => <button key={x} type="button" onClick={() => setChip(x)} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${chip === x ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>{x}</button>)}</div>
      <ListPanel title="All tickets" noun="tickets" search={search} onSearch={setSearch} exportName="help-desk-tickets" head={["Number", "Subject", "Category", "Raised by", "Priority", "With", "Status"]}
        extra={<button type="button" className={small} onClick={() => { setF({ ...blank, category: c[0]?.name ?? "" }); setAdding(true); }}>+ New ticket</button>}
        exportRows={shown.map((r) => [r.code, r.subject, r.category, `${r.raised_by_name} (${r.raised_by_kind})`, r.priority, r.assigned_name, r.status])}
        tableHead={["Number", "Subject", "Raised by", "Priority", "With", "Status", "Reply time", ""]} empty={loading ? "Loading…" : "No tickets yet."}
        rows={shown.map((r) => [r.code, <div key="s"><p className="font-semibold text-slate-900">{r.subject}</p><p className="text-xs text-slate-400">{r.category}</p></div>, <div key="b"><p className="font-semibold text-slate-900">{r.raised_by_name}</p><p className="text-xs text-slate-400">{r.raised_by_kind}</p></div>,
          r.priority === "High" ? <Chip key="p" tone="warn">High</Chip> : r.priority, r.assigned_name ?? "—", <Chip key="st" tone={r.status === "Open" ? "warn" : r.status === "Resolved" ? "good" : r.status === "Waiting on you" ? "warn" : "info"}>{r.status}</Chip>, replyChip(r), <button key="o" type="button" className={small} onClick={() => setView(r)}>Open</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.subject}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Category" v={view.category} /><Row k="Raised by" v={`${view.raised_by_name} (${view.raised_by_kind})`} /><Row k="Priority" v={view.priority} /><Row k="With" v={view.assigned_name ?? "—"} /><Row k="Raised" v={day(view.created_at)} /><Row k="Status" v={view.status} /></dl>
        <ModalFooter close={() => setView(null)} left={view.status === "Resolved" ? null : <>
          {view.status === "Open" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, { status: "In progress" })}>Start work</button>}
          {view.status === "In progress" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, { status: "Waiting on you" })}>Waiting on them</button>}
          {view.status === "Waiting on you" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, { status: "In progress" })}>Resume</button>}
          <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, { status: "Resolved" })}>Resolve</button></>} /></>}</Modal>
      <Modal open={adding} title="New ticket" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Subject"><input className={inputCls} required minLength={3} maxLength={250} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field></div>
          <Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{c.map((x) => <option key={x.name}>{x.name}</option>)}</select></Field>
          <Field label="Priority"><select className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option>High</option><option>Normal</option><option>Low</option></select></Field>
          <Field label="Raised by"><input className={inputCls} required maxLength={150} value={f.raised_by_name} onChange={(e) => setF({ ...f, raised_by_name: e.target.value })} /></Field>
          <Field label="They are a"><select className={inputCls} value={f.raised_by_kind} onChange={(e) => setF({ ...f, raised_by_kind: e.target.value })}><option>Parent</option><option>Teacher</option><option>Staff</option></select></Field>
          <div className="sm:col-span-2"><Field label="With"><input className={inputCls} maxLength={150} placeholder="Who is handling it" value={f.assigned_name} onChange={(e) => setF({ ...f, assigned_name: e.target.value })} /></Field></div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

function Categories() {
  const { data, error, loading, reload } = useCategories();
  const act = useAction(reload);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = (name: string) => { const v = Number(draft[name]); if (!draft[name] || !Number.isFinite(v)) return; void act.run(() => schoolFetch(`/school/front-office/help-desk/categories/${encodeURIComponent(name)}`, json("PATCH", { reply_hours: v }))); };
  const items = data?.items ?? [];
  return (
    <div data-report>
      <ErrorBanner message={error || act.error} />
      <Panel title="Categories and reply times" sub={`${items.length} categories`} right={<ExportPrint name="help-desk-categories" head={["Category", "Raised by", "Handled by", "Reply within (hours)", "Escalates to"]} rows={items.map((x) => [x.name, x.raised_by, x.handled_by, x.reply_hours, "School Admin, then Principal"])} />}>
        <SimpleTable head={[{ h: "Category" }, { h: "Raised by" }, { h: "Handled by" }, { h: "Person" }, { h: "Reply within (hours)" }, { h: "Escalates to" }]} empty={loading ? "Loading…" : "No categories."}
          rows={items.map((x) => [x.name, x.raised_by, x.handled_by, "—", <input key="h" type="number" min={1} max={720} aria-label={`Reply hours for ${x.name}`} className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" value={draft[x.name] ?? String(x.reply_hours)} onChange={(e) => setDraft({ ...draft, [x.name]: e.target.value })} onBlur={() => { if (draft[x.name] !== undefined && Number(draft[x.name]) !== x.reply_hours) save(x.name); }} />, "School Admin, then Principal"])} />
      </Panel>
    </div>
  );
}

function HelpDeskReports() {
  const { rows, error } = useRegister<Ticket>("tickets");
  const cats = useCategories();
  const c = cats.data?.items ?? [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const prevStart = new Date(monthStart); prevStart.setMonth(prevStart.getMonth() - 1);
  const month = rows.filter((r) => new Date(r.created_at) >= monthStart);
  const prev = rows.filter((r) => new Date(r.created_at) >= prevStart && new Date(r.created_at) < monthStart);
  const within = (t: Ticket) => { const limit = c.find((x) => x.name === t.category)?.reply_hours ?? 48; const at = t.first_reply_at ?? null; return at ? hours(new Date(at).getTime() - new Date(t.created_at).getTime()) <= limit : false; };
  const answered = month.filter((t) => t.first_reply_at);
  const inTime = answered.filter(within).length;
  const solved = month.filter((t) => t.resolved_at);
  const avgSolve = solved.length ? solved.reduce((s, t) => s + hours(new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / solved.length : null;
  const rated = month.filter((t) => t.rating);
  const sat = rated.length ? rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length : null;
  const byTeam = [...new Set(c.map((x) => x.handled_by))].map((team): [string, number] => { const mine = answered.filter((t) => c.find((x) => x.name === t.category)?.handled_by === team); return [team, mine.length ? Math.round((mine.filter(within).length / mine.length) * 100) : 0]; }).filter(([team]) => answered.some((t) => c.find((x) => x.name === t.category)?.handled_by === team));
  const trend = prev.length ? Math.round(((month.length - prev.length) / prev.length) * 100) : null;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || cats.error} />
      <Tiles items={[
        { label: "Tickets this month", value: month.length, sub: trend === null ? "No tickets last month" : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% on last month` },
        { label: "Within reply time", value: answered.length ? `${Math.round((inTime / answered.length) * 100)}%` : "—", sub: answered.length ? `${inTime} of ${answered.length} replied` : "No replies yet" },
        { label: "Avg time to resolve", value: avgSolve === null ? "—" : `${Math.round(avgSolve)} h`, sub: avgSolve === null ? "Nothing resolved yet" : `${solved.length} resolved` },
        { label: "Satisfaction", value: sat === null ? "—" : `${sat.toFixed(1)} / 5`, sub: sat === null ? "No ratings yet" : `from ${rated.length} ratings` },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Tickets by category" sub="This month"><BarRows rows={countBy(month, (t) => t.category)} /></Panel>
        <Panel title="Within reply time, by team" sub="This month"><BarRows rows={byTeam} format={(n) => `${n}%`} /></Panel>
      </div>
      <Panel title="Ratings" sub={`${rated.length} ratings this month`}><BarRows rows={[5, 4, 3, 2, 1].map((n): [string, number] => [`${n} ${n === 1 ? "star" : "stars"}`, rated.filter((t) => t.rating === n).length])} /></Panel>
    </div>
  );
}
