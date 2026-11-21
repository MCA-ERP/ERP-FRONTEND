"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, useStaff } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { useExams } from "./exam-pages2";
import { useRoster } from "./student-pages2";
import { parseCsv } from "./student-pages";

const S = "/school";
const EX = "/school/exams";
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Bar = ({ children }: { children: ReactNode }) => <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{children}</div>;
const Pill = ({ label, children }: { label: string; children: ReactNode }) => <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label>;
const pillSel = "cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none";

// ═════════════ question bank ═════════════
interface Q { id: string; code: string; class_label: string; subject: string; chapter: string; qtype: string; marks: number; difficulty: string; source: string; added_by: string; status: "Draft" | "Under review" | "Approved" }
export type QTab = "question-bank" | "paper-creation" | "upload";
const QTYPES = ["MCQ", "Short answer", "Long answer", "Case-based"];
const NEXT: Record<string, [string, "Draft" | "Under review" | "Approved"]> = { Draft: ["Send for review", "Under review"], "Under review": ["Approve", "Approved"] };

export function QuestionPages({ tab }: { tab: QTab }) {
  const bank = useLoad(() => schoolFetch<{ items: Q[] }>(`${EX}/questions`), []);
  const grades = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/classes`), []);
  const subjects = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/subject-rows`), []);
  const chapters = useLoad(() => schoolFetch<{ items: { class_label: string; subject: string; chapter: string }[] }>(`${S}/curriculum`), []);
  const staff = useStaff();
  const act = useAction(() => bank.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Q | null>(null);
  const [saved, setSaved] = useState("");
  const blank = { grade_id: "", subject_id: "", chapter: "", qtype: "MCQ", marks: "1", difficulty: "Easy", added_by: "" };
  const [f, setF] = useState(blank);
  const all = bank.data?.items ?? [];
  const gl = grades.data?.items ?? [];
  const sl = subjects.data?.items ?? [];
  const err = <ErrorBanner message={bank.error || grades.error || subjects.error || staff.error || act.error} />;
  if (tab !== "question-bank") {
    const gid = f.grade_id || gl[0]?.id || "";
    const sid = f.subject_id || sl[0]?.id || "";
    const gname = gl.find((g) => g.id === gid)?.name; const sname = sl.find((s) => s.id === sid)?.name;
    const chs = [...new Set((chapters.data?.items ?? []).filter((c) => c.class_label === gname && c.subject === sname).map((c) => c.chapter))];
    const title = tab === "paper-creation" ? "Paper Creation" : "Upload";
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${EX}/questions`, json("POST", { grade_id: gid, subject_id: sid, chapter: f.chapter, qtype: f.qtype, marks: Number(f.marks), difficulty: f.difficulty, added_by: f.added_by || staff.data?.items[0]?.id || null, source: tab === "upload" ? "Uploaded" : "Created" })))) { setSaved(`Question added. It is in Question Bank.`); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title={title} onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Class"><select className={inputCls} value={gid} onChange={(e) => setF({ ...f, grade_id: e.target.value, chapter: "" })}>{gl.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Subject"><select className={inputCls} value={sid} onChange={(e) => setF({ ...f, subject_id: e.target.value, chapter: "" })}>{sl.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Chapter"><input className={inputCls} list="chapters" maxLength={200} placeholder={chs.length ? "Choose or type" : "Type the chapter"} value={f.chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })} /><datalist id="chapters">{chs.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Type"><select className={inputCls} value={f.qtype} onChange={(e) => setF({ ...f, qtype: e.target.value })}>{QTYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Marks"><select className={inputCls} value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Difficulty"><select className={inputCls} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>{["Easy", "Medium", "Hard"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Added by"><select className={inputCls} value={f.added_by || staff.data?.items[0]?.id || ""} onChange={(e) => setF({ ...f, added_by: e.target.value })}>{(staff.data?.items ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        </FormCard>
      </div>
    );
  }
  const rows = all.filter((q) => has(q, search));
  const n = (s: string) => all.filter((q) => q.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Question bank", value: all.length, sub: "All records" }, { label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }, { label: "Under review", value: n("Under review"), sub: `${pct(n("Under review"), all.length)} of shown` }]} />
      <ListPanel title="Question bank" noun="questions" search={search} onSearch={setSearch} exportName="question-bank" head={["Q. no.", "Class", "Subject", "Chapter", "Type", "Marks", "Difficulty", "Added by", "Status"]} exportRows={rows.map((q) => [q.code, q.class_label, q.subject, q.chapter, q.qtype, q.marks, q.difficulty, q.added_by, q.status])}
        tableHead={["Q. no.", "Class", "Subject", "Chapter", "Type", "Marks", "Difficulty", "Added by", "Status", ""]} empty={bank.loading ? "Loading…" : "No questions yet."}
        rows={rows.map((q) => [q.code, q.class_label, q.subject, q.chapter || "—", q.qtype, <span key="m" className="block text-right">{q.marks}</span>, q.difficulty, q.added_by || "—", <Chip key="s" tone={q.status === "Approved" ? "good" : q.status === "Under review" ? "warn" : "mute"}>{q.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(q)}>View details</button>])} />
      <Modal open={!!view} title={view?.code ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Chapter" v={view.chapter || "—"} /><Row k="Type" v={view.qtype} /><Row k="Marks" v={view.marks} /><Row k="Difficulty" v={view.difficulty} /><Row k="Added by" v={view.added_by || "—"} /><Row k="Source" v={view.source} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={NEXT[view.status] ? <button type="button" className={primaryCls} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${EX}/questions/${view.id}`, json("PATCH", { status: NEXT[view.status][1] })))) setView(null); }}>{NEXT[view.status][0]}</button> : undefined} /></>}</Modal>
    </div>
  );
}

// ═════════════ marks entry ═════════════
interface MSheet { exam: string; max: number; bands: { min: number; grade: string }[]; status: string; open: boolean; closes: string; students: { id: string; name: string; roll_no: string; marks: number | null; absent: boolean }[] }
export type MarksTab = "subject-wise-marks" | "bulk-entry" | "practical-marks" | "internal-assessment" | "co-scholastic-grades";
const COMP: Record<string, string> = { "subject-wise-marks": "Theory", "practical-marks": "Practical", "internal-assessment": "Internal" };
const gradeOf = (bands: MSheet["bands"], p: number) => bands.find((b) => p >= b.min)?.grade ?? "";

export function MarksEntryPages({ tab }: { tab: MarksTab }) {
  if (tab === "bulk-entry") return <BulkEntry />;
  if (tab === "co-scholastic-grades") return <Coscholastic />;
  return <MarksSheet component={COMP[tab]} />;
}

function MarksSheet({ component }: { component: string }) {
  const exams = useExams();
  const secs = useLoad(() => schoolFetch<{ items: { id: string; label: string }[] }>(`${S}/section-rows`), []);
  const subs = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/subject-rows`), []);
  const [exam, setExam] = useState(""); const [sec, setSec] = useState(""); const [sub, setSub] = useState("");
  const eid = exam || exams.data?.items[0]?.id || ""; const sid = sec || secs.data?.items[0]?.id || ""; const bid = sub || subs.data?.items[0]?.id || "";
  const sheet = useLoad(() => (eid && sid && bid ? schoolFetch<MSheet>(`${EX}/marks?exam_id=${eid}&section_id=${sid}&subject_id=${bid}&component=${component}`) : Promise.resolve(null)), [eid, sid, bid, component]);
  const act = useAction(() => sheet.reload());
  const [d, setD] = useState<Record<string, { marks?: string; absent?: boolean }>>({});
  const [msg, setMsg] = useState("");
  const sh = sheet.data;
  const val = (s: MSheet["students"][number]) => ({ marks: d[s.id]?.marks ?? (s.marks === null ? "" : String(s.marks)), absent: d[s.id]?.absent ?? s.absent });
  const patch = (id: string, p: { marks?: string; absent?: boolean }) => { setD((o) => ({ ...o, [id]: { ...o[id], ...p } })); setMsg(""); };
  const reset = () => { setD({}); setMsg(""); };
  const send = async (submit: boolean) => { if (!sh) return; setMsg(""); if (await act.run(() => schoolFetch(`${EX}/marks`, json("PUT", { exam_id: eid, section_id: sid, subject_id: bid, component, submit, marks: sh.students.map((s) => { const v = val(s); return { student_id: s.id, marks: v.absent || v.marks === "" ? null : Number(v.marks), absent: v.absent }; }) })))) { setD({}); setMsg(submit ? "Submitted for verification." : "Draft saved."); } };
  const secL = secs.data?.items.find((x) => x.id === sid)?.label ?? ""; const subL = subs.data?.items.find((x) => x.id === bid)?.name ?? "";
  const locked = sh ? !sh.open : false;
  return (
    <div><ErrorBanner message={exams.error || secs.error || subs.error || sheet.error || act.error} />{okBox(msg)}
      <Bar>
        <Pill label="Exam"><select aria-label="Exam" value={eid} onChange={(e) => { setExam(e.target.value); reset(); }} className={pillSel}>{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill>
        <Pill label="Section"><select aria-label="Section" value={sid} onChange={(e) => { setSec(e.target.value); reset(); }} className={pillSel}>{secs.data?.items.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Pill>
        <Pill label="Subject"><select aria-label="Subject" value={bid} onChange={(e) => { setSub(e.target.value); reset(); }} className={pillSel}>{subs.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill>
      </Bar>
      <Panel title={`${subL} · ${secL}`} sub={sh ? `Out of ${sh.max}${sh.status !== "New" ? ` · ${sh.status}` : ""}` : undefined}>
        {locked && sh && <p className="border-b border-slate-100 bg-amber-50 px-5 py-2 text-[13px] text-amber-800">{sh.status === "Verified" ? "These marks are verified and locked." : `The marks entry window closed on ${sh.closes}.`}</p>}
        <SimpleTable head={["Roll", "Student", "Marks", "%", "Grade", "Absent"].map((h) => ({ h }))} empty={sheet.loading ? "Loading…" : "No students in this section."}
          rows={(sh?.students ?? []).map((s) => { const v = val(s); const p = v.marks === "" || v.absent ? null : Math.round((Number(v.marks) / sh!.max) * 100); const bad = v.marks !== "" && (Number(v.marks) > sh!.max || Number(v.marks) < 0); return [s.roll_no || "—", <b key="n" className="font-semibold text-slate-900">{s.name}</b>,
            <input key="m" type="number" min={0} max={sh!.max} step="0.5" aria-label={`${s.name} marks`} disabled={v.absent || locked} className={`w-20 rounded border px-2 py-1 text-[13px] ${bad ? "border-[#e5413a]" : "border-slate-300"}`} value={v.absent ? "" : v.marks} onChange={(e) => patch(s.id, { marks: e.target.value })} />, p === null ? "—" : `${p}%`, p === null || bad ? "—" : <Chip key="g" tone="info">{gradeOf(sh!.bands, p) || "—"}</Chip>,
            <input key="a" type="checkbox" aria-label={`${s.name} absent`} disabled={locked} className="h-4 w-4 accent-[#026f9b]" checked={v.absent} onChange={(e) => patch(s.id, { absent: e.target.checked })} />]; })} />
        <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || locked} onClick={() => void send(false)}>Save draft</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || locked || !sh?.students.length} onClick={() => void send(true)}>Submit for verification</button></div>
      </Panel>
    </div>
  );
}

// ── bulk entry ──
const COLS = ["Admission no.", "Student", "Subject", "Exam", "Marks", "Max"];
interface Line { row: number; adm: string; student: string; subject: string; exam: string; marks: string; max: string; problem: string }
function BulkEntry() {
  const roster = useRoster();
  const exams = useExams();
  const subs = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/subject-rows`), []);
  const act = useAction(() => undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [fileError, setFileError] = useState("");
  const [msg, setMsg] = useState("");
  const kids = new Map((roster.data?.items ?? []).map((r) => [r.registration_no.toLowerCase(), r]));
  const check = (c: string[], row: number): Line => {
    const [adm = "", student = "", subject = "", exam = "", marks = "", max = ""] = c.map((x) => x.trim());
    const p: string[] = [];
    const k = kids.get(adm.toLowerCase());
    if (!k) p.push("admission no.");
    if (!subs.data?.items.some((s) => s.name.toLowerCase() === subject.toLowerCase())) p.push("subject");
    if (!exams.data?.items.some((x) => x.name.toLowerCase() === exam.toLowerCase())) p.push("exam");
    if (marks === "" || isNaN(Number(marks))) p.push("marks");
    return { row, adm, student: k?.name ?? student, subject, exam, marks, max, problem: p.join(", ") };
  };
  const onFile = async (f: File | undefined) => { setMsg(""); setFileError(""); if (!f) return; if (f.size > 500_000) { setFileError("Keep the file under 500 KB."); return; } const rows = parseCsv(await f.text()); if (rows.length < 2) { setFileError("The file has no rows."); return; } setLines(rows.slice(1, 1001).map((r, i) => check(r, i + 2))); };
  const valid = lines.filter((l) => !l.problem);
  const go = async () => { setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ saved: number; skipped_locked: number; problems: { row: number; message: string }[] }>(`${EX}/marks/bulk`, json("POST", { rows: valid.map((l) => ({ admission_no: l.adm, subject: l.subject, exam: l.exam, marks: Number(l.marks) })) })); t = `${r.saved} marks imported as draft.${r.problems.length ? ` ${r.problems.length} failed: ${r.problems.slice(0, 3).map((p) => `row ${p.row} ${p.message}`).join(" · ")}` : ""}${r.skipped_locked ? ` ${r.skipped_locked} were already verified.` : ""}`; })) { setMsg(t); setLines([]); } };
  const box = "flex min-h-[8.5rem] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4";
  return (
    <div className="space-y-5"><ErrorBanner message={fileError || roster.error || exams.error || subs.error || act.error} />{okBox(msg)}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={box}><b className="text-[14px] text-slate-900">1. Download the template</b><p className="text-xs text-slate-500">A CSV with the right columns and an example row</p><button type="button" className={`${small} mt-auto w-fit`} onClick={() => downloadCsv("marks-import-template", COLS, [[roster.data?.items[0]?.registration_no ?? "", roster.data?.items[0]?.name ?? "", subs.data?.items[0]?.name ?? "", exams.data?.items[0]?.name ?? "", "34", "40"]])}>Download template</button></div>
        <div className={box}><b className="text-[14px] text-slate-900">2. Fill it in</b><p className="text-xs text-slate-500">One row per mark. The exam and subject must match exactly.</p><p className="mt-auto text-xs text-slate-500">{COLS.length} columns</p></div>
        <div className={box}><b className="text-[14px] text-slate-900">3. Upload</b><p className="text-xs text-slate-500">We check every row before importing</p><input type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(e) => void onFile(e.target.files?.[0])} className="text-sm" /></div>
      </div>
      <Panel title="Preview" sub={lines.length ? `${valid.length} of ${lines.length} rows are ready` : "Upload a file to see its rows checked"} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !valid.length} onClick={() => void go()}>{act.busy ? "Importing…" : "Import valid rows"}</button>}>
        <SimpleTable head={["Row", "Admission no.", "Student", "Subject", "Exam", "Marks", "Max", "Check"].map((h) => ({ h }))} empty="No file checked yet." rows={lines.map((l) => [l.row, l.adm, l.student, l.subject, l.exam, l.marks, l.max, l.problem ? <span key="c" className="flex items-center gap-1.5"><Chip tone="bad">Missing</Chip><span className="text-xs text-slate-600">{l.problem}</span></span> : <Chip key="c" tone="good">Verified</Chip>])} />
      </Panel>
    </div>
  );
}

// ── co-scholastic ──
interface Co { areas: { name: string; about: string }[]; students: { id: string; name: string; roll_no: string; grades: Record<string, string> }[] }
function Coscholastic() {
  const secs = useLoad(() => schoolFetch<{ items: { id: string; label: string }[] }>(`${S}/section-rows`), []);
  const [sec, setSec] = useState(""); const [term, setTerm] = useState("Term 1");
  const sid = sec || secs.data?.items[0]?.id || "";
  const co = useLoad(() => (sid ? schoolFetch<Co>(`${EX}/coscholastic?section_id=${sid}&term=${encodeURIComponent(term)}`) : Promise.resolve(null)), [sid, term]);
  const act = useAction(() => co.reload());
  const [d, setD] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const c = co.data;
  const secL = secs.data?.items.find((x) => x.id === sid)?.label ?? "";
  const key = (id: string, a: string) => `${id}|${a}`;
  const save = async () => { if (!c) return; setMsg(""); const grades = Object.entries(d).map(([k, g]) => { const [student_id, area] = k.split("|"); return { student_id, area, grade: g }; }); if (!grades.length) return; if (await act.run(() => schoolFetch(`${EX}/coscholastic`, json("PUT", { section_id: sid, term, grades })))) { setD({}); setMsg("Grades saved."); } };
  return (
    <div className="space-y-5"><ErrorBanner message={secs.error || co.error || act.error} />{okBox(msg)}
      <Bar><Pill label="Section"><select aria-label="Section" value={sid} onChange={(e) => { setSec(e.target.value); setD({}); }} className={pillSel}>{secs.data?.items.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Pill><Pill label="Term"><select aria-label="Term" value={term} onChange={(e) => { setTerm(e.target.value); setD({}); }} className={pillSel}><option>Term 1</option><option>Term 2</option></select></Pill><span className="ml-auto text-xs text-slate-500">{c?.students.length ?? 0} students · {c?.areas.length ?? 0} areas</span></Bar>
      <SimpleTable head={["Area", "What's assessed"].map((h) => ({ h }))} empty="" rows={(c?.areas ?? []).map((a) => [<b key="a" className="font-semibold text-slate-900">{a.name}</b>, a.about])} />
      <Panel title={`${secL} · ${term}`} sub="Grade A / B / C" right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save grades"}</button>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-4 py-2.5 font-medium">Roll</th><th className="px-3 py-2.5 font-medium">Student</th>{(c?.areas ?? []).map((a) => <th key={a.name} className="px-3 py-2.5 font-medium">{a.name}</th>)}</tr></thead>
          <tbody>{(c?.students ?? []).map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="px-4 py-2">{s.roll_no || "—"}</td><td className="px-3 py-2 font-semibold text-slate-900">{s.name}</td>{(c?.areas ?? []).map((a) => <td key={a.name} className="px-3 py-1.5"><select aria-label={`${s.name} ${a.name}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px]" value={d[key(s.id, a.name)] ?? s.grades[a.name] ?? ""} onChange={(e) => { setD({ ...d, [key(s.id, a.name)]: e.target.value }); setMsg(""); }}><option value="">—</option><option>A</option><option>B</option><option>C</option></select></td>)}</tr>)}
            {!c?.students.length && <tr><td colSpan={8} className="p-6 text-center text-slate-400">{co.loading ? "Loading…" : "No students in this section."}</td></tr>}</tbody></table></div>
      </Panel>
    </div>
  );
}
