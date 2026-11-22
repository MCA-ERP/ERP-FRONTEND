"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn, whiteBtn } from "./head";
import { Empty, Loading } from "./dash-pages";
import { Bars, PillSelect, SearchBox, smallBtn, usePickedSection } from "./ui";

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const pctText = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
const mon = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" });
const print = (name: string, head: string[], rows: (string | number | null)[][]) => { armPrint(); downloadCsv(name, head, rows); };

interface Reg { sections: { id: string; label: string }[] }
interface Att { label: string; students: number; year: string; this_year: number | null; this_month: number | null; full: number; months: { month: string; percent: number | null }[]; current_month: string; below: { id: string; roll_no: string; name: string; attendance: number; days_absent: number; father: string; mobile: string }[] }

export function ReportAttendance() {
  const reg = useLoad(() => schoolFetch<Reg>("/teacher/attendance/registers"), []);
  const [sec, pick] = usePickedSection(reg.data?.sections ?? [], null);
  const { data, error, loading } = useLoad(() => (sec ? schoolFetch<Att>(`/teacher/reports/attendance/${sec}`) : Promise.resolve(null)), [sec]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Att["below"][number] | null>(null);
  const rows = (data?.below ?? []).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Attendance" subtitle={`Attendance report for ${data?.label ?? "your class"}${data?.year ? `, ${data.year.replace(/^(\d{4})-\d{2}(\d{2})$/, "$1–$2")}` : ""}.`} action={<button type="button" className={redBtn} disabled={!data} onClick={() => data && print(`attendance-${data.label}`, ["Roll", "Student", "Attendance", "Days absent", "Father", "Mobile"], data.below.map((s) => [s.roll_no, s.name, `${s.attendance}%`, s.days_absent, s.father, s.mobile]))}>Download report</button>} />
      <ErrorBanner message={reg.error || error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !reg.data.sections.length && <Panel title="Attendance report"><Empty text="Attendance reports are for the class teacher. You are not a class teacher this year." /></Panel>}
      {reg.data && reg.data.sections.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={reg.data.sections.map((s) => ({ value: s.id, label: s.label }))} right={data ? `${data.label} · ${data.students} students · you're the class teacher` : ""} />
          {data && (
            <>
              <Tiles items={[{ label: "This year", value: pctText(data.this_year), sub: `${data.students} students` }, { label: "This month", value: pctText(data.this_month), sub: "Month to date" }, { label: "Below 85%", value: data.below.length, sub: "Parents informed" }, { label: "Full attendance", value: data.full, sub: "97% and above" }]} />
              <Panel title="Monthly attendance" sub={data.label}>
                {!data.months.length ? <Empty text="Attendance has not been marked this year yet." /> : (
                  <div className="px-5 pb-3 pt-4"><div className="flex h-48 items-end gap-3 border-b border-slate-200">{data.months.map((m) => <div key={m.month} className="flex flex-1 flex-col items-center justify-end"><span className="mb-1 text-[11px] tabular-nums text-slate-600">{pctText(m.percent)}</span><span className={`w-full max-w-[4.5rem] rounded-t-md ${m.month === data.current_month ? "bg-[#c0e4f3]" : "bg-[#7fc9e6]"}`} style={{ height: `${Math.max(2, ((m.percent ?? 0) / 100) * 150)}px` }} /></div>)}</div><div className="mt-1 flex gap-3">{data.months.map((m) => <span key={m.month} className="flex-1 text-center text-[12px] text-slate-600">{mon(m.month)}</span>)}</div></div>
                )}
              </Panel>
              <Panel title="Students below 85%" sub={`${data.below.length} students`} right={<ExportPrint name="students-below-85" head={["Roll", "Student", "Attendance", "Days absent", "Father", "Mobile"]} rows={rows.map((s) => [s.roll_no, s.name, `${s.attendance}%`, s.days_absent, s.father, s.mobile])} />}>
                <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search students below 85%" /></div>
                <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Attendance" }, { h: "Days absent" }, { h: "Father" }, { h: "Mobile" }, { h: "" }]} empty="Every student is at 85% or above." rows={rows.map((s) => [s.roll_no, <b key="n" className="font-semibold text-slate-900">{s.name}</b>, <span key="a" className="font-semibold text-[#ac2c28]">{s.attendance}%</span>, s.days_absent, s.father || "—", s.mobile || "—", <span key="b" className="flex gap-1.5">{s.mobile && <a href={`tel:${s.mobile.replace(/\s/g, "")}`} className={smallBtn}>Call parent</a>}<button type="button" className={smallBtn} onClick={() => setView(s)}>View details</button></span>])} />
              </Panel>
            </>
          )}
        </div>
      )}
      {view && <Modal open title={view.name} onClose={() => setView(null)}><KV rows={[["Roll", view.roll_no], ["Attendance", `${view.attendance}%`], ["Days absent", view.days_absent], ["Father", view.father || "—"], ["Mobile", view.mobile || "—"]]} /></Modal>}
    </div>
  );
}

interface Acad { label: string; subject: string; students: number; average: number | null; pass_rate: number | null; top_score: { percent: number; name: string } | null; below_50: number; by_assessment: { name: string; percent: number | null }[]; grades: { grade: string; n: number }[]; top5: { id: string; roll_no: string; name: string; percent: number }[]; support: { id: string; roll_no: string; name: string; percent: number; attendance: number | null }[]; exams: string[]; is_class_teacher: boolean }
export function ReportAcademic() {
  const reg = useLoad(() => schoolFetch<{ sections: { id: string; label: string; subject: string; is_class_teacher: boolean }[] }>("/teacher/reports/sections"), []);
  const [sec, pick] = usePickedSection(reg.data?.sections ?? [], null);
  const { data, error, loading } = useLoad(() => (sec ? schoolFetch<Acad>(`/teacher/reports/academic/${sec}`) : Promise.resolve(null)), [sec]);
  return (
    <div data-report>
      <Head title="Academic Performance" subtitle={`${data?.subject ?? "Subject"} performance for ${data?.label ?? "your class"} this term.`} action={<button type="button" className={redBtn} disabled={!data} onClick={() => data && print(`academic-${data.label}`, ["Student", "Percent"], [...data.top5.map((s) => [s.name, `${s.percent}%`]), ...data.support.map((s) => [`${s.name} (needs support)`, `${s.percent}%`])])}>Download report</button>} />
      <ErrorBanner message={reg.error || error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !reg.data.sections.length && <Panel title="Academic performance"><Empty text="You have no classes with a subject yet." /></Panel>}
      {reg.data && reg.data.sections.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={reg.data.sections.map((s) => ({ value: s.id, label: s.label }))} right={data ? `${data.label} · ${data.students} students${data.is_class_teacher ? " · you're the class teacher" : ""}` : ""} />
          {data && (
            <>
              <Tiles items={[{ label: "Average", value: pctText(data.average), sub: data.exams.join(" + ") || "No marks yet" }, { label: "Pass rate", value: pctText(data.pass_rate) }, { label: "Top score", value: pctText(data.top_score?.percent), sub: data.top_score?.name }, { label: "Below 50%", value: data.below_50, sub: "Remedial classes" }]} />
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Average by assessment" sub="%"><Bars rows={data.by_assessment.map((a) => ({ label: a.name, value: a.percent }))} /></Panel>
                <Panel title="Grade distribution" sub="Students"><Bars max={Math.max(1, ...data.grades.map((g) => g.n))} rows={data.grades.map((g) => ({ label: g.grade, value: g.n, note: String(g.n) }))} /></Panel>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Top 5">{!data.top5.length ? <Empty text="No marks yet." /> : <ul className="divide-y divide-slate-100">{data.top5.map((s, i) => <li key={s.id} className="flex items-center gap-3 px-5 py-2.5"><span className="grid size-7 place-items-center rounded-lg bg-[#d9efe8] text-[12px] font-bold text-[#065740]">{i + 1}</span><div className="flex-1"><p className="text-[13px] font-semibold text-slate-900">{s.name}</p><p className="text-[11px] text-slate-500">Roll {s.roll_no}</p></div><span className="text-[12px] tabular-nums text-slate-700">{s.percent}%</span></li>)}</ul>}</Panel>
                <Panel title="Need support" sub="Lowest 5">{!data.support.length ? <Empty text="No marks yet." /> : <ul className="divide-y divide-slate-100">{data.support.map((s) => <li key={s.id} className="flex items-center gap-3 px-5 py-2.5"><span className="grid size-7 place-items-center rounded-lg bg-[#f8ecd6] text-[12px] font-bold text-[#8a5a0b]">!</span><div className="flex-1"><p className="text-[13px] font-semibold text-slate-900">{s.name}</p><p className="text-[11px] text-slate-500">Roll {s.roll_no}{s.attendance !== null ? ` · attendance ${s.attendance}%` : ""}</p></div><span className="text-[12px] tabular-nums text-slate-700">{s.percent}%</span></li>)}</ul>}</Panel>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SR { student: { name: string; class_label: string }; attendance_pct: number | null; subject_pct: number | null; homework_pct: number | null; rank: { n: number; of: number } | null; subject: string; grade: string; section_average: number | null; term: string; assessments: { name: string; score: number | null; max: number; class_average: number | null }[]; remark: string }
export function ReportStudent() {
  const reg = useLoad(() => schoolFetch<{ sections: { id: string; label: string }[] }>("/teacher/reports/sections"), []);
  const dir = useLoad(() => schoolFetch<{ items: { id: string; section_id: string; roll_no: string; name: string }[] }>("/teacher/students"), []);
  const [sec, pick] = usePickedSection(reg.data?.sections ?? [], null);
  const list = (dir.data?.items ?? []).filter((s) => s.section_id === sec);
  const [stuPick, setStu] = useState("");
  const stu = list.some((s) => s.id === stuPick) ? stuPick : list[0]?.id ?? "";
  const { data, error, loading, reload } = useLoad(() => (stu ? schoolFetch<SR>(`/teacher/reports/student/${stu}`) : Promise.resolve(null)), [stu]);
  const act = useAction(reload);
  const [edit, setEdit] = useState<{ for: SR; v: string } | null>(null);
  const text = data ? (edit?.for === data ? edit.v : data.remark) : "";
  const [done, setDone] = useState("");
  const save = async (share: boolean) => { setDone(""); if (await act.run(() => schoolFetch("/teacher/reports/remark", json("POST", { student_id: stu, remark: text, share })))) { setEdit(null); setDone(share ? "Saved and sent to the parent." : "Saved."); } };
  return (
    <div data-report>
      <Head title="Individual Performance" subtitle={`One student's ${data?.subject ?? ""} report for this term.`} action={<span className="flex gap-2"><button type="button" className={redBtn} disabled={!data} onClick={() => data && print(`report-${data.student.name}`, ["Item", "Student", "Class average"], [[`${data.subject} overall`, pctText(data.subject_pct), pctText(data.section_average)], ["Attendance", pctText(data.attendance_pct), ""], ["Homework done", pctText(data.homework_pct), ""], ...data.assessments.map((a) => [a.name, a.score === null ? "" : `${a.score}/${a.max}`, a.class_average === null ? "" : String(a.class_average)])])}>Download report</button><button type="button" className={whiteBtn} disabled={!data || !text.trim() || act.busy} onClick={() => void save(true)}>Share with parent</button></span>} />
      <ErrorBanner message={reg.error || dir.error || error || act.error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !reg.data.sections.length && <Panel title="Individual performance"><Empty text="You have no classes yet." /></Panel>}
      {reg.data && reg.data.sections.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={sec} onChange={(e) => { pick(e.target.value); setStu(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{reg.data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Student<select aria-label="Student" value={stu} onChange={(e) => setStu(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{list.map((s) => <option key={s.id} value={s.id}>{s.roll_no}. {s.name}</option>)}</select></label>
          </div>
          {data && (
            <>
              <Tiles items={[{ label: data.subject || "Subject", value: pctText(data.subject_pct), sub: `${data.grade ? `${data.grade} · ` : ""}section average ${pctText(data.section_average)}` }, { label: "Rank", value: data.rank ? `${data.rank.n} of ${data.rank.of}` : "—", sub: data.student.class_label.split(" · ")[0] }, { label: "Attendance", value: pctText(data.attendance_pct), sub: data.attendance_pct === null ? "Not marked yet" : data.attendance_pct >= 85 ? "On track" : "Below 85%" }, { label: "Homework done", value: pctText(data.homework_pct), sub: "This term" }]} />
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <Panel title="Assessments" sub="Student vs section average">
                  {!data.assessments.length ? <Empty text="No marks have been entered yet." /> : <div className="space-y-3 px-5 py-4">{data.assessments.map((a) => <div key={a.name} className="flex items-center gap-3 text-[12.5px]"><span className="w-32 shrink-0 text-slate-900">{a.name}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${a.score === null ? 0 : (a.score / a.max) * 100}%` }} /></span><span className="w-28 text-right tabular-nums text-slate-700">{a.score ?? "—"} / {a.max}{a.class_average !== null ? ` · class ${a.class_average}` : ""}</span></div>)}</div>}
                </Panel>
                <Panel title="Teacher's remark" right={<button type="button" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-3 !py-1 text-[12px]`} onClick={() => void save(false)}>Save</button>}>
                  <div className="p-5"><label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Remark for the report</span><textarea className={`${inputCls} min-h-[7rem]`} maxLength={500} value={text} onChange={(e) => setEdit({ for: data, v: e.target.value })} /></label>{done && <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">{done}</p>}</div>
                </Panel>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
