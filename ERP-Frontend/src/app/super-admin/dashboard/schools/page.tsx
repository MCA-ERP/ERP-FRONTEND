"use client";

import { useState } from "react";
import type { SchoolRow } from "@/lib/admin-api";
import {
  BarRows, DashboardPage, Panel, PlanTag, SchoolCell, SimpleTable, StatGrid, StatusPill, TabBar,
  fmtDay, groupCount, isInactive, isLive, num,
} from "@/components/admin/dash";

type Tab = "total" | "active" | "inactive";

const REASON: Record<string, string> = {
  Overdue: "Payment overdue",
  Suspended: "Suspended by platform team",
  Expired: "Subscription expired",
};

export default function SchoolStatisticsPage() {
  const [tab, setTab] = useState<Tab>("total");

  return (
    <DashboardPage title="School statistics" subtitle="Schools by status, board, state and plan.">
      {({ schools }) => {
        const live = schools.filter(isLive);
        const inactive = schools.filter(isInactive);
        const monthAgo = Date.now() - 30 * 86_400_000;
        const recent = schools.filter((s) => new Date(s.created_at).getTime() >= monthAgo).length;
        const count = (st: string) => schools.filter((s) => s.status === st).length;

        const schoolTable = (list: SchoolRow[], extra: "all" | "live" | "inactive") => (
          <SimpleTable
            head={[
              { h: "School" }, { h: "Board" }, { h: "State" }, { h: "Plan" }, { h: "Students", right: true },
              { h: "Status" }, { h: extra === "inactive" ? "Reason" : extra === "live" ? "Renews" : "Joined" },
            ]}
            empty="No schools in this group."
            rows={list.map((s) => [
              <SchoolCell key="s" s={s} />,
              s.board || "—",
              s.state || "—",
              <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
              num(s.students),
              <StatusPill key="st" status={s.status} />,
              extra === "inactive" ? REASON[s.status] ?? "—" : extra === "live" ? fmtDay(s.trial_ends_on ?? s.renews_on) : fmtDay(s.created_at.slice(0, 10)),
            ])}
          />
        );

        return (
          <>
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[["total", "Total schools", schools.length], ["active", "Active schools", live.length], ["inactive", "Inactive schools", inactive.length]]}
            />

            {tab === "total" && (
              <>
                <StatGrid
                  items={[
                    { label: "Total schools", value: num(schools.length), sub: "Registered on the platform" },
                    { label: "Active", value: num(count("Active")), sub: "Paid and in use" },
                    { label: "Trial", value: num(count("Trial")), sub: "Free trial" },
                    { label: "New in 30 days", value: num(recent), sub: `${inactive.length} inactive · ${count("Pending")} pending` },
                  ]}
                />
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="By board"><BarRows rows={groupCount(schools, (s) => s.board)} /></Panel>
                  <Panel title="By state"><BarRows rows={groupCount(schools, (s) => s.state)} /></Panel>
                </div>
                <Panel title="All schools" sub={`${schools.length} schools`}>{schoolTable(schools, "all")}</Panel>
              </>
            )}

            {tab === "active" && (
              <>
                <StatGrid
                  items={[
                    { label: "Active & trial", value: num(live.length) },
                    { label: "Students", value: num(live.reduce((a, s) => a + s.students, 0)), sub: "In live schools" },
                    { label: "On trial", value: num(count("Trial")), sub: "Convert before the trial ends" },
                  ]}
                />
                <Panel title="Active schools" sub={`${live.length} schools`}>{schoolTable(live, "live")}</Panel>
              </>
            )}

            {tab === "inactive" && (
              <>
                <StatGrid
                  items={[
                    { label: "Inactive", value: num(inactive.length) },
                    { label: "Overdue", value: num(count("Overdue")) },
                    { label: "Suspended", value: num(count("Suspended")) },
                    { label: "Expired", value: num(count("Expired")) },
                  ]}
                />
                <Panel title="Inactive schools" sub={`${inactive.length} schools`}>{schoolTable(inactive, "inactive")}</Panel>
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
