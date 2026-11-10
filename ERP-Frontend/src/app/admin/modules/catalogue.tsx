"use client";

import Link from "next/link";
import { useState } from "react";
import { adminFetch, json, type ModuleCatalogue } from "@/lib/admin-api";
import { Panel, StatGrid, TabBar, num, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Th, useLoad } from "@/components/admin/ui";
import { BuildBadge, CATEGORIES, Empty, Switch, small, type BuildStatus } from "./shared";

type Mod = ModuleCatalogue["modules"][number] & { category: string; build_status: BuildStatus; version: string | null };

export function Catalogue() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<ModuleCatalogue>("/modules"), []);
  const act = useAction(reload);
  const [cat, setCat] = useState<"all" | (typeof CATEGORIES)[number]>("all");

  const all = (data?.modules ?? []) as Mod[];
  const mods = cat === "all" ? all : all.filter((m) => m.category === cat);
  const built = all.filter((m) => m.build_status === "live").length;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error || act.error} />
      <StatGrid
        items={[
          { label: "Modules", value: num(all.length), sub: `${all.filter((m) => m.is_core).length} core` },
          { label: "Built", value: `${built} of ${all.length}`, sub: "Working for schools today" },
          { label: "Not built yet", value: num(all.length - built), sub: "In the catalogue, no functionality yet" },
          { label: "Live schools", value: num(data?.liveSchools ?? 0), sub: "Trial, active or overdue" },
        ]}
      />
      <TabBar
        value={cat}
        onChange={setCat}
        tabs={[["all", "All modules", all.length], ...CATEGORIES.map((c) => [c, c + " modules", all.filter((m) => m.category === c).length] as [typeof c, string, number])]}
      />
      <Panel title="Module catalogue" sub="The platform-wide switch overrides every plan and school setting. A module that is not built yet can be sold, but schools will find nothing in it.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Module</Th><Th>Category</Th><Th>Build</Th><Th>Included from</Th><Th>Schools with access</Th><Th>Version</Th><Th>Enabled</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!mods.length && <Empty cols={8} loading={loading} text="No modules." />}
              {mods.map((m) => {
                const pct = data?.liveSchools ? Math.round((m.schools_with_access! / data.liveSchools) * 100) : 0;
                return (
                  <tr key={m.code} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{m.name}{m.is_core && <span className="ml-2"><Badge tone="blue">Core</Badge></span>}</p><p className="max-w-sm text-xs text-slate-400">{m.description}</p></td>
                    <td className="px-4 py-3 text-slate-600">{m.category}</td>
                    <td className="px-4 py-3"><BuildBadge status={m.build_status} /></td>
                    <td className="px-4 py-3 text-slate-600">{m.is_core ? "All plans" : m.min_plan ?? "No plan"}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{m.schools_with_access} of {data?.liveSchools} <span className="text-xs text-slate-400">({pct}%)</span></td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{m.version ?? "—"}</td>
                    <td className="px-4 py-3"><Switch checked={m.is_enabled} disabled={m.is_core || act.busy} label={`${m.name} enabled`} onChange={(v) => act.run(() => adminFetch(`/modules/${m.code}`, json("PATCH", { is_enabled: v })))} /></td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/modules/${m.code}`} className={small}>Details</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
