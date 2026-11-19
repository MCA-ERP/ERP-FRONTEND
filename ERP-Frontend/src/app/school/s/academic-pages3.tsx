"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, useStaff } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

const S = "/school";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex flex-wrap gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const todayIso = () => new Date().toISOString().slice(0, 10);
const tone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Completed", "Approved", "Published"].includes(s) ? "good" : s === "In progress" ? "info" : s === "Submitted" ? "good" : s === "Returned" ? "warn" : "mute");

interface ClsList { items: { id: string; name: string }[] }
interface SubList { items: { id: string; name: string }[] }
interface SecList { items: { id: string; label: string }[] }

// ═════════════ curriculum ═════════════
interface Ch { id: string; class_label: string; subject: string; chapter: string; periods: number; objective: string; month: string; status: "Not started" | "In progress" | "Completed" }
export type CurTab = "curriculum" | "syllabus" | "learning-objectives";
export function CurriculumPages({ tab }: { tab: CurTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Ch[] }>(`${S}/curriculum`), []);
  const classes = useLoad(() => schoolFetch<ClsList>(`${S}/classes`), []);
  const subjects = useLoad(() => schoolFetch<SubList>(`${S}/subject-rows`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ch | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { grade_id: "", subject_id: "", chapter: "", periods: "6", objective: "", planned_month: "Apr" };
  const [f, setF] = useState(blank);
  const all = data?.items ?? [];
  const rows = all.filter((c) => has(c, search));
  const n = (s: string) => all.filter((c) => c.status === s).length;
  const cl = classes.data?.items ?? [];
  const sb = subjects.data?.items ?? [];
  const set = async (c: Ch, status: string) => { if (await act.run(() => schoolFetch(`${S}/curriculum/${c.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/curriculum`, json("POST", { grade_id: f.grade_id || cl[0]?.id, subject_id: f.subject_id || sb[0]?.id, chapter: f.chapter, periods: Number(f.periods), objective: f.objective, planned_month: f.planned_month })))) { setAdding(false); setF(blank); } };
  void tab;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || classes.error || subjects.error || act.error} />
      <Tiles items={[{ label: "Syllabus", value: all.length, sub: "All records" }, { label: "Completed", value: n("Completed"), sub: `${pct(n("Completed"), all.length)} of shown` }, { label: "In progress", value: n("In progress"), sub: `${pct(n("In progress"), all.length)} of shown` }, { label: "Not started", value: n("Not started"), sub: `${pct(n("Not started"), all.length)} of shown` }]} />
      <ListPanel title="Syllabus" noun="chapters" search={search} onSearch={setSearch} exportName={tab} head={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status"]} exportRows={rows.map((c) => [c.class_label, c.subject, c.chapter, c.periods, c.objective, c.month, c.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New chapter</button>}
        tableHead={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status", ""]} empty={loading ? "Loading…" : "No chapters yet."}
        rows={rows.map((c) => [c.class_label, c.subject, c.chapter, <span key="p" className="block text-right">{c.periods}</span>, c.objective || "—", c.month || "—", <Chip key="s" tone={tone(c.status)}>{c.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
      <Modal open={!!view} title={view?.chapter ?? ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Periods" v={view.periods} /><Row k="Learning objective" v={view.objective || "—"} /><Row k="Planned month" v={view.month || "—"} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{view.status === "Not started" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "In progress")}>Mark in progress</button>}{view.status !== "Completed" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Completed")}>Mark completed</button>}</>} /></>}</Modal>
      <Modal open={adding} title="New chapter" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class"><select className={inputCls} required value={f.grade_id || cl[0]?.id || ""} onChange={(e) => setF({ ...f, grade_id: e.target.value })}>{cl.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Subject"><select className={inputCls} required value={f.subject_id || sb[0]?.id || ""} onChange={(e) => setF({ ...f, subject_id: e.target.value })}>{sb.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          <Field label="Chapter"><input className={inputCls} required minLength={2} maxLength={200} value={f.chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Periods"><input type="number" min={1} max={200} className={inputCls} required value={f.periods} onChange={(e) => setF({ ...f, periods: e.target.value })} /></Field>
            <Field label="Planned month"><select className={inputCls} value={f.planned_month} onChange={(e) => setF({ ...f, planned_month: e.target.value })}>{MONTHS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          </div>
          <Field label="Learning objective"><input className={inputCls} maxLength={300} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ lesson planning ═════════════
interface Lp { id: string; teacher: string; class_label: string; subject: string; topic: string; week: string; week_of: string; periods: number; progress: number; status: "Draft" | "Submitted" | "Approved" | "Returned" }
export type LessonTab = "lesson-plan" | "chapter-plan" | "lesson-progress";
export function LessonPlanPages({ tab }: { tab: LessonTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Lp[] }>(`${S}/lesson-plans`), []);
  const secs = useLoad(() => schoolFetch<SecList>(`${S}/section-rows`), []);
  const subjects = useLoad(() => schoolFetch<SubList>(`${S}/subject-rows`), []);
  const staff = useStaff();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Lp | null>(null);
  const [adding, setAdding] = useState(false);
  const [pr, setPr] = useState("");
  const blank = { teacher_id: "", section_id: "", subject_id: "", topic: "", week_of: todayIso(), periods: "4" };
  const [f, setF] = useState(blank);
  const all = data?.items ?? [];
  const rows = all.filter((p) => has(p, search));
  const n = (s: string) => all.filter((p) => p.status === s).length;
  const ts = staff.data?.items ?? [];
  const sc = secs.data?.items ?? [];
  const sb = subjects.data?.items ?? [];
  const patch = async (p: Lp, body: Record<string, unknown>) => { if (await act.run(() => schoolFetch(`${S}/lesson-plans/${p.id}`, json("PATCH", body)))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/lesson-plans`, json("POST", { teacher_id: f.teacher_id || ts[0]?.id, section_id: f.section_id || sc[0]?.id, subject_id: f.subject_id || sb[0]?.id, topic: f.topic, week_of: f.week_of, periods: Number(f.periods) })))) { setAdding(false); setF(blank); } };
  const err = <ErrorBanner message={error || secs.error || subjects.error || staff.error || act.error} />;
  if (tab === "lesson-progress") {
    return (
      <div>{err}
        <Panel title="Progress" sub="%">
          {all.length ? <div className="space-y-2 p-4">{all.map((p) => <div key={p.id} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-[13px]"><span className="truncate text-slate-700">{p.class_label} · {p.subject}</span><div className="h-2 overflow-hidden rounded bg-[#e6f4fb]"><div className="h-full rounded bg-[#41afda]" style={{ width: `${p.progress}%` }} /></div><span className="text-right tabular-nums text-slate-700">{p.progress}%</span></div>)}</div> : <p className="p-6 text-center text-sm text-slate-400">{loading ? "Loading…" : "No lesson plans yet."}</p>}
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Lesson plans", value: all.length, sub: "All records" }, { label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), all.length)} of shown` }, { label: "Submitted", value: n("Submitted"), sub: `${pct(n("Submitted"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }]} />
      <ListPanel title="Lesson plans" noun="plans" search={search} onSearch={setSearch} exportName={tab} head={["Teacher", "Class", "Subject", "Chapter / topic", "Week", "Periods", "Progress", "Status"]} exportRows={rows.map((p) => [p.teacher, p.class_label, p.subject, p.topic, p.week, p.periods, `${p.progress}%`, p.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New plan</button>}
        tableHead={["Teacher", "Class", "Subject", "Chapter / topic", "Week", "Periods", "Progress", "Status", ""]} empty={loading ? "Loading…" : "No lesson plans yet."}
        rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.teacher}</b>, p.class_label, p.subject, p.topic, p.week, <span key="p" className="block text-right">{p.periods}</span>, `${p.progress}%`, <Chip key="s" tone={tone(p.status)}>{p.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(p); setPr(String(p.progress)); }}>View details</button>])} />
      <Modal open={!!view} title={view?.topic ?? ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Teacher" v={view.teacher} /><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Week" v={view.week} /><Row k="Periods" v={view.periods} /><Row k="Progress" v={`${view.progress}%`} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-3 flex items-end gap-2"><div className="w-32"><Field label="Progress (%)"><input type="number" min={0} max={100} className={inputCls} value={pr} onChange={(e) => setPr(e.target.value)} /></Field></div><button type="button" className={small} disabled={act.busy} onClick={() => void patch(view, { progress: Number(pr) })}>Save progress</button></div>
        <Foot close={() => setView(null)} left={<>{view.status === "Draft" || view.status === "Returned" ? <button type="button" className={small} disabled={act.busy} onClick={() => void patch(view, { status: "Submitted" })}>Submit</button> : null}{view.status === "Submitted" && <><button type="button" className={small} disabled={act.busy} onClick={() => void patch(view, { status: "Returned" })}>Return</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void patch(view, { status: "Approved" })}>Approve</button></>}</>} /></>}</Modal>
      <Modal open={adding} title="New lesson plan" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Teacher"><select className={inputCls} required value={f.teacher_id || ts[0]?.id || ""} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}>{ts.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class"><select className={inputCls} required value={f.section_id || sc[0]?.id || ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{sc.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
            <Field label="Subject"><select className={inputCls} required value={f.subject_id || sb[0]?.id || ""} onChange={(e) => setF({ ...f, subject_id: e.target.value })}>{sb.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </div>
          <Field label="Chapter / topic"><input className={inputCls} required minLength={2} maxLength={200} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Week of"><input type="date" className={inputCls} required value={f.week_of} onChange={(e) => setF({ ...f, week_of: e.target.value })} /></Field>
            <Field label="Periods"><input type="number" min={1} max={60} className={inputCls} required value={f.periods} onChange={(e) => setF({ ...f, periods: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ academic calendar ═════════════
interface Ev { id: string; title: string; event_date: string; end_date: string | null; kind: string; audience: string; note?: string | null; published: boolean }
interface Settings { school_week: string; saturday_hours: string; show_holidays_in_app: boolean; planned: number | null; done: number; year: string }
export type CalTab = "holidays" | "working-days" | "academic-events" | "school-calendar" | "add-to-calendar";
const KINDS = ["Holiday", "Exam", "PTM", "Event", "Sports", "Fee due", "Staff"];
const AUDIENCES = ["Everyone", "Parents", "Students", "Staff", "Teachers"];
const KIND_CLS: Record<string, string> = { Holiday: "bg-[#fce0df] text-[#ac2c28]", Exam: "bg-[#fdebd2] text-[#8a4b08]", PTM: "bg-[#dceff9] text-[#026f9b]", Event: "bg-[#d9efe8] text-[#0d5c46]", Sports: "bg-[#d6f0ee] text-[#0b5c58]", "Fee due": "bg-[#e9e2f7] text-[#5b3fa0]", Staff: "bg-[#eef1f5] text-[#475569]" };
/** Saves the published entries as an .ics file that a phone calendar can import. */
const ics = (items: Ev[]) => {
  const d = (x: string) => x.split("-").join("");
  const next = (x: string) => new Date(Date.parse(x) + 86400000).toISOString().slice(0, 10).split("-").join("");
  const esc = (t: string) => t.split("\\").join("\\\\").split(";").join("\\;").split(",").join("\\,");
  const stamp = new Date().toISOString().split("-").join("").split(":").join("").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Class Assist//School calendar//EN", ...items.flatMap((e) => ["BEGIN:VEVENT", `UID:${e.id}@myclassassist`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(e.event_date)}`, `DTEND;VALUE=DATE:${next(e.end_date ?? e.event_date)}`, `SUMMARY:${esc(e.title)}`, ...(e.note ? [`DESCRIPTION:${esc(e.note)}`] : []), "END:VEVENT"]), "END:VCALENDAR"];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join(String.fromCharCode(13, 10))], { type: "text/calendar;charset=utf-8" }));
  a.download = "school-calendar.ics";
  a.click();
  URL.revokeObjectURL(a.href);
};
const label = (e: Ev) => (e.end_date && e.end_date !== e.event_date ? `${e.title} (${day(e.event_date).replace(/ \d{4}$/, "")} – ${day(e.end_date).replace(/ \d{4}$/, "")})` : e.title);

export function CalendarPages({ tab }: { tab: CalTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Ev[]; settings: Settings }>(`${S}/calendar`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ev | null>(null);
  const [saved, setSaved] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const blank = { title: "", event_date: todayIso(), end_date: "", kind: "Event", audience: "Everyone", note: "" };
  const [hide, setHide] = useState<string[]>([]);
  const [f, setF] = useState(blank);
  const [st, setSt] = useState<Partial<Settings & { working_days: string }>>({});
  const all = data?.items ?? [];
  const s = data?.settings;
  const err = <ErrorBanner message={error || act.error} />;
  const modal = <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <>
    <dl><Row k="Date" v={view.end_date && view.end_date !== view.event_date ? `${day(view.event_date)} – ${day(view.end_date)}` : day(view.event_date)} /><Row k="Type" v={view.kind} /><Row k="For" v={view.audience} />{view.note && <Row k="Note" v={view.note} />}<Row k="Status" v={view.published ? "Published" : "Not published"} /></dl>
    <Foot close={() => setView(null)} left={<><button type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/calendar/${view.id}`, json("PATCH", { published: !view.published })))) setView(null); }}>{view.published ? "Unpublish" : "Publish"}</button><button type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/calendar/${view.id}`, { method: "DELETE" }))) setView(null); }}>Delete</button></>} /></>}</Modal>;
  const list = (title: string, noun: string, items: Ev[], hideTiles = false) => {
    const rows = items.filter((e) => has(e, search));
    const pub = items.filter((e) => e.published).length;
    return (
      <div className="space-y-5" data-report>{err}
        {!hideTiles && <Tiles items={[{ label: "Holidays and events", value: items.length, sub: "All records" }, { label: "Published", value: pub, sub: `${pct(pub, items.length)} of shown` }]} />}
        <ListPanel title={title} noun={noun} search={search} onSearch={setSearch} exportName={tab} head={["Date", "Name", "Type", "For", "Status"]} exportRows={rows.map((e) => [day(e.event_date), label(e), e.kind, e.audience, e.published ? "Published" : "Not published"])}
          tableHead={["Date", "Name", "Type", "For", "Status", ""]} empty={loading ? "Loading…" : "Nothing on the calendar yet."}
          rows={rows.map((e) => [day(e.event_date), label(e), e.kind, e.audience, <Chip key="s" tone={e.published ? "good" : "mute"}>{e.published ? "Published" : "Not published"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(e)}>View details</button>])} />
        {modal}
      </div>
    );
  };
  if (tab === "holidays") return list("Holidays and events", "days", all.filter((e) => e.kind === "Holiday"));
  if (tab === "add-to-calendar") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${S}/calendar`, json("POST", { title: f.title, event_date: f.event_date, end_date: f.end_date || null, kind: f.kind, audience: f.audience, note: f.note })))) { setSaved(`${f.title} added to the calendar.`); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Add to the school calendar" cols="lg:grid-cols-4" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <div className="sm:col-span-2 lg:col-span-4"><Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, Diwali holiday" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div>
          <Field label="From"><input type="date" className={inputCls} required value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></Field>
          <Field label="To (leave blank for one day)"><input type="date" className={inputCls} min={f.event_date} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Who sees it"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{AUDIENCES.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <div className="sm:col-span-2 lg:col-span-4"><Field label="Note"><input className={inputCls} maxLength={300} placeholder="Time, venue or what to bring" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
        </FormCard>
      </div>
    );
  }
  if (tab === "working-days") {
    const cur = { school_week: st.school_week ?? s?.school_week ?? "Monday – Saturday", saturday_hours: st.saturday_hours ?? s?.saturday_hours ?? "Full day", show: st.show_holidays_in_app ?? s?.show_holidays_in_app ?? true, days: st.working_days ?? String(s?.planned ?? "") };
    const row = "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5";
    const save = async () => { setSaved(""); if (await act.run(() => schoolFetch(`${S}/calendar-settings`, json("PUT", { school_week: cur.school_week, saturday_hours: cur.saturday_hours, show_holidays_in_app: cur.show, working_days: cur.days ? Number(cur.days) : null })))) { setSt({}); setSaved("Saved"); } };
    return (
      <div>{err}{okBox(saved)}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Working days</h2></div>
          <div className={row}><span className="text-[13px] text-slate-900">School week</span><select className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]" value={cur.school_week} onChange={(e) => setSt({ ...st, school_week: e.target.value })}><option>Monday – Saturday</option><option>Monday – Friday</option></select></div>
          <div className={row}><div><p className="text-[13px] text-slate-900">Working days this year</p><p className="text-[11px] text-[#026f9b]">{s?.planned ?? "—"} planned · {s?.done ?? 0} done so far</p></div><input type="number" min={1} max={366} aria-label="Working days this year" className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-[13px]" value={cur.days} onChange={(e) => setSt({ ...st, working_days: e.target.value })} /></div>
          <div className={row}><span className="text-[13px] text-slate-900">Saturday hours</span><select className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]" disabled={cur.school_week === "Monday – Friday"} value={cur.saturday_hours} onChange={(e) => setSt({ ...st, saturday_hours: e.target.value })}><option>Full day</option><option>Half day (till 12:30)</option><option>Off</option></select></div>
          <div className={row}><span className="text-[13px] text-slate-900">Show holidays in the parent app</span><Toggle checked={cur.show} onChange={(v) => setSt({ ...st, show_holidays_in_app: v })} label="Show holidays in the parent app" /></div>
          <div className="flex justify-end gap-2.5 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setSt({}); setSaved(""); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={() => void save()}>{act.busy ? "Saving…" : "Save"}</button></div>
        </div>
      </div>
    );
  }
  // month grid
  const y = month.getFullYear(); const m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, i) => (i >= lead && i < lead + total ? i - lead + 1 : 0));
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const today = todayIso();
  return (
    <div>{err}
      {tab === "school-calendar" && <div className="mb-4 flex justify-end"><button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 hover:border-slate-400" disabled={!all.length} onClick={() => ics(all.filter((e) => e.published))}>Add all to my phone calendar</button></div>}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-700 hover:border-slate-400" onClick={() => setMonth(new Date(y, m - 1, 1))}>←</button>
          <b className="text-[15px] text-slate-900">{MONTHS[m]} {y}</b>
          <button type="button" aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-700 hover:border-slate-400" onClick={() => setMonth(new Date(y, m + 1, 1))}>→</button>
          <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-800 hover:border-slate-400" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
          <span className="ml-auto flex flex-wrap gap-2 text-[12px]">{KINDS.map((k) => <label key={k} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 ${KIND_CLS[k]}`}><input type="checkbox" className="h-3.5 w-3.5 accent-[#026f9b]" checked={!hide.includes(k)} onChange={() => setHide(hide.includes(k) ? hide.filter((x) => x !== k) : [...hide, k])} />{k}</label>)}</span>
        </div>
        <div className="grid border-t border-slate-100 bg-[#f3f9fd] text-center text-[12px] text-slate-500" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-2.5">{d}</div>)}</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {cells.map((d, i) => {
            const evs = d ? all.filter((e) => e.event_date === iso(d) && !hide.includes(e.kind)) : [];
            return <div key={i} className={`min-h-[4.5rem] border-r border-t border-slate-100 p-1.5 text-[12px] ${d && iso(d) === today ? "outline outline-1 -outline-offset-1 outline-[#0294ce]" : ""}`}>
              {d > 0 && <p className={i % 7 === 6 ? "text-[#c0392b]" : "text-slate-800"}>{d}</p>}
              {evs.map((e) => <button key={e.id} type="button" onClick={() => setView(e)} className={`mt-1 block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ${KIND_CLS[e.kind]}`}>{label(e)}</button>)}
            </div>;
          })}
        </div>
      </div>
      {modal}
    </div>
  );
}
