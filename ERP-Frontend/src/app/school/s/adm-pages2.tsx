"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, hm, mask, pct, todayIso, useRegister } from "./fo-pages";
import type { Items } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useGoTab } from "./tab-context";
import { AutoRegistrationPage } from "./adm-pages3";

const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const rejectCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const Foot = ({ left, close }: { left?: React.ReactNode; close: () => void }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const Note = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{children}</p>;

export interface App { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; details: Record<string, string>; applied_on: string; status: string; level: number; level_since: string; admission_no: string | null }
export const useApps = () => useRegister<App>("adm-applications");
export const appTone = (s: string): "good" | "warn" | "bad" | "mute" | "info" => (["Allocated", "Approved", "Registered", "Fee paid"].includes(s) ? "good" : s === "Under review" ? "warn" : s === "Rejected" ? "bad" : s === "Waitlisted" ? "info" : "mute");

// ═════════════ Application processing ═════════════
export type ProcessingTab = "document-verification" | "eligibility-check" | "application-status";
export function ProcessingPages({ tab }: { tab: ProcessingTab }) {
  return tab === "document-verification" ? <Documents /> : tab === "eligibility-check" ? <Eligibility /> : <StatusBoard />;
}

interface Doc { id: string; application_id: string; doc_type: string; file_name: string | null; status: "Pending review" | "Verified" | "Returned"; created_at: string; app: { code: string; child: string } | null }
const DOC_TYPES = ["Birth certificate", "Previous school records", "Photos", "Other documents"];

export function Documents({ type }: { type?: string } = {}) {
  const docs = useRegister<Doc>("adm-documents");
  const { loading, error, reload } = docs;
  const all = type ? docs.rows.filter((d) => d.doc_type === type) : docs.rows;
  const apps = useApps();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Doc | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ application_id: "", doc_type: DOC_TYPES[0], file_name: "" });
  const rows = all.filter((r) => has(r, search));
  const pending = all.filter((r) => r.status === "Pending review").length;
  const set = async (d: Doc, status: Doc["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-documents/${d.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/adm-documents", json("POST", f)))) setAdding(false); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || apps.error || act.error} />
      <Tiles items={[{ label: "Admission documents", value: all.length, sub: "All records" }, { label: "Pending review", value: pending, sub: pct(pending, all.length) }]} />
      <ListPanel title="Admission documents" noun="documents" search={search} onSearch={setSearch} exportName="admission-documents" head={["Application", "Child", "Document", "File", "Uploaded", "Status"]}
        extra={<button type="button" className={small} onClick={() => { setF({ application_id: apps.rows[0]?.id ?? "", doc_type: DOC_TYPES[0], file_name: "" }); setAdding(true); }}>+ Add document</button>}
        exportRows={rows.map((r) => [r.app?.code, r.app?.child, r.doc_type, r.file_name, day(r.created_at), r.status])}
        tableHead={["Application no.", "Child", "Document", "File", "Uploaded", "Status", ""]} empty={loading ? "Loading…" : "No documents yet."}
        rows={rows.map((r) => [r.app?.code ?? "—", <b key="c" className="font-semibold text-slate-900">{r.app?.child}</b>, r.doc_type, r.file_name ?? "—", day(r.created_at), <Chip key="s" tone={r.status === "Verified" ? "good" : r.status === "Returned" ? "mute" : "warn"}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{r.status === "Pending review" && <><button type="button" className={rejectCls} disabled={act.busy} onClick={() => void set(r, "Returned")}>Return</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Verified")}>Verify</button></>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.doc_type} · ${view.app?.child ?? ""}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Application" v={view.app?.code ?? "—"} /><Row k="Document" v={view.doc_type} /><Row k="File" v={view.file_name ?? "—"} /><Row k="Uploaded" v={day(view.created_at)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={adding} title="Add a document" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Application"><select className={inputCls} required value={f.application_id} onChange={(e) => setF({ ...f, application_id: e.target.value })}>{apps.rows.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.child}</option>)}</select></Field>
          <Field label="Document"><select className={inputCls} value={f.doc_type} onChange={(e) => setF({ ...f, doc_type: e.target.value })}>{DOC_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="File name (note only, uploading is not available yet)"><input className={inputCls} maxLength={150} value={f.file_name} onChange={(e) => setF({ ...f, file_name: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

export const CLASS_ORDER = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const classIndex = (c: string) => CLASS_ORDER.findIndex((x) => c === x || c.startsWith(x + " "));
export const MIN_AGE = [3, 4, 5, ...Array.from({ length: 12 }, (_, i) => 6 + i)];
export function refDate() { const d = new Date(); return new Date(d.getMonth() >= 5 ? d.getFullYear() + 1 : d.getFullYear(), 2, 31); }
export function ageOn(dob: string, ref: Date): { years: number; months: number } | null {
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  let m = (ref.getFullYear() - b.getFullYear()) * 12 + (ref.getMonth() - b.getMonth());
  if (ref.getDate() < b.getDate()) m--;
  return m < 0 ? null : { years: Math.floor(m / 12), months: m % 12 };
}
function eligible(a: App) {
  const age = a.details?.dob ? ageOn(a.details.dob, refDate()) : null;
  const idx = classIndex(a.class_sought);
  const result = !age || idx < 0 ? "No date of birth" : age.years >= MIN_AGE[idx] ? "Eligible" : "Not eligible";
  return { age, result, min: idx < 0 ? null : MIN_AGE[idx] };
}

function Eligibility() {
  const { rows, loading, error } = useApps();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<App | null>(null);
  const ref = refDate();
  const list = rows.filter((r) => has(r, search));
  const when = `${ref.getDate()} March ${ref.getFullYear()}`;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Note>Rule: a child must be at least 6 on {when} for Class 1, and one year older for each class after that. Nursery from 3, LKG from 4, UKG from 5.</Note>
      <ListPanel title="Eligibility" noun="applications" search={search} onSearch={setSearch} exportName="eligibility" head={["Application", "Child", "Class sought", `Age on ${ref.getDate()} Mar`, "Result"]}
        exportRows={list.map((r) => { const e = eligible(r); return [r.code, r.child, r.class_sought, e.age ? `${e.age.years} yrs ${e.age.months} m` : "—", e.result]; })}
        tableHead={["Application", "Child", "Class sought", `Age on ${ref.getDate()} Mar`, "Result", ""]} empty={loading ? "Loading…" : "No applications yet."}
        rows={list.map((r) => { const e = eligible(r); return [r.code, <b key="c" className="font-semibold text-slate-900">{r.child}</b>, r.class_sought, e.age ? `${e.age.years} yrs ${e.age.months} m` : "—", <Chip key="s" tone={e.result === "Eligible" ? "good" : e.result === "Not eligible" ? "bad" : "mute"}>{e.result}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>]; })} />
      <Modal open={!!view} title={view?.child ?? ""} onClose={() => setView(null)}>{view && (() => { const e = eligible(view); return <><dl><Row k="Class sought" v={view.class_sought} /><Row k="Date of birth" v={view.details?.dob ? day(view.details.dob) : "—"} /><Row k={`Age on ${when}`} v={e.age ? `${e.age.years} yrs ${e.age.months} m` : "—"} /><Row k="Minimum age" v={e.min === null ? "—" : `${e.min} years`} /><Row k="Result" v={e.result} /></dl><Foot close={() => setView(null)} /></>; })()}</Modal>
    </div>
  );
}

/** Where an application is in the 10-step flow, worked out from its status. */
function stageOf(a: App): number {
  if (a.status === "Allocated") return 10;
  if (a.status === "Registered") return 9;
  if (a.status === "Fee paid") return 8;
  if (["Approved", "Waitlisted", "Rejected"].includes(a.status)) return 7;
  if (a.status === "Returned") return 4;
  return 5;
}
const STAGES = ["Enquiry", "Follow-up", "Application form", "Documents", "Review", "Test / interview", "Approval", "Admission fee", "Registration", "Class + logins"];

export function StatusBoard() {
  const { rows, loading, error, reload } = useApps();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<App | null>(null);
  const list = rows.filter((r) => has(r, search));
  const dots = (a: App) => { const s = stageOf(a); return <span className="flex gap-1">{Array.from({ length: 10 }, (_, i) => <i key={i} className={`h-2 w-3.5 rounded ${i + 1 < s || (i + 1 === s && s === 10) ? "bg-[#41afda]" : i + 1 === s ? (a.status === "Returned" ? "bg-[#e3a54a]" : "bg-[#e3a54a]") : "bg-slate-200"}`} />)}</span>; };
  const correct = async (a: App) => { await act.run(() => schoolFetch(`/school/front-office/adm-applications/${a.id}/advance`, json("POST", { action: "correct" }))); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <ol className="flex flex-wrap gap-1.5">{STAGES.map((s, i) => <li key={s} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-1 pr-2.5 text-xs"><b className="grid size-[18px] place-items-center rounded-full bg-[#dceff9] text-[11px] text-[#026f9b]">{i + 1}</b>{s}</li>)}</ol>
      <ListPanel title="Applications" noun="applications" search={search} onSearch={setSearch} exportName="application-status" head={["Application", "Child", "Class", "Parent", "Stage", "Step"]}
        exportRows={list.map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.status, STAGES[stageOf(r) - 1]])}
        tableHead={["Application", "Child", "Stage", "Progress", ""]} empty={loading ? "Loading…" : "No applications yet."}
        rows={list.map((r) => [r.code, <div key="c"><p className="font-semibold text-slate-900">{r.child}</p><p className="text-xs text-slate-400">{r.class_sought} · {r.parent_name}</p></div>, <Chip key="s" tone={appTone(r.status)}>{r.status}</Chip>, dots(r),
          <span key="a" className="flex items-center gap-1.5">{r.status === "Returned" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void correct(r)}>Mark corrected</button>}{r.status === "Allocated" && <span className="text-xs text-slate-500">Admitted</span>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Status" v={view.status} /><Row k="Step" v={`${stageOf(view)} · ${STAGES[stageOf(view) - 1]}`} /><Row k="Admission no." v={view.admission_no ?? "—"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Entrance examination ═════════════
interface Test { id: string; name: string; subjects: string; max_marks: number; test_date: string; test_time: string | null; venue: string | null; status: "Draft" | "Scheduled" | "Completed" }
const tTone = (s: Test["status"]): "info" | "good" | "mute" => (s === "Scheduled" ? "info" : s === "Completed" ? "good" : "mute");

export type ExamTab = "exam-setup" | "exam-schedule" | "marks-entry" | "results";
export function EntrancePages({ tab }: { tab: ExamTab }) {
  return tab === "marks-entry" || tab === "results" ? <Marks readOnly={tab === "results"} /> : <TestList tab={tab} />;
}

function TestList({ tab }: { tab: ExamTab }) {
  const { rows: all, loading, error, reload } = useRegister<Test>("adm-tests");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Test | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { name: "", subjects: "English, Maths", max_marks: "50", test_date: todayIso(), test_time: "10:00", venue: "", status: "Scheduled" };
  const [f, setF] = useState(blank);
  const rows = all.filter((r) => has(r, search));
  const n = (s: Test["status"]) => all.filter((r) => r.status === s).length;
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/adm-tests", json("POST", { ...f, max_marks: Number(f.max_marks) })))) setAdding(false); };
  const set = async (t: Test, status: Test["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-tests/${t.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Entrance tests", value: all.length, sub: "All records" }, { label: "Scheduled", value: n("Scheduled"), sub: pct(n("Scheduled"), all.length) }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), all.length) }, { label: "Draft", value: n("Draft"), sub: pct(n("Draft"), all.length) }]} />
      <ListPanel title="Entrance tests" noun="tests" search={search} onSearch={setSearch} exportName={tab} head={["Test", "Subjects", "Max marks", "Date", "Time", "Venue", "Status"]}
        extra={tab === "exam-setup" ? <button type="button" className={small} onClick={() => { setF(blank); setAdding(true); }}>+ New test</button> : null}
        exportRows={rows.map((r) => [r.name, r.subjects, r.max_marks, day(r.test_date), hm(r.test_time), r.venue, r.status])}
        tableHead={["Test", "Subjects", "Max marks", "Date", "Time", "Venue", "Status", ""]} empty={loading ? "Loading…" : "No entrance tests yet."}
        rows={rows.map((r) => [r.name, r.subjects, r.max_marks, day(r.test_date), hm(r.test_time), r.venue ?? "—", <Chip key="s" tone={tTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Subjects" v={view.subjects} /><Row k="Max marks" v={view.max_marks} /><Row k="Date" v={day(view.test_date)} /><Row k="Time" v={hm(view.test_time)} /><Row k="Venue" v={view.venue ?? "—"} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{view.status === "Draft" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Scheduled")}>Schedule</button>}{view.status === "Scheduled" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Completed")}>Mark completed</button>}</>} /></>}</Modal>
      <Modal open={adding} title="New entrance test" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Test"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Subjects"><input className={inputCls} required maxLength={200} value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} /></Field>
          <Field label="Max marks"><input type="number" min={1} max={1000} className={inputCls} value={f.max_marks} onChange={(e) => setF({ ...f, max_marks: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} required value={f.test_date} onChange={(e) => setF({ ...f, test_date: e.target.value })} /></Field>
          <Field label="Time"><input type="time" className={inputCls} value={f.test_time} onChange={(e) => setF({ ...f, test_time: e.target.value })} /></Field>
          <Field label="Venue"><input className={inputCls} maxLength={80} value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Draft</option><option>Scheduled</option><option>Completed</option></select></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

interface MarkSheet { test: { id: string; name: string; max_marks: number; subject_list: string[] }; rows: { id: string; code: string; child: string; class_sought: string; marks: Record<string, number> }[] }

function Marks({ readOnly }: { readOnly: boolean }) {
  const tests = useRegister<Test>("adm-tests");
  const [pick, setPick] = useState("");
  const testId = pick || tests.rows[0]?.id || "";
  const sheet = useLoad(() => (testId ? schoolFetch<MarkSheet>(`/school/front-office/adm-tests/${testId}/marks`) : Promise.resolve(null)), [testId]);
  const act = useAction(sheet.reload);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { setDraft({}); setSaved(false); }, [testId]);
  const s = sheet.data;
  const per = s && s.test.subject_list.length ? s.test.max_marks / s.test.subject_list.length : 0;
  const val = (id: string, sub: string, base: number | undefined) => draft[id]?.[sub] ?? (base === undefined ? "" : String(base));
  const total = (id: string, base: Record<string, number>) => (s?.test.subject_list ?? []).reduce((t, sub) => t + (Number(val(id, sub, base[sub])) || 0), 0);
  const pass = (t: number) => (s ? t >= s.test.max_marks * 0.4 : false);
  const save = async () => {
    if (!s) return;
    const rows = Object.entries(draft).map(([application_id, m]) => ({ application_id, marks: Object.fromEntries(Object.entries(m).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])) }));
    if (await act.run(() => schoolFetch(`/school/front-office/adm-tests/${s.test.id}/marks`, json("PUT", { rows })))) { setDraft({}); setSaved(true); }
  };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={tests.error || sheet.error || act.error} />
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Test
          <select aria-label="Test" value={testId} onChange={(e) => setPick(e.target.value)} className="max-w-[20rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!tests.rows.length && <option value="">No tests yet</option>}{tests.rows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </label>
      </div>
      <Panel title="Entrance test marks" sub={`${s?.rows.length ?? 0} applicants`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{["Application", "Child", "Class", ...(s?.test.subject_list ?? []).map((x) => `${x} (${per})`), "Total", "Result"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!s?.rows.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{sheet.loading ? "Loading…" : "No applicants for this test."}</td></tr>}
              {s?.rows.map((r) => { const t = total(r.id, r.marks); const entered = (s.test.subject_list.some((x) => val(r.id, x, r.marks[x]) !== "")); return (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.code}</td><td className="px-4 py-3 font-semibold text-slate-900">{r.child}</td><td className="px-4 py-3">{r.class_sought}</td>
                  {s.test.subject_list.map((sub) => <td key={sub} className="px-4 py-3">{readOnly ? (r.marks[sub] ?? "—") : <input type="number" min={0} max={per} aria-label={`${sub} for ${r.child}`} className="w-20 rounded border border-slate-300 px-2 py-1" value={val(r.id, sub, r.marks[sub])} onChange={(e) => { setSaved(false); setDraft({ ...draft, [r.id]: { ...draft[r.id], [sub]: e.target.value } }); }} />}</td>)}
                  <td className="px-4 py-3 font-bold text-slate-900">{entered ? t : "—"}</td>
                  <td className="px-4 py-3">{entered ? <Chip tone={pass(t) ? "good" : "bad"}>{pass(t) ? "Pass" : "Fail"}</Chip> : <Chip tone="mute">Not entered</Chip>}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        {!readOnly && <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<span className="mr-auto text-xs text-slate-500">Pass mark is 40%. Results update as you type.</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(draft).length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save marks"}</button></div>}
      </Panel>
    </div>
  );
}

// ═════════════ Interview management ═════════════
interface Interview { id: string; application_id: string; panel_name: string; interview_date: string; interview_time: string | null; status: "Scheduled" | "Completed" | "Rescheduled"; app: { code: string; child: string; class_sought: string; parent_name: string } | null }
interface Panel { id: string; name: string; for_classes: string; members: string; status: "Active" | "Inactive" }
const ivTone = (s: Interview["status"]): "info" | "good" | "mute" => (s === "Scheduled" ? "info" : s === "Completed" ? "good" : "mute");

export type InterviewTab = "interview-schedule" | "interview-panel" | "interview-results";
export function InterviewPages({ tab }: { tab: InterviewTab }) {
  return tab === "interview-panel" ? <Panels /> : <Interviews resultsOnly={tab === "interview-results"} />;
}

function Interviews({ resultsOnly }: { resultsOnly: boolean }) {
  const { rows: all, loading, error, reload } = useRegister<Interview>("adm-interviews");
  const apps = useApps();
  const panels = useRegister<Panel>("adm-panels");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Interview | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ application_id: "", panel_name: "", interview_date: todayIso(), interview_time: "10:00" });
  const base = resultsOnly ? all.filter((r) => r.status === "Completed") : all;
  const rows = base.filter((r) => has(r, search));
  const n = (s: Interview["status"]) => base.filter((r) => r.status === s).length;
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/adm-interviews", json("POST", f)))) setAdding(false); };
  const set = async (i: Interview, status: Interview["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-interviews/${i.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={resultsOnly ? [{ label: "Interviews", value: base.length, sub: "All records" }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), base.length) }] : [{ label: "Interviews", value: base.length, sub: "All records" }, { label: "Scheduled", value: n("Scheduled"), sub: pct(n("Scheduled"), base.length) }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), base.length) }, { label: "Rescheduled", value: n("Rescheduled"), sub: pct(n("Rescheduled"), base.length) }]} />
      <ListPanel title="Interviews" noun="interviews" search={search} onSearch={setSearch} exportName={resultsOnly ? "interview-results" : "interviews"} head={["Application", "Child", "Class", "Parent", "Panel", "Date", "Time", "Status"]}
        extra={resultsOnly ? null : <button type="button" className={small} onClick={() => { setF({ application_id: apps.rows[0]?.id ?? "", panel_name: panels.rows[0]?.name ?? "", interview_date: todayIso(), interview_time: "10:00" }); setAdding(true); }}>+ Schedule interview</button>}
        exportRows={rows.map((r) => [r.app?.code, r.app?.child, r.app?.class_sought, r.app?.parent_name, r.panel_name, day(r.interview_date), hm(r.interview_time), r.status])}
        tableHead={["Application no.", "Child", "Class", "Parent", "Panel", "Date", "Time", "Status", ""]} empty={loading ? "Loading…" : "No interviews yet."}
        rows={rows.map((r) => [r.app?.code ?? "—", <b key="c" className="font-semibold text-[#026f9b]">{r.app?.child}</b>, r.app?.class_sought ?? "—", r.app?.parent_name ?? "—", r.panel_name, day(r.interview_date), hm(r.interview_time), <Chip key="s" tone={ivTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.app?.child ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Application" v={view.app?.code ?? "—"} /><Row k="Panel" v={view.panel_name} /><Row k="Date" v={day(view.interview_date)} /><Row k="Time" v={hm(view.interview_time)} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={view.status !== "Completed" && <><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Completed")}>Mark completed</button><button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Rescheduled")}>Reschedule</button></>} /></>}</Modal>
      <Modal open={adding} title="Schedule an interview" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Application"><select className={inputCls} required value={f.application_id} onChange={(e) => setF({ ...f, application_id: e.target.value })}>{apps.rows.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.child}</option>)}</select></Field></div>
          <div className="sm:col-span-2"><Field label="Panel"><input className={inputCls} required list="panel-names" maxLength={120} value={f.panel_name} onChange={(e) => setF({ ...f, panel_name: e.target.value })} /><datalist id="panel-names">{panels.rows.map((p) => <option key={p.id} value={p.name} />)}</datalist></Field></div>
          <Field label="Date"><input type="date" className={inputCls} required value={f.interview_date} onChange={(e) => setF({ ...f, interview_date: e.target.value })} /></Field>
          <Field label="Time"><input type="time" className={inputCls} value={f.interview_time} onChange={(e) => setF({ ...f, interview_time: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

function Panels() {
  const { rows: all, loading, error, reload } = useRegister<Panel>("adm-panels");
  const ivs = useRegister<Interview>("adm-interviews");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Panel | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", for_classes: "", members: "" });
  const rows = all.filter((r) => has(r, search));
  const month = new Date().toISOString().slice(0, 7);
  const count = (p: Panel) => ivs.rows.filter((i) => i.panel_name === p.name && i.interview_date.startsWith(month)).length;
  const active = all.filter((p) => p.status === "Active").length;
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/adm-panels", json("POST", f)))) { setAdding(false); setF({ name: "", for_classes: "", members: "" }); } };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Interview panels", value: all.length, sub: "All records" }, { label: "Active", value: active, sub: pct(active, all.length) }]} />
      <ListPanel title="Interview panels" noun="panels" search={search} onSearch={setSearch} exportName="interview-panels" head={["Panel", "For classes", "Members", "Interviews this month", "Status"]}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New panel</button>}
        exportRows={rows.map((r) => [r.name, r.for_classes, r.members, count(r), r.status])}
        tableHead={["Panel", "For classes", "Members", "Interviews this month", "Status", ""]} empty={loading ? "Loading…" : "No panels yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.for_classes, r.members, <span key="c" className="block text-right text-[#026f9b]">{count(r)}</span>, <Chip key="s" tone={r.status === "Active" ? "good" : "mute"}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="For classes" v={view.for_classes} /><Row k="Members" v={view.members} /><Row k="This month" v={count(view)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`/school/front-office/adm-panels/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" })))) setView(null); }}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal>
      <Modal open={adding} title="New interview panel" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Panel"><input className={inputCls} required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="For classes"><input className={inputCls} required maxLength={80} placeholder="Nursery – UKG" value={f.for_classes} onChange={(e) => setF({ ...f, for_classes: e.target.value })} /></Field>
          <Field label="Members"><input className={inputCls} required maxLength={200} placeholder="Names, separated by commas" value={f.members} onChange={(e) => setF({ ...f, members: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Admission approval ═════════════
interface Level { level: number; role: string; person: string; hours: number; escalate_to: string }
const useLevels = () => useLoad(() => schoolFetch<Items<Level>>("/school/front-office/admission/levels"), []);

export type ApprovalTab = "approval-chain" | "approved" | "rejected" | "waitlisted" | "approval-levels";
export function ApprovalPages({ tab }: { tab: ApprovalTab }) {
  return tab === "approval-chain" ? <Chain /> : tab === "approval-levels" ? <Levels /> : <ByStatus status={tab === "approved" ? "Approved" : tab === "rejected" ? "Rejected" : "Waitlisted"} />;
}

const waited = (a: App) => (Date.now() - new Date(a.level_since).getTime()) / 3_600_000;
function Chain() {
  const { rows, loading, error, reload } = useApps();
  const levels = useLevels();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const L = levels.data?.items ?? [];
  const open = rows.filter((r) => r.status === "Under review");
  const list = open.filter((r) => has(r, search));
  const limit = (a: App) => L.find((x) => x.level === a.level)?.hours ?? 48;
  const over = (a: App) => waited(a) > limit(a);
  const doIt = (a: App, action: string) => act.run(() => schoolFetch(`/school/front-office/adm-applications/${a.id}/advance`, json("POST", { action })));
  const tiles = [1, 2, 3].map((n) => { const at = open.filter((r) => r.level === n); return { label: `Level ${n} · ${L.find((x) => x.level === n)?.role ?? ""}`, value: at.length, sub: <span className={at.some(over) ? "text-[#ac2c28]" : ""}>{at.filter(over).length} overdue</span> }; });
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || levels.error || act.error} />
      <Tiles items={[...tiles, { label: "Done today", value: rows.filter((r) => ["Approved", "Returned", "Rejected", "Waitlisted"].includes(r.status) && r.level_since.slice(0, 10) === todayIso()).length, sub: "approved or sent back" }]} />
      <ListPanel title="Approval chain" noun="applications" search={search} onSearch={setSearch} exportName="approval-chain" head={["Application", "Child", "Class", "With", "Waiting (h)", "Status"]}
        exportRows={list.map((r) => [r.code, r.child, r.class_sought, L.find((x) => x.level === r.level)?.role, Math.round(waited(r)), over(r) ? "Overdue" : "On time"])}
        tableHead={["Application", "Child", "Class", "With", "Waiting", "Status", ""]} empty={loading ? "Loading…" : "Nothing is waiting for approval."}
        rows={list.map((r) => { const l = L.find((x) => x.level === r.level); return [r.code, <b key="c" className="font-semibold text-slate-900">{r.child}</b>, r.class_sought, <div key="w"><p>{l?.role}</p><p className="text-xs text-slate-400">{l?.person}</p></div>,
          <span key="h" className={over(r) ? "text-[#ac2c28]" : ""}>{Math.round(waited(r))} h</span>, over(r) ? <Chip key="s" tone="bad">Overdue · escalated to {l?.escalate_to}</Chip> : <Chip key="s" tone="info">With {l?.role.toLowerCase()}</Chip>,
          <span key="a" className="flex gap-1.5"><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void doIt(r, "approve")}>{r.level >= 3 ? "Approve and offer" : "Approve"}</button><button type="button" className={small} disabled={act.busy} onClick={() => void doIt(r, "send-back")}>Send back</button><button type="button" className={small} disabled={act.busy} onClick={() => void doIt(r, "waitlist")}>Waitlist</button><button type="button" className={rejectCls} disabled={act.busy} onClick={() => window.confirm(`Reject ${r.child}'s application?`) && void doIt(r, "reject")}>Reject</button></span>]; })} />
    </div>
  );
}

function ByStatus({ status }: { status: "Approved" | "Rejected" | "Waitlisted" }) {
  const { rows: all, loading, error } = useApps();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<App | null>(null);
  const base = all.filter((r) => r.status === status);
  const rows = base.filter((r) => has(r, search));
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Applications", value: base.length, sub: "All records" }, { label: status, value: base.length, sub: pct(base.length, base.length) }]} />
      <ListPanel title="Applications" noun="applications" search={search} onSearch={setSearch} exportName={status.toLowerCase()} head={["Application", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]}
        exportRows={rows.map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.mobile, r.source, day(r.applied_on), r.status])}
        tableHead={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status", ""]} empty={loading ? "Loading…" : `No ${status.toLowerCase()} applications.`}
        rows={rows.map((r) => [r.code, r.child, r.class_sought, r.parent_name, mask(r.mobile), r.source, day(r.applied_on), <Chip key="s" tone={appTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Source" v={view.source} /><Row k="Applied on" v={day(view.applied_on)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

function Levels() {
  const { data, error, loading } = useLevels();
  const L = data?.items ?? [];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Panel title="Approval levels" sub={`Admissions ${new Date().getFullYear() + 1}–${String(new Date().getFullYear() + 2).slice(2)}`}>
        <SimpleTable head={[{ h: "Level" }, { h: "Role" }, { h: "Person" }, { h: "Time limit" }, { h: "If overdue, escalate to" }]} empty={loading ? "Loading…" : "No levels."} rows={L.map((l) => [<b key="l" className="font-semibold text-slate-900">Level {l.level}</b>, l.role, l.person, `${l.hours} hours`, l.escalate_to])} />
      </Panel>
      <Note>Alerts go to the person by app and email when an application reaches them, again at 75% of the time limit, and to the escalation contact when it&apos;s overdue. Management-quota seats always need Level 3.</Note>
    </div>
  );
}

// ═════════════ Admission fee ═════════════
interface FeeSetup { rows: { class_group: string; admission_fee: number; caution: number; form_fee: number }[]; pay_within_days: number; online_payment: boolean }
interface Payment { id: string; code: string; admission_fee: number; caution: number; mode: string; paid_on: string; status: string; app: { code: string; child: string; class_sought: string } | null }

export type FeeTab = "admission-fee-setup" | "fee-collection" | "payment-status";
export function AdmissionFeePages({ tab }: { tab: FeeTab }) {
  return tab === "admission-fee-setup" ? <FeeSetupPage /> : <Payments tab={tab} />;
}

function FeeSetupPage() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<FeeSetup>("/school/front-office/admission/fee-setup"), []);
  const act = useAction(reload);
  const [rows, setRows] = useState<{ class_group: string; admission_fee: string; caution: string; form_fee: string }[]>([]);
  const [days, setDays] = useState(7);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(false);
  const fresh = (d: FeeSetup) => { setRows(d.rows.map((r) => ({ ...r, admission_fee: String(r.admission_fee), caution: String(r.caution), form_fee: String(r.form_fee) }))); setDays(d.pay_within_days); setOnline(d.online_payment); };
  useEffect(() => { if (data) fresh(data); }, [data]);
  const edit = (i: number, k: "admission_fee" | "caution" | "form_fee", v: string) => { setSaved(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r))); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/admission/fee-setup", json("PUT", { rows: rows.map((r) => ({ class_group: r.class_group, admission_fee: Number(r.admission_fee) || 0, caution: Number(r.caution) || 0, form_fee: Number(r.form_fee) || 0 })), pay_within_days: days, online_payment: online })))) setSaved(true); };
  const money = (i: number, k: "admission_fee" | "caution" | "form_fee") => <input type="number" min={0} aria-label={`${rows[i].class_group} ${k}`} className="w-28 rounded border border-slate-300 bg-slate-50 px-2 py-1" value={rows[i][k]} onChange={(e) => edit(i, k, e.target.value)} />;
  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Admission fee setup</h2></div>
      {(error || act.error) && <div className="px-5 pt-4"><ErrorBanner message={error || act.error} /></div>}
      <SimpleTable head={[{ h: "Class group" }, { h: "Admission fee" }, { h: "Caution deposit (refundable)" }, { h: "Application form" }]} empty={loading ? "Loading…" : "No fee setup."} rows={rows.map((r, i) => [<b key="g" className="font-semibold text-slate-900">{r.class_group}</b>, money(i, "admission_fee"), money(i, "caution"), money(i, "form_fee")])} />
      <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Pay within</p><p className="text-xs text-slate-500">After approval</p></div>
        <select aria-label="Pay within" className={`${inputCls} !w-auto`} value={days} onChange={(e) => { setDays(Number(e.target.value)); setSaved(false); }}>{[3, 7, 10, 15, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></div>
      <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Offer online payment</p><p className="text-xs text-slate-500">Razorpay link sent with the approval</p></div><Toggle checked={online} onChange={(v) => { setOnline(v); setSaved(false); }} label="Offer online payment" /></div>
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { if (data) fresh(data); setSaved(false); }}>Discard</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !data}>{act.busy ? "Saving…" : "Save"}</button></div>
    </form>
  );
}

function Payments({ tab }: { tab: FeeTab }) {
  const { rows: all, loading, error, reload } = useRegister<Payment>("adm-fee-payments");
  const apps = useApps();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Payment | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ application_id: "", mode: "UPI" });
  const due = apps.rows.filter((a) => a.status === "Approved");
  const rows = all.filter((r) => has(r, search));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/admission/fee-collect", json("POST", f)))) { setAdding(false); apps.reload(); } };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || apps.error || act.error} />
      <Tiles items={[{ label: "Admission fees", value: all.length, sub: "All records" }, { label: "Paid", value: all.length, sub: pct(all.length, all.length) }]} />
      <ListPanel title="Admission fees" noun="payments" search={search} onSearch={setSearch} exportName={tab} head={["Receipt", "Child", "Class", "Admission fee", "Caution deposit", "Paid by", "Date", "Status"]}
        extra={tab === "fee-collection" ? <button type="button" className={small} onClick={() => { setF({ application_id: due[0]?.id ?? "", mode: "UPI" }); setAdding(true); }}>+ Collect fee</button> : null}
        exportRows={rows.map((r) => [r.code, r.app?.child, r.app?.class_sought, r.admission_fee, r.caution, r.mode, day(r.paid_on), r.status])}
        tableHead={["Receipt", "Child", "Class", "Admission fee", "Caution deposit", "Paid by", "Date", "Status", ""]} empty={loading ? "Loading…" : "No admission fees collected yet."}
        rows={rows.map((r) => [r.code, r.app?.child ?? "—", r.app?.class_sought ?? "—", inr(r.admission_fee), inr(r.caution), r.mode, day(r.paid_on), <Chip key="s" tone="good">{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.app?.child ?? ""}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Application" v={view.app?.code ?? "—"} /><Row k="Admission fee" v={inr(view.admission_fee)} /><Row k="Caution deposit" v={inr(view.caution)} /><Row k="Paid by" v={view.mode} /><Row k="Date" v={day(view.paid_on)} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={adding} title="Collect admission fee" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          {!due.length && <Note>No approved application is waiting for its admission fee.</Note>}
          <Field label="Approved application"><select className={inputCls} required value={f.application_id} onChange={(e) => setF({ ...f, application_id: e.target.value })}>{due.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.child} · {a.class_sought}</option>)}</select></Field>
          <Field label="Paid by"><select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{["UPI", "Card", "Cash", "Cheque", "Net banking"].map((m) => <option key={m}>{m}</option>)}</select></Field>
          <p className="text-xs text-slate-500">The amounts come from Admission Fee Setup.</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy || !f.application_id}>Collect</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Student registration ═════════════
export type RegistrationTab = "generate-admission-number" | "student-id" | "registration" | "auto-registration";
export function RegistrationPages({ tab }: { tab: RegistrationTab }) {
  const { rows: all, loading, error, reload } = useApps();
  const act = useAction(reload);
  const go = useGoTab();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<App | null>(null);
  void go;
  if (tab === "auto-registration") return <AutoRegistrationPage />;
  const base = tab === "generate-admission-number" ? all.filter((r) => ["Approved", "Fee paid", "Registered", "Allocated"].includes(r.status)) : tab === "student-id" ? all.filter((r) => r.admission_no) : all.filter((r) => r.status === "Registered" || r.status === "Allocated");
  const rows = base.filter((r) => has(r, search));
  const gen = (a: App) => act.run(() => schoolFetch(`/school/front-office/adm-applications/${a.id}/admission-number`, json("POST", {})));
  const n = (s: string) => base.filter((r) => r.status === s).length;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      {tab === "registration" && <Tiles items={[{ label: "Applications", value: base.length, sub: "All records" }, { label: "Allocated", value: n("Allocated"), sub: pct(n("Allocated"), base.length) }, { label: "Registered", value: n("Registered"), sub: pct(n("Registered"), base.length) }]} />}
      <ListPanel title={tab === "generate-admission-number" ? "Approved applications" : tab === "student-id" ? "Student IDs" : "Applications"} noun="applications" search={search} onSearch={setSearch} exportName={tab} head={["Application", "Child", "Class", "Stage", "Admission no."]}
        exportRows={rows.map((r) => [r.code, r.child, r.class_sought, r.status, r.admission_no])}
        tableHead={["Application", "Child", "Class", "Stage", "Admission no.", ""]} empty={loading ? "Loading…" : "Nothing here yet."}
        rows={rows.map((r) => [r.code, <b key="c" className="font-semibold text-slate-900">{r.child}</b>, r.class_sought, <Chip key="s" tone={appTone(r.status)}>{r.status}</Chip>, r.admission_no ?? "Not yet",
          <span key="a" className="flex gap-1.5">{tab === "generate-admission-number" && r.status === "Fee paid" && !r.admission_no && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void gen(r)}>Generate number</button>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Stage" v={view.status} /><Row k="Admission no." v={view.admission_no ?? "Not yet"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}
