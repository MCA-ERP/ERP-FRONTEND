"use client";

import { useState } from "react";
import { adminFetch, json, type SchoolList, type SchoolRow } from "@/lib/admin-api";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Panel, PlanTag, SimpleTable, StatusPill, fmtDay, num, useAction } from "@/components/admin/dash";
import { ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { small, smallPrimary } from "./shared";

export type StatusTab = "activate" | "deactivate" | "suspend" | "reactivate";

interface Def { title: string; empty: string; statuses: string[]; button: string; ask?: string; last: string }
const DEFS: Record<StatusTab, Def> = {
  activate: { title: "Ready to activate", empty: "No school is waiting to be activated.", statuses: ["Pending", "Trial"], button: "Activate", last: "Renews / ended" },
  deactivate: { title: "Active schools", empty: "No active schools.", statuses: ["Active", "Trial", "Overdue"], button: "Deactivate", ask: "Why is this school being deactivated? The reason is kept in its history.", last: "Renews / ended" },
  suspend: { title: "Schools that can be suspended", empty: "No schools to suspend.", statuses: ["Active", "Trial", "Overdue"], button: "Suspend", ask: "Why is this school being suspended? The reason is kept in its history.", last: "Renews / ended" },
  reactivate: { title: "Suspended and switched-off schools", empty: "No school needs reactivating.", statuses: ["Suspended", "Inactive", "Expired"], button: "Reactivate", last: "Renews / ended" },
};

/** School Status: turn schools on, off, suspend them or bring them back. A reason is asked for before a school is switched off. */
export function SchoolStatus({ tab }: { tab: StatusTab }) {
  const def = DEFS[tab];
  const { data, error, loading, reload } = useLoad(() => adminFetch<SchoolList>("/schools?pageSize=100"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const items = (data?.items ?? []).filter((s) => def.statuses.includes(s.status) && (!needle || `${s.name} ${s.code} ${s.city ?? ""}`.toLowerCase().includes(needle)));

  const apply = async (s: SchoolRow) => {
    let reason: string | undefined;
    if (def.ask) {
      const answer = window.prompt(def.ask);
      if (answer === null) return;
      reason = answer.trim();
      if (!reason) { window.alert("A reason is needed."); return; }
    } else if (!window.confirm(`${def.button} ${s.name}?`)) return;
    await act.run(() => adminFetch(`/schools/${s.id}/status-action`, json("POST", { action: tab, reason })));
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={def.title} sub={`${items.length} school${items.length === 1 ? "" : "s"}`}
        right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv(`schools-${tab}`, ["Code", "School", "Plan", "Students", "Status"], items.map((s) => [s.code, s.name, s.plan_name, s.students, s.status]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv(`schools-${tab}`, ["Code", "School", "Plan", "Students", "Status"], items.map((s) => [s.code, s.name, s.plan_name, s.students, s.status])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${def.title.toLowerCase()}`} aria-label="Search schools" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Status" }, { h: def.last }, { h: "" }]}
          empty={loading ? "Loading…" : def.empty}
          rows={items.map((s) => [
            <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
            <PlanTag key="p" code={s.plan_code} name={s.plan_name} />,
            num(s.students),
            <StatusPill key="st" status={s.status} />,
            fmtDay(s.trial_ends_on ?? s.renews_on),
            <span key="a" className="inline-flex items-center gap-2">
              <button type="button" className={tab === "activate" || tab === "reactivate" ? smallPrimary : small} disabled={act.busy} onClick={() => apply(s)}>{def.button}</button>
              <ViewButton href={`/super-admin/schools/${s.id}`} />
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}
