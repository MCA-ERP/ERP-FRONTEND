"use client";

import Link from "next/link";
import { useState } from "react";
import { qs } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, num } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { PageBar, type YearOpt } from "./page-bar";
import { PlatformNotices } from "./notices";

export const small = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400 disabled:opacity-50";
export const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
export const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
export const NOT_YET = "Not recorded yet";
export const Empty = ({ text }: { text: string }) => <p className="px-5 py-8 text-center text-sm text-slate-500">{text}</p>;
const NO_ATTENDANCE = "Attendance has not been recorded yet. It fills in once attendance is taken.";

export interface YearInfo { id: string; name: string; start_date: string; end_date: string; is_current: boolean }
export interface YearData { years: YearInfo[]; year: YearInfo | null }
export const asOpts = (years: YearInfo[]): YearOpt[] => years.map((y) => ({ id: y.id, name: y.name }));

/** The academic year the page is showing. Empty means the school's current year. */
export function useYear() {
  const [year, setYear] = useState("");
  return { year, setYear };
}

// ═════════════ Main dashboard ═════════════
interface Overview extends YearData { students: { total: number; active: number; boys: number; girls: number }; staff: { total: number }; attention: { key: string; title: string; sub: string; href: string }[] }
const STEP_LINK: Record<string, string> = { year: "/school/setup?tab=years", grades: "/school/setup?tab=grades", sections: "/school/setup?tab=sections", subjects: "/school/setup?tab=subjects", students: "/school/students" };

export type MainTab = "school-overview" | "kpi-cards";
export function MainDashboard({ tab }: { tab: MainTab }) {
  return tab === "kpi-cards" ? <KpiCards /> : <SchoolOverview />;
}

function SchoolOverview() {
  const { year, setYear } = useYear();
  const { data, error, loading } = useLoad(() => schoolFetch<Overview>(`/school/dashboard/overview${qs({ year })}`), [year]);
  return (
    <div data-report>
      <PlatformNotices />
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name="school-overview" />
      <Tiles items={[
        { label: "Students", value: loading ? "…" : num(data?.students.total ?? 0), sub: "Whole school" },
        { label: "Present today", value: "—", sub: "Attendance not recorded yet" },
        { label: "Fees collected", value: "—", sub: "Fees not recorded yet" },
        { label: "Staff present", value: `— of ${num(data?.staff.total ?? 0)}`, sub: "Attendance not recorded yet" },
        { label: "Open admissions", value: "—", sub: "Admissions not recorded yet" },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Attendance today by class" sub="% present" right={<Link href="/school/dashboard/attendance-overview" className={small}>Attendance</Link>}><Empty text={NO_ATTENDANCE} /></Panel>
        <Panel title="Needs your attention">
          {!data?.attention.length ? <Empty text={loading ? "Loading…" : "Nothing needs your attention."} /> : (
            <ul className="divide-y divide-slate-100">
              {data.attention.map((a) => (
                <li key={a.key} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f8ecd6] text-sm font-bold text-[#8a5a0b]" aria-hidden="true">!</span>
                  <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{a.title}</p><p className="text-xs text-slate-500">{a.sub}</p></div>
                  <Link href={STEP_LINK[a.key] ?? a.href} className={small}>Start</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Fee collection" sub="₹ lakh, this academic year"><Empty text="Fees have not been recorded yet." /></Panel>
        <Panel title="Coming up"><Empty text="Nothing is scheduled yet." /></Panel>
      </div>
    </div>
  );
}

const KPIS = ["Attendance rate", "Fee collection rate", "On-time fee payment", "Admissions vs target", "Enquiry to admission", "Pass rate (last exam)", "Syllabus completed", "Teacher attendance", "Parent app adoption", "Homework submitted"];
function KpiCards() {
  const { year, setYear } = useYear();
  const { data } = useLoad(() => schoolFetch<YearData>(`/school/dashboard/overview${qs({ year })}`), [year]);
  return (
    <div data-report>
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name="kpi-cards" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#dceff9] px-4 py-3.5"><p className="text-xs text-slate-700">On track</p><p className="mt-0.5 text-[26px] font-bold text-slate-900">—</p><p className="text-xs text-slate-700">At or above target</p></div>
        <div className="rounded-2xl bg-[#d9efe8] px-4 py-3.5"><p className="text-xs text-slate-700">Improved</p><p className="mt-0.5 text-[26px] font-bold text-slate-900">—</p><p className="text-xs text-slate-700">Better than last year</p></div>
      </div>
      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {KPIS.map((k) => (
          <div key={k} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[13px] text-slate-600">{k}</p>
            <p className="text-2xl font-bold text-slate-900">—</p>
            <div className="h-1.5 rounded-full bg-[#dceff9]" />
            <p className="text-xs text-slate-500">{NOT_YET}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════ Student statistics ═════════════
type StudentTab = "total" | "active" | "inactive" | "new";
interface StudentRow { id: string; name: string; registration_no: string; class: string; class_section: string; gender: string; father: string; mobile: string; status: string; admission_date: string; category: string }
interface StudentData extends YearData { stats: { total: number; active: number; inactive: number; new_admissions: number; boys: number; girls: number }; by_class: { label: string; value: number }[]; by_gender: { label: string; value: number }[]; list: StudentRow[]; grades: { id: string; name: string }[] }

export function StudentStatistics({ tab }: { tab: StudentTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [view, setView] = useState<StudentRow | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => schoolFetch<StudentData>(`/school/dashboard/students${qs({ year, tab, search: q, grade, gender })}`), [year, tab, q, grade, gender]);
  const s = data?.stats;
  const label = { total: "Strength", active: "Strength", inactive: "Strength", new: "New admissions" }[tab];
  const rows = data?.list ?? [];
  const status = (r: StudentRow): "good" | "mute" => (r.status === "Active" ? "good" : "mute");
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`student-statistics-${tab}`} />
      <Tiles items={[
        { label: "Total", value: num(s?.total ?? 0), sub: `Boys ${num(s?.boys ?? 0)} · girls ${num(s?.girls ?? 0)}` },
        { label: "Active", value: num(s?.active ?? 0), sub: "Attending" },
        { label: "Inactive", value: num(s?.inactive ?? 0), sub: "Inactive or withdrawn" },
        { label: "New admissions", value: num(s?.new_admissions ?? 0), sub: data?.year?.name ?? "" },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Students by class" sub={label}><BarRows rows={(data?.by_class ?? []).map((c): [string, number] => [c.label, c.value])} /></Panel>
        <Panel title="By gender and category"><BarRows rows={(data?.by_gender ?? []).map((c): [string, number] => [c.label, c.value])} /></Panel>
      </div>
      <div className="mt-5">
        <Panel title="Students" sub={`${num(rows.length)} students`} right={<ExportPrint name={`students-${tab}`} head={["Student", "Admission no.", "Class", "Gender", "Father", "Mobile", "Status"]} rows={rows.map((r) => [r.name, r.registration_no, r.class_section, r.gender, r.father, r.mobile, r.status])} />}>
          <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
            <input className={`${inputCls} max-w-xs`} placeholder="Search students" aria-label="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={`${inputCls} max-w-[10rem]`} aria-label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All classes</option>{(data?.grades ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select className={`${inputCls} max-w-[10rem]`} aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">All genders</option><option value="male">Male</option><option value="female">Female</option></select>
          </div>
          <SimpleTable head={[{ h: "Student" }, { h: "Class" }, { h: "Gender" }, { h: "Father" }, { h: "Mobile" }, { h: "Attendance" }, { h: "Fee due" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No students."}
            rows={rows.map((r) => [<div key="n"><p className="font-semibold text-[#026f9b]">{r.name}</p><p className="text-xs text-slate-400">{r.registration_no}</p></div>, r.class_section, r.gender, r.father, r.mobile, "—", "—", <Chip key="s" tone={status(r)}>{r.status}</Chip>,
              <span key="a" className="flex gap-1.5"><Link href="/school/students" className={small}>Profile</Link><button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
        </Panel>
      </div>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Admission no." v={view.registration_no} /><Row k="Class" v={view.class_section} /><Row k="Gender" v={view.gender} /><Row k="Category" v={view.category} /><Row k="Father" v={view.father} /><Row k="Mobile" v={view.mobile} /><Row k="Admitted" v={day(view.admission_date)} /><Row k="Status" v={view.status} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Staff statistics ═════════════
type StaffTab = "total" | "teaching" | "non";
interface StaffRow { id: string; name: string; email: string; designation: string; type: string; mobile: string; joined: string; status: string }
interface StaffData { stats: { total: number; teaching: number; non_teaching: number; ratio: number | null }; by_role: { label: string; value: number }[]; list: StaffRow[]; sample_of: number }

export function StaffStatistics({ tab }: { tab: StaffTab }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<StaffRow | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => schoolFetch<StaffData>(`/school/dashboard/staff${qs({ tab, search: q, type })}`), [tab, q, type]);
  const years = useLoad(() => schoolFetch<YearData>("/school/dashboard/overview"), []);
  const [year, setYear] = useState("");
  const s = data?.stats;
  const rows = data?.list ?? [];
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(years.data?.years ?? [])} year={year || years.data?.year?.id || ""} onYear={setYear} name={`staff-statistics-${tab}`} />
      <Tiles items={[
        { label: "Total staff", value: num(s?.total ?? 0), sub: "Present today: —" },
        { label: "Teaching", value: num(s?.teaching ?? 0), sub: s?.ratio ? `Student · teacher ratio 1 : ${s.ratio}` : "Student · teacher ratio —" },
        { label: "Non-teaching", value: num(s?.non_teaching ?? 0), sub: "Admin, accounts, transport, support" },
        { label: "On leave today", value: "—", sub: "Leave not recorded yet" },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="By role" sub={`Sample of ${num(data?.sample_of ?? 0)}`}><BarRows rows={(data?.by_role ?? []).map((c): [string, number] => [c.label, c.value])} /></Panel>
        <Panel title="By qualification"><Empty text="Qualifications are not recorded yet." /></Panel>
      </div>
      <div className="mt-5">
        <Panel title="Staff" sub={`${num(rows.length)} staff`} right={<ExportPrint name={`staff-${tab}`} head={["Name", "Designation", "Type", "Mobile", "Joined", "Status"]} rows={rows.map((r) => [r.name, r.designation, r.type, r.mobile, day(r.joined), r.status])} />}>
          <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
            <input className={`${inputCls} max-w-xs`} placeholder="Search staff" aria-label="Search staff" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={`${inputCls} max-w-[10rem]`} aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All staff</option><option value="Teaching">Teaching</option><option value="Non-teaching">Non-teaching</option></select>
          </div>
          <SimpleTable head={[{ h: "Name" }, { h: "Department" }, { h: "Designation" }, { h: "Type" }, { h: "Mobile" }, { h: "Joined" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No staff."}
            rows={rows.map((r) => [<div key="n"><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div>, "—", <Tag key="d">{r.designation}</Tag>, r.type, r.mobile, day(r.joined), <Chip key="s" tone={r.status === "Active" ? "good" : "mute"}>{r.status}</Chip>,
              <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
        </Panel>
      </div>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Email" v={view.email} /><Row k="Designation" v={view.designation} /><Row k="Type" v={view.type} /><Row k="Mobile" v={view.mobile} /><Row k="Joined" v={day(view.joined)} /><Row k="Status" v={view.status} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Attendance overview ═════════════
type AttendanceTab = "today" | "class-wise" | "monthly";
interface AttendanceData extends YearData { classes: { label: string }[]; sections: { section: string; students: number }[] }

export function AttendanceOverview({ tab }: { tab: AttendanceTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<{ section: string; students: number } | null>(null);
  const { data, error, loading } = useLoad(() => schoolFetch<AttendanceData>(`/school/dashboard/attendance${qs({ year })}`), [year]);
  const sections = (data?.sections ?? []).filter((s) => !search.trim() || s.section.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`attendance-${tab}`} />
      {tab === "today" && (
        <>
          <Tiles items={[{ label: "Present", value: "—", sub: NOT_YET }, { label: "Absent", value: "—", sub: NOT_YET }, { label: "Late", value: "—", sub: NOT_YET }, { label: "Classes not marked", value: num(data?.classes.length ?? 0), sub: "Nothing marked yet" }]} />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel title="Present by class" sub="%"><Empty text={NO_ATTENDANCE} /></Panel>
            <Panel title="Absent 3+ days in a row"><Empty text="Nobody yet." /></Panel>
          </div>
        </>
      )}
      {tab === "class-wise" && (
        <Panel title="Class-wise today" sub={`${num(sections.length)} sections`} right={<ExportPrint name="class-wise-attendance" head={["Section", "Students", "Present", "%", "Marked by", "Status"]} rows={sections.map((s) => [s.section, s.students, "—", "—", "—", "Not marked"])} />}>
          <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search class-wise today" aria-label="Search class-wise today" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable head={[{ h: "Section" }, { h: "Students" }, { h: "Present" }, { h: "%" }, { h: "Marked by" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No sections yet."}
            rows={sections.map((s) => [<b key="s" className="font-semibold text-slate-900">{s.section}</b>, s.students, "—", "—", "—", <Chip key="c" tone="mute">Not marked</Chip>, <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>])} />
        </Panel>
      )}
      {tab === "monthly" && (
        <>
          <Panel title="Monthly attendance" sub={data?.year?.name}><Empty text={NO_ATTENDANCE} /></Panel>
          <div className="mt-5"><Panel title="By month" sub="0 months" right={<ExportPrint name="monthly-attendance" head={["Month", "Average", "Working days"]} rows={[]} />}>
            <SimpleTable head={[{ h: "Month" }, { h: "Average" }, { h: "Working days" }]} empty="Nothing recorded yet." rows={[]} />
          </Panel></div>
        </>
      )}
      <Modal open={!!view} title={view?.section ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Students" v={view.students} /><Row k="Present today" v="—" /><Row k="Status" v="Not marked" /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Admission overview ═════════════
type AdmissionTab = "enquiries" | "applications" | "approved" | "rejected";
interface AdmissionData extends YearData { funnel: { enquiries: number; applications: number; tested: number; approved: number; admitted: number } }
const LIST: Record<AdmissionTab, [string, string[]]> = {
  enquiries: ["Admission enquiries", ["Enquiry no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Counsellor", "Date", "Status"]],
  applications: ["Applications", ["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]],
  approved: ["Applications", ["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]],
  rejected: ["Applications", ["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]],
};

export function AdmissionOverview({ tab }: { tab: AdmissionTab }) {
  const { year, setYear } = useYear();
  const [search, setSearch] = useState("");
  const { data, error } = useLoad(() => schoolFetch<AdmissionData>(`/school/dashboard/admissions${qs({ year })}`), [year]);
  const f = data?.funnel;
  const [title, head] = LIST[tab];
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}% of ${tab === "enquiries" ? "enquiries" : "applications"}` : NOT_YET);
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <PageBar years={asOpts(data?.years ?? [])} year={data?.year?.id ?? ""} onYear={setYear} name={`admission-${tab}`} />
      <Tiles items={[
        { label: "Enquiries", value: num(f?.enquiries ?? 0), sub: "This academic year" },
        { label: "Applications", value: num(f?.applications ?? 0), sub: pct(f?.applications ?? 0, f?.enquiries ?? 0) },
        { label: "Approved", value: num(f?.approved ?? 0), sub: pct(f?.approved ?? 0, f?.applications ?? 0) },
        { label: "Rejected", value: "0", sub: NOT_YET },
        { label: "Admitted", value: num(f?.admitted ?? 0), sub: "Fee paid and class allocated" },
      ]} />
      <div className="mt-5"><Panel title="Admission funnel" sub={data?.year?.name}>
        <BarRows rows={[["Enquiries", f?.enquiries ?? 0], ["Applications", f?.applications ?? 0], ["Tested / interviewed", f?.tested ?? 0], ["Approved", f?.approved ?? 0], ["Admitted", f?.admitted ?? 0]]} />
      </Panel></div>
      <div className="mt-5">
        <Panel title={title} sub="0 records" right={<ExportPrint name={`admission-${tab}`} head={head} rows={[]} />}>
          <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${title.toLowerCase()}`} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable head={head.map((h) => ({ h }))} empty="Nothing in this list yet." rows={[]} />
        </Panel>
      </div>
    </div>
  );
}
