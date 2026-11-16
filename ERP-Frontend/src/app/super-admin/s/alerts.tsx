"use client";

import Link from "next/link";
import { adminFetch, json } from "@/lib/admin-api";
import { fmtDay } from "@/components/admin/dash";
import { Tiles } from "@/components/admin/dash-ui";
import { useRange } from "@/components/admin/range";
import { useAction } from "@/components/admin/dash";
import { ErrorBanner, useLoad } from "@/components/admin/ui";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "new" | "acknowledged" | "resolved";
export interface DashboardAlert {
  id: string;
  category: "subscription" | "payment" | "security";
  severity: AlertSeverity;
  title: string;
  detail: string;
  school: { id: string; name: string; code: string } | null;
  when: string;
  href: string;
  status: AlertStatus;
}
interface Feed { alerts: DashboardAlert[]; counts: Record<string, number> }

const BAR: Record<AlertSeverity, string> = { critical: "bg-[#ac2c28]", warning: "bg-[#a86b12]", info: "bg-[#026f9b]" };
const CHIP: Record<AlertSeverity, string> = { critical: "bg-[#fce0df] text-[#ac2c28]", warning: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]" };
const ICON: Record<AlertSeverity, string> = { critical: "bg-[#fce0df] text-[#ac2c28]", warning: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]" };
const NAME: Record<AlertSeverity, string> = { critical: "Critical", warning: "Warning", info: "Info" };
const TITLE = { subscription: "Subscription alerts", payment: "Payment alerts", security: "Security alerts" } as const;
const LETTER = { subscription: "S", payment: "P", security: "!" } as const;

export function AlertIcon({ severity, letter }: { severity: AlertSeverity; letter?: string }) {
  return <span aria-hidden="true" className={`grid size-8 flex-none place-items-center rounded-lg text-xs font-bold ${ICON[severity]}`}>{letter ?? (severity === "critical" ? "!" : severity === "warning" ? "!" : "i")}</span>;
}

const whenText = (iso: string) => (iso.length > 10 ? fmtDay(iso.slice(0, 10)) : fmtDay(iso));

/**
 * Alerts built from live data, one per school or record, so one goes away as soon as its cause is fixed.
 * The team's answer (acknowledged or resolved) is remembered.
 */
export function AlertsPanel({ category }: { category: string }) {
  const range = useRange();
  const feed = useLoad(() => adminFetch<Feed>("/dashboard/alerts"), []);
  const { error: actionError, busy, run } = useAction(feed.reload);
  const cat = (["subscription", "payment", "security"] as const).find((c) => c === category) ?? "subscription";

  const all = feed.data?.alerts ?? [];
  const mine = all.filter((a) => a.category === cat);
  const open = mine.filter((a) => a.status !== "resolved");
  const notifications = all.filter((a) => a.status !== "resolved").slice(0, 10);
  const unread = all.filter((a) => a.status === "new").length;
  const critical = open.filter((a) => a.severity === "critical").length;
  const warning = open.filter((a) => a.severity === "warning").length;
  const resolved = mine.filter((a) => a.status === "resolved").length;
  const loading = feed.loading && !feed.data;

  const setState = (ids: string[], status: "acknowledged" | "resolved") => run(() => adminFetch("/dashboard/alerts/state", json("PUT", { ids, status })));
  const readAll = () => run(() => adminFetch("/dashboard/alerts/acknowledge-all", json("PUT", {})));

  return (
    <div className="space-y-5">
      <ErrorBanner message={feed.error || actionError} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base text-slate-900">All notifications</h2>
          <span className="text-xs font-semibold text-[#026f9b]">{unread} unread</span>
          <button type="button" disabled={busy || !unread} onClick={readAll} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400 disabled:opacity-50">Mark all as read</button>
        </div>
        {!notifications.length ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : "No notifications."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-start gap-3 px-5 py-2.5 hover:bg-slate-50">
                  <AlertIcon severity={a.severity} letter={LETTER[a.category]} />
                  <span className="min-w-0 flex-1"><b className={`block text-[13.5px] text-slate-900 ${a.status === "new" ? "font-bold" : "font-semibold"}`}>{a.title}</b><span className="block truncate text-xs text-slate-500">{a.school ? `${a.school.name} · ` : ""}{a.detail}</span><span className="text-[11.5px] text-slate-400">{whenText(a.when)}</span></span>
                  {a.status === "new" && <span className="mt-2 size-2 flex-none rounded-full bg-[#0294ce]" aria-label="Unread" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Tiles items={[
        { label: "Open", value: loading ? "…" : open.length, sub: `${mine.filter((a) => a.status === "new").length} not yet acknowledged` },
        { label: "Critical", value: loading ? "…" : critical, sub: "Act today" },
        { label: "Warning", value: loading ? "…" : warning, sub: "Act this week" },
        { label: "Resolved", value: loading ? "…" : resolved, sub: range.label },
      ]} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base text-slate-900">{TITLE[cat]}</h2>
          <span className="text-xs text-slate-500">{open.length} alert{open.length === 1 ? "" : "s"}</span>
          <button type="button" disabled={busy || !open.some((a) => a.status === "new")} onClick={() => run(() => adminFetch("/dashboard/alerts/acknowledge-all", json("PUT", { category: cat })))} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400 disabled:opacity-50">Acknowledge all</button>
        </div>
        {!mine.length ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">{loading ? "Loading…" : "Nothing needs attention here right now."}</p>
        ) : (
          <ul>
            {mine.map((a) => (
              <li key={a.id} className={`flex flex-wrap items-start gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0 ${a.status === "resolved" ? "opacity-60" : ""}`}>
                <span className={`w-1 flex-none self-stretch rounded ${BAR[a.severity]}`} aria-hidden="true" />
                <div className="min-w-[240px] flex-1">
                  <p className="flex flex-wrap items-center gap-2"><b className="font-semibold text-slate-900">{a.title}</b><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP[a.severity]}`}>{NAME[a.severity]}</span></p>
                  <p className="mt-1 text-sm text-slate-800">{a.detail}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{a.school ? `${a.school.name} · ` : ""}{whenText(a.when)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === "new" ? "bg-[#f8ecd6] text-[#8a5a0b]" : a.status === "acknowledged" ? "border border-slate-200 bg-slate-50 text-slate-600" : "bg-[#d9efe8] text-[#065740]"}`}>{a.status === "new" ? "New" : a.status === "acknowledged" ? "Acknowledged" : "Resolved"}</span>
                  {a.status === "new" && <button type="button" disabled={busy} onClick={() => setState([a.id], "acknowledged")} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400 disabled:opacity-50">Acknowledge</button>}
                  {a.status !== "resolved" && <button type="button" disabled={busy} onClick={() => setState([a.id], "resolved")} className="rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50">Resolve</button>}
                  <Link href={a.href} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400">View details</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
