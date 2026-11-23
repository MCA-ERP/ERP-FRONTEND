"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";
import { short } from "./dash-pages";

const blueBtn = "rounded-full bg-[#026f9b] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400";
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const Tile = ({ label, value, sub, bg, color }: { label: string; value: React.ReactNode; sub: string; bg: string; color?: string }) => <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[26px] font-bold leading-tight tabular-nums ${color ?? "text-slate-900"}`}>{value}</p><p className="mt-0.5 text-xs text-slate-700">{sub}</p></div>;
const Tiles4 = ({ children }: { children: React.ReactNode }) => <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>{children}</div>;
const tone = (s: string): "good" | "bad" | "warn" => (s === "Approved" ? "good" : s === "Rejected" ? "bad" : "warn");
const monthName = () => new Date().toLocaleDateString("en-IN", { month: "long", timeZone: "Asia/Kolkata" });
const yearLabel = (ys: string) => `${ys.slice(0, 4)}–${String((Number(ys.slice(0, 4)) + 1) % 100).padStart(2, "0")}`;

// ═════════════ expenses ═════════════
interface Exp { id: string; voucher: string; category: string; paid_to: string; amount: number; mode: string | null; spent_on: string; status: string; approver: string }
interface Summary { year_start: string; tiles: { month: number; year: number; waiting: number; waiting_amount: number; count: number }; by_month: { label: string; total: number; current: boolean }[]; by_head: { label: string; total: number }[] }

export function Expenses() {
  const s = useLoad(() => schoolFetch<Summary>("/accounts/expense-summary"), []);
  const l = useLoad(() => schoolFetch<{ items: Exp[] }>("/school/fees/expenses"), []);
  const [q, setQ] = useState(""); const [f, setF] = useState("All"); const [view, setView] = useState<Exp | null>(null);
  const rows = (l.data?.items ?? []).filter((m) => has(m, q) && (f === "All" || m.status === f));
  const t = s.data?.tiles;
  return (
    <div>
      <Head title="Expenses" subtitle="Every expense with its bill. Bills above the category's limit need the Principal's approval before payment." />
      <ErrorBanner message={s.error || l.error} />
      {t && <Tiles4>
        <Tile label="This month" value={inr(t.month)} sub={`${monthName()} so far`} bg="bg-[#dceff9]" />
        <Tile label="This year" value={inr(t.year)} sub="Approved expenses" bg="bg-[#dceff9]" />
        <Tile label="Waiting for approval" value={t.waiting} sub={inr(t.waiting_amount)} bg="bg-[#f8ecd6]" color="text-[#8a5a0b]" />
        <Tile label="Expenses" value={t.count} sub="This year" bg="bg-[#dceff9]" />
      </Tiles4>}
      <div className="mt-5"><ListPanel title="Expenses" noun="expenses" search={q} onSearch={setQ} exportName="expenses" head={["Voucher", "Date", "Head", "Vendor", "Amount", "Status"]}
        extra={<select aria-label="Status" value={f} onChange={(e) => setF(e.target.value)} className={`${inputCls} !w-auto`}>{["All", "Pending", "Approved", "Rejected"].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [m.voucher, dmy(m.spent_on), m.category, m.paid_to, m.amount, m.status])} tableHead={["Voucher", "Date", "Head", "Vendor", "Amount", "Status", ""]}
        rows={rows.map((m) => [m.voucher, dmy(m.spent_on), m.category, <b key="v">{m.paid_to}</b>, inr(m.amount), <span key="s" className="flex items-center gap-1.5"><Chip tone={tone(m.status)}>{m.status}</Chip>{m.mode && <span className="text-[11px] text-slate-500">{m.mode}</span>}</span>, <button key="b" type="button" className={pillBtn} onClick={() => setView(m)}>View</button>])} empty="No expenses yet." /></div>
      <Modal open={!!view} title={view ? `Expense ${view.voucher}` : ""} onClose={() => setView(null)}>
        {view && <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-[13px]">{([["Date", dmy(view.spent_on)], ["Head", view.category], ["Vendor", view.paid_to], ["Amount", inr(view.amount)], ["Paid by", view.mode ?? "—"], ["Approver", view.approver || "—"], ["Status", view.status]] as [string, string][]).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>}
      </Modal>
    </div>
  );
}

// ═════════════ expense summary ═════════════
export function ExpenseSummary() {
  const r = useLoad(() => schoolFetch<Summary>("/accounts/expense-summary"), []);
  const x = r.data;
  if (!x) return <><Head title="Expense Summary" /><ErrorBanner message={r.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></>;
  const max = Math.max(1, ...x.by_month.map((m) => m.total)); const hmax = Math.max(1, ...x.by_head.map((h) => h.total));
  const top = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  return (
    <div className="space-y-5">
      <Head title="Expense Summary" subtitle="Where the money goes: approved expenses by head and by month, whole school." />
      <Panel title="Expenses by month" sub={yearLabel(x.year_start)}>
        <div className="px-5 pb-4 pt-5">
          <div className="relative flex h-56 items-end gap-3 border-b border-slate-200 pl-14">
            {[1, 0.5, 0].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ bottom: `${f * 100}%` }}><span className="absolute -top-2.5 left-0 w-12 text-right text-[12px] text-slate-500">{short(top * f)}</span></div>)}
            {x.by_month.map((m) => <div key={m.label} className="relative z-10 flex h-full flex-1 items-end"><div title={inr(m.total)} className={`w-full rounded-t-md ${m.current ? "bg-[#c0e4f3]" : "bg-[#7fcbe8]"}`} style={{ height: `${Math.max(1, (m.total / top) * 100)}%` }} /></div>)}
          </div>
          <div className="flex gap-3 pl-14">{x.by_month.map((m) => <span key={m.label} className="flex-1 pt-2 text-center text-[13px] text-slate-700">{m.label}</span>)}</div>
          <p className="mt-3 text-[11px] text-slate-500">{monthName()} is month to date.</p>
        </div>
      </Panel>
      <Panel title="By expense head" sub={`Total ${inr(x.tiles.year)} since ${dmy(x.year_start)}`}>
        {x.by_head.length ? <div className="space-y-3 px-5 py-4">{x.by_head.map((h) => <div key={h.label} className="flex items-center gap-3 text-[12.5px]"><span className="w-44 shrink-0 truncate text-slate-900">{h.label}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${(h.total / hmax) * 100}%` }} /></span><span className="w-28 text-right tabular-nums text-slate-700">{inr(h.total)}</span></div>)}</div> : <p className="p-6 text-center text-sm text-slate-400">No approved expenses yet.</p>}
      </Panel>
    </div>
  );
}

// ═════════════ vendors ═════════════
export function Vendors() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; name: string; supplies: string; usual_head: string; paid_this_year: number }[]; categories: { id: string; name: string }[] }>("/accounts/vendors"), []);
  const act = useAction(() => r.reload());
  const [q, setQ] = useState(""); const blank = { name: "", supplies: "", category_id: "", gstin: "" }; const [f, setF] = useState(blank);
  const rows = (r.data?.items ?? []).filter((m) => has(m, q));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/accounts/vendors", json("POST", { name: f.name, supplies: f.supplies, category_id: f.category_id || null, gstin: f.gstin || "" })))) setF(blank); };
  return (
    <div className="space-y-5">
      <Head title="Vendors" subtitle="Suppliers the school pays, with the expense head each one usually goes to." />
      <ErrorBanner message={r.error || act.error} />
      <ListPanel title="Vendors" noun="vendors" search={q} onSearch={setQ} exportName="vendors" head={["Code", "Vendor", "Supplies", "Usual head", "Paid this year"]}
        exportRows={rows.map((m) => [m.code, m.name, m.supplies, m.usual_head, m.paid_this_year])} tableHead={["Code", "Vendor", "Supplies", "Usual head", "Paid this year"]}
        rows={rows.map((m) => [m.code, <b key="n">{m.name}</b>, m.supplies || "—", m.usual_head, inr(m.paid_this_year)])} empty="No vendors yet. Add the first below." />
      <Panel title="New vendor">
        <form onSubmit={save}>
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <label className="text-[12px] text-slate-700">Name<input className={`${inputCls} mt-1`} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Supplies<input className={`${inputCls} mt-1`} maxLength={120} value={f.supplies} onChange={(e) => setF({ ...f, supplies: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Usual head<select className={`${inputCls} mt-1`} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">—</option>{r.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-[12px] text-slate-700">GSTIN<input className={`${inputCls} mt-1`} maxLength={15} placeholder="Optional" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} /></label>
          </div>
          <div className="flex justify-end border-t border-slate-100 p-4"><button type="submit" className={blueBtn} disabled={act.busy}>Add vendor</button></div>
        </form>
      </Panel>
    </div>
  );
}

// ═════════════ student ledger ═════════════
export function StudentLedger() {
  const list = useLoad(() => schoolFetch<{ items: { id: string; name: string; class_label: string }[] }>("/accounts/parent-pay/students"), []);
  const [sid, setSid] = useState(""); const pick = sid || list.data?.items[0]?.id || "";
  const l = useLoad(() => (pick ? schoolFetch<{ student: { name: string }; items: { date: string; particulars: string; debit: number; credit: number; balance: number }[]; balance: number }>(`/accounts/student-ledger/${pick}`) : Promise.resolve(null)), [pick]);
  const [q, setQ] = useState("");
  const x = l.data; const rows = (x?.items ?? []).filter((m) => has(m, q));
  return (
    <div>
      <Head title="Student Ledger" subtitle="The student's fee account: every demand, late fee and payment, with a running balance." />
      <ErrorBanner message={list.error || l.error} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Student<select aria-label="Student" value={pick} onChange={(e) => setSid(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{list.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_label}</option>)}</select></label>
        {x && <span className="ml-auto text-[12px] text-slate-500">Balance due: {inr(x.balance)}</span>}
      </div>
      <ListPanel title={`Fee ledger · ${x?.student.name ?? ""}`} noun="entries" search={q} onSearch={setQ} exportName="student-ledger" head={["Date", "Particulars", "Debit", "Credit", "Balance"]}
        exportRows={rows.map((m) => [dmy(m.date), m.particulars, m.debit || "", m.credit || "", m.balance])} tableHead={["Date", "Particulars", "Debit", "Credit", "Balance"]}
        rows={rows.map((m) => [dmy(m.date), m.particulars, m.debit ? inr(m.debit) : "", m.credit ? inr(m.credit) : "", inr(m.balance)])} empty="No entries yet for this student." />
    </div>
  );
}
