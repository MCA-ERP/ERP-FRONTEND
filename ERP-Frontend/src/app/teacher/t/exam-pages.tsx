"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { Bars, PillSelect, SearchBox, blueBtn, smallBtn, usePickedSection } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const pctText = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
const share = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}% of shown` : "");
const todayIso = () => new Date().toLocaleDateString("en-CA");

// ═════════════ exam schedule ═════════════
interface Row { ids: string[]; exam_id: string; exam: string; classes: string; my_sections: string[]; paper: string; date: string; starts: string; ends: string; hall: string; duty: string; upcoming: boolean; status: string; exam_status: string; paper_file: string; can_upload: boolean; can_enter_marks: boolean }
interface Sched { upcoming: Row[]; completed: Row[] }

function ScheduleTable({ kind }: { kind: "upcoming" | "completed" }) {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Sched>("/teacher/exams/schedule"), []);
  const [up, setUp] = useState<Row | null>(null);
  const act = useAction(() => { reload(); setUp(null); });
  const [q, setQ] = useState("");
  const [view, setView] = useState<Row | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const all = data?.[kind] ?? [];
  const items = all.filter((r) => !q || `${r.exam} ${r.classes} ${r.paper} ${r.duty}`.toLowerCase().includes(q.toLowerCase()));
  const copy = kind === "upcoming" ? ["Upcoming", "Exams where you set the paper, invigilate or evaluate."] : ["Completed", "Exams that are over. Enter marks or open the gradebook."];
  return (
    <div data-report>
      <Head title={copy[0]} subtitle={copy[1]} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Exam schedule", value: data.upcoming.length + data.completed.length, sub: "This year" }, { label: copy[0], value: all.length, sub: share(all.length, data.upcoming.length + data.completed.length) }]} />
          <Panel title="Exam schedule" sub={`${all.length} papers`} right={<ExportPrint name={`exam-schedule-${kind}`} head={["Exam", "Class", "Paper", "Date", "Time", "Hall", "My duty", "Status"]} rows={items.map((r) => [r.exam, r.classes, r.paper, r.date, `${r.starts} - ${r.ends}`, r.hall, r.duty, r.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search exam schedule" /></div>
            <SimpleTable head={[{ h: "Exam" }, { h: "Class" }, { h: "Paper" }, { h: "Date" }, { h: "Time" }, { h: "Hall" }, { h: "My duty" }, { h: "Status" }, { h: "" }]} empty={kind === "upcoming" ? "You have no upcoming exam duties." : "No exam of yours is over yet."} rows={items.map((r) => [r.exam, r.my_sections.length && r.classes.startsWith("Class ") ? `${r.classes}${r.my_sections.length ? ` (${r.my_sections.join(", ")})` : ""}` : r.classes, r.paper, day(r.date), `${r.starts} - ${r.ends}`, r.hall || "—", r.duty || "—", <Chip key="s" tone={r.upcoming ? "info" : "good"}>{r.status}</Chip>,
              <span key="a" className="flex gap-1.5">
                {r.can_upload && <button type="button" className={smallBtn} onClick={() => { setFile(null); setUp(r); }}>{r.paper_file ? "Replace paper" : "Upload paper"}</button>}
                {kind === "completed" && (r.can_enter_marks ? <button type="button" className={blueBtn} onClick={() => router.push(`/teacher/examinations/marks-entry?tab=theory&exam=${r.exam_id}`)}>Enter marks</button> : r.duty.includes("Evaluator") ? <button type="button" className={smallBtn} onClick={() => router.push("/teacher/examinations/gradebook")}>Gradebook</button> : null)}
                <button type="button" className={smallBtn} onClick={() => setView(r)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={`${view.exam} · ${view.paper}`} onClose={() => setView(null)}><KV rows={[["Class", view.classes], ["Date", day(view.date)], ["Time", `${view.starts} - ${view.ends}`], ["Hall", view.hall || "—"], ["My duty", view.duty || "—"], ["Question paper", view.paper_file || "Not uploaded"], ["Status", view.status]]} /></Modal>}
      {up && (
        <Modal open title={`Upload paper · ${up.exam} ${up.paper}`} onClose={() => setUp(null)}>
          <ErrorBanner message={act.error} />
          <L label="Question paper" hint="PDF, Word file or photo"><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={FILE} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></L>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setUp(null)}>Cancel</button><button type="button" disabled={!file || act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch("/teacher/exams/papers", json("POST", { ids: up.ids, file_name: file!.name })))}>Upload</button></div>
        </Modal>
      )}
    </div>
  );
}
export const ExamUpcoming = () => <ScheduleTable kind="upcoming" />;
export const ExamCompleted = () => <ScheduleTable kind="completed" />;

interface Duty { id: string; date: string; paper: string; exam: string; room: string; students: number; classes: string; swap: string }
export function MyInvigilation() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Duty[] }>("/teacher/exams/invigilation"), []);
  const [swap, setSwap] = useState<{ d: Duty; reason: string } | null>(null);
  const act = useAction(() => { reload(); setSwap(null); });
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((d) => !q || `${d.paper} ${d.room} ${d.classes}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="My Invigilation" subtitle="Your invigilation duties. You're never put on duty for your own subject's paper." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My invigilation" sub={`${data.items.length} ${data.items.length === 1 ? "duty" : "duties"}`} right={<ExportPrint name="my-invigilation" head={["Date", "Paper", "Room", "Students", "Classes in the room"]} rows={items.map((d) => [d.date, d.paper, d.room, d.students, d.classes])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search my invigilation" /></div>
          <SimpleTable head={[{ h: "Date" }, { h: "Paper" }, { h: "Room" }, { h: "Students", right: true }, { h: "Classes in the room" }, { h: "" }]} empty="You have no invigilation duty coming up." rows={items.map((d) => [day(d.date), <b key="p" className="font-semibold text-slate-900">{d.paper}</b>, d.room || "—", d.students, d.classes, d.swap ? <Chip key="s" tone={d.swap === "Approved" ? "good" : d.swap === "Rejected" ? "bad" : "warn"}>Swap {d.swap.toLowerCase()}</Chip> : <button key="b" type="button" className={smallBtn} onClick={() => setSwap({ d, reason: "" })}>Swap duty</button>])} />
        </Panel>
      )}
      {swap && (
        <Modal open title={`Swap duty · ${swap.d.paper}, ${day(swap.d.date)}`} onClose={() => setSwap(null)}>
          <ErrorBanner message={act.error} />
          <L label="Reason" hint="The exam cell will arrange someone else"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={300} value={swap.reason} onChange={(e) => setSwap({ ...swap, reason: e.target.value })} /></L>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setSwap(null)}>Cancel</button><button type="button" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/exams/invigilation/${swap.d.id}/swap`, json("POST", { reason: swap.reason })))}>Request swap</button></div>
        </Modal>
      )}
    </div>
  );
}

// ═════════════ marks entry ═════════════
interface Choices { sections: { id: string; label: string; subject: string; exams: { id: string; name: string; starts_on: string; ends_on: string; status: string }[] }[] }
interface Sheet { exam: string; max: number; bands: { min: number; grade: string }[]; status: string; open: boolean; closes: string; subject: string; class_label: string; students: { id: string; name: string; roll_no: string; marks: number | null; absent: boolean }[] }
const COPY: Record<string, [string, string, string]> = { Internal: ["Internal", "Short written test.", "Internal"], Theory: ["Theory", "Written paper.", "Theory"], Practical: ["Practical", "Lab activities and viva.", "Practical"] };
const BANNER: Record<string, [string, string]> = { Verified: ["bg-[#d9efe8]", "Verified by the exam cell and approved by the principal. Parents can see these marks."], New: ["bg-[#eaf6fb]", "Not started. Enter marks, save a draft, then submit for verification."], Draft: ["bg-[#eaf6fb]", "Draft saved. Submit for verification when every mark is in."], Submitted: ["bg-[#f8ecd6]", "Submitted to the exam cell for verification."], Returned: ["bg-[#fce0df]", "Returned by the exam cell. Correct the marks and submit again."] };

export function MarksEntry({ component }: { component: "Internal" | "Theory" | "Practical" }) {
  const copy = COPY[component];
  const ch = useLoad(() => schoolFetch<Choices>("/teacher/exams/marks/choices"), []);
  const [sec, pick] = usePickedSection(ch.data?.sections ?? [], null);
  const sel = ch.data?.sections.find((s) => s.id === sec);
  const param = useSearchParams().get("exam");
  const [examPick, setExam] = useState(param ?? "");
  const exam = sel?.exams.find((e) => e.id === examPick)?.id ?? sel?.exams[0]?.id ?? "";
  const sheet = useLoad(() => (sec && exam ? schoolFetch<Sheet>(`/teacher/exams/marks/sheet?exam_id=${exam}&section_id=${sec}&component=${component}`) : Promise.resolve(null)), [sec, exam, component]);
  const s = sheet.data;
  const [edit, setEdit] = useState<{ for: Sheet; v: Record<string, { marks: string; absent: boolean }> } | null>(null);
  const act = useAction(sheet.reload);
  const [done, setDone] = useState("");
  const vals = s ? (edit?.for === s ? edit.v : Object.fromEntries(s.students.map((x) => [x.id, { marks: x.marks === null ? "" : String(x.marks), absent: x.absent }]))) : {};
  const setVal = (id: string, patch: Partial<{ marks: string; absent: boolean }>) => s && setEdit({ for: s, v: { ...vals, [id]: { ...vals[id], ...patch } } });
  const grade = (p: number) => s?.bands.find((b) => p >= b.min)?.grade ?? "";
  const bad = s ? s.students.some((x) => { const v = vals[x.id]; return !v.absent && v.marks !== "" && (Number(v.marks) < 0 || Number(v.marks) > s.max || Number.isNaN(Number(v.marks))); }) : false;
  const send = async (submit: boolean) => { setDone(""); if (await act.run(() => schoolFetch("/teacher/exams/marks/sheet", json("POST", { exam_id: exam, section_id: sec, component, submit, marks: s!.students.map((x) => ({ student_id: x.id, marks: vals[x.id].absent || vals[x.id].marks === "" ? null : Number(vals[x.id].marks), absent: vals[x.id].absent })) })))) { setEdit(null); setDone(submit ? "Marks submitted for verification." : "Draft saved."); } };
  const locked = !!s && (s.status === "Verified" || !s.open);
  const banner = s ? BANNER[s.status] ?? BANNER.New : null;
  return (
    <div data-report>
      <Head title={copy[0]} subtitle={`${copy[1]} Marks go to the exam cell for verification, then to the principal.`} />
      <ErrorBanner message={ch.error || sheet.error || act.error} />
      <Loading on={(ch.loading && !ch.data) || (sheet.loading && !s)} />
      {ch.data && !ch.data.sections.length && <Panel title="Marks entry"><Empty text="You have no classes with a subject yet." /></Panel>}
      {ch.data && sel && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={sec} onChange={(e) => { pick(e.target.value); setEdit(null); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{ch.data.sections.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Exam<select aria-label="Exam" value={exam} onChange={(e) => { setExam(e.target.value); setEdit(null); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{sel.exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            {s && <span className="ml-auto text-[12px] text-slate-500">Out of {s.max} · due {day(s.closes)}</span>}
          </div>
          {!sel.exams.length && <Panel title="Marks entry"><Empty text="No exam has been set up for this class yet." /></Panel>}
          {s && banner && (
            <>
              <p className={`rounded-2xl border border-slate-200 px-4 py-3 text-[13px] text-slate-800 ${banner[0]}`}>{!s.open && s.status !== "Verified" ? `The marks entry window closed on ${day(s.closes)}. Ask the exam cell to reopen it.` : banner[1]}</p>
              <Panel title={`${s.subject} · ${s.class_label}`} sub={`${s.exam} · out of ${s.max}`} right={<Chip tone={s.status === "Verified" ? "good" : s.status === "Returned" ? "bad" : s.status === "Submitted" ? "warn" : "mute"}>{s.status === "New" ? "Not started" : s.status}</Chip>}>
                <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Marks" }, { h: "%" }, { h: "Grade" }, { h: "Absent" }]} empty="There are no students in this section." rows={s.students.map((x) => { const v = vals[x.id]; const p = v.absent || v.marks === "" || Number.isNaN(Number(v.marks)) ? null : Math.round((Number(v.marks) / s.max) * 100); return [x.roll_no, <b key="n" className="font-semibold text-slate-900">{x.name}</b>,
                  <input key="m" type="number" min={0} max={s.max} step="0.5" disabled={locked || v.absent} aria-label={`${x.name} marks`} value={v.marks} onChange={(e) => setVal(x.id, { marks: e.target.value })} className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-[13px] disabled:bg-slate-50" />, p === null ? "—" : `${p}%`, p === null ? "—" : <Chip key="g" tone="mute">{grade(p)}</Chip>,
                  <input key="a" type="checkbox" disabled={locked} aria-label={`${x.name} absent`} checked={v.absent} onChange={(e) => setVal(x.id, { absent: e.target.checked, marks: e.target.checked ? "" : v.marks })} className="size-4 accent-[#0294CE]" />]; })} />
                {!locked && <div className="flex items-center gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="text-sm font-semibold text-emerald-700">{done}</span>}{bad && <span className="text-sm text-rose-700">Marks must be between 0 and {s.max}.</span>}<button type="button" disabled={act.busy || bad} className={`${btnGhost} ml-auto !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void send(false)}>Save draft</button><button type="button" disabled={act.busy || bad} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void send(true)}>Submit for verification</button></div>}
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface Co { areas: { name: string }[]; class_label: string; students: { id: string; name: string; roll_no: string; grades: Record<string, string> }[] }
export function CoScholastic() {
  const reg = useLoad(() => schoolFetch<{ sections: { id: string; label: string }[] }>("/teacher/attendance/registers"), []);
  const [sec, pick] = usePickedSection(reg.data?.sections ?? [], null);
  const [term, setTerm] = useState("Term 1");
  const { data, error, loading, reload } = useLoad(() => (sec ? schoolFetch<Co>(`/teacher/exams/coscholastic/${sec}?term=${encodeURIComponent(term)}`) : Promise.resolve(null)), [sec, term]);
  const [edit, setEdit] = useState<{ for: Co; v: Record<string, string> } | null>(null);
  const act = useAction(reload);
  const [done, setDone] = useState("");
  const key = (sid: string, a: string) => `${sid}|${a}`;
  const val = (sid: string, a: string) => (data && edit?.for === data && edit.v[key(sid, a)] !== undefined ? edit.v[key(sid, a)] : data?.students.find((s) => s.id === sid)?.grades[a] ?? "");
  const setVal = (sid: string, a: string, v: string) => data && setEdit({ for: data, v: { ...(edit?.for === data ? edit.v : {}), [key(sid, a)]: v } });
  const save = async () => { if (!data) return; setDone(""); const grades = data.students.flatMap((s) => data.areas.map((a) => ({ student_id: s.id, area: a.name, grade: val(s.id, a.name) }))).filter((g) => g.grade); if (!grades.length) return; if (await act.run(() => schoolFetch("/teacher/exams/coscholastic", json("POST", { section_id: sec, term, grades })))) { setEdit(null); setDone("Grades saved."); } };
  return (
    <div data-report>
      <Head title="Co-Scholastic" subtitle={`As class teacher of ${data?.class_label ?? "your class"}, grade each student in activities beyond the classroom. A is outstanding, B is very good, C needs support. Parents see these on the report card.`} />
      <ErrorBanner message={reg.error || error || act.error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !reg.data.sections.length && <Panel title="Co-scholastic grades"><Empty text="Only the class teacher grades co-scholastic areas. You are not a class teacher this year." /></Panel>}
      {reg.data && reg.data.sections.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={sec} onChange={(e) => pick(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{reg.data.sections.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Term<select aria-label="Term" value={term} onChange={(e) => { setTerm(e.target.value); setEdit(null); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none"><option>Term 1</option><option>Term 2</option></select></label>
            {data && <span className="ml-auto text-[12px] text-slate-500">{data.students.length} students · {data.areas.length} areas</span>}
          </div>
          {data && (
            <Panel title={`${data.class_label} · ${term}`} sub="Grade A / B / C">
              <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, ...data.areas.map((a) => ({ h: a.name }))]} empty="There are no students in this section." rows={data.students.map((s) => [s.roll_no, <b key="n" className="font-semibold text-slate-900">{s.name}</b>, ...data.areas.map((a) => <select key={a.name} aria-label={`${s.name} ${a.name}`} value={val(s.id, a.name)} onChange={(e) => setVal(s.id, a.name, e.target.value)} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px]"><option value="">—</option><option>A</option><option>B</option><option>C</option></select>)])} />
              <div className="flex items-center gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" disabled={act.busy} className={`${btnPrimary} ml-auto !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void save()}>Save grades</button></div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════ gradebook ═════════════
interface GB { section_id: string; label: string; subject: string; exams: { id: string; name: string; max: number }[]; is_class_teacher: boolean; average: number | null; highest: number | null; pass_rate: number | null; pass_mark: number; below_50: number; students: { id: string; roll_no: string; name: string; scores: (number | null)[]; percent: number | null; grade: string; attendance: number | null }[] }
interface GBC { subject: string; items: { id: string; label: string; students: number; average: number | null; highest: number | null; lowest: number | null; pass_rate: number | null; top: number }[] }

export function GradebookStudents() {
  const cls = useLoad(() => schoolFetch<GBC>("/teacher/exams/gradebook/classes"), []);
  const [sec, pick] = usePickedSection(cls.data?.items ?? [], null);
  const { data, error, loading } = useLoad(() => (sec ? schoolFetch<GB>(`/teacher/exams/gradebook/${sec}`) : Promise.resolve(null)), [sec]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<GB["students"][number] | null>(null);
  const items = (data?.students ?? []).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));
  const exp = () => data && downloadCsv(`gradebook-${data.label}`, ["Roll", "Student", ...data.exams.map((e) => `${e.name} /${e.max}`), "Total /100", "Grade", "Attendance"], items.map((s) => [s.roll_no, s.name, ...s.scores, s.percent, s.grade, s.attendance]));
  return (
    <div data-report>
      <Head title="Student-wise" subtitle={`Every ${data?.subject ?? ""} assessment so far for ${data?.label ?? "your class"}.`} action={<button type="button" className={whiteBtn} disabled={!data} onClick={exp}>Export</button>} />
      <ErrorBanner message={cls.error || error} />
      <Loading on={(cls.loading && !cls.data) || (loading && !data)} />
      {cls.data && !cls.data.items.length && <Panel title="Gradebook"><Empty text="You have no classes with a subject yet." /></Panel>}
      {cls.data && cls.data.items.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={cls.data.items.map((s) => ({ value: s.id, label: s.label }))} right={data ? `${data.label} · ${data.students.length} students${data.is_class_teacher ? " · you're the class teacher" : ""}` : ""} />
          {data && (
            <>
              <Tiles items={[{ label: "Section average", value: pctText(data.average), sub: data.exams.map((e) => e.name).join(" + ") || "No marks yet" }, { label: "Highest", value: pctText(data.highest) }, { label: "Pass rate", value: pctText(data.pass_rate), sub: `${data.pass_mark}% to pass` }, { label: "Below 50%", value: data.below_50, sub: "Need support" }]} />
              <Panel title={`Gradebook · ${data.label}`} sub={`${data.students.length} students`} right={<ExportPrint name={`gradebook-${data.label}`} head={["Roll", "Student", ...data.exams.map((e) => `${e.name} /${e.max}`), "Total /100", "Grade", "Attendance"]} rows={items.map((s) => [s.roll_no, s.name, ...s.scores, s.percent, s.grade, s.attendance])} />}>
                <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search gradebook · ${data.label.toLowerCase()}`} /></div>
                <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, ...data.exams.map((e) => ({ h: `${e.name} /${e.max}` })), { h: "Total /100" }, { h: "Grade" }, { h: "Attendance" }, { h: "" }]} empty="There are no students in this section." rows={items.map((s) => [s.roll_no, <button key="n" type="button" onClick={() => setView(s)} className="font-semibold text-[#026f9b] hover:underline">{s.name}</button>, ...s.scores.map((x) => x ?? "—"), <b key="t" className="font-semibold text-slate-900">{s.percent ?? "—"}</b>, s.grade ? <Chip key="g" tone="mute">{s.grade}</Chip> : "—", pctText(s.attendance), <button key="v" type="button" className={smallBtn} onClick={() => setView(s)}>View details</button>])} />
              </Panel>
            </>
          )}
        </div>
      )}
      {view && data && <Modal open title={view.name} onClose={() => setView(null)}><KV rows={[...data.exams.map((e, i) => [`${e.name} /${e.max}`, view.scores[i] ?? "—"] as [string, ReactNode]), ["Total", view.percent === null ? "—" : `${view.percent} / 100`], ["Grade", view.grade || "—"], ["Attendance", pctText(view.attendance)]]} /></Modal>}
    </div>
  );
}

export function GradebookClasses({ go }: { go: (tab: string) => void }) {
  const { data, error, loading } = useLoad(() => schoolFetch<GBC>("/teacher/exams/gradebook/classes"), []);
  const [, pick] = usePickedSection(data?.items ?? [], null);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Class-wise" subtitle={`How your sections compare in ${data?.subject || "your subject"}.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Panel title="Average by section" sub="%"><Bars rows={data.items.map((s) => ({ label: s.label, value: s.average, note: s.average === null ? "—" : `${s.average}%` }))} /></Panel>
          <Panel title="Class-wise" sub={`${data.items.length} sections`} right={<ExportPrint name="gradebook-class-wise" head={["Section", "Students", "Average", "Highest", "Lowest", "Pass rate", "A1 + A2"]} rows={items.map((s) => [s.label, s.students, s.average, s.highest, s.lowest, s.pass_rate, s.top])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search class-wise" /></div>
            <SimpleTable head={[{ h: "Section" }, { h: "Students" }, { h: "Average" }, { h: "Highest" }, { h: "Lowest" }, { h: "Pass rate" }, { h: "A1 + A2" }, { h: "" }]} empty="You have no classes with a subject yet." rows={items.map((s) => [<b key="s" className="font-semibold text-slate-900">{s.label}</b>, s.students, pctText(s.average), pctText(s.highest), pctText(s.lowest), pctText(s.pass_rate), s.top, <button key="o" type="button" className={smallBtn} onClick={() => { pick(s.id); go("student-wise"); }}>Open</button>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ holistic progress card ═════════════
interface Hol { term: string; year: string; class_label: string; domains: string[]; levels: string[]; students: { id: string; roll_no: string; name: string; domains: Record<string, string>; comment: string; saved: boolean }[] }
export function HolisticCard() {
  const reg = useLoad(() => schoolFetch<{ sections: { id: string; label: string }[] }>("/teacher/attendance/registers"), []);
  const sec = reg.data?.sections[0]?.id ?? "";
  const { data, error, loading, reload } = useLoad(() => (sec ? schoolFetch<Hol>(`/teacher/exams/holistic/${sec}`) : Promise.resolve(null)), [sec]);
  const act = useAction(reload);
  const [pick, setPick] = useState("");
  const stu = data?.students.find((s) => s.id === pick) ?? data?.students[0];
  const [edit, setEdit] = useState<{ id: string; domains: Record<string, string>; comment: string } | null>(null);
  const cur = stu ? (edit?.id === stu.id ? edit : { id: stu.id, domains: Object.keys(stu.domains).length ? stu.domains : Object.fromEntries((data?.domains ?? []).map((d) => [d, "Proficient"])), comment: stu.comment }) : null;
  const [done, setDone] = useState("");
  const save = async (e: FormEvent) => { e.preventDefault(); if (!cur) return; setDone(""); if (await act.run(() => schoolFetch("/teacher/exams/holistic", json("POST", { section_id: sec, student_id: cur.id, domains: cur.domains, comment: cur.comment })))) { setEdit(null); setDone("Saved."); } };
  return (
    <div data-report>
      <Head title="Enter Card" subtitle={`The NEP holistic progress card for ${data?.term ?? "this term"}: a level in each of six domains with a short comment, alongside marks. Parents and students add their own reflections.`} />
      <ErrorBanner message={reg.error || error || act.error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !reg.data.sections.length && <Panel title="Holistic progress card"><Empty text="Only the class teacher fills the holistic card. You are not a class teacher this year." /></Panel>}
      {data && stu && cur && (
        <div className="space-y-4">
          <PillSelect label="Student" value={stu.id} onChange={(v) => { setPick(v); setEdit(null); setDone(""); }} options={data.students.map((s) => ({ value: s.id, label: s.name }))} />
          <p className="text-[12.5px] text-slate-600">{data.class_label} · {data.term}, {data.year}</p>
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">{stu.name}</h2><span className="text-xs text-slate-500">Teacher&apos;s assessment</span></div>
            <div className="px-5">{data.domains.map((d) => (
              <div key={d} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-[13px] last:border-0"><span className="flex-1 font-medium text-slate-900">{d}</span>
                <span role="radiogroup" aria-label={d} className="flex gap-5">{data.levels.map((l) => <label key={l} className="flex items-center gap-1.5 text-slate-700"><input type="radio" name={`${stu.id}-${d}`} checked={cur.domains[d] === l} onChange={() => setEdit({ ...cur, domains: { ...cur.domains, [d]: l } })} className="size-3.5 accent-[#0294CE]" />{l}</label>)}</span></div>
            ))}</div>
            <div className="px-5 pb-4 pt-2"><L label="Teacher's comment"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={1000} value={cur.comment} onChange={(e) => setEdit({ ...cur, comment: e.target.value })} /></L></div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="submit" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Save</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

// ═════════════ competitive prep ═════════════
interface Batches { students: number; classes: string; next_mock: { date: string; name: string } | null; average_last: number | null; change: number | null; last_name: string; top: { name: string; score: number } | null; batches: { id: string; name: string; classes: string; when: string; students: number; average: number | null }[]; watch: { id: string; name: string; class_label: string; last3: number[]; est: number | null; readiness: string; weak: string[] }[] }
const rTone = (r: string) => (r === "On track" ? "good" : r === "Borderline" ? "warn" : "bad") as "good" | "warn" | "bad";
export function CompBatches() {
  const { data, error, loading } = useLoad(() => schoolFetch<Batches>("/teacher/competitive/batches"), []);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const b = (data?.batches ?? []).filter((x) => !q1 || x.name.toLowerCase().includes(q1.toLowerCase()));
  const w = (data?.watch ?? []).filter((x) => !q2 || x.name.toLowerCase().includes(q2.toLowerCase()));
  return (
    <div data-report>
      <Head title="My Batches" subtitle="Olympiad batches you mentor. Students take mocks in the Student portal." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Your students", value: data.students, sub: data.classes || undefined }, { label: "Next mock", value: data.next_mock ? day(data.next_mock.date).replace(/ \d{4}$/, "") : "—", sub: data.next_mock?.name }, { label: "Average, last mock", value: pctText(data.average_last), sub: data.change === null ? data.last_name : `${data.change >= 0 ? "↑" : "↓"} ${Math.abs(data.change)} points` }, { label: "Top scorer", value: data.top?.name ?? "—", sub: data.top ? `${data.top.score}%` : undefined }]} />
          <Panel title="Batches" sub={`${data.batches.length} batches`} right={<ExportPrint name="my-batches" head={["Batch", "Classes", "When", "Students", "Mock average"]} rows={b.map((x) => [x.name, x.classes, x.when, x.students, x.average])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q1} onQ={setQ1} label="Search batches" /></div>
            <SimpleTable head={[{ h: "Batch" }, { h: "Classes" }, { h: "When" }, { h: "Students", right: true }, { h: "Mock average", right: true }]} empty="You do not mentor a batch. The School Admin adds mentors in Competitive Prep." rows={b.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.classes || "—", x.when || "—", x.students, pctText(x.average)])} />
          </Panel>
          <Panel title="Students to watch" sub={`${w.length} students`} right={<ExportPrint name="students-to-watch" head={["Student", "Class", "Last 3 mocks", "Readiness", "Weak chapters"]} rows={w.map((s) => [s.name, s.class_label, s.last3.map((x) => `${x}%`).join(" → "), s.readiness, s.weak.join(", ")])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q2} onQ={setQ2} label="Search students to watch" /></div>
            <SimpleTable head={[{ h: "Student" }, { h: "Class" }, { h: "Last 3 mocks" }, { h: "Readiness" }, { h: "Weak chapters" }]} empty="No mock results yet." rows={w.map((s) => [<b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.class_label, s.last3.map((x) => `${x}%`).join(" → ") || "—", <Chip key="r" tone={rTone(s.readiness)}>{s.readiness}</Chip>, s.weak.join(", ") || "—"])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

export function CompAnalysis() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ test: { name: string; students: number } | null; classes: string[]; chapters: { chapter: string; by_class: Record<string, number | null> }[]; students: number }>("/teacher/competitive/analysis"), []);
  const cell = (v: number | null) => (v === null ? <span className="text-slate-400">—</span> : <span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${v >= 65 ? "bg-[#d9efe8] text-[#065740]" : v >= 50 ? "bg-[#f8ecd6] text-[#8a5a0b]" : "bg-[#fce0df] text-[#ac2c28]"}`}>{v}%</span>);
  return (
    <div data-report>
      <Head title="Mock Test Analysis" subtitle="Chapter accuracy by class in the last mock. Red cells need re-teaching." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (!data.test ? <Panel title="Chapter accuracy"><Empty text="Chapter-wise accuracy appears here once students have taken a mock in the Student portal." /></Panel> : (
        <Panel title={`${data.test.name} · chapter accuracy by class`} sub={`${data.students} students`}>
          <SimpleTable head={[{ h: "Chapter" }, ...data.classes.map((c) => ({ h: c }))]} empty="Nothing to show yet." rows={data.chapters.map((c) => [<b key="c" className="font-semibold text-slate-900">{c.chapter}</b>, ...data.classes.map((k) => <span key={k}>{cell(c.by_class[k])}</span>)])} />
        </Panel>
      ))}
    </div>
  );
}

export function CompMock({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ programmes: { id: string; name: string; who: string }[]; chapters: string[]; bank: { easy: number; medium: number; hard: number } }>("/teacher/competitive/mock"), []);
  const act = useAction(reload);
  const blank = { programme_id: "", name: null as string | null, test_date: todayIso(), minutes: "60", chosen: null as string[] | null, easy: "15", medium: "15", hard: "5", negative: "None" };
  const [f, setF] = useState(blank);
  const prog = data?.programmes.find((p) => p.id === (f.programme_id || data.programmes[0]?.id));
  const chosen = f.chosen ?? (data?.chapters.slice(0, 4) ?? []);
  const name = f.name ?? (prog ? `${prog.name} mock` : "");
  const total = (data?.bank.easy ?? 0) + (data?.bank.medium ?? 0) + (data?.bank.hard ?? 0);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/teacher/competitive/mock", json("POST", { programme_id: prog?.id, name, test_date: f.test_date, minutes: Number(f.minutes), chapters: chosen, easy: Number(f.easy), medium: Number(f.medium), hard: Number(f.hard), negative: f.negative })))) { setF(blank); go("my-batches"); } };
  return (
    <div data-report>
      <Head title="Create Mock Test" subtitle="Build a mock test from the question bank. It appears in the Student portal on the date you choose." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New mock test</h2></div>
          {!data.programmes.length ? <Empty text="You do not mentor a batch yet, so you cannot set a mock." /> : (
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <L label="Programme"><select className={inputCls} value={prog?.id ?? ""} onChange={(e) => setF({ ...f, programme_id: e.target.value, name: null })}>{data.programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></L>
                <L label="Test name"><input className={inputCls} required minLength={2} maxLength={120} value={name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
                <L label="Date"><input type="date" className={inputCls} required min={todayIso()} value={f.test_date} onChange={(e) => setF({ ...f, test_date: e.target.value })} /></L>
                <L label="Time allowed (minutes)"><input type="number" className={inputCls} required min={5} max={600} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></L>
              </div>
              <div><p className="mb-1 text-[12.5px] font-medium text-slate-900">Chapters</p><div className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-slate-800">{data.chapters.map((c) => <label key={c} className="flex items-center gap-1.5"><input type="checkbox" checked={chosen.includes(c)} onChange={(e) => setF({ ...f, chosen: e.target.checked ? [...chosen, c] : chosen.filter((x) => x !== c) })} className="size-3.5 accent-[#0294CE]" />{c}</label>)}{!data.chapters.length && <span className="text-slate-500">No chapters are set up for your subject yet.</span>}</div></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <L label="Easy questions"><input type="number" className={inputCls} min={0} value={f.easy} onChange={(e) => setF({ ...f, easy: e.target.value })} /></L>
                <L label="Medium questions"><input type="number" className={inputCls} min={0} value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })} /></L>
                <L label="Hard questions"><input type="number" className={inputCls} min={0} value={f.hard} onChange={(e) => setF({ ...f, hard: e.target.value })} /></L>
                <L label="Negative marking"><select className={inputCls} value={f.negative} onChange={(e) => setF({ ...f, negative: e.target.value })}><option>None</option><option>¼ mark</option><option>⅓ mark</option></select></L>
              </div>
              <p className="text-[12px] text-slate-600">The bank has {total.toLocaleString("en-IN")} questions. Questions are picked at random, and each student gets them in a different order.</p>
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setF(blank)}>Clear</button><button type="submit" disabled={act.busy || !prog || !chosen.length} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Create test</button></div>
        </form>
      )}
    </div>
  );
}
