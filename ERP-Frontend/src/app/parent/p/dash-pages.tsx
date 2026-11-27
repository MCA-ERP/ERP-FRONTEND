"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ColumnChart, CountBars } from "@/components/admin/dash-ui";
import { QuickActions } from "@/components/admin/quick-actions";
import { ErrorBanner, Modal } from "@/components/admin/ui";
import { Head, redBtn, whiteBtn } from "../../teacher/t/head";
import { downloadIcs } from "../../teacher/t/cal-pages";
import { useParent } from "../context";
import { sectionHref } from "./menu-config";
import { ChildBar, DataTable, Empty, Loaded, Note, Pairs, Status, Tiles, bluePill, bold, dm, dmy, initials, inr, pill, row, useChildPath, useGet, weekday } from "./kit";

const DASH = (tab: string) => sectionHref("dashboard", "my-dashboard", tab);

/** Quick actions and recent pages sit above every dashboard tab. */
export function WithBar({ children }: { children: React.ReactNode }) {
  const { hasModule } = useParent();
  const all: [string, string, string, string[]][] = [
    ["Pay fees", "₹", sectionHref("fees", "fee-status", "pay"), ["fees"]], ["Attendance", "✓", sectionHref("attendance", "attendance-record"), ["attendance"]], ["Homework", "H", sectionHref("homework", "homework"), ["homework"]],
    ["Report cards", "R", sectionHref("academics", "academic-records", "report-cards"), ["exams"]], ["Subjects this year", "B", sectionHref("academics", "syllabus-progress"), ["academics"]], ["Message a teacher", "✉", sectionHref("communication", "messages", "write"), ["notifications", "school_diary", "chat", "sms_whatsapp", "whatsapp", "email"]],
    ["School bus", "🚌", sectionHref("transport", "school-bus"), ["transport"]], ["Make a request", "+", sectionHref("requests", "my-requests", "new"), []], ["Help desk", "?", sectionHref("dashboard", "help-desk"), []],
  ];
  const actions = all.filter(([, , , needs]) => !needs.length || needs.some(hasModule)).map(([label, mark, href]) => ({ label, mark, href }));
  return <><QuickActions portal="parent" actions={actions} chips />{children}</>;
}

const hello = () => { const h = Number(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

interface Ann { id: string; kind: string; title: string; text: string; by: string; date: string }
interface Ev { id: string; title: string; event_date: string; end_date: string | null; kind: string; audience: string; note: string | null; days: number }
interface Overview {
  parent_first: string;
  child: { id: string; name: string; first_name: string; class_label: string; roll_no: string; registration_no: string; date_of_birth: string | null; gender: string; class_teacher: string; house: string; blood_group: string; bus: string | null; bus_on: boolean; mess: { opted: boolean; text: string } | null };
  next_child: { id: string; first_name: string } | null;
  tiles: { attendance: { pct: number | null; absent: number; leave: number } | null; result: { pct: number | null; name: string; grade: string } | null; fees: { has_plan: boolean; overdue: number; next: { name: string; date: string; amount: number } | null } | null; homework: { pending: number } | null };
  announcements: Ann[];
  events: Ev[];
}

function Mark({ text, tone }: { text: string; tone: "blue" | "amber" | "green" | "red" }) {
  const cls = { blue: "bg-[#dceff9] text-[#026f9b]", amber: "bg-[#f8ecd6] text-[#8a5a0b]", green: "bg-[#d9efe8] text-[#065740]", red: "bg-[#fce0df] text-[#ac2c28]" }[tone];
  return <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11.5px] font-bold ${cls}`} aria-hidden="true">{text}</span>;
}

export function StudentOverview() {
  const { child, setChild, me } = useParent();
  const router = useRouter();
  const r = useGet<Overview>(useChildPath("/parent/dashboard?tab=overview"));
  const [open, setOpen] = useState<Ann | null>(null);
  const d = r.data;
  const first = child?.first_name ?? "";
  const subtitle = d ? `${hello()}, ${d.parent_first}. Here's how ${d.child.first_name} is doing today, ${dmy(me.today)}.${d.next_child ? ` Use Switch to see ${d.next_child.first_name}.` : ""}` : first ? `How ${first} is doing today.` : "";
  return (
    <>
      <Head title="Student Overview" subtitle={subtitle} action={d?.tiles.fees ? <button type="button" className={redBtn} onClick={() => router.push(sectionHref("fees", "fee-status", "pay"))}>Pay fees</button> : undefined} />
      {!child && <Empty>No child is linked to your account yet. Please contact the school office.</Empty>}
      {child && <Loaded r={r}>{(o) => {
        const c = o.child; const t = o.tiles;
        const tiles = [
          ...(t.attendance ? [{ label: "Attendance", tone: "green" as const, value: t.attendance.pct === null ? "—" : `${t.attendance.pct}%`, sub: t.attendance.pct === null ? "No attendance marked yet" : `${t.attendance.absent} absent · ${t.attendance.leave} leave this year` }] : []),
          ...(t.result ? [{ label: "Latest result", tone: "blue" as const, value: t.result.pct === null ? "—" : `${t.result.pct}%`, sub: t.result.pct === null ? "No results published yet" : `${t.result.name} · grade ${t.result.grade}` }] : []),
          ...(t.fees ? [{ label: "Fees", tone: (t.fees.overdue ? "red" : "green") as "red" | "green", value: t.fees.overdue ? inr(t.fees.overdue) : t.fees.has_plan ? "All paid" : "—", sub: !t.fees.has_plan ? "No fee plan yet" : t.fees.overdue ? "Overdue" : t.fees.next ? `Next: ${t.fees.next.name} by ${dmy(t.fees.next.date)}` : "Nothing more due this year" }] : []),
          ...(t.homework ? [{ label: "Homework", tone: "amber" as const, value: t.homework.pending, sub: "Pending" }] : []),
        ];
        return (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={c.name}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#dceff9] text-sm font-bold text-[#026f9b]">{initials(c.name)}</span>
                <div className="min-w-0"><h2 className="text-base text-slate-900">{c.name}</h2><p className="text-[12.5px] text-slate-500">{[c.class_label, c.roll_no ? `roll ${c.roll_no}` : "", c.registration_no].filter(Boolean).join(" · ")}</p></div>
                {o.next_child && <button type="button" className={`${bluePill} ml-auto`} onClick={() => setChild(o.next_child!.id)}>Switch to {o.next_child.first_name}</button>}
              </div>
              <div className="my-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
                <Pairs rows={[["Date of birth", dmy(c.date_of_birth)], ["Class teacher", c.class_teacher], ["Blood group", c.blood_group], ...(c.mess ? [["Mess", c.mess.opted ? <span key="m" className="flex flex-wrap items-center gap-2"><Status value="Opted" />{c.mess.text}</span> : <Status key="m" value="Not opted" />] as [string, React.ReactNode]] : [])]} />
                <Pairs rows={[["Gender", c.gender], ["House", c.house], ...(c.bus_on ? [["School bus", c.bus ?? "Not using the school bus"] as [string, React.ReactNode]] : [])]} />
              </div>
              {tiles.length > 0 && <Tiles items={tiles} />}
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="School announcements" sub="Latest" right={<Link href={DASH("school-announcements")} className={pill}>All</Link>}>
                {!o.announcements.length && <p className="px-5 py-8 text-center text-[13px] text-slate-400">No announcements yet.</p>}
                <ul className="divide-y divide-slate-100">{o.announcements.map((a) => <li key={a.id}><button type="button" onClick={() => setOpen(a)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"><Mark text={a.kind[0]} tone={a.kind === "Circular" ? "blue" : "amber"} /><span className="min-w-0 flex-1"><span className="block text-[12.5px] font-semibold text-slate-900">{a.title}</span><span className="block truncate text-[11.5px] text-slate-500">{a.text || a.by}</span></span><span className="shrink-0 text-[11px] text-slate-500">{dmy(a.date)}</span></button></li>)}</ul>
              </Panel>
              <Panel title="Upcoming events" right={<Link href={DASH("upcoming-events")} className={pill}>All</Link>}>
                {!o.events.length && <p className="px-5 py-8 text-center text-[13px] text-slate-400">Nothing is coming up.</p>}
                <ul className="divide-y divide-slate-100">{o.events.map((e) => <li key={e.id} className="flex items-start gap-3 px-4 py-3"><Mark text={String(Number(e.event_date.slice(8)))} tone="green" /><span className="min-w-0 flex-1"><span className="block text-[12.5px] font-semibold text-slate-900">{e.title}</span><span className="block truncate text-[11.5px] text-slate-500">{e.note || e.kind}</span></span><span className="shrink-0 text-[11px] text-slate-500">{dm(e.event_date)}</span></li>)}</ul>
              </Panel>
            </div>
          </>
        );
      }}</Loaded>}
      {open && <AnnModal a={open} onClose={() => setOpen(null)} />}
    </>
  );
}

const AnnModal = ({ a, onClose }: { a: Ann; onClose: () => void }) => (
  <Modal open title={a.title} onClose={onClose}>
    <p className="mb-2 text-[12.5px] text-slate-500">{a.kind} · {a.by} · {dmy(a.date)}</p>
    <p className="whitespace-pre-wrap text-[13px] text-slate-900">{a.text || "No further text was added."}</p>
  </Modal>
);

interface Month { key: string; label: string; pct: number | null; days: number; present: number; absent: number; late: number; leave: number; partial: boolean }
interface Att { off?: string; year_name: string; year: { days: number; present: number; absent: number; late: number; leave: number; pct: number | null }; month: (Month & { name: string }) | null; months: Month[] }
export function MonthlyChart({ months, year, right }: { months: Month[]; year: string; right?: React.ReactNode }) {
  return (
    <Panel title="Monthly attendance" sub={year} right={right}>
      {months.length ? <ColumnChart title="Monthly attendance" format={(n) => `${n}%`} data={months.map((m) => ({ label: m.label, value: m.pct ?? 0, partial: m.partial, note: `${m.present} of ${m.days} days` }))} /> : <p className="px-5 py-8 text-center text-[13px] text-slate-400">No attendance marked yet.</p>}
    </Panel>
  );
}
export const monthTable = (months: Month[], name?: string) => <DataTable title="Month by month" name={name} head={[{ h: "Month" }, { h: "School days" }, { h: "Present" }, { h: "Absent" }, { h: "Late" }, { h: "Leave" }, { h: "Attendance" }]} empty="No attendance marked yet." rows={months.map((m) => row([m.key, m.days, m.present, m.absent, m.late, m.leave, m.pct ?? 0], [bold(m.label), m.days, m.present, m.absent, m.late, m.leave, m.pct === null ? "—" : `${m.pct}%`]))} />;

export function AttendanceSummary() {
  const { child } = useParent();
  const r = useGet<Att>(useChildPath("/parent/dashboard?tab=attendance"));
  const [details, setDetails] = useState(false);
  return (
    <>
      <Head title="Attendance Summary" subtitle={`Attendance at a glance for ${child?.first_name ?? "your child"}.`} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(a) => (a.off ? <Empty>{a.off} is not part of your school&apos;s plan.</Empty> : (
          <>
            <Tiles items={[
              { label: "This year", value: a.year.pct === null ? "—" : `${a.year.pct}%`, sub: `${a.year.present} of ${a.year.days} days`, tone: "blue" },
              { label: a.month?.name || "This month", value: a.month?.pct == null ? "—" : `${a.month.pct}%`, sub: a.month ? `${a.month.absent} absent · ${a.month.late} late` : "Nothing marked yet", tone: "amber" },
              { label: "Absent", value: a.year.absent, sub: "Days this year", tone: "red" },
              { label: "On leave", value: a.year.leave, sub: "Approved days", tone: "blue" },
            ]} />
            <MonthlyChart months={a.months} year={a.year_name} right={<button type="button" className={pill} onClick={() => setDetails(true)}>Details</button>} />
            {details && <Modal open title="Monthly attendance" onClose={() => setDetails(false)}><div className="max-h-[60vh] overflow-auto">{monthTable(a.months)}</div></Modal>}
          </>
        ))}</Loaded>
      </div>
    </>
  );
}

interface Perf { off?: string; tests: { id: string; name: string; pct: number; grade: string }[]; subjects: { name: string; average: number | null }[] }
export function AcademicPerformance() {
  const { child } = useParent();
  const r = useGet<Perf>(useChildPath("/parent/dashboard?tab=performance"));
  return (
    <>
      <Head title="Academic Performance" subtitle={`How ${child?.first_name ?? "your child"} is doing across the year's tests.`} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(p) => (p.off ? <Empty>{p.off} is not part of your school&apos;s plan.</Empty> : !p.tests.length ? <Empty>No results have been published yet.</Empty> : (
          <>
            <Tiles items={p.tests.slice(-4).map((t) => ({ label: t.name, value: `${t.pct}%`, sub: `Grade ${t.grade}` }))} />
            <Panel title="Average by subject" sub="Across all tests" right={<Link href={sectionHref("academics", "academic-records", "report-cards")} className={pill}>Report cards</Link>}>
              <CountBars rows={p.subjects.filter((s) => s.average !== null).map((s) => [s.name, s.average as number] as [string, number])} format={(n) => `${n}%`} />
            </Panel>
          </>
        ))}</Loaded>
      </div>
    </>
  );
}

interface Term { term: number; name: string; due_date: string; amount: number; due: number; status: string; receipt: string }
interface FeeKids { off?: string; items: { student_id: string; name: string; class_label: string; has_plan: boolean; terms: Term[] }[] }
export function FeeStatusTab() {
  const router = useRouter();
  const r = useGet<FeeKids>("/parent/dashboard?tab=fees");
  return (
    <>
      <Head title="Fee Status" subtitle="Fees for each child this year." action={<button type="button" className={redBtn} onClick={() => router.push(sectionHref("fees", "fee-status", "pay"))}>Pay now</button>} />
      <Loaded r={r}>{(f) => (f.off ? <Empty>{f.off} are not part of your school&apos;s plan.</Empty> : !f.items.length ? <Empty>No child is linked to your account yet.</Empty> : <>{f.items.map((k) => (
        <DataTable key={k.student_id} title={[k.name, k.class_label].filter(Boolean).join(" · ")} sub={`${k.terms.length} term${k.terms.length === 1 ? "" : "s"}`} name={`fees-${k.name}`} head={[{ h: "Term" }, { h: "Due date" }, { h: "Amount" }, { h: "Status" }, { h: "Receipt" }]} empty="No fee plan has been set for this child yet."
          rows={k.terms.map((t) => row([t.name, t.due_date, t.amount, t.status, t.receipt || "—"], [bold(t.name), dmy(t.due_date), inr(t.amount), <Status key="s" value={t.status} />, t.receipt || "—"]))} />
      ))}</>)}</Loaded>
    </>
  );
}

export function SchoolAnnouncements() {
  const r = useGet<{ items: Ann[]; month: string }>("/parent/dashboard?tab=announcements");
  const [open, setOpen] = useState<Ann | null>(null);
  return (
    <>
      <Head title="School Announcements" subtitle="Announcements from the school." />
      <Loaded r={r}>{(d) => <AnnouncementList items={d.items} sub={`${d.items.filter((a) => a.date.startsWith(d.month)).length} this month`} onOpen={setOpen} />}</Loaded>
      {open && <AnnModal a={open} onClose={() => setOpen(null)} />}
    </>
  );
}
export function AnnouncementList({ items, sub, onOpen }: { items: Ann[]; sub?: string; onOpen: (a: Ann) => void }) {
  return (
    <Panel title="School announcements" sub={sub}>
      {!items.length && <p className="px-5 py-8 text-center text-[13px] text-slate-400">No announcements yet.</p>}
      <ul className="divide-y divide-slate-100">{items.map((a) => <li key={a.id}><button type="button" onClick={() => onOpen(a)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"><Mark text={a.kind[0]} tone={a.kind === "Circular" ? "blue" : "amber"} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-slate-900">{a.title}<Status value={a.kind} /></span><span className="block text-[11.5px] text-slate-500">{[a.text.slice(0, 160), a.by].filter(Boolean).join(" · ")}</span></span><span className="shrink-0 text-[11px] text-slate-500">{dmy(a.date)}</span></button></li>)}</ul>
    </Panel>
  );
}
export function AnnouncementDialog(props: { a: Ann; onClose: () => void }) { return <AnnModal {...props} />; }
export type { Ann };

export function UpcomingEvents() {
  const r = useGet<{ items: Ev[] }>("/parent/dashboard?tab=events");
  return (
    <>
      <Head title="Upcoming Events" subtitle="What's coming up at school." />
      <Loaded r={r}>{(d) => (
        <DataTable title="Upcoming events" sub={`${d.items.length} event${d.items.length === 1 ? "" : "s"}`} name="upcoming-events" search head={[{ h: "Date" }, { h: "Day" }, { h: "Event" }, { h: "Details" }, { h: "In" }]} empty="Nothing is coming up."
          rows={d.items.map((e) => row([e.event_date, weekday(e.event_date), e.title, e.note || e.kind, e.days], [bold(dmy(e.event_date)), weekday(e.event_date), bold(e.title), e.note || e.kind, e.days === 0 ? "Today" : `${e.days} day${e.days === 1 ? "" : "s"}`], <button type="button" className={pill} onClick={() => downloadIcs([e])}>Add to calendar</button>))} />
      )}</Loaded>
    </>
  );
}

interface Note_ { key: string; icon: "fee" | "message" | "notice"; title: string; text: string; at: string; href: string; unread: boolean }
const when = (iso: string) => { const d = new Date(iso); const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }); const now = new Date(); return day(d) === day(now) ? `Today ${t}` : day(d) === day(new Date(now.getTime() - 86400000)) ? `Yesterday ${t}` : `${dm(day(d))} ${t}`; };
export function Notifications() {
  const router = useRouter();
  const { refreshMe } = useParent();
  const r = useGet<{ items: Note_[]; unread: number }>("/parent/notifications");
  const act = useAction(() => { r.reload(); refreshMe(); });
  const read = (keys?: string[]) => schoolFetch("/parent/notifications/read", json("POST", keys ? { keys } : {}));
  return (
    <>
      <Head title="Notifications" subtitle="Everything the school told you recently. Open one to go straight to it." action={<button type="button" className={whiteBtn} disabled={act.busy || !r.data?.unread} onClick={() => void act.run(() => read())}>Mark all as read</button>} />
      <ErrorBanner message={act.error} />
      <Loaded r={r}>{(d) => (
        <Panel title="All notifications" sub={`${d.unread} unread`}>
          {!d.items.length && <p className="px-5 py-8 text-center text-[13px] text-slate-400">Nothing new. You are up to date.</p>}
          <ul className="divide-y divide-slate-100">{d.items.map((n) => (
            <li key={n.key}><button type="button" onClick={() => { if (n.unread) void read([n.key]).then(refreshMe, () => undefined); router.push(n.href); }} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.unread ? "bg-[#f8fbfd]" : ""}`}>
              <Mark text={n.icon === "fee" ? "₹" : n.icon === "message" ? "M" : "N"} tone={n.icon === "fee" ? "red" : "blue"} />
              <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-semibold text-slate-900">{n.title}</span><span className="block text-[11.5px] text-slate-500">{n.text}</span><span className="block text-[11px] text-slate-500">{n.icon === "fee" ? "Today" : when(n.at)}</span></span>
              {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0294CE]"><span className="sr-only">Unread</span></span>}
            </button></li>
          ))}</ul>
        </Panel>
      )}</Loaded>
    </>
  );
}

interface Houses { year: string; standings: { id: string; name: string; points: number }[]; child: { first_name: string; house: string; points: number }; recent: { id: string; date: string; student: string; house: string; points: number; reason: string; by: string }[] }
const BAR = ["#c65a2e", "#2563b0", "#2f8f5b", "#c2367a", "#7c5cbf", "#b7791f"];
const place = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
export function HousePoints() {
  const r = useGet<Houses>(useChildPath("/parent/house-points"));
  const { me } = useParent();
  return (
    <>
      <Head title="Standings" subtitle={`House standings${r.data?.year ? ` for ${r.data.year}` : ""}. Points come from sports, competitions, academics and kindness, awarded by teachers.`} />
      <div className="space-y-4">
        {me.children.length > 1 && <ChildBar />}
        <Loaded r={r}>{(d) => (
          <>
            {!d.standings.length ? <Empty>The school has not set up houses yet.</Empty> : (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>{d.standings.map((h, i) => <div key={h.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3" style={{ borderTop: `3px solid ${BAR[i % BAR.length]}` }}><p className="text-[11px] text-slate-500">{place(i + 1)}</p><p className="text-base font-bold text-slate-900">{h.name}</p><p className="text-[12px] text-slate-600">{h.points.toLocaleString("en-IN")} points</p></div>)}</div>
            )}
            {d.child.house ? <Note>{d.child.first_name} is in <b>{d.child.house}</b> house and has earned {d.child.points} points this year.</Note> : <Note>{d.child.first_name} is not in a house yet.</Note>}
            <DataTable title="Recent awards" sub={`${d.recent.length} award${d.recent.length === 1 ? "" : "s"}`} name="house-awards" head={[{ h: "Date" }, { h: "Student" }, { h: "House" }, { h: "Points" }, { h: "For" }, { h: "By" }]} empty="No points have been awarded yet."
              rows={d.recent.map((a) => row([a.date, a.student, a.house, a.points, a.reason, a.by], [dmy(a.date), bold(a.student), a.house, bold(`+${a.points}`), a.reason, a.by]))} />
          </>
        )}</Loaded>
      </div>
    </>
  );
}
