"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useParents } from "./parent-pages";
import { useRoster } from "./student-pages2";

const S = "/school";
const todayIso = () => new Date().toISOString().slice(0, 10);
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

interface SecRow { id: string; label: string }
const useSections = () => useLoad(() => schoolFetch<{ items: SecRow[] }>(`${S}/section-rows`), []);
function SectionBar({ secs, value, onChange, children }: { secs: SecRow[]; value: string; onChange: (v: string) => void; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section
        <select aria-label="Section" value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!secs.length && <option value="">No sections</option>}{secs.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </label>
      {children}
    </div>
  );
}

// ═════════════ student attendance ═════════════
interface Daily { date: string; present: number; absent: number; late: number; leave: number; marked_students: number; pct: number | null; not_marked: string[]; sections: { id: string; label: string; grade: string; students: number; present: number; pct: number | null; marked: boolean; marked_by: string }[]; classes: { grade: string; pct: number | null }[]; streaks: { student_id: string; name: string; class_label: string; days: number }[] }
export type StuAttTab = "daily-attendance" | "class-wise-attendance" | "subject-wise-attendance";

export function StudentAttendancePages({ tab }: { tab: StuAttTab }) {
  const daily = useLoad(() => schoolFetch<Daily>(`${S}/attendance/daily?date=${todayIso()}`), []);
  const parents = useParents();
  const secs = useSections();
  const [sec, setSec] = useState("");
  const subj = useLoad(() => { const id = sec || secs.data?.items[0]?.id; return id ? schoolFetch<{ items: { id: string; name: string; teacher: string }[] }>(`${S}/attendance/subjects?section_id=${id}`) : Promise.resolve({ items: [] }); }, [sec, secs.data?.items[0]?.id]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Daily["sections"][number] | null>(null);
  const [vs, setVs] = useState<{ id: string; name: string; teacher: string } | null>(null);
  const d = daily.data;
  const err = <ErrorBanner message={daily.error || secs.error || subj.error} />;
  if (tab === "daily-attendance") {
    const phone = (id: string) => parents.data?.items.find((p) => p.students.some((k) => k.id === id))?.mobile ?? "";
    return (
      <div className="space-y-5">{err}
        <Tiles items={[
          { label: "Present", value: (d?.present ?? 0).toLocaleString("en-IN"), sub: d?.pct != null ? `${d.pct}%` : "Nothing marked yet today" },
          { label: "Absent", value: d?.absent ?? 0, sub: "Marked absent today" },
          { label: "Late", value: d?.late ?? 0, sub: "Marked late today" },
          { label: "Classes not marked", value: d?.not_marked.length ?? 0, sub: d?.not_marked.slice(0, 3).join(", ") || "All marked" },
        ]} />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel title="Present by class" sub="%">
            {d?.classes.length ? <div className="space-y-2 p-4">{d.classes.map((c) => <div key={c.grade} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3 text-[13px]"><span className="truncate text-slate-700">{c.grade}</span><div className="h-2 overflow-hidden rounded bg-[#e6f4fb]"><div className="h-full rounded bg-[#41afda]" style={{ width: `${c.pct ?? 0}%` }} /></div><span className="text-right tabular-nums text-slate-700">{c.pct != null ? `${c.pct}%` : "—"}</span></div>)}</div> : <p className="p-6 text-center text-sm text-slate-400">{daily.loading ? "Loading…" : "No classes yet."}</p>}
          </Panel>
          <Panel title="Absent 3+ days in a row">
            {d?.streaks.length ? <ul>{d.streaks.map((s) => <li key={s.student_id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#fbeedd] text-[11px] font-semibold text-[#8a4b08]">{initials(s.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#026f9b]">{s.name}</p><p className="text-xs text-slate-500">{s.class_label} · absent {s.days} days</p></div>{phone(s.student_id) ? <a href={`tel:${phone(s.student_id).replace(/\s/g, "")}`} className={small}>Call parent</a> : <span className="text-xs text-slate-400">No number</span>}</li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">{daily.loading ? "Loading…" : "Nobody has been absent three days running."}</p>}
          </Panel>
        </div>
      </div>
    );
  }
  if (tab === "class-wise-attendance") {
    const rows = (d?.sections ?? []).filter((s) => has(s, search));
    return (
      <div data-report>{err}
        <ListPanel title="Class-wise today" noun="sections" search={search} onSearch={setSearch} exportName="class-wise-attendance" head={["Section", "Students", "Present", "%", "Marked by", "Status"]} exportRows={rows.map((s) => [s.label, s.students, s.present, s.pct != null ? `${s.pct}%` : "", s.marked_by, s.marked ? "Marked" : "Not marked"])}
          tableHead={["Section", "Students", "Present", "%", "Marked by", "Status", ""]} empty={daily.loading ? "Loading…" : "No sections yet."}
          rows={rows.map((s) => [<b key="n" className="font-semibold text-slate-900">{s.label}</b>, s.students, s.marked ? s.present : "—", s.pct != null ? `${s.pct}%` : "—", s.marked_by || "—", <Chip key="c" tone="mute">{s.marked ? "Marked" : "Not marked"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>])} />
        <Modal open={!!view} title={view?.label ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Students" v={view.students} /><Row k="Present" v={view.marked ? view.present : "—"} /><Row k="Attendance" v={view.pct != null ? `${view.pct}%` : "—"} /><Row k="Marked by" v={view.marked_by || "—"} /><Row k="Status" v={view.marked ? "Marked" : "Not marked"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  const cur = secs.data?.items.find((s) => s.id === (sec || secs.data?.items[0]?.id));
  const rows = subj.data?.items ?? [];
  return (
    <div data-report>{err}
      <SectionBar secs={secs.data?.items ?? []} value={cur?.id ?? ""} onChange={setSec} />
      <ListPanel title="Subject-wise" noun="subjects" search="" onSearch={() => undefined} hideSearch exportName="subject-wise-attendance" head={["Subject", "Periods held", "Average present", "Teacher"]} exportRows={rows.map((r) => [r.name, "", "", r.teacher])}
        tableHead={["Subject", "Periods held", "Average present", "Teacher", ""]} empty={subj.loading ? "Loading…" : "No subjects are set for this class."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, "—", "—", r.teacher || "—", <button key="v" type="button" className={small} onClick={() => setVs(r)}>View details</button>])} />
      <Modal open={!!vs} title={vs?.name ?? ""} onClose={() => setVs(null)}>{vs && <><dl><Row k="Class" v={cur?.label ?? "—"} /><Row k="Teacher" v={vs.teacher || "—"} /><Row k="Periods held" v="Not recorded yet" /></dl><Foot close={() => setVs(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ attendance entry ═════════════
type St = "P" | "A" | "L" | "H" | "V";
interface Sheet { label: string; date: string; marked: boolean; students: { id: string; name: string; roll_no: string; status: St | null }[] }
export type EntryTab = "mark-present" | "mark-absent" | "late" | "half-day" | "leave";
const ENTRY: Record<EntryTab, { st: St; all: string }> = { "mark-present": { st: "P", all: "Mark everyone present" }, "mark-absent": { st: "A", all: "Mark everyone absent" }, late: { st: "L", all: "Mark everyone late" }, "half-day": { st: "H", all: "Mark everyone half day" }, leave: { st: "V", all: "Mark everyone leave" } };
const BTN: Record<St, string> = { P: "border-[#a8dcc8] bg-[#d9efe8] text-[#0d5c46]", A: "border-[#f0b5b3] bg-[#fce0df] text-[#ac2c28]", L: "border-[#f2d4a4] bg-[#fdebd2] text-[#8a4b08]", H: "border-[#c0e4f3] bg-[#dceff9] text-[#026f9b]", V: "border-[#d5c9ee] bg-[#e9e2f7] text-[#5b3fa0]" };

export function AttendanceEntryPages({ tab }: { tab: EntryTab }) {
  const secs = useSections();
  const [sec, setSec] = useState("");
  const [date, setDate] = useState(todayIso());
  const id = sec || secs.data?.items[0]?.id || "";
  const sheet = useLoad(() => (id ? schoolFetch<Sheet>(`${S}/attendance/sheet?section_id=${id}&date=${date}`) : Promise.resolve(null)), [id, date]);
  const act = useAction(() => sheet.reload());
  const [marks, setMarks] = useState<Record<string, St>>({});
  const [msg, setMsg] = useState("");
  const sh = sheet.data;
  const cur = (sid: string, was: St | null) => marks[sid] ?? was ?? "P";
  const set = (sid: string, st: St) => { setMarks((m) => ({ ...m, [sid]: st })); setMsg(""); };
  const everyone = () => { if (!sh) return; const m: Record<string, St> = {}; for (const s of sh.students) m[s.id] = ENTRY[tab].st; setMarks(m); setMsg(""); };
  const save = async () => { if (!sh) return; setMsg(""); if (await act.run(() => schoolFetch(`${S}/attendance/sheet`, json("PUT", { section_id: id, date, marks: sh.students.map((s) => ({ student_id: s.id, status: cur(s.id, s.status) })) })))) { setMarks({}); setMsg(`Attendance saved for ${sh.label}.`); } };
  const count = (st: St) => sh?.students.filter((s) => cur(s.id, s.status) === st).length ?? 0;
  return (
    <div>
      <ErrorBanner message={secs.error || sheet.error || act.error} />{okBox(msg)}
      <SectionBar secs={secs.data?.items ?? []} value={id} onChange={(v) => { setSec(v); setMarks({}); setMsg(""); }}>
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Date<input type="date" aria-label="Date" max={todayIso()} value={date} onChange={(e) => { setDate(e.target.value); setMarks({}); setMsg(""); }} className="bg-transparent py-1.5 text-slate-900 outline-none" /></label>
        <button type="button" className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-900 hover:border-slate-400" onClick={everyone}>{ENTRY[tab].all}</button>
      </SectionBar>
      <Panel title={sh?.label ?? "Class"} sub={`${sh?.students.length ?? 0} students${sh && !sh.marked ? " · not marked yet" : ""}`} right={<span className="flex items-center gap-3 text-xs text-slate-500"><span>P {count("P")} · A {count("A")} · L {count("L")} · H {count("H")} · V {count("V")}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !sh?.students.length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save attendance"}</button></span>}>
        <SimpleTable head={["Roll", "Student", "Present", "Absent", "Late", "Half day", "Leave"].map((h) => ({ h }))} empty={sheet.loading ? "Loading…" : "No students in this section."}
          rows={(sh?.students ?? []).map((s) => [s.roll_no || "—", <b key="n" className="font-semibold text-slate-900">{s.name}</b>, ...(["P", "A", "L", "H", "V"] as St[]).map((st) => <button key={st} type="button" aria-label={`${s.name} ${st}`} aria-pressed={cur(s.id, s.status) === st} onClick={() => set(s.id, st)} className={`h-7 w-7 rounded-md border text-[12px] font-semibold ${cur(s.id, s.status) === st ? BTN[st] : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>{st}</button>)])} />
      </Panel>
    </div>
  );
}

// ═════════════ corrections ═════════════
interface Corr { id: string; code: string; student: string; class_label: string; att_date: string; marked: string; should_be: string; requested_by: string; reason: string; status: "Pending" | "Approved" | "Rejected" }
export type CorrTab = "correction-request" | "approvals" | "correction-history";
const STATUS_LABEL: [St, string][] = [["P", "Present"], ["A", "Absent"], ["L", "Late"], ["H", "Half day"], ["V", "Leave"]];

export function CorrectionPages({ tab }: { tab: CorrTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Corr[] }>(`${S}/attendance/corrections`), []);
  const roster = useRoster();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Corr | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", att_date: todayIso(), should_be: "P", reason: "" });
  const all = data?.items ?? [];
  const base = tab === "approvals" ? all.filter((c) => c.status === "Pending") : tab === "correction-history" ? all.filter((c) => c.status !== "Pending") : all;
  const rows = base.filter((c) => has(c, search));
  const n = (s: string) => base.filter((c) => c.status === s).length;
  const kids = roster.data?.items ?? [];
  const decide = async (c: Corr, status: "Approved" | "Rejected") => { if (await act.run(() => schoolFetch(`${S}/attendance/corrections/${c.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/attendance/corrections`, json("POST", { ...f, student_id: f.student_id || kids[0]?.id })))) { setAdding(false); setF({ student_id: "", att_date: todayIso(), should_be: "P", reason: "" }); } };
  const tiles = tab === "approvals" ? [{ label: "Attendance corrections", value: base.length, sub: "All records" }, { label: "Pending", value: n("Pending"), sub: "Waiting for a decision" }]
    : tab === "correction-history" ? [{ label: "Attendance corrections", value: base.length, sub: "All records" }, { label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), base.length)} of shown` }, { label: "Rejected", value: n("Rejected"), sub: `${pct(n("Rejected"), base.length)} of shown` }]
      : [{ label: "Attendance corrections", value: base.length, sub: "All records" }, { label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), base.length)} of shown` }, { label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), base.length)} of shown` }, { label: "Rejected", value: n("Rejected"), sub: `${pct(n("Rejected"), base.length)} of shown` }];
  const tone = (s: string): "warn" | "good" | "bad" => (s === "Pending" ? "warn" : s === "Approved" ? "good" : "bad");
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || roster.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Attendance corrections" noun="requests" search={search} onSearch={setSearch} exportName={tab} head={["Request no.", "Student", "Class", "Date", "Marked", "Should be", "Requested by", "Reason", "Status"]} exportRows={rows.map((c) => [c.code, c.student, c.class_label, day(c.att_date), c.marked, c.should_be, c.requested_by, c.reason, c.status])}
        extra={tab === "correction-request" ? <button type="button" className={small} onClick={() => setAdding(true)}>+ New request</button> : null}
        tableHead={["Request no.", "Student", "Class", "Date", "Marked", "Should be", "Requested by", "Reason", "Status", ""]} empty={loading ? "Loading…" : "No correction requests."}
        rows={rows.map((c) => [c.code, <b key="n" className="font-semibold text-[#026f9b]">{c.student}</b>, c.class_label, day(c.att_date), c.marked, c.should_be, c.requested_by || "—", c.reason, <Chip key="s" tone={tone(c.status)}>{c.status}</Chip>,
          <span key="a" className="flex gap-1.5">{tab === "approvals" && <><button type="button" className={quietCls} disabled={act.busy} onClick={() => void decide(c, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(c, "Approved")}>Approve</button></>}<button type="button" className={small} onClick={() => setView(c)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class" v={view.class_label} /><Row k="Date" v={day(view.att_date)} /><Row k="Marked" v={view.marked} /><Row k="Should be" v={view.should_be} /><Row k="Requested by" v={view.requested_by || "—"} /><Row k="Reason" v={view.reason} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={view.status === "Pending" ? <><button type="button" className={quietCls} disabled={act.busy} onClick={() => void decide(view, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(view, "Approved")}>Approve</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title="New correction request" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id || kids[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" className={inputCls} required max={todayIso()} value={f.att_date} onChange={(e) => setF({ ...f, att_date: e.target.value })} /></Field>
            <Field label="Should be"><select className={inputCls} value={f.should_be} onChange={(e) => setF({ ...f, should_be: e.target.value })}>{STATUS_LABEL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
          <Field label="Reason"><input className={inputCls} required minLength={3} maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}
