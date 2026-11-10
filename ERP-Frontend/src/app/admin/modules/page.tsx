"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type PlanMatrix } from "@/lib/admin-api";
import { Panel, TabBar } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, Th, btnPrimary, useLoad } from "@/components/admin/ui";
import { Allocation } from "./allocation";
import { Catalogue } from "./catalogue";
import { Configuration } from "./config";
import { Pricing, Updates } from "./pricing-updates";
import { Switch } from "./shared";

type Tab = "catalogue" | "plans" | "school" | "config" | "pricing" | "updates";

export default function ModulesPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  return (
    <>
      <PageHeader title="Modules" subtitle="Everything the platform offers, what each plan includes, and how schools get it." />
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[["catalogue", "Catalogue"], ["plans", "Plan mapping"], ["school", "School allocation"], ["config", "Configuration"], ["pricing", "Pricing"], ["updates", "Updates"]]}
      />
      {tab === "catalogue" && <Catalogue />}
      {tab === "plans" && <PlanMapping />}
      {tab === "school" && <Allocation />}
      {tab === "config" && <Configuration />}
      {tab === "pricing" && <Pricing />}
      {tab === "updates" && <Updates />}
    </>
  );
}

function PlanMapping() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<PlanMatrix>("/plan-modules"), []);
  const [edits, setEdits] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => setEdits({}), [data]);

  const current = (planCode: string, original: string[]) => edits[planCode] ?? new Set(original);

  const toggle = (planCode: string, original: string[], code: string) => {
    setSaved(false);
    setEdits((prev) => {
      const next = new Set(prev[planCode] ?? original);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...prev, [planCode]: next };
    });
  };

  const dirtyPlans = Object.keys(edits);

  const save = async () => {
    setSaving(true);
    setActionError("");
    try {
      for (const planCode of dirtyPlans) {
        await adminFetch(`/plans/${planCode}/modules`, json("PUT", { module_codes: Array.from(edits[planCode]) }));
      }
      setSaved(true);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error || actionError} />
      <Panel
        title="Plan mapping"
        sub="Tick the modules each plan includes"
        right={
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
            <button type="button" className={btnPrimary} disabled={!dirtyPlans.length || saving} onClick={save}>
              {saving ? "Saving…" : `Save ${dirtyPlans.length ? `(${dirtyPlans.length})` : "changes"}`}
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Module</Th>
                {data?.plans.map((p) => <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No data."}</td></tr>}
              {data?.modules.map((m) => (
                <tr key={m.code} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{m.name}{m.is_core && <span className="ml-2"><Badge tone="blue">Core</Badge></span>}</td>
                  {data.plans.map((p) => (
                    <td key={p.id} className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-mca-blue disabled:opacity-50"
                        aria-label={`${m.name} in ${p.name}`}
                        disabled={m.is_core}
                        checked={m.is_core || current(p.code, p.module_codes).has(m.code)}
                        onChange={() => toggle(p.code, p.module_codes, m.code)}
                      />
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

