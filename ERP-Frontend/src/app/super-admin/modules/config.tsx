"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, Switch, small } from "./shared";

export function Configuration() {
  const [part, setPart] = useState<"settings" | "deps" | "flags">("settings");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["settings", "Settings"], ["deps", "Dependencies"], ["flags", "Feature flags"]]} />
      {part === "settings" && <Settings />}
      {part === "deps" && <Dependencies />}
      {part === "flags" && <Flags />}
    </>
  );
}

function Settings() {
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, boolean> }>("/module-config/settings"), []);
  const act = useAction(reload);
  const rows = [
    { key: "modules.allow_addons", title: "Allow add-on modules", text: "Let a school have a module its plan does not include, charged at renewal. Switch off to sell modules only through plans." },
    { key: "modules.show_locked", title: "Show locked modules to schools", text: "Schools see modules they do not have, marked as locked, with a prompt to ask for them. Switch off to hide them." },
  ];
  return (
    <Panel title="Module settings" sub="Rules that apply to every module and every school.">
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 px-5 py-4">
            <div><p className="font-semibold text-slate-900">{r.title}</p><p className="text-sm text-slate-500">{r.text}</p></div>
            <Switch label={r.title} checked={data?.settings[r.key] ?? true} disabled={!data || act.busy} onChange={(v) => act.run(() => adminFetch("/module-config/settings", json("PUT", { values: { [r.key]: v } })))} />
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">The platform-wide on/off switch for each module is in the Catalogue. Which plan includes what is under Plan mapping.</p>
    </Panel>
  );
}

interface DepRow { code: string; name: string; category: string; requires: string[] }

function Dependencies() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ modules: DepRow[] }>("/module-config/dependencies"), []);
  const act = useAction(reload);
  const [open, setOpen] = useState<DepRow | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const byCode = new Map(data?.modules.map((m) => [m.code, m.name]));
  const save = async () => { if (open && (await act.run(() => adminFetch(`/module-config/dependencies/${open.code}`, json("PUT", { requires: picked }))))) setOpen(null); };

  return (
    <Panel title="Dependencies" sub="Modules that need other modules to work. A module is off for a school until everything it needs is on.">
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Module</Th><Th>Needs</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.modules.length && <Empty cols={3} loading={loading} text="No modules." />}
          {data?.modules.map((m) => (
            <tr key={m.code}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{m.name}</p><p className="text-xs text-slate-400">{m.category}</p></td>
              <td className="px-4 py-3">{m.requires.length ? <div className="flex flex-wrap gap-1.5">{m.requires.map((r) => <Badge key={r} tone="blue">{byCode.get(r) ?? r}</Badge>)}</div> : <span className="text-slate-400">Nothing</span>}</td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} onClick={() => { setPicked(m.requires); setOpen(m); }}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!open} title={`${open?.name ?? ""} needs…`} onClose={() => setOpen(null)}>
        <div className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
            {data?.modules.filter((m) => m.code !== open?.code).map((m) => (
              <label key={m.code} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={picked.includes(m.code)} onChange={() => setPicked(picked.includes(m.code) ? picked.filter((c) => c !== m.code) : [...picked, m.code])} />{m.name}</label>
            ))}
          </div>
          <p className="text-xs text-slate-400">Plans and schools that already have this module but lack a requirement will lose access to it until the requirement is on.</p>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={save}>Save</button></div>
        </div>
      </Modal>
    </Panel>
  );
}

interface Flag { id: string; key: string; name: string; description: string | null; module_code: string | null; rollout_percent: number; enabled: boolean; schools_reached: number; live_schools: number; modules: { name: string } | null }

function Flags() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ flags: Flag[] }>("/module-config/flags"), []);
  const mods = useLoad(() => adminFetch<{ modules: { code: string; name: string }[] }>("/module-config/dependencies"), []);
  const act = useAction(reload);
  const blank = { key: "", name: "", description: "", module_code: "", rollout_percent: 10 };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/module-config/flags", json("POST", { ...f, module_code: f.module_code || null })))) { setOpen(false); setF(blank); }
  };
  return (
    <Panel title="Feature flags" sub="Turn a new feature on gradually. The same schools always get it, so a rollout never flickers." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ New flag</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Flag</Th><Th>Module</Th><Th>Rollout</Th><Th>Reaches</Th><Th>On</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.flags.length && <Empty cols={6} loading={loading} text="No flags yet." />}
          {data?.flags.map((fl) => (
            <tr key={fl.id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{fl.name}</p><p className="font-mono text-xs text-slate-400">{fl.key}</p></td>
              <td className="px-4 py-3 text-slate-600">{fl.modules?.name ?? "—"}</td>
              <td className="px-4 py-3">
                <input type="range" min={0} max={100} step={5} aria-label={`${fl.name} rollout`} defaultValue={fl.rollout_percent} className="w-32 accent-mca-blue"
                  onMouseUp={(e) => act.run(() => adminFetch(`/module-config/flags/${fl.id}`, json("PATCH", { rollout_percent: Number((e.target as HTMLInputElement).value) })))}
                  onKeyUp={(e) => act.run(() => adminFetch(`/module-config/flags/${fl.id}`, json("PATCH", { rollout_percent: Number((e.target as HTMLInputElement).value) })))} />
                <span className="ml-2 text-xs tabular-nums text-slate-500">{fl.rollout_percent}%</span>
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{fl.schools_reached} of {fl.live_schools} schools</td>
              <td className="px-4 py-3"><Switch label={`${fl.name} on`} checked={fl.enabled} disabled={act.busy} onChange={(v) => act.run(() => adminFetch(`/module-config/flags/${fl.id}`, json("PATCH", { enabled: v })))} /></td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Delete ${fl.name}?`) && act.run(() => adminFetch(`/module-config/flags/${fl.id}`, { method: "DELETE" }))}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Schools can read which flags are on for them. A feature has to check its flag to respect it; flags do nothing by themselves.</p>
      <Modal open={open} title="New feature flag" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Key" hint="Lowercase, used by the code. e.g. exams.new_report_cards"><input className={`${inputCls} font-mono`} required value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} /></Field>
          <Field label="Module (optional)"><select className={inputCls} value={f.module_code} onChange={(e) => setF({ ...f, module_code: e.target.value })}><option value="">None</option>{mods.data?.modules.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select></Field>
          <Field label={`Start with ${f.rollout_percent}% of schools`}><input type="range" min={0} max={100} step={5} className="w-full accent-mca-blue" value={f.rollout_percent} onChange={(e) => setF({ ...f, rollout_percent: Number(e.target.value) })} /></Field>
          <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create flag</button></div>
        </form>
      </Modal>
    </Panel>
  );
}
