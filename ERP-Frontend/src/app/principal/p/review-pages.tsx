"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, ColumnChart } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { printScope } from "../../school/s/page-bar";
import { Row } from "../../school/s/dash-pages";
import { Head, redBtn } from "../../teacher/t/head";
import { AMBER, BLUE, BarRows, DataTable, Loading, Tile, dmy, has, phone } from "../../admissions/m/ui";

const GREEN = "bg-[#d9efe8]", RED = "bg-[#fde3e1]";
const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const solid = "rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Tiles = ({ children }: { children: ReactNode }) => <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{children}</div>;
const Page = ({ children }: { children: ReactNode }) => <div data-report>{children}</div>;
const Sel = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) => <select aria-label={label} className={`${inputCls} max-w-[11rem]`} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;
/** A record's dialog: its fields and a Close button. */
function Details({ title, rows, onClose }: { title: string; rows: [string, ReactNode][] | null; onClose: () => void }) {
  return <Modal open={!!rows} title={title} onClose={onClose}>{rows && <><dl>{rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={onClose}>Close</button></div></>}</Modal>;
}
const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const link = (t: string) => <b className="font-semibold text-[#026f9b]">{t}</b>;

// ═════════════ Academics › Academic Overview ═════════════
interface Classes { year: string; items: { id: string; name: string; stage: string; sections: number; students: number; campus: string; status: string }[]; stats: { classes: number; first: string | null; last: string | null; sections: number; average: number; teachers_assigned: number } }
export function ClassesPage() {
  const r = useLoad(() => schoolFetch<Classes>("/principal/academics/classes"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Classes["items"][number] | null>(null);
  const d = r.data; const rows = (d?.items ?? []).filter((c) => has(c, q));
  return (
    <Page><Head title="Classes" subtitle="Classes, sections and strength." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Classes" value={d.stats.classes} sub={d.stats.first ? `${d.stats.first} – ${d.stats.last}` : undefined} bg={BLUE} /><Tile label="Sections" value={d.stats.sections} sub={`Average ${d.stats.average} students`} bg={BLUE} /><Tile label="Class teachers assigned" value={`${d.stats.teachers_assigned} of ${d.stats.sections}`} bg={BLUE} /></Tiles>
        <DataTable title="Classes" noun="classes" search={q} onSearch={setQ} exportName="classes" exportHead={["Class", "Stage", "Sections", "Students", "Campus", "Status"]} exportRows={rows.map((c) => [c.name, c.stage, c.sections, c.students, c.campus, c.status])} head={["Class", "Stage", "Sections", "Students", "Campus", "Status", ""]} empty="No classes yet."
          rows={rows.map((c) => [c.name, c.stage, <span key="s" className="text-[#026f9b]">{c.sections}</span>, c.students, c.campus, <Chip key="t" tone="good">{c.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(c)}>View details</button>])} />
        <Details title={view?.name ?? ""} onClose={() => setView(null)} rows={view ? [["Stage", view.stage], ["Sections", String(view.sections)], ["Students", String(view.students)], ["Campus", view.campus], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}

export function SubjectsPage() {
  const r = useLoad(() => schoolFetch<{ subjects: number; syllabus_pct: number | null; plans_approved_pct: number | null; rows: { id: string; name: string; pct: number }[] }>("/principal/academics/subjects"), []);
  const d = r.data;
  return (
    <Page><Head title="Subjects" subtitle="Subjects taught and syllabus progress." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Subjects" value={d.subjects} bg={BLUE} />{d.syllabus_pct !== null && <Tile label="Syllabus completed" value={`${d.syllabus_pct}%`} bg={AMBER} tone="text-[#8a5a0b]" />}{d.plans_approved_pct !== null && <Tile label="Lesson plans approved" value={`${d.plans_approved_pct}%`} sub="This month" bg={GREEN} tone="text-[#065740]" />}</Tiles>
        <Panel title="Syllabus completed by subject" sub="%"><BarRows rows={d.rows.map((s) => ({ label: s.name, value: s.pct, max: 100, text: `${s.pct}%` }))} /></Panel>
      </>}
    </Page>
  );
}

interface Syl { items: { id: string; class_label: string; subject: string; chapter: string; periods: number; objective: string; month: string; status: string }[]; by_subject: { label: string; count: number }[] }
const SYL_TONE: Record<string, "good" | "warn" | "mute"> = { Completed: "good", "In progress": "warn", "Not started": "mute" };
export function SyllabusPage() {
  const r = useLoad(() => schoolFetch<Syl>("/principal/academics/syllabus"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Syl["items"][number] | null>(null);
  const d = r.data; const all = d?.items ?? []; const rows = all.filter((c) => has(c, q));
  const n = (s: string) => all.filter((c) => c.status === s).length; const p = (x: number) => (all.length ? Math.round((x / all.length) * 100) : 0);
  const mx = Math.max(1, ...(d?.by_subject ?? []).map((s) => s.count));
  return (
    <Page><Head title="Syllabus Progress" subtitle="Summary of chapters for the current academic year." action={<button type="button" className={redBtn} onClick={() => printScope(document.querySelector<HTMLElement>("[data-report]"), "syllabus-progress")}>Download report</button>} /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Syllabus" value={all.length} sub="Chapters planned" bg={BLUE} /><Tile label="Completed" value={n("Completed")} sub={`${p(n("Completed"))}%`} bg={GREEN} tone="text-[#065740]" /><Tile label="In progress" value={n("In progress")} sub={`${p(n("In progress"))}%`} bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Not started" value={n("Not started")} sub={`${p(n("Not started"))}%`} bg={AMBER} tone="text-[#8a5a0b]" /></Tiles>
        <div className="mb-5"><Panel title="Subject" sub="Count by subject"><BarRows rows={d.by_subject.map((s) => ({ label: s.label, value: s.count, max: mx, text: String(s.count) }))} /></Panel></div>
        <DataTable title="Syllabus" noun="chapters" search={q} onSearch={setQ} exportName="syllabus" exportHead={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status"]} exportRows={rows.map((c) => [c.class_label, c.subject, c.chapter, c.periods, c.objective, c.month, c.status])} head={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status", ""]} empty="No chapters planned yet."
          rows={rows.map((c) => [c.class_label, c.subject, c.chapter, c.periods, c.objective || "—", c.month || "—", <Chip key="s" tone={SYL_TONE[c.status] ?? "mute"}>{c.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(c)}>View details</button>])} />
        <Details title={view?.chapter ?? ""} onClose={() => setView(null)} rows={view ? [["Class", view.class_label], ["Subject", view.subject], ["Periods", String(view.periods)], ["Learning objective", view.objective || "—"], ["Planned month", view.month || "—"], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}

export function SubjectsByClassPage() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; name: string; stage: string; subjects: { name: string; type: string }[] }[]; stages: { stage: string; classes: string[]; subjects: string[] }[] }>("/principal/subjects-by-class"), []);
  const [pick, setPick] = useState("");
  const d = r.data; const cur = d?.items.find((c) => c.id === pick) ?? d?.items[0];
  return (
    <Page><Head title="Subjects by Class" subtitle="The subjects each class studies this year. Change them in Academics › Subject Management." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <Panel title={`Subjects in ${cur?.name ?? "—"}`} sub={cur?.stage}>
          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">{d.items.map((c) => <button key={c.id} type="button" onClick={() => setPick(c.id)} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${c.id === cur?.id ? "border-[#026f9b] bg-[#026f9b] font-semibold text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"}`}>{c.name}</button>)}</div>
          <table className="w-full text-left text-[13px]"><thead><tr className="bg-[#f3f9fd] text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Subject</th><th className="px-5 py-2.5">Type</th></tr></thead><tbody>{cur?.subjects.length ? cur.subjects.map((s) => <tr key={s.name} className="border-t border-slate-100"><td className="px-5 py-2.5 font-semibold text-slate-900">{s.name}</td><td className="px-5 py-2.5"><Chip tone={s.type === "Compulsory" ? "info" : "mute"}>{s.type}</Chip></td></tr>) : <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400">No subjects allocated yet.</td></tr>}</tbody></table>
        </Panel>
        <div className="mt-5"><Panel title="Every stage" sub="All classes on one page">
          <table className="w-full text-left text-[13px]"><thead><tr className="bg-[#f3f9fd] text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Stage</th><th className="px-5 py-2.5">Classes</th><th className="px-5 py-2.5">Subjects</th></tr></thead><tbody>{d.stages.map((s) => <tr key={s.stage} className="border-t border-slate-100 align-top"><td className="px-5 py-2.5 font-semibold text-slate-900">{s.stage}</td><td className="px-5 py-2.5">{s.classes.join(", ")}</td><td className="px-5 py-2.5">{s.subjects.join(" · ") || "—"}</td></tr>)}</tbody></table>
        </Panel></div>
      </>}
    </Page>
  );
}

// ═════════════ Academics › Teacher Monitoring ═════════════
export function WorkloadPage() {
  const r = useLoad(() => schoolFetch<{ limit: number; items: { id: string; name: string; periods: number }[] }>("/principal/academics/workload"), []);
  const d = r.data;
  return (
    <Page><Head title="Teacher Workload" subtitle={`Periods a week for each teacher. The limit is ${d?.limit ?? 40}.`} /><ErrorBanner message={r.error} />
      <Panel title="Teaching load" sub="Periods per week">{!d ? <Loading /> : <BarRows rows={d.items.map((t) => ({ label: t.name, value: t.periods, max: d.limit, text: `${t.periods} periods` }))} />}</Panel>
    </Page>
  );
}

interface Plan { id: string; teacher: string; class_label: string; subject: string; topic: string; week_of: string; periods: number; progress: number; status: string }
export function LessonPlansPage() {
  const r = useLoad(() => schoolFetch<{ items: Plan[] }>("/principal/academics/lesson-plans"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Plan | null>(null);
  const act = useAction(r.reload);
  const rows = (r.data?.items ?? []).filter((p) => has(p, q)); const all = r.data?.items ?? [];
  const submitted = all.filter((p) => p.status === "Submitted").length;
  const decide = (p: Plan, action: string) => void act.run(() => schoolFetch(`/principal/approvals/lesson/${p.id}`, json("POST", { action })));
  return (
    <Page><Head title="Lesson Plans" subtitle="Waiting for your decision. Approving notifies the person who raised it." /><ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Lesson plans" value={all.length} sub="Latest 300" bg={BLUE} /><Tile label="Submitted" value={submitted} sub={`${all.length ? Math.round((submitted / all.length) * 100) : 0}% of shown`} bg={BLUE} /></Tiles>
        <DataTable title="Lesson plans" noun="plans" search={q} onSearch={setQ} exportName="lesson-plans" exportHead={["Teacher", "Class", "Subject", "Topic", "Week of", "Periods", "Progress", "Status"]} exportRows={rows.map((p) => [p.teacher, p.class_label, p.subject, p.topic, p.week_of, p.periods, `${p.progress}%`, p.status])} head={["Teacher", "Class", "Subject", "Chapter / Topic", "Week", "Periods", "Progress", "Status", ""]} empty="No lesson plans yet."
          rows={rows.map((p) => [p.teacher, p.class_label, p.subject, p.topic, dmy(p.week_of), p.periods, `${p.progress}%`, <Chip key="s" tone={p.status === "Approved" ? "good" : p.status === "Returned" ? "bad" : p.status === "Submitted" ? "good" : "mute"}>{p.status}</Chip>, <span key="a" className="flex justify-end gap-1.5">{p.status === "Submitted" && <><button type="button" className={pill} disabled={act.busy} onClick={() => decide(p, "Returned")}>Return</button><button type="button" className={solid} disabled={act.busy} onClick={() => decide(p, "Approved")}>Approve</button></>}<button type="button" className={pill} onClick={() => setView(p)}>View details</button></span>])} />
        <Details title={view?.topic ?? ""} onClose={() => setView(null)} rows={view ? [["Teacher", view.teacher], ["Class", view.class_label], ["Subject", view.subject], ["Week of", dmy(view.week_of)], ["Periods", String(view.periods)], ["Progress", `${view.progress}%`], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}

// ═════════════ Academics › Academic Review ═════════════
interface CP { sections: { id: string; label: string }[]; section: { id: string; label: string } | null; exams: { id: string; name: string }[]; exam: { id: string; name: string } | null; rows: { roll: string; student: string; total: number; of: number; pct: number | null; grade: string }[] }
export function ClassPerformancePage() {
  const [sec, setSec] = useState(""); const [exam, setExam] = useState(""); const [q, setQ] = useState(""); const [view, setView] = useState<CP["rows"][number] | null>(null);
  const r = useLoad(() => schoolFetch<CP>(`/principal/academics/class-performance?${new URLSearchParams({ ...(sec ? { section: sec } : {}), ...(exam ? { exam } : {}) })}`), [sec, exam]);
  const d = r.data; const rows = (d?.rows ?? []).filter((x) => has(x, q));
  return (
    <Page><Head title="Class Performance" subtitle={`Grades calculated from all subjects for ${d?.exam?.name ?? "the latest exam"}.`} /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <DataTable title={`${d.section?.label ?? "Class"} grades`} noun="students" search={q} onSearch={setQ}
          filter={<><Sel label="Section" value={d.section?.id ?? ""} onChange={setSec} options={d.sections} /><Sel label="Exam" value={d.exam?.id ?? ""} onChange={setExam} options={d.exams.map((e) => ({ id: e.id, label: e.name }))} /></>}
          exportName="class-performance" exportHead={["Roll", "Student", "Total", "%", "Grade"]} exportRows={rows.map((x) => [x.roll, x.student, `${x.total} / ${x.of}`, `${x.pct}%`, x.grade])} head={["Roll", "Student", "Total", "%", "Grade", ""]} empty="No marks entered for this class yet."
          rows={rows.map((x) => [x.roll, <b key="s" className="font-semibold text-slate-900">{x.student}</b>, `${x.total} / ${x.of}`, `${x.pct}%`, <Chip key="g" tone="mute">{x.grade}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />
        <Details title={view?.student ?? ""} onClose={() => setView(null)} rows={view ? [["Roll", view.roll || "—"], ["Total", `${view.total} / ${view.of}`], ["Percentage", `${view.pct}%`], ["Grade", view.grade]] : null} />
      </>}
    </Page>
  );
}

interface SP { classes: { id: string; name: string }[]; class: { id: string; name: string } | null; exams: { id: string; name: string }[]; exam: { id: string; name: string } | null; tiles: { pass_rate: number; below_33: number; average: number; toppers: number } | null; by_subject: { label: string; pct: number }[]; distribution: { label: string; count: number }[] }
export function SubjectPerformancePage() {
  const [cls, setCls] = useState(""); const [exam, setExam] = useState("");
  const r = useLoad(() => schoolFetch<SP>(`/principal/academics/subject-performance?${new URLSearchParams({ ...(cls ? { grade: cls } : {}), ...(exam ? { exam } : {}) })}`), [cls, exam]);
  const d = r.data; const dm = Math.max(1, ...(d?.distribution ?? []).map((x) => x.count));
  return (
    <Page><Head title="Subject Performance" subtitle={`How ${d?.class?.name ?? "the class"} did in ${d?.exam?.name ?? "the latest exam"}, subject by subject.`} /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <div className="mb-4 flex flex-wrap gap-3"><Sel label="Class" value={d.class?.id ?? ""} onChange={setCls} options={d.classes.map((c) => ({ id: c.id, label: c.name }))} /><Sel label="Exam" value={d.exam?.id ?? ""} onChange={setExam} options={d.exams.map((e) => ({ id: e.id, label: e.name }))} /></div>
        {d.tiles ? <>
          <Tiles><Tile label="Pass rate" value={`${d.tiles.pass_rate}%`} sub={`${d.tiles.below_33} student${d.tiles.below_33 === 1 ? "" : "s"} below 33% in a subject`} bg={GREEN} tone="text-[#065740]" /><Tile label="Class average" value={`${d.tiles.average}%`} bg={BLUE} /><Tile label="Toppers" value={`${d.tiles.toppers} student${d.tiles.toppers === 1 ? "" : "s"}`} sub="Above 95%" bg={BLUE} /></Tiles>
          <div className="space-y-5"><Panel title="Average by subject" sub="%"><BarRows rows={d.by_subject.map((s) => ({ label: s.label, value: s.pct, max: 100, text: `${s.pct}%` }))} /></Panel><Panel title="Grade distribution" sub="Students"><BarRows rows={d.distribution.map((s) => ({ label: s.label, value: s.count, max: dm, text: String(s.count) }))} /></Panel></div>
        </> : <p className="py-10 text-center text-sm text-slate-400">No marks entered for this class yet.</p>}
      </>}
    </Page>
  );
}

// ═════════════ Students ═════════════
export function ClassWisePage() {
  const r = useLoad(() => schoolFetch<Classes>("/principal/academics/classes"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Classes["items"][number] | null>(null);
  const d = r.data; const rows = (d?.items ?? []).filter((c) => has(c, q)); const mx = Math.max(1, ...(d?.items ?? []).map((c) => c.students));
  return (
    <Page><Head title="Class-wise" subtitle="Strength of every class and section." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <div className="mb-5"><Panel title="Students by class" sub={d.year}><BarRows rows={d.items.map((c) => ({ label: c.name, value: c.students, max: mx, text: String(c.students) }))} /></Panel></div>
        <DataTable title="Classes" noun="classes" search={q} onSearch={setQ} exportName="students-by-class" exportHead={["Class", "Stage", "Sections", "Students", "Campus", "Status"]} exportRows={rows.map((c) => [c.name, c.stage, c.sections, c.students, c.campus, c.status])} head={["Class", "Stage", "Sections", "Students", "Campus", "Status", ""]} empty="No classes yet."
          rows={rows.map((c) => [c.name, c.stage, c.sections, c.students, c.campus, <Chip key="t" tone="good">{c.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(c)}>View details</button>])} />
        <Details title={view?.name ?? ""} onClose={() => setView(null)} rows={view ? [["Stage", view.stage], ["Sections", String(view.sections)], ["Students", String(view.students)], ["Campus", view.campus]] : null} />
      </>}
    </Page>
  );
}

interface Sec { id: string; label: string; teacher: string; room: string; students: number; status: string }
export function SectionWisePage() {
  const r = useLoad(() => schoolFetch<{ items: Sec[] }>("/principal/students/sections"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<Sec | null>(null);
  const all = r.data?.items ?? []; const rows = all.filter((c) => has(c, q));
  return (
    <Page><Head title="Section-wise" subtitle="All sections, newest first." /><ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Sections" value={all.length} bg={BLUE} /><Tile label="Active" value={all.length} bg={BLUE} /></Tiles>
        <DataTable title="Sections" noun="sections" search={q} onSearch={setQ} exportName="sections" exportHead={["Section", "Class teacher", "Room", "Students", "Status"]} exportRows={rows.map((c) => [c.label, c.teacher, c.room, c.students, c.status])} head={["Section", "Class teacher", "Room", "Students", "Status", ""]} empty="No sections yet."
          rows={rows.map((c) => [c.label, c.teacher || "—", c.room || "—", c.students, <Chip key="t" tone="good">{c.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(c)}>View details</button>])} />
        <Details title={view?.label ?? ""} onClose={() => setView(null)} rows={view ? [["Class teacher", view.teacher || "—"], ["Room", view.room || "—"], ["Students", String(view.students)]] : null} />
      </>}
    </Page>
  );
}

interface Beh { id: string; student: string; class_label: string; type: string; details: string; note: string; by: string; date: string; status: string }
const BEH_TEXT: Record<string, [string, string]> = { incidents: ["Incidents", "All records, newest first."], actions: ["Actions", "Behaviour records marked “Disciplinary action”."], followup: ["Follow-up", "Open items. Resolving closes them and tells the person who raised them."] };
export function DisciplinePage({ tab }: { tab: "incidents" | "actions" | "followup" }) {
  const r = useLoad(() => schoolFetch<{ items: Beh[] }>(`/principal/students/behaviour?tab=${tab}`), [tab]);
  const act = useAction(r.reload);
  const [q, setQ] = useState(""); const [view, setView] = useState<Beh | null>(null);
  const all = r.data?.items ?? []; const rows = all.filter((x) => has(x, q));
  const n = (s: string) => all.filter((x) => x.status === s).length; const p = (x: number) => `${all.length ? Math.round((x / all.length) * 100) : 0}% of shown`;
  const [head, sub] = BEH_TEXT[tab];
  return (
    <Page><Head title={head} subtitle={sub} /><ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Behaviour records" value={all.length} sub="Latest 500" bg={BLUE} />{tab !== "actions" ? <Tile label="Open" value={n("Open")} sub={p(n("Open"))} bg={BLUE} /> : <Tile label="Parent informed" value={n("Parent informed")} sub={p(n("Parent informed"))} bg={BLUE} />}{tab === "actions" ? <Tile label="Open" value={n("Open")} sub={p(n("Open"))} bg={BLUE} /> : tab === "followup" ? <Tile label="Parent informed" value={n("Parent informed")} sub={p(n("Parent informed"))} bg={BLUE} /> : <><Tile label="Parent informed" value={n("Parent informed")} sub={p(n("Parent informed"))} bg={BLUE} /><Tile label="Closed" value={n("Closed")} sub={p(n("Closed"))} bg={BLUE} /></>}</Tiles>
        <DataTable title="Behaviour records" noun="records" search={q} onSearch={setQ} exportName={`behaviour-${tab}`} exportHead={["Student", "Class", "Type", "Details", "Recorded by", "Date", "Status"]} exportRows={rows.map((x) => [x.student, x.class_label, x.type, x.details, x.by, x.date, x.status])} head={["Student", "Class", "Type", "Details", "Recorded by", "Date", "Status", ""]} empty="No behaviour records."
          rows={rows.map((x) => [link(x.student), x.class_label, x.type, x.details, x.by || "—", dmy(x.date), <Chip key="s" tone={x.status === "Open" ? "warn" : "mute"}>{x.status}</Chip>, <span key="a" className="flex justify-end gap-1.5">{tab === "followup" && <button type="button" className={solid} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/principal/students/behaviour/${x.id}/close`, json("POST", {})))}>Mark closed</button>}<button type="button" className={pill} onClick={() => setView(x)}>View details</button></span>])} />
        <Details title={view?.student ?? ""} onClose={() => setView(null)} rows={view ? [["Class", view.class_label], ["Type", view.type], ["Details", view.details], ["Note", view.note || "—"], ["Recorded by", view.by || "—"], ["Date", dmy(view.date)], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}

// ═════════════ Attendance ═════════════
interface Month { key: string; label: string; pct: number; days: number; current: boolean }
function MonthlyView({ path, head, sub, title, name }: { path: string; head: string; sub: string; title: string; name: string }) {
  const r = useLoad(() => schoolFetch<{ year: string; months: Month[] }>(path), [path]);
  const [view, setView] = useState<Month | null>(null);
  const d = r.data; const cur = d?.months.find((m) => m.current);
  return (
    <Page><Head title={head} subtitle={sub} /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <div className="mb-5"><Panel title={title} sub={d.year}>{d.months.length ? <><ColumnChart data={d.months.map((m) => ({ label: m.label, value: m.pct, partial: m.current }))} format={(n) => `${n}%`} title={title} />{cur && <p className="px-5 pb-3 text-[11.5px] text-slate-500">{new Date(cur.key + "-01T00:00:00Z").toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" })} is month to date.</p>}</> : <p className="p-6 text-center text-sm text-slate-400">Nothing marked yet.</p>}</Panel></div>
        <DataTable title="By month" noun="months" search="" onSearch={() => undefined} exportName={name} exportHead={["Month", "Average", "Working days"]} exportRows={d.months.map((m) => [m.label, `${m.pct}%`, m.days])} head={["Month", "Average", "Working days", ""]} empty="Nothing marked yet."
          rows={d.months.map((m) => [m.label, `${m.pct}%`, m.days, <button key="v" type="button" className={pill} onClick={() => setView(m)}>View details</button>])} />
        <Details title={view ? `${view.label} · ${d.year}` : ""} onClose={() => setView(null)} rows={view ? [["Average", `${view.pct}%`], ["Working days", String(view.days)], ["Status", view.current ? "Month to date" : "Complete"]] : null} />
      </>}
    </Page>
  );
}
export const MonthlyAttendancePage = () => <MonthlyView path="/principal/attendance/monthly" head="Monthly" sub="Average daily attendance by month." title="Monthly attendance" name="monthly-attendance" />;

interface Def { tiles: { below_88: number; below_75: number; calls_this_week: number }; items: { id: string; student: string; class_label: string; pct: number; absent: number; parent: string; mobile: string }[] }
export function DefaultersPage() {
  const r = useLoad(() => schoolFetch<Def>("/principal/attendance/defaulters"), []);
  const act = useAction(r.reload);
  const [q, setQ] = useState(""); const [view, setView] = useState<Def["items"][number] | null>(null);
  const d = r.data; const rows = (d?.items ?? []).filter((x) => has(x, q));
  const contact = (id: string, how: "call" | "notice") => void act.run(() => schoolFetch(`/principal/attendance/defaulters/${id}/contact`, json("POST", { how })));
  return (
    <Page><Head title="Defaulters" subtitle="Students below 88% attendance this year. Below 75% can’t sit the final exams without your approval." /><ErrorBanner message={r.error || act.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Below 88%" value={`${d.tiles.below_88} shown`} sub="Watch list" bg={BLUE} /><Tile label="Below 75%" value={d.tiles.below_75} sub="Need your approval for exams" bg={BLUE} /><Tile label="Parents called this week" value={d.tiles.calls_this_week} sub="Calls and notices from here" bg={BLUE} /></Tiles>
        <DataTable title="Attendance defaulters" noun="students" search={q} onSearch={setQ} exportName="attendance-defaulters" exportHead={["Student", "Class", "Attendance", "Days absent", "Parent", "Mobile"]} exportRows={rows.map((x) => [x.student, x.class_label, `${x.pct}%`, x.absent, x.parent, x.mobile])} head={["Student", "Class", "Attendance", "Days absent", "Father", "Mobile", ""]} empty="No student is below 88%."
          rows={rows.map((x) => [link(x.student), x.class_label, <b key="p" className="font-semibold text-[#ac2c28]">{x.pct}%</b>, x.absent, x.parent || "—", phone(x.mobile), <span key="a" className="flex justify-end gap-1.5">{x.mobile && <a href={`tel:${x.mobile}`} className={pill} onClick={() => contact(x.id, "call")}>Call parent</a>}<button type="button" className={solid} disabled={act.busy} onClick={() => contact(x.id, "notice")}>Notice to parent</button><button type="button" className={pill} onClick={() => setView(x)}>View details</button></span>])} />
        <Details title={view?.student ?? ""} onClose={() => setView(null)} rows={view ? [["Class", view.class_label], ["Attendance", `${view.pct}%`], ["Days absent", String(view.absent)], ["Parent", view.parent || "—"], ["Mobile", phone(view.mobile)]] : null} />
      </>}
    </Page>
  );
}

interface Day { today: string; recorded: boolean; tiles: { present: number; absent: number; late: number; total: number; not_marked: string[] }; by_class: { label: string; pct: number | null }[]; long_absent: { id: string; name: string; class_label: string; days: number; parent: string; mobile: string }[] }
export function DailyAttendancePage() {
  const r = useLoad(() => schoolFetch<Day & { off?: string }>("/principal/overview?tab=attendance"), []);
  const d = r.data;
  return (
    <Page><Head title="Daily" subtitle="Student attendance marked today." /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <>
        <Tiles><Tile label="Present" value={d.tiles.present.toLocaleString("en-IN")} sub={d.tiles.total ? `${Math.round((d.tiles.present / d.tiles.total) * 1000) / 10}%` : "Not marked yet"} bg={GREEN} tone="text-[#065740]" /><Tile label="Absent" value={d.tiles.absent.toLocaleString("en-IN")} sub={`of ${d.tiles.total.toLocaleString("en-IN")} marked`} bg={RED} tone="text-[#ac2c28]" /><Tile label="Late" value={d.tiles.late.toLocaleString("en-IN")} sub="Marked late today" bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Classes not marked" value={d.tiles.not_marked.length} sub={d.tiles.not_marked.slice(0, 4).join(", ") || "All classes marked"} bg={RED} tone="text-[#ac2c28]" /></Tiles>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Present by class" sub="%"><BarRows rows={d.by_class.filter((c) => c.pct !== null).map((c) => ({ label: c.label, value: c.pct!, max: 100, text: `${c.pct}%` }))} /></Panel>
          <Panel title="Absent 3+ days in a row">{d.long_absent.length ? <ul>{d.long_absent.map((s) => <li key={s.id} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className="grid size-8 place-items-center rounded-lg bg-[#f8ecd6] text-[11px] font-bold text-[#8a5a0b]">{initialsOf(s.name)}</span><span className="min-w-0 flex-1"><b className="block text-[13.5px] font-semibold text-[#026f9b]">{s.name}</b><span className="block text-[11.5px] text-slate-500">{s.class_label} · absent {s.days} days</span></span>{s.mobile ? <a href={`tel:${s.mobile}`} className={pill} title={s.parent}>Call parent</a> : <span className="text-[11.5px] text-slate-400">No number</span>}</li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">No student has been absent for three days in a row.</p>}</Panel>
        </div>
      </>}
    </Page>
  );
}

export function StaffDailyPage() {
  const r = useLoad(() => schoolFetch<{ recorded: boolean; items: { label: string; present: number; total: number }[] }>("/principal/attendance/staff/daily"), []);
  return (
    <Page><Head title="Daily" subtitle="Staff present today by department." /><ErrorBanner message={r.error} />
      <Panel title="Present by department" sub="Today">{!r.data ? <Loading /> : <BarRows rows={r.data.items.map((x) => ({ label: x.label, value: x.present, max: x.total, text: `${x.present} of ${x.total}` }))} />}</Panel>
    </Page>
  );
}


interface SM { label: string; items: { id: string; name: string; code: string; department: string; present: number; leave: number; absent: number; late: number }[] }
export function StaffMonthlyPage() {
  const r = useLoad(() => schoolFetch<SM>("/principal/attendance/staff/monthly"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<SM["items"][number] | null>(null);
  const d = r.data; const rows = (d?.items ?? []).filter((x) => has(x, q));
  return (
    <Page><Head title="Monthly" subtitle={`Staff attendance for ${d?.label ?? "this month"}.`} /><ErrorBanner message={r.error} />
      {!d ? <Loading /> : <DataTable title={d.label} noun="staff" search={q} onSearch={setQ} exportName="staff-monthly-attendance" exportHead={["Staff", "Code", "Department", "Present", "Leave", "Absent", "Late"]} exportRows={rows.map((x) => [x.name, x.code, x.department, x.present, x.leave, x.absent, x.late])} head={["Staff", "Department", "Present", "Leave", "Absent", "Late", ""]} empty="No staff attendance marked this month."
        rows={rows.map((x) => [<span key="s" className="block leading-tight">{x.name}<span className="block text-[11.5px] text-slate-500">{x.code}</span></span>, x.department, x.present, <span key="l" className={x.leave ? "text-[#026f9b]" : ""}>{x.leave}</span>, <span key="a" className={x.absent ? "text-[#ac2c28]" : ""}>{x.absent}</span>, x.late, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />}
      <Details title={view?.name ?? ""} onClose={() => setView(null)} rows={view ? [["Code", view.code || "—"], ["Department", view.department], ["Present", String(view.present)], ["Leave", String(view.leave)], ["Absent", String(view.absent)], ["Late", String(view.late)]] : null} />
    </Page>
  );
}

interface Ex { id: string; staff_id: string; staff: string; department: string; kind: string; times: number; last: string }
export function StaffExceptionsPage() {
  const r = useLoad(() => schoolFetch<{ items: Ex[] }>("/principal/attendance/staff/exceptions"), []);
  const act = useAction(r.reload);
  const [q, setQ] = useState(""); const [view, setView] = useState<Ex | null>(null); const [sent, setSent] = useState("");
  const rows = (r.data?.items ?? []).filter((x) => has(x, q));
  const ask = async (x: Ex) => { if (await act.run(() => schoolFetch("/principal/attendance/staff/ask-reason", json("POST", { staff_id: x.staff_id, kind: x.kind, date: x.last })))) setSent(`Asked ${x.staff} for the reason. It is in their Help Desk, waiting on them.`); };
  return (
    <Page><Head title="Exceptions" subtitle="Staff who were late, absent without leave or forgot to punch out this week." /><ErrorBanner message={r.error || act.error} />
      {sent && <p className="mb-3 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[13px] text-slate-800">{sent}</p>}
      <DataTable title="Exceptions this week" noun="staff" search={q} onSearch={setQ} exportName="staff-exceptions" exportHead={["Staff", "Department", "Exception", "Times this month", "Last"]} exportRows={rows.map((x) => [x.staff, x.department, x.kind, x.times, x.last])} head={["Staff", "Exception", "Times this month", "Last", ""]} empty={r.loading ? "Loading…" : "No exceptions this week."}
        rows={rows.map((x) => [<span key="s" className="block leading-tight">{x.staff}<span className="block text-[11.5px] text-slate-500">{x.department}</span></span>, <Chip key="e" tone={x.kind === "Absent" ? "bad" : "mute"}>{x.kind}</Chip>, <span key="t" className="text-[#026f9b]">{x.times}</span>, dmy(x.last), <span key="a" className="flex justify-end gap-1.5"><button type="button" className={pill} disabled={act.busy} onClick={() => void ask(x)}>Ask for reason</button><button type="button" className={pill} onClick={() => setView(x)}>View details</button></span>])} />
      <Details title={view?.staff ?? ""} onClose={() => setView(null)} rows={view ? [["Department", view.department], ["Exception", view.kind], ["Times this month", String(view.times)], ["Last", dmy(view.last)]] : null} />
    </Page>
  );
}

interface App { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; applied_on: string; status: string }
const maskMobile = (m: string | null) => { const d = (m ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 5)}• ••${d.slice(8)}` : m || "—"; };
export function ApplicationsReview() {
  const r = useLoad(() => schoolFetch<{ items: App[] }>("/principal/admissions/applications"), []);
  const [q, setQ] = useState(""); const [view, setView] = useState<App | null>(null);
  const all = r.data?.items ?? []; const rows = all.filter((x) => has(x, q));
  const n = (f: (a: App) => boolean) => all.filter(f).length; const p = (x: number) => `${all.length ? Math.round((x / all.length) * 100) : 0}% of shown`;
  const alloc = n((a) => a.status === "Allocated"), review = n((a) => a.status === "Under review"), appr = n((a) => ["Approved", "Fee paid", "Registered"].includes(a.status));
  return (
    <Page><Head title="Applications" subtitle="All applications, newest first." /><ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Applications" value={all.length} sub="Latest 2,000" bg={BLUE} /><Tile label="Allocated" value={alloc} sub={p(alloc)} bg={BLUE} /><Tile label="Under review" value={review} sub={p(review)} bg={BLUE} /><Tile label="Approved" value={appr} sub={p(appr)} bg={GREEN} tone="text-[#065740]" /></Tiles>
        <DataTable title="Applications" noun="applications" search={q} onSearch={setQ} exportName="applications" exportHead={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]} exportRows={rows.map((a) => [a.code, a.child, a.class_sought, a.parent_name, maskMobile(a.mobile), a.source, a.applied_on, a.status])} head={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status", ""]} empty="No applications yet."
          rows={rows.map((a) => [a.code, a.child, a.class_sought, a.parent_name, maskMobile(a.mobile), a.source, dmy(a.applied_on), <Chip key="s" tone={a.status === "Rejected" ? "bad" : a.status === "Returned" || a.status === "Waitlisted" ? "warn" : "mute"}>{a.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(a)}>View details</button>])} />
        <Details title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)} rows={view ? [["Class sought", view.class_sought], ["Parent", view.parent_name], ["Mobile", maskMobile(view.mobile)], ["Source", view.source], ["Applied on", dmy(view.applied_on)], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}

interface DL { id: string; code: string; staff: string; department: string; leave_type: string; from: string; days: number; applied: string; status: string }
export function DecidedLeavePage({ status }: { status: "Approved" | "Rejected" }) {
  const r = useLoad(() => schoolFetch<{ items: DL[] }>(`/principal/staff/leave/${status}`), [status]);
  const [q, setQ] = useState(""); const [view, setView] = useState<DL | null>(null);
  const all = r.data?.items ?? []; const rows = all.filter((x) => has(x, q));
  return (
    <Page><Head title={status} subtitle={`Staff leave marked “${status}”.`} /><ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : <>
        <Tiles><Tile label="Staff leave" value={all.length} sub="Latest 500" bg={BLUE} /><Tile label={status} value={all.length} sub="100% of shown" bg={status === "Approved" ? GREEN : RED} tone={status === "Approved" ? "text-[#065740]" : "text-[#ac2c28]"} /></Tiles>
        <DataTable title="Staff leave" noun="applications" search={q} onSearch={setQ} exportName={`leave-${status.toLowerCase()}`} exportHead={["Ref.", "Staff", "Department", "Leave type", "From", "Days", "Applied", "Status"]} exportRows={rows.map((x) => [x.code, x.staff, x.department, x.leave_type, x.from, x.days, x.applied, x.status])} head={["Ref.", "Staff", "Department", "Leave type", "From", "Days", "Applied", "Status", ""]} empty="No leave here yet."
          rows={rows.map((x) => [x.code, x.staff, x.department, x.leave_type, dmy(x.from), x.days, dmy(x.applied), <Chip key="s" tone={status === "Approved" ? "good" : "bad"}>{x.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>])} />
        <Details title={view ? `${view.code} · ${view.staff}` : ""} onClose={() => setView(null)} rows={view ? [["Department", view.department], ["Leave", view.leave_type], ["From", dmy(view.from)], ["Days", String(view.days)], ["Applied", dmy(view.applied)], ["Status", view.status]] : null} />
      </>}
    </Page>
  );
}
