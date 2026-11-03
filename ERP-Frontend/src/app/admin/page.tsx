"use client";

import Link from "next/link";
import {
  BarRows, DashboardPage, Panel, PlanTag, SchoolCell, SimpleTable, StatGrid, StatusPill,
  daysTo, fmtDay, inr, isInactive, isLive, lakh, num,
} from "@/components/admin/dash";

export default function PlatformOverviewPage() {
  return (
    <DashboardPage title="Platform overview" subtitle="Health of every school on the platform.">
      {({ schools, plans, userCounts, platformTeam }) => {
        const active = schools.filter((s) => s.status === "Active");
        const pending = schools.filter((s) => s.status === "Pending");
        const inactive = schools.filter(isInactive);
        const arr = active.reduce((a, s) => a + s.arr_paise, 0);
        const accounts = userCounts.reduce((a, r) => a + r.n, 0);
        const students = schools.reduce((a, s) => a + s.students, 0);
        const due = schools
          .filter((s) => isLive(s) && s.renews_on && (daysTo(s.renews_on) ?? -1) >= 0 && (daysTo(s.renews_on) ?? 999) <= 60)
          .sort((a, b) => (a.renews_on! < b.renews_on! ? -1 : 1));
        const byPlan: [string, number][] = plans.map((p) => [p.name, active.filter((s) => s.plan_code === p.code).length]);

        return (
          <>
            <StatGrid
              items={[
                { label: "Registered schools", value: num(schools.length), sub: `${active.length} active · ${pending.length} awaiting approval` },
                { label: "User accounts", value: num(accounts), sub: `${num(students)} student records · ${platformTeam} platform team` },
                { label: "Annual recurring revenue", value: lakh(arr), sub: `Across ${active.length} active schools` },
                { label: "Needs attention", value: num(pending.length + inactive.length), sub: `${pending.length} pending · ${inactive.length} inactive` },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Active schools by plan" sub={`${active.length} schools`}>
                <BarRows rows={byPlan} />
              </Panel>
              <Panel
                title="Awaiting approval"
                sub={`${pending.length} schools`}
                right={<Link href="/admin/schools?tab=pending" className="text-xs font-semibold text-mca-blue hover:underline">Review all</Link>}
              >
                <SimpleTable
                  head={[{ h: "School" }, { h: "Contact" }, { h: "Registered" }]}
                  empty="No schools are waiting for approval."
                  rows={pending.slice(0, 6).map((s) => [
                    <SchoolCell key="s" s={s} />,
                    <span key="c" className="text-slate-600">{s.contact_name || "—"}</span>,
                    <span key="d" className="text-xs text-slate-500">{fmtDay(s.created_at.slice(0, 10))}</span>,
                  ])}
                />
              </Panel>
            </div>

            <Panel title="Renewals due in 60 days" sub={`${due.length} schools`}>
              <SimpleTable
                head={[{ h: "School" }, { h: "Plan" }, { h: "Status" }, { h: "Renews" }, { h: "In" }, { h: "Value", right: true }]}
                empty="No renewals are due in the next 60 days."
                rows={due.map((s) => [
                  <SchoolCell key="s" s={s} />,
                  <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
                  <StatusPill key="st" status={s.status} />,
                  fmtDay(s.renews_on),
                  `${daysTo(s.renews_on)} days`,
                  inr(s.arr_paise),
                ])}
              />
            </Panel>
          </>
        );
      }}
    </DashboardPage>
  );
}
