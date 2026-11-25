"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { rupees } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, pill, solid } from "./ui";

/** How this month's attendance and leave affect pay, and each statutory deduction. */
const P = "/school/pay";
const nowMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const KV = ({ rows }: { rows: [string, string | number][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;

interface Line { id: string; name: string; emp_code: string; gross: number; working_days: number; present: number; paid_leave: number; lop: number; lop_amount: number }
export function AttendanceCalculation({ view }: { view: "working" | "paid" | "lop" }) {
  const month = nowMonth();
  const { data, error, loading } = useLoad(() => schoolFetch<{ working_days: number; items: Line[] }>(`${P}/attendance?month=${month}`), [month]);
  const [open, setOpen] = useState<Line | null>(null);
  const all = data?.items ?? [];
  const rows = view === "paid" ? all.filter((r) => r.paid_leave > 0) : view === "lop" ? all.filter((r) => r.lop > 0) : all;
  const title = { working: "Working days", paid: "Paid leave", lop: "Loss of pay" }[view];
  const head = { working: ["Working Days", `Days worked in ${monthName(month)}${data ? ` out of ${data.working_days} working days` : ""}.`], paid: ["Paid Leave", "Approved leave that's paid in full."], lop: ["Loss of Pay", "Unpaid days. One day's pay is the monthly gross divided by 30."] }[view];
  return (
    <div data-report>
      <Head title={head[0]} subtitle={head[1]} />
      <ErrorBanner message={error} />
      <Table key={view} title={`${title} · ${monthName(month)}`} noun="staff" exportName={`${view}-${month}`} empty={loading ? "Loading…" : view === "paid" ? "Nobody has paid leave this month." : view === "lop" ? "Nobody has loss of pay this month." : "No staff yet."}
        head={[{ h: "Staff" }, { h: "Working days" }, { h: "Present" }, { h: "Paid leave" }, { h: "Loss of pay" }, { h: "LOP amount" }, { h: "" }]}
        rows={rows.map((r) => ({ key: r.id, find: `${r.name} ${r.emp_code}`, out: [r.name, r.working_days, r.present, r.paid_leave, r.lop, r.lop_amount], cells: [name(r.name, r.emp_code), r.working_days, r.present, r.paid_leave, r.lop, r.lop_amount ? rupees(r.lop_amount) : "—", <button key="v" type="button" className={pill} onClick={() => setOpen(r)}>View details</button>] }))} />
      {open && <Modal open title={`${open.name} · ${open.emp_code}`} onClose={() => setOpen(null)}><KV rows={[["Monthly gross", rupees(open.gross)], ["Working days", open.working_days], ["Present", open.present], ["Paid leave", open.paid_leave], ["Loss of pay", `${open.lop} days`], ["LOP amount", open.lop_amount ? rupees(open.lop_amount) : "—"]]} /></Modal>}
    </div>
  );
}

interface Structure { id: string; name: string; emp_code: string; designation: string; basic: number; gross: number; pf: number; esi: number; pt: number; other: number }
const KINDS = {
  pf: ["PF", "Provident fund: 12% of basic, capped at ₹1,800 a month."],
  esi: ["ESI", "Employee State Insurance: 0.75% for staff earning up to ₹21,000."],
  pt: ["Professional Tax", "Professional tax as per the Telangana slab."],
  other: ["Other Applicable Deductions", "Income tax deducted at source, as per each person's declaration."],
} as const;

export function Deductions({ kind }: { kind: keyof typeof KINDS }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Structure[] }>(`${P}/structures`), []);
  const act = useAction(reload);
  const [open, setOpen] = useState<Structure | null>(null);
  const [adding, setAdding] = useState<{ id: string; amount: string } | null>(null);
  const all = data?.items ?? [];
  const rows = all.filter((s) => s[kind] > 0);
  const [title, subtitle] = KINDS[kind];
  const save = async (e: FormEvent) => { e.preventDefault(); if (adding && await act.run(() => schoolFetch(`${P}/other-deduction/${adding.id}`, json("PUT", { amount: Number(adding.amount) || 0 })))) { setAdding(null); setOpen(null); } };
  const amount = (id: string) => String(all.find((s) => s.id === id)?.other ?? 0);
  return (
    <div data-report className="space-y-5">
      <Head title={title} subtitle={subtitle} />
      <ErrorBanner message={error || act.error} />
      <Tiles><Tile label="Staff covered" value={`${rows.length} shown`} /><Tile label="This month" value={rupees(rows.reduce((n, s) => n + s[kind], 0))} sub="Employee share" /></Tiles>
      {kind === "other" && all.length > 0 && <button type="button" className={pill} onClick={() => setAdding({ id: all[0].id, amount: amount(all[0].id) })}>Set an amount for a staff member</button>}
      <Table key={kind} title={title} noun="staff" exportName={kind} empty={loading ? "Loading…" : "Nobody has this deduction."}
        head={[{ h: "Staff" }, { h: "Gross" }, { h: title }, { h: "" }]}
        rows={rows.map((s) => ({ key: s.id, find: `${s.name} ${s.emp_code}`, out: [s.name, s.gross, s[kind]], cells: [name(s.name, s.emp_code), rupees(s.gross), rupees(s[kind]), <button key="v" type="button" className={pill} onClick={() => setOpen(s)}>View details</button>] }))} />
      {open && !adding && (
        <Modal open title={`${open.name} · ${open.emp_code}`} onClose={() => setOpen(null)}>
          <KV rows={[["Designation", open.designation || "—"], ["Basic pay", rupees(open.basic)], ["Monthly gross", rupees(open.gross)], ["Provident fund", rupees(open.pf)], ["ESI", rupees(open.esi)], ["Professional tax", rupees(open.pt)], ["TDS / other", rupees(open.other)]]} />
          {kind === "other" && <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={solid} onClick={() => setAdding({ id: open.id, amount: String(open.other) })}>Change amount</button></div>}
        </Modal>
      )}
      {adding && (
        <Modal open title="Other deduction a month" onClose={() => setAdding(null)}>
          <form onSubmit={save} className="space-y-3">
            <label className="block"><span className="mb-1 block text-[12.5px] font-medium">Staff member</span><select className={inputCls} value={adding.id} onChange={(e) => setAdding({ id: e.target.value, amount: amount(e.target.value) })}>{all.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.emp_code}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-[12.5px] font-medium">Monthly amount (₹)</span><input type="number" min={0} required className={inputCls} value={adding.amount} onChange={(e) => setAdding({ ...adding, amount: e.target.value })} /></label>
            <ErrorBanner message={act.error} />
            <div className="flex justify-end"><button type="submit" className={solid} disabled={act.busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
