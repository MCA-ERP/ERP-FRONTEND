"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { PillSelect, SearchBox, blueBtn, smallBtn, usePickedSection, useSelectedSection } from "./ui";
const DIR = "/teacher/classes/student-directory";

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const L = ({ label, children }: { label: string; children: ReactNode }) => <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const pctText = (v: number | null) => (v === null ? "—" : `${v}%`);

// ═════════════ assigned classes ═════════════
interface ClassData { classes: { class: string; subject: string; sections: string; students: number; periods: number }[]; sections: number; students: number; periods: number; limit: number; class_teacher: { label: string; students: number } | null }
export function ClassList({ go }: { go: (tab: string) => void }) {
  const { data, error, loading } = useLoad(() => schoolFetch<ClassData>("/teacher/classes"), []);
  const [q, setQ] = useState("");
  const items = useMemo(() => (data?.classes ?? []).filter((c) => !q || `${c.class} ${c.subject} ${c.sections}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <div data-report>
      <Head title="Class List" subtitle="The classes you teach this year and your load." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Classes", value: data.classes.length, sub: `${data.sections} sections` }, { label: "Students", value: data.students, sub: "Across all sections" }, { label: "Periods a week", value: data.periods, sub: `Limit ${data.limit}` }, { label: "Class teacher", value: data.class_teacher?.label.replace(/^Class /, "Class ") ?? "—", sub: data.class_teacher ? `${data.class_teacher.students} students` : "You are not a class teacher" }]} />
          <Panel title="Class list" sub={`${data.classes.length} ${data.classes.length === 1 ? "class" : "classes"}`} right={<ExportPrint name="my-classes" head={["Class", "Subject", "Sections", "Students", "Periods a week"]} rows={items.map((c) => [c.class, c.subject, c.sections, c.students, c.periods])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search class list" /></div>
            <SimpleTable head={[{ h: "Class" }, { h: "Subject" }, { h: "Sections" }, { h: "Students" }, { h: "Periods a week" }, { h: "" }]} empty="You have no classes assigned yet." rows={items.map((c) => [<b key="c" className="font-semibold text-slate-900">{c.class}</b>, c.subject || "—", c.sections, c.students, c.periods, <button key="s" type="button" className={smallBtn} onClick={() => go("section-list")}>Sections</button>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

interface SecRow { id: string; label: string; students: number; periods: number; room: string | null; class_teacher: string; is_mine: boolean; attendance_pct: number | null; today_marked: boolean; syllabus: number | null }
export function SectionList() {
  const router = useRouter();
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: SecRow[]; default_id: string | null }>("/teacher/classes/sections"), []);
  const [sel, pick] = usePickedSection(data?.items ?? [], data?.default_id);
  const [q, setQ] = useState("");
  const items = useMemo(() => (data?.items ?? []).filter((s) => !q || `${s.label} ${s.class_teacher} ${s.room}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const cur = data?.items.find((s) => s.id === sel);
  return (
    <div data-report>
      <Head title="Section List" subtitle="Pick the section you're working with. Attendance, homework, marks and the diary open on it." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          {cur && <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-800">Working on <b>{cur.label}</b>. Change it here or from the Section box on any page.</p>}
          <Panel title="Section list" sub={`${data.items.length} sections`} right={<ExportPrint name="my-sections" head={["Section", "Students", "Periods a week", "Room", "Class teacher", "Attendance", "Syllabus"]} rows={items.map((s) => [s.label, s.students, s.periods, s.room ? `Room ${s.room}` : "", s.class_teacher, s.attendance_pct, s.syllabus])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search section list" /></div>
            <SimpleTable head={[{ h: "Section" }, { h: "Students" }, { h: "Periods a week" }, { h: "Room" }, { h: "Class teacher" }, { h: "Today's attendance" }, { h: "Syllabus" }, { h: "" }]} empty="You have no sections yet." rows={items.map((s) => [
              <span key="s" className="flex items-center gap-2"><b className="font-semibold text-slate-900">{s.label}</b>{s.id === sel && <Chip tone="good">Selected</Chip>}</span>, s.students, s.periods, s.room ? `Room ${s.room}` : "—", s.class_teacher || "—",
              s.today_marked ? pctText(s.attendance_pct) : s.is_mine ? <Chip key="a" tone="warn">Not marked</Chip> : "—", pctText(s.syllabus),
              <span key="b" className="flex gap-1.5">{s.id !== sel && <button type="button" className={blueBtn} onClick={() => pick(s.id)}>Select</button>}<button type="button" className={smallBtn} onClick={() => { pick(s.id); router.push(`${DIR}?tab=student-list`); }}>Students</button></span>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ student directory ═════════════
interface Pupil { id: string; section_id: string; section: string; roll_no: string; name: string; gender: string; registration_no: string; father: string; mobile: string; attendance_pct: number | null }
interface Dir { sections: { id: string; label: string; students: number; attendance_pct: number | null; mine: boolean }[]; items: Pupil[] }

export function StudentList() {
  const router = useRouter();
  const [, pickSection] = useSelectedSection();
  const open = (id: string, section: string) => { pickSection(section); router.push(`${DIR}?tab=student-profile&student=${id}`); };
  const { data, error, loading } = useLoad(() => schoolFetch<Dir>("/teacher/students"), []);
  const [sec, setSec] = useState("");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Pupil | null>(null);
  const items = useMemo(() => (data?.items ?? []).filter((s) => (!sec || s.section_id === sec) && (!gender || s.gender.toLowerCase() === gender) && (!q || `${s.name} ${s.registration_no} ${s.father} ${s.mobile}`.toLowerCase().includes(q.toLowerCase()))), [data, sec, gender, q]);
  const total = data?.items.length ?? 0;
  return (
    <div data-report>
      <Head title="Student List" subtitle="Every student you teach, across all your sections. Pick a section to see one class." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...data.sections.map((s) => ({ value: s.id, label: s.label }))]} right={`${data.sections.length} sections · ${total} students`} />
          <Tiles items={data.sections.slice(0, 5).map((s) => ({ label: s.label, value: `${s.students} students`, sub: `${pctText(s.attendance_pct)} attendance${s.mine ? " · yours" : ""}` }))} />
          <Panel title={sec ? `${data.sections.find((s) => s.id === sec)?.label ?? ""}` : "All my students"} sub={`${items.length} students`} right={<ExportPrint name="my-students" head={["Section", "Roll", "Student", "Gender", "Admission no.", "Father", "Mobile", "Attendance"]} rows={items.map((s) => [s.section, s.roll_no, s.name, s.gender, s.registration_no, s.father, s.mobile, s.attendance_pct])} />}>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search all my students" />
              <select aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px]"><option value="">Boys and girls</option><option value="male">Boys</option><option value="female">Girls</option></select></div>
            <SimpleTable head={[{ h: "Section" }, { h: "Roll" }, { h: "Student" }, { h: "Gender" }, { h: "Admission no." }, { h: "Father" }, { h: "Mobile" }, { h: "Attendance" }, { h: "" }]} empty="No students match." rows={items.map((s) => [s.section, s.roll_no, <button key="n" type="button" onClick={() => open(s.id, s.section_id)} className="font-semibold text-[#026f9b] hover:underline">{s.name}</button>, s.gender || "—", s.registration_no, s.father || "—", s.mobile || "—", pctText(s.attendance_pct), <button key="v" type="button" className={smallBtn} onClick={() => setView(s)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={view.name} onClose={() => setView(null)}><KV rows={[["Class", `${view.section} · roll ${view.roll_no}`], ["Admission no.", view.registration_no], ["Gender", view.gender || "—"], ["Father", view.father || "—"], ["Mobile", view.mobile || "—"], ["Attendance", pctText(view.attendance_pct)]]} /></Modal>}
    </div>
  );
}

interface Profile {
  student: { id: string; name: string; class_label: string; registration_no: string; gender: string | null; date_of_birth: string | null; blood_group: string; house: string };
  parents: { father: string; mother: string; mobile: string; address: string }; attendance_pct: number | null; subject_pct: number | null; homework_pct: number | null; rank: { n: number; of: number } | null;
  health: { allergies: string; conditions: string; blood_group: string; updated_on: string | null }; assessments: { name: string; marks: number; max: number }[]; subject: string;
}
const noneish = (s: string) => !s || /^(none|nil|no)$/i.test(s.trim());

export function StudentProfile() {
  const initial = { student: useSearchParams().get("student") ?? "" };
  const dir = useLoad(() => schoolFetch<Dir>("/teacher/students"), []);
  const [sec, pickSec] = usePickedSection(dir.data?.sections ?? [], null);
  const [stuPick, setStu] = useState(initial.student ?? "");
  const list = (dir.data?.items ?? []).filter((s) => s.section_id === sec);
  const stu = list.some((s) => s.id === stuPick) ? stuPick : list[0]?.id ?? "";
  const { data: p, error, loading } = useLoad(() => (stu ? schoolFetch<Profile>(`/teacher/students/${stu}`) : Promise.resolve(null)), [stu]);
  const exportIt = () => { if (!p) return; armPrint(); downloadCsv(`student-${p.student.name}`, ["Field", "Value"], [["Name", p.student.name], ["Class", p.student.class_label], ["Admission no.", p.student.registration_no], ["Father", p.parents.father], ["Mother", p.parents.mother], ["Mobile", p.parents.mobile], ["Attendance", p.attendance_pct === null ? "" : `${p.attendance_pct}%`], [`${p.subject} so far`, p.subject_pct === null ? "" : `${p.subject_pct}%`], ["Homework done", p.homework_pct === null ? "" : `${p.homework_pct}%`], ["Allergies", p.health.allergies], ["Medical condition", p.health.conditions]]); };
  return (
    <div data-report>
      <Head title="Student Profile" subtitle="Details, parents and progress for one student." action={<button type="button" className={whiteBtn} disabled={!p} onClick={exportIt}>Export profile</button>} />
      <ErrorBanner message={dir.error || error} />
      <Loading on={(dir.loading && !dir.data) || (loading && !p)} />
      {dir.data && (
        <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          {[["Section", sec, (v: string) => { pickSec(v); setStu(""); }, dir.data.sections.map((s) => ({ value: s.id, label: s.label }))] as const, ["Student", stu, setStu, list.map((s) => ({ value: s.id, label: `${s.roll_no}. ${s.name}` }))] as const].map(([label, value, on, opts]) => (
            <label key={label} className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}<select aria-label={label} value={value} onChange={(e) => on(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          ))}
        </div>
      )}
      {dir.data && !stu && <Panel title="Student"><Empty text="There are no students in this section." /></Panel>}
      {p && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Student"><div className="flex gap-5 p-5"><span className="grid size-24 shrink-0 place-items-center rounded-xl bg-[#dceff9] text-2xl font-bold text-[#026f9b]">{initials(p.student.name)}</span>
              <dl className="grid flex-1 grid-cols-[7rem_1fr] gap-y-2 text-[13px]">{([["Name", <b key="n">{p.student.name}</b>], ["Class", p.student.class_label], ["Admission no.", p.student.registration_no], ["Gender", p.student.gender || "—"], ["Date of birth", p.student.date_of_birth ? day(p.student.date_of_birth) : "—"], ["Blood group", p.student.blood_group || "—"], ["House", p.student.house || "—"]] as [string, ReactNode][]).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>)}</dl></div></Panel>
            <Panel title="Parents"><div className="p-5"><KV rows={[["Father", p.parents.father || "—"], ["Mother", p.parents.mother || "—"], ["Mobile", p.parents.mobile || "—"], ["Address", p.parents.address || "—"]]} /></div></Panel>
          </div>
          <Tiles items={[{ label: "Attendance", value: pctText(p.attendance_pct), sub: p.attendance_pct === null ? "Not marked yet" : p.attendance_pct >= 85 ? "On track" : "Below 85%" }, { label: `${p.subject || "Subject"} so far`, value: pctText(p.subject_pct), sub: p.assessments.length ? `${p.assessments.length} assessments` : "No marks yet" }, { label: "Homework done", value: pctText(p.homework_pct), sub: "This year" }, { label: "Rank in section", value: p.rank ? p.rank.n : "—", sub: p.rank ? `of ${p.rank.of}` : undefined }]} />
          <Panel title="Health & allergies" sub={!noneish(p.health.allergies) || !noneish(p.health.conditions) ? "Needs attention" : undefined}><div className="p-5"><KV rows={[["Allergies", p.health.allergies || "None"], ["Medical condition", p.health.conditions || "None"], ["Blood group", p.health.blood_group || "—"], ["Updated", p.health.updated_on ? day(p.health.updated_on) : "—"]]} /></div></Panel>
          <Panel title={`${p.subject || "Subject"} assessments`} sub="%">
            {!p.assessments.length ? <Empty text="No marks have been entered yet." /> : <div className="space-y-3 px-5 py-4">{p.assessments.map((a, i) => <div key={i} className="flex items-center gap-3 text-[12.5px]"><span className="w-44 shrink-0 truncate text-slate-900">{a.name}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${(a.marks / a.max) * 100}%` }} /></span><span className="w-16 text-right tabular-nums text-slate-700">{a.marks} / {a.max}</span></div>)}</div>}
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Alerts { label: string; students: number; alerts: number; allergies: number; conditions: number; items: { id: string; roll_no: string; name: string; allergy: string; condition: string; blood_group: string }[] }
export function HealthAlerts() {
  const router = useRouter();
  const openStudent = (id: string) => router.push(`${DIR}?tab=student-profile&student=${id}`);
  const reg = useLoad(() => schoolFetch<{ items: SecRow[]; default_id: string | null }>("/teacher/classes/sections"), []);
  const mine = (reg.data?.items ?? []).filter((s) => s.is_mine);
  const [sec, pick] = usePickedSection(mine, null);
  const { data, error, loading } = useLoad(() => (sec ? schoolFetch<Alerts>(`/teacher/health-alerts/${sec}`) : Promise.resolve(null)), [sec]);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((s) => !q || `${s.name} ${s.allergy} ${s.condition}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Health Alerts" subtitle={`Students in ${data?.label ?? "your class"} with an allergy or medical condition. Parents keep these up to date in the Parent portal and the school nurse confirms them.`} />
      <ErrorBanner message={reg.error || error} />
      <Loading on={(reg.loading && !reg.data) || (loading && !data)} />
      {reg.data && !mine.length && <Panel title="Health alerts"><Empty text="Health alerts are shown to the class teacher. You are not a class teacher this year." /></Panel>}
      {reg.data && mine.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={mine.map((s) => ({ value: s.id, label: s.label }))} right={data ? `${data.label} · ${data.students} students · you're the class teacher` : ""} />
          {data && (
            <>
              <Tiles items={[{ label: "Students with alerts", value: data.alerts, sub: `of ${data.students}` }, { label: "Allergies", value: data.allergies, sub: "Check before food or class activities" }, { label: "Conditions", value: data.conditions, sub: "Know the care plan" }]} />
              <Panel title={`Health alerts · ${data.label}`} sub={`${data.alerts} students`} right={<ExportPrint name="health-alerts" head={["Roll", "Student", "Allergy", "Condition", "Blood group"]} rows={items.map((s) => [s.roll_no, s.name, s.allergy, s.condition, s.blood_group])} />}>
                <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search health alerts · ${data.label.toLowerCase()}`} /></div>
                <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Allergy" }, { h: "Condition" }, { h: "Blood group" }]} empty="No student in this class has a health alert." rows={items.map((s) => [s.roll_no, <button key="n" type="button" onClick={() => openStudent(s.id)} className="font-semibold text-[#026f9b] hover:underline">{s.name}</button>, s.allergy ? <Chip key="a" tone="warn">{s.allergy}</Chip> : <span key="a" className="text-slate-500">None</span>, s.condition || <span key="c" className="text-slate-500">None</span>, s.blood_group || "—"])} />
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════ house points ═════════════
interface Houses { houses: { id: string; name: string }[]; board: { id: string; name: string; points: number }[]; students: { id: string; label: string }[]; items: { id: string; date: string; student: string; house: string; points: number; reason: string; by: string }[] }
const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const EDGE = ["border-t-[#e0742b]", "border-t-[#2b7fc4]", "border-t-[#2e9e6b]", "border-t-[#c4358f]", "border-t-slate-400", "border-t-slate-400"];
export function HousePoints() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Houses>("/teacher/house-points"), []);
  const act = useAction(reload);
  const [f, setF] = useState({ student_id: "", house_id: "", points: "10", reason: "" });
  const [done, setDone] = useState("");
  const student = f.student_id || data?.students[0]?.id || "";
  const house = f.house_id || data?.houses[0]?.id || "";
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/house-points", json("POST", { student_id: student, house_id: house, points: Number(f.points), reason: f.reason })))) { setF({ ...f, reason: "" }); setDone("Points awarded."); } };
  return (
    <div data-report>
      <Head title="Award Points" subtitle="Award house points to a student. Points show straight away on the house board and in the student and parent apps." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Award points</h2></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <L label="Student"><select className={inputCls} value={student} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{data.students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
              <L label="House"><select className={inputCls} value={house} onChange={(e) => setF({ ...f, house_id: e.target.value })}>{data.houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></L>
              <L label="Points"><select className={inputCls} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })}>{[5, 10, 15, 20, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select></L>
              <L label="For"><input className={inputCls} required minLength={3} maxLength={160} placeholder="For example, Won the class debate" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></L>
            </div>
            <div className="flex items-center justify-end border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="submit" disabled={act.busy || !student || !house} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Award points</button></div>
          </form>
          {!data.houses.length && <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">The school has not set up houses yet. The School Admin adds them in Activities.</p>}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{data.board.map((h, i) => <div key={h.id} className={`rounded-xl border border-t-[3px] border-slate-200 bg-white px-4 py-3 ${EDGE[i] ?? ""}`}><p className="text-[11px] text-slate-500">{ORD[i] ?? `${i + 1}th`}</p><p className="text-[17px] font-bold text-slate-900">{h.name}</p><p className="text-[12px] text-slate-600">{h.points.toLocaleString("en-IN")} points</p></div>)}</div>
          <Panel title="Recent awards" sub={`${data.items.length} awards`} right={<ExportPrint name="house-points" head={["Date", "Student", "House", "Points", "For", "By"]} rows={data.items.map((a) => [a.date, a.student, a.house, a.points, a.reason, a.by])} />}>
            <SimpleTable head={[{ h: "Date" }, { h: "Student" }, { h: "House" }, { h: "Points" }, { h: "For" }, { h: "By" }]} empty="No points have been awarded yet." rows={data.items.map((a) => [day(a.date), <b key="s" className="font-semibold text-slate-900">{a.student}</b>, a.house, <b key="p" className="font-semibold text-[#065740]">+{a.points}</b>, <span key="r" className="whitespace-normal">{a.reason}</span>, a.by])} />
          </Panel>
        </div>
      )}
    </div>
  );
}
