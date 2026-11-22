"use client";

import { useMemo, useState } from "react";
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

const L = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium text-slate-900">{v}</dd></div>)}</dl>;
const share = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}% of shown` : "");

interface Plan { id: string; section_id: string; topic: string; week_of: string; week_label: string; periods: number; status: string; objectives: string; activities: string; remarks: string; submitted_on: string | null; class_label: string }
interface Plans { items: Plan[]; sections: { id: string; label: string; subject: string; current_chapter: string }[]; weeks: { value: string; label: string }[] }
const tone = (s: string) => (s === "Approved" ? "good" : s === "Returned" ? "bad" : s === "Submitted" ? "info" : "mute") as "good" | "bad" | "info" | "mute";

export function LessonPlans() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Plans>("/teacher/lesson-plans"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Plan | null>(null);
  const [f, setF] = useState({ section_id: "", week_of: "", topic: null as string | null, periods: "5", objectives: "", activities: "" });
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const topic = f.topic ?? sec?.current_chapter ?? "";
  const items = useMemo(() => (data?.items ?? []).filter((p) => !q || `${p.class_label} ${p.topic} ${p.status} ${p.remarks}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const n = data?.items.length ?? 0;
  const c = (s: string) => (data?.items ?? []).filter((p) => p.status === s).length;
  const blank = { section_id: f.section_id, week_of: f.week_of, topic: null, periods: "5", objectives: "", activities: "" };
  const submitNew = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/teacher/lesson-plans", json("POST", { section_id: sec?.id, week_of: f.week_of || data?.weeks[2]?.value || data?.weeks[0]?.value, topic, periods: Number(f.periods), objectives: f.objectives, activities: f.activities })))) setF(blank); };
  return (
    <div data-report>
      <Head title="Lesson Plans" subtitle="Weekly lesson plans. The principal approves them before the week starts." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Lesson plans", value: n, sub: "This year" }, { label: "Approved", value: c("Approved"), sub: share(c("Approved"), n) }, { label: "Draft", value: c("Draft"), sub: share(c("Draft"), n) }, { label: "Returned", value: c("Returned"), sub: share(c("Returned"), n) }]} />
          <Panel title="Lesson plans" sub={`${n} plans`} right={<ExportPrint name="my-lesson-plans" head={["Week", "Class", "Chapter / topic", "Periods", "Submitted", "Status", "Remarks"]} rows={items.map((p) => [p.week_label, p.class_label, p.topic, p.periods, p.submitted_on, p.status, p.remarks])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search lesson plans" /></div>
            <SimpleTable head={[{ h: "Week" }, { h: "Class" }, { h: "Chapter / topic" }, { h: "Periods", right: true }, { h: "Submitted" }, { h: "Status" }, { h: "Remarks" }, { h: "" }]} empty="You have not written a lesson plan yet." rows={items.map((p) => [p.week_label, p.class_label, p.topic, p.periods, p.submitted_on ? day(p.submitted_on) : "—", <Chip key="s" tone={tone(p.status)}>{p.status}</Chip>, <span key="r" className="whitespace-normal">{p.remarks || "—"}</span>,
              <span key="a" className="flex gap-1.5">{(p.status === "Draft" || p.status === "Returned") && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/lesson-plans/${p.id}/submit`, json("POST", {})))}>{p.status === "Draft" ? "Submit" : "Resubmit"}</button>}<button type="button" className={smallBtn} onClick={() => setView(p)}>View details</button></span>])} />
          </Panel>
          <form onSubmit={submitNew} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New lesson plan</h2></div>
            {!data.sections.length ? <Empty text="You have no classes with a subject yet, so there is nothing to plan." /> : (
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value, topic: null })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
                  <L label="Week"><select className={inputCls} value={f.week_of || data.weeks[2]?.value || data.weeks[0]?.value} onChange={(e) => setF({ ...f, week_of: e.target.value })}>{data.weeks.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</select></L>
                  <L label="Chapter / topic"><input className={inputCls} required minLength={3} maxLength={200} value={topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></L>
                  <L label="Periods"><input type="number" className={inputCls} required min={1} max={60} value={f.periods} onChange={(e) => setF({ ...f, periods: e.target.value })} /></L>
                </div>
                <L label="Learning objectives"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={2000} placeholder="What students will be able to do by the end" value={f.objectives} onChange={(e) => setF({ ...f, objectives: e.target.value })} /></L>
                <L label="Activities and resources"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={2000} placeholder="Worksheets, lab activities, videos" value={f.activities} onChange={(e) => setF({ ...f, activities: e.target.value })} /></L>
              </div>
            )}
            <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setF(blank)}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Save as draft</button></div>
          </form>
        </div>
      )}
      {view && <Modal open title={`${view.class_label} · ${view.week_label}`} onClose={() => setView(null)}><KV rows={[["Chapter / topic", view.topic], ["Periods", view.periods], ["Learning objectives", view.objectives || "—"], ["Activities", view.activities || "—"], ["Submitted", view.submitted_on ? day(view.submitted_on) : "—"], ["Status", <Chip key="s" tone={tone(view.status)}>{view.status}</Chip>], ["Remarks", view.remarks || "—"]]} /></Modal>}
    </div>
  );
}

interface Chapters { label: string; subject: string; students: number; is_class_teacher: boolean; percent: number | null; done: number; total_chapters: number; current: string; items: { id: string; no: number; chapter: string; planned: number; taken: number; progress: number; status: string }[] }
const cTone = (s: string) => (s === "Done" ? "good" : s === "In progress" ? "info" : "mute") as "good" | "info" | "mute";

export function ChapterProgress() {
  const secs = useLoad(() => schoolFetch<Plans>("/teacher/lesson-plans"), []);
  const [sec, pick] = usePickedSection(secs.data?.sections ?? [], null);
  const { data, error, loading, reload } = useLoad(() => (sec ? schoolFetch<Chapters>(`/teacher/chapters/${sec}`) : Promise.resolve(null)), [sec]);
  const act = useAction(reload);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const save = (id: string, raw: string) => { const v = Math.max(0, Math.min(100, Math.round(Number(raw)))); setEdit((e) => { const n = { ...e }; delete n[id]; return n; }); if (Number.isFinite(v)) void act.run(() => schoolFetch("/teacher/syllabus/progress", json("POST", { section_id: sec, chapter_id: id, progress: v }))); };
  return (
    <div data-report>
      <Head title="Chapter Progress" subtitle={`Update how far each chapter has got in ${data?.label ?? "your class"}. The principal sees this as syllabus progress.`} />
      <ErrorBanner message={secs.error || error || act.error} />
      <Loading on={(secs.loading && !secs.data) || (loading && !data)} />
      {secs.data && !secs.data.sections.length && <Panel title="Chapter progress"><Empty text="You have no classes with a subject yet." /></Panel>}
      {secs.data && secs.data.sections.length > 0 && (
        <div className="space-y-5">
          <PillSelect label="Section" value={sec} onChange={pick} options={secs.data.sections.map((s) => ({ value: s.id, label: s.label }))} right={data ? `${data.label} · ${data.students} students${data.is_class_teacher ? " · you're the class teacher" : ""}` : ""} />
          {data && (
            <>
              <Tiles items={[{ label: "Syllabus done", value: data.percent === null ? "—" : `${data.percent}%` }, { label: "Chapters done", value: `${data.done} of ${data.total_chapters}` }, { label: "Current chapter", value: <span className="text-[22px] leading-tight">{data.current || "—"}</span> }]} />
              <Panel title={`${data.label} ${data.subject}`} sub="Set each chapter's progress" right={<ExportPrint name="chapter-progress" head={["No.", "Chapter", "Periods planned", "Periods taken", "Progress", "Status"]} rows={data.items.map((c) => [c.no, c.chapter, c.planned, c.taken, c.progress, c.status])} />}>
                <SimpleTable head={[{ h: "No." }, { h: "Chapter" }, { h: "Periods planned" }, { h: "Periods taken" }, { h: "Progress (%)" }, { h: "Status" }]} empty="No chapters are set up for this class yet. The School Admin adds them in Academics." rows={data.items.map((c) => [c.no, <b key="c" className="font-semibold text-slate-900">{c.chapter}</b>, c.planned, c.taken,
                  <input key="p" type="number" min={0} max={100} aria-label={`${c.chapter} progress`} disabled={act.busy} value={edit[c.id] ?? String(c.progress)} onChange={(e) => setEdit({ ...edit, [c.id]: e.target.value })} onBlur={(e) => { if (edit[c.id] !== undefined && edit[c.id] !== String(c.progress)) save(c.id, e.target.value); else setEdit((x) => { const n = { ...x }; delete n[c.id]; return n; }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-[13px]" />,
                  <Chip key="s" tone={cTone(c.status)}>{c.status}</Chip>])} />
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
