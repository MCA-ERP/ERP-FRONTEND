"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type Paged, type SchoolModuleAccess, type SchoolRow } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Th, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, rupees, small } from "./shared";

type Mod = SchoolModuleAccess["modules"][number] & { missing?: string[] };
type Priced = { modules: { code: string; addon_price_paise: number }[] };

/** Choose a school, then turn modules on or off one by one, or set the whole list at once. */
export function Allocation() {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const [school, setSchool] = useState("");
  const [mode, setMode] = useState<"enable" | "disable" | "assign">("enable");
  const access = useLoad(() => (school ? adminFetch<SchoolModuleAccess>(`/schools/${school}/modules`) : Promise.resolve(null)), [school]);
  const prices = useLoad(() => adminFetch<Priced>("/module-config/pricing"), []);
  const act = useAction(access.reload);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const mods = (access.data?.modules ?? []) as Mod[];
  useEffect(() => { setPicked(new Set(mods.filter((m) => m.effective).map((m) => m.code))); setSaved(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [access.data]);

  const price = (code: string) => prices.data?.modules.find((m) => m.code === code)?.addon_price_paise ?? 0;
  const source = (m: Mod) => (m.is_core ? "Core" : !m.globally_enabled ? "Off platform-wide" : m.override === true && !m.via_plan ? "Add-on" : m.override === false ? "Turned off for this school" : m.via_plan ? "In plan" : "Not in plan");
  const setOverride = (code: string, enabled: boolean | null) => act.run(() => adminFetch(`/schools/${school}/modules/${code}`, json("PUT", { enabled })));
  const names = new Map(mods.map((m) => [m.code, m.name]));

  const off = mods.filter((m) => !m.is_core && !m.effective);
  const on = mods.filter((m) => !m.is_core && m.effective);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className={`${inputCls} max-w-sm`} aria-label="School" value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">Choose a school</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.plan_name ?? "no plan"})</option>)}
        </select>
        {access.data && <span className="text-sm text-slate-500">Plan: <b>{access.data.planCode ?? "none"}</b></span>}
      </div>
      <ErrorBanner message={access.error || act.error} />
      {!school ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">Choose a school to manage its modules.</p> : (
        <>
          <TabBar value={mode} onChange={setMode} tabs={[["enable", "Enable", off.length], ["disable", "Disable", on.length], ["assign", "Assign modules"]]} />
          {mode !== "assign" ? (
            <Panel title={mode === "enable" ? "Turn on modules" : "Turn off modules"} sub={mode === "enable" ? "A module outside the school's plan becomes an add-on and is charged at the next renewal." : "Data is kept. The school simply stops seeing the module."}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><Th>Module</Th><Th>Status</Th><Th>Add-on price</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {!(mode === "enable" ? off : on).length && <Empty cols={4} loading={access.loading} text={mode === "enable" ? "Everything is already on." : "Nothing to turn off."} />}
                  {(mode === "enable" ? off : on).map((m) => (
                    <tr key={m.code}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{m.name}{m.missing?.length ? <p className="text-xs font-normal text-amber-700">Waiting for {m.missing.map((c) => names.get(c) ?? c).join(", ")}</p> : null}</td>
                      <td className="px-4 py-3"><Badge tone={m.effective ? "green" : "gray"}>{source(m)}</Badge></td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{m.via_plan ? "Included" : price(m.code) ? rupees(price(m.code)) + " per student / year" : "Free"}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className={mode === "enable" ? `${btnPrimary} !px-3 !py-1 text-xs` : small} disabled={act.busy || !m.globally_enabled}
                          onClick={() => setOverride(m.code, mode === "enable" ? (m.via_plan ? null : true) : (m.via_plan ? false : null))}>{mode === "enable" ? "Enable" : "Disable"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : (
            <Panel title="Assign modules" sub="Tick the full set this school should have. What its plan includes stays with the plan; the rest become add-ons.">
              <div className="space-y-3 p-5">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {mods.map((m) => (
                    <label key={m.code} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${picked.has(m.code) ? "border-mca-blue/40 bg-mca-blue-sky/30" : "border-slate-200"}`}>
                      <input type="checkbox" className="mt-0.5 size-4 accent-mca-blue" disabled={m.is_core || !m.globally_enabled} checked={picked.has(m.code)}
                        onChange={() => { setSaved(false); const n = new Set(picked); if (n.has(m.code)) n.delete(m.code); else n.add(m.code); setPicked(n); }} />
                      <span><span className="font-semibold text-slate-900">{m.name}</span><br /><span className="text-xs text-slate-500">{m.is_core ? "Core" : m.via_plan ? "In plan" : price(m.code) ? "Add-on " + rupees(price(m.code)) : "Add-on"}</span></span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-3">
                  {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
                  <button type="button" className={btnPrimary} disabled={act.busy} onClick={async () => { setSaved(false); if (await act.run(() => adminFetch(`/schools/${school}/modules`, json("PUT", { module_codes: [...picked] })))) setSaved(true); }}>Save modules</button>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
