"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has, mask, pct, useRegister } from "./fo-pages";
import type { Items } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { ApplicationList, NewApplication } from "./adm-pages";
import { CLASS_ORDER, Documents, MIN_AGE, StatusBoard, ageOn, appTone, refDate, useApps } from "./adm-pages2";
import type { App } from "./adm-pages2";

const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Note = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{children}</p>;
const countBy = <T,>(rows: T[], key: (r: T) => string): [string, number][] => { const m = new Map<string, number>(); for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;

// ═════════════ Admission documents ═════════════
export type DocsTab = "birth-certificate" | "previous-school-records" | "photos" | "other-documents";
const DOC_BY_TAB: Record<DocsTab, string> = { "birth-certificate": "Birth certificate", "previous-school-records": "Previous school records", photos: "Photos", "other-documents": "Other documents" };
export function AdmissionDocumentPages({ tab }: { tab: DocsTab }) {
  return <Documents type={DOC_BY_TAB[tab]} />;
}

// ═════════════ Class allocation ═════════════
interface Year { id: string; name: string; is_current: boolean }
interface Grade { id: string; name: string }
interface Section { id: string; grade_id: string; academic_year_id: string; name: string }

export type AllocTab = "academic-year" | "class" | "section" | "roll-number";
export function ClassAllocationPages({ tab }: { tab: AllocTab }) {
  const apps = useApps();
  const years = useLoad(() => schoolFetch<{ years: Year[] }>("/school/years"), []);
  const grades = useLoad(() => schoolFetch<{ grades: Grade[] }>("/school/grades"), []);
  const sections = useLoad(() => schoolFetch<{ sections: Section[] }>("/school/sections"), []);
  const act = useAction(apps.reload);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Record<string, { year?: string; grade?: string; section?: string; roll?: string }>>({});
  const Y = years.data?.years ?? [];
  const G = grades.data?.grades ?? [];
  const S = sections.data?.sections ?? [];
  const base = apps.rows.filter((a) => ["Registered", "Allocated"].includes(a.status));
  const rows = base.filter((a) => has(a, search));
  const val = (a: App) => {
    const p = pick[a.id] ?? {};
    const year = p.year ?? Y.find((y) => y.is_current)?.id ?? Y[0]?.id ?? "";
    const grade = p.grade ?? G.find((g) => a.class_sought.startsWith(g.name))?.id ?? G[0]?.id ?? "";
    const secs = S.filter((s) => s.grade_id === grade && s.academic_year_id === year);
    const section = p.section && secs.some((s) => s.id === p.section) ? p.section : secs[0]?.id ?? "";
    return { year, grade, section, secs, roll: p.roll ?? "" };
  };
  const set = (id: string, k: "year" | "grade" | "section" | "roll", v: string) => setPick({ ...pick, [id]: { ...pick[id], [k]: v } });
  const go = async (a: App) => { const v = val(a); await act.run(() => schoolFetch(`/school/front-office/adm-applications/${a.id}/allocate`, json("POST", { academic_year_id: v.year, grade_id: v.grade, section_id: v.section, roll_no: v.roll }))); };
  const title = { "academic-year": "Academic Year", class: "Class", section: "Section", "roll-number": "Roll Number" }[tab];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={apps.error || years.error || grades.error || sections.error || act.error} />
      <ListPanel title={title} noun="students" search={search} onSearch={setSearch} exportName={`class-allocation-${tab}`} head={["Child", "Admission no.", "Class sought", "Stage"]}
        exportRows={rows.map((a) => [a.child, a.admission_no, a.class_sought, a.status])}
        tableHead={["Child", "Academic year", "Class", "Section", "Roll no.", "Stage", ""]} empty={apps.loading ? "Loading…" : "Nobody is waiting for a class yet. Children appear here once they have an admission number."}
        rows={rows.map((a) => {
          const done = a.status === "Allocated";
          const v = val(a);
          return [<b key="c" className="font-semibold text-slate-900">{a.child}</b>,
            <select key="y" aria-label="Academic year" disabled={done} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={v.year} onChange={(e) => set(a.id, "year", e.target.value)}>{Y.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>,
            <select key="g" aria-label="Class" disabled={done} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={v.grade} onChange={(e) => set(a.id, "grade", e.target.value)}>{G.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>,
            <select key="s" aria-label="Section" disabled={done} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={v.section} onChange={(e) => set(a.id, "section", e.target.value)}>{!v.secs.length && <option value="">No section</option>}{v.secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>,
            <input key="r" aria-label="Roll number" disabled={done} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" maxLength={30} value={v.roll} onChange={(e) => set(a.id, "roll", e.target.value)} />,
            <Chip key="st" tone={appTone(a.status)}>{a.status}</Chip>,
            done ? <span key="d" className="text-xs text-slate-500">Student record created</span> : <button key="b" type="button" className={primaryCls} disabled={act.busy || !v.section || !v.roll.trim()} onClick={() => void go(a)}>Allocate + create student</button>];
        })} />
      <Note>Allocating creates the student record, enrolment and the parent as guardian. Parent and student app logins are not created yet.</Note>
    </div>
  );
}

// ═════════════ Auto registration ═════════════
export function AutoRegistrationPage() {
  const apps = useApps();
  const done = apps.rows.filter((a) => a.admission_no);
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={apps.error} />
      <Note><b>Automatic registration is off.</b> Today a person gives each paid application its admission number from Generate Admission Number, then places the child in Class Allocation. Switching it on needs the fee account and logins to be built.</Note>
      <Panel title="Registered so far" sub={`${done.length} students`}>
        <SimpleTable head={[{ h: "Child" }, { h: "Class" }, { h: "Admission no." }, { h: "Stage" }]} empty={apps.loading ? "Loading…" : "Nobody registered yet."} rows={done.map((a) => [<b key="c" className="font-semibold text-slate-900">{a.child}</b>, a.class_sought, a.admission_no, <Chip key="s" tone={appTone(a.status)}>{a.status}</Chip>])} />
      </Panel>
      <Panel title="What registration creates"><ul className="divide-y divide-dashed divide-slate-200 px-5 py-1 text-sm">{["Student record with the details from the application form", "Admission number", "Place in the class and section, with a roll number", "The parent as the student's guardian"].map((t) => <li key={t} className="py-2"><span className="mr-2 text-[#0a7f5b]">✓</span>{t}</li>)}</ul></Panel>
    </div>
  );
}

// ═════════════ Admission communication ═════════════
export type CommTab = "application-confirmation" | "interview-notification" | "admission-confirmation";
export function AdmissionCommunicationPages({ tab }: { tab: CommTab }) {
  const label = { "application-confirmation": "Application confirmation", "interview-notification": "Interview notification", "admission-confirmation": "Admission confirmation" }[tab];
  return (
    <div className="space-y-5" data-report>
      <Tiles items={[{ label: "Admission messages", value: 0, sub: "None recorded" }, { label: "Delivered", value: "—", sub: "—" }]} />
      <Panel title="Admission messages" sub="0 messages"><SimpleTable head={["Ref.", "Type", "Child", "Parent", "Channel", "Sent", "Status"].map((h) => ({ h }))} empty={`No “${label}” messages yet. Admission messages are listed here once sending from the admission steps is connected.`} rows={[]} /></Panel>
    </div>
  );
}

// ═════════════ Admission reports ═════════════
interface AEnq { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; assigned_name: string | null; enquiry_date: string; status: string }

export type ReportsTab = "enquiry-report" | "application-report" | "conversion-report" | "admission-report" | "rejection-report";
export function AdmissionReportPages({ tab }: { tab: ReportsTab }) {
  const enq = useRegister<AEnq>("adm-enquiries");
  const apps = useApps();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<App | null>(null);
  const E = enq.rows;
  const A = apps.rows;
  const ne = (s: string) => E.filter((r) => r.status === s).length;
  const na = (s: string) => A.filter((r) => r.status === s).length;
  const appTable = (list: App[], name: string) => (
    <ListPanel title="Applications" noun="applications" search={search} onSearch={setSearch} exportName={name} head={["Application", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]}
      exportRows={list.filter((r) => has(r, search)).map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.mobile, r.source, day(r.applied_on), r.status])}
      tableHead={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status", ""]} empty={apps.loading ? "Loading…" : "Nothing in this list yet."}
      rows={list.filter((r) => has(r, search)).map((r) => [r.code, r.child, r.class_sought, r.parent_name, mask(r.mobile), r.source, day(r.applied_on), <Chip key="s" tone={appTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
  );
  const sources = [...new Set([...E.map((e) => e.source), ...A.map((a) => a.source)])];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={enq.error || apps.error} />
      {tab === "enquiry-report" && <>
        <Tiles items={[{ label: "Admission enquiries", value: E.length, sub: "All records" }, { label: "New", value: ne("New"), sub: pct(ne("New"), E.length) }, { label: "Follow-up", value: ne("Follow-up"), sub: pct(ne("Follow-up"), E.length) }, { label: "Converted", value: ne("Converted"), sub: pct(ne("Converted"), E.length) }]} />
        <ListPanel title="Admission enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName="admission-enquiry-report" head={["Enquiry no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Counsellor", "Date", "Status"]}
          exportRows={E.filter((r) => has(r, search)).map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.mobile, r.source, r.assigned_name, day(r.enquiry_date), r.status])}
          tableHead={["Enquiry no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Counsellor", "Date", "Status"]} empty={enq.loading ? "Loading…" : "No enquiries yet."}
          rows={E.filter((r) => has(r, search)).map((r) => [r.code, r.child, r.class_sought, r.parent_name, mask(r.mobile), r.source, r.assigned_name ?? "—", day(r.enquiry_date), r.status])} />
      </>}
      {tab === "application-report" && <>
        <Tiles items={[{ label: "Applications", value: A.length, sub: "All records" }, { label: "Allocated", value: na("Allocated"), sub: pct(na("Allocated"), A.length) }, { label: "Under review", value: na("Under review"), sub: pct(na("Under review"), A.length) }, { label: "Approved", value: na("Approved"), sub: pct(na("Approved"), A.length) }]} />
        <Panel title="Class sought" sub="Count by class sought"><BarRows rows={countBy(A, (a) => a.class_sought)} /></Panel>
        {appTable(A, "application-report")}
      </>}
      {tab === "conversion-report" && (() => {
        const funnel: [string, number][] = [["Enquiries", E.length], ["Applications", A.length], ["Approved", A.filter((a) => ["Approved", "Fee paid", "Registered", "Allocated"].includes(a.status)).length], ["Admitted", A.filter((a) => a.admission_no).length]];
        return <>
          <Panel title="Conversion funnel"><BarRows rows={funnel} /></Panel>
          <Panel title="By source" sub={`${sources.length} sources`}>
            <SimpleTable head={["Source", "Enquiries", "Applications", "Admitted", "Conversion"].map((h) => ({ h }))} empty="Nothing recorded yet." rows={sources.map((s) => { const en = E.filter((e) => e.source === s).length; const ap = A.filter((a) => a.source === s).length; const ad = A.filter((a) => a.source === s && a.admission_no).length; return [<b key="s" className="font-semibold text-slate-900">{s}</b>, en, ap, ad, en ? `${Math.round((ad / en) * 100)}%` : "—"]; })} />
          </Panel>
        </>;
      })()}
      {tab === "admission-report" && <>
        <Tiles items={[{ label: "Applications", value: A.filter((a) => a.admission_no).length, sub: "Admission number given" }, { label: "Allocated", value: na("Allocated"), sub: pct(na("Allocated"), A.filter((a) => a.admission_no).length) }, { label: "Registered", value: na("Registered"), sub: pct(na("Registered"), A.filter((a) => a.admission_no).length) }]} />
        {appTable(A.filter((a) => a.admission_no), "admission-report")}
      </>}
      {tab === "rejection-report" && <>
        <Tiles items={[{ label: "Applications", value: na("Rejected"), sub: "Rejected" }]} />
        {appTable(A.filter((a) => a.status === "Rejected"), "rejection-report")}
      </>}
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Source" v={view.source} /><Row k="Applied on" v={day(view.applied_on)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Online application ═════════════
export type OnlineTab = "eligibility-check" | "new-application" | "tracker" | "online-applications" | "programme-rules" | "by-programme";
export function OnlineApplicationPages({ tab }: { tab: OnlineTab }) {
  return tab === "eligibility-check" ? <EligibilityChecker /> : tab === "new-application" ? <NewApplication /> : tab === "tracker" ? <StatusBoard /> : tab === "online-applications" ? <ApplicationList online /> : tab === "programme-rules" ? <Rules /> : <ByProgramme />;
}

const GROUPS: [string, string[]][] = [["Pre-primary", ["Nursery", "LKG", "UKG"]], ["Primary", ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]], ["Middle and secondary", ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"]], ["Senior secondary", ["Class 11", "Class 12"]]];
interface ProgLite { name: string; classes: string; min_age: number; overall_pct: number | null; seats_total: number; assessment: string }
interface Outcome { ok: boolean; cls: string; checks: { pass: boolean; text: string }[] }

export function EligibilityChecker() {
  const [cls, setCls] = useState("Class 1");
  const [dob, setDob] = useState("");
  const [pctIn, setPctIn] = useState("");
  const [out, setOut] = useState<Outcome | null>(null);
  const [err, setErr] = useState("");
  const progs = useLoad(() => schoolFetch<{ items: ProgLite[] }>("/school/front-office/admission/programmes"), []);
  const matrix = useLoad(() => schoolFetch<{ items: { name: string; open: number }[] }>("/school/front-office/admission/seat-matrix"), []);
  const ref = refDate();
  const prog = (progs.data?.items ?? []).find((p) => p.classes.split(",").map((x) => x.trim()).includes(cls));
  const min = prog?.min_age ?? MIN_AGE[CLASS_ORDER.indexOf(cls)];
  const when = `${ref.getDate()} March ${ref.getFullYear()}`;
  const check = (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const a = ageOn(dob, ref);
    if (!a) { setOut(null); setErr("Enter a valid date of birth."); return; }
    const checks: Outcome["checks"] = [];
    const months = a.years * 12 + a.months;
    checks.push(months >= min * 12
      ? { pass: true, text: `Age on ${ref.getDate()} Mar ${ref.getFullYear()}: ${a.years} years ${a.months} months (needs ${min}+)` }
      : { pass: false, text: `Age on ${ref.getDate()} Mar ${ref.getFullYear()} is ${a.years} years ${a.months} months; needs ${min} years (${min * 12 - months} months short)` });
    if (prog?.overall_pct != null) {
      const v = Number(pctIn);
      checks.push(pctIn.trim() === "" || !Number.isFinite(v) ? { pass: false, text: "Enter the last exam overall percentage" } : v >= prog.overall_pct ? { pass: true, text: `Overall ${v}% (needs ${prog.overall_pct}%)` } : { pass: false, text: `Overall ${v}% is below the ${prog.overall_pct}% needed` });
    }
    const open = matrix.data?.items.find((m) => m.name === prog?.name)?.open;
    if (prog && open !== undefined) checks.push({ pass: open > 0, text: `${open} of ${prog.seats_total} seats left` });
    setOut({ ok: checks.every((c) => c.pass), cls, checks });
  };
  const pick = (c: string) => { setCls(c); setOut(null); setErr(""); setPctIn(""); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={progs.error || matrix.error} />
      <Panel title="1. Choose a programme" sub={`Admissions ${ref.getFullYear()}–${String(ref.getFullYear() + 1).slice(2)}`}>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map(([g, list]) => <div key={g}><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{g}</p><div className="space-y-2">{list.map((c) => <button key={c} type="button" onClick={() => pick(c)} className={`block w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${cls === c ? "border-[#0294ce] bg-[#f3f9fd] ring-1 ring-[#0294ce]" : "border-slate-200 bg-white hover:border-slate-400"}`}>{c}<span className="block text-xs font-normal text-slate-500">Age {MIN_AGE[CLASS_ORDER.indexOf(c)]}+ on {when}</span></button>)}</div></div>)}
        </div>
      </Panel>
      <form onSubmit={check} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">2. Check eligibility · {cls}</h2></div>
        <div className="space-y-3 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Date of birth</span><input type="date" required className={inputCls} value={dob} onChange={(e) => { setDob(e.target.value); setOut(null); }} /></label>
            {prog?.overall_pct != null && <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Overall % in the last exam</span><input type="number" min={0} max={100} className={inputCls} value={pctIn} onChange={(e) => { setPctIn(e.target.value); setOut(null); }} /></label>}
          </div>
          <p className="text-xs text-slate-500">Rules: age {min}+ on {when}{prog?.overall_pct != null ? ` · overall ${prog.overall_pct}%` : ""}{prog ? ` · assessment: ${prog.assessment}` : ""}.</p>
          {err && <p role="alert" className="text-sm text-[#ac2c28]">{err}</p>}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`}>Check eligibility</button></div>
      </form>
      {out && (
        <div role="status" className={`rounded-2xl border bg-white ${out.ok ? "border-[#85bfad]" : "border-[#e53a35]"}`}>
          <div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{out.ok ? "Eligible" : "Not eligible"}</h2><span className="text-xs text-slate-500">{out.cls}</span></div>
          <ul className="px-5 py-1 text-[13.5px]">{out.checks.map((c, i) => <li key={i} className="border-b border-dashed border-slate-200 py-2.5"><span className={`mr-2 font-bold ${c.pass ? "text-[#0a7f5b]" : "text-[#e53a35]"}`}>{c.pass ? "✓" : "✗"}</span>{c.text}</li>)}</ul>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><p className="text-sm text-slate-600">{out.ok ? "This child can apply. Open New Application to continue." : "You can still message the admissions office if there is something we should know."}</p>{!out.ok && <a href="/school/admission/admission-enquiry" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400">Message admissions</a>}</div>
        </div>
      )}
    </div>
  );
}

function Rules() {
  const ref = refDate();
  return <Panel title="Programme rules" sub={`Age on ${ref.getDate()} March ${ref.getFullYear()}`}><SimpleTable head={[{ h: "Class" }, { h: "Minimum age" }]} empty="" rows={CLASS_ORDER.map((c, i) => [<b key="c" className="font-semibold text-slate-900">{c}</b>, `${MIN_AGE[i]} years`])} /></Panel>;
}

function ByProgramme() {
  const apps = useApps();
  const online = apps.rows.filter((a) => a.source === "Online");
  const base = online.length ? online : apps.rows;
  return <Panel title="By programme" sub={online.length ? "Online applications" : "All applications"}><BarRows rows={countBy(base, (a) => a.class_sought)} /></Panel>;
}

void useLoad; void ({} as Items<unknown>);
