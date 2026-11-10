"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, type ReportInfo } from "@/lib/admin-api";
import { TabBar } from "@/components/admin/dash";
import { ErrorBanner, PageHeader, useLoad } from "@/components/admin/ui";
import { Overview } from "./overview";
import { ReportViewer } from "./viewer";

type Info = ReportInfo & { group: string };
interface Listing { groups: { key: string; label: string }[]; reports: Info[] }

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export default function ReportsPage() {
  const list = useLoad(() => adminFetch<Listing>("/reports"), []);
  const [group, setGroup] = useState("overview");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [range, setRange] = useState({ from: daysAgo(30), to: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get("group");
    if (g) setGroup(g);
  }, []);

  const inGroup = useMemo(() => (list.data?.reports ?? []).filter((r) => r.group === group), [list.data, group]);
  const active = inGroup.find((r) => r.key === pick[group]) ?? inGroup[0];

  return (
    <>
      <PageHeader title="Reports & analytics" subtitle="How the platform is growing and performing, with a chart and a download for every report." />
      <ErrorBanner message={list.error} />
      <TabBar
        value={group}
        onChange={setGroup}
        tabs={[["overview", "Overview"], ...(list.data?.groups ?? []).filter((g) => list.data!.reports.some((r) => r.group === g.key)).map((g) => [g.key, g.label] as [string, string])]}
      />
      {group === "overview" ? (
        <Overview />
      ) : (
        <>
          {inGroup.length > 1 && (
            <div role="tablist" aria-label="Reports in this group" className="mb-4 flex flex-wrap gap-2">
              {inGroup.map((r) => (
                <button key={r.key} type="button" role="tab" aria-selected={active?.key === r.key} onClick={() => setPick({ ...pick, [group]: r.key })}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active?.key === r.key ? "border-[#026f9b] bg-white text-[#026f9b] shadow-sm" : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"}`}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {active ? <ReportViewer key={active.key} report={active} range={range} setRange={setRange} /> : !list.loading && <p className="text-sm text-slate-400">No reports in this group.</p>}
          {["system", "security", "modules"].includes(group) && <p className="mt-3 text-xs text-slate-400">Speed, error, access and sign-in figures are counted from the day recording began, so earlier dates are empty.</p>}
        </>
      )}
    </>
  );
}
