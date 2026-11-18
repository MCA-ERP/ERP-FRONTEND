"use client";

import { useState } from "react";
import { adminFetch, json, qs } from "@/lib/admin-api";
import { Panel, SimpleTable, lakh, num, useAction } from "@/components/admin/dash";
import { Change, Chip, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { useRange } from "@/components/admin/range";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";

interface Kpi {
  key: string;
  label: string;
  description: string;
  unit: "int" | "money" | "percent" | "hours" | "number";
  current: number | null;
  previous: number | null;
  target: number | null;
  better: "higher" | "lower";
}
interface Result { range: { from: string; to: string; days: number }; previous: { from: string; to: string }; kpis: Kpi[] }

const LINK: Record<string, string> = {
  active_schools: "/super-admin/dashboard/schools", students: "/super-admin/dashboard/users", arr: "/super-admin/dashboard/subs", new_schools: "/super-admin/dashboard/schools",
  collected: "/super-admin/dashboard/revenue", collection_rate: "/super-admin/dashboard/revenue", renewal_rate: "/super-admin/dashboard/subs", trial_conversion: "/super-admin/dashboard/subs",
  daily_active_users: "/super-admin/dashboard/activity", first_response_hours: "/super-admin/support",
};

export function formatKpi(unit: Kpi["unit"], v: number | null): string {
  if (v === null) return "—";
  if (unit === "money") return lakh(v);
  if (unit === "percent") return `${v}%`;
  if (unit === "hours") return v >= 1 ? `${Math.floor(v)} h ${String(Math.round((v - Math.floor(v)) * 60)).padStart(2, "0")} m` : `${Math.round(v * 60)} m`;
  return num(v);
}

/** The change since the previous period, and whether it is good news for this KPI. */
export function kpiChange(k: Kpi): { text: string; up: boolean | null; good: boolean | null } {
  if (k.current === null || k.previous === null || (k.previous === 0 && k.current === 0)) return { text: "", up: null, good: null };
  const diff = k.current - k.previous;
  if (diff === 0) return { text: "no change", up: null, good: null };
  const text = k.unit === "percent" ? `${Math.abs(Math.round(diff * 10) / 10)} pts` : k.previous === 0 ? "new" : `${Math.abs(Math.round((diff / k.previous) * 100))}%`;
  return { text, up: diff > 0, good: (diff > 0) === (k.better === "higher") };
}

export function kpiStatus(k: Kpi): "ontrack" | "behind" | "notarget" | "nodata" {
  if (k.current === null) return "nodata";
  if (k.target === null) return "notarget";
  return (k.better === "higher" ? k.current >= k.target : k.current <= k.target) ? "ontrack" : "behind";
}

/** The target as the person types it: rupees for money, the plain number otherwise. */
const toInput = (k: Kpi) => (k.target === null ? "" : String(k.unit === "money" ? k.target / 100 : k.target));
const fromInput = (k: Kpi, text: string) => (k.unit === "money" ? Math.round(Number(text) * 100) : Number(text));

/** KPI Summary: every headline number, compared with the previous period and its target. */
export function KpiSummary() {
  const range = useRange();
  const { data, error, loading, reload } = useLoad(() => adminFetch<Result>(`/dashboard/kpis${qs({ from: range.from, to: range.to })}`), [range.from, range.to]);
  const { error: actionError, busy, run } = useAction(reload);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");

  const kpis = data?.kpis ?? [];
  const withTarget = kpis.filter((k) => k.target !== null && k.current !== null);
  const onTrack = withTarget.filter((k) => kpiStatus(k) === "ontrack").length;
  const comparable = kpis.filter((k) => k.current !== null && k.previous !== null);
  const improved = comparable.filter((k) => kpiChange(k).good === true).length;
  const behind = kpis.filter((k) => kpiStatus(k) === "behind").length;

  const save = async (k: Kpi) => {
    const clear = text.trim() === "";
    if (!clear && !(Number(text) >= 0)) return;
    if (await run(() => adminFetch("/dashboard/kpi-targets", json("PUT", { [k.key]: clear ? null : fromInput(k, text) })))) setEditing(null);
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || actionError} />
      <Tiles items={[
        { label: "KPIs on track", value: loading ? "…" : `${onTrack} of ${withTarget.length}`, sub: withTarget.length ? "Against the targets you set" : "Set a target to track a KPI" },
        { label: "Improved vs previous", value: loading ? "…" : `${improved} of ${comparable.length}`, sub: "Against the previous period of the same length" },
        { label: "Needs attention", value: loading ? "…" : behind, sub: "Below target" },
      ]} />
      <Panel title="KPI summary" sub={range.label}>
        <SimpleTable
          head={[{ h: "KPI" }, { h: "Current", right: true }, { h: "Previous", right: true }, { h: "Change", right: true }, { h: "Target", right: true }, { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : "No data yet."}
          rows={kpis.map((k) => {
            const c = kpiChange(k);
            const st = kpiStatus(k);
            return [
              <div key="k"><p className="font-semibold text-slate-900">{k.label}</p><p className="text-xs text-slate-500">{k.description}</p></div>,
              <b key="c" className="font-semibold text-slate-900">{formatKpi(k.unit, k.current)}</b>,
              <span key="p" className="text-slate-600">{formatKpi(k.unit, k.previous)}</span>,
              <Change key="ch" text={c.text} up={c.up} good={c.good} />,
              editing === k.key ? (
                <span key="t" className="inline-flex items-center gap-1.5">
                  <input autoFocus aria-label={`Target for ${k.label}`} className={`${inputCls} !w-24 !py-1 text-right`} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(k)} />
                  <button type="button" disabled={busy} onClick={() => save(k)} className="rounded-full bg-[#026f9b] px-2.5 py-1 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs text-slate-500 underline">Cancel</button>
                </span>
              ) : (
                <button key="t" type="button" title="Set the target" onClick={() => { setEditing(k.key); setText(toInput(k)); }} className="rounded px-1.5 py-0.5 text-slate-700 hover:bg-slate-100">{k.target === null ? <span className="text-[#026f9b] underline">Set target</span> : formatKpi(k.unit, k.target)}</button>
              ),
              st === "ontrack" ? <Chip key="s" tone="good">On track</Chip> : st === "behind" ? <Chip key="s" tone="bad">Behind</Chip> : <Chip key="s" tone="mute">{st === "nodata" ? "No data" : "No target"}</Chip>,
              <ViewButton key="v" href={LINK[k.key] ?? "/super-admin"} />,
            ];
          })}
        />
        <p className="px-5 pb-4 pt-1 text-xs text-slate-500">Previous is the {data?.range.days ?? range.days} days straight before this period. A dash means that figure is not recorded for past dates (for example the number of active schools on a given day).</p>
      </Panel>
    </div>
  );
}
