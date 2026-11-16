"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type SchoolModuleAccess, type SchoolRow } from "@/lib/admin-api";
import { fmtDay, inr, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Labelled, SchoolBar, small, smallPrimary } from "../schools/pages/shared";

// ═════════════ School module allocation ═════════════
export type AllocTab = "enable" | "disable" | "assign";
interface Cat { code: string; name: string; category: string; addon_price_paise: number }
type Acc = SchoolModuleAccess["modules"][number] & { missing?: string[] };

export function ModuleAllocation({ tab }: { tab: AllocTab }) {
  return <SchoolBar>{(s) => <Allocate school={s} tab={tab} />}</SchoolBar>;
}

function Allocate({ school, tab }: { school: SchoolRow; tab: AllocTab }) {
  const access = useLoad(() => adminFetch<SchoolModuleAccess>(`/schools/${school.id}/modules`), [school.id]);
  const cat = useLoad(() => adminFetch<{ modules: Cat[] }>("/modules"), []);
  const deps = useLoad(() => adminFetch<{ modules: { code: string; requires: string[] }[] }>("/module-config/dependencies"), []);
  const act = useAction(access.reload);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const mods = (access.data?.modules ?? []) as Acc[];
  const info = (code: string) => cat.data?.modules.find((m) => m.code === code);
  useEffect(() => { setPicked(new Set(mods.filter((m) => m.effective).map((m) => m.code))); setSaved(false); }, [access.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const match = (m: Acc) => !q || m.name.toLowerCase().includes(q);
  const price = (code: string) => info(code)?.addon_price_paise ?? 0;
  const setOverride = (code: string, enabled: boolean | null) => act.run(() => adminFetch(`/schools/${school.id}/modules/${code}`, json("PUT", { enabled })));
  const neededBy = (code: string) => (deps.data?.modules ?? []).filter((d) => d.requires.includes(code) && mods.find((m) => m.code === d.code)?.effective).map((d) => mods.find((m) => m.code === d.code)?.name ?? d.code);
  const view = (code: string) => <Link href={`/super-admin/modules/catalogue?tab=details&module=${code}`} className={small}>View details</Link>;
  const err = access.error || cat.error || act.error;

  if (tab === "enable") {
    const rows = mods.filter((m) => !m.is_core && !m.effective && match(m));
    return (
      <div className="space-y-5">
        <ErrorBanner message={err} />
        <Panel title="Modules not enabled" sub={`${rows.length} modules`} right={<ExportPrint name={`${school.code}-modules-not-enabled`} head={["Module", "Group", "Access", "Extra per year"]} rows={rows.map((m) => [m.name, info(m.code)?.category, m.via_plan ? "In plan" : "Add-on", m.via_plan ? "" : (price(m.code) * school.students) / 100])} />}>
          <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search modules not enabled" aria-label="Search modules" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable head={[{ h: "Module" }, { h: "Group" }, { h: "Access" }, { h: "Extra per year", right: true }, { h: "" }]} empty={access.loading ? "Loading…" : "Everything is already on."}
            rows={rows.map((m) => [
              <b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{info(m.code)?.category ?? ""}</Tag>,
              m.via_plan ? <Tag key="a">In plan</Tag> : <Tag key="a">{`Add-on · ₹${Math.round(price(m.code) / 100)}/student`}</Tag>,
              m.via_plan ? "—" : inr(price(m.code) * school.students),
              <span key="b" className="flex gap-1.5"><button type="button" className={smallPrimary} disabled={act.busy || !m.globally_enabled} onClick={() => setOverride(m.code, m.via_plan ? null : true)}>Enable</button>{view(m.code)}</span>,
            ])} />
        </Panel>
      </div>
    );
  }

  if (tab === "disable") {
    const rows = mods.filter((m) => !m.is_core && m.effective && match(m));
    return (
      <div className="space-y-5">
        <ErrorBanner message={err} />
        <Panel title="Enabled modules" sub={`${rows.length} modules`} right={<ExportPrint name={`${school.code}-enabled-modules`} head={["Module", "Group", "Needed by"]} rows={rows.map((m) => [m.name, info(m.code)?.category, neededBy(m.code).join(", ")])} />}>
          <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search enabled modules" aria-label="Search modules" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable head={[{ h: "Module" }, { h: "Group" }, { h: "Needed by" }, { h: "" }]} empty={access.loading ? "Loading…" : "Nothing to turn off."}
            rows={rows.map((m) => [
              <b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{info(m.code)?.category ?? ""}</Tag>, neededBy(m.code).join(", ") || "—",
              <span key="b" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => setOverride(m.code, m.via_plan ? false : null)}>Disable</button>{view(m.code)}</span>,
            ])} />
        </Panel>
      </div>
    );
  }

  const label = (m: Acc) => `${info(m.code)?.category ?? ""} · ${m.is_core || m.via_plan ? "Included" : `Add-on ₹${Math.round(price(m.code) / 100)}`}`;
  const save = async (e: FormEvent) => { e.preventDefault(); setSaved(false); if (await act.run(() => adminFetch(`/schools/${school.id}/modules`, json("PUT", { module_codes: [...picked] })))) setSaved(true); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={err} />
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Modules for {school.name}</h2><span className="text-xs text-slate-500">{picked.size} enabled</span></div>
        <div className="grid gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-6">
          {mods.map((m) => (
            <label key={m.code} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm ${picked.has(m.code) ? "border-[#c0e4f3] bg-[#f3f9fd]" : "border-slate-200"}`}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#026f9b]" disabled={m.is_core || !m.globally_enabled} checked={picked.has(m.code)}
                onChange={() => { setSaved(false); const n = new Set(picked); if (n.has(m.code)) n.delete(m.code); else n.add(m.code); setPicked(n); }} />
              <span><span className="font-semibold text-slate-900">{m.name}</span><span className="block text-xs text-slate-500">{label(m)}</span></span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
          {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
          <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setPicked(new Set(mods.filter((m) => m.effective).map((m) => m.code)))}>Discard</button>
          <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save modules"}</button>
        </div>
      </form>
    </div>
  );
}

// ═════════════ Module pricing ═════════════
export type PricingTab = "individual" | "bundle";
interface PriceData {
  modules: { code: string; name: string; category: string; is_core: boolean; addon_price_paise: number }[];
  bundles: { id: string; name: string; description: string | null; module_codes: string[]; price_per_student_paise: number; is_active: boolean }[];
}
const rs = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

export function ModulePricing({ tab }: { tab: PricingTab }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<PriceData>("/module-config/pricing"), []);
  const cat = useLoad(() => adminFetch<{ modules: { code: string; min_plan: string | null; is_core: boolean }[] }>("/modules"), []);
  const plans = useLoad(() => adminFetch<{ plans: { name: string; sort_order: number }[] }>("/plans"), []);
  const act = useAction(reload);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PriceData["bundles"][number] | null>(null);
  const blank = { name: "", description: "", codes: [] as string[], price: "" };
  const [f, setF] = useState(blank);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "modules/pricing/bundle") setOpen(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);

  const mods = data?.modules ?? [];
  const name = new Map(mods.map((m) => [m.code, m.name]));
  const lowest = [...(plans.data?.plans ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.name;
  const from = (code: string) => cat.data?.modules.find((m) => m.code === code)?.min_plan ?? "—";
  const everyPlan = (m: PriceData["modules"][number]) => m.is_core || from(m.code) === lowest;
  const price = (code: string) => data?.modules.find((m) => m.code === code)?.addon_price_paise ?? 0;
  const dirty = Object.keys(edit).filter((c) => Math.round(Number(edit[c]) * 100) !== price(c));

  if (tab === "individual") {
    return (
      <div className="space-y-5">
        <ErrorBanner message={error || act.error} />
        <form className="rounded-2xl border border-slate-200 bg-white" onSubmit={async (e) => {
          e.preventDefault(); setSaved(false);
          if (await act.run(async () => { for (const c of dirty) await adminFetch(`/module-config/pricing/${c}`, json("PATCH", { addon_price_paise: Math.round(Number(edit[c]) * 100) })); })) { setEdit({}); setSaved(true); }
        }}>
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Add-on prices</h2></div>
          <SimpleTable head={[{ h: "Module" }, { h: "Group" }, { h: "Included from" }, { h: "Add-on price (₹ / student / year)" }]} empty={loading ? "Loading…" : "No modules."}
            rows={mods.map((m) => [
              <b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{m.category}</Tag>, <span key="f" className="font-semibold text-[#026f9b]">{from(m.code)}</span>,
              everyPlan(m) ? <span key="p" className="text-slate-500">Included in every plan</span>
                : <input key="p" type="number" min={0} step="0.01" aria-label={`${m.name} price`} className={`${inputCls} max-w-[7rem]`} value={edit[m.code] ?? String(m.addon_price_paise / 100)} onChange={(e) => { setEdit({ ...edit, [m.code]: e.target.value }); setSaved(false); }} />,
            ])} />
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
            {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit({}); setSaved(false); }}>Discard</button>
            <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !dirty.length}>{act.busy ? "Saving…" : "Save prices"}</button>
          </div>
        </form>
      </div>
    );
  }

  const bundles = (data?.bundles ?? []).filter((b) => !search.trim() || b.name.toLowerCase().includes(search.trim().toLowerCase()));
  const sum = (b: PriceData["bundles"][number]) => b.module_codes.reduce((a, c) => a + price(c), 0);
  const saving = (b: PriceData["bundles"][number]) => (sum(b) > 0 ? Math.max(0, Math.round(((sum(b) - b.price_per_student_paise) / sum(b)) * 100)) : 0);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/module-config/bundles", json("POST", { name: f.name, description: f.description || null, module_codes: f.codes, price_per_student_paise: Math.round(Number(f.price) * 100) })))) { setOpen(false); setF(blank); }
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Bundles" sub={`${bundles.length} bundles`} right={<ExportPrint name="module-bundles" head={["Bundle", "Modules", "Bundle price", "Separately", "Saving"]} rows={bundles.map((b) => [b.name, b.module_codes.map((c) => name.get(c)).join(", "), b.price_per_student_paise / 100, sum(b) / 100, saving(b) + "%"])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search bundles" aria-label="Search bundles" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Bundle" }, { h: "Modules" }, { h: "Bundle price", right: true }, { h: "Separately", right: true }, { h: "Saving", right: true }, { h: "" }]} empty={loading ? "Loading…" : "No bundles yet."}
          rows={bundles.map((b) => [<b key="n" className="font-semibold text-slate-900">{b.name}</b>, b.module_codes.map((c) => name.get(c) ?? c).join(", "), rs(b.price_per_student_paise), rs(sum(b)), <span key="s" className="text-[#065740]">{saving(b)}%</span>,
            <button key="v" type="button" className={small} onClick={() => setView(b)}>View details</button>])} />
      </Panel>
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">Prices are per student per year, before GST.</p>

      <Modal open={open} title="New bundle" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <fieldset><legend className="mb-1 text-[12.5px] font-medium text-slate-900">Modules (pick at least two)</legend>
            <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">{mods.filter((m) => !m.is_core).map((m) => <label key={m.code} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={f.codes.includes(m.code)} onChange={() => setF({ ...f, codes: f.codes.includes(m.code) ? f.codes.filter((c) => c !== m.code) : [...f.codes, m.code] })} />{m.name}</label>)}</div></fieldset>
          <Labelled label="Bundle price (₹ per student per year)" hint={`Bought separately these cost ${rs(f.codes.reduce((a, c) => a + price(c), 0))}`}><input type="number" min={0} step="0.01" required className={inputCls} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Labelled>
          <Labelled label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create bundle</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>
        {view && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-800">{view.description || "No description."}</p>
            <p><b className="font-semibold">Modules:</b> {view.module_codes.map((c) => name.get(c) ?? c).join(", ")}</p>
            <p><b className="font-semibold">Price:</b> {rs(view.price_per_student_paise)} per student per year ({rs(sum(view))} separately)</p>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="flex gap-2">
                <button type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch(`/module-config/bundles/${view.id}`, json("PATCH", { is_active: !view.is_active })))) setView({ ...view, is_active: !view.is_active }); }}>{view.is_active ? "Switch off" : "Switch on"}</button>
                <button type="button" className={small} disabled={act.busy} onClick={async () => { if (window.confirm(`Delete ${view.name}?`) && (await act.run(() => adminFetch(`/module-config/bundles/${view.id}`, { method: "DELETE" })))) setView(null); }}>Delete</button>
              </span>
              <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═════════════ Module versions ═════════════
interface Release { id: string; module_code: string; version: string; notes: string; status: "planned" | "rolling_out" | "live" | "rolled_back"; released_at: string | null; created_at: string }

export function ModuleVersions() {
  const mods = useLoad(() => adminFetch<{ modules: { code: string; name: string; version: string | null }[] }>("/modules"), []);
  const rel = useLoad(() => adminFetch<{ releases: Release[] }>("/module-config/releases"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<{ code: string; name: string } | null>(null);
  const releases = rel.data?.releases ?? [];
  const released = (code: string) => { const r = releases.find((x) => x.module_code === code && x.status === "live"); return r ? fmtDay((r.released_at ?? r.created_at).slice(0, 10)) : "—"; };
  const next = (code: string) => releases.find((x) => x.module_code === code && (x.status === "planned" || x.status === "rolling_out"));
  const rows = (mods.data?.modules ?? []).filter((m) => !search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="space-y-5">
      <ErrorBanner message={mods.error || rel.error} />
      <Panel title="Versions" sub={`${rows.length} modules`} right={<ExportPrint name="module-versions" head={["Module", "Live version", "Released", "Next"]} rows={rows.map((m) => [m.name, m.version, released(m.code), next(m.code)?.version])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search versions" aria-label="Search versions" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Module" }, { h: "Live version" }, { h: "Released" }, { h: "Next" }, { h: "" }]} empty={mods.loading ? "Loading…" : "No modules."}
          rows={rows.map((m) => {
            const n = next(m.code);
            return [<b key="n" className="font-semibold text-slate-900">{m.name}</b>, m.version ?? "—", released(m.code),
              n ? <span key="x" className="flex items-center gap-2">{n.version}<span className="rounded-full bg-[#dceff9] px-2 py-0.5 text-xs font-semibold text-[#026f9b]">{n.status === "planned" ? "Planned" : "Rolling out"}</span></span> : "—",
              <button key="v" type="button" className={small} onClick={() => setView({ code: m.code, name: m.name })}>View details</button>];
          })} />
      </Panel>
      <Modal open={!!view} title={`${view?.name ?? ""} · releases`} onClose={() => setView(null)}>
        <ul className="space-y-3 text-sm">
          {releases.filter((r) => r.module_code === view?.code).map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold text-slate-900">v{r.version} <span className="font-normal text-slate-500">· {r.status.replace("_", " ")}</span></p><p className="mt-1 text-slate-700">{r.notes}</p></li>
          ))}
          {!releases.some((r) => r.module_code === view?.code) && <li className="text-slate-500">No releases recorded.</li>}
        </ul>
        <div className="mt-4 flex justify-end"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div>
      </Modal>
    </div>
  );
}
