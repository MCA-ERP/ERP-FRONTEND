"use client";

import Link from "next/link";
import { adminFetch, qs } from "@/lib/admin-api";
import { Panel, PlanTag, SimpleTable, daysTo, fmtDay, isLive, lakh, num, useSummary } from "@/components/admin/dash";
import { ColumnChart, DaysChip, StackedBar, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { userBuckets } from "@/components/admin/dash-data";
import { useRange } from "@/components/admin/range";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { AlertIcon, type DashboardAlert } from "@/app/super-admin/s/alerts";

interface Overview {
  collected_paise: number;
  collected_previous_paise: number;
  monthly: { month: string; net_paise: number }[];
  plan_changes: string[];
}

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
const monthFull = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

/** Platform Overview: schools, users, revenue, renewals and alerts at a glance. */
export default function PlatformOverviewPage() {
  const range = useRange();
  const summary = useSummary();
  const overview = useLoad(() => adminFetch<Overview>(`/dashboard/overview${qs({ from: range.from, to: range.to })}`), [range.from, range.to]);
  const alerts = useLoad(() => adminFetch<{ alerts: DashboardAlert[]; counts: Record<string, number> }>("/dashboard/alerts"), []);

  const data = summary.data;
  if (!data) return <><ErrorBanner message={summary.error} /><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /></>;

  const { schools, plans, userCounts } = data;
  const active = schools.filter((s) => s.status === "Active");
  const pending = schools.filter((s) => s.status === "Pending");
  const trial = schools.filter((s) => s.status === "Trial");
  const lapsed = schools.filter((s) => s.status === "Overdue" || s.status === "Expired");
  const arr = active.reduce((a, s) => a + s.arr_paise, 0);
  const u = userBuckets(userCounts, schools);
  const due = schools
    .filter((s) => isLive(s) && s.renews_on && (daysTo(s.renews_on) ?? -1) >= 0 && (daysTo(s.renews_on) ?? 999) <= 60)
    .sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1));
  const mix = plans.map((p) => ({ label: p.name, value: active.filter((s) => s.plan_code === p.code).length }));
  const open = (alerts.data?.alerts ?? []).filter((a) => a.status !== "resolved");
  const counts = alerts.data?.counts;

  const o = overview.data;
  const nowMonth = o?.monthly[o.monthly.length - 1]?.month;
  const chart = (o?.monthly ?? []).map((m) => ({ label: monthName(m.month), value: m.net_paise, partial: m.month === nowMonth, note: m.month === nowMonth ? "month so far" : undefined }));
  const first = o?.monthly[0]?.month;
  const best = (o?.monthly ?? []).reduce((b, m) => (m.net_paise > (b?.net_paise ?? -1) ? m : b), undefined as { month: string; net_paise: number } | undefined);

  // plan changes in the period, grouped by what the plan became
  const changes = new Map<string, number>();
  (o?.plan_changes ?? []).forEach((c) => changes.set(c.replace(/^Plan changed to /, ""), (changes.get(c.replace(/^Plan changed to /, "")) ?? 0) + 1));
  const soonestTrial = [...trial].filter((s) => s.trial_ends_on).sort((a, b) => (a.trial_ends_on! < b.trial_ends_on! ? -1 : 1))[0];

  return (
    <div className="space-y-5">
      <ErrorBanner message={overview.error || alerts.error} />
      <Tiles items={[
        { label: "Registered schools", value: num(schools.length), sub: `${active.length} active · ${pending.length} awaiting approval` },
        { label: "Total users", value: num(u.total), sub: `${num(u.students)} students` },
        { label: "Annual recurring revenue", value: lakh(arr), sub: `Across ${active.length} active schools` },
        { label: `Collected · ${range.days === 30 ? "last 30 days" : `${range.days} days`}`, value: o ? lakh(o.collected_paise) : "…", sub: range.label },
        { label: "Open alerts", value: counts ? num(counts.open) : "…", sub: counts ? `${counts.critical} critical` : undefined },
      ]} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Collections by month" sub={first ? `${monthFull(first)} - ${monthFull(nowMonth!)}, ₹ lakh` : undefined} right={<Link href="/super-admin/dashboard/revenue" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400">Revenue analytics</Link>}>
          {o ? <ColumnChart data={chart} format={lakh} title="Collections by month" /> : <div className="m-4 h-56 animate-pulse rounded-xl bg-slate-100" />}
          {best && best.net_paise > 0 && <p className="px-5 pb-4 text-xs text-slate-600">Best month: {monthFull(best.month)}, {lakh(best.net_paise)}. {nowMonth ? `${monthName(nowMonth)} is month to date.` : ""}</p>}
        </Panel>

        <Panel title="Active schools by plan" sub={`${active.length} schools`}>
          <StackedBar parts={mix} />
          <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {changes.size > 0 && (
              <li className="flex items-start gap-3 px-5 py-3 text-sm"><span className="grid size-8 flex-none place-items-center rounded-lg bg-[#d9efe8] text-sm font-bold text-[#065740]">↑</span>
                <span><b className="font-semibold text-slate-900">{[...changes.values()].reduce((a, b) => a + b, 0)} plan change{[...changes.values()].reduce((a, b) => a + b, 0) === 1 ? "" : "s"} in this period</b><br /><span className="text-xs text-slate-500">{[...changes.entries()].map(([p, n]) => `${p} ${n}`).join(" · ")}</span></span></li>
            )}
            <li className="flex items-start gap-3 px-5 py-3 text-sm"><span className="grid size-8 flex-none place-items-center rounded-lg bg-[#f8ecd6] text-sm font-bold text-[#8a5a0b]">!</span>
              <span><b className="font-semibold text-slate-900">{lapsed.length} school{lapsed.length === 1 ? "" : "s"} overdue or expired</b><br /><span className="text-xs text-slate-500">{lapsed.slice(0, 2).map((s) => s.name).join(", ") || "None right now"}</span></span></li>
            <li className="flex items-start gap-3 px-5 py-3 text-sm"><span className="grid size-8 flex-none place-items-center rounded-lg bg-[#dceff9] text-sm font-bold text-[#026f9b]">T</span>
              <span><b className="font-semibold text-slate-900">{trial.length} school{trial.length === 1 ? "" : "s"} on trial</b><br /><span className="text-xs text-slate-500">{soonestTrial ? `${soonestTrial.name} · trial ends ${fmtDay(soonestTrial.trial_ends_on)}` : "No trials running"}</span></span></li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Renewals due in 60 days" sub={`${due.length} school${due.length === 1 ? "" : "s"}`} right={<Link href="/super-admin/dashboard/subs" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400">All renewals</Link>}>
          <SimpleTable
            head={[{ h: "School" }, { h: "Plan" }, { h: "Renews" }, { h: "In" }, { h: "Value", right: true }, { h: "" }]}
            empty="No renewals are due in the next 60 days."
            rows={due.map((s) => [
              <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
              <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
              fmtDay(s.renews_on),
              <DaysChip key="d" days={daysTo(s.renews_on) ?? 0} />,
              lakh(s.arr_paise),
              <ViewButton key="v" href={`/super-admin/subscriptions/${s.id}`} />,
            ])}
          />
        </Panel>

        <Panel title="Latest alerts" right={<Link href="/super-admin/dashboard/alerts" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400">All alerts</Link>}>
          {!open.length ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">{alerts.loading ? "Loading…" : "Nothing needs attention."}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {open.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <AlertIcon severity={a.severity} />
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{a.title}</p><p className="truncate text-xs text-slate-500">{a.school?.name ?? "Platform"}</p></div>
                  <span className="whitespace-nowrap text-xs text-slate-400">{fmtDay(a.when.slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
