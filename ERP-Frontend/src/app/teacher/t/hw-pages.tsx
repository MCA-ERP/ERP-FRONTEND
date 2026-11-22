"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { PillSelect, SearchBox, blueBtn, smallBtn } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const share = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}% of shown` : "");
const todayIso = () => new Date().toLocaleDateString("en-CA");
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA");
const tooBig = (f: File | undefined, mb: number) => !!f && f.size > mb * 1024 * 1024;

// ═════════════ homework management ═════════════
interface HW { id: string; code: string; section_id: string; class_label: string; subject: string; title: string; instructions: string; given_on: string; due_on: string; max_marks: number; attachment: string; status: string; submitted_pct: number }
interface HWData { items: HW[]; sections: { id: string; label: string; subject: string }[] }
const hTone = (s: string) => (s === "Published" ? "good" : s === "Closed" ? "bad" : "mute") as "good" | "bad" | "mute";

function RecentTable({ items, onView, extra }: { items: HW[]; onView: (h: HW) => void; extra?: (h: HW) => ReactNode }) {
  return <SimpleTable head={[{ h: "Ref." }, { h: "Class" }, { h: "Subject" }, { h: "Title" }, { h: "Given on" }, { h: "Due" }, { h: "Submitted" }, { h: "Status" }, { h: "" }]} empty="You have not set any homework yet." rows={items.map((h) => [h.code, h.class_label, h.subject, h.title, day(h.given_on), day(h.due_on), `${h.submitted_pct}%`, <Chip key="s" tone={hTone(h.status)}>{h.status}</Chip>, <span key="a" className="flex gap-1.5">{extra?.(h)}<button type="button" className={smallBtn} onClick={() => onView(h)}>View details</button></span>])} />;
}
function HwDetails({ h, onClose }: { h: HW; onClose: () => void }) {
  return <Modal open title={`${h.code} · ${h.title}`} onClose={onClose}><KV rows={[["Class", h.class_label], ["Subject", h.subject], ["Instructions", h.instructions || "—"], ["Given on", day(h.given_on)], ["Due", day(h.due_on)], ["Marks out of", h.max_marks], ["Attachment", h.attachment || "None"], ["Submitted", `${h.submitted_pct}%`], ["Status", <Chip key="s" tone={hTone(h.status)}>{h.status}</Chip>]]} /></Modal>;
}

export function HomeworkCreate() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<HWData>("/teacher/homework"), []);
  const act = useAction(reload);
  const blank = { section_id: "", title: "", instructions: "", given_on: todayIso(), due_on: plusDays(2), attachment: "", publish: true };
  const [f, setF] = useState(blank);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const [done, setDone] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<HW | null>(null);
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const items = useMemo(() => (data?.items ?? []).filter((h) => !q || `${h.code} ${h.class_label} ${h.title}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/homework", json("POST", { section_id: sec?.id, title: f.title, instructions: f.instructions, given_on: f.given_on, due_on: f.due_on, attachment_name: f.attachment || undefined, publish: f.publish })))) { setF({ ...blank, section_id: f.section_id }); setFileKey((k) => k + 1); setDone(f.publish ? "Homework published." : "Homework saved as a draft."); } };
  return (
    <div data-report>
      <Head title="Create" subtitle="Set homework for a section. Students and parents see it in the app once it's published." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New homework</h2></div>
            {!data.sections.length ? <Empty text="You have no classes with a subject yet." /> : (
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L><L label="Subject"><input className={inputCls} readOnly disabled value={sec?.subject ?? ""} /></L></div>
                <L label="Title"><input className={inputCls} required minLength={3} maxLength={200} placeholder="For example, Exercise 6.2, Q1 - 8" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></L>
                <L label="Instructions"><textarea className={`${inputCls} min-h-[5.5rem]`} maxLength={2000} placeholder="What to do, and what to bring" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></L>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <L label="Given on"><input type="date" className={inputCls} required value={f.given_on} onChange={(e) => setF({ ...f, given_on: e.target.value })} /></L>
                  <L label="Due"><input type="date" className={inputCls} required min={f.given_on} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></L>
                  <L label="Attachment" hint={fileErr || "Worksheet or photo, optional"}><input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className={FILE} onChange={(e) => { const file = e.target.files?.[0]; if (tooBig(file, 10)) { setFileErr("That file is over 10 MB."); e.target.value = ""; setF({ ...f, attachment: "" }); } else { setFileErr(""); setF({ ...f, attachment: file?.name ?? "" }); } }} /></L>
                  <label className="flex items-center gap-2 self-end pb-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f.publish} onChange={(e) => setF({ ...f, publish: e.target.checked })} className="size-4 accent-[#0294CE]" />Publish now to students and parents</label>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFileKey((k) => k + 1); }}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Save homework</button></div>
          </form>
          <Panel title="Recent homework" sub={`${data.items.length} homework`} right={<ExportPrint name="my-homework" head={["Ref.", "Class", "Subject", "Title", "Given on", "Due", "Submitted", "Status"]} rows={items.map((h) => [h.code, h.class_label, h.subject, h.title, h.given_on, h.due_on, `${h.submitted_pct}%`, h.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search recent homework" /></div>
            <RecentTable items={items.slice(0, 20)} onView={setView} />
          </Panel>
        </div>
      )}
      {view && <HwDetails h={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function HomeworkEdit() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<HWData>("/teacher/homework"), []);
  const act = useAction(reload);
  const open = (data?.items ?? []).filter((h) => h.status !== "Closed");
  const [pick, setPick] = useState("");
  const h = open.find((x) => x.id === pick) ?? open[0];
  const [edit, setEdit] = useState<{ for: string; title: string; due_on: string; status: string } | null>(null);
  const cur = h ? (edit?.for === h.id ? edit : { for: h.id, title: h.title, due_on: h.due_on, status: h.status }) : null;
  const [done, setDone] = useState("");
  const save = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (h && cur && await act.run(() => schoolFetch(`/teacher/homework/${h.id}`, json("PATCH", { title: cur.title, due_on: cur.due_on, status: cur.status })))) { setEdit(null); setDone("Saved."); } };
  return (
    <div data-report>
      <Head title="Edit" subtitle="Change homework that's still a draft or open. Parents see the update straight away." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !open.length && <Panel title="Edit homework"><Empty text="You have no draft or open homework to edit." /></Panel>}
      {data && h && cur && (
        <div className="space-y-5">
          <PillSelect label="Homework" value={h.id} onChange={(v) => { setPick(v); setEdit(null); setDone(""); }} options={open.map((x) => ({ value: x.id, label: `${x.code} · ${x.class_label} · ${x.title}` }))} />
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Edit {h.code}</h2></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2"><L label="Section"><input className={inputCls} readOnly disabled value={h.class_label} /></L>
                <L label="Status"><select className={inputCls} value={cur.status} onChange={(e) => setEdit({ ...cur, status: e.target.value })}>{h.status === "Draft" ? <><option>Draft</option><option>Published</option></> : <><option>Published</option><option>Closed</option></>}</select></L></div>
              <L label="Title"><input className={inputCls} required minLength={3} maxLength={200} value={cur.title} onChange={(e) => setEdit({ ...cur, title: e.target.value })} /></L>
              <div className="grid gap-4 sm:grid-cols-2"><L label="Due"><input type="date" className={inputCls} required min={h.given_on} value={cur.due_on} onChange={(e) => setEdit({ ...cur, due_on: e.target.value })} /></L><L label="Submitted so far"><input className={inputCls} readOnly disabled value={`${h.submitted_pct}%`} /></L></div>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit(null); setDone(""); }}>Discard</button><button type="submit" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Save changes</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export function HomeworkPublish({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<HWData>("/teacher/homework"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<HW | null>(null);
  const all = data?.items ?? [];
  const items = all.filter((h) => !q || `${h.code} ${h.class_label} ${h.title}`.toLowerCase().includes(q.toLowerCase()));
  const c = (s: string) => all.filter((h) => h.status === s).length;
  const set = (h: HW, status: string) => void act.run(() => schoolFetch(`/teacher/homework/${h.id}`, json("PATCH", { status })));
  return (
    <div data-report>
      <Head title="Publish" subtitle="Drafts aren't visible to students. Publish them, or close homework once the due date has passed." action={<button type="button" className={redBtn} onClick={() => go("create")}>+ New homework</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Homework", value: all.length, sub: "This year" }, { label: "Published", value: c("Published"), sub: share(c("Published"), all.length) }, { label: "Draft", value: c("Draft"), sub: share(c("Draft"), all.length) }]} />
          <Panel title="Homework" sub={`${all.length} homework`} right={<ExportPrint name="my-homework-status" head={["Ref.", "Class", "Subject", "Title", "Given on", "Due", "Submitted", "Status"]} rows={items.map((h) => [h.code, h.class_label, h.subject, h.title, h.given_on, h.due_on, `${h.submitted_pct}%`, h.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search homework" /></div>
            <RecentTable items={items} onView={setView} extra={(h) => h.status === "Draft" ? <button type="button" disabled={act.busy} className={blueBtn} onClick={() => set(h, "Published")}>Publish</button> : h.status === "Published" && h.due_on < todayIso() ? <button type="button" disabled={act.busy} className={smallBtn} onClick={() => set(h, "Closed")}>Close</button> : null} />
          </Panel>
        </div>
      )}
      {view && <HwDetails h={view} onClose={() => setView(null)} />}
    </div>
  );
}

// ═════════════ submissions ═════════════
interface Sub { id: string | null; homework_id: string; code: string; student_id: string; student: string; class_label: string; title: string; due_on: string; submitted_on: string | null; marks: number | null; max_marks: number; feedback: string; status: string; file_name: string }
interface Subs { pending: Sub[]; submitted: Sub[]; late: Sub[] }
const sTone = (s: string) => (s === "Checked" ? "good" : s === "Late" || s === "Pending" ? "warn" : "info") as "good" | "warn" | "info";

function Work({ s, onClose, onSaved }: { s: Sub; onClose: () => void; onSaved: () => void }) {
  const [marks, setMarks] = useState(s.marks === null ? "" : String(s.marks));
  const [fb, setFb] = useState(s.feedback);
  const act = useAction(() => { onSaved(); onClose(); });
  return (
    <Modal open title={`Work from ${s.student}`} onClose={onClose}>
      <ErrorBanner message={act.error} />
      <p className="mb-3 text-[12.5px] text-slate-600">{s.code} · {s.title} · {s.class_label} · uploaded by the parent</p>
      <div className="mb-4 grid place-items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-[13px] text-slate-600">{s.file_name ? <span className="font-medium text-slate-900">{s.file_name}</span> : "No file was attached to this submission."}</div>
      <div className="grid gap-3 sm:grid-cols-2"><L label={`Marks (out of ${s.max_marks})`}><input type="number" min={0} max={s.max_marks} step="0.5" className={inputCls} value={marks} onChange={(e) => setMarks(e.target.value)} /></L><L label="Feedback for the parent"><input className={inputCls} maxLength={500} value={fb} onChange={(e) => setFb(e.target.value)} /></L></div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={onClose}>Close</button><button type="button" disabled={act.busy || s.status === "Late" || s.status === "Pending"} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch("/teacher/homework/submissions/check", json("POST", { homework_id: s.homework_id, student_id: s.student_id, marks: marks === "" ? null : Number(marks), feedback: fb })))}>Save and mark checked</button></div>
    </Modal>
  );
}

function SubTable({ kind }: { kind: "pending" | "submitted" | "late" }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Subs>("/teacher/homework/submissions"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Sub | null>(null);
  const [work, setWork] = useState<Sub | null>(null);
  const [note, setNote] = useState("");
  const all = data?.[kind] ?? [];
  const items = all.filter((s) => !q || `${s.student} ${s.class_label} ${s.code} ${s.title}`.toLowerCase().includes(q.toLowerCase()));
  const post = (path: string, s: Sub, msg?: string) => void act.run(async () => { await schoolFetch(`/teacher/homework/submissions/${path}`, json("POST", { homework_id: s.homework_id, student_id: s.student_id })); if (msg) setNote(msg); });
  const checked = all.filter((s) => s.status === "Checked").length;
  const copy = { pending: ["Pending", "Students who haven't handed in homework yet."], submitted: ["Submitted", "Homework handed in on time. Mark it checked once you've seen it. Open View work to see what the parent uploaded."], late: ["Late", "Handed in after the due date. Open View work to see what the parent uploaded."] }[kind];
  return (
    <div data-report>
      <Head title={copy[0]} subtitle={copy[1]} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {note && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{note}</p>}
      {data && (
        <div className="space-y-5">
          <Tiles items={kind === "submitted" ? [{ label: "Submissions", value: all.length, sub: "This year" }, { label: "Submitted", value: all.length - checked, sub: share(all.length - checked, all.length) }, { label: "Checked", value: checked, sub: share(checked, all.length) }] : [{ label: "Submissions", value: all.length, sub: "This year" }, { label: copy[0], value: all.length, sub: all.length ? "100% of shown" : "" }]} />
          <Panel title="Submissions" sub={`${all.length} submissions`} right={<ExportPrint name={`homework-${kind}`} head={["Student", "Class", "Homework", "Due", "Submitted on", "Marks", "Status"]} rows={items.map((s) => [s.student, s.class_label, `${s.code} · ${s.title}`, s.due_on, s.submitted_on, s.marks, s.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search submissions" /></div>
            <SimpleTable head={[{ h: "Student" }, { h: "Class" }, { h: "Homework" }, { h: "Due" }, { h: "Submitted on" }, { h: "Marks" }, { h: "Status" }, { h: "" }]} empty={kind === "pending" ? "Every student has handed in their homework." : "Nothing here yet."} rows={items.slice(0, 500).map((s) => [<b key="n" className="font-semibold text-slate-900">{s.student}</b>, s.class_label, `${s.code} · ${s.title}`, day(s.due_on), s.submitted_on ? day(s.submitted_on) : "—", s.marks === null ? "—" : `${s.marks}/${s.max_marks}`, <Chip key="s" tone={sTone(s.status)}>{s.status}</Chip>,
              <span key="a" className="flex gap-1.5">
                {kind === "pending" && <button type="button" disabled={act.busy} className={smallBtn} onClick={() => post("remind", s, `Reminder sent to ${s.student}'s parent.`)}>Remind parent</button>}
                {kind !== "pending" && <button type="button" className={smallBtn} onClick={() => setWork(s)}>View work</button>}
                {kind === "submitted" && s.status === "Submitted" && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch("/teacher/homework/submissions/check", json("POST", { homework_id: s.homework_id, student_id: s.student_id })))}>Mark checked</button>}
                {kind === "late" && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => post("accept-late", s)}>Accept</button>}
                <button type="button" className={smallBtn} onClick={() => setView(s)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {work && <Work s={work} onClose={() => setWork(null)} onSaved={reload} />}
      {view && <Modal open title={`${view.student} · ${view.code}`} onClose={() => setView(null)}><KV rows={[["Class", view.class_label], ["Homework", view.title], ["Due", day(view.due_on)], ["Submitted on", view.submitted_on ? day(view.submitted_on) : "—"], ["File", view.file_name || "—"], ["Marks", view.marks === null ? "—" : `${view.marks} / ${view.max_marks}`], ["Feedback", view.feedback || "—"], ["Status", <Chip key="s" tone={sTone(view.status)}>{view.status}</Chip>]]} /></Modal>}
    </div>
  );
}
export const SubmissionsPending = () => <SubTable kind="pending" />;
export const SubmissionsSubmitted = () => <SubTable kind="submitted" />;
export const SubmissionsLate = () => <SubTable kind="late" />;

// ═════════════ assignments ═════════════
interface AS { id: string; code: string; title: string; section_id: string; class_label: string; assigned_on: string | null; due_on: string; max_marks: number; submitted: number; total: number; status: string; instructions: string; rubric_name: string; days_left: number }
interface ASData { items: AS[]; sections: { id: string; label: string; subject: string }[] }
const aTone = (s: string) => (s === "Assigned" ? "info" : s === "Closed" ? "bad" : "mute") as "info" | "bad" | "mute";
function AsDetails({ a, onClose }: { a: AS; onClose: () => void }) {
  return <Modal open title={`${a.code} · ${a.title}`} onClose={onClose}><KV rows={[["Class", a.class_label], ["Instructions", a.instructions || "—"], ["Rubric / worksheet", a.rubric_name || "None"], ["Assigned on", a.assigned_on ? day(a.assigned_on) : "—"], ["Due", day(a.due_on)], ["Maximum marks", a.max_marks], ["Submitted", a.status === "Draft" ? "—" : `${a.submitted} of ${a.total}`], ["Status", <Chip key="s" tone={aTone(a.status)}>{a.status}</Chip>]]} /></Modal>;
}

export function AssignmentCreate() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<ASData>("/teacher/assignments"), []);
  const act = useAction(reload);
  const blank = { section_id: "", title: "", max_marks: "20", due_on: plusDays(10), instructions: "", rubric: "", assign_now: false };
  const [f, setF] = useState(blank);
  const [fileKey, setFileKey] = useState(0);
  const [done, setDone] = useState("");
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/teacher/assignments", json("POST", { title: f.title, section_id: sec?.id, max_marks: Number(f.max_marks), due_on: f.due_on, instructions: f.instructions, rubric_name: f.rubric || undefined, assign_now: f.assign_now })))) { setF({ ...blank, section_id: f.section_id }); setFileKey((k) => k + 1); setDone(f.assign_now ? "Assignment assigned." : "Assignment saved as a draft."); } };
  return (
    <div data-report>
      <Head title="Create" subtitle="Projects and activities with marks. Save as a draft, or assign straight away." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New assignment</h2></div>
          {!data.sections.length ? <Empty text="You have no classes with a subject yet." /> : (
            <div className="space-y-4 p-5">
              <L label="Title"><input className={inputCls} required minLength={3} maxLength={200} placeholder="For example, Model of 3D shapes" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></L>
              <div className="grid gap-4 sm:grid-cols-3">
                <L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
                <L label="Maximum marks"><input type="number" className={inputCls} required min={1} max={200} value={f.max_marks} onChange={(e) => setF({ ...f, max_marks: e.target.value })} /></L>
                <L label="Due"><input type="date" className={inputCls} required min={todayIso()} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></L>
              </div>
              <L label="Instructions"><textarea className={`${inputCls} min-h-[6rem]`} maxLength={2000} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></L>
              <div className="grid gap-4 sm:grid-cols-2"><L label="Rubric or worksheet" hint="Optional"><input key={fileKey} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={FILE} onChange={(e) => setF({ ...f, rubric: e.target.files?.[0]?.name ?? "" })} /></L>
                <label className="flex items-center gap-2 self-end pb-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f.assign_now} onChange={(e) => setF({ ...f, assign_now: e.target.checked })} className="size-4 accent-[#0294CE]" />Assign to the section now</label></div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFileKey((k) => k + 1); }}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Save assignment</button></div>
        </form>
      )}
    </div>
  );
}

export function AssignmentAssign({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<ASData>("/teacher/assignments"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<AS | null>(null);
  const [note, setNote] = useState("");
  const all = data?.items ?? [];
  const items = all.filter((a) => !q || `${a.code} ${a.title} ${a.class_label}`.toLowerCase().includes(q.toLowerCase()));
  const c = (s: string) => all.filter((a) => a.status === s).length;
  return (
    <div data-report>
      <Head title="Assign" subtitle="Assign drafts to a section. Students and parents get a notification with the due date." action={<button type="button" className={redBtn} onClick={() => go("create")}>+ New assignment</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {note && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{note}</p>}
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Assignments", value: all.length, sub: "This year" }, { label: "Assigned", value: c("Assigned"), sub: share(c("Assigned"), all.length) }, { label: "Draft", value: c("Draft"), sub: share(c("Draft"), all.length) }]} />
          <Panel title="Assignments" sub={`${all.length} assignments`} right={<ExportPrint name="my-assignments" head={["Ref.", "Title", "Class", "Assigned on", "Due", "Max marks", "Submitted", "Status"]} rows={items.map((a) => [a.code, a.title, a.class_label, a.assigned_on, a.due_on, a.max_marks, a.status === "Draft" ? "" : `${a.submitted} of ${a.total}`, a.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search assignments" /></div>
            <SimpleTable head={[{ h: "Ref." }, { h: "Title" }, { h: "Class" }, { h: "Assigned on" }, { h: "Due" }, { h: "Max marks", right: true }, { h: "Submitted" }, { h: "Status" }, { h: "" }]} empty="You have not created an assignment yet." rows={items.map((a) => [a.code, a.title, a.class_label, a.assigned_on ? day(a.assigned_on) : "—", day(a.due_on), a.max_marks, a.status === "Draft" ? "—" : `${a.submitted} of ${a.total}`, <Chip key="s" tone={aTone(a.status)}>{a.status}</Chip>,
              <span key="a" className="flex gap-1.5">{a.status === "Draft" && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/assignments/${a.id}/assign`, json("POST", {})))}>Assign to {a.class_label}</button>}{a.status === "Assigned" && <button type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(async () => { const r = await schoolFetch<{ notified: number }>(`/teacher/assignments/${a.id}/notify`, json("POST", {})); setNote(`${r.notified} parent${r.notified === 1 ? "" : "s"} reminded about ${a.code}.`); })}>Notify again</button>}<button type="button" className={smallBtn} onClick={() => setView(a)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {view && <AsDetails a={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function AssignmentDueDates() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<ASData>("/teacher/assignments"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<AS | null>(null);
  const all = (data?.items ?? []).filter((a) => a.status === "Assigned").sort((a, b) => (a.due_on < b.due_on ? -1 : 1));
  const items = all.filter((a) => !q || `${a.code} ${a.title} ${a.class_label}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Due Dates" subtitle="Assigned work by due date. Extend a deadline if a class needs more time." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Due dates" sub={`${all.length} assignments`} right={<ExportPrint name="assignment-due-dates" head={["Ref.", "Title", "Section", "Due", "Days left", "Submitted"]} rows={items.map((a) => [a.code, a.title, a.class_label, a.due_on, a.days_left, `${a.submitted} of ${a.total}`])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search due dates" /></div>
          <SimpleTable head={[{ h: "Ref." }, { h: "Title" }, { h: "Section" }, { h: "Due" }, { h: "Days left" }, { h: "Submitted" }, { h: "" }]} empty="No assignment is waiting for a due date." rows={items.map((a) => [a.code, <b key="t" className="font-semibold text-slate-900">{a.title}</b>, a.class_label, day(a.due_on), a.days_left < 0 ? <span key="d" className="text-[#ac2c28]">Overdue by {-a.days_left}</span> : a.days_left, `${a.submitted} of ${a.total}`,
            <span key="a" className="flex gap-1.5"><button type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/assignments/${a.id}/extend`, json("POST", { days: 3 })))}>Extend 3 days</button>{a.days_left < 0 && <Link href={`/teacher/assignments/evaluation?assignment=${a.id}`} className={blueBtn}>Evaluate</Link>}<button type="button" className={smallBtn} onClick={() => setView(a)}>View details</button></span>])} />
        </Panel>
      )}
      {view && <AsDetails a={view} onClose={() => setView(null)} />}
    </div>
  );
}

// ═════════════ evaluation ═════════════
interface Marks { id: string; code: string; title: string; class_label: string; students_total: number; submitted: number; due_on: string; max_marks: number; published: boolean; students: { student_id: string; roll_no: string; name: string; status: string; marks: number | null; percent: number | null; grade: string; feedback: string; feedback_sent: boolean; published: boolean }[] }
const grade = (p: number) => (p >= 91 ? "A1" : p >= 81 ? "A2" : p >= 71 ? "B1" : p >= 61 ? "B2" : p >= 51 ? "C1" : p >= 41 ? "C2" : p >= 33 ? "D" : "E");
const PRESETS = ["Excellent, creative presentation.", "Well done, neat and complete.", "Good work. Show all your steps.", "Check your calculations in part 2.", "Incomplete. Please finish and resubmit."];
const suggest = (p: number | null) => (p === null ? "" : p >= 90 ? PRESETS[0] : p >= 75 ? PRESETS[1] : p >= 60 ? PRESETS[2] : p >= 45 ? PRESETS[3] : PRESETS[4]);

function useAssignmentPick() {
  const list = useLoad(() => schoolFetch<ASData>("/teacher/assignments"), []);
  const param = useSearchParams().get("assignment");
  const open = (list.data?.items ?? []).filter((a) => a.status !== "Draft");
  const [pick, setPick] = useState(param ?? "");
  const id = open.some((a) => a.id === pick) ? pick : open[0]?.id ?? "";
  return { list, open, id, setPick };
}

export function EvaluationMarks() {
  const { list, open, id, setPick } = useAssignmentPick();
  const { data, error, loading, reload } = useLoad(() => (id ? schoolFetch<Marks>(`/teacher/assignments/${id}/marks`) : Promise.resolve(null)), [id]);
  const [edit, setEdit] = useState<{ for: Marks; v: Record<string, string> } | null>(null);
  const act = useAction(reload);
  const [done, setDone] = useState("");
  const vals: Record<string, string> = data ? (edit?.for === data ? edit.v : Object.fromEntries(data.students.map((s) => [s.student_id, s.marks === null ? "" : String(s.marks)]))) : {};
  const setVal = (sid: string, v: string) => data && setEdit({ for: data, v: { ...vals, [sid]: v } });
  const bad = data ? data.students.some((s) => vals[s.student_id] !== "" && (Number(vals[s.student_id]) < 0 || Number(vals[s.student_id]) > data.max_marks || Number.isNaN(Number(vals[s.student_id])))) : false;
  const send = async (publish: boolean) => { setDone(""); if (await act.run(() => schoolFetch(`/teacher/assignments/${id}/marks`, json("POST", { items: data!.students.map((s) => ({ student_id: s.student_id, marks: vals[s.student_id] === "" ? null : Number(vals[s.student_id]) })), publish })))) { setEdit(null); setDone(publish ? "Marks published to students and parents." : "Marks saved."); } };
  return (
    <div data-report>
      <Head title="Marks" subtitle={`Give marks for ${data?.code ?? "an assignment"}. Grades update as you type. Publish when you're done so parents see them.`} />
      <ErrorBanner message={list.error || error || act.error} />
      <Loading on={(list.loading && !list.data) || (loading && !data)} />
      {list.data && !open.length && <Panel title="Marks"><Empty text="You have no assigned work to evaluate yet." /></Panel>}
      {list.data && open.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Assignment" value={id} onChange={(v) => { setPick(v); setEdit(null); setDone(""); }} options={open.map((a) => ({ value: a.id, label: `${a.code} · ${a.class_label} · ${a.title}` }))} />
          {data && (
            <>
              <Tiles items={[{ label: "Section", value: data.class_label, sub: `${data.students_total} students` }, { label: "Submitted", value: `${data.submitted} of ${data.students_total}`, sub: `Due ${day(data.due_on)}` }, { label: "Maximum marks", value: data.max_marks }]} />
              <Panel title={data.title} sub={`Out of ${data.max_marks}`}>
                <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Submission" }, { h: "Marks" }, { h: "%" }, { h: "Grade" }]} empty="There are no students in this section." rows={data.students.map((s) => { const v = vals[s.student_id]; const p = v === "" || Number.isNaN(Number(v)) ? null : Math.round((Number(v) / data.max_marks) * 100); return [s.roll_no, <b key="n" className="font-semibold text-slate-900">{s.name}</b>, <Chip key="s" tone={s.status === "Late" ? "warn" : s.status === "Not submitted" ? "mute" : s.status === "Checked" ? "good" : "info"}>{s.status}</Chip>,
                  <input key="m" type="number" min={0} max={data.max_marks} step="0.5" aria-label={`${s.name} marks`} value={v ?? ""} onChange={(e) => setVal(s.student_id, e.target.value)} className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-[13px]" />, p === null ? "—" : `${p}%`, p === null ? "—" : <Chip key="g" tone="mute">{grade(p)}</Chip>]; })} />
                <div className="flex items-center gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="text-sm font-semibold text-emerald-700">{done}</span>}{bad && <span className="text-sm text-rose-700">Marks must be between 0 and {data.max_marks}.</span>}
                  <button type="button" disabled={act.busy || bad} className={`${btnGhost} ml-auto !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void send(false)}>Save marks</button><button type="button" disabled={act.busy || bad} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void send(true)}>{data.published ? "Publish again" : "Publish marks"}</button></div>
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EvaluationFeedback() {
  const { list, open, id, setPick } = useAssignmentPick();
  const { data, error, loading, reload } = useLoad(() => (id ? schoolFetch<Marks>(`/teacher/assignments/${id}/marks`) : Promise.resolve(null)), [id]);
  const [edit, setEdit] = useState<{ for: Marks; v: Record<string, string> } | null>(null);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [done, setDone] = useState("");
  const [view, setView] = useState<Marks["students"][number] | null>(null);
  const rows = (data?.students ?? []).filter((s) => s.marks !== null);
  const fb = (s: Marks["students"][number]) => (data && edit?.for === data && edit.v[s.student_id] !== undefined ? edit.v[s.student_id] : s.feedback || suggest(s.percent));
  const setFb = (sid: string, v: string) => data && setEdit({ for: data, v: { ...(edit?.for === data ? edit.v : {}), [sid]: v } });
  const send = async (items: { student_id: string; feedback: string }[]) => { setDone(""); if (!items.length) return; if (await act.run(() => schoolFetch(`/teacher/assignments/${id}/feedback`, json("POST", { items })))) { setEdit(null); setDone(`Feedback sent to ${items.length} ${items.length === 1 ? "student" : "students"}.`); } };
  const shown = rows.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Feedback" subtitle="Short feedback for each student. They and their parents see it with the marks." action={<button type="button" disabled={act.busy || !rows.length} className={redBtn} onClick={() => void send(rows.map((s) => ({ student_id: s.student_id, feedback: fb(s) })).filter((x) => x.feedback))}>Send all feedback</button>} />
      <ErrorBanner message={list.error || error || act.error} />
      <Loading on={(list.loading && !list.data) || (loading && !data)} />
      {list.data && !open.length && <Panel title="Feedback"><Empty text="You have no assigned work yet." /></Panel>}
      {list.data && open.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Assignment" value={id} onChange={(v) => { setPick(v); setEdit(null); setDone(""); }} options={open.map((a) => ({ value: a.id, label: `${a.code} · ${a.class_label} · ${a.title}` }))} />
          {done && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{done}</p>}
          {data && (
            <Panel title={`Feedback · ${data.code}`} sub={`${rows.length} students`} right={<ExportPrint name="assignment-feedback" head={["Roll", "Student", "Marks", "Feedback"]} rows={shown.map((s) => [s.roll_no, s.name, `${s.marks}/${data.max_marks}`, fb(s)])} />}>
              <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search feedback · ${data.code.toLowerCase()}`} /></div>
              <SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Marks" }, { h: "Feedback" }, { h: "" }]} empty="Enter marks first: feedback goes with the marks." rows={shown.map((s) => [s.roll_no, <b key="n" className="font-semibold text-slate-900">{s.name}</b>, `${s.marks}/${data.max_marks}`,
                <select key="f" aria-label={`${s.name} feedback`} value={fb(s)} onChange={(e) => setFb(s.student_id, e.target.value)} className="w-72 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12.5px]">{[...new Set([fb(s), ...PRESETS])].filter(Boolean).map((p) => <option key={p}>{p}</option>)}</select>,
                <span key="a" className="flex gap-1.5"><button type="button" disabled={act.busy || !fb(s)} className={smallBtn} onClick={() => void send([{ student_id: s.student_id, feedback: fb(s) }])}>{s.feedback_sent ? "Sent" : "Send"}</button><button type="button" className={smallBtn} onClick={() => setView(s)}>View details</button></span>])} />
            </Panel>
          )}
        </div>
      )}
      {view && data && <Modal open title={`${view.name} · ${data.code}`} onClose={() => setView(null)}><KV rows={[["Marks", `${view.marks} / ${data.max_marks}`], ["Percent", view.percent === null ? "—" : `${view.percent}%`], ["Grade", view.grade || "—"], ["Feedback", view.feedback || "Not sent yet"], ["Marks published", view.published ? "Yes" : "No"]]} /></Modal>}
    </div>
  );
}
