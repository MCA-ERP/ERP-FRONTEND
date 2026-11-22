"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { PillSelect, SearchBox, blueBtn, smallBtn, usePickedSection } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const todayIso = () => new Date().toLocaleDateString("en-CA");
const share = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}% of shown` : "");

// ═════════════ class diary ═════════════
interface Diary { sections: { id: string; label: string; is_mine: boolean; students: number }[]; templates: { id: string; name: string; body: string }[]; items: { id: string; date: string; class_label: string; entry: string; seen: number; total: number; status: string; attachment: string; ask_ack: boolean }[] }
export function ClassDiary() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Diary>("/teacher/diary"), []);
  const [sec, pick] = usePickedSection(data?.sections ?? [], null);
  const act = useAction(reload);
  const [f, setF] = useState({ date: todayIso(), entry: "", ask: true, file: "" });
  const [fileKey, setFileKey] = useState(0);
  const [q, setQ] = useState("");
  const [done, setDone] = useState("");
  const [view, setView] = useState<Diary["items"][number] | null>(null);
  const s = data?.sections.find((x) => x.id === sec);
  const items = (data?.items ?? []).filter((d) => !q || `${d.class_label} ${d.entry}`.toLowerCase().includes(q.toLowerCase()));
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/diary", json("POST", { section_id: sec, date: f.date, entry: f.entry, ask_ack: f.ask, attachment_name: f.file || undefined })))) { setF({ ...f, entry: "", file: "" }); setFileKey((k) => k + 1); setDone("Sent to parents."); } };
  return (
    <div data-report>
      <Head title="Class Diary" subtitle="A note for every parent in a section: what to bring, upcoming tests, reminders." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !data.sections.length && <Panel title="Class diary"><Empty text="You have no classes yet." /></Panel>}
      {data && data.sections.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={data.sections.map((x) => ({ value: x.id, label: x.label }))} right={s ? `${s.label} · ${s.students} students${s.is_mine ? " · you're the class teacher" : ""}` : ""} />
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New diary entry · {s?.label}</h2></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2"><L label="Date"><input type="date" className={inputCls} required max={todayIso()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></L><L label="Attachment" hint="Optional"><input key={fileKey} type="file" className={FILE} onChange={(e) => setF({ ...f, file: e.target.files?.[0]?.name ?? "" })} /></L></div>
              {data.templates.length > 0 && <div><p className="mb-1.5 text-[12.5px] font-medium text-slate-900">Start from a school template</p><div className="flex flex-wrap gap-2">{data.templates.map((t) => <button key={t.id} type="button" title={t.name} onClick={() => setF({ ...f, entry: t.body })} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] text-slate-800 hover:border-[#41afda]">{t.body.length > 28 ? `${t.body.slice(0, 28)}…` : t.body}</button>)}</div></div>}
              <L label="Entry"><textarea className={`${inputCls} min-h-[5rem]`} required minLength={3} maxLength={500} placeholder="For example, Bring a geometry box tomorrow" value={f.entry} onChange={(e) => setF({ ...f, entry: e.target.value })} /></L>
              <label className="flex items-center gap-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f.ask} onChange={(e) => setF({ ...f, ask: e.target.checked })} className="size-4 accent-[#0294CE]" />Ask parents to acknowledge</label>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF({ ...f, entry: "", file: "" }); setFileKey((k) => k + 1); }}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Send to parents</button></div>
          </form>
          <Panel title="Class diary" sub={`${data.items.length} entries`} right={<ExportPrint name="class-diary" head={["Date", "Section", "Entry", "Parents seen", "Status"]} rows={items.map((d) => [d.date, d.class_label, d.entry, `${d.seen} of ${d.total}`, d.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search class diary" /></div>
            <SimpleTable head={[{ h: "Date" }, { h: "Section" }, { h: "Entry" }, { h: "Parents seen" }, { h: "Status" }, { h: "" }]} empty="You have not sent a diary entry yet." rows={items.map((d) => [day(d.date), <b key="s" className="font-semibold text-slate-900">{d.class_label}</b>, <span key="e" className="whitespace-normal">{d.entry}</span>, `${d.seen} of ${d.total}`, <Chip key="st" tone={d.status === "Acknowledged" ? "good" : "info"}>{d.status}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(d)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={`${view.class_label} · ${day(view.date)}`} onClose={() => setView(null)}><KV rows={[["Entry", view.entry], ["Attachment", view.attachment || "None"], ["Acknowledgement asked", view.ask_ack ? "Yes" : "No"], ["Parents seen", `${view.seen} of ${view.total}`], ["Status", view.status]]} /></Modal>}
    </div>
  );
}

export function DiaryRemarks() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ students: { id: string; label: string }[]; items: { id: string; date: string; student: string; class_label: string; entry: string }[] }>("/teacher/diary/remarks"), []);
  const act = useAction(reload);
  const [stu, setStu] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [done, setDone] = useState("");
  const id = data?.students.some((s) => s.id === stu) ? stu : data?.students[0]?.id ?? "";
  const items = (data?.items ?? []).filter((r) => !q || `${r.student} ${r.entry}`.toLowerCase().includes(q.toLowerCase()));
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/diary/remarks", json("POST", { student_id: id, entry: text })))) { setText(""); setDone("Remark sent to the parent."); } };
  return (
    <div data-report>
      <Head title="Remarks" subtitle="A private note to one student's parent." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New remark</h2></div>
            <div className="space-y-4 p-5"><L label="Student"><select className={inputCls} value={id} onChange={(e) => setStu(e.target.value)}>{data.students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L><L label="Remark"><textarea className={`${inputCls} min-h-[5rem]`} required minLength={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} /></L></div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="submit" disabled={act.busy || !id} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Send to parent</button></div>
          </form>
          <Panel title="Remarks" sub={`${data.items.length} remarks`} right={<ExportPrint name="remarks" head={["Date", "Student", "Class", "Remark"]} rows={items.map((r) => [r.date, r.student, r.class_label, r.entry])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search remarks" /></div>
            <SimpleTable head={[{ h: "Date" }, { h: "Student" }, { h: "Class" }, { h: "Remark" }]} empty="You have not written a remark yet." rows={items.map((r) => [day(r.date), <b key="s" className="font-semibold text-slate-900">{r.student}</b>, r.class_label, <span key="e" className="whitespace-normal">{r.entry}</span>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ leave ═════════════
interface Leave {
  year: string; person: { name: string; role: string } | null; role: string; department: string; is_hod: boolean; route: string;
  balance: { type: string; allowed: number; taken: number; pending: number; balance: number; details: string }[]; policy: { rule: string; allowance: string; details: string }[];
  items: { id: string; code: string; leave_type: string; type_label: string; from_date: string; to_date: string; days: number; reason: string; cover_note: string | null; status: string; created_at: string; stage: string }[];
  comp: { id: string; worked_on: string; reason: string; use_by: string; status: string }[];
}
const lTone = (s: string) => (s === "Approved" ? "good" : s === "Rejected" ? "bad" : "warn") as "good" | "bad" | "warn";
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const TYPES = [["Casual", "Casual leave"], ["Sick", "Sick leave"], ["Earned", "Earned leave"]];

export function LeaveApply({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Leave>("/teacher/leave"), []);
  const act = useAction(reload);
  const blank = { leave_type: "Casual", from_date: todayIso(), to_date: todayIso(), half: false, reason: "", cover: "" };
  const [f, setF] = useState(blank);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/teacher/leave", json("POST", { leave_type: f.leave_type, from_date: f.from_date, to_date: f.half ? f.from_date : f.to_date, half_day: f.half, reason: f.reason, cover_note: f.cover || undefined })))) { setF(blank); go("status"); } };
  return (
    <div data-report>
      <Head title="Apply" subtitle="Apply for leave. It goes only as far up the approval chain as it needs to, and you can see where it is at every step." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={data.balance.map((b) => ({ label: `${b.type} leave`, value: `${num(b.balance)} left`, sub: `Used ${num(b.taken)} of ${num(b.allowed)}` }))} />
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Apply for leave</h2><span className="text-xs text-slate-500">{data.person?.name} · {data.role}</span></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <L label="Leave type"><select className={inputCls} value={f.leave_type} onChange={(e) => setF({ ...f, leave_type: e.target.value, half: e.target.value === "Earned" ? false : f.half })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></L>
                <L label="From"><input type="date" className={inputCls} required value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value, to_date: f.to_date < e.target.value ? e.target.value : f.to_date })} /></L>
                <L label="To"><input type="date" className={inputCls} required disabled={f.half} min={f.from_date} value={f.half ? f.from_date : f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></L>
                <label className="flex items-center gap-2 self-end pb-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f.half} disabled={f.leave_type === "Earned"} onChange={(e) => setF({ ...f, half: e.target.checked })} className="size-4 accent-[#0294CE]" />Half day</label>
              </div>
              <L label="Reason"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={1000} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></L>
              <L label="Who covers my work"><input className={`${inputCls} sm:max-w-sm`} maxLength={300} placeholder="Name and what they'll handle" value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value })} /></L>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-[12px] text-slate-700"><b>Route:</b> {data.route}</p>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>{act.busy ? "Sending…" : "Apply"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export function MyLeaveHistory() {
  const { data, error, loading } = useLoad(() => schoolFetch<Leave>("/teacher/leave"), []);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Leave["items"][number] | null>(null);
  const all = data?.items ?? [];
  const items = all.filter((r) => !q || `${r.code} ${r.type_label} ${r.reason} ${r.status}`.toLowerCase().includes(q.toLowerCase()));
  const c = (s: string) => all.filter((r) => r.status === s).length;
  return (
    <div data-report>
      <Head title="History" subtitle="Every leave application this year." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Leave applications", value: all.length, sub: "This year" }, { label: "Approved", value: c("Approved"), sub: share(c("Approved"), all.length) }, { label: "Pending", value: c("Pending"), sub: share(c("Pending"), all.length) }, { label: "Rejected", value: c("Rejected"), sub: share(c("Rejected"), all.length) }]} />
          <Panel title="Leave applications" sub={`${all.length} applications`} right={<ExportPrint name="my-leave" head={["Ref.", "Leave type", "From", "To", "Days", "Reason", "Applied", "Status"]} rows={items.map((r) => [r.code, r.type_label, r.from_date, r.to_date, r.days, r.reason, r.created_at.slice(0, 10), r.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search leave applications" /></div>
            <SimpleTable head={[{ h: "Ref." }, { h: "Leave type" }, { h: "From" }, { h: "To" }, { h: "Days", right: true }, { h: "Reason" }, { h: "Applied" }, { h: "Status" }, { h: "" }]} empty="You have not applied for leave this year." rows={items.map((r) => [r.code, r.type_label, day(r.from_date), day(r.to_date), num(Number(r.days)), r.reason || "—", day(r.created_at), <Chip key="s" tone={lTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(r)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={`${view.code} · ${view.type_label}`} onClose={() => setView(null)}><KV rows={[["From", day(view.from_date)], ["To", day(view.to_date)], ["Days", num(Number(view.days))], ["Reason", view.reason || "—"], ["Who covers my work", view.cover_note || "—"], ["Applied", day(view.created_at)], ["Where it is", view.stage], ["Status", <Chip key="s" tone={lTone(view.status)}>{view.status}</Chip>]]} /></Modal>}
    </div>
  );
}

export function LeaveStatus() {
  const { data, error, loading } = useLoad(() => schoolFetch<Leave>("/teacher/leave"), []);
  const pending = (data?.items ?? []).filter((r) => r.status === "Pending");
  const earlier = (data?.items ?? []).filter((r) => r.status !== "Pending");
  return (
    <div data-report>
      <Head title="Status" subtitle="Your leave requests and exactly where each one is." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          {!pending.length ? <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-800">No leave requests yet. Apply from the Apply tab and it appears here with its approval route.</p> : pending.map((r) => (
            <section key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-baseline gap-2"><h2 className="text-[14px] font-semibold text-slate-900">{r.code} · {r.type_label}</h2><span className="text-xs text-slate-500">{day(r.from_date)}{r.to_date !== r.from_date ? ` – ${day(r.to_date)}` : ""} · {num(Number(r.days))} day{Number(r.days) === 1 ? "" : "s"}</span></div><p className="mt-2 text-[13px] text-slate-800"><Chip tone="warn">{r.stage}</Chip></p></section>
          ))}
          <Panel title="Earlier this year" sub={`${earlier.length} requests`} right={<ExportPrint name="leave-earlier" head={["Leave", "From", "To", "Days", "Status"]} rows={earlier.map((r) => [r.type_label, r.from_date, r.to_date, r.days, r.status])} />}>
            <SimpleTable head={[{ h: "Leave" }, { h: "From" }, { h: "To" }, { h: "Days" }, { h: "Status" }]} empty="Nothing earlier this year." rows={earlier.map((r) => [<b key="l" className="font-semibold text-slate-900">{r.type_label}</b>, day(r.from_date), day(r.to_date), num(Number(r.days)), <Chip key="s" tone={lTone(r.status)}>{r.status}</Chip>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

export function LeavePolicy() {
  const { data, error, loading } = useLoad(() => schoolFetch<Leave>("/teacher/leave"), []);
  return (
    <div data-report>
      <Head title="Balance and Policy" subtitle="Your balances and the leave rules that apply to you, as set by HR." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Panel title={`Leave balance · ${data.year}`} sub={`${data.balance.length} leave types`} right={<ExportPrint name="leave-balance" head={["Type", "Allowed", "Taken", "Pending", "Balance"]} rows={data.balance.map((b) => [`${b.type} leave`, b.allowed, b.taken, b.pending, b.balance])} />}>
            <SimpleTable head={[{ h: "Type" }, { h: "Allowed" }, { h: "Taken" }, { h: "Pending" }, { h: "Balance" }]} rows={data.balance.map((b) => [<b key="t" className="font-semibold text-slate-900">{b.type} leave</b>, num(b.allowed), num(b.taken), num(b.pending), <b key="b" className="font-semibold text-slate-900">{num(b.balance)}</b>])} />
          </Panel>
          <Panel title="Leave policy" sub="From HR · Leave Policies">
            <SimpleTable head={[{ h: "Rule" }, { h: "Allowance" }, { h: "Details" }]} rows={data.policy.map((p) => [<b key="r" className="font-semibold text-slate-900">{p.rule}</b>, p.allowance, p.details || ""])} />
          </Panel>
        </div>
      )}
    </div>
  );
}

export function CompOff() {
  const { data, error, loading } = useLoad(() => schoolFetch<Leave>("/teacher/leave"), []);
  return (
    <div data-report>
      <Head title="Comp-off" subtitle="Comp-offs you've earned for Sunday or holiday duty. Apply for one from the Apply tab before it expires." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My comp-offs" sub={`${data.comp.length} comp-offs`} right={<ExportPrint name="my-comp-offs" head={["Worked on", "Reason", "Use by", "Status"]} rows={data.comp.map((c) => [c.worked_on, c.reason, c.use_by, c.status])} />}>
          <SimpleTable head={[{ h: "Worked on" }, { h: "Reason" }, { h: "Use by" }, { h: "Status" }]} empty="You have no comp-off yet." rows={data.comp.map((c) => [day(c.worked_on), <b key="r" className="font-semibold text-slate-900">{c.reason}</b>, day(c.use_by), <Chip key="s" tone={c.status === "Available" ? "good" : "mute"}>{c.status}</Chip>])} />
        </Panel>
      )}
    </div>
  );
}

export function TeamLeave() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ department: string; items: { id: string; code: string; teacher: string; leave: string; from: string; to: string; then: string }[] }>("/teacher/leave/team"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((r) => !q || `${r.code} ${r.teacher} ${r.leave}`.toLowerCase().includes(q.toLowerCase()));
  const decide = (id: string, action: "approve" | "send_back") => void act.run(() => schoolFetch(`/teacher/leave/team/${id}`, json("POST", { action })));
  return (
    <div data-report>
      <Head title="Team Leave (HOD)" subtitle={data?.department ? `As HOD of ${data.department} you approve your department's leave first. Anything longer goes on to the Vice principal and Principal automatically.` : "Leave requests from your department wait here for your approval first."} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !data.department && <Panel title="Waiting for you"><Empty text="You are not the head of a department, so there is no team leave to approve." /></Panel>}
      {data && data.department && (
        <Panel title="Waiting for you · HOD" sub={`${data.items.length} requests`} right={<ExportPrint name="team-leave" head={["Request", "Teacher", "Leave", "Dates", "Then goes to"]} rows={items.map((r) => [r.code, r.teacher, r.leave, `${r.from} - ${r.to}`, r.then])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search waiting for you · hod" /></div>
          <SimpleTable head={[{ h: "Request" }, { h: "Teacher" }, { h: "Leave" }, { h: "Dates" }, { h: "Then goes to" }, { h: "" }]} empty="Nothing is waiting for you." rows={items.map((r) => [r.code, <b key="t" className="font-semibold text-slate-900">{r.teacher}</b>, r.leave, r.from === r.to ? day(r.from) : `${day(r.from)} – ${day(r.to)}`, r.then, <span key="a" className="flex gap-1.5"><button type="button" disabled={act.busy} className={blueBtn} onClick={() => decide(r.id, "approve")}>Approve</button><button type="button" disabled={act.busy} className={smallBtn} onClick={() => decide(r.id, "send_back")}>Send back</button></span>])} />
        </Panel>
      )}
    </div>
  );
}
