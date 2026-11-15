"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { BuildBadge, Empty, rupees, small, type BuildStatus } from "./shared";

// ═════════════ Pricing ═════════════
interface PriceData {
  modules: { code: string; name: string; category: string; is_core: boolean; addon_price_paise: number }[];
  bundles: { id: string; name: string; description: string | null; module_codes: string[]; price_per_student_paise: number; is_active: boolean }[];
}

export function Pricing() {
  const [part, setPart] = useState<"single" | "bundle">("single");
  const { data, error, loading, reload } = useLoad(() => adminFetch<PriceData>("/module-config/pricing"), []);
  const act = useAction(reload);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const name = new Map(data?.modules.map((m) => [m.code, m.name]));

  const [open, setOpen] = useState(false);
  const blank = { name: "", description: "", codes: [] as string[], price: "" };
  const [f, setF] = useState(blank);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, description: f.description || null, module_codes: f.codes, price_per_student_paise: Math.round(Number(f.price) * 100) };
    if (await act.run(() => adminFetch("/module-config/bundles", json("POST", body)))) { setOpen(false); setF(blank); }
  };

  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["single", "Individual pricing"], ["bundle", "Bundle pricing"]]} />
      <ErrorBanner message={error || act.error} />
      {part === "single" ? (
        <Panel title="Add-on prices" sub="Rupees per student per year, charged at renewal when a school has a module its plan does not include. 0 means free.">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Module</Th><Th>Category</Th><Th>Add-on price (₹ / student / year)</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.modules.length && <Empty cols={3} loading={loading} text="No modules." />}
              {data?.modules.filter((m) => !m.is_core).map((m) => {
                const v = edit[m.code];
                const dirty = v !== undefined && Math.round(Number(v) * 100) !== m.addon_price_paise;
                return (
                  <tr key={m.code}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{m.name}</td><td className="px-4 py-3 text-slate-600">{m.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} step="0.01" aria-label={`${m.name} price`} className={`${inputCls} max-w-[9rem]`} value={v ?? String(m.addon_price_paise / 100)} onChange={(e) => setEdit({ ...edit, [m.code]: e.target.value })} />
                        {dirty && <button type="button" className={`${btnPrimary} !px-3 !py-1 text-xs`} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch(`/module-config/pricing/${m.code}`, json("PATCH", { addon_price_paise: Math.round(Number(v) * 100) })))) { const n = { ...edit }; delete n[m.code]; setEdit(n); } }}>Save</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      ) : (
        <Panel title="Bundles" sub="Groups of modules sold together for less. A bundle is used on a school's invoice only when all its modules are add-ons and the bundle costs less than buying them one by one." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ New bundle</button>}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Bundle</Th><Th>Modules</Th><Th>Price / student / year</Th><Th>Saves</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.bundles.length && <Empty cols={6} loading={loading} text="No bundles yet." />}
              {data?.bundles.map((b) => {
                const sum = b.module_codes.reduce((a, c) => a + (data.modules.find((m) => m.code === c)?.addon_price_paise ?? 0), 0);
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{b.name}</p><p className="text-xs text-slate-400">{b.description}</p></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{b.module_codes.map((c) => <Badge key={c} tone="blue">{name.get(c) ?? c}</Badge>)}</div></td>
                    <td className="px-4 py-3 tabular-nums">{rupees(b.price_per_student_paise)}</td>
                    <td className="px-4 py-3 tabular-nums">{sum > b.price_per_student_paise ? <span className="text-emerald-700">{rupees(sum - b.price_per_student_paise)}</span> : <span className="text-amber-700">Not cheaper</span>}</td>
                    <td className="px-4 py-3">{b.is_active ? <Badge tone="green">On sale</Badge> : <Badge tone="gray">Off</Badge>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right"><div className="flex justify-end gap-2">
                      <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/module-config/bundles/${b.id}`, json("PATCH", { is_active: !b.is_active })))}>{b.is_active ? "Switch off" : "Switch on"}</button>
                      <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Delete ${b.name}?`) && act.run(() => adminFetch(`/module-config/bundles/${b.id}`, { method: "DELETE" }))}>Delete</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Modal open={open} title="New bundle" onClose={() => setOpen(false)}>
            <form onSubmit={create} className="space-y-3">
              <ErrorBanner message={act.error} />
              <Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Exams starter pack" /></Field>
              <fieldset><legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Modules (pick at least two)</legend>
                <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                  {data?.modules.filter((m) => !m.is_core).map((m) => <label key={m.code} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={f.codes.includes(m.code)} onChange={() => setF({ ...f, codes: f.codes.includes(m.code) ? f.codes.filter((c) => c !== m.code) : [...f.codes, m.code] })} />{m.name} <span className="text-xs text-slate-400">{rupees(m.addon_price_paise)}</span></label>)}
                </div>
              </fieldset>
              <Field label="Bundle price (₹ per student per year)" hint={`Bought separately these cost ${rupees(f.codes.reduce((a, c) => a + (data?.modules.find((m) => m.code === c)?.addon_price_paise ?? 0), 0))}`}><input type="number" min={0} step="0.01" className={inputCls} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
              <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create bundle</button></div>
            </form>
          </Modal>
        </Panel>
      )}
    </>
  );
}

// ═════════════ Updates ═════════════
interface Release { id: string; module_code: string; version: string; notes: string; status: "planned" | "rolling_out" | "live" | "rolled_back"; rollout_percent: number; released_at: string | null; created_at: string; modules: { name: string; category: string } | null }
interface ModRow { code: string; name: string; category: string; build_status: BuildStatus; version: string | null }
const statusTone = { planned: "gray", rolling_out: "blue", live: "green", rolled_back: "red" } as const;
const statusLabel = { planned: "Planned", rolling_out: "Rolling out", live: "Live", rolled_back: "Rolled back" } as const;

export function Updates() {
  const [part, setPart] = useState<"version" | "notes" | "status">("version");
  const rel = useLoad(() => adminFetch<{ releases: Release[] }>("/module-config/releases"), []);
  const mods = useLoad(() => adminFetch<{ modules: ModRow[] }>("/modules"), []);
  const act = useAction(() => { rel.reload(); mods.reload(); });
  const [open, setOpen] = useState(false);
  const blank = { module_code: "", version: "", notes: "", status: "planned", rollout_percent: 0 };
  const [f, setF] = useState(blank);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/module-config/releases", json("POST", f)))) { setOpen(false); setF(blank); }
  };
  const change = (r: Release, patch: Record<string, unknown>) => act.run(() => adminFetch(`/module-config/releases/${r.id}`, json("PATCH", patch)));
  const list = rel.data?.releases ?? [];

  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["version", "Version"], ["notes", "Release notes"], ["status", "Deployment status"]]} />
      <ErrorBanner message={rel.error || act.error} />
      <p className="mb-4 text-sm text-slate-500">Releases are recorded here by your team to keep everyone informed. The platform does not deploy code itself, and a module&apos;s version changes when a release is marked live.</p>
      {part === "version" && (
        <Panel title="Live versions" sub="The newest live release of each module">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Module</Th><Th>Category</Th><Th>Build</Th><Th>Version</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {mods.data?.modules.map((m) => <tr key={m.code}><td className="px-4 py-3 font-semibold text-slate-900">{m.name}</td><td className="px-4 py-3 text-slate-600">{m.category}</td><td className="px-4 py-3"><BuildBadge status={m.build_status} /></td><td className="px-4 py-3 tabular-nums">{m.version ?? <span className="text-slate-400">Not released</span>}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      )}
      {part === "notes" && (
        <Panel title="Release notes" sub="What changed in recent releases" right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Add release</button>}>
          <ul className="divide-y divide-slate-100">
            {!list.length && <li className="px-5 py-8 text-center text-sm text-slate-400">{rel.loading ? "Loading…" : "No releases recorded."}</li>}
            {list.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <p className="font-semibold text-slate-900">{r.modules?.name} <span className="tabular-nums text-slate-500">v{r.version}</span> <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge></p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.notes}</p>
                <p className="mt-1 text-xs text-slate-400">{r.released_at ? "Released " + fmtDate(r.released_at) : "Added " + fmtDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {part === "status" && (
        <Panel title="Deployment status" sub="Where each release is in the rollout">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Release</Th><Th>Status</Th><Th>Rollout</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!list.length && <Empty cols={4} loading={rel.loading} text="No releases recorded." />}
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.modules?.name} <span className="tabular-nums font-normal text-slate-500">v{r.version}</span></td>
                  <td className="px-4 py-3"><Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-mca-blue" style={{ width: r.rollout_percent + "%" }} /></div><span className="text-xs tabular-nums text-slate-500">{r.rollout_percent}%</span></div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right"><div className="flex justify-end gap-2">
                    {r.status === "planned" && <button type="button" className={small} disabled={act.busy} onClick={() => change(r, { status: "rolling_out", rollout_percent: 10 })}>Start rollout</button>}
                    {r.status === "rolling_out" && <button type="button" className={small} disabled={act.busy} onClick={() => change(r, { rollout_percent: Math.min(100, r.rollout_percent + 20) })}>+20%</button>}
                    {(r.status === "rolling_out" || r.status === "planned") && <button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy} onClick={() => change(r, { status: "live" })}>Mark live</button>}
                    {(r.status === "rolling_out" || r.status === "live") && <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("Mark this release as rolled back?") && change(r, { status: "rolled_back" })}>Roll back</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Modal open={open} title="Add a release" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Module"><select className={inputCls} required value={f.module_code} onChange={(e) => setF({ ...f, module_code: e.target.value })}><option value="">Choose</option>{mods.data?.modules.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select></Field>
            <Field label="Version"><input className={inputCls} required pattern="\d+\.\d+\.\d+" placeholder="1.2.0" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
            <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="planned">Planned</option><option value="rolling_out">Rolling out</option><option value="live">Live</option></select></Field>
            {f.status === "rolling_out" && <Field label="Rollout %"><input type="number" min={0} max={100} className={inputCls} value={f.rollout_percent} onChange={(e) => setF({ ...f, rollout_percent: Number(e.target.value) })} /></Field>}
          </div>
          <Field label="What changed"><textarea className={`${inputCls} min-h-[6rem]`} required minLength={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Add release</button></div>
        </form>
      </Modal>
    </>
  );
}
