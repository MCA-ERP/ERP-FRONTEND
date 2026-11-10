"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Th, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, type RoleRow } from "./shared";

export function MenuAccess() {
  const [part, setPart] = useState<"modules" | "menus" | "pages">("modules");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["modules", "Module access"], ["menus", "Menu access"], ["pages", "Page access"]]} />
      {part === "modules" && <ModuleAccess />}
      {part === "menus" && (
        <Panel title="Menu access" sub="Pick a platform role and choose what it can do in each menu.">
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <p>The full per-role matrix of menus and actions lives on its own page.</p>
            <Link href="/admin/platform-access" className={`${btnPrimary} inline-block`}>Open Platform access</Link>
          </div>
        </Panel>
      )}
      {part === "pages" && <PageAccess />}
    </>
  );
}

interface ModAccess {
  roles: { id: string; name: string; display_name: string; is_system_default: boolean }[];
  modules: { code: string; name: string; category: string; is_core: boolean }[];
  access: Record<string, string[]>;
}

function ModuleAccess() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<ModAccess>("/role-config/module-access"), []);
  const act = useAction(reload);
  const [roleId, setRoleId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [limited, setLimited] = useState(false);
  const [saved, setSaved] = useState(false);

  const roles = data?.roles.filter((r) => r.name !== "InstitutionAdmin") ?? [];
  useEffect(() => { if (!roleId && roles.length) setRoleId(roles[0].id); }, [roles, roleId]);
  useEffect(() => {
    const cur = data?.access[roleId] ?? [];
    setLimited(cur.length > 0);
    setPicked(new Set(cur));
    setSaved(false);
  }, [data, roleId]);

  const save = async () => { setSaved(false); if (await act.run(() => adminFetch(`/role-config/module-access/${roleId}`, json("PUT", { modules: limited ? [...picked] : [] })))) setSaved(true); };
  const groups = ["Academic", "Administrative", "Communication", "Advanced"];

  return (
    <Panel title="Module access" sub="Which school roles can open each module. A role is limited only if you tick modules for it; otherwise it can open every module its school has.">
      <div className="space-y-4 p-5">
        <ErrorBanner message={error || act.error} />
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${inputCls} max-w-xs`} aria-label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={limited} onChange={(e) => setLimited(e.target.checked)} />Limit this role to chosen modules</label>
        </div>
        {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
        {limited && data && groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</p>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {data.modules.filter((m) => m.category === g).map((m) => (
                <label key={m.code} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={picked.has(m.code)} onChange={() => { setSaved(false); const n = new Set(picked); if (n.has(m.code)) n.delete(m.code); else n.add(m.code); setPicked(n); }} />{m.name}{m.is_core && <Badge tone="blue">Core</Badge>}</label>
              ))}
            </div>
          </div>
        ))}
        {limited && picked.size === 0 && <p className="text-sm text-amber-700">Tick at least one module, or untick the limit to open every module.</p>}
        <div className="flex items-center gap-3"><button type="button" className={btnPrimary} disabled={act.busy || (limited && !picked.size)} onClick={save}>Save</button>{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}</div>
        <p className="text-xs text-slate-400">A module still needs to be in the school&apos;s plan. This only narrows it for the role; it takes effect within a minute.</p>
      </div>
    </Panel>
  );
}

interface PageData { pages: { key: string; area: string; label: string }[]; roles: { id: string; display_name: string }[]; denied: Record<string, string[]> }

function PageAccess() {
  const { data, error, reload } = useLoad(() => adminFetch<PageData>("/role-config/page-access"), []);
  const act = useAction(reload);
  const [roleId, setRoleId] = useState("");
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!roleId && data?.roles.length) setRoleId(data.roles[0].id); }, [data, roleId]);
  useEffect(() => { setDenied(new Set(data?.denied[roleId] ?? [])); setSaved(false); }, [data, roleId]);
  const save = async () => { setSaved(false); if (await act.run(() => adminFetch(`/role-config/page-access/${roleId}`, json("PUT", { denied: [...denied] })))) setSaved(true); };
  const areas = [...new Set(data?.pages.map((p) => p.area))];

  return (
    <Panel title="Page access" sub="Choose which pages inside a menu a role can open. Tick a page to allow it.">
      <div className="space-y-4 p-5">
        <ErrorBanner message={error || act.error} />
        <select className={`${inputCls} max-w-xs`} aria-label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>{data?.roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Menu</Th><Th>Page</Th><Th>Can open</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data && <Empty cols={3} loading text="" />}
            {areas.flatMap((a) => data!.pages.filter((p) => p.area === a).map((p, i) => (
              <tr key={p.key}>
                <td className="px-4 py-2.5 font-semibold capitalize text-slate-700">{i === 0 ? a : ""}</td>
                <td className="px-4 py-2.5">{p.label}</td>
                <td className="px-4 py-2.5"><input type="checkbox" className="size-4 accent-mca-blue" aria-label={p.label} checked={!denied.has(p.key)} onChange={() => { setSaved(false); const n = new Set(denied); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); setDenied(n); }} /></td>
              </tr>
            )))}
          </tbody>
        </table>
        <div className="flex items-center gap-3"><button type="button" className={btnPrimary} disabled={act.busy} onClick={save}>Save</button>{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}</div>
        <p className="text-xs text-slate-400">A role still needs the menu&apos;s permission (see Permissions). Blocked pages answer &quot;Your role cannot open this page&quot;.</p>
      </div>
    </Panel>
  );
}

/** Data scope: what part of a school's records each school role sees. */
export function DataPermissions() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ roles: RoleRow[] }>("/role-config/roles"), []);
  const act = useAction(reload);
  const roles = (data?.roles ?? []).filter((r) => r.scope === "school");
  return (
    <Panel title="Data permissions" sub="How much of a school's records each role sees.">
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Each module applies this as it is built. Today the student list honours &quot;own campus only&quot;; other modules will follow.</p>
      <table className="mt-3 w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Role</Th><Th>Sees</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!roles.length && <Empty cols={2} loading={loading} text="No school roles." />}
          {roles.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{r.display_name}</p><p className="text-xs text-slate-400">{r.school_name ?? "All schools"}</p></td>
              <td className="px-4 py-3">
                <select className={`${inputCls} max-w-xs`} aria-label={`${r.display_name} data scope`} value={r.data_scope} disabled={act.busy || r.name === "InstitutionAdmin"} onChange={(e) => act.run(() => adminFetch(`/role-config/roles/${r.id}`, json("PATCH", { data_scope: e.target.value })))}>
                  <option value="school">The whole school</option><option value="campus">Their own campus only</option>
                </select>
                {r.name === "InstitutionAdmin" && <span className="ml-2 text-xs text-slate-400">Always the whole school</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">&quot;Own campus only&quot; applies to people who have a campus on their account.</p>
    </Panel>
  );
}
