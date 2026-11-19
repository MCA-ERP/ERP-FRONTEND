"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { CalendarPages } from "./academic-pages3";

const S = "/school";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const row = "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5";
const Rl = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className={row}><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;
const PAL = ["#dbe9f6", "#f3e3cf", "#dcefe3", "#f5dce0", "#e6dff3", "#d9eeee", "#f1ecc9", "#e8e4dc"];
const tint = (id: string | null) => { if (!id) return "#f8fafc"; let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };

// ═════════════ attendance settings ═════════════
interface Cfg { mark_mode: string; closes_at: string; min_exam: number; half_day_counts: string; parents_apply: boolean; lock_after: string; school_starts: string; grace: number; late_after: string; half_day_after: string; late_marks: number; late_counts: string; tell_parents_late: boolean; sms_absent: boolean; sms_time: string; app_absent: boolean; daily_summary: boolean; weekly_report: boolean; alert_principal: boolean; alert_principal_time: string; alert_below: boolean; below_pct: number }
export type SettingsTab = "attendance-rules" | "late-rules" | "notification-settings";
const t12 = (v: string) => { const [h, m] = v.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

export function AttendanceSettingsPages({ tab }: { tab: SettingsTab }) {
  const { data, error, reload } = useLoad(() => schoolFetch<Cfg>(`${S}/att-settings`), []);
  const act = useAction(reload);
  const [d, setD] = useState<Partial<Cfg>>({});
  const [saved, setSaved] = useState("");
  const c = data ? { ...data, ...d } : null;
  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => { setD((o) => ({ ...o, [k]: v })); setSaved(""); };
  const save = async () => { setSaved(""); if (await act.run(() => schoolFetch(`${S}/att-settings`, json("PUT", d)))) { setD({}); setSaved("Saved"); } };
  const time = (k: "closes_at" | "school_starts" | "late_after" | "half_day_after" | "sms_time" | "alert_principal_time") => <input type="time" aria-label={k} className="rounded border border-slate-300 bg-white px-2 py-1 text-[13px]" value={c?.[k] ?? ""} onChange={(e) => set(k, e.target.value)} />;
  const pick = <K extends keyof Cfg>(k: K, opts: string[]) => <select className={sel} aria-label={k} value={String(c?.[k] ?? "")} onChange={(e) => set(k, e.target.value as Cfg[K])}>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  const num = (k: "min_exam" | "below_pct", max = 100) => <span className="inline-flex items-center gap-1"><input type="number" aria-label={k} min={0} max={max} className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-[13px]" value={c?.[k] ?? ""} onChange={(e) => set(k, Number(e.target.value))} /><span className="text-[13px] text-slate-600">%</span></span>;
  const tog = <K extends keyof Cfg>(k: K, label: string) => <Toggle checked={Boolean(c?.[k])} onChange={(v) => set(k, v as Cfg[K])} label={label} />;
  const title = { "attendance-rules": "Attendance rules", "late-rules": "Late rules", "notification-settings": "Notification settings" }[tab];
  const foot = <div className="flex justify-end gap-2.5 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setD({}); setSaved(""); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save"}</button></div>;
  return (
    <div><ErrorBanner message={error || act.error} />{okBox(saved)}
      {c && <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2></div>
        {tab === "attendance-rules" && <>
          <Rl title="Mark attendance" hint="Once in the morning, or every period">{pick("mark_mode", ["Once a day", "Every period"])}</Rl>
          <Rl title="Attendance closes at" hint="Teachers can't mark after this without approval">{time("closes_at")}</Rl>
          <Rl title="Minimum attendance for exams" hint="Students below this need the principal's approval">{num("min_exam")}</Rl>
          <Rl title="Count half days as">{pick("half_day_counts", ["0.5 day present", "1 day present", "Absent"])}</Rl>
          <Rl title="Let parents apply for leave in the app">{tog("parents_apply", "Let parents apply for leave in the app")}</Rl>
          <Rl title="Lock attendance after" hint="Corrections need approval after this">{pick("lock_after", ["Same day", "1 day", "3 days", "7 days"])}</Rl></>}
        {tab === "late-rules" && <>
          <Rl title="School starts">{time("school_starts")}</Rl>
          <Rl title="Grace period"><select className={sel} aria-label="Grace period" value={c.grace} onChange={(e) => set("grace", Number(e.target.value))}>{[0, 5, 10, 15].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></Rl>
          <Rl title="Mark as late after">{time("late_after")}</Rl>
          <Rl title="Mark as half day after">{time("half_day_after")}</Rl>
          <Rl title={`${c.late_marks} late marks in a month count as`}>{pick("late_counts", ["1 absent", "0.5 absent", "No change"])}</Rl>
          <Rl title="Tell parents when a student is late" hint="SMS and app">{tog("tell_parents_late", "Tell parents when a student is late")}</Rl></>}
        {tab === "notification-settings" && <>
          <Rl title="SMS parents when absent" hint={`Sent at ${t12(c.sms_time)}`}>{tog("sms_absent", "SMS parents when absent")}</Rl>
          <Rl title="App notification when absent">{tog("app_absent", "App notification when absent")}</Rl>
          <Rl title="Daily summary to class teachers">{tog("daily_summary", "Daily summary to class teachers")}</Rl>
          <Rl title="Weekly report to parents" hint="Every Saturday">{tog("weekly_report", "Weekly report to parents")}</Rl>
          <Rl title="Alert the principal when a class isn't marked" hint={`At ${t12(c.alert_principal_time)}`}>{tog("alert_principal", "Alert the principal when a class isn't marked")}</Rl>
          <Rl title={`Alert below ${c.below_pct}% attendance`} hint="To the class teacher">{tog("alert_below", "Alert below attendance")}</Rl></>}
        {foot}</div>}
    </div>
  );
}

// ═════════════ timetable setup ═════════════
interface Period { id: string; label: string; starts: string; ends: string; kind: "Teaching" | "Break" }
export type SetupTab = "academic-periods" | "working-days" | "break-times";

export function TimetableSetupPages({ tab }: { tab: SetupTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Period[] }>(`${S}/timetable/periods`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Period | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "", starts: "08:20", ends: "09:00", kind: "Teaching" });
  if (tab === "working-days") return <CalendarPages tab="working-days" />;
  const all = data?.items ?? [];
  const list = tab === "break-times" ? all.filter((p) => p.kind === "Break") : all;
  const rows = list.filter((p) => has(p, search));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/timetable/periods`, json("POST", f)))) setAdding(false); };
  const remove = async (p: Period) => { if (await act.run(() => schoolFetch(`${S}/timetable/periods/${p.id}`, { method: "DELETE" }))) setView(null); };
  const brk = tab === "break-times";
  return (
    <div data-report><ErrorBanner message={error || act.error} />
      <ListPanel title={brk ? "Breaks" : "Periods"} noun={brk ? "breaks" : "periods"} search={search} onSearch={setSearch} exportName={tab} head={brk ? ["Break", "Starts", "Ends"] : ["Period", "Starts", "Ends", "Type"]} exportRows={rows.map((p) => (brk ? [p.label, p.starts, p.ends] : [p.label, p.starts, p.ends, p.kind]))}
        extra={<><button type="button" className={small} onClick={() => { setF({ label: "", starts: "08:20", ends: "09:00", kind: brk ? "Break" : "Teaching" }); setAdding(true); }}>+ Add {brk ? "break" : "period"}</button>{!all.length && !loading && <button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/timetable/periods/defaults`, json("POST", {})))}>Use the standard schedule</button>}</>}
        tableHead={brk ? ["Break", "Starts", "Ends", ""] : ["Period", "Starts", "Ends", "Type", ""]} empty={loading ? "Loading…" : "No periods yet."}
        rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.label}</b>, p.starts, p.ends, ...(brk ? [] : [<Chip key="t" tone={p.kind === "Break" ? "mute" : "mute"}>{p.kind}</Chip>]), <button key="v" type="button" className={small} onClick={() => setView(p)}>View details</button>])} />
      <Modal open={!!view} title={view?.label ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Starts" v={view.starts} /><Row k="Ends" v={view.ends} /><Row k="Type" v={view.kind} /></dl><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" className={small} disabled={act.busy} onClick={() => void remove(view)}>Remove</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
      <Modal open={adding} title={brk ? "Add a break" : "Add a period"} onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
        <Field label="Name"><input className={inputCls} required maxLength={30} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3"><Field label="Starts"><input type="time" className={inputCls} required value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></Field><Field label="Ends"><input type="time" className={inputCls} required value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></Field><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option>Teaching</option><option>Break</option></select></Field></div>
        <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ class timetable ═════════════
interface GridData { year: string; label: string; days: number; periods: Period[]; status: string; subjects: { id: string; name: string }[]; slots: { day: number; period_id: string; subject_id: string | null; teacher: string; locked: boolean }[] }
interface PubRow { id: string; label: string; set: number; total: number; clashes: number; status: "Draft" | "Published" }
interface Auto { days: number; periods: Period[]; sections: { id: string; label: string }[]; teachers: { id: string; name: string }[]; subjects: { id: string; name: string }[]; placed: number; needed: number; clashes: number; max_day: number; locked: number; slots: { id: string; section_id: string; day: number; period_id: string; subject_id: string | null; teacher_id: string | null; teacher: string; locked: boolean }[] }
interface Rules { slots_per_week: number; sections: number; items: { subject_id: string; subject: string; per_week: number; prefers: string; room: string; taught_by: { name: string; periods: number }[] }[]; limits: { id: string; teacher_id: string; teacher: string; when: string; reason: string; source: string }[]; words: { id: string; asked: string; understood: string }[] }
export type ClassTtTab = "create" | "edit" | "view" | "publish" | "ask-in-plain-words" | "auto-generate" | "generation-rules";
const TH = "px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500";

function SectionBar({ secs, value, onChange }: { secs: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!secs.length && <option value="">No sections</option>}{secs.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label></div>;
}

export function ClassTimetablePages({ tab }: { tab: ClassTtTab }) {
  const secs = useLoad(() => schoolFetch<{ items: { id: string; label: string }[] }>(`${S}/section-rows`), []);
  const [sec, setSec] = useState("");
  const sid = sec || secs.data?.items[0]?.id || "";
  const needGrid = tab === "create" || tab === "edit" || tab === "view";
  const grid = useLoad(() => (needGrid && sid ? schoolFetch<GridData>(`${S}/timetable/grid/${sid}`) : Promise.resolve(null)), [needGrid, sid]);
  const pub = useLoad(() => (tab === "publish" ? schoolFetch<{ total: number; items: PubRow[] }>(`${S}/timetable/publish`) : Promise.resolve(null)), [tab]);
  const auto = useLoad(() => (tab === "auto-generate" ? schoolFetch<Auto>(`${S}/timetable/auto`) : Promise.resolve(null)), [tab]);
  const rules = useLoad(() => (tab === "generation-rules" || tab === "ask-in-plain-words" ? schoolFetch<Rules>(`${S}/timetable/rules`) : Promise.resolve(null)), [tab]);
  const staff = useLoad(() => (tab === "generation-rules" ? schoolFetch<{ items: { id: string; name: string }[] }>(`${S}/front-office/staff`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { grid.reload(); pub.reload(); auto.reload(); rules.reload(); });
  const [cells, setCells] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [by, setBy] = useState<"section" | "teacher">("section");
  const [pick, setPick] = useState("");
  const [words, setWords] = useState("");
  const [draft, setDraft] = useState<Record<string, { per_week: number; prefers: string; room: string }>>({});
  const [lim, setLim] = useState(false);
  const [lf, setLf] = useState({ teacher_id: "", day: "", period_labels: "", reason: "" });
  const err = <ErrorBanner message={secs.error || grid.error || pub.error || auto.error || rules.error || staff.error || act.error} />;
  const g = grid.data;

  if (tab === "create" || tab === "edit") {
    const val = (d: number, p: string) => cells[`${d}|${p}`] ?? g?.slots.find((s) => s.day === d && s.period_id === p)?.subject_id ?? "";
    const save = async () => { if (!g) return; setMsg(""); const body = g.periods.filter((p) => p.kind === "Teaching").flatMap((p) => Array.from({ length: g.days }, (_, i) => ({ day: i + 1, period_id: p.id, subject_id: val(i + 1, p.id) || null }))); if (await act.run(() => schoolFetch(`${S}/timetable/grid/${sid}`, json("PUT", { cells: body })))) { setCells({}); setMsg(`Timetable saved for ${g.label}. Publish it when it is ready.`); } };
    return (
      <div>{err}{okBox(msg)}
        <SectionBar secs={secs.data?.items ?? []} value={sid} onChange={(v) => { setSec(v); setCells({}); setMsg(""); }} />
        {g && <Panel title={g.label} sub={`Timetable · ${g.year}`} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !g.periods.length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save"}</button>}>
          {g.periods.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-[13px]"><thead><tr className="bg-[#f3f9fd]"><th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">Period</th>{DAYS.slice(0, g.days).map((d) => <th key={d} className={TH}>{d}</th>)}</tr></thead>
            <tbody>{g.periods.map((p) => p.kind === "Break" ? <tr key={p.id} className="border-t border-slate-100 bg-slate-50/60"><td className="px-4 py-2.5"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td><td colSpan={g.days} className="px-3 py-2.5 text-center text-[#026f9b]">{p.label}</td></tr>
              : <tr key={p.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-2"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td>{DAYS.slice(0, g.days).map((_, i) => <td key={i} className="px-2 py-1.5"><select aria-label={`${p.label} ${DAYS[i]}`} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12.5px]" value={val(i + 1, p.id)} onChange={(e) => { setCells({ ...cells, [`${i + 1}|${p.id}`]: e.target.value }); setMsg(""); }}><option value="">—</option>{g.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>)}</tr>)}</tbody></table></div>
            : <p className="p-6 text-center text-sm text-slate-400">Add the bell schedule in Timetable Setup first.</p>}
        </Panel>}
      </div>
    );
  }
  if (tab === "view") {
    return (
      <div>{err}
        <SectionBar secs={secs.data?.items ?? []} value={sid} onChange={setSec} />
        {g && <Panel title={g.label} sub={`Timetable · ${g.year}`}>
          {g.status !== "Published" ? <p className="p-6 text-center text-sm text-slate-400">This timetable isn&apos;t published yet. Publish it to see it here.</p> :
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-[13px]"><thead><tr className="bg-[#f3f9fd]"><th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">Period</th>{DAYS.slice(0, g.days).map((d) => <th key={d} className={TH}>{d}</th>)}</tr></thead>
              <tbody>{g.periods.map((p) => p.kind === "Break" ? <tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-2.5"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td><td colSpan={g.days} className="px-3 py-2.5 text-center text-slate-500">{p.label}</td></tr>
                : <tr key={p.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3"><b>{p.label}</b> <span className="text-slate-500">{p.starts} – {p.ends}</span></td>{DAYS.slice(0, g.days).map((_, i) => { const s = g.slots.find((x) => x.day === i + 1 && x.period_id === p.id); const n = g.subjects.find((x) => x.id === s?.subject_id)?.name; return <td key={i} className="px-3 py-2 text-center">{n ? <><p className="font-medium text-slate-900">{n}</p><p className="text-[11px] text-[#026f9b]">{s?.teacher}</p></> : <span className="text-slate-400">Study</span>}</td>; })}</tr>)}</tbody></table></div>}
        </Panel>}
      </div>
    );
  }
  if (tab === "publish") {
    const items = (pub.data?.items ?? []).filter((r) => has(r, search));
    const go = (r: PubRow) => act.run(() => schoolFetch(`${S}/timetable/publish`, json("POST", { section_id: r.id })));
    return (
      <div data-report>{err}
        <ListPanel title="Timetables" noun="sections" search={search} onSearch={setSearch} exportName="timetable-publish" head={["Section", "Periods set", "Clashes", "Status"]} exportRows={items.map((r) => [r.label, `${r.set} / ${r.total}`, r.clashes, r.status])}
          tableHead={["Section", "Periods set", "Clashes", "Status", ""]} empty={pub.loading ? "Loading…" : "No sections yet."}
          rows={items.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.label}</b>, `${r.set} / ${r.total}`, r.clashes ? <Chip key="c" tone="warn">Warning · {r.clashes}</Chip> : "0", <Chip key="s" tone={r.status === "Published" ? "good" : "mute"}>{r.status}</Chip>, r.status === "Draft" ? <button key="p" type="button" className={`${btnPrimary} !px-3.5 !py-1 text-[12px]`} disabled={act.busy || !r.set || !!r.clashes} onClick={() => void go(r)}>Publish</button> : ""])} />
      </div>
    );
  }
  if (tab === "ask-in-plain-words") {
    const r = rules.data;
    const examples = ["No first periods for Deepa on Mondays", "Kiran Rao is not available on Friday afternoons", "Move all PE to afternoons", "Maths only in the morning"];
    const apply = async () => { setMsg(""); let m = ""; if (await act.run(async () => { const x = await schoolFetch<{ understood: string; placed: number; needed: number }>(`${S}/timetable/words`, json("POST", { text: words })); m = `${x.understood} Timetable regenerated (${x.placed} of ${x.needed} lessons placed). See it on the Auto Generate tab and publish when you're happy.`; })) { setWords(""); setMsg(m); } };
    return (
      <div className="space-y-5" data-report>{err}
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Change the timetable in plain words <span className="ml-1 text-xs font-normal text-slate-500">Built-in understanding: teachers, days, periods, mornings and afternoons</span></h2></div>
          <div className="space-y-3 p-5"><Field label="What should change?"><textarea className={`${inputCls} min-h-20`} maxLength={300} placeholder="For example: no first periods for Deepa on Mondays · Kiran Rao is off on Fridays · move all PE to afternoons" value={words} onChange={(e) => setWords(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">{examples.map((x) => <button key={x} type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] text-slate-700 hover:border-slate-400" onClick={() => setWords(x)}>{x}</button>)}</div></div>
          <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || words.trim().length < 5} onClick={() => void apply()}>{act.busy ? "Working…" : "Apply and regenerate"}</button></div></div>
        <ListPanel title="Rules added in plain words" noun="rules" search="" onSearch={() => undefined} hideSearch exportName="plain-word-rules" head={["You asked", "Understood as"]} exportRows={(r?.words ?? []).map((w) => [w.asked, w.understood])}
          tableHead={["You asked", "Understood as"]} empty="None yet. The generator uses the rules on the Generation Rules tab." rows={(r?.words ?? []).map((w) => [w.asked, w.understood])} />
        {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">{msg}</p>}
      </div>
    );
  }
  if (tab === "auto-generate") {
    const a = auto.data;
    const cur = a?.sections.find((s) => s.id === (pick || a.sections[0]?.id));
    const teacher = a?.teachers.find((t) => t.id === (pick || a.teachers[0]?.id));
    const subj = (id: string | null) => a?.subjects.find((s) => s.id === id)?.name ?? "";
    const teaching = (a?.periods ?? []).filter((p) => p.kind === "Teaching");
    const regen = async () => { setMsg(""); let m = ""; if (await act.run(async () => { const x = await schoolFetch<{ placed: number; needed: number }>(`${S}/timetable/generate`, json("POST", {})); m = `Regenerated: ${x.placed} of ${x.needed} lessons placed.`; })) setMsg(m); };
    const pubAll = async () => { setMsg(""); let m = ""; if (await act.run(async () => { const x = await schoolFetch<{ published: number; skipped: number }>(`${S}/timetable/publish`, json("POST", {})); m = `${x.published} timetables published.${x.skipped ? ` ${x.skipped} skipped (clashes or nothing set).` : ""}`; })) setMsg(m); };
    return (
      <div className="space-y-5">{err}{okBox(msg)}
        <div className="flex justify-end gap-2"><button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 hover:border-slate-400" disabled={act.busy} onClick={() => void regen()}>{act.busy ? "Working…" : "Regenerate"}</button><button type="button" className="rounded-full bg-[#e5413a] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#c9322c] disabled:opacity-50" disabled={act.busy || !a?.placed} onClick={() => void pubAll()}>Publish</button></div>
        <Tiles items={[{ label: "Lessons placed", value: `${a?.placed ?? 0} of ${a?.needed ?? 0}`, sub: a && a.placed >= a.needed ? "Every lesson placed" : "Some lessons could not be placed" }, { label: "Teacher clashes", value: a?.clashes ?? 0, sub: "Same teacher, two rooms" }, { label: "Most periods in a day", value: a?.max_day ?? 0, sub: "Limit 6" }, { label: "Locked periods", value: a?.locked ?? 0, sub: "Click a period to lock" }]} />
        <div className="flex flex-wrap items-center gap-2">{(["section", "teacher"] as const).map((k) => <button key={k} type="button" onClick={() => { setBy(k); setPick(""); }} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${by === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>By {k}</button>)}
          {(by === "section" ? a?.sections.map((s) => ({ id: s.id, name: s.label })) : a?.teachers)?.map((x) => <button key={x.id} type="button" onClick={() => setPick(x.id)} className={`rounded-full px-3 py-1.5 text-[12px] ${(by === "section" ? cur?.id : teacher?.id) === x.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{x.name}</button>)}</div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
          {a && teaching.length ? <table className="w-full min-w-[820px] border-separate border-spacing-1 text-[12px]"><thead><tr><th /> {teaching.map((p) => <th key={p.id} className="px-1 pb-1 text-center font-medium text-slate-600">{p.label}<span className="block text-[10px] font-normal text-slate-400">{p.starts}</span></th>)}</tr></thead>
            <tbody>{DAYS.slice(0, a.days).map((d, i) => <tr key={d}><td className="pr-2 text-right font-medium text-slate-600">{d}</td>{teaching.map((p) => { const s = a.slots.find((x) => x.day === i + 1 && x.period_id === p.id && (by === "section" ? x.section_id === cur?.id : x.teacher_id === teacher?.id)); const label = s?.subject_id ? subj(s.subject_id) : ""; const sub = by === "section" ? s?.teacher : a.sections.find((x) => x.id === s?.section_id)?.label; return <td key={p.id} className="p-0"><button type="button" disabled={!s || act.busy} aria-label={`${d} ${p.label} ${label || "free"}`} onClick={() => s && void act.run(() => schoolFetch(`${S}/timetable/slots/${s.id}/lock`, json("POST", {})))} className="block h-14 w-full rounded-lg px-1.5 text-left leading-tight ring-1 ring-inset ring-slate-200 disabled:cursor-default" style={{ background: tint(s?.subject_id ?? null) }}>{s ? <><span className="block truncate font-semibold text-slate-900">{label || "Study"}{s.locked ? " 🔒" : ""}</span><span className="block truncate text-[11px] text-slate-600">{sub}</span></> : <span className="text-slate-400">{by === "section" ? "Study" : "Free"}</span>}</button></td>; })}</tr>)}</tbody></table>
            : <p className="p-6 text-center text-sm text-slate-400">{auto.loading ? "Loading…" : "Add the bell schedule, sections and subjects, then press Regenerate."}</p>}
        </div>
      </div>
    );
  }
  // generation rules
  const r = rules.data;
  const val = (x: Rules["items"][number]) => draft[x.subject_id] ?? { per_week: x.per_week, prefers: x.prefers, room: x.room };
  const total = (r?.items ?? []).reduce((n, x) => n + val(x).per_week, 0);
  const ptch = (x: Rules["items"][number], p: Partial<{ per_week: number; prefers: string; room: string }>) => setDraft({ ...draft, [x.subject_id]: { ...val(x), ...p } });
  const saveRules = async () => { setMsg(""); if (await act.run(() => schoolFetch(`${S}/timetable/rules`, json("PUT", { rules: (r?.items ?? []).map((x) => ({ subject_id: x.subject_id, ...val(x) })) })))) { setDraft({}); setMsg("Saved. The next generation will use these."); } };
  const addLimit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/timetable/limits`, json("POST", { teacher_id: lf.teacher_id || staff.data?.items[0]?.id, day: lf.day ? Number(lf.day) : null, period_labels: lf.period_labels, reason: lf.reason })))) setLim(false); };
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <Panel title="Periods a week" sub={`${total} of ${r?.slots_per_week ?? 0} periods · the rest become study periods`}>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Subject</th><th className="px-3 py-2.5 font-medium">Periods a week</th><th className="px-3 py-2.5 font-medium">Prefers</th><th className="px-3 py-2.5 font-medium">Room</th><th className="px-3 py-2.5 font-medium">Taught by</th></tr></thead>
          <tbody>{(r?.items ?? []).map((x) => <tr key={x.subject_id} className="border-t border-slate-100"><td className="px-5 py-2.5 font-semibold text-slate-900">{x.subject}</td>
            <td className="px-3 py-2"><input type="number" min={0} max={12} aria-label={`${x.subject} periods a week`} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5" value={val(x).per_week} onChange={(e) => ptch(x, { per_week: Number(e.target.value) })} /></td>
            <td className="px-3 py-2"><select className={sel} aria-label={`${x.subject} prefers`} value={val(x).prefers} onChange={(e) => ptch(x, { prefers: e.target.value })}><option>Any</option><option>Morning</option><option>Afternoon</option></select></td>
            <td className="px-3 py-2"><input aria-label={`${x.subject} room`} className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5" maxLength={60} value={val(x).room} onChange={(e) => ptch(x, { room: e.target.value })} /></td>
            <td className="px-3 py-2 text-slate-700">{x.taught_by.length ? x.taught_by.map((t) => `${t.name} (${t.periods})`).join(", ") : <span className="text-slate-400">Nobody yet. Assign in Subject Allocation.</span>}</td></tr>)}
            {!r?.items.length && <tr><td colSpan={5} className="p-6 text-center text-slate-400">{rules.loading ? "Loading…" : "Add subjects first."}</td></tr>}</tbody></table></div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(draft).length} onClick={() => void saveRules()}>Save and use for the next generation</button></div>
      </Panel>
      <ListPanel title="When teachers aren't available" noun="limits" search="" onSearch={() => undefined} hideSearch exportName="teacher-limits" head={["Teacher", "When", "Why"]} exportRows={(r?.limits ?? []).map((l) => [l.teacher, l.when, l.reason])}
        extra={<button type="button" className={small} onClick={() => setLim(true)}>+ Add limit</button>} tableHead={["Teacher", "When", "Why", ""]} empty="No limits yet." rows={(r?.limits ?? []).map((l) => [<b key="t" className="font-semibold text-slate-900">{l.teacher}</b>, l.when, l.reason || "—", <button key="d" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/timetable/limits/${l.id}`, { method: "DELETE" }))}>Remove</button>])} />
      <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Also: at most 6 periods a day per teacher; a subject no more than once a day (twice for subjects with 6 or more periods a week, never back to back).</p>
      <Modal open={lim} title="Add a limit" onClose={() => setLim(false)}><form onSubmit={addLimit} className="space-y-3">
        <Field label="Teacher"><select className={inputCls} required value={lf.teacher_id || staff.data?.items[0]?.id || ""} onChange={(e) => setLf({ ...lf, teacher_id: e.target.value })}>{(staff.data?.items ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Day"><select className={inputCls} value={lf.day} onChange={(e) => setLf({ ...lf, day: e.target.value })}><option value="">Every day</option>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></Field><Field label="Periods (blank = all day)"><input className={inputCls} placeholder="P7, P8" maxLength={100} value={lf.period_labels} onChange={(e) => setLf({ ...lf, period_labels: e.target.value.split(/[ ,]+/).filter(Boolean).join(",") })} /></Field></div>
        <Field label="Why"><input className={inputCls} maxLength={200} value={lf.reason} onChange={(e) => setLf({ ...lf, reason: e.target.value })} /></Field><FormFoot close={() => setLim(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
void Foot;
