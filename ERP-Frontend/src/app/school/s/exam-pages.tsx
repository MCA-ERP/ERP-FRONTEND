"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { RulesPages } from "./academic-pages4";

const S = "/school";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const row = "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5";
const Rl = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className={row}><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;

interface ExamType { id: string; name: string; weightage: number | null; included: boolean; max_marks: number; max_marks_alt: number | null; classes: string; status: "Active" | "Inactive"; weightage_text: string; max_text: string }
interface Marks { enter_as: string; round: string; entry_days: string; lock_verified: boolean; show_average: boolean; show_rank: boolean }
export type ExamCfgTab = "exam-types" | "grading-system" | "marks-settings";

export function ExamConfigPages({ tab }: { tab: ExamCfgTab }) {
  const types = useLoad(() => (tab === "exam-types" ? schoolFetch<{ items: ExamType[] }>(`${S}/exam-types`) : Promise.resolve(null)), [tab]);
  const marks = useLoad(() => (tab === "marks-settings" ? schoolFetch<Marks>(`${S}/marks-settings`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { types.reload(); marks.reload(); });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ExamType | null>(null);
  const [form, setForm] = useState<ExamType | "new" | null>(null);
  const [f, setF] = useState({ name: "", weightage: "", included: false, max_marks: "", max_marks_alt: "", classes: "", status: "Active" });
  const [d, setD] = useState<Partial<Marks>>({});
  const [saved, setSaved] = useState("");
  if (tab === "grading-system") return <RulesPages tab="grading-system" />;
  const err = <ErrorBanner message={types.error || marks.error || act.error} />;
  if (tab === "marks-settings") {
    const c = marks.data ? { ...marks.data, ...d } : null;
    const set = <K extends keyof Marks>(k: K, v: Marks[K]) => { setD((o) => ({ ...o, [k]: v })); setSaved(""); };
    const pick = (k: "enter_as" | "round" | "entry_days", opts: string[]) => <select className={sel} aria-label={k} value={c?.[k] ?? ""} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
    const save = async () => { setSaved(""); if (await act.run(() => schoolFetch(`${S}/marks-settings`, json("PUT", d)))) { setD({}); setSaved("Saved"); } };
    return (
      <div>{err}{saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{saved}</p>}
        {c && <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Marks settings</h2></div>
          <Rl title="Enter marks as">{pick("enter_as", ["Marks", "Percentage", "Grade"])}</Rl>
          <Rl title="Round off percentages">{pick("round", ["To whole number", "To 1 decimal", "To 2 decimals"])}</Rl>
          <Rl title="Allow marks entry after the exam for">{pick("entry_days", ["Same day", "2 days", "5 days", "10 days"])}</Rl>
          <Rl title="Lock marks once verified" hint="Changes need the principal's approval"><Toggle checked={c.lock_verified} onChange={(v) => set("lock_verified", v)} label="Lock marks once verified" /></Rl>
          <Rl title="Show class average on report cards"><Toggle checked={c.show_average} onChange={(v) => set("show_average", v)} label="Show class average on report cards" /></Rl>
          <Rl title="Show rank on report cards"><Toggle checked={c.show_rank} onChange={(v) => set("show_rank", v)} label="Show rank on report cards" /></Rl>
          <div className="flex justify-end gap-2.5 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setD({}); setSaved(""); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save"}</button></div></div>}
      </div>
    );
  }
  const all = types.data?.items ?? [];
  const rows = all.filter((x) => has(x, search));
  const active = all.filter((x) => x.status === "Active").length;
  const open = (x: ExamType | "new") => { setF(x === "new" ? { name: "", weightage: "", included: false, max_marks: "", max_marks_alt: "", classes: "", status: "Active" } : { name: x.name, weightage: x.weightage == null ? "" : String(x.weightage), included: x.included, max_marks: String(x.max_marks), max_marks_alt: x.max_marks_alt ? String(x.max_marks_alt) : "", classes: x.classes, status: x.status }); setForm(x); setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); const body = { name: f.name, weightage: f.weightage === "" ? null : Number(f.weightage), included: f.included, max_marks: Number(f.max_marks), max_marks_alt: f.max_marks_alt ? Number(f.max_marks_alt) : null, classes: f.classes, status: f.status }; if (await act.run(() => (form === "new" ? schoolFetch(`${S}/exam-types`, json("POST", body)) : schoolFetch(`${S}/exam-types/${(form as ExamType).id}`, json("PUT", body))))) setForm(null); };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Exam types", value: all.length, sub: "All records" }, { label: "Active", value: active, sub: `${pct(active, all.length)} of shown` }]} />
      <ListPanel title="Exam types" noun="types" search={search} onSearch={setSearch} exportName="exam-types" head={["Exam type", "Weightage", "Max marks", "Classes", "Status"]} exportRows={rows.map((x) => [x.name, x.weightage_text, x.max_text, x.classes, x.status])}
        extra={<button type="button" className={small} onClick={() => open("new")}>+ New exam type</button>} tableHead={["Exam type", "Weightage", "Max marks", "Classes", "Status", ""]} empty={types.loading ? "Loading…" : "No exam types yet."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.weightage_text, x.max_text, x.classes || "—", <Chip key="s" tone={x.status === "Active" ? "good" : "mute"}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Weightage" v={view.weightage_text} /><Row k="Max marks" v={view.max_text} /><Row k="Classes" v={view.classes || "—"} /><Row k="Status" v={view.status} /></dl><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" className={small} onClick={() => open(view)}>Edit</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
      <Modal open={!!form} title={form === "new" ? "New exam type" : "Edit exam type"} onClose={() => setForm(null)}><form onSubmit={save} className="space-y-3">
        <Field label="Exam type"><input className={inputCls} required minLength={2} maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Weightage (%)"><input type="number" min={0} max={100} className={inputCls} disabled={f.included} value={f.included ? "" : f.weightage} onChange={(e) => setF({ ...f, weightage: e.target.value })} /></Field><Field label="Counted inside another exam"><select className={inputCls} value={f.included ? "Yes" : "No"} onChange={(e) => setF({ ...f, included: e.target.value === "Yes" })}><option>No</option><option>Yes</option></select></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Max marks"><input type="number" min={1} className={inputCls} required value={f.max_marks} onChange={(e) => setF({ ...f, max_marks: e.target.value })} /></Field><Field label="Second max (optional)"><input type="number" min={1} className={inputCls} value={f.max_marks_alt} onChange={(e) => setF({ ...f, max_marks_alt: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Classes"><input className={inputCls} placeholder="1 – 10" maxLength={40} value={f.classes} onChange={(e) => setF({ ...f, classes: e.target.value })} /></Field><Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Active</option><option>Inactive</option></select></Field></div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div></form></Modal>
    </div>
  );
}
