"use client";

import Link from "next/link";
import { useState } from "react";
import { qs } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, num } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { Empty, Footer, NOT_YET, Row, asOpts, day, small, useYear, type YearData } from "./dash-pages";
import { PageBar } from "./page-bar";

const SearchBox = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const when = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`; };

// ═════════════ Fee overview ═════════════
export type FeeTab = "collected" | "pending" | "overdue";
export function FeeOverview({ tab }: { tab: FeeTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const { data, error } = useLoad(() => schoolFetch<YearData>(`/school/dashboard/overview${qs({ year })}`), [year]);
  const t = { collected: ["Fee payments", ["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status"]], pending: ["Pending fees", ["Student", "Class", "Father", "Mobile", "Due", "Days overdue", "Last reminder"]], overdue: ["Overdue fees", ["Student", "Class", "Father", "Mobile", "Due", "Days overdue", "Last reminder"]] }[tab] as [string, string[]];
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`fee-${tab}`} />
      <Tiles items={[{ label: "Annual fees", value: "—", sub: NOT_YET }, { label: "Collected", value: "—", sub: NOT_YET }, { label: "Pending", value: "—", sub: NOT_YET }, { label: "Overdue", value: "—", sub: NOT_YET }]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title={tab === "collected" ? "Collected by mode" : "Pending by class"} sub={tab === "collected" ? "This year" : "₹"}><Empty text="Fees have not been recorded yet." /></Panel>
        <Panel title="Collection by fee head"><Empty text="Fees have not been recorded yet." /></Panel>
      </div>
      <div className="mt-5">
        <Panel title={t[0]} sub="0 records" right={<ExportPrint name={`fees-${tab}`} head={t[1]} rows={[]} />}>
          <SearchBox v={search} set={setSearch} label={`Search ${t[0].toLowerCase()}`} />
          <SimpleTable head={t[1].map((h) => ({ h }))} empty="Nothing in this list yet." rows={[]} />
        </Panel>
      </div>
    </div>
  );
}

// ═════════════ Academic overview ═════════════
export type AcademicTab = "classes" | "subjects" | "timetable";
interface AcademicData extends YearData {
  classes: { id: string; name: string; sections: number; students: number; campus: string; status: string }[];
  stats: { classes: number; first: string | null; last: string | null; sections: number; average: number; teachers_assigned: number };
  subjects: { id: string; name: string; code: string; status: string }[];
}
export function AcademicOverview({ tab }: { tab: AcademicTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<{ title: string; rows: [string, string][] } | null>(null);
  const { data, error, loading } = useLoad(() => schoolFetch<AcademicData>(`/school/dashboard/academics${qs({ year })}`), [year]);
  const s = data?.stats;
  const classes = (data?.classes ?? []).filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));
  const subjects = (data?.subjects ?? []).filter((c) => !search.trim() || `${c.name} ${c.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`academic-${tab}`} />
      {tab === "classes" && (
        <>
          <Tiles items={[
            { label: "Classes", value: num(s?.classes ?? 0), sub: s?.first ? `${s.first} – ${s.last}` : "" },
            { label: "Sections", value: num(s?.sections ?? 0), sub: `Average ${num(s?.average ?? 0)} students` },
            { label: "Class teachers assigned", value: `${num(s?.teachers_assigned ?? 0)} of ${num(s?.sections ?? 0)}`, sub: "" },
          ]} />
          <div className="mt-5"><Panel title="Classes" sub={`${num(classes.length)} classes`} right={<ExportPrint name="classes" head={["Class", "Sections", "Students", "Campus", "Status"]} rows={classes.map((c) => [c.name, c.sections, c.students, c.campus, c.status])} />}>
            <SearchBox v={search} set={setSearch} label="Search classes" />
            <SimpleTable head={[{ h: "Class" }, { h: "Stage" }, { h: "Sections" }, { h: "Students" }, { h: "Campus" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No classes yet."}
              rows={classes.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, "—", c.sections, c.students, c.campus, <Chip key="s" tone={c.status === "Active" ? "good" : "mute"}>{c.status}</Chip>,
                <button key="v" type="button" className={small} onClick={() => setView({ title: c.name, rows: [["Sections", String(c.sections)], ["Students", String(c.students)], ["Campus", c.campus], ["Status", c.status]] })}>View details</button>])} />
          </Panel></div>
        </>
      )}
      {tab === "subjects" && (
        <>
          <Tiles items={[{ label: "Subjects", value: num(data?.subjects.length ?? 0), sub: "In the subject list" }, { label: "Syllabus completed", value: "—", sub: NOT_YET }, { label: "Lesson plans approved", value: "—", sub: NOT_YET }]} />
          <div className="mt-5 grid gap-5">
            <Panel title="Syllabus completed by subject" sub="%"><Empty text="Syllabus progress has not been recorded yet." /></Panel>
            <Panel title="Subjects" sub={`${num(subjects.length)} subjects`} right={<ExportPrint name="subjects" head={["Subject", "Code", "Status"]} rows={subjects.map((c) => [c.name, c.code, c.status])} />}>
              <SearchBox v={search} set={setSearch} label="Search subjects" />
              <SimpleTable head={[{ h: "Subject" }, { h: "Code" }, { h: "Status" }]} empty={loading ? "Loading…" : "No subjects yet."} rows={subjects.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, c.code, <Chip key="s" tone={c.status === "Active" ? "good" : "mute"}>{c.status}</Chip>])} />
            </Panel>
          </div>
        </>
      )}
      {tab === "timetable" && (
        <>
          <Tiles items={[{ label: "Periods a week", value: "—", sub: NOT_YET }, { label: "Substitutions today", value: "—", sub: NOT_YET }, { label: "Clashes", value: "—", sub: NOT_YET }, { label: "Free teachers now", value: "—", sub: NOT_YET }]} />
          <div className="mt-5"><Panel title="Timetable"><Empty text="No timetable has been set up yet." /></Panel></div>
        </>
      )}
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Exam overview ═════════════
export type ExamTab = "upcoming-exams" | "results-pending";
export function ExamOverview({ tab }: { tab: ExamTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const { data, error } = useLoad(() => schoolFetch<YearData>(`/school/dashboard/overview${qs({ year })}`), [year]);
  const head = tab === "upcoming-exams" ? ["Exam", "Type", "Classes", "Starts", "Ends", "Status"] : ["Exam", "Class", "Subject", "Teacher", "Entered", "Average", "Submitted", "Status"];
  const title = tab === "upcoming-exams" ? "Exams" : "Marks verification";
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`exams-${tab}`} />
      {tab === "upcoming-exams"
        ? <Tiles items={[{ label: "Next exam", value: "—", sub: NOT_YET }, { label: "Half-yearly", value: "—", sub: NOT_YET }, { label: "Hall tickets", value: "—", sub: NOT_YET }]} />
        : <Tiles items={[{ label: "Marks pending", value: "—", sub: NOT_YET }, { label: "Report cards to publish", value: "—", sub: NOT_YET }]} />}
      <div className="mt-5">
        <Panel title={title} sub="0 records" right={<ExportPrint name={`exams-${tab}`} head={head} rows={[]} />}>
          <SearchBox v={search} set={setSearch} label={`Search ${title.toLowerCase()}`} />
          <SimpleTable head={head.map((h) => ({ h }))} empty="Exams have not been set up yet." rows={[]} />
        </Panel>
      </div>
    </div>
  );
}

// ═════════════ Alerts ═════════════
export type AlertTab = "pending-approvals" | "reminders";
interface AlertData extends YearData { attention: { key: string; title: string; sub: string; href: string }[] }
const STEP_LINK: Record<string, string> = { year: "/school/setup?tab=years", grades: "/school/setup?tab=grades", sections: "/school/setup?tab=sections", subjects: "/school/setup?tab=subjects", students: "/school/students" };
export function Alerts({ tab }: { tab: AlertTab }) {
  const { data, error, loading } = useLoad(() => schoolFetch<AlertData>("/school/dashboard/overview"), []);
  const items = tab === "reminders" ? (data?.attention ?? []) : [];
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <Panel title="All notifications" sub={`${items.length} unread`}>
        {!items.length ? <Empty text={loading ? "Loading…" : tab === "reminders" ? "No reminders." : "Nothing is waiting for your decision."} /> : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.key} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fce0df] text-sm font-bold text-[#ac2c28]" aria-hidden="true">!</span>
                <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-slate-900">{a.title}</p><p className="text-xs text-slate-500">{a.sub}</p></div>
                <Link href={STEP_LINK[a.key] ?? a.href} className={small}>Start</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ═════════════ Recent activity ═════════════
export type ActivityTab = "user-activity" | "recent-changes";
interface ActivityRow { id: string; time: string; user: string; action: string; record: string; change: string; ip: string; status: string }
export function RecentActivity({ tab }: { tab: ActivityTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ActivityRow | null>(null);
  const q = useDebounced(search);
  const years = useLoad(() => schoolFetch<YearData>(`/school/dashboard/overview${qs({ year })}`), [year]);
  const { data, error, loading } = useLoad(() => schoolFetch<{ list: ActivityRow[] }>(`/school/dashboard/activity${qs({ tab: tab === "recent-changes" ? "changes" : "all", search: q })}`), [tab, q]);
  const rows = data?.list ?? [];
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(years.data?.years ?? [])} year={years.data?.year?.id ?? ""} onYear={setYear} name={`activity-${tab}`} />
      <Panel title="Audit log" sub={`${num(rows.length)} events`} right={<ExportPrint name={`audit-log-${tab}`} head={["Time", "User", "Action", "Record", "Change", "IP", "Status"]} rows={rows.map((r) => [when(r.time), r.user, r.action, r.record, r.change, r.ip, r.status])} />}>
        <SearchBox v={search} set={setSearch} label="Search audit log" />
        <SimpleTable head={[{ h: "Time" }, { h: "User" }, { h: "Action" }, { h: "Record" }, { h: "Change" }, { h: "IP" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing recorded yet."}
          rows={rows.map((r) => [when(r.time), r.user, r.action, r.record, r.change || "—", r.ip, <Chip key="s" tone="mute">{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.action ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Time" v={day(view.time) + " " + when(view.time).replace(/^Today /, "")} /><Row k="User" v={view.user} /><Row k="Record" v={view.record} /><Row k="Fields" v={view.change || "—"} /><Row k="IP address" v={view.ip} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}
