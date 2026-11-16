"use client";

import { adminFetch, type Analytics } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, inr2, lakh, num } from "@/components/admin/dash";
import { Change, Chip, ColumnChart, CountBars, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";

type Tab = "monthly" | "annual" | "outstanding";

const monthShort = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
const monthLong = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
const rate = (collected: number, invoiced: number) => (invoiced > 0 ? `${Math.round((collected / invoiced) * 100)}%` : "—");

/** Revenue Analytics: what was invoiced, collected and is still owed. */
export default function RevenuePage({ tab = "monthly" }: { tab?: Tab }) {
  const { data, error, loading } = useLoad(() => adminFetch<Analytics>("/payments/analytics"), []);

  return (
    <>
      <ErrorBanner message={error} />
      {!data && loading && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}
      {data && <Body data={data} tab={tab} />}
    </>
  );
}

function Body({ data, tab }: { data: Analytics; tab: Tab }) {
  const months = data.monthly;
  const now = months[months.length - 1];
  const last = months[months.length - 2];
  const best = months.reduce((b, m) => (m.net_paise > b.net_paise ? m : b), months[0]);
  const average = months.reduce((a, m) => a + m.net_paise, 0) / Math.max(1, months.length);
  const lastChange = last && months[months.length - 3] && months[months.length - 3].net_paise > 0 ? Math.round(((last.net_paise - months[months.length - 3].net_paise) / months[months.length - 3].net_paise) * 100) : null;

  const fy = [...data.byFinancialYear].sort((a, b) => a.fy.localeCompare(b.fy));
  const thisFy = data.byFinancialYear[0];
  const prevFy = data.byFinancialYear[1];

  const oldest = data.outstanding.reduce((m, o) => Math.max(m, o.days_late), 0);

  return (
    <div className="space-y-5">
      {tab === "monthly" && (
        <>
          <Tiles items={[
            { label: "This month (to date)", value: lakh(now.net_paise), sub: `${monthLong(now.month)} so far` },
            { label: "Last month", value: last ? lakh(last.net_paise) : "—", sub: lastChange === null ? "Collected, after refunds" : <><Change text={`${Math.abs(lastChange)}%`} up={lastChange >= 0} good={lastChange >= 0} /> vs the month before</> },
            { label: "Best month", value: lakh(best.net_paise), sub: best.net_paise > 0 ? monthLong(best.month) : "No collections yet" },
            { label: "Monthly average", value: lakh(average), sub: "Last 12 months" },
          ]} />
          <Panel title="Collected by month" sub={`${monthLong(months[0].month)} - ${monthLong(now.month)}, ₹ lakh, after refunds`}>
            <ColumnChart data={months.map((m) => ({ label: monthShort(m.month), value: m.net_paise, partial: m.month === now.month, note: m.month === now.month ? "month so far" : undefined }))} format={lakh} title="Collected by month" />
            <p className="px-5 pb-4 text-xs text-slate-600">{monthLong(now.month)} is month to date.</p>
          </Panel>
          <Panel title="Month by month">
            <SimpleTable
              head={[{ h: "Month" }, { h: "Invoiced", right: true }, { h: "Collected", right: true }, { h: "Refunded", right: true }, { h: "Collection rate", right: true }, { h: "" }]}
              rows={[...months].reverse().map((m) => [monthLong(m.month), lakh(m.invoiced_paise), lakh(m.net_paise), lakh(m.refunded_paise), rate(m.net_paise, m.invoiced_paise), <ViewButton key="v" href="/super-admin/payments" />])}
            />
          </Panel>
        </>
      )}

      {tab === "annual" && (
        <>
          <Tiles items={[
            { label: "This financial year", value: lakh(data.totals.collected_this_fy_paise), sub: "Collected, after refunds (April to March)" },
            { label: "Last financial year", value: prevFy ? lakh(prevFy.net_paise) : "—", sub: prevFy ? `FY ${prevFy.fy}` : "No earlier year yet" },
            { label: "Invoiced this year", value: thisFy ? lakh(thisFy.invoiced_paise) : "—", sub: thisFy ? `Collection rate ${rate(thisFy.net_paise, thisFy.invoiced_paise)}` : undefined },
            { label: "Years on record", value: num(data.byFinancialYear.length) },
          ]} />
          <Panel title="Collected by financial year" sub="₹ lakh, after refunds">
            <ColumnChart data={fy.map((f) => ({ label: `FY ${f.fy}`, value: f.net_paise }))} format={lakh} title="Collected by financial year" />
          </Panel>
          <Panel title="By financial year">
            <SimpleTable
              head={[{ h: "Financial year" }, { h: "Invoiced", right: true }, { h: "Collected", right: true }, { h: "Refunded", right: true }, { h: "Net collected", right: true }, { h: "Collection rate", right: true }]}
              empty="No invoices have been issued yet."
              rows={data.byFinancialYear.map((f) => [`FY ${f.fy}`, inr2(f.invoiced_paise), inr2(f.collected_paise), inr2(f.refunded_paise), inr2(f.net_paise), rate(f.net_paise, f.invoiced_paise)])}
            />
          </Panel>
        </>
      )}

      {tab === "outstanding" && (
        <>
          <Tiles items={[
            { label: "Outstanding", value: lakh(data.totals.outstanding_paise), sub: `${data.outstanding.length} invoice${data.outstanding.length === 1 ? "" : "s"} not fully paid` },
            { label: "Overdue", value: lakh(data.totals.overdue_paise), sub: "Past the due date" },
            { label: "Oldest overdue", value: oldest ? `${oldest} days` : "—" },
          ]} />
          <Panel title="How late" sub="What is still owed, by how overdue it is"><CountBars rows={data.ageing.map((a): [string, number] => [a.label, a.total_paise])} format={lakh} /></Panel>
          <Panel title="Outstanding invoices" sub={`${data.outstanding.length} invoice${data.outstanding.length === 1 ? "" : "s"}`}>
            <SimpleTable
              head={[{ h: "Invoice" }, { h: "School" }, { h: "Due" }, { h: "Late by", right: true }, { h: "Balance", right: true }, { h: "Status" }, { h: "" }]}
              empty="Nothing is outstanding."
              rows={data.outstanding.map((o) => [
                <div key="i"><p className="font-semibold text-slate-900">{o.number}</p><p className="text-xs text-slate-400">{o.description}</p></div>,
                o.school_name,
                fmtDay(o.due_on),
                o.days_late ? `${o.days_late} days` : "—",
                inr2(o.balance_paise),
                <Chip key="s" tone={o.status === "Overdue" ? "bad" : "info"}>{o.status}</Chip>,
                <ViewButton key="v" href="/super-admin/payments" />,
              ])}
            />
          </Panel>
        </>
      )}
    </div>
  );
}
