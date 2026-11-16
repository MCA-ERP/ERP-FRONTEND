"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, qs, type Paged } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, PlanTag, SimpleTable, StatusPill, daysTo, fmtDay, inr, lakh, num } from "@/components/admin/dash";
import { Tiles, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { small } from "../../schools/pages/shared";
import type { SubRow } from "../shared";
import { usePlans } from "./plans";

export type ListTab = "active" | "trial" | "expired" | "cancelled";
type Row = SubRow & { cancelled_at?: string; cancel_reason?: string | null };
interface Res extends Paged<Row> { summary?: { cancelled_this_year?: number; annual_value_lost_paise?: number; top_reason?: string | null; fy_start?: string } }

const TITLE: Record<ListTab, string> = { active: "Active subscriptions", trial: "Trials", expired: "Expired subscriptions", cancelled: "Cancelled subscriptions" };

/** Subscription list: every school's subscription in one state (active, trial, expired, cancelled). */
export function SubscriptionList({ tab }: { tab: ListTab }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const q = useDebounced(search);
  const plans = usePlans();
  const { data, error, loading } = useLoad(() => adminFetch<Res>(`/subscriptions${qs({ group: tab, plan, search: q, pageSize: 100 })}`), [tab, plan, q]);
  const items = data?.items ?? [];
  const sm = data?.summary;
  const dateHead = tab === "trial" ? "Trial ends" : tab === "expired" ? "Ended" : tab === "cancelled" ? "Cancelled" : "Renews";
  const dateOf = (r: Row) => (tab === "cancelled" ? r.cancelled_at?.slice(0, 10) : r.trial_ends_on ?? r.renews_on);

  const head = [{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Annual value", right: true }, ...(tab === "cancelled" ? [{ h: "Reason" }] : []), { h: dateHead }, ...(tab === "trial" ? [{ h: "Days left", right: true }] : tab === "active" ? [{ h: "Status" }] : []), { h: "" }];

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {tab === "cancelled" && (
        <Tiles items={[
          { label: "Cancelled this year", value: data ? num(sm?.cancelled_this_year ?? 0) : "…", sub: sm?.fy_start ? `Since ${fmtDay(sm.fy_start)}` : undefined },
          { label: "Annual value lost", value: data ? lakh(sm?.annual_value_lost_paise ?? 0) : "…", sub: "Yearly value of cancelled schools" },
          { label: "Top reason", value: <span className="text-lg">{sm?.top_reason ?? "—"}</span>, sub: "Most often given" },
        ]} />
      )}
      <Panel title={TITLE[tab]} sub={`${data?.total ?? 0} school${data?.total === 1 ? "" : "s"}`}
        right={<button type="button" className={small} onClick={() => downloadCsv(`subscriptions-${tab}`, ["School", "Plan", "Students", "Annual value", dateHead], items.map((r) => [r.name, r.plan_name ?? "", r.students, r.arr_paise / 100, dateOf(r) ?? ""]))}>Export</button>}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search schools" aria-label="Search subscriptions" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All plans</option>
            {plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <SimpleTable head={head} empty={loading ? "Loading…" : "No subscriptions here."}
          rows={items.map((r) => {
            const d = daysTo(r.trial_ends_on);
            return [
              <div key="s"><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.code}</p></div>,
              <PlanTag key="p" code={r.plan_code} name={r.plan_name} />,
              num(r.students),
              inr(r.arr_paise),
              ...(tab === "cancelled" ? [r.cancel_reason?.replace(/^Cancelled: ?/, "") || "—"] : []),
              fmtDay(dateOf(r)),
              ...(tab === "trial" ? [d === null ? "—" : d] : tab === "active" ? [<StatusPill key="st" status={r.status as never} />] : []),
              tab === "cancelled"
                ? <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => router.push("/super-admin/subscriptions/discounts?tab=offers")}>Win-back offer</button><ViewButton href={`/super-admin/subscriptions/${r.id}`} /></span>
                : <ViewButton key="v" href={`/super-admin/subscriptions/${r.id}`} />,
            ];
          })}
        />
      </Panel>
    </div>
  );
}
