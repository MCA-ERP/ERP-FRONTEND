"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { SubjectAllocationPages } from "./academic-pages2";
import { ClassTimetablePages } from "./timetable-pages";

const T = "/school/timetable";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Bar = ({ label, children }: { label: string; children: ReactNode }) => <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label></div>;
const selCls = "max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";

// ═════════════ read-only grid ═════════════
interface Period { id: string; label: string; starts: string; ends: string; kind: "Teaching" | "Break" }
interface GridData { label: string; year: string; days: number; periods: Period[]; subjects: { id: string; name: string }[]; slots: { day: number; period_id: string; subject_id: string | null; teacher: string }[] }
function ReadGrid({ g }: { g: GridData }) {
  const th = "px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500";
  return (
    <Panel title={g.label} sub={`Timetable · ${g.year}`}>
      {g.periods.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-[13px]"><thead><tr className="bg-[#f3f9fd]"><th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">Period</th>{DAYS.slice(0, g.days).map((d) => <th key={d} className={th}>{d}</th>)}</tr></thead>
        <tbody>{g.periods.map((p) => p.kind === "Break" ? <tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-2.5"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td><td colSpan={g.days} className="px-3 py-2.5 text-center text-slate-500">{p.label}</td></tr>
          : <tr key={p.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td>{DAYS.slice(0, g.days).map((_, i) => { const s = g.slots.find((x) => x.day === i + 1 && x.period_id === p.id); const n = g.subjects.find((x) => x.id === s?.subject_id)?.name; return <td key={i} className="px-3 py-2 text-center">{n ? <><p className="font-medium text-slate-900">{n}</p><p className="text-[11px] text-[#026f9b]">{s?.teacher}</p></> : <span className="text-slate-400">—</span>}</td>; })}</tr>)}</tbody></table></div>
        : <p className="p-6 text-center text-sm text-slate-400">Add the bell schedule in Timetable Setup first.</p>}
    </Panel>
  );
}

// ═════════════ teacher availability ═════════════
interface Week { name: string; days: number; periods: Period[]; limit: number; per_week: number; free: number; classes: number; slots: { day: number; period_id: string; class_label: string; subject: string }[] }
export function AvailabilityPage() {
  const list = useLoad(() => schoolFetch<{ items: { id: string; name: string; subject: string }[] }>(`${T}/teachers`), []);
  const [pick, setPick] = useState("");
  const id = pick || list.data?.items[0]?.id || "";
  const week = useLoad(() => (id ? schoolFetch<Week>(`${T}/teacher-week/${id}`) : Promise.resolve(null)), [id]);
  const w = week.data;
  const cur = list.data?.items.find((t) => t.id === id);
  const teaching = (w?.periods ?? []).filter((p) => p.kind === "Teaching");
  return (
    <div className="space-y-5"><ErrorBanner message={list.error || week.error} />
      <Bar label="Teacher"><select aria-label="Teacher" value={id} onChange={(e) => setPick(e.target.value)} className={selCls}>{!list.data?.items.length && <option value="">No teachers have subjects yet</option>}{list.data?.items.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` · ${t.subject}` : ""}</option>)}</select></Bar>
      <Tiles items={[{ label: "Periods a week", value: w?.per_week ?? 0, sub: `Limit ${w?.limit ?? 40}` }, { label: "Free periods", value: w?.free ?? 0 }, { label: "Classes", value: w?.classes ?? 0 }]} />
      <Panel title={w?.name ?? ""} sub={cur?.subject}>
        {w && teaching.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-[11px] uppercase tracking-wide text-slate-500"><th className="px-4 py-2.5 text-left font-medium">Period</th>{DAYS.slice(0, w.days).map((d) => <th key={d} className="px-3 py-2.5 font-medium">{d}</th>)}</tr></thead>
          <tbody>{teaching.map((p) => <tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{p.label}</td>{DAYS.slice(0, w.days).map((_, i) => { const s = w.slots.find((x) => x.day === i + 1 && x.period_id === p.id); return <td key={i} className={`px-3 py-2 text-center ${s ? "" : "bg-[#f3f9fd]"}`}>{s ? <><p className="font-medium text-slate-900">{s.class_label}</p><p className="text-[11px] text-slate-500">{s.subject}</p></> : <span className="text-slate-500">Free</span>}</td>; })}</tr>)}</tbody></table></div>
          : <p className="p-6 text-center text-sm text-slate-400">{week.loading ? "Loading…" : "Generate the timetable to see each teacher's week."}</p>}
      </Panel>
    </div>
  );
}

// ═════════════ rooms ═════════════
interface Room { id: string; name: string; block: string; capacity: number; section_id: string | null; allocated_to: string; projector: boolean; status: string }
interface RoomData { items: Room[]; sections: { id: string; label: string }[] }
export type RoomTab = "classroom-list" | "room-allocation" | "room-wise";
export function RoomPages({ tab }: { tab: RoomTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<RoomData>(`${T}/rooms`), []);
  const act = useAction(reload);
  const [pick, setPick] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Room | null>(null);
  const [form, setForm] = useState<Room | "new" | null>(null);
  const [f, setF] = useState({ name: "", block: "", capacity: "40", section_id: "", projector: false, status: "Available" });
  const rooms = data?.items ?? [];
  const room = rooms.find((r) => r.id === (pick || rooms[0]?.id));
  const grid = useLoad(() => (tab !== "classroom-list" && room?.section_id ? schoolFetch<GridData>(`${T}/grid/${room.section_id}`) : Promise.resolve(null)), [tab, room?.section_id]);
  const open = (r: Room | "new") => { setF(r === "new" ? { name: "", block: "", capacity: "40", section_id: "", projector: false, status: "Available" } : { name: r.name, block: r.block, capacity: String(r.capacity), section_id: r.section_id ?? "", projector: r.projector, status: r.status }); setForm(r); setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); const body = { name: f.name, block: f.block, capacity: Number(f.capacity), section_id: f.section_id || null, projector: f.projector, status: f.status }; if (await act.run(() => (form === "new" ? schoolFetch(`${T}/rooms`, json("POST", body)) : schoolFetch(`${T}/rooms/${(form as Room).id}`, json("PUT", body))))) setForm(null); };
  if (tab !== "classroom-list") {
    return (
      <div><ErrorBanner message={error || grid.error} />
        <Bar label="Room"><select aria-label="Room" value={room?.id ?? ""} onChange={(e) => setPick(e.target.value)} className={selCls}>{!rooms.length && <option value="">No rooms yet</option>}{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Bar>
        {room && !room.section_id ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">This room isn&apos;t allocated to a class yet. Allocate it in Classroom List.</p> : grid.data ? <ReadGrid g={grid.data} /> : <p className="p-6 text-center text-sm text-slate-400">{loading || grid.loading ? "Loading…" : "Add a room first."}</p>}
      </div>
    );
  }
  const rows = rooms.filter((r) => has(r, search));
  const av = rooms.filter((r) => r.status === "Available").length;
  return (
    <div className="space-y-5" data-report><ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Rooms", value: rooms.length, sub: "All records" }, { label: "Available", value: av, sub: `${pct(av, rooms.length)} of shown` }]} />
      <ListPanel title="Rooms" noun="rooms" search={search} onSearch={setSearch} exportName="classrooms" head={["Room", "Block", "Capacity", "Allocated to", "Projector", "Status"]} exportRows={rows.map((r) => [r.name, r.block, r.capacity, r.allocated_to, r.projector ? "Yes" : "No", r.status])}
        extra={<button type="button" className={small} onClick={() => open("new")}>+ Add room</button>} tableHead={["Room", "Block", "Capacity", "Allocated to", "Projector", "Status", ""]} empty={loading ? "Loading…" : "No rooms yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.block || "—", r.capacity, r.allocated_to || "—", r.projector ? "Yes" : "No", <Chip key="s" tone={r.status === "Available" ? "good" : "mute"}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={`Room ${view?.name ?? ""}`} onClose={() => setView(null)}>{view && <><dl><Row k="Block" v={view.block || "—"} /><Row k="Capacity" v={view.capacity} /><Row k="Allocated to" v={view.allocated_to || "—"} /><Row k="Projector" v={view.projector ? "Yes" : "No"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} onClick={() => open(view)}>Edit</button>} /></>}</Modal>
      <Modal open={!!form} title={form === "new" ? "Add a room" : "Edit room"} onClose={() => setForm(null)}><form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><Field label="Room"><input className={inputCls} required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Block"><input className={inputCls} maxLength={40} value={f.block} onChange={(e) => setF({ ...f, block: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Capacity"><input type="number" min={1} className={inputCls} required value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field><Field label="Allocated to"><select className={inputCls} value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}><option value="">—</option>{data?.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Projector"><select className={inputCls} value={f.projector ? "Yes" : "No"} onChange={(e) => setF({ ...f, projector: e.target.value === "Yes" })}><option>Yes</option><option>No</option></select></Field><Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Available</option><option>Occupied</option><option>Maintenance</option></select></Field></div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div></form></Modal>
    </div>
  );
}

// ═════════════ subject allocation lists ═════════════
interface Alloc { id: string; section: string; subject: string; teacher: string; periods: number }
export type AllocListTab = "subject" | "teacher" | "period-mapping";
export function AllocationListPage({ tab }: { tab: AllocListTab }) {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Alloc[] }>(`${T}/allocations`), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Alloc | null>(null);
  const title = { subject: "Subject mapping", teacher: "Teacher mapping", "period-mapping": "Period Mapping mapping" }[tab];
  const rows = (data?.items ?? []).filter((a) => has(a, search));
  return (
    <div data-report><ErrorBanner message={error} />
      <ListPanel title={title} noun="allocations" search={search} onSearch={setSearch} exportName={tab} head={["Section", "Subject", "Teacher", "Periods / week"]} exportRows={rows.map((a) => [a.section, a.subject, a.teacher, a.periods])}
        tableHead={["Section", "Subject", "Teacher", "Periods / week", ""]} empty={loading ? "Loading…" : "Nothing is allocated yet. Assign subjects on Subject Allocation › Teacher-wise Subject."}
        rows={rows.map((a) => [<b key="s" className="font-semibold text-slate-900">{a.section}</b>, <span key="b" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{a.subject}</span>, a.teacher, <span key="p" className="block text-right">{a.periods}</span>, <button key="v" type="button" className={small} onClick={() => setView(a)}>View details</button>])} />
      <Modal open={!!view} title={view?.teacher ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Section" v={view.section} /><Row k="Subject" v={view.subject} /><Row k="Periods / week" v={view.periods} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ timetable view and teacher timetable wrappers ═════════════
export type ViewTab = "class-wise" | "teacher-wise" | "room-wise";
export function TimetableViewPages({ tab }: { tab: ViewTab }) {
  return tab === "class-wise" ? <ClassTimetablePages tab="create" /> : tab === "teacher-wise" ? <AvailabilityPage /> : <RoomPages tab="room-wise" />;
}
export type TeacherTtTab = "teacher-allocation" | "availability";
export function TeacherTimetablePages({ tab }: { tab: TeacherTtTab }) {
  return tab === "availability" ? <AvailabilityPage /> : <SubjectAllocationPages tab="teacher-wise-subject" />;
}

// ═════════════ reports ═════════════
export type TtReportTab = "workload" | "period-allocation" | "conflicts";
interface Conf { kind: string; where: string; when: string; who: string; with: string; sections: string[] }
export function TimetableReportPages({ tab }: { tab: TtReportTab }) {
  const w = useLoad(() => (tab === "workload" ? schoolFetch<{ limit: number; items: { id: string; name: string; periods: number }[] }>(`${T}/workload`) : Promise.resolve(null)), [tab]);
  const c = useLoad(() => (tab === "conflicts" ? schoolFetch<{ items: Conf[] }>(`${T}/conflicts`) : Promise.resolve(null)), [tab]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Conf | null>(null);
  if (tab === "period-allocation") return <AllocationListPage tab="period-mapping" />;
  if (tab === "workload") {
    const items = w.data?.items ?? [];
    return <div><ErrorBanner message={w.error} /><Panel title="Teaching load" sub="Periods per week">{items.length ? <BarRows rows={items.map((x): [string, number] => [x.name, x.periods])} format={(n) => `${n} periods`} /> : <p className="p-6 text-center text-sm text-slate-400">{w.loading ? "Loading…" : "Generate the timetable to see each teacher's load."}</p>}</Panel></div>;
  }
  const rows = (c.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div data-report><ErrorBanner message={c.error} />
      <ListPanel title="Conflicts" noun="conflicts" search={search} onSearch={setSearch} exportName="timetable-conflicts" head={["Where", "When", "Who", "Clash with", "Type"]} exportRows={rows.map((x) => [x.where, x.when, x.who, x.with, x.kind])}
        tableHead={["Where", "When", "Who", "Clash with", "Type", ""]} empty={c.loading ? "Loading…" : "No clashes found."}
        rows={rows.map((x) => [<b key="w" className="font-semibold text-slate-900">{x.where}</b>, <span key="t" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{x.when}</span>, x.who, x.with, <Chip key="k" tone="mute">{x.kind}</Chip>, <span key="a" className="flex gap-1.5"><Link href="/school/timetable/class-timetable?tab=auto-generate" className={small}>Fix</Link><button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
      <Modal open={!!view} title={view?.kind ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Where" v={view.where} /><Row k="When" v={view.when} /><Row k="Who" v={view.who} /><Row k="Classes involved" v={view.sections.join(", ")} /></dl><p className="mt-3 text-[13px] text-slate-600">Open Class Timetable › Auto Generate and press Regenerate, or lock the period you want to keep and regenerate around it.</p><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ substitution ═════════════
interface Cand { id: string; name: string; reason: string; today: number }
interface SItem { period_id: string; period: string; starts: string; section_id: string; class_label: string; subject: string; absent_id: string; absent: string; reason: string; covered_by: string; candidates: Cand[] }
interface STodayData { date: string; weekday: string; absent: { id: string; name: string; reason: string }[]; items: SItem[]; covered: number; max_covers: number }
interface Sub { id: string; date: string; period: string; class_label: string; absent: string; substitute: string; subject: string; status: string }
export type SubTab = "substitute-teacher" | "free-periods" | "substitution-history" | "smart-assign";

export function SubstitutionPages({ tab }: { tab: SubTab }) {
  const today = useLoad(() => schoolFetch<STodayData>(`${T}/substitution/today`), []);
  const [period, setPeriod] = useState("");
  const free = useLoad(() => (tab === "free-periods" ? schoolFetch<{ period: { id: string; label: string } | null; periods: { id: string; label: string }[]; items: { id: string; name: string; subject: string; periods_today: number; next: string }[] }>(`${T}/substitution/free${period ? `?period_id=${period}` : ""}`) : Promise.resolve(null)), [tab, period]);
  const hist = useLoad(() => (tab === "substitution-history" ? schoolFetch<{ items: Sub[] }>(`${T}/substitution/history`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { today.reload(); free.reload(); hist.reload(); });
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [cover, setCover] = useState<{ id: string; name: string } | null>(null);
  const [coverPick, setCoverPick] = useState("");
  const [view, setView] = useState<Sub | null>(null);
  const t = today.data;
  const err = <ErrorBanner message={today.error || free.error || hist.error || act.error} />;
  const assign = async (i: SItem, sub: string) => { setMsg(""); if (await act.run(() => schoolFetch(`${T}/substitution`, json("POST", { period_id: i.period_id, section_id: i.section_id, absent_teacher_id: i.absent_id, substitute_id: sub })))) setMsg(`${i.class_label} ${i.period} is covered.`); };
  const open = (t?.items ?? []).filter((i) => !i.covered_by);
  const key = (i: SItem) => `${i.period_id}|${i.section_id}`;

  if (tab === "substitute-teacher") {
    const rows = open.filter((i) => has(i, search));
    return (
      <div data-report>{err}{okBox(msg)}
        <ListPanel title="Periods to cover" noun="periods" search={search} onSearch={setSearch} exportName="periods-to-cover" head={["Absent teacher", "Period", "Class", "Subject"]} exportRows={rows.map((i) => [i.absent, i.period, i.class_label, i.subject])}
          tableHead={["Absent teacher", "Period", "Class", "Subject", ""]} empty={today.loading ? "Loading…" : "No teacher is absent today, or every period is covered."}
          rows={rows.map((i) => { const pick = choice[key(i)] ?? i.candidates[0]?.id ?? ""; return [<b key="a" className="font-semibold text-slate-900">{i.absent}</b>, <span key="p" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{i.period}</span>, i.class_label, i.subject || "—", <span key="s" className="flex items-center gap-2"><select aria-label={`Substitute for ${i.absent} ${i.period}`} className={sel} value={pick} onChange={(e) => setChoice({ ...choice, [key(i)]: e.target.value })}>{!i.candidates.length && <option value="">Nobody is free</option>}{i.candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className={primaryCls} disabled={act.busy || !pick} onClick={() => void assign(i, pick)}>Assign</button></span>]; })} />
      </div>
    );
  }
  if (tab === "free-periods") {
    const f = free.data;
    const items = (f?.items ?? []).filter((x) => has(x, search));
    const pend = open.filter((i) => i.period_id === f?.period?.id);
    const go = async () => { const i = pend.find((x) => key(x) === coverPick) ?? pend[0]; if (cover && i && await act.run(() => schoolFetch(`${T}/substitution`, json("POST", { period_id: i.period_id, section_id: i.section_id, absent_teacher_id: i.absent_id, substitute_id: cover.id })))) { setCover(null); setMsg(`${cover.name} is covering ${i.class_label} ${i.period}.`); } };
    return (
      <div data-report>{err}{okBox(msg)}
        <ListPanel title={`Free now · ${f?.period?.label ?? ""}`} noun="teachers" search={search} onSearch={setSearch} exportName="free-periods" head={["Teacher", "Subject", "Periods today", "Next class"]} exportRows={items.map((x) => [x.name, x.subject, x.periods_today, x.next])}
          extra={<select className={sel} aria-label="Period" value={f?.period?.id ?? ""} onChange={(e) => setPeriod(e.target.value)}>{(f?.periods ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>}
          tableHead={["Teacher", "Periods today", "Next class", ""]} empty={free.loading ? "Loading…" : "Nobody is free in this period."}
          rows={items.map((x) => [<div key="n"><p className="font-semibold text-slate-900">{x.name}</p><p className="text-xs text-slate-400">{x.subject}</p></div>, x.periods_today, x.next, <button key="a" type="button" className={primaryCls} onClick={() => { setCover({ id: x.id, name: x.name }); setCoverPick(""); }}>Assign substitution</button>])} />
        <Modal open={!!cover} title={`Assign ${cover?.name ?? ""}`} onClose={() => setCover(null)}>
          {pend.length ? <div className="space-y-3"><Field label={`Which period in ${f?.period?.label}?`}><select className={inputCls} value={coverPick || key(pend[0])} onChange={(e) => setCoverPick(e.target.value)}>{pend.map((i) => <option key={key(i)} value={key(i)}>{i.class_label} · {i.subject} (for {i.absent})</option>)}</select></Field><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setCover(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void go()}>Assign</button></div></div>
            : <><p className="text-[13px] text-slate-600">No absent teacher has a period to cover in {f?.period?.label} today.</p><Foot close={() => setCover(null)} /></>}
        </Modal>
      </div>
    );
  }
  if (tab === "substitution-history") {
    const all = hist.data?.items ?? [];
    const rows = all.filter((x) => has(x, search));
    const n = (s: string) => all.filter((x) => x.status === s).length;
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Substitutions", value: all.length, sub: "All records" }, { label: "Assigned", value: n("Assigned"), sub: `${pct(n("Assigned"), all.length)} of shown` }, { label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }, { label: "Completed", value: n("Completed"), sub: `${pct(n("Completed"), all.length)} of shown` }]} />
        <ListPanel title="Substitutions" noun="substitutions" search={search} onSearch={setSearch} exportName="substitution-history" head={["Date", "Period", "Class", "Absent teacher", "Substitute", "Subject", "Status"]} exportRows={rows.map((x) => [day(x.date), x.period, x.class_label, x.absent, x.substitute, x.subject, x.status])}
          tableHead={["Date", "Period", "Class", "Absent teacher", "Substitute", "Subject", "Status", ""]} empty={hist.loading ? "Loading…" : "No substitutions yet."}
          rows={rows.map((x) => [day(x.date), x.period, x.class_label, x.absent, x.substitute, x.subject || "—", <Chip key="s" tone={x.status === "Completed" ? "good" : x.status === "Pending" ? "warn" : "mute"}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
        <Modal open={!!view} title={view ? `${view.class_label} · ${view.period}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Date" v={day(view.date)} /><Row k="Absent teacher" v={view.absent} /><Row k="Substitute" v={view.substitute} /><Row k="Subject" v={view.subject || "—"} /><Row k="Status" v={view.status} /></dl>
          <Foot close={() => setView(null)} left={view.status === "Assigned" ? <button type="button" className={primaryCls} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${T}/substitution/${view.id}`, json("PATCH", { status: "Completed" })))) setView(null); }}>Mark completed</button> : undefined} /></>}</Modal>
      </div>
    );
  }
  const rows = (t?.items ?? []).filter((i) => has(i, search));
  const best = async () => { setMsg(""); let m = ""; if (await act.run(async () => { const r = await schoolFetch<{ assigned: number; left: number }>(`${T}/substitution/auto`, json("POST", {})); m = `${r.assigned} periods covered.${r.left ? ` ${r.left} had nobody free.` : ""}`; })) setMsg(m); };
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <div className="flex items-start justify-between gap-4"><p className="max-w-2xl text-[13px] text-slate-600">Teachers absent today ({t?.weekday}) and every period they teach. For each period the best free teacher is suggested: same subject first, then someone who knows the class, then whoever has done the fewest covers this week.</p><button type="button" className="rounded-full bg-[#e5413a] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#c9322c] disabled:opacity-50" disabled={act.busy || !open.length} onClick={() => void best()}>Assign the best for all</button></div>
      <Tiles items={[{ label: "Teachers absent", value: t?.absent.length ?? 0, sub: t?.absent.map((a) => a.name).join(", ") || "Nobody" }, { label: "Periods to cover", value: t?.items.length ?? 0 }, { label: "Covered", value: `${t?.covered ?? 0} of ${t?.items.length ?? 0}` }, { label: "Fairness", value: `Max ${t?.max_covers ?? 0} covers`, sub: "per teacher this week" }]} />
      <ListPanel title="Periods to cover today" noun="periods" search={search} onSearch={setSearch} exportName="smart-assign" head={["Period", "Class", "Subject", "Absent", "Substitute"]} exportRows={rows.map((i) => [`${i.period} ${i.starts}`, i.class_label, i.subject, i.absent, i.covered_by])}
        tableHead={["Period", "Class", "Subject", "Absent", "Substitute"]} empty={today.loading ? "Loading…" : "No teacher is absent today."}
        rows={rows.map((i) => [<span key="p"><b>{i.period}</b> <span className="text-slate-500">{i.starts}</span></span>, i.class_label, i.subject || "—", <div key="a"><p className="text-slate-900">{i.absent}</p><p className="text-xs text-slate-500">{i.reason}</p></div>,
          i.covered_by ? <Chip key="c" tone="good">Covered by {i.covered_by}</Chip> : <div key="s" className="space-y-1.5">{i.candidates.slice(0, 3).map((c, k) => <button key={c.id} type="button" disabled={act.busy} onClick={() => void assign(i, c.id)} className={`block w-full rounded-lg border px-3 py-1.5 text-left ${k === 0 ? "border-[#026f9b] bg-[#e6f4fb]" : "border-slate-200 bg-white"} hover:border-slate-400`}><span className="block text-[13px] font-semibold text-slate-900">{c.name}</span><span className="block text-[11px] text-slate-500">{c.reason}</span></button>)}{!i.candidates.length && <span className="text-xs text-slate-400">Nobody is free</span>}</div>])} />
    </div>
  );
}
