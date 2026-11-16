"use client";

import type { SchoolRow } from "@/lib/admin-api";
import { DashboardPage, Panel, PlanTag, SimpleTable, StatusPill, fmtDay, groupCount, isInactive, isLive, num } from "@/components/admin/dash";
import { CountBars, Tag, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { useRange } from "@/components/admin/range";

type Tab = "total" | "active" | "inactive";

const REASON: Record<string, string> = {
  Overdue: "Payment overdue",
  Suspended: "Suspended by platform team",
  Expired: "Subscription expired",
  Inactive: "Switched off",
};

export default function SchoolStatisticsPage({ tab = "total" }: { tab?: Tab }) {
  const range = useRange();

  return (
    <DashboardPage title="School statistics" subtitle="Schools by status, board, state and plan.">
      {({ schools }) => {
        const live = schools.filter(isLive);
        const inactive = schools.filter(isInactive);
        const fresh = schools.filter((s) => s.created_at.slice(0, 10) >= range.from && s.created_at.slice(0, 10) <= range.to).length;
        const count = (st: string) => schools.filter((s) => s.status === st).length;

        const table = (list: SchoolRow[], last: "joined" | "renews" | "reason", title: string) => (
          <Panel title={title} sub={`${list.length} school${list.length === 1 ? "" : "s"}`}>
            <SimpleTable
              head={[{ h: "School" }, { h: "Board" }, { h: "State" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Status" }, { h: last === "reason" ? "Reason" : last === "renews" ? "Renews" : "Joined" }, { h: "" }]}
              empty="No schools in this group."
              rows={list.map((s) => [
                <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
                s.board ? <Tag key="b">{s.board}</Tag> : "—",
                s.state || "—",
                <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
                num(s.students),
                <StatusPill key="st" status={s.status} />,
                last === "reason" ? REASON[s.status] ?? "—" : last === "renews" ? fmtDay(s.trial_ends_on ?? s.renews_on) : fmtDay(s.created_at.slice(0, 10)),
                <ViewButton key="v" href={`/super-admin/schools/${s.id}`} />,
              ])}
            />
          </Panel>
        );

        return (
          <>
            {tab === "total" && (
              <>
                <Tiles items={[
                  { label: "Total schools", value: num(schools.length), sub: "Registered on the platform" },
                  { label: "Active", value: num(count("Active")), sub: "Paid and in use" },
                  { label: "Trial", value: num(count("Trial")), sub: "On a free trial" },
                  { label: "Inactive", value: num(inactive.length), sub: "Pending, overdue, suspended or expired" },
                  { label: "New in period", value: num(fresh), sub: range.label },
                ]} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="By board"><CountBars rows={groupCount(schools, (s) => s.board)} /></Panel>
                  <Panel title="By state"><CountBars rows={groupCount(schools, (s) => s.state)} /></Panel>
                </div>
                {table(schools, "joined", "All schools")}
              </>
            )}

            {tab === "active" && (
              <>
                <Tiles items={[
                  { label: "Active & trial", value: num(live.length), sub: "Live on the platform" },
                  { label: "Students", value: num(live.reduce((a, s) => a + s.students, 0)), sub: "In live schools" },
                  { label: "On trial", value: num(count("Trial")), sub: "Convert before the trial ends" },
                  { label: "Annual value", value: `₹${(live.reduce((a, s) => a + s.arr_paise, 0) / 100 / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`, sub: "Before GST" },
                ]} />
                {table(live, "renews", "Active schools")}
              </>
            )}

            {tab === "inactive" && (
              <>
                <Tiles items={[
                  { label: "Inactive", value: num(inactive.length), sub: "Not using the platform" },
                  { label: "Overdue", value: num(count("Overdue")), sub: "Payment late" },
                  { label: "Suspended", value: num(count("Suspended")), sub: "Turned off by the team" },
                  { label: "Expired", value: num(count("Expired")), sub: "Did not renew" },
                ]} />
                {table(inactive, "reason", "Inactive schools")}
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
