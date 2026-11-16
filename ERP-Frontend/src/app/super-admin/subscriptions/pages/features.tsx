"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type ModuleRow } from "@/lib/admin-api";
import { Panel, SimpleTable, num, useAction } from "@/components/admin/dash";
import { Chip, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { Labelled, smallPrimary } from "../../schools/pages/shared";
import { limitText, usePlans, type PlanFull } from "./plans";

export type FeatureTab = "modules" | "users" | "storage";
interface Matrix { modules: ModuleRow[]; plans: { id: string; code: string; name: string; sort_order: number; module_codes: string[] }[] }

const GB = (n: number | null) => (n === null ? "Unlimited" : n >= 1000 ? `${n / 1000} TB` : `${n} GB`);

export function PlanFeatures({ tab }: { tab: FeatureTab }) {
  if (tab === "modules") return <ModuleAccess />;
  return <Limits tab={tab} />;
}

/** Which modules each plan includes. Core modules are always on. */
function ModuleAccess() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Matrix>("/plan-modules"), []);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState("");
  const act = useAction(reload);
  useEffect(() => { if (data) setDraft(Object.fromEntries(data.plans.map((p) => [p.code, p.module_codes]))); }, [data]);

  const plans = [...(data?.plans ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const changed = (code: string) => { const o = data?.plans.find((p) => p.code === code)?.module_codes ?? []; const d = draft[code] ?? []; return o.length !== d.length || o.some((c) => !d.includes(c)); };
  const flip = (plan: string, mod: string) => { setSaved(""); setDraft((m) => ({ ...m, [plan]: m[plan]?.includes(mod) ? m[plan].filter((c) => c !== mod) : [...(m[plan] ?? []), mod] })); };
  const save = async () => {
    const ok = await act.run(async () => { for (const p of plans.filter((x) => changed(x.code))) await adminFetch(`/plans/${p.code}/modules`, json("PUT", { module_codes: draft[p.code] })); });
    if (ok) setSaved("Saved");
  };
  const dirty = plans.some((p) => changed(p.code));

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Module access" sub="Tick the modules each plan includes. Core modules are always on."
        right={<span className="flex items-center gap-2.5">{saved && <span role="status" className="text-sm font-semibold text-emerald-700">{saved}</span>}<button type="button" className={smallPrimary} disabled={!dirty || act.busy} onClick={save}>{act.busy ? "Saving…" : "Save changes"}</button></span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-4 py-2.5 font-semibold">Module</th>{plans.map((p) => <th key={p.code} className="px-4 py-2.5 text-center font-semibold">{p.name}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.modules.length && <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={plans.length + 1}>{loading ? "Loading…" : "No modules."}</td></tr>}
              {data?.modules.map((m) => (
                <tr key={m.code}>
                  <td className="px-4 py-2.5"><b className="font-semibold text-slate-900">{m.name}</b>{m.is_core && <span className="ml-2"><Chip tone="info">Core</Chip></span>}</td>
                  {plans.map((p) => (
                    <td key={p.code} className="px-4 py-2.5 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-[#026f9b]" aria-label={`${m.name} in ${p.name}`} checked={m.is_core || (draft[p.code] ?? []).includes(m.code)} disabled={m.is_core || act.busy} onChange={() => flip(p.code, m.code)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

const POLICY = [["block", "Stop them until they upgrade"], ["grace10", "Allow 10% more, then stop"], ["warn", "Let them continue and warn them"]] as const;

/** User limits (people and campuses) or storage limits, with the rule for a school that reaches a limit. */
function Limits({ tab }: { tab: "users" | "storage" }) {
  const plans = usePlans();
  const settings = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const [policy, setPolicy] = useState("block");
  const [warn, setWarn] = useState("80");
  const [saved, setSaved] = useState(false);
  const act = useAction(settings.reload);
  useEffect(() => {
    const s = settings.data?.settings;
    if (s) { setPolicy(String(s["plans.overage_policy"] ?? "block")); setWarn(String(s["plans.storage_warn_percent"] ?? 80)); }
  }, [settings.data]);

  const list = (plans.data?.plans ?? []).filter((p) => p.is_active);
  const save = async () => {
    const values = tab === "users" ? { "plans.overage_policy": policy } : { "plans.storage_warn_percent": Number(warn) };
    if (await act.run(() => adminFetch("/settings", json("PUT", { values })))) setSaved(true);
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={plans.error || settings.error || act.error} />
      {tab === "users" ? (
        <>
          <Panel title="User limits" sub="What each plan allows. Change a limit from Plan management." right={<ViewButton href="/super-admin/subscriptions/plans?tab=edit" label="Edit plans" />}>
            <SimpleTable
              head={[{ h: "Plan" }, { h: "Students", right: true }, { h: "Staff accounts", right: true }, { h: "Admin accounts", right: true }, { h: "Campuses", right: true }]}
              empty={plans.loading ? "Loading…" : "No plans."}
              rows={list.map((p: PlanFull) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, limitText(p.student_limit), limitText(p.staff_limit), limitText(p.admin_limit), limitText(p.campus_limit)])}
            />
          </Panel>
          <Panel title="When a school reaches a limit" sub="Applies to students, staff accounts and campuses">
            <div className="flex flex-wrap items-end gap-3 p-5">
              <Labelled label="Rule"><select className={`${inputCls} min-w-[16rem]`} value={policy} onChange={(e) => { setPolicy(e.target.value); setSaved(false); }}>{POLICY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Labelled>
              <button type="button" className={smallPrimary} disabled={act.busy} onClick={save}>Save</button>
              {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
            </div>
          </Panel>
        </>
      ) : (
        <>
          <Panel title="Storage limits" sub="Space, file size and extra storage for each plan" right={<ViewButton href="/super-admin/subscriptions/plans?tab=edit" label="Edit plans" />}>
            <SimpleTable
              head={[{ h: "Plan" }, { h: "Storage", right: true }, { h: "Largest file", right: true }, { h: "Video storage", right: true }, { h: "Extra storage" }]}
              empty={plans.loading ? "Loading…" : "No plans."}
              rows={list.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, GB(p.storage_gb), p.max_file_mb ? `${p.max_file_mb} MB` : "Not limited", p.video_storage_gb ? GB(p.video_storage_gb) : "—", p.extra_storage_paise ? `₹${num(Math.round(p.extra_storage_paise / 100))} per 10 GB` : "Not sold"])}
            />
          </Panel>
          <Panel title="Warn schools near their limit" sub="Share of storage used before the school is told">
            <div className="flex flex-wrap items-end gap-3 p-5">
              <Labelled label="Warn at (%)"><input type="number" min={50} max={100} className={`${inputCls} w-28`} value={warn} onChange={(e) => { setWarn(e.target.value); setSaved(false); }} /></Labelled>
              <button type="button" className={smallPrimary} disabled={act.busy} onClick={save}>Save</button>
              {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Files are not uploaded to the platform yet, so storage used is not measured. The limits are recorded and will apply once uploads are on.</p>
          </Panel>
        </>
      )}
    </div>
  );
}
