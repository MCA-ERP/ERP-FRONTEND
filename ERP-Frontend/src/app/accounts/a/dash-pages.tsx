"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";
import { useAccounts } from "../context";
import { sectionHref } from "./menu-config";
import { FlowStrip } from "./flow";

const blueBtn = "rounded-full bg-[#026f9b] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const whiteBtn = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:border-slate-400 disabled:opacity-60";
const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";

/** ₹35,02,584 as shown on a tile; ₹7.8L and ₹1.2 Cr on a chart. */
export const short = (n: number) => { const v = Math.abs(n); const s = n < 0 ? "−" : ""; if (v >= 10_000_000) return `${s}₹${(v / 10_000_000).toFixed(v >= 100_000_000 ? 0 : 2).replace(/\.?0+$/, "")} Cr`; if (v >= 100_000) return `${s}₹${(v / 100_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")} L`; return `${s}${inr(v)}`; };
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;

function Tile({ label, value, sub, bg, tone }: { label: string; value: ReactNode; sub?: ReactNode; bg: string; tone?: string }) {
  return <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[26px] font-bold leading-tight tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>{sub && <p className="mt-0.5 text-xs text-slate-700">{sub}</p>}</div>;
}
const TileGrid = ({ children, cols = 4 }: { children: ReactNode; cols?: number }) => <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${cols > 4 ? 150 : 200}px, 1fr))` }}>{children}</div>;
const GREEN = "bg-[#d9efe8]", BLUE = "bg-[#dceff9]", AMBER = "bg-[#f8ecd6]";

/** Horizontal bars with a label on the left and the amount on the right. */
function Bars({ rows, format = inr }: { rows: { label: string; total: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="p-6 text-center text-sm text-slate-400">Nothing yet.</p>;
  return <div className="space-y-3 px-5 py-4">{rows.map((r) => <div key={r.label} className="flex items-center gap-3 text-[12.5px]"><span className="w-28 shrink-0 text-slate-900">{r.label}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${Math.min(100, (r.total / max) * 100)}%` }} /></span><span className="w-28 text-right tabular-nums text-slate-700">{format(r.total)}</span></div>)}</div>;
}

// ═════════════ overview ═════════════
interface Overview {
  year_start: string; today: string;
  steps: { n: number; label: string; done: boolean }[];
  tiles: { today: { amount: number; receipts: number }; month: { amount: number; receipts: number }; outstanding: { amount: number; overdue_students: number }; rate: number };
  scope_note: string; month_note: string;
  by_month: { label: string; total: number; current: boolean }[];
  by_mode: { label: string; total: number }[]; by_class: { label: string; total: number }[];
  books: { income: number; expenditure: number; surplus: number; bank: number | null; bank_as_of: string | null };
  latest: { receipt_no: string; student: string; total: number; mode: string; paid_on: string; issued_by: string }[];
}

export function Overview() {
  const r = useLoad(() => schoolFetch<Overview>("/accounts/overview"), []);
  const x = r.data; const router = useRouter();
  if (!x) return <><Head title="Overview" /><Loading e={r.error} /></>;
  const y = Number(x.year_start.slice(0, 4));
  const max = Math.max(1, ...x.by_month.map((m) => m.total));
  const top = (() => { const s = String(Math.pow(10, Math.floor(Math.log10(max)))); const base = Number(s); return Math.ceil(max / base) * base; })();
  return (
    <div>
      <Head title="Overview" subtitle={`Fee collection for ${y}-${String((y + 1) % 100).padStart(2, "0")} across the whole school, updated with every receipt.`} />
      <FlowStrip active={7} />
      <ErrorBanner message={r.error} />
      <TileGrid>
        <Tile label="Collected today" value={inr(x.tiles.today.amount)} sub={`${x.tiles.today.receipts} receipts`} bg={GREEN} />
        <Tile label="This month" value={inr(x.tiles.month.amount)} sub={`${x.tiles.month.receipts} receipts`} bg={BLUE} />
        <Tile label="Outstanding" value={inr(x.tiles.outstanding.amount)} sub={`${x.tiles.outstanding.overdue_students} overdue`} bg={AMBER} tone="text-[#8a5a0b]" />
        <Tile label="Collection rate" value={`${x.tiles.rate}%`} sub="Of dues to date" bg={GREEN} />
      </TileGrid>
      <p className="mt-4 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-700">{x.scope_note}</p>
      <div className="mt-5"><Panel title="Collection by month" sub={`${y}-${String((y + 1) % 100).padStart(2, "0")}`}>
        <div className="px-5 pb-4 pt-5">
          <div className="relative flex h-56 items-end gap-3 border-b border-slate-200 pl-14">
            {[1, 0.5, 0].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ bottom: `${f * 100}%` }}><span className="absolute -top-2.5 left-0 w-12 text-right text-[12px] text-slate-500">{short(top * f)}</span></div>)}
            {x.by_month.map((m) => <div key={m.label} className="relative z-10 flex h-full flex-1 items-end"><div title={inr(m.total)} className={`w-full rounded-t-md ${m.current ? "bg-[#c0e4f3]" : "bg-[#7fcbe8]"}`} style={{ height: `${Math.max(1, (m.total / top) * 100)}%` }} /></div>)}
          </div>
          <div className="flex gap-3 pl-14">{x.by_month.map((m) => <span key={m.label} className="flex-1 pt-2 text-center text-[13px] text-slate-700">{m.label}</span>)}</div>
          {x.month_note && <p className="mt-3 text-[11px] text-slate-500">{x.month_note}</p>}
        </div>
      </Panel></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="By payment method" sub="Share of collection"><Bars rows={x.by_mode} /></Panel>
        <Panel title="Outstanding by class" sub="Overdue and due now"><Bars rows={x.by_class} /></Panel>
      </div>
      <div className="mt-5"><Panel title={`Income and expenditure · ${y}-${String((y + 1) % 100).padStart(2, "0")}`} sub="From the books" right={<button type="button" className={pillBtn} onClick={() => router.push(sectionHref("accounting", "financial-statements"))}>Statements</button>}>
        <div className="p-4"><TileGrid>
          <Tile label="Income" value={inr(x.books.income)} sub="Net of concessions" bg={BLUE} />
          <Tile label="Expenditure" value={inr(x.books.expenditure)} sub="Approved and paid" bg={BLUE} />
          <Tile label="Surplus" value={inr(x.books.surplus)} sub="So far this year" bg={BLUE} />
          <Tile label="Bank balance" value={x.books.bank === null ? "Not set" : inr(x.books.bank)} sub={x.books.bank === null ? "Set the opening balance in Budgets & Forecasts" : `From the opening balance of ${dmy(x.books.bank_as_of!)}`} bg={BLUE} />
        </TileGrid></div>
      </Panel></div>
      <div className="mt-5"><Panel title="Latest receipts" sub={`Last ${x.latest.length}`} right={<button type="button" className={pillBtn} onClick={() => router.push(sectionHref("receipts-ledger", "receipts-ledger"))}>All receipts</button>}>
        {x.latest.length ? <ul>{x.latest.map((p) => <li key={p.receipt_no} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className="grid size-8 place-items-center rounded-full bg-[#d9efe8] text-[13px] font-bold text-[#065740]">₹</span><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-slate-900">{p.student}</span><span className="block text-[11.5px] text-slate-500">{p.receipt_no} · {p.mode} · {p.issued_by}</span></span><span className="text-[12.5px] tabular-nums text-slate-600">{inr(p.total)}</span></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">No receipts yet.</p>}
      </Panel></div>
    </div>
  );
}

// ═════════════ leadership live ═════════════
interface Live {
  today: string; stamp: string;
  tiles: { today: { amount: number; receipts: number }; month: { amount: number; receipts: number }; outstanding: { amount: number; overdue_students: number }; revenue: { amount: number; pct_of_budget: number | null }; concessions: { amount: number; pct_of_billed: number } };
  by_hour: { label: string; total: number }[]; recent: { amount: number; student: string; mode: string; at: string }[];
  buckets: { label: string; total: number }[]; concessions: { label: string; total: number }[];
  revenue_table: { head: string; budget: number | null; actual: number; variance: number | null }[];
}
export function LeadershipLive() {
  const [first, setFirst] = useState(-1);
  const [at, setAt] = useState("");
  const r = useLoad(async () => { const d = await schoolFetch<Live>("/accounts/leadership"); setFirst((f) => (f < 0 ? d.tiles.today.receipts : f)); setAt(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).toLowerCase()); return d; }, []);
  const reload = r.reload;
  useEffect(() => { const t = window.setInterval(() => reload(), 30000); return () => window.clearInterval(t); }, [reload]);
  const x = r.data;
  if (!x) return <><Head title="Leadership Live" /><Loading e={r.error} /></>;
  const fresh = Math.max(0, x.tiles.today.receipts - (first < 0 ? x.tiles.today.receipts : first));
  const y = Number(x.today.slice(0, 4)); const fy = x.today.slice(5, 7) >= "04" ? y : y - 1;
  const t = x.tiles;
  return (
    <div className="space-y-5">
      <Head title="Leadership Live" subtitle="Collections, outstanding, revenue and concessions for the Principal, Correspondent and Trust, updated the moment a payment lands." />
      <ErrorBanner message={r.error} />
      <p className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">● Live · last updated {at} · {fresh} new {fresh === 1 ? "payment" : "payments"} since you opened this</p>
      <TileGrid cols={5}>
        <Tile label="Collected today" value={inr(t.today.amount)} sub={`${t.today.receipts} receipts`} bg={GREEN} />
        <Tile label="This month" value={short(t.month.amount)} sub={`${t.month.receipts} receipts`} bg={BLUE} />
        <Tile label="Outstanding" value={short(t.outstanding.amount)} sub={`${t.outstanding.overdue_students} students overdue`} bg={AMBER} tone="text-[#8a5a0b]" />
        <Tile label={`Revenue ${fy}-${String((fy + 1) % 100).padStart(2, "0")}`} value={short(t.revenue.amount)} sub={t.revenue.pct_of_budget === null ? "No revenue budget set" : `${t.revenue.pct_of_budget}% of budget to date`} bg={GREEN} />
        <Tile label="Concessions given" value={short(t.concessions.amount)} sub={`${t.concessions.pct_of_billed}% of billed fees`} bg={BLUE} />
      </TileGrid>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Today by the hour" sub={dmy(x.today)}><Bars rows={x.by_hour} format={short} /></Panel>
        <Panel title="Payments as they land" sub="From the gateway, counter and bank">{x.recent.length ? <ul>{x.recent.map((p, i) => <li key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px] first:border-t-0"><span><b>{inr(p.amount)}</b> <span className="text-slate-500">{p.student} · {p.mode}</span></span><span className="text-[12px] text-slate-500">{p.at}</span></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">No payments yet today.</p>}</Panel>
        <Panel title="Outstanding by age" sub="All fee heads"><Bars rows={x.buckets} format={short} /></Panel>
        <Panel title={`Concessions given · ${fy}-${String((fy + 1) % 100).padStart(2, "0")}`} sub="By type"><Bars rows={x.concessions} format={short} /></Panel>
      </div>
      <Panel title={`Revenue against budget · ${fy}-${String((fy + 1) % 100).padStart(2, "0")}`} sub="April to date">
        <SimpleTable head={[{ h: "Head" }, { h: "Budget to date" }, { h: "Actual" }, { h: "Variance" }]} empty="No fees collected yet." rows={x.revenue_table.map((q) => [<b key="h">{q.head}</b>, q.budget === null ? <span key="b" className="text-slate-400">Not set</span> : short(q.budget), short(q.actual), q.variance === null ? "—" : <span key="v" className={q.variance < 0 ? "text-[#ac2c28]" : "text-[#065740]"}>{q.variance < 0 ? "−" : "+"}{short(Math.abs(q.variance))}</span>])} />
      </Panel>
    </div>
  );
}

// ═════════════ notifications ═════════════
interface Note { key: string; tone: "bad" | "warn" | "info" | "good"; title: string; note: string; when: string; read: boolean; tab?: string }
const NOTE_HREF: Record<string, string> = { "installment-dues": sectionHref("installment-dues", "installment-dues"), reconciliation: `${sectionHref("dashboard", "finance-dashboard")}?tab=reconciliation`, insights: sectionHref("dashboard", "ai-insights") };
const NOTE_ICON = { bad: ["!", "bg-[#fce0df] text-[#ac2c28]"], warn: ["–", "bg-[#f8ecd6] text-[#8a5a0b]"], info: ["D", "bg-[#dceff9] text-[#026f9b]"], good: ["✓", "bg-[#d9efe8] text-[#065740]"] } as const;

export function Notifications() {
  const a = useAccounts(); const router = useRouter();
  const r = useLoad(() => schoolFetch<{ items: Note[]; unread: number }>("/accounts/notifications"), []);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const open = (n: Note) => { void act.run(() => schoolFetch("/accounts/notifications/read", json("POST", { keys: [n.key] }))); if (n.tab && NOTE_HREF[n.tab]) router.push(NOTE_HREF[n.tab]); };
  return (
    <div>
      <Head title="Notifications" subtitle="Everything the portal has told you recently. Open one to go straight to it." action={<button type="button" className={whiteBtn} disabled={act.busy || !r.data?.unread} onClick={() => void act.run(() => schoolFetch("/accounts/notifications/read", json("POST", {})))}>Mark all as read</button>} />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="All notifications">
        {!r.data ? <p className="p-6 text-center text-sm text-slate-400">Loading…</p> : !r.data.items.length ? <p className="p-6 text-center text-sm text-slate-400">Nothing new. You are up to date.</p> : <ul>{r.data.items.map((n) => (
          <li key={n.key} className={`border-t border-slate-100 first:border-t-0 ${n.read ? "" : "bg-[#f3f9fd]"}`}><button type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold ${NOTE_ICON[n.tone][1]}`}>{NOTE_ICON[n.tone][0]}</span>
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-slate-900">{n.title}</span><span className="block text-[12px] text-slate-500">{n.note}</span><span className="block text-[11.5px] text-slate-500">{n.when}</span></span>
            {!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
          </button></li>
        ))}</ul>}
      </Panel>
    </div>
  );
}

// ═════════════ sent messages ═════════════
export function SentMessages() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; sent_on: string; to: string; channel: string; message: string; sent: number; delivered: number; status: string }[]; messages: number; recipients: number; delivered_pct: number; not_delivered: number }>("/accounts/sent-messages"), []);
  const [q, setQ] = useState("");
  const x = r.data;
  const rows = (x?.items ?? []).filter((m) => has(m, q));
  return (
    <div>
      <Head title="Sent Messages" subtitle="Messages this portal has sent to parents, students and staff: SMS, email, WhatsApp and app." />
      <ErrorBanner message={r.error} />
      {x && <div className="mb-5"><TileGrid>
        <Tile label="Messages" value={x.messages} sub="Last 10 days" bg={BLUE} />
        <Tile label="Recipients" value={x.recipients.toLocaleString("en-IN")} sub="Across all messages" bg={BLUE} />
        <Tile label="Delivered" value={`${x.delivered_pct}%`} sub={`${x.not_delivered} not delivered`} bg={GREEN} />
      </TileGrid></div>}
      <ListPanel title="Sent messages" noun="messages" search={q} onSearch={setQ} exportName="sent-messages" head={["Sent", "To", "Channel", "Message", "Delivered", "Status"]}
        exportRows={rows.map((m) => [dmy(m.sent_on), m.to, m.channel, m.message, `${m.delivered} of ${m.sent}`, m.status])} tableHead={["Sent", "To", "Channel", "Message", "Delivered", "Status"]}
        rows={rows.map((m) => [dmy(m.sent_on), <b key="t">{m.to}</b>, m.channel, m.message, `${m.delivered} of ${m.sent}`, <Chip key="s" tone={m.status === "Delivered" ? "good" : m.status === "Not delivered" ? "bad" : "warn"}>{m.status}</Chip>])} empty="No messages have gone out in the last 10 days." />
    </div>
  );
}

// ═════════════ staff exit clearance ═════════════
export function ExitClearance() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; name: string; designation: string; last_day: string; advance: number; state: string }[] }>("/accounts/exit-clearance"), []);
  const act = useAction(() => r.reload());
  const [q, setQ] = useState("");
  const rows = (r.data?.items ?? []).filter((m) => has(m, q));
  const check = (a: number) => (a > 0 ? `Salary advance ${inr(a)} to recover` : "No advance");
  return (
    <div>
      <Head title="Staff Exit Clearance" subtitle="Staff leaving the school. Confirm they owe accounts nothing (advances settled). HR can't pay the final settlement until every department clears them." />
      <ErrorBanner message={r.error || act.error} />
      <ListPanel title="Staff exit clearance · Accounts" noun="leavers" search={q} onSearch={setQ} exportName="staff-exit-clearance-accounts" head={["Leaver", "Designation", "Last day", "Check", "Status"]}
        exportRows={rows.map((m) => [m.name, m.designation, dmy(m.last_day), check(m.advance), m.state])} tableHead={["Leaver", "Last day", "Check", "Status", ""]}
        rows={rows.map((m) => [<div key="n"><p className="font-semibold text-slate-900">{m.name}</p><p className="text-[11px] text-slate-500">{m.designation}</p></div>, dmy(m.last_day), check(m.advance), <Chip key="s" tone={m.state === "Cleared" ? "good" : m.state === "Pending" ? "warn" : "mute"}>{m.state}</Chip>, m.state === "Pending" ? <button key="b" type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/accounts/exit-clearance/${m.id}`, json("POST", {})))}>Mark cleared</button> : null])} empty="Nobody is leaving at the moment." />
    </div>
  );
}
