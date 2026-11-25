"use client";

import Link from "next/link";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "../../teacher/t/head";
import { day, rupees } from "../../teacher/t/dash-pages";
import { PayrollSteps, statusName } from "./dash-pages";
import { Table, Tile, Tiles, name, pill, share } from "./ui";

/** Step 5 of the workflow, and every payroll run, on the same runs Finance approves. */
const P = "/school/pay";
const nowMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const lakh = (n: number) => `₹${(n / 100000).toFixed(1)} L`;
const KV = ({ rows }: { rows: [string, string | number][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;

interface Line { id: string; name: string; emp_code: string; gross: number; working_days: number; present: number; paid_leave: number; lop: number; lop_amount: number; pf: number; esi: number; pt: number; tds: number; deductions: number; net: number }
interface Calc { month: string; working_days: number; counted_to: string; items: Line[] }
interface Run { id: string; month: string; status: string; staff: number; gross: number; deductions: number; net: number }
const totals = (items: Line[]) => { const paid = items.filter((i) => i.gross > 0); const gross = paid.reduce((n, i) => n + i.gross - i.lop_amount, 0); const deductions = paid.reduce((n, i) => n + i.deductions, 0); return { staff: paid.length, gross, deductions, net: paid.reduce((n, i) => n + i.net, 0) }; };

export function GeneratePayroll() {
  const [month, setMonth] = useState(nowMonth());
  const runs = useLoad(() => schoolFetch<{ items: Run[] }>(`${P}/runs`), []);
  const calc = useLoad(() => schoolFetch<Calc>(`${P}/attendance?month=${month}`), [month]);
  const home = useLoad(() => schoolFetch<{ leave_waiting: number; pay_date: string }>("/hr/overview"), []);
  const act = useAction(() => { runs.reload(); calc.reload(); });
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<Line | null>(null);
  const x = calc.data?.month === month ? calc.data : null;
  const paid = (x?.items ?? []).filter((i) => i.gross > 0);
  const t = totals(x?.items ?? []);
  const status = runs.data?.items.find((r) => r.month === month)?.status ?? "Draft";
  const months = [...new Set([...Array.from({ length: 6 }, (_, k) => { const d = new Date(`${nowMonth()}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - k); return d.toISOString().slice(0, 7); }), month])].sort().reverse();
  const run = async () => { setMsg(""); let text = ""; if (await act.run(async () => { const r = await schoolFetch<{ staff: number; net: number }>(`${P}/calculate`, json("POST", { month })); text = `${monthName(month)} calculated for ${r.staff} staff. Net pay ${rupees(r.net)}. It is ready for HR to verify.`; })) setMsg(text); };
  const locked = !["Draft", "Calculated"].includes(status);
  const waiting = home.data?.leave_waiting ?? 0;
  return (
    <div data-report className="space-y-4">
      <Head title="Generate Payroll" subtitle={`Step 5: work out ${monthName(month)} salaries from attendance and leave, with PF, ESI, professional tax and TDS.`} action={<button type="button" className={redBtn} disabled={act.busy || locked || !paid.length} title={locked ? "This payroll is already past calculation" : undefined} onClick={() => void run()}>{act.busy ? "Calculating…" : "Calculate payroll"}</button>} />
      <ErrorBanner message={calc.error || runs.error || act.error} />
      {msg && <p role="status" className="rounded-2xl border border-[#bfe3d5] bg-[#eef8f3] px-4 py-3 text-[13px] text-slate-800">{msg}</p>}
      <PayrollSteps status={status} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Month<select aria-label="Month" value={month} onChange={(e) => { setMonth(e.target.value); setMsg(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</select></label>
        {x && <span className="ml-auto text-[12px] text-slate-500">{x.working_days} working days · attendance and leave counted up to {day(x.counted_to)}</span>}
      </div>
      {month === nowMonth() && waiting > 0 && (
        <>
          <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800"><b>{waiting} leave request{waiting === 1 ? " is" : "s are"} still pending.</b> Get them approved or rejected first so loss of pay is right.</p>
          <Link href="/hr/leave/leave-management?tab=approvals" className="inline-block rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-900 hover:border-slate-400">Process leave</Link>
        </>
      )}
      <Tiles><Tile label="Employees" value={x?.items.length ?? "—"} sub={`${t.staff} with a salary set`} /><Tile label="Gross pay" value={rupees(t.gross)} sub="After loss of pay" /><Tile label="Deductions" value={rupees(t.deductions)} sub="PF, ESI, PT, TDS" /><Tile label="Net pay" value={rupees(t.net)} sub={month === nowMonth() && home.data?.pay_date ? `Pay date ${home.data.pay_date}` : undefined} /></Tiles>
      <Table title={`Salary and deductions · ${monthName(month)}`} noun="employees" exportName={`payroll-${month}`} empty={calc.loading ? "Loading…" : "No staff have a salary set. Assign salary structures first."}
        head={[{ h: "Employee" }, { h: "Days paid" }, { h: "Loss of pay" }, { h: "Gross" }, { h: "PF" }, { h: "ESI" }, { h: "PT" }, { h: "TDS" }, { h: "Net pay" }, { h: "" }]}
        rows={paid.map((i) => ({ key: i.id, find: `${i.name} ${i.emp_code}`, out: [i.name, i.present + i.paid_leave, i.lop, i.gross - i.lop_amount, i.pf, i.esi, i.pt, i.tds, i.net], cells: [name(i.name, i.emp_code), i.present + i.paid_leave, i.lop ? <span key="l" className="text-[#ac2c28]">{i.lop} · {rupees(i.lop_amount)}</span> : 0, rupees(i.gross - i.lop_amount), rupees(i.pf), rupees(i.esi), rupees(i.pt), rupees(i.tds), rupees(i.net), <button key="v" type="button" className={pill} onClick={() => setView(i)}>View details</button>] }))} />
      {view && <Modal open title={`${view.name} · ${view.emp_code}`} onClose={() => setView(null)}><KV rows={[["Working days", view.working_days], ["Present", view.present], ["Paid leave", view.paid_leave], ["Loss of pay", `${view.lop} days · ${rupees(view.lop_amount)}`], ["Monthly gross", rupees(view.gross)], ["Provident fund", rupees(view.pf)], ["ESI", rupees(view.esi)], ["Professional tax", rupees(view.pt)], ["TDS / other", rupees(view.tds)], ["Net pay", rupees(view.net)]]} /></Modal>}
    </div>
  );
}

/** Reports > Payroll Reports: the runs of this school year. */
export function MonthlyPayrollReport() {
  return <><Head title="Monthly Payroll" subtitle="Every payroll run this year." /><PayrollRuns thisYear /></>;
}
export function MonthlyPayroll() {
  return <><Head title="Monthly Payroll" subtitle="Every payroll run, newest first." /><PayrollRuns /></>;
}
/** The payroll runs, also shown under Dashboard > Payroll Status. */
export function PayrollRuns({ thisYear }: { thisYear?: boolean } = {}) {
  const runs = useLoad(() => schoolFetch<{ current: string; items: Run[] }>(`${P}/runs`), []);
  // the month not yet calculated shows what it would come to today
  const open = runs.data?.items.find((r) => r.status === "Draft")?.month ?? "";
  const est = useLoad(() => (open ? schoolFetch<Calc>(`${P}/attendance?month=${open}`) : Promise.resolve(null)), [open]);
  const [view, setView] = useState<Run | null>(null);
  const det = useLoad(() => (view?.id ? schoolFetch<{ items: { staff_id: string; name: string; emp_code: string; gross: number; deductions: number; net: number }[] }>(`${P}/runs/${view.id}`) : Promise.resolve(null)), [view?.id]);
  const now = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const start = `${Number(now.slice(0, 4)) - (Number(now.slice(5, 7)) < 4 ? 1 : 0)}-04`; // the school year starts in April
  const all = (runs.data?.items ?? []).filter((r) => !thisYear || r.month >= start).map((r) => (r.status === "Draft" && est.data?.month === r.month ? { ...r, ...totals(est.data.items) } : r));
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const tone = (s: string) => (s === "Paid" ? "good" : s === "Draft" ? "mute" : "info") as "good" | "mute" | "info";
  return (
    <div data-report className="space-y-5">
      <ErrorBanner message={runs.error || est.error} />
      <Tiles><Tile label="Payroll runs" value={all.length} sub="Records shown" /><Tile tone="green" label="Paid" value={n("Paid")} sub={share(n("Paid"), all.length)} /><Tile tone="amber" label="Not started" value={n("Draft")} sub={share(n("Draft"), all.length)} /></Tiles>
      <Table title="Payroll runs" noun="runs" exportName="payroll-runs" empty={runs.loading ? "Loading…" : "No runs yet."}
        head={[{ h: "Month" }, { h: "Staff" }, { h: "Gross" }, { h: "Deductions" }, { h: "Net pay" }, { h: "Status" }, { h: "" }]}
        rows={all.map((r) => ({ key: r.month, find: `${monthName(r.month)} ${statusName[r.status] ?? r.status}`, out: [monthName(r.month), r.staff, r.gross, r.deductions, r.net, statusName[r.status] ?? r.status], cells: [monthName(r.month), r.staff || "—", r.gross ? lakh(r.gross) : "—", r.deductions ? lakh(r.deductions) : "—", r.net ? lakh(r.net) : "—", <Chip key="s" tone={tone(r.status)}>{statusName[r.status] ?? r.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(r)}>View details</button>] }))} />
      {view && (
        <Modal open title={monthName(view.month)} onClose={() => setView(null)}>
          {!view.id ? <p className="text-[13px] text-slate-700">Not calculated yet. The figures are what the month would come to today. <Link href="/hr/payroll/payroll-processing" className="font-semibold text-[#026f9b] hover:underline">Generate payroll</Link></p> : (
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200"><ErrorBanner message={det.error} /><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Deductions</th><th className="px-3 py-2">Net</th></tr></thead><tbody>{det.data?.items.map((i) => <tr key={i.staff_id} className="border-t border-slate-100"><td className="px-3 py-2">{i.name}<span className="block text-[11px] text-slate-500">{i.emp_code}</span></td><td className="px-3 py-2">{rupees(i.gross)}</td><td className="px-3 py-2">{rupees(i.deductions)}</td><td className="px-3 py-2 font-semibold">{rupees(i.net)}</td></tr>)}</tbody></table></div>
          )}
        </Modal>
      )}
    </div>
  );
}
