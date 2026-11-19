"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, useStaff } from "./fo-pages";
import { Row, small } from "./dash-pages";

const S = "/school";
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const tone = (s: string): "good" | "mute" => (s === "Active" ? "good" : "mute");
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Picker = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) => (
  <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
    <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{children}</select>
    </label>
  </div>
);

// ═════════════ classes ═════════════
interface Cls { id: string; name: string; stage: string; campus_id: string | null; campus: string; sections: number; students: number; status: "Active" | "Inactive" }
interface ClsData { items: Cls[]; campuses: { id: string; name: string }[]; stages: string[] }
export type ClassTab = "add-class" | "edit-class" | "class-list";

export function ClassPages({ tab }: { tab: ClassTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<ClsData>(`${S}/classes`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Cls | null>(null);
  const [pick, setPick] = useState("");
  const [saved, setSaved] = useState("");
  const blank = { name: "", stage: "Pre-primary", sections: "3", students: "", campus_id: "" };
  const [f, setF] = useState<Record<string, string>>(blank);
  const all = data?.items ?? [];
  const stages = data?.stages ?? ["Pre-primary", "Primary", "Middle", "Secondary", "Senior secondary"];
  const camps = data?.campuses ?? [];
  const cur = all.find((c) => c.id === (pick || all[0]?.id));
  const sel = (k: string, d: string) => f[k] ?? d;
  const campusSel = (k: string, d: string) => <select className={inputCls} value={sel(k, d)} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">—</option>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>;
  const stageSel = (k: string, d: string) => <select className={inputCls} value={sel(k, d)} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{stages.map((s) => <option key={s}>{s}</option>)}</select>;
  const add = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${S}/classes`, json("POST", { name: sel("name", ""), stage: sel("stage", "Pre-primary"), sections: Number(sel("sections", "3")), students: sel("students", "") ? Number(f.students) : undefined, campus_id: sel("campus_id", "") || null })))) { setSaved(`${f.name} added. It is in Class List.`); setF(blank); } };
  const edit = async (e: FormEvent) => { e.preventDefault(); if (!cur) return; setSaved(""); if (await act.run(() => schoolFetch(`${S}/classes/${cur.id}`, json("PUT", { name: sel("name", cur.name), stage: sel("stage", cur.stage || stages[0]), sections: Number(sel("sections", String(cur.sections))), campus_id: sel("campus_id", cur.campus_id ?? "") || null, status: sel("status", cur.status) })))) { setF({}); setSaved("Saved"); } };
  const err = <ErrorBanner message={error || act.error} />;
  if (tab === "add-class") {
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Add Class" onSubmit={add} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Class"><input className={inputCls} required maxLength={100} value={sel("name", "")} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Stage">{stageSel("stage", "Pre-primary")}</Field>
          <Field label="Sections"><select className={inputCls} value={sel("sections", "3")} onChange={(e) => setF({ ...f, sections: e.target.value })}>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Students"><input type="number" min={0} className={inputCls} value={sel("students", "")} onChange={(e) => setF({ ...f, students: e.target.value })} /></Field>
          <Field label="Campus">{campusSel("campus_id", "")}</Field>
        </FormCard>
      </div>
    );
  }
  if (tab === "edit-class") {
    return (
      <div>{err}{okBox(saved)}
        <Picker label="Choose" value={cur?.id ?? ""} onChange={(v) => { setPick(v); setF({}); setSaved(""); }}>{!all.length && <option value="">No classes</option>}{all.map((c) => <option key={c.id} value={c.id}>{c.name}{c.stage ? ` · ${c.stage}` : ""}</option>)}</Picker>
        {cur && <FormCard title={`Edit ${cur.name}`} onSubmit={edit} onDiscard={() => { setF({}); setSaved(""); }} busy={act.busy} error="">
          <Field label="Class"><input className={inputCls} required maxLength={100} value={sel("name", cur.name)} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Stage">{stageSel("stage", cur.stage || stages[0])}</Field>
          <Field label="Sections"><select className={inputCls} value={sel("sections", String(cur.sections))} onChange={(e) => setF({ ...f, sections: e.target.value })}>{[...Array(13).keys()].filter((n) => n >= cur.sections).map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Students"><input className={inputCls} disabled readOnly value={cur.students} /></Field>
          <Field label="Campus">{campusSel("campus_id", cur.campus_id ?? "")}</Field>
          <Field label="Status"><select className={inputCls} value={sel("status", cur.status)} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Active</option><option>Inactive</option></select></Field>
        </FormCard>}
      </div>
    );
  }
  const rows = all.filter((c) => has(c, search));
  const n = (s: string) => all.filter((c) => c.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Classes", value: all.length, sub: "All records" }, { label: "Active", value: n("Active"), sub: `${pct(n("Active"), all.length)} of shown` }]} />
      <ListPanel title="Classes" noun="classes" search={search} onSearch={setSearch} exportName="classes" head={["Class", "Stage", "Sections", "Students", "Campus", "Status"]} exportRows={rows.map((c) => [c.name, c.stage, c.sections, c.students, c.campus, c.status])}
        tableHead={["Class", "Stage", "Sections", "Students", "Campus", "Status", ""]} empty={loading ? "Loading…" : "No classes yet."}
        rows={rows.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, c.stage || "—", <span key="s" className="block text-right">{c.sections}</span>, <span key="t" className="block text-right">{c.students}</span>, c.campus || "—", <Chip key="c" tone={tone(c.status)}>{c.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Stage" v={view.stage || "—"} /><Row k="Sections" v={view.sections} /><Row k="Students" v={view.students} /><Row k="Campus" v={view.campus || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ sections ═════════════
interface Sec { id: string; grade_id: string; label: string; name: string; teacher_id: string | null; teacher: string; room: string; capacity: number; students: number; status: "Active" | "Inactive" }
export type SectionTab = "add-section" | "assign-class-teacher" | "section-list";

export function SectionPages({ tab }: { tab: SectionTab }) {
  const secs = useLoad(() => schoolFetch<{ items: Sec[] }>(`${S}/section-rows`), []);
  const classes = useLoad(() => schoolFetch<ClsData>(`${S}/classes`), []);
  const staff = useStaff();
  const act = useAction(() => secs.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Sec | null>(null);
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState<Record<string, string>>({});
  const blank = { grade_id: "", name: "", class_teacher_id: "", room: "", capacity: "" };
  const [f, setF] = useState(blank);
  const all = secs.data?.items ?? [];
  const gs = classes.data?.items ?? [];
  const teachers = staff.data?.items ?? [];
  const err = <ErrorBanner message={secs.error || classes.error || staff.error || act.error} />;
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${S}/section-rows`, json("POST", { grade_id: f.grade_id || gs[0]?.id, name: f.name, class_teacher_id: f.class_teacher_id || null, room: f.room, capacity: f.capacity ? Number(f.capacity) : undefined })))) { setSaved(`${f.name} added. It is in Section List.`); setF(blank); } };
  const tsel = (value: string, onChange: (v: string) => void, cls = inputCls) => <select className={cls} value={value} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  if (tab === "add-section") {
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Add Section" cols="lg:grid-cols-5" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Class"><select className={inputCls} required value={f.grade_id || gs[0]?.id || ""} onChange={(e) => setF({ ...f, grade_id: e.target.value })}>{gs.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Section"><input className={inputCls} required maxLength={50} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Class teacher">{tsel(f.class_teacher_id, (v) => setF({ ...f, class_teacher_id: v }))}</Field>
          <Field label="Room"><input className={inputCls} maxLength={30} value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} /></Field>
          <Field label="Students"><input type="number" min={1} max={500} placeholder="40" className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
        </FormCard>
      </div>
    );
  }
  const rows = all.filter((s) => has(s, search));
  if (tab === "assign-class-teacher") {
    return (
      <div data-report>{err}{okBox(saved)}
        <ListPanel title="Class teachers" noun="sections" search={search} onSearch={setSearch} exportName="class-teachers" head={["Section", "Class teacher", "Students"]} exportRows={rows.map((s) => [s.label, s.teacher, s.students])}
          tableHead={["Section", "Class teacher", "Students", ""]} empty={secs.loading ? "Loading…" : "No sections yet."}
          rows={rows.map((s) => { const v = pending[s.id] ?? s.teacher_id ?? ""; return [<b key="n" className="font-semibold text-slate-900">{s.label}</b>, tsel(v, (x) => setPending({ ...pending, [s.id]: x }), "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]"), <span key="t" className="block text-right">{s.students}</span>,
            <button key="a" type="button" className={`${btnPrimary} !px-3.5 !py-1 text-[12px]`} disabled={act.busy || pending[s.id] === undefined} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/section-rows/${s.id}`, json("PUT", { class_teacher_id: v || null })))) { const { [s.id]: _x, ...rest } = pending; void _x; setPending(rest); setSaved(`Class teacher saved for ${s.label}.`); } }}>Save</button>]; })} />
      </div>
    );
  }
  const n = (s: string) => all.filter((x) => x.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Sections", value: all.length, sub: "All records" }, { label: "Active", value: n("Active"), sub: `${pct(n("Active"), all.length)} of shown` }]} />
      <ListPanel title="Sections" noun="sections" search={search} onSearch={setSearch} exportName="sections" head={["Section", "Class teacher", "Room", "Students", "Status"]} exportRows={rows.map((s) => [s.label, s.teacher, s.room, s.students, s.status])}
        tableHead={["Section", "Class teacher", "Room", "Students", "Status", ""]} empty={secs.loading ? "Loading…" : "No sections yet."}
        rows={rows.map((s) => [<b key="n" className="font-semibold text-slate-900">{s.label}</b>, s.teacher || "—", <span key="r" className="block text-right">{s.room || "—"}</span>, <span key="t" className="block text-right">{s.students}</span>, <Chip key="c" tone={tone(s.status)}>{s.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>])} />
      <Modal open={!!view} title={view?.label ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class teacher" v={view.teacher || "—"} /><Row k="Room" v={view.room || "—"} /><Row k="Students" v={`${view.students} of ${view.capacity}`} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ subjects ═════════════
interface Sub { id: string; name: string; code: string; category: string; subject_type: string; classes: string; status: "Active" | "Inactive" }
interface SubData { items: Sub[]; grades: { id: string; name: string }[] }
export type SubjectTab = "add-subject" | "subject-category" | "subject-list";
const CATEGORIES = ["Language", "Core", "Science", "Arts", "Skill"];
const TYPES = ["Theory", "Practical", "Theory + practical"];
const short = (n: string) => n.replace(/^Class\s+/i, "");

export function SubjectPages({ tab }: { tab: SubjectTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<SubData>(`${S}/subject-rows`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Sub | null>(null);
  const [saved, setSaved] = useState("");
  const blank = { name: "", code: "", category: "Language", range: "all", subject_type: "Theory" };
  const [f, setF] = useState(blank);
  const all = data?.items ?? [];
  const grades = data?.grades ?? [];
  // class ranges the school can pick from
  const ranges: { key: string; label: string; ids: string[] }[] = [{ key: "all", label: grades.length ? `${short(grades[0].name)} – ${short(grades[grades.length - 1].name)}` : "All classes", ids: grades.map((g) => g.id) }];
  for (const [a, b] of [[1, 5], [1, 10], [6, 10], [11, 12]] as const) {
    const ids = grades.filter((g) => { const m = /(\d+)$/.exec(g.name); return m && +m[1] >= a && +m[1] <= b; });
    if (ids.length) ranges.push({ key: `${a}-${b}`, label: `${a} – ${b}`, ids: ids.map((g) => g.id) });
  }
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${S}/subject-rows`, json("POST", { name: f.name, code: f.code, category: f.category, subject_type: f.subject_type, grade_ids: ranges.find((r) => r.key === f.range)?.ids ?? [] })))) { setSaved(`${f.name} added. It is in Subject List.`); setF(blank); } };
  const err = <ErrorBanner message={error || act.error} />;
  if (tab === "add-subject") {
    return (
      <div>{err}{okBox(saved)}
        <FormCard title="Add Subject" onSubmit={submit} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Subject"><input className={inputCls} required minLength={2} maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Code"><input className={inputCls} required minLength={2} maxLength={30} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <Field label="Category"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Classes"><select className={inputCls} value={f.range} onChange={(e) => setF({ ...f, range: e.target.value })}>{ranges.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></Field>
          <Field label="Type"><select className={inputCls} value={f.subject_type} onChange={(e) => setF({ ...f, subject_type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        </FormCard>
      </div>
    );
  }
  const rows = all.filter((s) => has(s, search));
  const n = all.filter((s) => s.status === "Active").length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Subjects", value: all.length, sub: "All records" }, { label: "Active", value: n, sub: `${pct(n, all.length)} of shown` }]} />
      <ListPanel title="Subjects" noun="subjects" search={search} onSearch={setSearch} exportName={tab} head={["Subject", "Code", "Category", "Classes", "Type", "Status"]} exportRows={rows.map((s) => [s.name, s.code, s.category, s.classes, s.subject_type, s.status])}
        tableHead={["Subject", "Code", "Category", "Classes", "Type", "Status", ""]} empty={loading ? "Loading…" : "No subjects yet."}
        rows={rows.map((s) => [<b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.code, s.category || "—", s.classes || "—", s.subject_type, <Chip key="c" tone={tone(s.status)}>{s.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Code" v={view.code} /><Row k="Category" v={view.category || "—"} /><Row k="Classes" v={view.classes || "—"} /><Row k="Type" v={view.subject_type} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ subject allocation ═════════════
interface Grid { grades: { id: string; name: string }[]; subjects: { id: string; name: string }[]; pairs: string[] }
interface TeacherRow { teacher_id: string; name: string; designation: string; subjects: string[]; classes: string[]; periods: number; assignments: { id: string; subject: string; section: string; periods: number }[] }
export type AllocTab = "class-wise-subject" | "teacher-wise-subject";

export function SubjectAllocationPages({ tab }: { tab: AllocTab }) {
  const grid = useLoad(() => schoolFetch<Grid>(`${S}/subject-grid`), []);
  const tw = useLoad(() => schoolFetch<{ items: TeacherRow[] }>(`${S}/teacher-subjects`), []);
  const secs = useLoad(() => schoolFetch<{ items: Sec[] }>(`${S}/section-rows`), []);
  const subs = useLoad(() => schoolFetch<SubData>(`${S}/subject-rows`), []);
  const staff = useStaff();
  const act = useAction(() => { grid.reload(); tw.reload(); });
  const [ticks, setTicks] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<TeacherRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState("");
  const [f, setF] = useState({ teacher_id: "", subject_id: "", section_id: "", periods: "5" });
  const err = <ErrorBanner message={grid.error || tw.error || staff.error || act.error} />;
  if (tab === "class-wise-subject") {
    const g = grid.data;
    const cur = ticks ?? new Set(g?.pairs ?? []);
    const toggle = (k: string) => { const n = new Set(cur); if (n.has(k)) n.delete(k); else n.add(k); setTicks(n); setSaved(""); };
    return (
      <div>{err}{okBox(saved)}
        <Panel title="Class-wise subjects" sub="Tick to include" right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !ticks} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/subject-grid`, json("PUT", { pairs: [...cur] })))) { setTicks(null); setSaved("Saved"); } }}>{act.busy ? "Saving…" : "Save"}</button>}>
          {g && g.grades.length && g.subjects.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-4 py-2.5 font-medium">Class</th>{g.subjects.map((s) => <th key={s.id} className="px-3 py-2.5 text-center font-medium">{s.name}</th>)}</tr></thead>
            <tbody>{g.grades.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold text-slate-900">{c.name}</td>{g.subjects.map((s) => { const k = `${c.id}:${s.id}`; return <td key={s.id} className="px-3 py-2.5 text-center"><input type="checkbox" aria-label={`${c.name} ${s.name}`} className="h-4 w-4 accent-[#026f9b]" checked={cur.has(k)} onChange={() => toggle(k)} /></td>; })}</tr>)}</tbody></table></div>
            : <p className="p-6 text-center text-sm text-slate-400">{grid.loading ? "Loading…" : "Add classes and subjects first."}</p>}
        </Panel>
      </div>
    );
  }
  const rows = (tw.data?.items ?? []).filter((t) => has(t, search));
  const teachers = staff.data?.items ?? [];
  const sections = secs.data?.items ?? [];
  const subjects = subs.data?.items ?? [];
  const save = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(`${S}/teacher-subjects`, json("POST", { teacher_id: f.teacher_id || teachers[0]?.id, subject_id: f.subject_id || subjects[0]?.id, section_id: f.section_id || null, periods: Number(f.periods) })))) { setAdding(false); setSaved("Assigned."); } };
  const remove = async (id: string) => { if (await act.run(() => schoolFetch(`${S}/teacher-subjects/${id}`, { method: "DELETE" }))) setView(null); };
  return (
    <div data-report>{err}{okBox(saved)}
      <ListPanel title="Teacher-wise subjects" noun="teachers" search={search} onSearch={setSearch} exportName="teacher-wise-subjects" head={["Teacher", "Designation", "Subject", "Classes", "Periods per week"]} exportRows={rows.map((t) => [t.name, t.designation, t.subjects.join("; "), t.classes.join("; "), t.periods])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Assign</button>}
        tableHead={["Teacher", "Subject", "Classes", "Periods / week", ""]} empty={tw.loading ? "Loading…" : "No subjects assigned to teachers yet."}
        rows={rows.map((t) => [<div key="n"><p className="font-semibold text-slate-900">{t.name}</p>{t.designation && <p className="text-xs text-slate-400">{t.designation}</p>}</div>, <span key="s" className="flex flex-wrap gap-1">{t.subjects.map((s) => <span key={s} className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{s}</span>)}</span>, t.classes.join(", ") || "—", t.periods, <button key="v" type="button" className={small} onClick={() => setView(t)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <>
        <SimpleTable head={["Subject", "Class", "Periods", ""].map((h) => ({ h }))} empty="" rows={view.assignments.map((a) => [a.subject, a.section || "All classes", a.periods, <button key="d" type="button" className={small} disabled={act.busy} onClick={() => void remove(a.id)}>Remove</button>])} />
        <Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={adding} title="Assign a subject" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Teacher"><select className={inputCls} required value={f.teacher_id || teachers[0]?.id || ""} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Subject"><select className={inputCls} required value={f.subject_id || subjects[0]?.id || ""} onChange={(e) => setF({ ...f, subject_id: e.target.value })}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Class"><select className={inputCls} value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}><option value="">All classes</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Periods per week"><input type="number" min={1} max={60} className={inputCls} required value={f.periods} onChange={(e) => setF({ ...f, periods: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}
