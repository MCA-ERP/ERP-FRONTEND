"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { printSlips, type Sl } from "../../school/s/pay-pages2";
import { Head, redBtn } from "../../teacher/t/head";
import { Loading, day, rupees } from "../../teacher/t/dash-pages";
import { PayrollSteps, statusName } from "./dash-pages";
import { Table, name, pill, solid } from "./ui";

/** Steps 6 to 8: HR verifies, Finance approves (in Fee & Finance), payslips are made and read in every staff portal. */
const P = "/school/pay";
const nowMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const short = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

interface Run { id: string; month: string; status: string; staff: number; gross: number; deductions: number; net: number }
interface State { month: string; status: string; run: Run | null; earlier: Run[] }

const Banner = ({ tone = "warn", lead, text }: { tone?: "warn" | "good"; lead: string; text: string }) => <p className={`rounded-2xl border px-4 py-3 text-[13px] text-slate-800 ${tone === "warn" ? "border-[#f1d9a6] bg-[#fff8e6]" : "border-[#bfe3d5] bg-[#eef8f3]"}`}><b>{lead}</b> {text}</p>;
const Go = ({ href, label }: { href: string; label: string }) => <Link href={href} className="inline-block rounded-full bg-[#026f9b] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67]">{label}</Link>;
const CALC = "/hr/payroll/payroll-processing";

export function Approval({ stage }: { stage: "hr" | "finance" }) {
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<State>(`${P}/approval`), []);
  const act = useAction(reload);
  const [note, setNote] = useState("");
  const hr = stage === "hr";
  const decide = (action: "verify" | "send_back") => void act.run(() => schoolFetch(`${P}/approval`, json("POST", { month: x!.month, action, note: note || undefined }))).then((ok) => ok && setNote(""));
  const m = x ? monthName(x.month) : "";
  const s = x?.status ?? "Draft";
  return (
    <div className="space-y-4">
      <Head title={hr ? "HR Verification" : "Finance Approval"} subtitle={hr ? "Step 6: HR checks the calculated payroll before finance sees it." : "Step 7: the authorised finance officer approves the payroll."} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && (
        <>
          <PayrollSteps status={s} />
          {s === "Draft" && <><Banner lead="Not ready yet." text={`Calculate the ${m} payroll first.`} /><Go href={CALC} label="Go to calculation" /></>}
          {!hr && s === "Calculated" && <><Banner lead="Not ready yet." text="HR has not verified the payroll yet." /><Go href="/hr/payroll-approval/payroll-approval?tab=hr-verification" label="Go to verification" /></>}
          {!hr && s === "Verified" && <Banner lead="With finance." text="The finance officer approves it in Fee & Finance › Payroll Approval. You will see the result here." />}
          {hr && ["Verified", "Approved", "Paid"].includes(s) && <Banner tone="good" lead="Verified." text={s === "Verified" ? "It is now with the finance officer." : `The ${m} payroll is ${s === "Paid" ? "paid" : "approved by finance"}.`} />}
          {!hr && ["Approved", "Paid"].includes(s) && <><Banner tone="good" lead="Approved." text={`Finance approved the ${m} payroll.`} /><Go href="/hr/payslips/payslips" label="Go to payslips" /></>}
          {x.run && (
            <Panel title={`${m} payroll`} sub={statusName[s] ?? s}>
              <dl className="grid max-w-sm grid-cols-2 gap-y-1.5 px-5 py-4 text-[13px]"><dt className="text-slate-500">Staff</dt><dd className="font-medium">{x.run.staff}</dd><dt className="text-slate-500">Gross</dt><dd className="font-medium">{rupees(x.run.gross)}</dd><dt className="text-slate-500">Deductions</dt><dd className="font-medium">{rupees(x.run.deductions)}</dd><dt className="text-slate-500">Net pay</dt><dd className="font-semibold">{rupees(x.run.net)}</dd></dl>
              {hr && s === "Calculated" && (
                <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 px-5 py-4">
                  <label className="min-w-[16rem] flex-1"><span className="mb-1 block text-[12.5px] font-medium">Note (optional)</span><input className={inputCls} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                  <button type="button" className={pill} disabled={act.busy} onClick={() => decide("send_back")}>Send back</button>
                  <button type="button" className={solid} disabled={act.busy} onClick={() => decide("verify")}>Verify payroll</button>
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

interface Event { id: string; month: string; step: string; by_name: string; note: string | null; at: string }
export function ApprovalHistory() {
  const a = useLoad(() => schoolFetch<State>(`${P}/approval`), []);
  const h = useLoad(() => schoolFetch<{ items: Event[] }>(`${P}/history`), []);
  const month = a.data?.month ?? nowMonth();
  const events = h.data?.items ?? [];
  const who = (n: string) => n.replace(/\s*\([^)]*\)\s*$/, "");
  const step = (m: string, s: string) => { const e = events.find((x) => x.month === m && x.step === s); return e ? `${short(e.at)}${s === "Paid" ? "" : ` · ${who(e.by_name)}`}` : "—"; };
  return (
    <div data-report className="space-y-5">
      <Head title="Approval History" subtitle="Who verified and approved each payroll." />
      <ErrorBanner message={a.error || h.error} />
      <Table title={`Approval history · ${monthName(month)}`} noun="steps" search={false} exportName="approval-history" empty={h.loading ? "Loading…" : "Nothing yet. Calculate the payroll to start."}
        head={[{ h: "When" }, { h: "Step" }, { h: "By" }]}
        rows={events.filter((e) => e.month === month).map((e) => ({ key: e.id, find: e.step, out: [day(e.at), e.step, who(e.by_name)], cells: [day(e.at), name(e.step, e.note ?? undefined), who(e.by_name)] }))} />
      <Table title="Earlier months" noun="months" exportName="earlier-payrolls" empty={a.loading ? "Loading…" : "No earlier payrolls."}
        head={[{ h: "Month" }, { h: "Status" }, { h: "HR verified" }, { h: "Finance approved" }, { h: "Paid" }]}
        rows={(a.data?.earlier ?? []).map((r) => ({ key: r.id, find: `${monthName(r.month)} ${r.status}`, out: [monthName(r.month), statusName[r.status] ?? r.status, step(r.month, "HR verified"), step(r.month, "Finance approved"), step(r.month, "Paid")], cells: [name(monthName(r.month)), <Chip key="s" tone={r.status === "Paid" ? "good" : "info"}>{statusName[r.status] ?? r.status}</Chip>, step(r.month, "HR verified"), step(r.month, "Finance approved"), step(r.month, "Paid")] }))} />
    </div>
  );
}

// ═════════════ payslips ═════════════
type Slip = Sl & { working_days: number };
interface Month { school: string; month: string; status: string; ready: boolean; shared: boolean; shared_on: string | null; paid_on: string | null; items: Slip[] }
const query = (k: string) => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get(k) ?? "");

/** The chosen month, or the latest one whose payslips are ready. */
function useMonth() {
  const runs = useLoad(() => schoolFetch<{ items: { month: string; status: string }[] }>(`${P}/runs`), []);
  const [pick, setPick] = useState(() => query("month"));
  const ready = runs.data?.items.filter((r) => ["Approved", "Paid"].includes(r.status)) ?? [];
  const month = pick || ready[0]?.month || (runs.data ? nowMonth() : "");
  const slips = useLoad(() => (month ? schoolFetch<Month>(`${P}/payslips?month=${month}`) : Promise.resolve(null)), [month]);
  const months = [...new Set([month, ...(runs.data?.items.map((r) => r.month) ?? [])].filter(Boolean))].sort().reverse();
  return { month, setMonth: setPick, months, slips: slips.data && slips.data.month === month ? slips.data : null, loading: runs.loading || slips.loading, error: runs.error || slips.error };
}

export function PayslipGenerate() {
  const month = nowMonth();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Month>(`${P}/payslips?month=${month}`), [month]);
  const act = useAction(reload);
  const s = x?.status ?? "Draft";
  const why: Record<string, [string, string, string]> = {
    Draft: [`Calculate the ${monthName(month)} payroll first.`, CALC, "Go to calculation"],
    Calculated: ["The payroll hasn't been verified yet.", "/hr/payroll-approval/payroll-approval?tab=hr-verification", "Go to verification"],
    Verified: ["Finance hasn't approved the payroll yet.", "/hr/payroll-approval/payroll-approval?tab=finance-approval", "Go to finance approval"],
  };
  return (
    <div className="space-y-4">
      <Head title="Generate" subtitle="Step 8: payslips and bank payments are created once finance approves." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && (
        <>
          <PayrollSteps status={s} />
          {!x.ready && why[s] && <><Banner lead="Not ready yet." text={why[s][0]} /><Go href={why[s][1]} label={why[s][2]} /></>}
          {x.ready && !x.shared && <><Banner tone="good" lead="Ready." text={`Finance approved ${monthName(month)}. Generating makes ${x.items.length} payslips available in each staff member's My Payslips.`} /><button type="button" className={`${solid} !px-4 !py-2 !text-[13px]`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${P}/payslips/share`, json("POST", { month })))}>Generate payslips</button></>}
          {x.ready && x.shared && <><Banner tone="good" lead="Generated." text={`${x.items.length} payslips for ${monthName(month)}${x.shared_on ? ` on ${day(x.shared_on)}` : ""}. Accounts records the salary payments.`} /><div className="flex gap-2"><Go href="/hr/payslips/payslips?tab=download" label="Download payslips" /><Go href="/hr/payslips/bank-and-statutory-files" label="Bank transfer file" /></div></>}
        </>
      )}
    </div>
  );
}

export function PayslipPreview() {
  const m = useMonth();
  const dir = useLoad(() => schoolFetch<{ items: { id: string; name: string; designation: string; department: string; emp_code: string; status: string }[] }>("/school/hr/directory"), []);
  const [pick, setPick] = useState(() => query("staff"));
  const items = m.slips?.items ?? [];
  const s = items.find((i) => i.staff_id === pick) ?? items[0];
  const person = dir.data?.items.find((p) => p.id === s?.staff_id);
  const gross = s ? s.gross - s.lop_amount : 0;
  const deductions = s ? s.deductions.reduce((n, d) => n + d[1], 0) : 0;
  // the transport and special allowances share one line, as on the printed slip
  const earnings: [string, number][] = s ? [...s.earnings.slice(0, 3), ["Transport + special", s.earnings.slice(3).reduce((n, e) => n + e[1], 0)]] : [];
  const lines = Math.max(earnings.length + 1, s?.deductions.length ?? 0);
  const left: [string, string][] = [...earnings.map(([k, v]) => [k, rupees(v)] as [string, string]), ["Loss of pay", `− ${rupees(s?.lop_amount ?? 0)}`]];
  return (
    <div className="space-y-4">
      <Head title="Preview" subtitle={m.month ? `Payslip for ${monthName(m.month)}.` : "Payslip preview."} />
      <ErrorBanner message={m.error || dir.error} />
      <Loading on={m.loading && !m.slips} />
      {m.slips && !s && <Banner lead="Not ready yet." text={`There are no payslips for ${monthName(m.month)}. Calculate the payroll first.`} />}
      {m.slips && s && (
        <>
          {!m.slips.ready && <Banner lead="Draft." text="Finance has not approved this month, so these figures can still change." />}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Employee<select aria-label="Employee" value={s.staff_id} onChange={(e) => setPick(e.target.value)} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{items.map((i) => <option key={i.staff_id} value={i.staff_id}>{i.name}{i.designation ? ` · ${i.designation}` : ""}</option>)}</select></label>
            {person && <Chip tone={person.status === "Active" ? "good" : "warn"}>{person.status}</Chip>}
            <span className="ml-auto text-[12px] text-slate-500">{s.emp_code} · {s.department || "No department"}</span>
          </div>
          <Panel title="Payslip" sub={s.name} right={<button type="button" className={solid} onClick={() => printSlips(m.slips!.school, m.month, [s])}>Download PDF</button>}>
            <div className="mx-auto my-5 w-[min(34rem,calc(100%-2rem))] rounded-xl border border-slate-200 p-5 text-[12.5px]">
              <p className="text-center text-[15px] font-bold text-slate-900">{m.slips.school}</p><p className="mb-3 border-b-2 border-[#0294CE] pb-2 text-center text-[11px] text-slate-500">Payslip for {monthName(m.month)}</p>
              <dl className="mb-3 space-y-1">{([["Employee", `${s.name} · ${s.emp_code}`], ["Designation", [s.designation, s.department].filter(Boolean).join(" · ")], ["Days paid", `${s.days_paid} of ${s.working_days}`]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3"><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>)}</dl>
              <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-[#f3f9fd] text-left text-[10.5px] uppercase text-slate-500"><th className="px-2 py-1.5 font-medium">Earnings</th><th className="px-2 py-1.5 font-medium">₹</th><th className="px-2 py-1.5 font-medium">Deductions</th><th className="px-2 py-1.5 font-medium">₹</th></tr></thead>
                <tbody>
                  {Array.from({ length: lines }, (_, i) => <tr key={i} className="border-b border-slate-100"><td className="px-2 py-1.5">{left[i]?.[0]}</td><td className="px-2 py-1.5">{left[i]?.[1]}</td><td className="px-2 py-1.5">{s.deductions[i]?.[0] === "TDS / other" ? "TDS" : s.deductions[i]?.[0]}</td><td className="px-2 py-1.5">{s.deductions[i] ? rupees(s.deductions[i][1]) : ""}</td></tr>)}
                  <tr className="font-semibold"><td className="px-2 py-1.5">Gross</td><td className="px-2 py-1.5">{rupees(gross)}</td><td className="px-2 py-1.5">Total deductions</td><td className="px-2 py-1.5">{rupees(deductions)}</td></tr>
                </tbody></table></div>
              <p className="mt-4"><b>Net pay: {rupees(s.net)}</b>{s.paid && m.slips.paid_on ? ` · paid${s.bank ? ` to ${s.bank}` : ""} on ${day(m.slips.paid_on)}` : s.bank ? ` · to ${s.bank}` : ""}</p>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

export function PayslipDownload() {
  const m = useMonth();
  const router = useRouter();
  const [dept, setDept] = useState("");
  const x = m.slips;
  const all = x?.ready ? x.items : [];
  const depts = [...new Set(all.map((i) => i.department).filter(Boolean))].sort();
  const rows = all.filter((i) => !dept || i.department === dept);
  const state = (i: Slip) => (i.paid ? "Paid" : statusName[x?.status ?? ""] ?? x?.status ?? "");
  return (
    <div data-report className="space-y-4">
      <Head title="Download" subtitle="Download the payslip of any employee. Every employee can also download their own from their portal." action={<button type="button" className={redBtn} disabled={!all.length} onClick={() => printSlips(x!.school, m.month, all)}>Download all ({all.length})</button>} />
      <ErrorBanner message={m.error} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Month<select aria-label="Month" value={m.month} onChange={(e) => m.setMonth(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{m.months.map((v) => <option key={v} value={v}>{monthName(v)}</option>)}</select></label>
        <label className="flex items-center gap-2 text-[13px] text-slate-600">Department<select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] outline-none"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></label>
        {m.month && <span className="ml-auto text-[12px] text-slate-500">{rows.length} employees · {monthName(m.month)}</span>}
      </div>
      <Table title={`Payslips · ${m.month ? monthName(m.month) : ""}`} noun="employees" exportName={`payslips-${m.month}`} empty={m.loading ? "Loading…" : "No payslips yet. They appear once finance approves the month."}
        head={[{ h: "Employee" }, { h: "Designation" }, { h: "Department" }, { h: "Net pay" }, { h: "Status" }, { h: "" }]}
        rows={rows.map((i) => ({ key: i.staff_id, find: `${i.name} ${i.emp_code} ${i.designation} ${i.department}`, out: [i.name, i.designation, i.department, i.net, state(i)], cells: [name(i.name, i.emp_code), i.designation || "—", i.department || "—", rupees(i.net), <Chip key="s" tone={i.paid ? "good" : "info"}>{state(i)}</Chip>, <span key="a" className="flex gap-1.5"><button type="button" className={pill} onClick={() => router.push(`/hr/payslips/payslips?tab=preview&month=${m.month}&staff=${i.staff_id}`)}>View</button><button type="button" className={pill} onClick={() => printSlips(x!.school, m.month, [i])}>Download</button></span>] }))} />
    </div>
  );
}
