"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type ModuleCatalogue } from "@/lib/admin-api";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, fmtDay, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { Labelled } from "../schools/pages/shared";
import { CATEGORIES, Switch, small } from "./shared";

interface Mod { code: string; name: string; description: string | null; category: string; is_core: boolean; is_enabled: boolean; version: string | null; min_plan: string | null; schools_with_access: number; build_status: string }
interface Detail {
  module: Mod & { show_in_parent_app: boolean; show_in_teacher_app: boolean; offer_as_addon: boolean; addon_price_paise: number };
  requires: { code: string; name: string }[];
  releases: { version: string; status: string; released_at: string | null; created_at: string }[];
  schools: { live: number; with_access: number };
  school_rows: { id: string; name: string; code: string; city: string | null; plan_name: string | null; access: "included" | "addon"; enabled: boolean }[];
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const bullets = (text: string | null) => (text ?? "").replace(/\.$/, "").split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1));

export type CatalogueTab = "all" | "details";

/** Module catalogue: every module with how many schools use it (All modules), or one module in full (Module details). */
export function ModuleCatalogueNew({ tab }: { tab: CatalogueTab }) {
  return tab === "all" ? <AllModules /> : <PickedModule />;
}

function AllModules() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<ModuleCatalogue>("/modules"), []);
  const plans = useLoad(() => adminFetch<{ plans: { id: string; code: string; name: string }[] }>("/plans"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebounced(search);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "modules/catalogue/all") setOpen(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);

  const all = (data?.modules ?? []) as unknown as Mod[];
  const live = data?.liveSchools ?? 0;
  const shown = all.filter((m) => (!group || m.category === group) && (!q || `${m.name} ${m.category}`.toLowerCase().includes(q.toLowerCase())));
  const used = [...all].sort((a, b) => b.schools_with_access - a.schools_with_access);
  const most = used[0];
  const least = [...used].reverse().find((m) => !m.is_core) ?? used[used.length - 1];
  const built = all.filter((m) => m.build_status === "live").length;

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Tiles items={[
        { label: "Modules", value: all.length || "…", sub: `In ${new Set(all.map((m) => m.category)).size} groups` },
        { label: "Most used", value: <span className="text-xl">{most?.name ?? "…"}</span>, sub: most ? `${pct(most.schools_with_access, live)}% of schools` : undefined },
        { label: "Least used", value: <span className="text-xl">{least?.name ?? "…"}</span>, sub: least ? `${pct(least.schools_with_access, live)}%${least.min_plan ? ` · ${least.min_plan}` : ""}` : undefined },
        { label: "Built", value: `${built} of ${all.length}`, sub: "Working for schools today" },
      ]} />
      <Panel title="Modules" sub={`${shown.length} modules`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv("modules", ["Module", "Group", "Included from", "Schools using", "Share", "Version", "Available"], shown.map((m) => [m.name, m.category, m.is_core ? "All plans" : m.min_plan ?? "—", m.schools_with_access, pct(m.schools_with_access, live) + "%", m.version ?? "", m.is_enabled ? "Yes" : "No"]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv("modules", ["Module", "Group", "Included from", "Schools using", "Share", "Version", "Available"], shown.map((m) => [m.name, m.category, m.is_core ? "All plans" : m.min_plan ?? "—", m.schools_with_access, pct(m.schools_with_access, live) + "%", m.version ?? "", m.is_enabled ? "Yes" : "No"])))(); }}>Print</button></span>}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search modules" aria-label="Search modules" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Group" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <SimpleTable
          head={[{ h: "Module" }, { h: "Group" }, { h: "Included from" }, { h: "Schools using" }, { h: "Version" }, { h: "Available" }, { h: "" }]}
          empty={loading ? "Loading…" : "No modules match."}
          rows={shown.map((m) => {
            const p = pct(m.schools_with_access, live);
            return [
              <b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{m.category}</Tag>,
              <span key="i" className="font-semibold text-[#026f9b]">{m.is_core ? "All plans" : m.min_plan ?? "—"}</span>,
              <span key="u" className="flex items-center gap-2"><span className="h-2 w-28 overflow-hidden rounded-full border border-[#c0e4f3] bg-[#f3f9fd]"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: p + "%" }} /></span><span className="text-xs tabular-nums">{p}%</span></span>,
              m.version ?? "—",
              <Switch key="s" checked={m.is_enabled} disabled={m.is_core || act.busy} label={`${m.name} available`} onChange={(v) => act.run(() => adminFetch(`/modules/${m.code}`, json("PATCH", { is_enabled: v })))} />,
              <span key="a" className="flex gap-1.5">
                <Link href={`/super-admin/modules/${m.category.toLowerCase()}?tab=${m.code}`} className={small}>Open</Link>
                <Link href={`/super-admin/modules/catalogue?tab=details&module=${m.code}`} className={small}>View details</Link>
              </span>,
            ];
          })}
        />
      </Panel>
      <AddModule open={open} onClose={() => setOpen(false)} plans={plans.data?.plans ?? []} onDone={reload} />
    </div>
  );
}

function AddModule({ open, onClose, plans, onDone }: { open: boolean; onClose: () => void; plans: { id: string; code: string; name: string }[]; onDone: () => void }) {
  const blank = { name: "", plan: "", category: "Advanced", description: "" };
  const [f, setF] = useState(blank);
  const act = useAction(onDone);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/module-config/modules", json("POST", { name: f.name, description: f.description, category: f.category, plan_code: f.plan || null })))) { setF(blank); onClose(); }
  };
  return (
    <Modal open={open} title="Add module" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <ErrorBanner message={act.error} />
        <div className="grid grid-cols-2 gap-3">
          <Labelled label="Module name"><input className={inputCls} required minLength={2} placeholder="e.g. Canteen" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="Included from plan"><select className={inputCls} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}><option value="">No plan (add-on only)</option>{plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}</select></Labelled>
        </div>
        <Labelled label="Group"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Labelled>
        <Labelled label="What it does"><textarea className={`${inputCls} min-h-[5rem]`} required minLength={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Labelled>
        <p className="text-xs text-slate-500">A new module starts as “not built yet”: it can be listed and sold, but schools find nothing in it until it is built.</p>
        <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Add module</button></div>
      </form>
    </Modal>
  );
}

function PickedModule() {
  const list = useLoad(() => adminFetch<ModuleCatalogue>("/modules"), []);
  const [code, setCode] = useState("");
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("module"); if (c) setCode(c); }, []);
  const mods = (list.data?.modules ?? []) as unknown as Mod[];
  const chosen = mods.find((m) => m.code === code) ?? mods[0];
  return (
    <div className="space-y-5">
      <ErrorBanner message={list.error} />
      {mods.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">
            Module
            <select aria-label="Module" value={chosen?.code ?? ""} onChange={(e) => setCode(e.target.value)} className="max-w-[18rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
              {mods.map((m) => <option key={m.code} value={m.code}>{m.category} · {m.name}</option>)}
            </select>
          </label>
        </div>
      )}
      {chosen && <ModuleBody key={chosen.code} code={chosen.code} />}
    </div>
  );
}

/** One module: how many schools use it, what it does, where it shows, and which schools have it. */
export function ModuleBody({ code }: { code: string }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Detail>(`/module-config/modules/${code}`), [code]);
  const act = useAction(reload);
  const [s, setS] = useState({ is_enabled: true, show_in_parent_app: true, show_in_teacher_app: true, offer_as_addon: false });
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Detail["school_rows"][number] | null>(null);
  const m = data?.module;
  const reset = () => m && setS({ is_enabled: m.is_enabled, show_in_parent_app: m.show_in_parent_app, show_in_teacher_app: m.show_in_teacher_app, offer_as_addon: m.offer_as_addon });
  useEffect(reset, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  const flip = (k: keyof typeof s) => (v: boolean) => { setS((x) => ({ ...x, [k]: v })); setSaved(false); };

  const save = async () => {
    if (!m) return;
    const ok = await act.run(async () => {
      if (s.is_enabled !== m.is_enabled) await adminFetch(`/modules/${code}`, json("PATCH", { is_enabled: s.is_enabled }));
      await adminFetch(`/module-config/modules/${code}`, json("PATCH", { show_in_parent_app: s.show_in_parent_app, show_in_teacher_app: s.show_in_teacher_app, offer_as_addon: s.offer_as_addon }));
    });
    if (ok) setSaved(true);
  };

  if (!m) return <><ErrorBanner message={error} /><p className="py-10 text-center text-sm text-slate-400">{loading ? "Loading…" : "Module not found."}</p></>;
  const rel = data.releases.find((r) => r.status === "live") ?? data.releases[0];
  const q = search.trim().toLowerCase();
  const rows = data.school_rows.filter((r) => !q || `${r.name} ${r.code}`.toLowerCase().includes(q));
  const Row = ({ label, hint, k, disabled }: { label: string; hint?: string; k: keyof typeof s; disabled?: boolean }) => (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-0">
      <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      <Switch checked={s[k]} disabled={disabled || act.busy} label={label} onChange={flip(k)} />
    </div>
  );

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Tiles items={[
        { label: "Schools using", value: `${data.schools.with_access} of ${data.schools.live}`, sub: `${pct(data.schools.with_access, data.schools.live)}% of active schools` },
        { label: "Included from", value: <span className="text-xl">{m.is_core ? "All plans" : m.min_plan ?? "No plan"}</span>, sub: m.offer_as_addon && m.addon_price_paise ? `Add-on: ₹${Math.round(m.addon_price_paise / 100)} / student / yr` : "No add-on charge" },
        { label: "Version", value: <span className="text-xl">{m.version ?? "—"}</span>, sub: rel ? `Released ${fmtDay((rel.released_at ?? rel.created_at).slice(0, 10))}` : m.build_status === "live" ? "Built" : "Not built yet" },
        { label: "Depends on", value: <span className="text-xl">{data.requires.length ? data.requires.map((r) => r.name).join(", ") : "Nothing"}</span>, sub: "Turned on automatically" },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="What it does" sub={`${m.category} module`}>
          <div className="p-5"><p className="text-sm text-slate-800">{m.description}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-800">{bullets(m.description).map((b) => <li key={b}><span className="mr-2 text-[#0a7f5b]">✓</span>{b}</li>)}</ul></div>
        </Panel>
        <Panel title="Settings">
          <Row label="Available to schools" hint="Off hides it from every school" k="is_enabled" disabled={m.is_core} />
          <Row label="Show in the parent app" k="show_in_parent_app" />
          <Row label="Show in the teacher app" k="show_in_teacher_app" />
          <Row label="Offer as an add-on" hint={`For plans below ${m.min_plan ?? "its plan"}`} k="offer_as_addon" />
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
            {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={reset}>Discard</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={save}>{act.busy ? "Saving…" : "Save"}</button>
          </div>
        </Panel>
      </div>
      <Panel title="Schools" sub={`${rows.length} schools`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv(`module-${code}-schools`, ["School", "Code", "Plan", "Access", "Enabled"], rows.map((r) => [r.name, r.code, r.plan_name, r.access === "included" ? "Included" : "Add-on", r.enabled ? "Enabled" : "Disabled"]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv(`module-${code}-schools`, ["School", "Code", "Plan", "Access", "Enabled"], rows.map((r) => [r.name, r.code, r.plan_name, r.access === "included" ? "Included" : "Add-on", r.enabled ? "Enabled" : "Disabled"])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search schools" aria-label="Search schools" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "School" }, { h: "Plan" }, { h: "Access" }, { h: "Enabled" }, { h: "" }]} empty={loading ? "Loading…" : "No schools."}
          rows={rows.map((r) => [
            <div key="s"><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.code}{r.city ? ` · ${r.city}` : ""}</p></div>,
            r.plan_name ?? "—",
            r.access === "included" ? <Chip key="a" tone="good">Included</Chip> : <Tag key="a">Add-on</Tag>,
            r.enabled ? <Chip key="e" tone="good">Enabled</Chip> : <Chip key="e" tone="mute">Disabled</Chip>,
            <span key="b" className="flex gap-1.5">
              <button type="button" className={r.enabled ? small : "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67]"} disabled={act.busy}
                onClick={() => act.run(() => adminFetch(`/schools/${r.id}/modules/${code}`, json("PUT", { enabled: !r.enabled })))}>{r.enabled ? "Disable" : "Enable"}</button>
              <button type="button" className={small} onClick={() => setView(r)}>View details</button>
            </span>,
          ])} />
      </Panel>
      <Modal open={!!view} title={`${view?.name ?? ""} · ${m.name}`} onClose={() => setView(null)}>
        {view && (
          <dl className="space-y-3 text-sm">
            <div className="grid grid-cols-[6rem_1fr] gap-3"><dt className="text-slate-500">School</dt><dd><b className="font-semibold text-slate-900">{view.name}</b><span className="block text-xs text-slate-500">{view.code}{view.city ? ` · ${view.city}` : ""}</span></dd></div>
            <div className="grid grid-cols-[6rem_1fr] gap-3"><dt className="text-slate-500">Plan</dt><dd className="font-semibold text-[#026f9b]">{view.plan_name ?? "—"}</dd></div>
            <div className="grid grid-cols-[6rem_1fr] gap-3"><dt className="text-slate-500">Access</dt><dd>{view.access === "included" ? <Chip tone="good">Included</Chip> : <Tag>Add-on</Tag>}</dd></div>
            <div className="grid grid-cols-[6rem_1fr] gap-3"><dt className="text-slate-500">Enabled</dt><dd>{view.enabled ? <Chip tone="good">Enabled</Chip> : <Chip tone="mute">Disabled</Chip>}</dd></div>
            <div className="flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
