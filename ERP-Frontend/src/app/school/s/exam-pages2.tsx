"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

const S = "/school";
const EX = "/school/exams";
export const CLASS_OPTIONS: [string, string][] = [["1 – 12", "1 – 12"], ["1 – 10", "1 – 10"], ["6 – 10", "6 – 10"], ["9 – 12", "9 – 12"], ["10, 12", "10, 12"], ["1 – 5", "1 – 5"], ["6 – 8", "6 – 8"], ["", "All classes"]];
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const Bar = ({ children }: { children: ReactNode }) => <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{children}</div>;
const Pill = ({ label, children }: { label: string; children: ReactNode }) => <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label>;
const pillSel = "max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none";
const t12 = (v: string) => { const [h, m] = v.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const stTone = (s: string): "good" | "info" | "warn" | "mute" => (s === "Results published" || s === "Completed" ? "good" : s === "Scheduled" ? "info" : s === "Marks entry" ? "mute" : "mute");

export interface Exam { id: string; name: string; exam_type_id: string | null; type: string; classes: string; starts_on: string; ends_on: string; status: string }
export const useExams = () => useLoad(() => schoolFetch<{ items: Exam[] }>(EX), []);
const classText = (c: string) => (c ? c : "All");

// ═════════════ exam setup ═════════════
export type SetupTab = "create-exam" | "exam-list" | "edit-exam";
const STATUSES = ["Draft", "Scheduled", "Marks entry", "Results published"];

export function ExamSetupPages({ tab }: { tab: SetupTab }) {
  const exams = useExams();
  const types = useLoad(() => schoolFetch<{ items: { id: string; name: string; status: string }[] }>(`${S}/exam-types`), []);
  const act = useAction(() => exams.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Exam | null>(null);
  const [pick, setPick] = useState("");
  const [saved, setSaved] = useState("");
  const blank = { name: "", exam_type_id: "", classes: "1 – 12", starts_on: todayIso(), ends_on: todayIso(), status: "Draft" };
  const [f, setF] = useState<Record<string, string>>(blank);
  const all = exams.data?.items ?? [];
  const tl = (types.data?.items ?? []).filter((t) => t.status === "Active");
  const err = <ErrorBanner message={exams.error || types.error || act.error} />;
  const typeSel = (k: string, d: string) => <select className={inputCls} value={f[k] ?? d} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{!tl.length && <option value="">—</option>}{tl.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  const clsSel = (k: string, d: string) => <select className={inputCls} value={f[k] ?? d} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{CLASS_OPTIONS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>;
  if (tab === "create-exam") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(EX, json("POST", { name: f.name ?? "", exam_type_id: (f.exam_type_id ?? tl[0]?.id) || null, classes: f.classes ?? "1 – 12", starts_on: f.starts_on ?? todayIso(), ends_on: f.ends_on ?? todayIso() })))) { setSaved(`${f.name} created. It is in Exam List.`); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Create Exam" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Exam"><input className={inputCls} required minLength={2} maxLength={100} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Type">{typeSel("exam_type_id", tl[0]?.id ?? "")}</Field>
          <Field label="Classes">{clsSel("classes", "1 – 12")}</Field>
          <Field label="Starts"><input type="date" className={inputCls} required value={f.starts_on ?? todayIso()} onChange={(e) => setF({ ...f, starts_on: e.target.value, ends_on: (f.ends_on ?? todayIso()) < e.target.value ? e.target.value : f.ends_on })} /></Field>
          <Field label="Ends"><input type="date" className={inputCls} required min={f.starts_on} value={f.ends_on ?? todayIso()} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
        </FormCard>
      </div>
    );
  }
  if (tab === "edit-exam") {
    const cur = all.find((x) => x.id === (pick || all[0]?.id));
    const v = (k: keyof Exam, d = "") => f[k] ?? String(cur?.[k] ?? d);
    const submit = async (e: FormEvent) => { e.preventDefault(); if (!cur) return; setSaved(""); if (await act.run(() => schoolFetch(`${EX}/item/${cur.id}`, json("PUT", { name: v("name"), exam_type_id: v("exam_type_id") || null, classes: v("classes"), starts_on: v("starts_on"), ends_on: v("ends_on"), status: v("status") })))) { setF({}); setSaved("Saved"); } };
    return (
      <div>{err}{okBox(saved)}
        <Bar><Pill label="Choose"><select aria-label="Exam" value={cur?.id ?? ""} onChange={(e) => { setPick(e.target.value); setF({}); setSaved(""); }} className={pillSel}>{!all.length && <option value="">No exams</option>}{all.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.type}</option>)}</select></Pill></Bar>
        {cur && <FormCard title={`Edit ${cur.name}`} onSubmit={submit} onDiscard={() => { setF({}); setSaved(""); }} busy={act.busy} error="">
          <Field label="Exam"><input className={inputCls} required minLength={2} maxLength={100} value={v("name")} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Type">{typeSel("exam_type_id", cur.exam_type_id ?? "")}</Field>
          <Field label="Classes"><select className={inputCls} value={v("classes")} onChange={(e) => setF({ ...f, classes: e.target.value })}>{[...CLASS_OPTIONS, ...(CLASS_OPTIONS.some(([x]) => x === cur.classes) ? [] : [[cur.classes, cur.classes] as [string, string]])].map(([x, l]) => <option key={l} value={x}>{l}</option>)}</select></Field>
          <Field label="Starts"><input type="date" className={inputCls} required value={v("starts_on")} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
          <Field label="Ends"><input type="date" className={inputCls} required min={v("starts_on")} value={v("ends_on")} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} value={v("status")} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </FormCard>}
      </div>
    );
  }
  const rows = all.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Exams", value: all.length, sub: "All records" }, { label: "Results published", value: n("Results published"), sub: `${pct(n("Results published"), all.length)} of shown` }, { label: "Scheduled", value: n("Scheduled"), sub: `${pct(n("Scheduled"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }]} />
      <ListPanel title="Exams" noun="exams" search={search} onSearch={setSearch} exportName="exams" head={["Exam", "Type", "Classes", "Starts", "Ends", "Status"]} exportRows={rows.map((x) => [x.name, x.type, classText(x.classes), day(x.starts_on), day(x.ends_on), x.status])}
        tableHead={["Exam", "Type", "Classes", "Starts", "Ends", "Status", ""]} empty={exams.loading ? "Loading…" : "No exams yet."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.type || "—", classText(x.classes), day(x.starts_on), day(x.ends_on), <Chip key="s" tone={stTone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Type" v={view.type || "—"} /><Row k="Classes" v={classText(view.classes)} /><Row k="Starts" v={day(view.starts_on)} /><Row k="Ends" v={day(view.ends_on)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<Link href="/school/examinations/exam-setup?tab=edit-exam" className={small}>Edit</Link>} /></>}</Modal>
    </div>
  );
}

// ═════════════ exam schedule ═════════════
interface Paper { id: string; exam_id: string; exam: string; class_label: string; subject: string; date: string; starts: string; ends: string; hall: string; invigilator: string; status: string }
interface Gen { time: { starts: string; ends: string }; items: { date: string; day: string; subject_id: string; subject: string; main: boolean; prepare: number | null }[]; from: string; to: string }
interface Seating { exam: { id: string; name: string; classes: string }; subjects: { id: string; name: string; date: string; starts: string }[]; paper: { id: string; name: string; date: string; starts: string } | null; students: number; sections: number; capacity: number; unseated: number; rooms: { id: string; name: string; capacity: number; students: number; doors: string[]; invigilators: string[]; benches: { n: number; left: string; right: string }[] }[] }
export type ScheduleTab = "subject-schedule" | "date-sheet" | "hall-allocation" | "generate-date-sheet" | "seating-plan";

export function ExamSchedulePages({ tab }: { tab: ScheduleTab }) {
  const exams = useExams();
  const [exam, setExam] = useState("");
  const examId = exam || exams.data?.items[0]?.id || "";
  const cur = exams.data?.items.find((x) => x.id === examId);
  const papers = useLoad(() => (tab === "subject-schedule" || tab === "hall-allocation" ? schoolFetch<{ items: Paper[] }>(`${EX}/papers`) : Promise.resolve(null)), [tab]);
  const sheet = useLoad(() => (tab === "date-sheet" && examId ? schoolFetch<{ exam: { name: string; classes: string }; time: { starts: string; ends: string } | null; items: { date: string; day: string; subject: string; reporting: string; syllabus: string }[] }>(`${EX}/date-sheet?exam_id=${examId}`) : Promise.resolve(null)), [tab, examId]);
  const [subj, setSubj] = useState("");
  const seat = useLoad(() => (tab === "seating-plan" && examId ? schoolFetch<Seating>(`${EX}/seating?exam_id=${examId}${subj ? `&subject_id=${subj}` : ""}`) : Promise.resolve(null)), [tab, examId, subj]);
  const grades = useLoad(() => (tab === "subject-schedule" ? schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/classes`) : Promise.resolve(null)), [tab]);
  const subjects = useLoad(() => (tab === "subject-schedule" ? schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/subject-rows`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { papers.reload(); sheet.reload(); seat.reload(); exams.reload(); });
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<Paper | null>(null);
  const [adding, setAdding] = useState(false);
  const [chart, setChart] = useState("");
  const [gen, setGen] = useState<Gen | null>(null);
  const [gs, setGs] = useState({ classes: "6 – 8", first_date: todayIso(), gap: "1", time: "09:30-12:30", saturdays: false, skip_events: true });
  const [pf, setPf] = useState({ grade_id: "", subject_id: "", paper_date: todayIso(), starts: "09:30", ends: "12:30", hall: "" });
  const err = <ErrorBanner message={exams.error || papers.error || sheet.error || seat.error || grades.error || subjects.error || act.error} />;
  const examBar = <Bar><Pill label="Exam"><select aria-label="Exam" value={examId} onChange={(e) => { setExam(e.target.value); setSubj(""); setGen(null); setMsg(""); }} className={pillSel}>{!exams.data?.items.length && <option value="">No exams yet</option>}{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill></Bar>;

  if (tab === "subject-schedule" || tab === "hall-allocation") {
    const all = papers.data?.items ?? [];
    const rows = all.filter((p) => has(p, search));
    const n = all.filter((p) => p.status === "Scheduled").length;
    const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${EX}/papers`, json("POST", { exam_id: examId, grade_id: pf.grade_id || grades.data?.items[0]?.id, subject_id: pf.subject_id || subjects.data?.items[0]?.id, paper_date: pf.paper_date, starts: pf.starts, ends: pf.ends, hall: pf.hall })))) setAdding(false); };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Exam schedule", value: all.length, sub: "All records" }, { label: "Scheduled", value: n, sub: `${pct(n, all.length)} of shown` }]} />
        <ListPanel title="Exam schedule" noun="papers" search={search} onSearch={setSearch} exportName={tab} head={["Exam", "Class", "Subject", "Date", "Time", "Hall", "Invigilator", "Status"]} exportRows={rows.map((p) => [p.exam, p.class_label, p.subject, day(p.date), `${p.starts} – ${p.ends}`, p.hall, p.invigilator, p.status])}
          extra={tab === "subject-schedule" ? <button type="button" className={small} disabled={!examId} onClick={() => setAdding(true)}>+ Add paper</button> : null}
          tableHead={["Exam", "Class", "Subject", "Date", "Time", "Hall", "Invigilator", "Status", ""]} empty={papers.loading ? "Loading…" : "No papers scheduled yet. Generate a date sheet or add a paper."}
          rows={rows.map((p) => [p.exam, p.class_label, p.subject, day(p.date), `${p.starts} – ${p.ends}`, p.hall || "—", p.invigilator || "—", <Chip key="s" tone={stTone(p.status)}>{p.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(p)}>View details</button>])} />
        <Modal open={!!view} title={view ? `${view.subject} · ${view.class_label}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Exam" v={view.exam} /><Row k="Date" v={day(view.date)} /><Row k="Time" v={`${view.starts} – ${view.ends}`} /><Row k="Hall" v={view.hall || "—"} /><Row k="Invigilator" v={view.invigilator || "—"} /><Row k="Status" v={view.status} /></dl>
          <Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${EX}/papers/${view.id}`, { method: "DELETE" }))) setView(null); }}>Remove</button>} /></>}</Modal>
        <Modal open={adding} title={`Add a paper to ${cur?.name ?? ""}`} onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field label="Class"><select className={inputCls} value={pf.grade_id || grades.data?.items[0]?.id || ""} onChange={(e) => setPf({ ...pf, grade_id: e.target.value })}>{grades.data?.items.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field><Field label="Subject"><select className={inputCls} value={pf.subject_id || subjects.data?.items[0]?.id || ""} onChange={(e) => setPf({ ...pf, subject_id: e.target.value })}>{subjects.data?.items.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field></div>
          <div className="grid grid-cols-3 gap-3"><Field label="Date"><input type="date" className={inputCls} required value={pf.paper_date} onChange={(e) => setPf({ ...pf, paper_date: e.target.value })} /></Field><Field label="Starts"><input type="time" className={inputCls} required value={pf.starts} onChange={(e) => setPf({ ...pf, starts: e.target.value })} /></Field><Field label="Ends"><input type="time" className={inputCls} required value={pf.ends} onChange={(e) => setPf({ ...pf, ends: e.target.value })} /></Field></div>
          <Field label="Hall"><input className={inputCls} maxLength={100} value={pf.hall} onChange={(e) => setPf({ ...pf, hall: e.target.value })} /></Field><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "date-sheet") {
    const s = sheet.data;
    return (
      <div>{err}{okBox(msg)}{examBar}
        <Panel title={`${s?.exam.name ?? cur?.name ?? ""}${s?.exam.classes ? ` · Classes ${s.exam.classes}` : ""}`} sub={s?.time ? `${t12(s.time.starts)} – ${t12(s.time.ends)}` : undefined} right={<button type="button" className={small} disabled={act.busy || !s?.items.length} onClick={async () => { setMsg(""); let m = ""; if (await act.run(async () => { const r = await schoolFetch<{ sent: number }>(`${EX}/date-sheet/send`, json("POST", { exam_id: examId })); m = `Date sheet sent to ${r.sent} parents.`; })) setMsg(m); }}>Send to parents</button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Subject</th><th className="px-3 py-2.5 font-medium">Reporting time</th><th className="px-3 py-2.5 font-medium">Syllabus</th></tr></thead>
            <tbody>{(s?.items ?? []).map((r) => <tr key={r.date + r.subject} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold text-slate-900">{r.day} {day(r.date).replace(/ \d{4}$/, "")}</td><td className="px-3 py-3">{r.subject}</td><td className="px-3 py-3">{r.reporting ? t12(r.reporting) : "—"}</td><td className="px-3 py-3">{r.syllabus}</td></tr>)}{!s?.items.length && <tr><td colSpan={4} className="p-6 text-center text-slate-400">{sheet.loading ? "Loading…" : "No date sheet published yet. Use Generate Date Sheet."}</td></tr>}</tbody></table></div>
        </Panel>
      </div>
    );
  }
  if (tab === "generate-date-sheet") {
    const body = () => ({ exam_id: examId, classes: gs.classes, first_date: gs.first_date, gap: Number(gs.gap), time: gs.time, saturdays: gs.saturdays, skip_events: gs.skip_events });
    const [a, b] = gs.time.split("-");
    return (
      <div className="space-y-5">{err}{okBox(msg)}
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Date sheet settings</h2></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Exam"><select className={inputCls} value={examId} onChange={(e) => { setExam(e.target.value); setGen(null); }}>{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="Classes"><select className={inputCls} value={gs.classes} onChange={(e) => setGs({ ...gs, classes: e.target.value })}>{CLASS_OPTIONS.map(([v, l]) => <option key={l} value={v}>{v ? `Classes ${l}` : l}</option>)}</select></Field>
            <Field label="First exam on"><input type="date" className={inputCls} value={gs.first_date} onChange={(e) => setGs({ ...gs, first_date: e.target.value })} /></Field>
            <Field label="Days off between papers"><select className={inputCls} value={gs.gap} onChange={(e) => setGs({ ...gs, gap: e.target.value })}>{[0, 1, 2, 3].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Field label="Time"><select className={inputCls} value={gs.time} onChange={(e) => setGs({ ...gs, time: e.target.value })}><option value="09:30-12:30">9:30 am – 12:30 pm</option><option value="09:30-11:30">9:30 am – 11:30 am</option><option value="10:00-13:00">10:00 am – 1:00 pm</option></select></Field>
            <label className="flex items-center gap-2 text-[13px] text-slate-800"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={gs.saturdays} onChange={(e) => setGs({ ...gs, saturdays: e.target.checked })} />Exams on Saturdays</label>
            <label className="flex items-center gap-2 text-[13px] text-slate-800 sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={gs.skip_events} onChange={(e) => setGs({ ...gs, skip_events: e.target.checked })} />Skip holidays and events in the school calendar</label>
          </div>
          <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !examId} onClick={async () => { setMsg(""); let g: Gen | null = null; if (await act.run(async () => { g = await schoolFetch<Gen>(`${EX}/date-sheet/generate`, json("POST", body())); })) setGen(g); }}>Generate date sheet</button></div></div>
        {gen && <Panel title={`${cur?.name ?? ""} · ${gs.classes ? `Classes ${gs.classes}` : "All classes"}`} sub={`${t12(a)} – ${t12(b)} · ${gen.items.length} papers · ${day(gen.from)} to ${day(gen.to)}`} right={<button type="button" className={`${btnPrimary} !px-3.5 !py-1 text-[12px]`} disabled={act.busy} onClick={async () => { setMsg(""); let m = ""; if (await act.run(async () => { const r = await schoolFetch<{ papers: number }>(`${EX}/date-sheet/publish`, json("POST", body())); m = `Date sheet published: ${r.papers} papers are now in the exam schedule.`; })) { setMsg(m); setGen(null); } }}>Publish date sheet</button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Day</th><th className="px-3 py-2.5 font-medium">Subject</th><th className="px-3 py-2.5 font-medium">Days to prepare</th></tr></thead>
            <tbody>{gen.items.map((r) => <tr key={r.date} className="border-t border-slate-100"><td className="px-5 py-3">{day(r.date)}</td><td className="px-3 py-3">{r.day}</td><td className="px-3 py-3"><b>{r.subject}</b>{r.main && <span className="text-slate-500"> · main subject</span>}</td><td className="px-3 py-3">{r.prepare === null ? "—" : `${r.prepare} day${r.prepare === 1 ? "" : "s"}`}</td></tr>)}</tbody></table></div></Panel>}
      </div>
    );
  }
  // seating plan
  const sp = seat.data;
  const room = sp?.rooms.find((r) => r.id === chart) ?? sp?.rooms[0];
  const printCharts = () => {
    if (!sp) return;
    const e = escapeHtml;
    const body = sp.rooms.map((r) => `<section><h2>${e(r.name)} · ${r.students} students</h2><p>Invigilator: ${e(r.invigilators.join(", ") || "—")}</p><p>${r.doors.map(e).join(" &middot; ")}</p><table>${r.benches.map((b) => `<tr><td>Bench ${b.n}</td><td>${e(b.left)}</td><td>${e(b.right)}</td></tr>`).join("")}</table></section>`).join("");
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${e(sp.exam.name)} seating</title><style>body{font:12px Arial,sans-serif;color:#111}section{page-break-after:always}h2{color:#026f9b}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:4px 8px}</style></head><body><h1>${e(sp.exam.name)} · ${e(sp.paper?.name ?? "")}</h1>${body}</body></html>`);
  };
  return (
    <div className="space-y-5" data-report>{err}{examBar}
      <div className="flex items-start justify-between gap-4"><p className="max-w-2xl text-[13px] text-slate-600">Every bench has two students from different sections, so no one sits next to a classmate. Invigilators don&apos;t supervise their own subject.</p><button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 hover:border-slate-400" disabled={!sp?.rooms.length} onClick={printCharts}>Print room charts and door lists</button></div>
      <div className="flex flex-wrap gap-2">{(sp?.subjects ?? []).map((x) => <button key={x.id} type="button" onClick={() => setSubj(x.id)} className={`rounded-full px-3.5 py-1.5 text-[13px] ${sp?.paper?.id === x.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{x.name}</button>)}</div>
      <Tiles items={[{ label: "Students", value: sp?.students ?? 0, sub: `${sp?.sections ?? 0} sections` }, { label: "Rooms", value: sp?.rooms.length ?? 0, sub: `${sp?.capacity ?? 0} seats available` }, { label: "Paper", value: sp?.paper?.name ?? "—", sub: sp?.paper ? `${day(sp.paper.date)} · ${t12(sp.paper.starts)}` : "Publish a date sheet first" }, { label: "Unseated", value: sp?.unseated ?? 0, sub: sp?.unseated ? "Add rooms in Room Management" : "Everyone has a seat" }]} />
      <Panel title="Rooms" sub={`${sp?.rooms.length ?? 0} rooms`}>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Room</th><th className="px-3 py-2.5 font-medium">Students</th><th className="px-3 py-2.5 font-medium">Door list</th><th className="px-3 py-2.5 font-medium">Invigilator</th><th /></tr></thead>
          <tbody>{(sp?.rooms ?? []).map((r) => <tr key={r.id} className={`border-t border-slate-100 ${room?.id === r.id ? "bg-[#f3f9fd]" : ""}`}><td className="px-5 py-3 font-semibold">{r.name}</td><td className="px-3 py-3">{r.students}</td><td className="px-3 py-3">{r.doors.map((d) => <p key={d}>{d}</p>)}</td><td className="px-3 py-3">{r.invigilators.join(", ") || "—"}</td><td className="px-3 py-3 text-right">{room?.id === r.id ? <span className="rounded-full border border-slate-300 px-3 py-1 text-xs">Showing</span> : <button type="button" className={primaryCls} onClick={() => setChart(r.id)}>Seat chart</button>}</td></tr>)}{!sp?.rooms.length && <tr><td colSpan={5} className="p-6 text-center text-slate-400">{seat.loading ? "Loading…" : "Add rooms in Timetable › Room Management and publish a date sheet."}</td></tr>}</tbody></table></div>
      </Panel>
      {room && <Panel title={`${room.name} · seat chart`} sub={`Front of the room is at the top · ${room.students} students`}>
        <div className="p-4"><div className="mb-3 rounded-lg border border-dashed border-slate-300 py-1.5 text-center text-[12px] text-slate-500">Board and invigilator&apos;s desk</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>{room.benches.map((b) => <div key={b.n} className="rounded-xl border border-slate-200 p-2"><p className="text-[11px] text-slate-500">Bench {b.n}</p><div className="mt-1 grid grid-cols-2 gap-1.5"><span className="rounded bg-slate-100 py-1 text-center text-[12px]">{b.left}</span><span className="rounded bg-slate-100 py-1 text-center text-[12px]">{b.right}</span></div></div>)}</div></div>
      </Panel>}
    </div>
  );
}

// ═════════════ registration ═════════════
interface Elig { min: number; exam: string; items: { student_id: string; name: string; class_label: string; registration_no: string; attendance: number | null; eligible: boolean | null }[] }
interface Ticket { school: string; exam: string; items: { student_id: string; name: string; class_label: string; roll_no: string; hall: string; papers: { date: string; subject: string; starts: string; ends: string }[] }[] }
export type RegTab = "student-eligibility" | "hall-tickets";

export function ExamRegistrationPages({ tab }: { tab: RegTab }) {
  const exams = useExams();
  const [exam, setExam] = useState("");
  const examId = exam || exams.data?.items.find((x) => x.status !== "Draft")?.id || exams.data?.items[0]?.id || "";
  const el = useLoad(() => (examId ? schoolFetch<Elig>(`${EX}/eligibility?exam_id=${examId}`) : Promise.resolve(null)), [examId]);
  const [pick, setPick] = useState("");
  const sid = pick || el.data?.items[0]?.student_id || "";
  const tk = useLoad(() => (tab === "hall-tickets" && examId && sid ? schoolFetch<Ticket>(`${EX}/hall-tickets?exam_id=${examId}&student_id=${sid}`) : Promise.resolve(null)), [tab, examId, sid]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Elig["items"][number] | null>(null);
  const err = <ErrorBanner message={exams.error || el.error || tk.error} />;
  const examBar = <Pill label="Exam"><select aria-label="Exam" value={examId} onChange={(e) => { setExam(e.target.value); setPick(""); }} className={pillSel}>{!exams.data?.items.length && <option value="">No exams yet</option>}{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill>;
  if (tab === "student-eligibility") {
    const rows = (el.data?.items ?? []).filter((r) => has(r, search));
    return (
      <div data-report>{err}<Bar>{examBar}<span className="text-[13px] text-slate-600">Students need {el.data?.min ?? 75}% attendance to sit the exams.</span></Bar>
        <ListPanel title="Eligibility" noun="students" search={search} onSearch={setSearch} exportName="eligibility" head={["Student", "Class", "Attendance", "Fee status", "Eligible"]} exportRows={rows.map((r) => [r.name, r.class_label, r.attendance != null ? `${r.attendance}%` : "", "", r.eligible === null ? "No attendance yet" : r.eligible ? "Eligible" : "Not eligible"])}
          tableHead={["Student", "Class", "Attendance", "Fee status", "Eligible", ""]} empty={el.loading ? "Loading…" : "No students in this exam's classes."}
          rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label, <span key="a" className={r.eligible === false ? "text-[#c0392b]" : ""}>{r.attendance != null ? `${r.attendance}%` : "—"}</span>, "—", r.eligible === null ? <Chip key="e" tone="mute">No attendance yet</Chip> : <Chip key="e" tone={r.eligible ? "good" : "bad"}>{r.eligible ? "Eligible" : "Not eligible"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
        <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Admission no." v={view.registration_no} /><Row k="Class" v={view.class_label} /><Row k="Attendance" v={view.attendance != null ? `${view.attendance}%` : "Not marked yet"} /><Row k="Fee status" v="Not tracked yet" /><Row k="Eligible" v={view.eligible === null ? "—" : view.eligible ? "Yes" : `No, below ${el.data?.min}%`} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  const t = tk.data?.items[0];
  const printAll = async () => {
    const all = await schoolFetch<Ticket>(`${EX}/hall-tickets?exam_id=${examId}`);
    const e = escapeHtml;
    const cards = all.items.map((x) => `<div class="c"><h1>${e(all.school)}</h1><p class="s">${e(all.exam)} · Hall ticket</p><table class="i"><tr><td>Student</td><td>${e(x.name)}</td></tr><tr><td>Class</td><td>${e(x.class_label)}</td></tr><tr><td>Roll no.</td><td>${e(x.roll_no)}</td></tr><tr><td>Exam hall</td><td>${e(x.hall)}</td></tr></table><table class="p"><tr><th>Date</th><th>Subject</th><th>Time</th></tr>${x.papers.map((p) => `<tr><td>${e(day(p.date))}</td><td>${e(p.subject)}</td><td>${e(p.starts)} – ${e(p.ends)}</td></tr>`).join("")}</table><div class="f"><span>Class teacher</span><span>Principal</span></div></div>`).join("");
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Hall tickets</title><style>body{font:12px Arial,sans-serif;color:#111}.c{border:1px solid #888;padding:18px;margin:0 0 14px;page-break-inside:avoid}h1{text-align:center;font-size:16px;margin:0}.s{text-align:center;color:#555;border-bottom:1px solid #444;padding-bottom:6px}table{width:100%;border-collapse:collapse}.i td{padding:3px 0}.i td:first-child{color:#666;width:90px}.p th,.p td{padding:4px 8px;text-align:left;border-bottom:1px solid #ddd}.p th{background:#eef5fa}.f{display:flex;justify-content:space-between;margin-top:28px;color:#555}.f span{border-top:1px solid #999;padding-top:3px;min-width:110px;text-align:center}</style></head><body>${cards}</body></html>`);
  };
  return (
    <div>{err}
      <Bar>{examBar}<Pill label="Student"><select aria-label="Student" value={sid} onChange={(e) => setPick(e.target.value)} className={pillSel}>{!el.data?.items.length && <option value="">No students</option>}{el.data?.items.map((r) => <option key={r.student_id} value={r.student_id}>{r.name} · {r.class_label}</option>)}</select></Pill><Chip tone="good">Active</Chip><Link href="/school/students" className={`${small} ml-auto`}>Open full profile</Link></Bar>
      <Panel title="Hall ticket" sub={t?.name} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!examId} onClick={() => void printAll()}>Print all</button>}>
        {t ? <div className="p-5"><div className="mx-auto max-w-[520px] rounded-xl border border-slate-300 p-6 text-[13px]"><p className="text-center text-[16px] font-bold text-slate-900">{tk.data?.school}</p><p className="border-b border-slate-500 pb-2 text-center text-[11px] text-slate-500">{tk.data?.exam} · Hall ticket</p>
          <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1.5"><dt className="text-slate-500">Student</dt><dd>{t.name}</dd><dt className="text-slate-500">Class</dt><dd>{t.class_label}</dd><dt className="text-slate-500">Roll no.</dt><dd>{t.roll_no || "—"}</dd><dt className="text-[#026f9b]">Exam hall</dt><dd>{t.hall}</dd></dl>
          <table className="mt-4 w-full"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-2 py-1.5 font-medium">Date</th><th className="px-2 py-1.5 font-medium">Subject</th><th className="px-2 py-1.5 font-medium">Time</th></tr></thead><tbody>{t.papers.map((p) => <tr key={p.date + p.subject} className="border-t border-slate-100"><td className="px-2 py-1.5">{day(p.date).replace(/ \d{4}$/, "")}</td><td className="px-2 py-1.5">{p.subject}</td><td className="px-2 py-1.5">{p.starts} – {p.ends}</td></tr>)}{!t.papers.length && <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">No papers scheduled yet.</td></tr>}</tbody></table>
          <div className="mt-8 flex justify-between text-[11px] text-slate-500"><span className="border-t border-slate-400 pt-1">Class teacher</span><span className="border-t border-slate-400 px-6 pt-1">Principal</span></div></div></div>
          : <p className="p-8 text-center text-sm text-slate-400">{tk.loading || el.loading ? "Loading…" : "No student selected."}</p>}
      </Panel>
    </div>
  );
}
