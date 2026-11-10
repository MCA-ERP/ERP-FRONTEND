"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { BuildBadge, CATEGORIES, rupees, type BuildStatus } from "../shared";

interface Details {
  module: { code: string; name: string; description: string | null; category: string; build_status: BuildStatus; is_core: boolean; is_enabled: boolean; addon_price_paise: number; version: string | null };
  plans: { code: string; name: string; included: boolean }[];
  requires: { code: string; name: string }[];
  required_by: { code: string; name: string }[];
  flags: { id: string; key: string; name: string; rollout_percent: number; enabled: boolean }[];
  releases: { id: string; version: string; notes: string; status: string; created_at: string }[];
  bundles: { id: string; name: string }[];
  schools: { live: number; with_access: number; list: { id: string; name: string; code: string }[] };
}

export default function ModuleDetailsPage() {
  const { code } = useParams<{ code: string }>();
  const { data, error, loading, reload } = useLoad(() => adminFetch<Details>(`/module-config/modules/${code}`), [code]);
  const act = useAction(reload);
  const m = data?.module;
  const meta = (patch: Record<string, string>) => act.run(() => adminFetch(`/module-config/modules/${code}`, json("PATCH", patch)));

  return (
    <>
      <Link href="/admin/modules" className="mb-2 inline-block text-sm font-semibold text-mca-blue">← All modules</Link>
      <PageHeader title={m?.name ?? "Module"} subtitle={m?.description ?? undefined} action={m && <div className="flex items-center gap-2">{m.is_core && <Badge tone="blue">Core</Badge>}<BuildBadge status={m.build_status} />{!m.is_enabled && <Badge tone="red">Off platform-wide</Badge>}</div>} />
      <ErrorBanner message={error || act.error} />
      {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
      {data && m && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="About this module">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Category</dt>
                <dd><select className={`${inputCls} !py-1`} aria-label="Category" value={m.category} disabled={act.busy} onChange={(e) => meta({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Build status</dt>
                <dd><select className={`${inputCls} !py-1`} aria-label="Build status" value={m.build_status} disabled={act.busy} onChange={(e) => meta({ build_status: e.target.value })}><option value="planned">Not built yet</option><option value="beta">Beta</option><option value="live">Built</option></select></dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Version</dt><dd className="tabular-nums">{m.version ?? "Not released"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Add-on price</dt><dd>{m.addon_price_paise ? rupees(m.addon_price_paise) + " per student / year" : "Free as an add-on"}</dd></div>
              <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-slate-500">Schools using it</dt><dd>{data.schools.with_access} of {data.schools.live} live schools</dd></div>
            </dl>
          </Panel>
          <Panel title="Plans that include it">
            <div className="flex flex-wrap gap-2 p-5">{data.plans.map((p) => <Badge key={p.code} tone={p.included ? "green" : "gray"}>{p.included ? "✓ " : ""}{p.name}</Badge>)}</div>
          </Panel>
          <Panel title="Dependencies">
            <div className="space-y-3 p-5 text-sm">
              <div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Needs</p>{data.requires.length ? <div className="flex flex-wrap gap-2">{data.requires.map((r) => <Link key={r.code} href={`/admin/modules/${r.code}`}><Badge tone="blue">{r.name}</Badge></Link>)}</div> : <p className="text-slate-400">Nothing</p>}</div>
              <div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Needed by</p>{data.required_by.length ? <div className="flex flex-wrap gap-2">{data.required_by.map((r) => <Link key={r.code} href={`/admin/modules/${r.code}`}><Badge tone="gray">{r.name}</Badge></Link>)}</div> : <p className="text-slate-400">No other module</p>}</div>
            </div>
          </Panel>
          <Panel title="Feature flags and bundles">
            <div className="space-y-3 p-5 text-sm">
              {data.flags.length ? data.flags.map((f) => <p key={f.id}><b className="text-slate-900">{f.name}</b> <span className="font-mono text-xs text-slate-400">{f.key}</span> · {f.enabled ? f.rollout_percent + "%" : "off"}</p>) : <p className="text-slate-400">No flags.</p>}
              <p className="text-xs font-semibold uppercase text-slate-500">In bundles</p>
              {data.bundles.length ? <div className="flex flex-wrap gap-2">{data.bundles.map((b) => <Badge key={b.id} tone="blue">{b.name}</Badge>)}</div> : <p className="text-slate-400">None.</p>}
            </div>
          </Panel>
          <Panel title="Releases">
            <ul className="divide-y divide-slate-100">
              {!data.releases.length && <li className="px-5 py-6 text-center text-sm text-slate-400">No releases recorded.</li>}
              {data.releases.map((r) => <li key={r.id} className="px-5 py-3 text-sm"><p className="font-semibold text-slate-900">v{r.version} <span className="font-normal text-slate-500">· {r.status.replace("_", " ")} · {fmtDate(r.created_at)}</span></p><p className="text-slate-600">{r.notes}</p></li>)}
            </ul>
          </Panel>
          <Panel title="Schools with access" sub={data.schools.with_access > 50 ? "First 50 shown" : undefined}>
            <ul className="divide-y divide-slate-100">
              {!data.schools.list.length && <li className="px-5 py-6 text-center text-sm text-slate-400">No live school has it.</li>}
              {data.schools.list.map((s) => <li key={s.id} className="px-5 py-2 text-sm"><Link href={`/admin/schools/${s.id}?tab=plan`} className="font-semibold text-slate-900 hover:text-mca-blue">{s.name}</Link> <span className="text-xs text-slate-400">{s.code}</span></li>)}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
