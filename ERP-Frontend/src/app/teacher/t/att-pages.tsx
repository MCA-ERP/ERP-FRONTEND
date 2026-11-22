"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { PillSelect, SearchBox, blueBtn, smallBtn, usePickedSection, Bars } from "./ui";

const pctText = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
const good = (v: number | null | undefined) => (v === null || v === undefined ? "text-slate-500" : v >= 90 ? "text-[#065740]" : v < 85 ? "text-[#ac2c28]" : "text-slate-900");
const L = ({ label, children }: { label: string; children: ReactNode }) => <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const todayIso = () => new Date().toLocaleDateString("en-CA");
const STATUS: [string, string, string][] = [["P", "Present", "bg-[#d9efe8] text-[#065740] border-[#9fd5c1]"], ["A", "Absent", "bg-[#fce0df] text-[#ac2c28] border-[#f0a8a5]"], ["L", "Late", "bg-[#f8ecd6] text-[#8a5a0b] border-[#e8c98a]"], ["H", "Half day", "bg-[#dceff9] text-[#026f9b] border-[#9fcfe6]"], ["V", "Leave", "bg-slate-100 text-slate-700 border-slate-300"]];

interface Regs { sections: { id: string; label: string }[]; closes_at: string; sms_absent: boolean; lock_after: string }
interface Sheet { label: string; date: string; marked: boolean; students: { id: string; name: string; roll_no: string; status: string | null }[] }
const closes = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

export function MarkAttendance() {
  const regs = useLoad(() => schoolFetch<Regs>("/teacher/attendance/registers"), []);
  const [sec, pick] = usePickedSection(regs.data?.sections ?? [], null);
  const [date, setDate] = useState(todayIso());
  const sheet = useLoad(() => (sec ? schoolFetch<Sheet>(`/teacher/attendance/sheet/${sec}?date=${date}`) : Promise.resolve(null)), [sec, date]);
  const [edit, setEdit] = useState<{ for: Sheet; marks: Record<string, string> } | null>(null);
  const [saved, setSaved] = useState("");
  const act = useAction(sheet.reload);
  const s = sheet.data;
  const marks: Record<string, string> = s ? (edit?.for === s ? edit.marks : Object.fromEntries(s.students.filter((x) => x.status).map((x) => [x.id, x.status as string]))) : {};
  const setMarks = (m: Record<string, string>) => s && setEdit({ for: s, marks: m });
  const missing = s ? s.students.filter((x) => !marks[x.id]).length : 0;
  const save = async () => { setSaved(""); if (await act.run(() => schoolFetch("/teacher/attendance/sheet", json("POST", { section_id: sec, date, marks: s!.students.map((x) => ({ student_id: x.id, status: marks[x.id] })) })))) setSaved(`Attendance saved for ${s!.label}.`); };
  return (
    <div data-report>
      <Head title="Mark Attendance" subtitle={`Your class register${s ? ` for ${s.label}` : ""}.${regs.data ? ` It closes at ${closes(regs.data.closes_at)}.` : ""}`} />
      <ErrorBanner message={regs.error || sheet.error || act.error} />
      <Loading on={(regs.loading && !regs.data) || (sheet.loading && !s)} />
      {regs.data && !regs.data.sections.length && <Panel title="Class register"><Empty text="Only the class teacher marks the daily register. You are not a class teacher this year." /></Panel>}
      {regs.data && regs.data.sections.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={sec} onChange={(e) => pick(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{regs.data.sections.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Date<input type="date" aria-label="Date" max={todayIso()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent py-1.5 font-semibold text-slate-900 outline-none" /></label>
            <button type="button" disabled={!s?.students.length} className={`${whiteBtn} ml-auto`} onClick={() => s && setMarks(Object.fromEntries(s.students.map((x) => [x.id, "P"])))}>Mark everyone present</button>
          </div>
          {s && (
            <Panel title={s.label} sub={`${s.students.length} students`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Roll</th><th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>{STATUS.map(([, n]) => <th key={n} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{n}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {!s.students.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">There are no students in this section.</td></tr>}
                  {s.students.map((x) => <tr key={x.id} className="hover:bg-slate-50"><td className="px-4 py-2.5 text-slate-600">{x.roll_no}</td><td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-900">{x.name}</td>
                    {STATUS.map(([k, n, cls]) => <td key={k} className="px-4 py-2"><button type="button" aria-label={`${x.name}: ${n}`} aria-pressed={marks[x.id] === k} onClick={() => setMarks({ ...marks, [x.id]: k })} className={`grid size-7 place-items-center rounded-md border text-[12px] font-bold ${marks[x.id] === k ? cls : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{k}</button></td>)}</tr>)}
                </tbody></table></div>
              <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
                <span className="text-[12px] text-slate-500">{missing ? `${missing} not marked yet` : "Everyone is marked"}</span>
                {saved && <span role="status" className="text-sm font-semibold text-emerald-700">{saved}</span>}
                <button type="button" disabled={act.busy || missing > 0 || !s.students.length} className={`${btnPrimary} ml-auto !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void save()}>{act.busy ? "Saving…" : s.marked ? "Update attendance" : "Save attendance"}</button>
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

interface Req { id: string; code: string; date: string; class_label: string; student: string; marked: string; should_be: string; reason: string; status: string; requested_on: string }
const tone = (s: string) => (s === "Approved" ? "good" : s === "Rejected" ? "bad" : "warn") as "good" | "bad" | "warn";
export function EditRequest() {
  const regs = useLoad(() => schoolFetch<Regs>("/teacher/attendance/registers"), []);
  const [sec, pick] = usePickedSection(regs.data?.sections ?? [], null);
  const sheet = useLoad(() => (sec ? schoolFetch<Sheet>(`/teacher/attendance/sheet/${sec}?date=${todayIso()}`) : Promise.resolve(null)), [sec]);
  const reqs = useLoad(() => schoolFetch<{ items: Req[] }>("/teacher/attendance/edit-requests"), []);
  const [f, setF] = useState(() => ({ date: new Date(Date.now() - 86400000).toLocaleDateString("en-CA"), student: "", should: "P", reason: "" }));
  const stu = f.student || sheet.data?.students[0]?.id || "";
  const marked = useLoad(() => (stu ? schoolFetch<{ marked: string }>(`/teacher/attendance/marked/${stu}?date=${f.date}`) : Promise.resolve(null)), [stu, f.date]);
  const act = useAction(reqs.reload);
  const [done, setDone] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Req | null>(null);
  const items = useMemo(() => (reqs.data?.items ?? []).filter((r) => !q || `${r.code} ${r.student} ${r.reason} ${r.status}`.toLowerCase().includes(q.toLowerCase())), [reqs.data, q]);
  const label = regs.data?.sections.find((x) => x.id === sec)?.label ?? "";
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/attendance/edit-requests", json("POST", { student_id: stu, att_date: f.date, should_be: f.should, reason: f.reason })))) { setF({ ...f, reason: "" }); setDone("Request sent to the principal."); } };
  return (
    <div data-report>
      <Head title="Edit Request" subtitle={`Ask the principal to correct a saved mark in your class register${label ? ` (${label})` : ""}.`} />
      <ErrorBanner message={regs.error || sheet.error || reqs.error} />
      <Loading on={regs.loading && !regs.data} />
      {regs.data && !regs.data.sections.length && <Panel title="New edit request"><Empty text="Only the class teacher can ask for a correction. You are not a class teacher this year." /></Panel>}
      {regs.data && regs.data.sections.length > 0 && (
        <div className="space-y-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New edit request</h2></div>
            <div className="space-y-4 p-5">
              {act.error && <ErrorBanner message={act.error} />}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <L label="Date"><input type="date" className={inputCls} required max={todayIso()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></L>
                <L label="Student"><select className={inputCls} value={stu} onChange={(e) => setF({ ...f, student: e.target.value })}>{sheet.data?.students.map((s) => <option key={s.id} value={s.id}>{s.roll_no}. {s.name}</option>)}</select></L>
                <L label="Marked as"><input className={inputCls} readOnly disabled value={marked.data?.marked ?? "—"} /></L>
                <L label="Should be"><select className={inputCls} value={f.should} onChange={(e) => setF({ ...f, should: e.target.value })}>{STATUS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></L>
              </div>
              <L label="Reason"><textarea className={`${inputCls} min-h-[5rem]`} required minLength={3} maxLength={300} placeholder="For example, the student was at the sports trials" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></L>
              {regs.data.sections.length > 1 && <L label="Class"><select className={`${inputCls} w-auto`} value={sec} onChange={(e) => pick(e.target.value)}>{regs.data.sections.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></L>}
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF({ ...f, reason: "" }); setDone(""); }}>Discard</button><button type="submit" disabled={act.busy || !stu} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Send request</button></div>
          </form>
          <Panel title="My edit requests" sub={`${reqs.data?.items.length ?? 0} requests`} right={<ExportPrint name="my-edit-requests" head={["Request no.", "Date", "Class", "Student", "Marked", "Should be", "Reason", "Status"]} rows={items.map((r) => [r.code, r.date, r.class_label, r.student, r.marked, r.should_be, r.reason, r.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search my edit requests" /></div>
            <SimpleTable head={[{ h: "Request no." }, { h: "Date" }, { h: "Class" }, { h: "Student" }, { h: "Marked" }, { h: "Should be" }, { h: "Reason" }, { h: "Status" }, { h: "" }]} empty="You have not sent an edit request yet." rows={items.map((r) => [r.code, day(r.date), r.class_label, r.student, r.marked, r.should_be, <span key="r" className="whitespace-normal">{r.reason}</span>, <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(r)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={`${view.code} · ${view.student}`} onClose={() => setView(null)}><KV rows={[["Date", day(view.date)], ["Class", view.class_label], ["Marked", view.marked], ["Should be", view.should_be], ["Reason", view.reason], ["Sent", day(view.requested_on)], ["Status", <Chip key="s" tone={tone(view.status)}>{view.status}</Chip>]]} /></Modal>}
    </div>
  );
}

// ═════════════ history ═════════════
interface Daily { sections: { id: string; label: string; students: number; percent: number | null }[]; days: { date: string; present: number; total: number; absent: number; late: number; overall: number | null; by_section: Record<string, number | null> }[] }
export function HistoryDaily() {
  const { data, error, loading } = useLoad(() => schoolFetch<Daily>("/teacher/attendance/history/daily"), []);
  const [sec, setSec] = useState("");
  const [q, setQ] = useState("");
  const secs = data?.sections ?? [];
  const shown = sec ? secs.filter((s) => s.id === sec) : secs;
  const rows = (data?.days ?? []).filter((d) => !q || day(d.date).toLowerCase().includes(q.toLowerCase()));
  const students = shown.reduce((a, s) => a + s.students, 0);
  return (
    <div data-report>
      <Head title="Daily" subtitle="Day by day across all your sections, most recent first." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...secs.map((s) => ({ value: s.id, label: s.label }))]} right={`${shown.length} sections · ${students} students`} />
          <Tiles items={shown.map((s) => ({ label: s.label, value: pctText(s.percent), sub: `Last ${data.days.length} school days` }))} />
          <Panel title={`Last ${data.days.length} school days · ${sec ? shown[0]?.label.toLowerCase() : "all sections"}`} sub={`${data.days.length} days`} right={<ExportPrint name="attendance-daily" head={["Date", "Present", "Absent", "Late", "Overall", ...shown.map((s) => s.label)]} rows={rows.map((d) => [d.date, `${d.present}/${d.total}`, d.absent, d.late, d.overall, ...shown.map((s) => d.by_section[s.id])])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search last ${data.days.length} school days`} /></div>
            <SimpleTable head={[{ h: "Date" }, { h: "Present" }, { h: "Absent" }, { h: "Late" }, { h: "Overall" }, ...shown.map((s) => ({ h: s.label.replace(/^Class /, "") }))]} empty="Attendance has not been marked in your sections yet." rows={rows.map((d) => [<b key="d" className="font-semibold text-slate-900">{day(d.date)}</b>, `${d.present} / ${d.total}`, <span key="a" className={d.absent ? "text-[#ac2c28]" : ""}>{d.absent}</span>, d.late, <b key="o" className={`font-semibold ${good(d.overall)}`}>{pctText(d.overall)}</b>, ...shown.map((s) => <span key={s.id} className={good(d.by_section[s.id])}>{pctText(d.by_section[s.id])}</span>)])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Monthly { year: string; months: string[]; current_month: string; overall: { month: string; percent: number | null }[]; sections: { id: string; label: string; students: number; by_month: Record<string, number | null>; year: number | null }[] }
const mon = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" });
export function HistoryMonthly() {
  const { data, error, loading } = useLoad(() => schoolFetch<Monthly>("/teacher/attendance/history/monthly"), []);
  const [sec, setSec] = useState("");
  const [q, setQ] = useState("");
  const secs = data?.sections ?? [];
  const months = data?.months ?? [];
  const bars = sec ? months.map((m) => ({ month: m, percent: secs.find((s) => s.id === sec)?.by_month[m] ?? null })) : data?.overall ?? [];
  const rows = secs.filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase()));
  const shownStudents = (sec ? secs.filter((s) => s.id === sec) : secs).reduce((a, s) => a + s.students, 0);
  return (
    <div data-report>
      <Head title="Monthly" subtitle={`Month by month across all your sections, ${data?.year.replace(/^(\d{4})-\d{2}(\d{2})$/, "$1–$2") ?? ""}.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...secs.map((s) => ({ value: s.id, label: s.label }))]} right={`${sec ? 1 : secs.length} sections · ${shownStudents} students`} />
          <Panel title="Monthly attendance" sub={sec ? secs.find((s) => s.id === sec)?.label : "All sections"}>
            {!months.length ? <Empty text="Attendance has not been marked this year yet." /> : (
              <div className="px-5 pb-3 pt-4">
                <div className="flex h-56 items-end gap-3 border-b border-slate-200">{bars.map((b) => <div key={b.month} className="flex flex-1 flex-col items-center justify-end"><span className="mb-1 text-[11px] tabular-nums text-slate-600">{pctText(b.percent)}</span><span className={`w-full max-w-[4.5rem] rounded-t-md ${b.month === data.current_month ? "bg-[#c0e4f3]" : "bg-[#7fc9e6]"}`} style={{ height: `${Math.max(2, ((b.percent ?? 0) / 100) * 180)}px` }} /></div>)}</div>
                <div className="mt-1 flex gap-3">{bars.map((b) => <span key={b.month} className="flex-1 text-center text-[12px] text-slate-600">{mon(b.month)}</span>)}</div>
                <p className="mt-3 text-[11px] text-slate-500">The current month is month to date.</p>
              </div>
            )}
          </Panel>
          <Panel title="Section-wise, by month" sub={`${secs.length} sections`} right={<ExportPrint name="attendance-monthly" head={["Section", "Students", ...months.map(mon), "Year"]} rows={rows.map((s) => [s.label, s.students, ...months.map((m) => s.by_month[m]), s.year])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search section-wise, by month" /></div>
            <SimpleTable head={[{ h: "Section" }, { h: "Students" }, ...months.map((m) => ({ h: mon(m) })), { h: "Year" }, { h: "" }]} empty="Nothing to show yet." rows={rows.map((s) => [<b key="s" className="font-semibold text-slate-900">{s.label}</b>, s.students, ...months.map((m) => <span key={m} className={good(s.by_month[m])}>{pctText(s.by_month[m])}</span>), <b key="y" className={`font-semibold ${good(s.year)}`}>{pctText(s.year)}</b>, <button key="o" type="button" className={smallBtn} onClick={() => setSec(s.id)}>Open</button>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Yearly { this_year: number | null; last_year: number | null; students: number; top: number; low: number; school_days: number; years: { name: string; current: boolean; percent: number | null }[]; bands: { label: string; n: number }[]; sections: { id: string; label: string; students: number; by_year: { name: string; percent: number | null }[]; change: number | null; top: number; low: number }[] }
export function HistoryYearly() {
  const { data, error, loading } = useLoad(() => schoolFetch<Yearly>("/teacher/attendance/history/yearly"), []);
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("");
  const secs = data?.sections ?? [];
  const rows = secs.filter((s) => (!sec || s.id === sec) && (!q || s.label.toLowerCase().includes(q.toLowerCase())));
  const yrs = data?.years ?? [];
  const delta = data && data.this_year !== null && data.last_year !== null ? Math.round((data.this_year - data.last_year) * 10) / 10 : null;
  return (
    <div data-report>
      <Head title="Yearly" subtitle={`Year by year across all your sections.${data?.school_days ? ` This year counts ${data.school_days} school days so far.` : ""}`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...secs.map((s) => ({ value: s.id, label: s.label }))]} right={`${secs.length} sections · ${data.students} students`} />
          <Tiles items={[{ label: "This year", value: pctText(data.this_year), sub: `${data.students} students` }, { label: "Last year", value: pctText(data.last_year), sub: delta === null ? undefined : `${delta > 0 ? "+" : ""}${delta} pts this year` }, { label: "97% and above", value: data.top, sub: "Full-attendance award" }, { label: "Below 85%", value: data.low, sub: `Across ${secs.length} sections` }]} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Attendance by year" sub="All sections"><Bars rows={yrs.map((y) => ({ label: y.current ? `${y.name} so far` : y.name, value: y.percent }))} /></Panel>
            <Panel title="Students by attendance band" sub="This year"><Bars max={Math.max(1, data.students)} rows={data.bands.map((b) => ({ label: b.label, value: b.n, note: `${b.n} students` }))} /></Panel>
          </div>
          <Panel title="Section-wise, by year" sub={`${secs.length} sections`} right={<ExportPrint name="attendance-yearly" head={["Section", "Students", ...yrs.map((y) => y.name), "Change", "97% and above", "Below 85%"]} rows={rows.map((s) => [s.label, s.students, ...s.by_year.map((y) => y.percent), s.change, s.top, s.low])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search section-wise, by year" /></div>
            <SimpleTable head={[{ h: "Section" }, { h: "Students" }, ...yrs.map((y) => ({ h: y.name })), { h: "Change" }, { h: "97% and above" }, { h: "Below 85%" }, { h: "" }]} empty="Nothing to show yet." rows={rows.map((s) => [<b key="s" className="font-semibold text-slate-900">{s.label}</b>, s.students, ...s.by_year.map((y, i) => <span key={y.name} className={i === 0 ? `font-semibold ${good(y.percent)}` : "text-slate-600"}>{pctText(y.percent)}</span>), s.change === null ? "—" : <span key="c" className={s.change < 0 ? "text-[#ac2c28]" : "text-[#065740]"}>{s.change > 0 ? "+" : ""}{s.change}</span>, s.top, s.low, <button key="o" type="button" className={smallBtn} onClick={() => setSec(s.id)}>Open</button>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ student leave ═════════════
interface Leave { id: string; ref: string; student: string; roll_no: string; parent: string; from_date: string; to_date: string; days: number; reason: string; applied_on: string; status: string }
interface Leaves { class_label: string; is_class_teacher: boolean; items: Leave[]; waiting: number; this_month: number }
const span = (l: Leave) => (l.from_date === l.to_date ? day(l.from_date) : `${day(l.from_date)} – ${day(l.to_date)}`);

export function LeaveRequests() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Leaves>("/teacher/attendance/leaves"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const waiting = (data?.items ?? []).filter((l) => l.status === "Pending" && (!q || `${l.student} ${l.ref} ${l.reason}`.toLowerCase().includes(q.toLowerCase())));
  const decide = (id: string, status: "Approved" | "Rejected") => void act.run(() => schoolFetch(`/teacher/attendance/leaves/${id}/decide`, json("POST", { status })));
  return (
    <div data-report>
      <Head title="Requests" subtitle={`Leave requests parents sent for ${data?.class_label || "your class"}. Approving marks the days as Leave in attendance.`} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !data.is_class_teacher && <Panel title="Leave requests"><Empty text="Parents' leave requests go to the class teacher. You are not a class teacher this year." /></Panel>}
      {data && data.is_class_teacher && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Waiting", value: data.waiting, sub: "Need your decision" }, { label: "This month", value: data.this_month, sub: "Requests from parents" }]} />
          <Panel title={`Leave requests · ${data.class_label}`} sub={`${waiting.length} requests`} right={<ExportPrint name="student-leave-requests" head={["Ref.", "Student", "Parent", "Dates", "Days", "Reason", "Applied"]} rows={waiting.map((l) => [l.ref, l.student, l.parent, span(l), l.days, l.reason, l.applied_on])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search leave requests · ${data.class_label.toLowerCase()}`} /></div>
            <SimpleTable head={[{ h: "Ref." }, { h: "Student" }, { h: "Parent" }, { h: "Dates" }, { h: "Days" }, { h: "Reason" }, { h: "Applied" }, { h: "" }]} empty="No leave requests are waiting for you." rows={waiting.map((l) => [l.ref, <span key="s"><b className="font-semibold text-slate-900">{l.student}</b> <span className="text-slate-500">· roll {l.roll_no}</span></span>, l.parent || "—", span(l), l.days, l.reason, day(l.applied_on), <span key="a" className="flex gap-1.5"><button type="button" disabled={act.busy} className={blueBtn} onClick={() => decide(l.id, "Approved")}>Approve</button><button type="button" disabled={act.busy} className={smallBtn} onClick={() => decide(l.id, "Rejected")}>Decline</button></span>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

export function LeaveHistory() {
  const { data, error, loading } = useLoad(() => schoolFetch<Leaves>("/teacher/attendance/leaves"), []);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((l) => !q || `${l.student} ${l.ref} ${l.reason} ${l.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="History" subtitle={`Every leave request from parents in ${data?.class_label || "your class"}.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && !data.is_class_teacher && <Panel title="Student leave"><Empty text="Parents' leave requests go to the class teacher. You are not a class teacher this year." /></Panel>}
      {data && data.is_class_teacher && (
        <Panel title={`Student leave · ${data.class_label}`} sub={`${data.items.length} requests`} right={<ExportPrint name="student-leave-history" head={["Ref.", "Student", "Dates", "Days", "Reason", "Status"]} rows={items.map((l) => [l.ref, l.student, span(l), l.days, l.reason, l.status])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search student leave · ${data.class_label.toLowerCase()}`} /></div>
          <SimpleTable head={[{ h: "Ref." }, { h: "Student" }, { h: "Dates" }, { h: "Days" }, { h: "Reason" }, { h: "Status" }]} empty="No leave requests yet." rows={items.map((l) => [l.ref, <b key="s" className="font-semibold text-slate-900">{l.student}</b>, span(l), l.days, l.reason, <Chip key="st" tone={tone(l.status)}>{l.status}</Chip>])} />
        </Panel>
      )}
    </div>
  );
}
