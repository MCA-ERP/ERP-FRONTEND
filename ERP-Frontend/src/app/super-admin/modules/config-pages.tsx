"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small } from "../schools/pages/shared";

export type ConfigTab = "settings" | "dependencies" | "flags";
interface ModFlags { code: string; name: string; category: string; min_plan: string | null; is_core: boolean; show_in_parent_app: boolean; show_in_teacher_app: boolean; offline_mode: boolean }
const useModules = () => useLoad(() => adminFetch<{ modules: ModFlags[] }>("/modules"), []);

export function ModuleConfiguration({ tab }: { tab: ConfigTab }) {
  return tab === "settings" ? <Settings /> : tab === "dependencies" ? <Dependencies /> : <Flags />;
}

const DEFAULTS = { "modules.admins_toggle": true, "modules.confirm_addon": true, "modules.hide_unused": false, "modules.default_for_new": "off" } as Record<string, boolean | string>;

function Settings() {
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, boolean | string> }>("/module-config/settings"), []);
  const mods = useModules();
  const [d, setD] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const flags = useAction(mods.reload);
  const reset = () => setD({ ...DEFAULTS, ...(data?.settings ?? {}) });
  useEffect(() => { if (data) reset(); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: boolean | string) => { setD((x) => ({ ...x, [k]: v })); setSaved(false); };
  const list = mods.data?.modules ?? [];
  const setFlag = (code: string, key: "show_in_parent_app" | "show_in_teacher_app" | "offline_mode", v: boolean) => flags.run(() => adminFetch(`/module-config/modules/${code}`, json("PATCH", { [key]: v })));

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || mods.error || act.error || flags.error} />
      <FormCard title="Module settings" saveLabel="Save settings" busy={act.busy} saved={saved} disabled={!data} onDiscard={reset}
        onSubmit={async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => adminFetch("/module-config/settings", json("PUT", { values: d })))) setSaved(true); }}>
        <div className="-mt-4">
          <ToggleRow label="Let school admins turn modules on and off" hint="Only modules included in their plan" checked={d["modules.admins_toggle"] === true} onChange={(v) => set("modules.admins_toggle", v)} />
          <ToggleRow label="Ask before enabling a paid add-on" hint="The school admin confirms the extra charge" checked={d["modules.confirm_addon"] === true} onChange={(v) => set("modules.confirm_addon", v)} />
          <ToggleRow label="Hide modules a school hasn't used for 90 days" hint="From the school's menu, not deleted" checked={d["modules.hide_unused"] === true} onChange={(v) => set("modules.hide_unused", v)} />
          <div className="-mx-5 flex items-center gap-4 border-t border-slate-100 px-5 py-3.5">
            <p className="min-w-0 flex-1 text-[13.5px] font-medium text-slate-900">Default for new modules</p>
            <select className={`${inputCls} max-w-[12rem]`} aria-label="Default for new modules" value={String(d["modules.default_for_new"])} onChange={(e) => set("modules.default_for_new", e.target.value)}><option value="off">Off until enabled</option><option value="on">On for every school</option></select>
          </div>
        </div>
      </FormCard>
      <Panel title="Per-module switches" sub={`${list.length} modules`} right={<ExportPrint name="module-switches" head={["Module", "Group", "Parent app", "Teacher app", "Offline mode"]} rows={list.map((m) => [m.name, m.category, m.show_in_parent_app ? "On" : "Off", m.show_in_teacher_app ? "On" : "Off", m.offline_mode ? "On" : "Off"])} />}>
        <SimpleTable head={[{ h: "Module" }, { h: "Group" }, { h: "Parent app" }, { h: "Teacher app" }, { h: "Offline mode" }]} empty={mods.loading ? "Loading…" : "No modules."}
          rows={list.map((m) => [
            <b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{m.category}</Tag>,
            <Toggle key="p" checked={m.show_in_parent_app} disabled={flags.busy} label={`${m.name} in the parent app`} onChange={(v) => setFlag(m.code, "show_in_parent_app", v)} />,
            <Toggle key="t" checked={m.show_in_teacher_app} disabled={flags.busy} label={`${m.name} in the teacher app`} onChange={(v) => setFlag(m.code, "show_in_teacher_app", v)} />,
            <Toggle key="o" checked={m.offline_mode} disabled={flags.busy} label={`${m.name} offline`} onChange={(v) => setFlag(m.code, "offline_mode", v)} />,
          ])} />
      </Panel>
    </div>
  );
}

interface DepRow { code: string; name: string; category: string; requires: string[] }

function Dependencies() {
  const deps = useLoad(() => adminFetch<{ modules: DepRow[] }>("/module-config/dependencies"), []);
  const mods = useModules();
  const act = useAction(deps.reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<DepRow | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const all = deps.data?.modules ?? [];
  const name = new Map(all.map((m) => [m.code, m.name]));
  const neededBy = (code: string) => all.filter((m) => m.requires.includes(code)).map((m) => m.name);
  const from = (code: string) => { const m = mods.data?.modules.find((x) => x.code === code); return m?.is_core ? "All plans" : m?.min_plan ?? "—"; };
  const rows = all.filter((m) => (m.requires.length || neededBy(m.code).length) && (!search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase())));
  const chips = (names: string[]) => (names.length ? <span className="flex flex-wrap gap-1.5">{names.map((n) => <Tag key={n}>{n}</Tag>)}</span> : <span className="text-slate-400">—</span>);
  return (
    <div className="space-y-5">
      <ErrorBanner message={deps.error || mods.error || act.error} />
      <p role="note" className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">Turning on a module also turns on what it depends on. A module can&apos;t be turned off while another enabled module needs it.</p>
      <Panel title="Dependencies" sub={`${rows.length} modules`} right={<ExportPrint name="module-dependencies" head={["Module", "Needs", "Needed by", "Included from"]} rows={rows.map((m) => [m.name, m.requires.map((c) => name.get(c)).join(", "), neededBy(m.code).join(", "), from(m.code)])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search dependencies" aria-label="Search dependencies" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Module" }, { h: "Needs" }, { h: "Needed by" }, { h: "Included from" }, { h: "" }]} empty={deps.loading ? "Loading…" : "No dependencies."}
          rows={rows.map((m) => [<b key="n" className="font-semibold text-slate-900">{m.name}</b>, chips(m.requires.map((c) => name.get(c) ?? c)), chips(neededBy(m.code)), <span key="f" className="font-semibold text-[#026f9b]">{from(m.code)}</span>,
            <span key="v" className="flex gap-1.5"><button type="button" className={small} onClick={() => { setPicked(m.requires); setOpen(m); }}>Edit</button><Link href={`/super-admin/modules/catalogue?tab=details&module=${m.code}`} className={small}>View details</Link></span>])} />
      </Panel>
      <Modal open={!!open} title={`${open?.name ?? ""} needs…`} onClose={() => setOpen(null)}>
        <div className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
            {all.filter((m) => m.code !== open?.code).map((m) => (
              <label key={m.code} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={picked.includes(m.code)} onChange={() => setPicked(picked.includes(m.code) ? picked.filter((c) => c !== m.code) : [...picked, m.code])} />{m.name}</label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Plans and schools that already have this module but lack a requirement will lose access to it until the requirement is on.</p>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={async () => { if (open && (await act.run(() => adminFetch(`/module-config/dependencies/${open.code}`, json("PUT", { requires: picked }))))) setOpen(null); }}>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}

interface Flag { id: string; key: string; name: string; description: string | null; module_code: string | null; rollout_percent: number; enabled: boolean; modules: { name: string } | null }

function Flags() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ flags: Flag[] }>("/module-config/flags"), []);
  const mods = useModules();
  const act = useAction(reload);
  const blank = { key: "", name: "", description: "", module_code: "", rollout_percent: 10 };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [view, setView] = useState<Flag | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "modules/configuration/flags") setOpen(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const q = search.trim().toLowerCase();
  const list = (data?.flags ?? []).filter((x) => !q || `${x.key} ${x.name} ${x.description ?? ""}`.toLowerCase().includes(q));
  const state = (x: Flag): [string, "good" | "info" | "mute"] => (!x.enabled ? ["Off", "mute"] : x.rollout_percent >= 100 ? ["Live", "good"] : ["Rolling out", "info"]);
  const create = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => adminFetch("/module-config/flags", json("POST", { ...f, module_code: f.module_code || null })))) { setOpen(false); setF(blank); } };
  const patch = (x: Flag, body: Record<string, unknown>) => act.run(() => adminFetch(`/module-config/flags/${x.id}`, json("PATCH", body)));

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Feature flags" sub={`${list.length} flags`} right={<ExportPrint name="feature-flags" head={["Flag", "Module", "What it does", "Rollout", "Status"]} rows={list.map((x) => [x.key, x.modules?.name, x.description, x.rollout_percent + "%", state(x)[0]])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search feature flags" aria-label="Search feature flags" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Flag" }, { h: "Module" }, { h: "What it does" }, { h: "Rollout" }, { h: "Status" }, { h: "On" }, { h: "" }]} empty={loading ? "Loading…" : "No flags yet."}
          rows={list.map((x) => [
            <b key="k" className="font-semibold text-slate-900">{x.key}</b>, x.modules?.name ? <Tag key="m">{x.modules.name}</Tag> : "—", x.description ?? "—",
            <span key="r" className="flex items-center gap-2"><span className="h-2 w-28 overflow-hidden rounded-full border border-[#c0e4f3] bg-[#f3f9fd]"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: x.rollout_percent + "%" }} /></span><span className="text-xs tabular-nums">{x.rollout_percent}%</span></span>,
            <Chip key="s" tone={state(x)[1]}>{state(x)[0]}</Chip>,
            <Toggle key="o" checked={x.enabled} disabled={act.busy} label={`${x.key} on`} onChange={(v) => patch(x, { enabled: v })} />,
            <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>,
          ])} />
      </Panel>

      <Modal open={open} title="New feature flag" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="Key" hint="Lowercase, used by the code. e.g. exams.new_report_cards"><input className={`${inputCls} font-mono`} required value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} /></Labelled>
          <Labelled label="Module (optional)"><select className={inputCls} value={f.module_code} onChange={(e) => setF({ ...f, module_code: e.target.value })}><option value="">None</option>{mods.data?.modules.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select></Labelled>
          <Labelled label={`Start with ${f.rollout_percent}% of schools`}><input type="range" min={0} max={100} step={5} className="w-full accent-[#0294ce]" value={f.rollout_percent} onChange={(e) => setF({ ...f, rollout_percent: Number(e.target.value) })} /></Labelled>
          <Labelled label="What it does"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create flag</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.key ?? ""} onClose={() => setView(null)}>
        {view && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-800">{view.description || "No description."}</p>
            <Labelled label={`Rollout: ${view.rollout_percent}% of schools`}>
              <input type="range" min={0} max={100} step={5} className="w-full accent-[#0294ce]" defaultValue={view.rollout_percent} aria-label="Rollout"
                onMouseUp={async (e) => { const v = Number((e.target as HTMLInputElement).value); if (await patch(view, { rollout_percent: v })) setView({ ...view, rollout_percent: v }); }} />
            </Labelled>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <button type="button" className={small} disabled={act.busy} onClick={async () => { if (window.confirm(`Delete ${view.key}?`) && (await act.run(() => adminFetch(`/module-config/flags/${view.id}`, { method: "DELETE" })))) setView(null); }}>Delete</button>
              <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
