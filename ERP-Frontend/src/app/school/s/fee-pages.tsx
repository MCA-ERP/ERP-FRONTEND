"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useRoster } from "./student-pages2";

const F = "/school/fees";
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
export const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex flex-wrap gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
export const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
export const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
export const Pill = ({ label, children }: { label: string; children: ReactNode }) => <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label>;
export const Bar = ({ children }: { children: ReactNode }) => <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{children}</div>;
export const pillSel = "max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
export const tone = (s: string): "good" | "warn" | "bad" | "mute" => (["Active", "Paid", "Approved"].includes(s) ? "good" : ["Pending", "Part paid", "Overdue", "Due"].includes(s) ? "warn" : ["Failed", "Rejected"].includes(s) ? "bad" : "mute");
export const Sec = ({ children }: { children: ReactNode }) => <div className="rounded-2xl border border-slate-200 bg-white">{children}</div>;
export const Rw = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5"><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;
const Setup = ({ busy, run }: { busy: boolean; run: () => void }) => <button type="button" className={`${primaryCls} !px-4 !py-1.5 text-[13px]`} disabled={busy} onClick={run}>Use the standard fee setup</button>;

// ═════════════ configuration ═════════════
export type CfgTab = "fee-categories" | "fee-heads" | "fee-groups";
export function FeeConfigPages({ tab }: { tab: CfgTab }) {
  const cats = useLoad(() => schoolFetch<{ items: { id: string; name: string; heads: string[]; status: string; max_annual: number }[] }>(`${F}/categories`), []);
  const hds = useLoad(() => schoolFetch<{ categories: { id: string; name: string }[]; items: { id: string; name: string; category_id: string | null; category: string; frequency: string; optional: string; status: string }[] }>(`${F}/heads`), []);
  const grp = useLoad(() => schoolFetch<{ items: { id: string; name: string; classes: string; annual: number; students: number; status: string }[] }>(`${F}/groups`), []);
  const act = useAction(() => { cats.reload(); hds.reload(); grp.reload(); });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<{ title: string; rows: [string, string | number][]; patch?: [string, string] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", category_id: "", frequency: "Term-wise", optional: "No", classes: "" });
  const err = <ErrorBanner message={cats.error || hds.error || grp.error || act.error} />;
  const empty = !cats.data?.items.length && !grp.data?.items.length;
  const setup = <Setup busy={act.busy} run={() => void act.run(async () => { await schoolFetch(`${F}/defaults`, json("POST", {})); setMsg("Standard fee setup added."); })} />;
  const noun = { "fee-categories": "category", "fee-heads": "head", "fee-groups": "group" }[tab];
  const submit = async (e: FormEvent) => { e.preventDefault(); const [path, body] = tab === "fee-categories" ? ["categories", { name: f.name }] : tab === "fee-heads" ? ["heads", { name: f.name, category_id: f.category_id || hds.data?.categories[0]?.id || null, frequency: f.frequency, optional: f.optional }] : ["groups", { name: f.name, classes: f.classes }]; if (await act.run(() => schoolFetch(`${F}/${path}`, json("POST", body)))) { setAdding(false); setF({ ...f, name: "", classes: "" }); } };
  const toggle = async (path: string, id: string, status: string) => { if (await act.run(() => schoolFetch(`${F}/${path}/${id}`, json("PATCH", { status: status === "Active" ? "Inactive" : "Active" })))) setView(null); };
  const detail = <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={() => setView(null)} left={view.patch ? <button type="button" className={small} disabled={act.busy} onClick={() => void toggle(view.patch![0], view.patch![1], String(view.rows.find(([k]) => k === "Status")?.[1]))}>{view.rows.find(([k]) => k === "Status")?.[1] === "Active" ? "Make inactive" : "Make active"}</button> : undefined} /></>}</Modal>;
  const addModal = <Modal open={adding} title={`Add a ${noun}`} onClose={() => setAdding(false)}><form onSubmit={submit} className="space-y-3">
    <Field label="Name"><input className={inputCls} required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
    {tab === "fee-heads" && <><Field label="Category"><select className={inputCls} value={f.category_id || hds.data?.categories[0]?.id || ""} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{hds.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Frequency"><select className={inputCls} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>{["Term-wise", "Term 1 only", "Annual", "Monthly"].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Optional"><input className={inputCls} maxLength={40} placeholder="No, Yes, Class 6 and above" value={f.optional} onChange={(e) => setF({ ...f, optional: e.target.value })} /></Field></div></>}
    {tab === "fee-groups" && <Field label="Classes"><input className={inputCls} required maxLength={60} placeholder="Class 6 – 8" value={f.classes} onChange={(e) => setF({ ...f, classes: e.target.value })} /></Field>}
    <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>;
  const extra = <><button type="button" className={small} onClick={() => setAdding(true)}>+ Add {noun}</button>{empty && setup}</>;
  if (tab === "fee-categories") {
    const all = cats.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Fee categories", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
        <ListPanel title="Fee categories" noun="categories" search={search} onSearch={setSearch} exportName="fee-categories" head={["Category", "Fee heads", "Highest annual amount", "Status"]} exportRows={rows.map((x) => [x.name, x.heads.join(", "), x.max_annual, x.status])} extra={extra}
          tableHead={["Category", "Fee heads", "Highest annual amount", "Status", ""]} empty={cats.loading ? "Loading…" : "No categories yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.heads.join(", ") || "—", x.max_annual ? inr(x.max_annual) : "—", <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: x.name, rows: [["Fee heads", x.heads.join(", ") || "—"], ["Status", x.status]], patch: ["categories", x.id] })}>View details</button>])} />
        {detail}{addModal}
      </div>
    );
  }
  if (tab === "fee-heads") {
    const all = hds.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Fee heads", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
        <ListPanel title="Fee heads" noun="heads" search={search} onSearch={setSearch} exportName="fee-heads" head={["Fee head", "Category", "Frequency", "Optional", "Status"]} exportRows={rows.map((x) => [x.name, x.category, x.frequency, x.optional, x.status])} extra={extra}
          tableHead={["Fee head", "Category", "Frequency", "Optional", "Status", ""]} empty={hds.loading ? "Loading…" : "No fee heads yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.category || "—", x.frequency, x.optional, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: x.name, rows: [["Category", x.category || "—"], ["Frequency", x.frequency], ["Optional", x.optional], ["Status", x.status]], patch: ["heads", x.id] })}>View details</button>])} />
        {detail}{addModal}
      </div>
    );
  }
  const all = grp.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <Tiles items={[{ label: "Fee groups", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Fee groups" noun="groups" search={search} onSearch={setSearch} exportName="fee-groups" head={["Group", "Classes", "Annual fee", "Students", "Status"]} exportRows={rows.map((x) => [x.name, x.classes, x.annual, x.students, x.status])} extra={extra}
        tableHead={["Group", "Classes", "Annual fee", "Students", "Status", ""]} empty={grp.loading ? "Loading…" : "No fee groups yet."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.classes, inr(x.annual), x.students, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: x.name, rows: [["Classes", x.classes], ["Annual fee", inr(x.annual)], ["Students", x.students], ["Status", x.status]] })}>View details</button>])} />
      {detail}{addModal}
    </div>
  );
}

// ═════════════ structure ═════════════
interface Struct { heads: { id: string; name: string }[]; all_heads: { id: string; name: string }[]; items: { id: string; name: string; classes: string; amounts: Record<string, number>; total: number }[] }
interface Over { section_id: string; head_id: string; label: string; stream: string; head: string; group_amount: number; amount: number }
interface Opt { id: string; name: string; kind: string; amount_year: number; details: string; status: string; opted: number }
export type StructTab = "class-wise" | "section-wise" | "optional-fees";
export function FeeStructurePages({ tab }: { tab: StructTab }) {
  const st = useLoad(() => schoolFetch<Struct>(`${F}/structure`), []);
  const sw = useLoad(() => (tab === "section-wise" ? schoolFetch<{ items: Over[] }>(`${F}/section-wise`) : Promise.resolve(null)), [tab]);
  const op = useLoad(() => (tab === "optional-fees" ? schoolFetch<{ items: Opt[] }>(`${F}/optional`) : Promise.resolve(null)), [tab]);
  const secs = useLoad(() => (tab === "section-wise" ? schoolFetch<{ items: { id: string; label: string }[] }>("/school/section-rows") : Promise.resolve(null)), [tab]);
  const act = useAction(() => { st.reload(); sw.reload(); op.reload(); });
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Struct["items"][number] | null>(null);
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [view, setView] = useState<{ title: string; rows: [string, string | number][] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ section_id: "", head_id: "", amount: "", stream: "", name: "", kind: "Transport", amount_year: "", details: "" });
  const err = <ErrorBanner message={st.error || sw.error || op.error || secs.error || act.error} />;
  const detail = <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={() => setView(null)} /></>}</Modal>;
  if (tab === "class-wise") {
    const d = st.data;
    const save = async () => { if (edit && await act.run(() => schoolFetch(`${F}/structure`, json("PUT", { group_id: edit.id, amounts: Object.fromEntries((d?.all_heads ?? []).map((h) => [h.id, Number(amt[h.id] ?? edit.amounts[h.id] ?? 0) || 0])) })))) setEdit(null); };
    return (
      <div>{err}
        <Panel title="Fee structure" sub="₹ per year">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Group</th><th className="px-3 py-2.5 font-medium">Classes</th>{d?.heads.map((h) => <th key={h.id} className="px-3 py-2.5 font-medium">{h.name.replace(/ fee$/i, "")}</th>)}<th className="px-3 py-2.5 font-medium">Total</th><th /></tr></thead>
            <tbody>{d?.items.map((g) => <tr key={g.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold text-slate-900">{g.name}</td><td className="px-3 py-3">{g.classes}</td>{d.heads.map((h) => <td key={h.id} className="px-3 py-3">{g.amounts[h.id] ? inr(g.amounts[h.id]) : "—"}</td>)}<td className="px-3 py-3 font-semibold">{inr(g.total)}</td><td className="px-3 py-3 text-right"><button type="button" className={small} onClick={() => { setEdit(g); setAmt({}); }}>Edit</button></td></tr>)}
              {!d?.items.length && <tr><td colSpan={9} className="p-6 text-center text-slate-400">{st.loading ? "Loading…" : "No fee groups yet. Add them in Fee Configuration › Fee Groups."}</td></tr>}</tbody></table></div>
        </Panel>
        <Modal open={!!edit} title={`Edit ${edit?.name ?? ""}`} onClose={() => setEdit(null)}><div className="space-y-3">{d?.all_heads.map((h) => <Field key={h.id} label={`${h.name} (₹ a year)`}><input type="number" min={0} className={inputCls} value={amt[h.id] ?? String(edit?.amounts[h.id] ?? 0)} onChange={(e) => setAmt({ ...amt, [h.id]: e.target.value })} /></Field>)}<div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save</button></div></div></Modal>
      </div>
    );
  }
  if (tab === "section-wise") {
    const rows = (sw.data?.items ?? []).filter((x) => has(x, search));
    const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/section-wise`, json("PUT", { section_id: f.section_id || secs.data?.items[0]?.id, head_id: f.head_id || st.data?.all_heads[0]?.id, amount: Number(f.amount), stream: f.stream })))) setAdding(false); };
    return (
      <div data-report>{err}
        <ListPanel title="Section differences" noun="sections" search={search} onSearch={setSearch} exportName="section-wise-fees" head={["Section", "Stream", "Fee head", "Group amount", "This section"]} exportRows={rows.map((x) => [x.label, x.stream, x.head, x.group_amount, x.amount])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add difference</button>} tableHead={["Section", "Stream", "Fee head", "Group amount", "This section", ""]} empty={sw.loading ? "Loading…" : "No section pays differently from its group."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.label}</b>, x.stream || "—", <span key="h" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{x.head}</span>, <span key="g" className="block text-right">{inr(x.group_amount)}</span>, <span key="a" className="block text-right">{inr(x.amount)}</span>, <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => setView({ title: x.label, rows: [["Stream", x.stream || "—"], ["Fee head", x.head], ["Group amount", inr(x.group_amount)], ["This section", inr(x.amount)]] })}>View details</button><button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${F}/section-wise/${x.section_id}/${x.head_id}`, { method: "DELETE" }))}>Remove</button></span>])} />
        {detail}
        <Modal open={adding} title="Add a section difference" onClose={() => setAdding(false)}><form onSubmit={submit} className="space-y-3">
          <Field label="Section"><select className={inputCls} value={f.section_id || secs.data?.items[0]?.id || ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{secs.data?.items.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Fee head"><select className={inputCls} value={f.head_id || st.data?.all_heads[0]?.id || ""} onChange={(e) => setF({ ...f, head_id: e.target.value })}>{st.data?.all_heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Amount for this section (₹ a year)"><input type="number" min={0} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Stream"><input className={inputCls} maxLength={60} placeholder="Science (PCM)" value={f.stream} onChange={(e) => setF({ ...f, stream: e.target.value })} /></Field></div><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  const all = op.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/optional`, json("POST", { name: f.name, kind: f.kind, amount_year: Number(f.amount_year), details: f.details })))) { setAdding(false); setF({ ...f, name: "", amount_year: "", details: "" }); } };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Optional fees", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Optional fees" noun="fees" search={search} onSearch={setSearch} exportName="optional-fees" head={["Fee", "Amount per year", "Students opted", "Status"]} exportRows={rows.map((x) => [x.name, `${inr(x.amount_year)}${x.details ? ` (${x.details})` : ""}`, x.opted, x.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add fee</button>} tableHead={["Fee", "Amount per year", "Students opted", "Status", ""]} empty={op.loading ? "Loading…" : "No optional fees yet."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, `${inr(x.amount_year)}${x.details ? ` (${x.details})` : ""}`, x.opted, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: x.name, rows: [["Type", x.kind], ["Amount per year", inr(x.amount_year)], ["Details", x.details || "—"], ["Students opted", x.opted], ["Status", x.status]] })}>View details</button>])} />
      {detail}
      <Modal open={adding} title="Add an optional fee" onClose={() => setAdding(false)}><form onSubmit={submit} className="space-y-3">
        <Field label="Fee"><input className={inputCls} required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["Transport", "Hostel", "Mess", "Other"].map((k) => <option key={k}>{k}</option>)}</select></Field><Field label="Amount (₹ a year)"><input type="number" min={0} required className={inputCls} value={f.amount_year} onChange={(e) => setF({ ...f, amount_year: e.target.value })} /></Field></div>
        <Field label="Details"><input className={inputCls} maxLength={160} placeholder="₹9,000 a term" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ collection ═════════════
interface Dues { student: { id: string; name: string; class_label: string; registration_no: string }; has_plan: boolean; lines: { key: string; label: string; due: number }[]; outstanding: number; overdue: boolean; history: { id: string; receipt_no: string; total: number; paid_on: string; mode: string; collected_at: string; status: string }[] }
export interface Rcpt { id: string; receipt_no: string; school: string; address: string; student: string; class_label: string; registration_no: string; mode: string; reference: string | null; concession: number; total: number; paid_on: string; status: string; cancel_reason: string | null; lines: { label: string; amount: number }[] }
/** The receipt as it prints: school, details, the fees paid and the total. */
export function printReceipt(r: Rcpt, duplicate = false) {
  const e = escapeHtml;
  const rows: [string, string][] = [["Receipt no.", r.receipt_no], ["Date", day(r.paid_on)], ["Student", r.student], ["Class", r.class_label], ["Admission no.", r.registration_no]];
  printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${e(r.receipt_no)}</title><style>body{font:13px Arial,sans-serif;color:#111;padding:24px;max-width:560px;margin:auto}h1{text-align:center;margin:0;font-size:18px}.s{text-align:center;color:#555;font-size:11px;border-bottom:1px solid #111;padding-bottom:8px;margin:4px 0 14px}h2{text-align:center;font-size:14px;margin:0 0 12px}h2 span{font-size:10px;border:1px solid #999;padding:1px 6px;margin-left:6px;color:#555}table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;text-align:left}.k td:first-child{color:#666;width:130px}.f{margin-top:12px}.f th{background:#eef2f6;font-size:10px;text-transform:uppercase;color:#555}.f td{border-bottom:1px solid #e3e3e3}.r{text-align:right}.n{color:#666;font-size:11px;margin-top:12px}.g{display:flex;justify-content:space-between;margin-top:46px;font-size:11px;color:#555}.g div{border-top:1px solid #888;padding-top:4px;min-width:110px;text-align:center}</style></head><body><h1>${e(r.school)}</h1><p class="s">${e(r.address || "")}</p><h2>FEE RECEIPT${duplicate ? "<span>DUPLICATE</span>" : ""}${r.status === "Cancelled" ? "<span>CANCELLED</span>" : ""}</h2><table class="k">${rows.map(([k, v]) => `<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join("")}</table><table class="f"><tr><th>Fee</th><th class="r">Amount</th></tr>${r.lines.map((l) => `<tr><td>${e(l.label)}</td><td class="r">${inr(l.amount)}</td></tr>`).join("")}${r.concession ? `<tr><td>Concession</td><td class="r">- ${inr(r.concession)}</td></tr>` : ""}<tr><td><b>Total paid</b></td><td class="r"><b>${inr(r.total)}</b></td></tr></table><p class="n">Paid by ${e(r.mode)}${r.reference ? ` · Ref ${e(r.reference)}` : ""}. This is a computer-generated receipt.</p><div class="g"><div>Cashier</div><div>School seal</div></div></body></html>`);
}
export function CollectBox({ studentId, collectedAt, onDone }: { studentId: string; collectedAt: "Counter" | "Online"; onDone: (m: string) => void }) {
  const d = useLoad(() => (studentId ? schoolFetch<Dues>(`${F}/dues/${studentId}`) : Promise.resolve(null)), [studentId]);
  const act = useAction(() => d.reload());
  const [off, setOff] = useState<string[]>([]);
  const [f, setF] = useState({ mode: collectedAt === "Online" ? "UPI" : "Cash", reference: "", concession: "0", status: "Paid" });
  const x = d.data;
  const chosen = (x?.lines ?? []).filter((l) => !off.includes(l.key));
  const sum = chosen.reduce((n, l) => n + l.due, 0);
  const go = async () => { let rec = ""; if (await act.run(async () => { const r = await schoolFetch<{ receipt_no: string }>(`${F}/collect`, json("POST", { student_id: studentId, line_keys: chosen.map((l) => l.key), mode: f.mode, reference: f.reference, concession: Number(f.concession) || 0, collected_at: collectedAt, status: collectedAt === "Online" ? f.status : undefined })); rec = r.receipt_no; })) { setOff([]); setF({ ...f, concession: "0", reference: "" }); onDone(`Saved as ${rec}.`); if (collectedAt === "Counter") { const p = await schoolFetch<{ items: { id: string; receipt_no: string }[] }>(`${F}/payments?collected_at=Counter`); const id = p.items.find((i) => i.receipt_no === rec)?.id; if (id) printReceipt(await schoolFetch<Rcpt>(`${F}/receipt/${id}`)); } } };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"><ErrorBanner message={d.error || act.error} />
      <Sec><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Dues for {x?.student.name}</h2><span className="text-xs text-slate-500">{x?.student.class_label} · {x?.student.registration_no}</span></div>
        {x && !x.has_plan && <p className="px-5 py-4 text-[13px] text-slate-600">This student has no fee group yet. Assign one in Student Fee Assignment.</p>}
        {x?.lines.length ? <table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="w-10 px-4 py-2.5" /><th className="px-3 py-2.5 font-medium">Fee</th><th className="px-3 py-2.5 text-right font-medium">Amount</th></tr></thead><tbody>{x.lines.map((l) => <tr key={l.key} className="border-t border-slate-100"><td className="px-4 py-3"><input type="checkbox" aria-label={l.label} className="h-4 w-4 accent-[#026f9b]" checked={!off.includes(l.key)} onChange={() => setOff(off.includes(l.key) ? off.filter((k) => k !== l.key) : [...off, l.key])} /></td><td className="px-3 py-3">{l.label}</td><td className="px-3 py-3 text-right">{inr(l.due)}</td></tr>)}</tbody></table> : x?.has_plan ? <p className="px-5 py-6 text-center text-sm text-slate-400">Nothing is due right now.</p> : null}
        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-3"><Field label="Payment mode"><select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{["Cash", "UPI", "Card", "Cheque", "Bank"].map((m) => <option key={m}>{m}</option>)}</select></Field><Field label="Reference / UTR"><input className={inputCls} maxLength={60} placeholder="Optional" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field><Field label="Concession (₹)"><input type="number" min={0} className={inputCls} value={f.concession} onChange={(e) => setF({ ...f, concession: e.target.value })} /></Field>{collectedAt === "Online" && <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{["Paid", "Pending", "Failed"].map((m) => <option key={m}>{m}</option>)}</select></Field>}</div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-[14px]">Total <b>{inr(Math.max(0, sum - (Number(f.concession) || 0)))}</b></p><button type="button" className="rounded-full bg-[#e5413a] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#c9322c] disabled:opacity-50" disabled={act.busy || !chosen.length} onClick={() => void go()}>{collectedAt === "Counter" ? "Collect and print receipt" : "Record payment"}</button></div></Sec>
      <Sec><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Payment history</h2></div><ul>{x?.history.map((h) => <li key={h.id} className="flex items-start justify-between gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><div><p className="text-[13px] font-semibold text-slate-900">{inr(h.total)}</p><p className="text-[11px] text-slate-500">{h.mode} · {h.receipt_no}</p></div><div className="text-right"><p className="text-[11px] text-slate-500">{day(h.paid_on)}</p><Chip tone={tone(h.status)}>{h.status}</Chip></div></li>)}{!x?.history.length && <li className="px-5 py-8 text-center text-sm text-slate-400">No payments yet.</li>}</ul></Sec>
    </div>
  );
}

export function useStudent() {
  const roster = useRoster();
  const [pick, setPick] = useState("");
  const kids = roster.data?.items.filter((r) => r.status === "Enrolled") ?? [];
  const id = pick || kids[0]?.id || "";
  return { kids, id, setPick, error: roster.error };
}
export const StudentBar = ({ s, children }: { s: ReturnType<typeof useStudent>; children?: ReactNode }) => <Bar><Pill label="Student"><select aria-label="Student" value={s.id} onChange={(e) => s.setPick(e.target.value)} className={pillSel}>{!s.kids.length && <option value="">No students</option>}{s.kids.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_name}{k.section ? ` ${k.section}` : ""} · {k.registration_no}</option>)}</select></Pill>{children}</Bar>;

export type CollectTab = "collect-fee" | "counter-collection" | "online-collection";
export function FeeCollectionPages({ tab }: { tab: CollectTab }) {
  const s = useStudent();
  const status = useLoad(() => (tab === "collect-fee" && s.id ? schoolFetch<Dues>(`${F}/dues/${s.id}`) : Promise.resolve(null)), [tab, s.id]);
  const pay = useLoad(() => (tab !== "collect-fee" ? schoolFetch<{ items: { id: string; receipt_no: string; student: string; class_label: string; fee: string; total: number; mode: string; collected_at: string; paid_on: string; status: string }[] }>(`${F}/payments?collected_at=${tab === "counter-collection" ? "Counter" : "Online"}`) : Promise.resolve(null)), [tab]);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const act = useAction(() => pay.reload());
  const err = <ErrorBanner message={s.error || pay.error || act.error} />;
  if (tab === "collect-fee") return <div>{err}{okBox(msg)}<StudentBar s={s}>{status.data && <Chip tone={status.data.overdue ? "warn" : "good"}>{status.data.overdue ? "Overdue" : status.data.outstanding ? "Due" : "Up to date"}</Chip>}</StudentBar><CollectBox key={s.id} studentId={s.id} collectedAt="Counter" onDone={(m) => { setMsg(m); status.reload(); }} /></div>;
  const all = pay.data?.items ?? []; const rows = all.filter((x) => has(x, search));
  const n = (v: string) => all.filter((x) => x.status === v).length;
  const tiles = tab === "counter-collection" ? [{ label: "Fee payments", value: all.length, sub: "All records" }, { label: "Paid", value: n("Paid"), sub: `${pct(n("Paid"), all.length)} of shown` }, { label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }] : [{ label: "Fee payments", value: all.length, sub: "All records" }, { label: "Paid", value: n("Paid"), sub: `${pct(n("Paid"), all.length)} of shown` }, { label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }, { label: "Failed", value: n("Failed"), sub: `${pct(n("Failed"), all.length)} of shown` }];
  const show = async (id: string) => printReceipt(await schoolFetch<Rcpt>(`${F}/receipt/${id}`));
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <Tiles items={tiles} />
      <ListPanel title="Fee payments" noun="payments" search={search} onSearch={setSearch} exportName={tab} head={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status"]} exportRows={rows.map((x) => [x.receipt_no, x.student, x.class_label, x.fee, x.total, x.mode, x.collected_at, day(x.paid_on), x.status])}
        extra={tab === "online-collection" ? <button type="button" className={small} onClick={() => setOpen(true)}>+ Record online payment</button> : null}
        tableHead={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status", ""]} empty={pay.loading ? "Loading…" : "No payments yet."}
        rows={rows.map((x) => [x.receipt_no, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.fee, <span key="a" className="block text-right">{inr(x.total)}</span>, x.mode, x.collected_at, day(x.paid_on), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => void show(x.id)}>Print receipt</button>])} />
      <Modal open={open} title="Record an online payment" onClose={() => setOpen(false)}><StudentBar s={s} /><CollectBox key={s.id} studentId={s.id} collectedAt="Online" onDone={(m) => { setMsg(m); setOpen(false); pay.reload(); }} /></Modal>
    </div>
  );
}

// ═════════════ student fee assignment ═════════════
interface Plan { student: { id: string; name: string; class_label: string }; saved: boolean; group_id: string | null; transport_id: string | null; hostel_id: string | null; concession_pct: number; annual: number }
interface Conc { id: string; code: string; student: string; class_label: string; ctype: string; reason: string; amount: number; requested_on: string; status: "Pending" | "Approved" | "Rejected" }
export type AssignTab = "individual" | "bulk" | "scholarship" | "fee-changes" | "new-admissions";
export function StudentFeePages({ tab }: { tab: AssignTab }) {
  const s = useStudent();
  const grp = useLoad(() => schoolFetch<{ items: { id: string; name: string; classes: string }[] }>(`${F}/groups`), []);
  const opt = useLoad(() => schoolFetch<{ items: Opt[] }>(`${F}/optional`), []);
  const plan = useLoad(() => (tab === "individual" && s.id ? schoolFetch<Plan>(`${F}/plan/${s.id}`) : Promise.resolve(null)), [tab, s.id]);
  const cls = useLoad(() => (tab === "bulk" ? schoolFetch<{ items: { id: string; name: string }[] }>("/school/classes") : Promise.resolve(null)), [tab]);
  const secs = useLoad(() => (tab === "bulk" ? schoolFetch<{ items: { id: string; label: string }[] }>("/school/section-rows") : Promise.resolve(null)), [tab]);
  const con = useLoad(() => (tab === "scholarship" || tab === "fee-changes" ? schoolFetch<{ items: Conc[]; students: { id: string; name: string; class_label: string }[] }>(`${F}/concessions`) : Promise.resolve(null)), [tab]);
  const adm = useLoad(() => (tab === "new-admissions" ? schoolFetch<{ year: string; items: { student: string; class_label: string; registration_no: string; received: number; status: string }[] }>(`${F}/new-admissions`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { plan.reload(); con.reload(); });
  const [d, setD] = useState<Record<string, string>>({});
  const [b, setB] = useState({ grade_id: "", section_id: "", group_id: "", terms: "40,35,25", skip: true, sib: true });
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Conc | null>(null);
  const [adding, setAdding] = useState(false);
  const [cf, setCf] = useState({ student_id: "", ctype: "Scholarship", reason: "", amount: "" });
  const err = <ErrorBanner message={s.error || grp.error || opt.error || plan.error || cls.error || secs.error || con.error || adm.error || act.error} />;
  const groups = grp.data?.items ?? [];
  const bus = (opt.data?.items ?? []).filter((o) => o.kind === "Transport"); const host = (opt.data?.items ?? []).filter((o) => o.kind === "Hostel");
  if (tab === "individual") {
    const p = plan.data;
    const v = (k: string, cur: string) => d[k] ?? cur;
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (p && await act.run(() => schoolFetch(`${F}/plan/${s.id}`, json("PUT", { group_id: v("group", p.group_id ?? "") || null, transport_id: v("bus", p.transport_id ?? "") || null, hostel_id: v("host", p.hostel_id ?? "") || null, concession_pct: Number(v("pct", String(p.concession_pct))) })))) { setD({}); setMsg("Fees saved."); } };
    return (
      <div>{err}{okBox(msg)}<StudentBar s={s} />
        {p && <FormCard title={`Fees for ${p.student.name}`} cols="lg:grid-cols-4" onSubmit={save} onDiscard={() => { setD({}); setMsg(""); }} busy={act.busy} error="">
          <Field label="Fee group"><select className={inputCls} value={v("group", p.group_id ?? "")} onChange={(e) => setD({ ...d, group: e.target.value })}><option value="">None</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Bus fee"><select className={inputCls} value={v("bus", p.transport_id ?? "")} onChange={(e) => setD({ ...d, bus: e.target.value })}><option value="">None</option>{bus.map((o) => <option key={o.id} value={o.id}>{o.details || inr(o.amount_year)}</option>)}</select></Field>
          <Field label="Hostel"><select className={inputCls} value={v("host", p.hostel_id ?? "")} onChange={(e) => setD({ ...d, host: e.target.value })}><option value="">None</option>{host.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Concession"><select className={inputCls} value={v("pct", String(p.concession_pct))} onChange={(e) => setD({ ...d, pct: e.target.value })}>{[0, 5, 10, 15, 25, 50, 100].map((n) => <option key={n} value={n}>{n ? `${n}%` : "None"}</option>)}</select></Field>
          <p className="text-[13px] text-slate-600 sm:col-span-2 lg:col-span-4">Annual fee for this student: <b>{inr(p.annual)}</b>{!p.saved && p.group_id ? " (from the class; not saved yet)" : ""}</p>
        </FormCard>}
      </div>
    );
  }
  if (tab === "bulk") {
    const gid = b.grade_id || cls.data?.items[0]?.id || "";
    const [t1, t2, t3] = b.terms.split(",");
    const go = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ assigned: number; skipped: number; siblings: number }>(`${F}/bulk`, json("POST", { grade_id: gid, section_id: b.section_id || null, group_id: b.group_id || groups[0]?.id, terms: b.terms.split(",").map(Number), skip_existing: b.skip, siblings: b.sib })); t = `${r.assigned} students assigned${r.skipped ? `, ${r.skipped} already had fees` : ""}${r.siblings ? `, ${r.siblings} sibling discounts applied` : ""}.`; })) setMsg(t); };
    void t1; void t2; void t3;
    return (
      <div>{err}{okBox(msg)}
        <form onSubmit={go}><Sec><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Bulk assignment</h2></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Classes"><select className={inputCls} value={gid} onChange={(e) => setB({ ...b, grade_id: e.target.value })}>{cls.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Sections"><select className={inputCls} value={b.section_id} onChange={(e) => setB({ ...b, section_id: e.target.value })}><option value="">All sections</option>{secs.data?.items.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            <Field label="Fee group"><select className={inputCls} value={b.group_id || groups[0]?.id || ""} onChange={(e) => setB({ ...b, group_id: e.target.value })}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
            <Field label="Terms"><select className={inputCls} value={b.terms} onChange={(e) => setB({ ...b, terms: e.target.value })}><option value="40,35,25">3 terms (40 / 35 / 25)</option><option value="50,50">2 terms (50 / 50)</option><option value="100">1 term (100)</option><option value="25,25,25,25">4 terms (25 each)</option></select></Field></div>
          <Rw title="Skip students who already have fees"><Toggle checked={b.skip} onChange={(v) => setB({ ...b, skip: v })} label="Skip students who already have fees" /></Rw>
          <Rw title="Apply sibling discounts automatically" hint="10% for the younger child"><Toggle checked={b.sib} onChange={(v) => setB({ ...b, sib: v })} label="Apply sibling discounts automatically" /></Rw>
          <div className="flex justify-end gap-2.5 px-5 py-3"><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !groups.length}>{act.busy ? "Assigning…" : "Assign fees"}</button></div></Sec></form>
        {!groups.length && <p className="mt-4 text-sm text-slate-500">Set up fee groups first in Fee Configuration.</p>}
      </div>
    );
  }
  if (tab === "new-admissions") {
    const a = adm.data; const rows = (a?.items ?? []).filter((x) => has(x, search));
    return <div data-report>{err}<ListPanel title={`New fee accounts · ${a?.year ?? ""}`} noun="accounts" search={search} onSearch={setSearch} exportName="new-admissions-fees" head={["Student", "Class", "Admission no.", "Received", "Status"]} exportRows={rows.map((x) => [x.student, x.class_label, x.registration_no, x.received, x.status])} tableHead={["Student", "Class", "Admission no.", "Received", "Status"]} empty={adm.loading ? "Loading…" : "No students admitted this year yet."} rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.student}</b>, x.class_label, x.registration_no, inr(x.received), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>])} /></div>;
  }
  const all = (con.data?.items ?? []).filter((x) => (tab === "scholarship" ? x.ctype === "Scholarship" : x.status === "Approved"));
  if (tab === "fee-changes" && !all.length) return <div>{err}<p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">No approved requests change any fees yet.</p></div>;
  const rows = all.filter((x) => has(x, search)); const n = (v: string) => all.filter((x) => x.status === v).length;
  const decide = async (x: Conc, status: string) => { if (await act.run(() => schoolFetch(`${F}/concessions/${x.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/concessions`, json("POST", { student_id: cf.student_id || con.data?.students[0]?.id, ctype: cf.ctype, reason: cf.reason, amount: Number(cf.amount) })))) setAdding(false); };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Concessions", value: all.length, sub: "All records" }, { label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), all.length)} of shown` }, ...(tab === "scholarship" ? [{ label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }] : [])]} />
      <ListPanel title="Concessions" noun="concessions" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Student", "Class", "Type", "Reason", "Amount", "Requested", "Status"]} exportRows={rows.map((x) => [x.code, x.student, x.class_label, x.ctype, x.reason, x.amount, day(x.requested_on), x.status])}
        extra={tab === "scholarship" ? <button type="button" className={small} onClick={() => setAdding(true)}>+ New concession</button> : null} tableHead={["Ref.", "Student", "Class", "Type", "Reason", "Amount", "Requested", "Status", ""]} empty={con.loading ? "Loading…" : "None yet."}
        rows={rows.map((x) => [x.code, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.ctype, x.reason || "—", <span key="a" className="block text-right">{inr(x.amount)}</span>, day(x.requested_on), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Type" v={view.ctype} /><Row k="Reason" v={view.reason || "—"} /><Row k="Amount" v={inr(view.amount)} /><Row k="Requested" v={day(view.requested_on)} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={view.status === "Pending" ? <><button type="button" className={small} disabled={act.busy} onClick={() => void decide(view, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(view, "Approved")}>Approve</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title="New concession" onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
        <Field label="Student"><select className={inputCls} value={cf.student_id || con.data?.students[0]?.id || ""} onChange={(e) => setCf({ ...cf, student_id: e.target.value })}>{con.data?.students.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={cf.ctype} onChange={(e) => setCf({ ...cf, ctype: e.target.value })}>{["Scholarship", "Sibling", "Staff ward", "Financial aid", "Other"].map((t) => <option key={t}>{t}</option>)}</select></Field><Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={cf.amount} onChange={(e) => setCf({ ...cf, amount: e.target.value })} /></Field></div>
        <Field label="Reason"><input className={inputCls} maxLength={200} value={cf.reason} onChange={(e) => setCf({ ...cf, reason: e.target.value })} /></Field><p className="text-xs text-slate-500">Approving lowers that student&apos;s annual fee by this amount.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
void SimpleTable; void sel;
