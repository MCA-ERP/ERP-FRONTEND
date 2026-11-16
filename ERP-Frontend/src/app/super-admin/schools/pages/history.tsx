"use client";

import { useState } from "react";
import { adminFetch, type Paged } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/locale-format";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, fmtDay } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { SchoolBar, small } from "./shared";

export type HistoryTab = "activity" | "subscription" | "audit";
interface EventRow { id: string; type: string; summary: string; actor_name: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string }
interface SubHistory {
  subscriptions: { id: string; started_on: string; renews_on: string | null; trial_ends_on: string | null; ended_on: string | null; is_current: boolean; plans: { name: string } | null }[];
  invoices: { id: string; number: string; description: string; issue_date: string; due_on: string; total_paise: number; paid_paise: number; status: string }[];
}

const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
const words = (s: string) => { const t = s.replace(/[_.]/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };
const has = (text: string, q: string) => !q || text.toLowerCase().includes(q.trim().toLowerCase());

/** School History: what happened to one school: activity, plans and payments, and every changed field. */
export function SchoolHistory({ tab }: { tab: HistoryTab }) {
  return <SchoolBar>{(s) => <History id={s.id} tab={tab} name={s.name} />}</SchoolBar>;
}

function History({ id, tab, name }: { id: string; tab: HistoryTab; name: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ev = useLoad(() => (tab !== "subscription" ? adminFetch<Paged<EventRow>>(`/schools/${id}/history/activity?page=${page}`) : Promise.resolve(null)), [id, tab, page]);
  const sub = useLoad(() => (tab === "subscription" ? adminFetch<SubHistory>(`/schools/${id}/history/subscription`) : Promise.resolve(null)), [id, tab]);
  const events = ev.data?.items ?? [];

  const searchBox = <input className={`${inputCls} max-w-xs`} placeholder="Search" aria-label="Search history" value={search} onChange={(e) => setSearch(e.target.value)} />;
  const pager = ev.data && ev.data.total > ev.data.pageSize && (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
      <button type="button" className={small} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
      <span className="text-xs text-slate-500">Page {page}</span>
      <button type="button" className={small} disabled={page * ev.data.pageSize >= ev.data.total} onClick={() => setPage(page + 1)}>Older</button>
    </div>
  );

  if (tab === "activity") {
    const rows = events.filter((e) => has(`${e.type} ${e.summary} ${e.actor_name ?? ""}`, search));
    return (
      <div className="space-y-5">
        <ErrorBanner message={ev.error} />
        <Panel title="Activity history" sub={name} right={<button type="button" className={small} onClick={() => downloadCsv("school-activity", ["Date", "Event", "Details", "By"], rows.map((e) => [e.created_at, words(e.type), e.summary, e.actor_name ?? "System"]))}>Export</button>}>
          <div className="border-b border-slate-100 p-4">{searchBox}</div>
          <SimpleTable head={[{ h: "Date" }, { h: "Event" }, { h: "Details" }, { h: "By" }]} empty={ev.loading ? "Loading…" : "Nothing recorded yet."}
            rows={rows.map((e) => [fmtDay(e.created_at.slice(0, 10)), <b key="t" className="font-semibold text-slate-900">{words(e.type)}</b>, e.summary, e.actor_name || "System"])} />
          {pager}
        </Panel>
      </div>
    );
  }

  if (tab === "subscription") {
    const d = sub.data;
    type R = { at: string; event: string; plan: string; amount: number | null; invoice: string; result: [string, "good" | "warn" | "bad" | "info" | "mute"] };
    const all: R[] = [
      ...(d?.subscriptions ?? []).flatMap((s): R[] => {
        const plan = s.plans?.name ?? "—";
        const out: R[] = [{ at: s.started_on, event: s.trial_ends_on && !s.renews_on ? "Trial started" : "Subscribed", plan, amount: null, invoice: "—", result: ["Done", "good"] }];
        if (s.ended_on) out.push({ at: s.ended_on, event: "Plan ended", plan, amount: null, invoice: "—", result: ["Ended", "mute"] });
        return out;
      }),
      ...(d?.invoices ?? []).map((i): R => ({
        at: i.issue_date, event: i.description || "Invoice", plan: "—", amount: i.total_paise, invoice: i.number,
        result: i.status === "Paid" ? ["Paid", "good"] : i.status === "Overdue" ? ["Overdue", "bad"] : [i.status, "warn"],
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).filter((r) => has(`${r.event} ${r.plan} ${r.invoice}`, search));
    return (
      <div className="space-y-5">
        <ErrorBanner message={sub.error} />
        <Panel title="Subscription history" sub={name} right={<button type="button" className={small} onClick={() => downloadCsv("school-subscription-history", ["Date", "Event", "Plan", "Amount", "Invoice", "Result"], all.map((r) => [r.at.slice(0, 10), r.event, r.plan, r.amount === null ? "" : r.amount / 100, r.invoice, r.result[0]]))}>Export</button>}>
          <div className="border-b border-slate-100 p-4">{searchBox}</div>
          <SimpleTable head={[{ h: "Date" }, { h: "Event" }, { h: "Plan" }, { h: "Amount (incl. GST)", right: true }, { h: "Invoice" }, { h: "Result" }]} empty={sub.loading ? "Loading…" : "No subscription activity yet."}
            rows={all.map((r) => [fmtDay(r.at.slice(0, 10)), r.event, r.plan, r.amount === null ? "—" : rupees(r.amount), r.invoice, <Chip key="c" tone={r.result[1]}>{r.result[0]}</Chip>])} />
        </Panel>
      </div>
    );
  }

  // Audit trail: one row per changed field
  const changes = events.flatMap((e) => Object.keys(e.new_data ?? {}).map((k) => ({ at: e.created_at, who: e.actor_name || "System", field: words(k), old: show(e.old_data?.[k]), now: show(e.new_data?.[k]) })))
    .filter((r) => has(`${r.who} ${r.field} ${r.old} ${r.now}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={ev.error} />
      <Panel title="Audit trail" sub="Every changed value: who, when, and from what to what" right={<button type="button" className={small} onClick={() => downloadCsv("school-audit-trail", ["Time", "Changed by", "Field", "Old value", "New value"], changes.map((r) => [r.at, r.who, r.field, r.old, r.now]))}>Export</button>}>
        <div className="border-b border-slate-100 p-4">{searchBox}</div>
        <SimpleTable head={[{ h: "Time" }, { h: "Changed by" }, { h: "Field" }, { h: "Old value" }, { h: "New value" }]} empty={ev.loading ? "Loading…" : "No changes recorded yet."}
          rows={changes.map((r) => [formatDateTime(r.at), r.who, <b key="f" className="font-semibold text-slate-900">{r.field}</b>, <span key="o" className="text-slate-500">{r.old}</span>, r.now])} />
        {pager}
      </Panel>
    </div>
  );
}
