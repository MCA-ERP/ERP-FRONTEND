"use client";

import { useState } from "react";
import { adminFetch, qs, type Plan, type SchoolList, type SchoolRow } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, PlanTag, SimpleTable, StatusPill, fmtDay, num } from "@/components/admin/dash";
import { Tag, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { BOARDS, small } from "./shared";

export type DirectoryTab = "all" | "active" | "inactive" | "suspended";

const TITLE: Record<DirectoryTab, string> = { all: "All schools", active: "Active schools", inactive: "Inactive schools", suspended: "Suspended schools" };

/** School Directory: every school, with filters. The tab (all, active, inactive, suspended) comes from the page above. */
export function SchoolDirectory({ tab }: { tab: DirectoryTab }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [board, setBoard] = useState("");
  const q = useDebounced(search);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const { data, error, loading } = useLoad(
    () => adminFetch<SchoolList>(`/schools${qs({ group: tab === "all" ? undefined : tab, search: q, plan, board, pageSize: 100 })}`),
    [tab, q, plan, board]
  );
  const trial = useLoad(() => (tab === "all" ? adminFetch<SchoolList>("/schools?status=Trial&pageSize=1") : Promise.resolve(null)), [tab]);
  const items = data?.items ?? [];
  const counts = data?.counts;

  const exportCsv = () =>
    downloadCsv(`schools-${tab}`, ["Code", "School", "Board", "State", "Plan", "Students", "Campuses", "Status", "Renews"],
      items.map((s) => [s.code, s.name, s.board, s.state, s.plan_name, s.students, s.campuses ?? "", s.status, s.trial_ends_on ?? s.renews_on]));

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {tab === "all" && (
        <Tiles items={[
          { label: "Total", value: counts ? num(counts.all) : "…", sub: "Registered" },
          { label: "Active", value: counts ? num(counts.active) : "…", sub: "Paid, trial or in use" },
          { label: "Trial", value: trial.data ? num(trial.data.total) : "…", sub: "Free trial" },
          { label: "Campuses", value: counts?.campuses !== undefined ? num(counts.campuses) : "…", sub: "Across all schools" },
        ]} />
      )}
      <Panel title={TITLE[tab]} sub={`${data?.total ?? 0} school${data?.total === 1 ? "" : "s"}`} right={<button type="button" className={small} onClick={exportCsv}>Export</button>}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder={`Search ${tab === "all" ? "all" : tab} schools`} aria-label="Search schools" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} max-w-[9rem]`} aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All plans</option>
            {plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
          <select className={`${inputCls} max-w-[9rem]`} aria-label="Board" value={board} onChange={(e) => setBoard(e.target.value)}>
            <option value="">All boards</option>
            {BOARDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <SimpleTable
          head={[{ h: "School" }, { h: "Board" }, { h: "State" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Campuses", right: true }, { h: "Status" }, { h: "Renews" }, { h: "" }]}
          empty={loading ? "Loading…" : "No schools match."}
          rows={items.map((s: SchoolRow) => [
            <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
            s.board ? <Tag key="b">{s.board}</Tag> : "—",
            s.state || "—",
            <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
            num(s.students),
            num(s.campuses ?? 0),
            <StatusPill key="st" status={s.status} />,
            fmtDay(s.trial_ends_on ?? s.renews_on),
            <ViewButton key="v" href={`/super-admin/schools/${s.id}`} />,
          ])}
        />
      </Panel>
    </div>
  );
}
