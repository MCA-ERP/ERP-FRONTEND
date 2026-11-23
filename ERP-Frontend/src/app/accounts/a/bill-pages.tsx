"use client";

import Link from "next/link";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";

const blueBtn = "rounded-full bg-[#026f9b] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400";
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const person = (name: string, sub: string) => <div><p className="font-semibold text-slate-900">{name}</p><p className="text-[11px] text-slate-500">{sub}</p></div>;
const tone = (s: string): "good" | "bad" | "warn" => (s === "Paid" ? "good" : s === "Overdue" ? "bad" : "warn");
interface Term { term: number; name: string; due_date: string }

function Tile({ label, value, sub, bg, color }: { label: string; value: React.ReactNode; sub: string; bg: string; color?: string }) {
  return <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[26px] font-bold leading-tight tabular-nums ${color ?? "text-slate-900"}`}>{value}</p><p className="mt-0.5 text-xs text-slate-700">{sub}</p></div>;
}
const Tiles4 = ({ children }: { children: React.ReactNode }) => <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>{children}</div>;
function TermPick({ terms, term, onPick, withDue }: { terms: Term[]; term: number; onPick: (t: number) => void; withDue?: boolean }) {
  return <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Instalment<select aria-label="Instalment" value={term} onChange={(e) => onPick(Number(e.target.value))} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{terms.map((t) => <option key={t.term} value={t.term}>{t.name}{withDue ? ` · due ${dmy(t.due_date)}` : ""}</option>)}</select></label></div>;
}
const yr = () => { const n = new Date(); const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; return y; };
void yr;

// ═════════════ due list ═════════════
interface DueData { terms: Term[]; term: number; tiles: { demand: number; students: number; collected: number; paid: number; outstanding: number; owing: number; overdue: number }; items: { student_id: string; student: string; class_label: string; amount: number; late_fee: number; due_date: string; status: string }[] }
export function DueList() {
  const [term, setTerm] = useState(0);
  const r = useLoad(() => schoolFetch<DueData>(`/accounts/dues${term ? `?term=${term}` : ""}`), [term]);
  const [q, setQ] = useState(""); const [f, setF] = useState("All");
  const x = r.data;
  if (!x) return <><Head title="Due List" /><ErrorBanner message={r.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></>;
  const rows = x.items.filter((m) => has(m, q) && (f === "All" || m.status === f));
  const name = x.terms.find((t) => t.term === x.term)?.name ?? `Term ${x.term}`;
  return (
    <div>
      <Head title="Due List" subtitle="Instalment-wise dues, generated from each student's assigned structure." />
      <ErrorBanner message={r.error} />
      <TermPick terms={x.terms} term={x.term} onPick={setTerm} withDue />
      <Tiles4>
        <Tile label="Demand" value={inr(x.tiles.demand)} sub={`${x.tiles.students} students`} bg="bg-[#dceff9]" />
        <Tile label="Collected" value={inr(x.tiles.collected)} sub={`${x.tiles.paid} paid`} bg="bg-[#d9efe8]" />
        <Tile label="Outstanding" value={inr(x.tiles.outstanding)} sub={`${x.tiles.owing} students`} bg="bg-[#f8ecd6]" color="text-[#8a5a0b]" />
        <Tile label="Overdue" value={x.tiles.overdue} sub="Late fee applies" bg="bg-[#fce0df]" color="text-[#ac2c28]" />
      </Tiles4>
      <div className="mt-5"><ListPanel title={`${name} dues`} noun="dues" search={q} onSearch={setQ} exportName="due-list" head={["Student", "Class", "Amount", "Late fee", "Due date", "Status"]}
        extra={<select aria-label="Status" value={f} onChange={(e) => setF(e.target.value)} className={`${inputCls} !w-auto`}>{["All", "Paid", "Unpaid", "Overdue"].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [m.student, m.class_label, m.amount, m.late_fee, dmy(m.due_date), m.status])} tableHead={["Student", "Amount", "Late fee", "Due date", "Status", ""]}
        rows={rows.map((m) => [person(m.student, m.class_label), inr(m.amount), m.late_fee ? <span key="l" className="text-[#ac2c28]">{inr(m.late_fee)}</span> : "—", dmy(m.due_date), <Chip key="s" tone={tone(m.status)}>{m.status}</Chip>, m.status === "Paid" ? null : <Link key="c" href="/accounts/fee-collection/fee-collection" className={pillBtn}>Collect</Link>])} empty="No dues for this instalment." /></div>
    </div>
  );
}

// ═════════════ invoices ═════════════
interface InvData { terms: Term[]; term: number; tiles: { count: number; billed: number; paid_count: number; paid: number; unpaid: number; overdue: number }; items: { id: string; number: string; student: string; class_label: string; date: string; due_date: string; amount: number; paid: number; status: string; sent: boolean; sent_at: string | null }[] }
export function Invoices() {
  const [term, setTerm] = useState(0);
  const r = useLoad(() => schoolFetch<InvData>(`/accounts/invoices${term ? `?term=${term}` : ""}`), [term]);
  const [q, setQ] = useState(""); const [f, setF] = useState("All");
  const [view, setView] = useState<InvData["items"][number] | null>(null);
  const x = r.data;
  if (!x) return <><Head title="Invoices" /><ErrorBanner message={r.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></>;
  const rows = x.items.filter((m) => has(m, q) && (f === "All" || m.status === f));
  const name = x.terms.find((t) => t.term === x.term)?.name ?? `Term ${x.term}`;
  return (
    <div>
      <Head title="Invoices" subtitle="A numbered invoice for every student and instalment. Parents see it in the Parent portal and it can be printed." />
      <ErrorBanner message={r.error} />
      <TermPick terms={x.terms} term={x.term} onPick={setTerm} />
      <Tiles4>
        <Tile label="Invoices" value={x.tiles.count} sub={name} bg="bg-[#dceff9]" />
        <Tile label="Billed" value={inr(x.tiles.billed)} sub="Net of concessions" bg="bg-[#dceff9]" />
        <Tile label="Paid" value={inr(x.tiles.paid)} sub={`${x.tiles.paid_count} invoices`} bg="bg-[#d9efe8]" />
        <Tile label="Unpaid" value={inr(x.tiles.unpaid)} sub={`${x.tiles.overdue} overdue`} bg="bg-[#f8ecd6]" color="text-[#8a5a0b]" />
      </Tiles4>
      <div className="mt-5"><ListPanel title={`${name} invoices`} noun="invoices" search={q} onSearch={setQ} exportName="invoices" head={["Invoice", "Student", "Class", "Date", "Due", "Amount", "Status", "Sent"]}
        extra={<select aria-label="Status" value={f} onChange={(e) => setF(e.target.value)} className={`${inputCls} !w-auto`}>{["All", "Paid", "Unpaid", "Overdue"].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [m.number, m.student, m.class_label, dmy(m.date), dmy(m.due_date), m.amount, m.status, m.sent ? "Sent" : "Not sent"])} tableHead={["Invoice", "Student", "Date", "Due", "Amount", "Status", "Sent", ""]}
        rows={rows.map((m) => [m.number, person(m.student, m.class_label), dmy(m.date), dmy(m.due_date), inr(m.amount), <Chip key="s" tone={tone(m.status)}>{m.status}</Chip>, <Chip key="t" tone={m.sent ? "info" : "warn"}>{m.sent ? "Sent" : "Not sent"}</Chip>, <button key="v" type="button" className={pillBtn} onClick={() => setView(m)}>View</button>])} empty="No invoices for this instalment yet. Generate them from the next tab." /></div>
      <Modal open={!!view} title={view ? `Invoice ${view.number}` : ""} onClose={() => setView(null)}>
        {view && <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-[13px]">{([["Student", `${view.student} · ${view.class_label}`], ["Instalment", name], ["Invoice date", dmy(view.date)], ["Due date", dmy(view.due_date)], ["Amount", inr(view.amount)], ["Paid so far", inr(view.paid)], ["Balance", inr(view.amount - view.paid)], ["Status", view.status], ["Sent to parent", view.sent_at ? new Date(view.sent_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not sent"]] as [string, string][]).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>}
      </Modal>
    </div>
  );
}

// ═════════════ generate invoices ═════════════
interface GenData { terms: Term[]; term: number; due_date: string | null; items: { student_id: string; student: string; class_label: string; amount: number; concession: string }[]; classes: string[]; total: number; today: string }
export function GenerateInvoices({ go }: { go: (tab: string) => void }) {
  const [term, setTerm] = useState(0); const [cls, setCls] = useState("");
  const r = useLoad(() => schoolFetch<GenData>(`/accounts/invoices/generate?${term ? `term=${term}&` : ""}class_label=${encodeURIComponent(cls)}`), [term, cls]);
  const act = useAction(() => r.reload());
  const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  const x = r.data;
  if (!x) return <><Head title="Generate Invoices" /><ErrorBanner message={r.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></>;
  const rows = x.items.filter((m) => has(m, q));
  const name = x.terms.find((t) => t.term === x.term)?.name ?? `Term ${x.term}`;
  const run = async () => { setMsg(""); await act.run(async () => { const g = await schoolFetch<{ generated: number; notified: number; total: number }>("/accounts/invoices/generate", json("POST", { term: x.term, class_label: cls || undefined })); setMsg(`${g.generated} invoices generated for ${inr(g.total)}. ${g.notified} parents were notified in the Parent portal.`); }); };
  return (
    <div className="space-y-5">
      <Head title="Generate Invoices" subtitle={`Create ${name} invoices from each student's dues, then send them to parents.`} />
      <ErrorBanner message={r.error || act.error} />
      {msg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">{msg} <button type="button" className="font-semibold underline" onClick={() => go("invoices")}>View invoices</button></p>}
      <Panel title={`Generate invoices · ${name}`} sub={x.due_date ? `Due ${dmy(x.due_date)}` : ""}>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="text-[12px] text-slate-700">Instalment<select className={`${inputCls} mt-1`} value={x.term} onChange={(e) => setTerm(Number(e.target.value))}>{x.terms.map((t) => <option key={t.term} value={t.term}>{t.name} · due {dmy(t.due_date)}</option>)}</select></label>
          <label className="text-[12px] text-slate-700">Classes<select className={`${inputCls} mt-1`} value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All classes</option>{x.classes.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-[14px] text-slate-700">{x.items.length} invoices · <b className="text-slate-900">{inr(x.total)}</b> <span className="text-[12px] text-slate-500">Invoice date {dmy(x.today)}</span></p><button type="button" className={blueBtn} disabled={act.busy || !x.items.length} onClick={() => void run()}>Generate {x.items.length} invoices</button></div>
      </Panel>
      <ListPanel title={`Waiting for ${name} invoice`} noun="students" search={q} onSearch={setQ} exportName="invoices-waiting" head={["Student", "Class", "Amount", "Concession"]}
        exportRows={rows.map((m) => [m.student, m.class_label, m.amount, m.concession])} tableHead={["Student", "Amount", "Concession"]}
        rows={rows.map((m) => [person(m.student, m.class_label), inr(m.amount), m.concession])} empty="Every student already has an invoice for this instalment." />
    </div>
  );
}
