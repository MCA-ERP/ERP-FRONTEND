"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type Analytics } from "@/lib/admin-api";
import { BarRows, Panel, StatGrid, TabBar, fmtDay, inr2, lakh, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { downloadCsv } from "../users/shared";

const rs = (paise: number) => (paise / 100).toFixed(2);
const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

// ═════════════ Tax ═════════════
export function Tax() {
  const [part, setPart] = useState<"settings" | "reports">("settings");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["settings", "GST settings"], ["reports", "Tax reports"]]} />
      {part === "settings" ? <GstSettings /> : <TaxReports />}
    </>
  );
}

function GstSettings() {
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, string | number> }>("/payments/tax-settings"), []);
  const act = useAction(reload);
  const [d, setD] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setD(Object.fromEntries(Object.entries(data.settings).map(([k, v]) => [k, String(v ?? "")]))); }, [data]);
  const set = (k: string) => (e: { target: { value: string } }) => { setSaved(false); setD({ ...d, [k]: e.target.value }); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const values = { "billing.gst_rate_percent": Number(d["billing.gst_rate_percent"]), "general.gst_number": d["general.gst_number"] ?? "", "billing.supplier_state": d["billing.supplier_state"] ?? "", "billing.sac_code": d["billing.sac_code"] ?? "" };
    if (await act.run(() => adminFetch("/payments/tax-settings", json("PUT", { values })))) setSaved(true);
  };

  return (
    <Panel title="GST settings" sub="How GST is charged on invoices to schools.">
      <form onSubmit={save} className="space-y-4 p-5">
        <ErrorBanner message={error || act.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GST rate (%)" hint="Added to new invoices. Invoices already issued keep their rate."><input type="number" min={0} max={100} step="0.01" className={inputCls} value={d["billing.gst_rate_percent"] ?? ""} onChange={set("billing.gst_rate_percent")} /></Field>
          <Field label="Your GSTIN"><input className={inputCls} maxLength={20} value={d["general.gst_number"] ?? ""} onChange={set("general.gst_number")} /></Field>
          <Field label="Your state" hint="Decides the split: a school in the same state pays CGST + SGST, any other state pays IGST."><input className={inputCls} maxLength={60} value={d["billing.supplier_state"] ?? ""} onChange={set("billing.supplier_state")} placeholder="e.g. Karnataka" /></Field>
          <Field label="SAC code" hint="The service code for your invoices, as your accountant advises."><input className={inputCls} maxLength={20} value={d["billing.sac_code"] ?? ""} onChange={set("billing.sac_code")} /></Field>
        </div>
        <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}<button type="submit" className={btnPrimary} disabled={act.busy || !data}>Save changes</button></div>
      </form>
    </Panel>
  );
}

interface TaxRep {
  month: string; supplier_state: string;
  rows: { number: string; issue_date: string; school: string; gstin: string | null; state: string | null; place: string; taxable_paise: number; rate: number; cgst_paise: number; sgst_paise: number; igst_paise: number; total_paise: number }[];
  summary: { invoices: number; taxable_paise: number; cgst_paise: number; sgst_paise: number; igst_paise: number; tax_paise: number; total_paise: number; unknown_state: number; missing_gstin: number };
}

function TaxReports() {
  const months = useLoad(() => adminFetch<{ months: { month: string; invoices: number; taxable_paise: number; tax_paise: number }[] }>("/payments/tax-months"), []);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const rep = useLoad(() => adminFetch<TaxRep>(`/payments/tax-report?month=${month}`), [month]);
  const r = rep.data;

  const exportCsv = () => {
    if (!r) return;
    downloadCsv(`gst-${r.month}.csv`, [
      ["Invoice", "Date", "School", "GSTIN", "State", "Supply", "Taxable value", "GST rate %", "CGST", "SGST", "IGST", "Invoice total"],
      ...r.rows.map((x) => [x.number, x.issue_date, x.school, x.gstin ?? "", x.state ?? "", x.place, rs(x.taxable_paise), String(x.rate), rs(x.cgst_paise), rs(x.sgst_paise), rs(x.igst_paise), rs(x.total_paise)]),
      ["TOTAL", "", "", "", "", "", rs(r.summary.taxable_paise), "", rs(r.summary.cgst_paise), rs(r.summary.sgst_paise), rs(r.summary.igst_paise), rs(r.summary.total_paise)],
    ]);
  };

  return (
    <div className="space-y-6">
      <ErrorBanner message={months.error} />
      <Panel title="Tax reports" sub="GST collected each month, ready for filing. Based on invoices issued in the month, not voided ones.">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <select className={`${inputCls} max-w-[14rem]`} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.data?.months.map((m) => <option key={m.month} value={m.month}>{monthName(m.month)} · {m.invoices} invoices</option>)}
          </select>
          <button type="button" className={btnGhost} disabled={!r?.rows.length} onClick={exportCsv}>Download CSV</button>
        </div>
        {rep.error && <div className="px-4 pb-4"><ErrorBanner message={rep.error} /></div>}
        {r && (
          <>
            <div className="px-4"><StatGrid items={[{ label: "Taxable value", value: inr2(r.summary.taxable_paise), sub: `${r.summary.invoices} invoices` }, { label: "CGST", value: inr2(r.summary.cgst_paise) }, { label: "SGST", value: inr2(r.summary.sgst_paise) }, { label: "IGST", value: inr2(r.summary.igst_paise), sub: `Total tax ${inr2(r.summary.tax_paise)}` }]} /></div>
            {(r.summary.unknown_state > 0 || r.summary.missing_gstin > 0) && (
              <p className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {r.summary.unknown_state > 0 && <>{r.summary.unknown_state} invoice(s) are for schools with no state on record and are shown as IGST. </>}
                {r.summary.missing_gstin > 0 && <>{r.summary.missing_gstin} school(s) have no GSTIN. Fix these on each school&apos;s Profile before filing.</>}
              </p>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><Th>Invoice</Th><Th>School</Th><Th>Supply</Th><Th>Taxable</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {!r.rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No invoices were issued in {monthName(r.month)}.</td></tr>}
                  {r.rows.map((x) => (
                    <tr key={x.number}>
                      <td className="px-4 py-2.5"><p className="font-mono text-xs font-semibold">{x.number}</p><p className="text-xs text-slate-400">{fmtDay(x.issue_date)}</p></td>
                      <td className="px-4 py-2.5"><p className="text-slate-800">{x.school}</p><p className="font-mono text-xs text-slate-400">{x.gstin ?? "No GSTIN"}</p></td>
                      <td className="px-4 py-2.5"><Badge tone={x.place === "Within state" ? "green" : x.place === "Other state" ? "blue" : "gray"}>{x.place}</Badge></td>
                      <td className="px-4 py-2.5 tabular-nums">{inr2(x.taxable_paise)}</td><td className="px-4 py-2.5 tabular-nums">{inr2(x.cgst_paise)}</td><td className="px-4 py-2.5 tabular-nums">{inr2(x.sgst_paise)}</td><td className="px-4 py-2.5 tabular-nums">{inr2(x.igst_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Refunds are not netted off here. Issue a credit note through your accounts if a refund needs to reduce the GST you owe.</p>
          </>
        )}
      </Panel>
    </div>
  );
}

// ═════════════ Revenue ═════════════
export function Revenue() {
  const [part, setPart] = useState<"daily" | "monthly" | "annual">("monthly");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["daily", "Daily"], ["monthly", "Monthly"], ["annual", "Annual"]]} />
      {part === "daily" ? <Daily /> : <MonthlyAnnual annual={part === "annual"} />}
    </>
  );
}

interface Daily { month: string; days: { date: string; invoiced_paise: number; collected_paise: number; refunded_paise: number; net_paise: number; payments: number }[]; totals: { invoiced_paise: number; collected_paise: number; refunded_paise: number; net_paise: number } }

function Daily() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, error, loading } = useLoad(() => adminFetch<Daily>(`/payments/revenue/daily?month=${month}`), [month]);
  const exportCsv = () => data && downloadCsv(`revenue-daily-${data.month}.csv`, [["Date", "Invoiced", "Collected", "Refunded", "Net", "Payments"], ...data.days.map((d) => [d.date, rs(d.invoiced_paise), rs(d.collected_paise), rs(d.refunded_paise), rs(d.net_paise), String(d.payments)])]);
  const active = data?.days.filter((d) => d.collected_paise || d.refunded_paise || d.invoiced_paise) ?? [];
  const max = Math.max(1, ...(data?.days.map((d) => d.net_paise) ?? [1]));

  return (
    <Panel title="Daily revenue" sub="Money collected each day" right={<div className="flex gap-2"><input type="month" className={`${inputCls} !py-1.5`} aria-label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /><button type="button" className={btnGhost} disabled={!data} onClick={exportCsv}>Download CSV</button></div>}>
      <div className="space-y-4 p-5">
        <ErrorBanner message={error} />
        {data && <StatGrid items={[{ label: "Collected", value: inr2(data.totals.collected_paise) }, { label: "Refunded", value: inr2(data.totals.refunded_paise) }, { label: "Net", value: inr2(data.totals.net_paise) }, { label: "Invoiced", value: inr2(data.totals.invoiced_paise) }]} />}
        {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
        {data && (
          <div className="flex h-32 items-end gap-0.5" role="img" aria-label="Net collected per day">
            {data.days.map((d) => <div key={d.date} title={`${fmtDay(d.date)}: ${inr2(d.net_paise)}`} className="flex-1 rounded-t bg-mca-blue/70" style={{ height: Math.max(2, Math.round((Math.max(0, d.net_paise) / max) * 100)) + "%" }} />)}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Payments</Th><Th>Collected</Th><Th>Refunded</Th><Th>Net</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!active.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No money moved this month.</td></tr>}
            {active.map((d) => <tr key={d.date}><td className="px-4 py-2.5">{fmtDay(d.date)}</td><td className="px-4 py-2.5 tabular-nums">{d.payments}</td><td className="px-4 py-2.5 tabular-nums">{inr2(d.collected_paise)}</td><td className="px-4 py-2.5 tabular-nums text-rose-700">{d.refunded_paise ? inr2(d.refunded_paise) : "—"}</td><td className="px-4 py-2.5 font-semibold tabular-nums">{inr2(d.net_paise)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MonthlyAnnual({ annual }: { annual: boolean }) {
  const { data, error } = useLoad(() => adminFetch<Analytics>("/payments/analytics"), []);
  const rows = annual
    ? (data?.byFinancialYear ?? []).map((f) => ({ label: `FY ${f.fy}`, ...f }))
    : (data?.monthly ?? []).slice().reverse().map((m) => ({ label: monthName(m.month), ...m }));
  const exportCsv = () => data && downloadCsv(annual ? "revenue-annual.csv" : "revenue-monthly.csv", [[annual ? "Financial year" : "Month", "Invoiced", "Collected", "Refunded", "Net"], ...rows.map((r) => [r.label, rs(r.invoiced_paise), rs(r.collected_paise), rs(r.refunded_paise), rs(r.net_paise)])]);
  return (
    <Panel title={annual ? "Annual revenue" : "Monthly revenue"} sub={annual ? "Revenue by financial year (April to March)" : "Money collected each month, last 12 months"} right={<button type="button" className={btnGhost} disabled={!data} onClick={exportCsv}>Download CSV</button>}>
      <div className="space-y-4 p-5">
        <ErrorBanner message={error} />
        {data && <StatGrid items={[{ label: "This month", value: lakh(data.totals.collected_this_month_paise), sub: "After refunds" }, { label: "This financial year", value: lakh(data.totals.collected_this_fy_paise) }, { label: "Outstanding", value: lakh(data.totals.outstanding_paise) }, { label: "Overdue", value: lakh(data.totals.overdue_paise) }]} />}
        {!annual && data && <BarRows rows={data.monthly.map((m) => [m.month, Math.max(0, m.net_paise)] as [string, number])} format={(n) => lakh(n)} />}
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>{annual ? "Financial year" : "Month"}</Th><Th>Invoiced</Th><Th>Collected</Th><Th>Refunded</Th><Th>Net</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => <tr key={r.label}><td className="px-4 py-2.5 font-semibold text-slate-800">{r.label}</td><td className="px-4 py-2.5 tabular-nums">{inr2(r.invoiced_paise)}</td><td className="px-4 py-2.5 tabular-nums">{inr2(r.collected_paise)}</td><td className="px-4 py-2.5 tabular-nums text-rose-700">{r.refunded_paise ? inr2(r.refunded_paise) : "—"}</td><td className="px-4 py-2.5 font-semibold tabular-nums">{inr2(r.net_paise)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
