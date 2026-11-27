"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { CountBars } from "@/components/admin/dash-ui";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, inputCls } from "@/components/admin/ui";
import { Head, redBtn, whiteBtn } from "../../teacher/t/head";
import { useParent } from "../context";
import { MonthlyChart, monthTable } from "./dash-pages";
import { ChildBar, DataTable, Empty, Lbl, Loaded, Note, Pairs, Select, Status, Tiles, bluePill, bold, dmy, row, useChildPath, useGet, weekday } from "./kit";

const useRecords = <T,>(tab: string, exam = "") => useGet<T>(useChildPath(`/parent/academics/records?tab=${tab}${exam ? `&exam=${exam}` : ""}`));

interface Card { exam_id: string; school: string; exam: string; year: string; name: string; class_label: string; roll_no: string; registration_no: string; attendance: number | null; max: number; subjects: { name: string; marks: number | null; pct: number | null; grade: string }[]; pct: number | null; grade: string; coscholastic: { area: string; grade: string }[]; remark: string; published_at: string | null }
interface Results {
  exams: { id: string; name: string; published_at: string | null }[];
  tests: { id: string; name: string; pct: number; grade: string; out: number }[];
  subjects: { name: string; marks: { exam_id: string; marks: number | null; pct: number | null }[]; average: number | null; first: number | null; latest: number | null; change: number | null; grade: string }[];
  cards: Card[];
}
const NONE = "No report card has been published yet.";

function printCard(c: Card) {
  armPrint();
  downloadCsv(`report-card-${c.name}-${c.exam}`, ["Subject / area", "Marks", "Out of", "%", "Grade"], [
    ["Student", c.name, "", "", ""], ["Class", c.class_label, "", "", ""], ["Admission no.", c.registration_no, "", "", ""],
    ...c.subjects.map((s) => [s.name, s.marks ?? "—", c.max, s.pct === null ? "—" : `${s.pct}%`, s.grade]),
    ["Overall", "", "", c.pct === null ? "—" : `${c.pct}%`, c.grade],
    ...c.coscholastic.map((x) => [x.area, "", "", "", x.grade]),
    ["Attendance", c.attendance === null ? "—" : `${c.attendance}%`, "", "", ""], ["Class teacher's remark", c.remark, "", "", ""],
  ]);
}

export function ReportCards() {
  const { child } = useParent();
  const r = useRecords<Results>("report-cards");
  const [exam, setExam] = useState("");
  const cards = r.data?.cards ?? [];
  const card = cards.find((c) => c.exam_id === exam) ?? cards[cards.length - 1];
  return (
    <>
      <Head title="View Report Cards" subtitle={`Report cards published for ${child?.first_name ?? "your child"}.`} action={card ? <button type="button" className={redBtn} onClick={() => printCard(card)}>Download PDF</button> : undefined} />
      <div className="space-y-4">
        <ChildBar>{card && <Select label="Report card" value={card.exam_id} onChange={setExam} options={cards.map((c) => [c.exam_id, c.exam])} />}</ChildBar>
        <Loaded r={r}>{() => (!card ? <Empty>{NONE}</Empty> : (
          <Panel title={`${card.exam} report card`} sub={card.published_at ? `Published ${dmy(card.published_at)}` : undefined}>
            <div className="p-4"><div className="mx-auto max-w-xl rounded-xl border border-slate-200 p-4">
              <h3 className="text-center text-base font-bold text-slate-900">{card.school}</h3>
              <p className="border-b border-slate-400 pb-3 text-center text-[11px] text-slate-500">Report card · {card.exam} · {card.year}</p>
              <div className="my-4"><Pairs rows={[["Student", card.name], ["Class", [card.class_label, card.roll_no ? `roll ${card.roll_no}` : ""].filter(Boolean).join(" · ")], ["Admission no.", card.registration_no]]} /></div>
              <table className="w-full text-[12px]">
                <thead className="bg-[#f3f9fd] text-[10.5px] uppercase text-slate-500"><tr>{["Subject", "Marks", "Out of", "%", "Grade"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{card.subjects.map((s) => <tr key={s.name}><td className="px-2 py-1.5">{s.name}</td><td className="px-2">{s.marks ?? "—"}</td><td className="px-2">{card.max}</td><td className="px-2">{s.pct === null ? "—" : `${s.pct}%`}</td><td className="px-2">{s.grade}</td></tr>)}
                  <tr className="font-bold"><td className="px-2 py-1.5" colSpan={3}>Overall</td><td className="px-2">{card.pct === null ? "—" : `${card.pct}%`}</td><td className="px-2">{card.grade}</td></tr></tbody>
              </table>
              {card.coscholastic.length > 0 && <table className="mt-3 w-full text-[12px]"><thead className="bg-[#f3f9fd] text-[10.5px] uppercase text-slate-500"><tr><th className="px-2 py-1.5 text-left font-medium">Co-scholastic area</th><th className="px-2 text-left font-medium">Grade</th></tr></thead><tbody className="divide-y divide-slate-100">{card.coscholastic.map((c) => <tr key={c.area}><td className="px-2 py-1.5">{c.area}</td><td className="px-2">{c.grade}</td></tr>)}</tbody></table>}
              <p className="mt-3 text-[12px] text-slate-900"><b>Attendance:</b> {card.attendance === null ? "—" : `${card.attendance}%`}{card.remark && <> · <b>Class teacher&apos;s remark:</b> {card.remark}</>}</p>
            </div></div>
          </Panel>
        ))}</Loaded>
      </div>
    </>
  );
}

export function SubjectMarks() {
  const { child } = useParent();
  const r = useRecords<Results>("marks");
  return (
    <>
      <Head title="Subject-wise Marks" subtitle="Marks in every subject for each test this year." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (!d.cards.length ? <Empty>{NONE}</Empty> : (
          <DataTable title={`Subject-wise marks · ${child?.first_name ?? ""}`} sub={`${d.subjects.length} subjects`} name="subject-marks" search
            head={[{ h: "Subject" }, ...d.cards.map((c) => ({ h: `${c.exam} /${c.max}` })), { h: "Average" }, { h: "Grade" }]}
            rows={d.subjects.map((s) => { const m = d.cards.map((c) => s.marks.find((x) => x.exam_id === c.exam_id)); return row(
              [s.name, ...m.map((x) => x?.marks ?? "—"), s.average ?? "—", s.grade],
              [bold(s.name), ...m.map((x, i) => (x?.marks == null ? "—" : <span key={i}>{x.marks} <span className="text-[11px] text-slate-500">{x.pct}%</span></span>)), bold(s.average === null ? "—" : `${s.average}%`), s.grade ? <Status key="g" value={s.grade} /> : "—"]); })} />
        ))}</Loaded>
      </div>
    </>
  );
}

interface Cos { terms: string[]; items: { area: string; about: string; grades: Record<string, string> }[] }
export function CoScholastic() {
  const { child } = useParent();
  const r = useRecords<Cos>("coscholastic");
  return (
    <>
      <Head title="Co-Scholastic Grades" subtitle="Grades for activities beyond the classroom. A is outstanding, B is very good, C needs support." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => { const terms = d.terms.length ? d.terms : ["Term 1"]; return (
          <DataTable title={`Co-scholastic grades · ${child?.first_name ?? ""}`} sub={`${d.items.length} areas`} name="co-scholastic-grades" search head={[{ h: "Area" }, { h: "What's assessed" }, ...terms.map((t) => ({ h: t }))]} empty="Grades have not been entered yet."
            rows={d.items.map((x) => row([x.area, x.about, ...terms.map((t) => x.grades[t] ?? "—")], [bold(x.area), x.about, ...terms.map((t) => (x.grades[t] ? <Status key={t} value={x.grades[t]} /> : "—"))]))} />
        ); }}</Loaded>
      </div>
    </>
  );
}

interface Sched { exams: { id: string; name: string }[]; exam: { id: string; name: string } | null; items: { date: string; day: string; subject: string; starts: string; ends: string; max_marks: number | null; syllabus: string; reporting: string }[] }
export function ExamSchedule() {
  const { child } = useParent();
  const [exam, setExam] = useState("");
  const r = useRecords<Sched>("schedule", exam);
  const d = r.data;
  const reach = d?.items[0]?.reporting;
  const name = `date-sheet-${d?.exam?.name ?? "exam"}`;
  const head = ["Date", "Day", "Subject", "Time", "Max marks", "Syllabus"];
  const values = (d?.items ?? []).map((p) => [dmy(p.date), p.day, p.subject, `${p.starts} – ${p.ends}`, p.max_marks ?? "—", p.syllabus || "—"]);
  return (
    <>
      <Head title="Exam Schedule" subtitle={d?.exam ? `${d.exam.name} for ${child?.class_label ?? ""}.${reach ? ` Reach school by ${reach} on exam days.` : ""}` : "Upcoming exam dates for your child's class."} action={values.length ? <button type="button" className={whiteBtn} onClick={() => { armPrint(); downloadCsv(name, head, values); }}>Download date sheet</button> : undefined} />
      <div className="space-y-4">
        <ChildBar>{d && d.exams.length > 1 && <Select label="Exam" value={d.exam?.id ?? ""} onChange={setExam} options={d.exams.map((e) => [e.id, e.name])} />}</ChildBar>
        <Loaded r={r}>{(s) => (!s.exam ? <Empty>No exam is scheduled for this class yet.</Empty> : (
          <DataTable title={`${s.exam.name} · ${child?.class_label ?? ""}`} sub={`${s.items.length} papers`} name={name} search head={head.map((h) => ({ h }))} empty="The date sheet is not published yet."
            rows={s.items.map((p) => row([p.date, p.day, p.subject, `${p.starts} – ${p.ends}`, p.max_marks ?? "—", p.syllabus || "—"], [bold(dmy(p.date)), p.day, p.subject, `${p.starts} – ${p.ends}`, p.max_marks ?? "—", p.syllabus || "—"]))} />
        ))}</Loaded>
      </div>
    </>
  );
}

export function ProgressReports() {
  const { child } = useParent();
  const r = useRecords<Results>("progress");
  return (
    <>
      <Head title="Progress Reports" subtitle={`How ${child?.first_name ?? "your child"} has progressed through the year.`} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => {
          if (!d.tests.length) return <Empty>{NONE}</Empty>;
          const now = d.tests[d.tests.length - 1], start = d.tests[0];
          const ranked = d.subjects.filter((s) => s.average !== null).sort((a, b) => (b.average as number) - (a.average as number));
          const diff = Math.round((now.pct - start.pct) * 10) / 10;
          return (
            <>
              <Tiles items={[
                { label: "Overall now", value: `${now.pct}%`, sub: d.tests.length > 1 ? `${diff > 0 ? "+" : ""}${diff} pts since ${start.name}` : now.name },
                { label: "Strongest", value: ranked[0]?.name ?? "—", sub: "Average across tests" },
                { label: "Needs attention", value: ranked.length > 1 ? ranked[ranked.length - 1].name : "—", sub: "Lowest average", tone: "amber" },
              ]} />
              <Panel title="Overall result by test" sub="%"><CountBars rows={d.tests.map((t) => [t.name, t.pct] as [string, number])} format={(n) => `${n}%`} /></Panel>
              <DataTable title="Progress by subject" sub={`${d.subjects.length} subjects`} name="progress-by-subject" head={[{ h: "Subject" }, { h: "First test" }, { h: "Latest test" }, { h: "Change" }]}
                rows={d.subjects.map((s) => row([s.name, s.first ?? "—", s.latest ?? "—", s.change ?? "—"], [bold(s.name), s.first === null ? "—" : `${s.first}%`, s.latest === null ? "—" : `${s.latest}%`, s.change === null ? "—" : <span key="c" className={s.change < 0 ? "text-[#ac2c28]" : "text-[#065740]"}>{s.change > 0 ? `+${s.change}` : s.change}</span>]))} />
            </>
          );
        }}</Loaded>
      </div>
    </>
  );
}

export function HolisticCard() {
  const r = useRecords<{ domains: string[]; items: { term: string; domains: Record<string, string>; comment: string }[] }>("holistic");
  return (
    <>
      <Head title="Holistic Progress Card" subtitle="How the class teacher sees your child's growth across six areas." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (!d.items.length ? <Empty>The class teacher has not filled in the holistic progress card yet.</Empty> : <>{d.items.map((c) => (
          <Panel key={c.term} title={c.term}>
            <div className="p-4"><Pairs rows={[...d.domains.map((x) => [x, c.domains[x] ? <Status key={x} value={c.domains[x]} /> : "—"] as [string, React.ReactNode]), ["Teacher's comment", c.comment]]} /></div>
          </Panel>
        ))}</>)}</Loaded>
      </div>
    </>
  );
}

interface Seat { exams: { id: string; name: string }[]; exam: { id: string; name: string } | null; hall?: string; items: { date: string; subject: string; starts: string; ends: string; hall: string }[] }
export function ExamSeat() {
  const [exam, setExam] = useState("");
  const r = useRecords<Seat>("seat", exam);
  const d = r.data;
  return (
    <>
      <Head title="Exam Seat" subtitle="The room and seat for your child's upcoming papers." />
      <div className="space-y-4">
        <ChildBar>{d && d.exams.length > 1 && <Select label="Exam" value={d.exam?.id ?? ""} onChange={setExam} options={d.exams.map((e) => [e.id, e.name])} />}</ChildBar>
        <Loaded r={r}>{(s) => (!s.exam ? <Empty>No exam is scheduled for this class yet.</Empty> : (
          <>
            {s.hall && <Note>{s.exam.name}: <b>{s.hall}</b></Note>}
            <DataTable title="Papers and seat" sub={`${s.items.length} papers`} name="exam-seat" head={[{ h: "Date" }, { h: "Day" }, { h: "Subject" }, { h: "Time" }, { h: "Room and seat" }]} empty="No seat has been allotted yet."
              rows={s.items.map((p) => row([p.date, weekday(p.date), p.subject, `${p.starts} – ${p.ends}`, p.hall], [bold(dmy(p.date)), weekday(p.date), p.subject, `${p.starts} – ${p.ends}`, p.hall]))} />
          </>
        ))}</Loaded>
      </div>
    </>
  );
}

interface Syl { subjects: { name: string; chapters: number; completed: number; pct: number }[]; chapters: { id: string; subject: string; chapter: string; periods: number; month: string; status: string; progress: number }[] }
export function Syllabus() {
  const r = useGet<Syl>(useChildPath("/parent/academics/syllabus"));
  return (
    <>
      <Head title="Syllabus Progress" subtitle="Subjects this year and how far each has been taught." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (!d.chapters.length ? <Empty>The syllabus has not been entered for this class yet.</Empty> : (
          <>
            <Panel title="Covered so far" sub="By subject"><CountBars rows={d.subjects.map((s) => [s.name, s.pct] as [string, number])} format={(n) => `${n}%`} /></Panel>
            <DataTable title="Chapters" sub={`${d.chapters.length} chapters`} name="syllabus" search head={[{ h: "Subject" }, { h: "Chapter" }, { h: "Planned month" }, { h: "Periods" }, { h: "Status" }]}
              rows={d.chapters.map((c) => row([c.subject, c.chapter, c.month || "—", c.periods, c.status], [bold(c.subject), c.chapter, c.month || "—", c.periods, <Status key="s" value={c.status} />]))} />
          </>
        ))}</Loaded>
      </div>
    </>
  );
}

interface Tt { published: boolean; class_teacher: string; periods: { id: string; label: string; starts: string; ends: string; kind: string }[]; slots: { day: number; period_id: string; subject: string; teacher: string }[]; substitutions: { period_id: string; subject: string; teacher: string }[] }
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function Timetable() {
  const r = useGet<Tt>(useChildPath("/parent/academics/timetable"));
  return (
    <>
      <Head title="Class Timetable" subtitle="The week's periods for your child's class." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(t) => {
          if (!t.published) return <Empty>The timetable for this class has not been published yet.</Empty>;
          const at = (day: number, p: string) => t.slots.find((s) => s.day === day && s.period_id === p);
          const days = DAYS.filter((_, i) => i < 5 || t.slots.some((s) => s.day === i + 1));
          const values = t.periods.map((p) => [`${p.label} ${p.starts}–${p.ends}`, ...days.map((_, i) => (p.kind === "Break" ? p.label : at(i + 1, p.id)?.subject ?? "—"))]);
          return (
            <>
              {t.substitutions.length > 0 && <Note tone="amber">Today: {t.substitutions.map((s) => `${t.periods.find((p) => p.id === s.period_id)?.label ?? "A period"} is taken by ${s.teacher}${s.subject ? ` (${s.subject})` : ""}`).join("; ")}.</Note>}
              <Panel title="Weekly timetable" right={<button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:border-slate-400" onClick={() => downloadCsv("class-timetable", ["Period", ...days], values)}>Export</button>}>
                <div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-[12px]">
                  <thead className="bg-[#f3f9fd] text-[10.5px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left font-semibold">Period</th>{days.map((d) => <th key={d} className="px-3 py-2 text-left font-semibold">{d}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">{t.periods.map((p) => <tr key={p.id}><th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-900">{p.label}<span className="block text-[11px] font-normal text-slate-500">{p.starts} – {p.ends}</span></th>
                    {p.kind === "Break" ? <td colSpan={days.length} className="bg-slate-50 px-3 py-2 text-center text-slate-500">{p.label}</td> : days.map((d, i) => { const s = at(i + 1, p.id); return <td key={d} className="px-3 py-2 align-top">{s ? <><span className="block text-slate-900">{s.subject || "—"}</span><span className="block text-[11px] text-slate-500">{s.teacher}</span></> : "—"}</td>; })}</tr>)}</tbody>
                </table></div>
              </Panel>
            </>
          );
        }}</Loaded>
      </div>
    </>
  );
}

interface Comp { programmes: { id: string; name: string; exams: string; schedule: string; mentor: string }[]; tests: { id: string; name: string; date: string; programme: string; score: number }[]; registrations: { id: string; exam: string; exam_date: string; fee: number; status: string }[] }
export function Competitive() {
  const r = useGet<Comp>(useChildPath("/parent/academics/competitive"));
  return (
    <>
      <Head title="Competitive Prep" subtitle="Olympiad and entrance preparation: programmes, practice test scores and exam registrations." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (
          <>
            <DataTable title="Programmes" sub={`${d.programmes.length} joined`} head={[{ h: "Programme" }, { h: "Prepares for" }, { h: "Sessions" }, { h: "Mentor" }]} empty="Your child is not in a preparation programme." rows={d.programmes.map((p) => row([p.name, p.exams, p.schedule, p.mentor || "—"], [bold(p.name), p.exams, p.schedule, p.mentor || "—"]))} />
            <DataTable title="Practice test scores" sub={`${d.tests.length} tests`} name="practice-tests" head={[{ h: "Date" }, { h: "Test" }, { h: "Programme" }, { h: "Score" }]} empty="No test scores yet." rows={d.tests.map((t) => row([t.date, t.name, t.programme, t.score], [dmy(t.date), bold(t.name), t.programme, `${t.score}%`]))} />
            <DataTable title="Exam registrations" sub={`${d.registrations.length} exams`} name="exam-registrations" head={[{ h: "Exam" }, { h: "Exam date" }, { h: "Fee" }, { h: "Status" }]} empty="No exam registrations yet." rows={d.registrations.map((x) => row([x.exam, x.exam_date, x.fee, x.status], [bold(x.exam), dmy(x.exam_date), x.fee ? `₹${x.fee.toLocaleString("en-IN")}` : "Free", <Status key="s" value={x.status} />]))} />
          </>
        )}</Loaded>
      </div>
    </>
  );
}

// ═════════════ attendance ═════════════
interface Att { year_name: string; year: { days: number; present: number; absent: number; late: number; leave: number; pct: number | null }; months: Parameters<typeof monthTable>[0]; records: { date: string; status: string }[]; leaves: { id: string; code: string; leave_type: string; from_date: string; to_date: string; days: number; applied_on: string; status: string }[] }
const useAttendance = () => useGet<Att>(useChildPath("/parent/attendance"));

export function AttendanceMonthly() {
  const r = useAttendance();
  return (
    <>
      <Head title="Monthly Summary" subtitle="Attendance month by month, as marked by the teachers." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(a) => (
          <>
            <Tiles items={[{ label: "This year", value: a.year.pct === null ? "—" : `${a.year.pct}%`, sub: `${a.year.present} of ${a.year.days} days` }, { label: "Absent", value: a.year.absent, sub: "Days this year", tone: "red" }, { label: "Late", value: a.year.late, sub: "Days this year", tone: "amber" }, { label: "On leave", value: a.year.leave, sub: "Approved days" }]} />
            <MonthlyChart months={a.months} year={a.year_name} />
            {monthTable(a.months, "monthly-attendance")}
          </>
        )}</Loaded>
      </div>
    </>
  );
}
export function AttendanceDaily() {
  const r = useAttendance();
  return (
    <>
      <Head title="Daily Record" subtitle="Each school day this year." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(a) => <DataTable title="Daily attendance" sub={`${a.records.length} days`} name="daily-attendance" search head={[{ h: "Date" }, { h: "Day" }, { h: "Status" }]} empty="No attendance marked yet." rows={a.records.map((x) => row([x.date, weekday(x.date), x.status], [bold(dmy(x.date)), weekday(x.date), <Status key="s" value={x.status} />]))} />}</Loaded>
      </div>
    </>
  );
}

export const LEAVE_TYPES = ["Sick leave", "Family function", "Travel", "Other"];
export function LeaveApplications() {
  const { child } = useParent();
  const r = useAttendance();
  const [f, setF] = useState({ leave_type: LEAVE_TYPES[0], from_date: "", to_date: "" });
  const [done, setDone] = useState("");
  const act = useAction(r.reload);
  const field = `${inputCls} !py-1.5 text-[12.5px]`;
  return (
    <>
      <Head title="Leave Applications" subtitle="Apply for leave for your child. The class teacher approves it." />
      <div className="space-y-4">
        <ChildBar />
        <form onSubmit={(e) => { e.preventDefault(); setDone(""); void act.run(async () => { const x = await schoolFetch<{ code: string }>("/parent/requests", json("POST", { type: "leave", student_id: child?.id, ...f, to_date: f.to_date || f.from_date })); setF({ leave_type: LEAVE_TYPES[0], from_date: "", to_date: "" }); setDone(`Leave application ${x.code} sent to the class teacher.`); }); }}>
          <Panel title="Apply for leave">
            <ErrorBanner message={act.error} />
            <div className="grid gap-3.5 p-4 sm:grid-cols-3">
              <Lbl label="Reason"><select className={field} value={f.leave_type} onChange={(e) => setF({ ...f, leave_type: e.target.value })}>{LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Lbl>
              <Lbl label="From"><input type="date" required className={field} value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value })} /></Lbl>
              <Lbl label="To"><input type="date" className={field} min={f.from_date} value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></Lbl>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3">{done && <span role="status" className="mr-auto text-[13px] font-semibold text-emerald-700">{done}</span>}<button type="submit" className={bluePill} disabled={act.busy || !child}>Send application</button></div>
          </Panel>
        </form>
        <Loaded r={r}>{(a) => <DataTable title="Your leave applications" sub={`${a.leaves.length} applications`} name="leave-applications" head={[{ h: "Number" }, { h: "Reason" }, { h: "From" }, { h: "To" }, { h: "Days" }, { h: "Status" }]} empty="No leave applied for yet." rows={a.leaves.map((l) => row([l.code, l.leave_type, l.from_date, l.to_date, l.days, l.status], [l.code, l.leave_type, dmy(l.from_date), dmy(l.to_date), l.days, <Status key="s" value={l.status} />]))} />}</Loaded>
      </div>
    </>
  );
}
