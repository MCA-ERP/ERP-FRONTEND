"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, qs, type Paged, type Permission, type Role } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, num, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, small, smallPrimary } from "../schools/pages/shared";
import { AREAS } from "./shared";
import menuJson from "../s/menu.json";
import { SCHOOL_PAGES, slug } from "./school-pages";

interface R { id: string; name: string; display_name: string; description: string | null; scope: "platform" | "school"; data_scope: "school" | "campus"; user_count: number; is_system_default: boolean; school_name: string | null }
const useRoles = () => useLoad(() => adminFetch<{ roles: R[] }>("/role-config/roles"), []);
const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const when = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const picker = (label: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
  <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[16rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </label>
);

// ═════════════ Menu permissions ═════════════
export type MenuTab = "modules" | "menus" | "pages";
const MENU: Record<string, string> = { dashboard: "Dashboard", schools: "School Management", subscriptions: "Subscription Management", modules: "Module Management", users: "User Management", roles: "Role & Permissions", payments: "Payment Management", support: "Support Management", reports: "Reports & Analytics", communication: "Communication", cms: "Website / CMS", integrations: "Integration Management", security: "Security & Audit", settings: "System Settings" };

export function MenuPermissions({ tab }: { tab: MenuTab }) {
  return tab === "modules" ? <ModuleMatrix /> : tab === "menus" ? <MenuActions /> : <PageChips />;
}

interface ModAccess { roles: { id: string; name: string; display_name: string }[]; modules: { code: string; name: string; category: string; is_core: boolean }[]; access: Record<string, string[]> }

function ModuleMatrix() {
  const acc = useLoad(() => adminFetch<ModAccess>("/role-config/module-access"), []);
  const roles = useRoles();
  const act = useAction(acc.reload);
  const [edits, setEdits] = useState<Record<string, Set<string>>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => setEdits({}), [acc.data]);
  const school = (roles.data?.roles ?? []).filter((r) => r.scope === "school");
  const cols = (acc.data?.roles ?? []).filter((r) => school.some((s) => s.id === r.id)).sort((a, b) => (a.name === "InstitutionAdmin" ? -1 : b.name === "InstitutionAdmin" ? 1 : 0));
  const mods = acc.data?.modules ?? [];
  const cur = (id: string) => edits[id] ?? new Set(acc.data?.access[id]?.length ? acc.data.access[id] : mods.map((m) => m.code));
  const flip = (id: string, code: string) => { setSaved(false); setEdits((e) => { const n = new Set(e[id] ?? cur(id)); if (n.has(code)) n.delete(code); else n.add(code); return { ...e, [id]: n }; }); };
  const empty = Object.entries(edits).filter(([, s]) => s.size === 0).map(([id]) => cols.find((c) => c.id === id)?.display_name);
  const save = async () => { if (await act.run(async () => { for (const [id, s] of Object.entries(edits)) await adminFetch(`/role-config/module-access/${id}`, json("PUT", { modules: s.size === mods.length ? [] : [...s] })); })) setSaved(true); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={acc.error || roles.error || act.error} />
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">Every school role, including parents and students. Ticks decide which modules each role sees in its portal or app; School Admin always has everything.</p>
      <Panel title="Module access" sub={`School roles × modules · ${cols.length} roles · ${mods.length} modules`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-[#f3f9fd] text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 text-left font-semibold">Module</th>{cols.map((r) => <th key={r.id} className="px-3 py-3 text-center font-semibold">{r.display_name}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {mods.map((m) => (
                <tr key={m.code}>
                  <td className="px-5 py-3"><p className="font-semibold text-slate-900">{m.name}</p><p className="text-xs text-slate-400">{m.category}</p></td>
                  {cols.map((r) => <td key={r.id} className="px-3 py-3 text-center"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" aria-label={`${r.display_name}: ${m.name}`} disabled={r.name === "InstitutionAdmin" || act.busy} checked={r.name === "InstitutionAdmin" || cur(r.id).has(m.code)} onChange={() => flip(r.id, m.code)} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {empty.length > 0 && <p className="text-sm text-amber-700">Tick at least one module for {empty.join(", ")}.</p>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={!Object.keys(edits).length} onClick={() => setEdits({})}>Discard</button>
        <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!Object.keys(edits).length || empty.length > 0 || act.busy} onClick={save}>{act.busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

function MenuActions() {
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);
  const platform = (roles.data?.roles ?? []).filter((r) => r.scope === "platform" && r.name !== "SuperAdmin");
  const [id, setId] = useState("");
  const role = platform.find((r) => r.id === id) ?? platform[0];
  const idBy = new Map((perms.data?.permissions ?? []).map((p) => [p.code, p.id]));
  const [set, setSet] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const act = useAction(roles.reload);
  useEffect(() => { if (role) { setSet(new Set(role.permission_ids)); setSaved(false); } }, [role?.id, roles.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const flip = (pid: string) => { setSaved(false); setSet((s) => { const n = new Set(s); if (n.has(pid)) n.delete(pid); else n.add(pid); return n; }); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={roles.error || perms.error || act.error} />
      {platform.length > 0 && <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{picker("Role", role?.id ?? "", setId, platform.map((r) => [r.id, r.display_name]))}</div>}
      {role && (
        <Panel title={role.display_name} sub="View · Create · Edit · Delete">
          <table className="w-full table-fixed text-sm">
            <thead><tr className="border-y border-slate-100 bg-[#f3f9fd] text-xs uppercase tracking-wide text-slate-500"><th className="w-[40%] px-5 py-3 text-left font-semibold">Menu</th>{["View", "Create", "Edit", "Delete"].map((h) => <th key={h} className="px-3 py-3 text-center font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {AREAS.map((a) => (
                <tr key={a.key}>
                  <td className="px-5 py-3 text-slate-900">{MENU[a.key] ?? a.label}</td>
                  {(["view", "create", "edit", "delete"] as const).map((v) => { const pid = idBy.get(`platform.${a.key}.${v}`); return <td key={v} className="px-3 py-3 text-center"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" aria-label={`${MENU[a.key]} ${v}`} disabled={!pid || act.busy} checked={!!pid && set.has(pid)} onChange={() => pid && flip(pid)} /></td>; })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
            {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setSet(new Set(role.permission_ids)); setSaved(false); }}>Discard</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch(`/roles/${role.id}/permissions`, json("PUT", { permission_ids: [...set] })))) setSaved(true); }}>{act.busy ? "Saving…" : "Save"}</button>
          </div>
        </Panel>
      )}
    </div>
  );
}

interface PageData { denied: Record<string, string[]> }
type MenuJson = Record<string, { label: string; sections: { key: string; label: string; pages: { key: string; title: string }[] }[] }>;
// pages the server already enforces: the group is blocked when every page in it is unticked
const LEGACY: [string, string][] = [
  ["schools/registration/application", "schools.applications"], ["schools/registration/approval", "schools.approval"], ["schools/campus/", "schools.campuses"], ["schools/documents/", "schools.documents"], ["schools/admin/", "schools.admins"],
  ["subscriptions/renewal/", "subscriptions.renewals"], ["subscriptions/discounts/", "subscriptions.discounts"], ["subscriptions/billing/", "subscriptions.billing_rules"],
  ["modules/configuration/", "modules.config"], ["modules/pricing/", "modules.pricing"], ["modules/updates/", "modules.releases"],
  ["users/login/", "users.login_activity"], ["users/students/", "users.student_accounts"], ["users/parents/", "users.parent_accounts"],
];
const legacyOf = (key: string) => LEGACY.find(([p]) => key.startsWith(p))?.[1];

function PageChips() {
  const { data, error, reload } = useLoad(() => adminFetch<PageData>("/role-config/page-access"), []);
  const roles = useRoles();
  const [who, setWho] = useState<"platform" | "school">("platform");
  const [roleId, setRoleId] = useState("");
  const [mod, setMod] = useState("");
  const [smenu, setSmenu] = useState("");
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const list = (roles.data?.roles ?? []).filter((r) => r.scope === who).sort((a, b) => (a.name === "SuperAdmin" ? -1 : b.name === "SuperAdmin" ? 1 : 0));
  const role = list.find((r) => r.id === roleId) ?? list.find((r) => r.name !== "SuperAdmin") ?? list[0];
  const locked = role?.name === "SuperAdmin";
  const mods = Object.entries(menuJson as unknown as MenuJson).filter(([k]) => !["system-settings"].includes(k) || true);
  const cur = mods.find(([k]) => k === mod) ?? mods[0];
  const keysOf = (m: string) => (menuJson as unknown as MenuJson)[m].sections.flatMap((sec) => sec.pages.map((p) => `${m}/${sec.key}/${p.key}`));
  const allKeys = mods.flatMap(([k]) => keysOf(k));
  useEffect(() => {
    const stored = new Set(data?.denied[role?.id ?? ""] ?? []);
    if (who === "school") { setDenied(new Set([...stored].filter((k) => k.startsWith("school/")))); setSaved(false); return; }
    const d = new Set(allKeys.filter((k) => stored.has(k) || (legacyOf(k) && stored.has(legacyOf(k)!))));
    setDenied(d); setSaved(false);
  }, [data, role?.id, who]); // eslint-disable-line react-hooks/exhaustive-deps
  const flip = (key: string) => { setSaved(false); setDenied((x) => { const n = new Set(x); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };
  const save = async () => {
    if (!role) return;
    const out = new Set(denied);
    if (who === "platform") for (const [, legacy] of LEGACY) { const group = allKeys.filter((k) => legacyOf(k) === legacy); if (group.length && group.every((k) => denied.has(k))) out.add(legacy); }
    await act.run(() => adminFetch(`/role-config/page-access/${role.id}`, json("PUT", { denied: [...out] }))).then((ok) => ok && setSaved(true));
  };
  const pill = (on: boolean, text: string, click: () => void) => <button type="button" onClick={click} className={`rounded-full border px-3.5 py-1 text-[13px] font-semibold ${on ? "border-[#026f9b] bg-[#026f9b] text-white" : "border-slate-200 bg-white text-slate-800"}`}>{text}</button>;
  const total = allKeys.length;
  return (
    <div className="space-y-4">
      <ErrorBanner message={error || roles.error || act.error} />
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">Set page access for {pill(who === "platform", "Platform team", () => setWho("platform"))}{pill(who === "school", "School roles", () => setWho("school"))}</div>
      {who === "school" ? (() => {
        const cat = SCHOOL_PAGES[role?.name ?? ""];
        const menus = cat?.menus ?? [];
        const m = menus.find((x) => x.key === smenu) ?? menus[0];
        const count = menus.reduce((n, x) => n + x.sections.reduce((k, y) => k + y.pages.length, 0), 0);
        const lockedRole = role?.name === "InstitutionAdmin";
        return (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
              {picker("Role", role?.id ?? "", (v) => { setRoleId(v); setSmenu(""); }, list.map((r) => [r.id, r.display_name]))}
              {m && picker("Menu", m.key, setSmenu, menus.map((x) => [x.key, x.label]))}
              {cat && <span className="ml-auto text-xs text-slate-500">{cat.portal} · {menus.length} menus · {count} pages</span>}
            </div>
            {!m ? <p className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">The pages of the {role?.display_name ?? "role"} portal are not set up yet. They appear here when that portal is built.</p> : (
              <Panel title={`${m.label} pages for ${role?.display_name ?? ""}`}>
                {m.sections.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500">This menu has no separate pages yet.</p> : (
                  <div className="divide-y divide-slate-100">
                    {m.sections.map((sc) => (
                      <div key={sc.key} className="px-5 py-4">
                        <p className="mb-2.5 text-[13.5px] font-medium text-slate-900">{sc.label}</p>
                        <div className="flex flex-wrap gap-2.5">
                          {sc.pages.map((p) => { const key = `school/${m.key}/${sc.key}/${slug(p)}`; return (
                            <label key={key} className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 ${lockedRole ? "opacity-60" : "cursor-pointer"}`}>
                              <input type="checkbox" className="h-4 w-4 accent-[#026f9b]" disabled={lockedRole} checked={lockedRole || !denied.has(key)} onChange={() => flip(key)} />{p}
                            </label>); })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
                  {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
                  <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={lockedRole} onClick={() => { setSaved(false); reload(); }}>Discard</button>
                  <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={lockedRole || !role || act.busy} onClick={save}>{act.busy ? "Saving…" : "Save page access"}</button>
                </div>
              </Panel>
            )}
          </>
        );
      })()
      : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            {picker("Role", role?.id ?? "", setRoleId, list.map((r) => [r.id, r.display_name]))}
            {cur && picker("Menu", cur[0], setMod, mods.map(([k, v]) => [k, v.label]))}
            <span className="ml-auto text-xs text-slate-500">Platform team · {mods.length} menus · {total} pages</span>
          </div>
          {cur && (
            <Panel title={`${cur[1].label} pages for ${role?.display_name ?? ""}`}>
              <div className="divide-y divide-slate-100">
                {cur[1].sections.map((sec) => (
                  <div key={sec.key} className="px-5 py-4">
                    <p className="mb-2.5 text-[13.5px] font-medium text-slate-900">{sec.label}</p>
                    <div className="flex flex-wrap gap-2.5">
                      {sec.pages.map((p) => { const key = `${cur[0]}/${sec.key}/${p.key}`; return (
                        <label key={key} className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 ${locked ? "opacity-60" : "cursor-pointer"}`}>
                          <input type="checkbox" className="h-4 w-4 accent-[#026f9b]" disabled={locked} checked={locked || !denied.has(key)} onChange={() => flip(key)} />{p.title}
                        </label>); })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
                {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
                <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={locked} onClick={() => { setSaved(false); reload(); }}>Discard</button>
                <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={locked || !role || act.busy} onClick={save}>{act.busy ? "Saving…" : "Save page access"}</button>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════ Data permissions ═════════════
export type DataTab = "own" | "class" | "campus" | "school";
const OWN = ["Parent", "Student"];
const CLASS = ["Faculty", "ClassTeacher"];
const SCOPE_INFO: Record<DataTab, [string, string]> = { own: ["Own records", "Only records about themselves or their own children. For parents and students."], class: ["Assigned class", "Only the classes and subjects they are assigned to."], campus: ["Campus", "Every record on their campus, not other campuses."], school: ["School", "Every record in the school, across all campuses."] };
const scopeOf = (r: R): DataTab => (OWN.includes(r.name) ? "own" : CLASS.includes(r.name) ? "class" : r.data_scope === "campus" ? "campus" : "school");

export function DataPermissions({ tab }: { tab: DataTab }) {
  const { data, error, loading, reload } = useRoles();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const rows = (data?.roles ?? []).filter((r) => r.scope === "school" && scopeOf(r) === tab && has(`${r.display_name} ${r.description ?? ""}`, search));
  const fixed = tab === "own" || tab === "class";
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800"><b>{SCOPE_INFO[tab][0]}:</b> {SCOPE_INFO[tab][1]}</p>
      <Panel title="Roles with this scope" sub={`${rows.length} roles`} right={<ExportPrint name={`${tab}-scope-roles`} head={["Role", "What they do", "Users", "Scope"]} rows={rows.map((r) => [r.display_name, r.description, r.user_count, SCOPE_INFO[tab][0]])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search roles with this scope" aria-label="Search roles" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Role" }, { h: "What they do" }, { h: "Users", right: true }, { h: "Scope" }]} empty={loading ? "Loading…" : "No roles."}
          rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.display_name}</b>, r.description ?? "—", num(r.user_count),
            <select key="s" aria-label={`${r.display_name} scope`} className={`${inputCls} max-w-[11rem]`} value={tab} disabled={fixed || act.busy || r.name === "InstitutionAdmin"} title={fixed ? "Fixed for this kind of role" : undefined}
              onChange={(e) => act.run(() => adminFetch(`/role-config/roles/${r.id}`, json("PATCH", { data_scope: e.target.value })))}>
              {fixed ? <option value={tab}>{SCOPE_INFO[tab][0]}</option> : <><option value="school">School</option><option value="campus">Campus</option></>}
            </select>])} />
      </Panel>
    </div>
  );
}

// ═════════════ Role assignment ═════════════
export type AssignTab = "assign" | "reassign";
interface U { id: string; email: string; first_name: string; last_name: string; institutions: { name: string } | null; roles: { name: string; display_name: string } | null }
interface Chg { id: string; role_id: string | null; role_name: string; change_type: string; summary: string; added: string[]; removed: string[]; actor_name: string | null; created_at: string; roles: { display_name: string } | null }

export function RoleAssignment({ tab }: { tab: AssignTab }) {
  return tab === "assign" ? <Assign /> : <Reassign />;
}

function Assign() {
  const roles = useRoles();
  const people = useLoad(() => adminFetch<Paged<U>>("/user-directory?pageSize=100"), []);
  const recent = useLoad(() => adminFetch<Paged<Chg>>("/role-config/changes?type=assigned&pageSize=20"), []);
  const [personId, setPersonId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<Chg | null>(null);
  const act = useAction(() => { recent.reload(); people.reload(); });
  const list = people.data?.items ?? [];
  const person = list.find((p) => p.id === personId) ?? list[0];
  const allowed = (roles.data?.roles ?? []).filter((r) => r.name !== "SuperAdmin" && (person?.institutions ? r.scope === "school" : r.scope === "platform"));
  const role = allowed.find((r) => r.id === roleId) ?? allowed[0];
  const items = (recent.data?.items ?? []).filter((c) => has(`${c.roles?.display_name ?? c.role_name} ${c.summary}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={roles.error || people.error || recent.error || act.error} />
      <FormCard title="Assign a role" saveLabel="Assign role" busy={act.busy} saved={saved} disabled={!person || !role} onDiscard={() => { setPersonId(""); setRoleId(""); setSaved(false); }}
        onSubmit={async (e) => { e.preventDefault(); if (person && role && (await act.run(() => adminFetch(`/role-config/roles/${role.id}/assign`, json("POST", { user_ids: [person.id] }))))) setSaved(true); }}>
        <Labelled label="Person"><select className={inputCls} value={person?.id ?? ""} onChange={(e) => { setPersonId(e.target.value); setSaved(false); }}>{list.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.institutions?.name ?? "Platform team"}</option>)}</select></Labelled>
        <Labelled label="Role"><select className={`${inputCls} max-w-[16rem]`} value={role?.id ?? ""} onChange={(e) => { setRoleId(e.target.value); setSaved(false); }}>{allowed.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select></Labelled>
      </FormCard>
      <Panel title="Recent assignments" sub={`${items.length} assignments`} right={<ExportPrint name="recent-assignments" head={["Role", "Details", "Date", "Assigned by"]} rows={items.map((c) => [c.roles?.display_name ?? c.role_name, c.summary, when(c.created_at), c.actor_name])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search recent assignments" aria-label="Search recent assignments" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Role" }, { h: "Details" }, { h: "Date" }, { h: "Assigned by" }, { h: "" }]} empty={recent.loading ? "Loading…" : "No assignments yet."}
          rows={items.map((c) => [<Tag key="r">{c.roles?.display_name ?? c.role_name}</Tag>, c.summary, fmtDay(c.created_at.slice(0, 10)), c.actor_name ?? "System", <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title="Assignment" onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p>{view.summary}</p><p><b>Role:</b> {view.roles?.display_name ?? view.role_name}</p><p><b>By:</b> {view.actor_name ?? "System"} · {when(view.created_at)}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

function Reassign() {
  const roles = useRoles();
  const people = useLoad(() => adminFetch<Paged<U>>("/user-directory?pageSize=100&group=teachers"), []);
  const staff = useLoad(() => adminFetch<Paged<U>>("/user-directory?pageSize=100"), []);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});
  const act = useAction(() => { staff.reload(); roles.reload(); });
  void people;
  const school = (roles.data?.roles ?? []).filter((r) => r.scope === "school" && !["Student", "Parent"].includes(r.name));
  const rows = (staff.data?.items ?? []).filter((u) => u.institutions && !["Student", "Parent", "InstitutionAdmin"].includes(u.roles?.name ?? "") && has(`${u.first_name} ${u.last_name} ${u.email}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={roles.error || staff.error || act.error} />
      <Panel title="Staff roles" sub={`${rows.length} people`} right={<ExportPrint name="staff-roles" head={["Person", "School", "Current role"]} rows={rows.map((u) => [`${u.first_name} ${u.last_name}`, u.institutions?.name, u.roles?.display_name])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search staff roles" aria-label="Search staff roles" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Person" }, { h: "School" }, { h: "Current role" }, { h: "New role" }, { h: "" }]} empty={staff.loading ? "Loading…" : "No staff."}
          rows={rows.map((u) => {
            const to = pick[u.id] ?? school.find((r) => r.name === u.roles?.name)?.id ?? "";
            const same = school.find((r) => r.id === to)?.name === u.roles?.name;
            return [<div key="p"><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></div>, u.institutions?.name, <Tag key="c">{u.roles?.display_name}</Tag>,
              <select key="n" aria-label={`New role for ${u.first_name}`} className={`${inputCls} max-w-[12rem]`} value={to} onChange={(e) => setPick({ ...pick, [u.id]: e.target.value })}>{school.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>,
              <button key="a" type="button" className={smallPrimary} disabled={act.busy || same || !to} onClick={() => act.run(() => adminFetch(`/role-config/roles/${to}/assign`, json("POST", { user_ids: [u.id] })))}>Reassign</button>];
          })} />
      </Panel>
    </div>
  );
}

// ═════════════ Permission audit ═════════════
export type AuditTab = "changes" | "history";

function beforeAfter(c: Chg): { what: string; before: string; after: string } {
  if (c.change_type === "created" || c.change_type === "copied") return { what: c.change_type === "copied" ? "Copied role" : "New role", before: "—", after: "Created" };
  if (c.change_type === "deleted") return { what: "Role", before: "Exists", after: "Deleted" };
  if (c.change_type === "data_scope") return { what: "Data scope", before: c.removed[0] ?? "—", after: c.added[0] ?? "—" };
  if (c.added.length) return { what: c.added[0].replace(/^platform\./, "").replace(/\./g, " › ") + (c.added.length > 1 ? ` +${c.added.length - 1} more` : ""), before: "Off", after: "On" };
  if (c.removed.length) return { what: c.removed[0].replace(/^platform\./, "").replace(/\./g, " › ") + (c.removed.length > 1 ? ` +${c.removed.length - 1} more` : ""), before: "On", after: "Off" };
  return { what: c.summary, before: "—", after: "—" };
}

export function PermissionAudit({ tab }: { tab: AuditTab }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Chg>>(`/role-config/changes${qs({ pageSize: 100 })}`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Chg | null>(null);
  const items = (data?.items ?? []).filter((c) => has(`${c.roles?.display_name ?? c.role_name} ${c.summary} ${c.actor_name ?? ""}`, search));
  const name = (c: Chg) => c.roles?.display_name ?? c.role_name;
  const detail = (c: Chg) => (
    <div className="space-y-2 text-sm"><p>{c.summary}</p>{c.added.map((a) => <p key={a} className="text-emerald-700">+ {a}</p>)}{c.removed.map((a) => <p key={a} className="text-rose-700">− {a}</p>)}<p className="text-xs text-slate-500">{c.actor_name ?? "System"} · {when(c.created_at)}</p></div>
  );
  if (tab === "changes") {
    return (
      <div className="space-y-5">
        <ErrorBanner message={error} />
        <Panel title="Permission changes" sub={`${items.length} changes`} right={<ExportPrint name="permission-changes" head={["Time", "Changed by", "Role", "Permission", "Before", "After"]} rows={items.map((c) => [when(c.created_at), c.actor_name, name(c), beforeAfter(c).what, beforeAfter(c).before, beforeAfter(c).after])} />}>
          <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search permission changes" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable head={[{ h: "Time" }, { h: "Changed by" }, { h: "Role" }, { h: "Permission" }, { h: "Before" }, { h: "After" }, { h: "" }]} empty={loading ? "Loading…" : "No changes recorded."}
            rows={items.map((c) => { const b = beforeAfter(c); return [when(c.created_at), c.actor_name ?? "System", <b key="r" className="font-semibold text-slate-900">{name(c)}</b>, b.what, <Tag key="b">{b.before}</Tag>, <Tag key="a">{b.after}</Tag>, <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>]; })} />
        </Panel>
        <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <>{detail(view)}<div className="flex justify-end pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
      </div>
    );
  }
  const all = (data?.items ?? []).filter((c) => c.role_id && c.change_type !== "deleted");
  const ver = (c: Chg) => all.filter((x) => x.role_id === c.role_id && x.created_at <= c.created_at).length;
  const versions = all.filter((c) => has(`${name(c)} ${c.summary}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Role versions" sub={`${versions.length} versions`} right={<ExportPrint name="role-versions" head={["Role", "Version", "Date", "By", "Change"]} rows={versions.map((c) => [name(c), `v${ver(c)}`, c.created_at.slice(0, 10), c.actor_name, c.summary])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search role versions" aria-label="Search role versions" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Role" }, { h: "Version" }, { h: "Date" }, { h: "By" }, { h: "Change" }, { h: "" }]} empty={loading ? "Loading…" : "No versions."}
          rows={versions.map((c) => [<b key="r" className="font-semibold text-slate-900">{name(c)}</b>, `v${ver(c)}`, fmtDay(c.created_at.slice(0, 10)), c.actor_name ?? "System", c.summary,
            <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy || c.role_name === "SuperAdmin"} onClick={() => window.confirm(`Put ${name(c)} back to this version? The current version stays in the history.`) && act.run(() => adminFetch(`/role-config/roles/${c.role_id}/restore`, json("POST", { change_id: c.id })))}>Restore</button><button type="button" className={small} onClick={() => setView(c)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <>{detail(view)}<div className="flex justify-end pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
    </div>
  );
}

export { Chip };
