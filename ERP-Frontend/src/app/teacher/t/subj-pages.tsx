"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { Head } from "./head";
import { Loading } from "./dash-pages";
import { PillSelect, SearchBox, Bars, blueBtn, smallBtn } from "./ui";

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const pctText = (v: number | null) => (v === null ? "—" : `${v}%`);

interface SubjectRow { section_id: string; section: string; subject: string; periods: number; chapters_done: number; chapters_total: number; percent: number | null; current_chapter: string }
interface Subjects { items: SubjectRow[]; sections: number; classes: string[] }
const classWord = (c: string[]) => (c.length ? `Classes ${c.length > 1 ? `${c.slice(0, -1).join(", ")} and ${c[c.length - 1]}` : c[0]}`.replace("Classes", c.length > 1 ? "Classes" : "Class") : "");

type Chapter = { id: string; class: string; no: number; chapter: string; planned_for: string; objective: string; status: string; sections: { section_id: string; label: string; status: string }[] };
const STATUSES = ["Not started", "In progress", "Done"] as const;

/** Update one section's progress through the chapters of a subject. */
function ProgressDialog({ section, onClose, onChanged }: { section: { id: string; label: string }; onClose: () => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Chapter[] }>("/teacher/syllabus"), []);
  const act = useAction(() => { reload(); onChanged(); });
  const rows = (data?.items ?? []).filter((c) => c.sections.some((s) => s.section_id === section.id));
  return (
    <Modal open title={`Update progress · ${section.label}`} onClose={onClose}>
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !rows.length && <p className="py-4 text-center text-sm text-slate-400">No chapters are set up for this class yet.</p>}
      <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">{rows.map((c) => { const st = c.sections.find((s) => s.section_id === section.id)!.status; return (
        <li key={c.id} className="flex items-center gap-3 py-2.5"><span className="w-6 text-[12px] text-slate-500">{c.no}</span><span className="flex-1 text-[13px] text-slate-900">{c.chapter}</span>
          <select aria-label={`${c.chapter} status`} disabled={act.busy} value={st} onChange={(e) => void act.run(() => schoolFetch("/teacher/syllabus/progress", json("POST", { section_id: section.id, chapter_id: c.id, status: e.target.value })))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px]">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></li>); })}</ul>
    </Modal>
  );
}

export function SubjectList({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Subjects>("/teacher/subjects"), []);
  const [sec, setSec] = useState("");
  const [q, setQ] = useState("");
  const [upd, setUpd] = useState<{ id: string; label: string } | null>(null);
  const subject = data?.items[0]?.subject ?? "";
  const items = useMemo(() => (data?.items ?? []).filter((r) => (!sec || r.section_id === sec) && (!q || `${r.subject} ${r.section} ${r.current_chapter}`.toLowerCase().includes(q.toLowerCase()))), [data, sec, q]);
  const tiles = data?.items.reduce((acc, r) => (acc.some((x) => x.section_id === r.section_id) ? acc : [...acc, r]), [] as SubjectRow[]) ?? [];
  const load = data?.items.reduce((acc, r) => (acc.some((x) => x.section_id === r.section_id) ? acc.map((x) => (x.section_id === r.section_id ? { ...x, periods: x.periods + r.periods } : x)) : [...acc, { ...r }]), [] as SubjectRow[]) ?? [];
  return (
    <div data-report>
      <Head title="Subject List" subtitle={subject ? `${subject} in each of your sections. Pick a class to see one section.` : "The subjects you teach in each of your sections."} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Class" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...tiles.map((s) => ({ value: s.section_id, label: s.section }))]} right={`${tiles.length} sections${data.classes.length ? ` · ${classWord(data.classes)}` : ""}`} />
          <Tiles items={tiles.map((s) => ({ label: s.section, value: pctText(s.percent), sub: `${s.chapters_done} of ${s.chapters_total} chapters done` }))} />
          <Panel title="Teaching load" sub="Periods a week"><Bars max={Math.max(1, ...load.map((l) => l.periods))} rows={load.map((l) => ({ label: l.section, value: l.periods, note: `${l.periods} periods` }))} /></Panel>
          <Panel title="Subject list" sub={`${tiles.length} sections`} right={<ExportPrint name="my-subjects" head={["Subject", "Section", "Periods a week", "Chapters done", "Syllabus", "Current chapter"]} rows={items.map((r) => [r.subject, r.section, r.periods, `${r.chapters_done} of ${r.chapters_total}`, r.percent, r.current_chapter])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search subject list" /></div>
            <SimpleTable head={[{ h: "Subject" }, { h: "Section" }, { h: "Periods a week" }, { h: "Chapters done" }, { h: "Syllabus" }, { h: "Current chapter" }, { h: "" }]} empty="No subjects are allocated to you yet." rows={items.map((r) => [<b key="s" className="font-semibold text-slate-900">{r.subject}</b>, r.section, r.periods, `${r.chapters_done} of ${r.chapters_total}`, pctText(r.percent), r.current_chapter || "—", <span key="a" className="flex gap-1.5"><button type="button" className={smallBtn} onClick={() => go("syllabus")}>Syllabus</button><button type="button" className={blueBtn} onClick={() => setUpd({ id: r.section_id, label: r.section })}>Update progress</button></span>])} />
          </Panel>
        </div>
      )}
      {upd && <ProgressDialog section={upd} onClose={() => setUpd(null)} onChanged={reload} />}
    </div>
  );
}

interface Syl { items: Chapter[]; sections: { section_id: string; section: string; percent: number | null; chapters_done: number; chapters_total: number }[]; subject: string }
const chapterTone = (s: string) => (s === "Done" ? "good" : s === "In progress" ? "info" : "mute") as "good" | "info" | "mute";
export function Syllabus() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Syl>("/teacher/syllabus"), []);
  const [sec, setSec] = useState("");
  const [cls, setCls] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<string | null>(null);
  const classes = [...new Set((data?.items ?? []).map((c) => c.class))];
  const items = useMemo(() => (data?.items ?? []).filter((c) => (!sec || c.sections.some((s) => s.section_id === sec)) && (!cls || c.class === cls) && (!q || `${c.chapter} ${c.class}`.toLowerCase().includes(q.toLowerCase()))), [data, sec, cls, q]);
  const open = data?.items.find((c) => c.id === view);
  const act = useAction(reload);
  return (
    <div data-report>
      <Head title="Syllabus" subtitle={`The ${data?.subject ? `${data.subject} ` : ""}syllabus for every class you teach, with each section's progress. Pick a class to see one section.`} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <PillSelect label="Class" value={sec} onChange={setSec} options={[{ value: "", label: "All sections" }, ...data.sections.map((s) => ({ value: s.section_id, label: s.section }))]} right={`${data.sections.length} sections`} />
          <Tiles items={data.sections.map((s) => ({ label: s.section, value: pctText(s.percent), sub: `${s.chapters_done} of ${s.chapters_total} chapters` }))} />
          <Panel title="Syllabus done by section" sub="%"><Bars rows={data.sections.map((s) => ({ label: s.section, value: s.percent }))} /></Panel>
          <Panel title={`Syllabus · ${sec ? data.sections.find((s) => s.section_id === sec)?.section.toLowerCase() : "all sections"}`} sub={`${items.length} chapters`} right={<ExportPrint name="my-syllabus" head={["Class", "No.", "Chapter", "Planned for", "Progress by section", "Status"]} rows={items.map((c) => [c.class, c.no, c.chapter, c.planned_for, c.sections.map((s) => `${s.label} ${s.status}`).join("; "), c.status])} />}>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search syllabus · ${sec ? "one section" : "all sections"}`} /><select aria-label="Class" value={cls} onChange={(e) => setCls(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px]"><option value="">All classes</option>{classes.map((c) => <option key={c}>{c}</option>)}</select></div>
            <SimpleTable head={[{ h: "Class" }, { h: "No." }, { h: "Chapter" }, { h: "Planned for" }, { h: "Progress by section" }, { h: "Status" }, { h: "" }]} empty="No chapters are set up yet. The School Admin adds them in Academics." rows={items.map((c) => [<b key="c" className="font-semibold text-slate-900">{c.class}</b>, c.no, <b key="n" className="font-semibold text-slate-900">{c.chapter}</b>, c.planned_for || "—",
              <div key="p" className="text-[12px]">{c.sections.filter((s) => !sec || s.section_id === sec).map((s) => <p key={s.section_id}>{s.label} · {s.status === "Done" ? "100%" : s.status === "In progress" ? "In progress" : "Not started"}</p>)}</div>, <Chip key="s" tone={chapterTone(c.status)}>{c.status}</Chip>,
              <span key="a" className="flex gap-1.5">{c.sections.map((s) => <button key={s.section_id} type="button" className={smallBtn} onClick={() => setView(c.id)}>{s.label.replace(/\s/g, "")}</button>)}<button type="button" className={smallBtn} onClick={() => setView(c.id)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {open && (
        <Modal open title={`${open.class} · ${open.chapter}`} onClose={() => setView(null)}>
          <KV rows={[["Planned for", open.planned_for || "—"], ["Objective", open.objective || "—"]]} />
          <p className="mb-1 mt-4 text-[12.5px] font-semibold text-slate-900">Progress by section</p>
          <ul className="divide-y divide-slate-100">{open.sections.map((s) => <li key={s.section_id} className="flex items-center gap-3 py-2"><span className="flex-1 text-[13px] text-slate-900">{s.label}</span>
            <select aria-label={`${s.label} status`} disabled={act.busy} value={s.status} onChange={(e) => void act.run(() => schoolFetch("/teacher/syllabus/progress", json("POST", { section_id: s.section_id, chapter_id: open.id, status: e.target.value })))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px]">{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></li>)}</ul>
        </Modal>
      )}
    </div>
  );
}
