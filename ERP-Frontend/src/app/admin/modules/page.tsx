"use client";

import { useEffect, useState } from "react";
import {
  adminFetch, json,
  type ModuleCatalogue, type Paged, type PlanMatrix, type SchoolModuleAccess, type SchoolRow,
} from "@/lib/admin-api";
import { Panel, StatGrid, TabBar, num } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, PageHeader, Th, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";

type Tab = "catalogue" | "plans" | "school";

export default function ModulesPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  return (
    <>
      <PageHeader title="Modules" subtitle="What each plan includes, and per-school exceptions." />
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[["catalogue", "Module catalogue"], ["plans", "Plan mapping"], ["school", "School-wise access"]]}
      />
      {tab === "catalogue" && <Catalogue />}
      {tab === "plans" && <PlanMapping />}
      {tab === "school" && <SchoolAccess />}
    </>
  );
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mca-blue/25 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-[#41afda]" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

function Catalogue() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<ModuleCatalogue>("/modules"), []);
  const [actionError, setActionError] = useState("");

  const toggle = async (code: string, is_enabled: boolean) => {
    setActionError("");
    try {
      await adminFetch(`/modules/${code}`, json("PATCH", { is_enabled }));
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const mods = data?.modules ?? [];
  return (
    <div className="space-y-6">
      <ErrorBanner message={error || actionError} />
      <StatGrid
        items={[
          { label: "Modules", value: num(mods.length), sub: `${mods.filter((m) => m.is_core).length} core` },
          { label: "Switched off platform-wide", value: num(mods.filter((m) => !m.is_enabled).length), sub: "Hidden for every school" },
          { label: "Live schools", value: num(data?.liveSchools ?? 0), sub: "Trial, active or overdue" },
        ]}
      />
      <Panel title="Module catalogue" sub="The platform-wide switch overrides every plan and school setting">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><Th>Module</Th><Th>Included from</Th><Th>Schools with access</Th><Th>Enabled</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!mods.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No modules."}</td></tr>}
              {mods.map((m) => (
                <tr key={m.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{m.name}{m.is_core && <span className="ml-2"><Badge tone="blue">Core</Badge></span>}</p>
                    <p className="text-xs text-slate-400">{m.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.is_core ? "All plans" : m.min_plan ?? "No plan"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {m.schools_with_access} of {data?.liveSchools}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={m.is_enabled} disabled={m.is_core} label={`${m.name} enabled`} onChange={(v) => toggle(m.code, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
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

function SchoolAccess() {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const [schoolId, setSchoolId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!schoolId && schools.data?.items.length) setSchoolId(schools.data.items[0].id);
  }, [schools.data, schoolId]);

  const access = useLoad(
    () => (schoolId ? adminFetch<SchoolModuleAccess>(`/schools/${schoolId}/modules`) : Promise.resolve(null)),
    [schoolId]
  );

  const setOverride = async (code: string, value: string) => {
    setActionError("");
    try {
      await adminFetch(`/schools/${schoolId}/modules/${code}`, json("PUT", { enabled: value === "on" ? true : value === "off" ? false : null }));
      access.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const school = schools.data?.items.find((s) => s.id === schoolId);

  return (
    <div className="space-y-4">
      <ErrorBanner message={schools.error || access.error || actionError} />
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-semibold text-slate-700" htmlFor="school-select">School</label>
        <select id="school-select" className={`${inputCls} max-w-sm`} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
          {schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
        {school && (
          <span className="text-sm text-slate-500">
            {school.plan_name ?? "No plan"} plan · {school.status}
            {access.data?.studentLimit ? ` · limit ${num(access.data.studentLimit)} students` : ""}
          </span>
        )}
      </Card>

      <Panel title="Module access" sub="Overrides beat the plan; the platform switch beats everything">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><Th>Module</Th><Th>In plan</Th><Th>Override</Th><Th>Result</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!access.data && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{access.loading || schools.loading ? "Loading…" : "Choose a school."}</td></tr>}
              {access.data?.modules.map((m) => (
                <tr key={m.code} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{m.name}{m.is_core && <span className="ml-2"><Badge tone="blue">Core</Badge></span>}</td>
                  <td className="px-4 py-2.5 text-slate-600">{m.via_plan ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className={`${inputCls} max-w-[11rem] py-1`}
                      aria-label={`Override for ${m.name}`}
                      disabled={m.is_core}
                      value={m.override === null ? "plan" : m.override ? "on" : "off"}
                      onChange={(e) => setOverride(m.code, e.target.value)}
                    >
                      <option value="plan">Follow plan</option>
                      <option value="on">Force on</option>
                      <option value="off">Force off</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    {m.effective ? <Badge tone="green">Available</Badge> : <Badge tone="gray">{m.globally_enabled ? "Not available" : "Off platform-wide"}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
