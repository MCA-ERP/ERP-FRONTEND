"use client";

import { useState } from "react";
import { adminFetch, type Analytics } from "@/lib/admin-api";
import { BarRows, Panel, SimpleTable, StatGrid, TabBar, fmtDay, inr2, lakh, num } from "@/components/admin/dash";
import { ErrorBanner, PageHeader, useLoad } from "@/components/admin/ui";

type Tab = "monthly" | "annual" | "outstanding";

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

export default function RevenuePage() {
  const [tab, setTab] = useState<Tab>("monthly");
  const { data, error, loading } = useLoad(() => adminFetch<Analytics>("/payments/analytics"), []);

  return (
    <>
      <PageHeader title="Revenue analytics" subtitle="What has been invoiced, collected and is still owed. Figures are in rupees, before any rounding to lakh." />
      <ErrorBanner message={error} />
      {!data && loading && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}
      {data && (
        <div className="space-y-6">
          <TabBar value={tab} onChange={setTab} tabs={[["monthly", "Monthly revenue"], ["annual", "Annual revenue"], ["outstanding", "Outstanding payments", data.outstanding.length]]} />

          {tab === "monthly" && (
            <>
              <StatGrid
                items={[
                  { label: "Collected this month", value: lakh(data.totals.collected_this_month_paise), sub: "After refunds" },
                  { label: "Invoiced, last 12 months", value: lakh(data.monthly.reduce((a, m) => a + m.invoiced_paise, 0)) },
                  { label: "Collected, last 12 months", value: lakh(data.monthly.reduce((a, m) => a + m.net_paise, 0)), sub: "After refunds" },
                ]}
              />
              <Panel title="Collected by month" sub="Net of refunds">
                <BarRows rows={data.monthly.map((m): [string, number] => [monthLabel(m.month), m.net_paise])} format={lakh} />
              </Panel>
              <Panel title="Invoiced vs collected">
                <SimpleTable
                  head={[{ h: "Month" }, { h: "Invoiced", right: true }, { h: "Collected", right: true }, { h: "Refunded", right: true }, { h: "Net", right: true }]}
                  rows={[...data.monthly].reverse().map((m) => [monthLabel(m.month), inr2(m.invoiced_paise), inr2(m.collected_paise), inr2(m.refunded_paise), inr2(m.net_paise)])}
                />
              </Panel>
            </>
          )}

          {tab === "annual" && (
            <>
              <StatGrid
                items={[
                  { label: "This financial year", value: lakh(data.totals.collected_this_fy_paise), sub: "Collected, after refunds (April to March)" },
                  { label: "Years on record", value: num(data.byFinancialYear.length) },
                ]}
              />
              <Panel title="By financial year">
                <SimpleTable
                  head={[{ h: "Financial year" }, { h: "Invoiced", right: true }, { h: "Collected", right: true }, { h: "Refunded", right: true }, { h: "Net collected", right: true }]}
                  empty="No invoices have been issued yet."
                  rows={data.byFinancialYear.map((f) => [`FY ${f.fy}`, inr2(f.invoiced_paise), inr2(f.collected_paise), inr2(f.refunded_paise), inr2(f.net_paise)])}
                />
              </Panel>
            </>
          )}

          {tab === "outstanding" && (
            <>
              <StatGrid
                items={[
                  { label: "Outstanding", value: lakh(data.totals.outstanding_paise), sub: `${data.outstanding.length} invoices` },
                  { label: "Overdue", value: lakh(data.totals.overdue_paise) },
                  ...data.ageing.slice(2).map((a) => ({ label: a.label, value: lakh(a.total_paise), sub: `${a.count} invoices` })),
                ]}
              />
              <Panel title="Age of unpaid invoices">
                <BarRows rows={data.ageing.map((a): [string, number] => [a.label, a.total_paise])} format={lakh} />
              </Panel>
              <Panel title="Unpaid invoices" sub="Oldest first">
                <SimpleTable
                  head={[{ h: "Invoice" }, { h: "School" }, { h: "Due" }, { h: "Late by" }, { h: "Balance", right: true }]}
                  empty="Nothing is outstanding."
                  rows={data.outstanding.map((o) => [
                    <span key="n" className="font-mono text-xs font-semibold">{o.number}</span>,
                    o.school_name,
                    fmtDay(o.due_on),
                    o.days_late > 0 ? `${o.days_late} days` : "Not yet due",
                    inr2(o.balance_paise),
                  ])}
                />
              </Panel>
            </>
          )}
        </div>
      )}
    </>
  );
}
