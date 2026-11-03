"use client";

import { useState } from "react";
import type { SchoolRow } from "@/lib/admin-api";
import {
  BarRows, DashboardPage, Panel, PlanTag, SchoolCell, SimpleTable, StatGrid, StatusPill, TabBar,
  daysTo, fmtDay, inr, isLive, lakh, num,
} from "@/components/admin/dash";

type Tab = "active" | "expired" | "trial" | "renewal";

export default function SubscriptionStatisticsPage() {
  const [tab, setTab] = useState<Tab>("active");

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

        const table = (list: SchoolRow[], dateLabel: string, date: (s: SchoolRow) => string | null) => (
          <SimpleTable
            head={[{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Status" }, { h: dateLabel }, { h: "Annual value", right: true }]}
            empty="No subscriptions in this group."
            rows={list.map((s) => [
              <SchoolCell key="s" s={s} />,
              <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
              num(s.students),
              <StatusPill key="st" status={s.status} />,
              fmtDay(date(s)),
              inr(s.arr_paise),
            ])}
          />
        );

        return (
          <>
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[
                ["active", "Active", active.length],
                ["expired", "Expired & overdue", lapsed.length],
                ["trial", "Trial", trial.length],
                ["renewal", "Renewal due", renewals.length],
              ]}
            />

            {tab === "active" && (
              <>
                <StatGrid
                  items={[
                    { label: "Active subscriptions", value: num(active.length) },
                    { label: "Annual recurring revenue", value: lakh(arr(active)) },
                    { label: "Average per school", value: active.length ? lakh(arr(active) / active.length) : "—" },
                  ]}
                />
                <Panel title="Recurring revenue by plan" sub="Students × price per student">
                  <BarRows
                    rows={plans.map((p): [string, number] => [p.name, arr(active.filter((s) => s.plan_code === p.code))])}
                    format={lakh}
                  />
                </Panel>
                <Panel title="Active subscriptions">{table(active, "Renews", (s) => s.renews_on)}</Panel>
              </>
            )}

            {tab === "expired" && (
              <>
                <StatGrid
                  items={[
                    { label: "Expired & overdue", value: num(lapsed.length) },
                    { label: "Revenue at risk", value: lakh(arr(lapsed)), sub: "Annual value of these schools" },
                  ]}
                />
                <Panel title="Expired, overdue and suspended">{table(lapsed, "Renewal date", (s) => s.renews_on)}</Panel>
              </>
            )}

            {tab === "trial" && (
              <>
                <StatGrid
                  items={[
                    { label: "Schools on trial", value: num(trial.length) },
                    { label: "Potential revenue", value: lakh(arr(trial)), sub: "If all convert" },
                  ]}
                />
                <Panel title="Trials">{table(trial, "Trial ends", (s) => s.trial_ends_on)}</Panel>
              </>
            )}

            {tab === "renewal" && (
              <>
                <StatGrid
                  items={[
                    { label: "Renewals in 90 days", value: num(renewals.length) },
                    { label: "Value renewing", value: lakh(arr(renewals)) },
                  ]}
                />
                <Panel title="Renewals due">{table(renewals, "Renews", (s) => s.renews_on)}</Panel>
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
