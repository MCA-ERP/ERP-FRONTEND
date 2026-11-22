"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { useTeacher } from "../context";
import { Head, whiteBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { PillSelect, SearchBox, blueBtn, smallBtn } from "./ui";

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const P = (label: string) => label.replace(/^Period\s*/i, "P");

interface DailyRow { period: string; starts: string; ends: string; free: boolean; section_id: string | null; section: string; subject: string; room: string | null; topic: string; substitution: boolean; substitution_id: string | null; substitution_status: string | null; state: string }
const STATE: Record<string, "good" | "info" | "mute" | "warn"> = { Done: "good", Now: "info", Next: "info", Upcoming: "info", Free: "mute" };

export function TimetableDaily() {
  const router = useRouter();
  const { refreshBadges } = useTeacher();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ date: string; weekday: string; items: DailyRow[]; classes: { id: string; label: string }[]; sections: number; per_week: number }>("/teacher/timetable/daily"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [cls, setCls] = useState("");
  const rows = (data?.items ?? []).filter((r) => !cls || r.section_id === cls || r.free);
  const when = data ? new Date(`${data.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  return (
    <div data-report>
      <Head title="Daily" subtitle={data ? `Your periods today, ${data.weekday} ${when}. Open a class to mark attendance or update the lesson.` : ""} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Class" value={cls} onChange={setCls} options={[{ value: "", label: "All classes" }, ...data.classes.map((c) => ({ value: c.id, label: c.label }))]} right={`${data.sections} sections · ${data.per_week} periods a week`} />
          <Panel title="Today" sub={`${data.items.length} periods`} right={<ExportPrint name="my-timetable-today" head={["Period", "Time", "Class", "Subject", "Room", "Topic", "Status"]} rows={rows.map((r) => [P(r.period), `${r.starts} - ${r.ends}`, r.section || "Free", r.subject, r.room ? `Room ${r.room}` : "", r.topic, r.state])} />}>
            <SimpleTable head={[{ h: "Period" }, { h: "Time" }, { h: "Class" }, { h: "Subject" }, { h: "Room" }, { h: "Topic" }, { h: "Status" }, { h: "" }]} empty="No periods are set up for today." rows={rows.map((r) => [
              <b key="p" className="font-semibold text-slate-900">{P(r.period)}</b>, `${r.starts} - ${r.ends}`,
              r.free ? <span key="c" className="text-slate-500">Free</span> : <span key="c">{r.section}{r.substitution && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600">Substitution</span>}</span>,
              r.subject || "—", r.room ? `Room ${r.room}` : "—", r.topic || "—", <Chip key="s" tone={STATE[r.state] ?? "mute"}>{r.state}</Chip>,
              r.free ? "" : r.substitution && r.substitution_status === "Pending" ? <button key="a" type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/substitutions/${r.substitution_id}/accept`, json("POST", {})))}>Accept</button>
                : <span key="a" className="flex gap-1.5"><button type="button" className={smallBtn} onClick={() => router.push("/teacher/attendance/daily-attendance")}>Attendance</button><button type="button" className={smallBtn} onClick={() => router.push("/teacher/subjects/lesson-planning")}>Lesson</button></span>,
            ])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Week { days: string[]; today_index: number; grid: { period: string; starts: string; cells: { kind: "free" | "class" | "cover"; label: string; room: string | null; subject: string }[] }[]; per_week: number; free: number; sections: number; limit: number; subject: string }
export function TimetableWeekly() {
  const { data, error, loading } = useLoad(() => schoolFetch<Week>("/teacher/timetable/weekly"), []);
  const { user } = useTeacher();
  const download = () => { if (!data) return; armPrint(); downloadCsv("my-weekly-timetable", ["Period", ...data.days], data.grid.map((r) => [`${P(r.period)} ${r.starts}`, ...r.cells.map((c) => (c.kind === "free" ? "Free" : `${c.label}${c.room ? ` Room ${c.room}` : ""}${c.kind === "cover" ? " (cover)" : ""}`))])); };
  return (
    <div data-report>
      <Head title="Weekly" subtitle="Your week. Free periods can be given to you for substitution." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Periods a week", value: data.per_week, sub: `Limit ${data.limit}` }, { label: "Free periods", value: data.free, sub: "Before substitutions" }, { label: "Sections", value: data.sections, sub: data.subject || undefined }]} />
          <Panel title={user.fullName ?? "My timetable"} sub={data.subject} right={<button type="button" className={whiteBtn} onClick={download}>Download</button>}>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Period</th>{data.days.map((d, i) => <th key={d} className={`px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${i === data.today_index ? "bg-[#c0e4f3] text-[#026f9b]" : "text-slate-500"}`}>{d}{i === data.today_index ? " · today" : ""}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!data.grid.length && <tr><td colSpan={data.days.length + 1} className="px-4 py-8 text-center text-slate-400">No periods are set up yet.</td></tr>}
                {data.grid.map((r) => <tr key={r.period}><td className="whitespace-nowrap px-4 py-3"><b className="font-semibold text-slate-900">{P(r.period)}</b> <span className="text-[11px] text-slate-500">{r.starts}</span></td>
                  {r.cells.map((c, i) => <td key={i} className={`px-3 py-2.5 text-center text-[12px] ${c.kind === "free" ? "bg-[#f3f9fd] text-slate-500" : ""} ${i === data.today_index && c.kind !== "free" ? "bg-[#eaf6fb]" : ""}`}>{c.kind === "free" ? "Free" : <><p className="font-semibold text-slate-900">{c.label}</p><p className="text-[11px] text-slate-500">{c.kind === "cover" ? `${c.subject} · cover` : c.room ? `Room ${c.room}` : ""}</p></>}</td>)}</tr>)}
              </tbody></table></div>
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Sub { id: string; date: string; weekday: string; today: boolean; period: string; starts: string; ends: string; class_label: string; subject: string; absent_teacher: string; room: string | null; status: string }
const subTone = (s: string) => (s === "Completed" ? "good" : s === "Pending" ? "warn" : "info") as "good" | "warn" | "info";
export function AssignedSubstitution() {
  const { refreshBadges } = useTeacher();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Sub[]; completed: number; pending: number }>("/teacher/timetable/substitutions"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [q, setQ] = useState("");
  const [view, setView] = useState<Sub | null>(null);
  const items = useMemo(() => (data?.items ?? []).filter((s) => !q || `${s.class_label} ${s.subject} ${s.absent_teacher} ${s.status}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const n = data?.items.length ?? 0;
  const share = (v: number) => (n ? `${Math.round((v / n) * 100)}% of shown` : "");
  return (
    <div data-report>
      <Head title="Assigned Substitution" subtitle="Periods you've been asked to cover for absent teachers. Accept so the office knows the class is covered." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Substitutions", value: n, sub: "Last 60 days and ahead" }, { label: "Completed", value: data.completed, sub: share(data.completed) }, { label: "Pending", value: data.pending, sub: share(data.pending) }]} />
          <Panel title="Substitutions" sub={`${n} periods`} right={<ExportPrint name="my-substitutions" head={["Date", "Day", "Period", "Time", "Class", "Subject", "Absent teacher", "Room", "Status"]} rows={items.map((s) => [s.date, s.weekday, P(s.period), `${s.starts} - ${s.ends}`, s.class_label, s.subject, s.absent_teacher, s.room ? `Room ${s.room}` : "", s.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search substitutions" /></div>
            <SimpleTable head={[{ h: "Date" }, { h: "Day" }, { h: "Period" }, { h: "Time" }, { h: "Class" }, { h: "Subject" }, { h: "Absent teacher" }, { h: "Room" }, { h: "Status" }, { h: "" }]} empty="You have not been asked to cover any period." rows={items.map((s) => [day(s.date), <span key="d" className="flex items-center gap-2"><b className="font-semibold text-slate-900">{s.weekday}</b>{s.today && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600">Today</span>}</span>, <b key="p" className="font-semibold text-slate-900">{P(s.period)}</b>, `${s.starts} - ${s.ends}`, s.class_label, s.subject || "—", s.absent_teacher || "—", s.room ? `Room ${s.room}` : "—", <Chip key="s" tone={subTone(s.status)}>{s.status === "Assigned" ? "Accepted" : s.status}</Chip>,
              <span key="a" className="flex gap-1.5">{s.status === "Pending" && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/substitutions/${s.id}/accept`, json("POST", {})))}>Accept</button>}<button type="button" className={smallBtn} onClick={() => setView(s)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={`${view.class_label} · ${P(view.period)}`} onClose={() => setView(null)}><KV rows={[["Date", `${view.weekday}, ${day(view.date)}`], ["Time", `${view.starts} - ${view.ends}`], ["Subject", view.subject || "—"], ["Covering for", view.absent_teacher || "—"], ["Room", view.room ? `Room ${view.room}` : "—"], ["Status", <Chip key="s" tone={subTone(view.status)}>{view.status}</Chip>]]} /></Modal>}
    </div>
  );
}

export function FreePeriods() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: { date: string; day: string; period: string; starts: string; ends: string; today: boolean; status: string }[] }>("/teacher/timetable/free-periods"), []);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((f) => !q || `${f.date} ${f.day} ${f.period} ${f.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Free Periods" subtitle="When you're free this week. The office uses these for substitutions." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Free periods" sub={`${data.items.length} periods`} right={<ExportPrint name="my-free-periods" head={["Date", "Day", "Period", "Time", "Status"]} rows={items.map((f) => [f.date, f.day, P(f.period), `${f.starts} - ${f.ends}`, f.status])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search free periods" /></div>
          <SimpleTable head={[{ h: "Date" }, { h: "Day" }, { h: "Period" }, { h: "Time" }, { h: "Status" }]} empty="You have no free periods ahead." rows={items.map((f) => [day(f.date), <span key="d" className="flex items-center gap-2"><b className="font-semibold text-slate-900">{f.day}</b>{f.today && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600">Today</span>}</span>, P(f.period), `${f.starts} - ${f.ends}`, f.status === "Substitution" ? <Chip key="s" tone="warn">Substitution</Chip> : <Chip key="s" tone="mute">Free</Chip>])} />
        </Panel>
      )}
    </div>
  );
}

export function TodaysCovers() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: { id: string; period: string; starts: string; class_label: string; subject: string; covering_for: string }[] }>("/teacher/timetable/covers"), []);
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<{ title: string; topic: string; week_of: string | null; progress: number | null } | null>(null);
  const [err, setErr] = useState("");
  const items = (data?.items ?? []).filter((c) => !q || `${c.class_label} ${c.subject} ${c.covering_for}`.toLowerCase().includes(q.toLowerCase()));
  const open = async (c: { id: string; class_label: string }) => { setErr(""); try { const r = await schoolFetch<{ topic: string; week_of: string | null; progress: number | null }>(`/teacher/timetable/covers/${c.id}/notes`); setNotes({ title: c.class_label, ...r }); } catch (e) { setErr(e instanceof Error ? e.message : "Could not load the notes."); } };
  return (
    <div data-report>
      <Head title="Today's Covers" subtitle="Covers assigned to you today. You were told the moment each was assigned; the class sees your name in their timetable." />
      <ErrorBanner message={error || err} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My covers today" sub={`${data.items.length} covers`} right={<ExportPrint name="my-covers-today" head={["Period", "Class", "Subject", "Covering for"]} rows={items.map((c) => [P(c.period), c.class_label, c.subject, c.covering_for])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search my covers today" /></div>
          <SimpleTable head={[{ h: "Period" }, { h: "Class" }, { h: "Subject" }, { h: "Covering for" }, { h: "" }]} empty="You have no covers today." rows={items.map((c) => [<span key="p"><b className="font-semibold text-slate-900">{P(c.period)}</b> <span className="text-slate-500">· {c.starts}</span></span>, c.class_label.replace(/^Class /, ""), c.subject || "—", c.covering_for || "—", <button key="n" type="button" className={smallBtn} onClick={() => void open(c)}>Get lesson notes</button>])} />
        </Panel>
      )}
      {notes && <Modal open title={`Lesson notes · ${notes.title}`} onClose={() => setNotes(null)}>{notes.topic ? <KV rows={[["Topic", notes.topic], ["Week of", notes.week_of ? day(notes.week_of) : "—"], ["Progress", notes.progress === null ? "—" : `${notes.progress}%`]]} /> : <Empty text="The teacher has not left a lesson plan for this class." />}</Modal>}
    </div>
  );
}
