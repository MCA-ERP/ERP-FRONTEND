"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";
import { MonthPill, label, lk } from "./pay-pages";

const P = "/school/pay";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Paid", "Finance approved", "Approved", "HR verified", "Valid"].includes(s) ? "good" : ["Failed", "Returned"].includes(s) ? "bad" : ["Pending", "Draft", "Calculated"].includes(s) ? "warn" : "info");
function saveText(name: string, text: string, type = "text/plain") { const u = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }
const at = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// ═════════════ approval ═════════════
interface Ap { month: string; status: string; step: number; waiting: string; run: { id: string; staff: number; gross: number; deductions: number; net: number } | null; earlier: { id: string; month: string; status: string; staff: number; gross: number; deductions: number; net: number }[] }
const STEPS = ["Calculated", "HR verified", "Finance approved", "Paid"];
export function PayrollApprovalPages({ tab }: { tab: "hr-verification" | "finance-approval" | "approval-history" }) {
  const a = useLoad(() => (tab !== "approval-history" ? schoolFetch<Ap>(`${P}/approval`) : Promise.resolve(null)), [tab]);
  const h = useLoad(() => (tab === "approval-history" ? schoolFetch<{ items: { id: string; month: string; step: string; by_name: string; note: string | null; at: string }[] }>(`${P}/history`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => a.reload());
  const [search, setSearch] = useState(""); const [note, setNote] = useState("");
  const [view, setView] = useState<{ id: string; month: string } | null>(null);
  const det = useLoad(() => (view ? schoolFetch<{ items: { staff_id: string; name: string; emp_code: string; gross: number; deductions: number; net: number }[] }>(`${P}/runs/${view.id}`) : Promise.resolve(null)), [view?.id]);
  const err = <ErrorBanner message={a.error || h.error || act.error || det.error} />;
  const chips = (step: number) => <div className="mb-4 flex flex-wrap gap-2">{STEPS.map((s, i) => <span key={s} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] ${i + 1 === step ? "border-[#026f9b] bg-[#e7f4fb] text-[#026f9b]" : i + 1 < step ? "border-[#bfe3d5] bg-[#eef8f3] text-[#065740]" : "border-slate-200 text-slate-500"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ${i + 1 <= step ? "bg-[#026f9b]" : "bg-slate-300"}`}>{i + 1}</span>{s}</span>)}</div>;
  if (tab === "approval-history") {
    const rows = (h.data?.items ?? []).filter((i) => has(i, search));
    return <div data-report>{err}<ListPanel title="Approval history" noun="events" search={search} onSearch={setSearch} exportName="approval-history" head={["Payroll", "Step", "By", "Note", "When"]} exportRows={rows.map((i) => [at(`${i.month}-01`), i.step, i.by_name, i.note ?? "", day(i.at)])}
      tableHead={["Payroll", "Step", "By", "Note", "When"]} empty={h.loading ? "Loading…" : "Nothing yet."} rows={rows.map((i) => [at(`${i.month}-01`), <Chip key="s" tone={T(i.step)}>{i.step}</Chip>, i.by_name, i.note ?? "—", at(i.at)])} /></div>;
  }
  const x = a.data; if (!x) return <Loading e={a.error} />;
  const hr = tab === "hr-verification";
  const decide = (action: string) => void act.run(() => schoolFetch(`${P}/approval`, json("POST", { month: x.month, action, note: note || undefined }))).then((ok) => ok && setNote(""));
  return (
    <div className="space-y-5" data-report>{err}
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-base font-semibold text-slate-900">{label(x.month)} payroll <span className="ml-2 text-xs font-normal text-slate-500">Status: {x.status}</span></h2><span className="text-xs text-slate-500">{x.waiting}</span></div>{chips(x.step)}
        {x.run ? <dl className="grid max-w-xs grid-cols-2 gap-y-1.5 text-[13px]"><dt className="text-slate-500">Staff</dt><dd>{x.run.staff}</dd><dt className="text-slate-500">Gross</dt><dd>{lk(x.run.gross)}</dd><dt className="text-slate-500">Deductions</dt><dd>{lk(x.run.deductions)}</dd><dt className="text-slate-500">Net pay</dt><dd>{lk(x.run.net)}</dd></dl> : <p className="text-sm text-slate-500">Nothing calculated yet. Use Payroll Processing › Generate Payroll.</p>}
        {x.run && (hr ? x.status === "Calculated" : x.status === "Verified") && <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><div className="min-w-[16rem] flex-1"><Field label="Note (optional)"><input className={inputCls} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div><button type="button" className={small} disabled={act.busy} onClick={() => decide("send_back")}>Send back</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => decide(hr ? "verify" : "approve")}>{hr ? "Verify payroll" : "Approve payroll"}</button></div>}
        {x.run && !hr && x.status === "Calculated" && <p className="mt-3 text-[13px] text-[#8a5a0b]">Waiting for HR to verify before finance can approve.</p>}</div>
      <ListPanel title="Earlier payroll runs" noun="runs" hideSearch search="" onSearch={() => undefined} exportName="earlier-runs" head={["Month", "Staff", "Gross", "Deductions", "Net pay", "Status"]} exportRows={x.earlier.map((i) => [label(i.month), i.staff, i.gross, i.deductions, i.net, i.status])}
        tableHead={["Month", "Staff", "Gross", "Deductions", "Net pay", "Status", ""]} empty="No earlier runs." rows={x.earlier.map((i) => [label(i.month), i.staff, lk(i.gross), lk(i.deductions), lk(i.net), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ id: i.id, month: i.month })}>View details</button>])} />
      <Modal open={!!view} title={view ? label(view.month) : ""} onClose={() => setView(null)}>{view && <><div className="max-h-80 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Deductions</th><th className="px-3 py-2">Net</th></tr></thead><tbody>{det.data?.items.map((i) => <tr key={i.staff_id} className="border-t border-slate-100"><td className="px-3 py-2">{i.name}<span className="block text-[11px] text-slate-500">{i.emp_code}</span></td><td className="px-3 py-2">{inr(i.gross)}</td><td className="px-3 py-2">{inr(i.deductions)}</td><td className="px-3 py-2 font-semibold">{inr(i.net)}</td></tr>)}</tbody></table></div><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ payslips ═════════════
interface Sl { staff_id: string; name: string; emp_code: string; designation: string; department: string; days_paid: number; gross: number; net: number; lop_amount: number; bank: string; earnings: [string, number][]; deductions: [string, number][]; paid: boolean }
const slipHtml = (school: string, month: string, s: Sl) => { const e = escapeHtml; const ded = [...s.deductions, ...(s.lop_amount > 0 ? [["Loss of pay", s.lop_amount] as [string, number]] : [])]; const td = ded.reduce((n, d) => n + d[1], 0); return `<div style="font:13px Arial,sans-serif;max-width:560px;margin:0 auto 32px;padding:24px;page-break-after:always"><h2 style="text-align:center;margin:0">${e(school)}</h2><p style="text-align:center;color:#555;border-bottom:2px solid #0294ce;padding-bottom:6px">Payslip for ${e(label(month))}</p><table style="width:100%;margin:8px 0"><tr><td>Employee</td><td>${e(s.name)} · ${e(s.emp_code)}</td></tr><tr><td>Designation</td><td>${e(s.designation)} · ${e(s.department)}</td></tr><tr><td>Bank</td><td>${e(s.bank || "—")}</td></tr><tr><td>Days paid</td><td>${s.days_paid}</td></tr></table><table style="width:100%;border-collapse:collapse"><tr><th align="left">Earnings</th><th align="right">₹</th><th align="left" style="padding-left:16px">Deductions</th><th align="right">₹</th></tr>${Array.from({ length: Math.max(s.earnings.length, ded.length) }, (_, i) => `<tr><td>${e(s.earnings[i]?.[0] ?? "")}</td><td align="right">${s.earnings[i] ? s.earnings[i][1].toLocaleString("en-IN") : ""}</td><td style="padding-left:16px">${e(ded[i]?.[0] ?? "")}</td><td align="right">${ded[i] ? ded[i][1].toLocaleString("en-IN") : ""}</td></tr>`).join("")}<tr><td><b>Gross</b></td><td align="right"><b>${s.gross.toLocaleString("en-IN")}</b></td><td style="padding-left:16px"><b>Total</b></td><td align="right"><b>${td.toLocaleString("en-IN")}</b></td></tr></table><p style="text-align:right;font-size:15px"><b>Net pay ${inr(s.net)}</b></p></div>`; };
const printSlips = (school: string, month: string, list: Sl[]) => printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Payslips</title></head><body>${list.map((s) => slipHtml(school, month, s)).join("")}</body></html>`);
const SlipCard = ({ s, month, school }: { s: Sl; month: string; school: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Payslip <span className="ml-1 text-xs font-normal text-slate-500">{s.name}</span></h2><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => printSlips(school, month, [s])}>Download PDF</button></div>
    <div className="mx-auto my-6 max-w-[420px] rounded-xl border border-slate-200 p-5 text-[13px]"><p className="text-center text-base font-semibold">{school}</p><p className="border-b-2 border-[#0294ce] pb-2 text-center text-[11px] text-slate-500">Payslip for {label(month)}</p>
      <dl className="my-3 space-y-1"><div className="flex gap-6"><dt className="w-24 text-slate-500">Employee</dt><dd>{s.name} · {s.emp_code}</dd></div><div className="flex gap-6"><dt className="w-24 text-slate-500">Designation</dt><dd>{s.designation} · {s.department}</dd></div><div className="flex gap-6"><dt className="w-24 text-slate-500">Bank</dt><dd>{s.bank || "—"}</dd></div><div className="flex gap-6"><dt className="w-24 text-slate-500">Days paid</dt><dd>{s.days_paid}</dd></div></dl>
      <div className="grid grid-cols-2 gap-4"><table className="w-full"><thead><tr className="bg-[#f3f6f9] text-left text-[10px] uppercase text-slate-500"><th className="px-2 py-1.5">Earnings</th><th className="px-2 py-1.5 text-right">₹</th></tr></thead><tbody>{s.earnings.map(([k, v]) => <tr key={k} className="border-b border-slate-100"><td className="px-2 py-1.5">{k}</td><td className="px-2 py-1.5 text-right">{inr(v)}</td></tr>)}<tr><td className="px-2 py-1.5 font-semibold">Gross</td><td className="px-2 py-1.5 text-right font-semibold">{inr(s.gross)}</td></tr></tbody></table>
        <table className="w-full"><thead><tr className="bg-[#f3f6f9] text-left text-[10px] uppercase text-slate-500"><th className="px-2 py-1.5">Deductions</th><th className="px-2 py-1.5 text-right">₹</th></tr></thead><tbody>{s.deductions.map(([k, v]) => <tr key={k} className="border-b border-slate-100"><td className="px-2 py-1.5">{k}</td><td className="px-2 py-1.5 text-right">{inr(v)}</td></tr>)}{s.lop_amount > 0 && <tr className="border-b border-slate-100"><td className="px-2 py-1.5">Loss of pay</td><td className="px-2 py-1.5 text-right">{inr(s.lop_amount)}</td></tr>}</tbody></table></div>
      <p className="mt-3 text-right text-[15px] font-semibold">Net pay {inr(s.net)}</p></div></div>
);
interface Ps { school: string; month: string; status: string; ready: boolean; shared: boolean; items: Sl[] }
export function PayslipPages({ tab }: { tab: "generate" | "preview" | "print" | "download" }) {
  const router = useRouter();
  const [month, setMonth] = useState(nowIst().slice(0, 7));
  const d = useLoad(() => schoolFetch<Ps>(`${P}/payslips?month=${month}`), [month]);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [dept, setDept] = useState(""); const [pick, setPick] = useState(""); const [msg, setMsg] = useState("");
  const x = d.data; const items = x?.items ?? [];
  const name = x?.school || "School";
  const all = useRef<Sl[]>([]); useEffect(() => { all.current = items; });
  useEffect(() => { const h = () => { if (all.current.length) printSlips(name, month, all.current); }; window.addEventListener("pay-download-all", h); return () => window.removeEventListener("pay-download-all", h); }, [name, month]);
  const err = <ErrorBanner message={d.error || act.error} />;
  if (!x) return <Loading e={d.error} />;
  if (tab === "preview" || tab === "print") {
    const cur = items.find((i) => i.staff_id === (pick || items[0]?.staff_id));
    return <div>{err}<MonthPill value={month} onChange={setMonth} />{!x.ready && <p className="mb-4 rounded-xl border border-[#f1dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px]"><b>Not ready yet.</b> {label(month)} payroll status: {x.status}. Finance approval first.</p>}
      {items.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Employee<select aria-label="Employee" value={cur?.staff_id ?? ""} onChange={(e) => setPick(e.target.value)} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{items.map((i) => <option key={i.staff_id} value={i.staff_id}>{i.name} · {i.designation}</option>)}</select></label></div>}
      {cur ? <SlipCard s={cur} month={month} school={name} /> : <p className="py-10 text-center text-sm text-slate-400">No payslips for this month.</p>}</div>;
  }
  if (tab === "generate") {
    const rows = items.filter((i) => has(i, search));
    return <div data-report>{err}{okBox(msg)}<MonthPill value={month} onChange={setMonth} />
      {!x.ready && <div className="mb-5"><p className="rounded-xl border border-[#f1dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px]"><b>Not ready yet.</b> {label(month)} payroll status: {x.status}. Finance approval first.</p><button type="button" className={`${primaryCls} mt-3 !px-4 !py-1.5 text-[13px]`} onClick={() => router.push("/school/payroll/payroll-approval?tab=finance-approval")}>Go to finance approval</button></div>}
      <ListPanel title={`Payslips · ${label(month)}`} noun="staff" search={search} onSearch={setSearch} exportName="payslips" head={["Staff", "Net pay", "Payslip", "Shared"]} exportRows={rows.map((i) => [i.name, i.net, x.ready ? "Generated" : "Not yet", x.shared ? "Delivered" : "Pending"])}
        extra={x.ready && !x.shared ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${P}/payslips/share`, json("POST", { month }))).then((ok) => ok && setMsg("Payslips generated. Staff portals aren't connected yet, so print or download them."))}>Generate and share payslips</button> : null}
        tableHead={["Staff", "Net pay", "Payslip", "Shared", ""]} empty={d.loading ? "Loading…" : "Nothing calculated for this month."}
        rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.emp_code}</span></span>, inr(i.net), <Chip key="g" tone={x.ready ? "info" : "mute"}>{x.ready ? "Generated" : "Not yet"}</Chip>, <Chip key="s" tone={x.shared ? "good" : "warn"}>{x.shared ? "Delivered" : "Pending"}</Chip>, <button key="p" type="button" className={small} disabled={!x.ready} onClick={() => printSlips(name, month, [i])}>Preview</button>])} /></div>;
  }
  const depts = [...new Set(items.map((i) => i.department).filter(Boolean))].sort(); const rows = items.filter((i) => (!dept || i.department === dept) && has(i, search));
  return <div data-report>{err}<MonthPill value={month} onChange={setMonth} />
    <ListPanel title={`Payslips · ${label(month)}`} noun="employees" search={search} onSearch={setSearch} exportName="payslip-downloads" head={["Employee", "Designation", "Department", "Net pay", "Status"]} exportRows={rows.map((i) => [i.name, i.designation, i.department, i.net, i.paid ? "Paid" : x.status])}
      extra={<select aria-label="Department" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All departments</option>{depts.map((n) => <option key={n}>{n}</option>)}</select>}
      tableHead={["Employee", "Designation", "Department", "Net pay", "Status", ""]} empty={d.loading ? "Loading…" : "No payslips."}
      rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.emp_code}</span></span>, i.designation || "—", i.department || "—", inr(i.net), <Chip key="s" tone={i.paid ? "good" : T(x.status)}>{i.paid ? "Paid" : x.status}</Chip>, <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => printSlips(name, month, [i])}>View</button><button type="button" className={small} onClick={() => printSlips(name, month, [i])}>Download</button></span>])} /></div>;
}

// ═════════════ salary payments ═════════════
export function SalaryPaymentPages({ tab }: { tab: "payment-register" | "payment-status" }) {
  const d = useLoad(() => schoolFetch<{ can_pay: boolean; month: string; items: { id: string; month: string; staff_id: string; name: string; emp_code: string; net: number; bank: string; utr: string; paid_on: string; status: string }[] }>(`${P}/payments${tab === "payment-status" ? "?failed=1" : ""}`), [tab]);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<NonNullable<typeof d.data>["items"][number] | null>(null); const [utr, setUtr] = useState("");
  const x = d.data; const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length;
  const pay = () => void act.run(async () => { const r = await schoolFetch<{ paid: number; failed: number }>(`${P}/payments`, json("POST", { month: x!.month })); setMsg(`${r.paid} salaries recorded as paid${r.failed ? `; ${r.failed} failed because bank details are missing` : ""}. Add bank details in Bank and Statutory Files.`); });
  const upd = (body: object) => void act.run(() => schoolFetch(`${P}/payments/${view!.id}`, json("PATCH", body))).then((ok) => ok && setView(null));
  return (
    <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{okBox(msg)}
      <Tiles items={[{ label: "Salary payments", value: all.length, sub: "All records" }, ...(tab === "payment-register" ? [{ label: "Paid", value: n("Paid"), sub: `${all.length ? Math.round((n("Paid") / all.length) * 100) : 0}% of shown` }] : []), { label: "Failed", value: n("Failed"), sub: `${all.length ? Math.round((n("Failed") / all.length) * 100) : 0}% of shown` }]} />
      <ListPanel title="Salary payments" noun="payments" search={search} onSearch={setSearch} exportName={tab} head={["Staff", "Employee ID", "Month", "Net pay", "Bank", "UTR", "Paid on", "Status"]} exportRows={rows.map((i) => [i.name, i.emp_code, label(i.month), i.net, i.bank, i.utr, day(i.paid_on), i.status])}
        extra={tab === "payment-register" && x?.can_pay ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={pay}>Record payments for {label(x.month)}</button> : null}
        tableHead={["Staff", "Employee ID", "Month", "Net pay", "Bank", "UTR", "Paid on", "Status", ""]} empty={d.loading ? "Loading…" : "No payments yet. They can be recorded once finance approves the payroll."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.emp_code, label(i.month), inr(i.net), i.bank || "—", i.utr || "—", day(i.paid_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(i); setUtr(i.utr); }}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Month" v={label(view.month)} /><Row k="Net pay" v={inr(view.net)} /><Row k="Bank" v={view.bank || "—"} /><Row k="Paid on" v={day(view.paid_on)} /><Row k="Status" v={view.status} /></dl><div className="mt-3"><Field label="UTR"><input className={inputCls} maxLength={30} value={utr} onChange={(e) => setUtr(e.target.value)} /></Field></div>
        <Foot close={() => setView(null)} left={<><button type="button" className={small} disabled={act.busy} onClick={() => upd({ utr })}>Save UTR</button>{view.status !== "Paid" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => upd({ status: "Paid", utr })}>Mark paid</button>}{view.status === "Paid" && <button type="button" className={small} disabled={act.busy} onClick={() => upd({ status: "Failed" })}>Mark failed</button>}</>} /></>}</Modal>
    </div>
  );
}

// ═════════════ reports ═════════════
export function PayReportPages({ tab }: { tab: "annual-payroll" | "deduction-report" }) {
  const [year, setYear] = useState(nowIst().slice(0, 4));
  const a = useLoad(() => (tab === "annual-payroll" ? schoolFetch<{ year: string; runs: number; items: { id: string; name: string; emp_code: string; designation: string; gross: number; deductions: number; net: number; months: number }[] }>(`${P}/annual?year=${year}`) : Promise.resolve(null)), [tab, year]);
  const d = useLoad(() => (tab === "deduction-report" ? schoolFetch<{ items: { id: string; name: string; emp_code: string; gross: number; pf: number; esi: number; pt: number; other: number; total: number }[] }>(`${P}/deduction-report`) : Promise.resolve(null)), [tab]);
  const [search, setSearch] = useState("");
  if (tab === "annual-payroll") {
    const rows = (a.data?.items ?? []).filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={a.error} /><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Year<input type="number" aria-label="Year" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} className="w-20 bg-transparent py-1.5 font-semibold text-slate-900 outline-none" /></label></div>
      <Tiles items={[{ label: "Payroll runs", value: a.data?.runs ?? 0, sub: year }, { label: "Gross", value: lk(rows.reduce((n, i) => n + i.gross, 0)), sub: "" }, { label: "Net pay", value: lk(rows.reduce((n, i) => n + i.net, 0)), sub: "" }]} />
      <ListPanel title={`Annual payroll · ${year}`} noun="staff" search={search} onSearch={setSearch} exportName="annual-payroll" head={["Staff", "Months", "Gross", "Deductions", "Net pay"]} exportRows={rows.map((i) => [i.name, i.months, i.gross, i.deductions, i.net])}
        tableHead={["Staff", "Months", "Gross", "Deductions", "Net pay"]} empty={a.loading ? "Loading…" : "No payroll was run in this year."} rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.emp_code}</span></span>, i.months, inr(i.gross), inr(i.deductions), inr(i.net)])} /></div>;
  }
  const rows = (d.data?.items ?? []).filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} /><Tiles items={[{ label: "Staff covered", value: `${rows.length} shown`, sub: "" }, { label: "This month", value: inr(rows.reduce((n, i) => n + i.total, 0)), sub: "Employee share" }]} />
    <ListPanel title="Deduction report" noun="staff" search={search} onSearch={setSearch} exportName="deduction-report" head={["Staff", "Gross", "PF", "ESI", "Professional tax", "Other", "Total"]} exportRows={rows.map((i) => [i.name, i.gross, i.pf, i.esi, i.pt, i.other, i.total])}
      tableHead={["Staff", "Gross", "PF", "ESI", "Professional tax", "Other", "Total"]} empty={d.loading ? "Loading…" : "No staff have a salary set."} rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.emp_code}</span></span>, inr(i.gross), inr(i.pf), inr(i.esi), inr(i.pt), inr(i.other), <b key="t">{inr(i.total)}</b>])} /></div>;
}

// ═════════════ settings ═════════════
const Rw = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5"><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-slate-500">{hint}</p>}</div>{children}</div>;
interface St { options: Record<string, string[]>; pay_period: string; paid_on: string; lock_day: number; pay_by: string; tax_regime: string; proofs_month: string; form16: boolean; adv_limit: string; recover_months: string; arrears_with: string; encash: boolean; debit_account: string }
export function PaySettingsPages({ tab }: { tab: "salary-cycle" | "tax-rules" | "payroll-policies" }) {
  const l = useLoad(() => schoolFetch<St>(`${P}/settings`), []);
  const act = useAction(() => l.reload());
  const [d, setD] = useState<Partial<St>>({}); const [msg, setMsg] = useState("");
  const c = l.data; if (!c) return <Loading e={l.error} />;
  const v = <K extends keyof St>(k: K) => (d[k] ?? c[k]) as St[K];
  const save = async () => { setMsg(""); const { options, ...cur } = c; void options; const body = { ...cur, ...d }; if (await act.run(() => schoolFetch(`${P}/settings`, json("PUT", body)))) { setD({}); setMsg("Saved."); } };
  const sel = (k: "pay_period" | "paid_on" | "pay_by" | "tax_regime" | "proofs_month" | "adv_limit" | "recover_months" | "arrears_with", t: string, hint?: string) => <Rw key={k} title={t} hint={hint}><select aria-label={t} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px]" value={v(k)} onChange={(e) => setD({ ...d, [k]: e.target.value })}>{c.options[k].map((o) => <option key={o}>{o}</option>)}</select></Rw>;
  const tog = (k: "form16" | "encash", t: string, hint: string) => <Rw key={k} title={t} hint={hint}><button type="button" role="switch" aria-checked={v(k)} aria-label={t} onClick={() => setD({ ...d, [k]: !v(k) })} className={`relative h-[22px] w-10 rounded-full ${v(k) ? "bg-[#0294ce]" : "bg-slate-300"}`}><span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${v(k) ? "translate-x-[18px]" : ""}`} /></button></Rw>;
  const body = tab === "salary-cycle" ? <>{sel("pay_period", "Pay period")}{sel("paid_on", "Salary paid on")}<Rw title="Payroll locks on" hint="Attendance after this day goes to next month. Applied."><span className="flex items-center gap-2"><input type="number" min={1} max={31} aria-label="Payroll locks on" className="w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px]" value={v("lock_day")} onChange={(e) => setD({ ...d, lock_day: Number(e.target.value) })} /><span className="text-[12px] text-slate-500">th</span></span></Rw>{sel("pay_by", "Pay by")}<Rw title="Debit account" hint="The school's salary account, written into the bank file"><input aria-label="Debit account" className="w-48 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px]" maxLength={30} value={v("debit_account")} onChange={(e) => setD({ ...d, debit_account: e.target.value })} /></Rw></>
    : tab === "tax-rules" ? <>{sel("tax_regime", "Default tax regime", "Staff can choose in their declaration")}<Rw title="Professional tax" hint="Telangana slab"><span className="text-[13px] text-slate-700">₹150 for ₹15,001 – 20,000; ₹200 above</span></Rw>{sel("proofs_month", "Collect investment proofs in")}{tog("form16", "Form 16", "Issued every June")}</>
    : <>{sel("adv_limit", "Salary advance limit")}{sel("recover_months", "Recover advances over")}{sel("arrears_with", "Pay arrears with")}{tog("encash", "Leave encashment", "Earned leave, at exit")}</>;
  return <div>{msg && okBox(msg)}<ErrorBanner message={l.error || act.error} /><div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{{ "salary-cycle": "Salary cycle", "tax-rules": "Tax rules", "payroll-policies": "Payroll policies" }[tab]}</h2></div>{body}
    <div className="flex justify-end gap-2.5 px-5 py-3.5"><button type="button" className={btnGhost} onClick={() => { setD({}); setMsg(""); }}>Discard</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save</button></div></div>
    <p className="mt-3 text-xs text-slate-500">The payroll lock day is applied when payroll is calculated. The other settings are saved and shown but don&apos;t change calculations yet.</p></div>;
}

// ═════════════ bank and statutory files ═════════════
interface BankRow { id: string; name: string; emp_code: string; account: string; ifsc: string; bank: string; net: number; ok: boolean }
export function BankFilePages({ tab }: { tab: "bank-transfer-file" | "pf-ecr" | "esi" | "pt-and-tds" }) {
  const [month, setMonth] = useState(nowIst().slice(0, 7));
  const path = { "bank-transfer-file": "bank-file", "pf-ecr": "pf-ecr", esi: "esi-file", "pt-and-tds": "pt-tds" }[tab];
  const d = useLoad(() => schoolFetch<Record<string, never>>(`${P}/${path}?month=${month}`) as Promise<Record<string, unknown>>, [path, month]);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [edit, setEdit] = useState<{ id: string; name: string; bank_name: string; bank_account: string; ifsc: string; uan: string; esi_no: string } | null>(null);
  const x = d.data as Record<string, unknown> | null;
  const openEdit = async (id: string, name: string) => { const b = await schoolFetch<{ bank_name: string; bank_account: string; ifsc: string; uan: string; esi_no: string }>(`${P}/bank/${id}`); setEdit({ id, name, ...b }); };
  const err = <ErrorBanner message={d.error || act.error} />;
  if (!x) return <Loading e={d.error} />;
  const approved = x.approved as boolean;
  const note = !approved && <p className="rounded-xl border border-[#f1dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px]">This is a preview from the calculated payroll. The file can be created once finance approves {label(month)}.</p>;
  const create = (name: string, text: string) => <button type="button" className={`${btnPrimary} !bg-[#e53a35] !px-5`} disabled={!approved || !text} onClick={() => saveText(name, text)}>{{ "bank-transfer-file": "Create bank file", "pf-ecr": "Create ECR file", esi: "Create ESI file", "pt-and-tds": "" }[tab]}</button>;
  const pre = (t: string, sub: string) => <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">File preview</h2><span className="text-xs text-slate-500">{sub}</span></div><pre className="max-h-48 overflow-auto bg-[#f6f9fb] p-4 font-mono text-[11px] text-slate-700">{t.split("\n").slice(0, 6).join("\n") || "Nothing to put in the file yet."}</pre></div>;
  const bar = <div className="flex flex-wrap items-center justify-between gap-3"><MonthPill value={month} onChange={setMonth} />{tab === "bank-transfer-file" ? create(`bank-transfer-${month}.csv`, String(x.text)) : tab === "pf-ecr" ? create(`pf-ecr-${month}.txt`, String(x.text)) : tab === "esi" ? create(`esi-${month}.csv`, String(x.text)) : null}</div>;
  if (tab === "bank-transfer-file") {
    const rows = (x.items as BankRow[]).filter((i) => has(i, search));
    return <div className="space-y-5" data-report>{err}{bar}{note}
      <Tiles items={[{ label: "Transfers", value: x.transfers as number, sub: x.missing ? `${x.missing} missing bank details` : "one per employee" }, { label: "Total to pay", value: inr(x.total as number), sub: `net pay, ${label(month)}` }, { label: "Debit account", value: String(x.debit_account || "Not set"), sub: "set in Payroll Settings" }, { label: "Pay date", value: day(String(x.pay_date)), sub: "value date in the file" }]} />
      {pre(String(x.text), "Bulk NEFT format · first lines")}
      <ListPanel title="Transfers in this file" noun="employees" search={search} onSearch={setSearch} exportName="bank-transfers" head={["Employee", "Employee ID", "Account", "IFSC", "Net pay"]} exportRows={rows.map((i) => [i.name, i.emp_code, i.account, i.ifsc, i.net])}
        tableHead={["Employee", "Employee ID", "Account", "IFSC", "Net pay", ""]} empty={d.loading ? "Loading…" : "No staff."} rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.emp_code, i.account || <Chip key="m" tone="warn">Missing</Chip>, i.ifsc || "—", inr(i.net), <button key="e" type="button" className={small} onClick={() => void openEdit(i.id, i.name)}>Bank details</button>])} />
      <Modal open={!!edit} title={edit ? `Bank and statutory details · ${edit.name}` : ""} onClose={() => setEdit(null)}>{edit && <form onSubmit={(e: FormEvent) => { e.preventDefault(); void act.run(() => schoolFetch(`${P}/bank/${edit.id}`, json("PUT", { bank_name: edit.bank_name, bank_account: edit.bank_account, ifsc: edit.ifsc, uan: edit.uan, esi_no: edit.esi_no }))).then((ok) => ok && setEdit(null)); }} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Bank"><input className={inputCls} maxLength={40} value={edit.bank_name} onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })} /></Field><Field label="IFSC"><input className={inputCls} maxLength={11} value={edit.ifsc} onChange={(e) => setEdit({ ...edit, ifsc: e.target.value.toUpperCase() })} /></Field><Field label="Account number"><input className={inputCls} maxLength={20} value={edit.bank_account} onChange={(e) => setEdit({ ...edit, bank_account: e.target.value })} /></Field><Field label="UAN (PF)"><input className={inputCls} maxLength={12} value={edit.uan} onChange={(e) => setEdit({ ...edit, uan: e.target.value })} /></Field><Field label="ESI IP number"><input className={inputCls} maxLength={14} value={edit.esi_no} onChange={(e) => setEdit({ ...edit, esi_no: e.target.value })} /></Field></div><FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal></div>;
  }
  if (tab === "pf-ecr") {
    const items = x.items as { id: string; name: string; uan: string; gross: number; wages: number; ee: number; eps: number; epf: number }[]; const rows = items.filter((i) => has(i, search));
    return <div className="space-y-5" data-report>{err}{bar}{note}
      <Tiles items={[{ label: "Members", value: x.members as number, sub: x.missing_uan ? `${x.missing_uan} without a UAN` : "" }, { label: "Employee share (12%)", value: inr(x.ee as number), sub: "deducted from salary" }, { label: "Employer share (12%)", value: inr(x.er as number), sub: "3.67% EPF + 8.33% pension" }, { label: "Admin charges (0.5%)", value: inr(x.admin as number), sub: "paid with the challan" }]} />
      {pre(String(x.text), "EPFO ECR text format")}
      <ListPanel title={`PF contributions · ${label(month)}`} noun="members" search={search} onSearch={setSearch} exportName="pf-contributions" head={["Employee", "UAN", "Gross", "PF wages", "Employee 12%", "Pension 8.33%", "EPF 3.67%"]} exportRows={rows.map((i) => [i.name, i.uan, i.gross, i.wages, i.ee, i.eps, i.epf])}
        tableHead={["Employee", "UAN", "Gross", "PF wages", "Employee 12%", "Pension 8.33%", "EPF 3.67%", ""]} empty={d.loading ? "Loading…" : "Nobody has PF."} rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.uan || <Chip key="m" tone="warn">Missing</Chip>, inr(i.gross), inr(i.wages), inr(i.ee), inr(i.eps), inr(i.epf), <button key="e" type="button" className={small} onClick={() => void openEdit(i.id, i.name)}>Details</button>])} />
      <Modal open={!!edit} title={edit ? `UAN · ${edit.name}` : ""} onClose={() => setEdit(null)}>{edit && <form onSubmit={(e: FormEvent) => { e.preventDefault(); void act.run(() => schoolFetch(`${P}/bank/${edit.id}`, json("PUT", { bank_name: edit.bank_name, bank_account: edit.bank_account, ifsc: edit.ifsc, uan: edit.uan, esi_no: edit.esi_no }))).then((ok) => ok && setEdit(null)); }} className="space-y-3"><Field label="UAN (12 digits)"><input className={inputCls} maxLength={12} value={edit.uan} onChange={(e) => setEdit({ ...edit, uan: e.target.value })} /></Field><FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal></div>;
  }
  if (tab === "esi") {
    const items = x.items as { id: string; name: string; ip: string; days: number; wages: number; ee: number; er: number }[]; const rows = items.filter((i) => has(i, search));
    return <div className="space-y-5" data-report>{err}{bar}{note}
      <Tiles items={[{ label: "Insured staff", value: x.insured as number, sub: x.missing_ip ? `${x.missing_ip} without an IP number` : "gross up to ₹21,000" }, { label: "Employee share (0.75%)", value: inr(x.ee as number), sub: "" }, { label: "Employer share (3.25%)", value: inr(x.er as number), sub: "" }, { label: "Total challan", value: inr((x.ee as number) + (x.er as number)), sub: "pay online on ESIC" }]} />
      <ListPanel title={`ESI contributions · ${label(month)}`} noun="insured persons" search={search} onSearch={setSearch} exportName="esi-contributions" head={["Employee", "IP number", "Days", "Wages", "Employee 0.75%", "Employer 3.25%"]} exportRows={rows.map((i) => [i.name, i.ip, i.days, i.wages, i.ee, i.er])}
        tableHead={["Employee", "IP number", "Days", "Wages", "Employee 0.75%", "Employer 3.25%", ""]} empty={d.loading ? "Loading…" : "Nobody is covered."} rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.ip || <Chip key="m" tone="warn">Missing</Chip>, i.days, inr(i.wages), inr(i.ee), inr(i.er), <button key="e" type="button" className={small} onClick={() => void openEdit(i.id, i.name)}>Details</button>])} />
      <Modal open={!!edit} title={edit ? `ESI IP number · ${edit.name}` : ""} onClose={() => setEdit(null)}>{edit && <form onSubmit={(e: FormEvent) => { e.preventDefault(); void act.run(() => schoolFetch(`${P}/bank/${edit.id}`, json("PUT", { bank_name: edit.bank_name, bank_account: edit.bank_account, ifsc: edit.ifsc, uan: edit.uan, esi_no: edit.esi_no }))).then((ok) => ok && setEdit(null)); }} className="space-y-3"><Field label="ESI IP number"><input className={inputCls} maxLength={14} value={edit.esi_no} onChange={(e) => setEdit({ ...edit, esi_no: e.target.value })} /></Field><FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal></div>;
  }
  const slabs = x.slabs as [string, string, number][]; const tds = x.tds as { id: string; name: string; annual: number; tds: number }[];
  return <div className="space-y-5" data-report>{err}<MonthPill value={month} onChange={setMonth} />{note}
    <Tiles items={[{ label: "Professional tax", value: inr(x.pt as number), sub: "Telangana · whole school" }, { label: "TDS on salary", value: inr(x.tds_total as number), sub: String(x.regime) }, { label: "Form 24Q · Q3", value: "Due 31 Jan", sub: "Oct – Dec quarter" }, { label: "Form 16", value: "Issued in June", sub: "for the financial year" }]} />
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Professional tax slabs · Telangana</h2></div><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-5 py-2.5">Monthly salary</th><th className="px-3 py-2.5">PT a month</th><th className="px-3 py-2.5">Employees</th></tr></thead><tbody>{slabs.map(([k, v, n]) => <tr key={k} className="border-t border-slate-100"><td className="px-5 py-2.5">{k}</td><td className="px-3 py-2.5">{v}</td><td className="px-3 py-2.5">{n}</td></tr>)}</tbody></table></div>
    <ListPanel title={`TDS on salary · ${label(month)}`} noun="employees" hideSearch search="" onSearch={() => undefined} exportName="tds-on-salary" head={["Employee", "Annual salary", "TDS this month"]} exportRows={tds.map((i) => [i.name, i.annual, i.tds])} tableHead={["Employee", "Annual salary", "TDS this month"]} empty="No TDS this month. Enter it under Deductions › Other Applicable Deductions." rows={tds.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, inr(i.annual), <b key="t">{inr(i.tds)}</b>])} />
    <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">TDS is whatever is entered as the monthly &ldquo;other deduction&rdquo; for each person; it isn&apos;t worked out from tax declarations yet.</p></div>;
}
