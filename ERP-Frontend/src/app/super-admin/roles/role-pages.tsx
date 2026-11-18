"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type Permission, type Role } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow } from "../schools/pages/shared";
import { AREAS } from "./shared";

// ═════════════ Role creation ═════════════
export type CreationTab = "add" | "edit" | "copy";
interface R { id: string; name: string; display_name: string; description: string | null; is_system_default: boolean; scope: "platform" | "school"; data_scope: "school" | "campus"; institution_id: string | null }
const useRoles = () => useLoad(() => adminFetch<{ roles: R[] }>("/role-config/roles"), []);
const SCOPES = [["school", "School"], ["campus", "Campus"]] as const;

export function RoleCreation({ tab }: { tab: CreationTab }) {
  return tab === "add" ? <AddRole /> : tab === "edit" ? <EditRole /> : <CopyRole />;
}

function AddRole() {
  const blank = { name: "", scope: "school", data_scope: "school", description: "" };
  const [f, setF] = useState(blank);
  const [saved, setSaved] = useState(false);
  const act = useAction(() => undefined);
  const set = (k: keyof typeof blank, v: string) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  return (
    <FormCard title="New role" saveLabel="Create role" busy={act.busy} saved={saved} error={act.error} onDiscard={() => { setF(blank); setSaved(false); }}
      onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch("/role-config/roles", json("POST", { display_name: f.name, description: f.description || null, scope: f.scope, data_scope: f.data_scope })))) { setSaved(true); setF(blank); } }}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Labelled label="Role name"><input className={inputCls} required minLength={3} placeholder="e.g. Exam Coordinator" value={f.name} onChange={(e) => set("name", e.target.value)} /></Labelled>
        <Labelled label="Role for"><select className={inputCls} value={f.scope} onChange={(e) => set("scope", e.target.value)}><option value="school">Schools</option><option value="platform">Platform team</option></select></Labelled>
        <Labelled label="Data scope"><select className={inputCls} value={f.data_scope} onChange={(e) => set("data_scope", e.target.value)}>{SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Labelled>
      </div>
      <Labelled label="Description"><textarea className={`${inputCls} min-h-[6rem]`} value={f.description} onChange={(e) => set("description", e.target.value)} /></Labelled>
    </FormCard>
  );
}

function EditRole() {
  const { data, error, reload } = useRoles();
  const custom = (data?.roles ?? []).filter((r) => !r.is_system_default);
  const [id, setId] = useState("");
  const role = custom.find((r) => r.id === id) ?? custom[0];
  const [f, setF] = useState({ name: "", data_scope: "school", description: "" });
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  useEffect(() => { if (role) { setF({ name: role.display_name, data_scope: role.data_scope, description: role.description ?? "" }); setSaved(false); } }, [role?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {custom.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Role
            <select aria-label="Role" value={role?.id ?? ""} onChange={(e) => setId(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{custom.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
          </label>
        </div>
      )}
      {role ? (
        <FormCard title={`Edit ${role.display_name}`} saveLabel="Save role" busy={act.busy} saved={saved} error={act.error} onDiscard={() => setF({ name: role.display_name, data_scope: role.data_scope, description: role.description ?? "" })}
          onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch(`/role-config/roles/${role.id}`, json("PATCH", { display_name: f.name, description: f.description || null, data_scope: f.data_scope })))) setSaved(true); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Role name"><input className={inputCls} required minLength={3} value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setSaved(false); }} /></Labelled>
            <Labelled label="Data scope"><select className={inputCls} value={f.data_scope} onChange={(e) => { setF({ ...f, data_scope: e.target.value }); setSaved(false); }}>{SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Labelled>
          </div>
          <Labelled label="Description"><textarea className={`${inputCls} min-h-[6rem]`} value={f.description} onChange={(e) => { setF({ ...f, description: e.target.value }); setSaved(false); }} /></Labelled>
        </FormCard>
      ) : <p className="py-10 text-center text-sm text-slate-400">No custom roles yet. Add one first.</p>}
    </div>
  );
}

function CopyRole() {
  const { data, error } = useRoles();
  const schools = useLoad(() => adminFetch<{ items: { id: string; name: string }[] }>("/schools?pageSize=100"), []);
  const roles = (data?.roles ?? []).filter((r) => r.name !== "SuperAdmin");
  const blank = { from: "", name: "", school: "", perms: true, approvals: false, scope: true };
  const [f, setF] = useState(blank);
  const [saved, setSaved] = useState(false);
  const act = useAction(() => undefined);
  const from = roles.find((r) => r.id === f.from) ?? roles[0];
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || schools.error} />
      <FormCard title="Copy a role" saveLabel="Copy role" busy={act.busy} saved={saved} error={act.error} disabled={!from} onDiscard={() => { setF(blank); setSaved(false); }}
        onSubmit={async (e) => {
          e.preventDefault(); if (!from) return;
          if (await act.run(() => adminFetch("/role-config/roles", json("POST", { display_name: f.name, scope: from.scope, copy_from: from.id, institution_id: from.scope === "school" && f.school ? f.school : null, copy_permissions: f.perms, copy_approvals: f.approvals, copy_data_scope: f.scope })))) { setSaved(true); setF(blank); }
        }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Copy from"><select className={inputCls} value={from?.id ?? ""} onChange={(e) => set("from", e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select></Labelled>
          <Labelled label="New role name"><input className={inputCls} required minLength={3} placeholder="e.g. Senior Teacher" value={f.name} onChange={(e) => set("name", e.target.value)} /></Labelled>
          <Labelled label="Create for"><select className={inputCls} disabled={from?.scope === "platform"} value={f.school} onChange={(e) => set("school", e.target.value)}><option value="">All schools</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
        </div>
        <ToggleRow label="Copy permissions" hint="Menus, pages and actions" checked={f.perms} onChange={(v) => set("perms", v)} />
        <ToggleRow label="Copy approval rights" hint="Approval chains this role is part of" checked={f.approvals} onChange={(v) => set("approvals", v)} disabled={!f.perms} />
        <ToggleRow label="Copy data scope" checked={f.scope} onChange={(v) => set("scope", v)} />
      </FormCard>
    </div>
  );
}

// ═════════════ Permission management ═════════════
export type PermTab = "view" | "create" | "edit" | "delete";
const MENU_LABEL: Record<string, string> = {
  dashboard: "Dashboard", schools: "School Management", subscriptions: "Subscription Management", modules: "Module Management", users: "User Management", roles: "Role & Permissions",
  payments: "Payment Management", support: "Support Management", reports: "Reports & Analytics", communication: "Communication", cms: "Website / CMS", integrations: "Integration Management",
  security: "Security & Audit", settings: "System Settings",
};
const VERB: Record<PermTab, [string, string]> = { view: ["View permission", "Which platform roles can view in each menu"], create: ["Create permission", "Which platform roles can create in each menu"], edit: ["Edit permission", "Which platform roles can edit in each menu"], delete: ["Delete permission", "Which platform roles can delete in each menu"] };

export function PermissionPages({ tab }: { tab: PermTab }) {
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);
  const platform = (roles.data?.roles ?? []).filter((r) => r.scope === "platform").sort((a, b) => (a.name === "SuperAdmin" ? -1 : b.name === "SuperAdmin" ? 1 : 0));
  const idByCode = new Map((perms.data?.permissions ?? []).map((p) => [p.code, p.id]));
  const [edits, setEdits] = useState<Record<string, Set<string>>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction(roles.reload);
  useEffect(() => { setEdits({}); }, [roles.data]);
  const current = (r: Role) => edits[r.id] ?? new Set(r.permission_ids);
  const flip = (r: Role, id: string) => { setSaved(false); setEdits((p) => { const n = new Set(p[r.id] ?? r.permission_ids); if (n.has(id)) n.delete(id); else n.add(id); return { ...p, [r.id]: n }; }); };
  const dirty = Object.keys(edits);
  const save = async () => { if (await act.run(async () => { for (const id of dirty) await adminFetch(`/roles/${id}/permissions`, json("PUT", { permission_ids: [...edits[id]] })); })) setSaved(true); };
  return (
    <div className="space-y-4">
      <ErrorBanner message={roles.error || perms.error || act.error} />
      <Panel title={VERB[tab][0]} sub={VERB[tab][1]} right={<ExportPrint name={`${tab}-permissions`} head={["Menu", ...platform.map((r) => r.display_name)]} rows={AREAS.map((a) => [MENU_LABEL[a.key] ?? a.label, ...platform.map((r) => (r.name === "SuperAdmin" || current(r).has(idByCode.get(`platform.${a.key}.${tab}`) ?? "")) ? "Yes" : "No")])} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-[#f3f9fd] text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 text-left font-semibold">Menu</th>{platform.map((r) => <th key={r.id} className="px-3 py-3 text-center font-semibold">{r.display_name}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {AREAS.map((a) => {
                const id = idByCode.get(`platform.${a.key}.${tab}`);
                return (
                  <tr key={a.key}>
                    <td className="px-5 py-3.5 text-slate-900">{MENU_LABEL[a.key] ?? a.label}</td>
                    {platform.map((r) => (
                      <td key={r.id} className="px-3 py-3.5 text-center">
                        <input type="checkbox" className="h-4 w-4 accent-[#026f9b]" aria-label={`${r.display_name}: ${MENU_LABEL[a.key]}`} disabled={r.name === "SuperAdmin" || !id || act.busy}
                          checked={r.name === "SuperAdmin" || (!!id && current(r).has(id))} onChange={() => id && flip(r, id)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="flex items-center justify-end gap-3">
        {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={!dirty.length} onClick={() => { setEdits({}); setSaved(false); }}>Discard</button>
        <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!dirty.length || act.busy} onClick={save}>{act.busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
