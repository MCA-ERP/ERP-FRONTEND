"use client";

import Link from "next/link";
import { adminFetch } from "@/lib/admin-api";
import { Badge, ErrorBanner, useLoad } from "@/components/admin/ui";

interface Alert { key: string; severity: "critical" | "warning" | "info"; title: string; detail: string; count: number; href: string }
interface SecurityAlert { id: string; severity: string; title: string; detail: string; when?: string }

const TONE = { critical: "red", warning: "gray", info: "blue" } as const;
const BELONGS: Record<"subscription" | "payment", RegExp> = {
  subscription: /renew|trial|expir|subscription|plan|limit/i,
  payment: /invoice|payment|overdue|refund|collect|failed_pay/i,
};

const Empty = ({ text }: { text: string }) => <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">{text}</p>;

/** Alerts built from live data: nothing is stored, so an alert goes away once its cause is fixed. */
export function AlertsPanel({ category }: { category: string }) {
  const live = useLoad(() => adminFetch<{ alerts: Alert[] }>("/notifications"), []);
  const security = useLoad(() => (category === "security" ? adminFetch<{ alerts: SecurityAlert[] }>("/security/alerts") : Promise.resolve(null)), [category]);

  if (category === "security") {
    const rows = security.data?.alerts ?? [];
    return (
      <>
        <ErrorBanner message={security.error} />
        {!rows.length ? <Empty text={security.loading ? "Loading…" : "No security alerts right now."} /> : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <Badge tone={/high|critical/i.test(a.severity) ? "red" : /medium|warn/i.test(a.severity) ? "gray" : "blue"}>{a.severity}</Badge>
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{a.title}</p><p className="text-sm text-slate-500">{a.detail}</p></div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const re = BELONGS[category as "subscription" | "payment"] ?? /./;
  const rows = (live.data?.alerts ?? []).filter((a) => re.test(`${a.key} ${a.title}`));
  return (
    <>
      <ErrorBanner message={live.error} />
      {!rows.length ? <Empty text={live.loading ? "Loading…" : "Nothing needs attention here right now."} /> : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {rows.map((a) => (
            <li key={a.key} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <Badge tone={TONE[a.severity]}>{a.severity}</Badge>
              <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{a.title}</p><p className="text-sm text-slate-500">{a.detail}</p></div>
              <Link href={a.href} className="text-sm font-semibold text-mca-blue hover:underline">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
