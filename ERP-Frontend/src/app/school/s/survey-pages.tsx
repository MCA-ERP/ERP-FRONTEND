"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has } from "./fo-pages";
import { day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";
import { useGoTab } from "./tab-context";

const V = "/school/comm";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (s === "Open" ? "warn" : s === "Closed" ? "info" : s === "Scheduled" ? "good" : "mute");
const tiles = (items: [string, ReactNode, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const KINDS = ["Rating 1 – 5", "Multiple choice", "Written answer"];
let picked = "";

type Survey = { id: string; title: string; audience: string; opens_on: string; closes_on: string; anonymous: boolean; kind: string; status: string; answers: number; eligible: number; pct: number };
type Tpl = { key: string; name: string; audience: string; kind: string; questions: string[][] };
export function SurveyPages({ tab }: { tab: "surveys" | "create-survey" | "survey-results" | "teacher-feedback" }) {
  const d = useLoad(() => schoolFetch<{ items: Survey[]; templates: Tpl[]; open: number; answers: number; teacher: { pct: number; answers: number; eligible: number } | null; parent: { pct: number; closes_on: string } | null }>(`${V}/surveys`), []); const act = useAction(() => d.reload()); const go = useGoTab(); const x = d.data; const err = d.error || act.error;
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const blank = { title: "", tpl: "parent", audience: "Parents", opens_on: nowIst(), closes_on: nowIst(), anonymous: false, kind: "Survey" }; const [f, setF] = useState(blank); const [qs, setQs] = useState<{ text: string; kind: string; options: string }[] | null>(null);
  const [sel, setSel] = useState(picked); const res = useLoad(() => (tab === "survey-results" && (sel || x?.items[0]?.id) ? schoolFetch<{ survey: { title: string; kind: string }; answered: number; eligible: number; groups: [string, number][]; questions: { id: string; text: string; kind: string; avg?: number | null; dist?: [string, number][]; written?: string[] }[] }>(`${V}/surveys/${sel || x?.items[0]?.id}/results`) : Promise.resolve(null)), [tab, sel, x?.items.length]);
  const tf = useLoad(() => (tab === "teacher-feedback" ? schoolFetch<{ items: { teacher: string; responses: number; average: number | null }[] }>(`${V}/teacher-feedback`) : Promise.resolve(null)), [tab]);
  if (tab === "create-survey") {
    const tpl = x?.templates.find((t) => t.key === f.tpl); const list = qs ?? tpl?.questions.map((q) => ({ text: q[0], kind: q[1], options: q[2] })) ?? [];
    const pick = (key: string) => { const t = x?.templates.find((y) => y.key === key); setF({ ...f, tpl: key, audience: t?.audience ?? f.audience, kind: t?.kind ?? "Survey" }); setQs(null); };
    const edit = (k: number, p: Partial<(typeof list)[number]>) => setQs(list.map((q, j) => (j === k ? { ...q, ...p } : q)));
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/surveys`, json("POST", { title: f.title, audience: f.audience, opens_on: f.opens_on, closes_on: f.closes_on, anonymous: f.anonymous, kind: f.kind, questions: list.map((q) => ({ text: q.text, kind: q.kind, options: q.options })) })))) { setF(blank); setQs(null); setMsg("Saved as a draft. Schedule it from Surveys."); } };
    return <div>{okBox(msg)}<form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">New survey</h2></div>{err && <div className="px-5 pt-4"><ErrorBanner message={err} /></div>}
      <div className="space-y-4 p-5"><Field label="Title"><input className={inputCls} required maxLength={160} placeholder="For example, Science exhibition feedback" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid items-end gap-4 sm:grid-cols-5"><Field label="Start from"><select className={inputCls} value={f.tpl} onChange={(e) => pick(e.target.value)}>{x?.templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
          <Field label="Who answers"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["Students", "Parents", "Staff", "Students and parents"].map((a) => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Opens"><input type="date" required className={inputCls} value={f.opens_on} onChange={(e) => setF({ ...f, opens_on: e.target.value })} /></Field><Field label="Closes"><input type="date" required min={f.opens_on} className={inputCls} value={f.closes_on} onChange={(e) => setF({ ...f, closes_on: e.target.value })} /></Field>
          <label className="flex items-center gap-2 pb-2 text-[13px] text-slate-800"><input type="checkbox" className="h-4 w-4 accent-[#0294ce]" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} />Anonymous</label></div></div>
      <div className="border-t border-slate-100"><div className="flex items-baseline gap-2 px-5 py-3.5"><h3 className="text-base font-semibold text-slate-900">Questions</h3><span className="text-xs text-slate-500">{list.length} questions</span></div>
        <div className="space-y-2 px-5 pb-4">{list.map((q, k) => <div key={k} className="grid items-center gap-2 sm:grid-cols-[1.5rem_1fr_11rem_auto]"><span className="text-xs text-slate-500">{k + 1}</span><span className="space-y-1"><input className={inputCls} aria-label={`Question ${k + 1}`} required maxLength={200} value={q.text} onChange={(e) => edit(k, { text: e.target.value })} />{q.kind === "Multiple choice" && <input className={inputCls} aria-label="Options" placeholder="Options, separated by |" value={q.options} onChange={(e) => edit(k, { options: e.target.value })} />}</span>
          <select className={inputCls} aria-label="Kind" value={q.kind} onChange={(e) => edit(k, { kind: e.target.value })}>{KINDS.map((o) => <option key={o}>{o}</option>)}</select><button type="button" className={small} onClick={() => setQs(list.filter((_, j) => j !== k))}>Remove</button></div>)}
          <button type="button" className={small} onClick={() => setQs([...list, { text: "", kind: "Rating 1 – 5", options: "" }])}>+ Add question</button></div></div>
      <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setF(blank); setQs(null); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy} className={primaryCls}>Save survey</button></div></form></div>;
  }
  if (tab === "survey-results") {
    const r = res.data; const cur = sel || x?.items[0]?.id || "";
    return <div className="space-y-5"><ErrorBanner message={err || res.error} /><Field label="Survey"><select className={`${inputCls} max-w-sm`} value={cur} onChange={(e) => { picked = e.target.value; setSel(e.target.value); }}>{x?.items.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
      {!x?.items.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No surveys yet.</p> : r && <>{r.survey.kind === "Teacher feedback" && <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Teacher-wise scores are on the <b>Teacher Feedback</b> tab.</p>}
        <div className="grid gap-5 lg:grid-cols-2">{r.questions.filter((q) => q.kind !== "Written answer").map((q) => <Panel key={q.id} title={q.text} sub={q.kind === "Rating 1 – 5" ? `Average ${q.avg ?? "—"} / 5` : "Choices"}><BarRows rows={q.dist ?? []} /></Panel>)}</div>
        <Panel title="Answers by group" sub={`${r.answered} of ${r.eligible} answered`}><BarRows rows={r.groups} /></Panel>
        {r.questions.some((q) => q.kind === "Written answer") && <Panel title="What people wrote" sub="A sample of written answers"><div className="space-y-2 p-4">{r.questions.flatMap((q) => q.written ?? []).map((t, k) => <p key={k} className="rounded border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">“{t}”</p>)}{!r.questions.flatMap((q) => q.written ?? []).length && <p className="text-sm text-slate-400">No written answers yet.</p>}</div></Panel>}</>}</div>;
  }
  if (tab === "teacher-feedback") {
    const rows = (tf.data?.items ?? []).filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={err || tf.error} /><ListPanel title="Teacher feedback" noun="teachers" search={search} onSearch={setSearch} exportName="teacher-feedback" head={["Teacher", "Responses", "Average"]} exportRows={rows.map((i) => [i.teacher, i.responses, i.average ?? ""])} tableHead={["Teacher", "Responses", "Average"]} empty={tf.loading ? "Loading…" : "No teacher-wise answers yet."} rows={rows.map((i) => [i.teacher, i.responses, i.average === null ? "—" : `${i.average} / 5`])} /></div>;
  }
  const rows = (x?.items ?? []).filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Open surveys", x?.open ?? 0], ["Answers this term", (x?.answers ?? 0).toLocaleString("en-IN")], ["Teacher feedback response", x?.teacher ? `${x.teacher.pct}%` : "—", x?.teacher ? `${x.teacher.answers.toLocaleString("en-IN")} of ${x.teacher.eligible.toLocaleString("en-IN")} students` : ""], ["Parent survey response", x?.parent ? `${x.parent.pct}%` : "—", x?.parent ? `Closes ${day(x.parent.closes_on)}` : ""]])}
    <ListPanel title="All surveys" noun="surveys" search={search} onSearch={setSearch} exportName="surveys" head={["Survey", "For", "Open", "Answers", "Anonymous", "Status"]} exportRows={rows.map((i) => [i.title, i.audience, `${day(i.opens_on)} – ${day(i.closes_on)}`, `${i.answers} / ${i.eligible} (${i.pct}%)`, i.anonymous ? "Yes" : "No", i.status])}
      tableHead={["Survey", "For", "Open", "Answers", "Anonymous", "Status", ""]} empty={d.loading ? "Loading…" : "No surveys yet."}
      rows={rows.map((i) => [<b key="t" className="font-semibold text-slate-900">{i.title}</b>, i.audience, i.status === "Draft" ? "Not scheduled" : `${day(i.opens_on)} – ${day(i.closes_on)}`, <span key="a">{i.answers.toLocaleString("en-IN")} / {i.eligible.toLocaleString("en-IN")} <span className="text-slate-500">({i.pct}%)</span></span>, i.anonymous ? "Yes" : "No", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>,
        i.status === "Draft" ? <button key="b" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${V}/surveys/${i.id}/schedule`, json("POST", {})))}>Schedule</button> : <button key="b" type="button" className={small} onClick={() => { picked = i.id; go("survey-results"); }}>Results</button>])} /></div>;
}
void redBtn;
