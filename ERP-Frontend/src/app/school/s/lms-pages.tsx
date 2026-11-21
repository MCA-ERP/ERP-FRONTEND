"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, useStaff } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { BarRows, Panel } from "@/components/admin/dash";
import { QuestionPages } from "./exam-pages3";
import { CurriculumPages } from "./academic-pages3";
import { AcademicReportPages } from "./academic-pages4";
import { useGoTab } from "./tab-context";

const L = "/school/lms";
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex flex-wrap gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const names = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5);
const fileText = (a: string[]) => (a.length ? (a.length > 1 ? `${a[0]} +${a.length - 1} more` : a[0]) : "—");
const tone = (s: string): "good" | "warn" | "bad" | "mute" | "info" => (["Active", "Published", "Completed", "Open", "Submitted", "Assigned"].includes(s) ? (s === "Assigned" || s === "Submitted" ? "mute" : "good") : s === "Scheduled" ? "info" : ["Pending", "Late", "Reassessment"].includes(s) ? (s === "Reassessment" ? "mute" : "warn") : "mute");
const AddCta = ({ label, go }: { label: string; go: () => void }) => <div className="mb-4 flex justify-end"><button type="button" className="rounded-full bg-[#e5413a] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#c9322c]" onClick={go}>{label}</button></div>;

interface Opt { id: string; name: string }
function useRefs() {
  const secs = useLoad(() => schoolFetch<{ items: { id: string; label: string }[] }>("/school/section-rows"), []);
  const subs = useLoad(() => schoolFetch<{ items: Opt[] }>("/school/subject-rows"), []);
  const staff = useStaff();
  return { secs: secs.data?.items ?? [], subs: subs.data?.items ?? [], staff: staff.data?.items ?? [], error: secs.error || subs.error || staff.error };
}
type Refs = ReturnType<typeof useRefs>;
const Sel = ({ value, onChange, opts, none }: { value: string; onChange: (v: string) => void; opts: Opt[]; none?: string }) => <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>{none && <option value="">{none}</option>}{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>;
const secOpts = (r: Refs): Opt[] => r.secs.map((s) => ({ id: s.id, name: s.label }));
const Pick = ({ label, children }: { label: string; children: ReactNode }) => <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label></div>;
const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const Attach = ({ value, onChange, label = "Attachments (optional)" }: { value: string; onChange: (v: string) => void; label?: string }) => <div className="sm:col-span-2 lg:col-span-5"><Field label={label}><input className={inputCls} maxLength={400} placeholder="File names, separated by commas. Up to 5." value={value} onChange={(e) => onChange(e.target.value)} /></Field><p className="mt-1 text-[11px] text-slate-500">Only the file names are saved. File storage isn&apos;t connected yet.</p></div>;

// ═════════════ homework ═════════════
interface Hw { id: string; code: string; title: string; section_id: string; subject_id: string; given_by_id: string | null; class_label: string; subject: string; given_by: string; given_on: string; due_on: string; submitted: number | null; attachments: string[]; status: "Active" | "Closed" | "Draft" }
export type HwTab = "create-homework" | "homework-list" | "edit";
export function HomeworkPages({ tab }: { tab: HwTab }) {
  const r = useRefs();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Hw[] }>(`${L}/homework`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Hw | null>(null);
  const [pick, setPick] = useState("");
  const [saved, setSaved] = useState("");
  const blank = { section_id: "", subject_id: "", title: "", given_by: "", given_on: todayIso(), due_on: todayIso(), submitted_pct: "", attach: "", status: "Active" };
  const [f, setF] = useState<Record<string, string>>(blank);
  const all = data?.items ?? [];
  const cur = all.find((x) => x.id === (pick || all[0]?.id));
  const v = (k: string, d = "") => f[k] ?? d;
  const body = (g: { section_id: string; subject_id: string; title: string; given_by: string; given_on: string; due_on: string; pct: string; attach: string; status: string }) => ({ section_id: g.section_id, subject_id: g.subject_id, title: g.title, given_by: g.given_by || null, given_on: g.given_on, due_on: g.due_on, submitted_pct: g.pct === "" ? null : Number(g.pct), attachments: names(g.attach), status: g.status });
  const err = <ErrorBanner message={error || r.error || act.error} />;
  if (tab === "create-homework") {
    const sec = v("section_id") || r.secs[0]?.id || ""; const sub = v("subject_id") || r.subs[0]?.id || "";
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${L}/homework`, json("POST", body({ section_id: sec, subject_id: sub, title: v("title"), given_by: v("given_by"), given_on: v("given_on", todayIso()), due_on: v("due_on", todayIso()), pct: v("submitted_pct"), attach: v("attach"), status: "Active" }))))) { setSaved("Homework created. It is in Homework List."); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Create Homework" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Class"><Sel value={sec} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Subject"><Sel value={sub} onChange={(x) => setF({ ...f, subject_id: x })} opts={r.subs} /></Field>
          <Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={v("title")} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Given by"><Sel value={v("given_by")} onChange={(x) => setF({ ...f, given_by: x })} opts={r.staff} none="Me" /></Field>
          <Field label="Given on"><input type="date" className={inputCls} required value={v("given_on", todayIso())} onChange={(e) => setF({ ...f, given_on: e.target.value })} /></Field>
          <Field label="Due"><input type="date" className={inputCls} required min={v("given_on", todayIso())} value={v("due_on", todayIso())} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
          <Field label="Submitted (%)"><input type="number" min={0} max={100} className={inputCls} value={v("submitted_pct")} onChange={(e) => setF({ ...f, submitted_pct: e.target.value })} /></Field>
          <Attach value={v("attach")} onChange={(x) => setF({ ...f, attach: x })} />
        </FormCard>
      </div>
    );
  }
  if (tab === "edit") {
    const g = (k: keyof Hw, d = "") => f[k] ?? String(cur?.[k] ?? d);
    const submit = async (e: FormEvent) => { e.preventDefault(); if (!cur) return; setSaved(""); if (await act.run(() => schoolFetch(`${L}/homework/${cur.id}`, json("PUT", body({ section_id: g("section_id"), subject_id: g("subject_id"), title: g("title"), given_by: f.given_by ?? cur.given_by_id ?? "", given_on: g("given_on"), due_on: g("due_on"), pct: f.submitted_pct ?? (cur.submitted == null ? "" : String(cur.submitted)), attach: f.attach ?? cur.attachments.join(", "), status: g("status") }))))) { setF({}); setSaved("Saved"); } };
    return (
      <div>{err}{okBox(saved)}
        <Pick label="Choose"><select aria-label="Homework" value={cur?.id ?? ""} onChange={(e) => { setPick(e.target.value); setF({}); setSaved(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!all.length && <option value="">No homework</option>}{all.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.class_label}</option>)}</select></Pick>
        {cur && <FormCard title={`Edit ${cur.code}`} onSubmit={submit} onDiscard={() => { setF({}); setSaved(""); }} busy={act.busy} error="">
          <Field label="Ref."><input className={inputCls} disabled readOnly value={cur.code} /></Field>
          <Field label="Class"><Sel value={g("section_id")} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Subject"><Sel value={g("subject_id")} onChange={(x) => setF({ ...f, subject_id: x })} opts={r.subs} /></Field>
          <Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={g("title")} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Given by"><Sel value={f.given_by ?? cur.given_by_id ?? ""} onChange={(x) => setF({ ...f, given_by: x })} opts={r.staff} none="—" /></Field>
          <Field label="Given on"><input type="date" className={inputCls} required value={g("given_on")} onChange={(e) => setF({ ...f, given_on: e.target.value })} /></Field>
          <Field label="Due"><input type="date" className={inputCls} required value={g("due_on")} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
          <Field label="Submitted (%)"><input type="number" min={0} max={100} className={inputCls} value={f.submitted_pct ?? (cur.submitted == null ? "" : String(cur.submitted))} onChange={(e) => setF({ ...f, submitted_pct: e.target.value })} /></Field>
          <Attach value={f.attach ?? cur.attachments.join(", ")} onChange={(x) => setF({ ...f, attach: x })} />
          <Field label="Status"><select className={inputCls} value={g("status")} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Active</option><option>Closed</option><option>Draft</option></select></Field>
        </FormCard>}
      </div>
    );
  }
  const rows = all.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Homework", value: all.length, sub: "All records" }, { label: "Active", value: n("Active"), sub: `${pct(n("Active"), all.length)} of shown` }, { label: "Closed", value: n("Closed"), sub: `${pct(n("Closed"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }]} />
      <ListPanel title="Homework" noun="assignments" search={search} onSearch={setSearch} exportName="homework" head={["Class", "Subject", "Title", "Given by", "Given on", "Due", "Submitted", "Attachments", "Status"]} exportRows={rows.map((x) => [x.class_label, x.subject, x.title, x.given_by, day(x.given_on), day(x.due_on), x.submitted != null ? `${x.submitted}%` : "", x.attachments.join("; "), x.status])}
        tableHead={["Subject", "Title", "Given by", "Given on", "Due", "Submitted", "Attachments", "Status", ""]} empty={loading ? "Loading…" : "No homework yet."}
        rows={rows.map((x) => [x.subject, x.title, x.given_by || "—", day(x.given_on), day(x.due_on), x.submitted != null ? `${x.submitted}%` : "—", fileText(x.attachments), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.title}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Given by" v={view.given_by || "—"} /><Row k="Given on" v={day(view.given_on)} /><Row k="Due" v={day(view.due_on)} /><Row k="Submitted" v={view.submitted != null ? `${view.submitted}%` : "—"} /><Row k="Attachments" v={view.attachments.join(", ") || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ assignments ═════════════
interface As { id: string; code: string; title: string; class_label: string; subject: string; assigned_by: string; due_on: string; max_marks: number; status: "Assigned" | "Draft" | "Closed" }
export type AsTab = "create-assignment" | "assign-to-class" | "due-dates";
export function AssignmentPages({ tab }: { tab: AsTab }) {
  const r = useRefs();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: As[] }>(`${L}/assignments`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<As | null>(null);
  const [saved, setSaved] = useState("");
  const blank = { title: "", section_id: "", subject_id: "", assigned_by: "", due_on: todayIso(), max_marks: "20" };
  const [f, setF] = useState(blank);
  const all = data?.items ?? [];
  const err = <ErrorBanner message={error || r.error || act.error} />;
  if (tab === "create-assignment") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${L}/assignments`, json("POST", { title: f.title, section_id: f.section_id || r.secs[0]?.id, subject_id: f.subject_id || r.subs[0]?.id, assigned_by: f.assigned_by || null, due_on: f.due_on, max_marks: Number(f.max_marks) })))) { setSaved("Assignment created. It is in Assign to Class."); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Create Assignment" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Class"><Sel value={f.section_id || r.secs[0]?.id || ""} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Subject"><Sel value={f.subject_id || r.subs[0]?.id || ""} onChange={(x) => setF({ ...f, subject_id: x })} opts={r.subs} /></Field>
          <Field label="Assigned by"><Sel value={f.assigned_by} onChange={(x) => setF({ ...f, assigned_by: x })} opts={r.staff} none="Me" /></Field>
          <Field label="Due"><input type="date" className={inputCls} required value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
          <Field label="Max marks"><select className={inputCls} value={f.max_marks} onChange={(e) => setF({ ...f, max_marks: e.target.value })}>{[5, 10, 20, 25, 30, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></Field>
        </FormCard>
      </div>
    );
  }
  const list = tab === "due-dates" ? [...all].sort((a, b) => a.due_on.localeCompare(b.due_on)) : all;
  const rows = list.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  const set = async (x: As, status: string) => { if (await act.run(() => schoolFetch(`${L}/assignments/${x.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Assignments", value: all.length, sub: "All records" }, { label: "Assigned", value: n("Assigned"), sub: `${pct(n("Assigned"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }, { label: "Closed", value: n("Closed"), sub: `${pct(n("Closed"), all.length)} of shown` }]} />
      <ListPanel title="Assignments" noun="assignments" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Title", "Class", "Subject", "Assigned by", "Due", "Max marks", "Status"]} exportRows={rows.map((x) => [x.code, x.title, x.class_label, x.subject, x.assigned_by, day(x.due_on), x.max_marks, x.status])}
        tableHead={["Ref.", "Title", "Class", "Subject", "Assigned by", "Due", "Max marks", "Status", ""]} empty={loading ? "Loading…" : "No assignments yet."}
        rows={rows.map((x) => [x.code, x.title, x.class_label, x.subject, x.assigned_by || "—", day(x.due_on), <span key="m" className="block text-right">{x.max_marks}</span>, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.title}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Assigned by" v={view.assigned_by || "—"} /><Row k="Due" v={day(view.due_on)} /><Row k="Max marks" v={view.max_marks} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{view.status === "Draft" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Assigned")}>Assign</button>}{view.status === "Assigned" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Closed")}>Close</button>}</>} /></>}</Modal>
    </div>
  );
}

// ═════════════ study materials ═════════════
interface Mat { id: string; title: string; kind: string; class_label: string; subject: string; files: string[]; uploaded_by: string; uploaded_on: string; views: number; status: "Draft" | "Published" }
export type MatTab = "upload-notes" | "pdfs" | "videos" | "links";
const KIND: Record<MatTab, string> = { "upload-notes": "Notes", pdfs: "PDFs", videos: "Videos", links: "Links" };
export function MaterialPages({ tab }: { tab: MatTab }) {
  const goTab = useGoTab();
  const go = () => goTab("upload-notes");
  const r = useRefs();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Mat[] }>(`${L}/materials`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Mat | null>(null);
  const [saved, setSaved] = useState("");
  const blank = { title: "", kind: "Notes", section_id: "", subject_id: "", attach: "", uploaded_by: "", uploaded_on: todayIso() };
  const [f, setF] = useState(blank);
  const err = <ErrorBanner message={error || r.error || act.error} />;
  if (tab === "upload-notes") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${L}/materials`, json("POST", { title: f.title, kind: f.kind, section_id: f.section_id || r.secs[0]?.id, subject_id: f.subject_id || r.subs[0]?.id, files: names(f.attach), uploaded_by: f.uploaded_by || null, uploaded_on: f.uploaded_on })))) { setSaved(`Saved. It is in ${f.kind === "Notes" ? "PDFs" : f.kind}.`); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Upload Notes" cols="lg:grid-cols-4" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["Notes", "PDFs", "Videos", "Links"].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Class"><Sel value={f.section_id || r.secs[0]?.id || ""} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Subject"><Sel value={f.subject_id || r.subs[0]?.id || ""} onChange={(x) => setF({ ...f, subject_id: x })} opts={r.subs} /></Field>
          <div className="sm:col-span-2 lg:col-span-4"><Attach label="Files" value={f.attach} onChange={(x) => setF({ ...f, attach: x })} /></div>
          <Field label="Uploaded by"><Sel value={f.uploaded_by} onChange={(x) => setF({ ...f, uploaded_by: x })} opts={r.staff} none="Me" /></Field>
          <Field label="Uploaded"><input type="date" className={inputCls} required value={f.uploaded_on} onChange={(e) => setF({ ...f, uploaded_on: e.target.value })} /></Field>
        </FormCard>
      </div>
    );
  }
  const all = (data?.items ?? []).filter((x) => x.kind === KIND[tab]);
  const rows = all.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  const set = async (x: Mat, status: string) => { if (await act.run(() => schoolFetch(`${L}/materials/${x.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>{err}<AddCta label="+ Upload Notes" go={go} />
      <Tiles items={[{ label: "Study materials", value: all.length, sub: "All records" }, { label: "Published", value: n("Published"), sub: `${pct(n("Published"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }]} />
      <ListPanel title="Study materials" noun="materials" search={search} onSearch={setSearch} exportName={tab} head={["Title", "Type", "Class", "Subject", "Files", "Uploaded by", "Uploaded", "Views", "Status"]} exportRows={rows.map((x) => [x.title, x.kind, x.class_label, x.subject, x.files.join("; "), x.uploaded_by, day(x.uploaded_on), x.views, x.status])}
        tableHead={["Title", "Type", "Class", "Subject", "Files", "Uploaded by", "Uploaded", "Views", "Status", ""]} empty={loading ? "Loading…" : "Nothing here yet."}
        rows={rows.map((x) => [x.title, x.kind, x.class_label, x.subject, fileText(x.files), x.uploaded_by || "—", day(x.uploaded_on), <span key="w" className="block text-right">{x.views}</span>, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Type" v={view.kind} /><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Files" v={view.files.join(", ") || "—"} /><Row k="Uploaded by" v={view.uploaded_by || "—"} /><Row k="Uploaded" v={day(view.uploaded_on)} /><Row k="Views" v={view.views} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<button type="button" className={view.status === "Draft" ? primaryCls : small} disabled={act.busy} onClick={() => void set(view, view.status === "Draft" ? "Published" : "Draft")}>{view.status === "Draft" ? "Publish" : "Unpublish"}</button>} /></>}</Modal>
    </div>
  );
}

// ═════════════ online classes ═════════════
interface Ses { id: string; name: string; class_label: string; teacher: string; date: string; time: string; link: string; attended: number | null; status: "Scheduled" | "Completed" | "Cancelled" }
export type SesTab = "create-session" | "schedule" | "meeting-links";
export function OnlineClassPages({ tab }: { tab: SesTab }) {
  const goTab = useGoTab();
  const go = () => goTab("create-session");
  const r = useRefs();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Ses[] }>(`${L}/sessions`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ses | null>(null);
  const [att, setAtt] = useState("");
  const [saved, setSaved] = useState("");
  const blank = { name: "", section_id: "", teacher_id: "", session_date: todayIso(), session_time: "09:00", link: "" };
  const [f, setF] = useState(blank);
  const err = <ErrorBanner message={error || r.error || act.error} />;
  if (tab === "create-session") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${L}/sessions`, json("POST", { name: f.name, section_id: f.section_id || r.secs[0]?.id, teacher_id: f.teacher_id || null, session_date: f.session_date, session_time: f.session_time, link: f.link })))) { setSaved("Session created. It is in Meeting Links."); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Create Session" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Session"><input className={inputCls} required minLength={2} maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Class"><Sel value={f.section_id || r.secs[0]?.id || ""} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Teacher"><Sel value={f.teacher_id} onChange={(x) => setF({ ...f, teacher_id: x })} opts={r.staff} none="—" /></Field>
          <Field label="Date"><input type="date" className={inputCls} required value={f.session_date} onChange={(e) => setF({ ...f, session_date: e.target.value })} /></Field>
          <Field label="Time"><input type="time" className={inputCls} required value={f.session_time} onChange={(e) => setF({ ...f, session_time: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Link"><input className={inputCls} maxLength={300} placeholder="meet.myclassassist.in/…" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field></div>
        </FormCard>
      </div>
    );
  }
  const all = data?.items ?? [];
  const list = tab === "schedule" ? all.filter((x) => x.status === "Scheduled") : all;
  const rows = list.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  const set = async (x: Ses, status: string) => { if (await act.run(() => schoolFetch(`${L}/sessions/${x.id}`, json("PATCH", { status, ...(status === "Completed" && att !== "" ? { attended: Number(att) } : {}) })))) { setView(null); setAtt(""); } };
  const tiles = tab === "schedule" ? [{ label: "Online classes", value: list.length, sub: "All records" }, { label: "Scheduled", value: list.length, sub: "100% of shown" }] : [{ label: "Online classes", value: all.length, sub: "All records" }, { label: "Scheduled", value: n("Scheduled"), sub: `${pct(n("Scheduled"), all.length)} of shown` }, { label: "Completed", value: n("Completed"), sub: `${pct(n("Completed"), all.length)} of shown` }, { label: "Cancelled", value: n("Cancelled"), sub: `${pct(n("Cancelled"), all.length)} of shown` }];
  return (
    <div className="space-y-5" data-report>{err}<AddCta label="+ Create Session" go={go} />
      <Tiles items={tiles} />
      <ListPanel title="Online classes" noun="sessions" search={search} onSearch={setSearch} exportName={tab} head={["Session", "Class", "Teacher", "Date", "Time", "Link", "Attended", "Status"]} exportRows={rows.map((x) => [x.name, x.class_label, x.teacher, day(x.date), x.time, x.link, x.attended != null ? `${x.attended}%` : "", x.status])}
        tableHead={["Session", "Class", "Teacher", "Date", "Time", "Link", "Attended", "Status", ""]} empty={loading ? "Loading…" : "No sessions yet."}
        rows={rows.map((x) => [x.name, x.class_label, x.teacher || "—", day(x.date), x.time, x.link || "—", x.attended != null ? `${x.attended}%` : "—", <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(x); setAtt(""); }}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Teacher" v={view.teacher || "—"} /><Row k="Date" v={`${day(view.date)} · ${view.time}`} /><Row k="Link" v={view.link || "—"} /><Row k="Attended" v={view.attended != null ? `${view.attended}%` : "—"} /><Row k="Status" v={view.status} /></dl>
        {view.status === "Scheduled" && <div className="mt-3 w-40"><Field label="Attended (%)"><input type="number" min={0} max={100} className={inputCls} value={att} onChange={(e) => setAtt(e.target.value)} /></Field></div>}
        <Foot close={() => setView(null)} left={view.status === "Scheduled" ? <><button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Cancelled")}>Cancel session</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Completed")}>Mark completed</button></> : undefined} /></>}</Modal>
    </div>
  );
}

// ═════════════ online tests ═════════════
interface Tst { id: string; name: string; class_label: string; subject: string; questions: number; minutes: number; attempted: number | null; average: number | null; status: "Draft" | "Open" | "Closed" }
export type TestTab = "create-test" | "question-bank" | "test-results";
export function OnlineTestPages({ tab }: { tab: TestTab }) {
  const goTab = useGoTab();
  const go = () => goTab("create-test");
  const r = useRefs();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Tst[] }>(`${L}/tests`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Tst | null>(null);
  const [saved, setSaved] = useState("");
  const blank = { name: "", section_id: "", subject_id: "", questions: "", minutes: "20", attempted: "", average: "" };
  const [f, setF] = useState(blank);
  const err = <ErrorBanner message={error || r.error || act.error} />;
  if (tab === "question-bank") return <div><AddCta label="+ Create Test" go={go} /><QuestionPages tab="question-bank" /></div>;
  if (tab === "create-test") {
    const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${L}/tests`, json("POST", { name: f.name, section_id: f.section_id || r.secs[0]?.id, subject_id: f.subject_id || r.subs[0]?.id, questions: Number(f.questions), minutes: Number(f.minutes), attempted: f.attempted === "" ? null : Number(f.attempted), average: f.average === "" ? null : Number(f.average) })))) { setSaved("Test created."); setF(blank); } };
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Create Test" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Test"><input className={inputCls} required minLength={2} maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Class"><Sel value={f.section_id || r.secs[0]?.id || ""} onChange={(x) => setF({ ...f, section_id: x })} opts={secOpts(r)} /></Field>
          <Field label="Subject"><Sel value={f.subject_id || r.subs[0]?.id || ""} onChange={(x) => setF({ ...f, subject_id: x })} opts={r.subs} /></Field>
          <Field label="Questions"><input type="number" min={1} max={300} required className={inputCls} value={f.questions} onChange={(e) => setF({ ...f, questions: e.target.value })} /></Field>
          <Field label="Duration"><select className={inputCls} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })}>{[10, 15, 20, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} min</option>)}</select></Field>
          <Field label="Attempted (%)"><input type="number" min={0} max={100} className={inputCls} value={f.attempted} onChange={(e) => setF({ ...f, attempted: e.target.value })} /></Field>
          <Field label="Average (%)"><input type="number" min={0} max={100} className={inputCls} value={f.average} onChange={(e) => setF({ ...f, average: e.target.value })} /></Field>
        </FormCard>
      </div>
    );
  }
  const all = (data?.items ?? []).filter((x) => x.status === "Closed");
  const rows = all.filter((x) => has(x, search));
  const set = async (x: Tst, status: string) => { if (await act.run(() => schoolFetch(`${L}/tests/${x.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>{err}<AddCta label="+ Create Test" go={go} />
      <Tiles items={[{ label: "Online tests", value: all.length, sub: "All records" }, { label: "Closed", value: all.length, sub: all.length ? "100% of shown" : "0% of shown" }]} />
      <ListPanel title="Online tests" noun="tests" search={search} onSearch={setSearch} exportName="test-results" head={["Test", "Class", "Subject", "Questions", "Duration", "Attempted", "Average", "Status"]} exportRows={rows.map((x) => [x.name, x.class_label, x.subject, x.questions, `${x.minutes} min`, x.attempted != null ? `${x.attempted}%` : "", x.average != null ? `${x.average}%` : "", x.status])}
        tableHead={["Test", "Class", "Subject", "Questions", "Duration", "Attempted", "Average", "Status", ""]} empty={loading ? "Loading…" : "No closed tests yet. Close a test from its details to see its results."}
        rows={rows.map((x) => [x.name, x.class_label, x.subject, <span key="q" className="block text-right">{x.questions}</span>, `${x.minutes} min`, x.attempted != null ? `${x.attempted}%` : "—", x.average != null ? `${x.average}%` : "—", <Chip key="s" tone="mute">{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Questions" v={view.questions} /><Row k="Duration" v={`${view.minutes} min`} /><Row k="Attempted" v={view.attempted != null ? `${view.attempted}%` : "—"} /><Row k="Average" v={view.average != null ? `${view.average}%` : "—"} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Open")}>Reopen</button>} /></>}</Modal>
      <OpenTests all={data?.items ?? []} busy={act.busy} set={set} />
    </div>
  );
}
function OpenTests({ all, busy, set }: { all: Tst[]; busy: boolean; set: (x: Tst, s: string) => Promise<void> }) {
  const open = all.filter((x) => x.status !== "Closed");
  if (!open.length) return null;
  return (
    <ListPanel title="Draft and open tests" noun="tests" search="" onSearch={() => undefined} hideSearch exportName="open-tests" head={["Test", "Class", "Subject", "Status"]} exportRows={open.map((x) => [x.name, x.class_label, x.subject, x.status])}
      tableHead={["Test", "Class", "Subject", "Questions", "Status", ""]} empty="" rows={open.map((x) => [x.name, x.class_label, x.subject, x.questions, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <span key="a" className="flex gap-1.5">{x.status === "Draft" && <button type="button" className={primaryCls} disabled={busy} onClick={() => void set(x, "Open")}>Open</button>}{x.status === "Open" && <button type="button" className={small} disabled={busy} onClick={() => void set(x, "Closed")}>Close</button>}</span>])} />
  );
}

// ═════════════ submissions and evaluation ═════════════
interface Sub { id: string; homework_id: string; student: string; class_label: string; homework: string; submitted_on: string; marks: number | null; feedback: string; status: "Submitted" | "Pending" | "Late" | "Reassessment" }
export type SubTab = "submitted" | "pending" | "late-submissions" | "marks" | "feedback" | "reassessment";
const SUB_STATUS: Record<string, string> = { submitted: "Submitted", pending: "Pending", "late-submissions": "Late", reassessment: "Reassessment" };
export function SubmissionPages({ tab }: { tab: SubTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Sub[]; students: { id: string; name: string; class_label: string }[] }>(`${L}/submissions`), []);
  const hw = useLoad(() => schoolFetch<{ items: { id: string; code: string; title: string; class_label: string }[] }>(`${L}/homework`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Sub | null>(null);
  const [m, setM] = useState({ marks: "", feedback: "" });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ homework_id: "", student_id: "", submitted_on: todayIso() });
  const all = data?.items ?? [];
  const want = SUB_STATUS[tab];
  const list = want ? all.filter((x) => x.status === want) : all;
  const rows = list.filter((x) => has(x, search));
  const n = (s: string) => all.filter((x) => x.status === s).length;
  const kids = data?.students ?? [];
  const evalTab = tab === "marks" || tab === "feedback" || tab === "reassessment";
  const save = async (status?: string) => { if (!view) return; if (await act.run(() => schoolFetch(`${L}/submissions/${view.id}`, json("PATCH", { ...(m.marks !== "" ? { marks: Number(m.marks) } : {}), feedback: m.feedback, ...(status ? { status } : {}) })))) setView(null); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${L}/submissions`, json("POST", { homework_id: f.homework_id || hw.data?.items[0]?.id, student_id: f.student_id || kids[0]?.id, submitted_on: f.submitted_on })))) setAdding(false); };
  const tiles = evalTab && tab === "marks" ? [{ label: "Submissions", value: all.length, sub: "All records" }, { label: "Submitted", value: n("Submitted"), sub: `${pct(n("Submitted"), all.length)} of shown` }, { label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }, { label: "Late", value: n("Late"), sub: `${pct(n("Late"), all.length)} of shown` }]
    : [{ label: "Submissions", value: all.length, sub: "All records" }, ...(want ? [{ label: want === "Late" ? "Late" : want, value: list.length, sub: `${pct(list.length, all.length)} of shown` }] : [{ label: "With feedback", value: all.filter((x) => x.feedback).length, sub: `${pct(all.filter((x) => x.feedback).length, all.length)} of shown` }])];
  const shown = tab === "feedback" ? rows.filter((x) => x.feedback || true) : rows;
  return (
    <div className="space-y-5" data-report><ErrorBanner message={error || hw.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Submissions" noun="submissions" search={search} onSearch={setSearch} exportName={tab} head={["Student", "Class", "Homework", "Submitted on", "Marks", "Feedback", "Status"]} exportRows={shown.map((x) => [x.student, x.class_label, x.homework, day(x.submitted_on), x.marks, x.feedback, x.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Record submission</button>} tableHead={["Student", "Class", "Homework", "Submitted on", "Marks", "Feedback", "Status", ""]} empty={loading ? "Loading…" : "No submissions here."}
        rows={shown.map((x) => [<b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.homework, day(x.submitted_on), <span key="m" className="block text-right">{x.marks ?? "—"}</span>, x.feedback || "—", <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(x); setM({ marks: x.marks == null ? "" : String(x.marks), feedback: x.feedback }); }}>{evalTab ? "Evaluate" : "View details"}</button>])} />
      <Modal open={!!view} title={view?.student ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Homework" v={view.homework} /><Row k="Submitted on" v={day(view.submitted_on)} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-3 grid grid-cols-[7rem_1fr] gap-3"><Field label="Marks"><input type="number" min={0} max={100} step="0.5" className={inputCls} value={m.marks} onChange={(e) => setM({ ...m, marks: e.target.value })} /></Field><Field label="Feedback"><input className={inputCls} maxLength={500} value={m.feedback} onChange={(e) => setM({ ...m, feedback: e.target.value })} /></Field></div>
        <Foot close={() => setView(null)} left={<><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void save()}>Save marks and feedback</button>{view.status !== "Reassessment" && <button type="button" className={small} disabled={act.busy} onClick={() => void save("Reassessment")}>Send for reassessment</button>}</>} /></>}</Modal>
      <Modal open={adding} title="Record a submission" onClose={() => setAdding(false)}><form onSubmit={submit} className="space-y-3">
        <Field label="Homework"><select className={inputCls} value={f.homework_id || hw.data?.items[0]?.id || ""} onChange={(e) => setF({ ...f, homework_id: e.target.value })}>{hw.data?.items.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.title} · {x.class_label}</option>)}</select></Field>
        <Field label="Student"><select className={inputCls} value={f.student_id || kids[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
        <Field label="Submitted on"><input type="date" className={inputCls} required value={f.submitted_on} onChange={(e) => setF({ ...f, submitted_on: e.target.value })} /></Field><p className="text-xs text-slate-500">Marked Late if after the due date. The student must be in the homework&apos;s class.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ syllabus tracking and reports ═════════════
export function SyllabusPages({ tab }: { tab: "chapter-completion" | "subject-progress" }) {
  return tab === "chapter-completion" ? <CurriculumPages tab="syllabus" /> : <AcademicReportPages tab="subject-reports" />;
}
export function LmsReportPages({ tab }: { tab: "assignment-completion" | "student-performance" }) {
  const { data } = useLoad(() => (tab === "assignment-completion" ? schoolFetch<{ items: Hw[] }>(`${L}/homework`) : Promise.resolve(null)), [tab]);
  if (tab === "student-performance") return <SubmissionPages tab="marks" />;
  const count = new Map<string, number>();
  for (const h of data?.items ?? []) count.set(h.title, (count.get(h.title) ?? 0) + 1);
  const rows = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <div className="space-y-5">
      {rows.length > 0 && <Panel title="Title" sub="Count by title"><BarRows rows={rows} /></Panel>}
      <HomeworkPages tab="homework-list" />
    </div>
  );
}
