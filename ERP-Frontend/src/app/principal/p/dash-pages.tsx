"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { schoolFetch } from "@/lib/school-api";
import { Panel } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, useLoad } from "@/components/admin/ui";
import { PageBar } from "../../school/s/page-bar";
import { Row } from "../../school/s/dash-pages";
import { Head, redBtn } from "../../teacher/t/head";
import { AMBER, BLUE, BarRows, DataTable, Loading, Tile, dmy, has } from "../../admissions/m/ui";
import { usePrincipal } from "../context";
import { PrincipalQuickActions } from "./quick";

const GREEN = "bg-[#d9efe8]", RED = "bg-[#fde3e1]";
const crore = (n: number) => (n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(2)} Cr` : n >= 100_000 ? `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 1 : 2).replace(/\.?0+$/, "")}L` : `₹${n.toLocaleString("en-IN")}`);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const year = (y?: string) => (y ?? "").replace(/^(\d{4})[–-](\d{2})(\d{2})$/, "$1–$3").replace(/^(\d{4})-(\d{4})$/, (_, a: string, b: string) => `${a}–${b.slice(2)}`);

interface Base { years: { id: string; name: string; is_current: boolean }[]; year: { id: string; name: string } | null; off?: string }

/** The bar every Principal page has under its tabs: academic year, search this page, download the report (the print window). */
export function Bar({ name, years, year: y, onYear }: { name: string; years?: Base["years"]; year?: string; onYear?: (id: string) => void }) {
  const own = useLoad(() => (years ? Promise.resolve(null) : schoolFetch<{ items: Base["years"] }>("/principal/years")), [!!years]);
  const list = years ?? own.data?.items ?? [];
  const [pick, setPick] = useState("");
  const value = y ?? (pick || list.find((x) => x.is_current)?.id || list[0]?.id || "");
  return <PageBar label="Download report" years={list.map((x) => ({ id: x.id, name: year(x.name) }))} year={value} onYear={(id) => (onYear ? onYear(id) : setPick(id))} name={name} />;
}

/** Help desk and calendar: the shared staff screens with this portal's bar above them. */
export const WithBar = ({ name, children }: { name: string; children: ReactNode }) => <div data-report><Bar name={name} />{children}</div>;

const hello = () => { const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const todayText = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function useTab<T>(tab: string) {
  const [yr, setYr] = useState("");
  const r = useLoad(() => schoolFetch<T & Base>(`/principal/overview?tab=${tab}${yr ? `&year=${yr}` : ""}`), [tab, yr]);
  return { r, yr, setYr, d: r.data };
}
const Frame = ({ name, d, yr, setYr, error, children, plain = false }: { name: string; d?: Base | null; yr: string; setYr: (y: string) => void; error: string; children: ReactNode; plain?: boolean }) => (
  <div data-report>
    {!plain && <PrincipalQuickActions />}
    {!plain && <Bar name={name} years={d?.years ?? []} year={yr || d?.year?.id || ""} onYear={setYr} />}
    <ErrorBanner message={error} />
    {children}
  </div>
);
const Off = ({ what }: { what: string }) => <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{what} is not part of your school&apos;s plan. Ask your administrator to add this module.</p>;

// ═════════════ School Statistics ═════════════
interface Stats {
  today: string;
  tiles: { students: { total: number; present: number | null; pct: number | null }; staff: { total: number; present: number; on_leave: number }; fees: { collected: number; annual: number; pct: number } | null; syllabus: { pct: number } | null; admissions: { admitted: number; in_progress: number } | null };
  waiting: { key: string; label: string; count: number }[]; waiting_total: number;
  attendance_by_class: { label: string; pct: number | null }[];
  class_performance: { exam: string; rows: { label: string; pct: number }[] };
  watch: { key: string; tone: "bad" | "warn" | "info"; mark: string; title: string; note: string; href: string }[];
}
const KIND_HREF: Record<string, string> = { admissions: "/principal/approvals/approval-centre?tab=admissions", leave: "/principal/approvals/approval-centre?tab=leave", concession: "/principal/approvals/approval-centre?tab=fees", results: "/principal/approvals/approval-centre?tab=results", increment: "/principal/approvals/approval-centre?tab=increments", claim: "/principal/approvals/approval-centre?tab=claims", circular: "/principal/communication/circulars?tab=approve" };
const ROUTINE: [string, string][] = [["Review daily attendance", "/principal/dashboard/overview?tab=attendance"], ["Check academic progress", "/principal/academics/academic-overview"], ["Review pending approvals", "/principal/approvals/approval-centre"], ["Monitor fee collection", "/principal/dashboard/overview?tab=fees"], ["Review examination results", "/principal/approvals/approval-centre?tab=results"], ["Approve circulars", "/principal/communication/circulars?tab=approve"], ["Generate school performance reports", "/principal/reports"]];
const WATCH_TONE = { bad: "bg-[#fde3e1] text-[#ac2c28]", warn: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]" };
const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400";

function Routine() {
  const router = useRouter();
  const key = `principal-routine:${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}`;
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); setDone(Array.isArray(v) ? v : []); } catch { /* storage unavailable */ } }, [key]); // eslint-disable-line react-hooks/set-state-in-effect
  const open = (i: number, href: string) => { const next = [...new Set([...done, i])]; setDone(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ } router.push(href); };
  return (
    <Panel title="Today's routine" sub={`${done.length} of ${ROUTINE.length} done · opens each step`}>
      <div className="grid gap-3 p-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {ROUTINE.map(([label, href], i) => (
          <button key={label} type="button" onClick={() => open(i, href)} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[12.5px] text-slate-900 hover:border-slate-400">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done.includes(i) ? "bg-[#0294CE] text-white" : "bg-[#dceff9] text-[#026f9b]"}`}>{done.includes(i) ? "✓" : i + 1}</span>{label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function SchoolStatistics() {
  const { user } = usePrincipal(); const router = useRouter();
  const { r, yr, setYr, d } = useTab<Stats>("statistics");
  const first = (user.fullName ?? "").split(/\s+/).slice(-1)[0];
  const open = (d?.waiting_total ?? 0) > 0;
  return (
    <div>
      <Head title="School Statistics" subtitle={`${hello()}${first ? `, ${first}` : ""}. Here's the school today, ${todayText()}.`} action={open ? <button type="button" className={redBtn} onClick={() => router.push("/principal/approvals/approval-centre?tab=admissions")}>Review {d!.waiting_total} approval{d!.waiting_total === 1 ? "" : "s"}</button> : undefined} />
      <Frame name="school-statistics" d={d} yr={yr} setYr={setYr} error={r.error}>
        <Routine />
        {!d ? <Loading /> : (() => {
          const t = d.tiles; const perf = d.class_performance;
          return (
            <>
              <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                <Tile label="Students" value={t.students.total.toLocaleString("en-IN")} sub={t.students.present === null ? undefined : `Present today ${t.students.present.toLocaleString("en-IN")}${t.students.pct === null ? "" : ` · ${t.students.pct}%`}`} bg={BLUE} />
                <Tile label="Staff" value={t.staff.total.toLocaleString("en-IN")} sub={`Present ${t.staff.present} · ${t.staff.on_leave} on leave`} bg={BLUE} />
                {t.fees && <Tile label="Fees collected" value={crore(t.fees.collected)} sub={`${t.fees.pct}% of ${crore(t.fees.annual)}`} bg={GREEN} tone="text-[#065740]" />}
                {t.syllabus && <Tile label="Syllabus completed" value={`${t.syllabus.pct}%`} sub="Of planned periods" bg={AMBER} tone="text-[#8a5a0b]" />}
                {t.admissions && <Tile label="Admissions" value={`${t.admissions.admitted} admitted`} sub={`${t.admissions.in_progress} in progress`} bg={AMBER} tone="text-[#8a5a0b]" />}
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Panel title="Waiting for your decision" sub={`${d.waiting_total} item${d.waiting_total === 1 ? "" : "s"}`}>
                  {d.waiting.length ? <ul>{d.waiting.map((w) => <li key={w.key} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className="grid size-6 place-items-center rounded-lg bg-[#f8ecd6] text-[12px] font-bold text-[#8a5a0b]">{w.count}</span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-slate-900">{w.label}</span><span className="block text-[11.5px] text-slate-500">{w.count} pending</span></span><button type="button" className={pill} onClick={() => router.push(KIND_HREF[w.key] ?? "/principal/approvals/approval-centre?tab=admissions")}>Review</button></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">Nothing is waiting for you.</p>}
                </Panel>
                <Panel title="Attendance today by class" sub="% present" right={t.students.present !== null ? <button type="button" className={pill} onClick={() => router.push("/principal/dashboard/overview?tab=attendance")}>Details</button> : undefined}>
                  <BarRows rows={d.attendance_by_class.filter((c) => c.pct !== null).map((c) => ({ label: c.label, value: c.pct!, max: 100, text: `${c.pct}%` }))} />
                </Panel>
                <Panel title="Class performance" sub={perf.exam ? `${perf.exam}, average %` : undefined} right={perf.rows.length ? <button type="button" className={pill} onClick={() => router.push("/principal/examinations")}>Review</button> : undefined}>
                  <BarRows rows={perf.rows.map((c) => ({ label: c.label, value: c.pct, max: 100, text: `${c.pct}%` }))} />
                </Panel>
                <Panel title="Watch list">
                  {d.watch.length ? <ul>{d.watch.map((w) => <li key={w.key} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold ${WATCH_TONE[w.tone]}`}>{w.mark}</span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-slate-900">{w.title}</span><span className="block text-[11.5px] text-slate-500">{w.note}</span></span><Link href={w.href} className={pill}>View</Link></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">Nothing needs watching today.</p>}
                </Panel>
              </div>
            </>
          );
        })()}
      </Frame>
    </div>
  );
}

// ═════════════ Attendance ═════════════
interface Att { today: string; recorded: boolean; tiles: { present: number; absent: number; late: number; total: number; not_marked: string[] }; by_class: { label: string; pct: number | null }[]; long_absent: { id: string; name: string; class_label: string; days: number; parent: string; mobile: string }[] }
export function AttendanceTab() {
  const { r, yr, setYr, d } = useTab<Att>("attendance");
  const { hasModule } = usePrincipal();
  return (
    <div>
      <Head title="Attendance" subtitle="Student attendance marked today." />
      <Frame name="attendance" d={d} yr={yr} setYr={setYr} error={r.error}>
        {!hasModule("attendance") || d?.off ? <Off what="Attendance" /> : !d ? <Loading /> : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <Tile label="Present" value={d.tiles.present.toLocaleString("en-IN")} sub={d.tiles.total ? `${Math.round((d.tiles.present / d.tiles.total) * 1000) / 10}%` : "Not marked yet"} bg={GREEN} tone="text-[#065740]" />
              <Tile label="Absent" value={d.tiles.absent.toLocaleString("en-IN")} sub={`of ${d.tiles.total.toLocaleString("en-IN")} marked`} bg={RED} tone="text-[#ac2c28]" />
              <Tile label="Late" value={d.tiles.late.toLocaleString("en-IN")} sub="Marked late today" bg={AMBER} tone="text-[#8a5a0b]" />
              <Tile label="Classes not marked" value={d.tiles.not_marked.length} sub={d.tiles.not_marked.slice(0, 4).join(", ") || "All classes marked"} bg={RED} tone="text-[#ac2c28]" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="Present by class" sub="%"><BarRows rows={d.by_class.filter((c) => c.pct !== null).map((c) => ({ label: c.label, value: c.pct!, max: 100, text: `${c.pct}%` }))} /></Panel>
              <Panel title="Absent 3+ days in a row">
                {d.long_absent.length ? <ul>{d.long_absent.map((s) => <li key={s.id} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className="grid size-8 place-items-center rounded-lg bg-[#f8ecd6] text-[11px] font-bold text-[#8a5a0b]">{s.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block text-[13.5px] font-semibold text-[#026f9b]">{s.name}</b><span className="block text-[11.5px] text-slate-500">{s.class_label} · absent {s.days} days</span></span>{s.mobile ? <a href={`tel:${s.mobile}`} className={pill} title={s.parent}>Call parent</a> : <span className="text-[11.5px] text-slate-400">No number</span>}</li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">No student has been absent for three days in a row.</p>}
              </Panel>
            </div>
          </>
        )}
      </Frame>
    </div>
  );
}

// ═════════════ Fees ═════════════
interface Fees { tiles: { annual: number; students: number; collected: number; collected_pct: number; pending: number; owe_now: number; overdue: number; overdue_students: number }; by_mode: { label: string; total: number }[]; by_head: { label: string; total: number }[]; payments: { id: string; receipt_no: string; student: string; class_label: string; fee: string; total: number; mode: string; collected_at: string; paid_on: string; status: string }[] }
const PAY_TONE: Record<string, "good" | "warn" | "bad"> = { Paid: "good", Pending: "warn", Failed: "bad" };
export function FeesTab({ plain = false }: { plain?: boolean }) {
  const { r, yr, setYr, d } = useTab<Fees>("fees");
  const [q, setQ] = useState(""); const [view, setView] = useState<Fees["payments"][number] | null>(null);
  const rows = (d?.payments ?? []).filter((p) => has(p, q));
  const mmax = Math.max(1, ...(d?.by_mode ?? []).map((x) => x.total)); const hmax = Math.max(1, ...(d?.by_head ?? []).map((x) => x.total));
  return (
    <div>
      <Head title={plain ? "Collection" : "Fees"} subtitle={`Fees received for ${year(d?.year?.name) || "this year"}.`} />
      <Frame name="fees" d={d} yr={yr} setYr={setYr} error={r.error} plain={plain}>
        {d?.off ? <Off what="Fees" /> : !d ? <Loading /> : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <Tile label="Annual fees" value={crore(d.tiles.annual)} sub={`${d.tiles.students.toLocaleString("en-IN")} students`} bg={BLUE} />
              <Tile label="Collected" value={crore(d.tiles.collected)} sub={`${d.tiles.collected_pct}%`} bg={GREEN} tone="text-[#065740]" />
              <Tile label="Pending" value={crore(d.tiles.pending)} sub={`${crore(d.tiles.owe_now)} due now`} bg={AMBER} tone="text-[#8a5a0b]" />
              <Tile label="Overdue" value={crore(d.tiles.overdue)} sub={`${d.tiles.overdue_students.toLocaleString("en-IN")} students`} bg={RED} tone="text-[#ac2c28]" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="Collected by mode" sub="This year"><BarRows rows={d.by_mode.map((m) => ({ label: m.label, value: m.total, max: mmax, text: crore(m.total) }))} /></Panel>
              <Panel title="Collection by fee head"><BarRows rows={d.by_head.map((m) => ({ label: m.label, value: m.total, max: hmax, text: crore(m.total) }))} /></Panel>
            </div>
            <div className="mt-5">
              <DataTable title="Fee payments" noun="payments" search={q} onSearch={setQ} exportName="fee-payments" exportHead={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status"]}
                exportRows={rows.map((p) => [p.receipt_no, p.student, p.class_label, p.fee, p.total, p.mode, p.collected_at, p.paid_on, p.status])}
                head={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status", ""]} empty="No payments yet."
                rows={rows.map((p) => [p.receipt_no, <b key="s" className="font-semibold text-[#026f9b]">{p.student}</b>, p.class_label, p.fee, inr(p.total), p.mode, p.collected_at, dmy(p.paid_on), <Chip key="t" tone={PAY_TONE[p.status] ?? "mute"}>{p.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(p)}>View details</button>])} />
            </div>
            <Modal open={!!view} title={view ? `${view.receipt_no} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Student" v={view.student} /><Row k="Class" v={view.class_label || "—"} /><Row k="Fee" v={view.fee || "—"} /><Row k="Amount" v={inr(view.total)} /><Row k="Mode" v={view.mode} /><Row k="Collected at" v={view.collected_at} /><Row k="Date" v={dmy(view.paid_on)} /><Row k="Status" v={view.status} /></dl><div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
          </>
        )}
      </Frame>
    </div>
  );
}

// ═════════════ Admissions ═════════════
interface Adm { tiles: { enquiries: number; applications: number; approved: number; rejected: number; admitted: number }; funnel: { label: string; count: number }[]; applications: { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; applied_on: string; status: string }[] }
const mask = (m: string | null) => { const d = (m ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 5)}• ••${d.slice(8)}` : m || "—"; };
const APP_TONE = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (s === "Rejected" ? "bad" : s === "Returned" || s === "Waitlisted" ? "warn" : /Approved|Allocated|Registered|Fee paid/.test(s) ? "good" : "mute");
export function AdmissionsTab() {
  const { r, yr, setYr, d } = useTab<Adm>("admissions");
  const [q, setQ] = useState(""); const [view, setView] = useState<Adm["applications"][number] | null>(null);
  const rows = (d?.applications ?? []).filter((p) => has(p, q));
  const pc = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const fmax = Math.max(1, ...(d?.funnel ?? []).map((f) => f.count));
  return (
    <div>
      <Head title="Admissions" subtitle="Applications received this year." />
      <Frame name="admissions" d={d} yr={yr} setYr={setYr} error={r.error}>
        {d?.off ? <Off what="Admissions" /> : !d ? <Loading /> : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <Tile label="Enquiries" value={d.tiles.enquiries} sub="This academic year" bg={BLUE} />
              <Tile label="Applications" value={d.tiles.applications} sub={`${pc(d.tiles.applications, d.tiles.enquiries)}% of enquiries`} bg={BLUE} />
              <Tile label="Approved" value={d.tiles.approved} sub={`${pc(d.tiles.approved, d.tiles.applications)}% of applications`} bg={GREEN} tone="text-[#065740]" />
              <Tile label="Rejected" value={d.tiles.rejected} sub={`${pc(d.tiles.rejected, d.tiles.applications)}% of applications`} bg={RED} tone="text-[#ac2c28]" />
              <Tile label="Admitted" value={d.tiles.admitted} sub="Fee paid and class allocated" bg={BLUE} />
            </div>
            <div className="mt-5"><Panel title="Admission funnel" sub={year(d.year?.name)}><BarRows rows={d.funnel.map((f) => ({ label: f.label, value: f.count, max: fmax, text: String(f.count) }))} /></Panel></div>
            <div className="mt-5">
              <DataTable title="Applications" noun="applications" search={q} onSearch={setQ} exportName="applications" exportHead={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]}
                exportRows={rows.map((a) => [a.code, a.child, a.class_sought, a.parent_name, mask(a.mobile), a.source, a.applied_on, a.status])}
                head={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status", ""]} empty="No applications yet."
                rows={rows.map((a) => [a.code, a.child, a.class_sought, a.parent_name, mask(a.mobile), a.source, dmy(a.applied_on), <Chip key="s" tone={APP_TONE(a.status)}>{a.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(a)}>View details</button>])} />
            </div>
            <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Child" v={view.child} /><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={mask(view.mobile)} /><Row k="Source" v={view.source} /><Row k="Applied on" v={dmy(view.applied_on)} /><Row k="Status" v={view.status} /></dl><div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
          </>
        )}
      </Frame>
    </div>
  );
}
