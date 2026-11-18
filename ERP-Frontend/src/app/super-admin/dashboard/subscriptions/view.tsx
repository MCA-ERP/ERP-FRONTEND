"use client";

import type { SchoolRow } from "@/lib/admin-api";
import { DashboardPage, Panel, PlanTag, SimpleTable, StatusPill, daysTo, fmtDay, inr, isLive, lakh, num } from "@/components/admin/dash";
import { CountBars, DaysChip, Tiles, ViewButton } from "@/components/admin/dash-ui";

type Tab = "active" | "expired" | "trial" | "renewal";

export default function SubscriptionStatisticsPage({ tab = "active" }: { tab?: Tab }) {

  return (
    <DashboardPage title="Subscription statistics" subtitle="Plans, trials, renewals and recurring revenue.">
      {({ schools, plans }) => {
        const active = schools.filter((s) => s.status === "Active");
        const trial = schools.filter((s) => s.status === "Trial");
        const lapsed = schools.filter((s) => s.status === "Expired" || s.status === "Overdue" || s.status === "Suspended");
        const renewals = schools
          .filter((s) => isLive(s) && s.renews_on && (daysTo(s.renews_on) ?? -1) >= 0 && (daysTo(s.renews_on) ?? 999) <= 90)
          .sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1));
        const arr = (list: SchoolRow[]) => list.reduce((a, s) => a + s.arr_paise, 0);

        const table = (list: SchoolRow[], title: string, dateLabel: string, date: (s: SchoolRow) => string | null, chip = false) => (
          <Panel title={title} sub={`${list.length} school${list.length === 1 ? "" : "s"}`}>
            <SimpleTable
              head={[{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Annual value", right: true }, { h: dateLabel }, ...(chip ? [{ h: "In" }] : []), { h: "Status" }, { h: "" }]}
              empty="No subscriptions in this group."
              rows={list.map((s) => [
                <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
                <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
                num(s.students),
                inr(s.arr_paise),
                fmtDay(date(s)),
                ...(chip ? [<DaysChip key="d" days={daysTo(date(s)) ?? 0} />] : []),
                <StatusPill key="st" status={s.status} />,
                <ViewButton key="v" href={`/super-admin/subscriptions/${s.id}`} />,
              ])}
            />
          </Panel>
        );

        const byPlan = (list: SchoolRow[], value: (l: SchoolRow[]) => number): [string, number][] => plans.map((p): [string, number] => [p.name, value(list.filter((s) => s.plan_code === p.code))]);

        return (
          <>
            {tab === "active" && (
              <>
                <Tiles items={[
                  { label: "Active subscriptions", value: num(active.length), sub: "Paid plans in force" },
                  { label: "ARR", value: lakh(arr(active)), sub: "Before GST" },
                  { label: "Average per school", value: active.length ? lakh(arr(active) / active.length) : "—", sub: "Per year" },
                  { label: "Students covered", value: num(active.reduce((a, s) => a + s.students, 0)), sub: "In active schools" },
                ]} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Active by plan"><CountBars rows={byPlan(active, (l) => l.length)} /></Panel>
                  <Panel title="ARR by plan"><CountBars rows={byPlan(active, arr)} format={lakh} /></Panel>
                </div>
                {table(active, "Active subscriptions", "Renews", (s) => s.renews_on)}
              </>
            )}

            {tab === "expired" && (
              <>
                <Tiles items={[
                  { label: "Expired & overdue", value: num(lapsed.length), sub: "Including suspended" },
                  { label: "Revenue at risk", value: lakh(arr(lapsed)), sub: "Annual value of these schools" },
                  { label: "Expired", value: num(schools.filter((s) => s.status === "Expired").length), sub: "Did not renew" },
                  { label: "Overdue", value: num(schools.filter((s) => s.status === "Overdue").length), sub: "Payment late" },
                ]} />
                {table(lapsed, "Expired, overdue and suspended", "Renewal date", (s) => s.renews_on)}
              </>
            )}

            {tab === "trial" && (
              <>
                <Tiles items={[
                  { label: "Schools on trial", value: num(trial.length), sub: "Free trial running" },
                  { label: "Potential ARR", value: lakh(arr(trial)), sub: "If all convert" },
                  { label: "Students on trial", value: num(trial.reduce((a, s) => a + s.students, 0)) },
                ]} />
                {table(trial, "Trials", "Trial ends", (s) => s.trial_ends_on, true)}
              </>
            )}

            {tab === "renewal" && (
              <>
                <Tiles items={[
                  { label: "Renewals in 90 days", value: num(renewals.length), sub: "Live schools renewing" },
                  { label: "Value renewing", value: lakh(arr(renewals)), sub: "Annual value" },
                  { label: "In the next 30 days", value: num(renewals.filter((s) => (daysTo(s.renews_on) ?? 99) <= 30).length) },
                ]} />
                {table(renewals, "Renewals due", "Renews", (s) => s.renews_on, true)}
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
