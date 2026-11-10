"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type Paged, type SchoolRow } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, small, type RoleRow } from "./shared";

export function Catalogue({ onOpenPermissions }: { onOpenPermissions: () => void }) {
  const [part, setPart] = useState<"default" | "custom">("default");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ roles: RoleRow[] }>("/role-config/roles"), []);
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const act = useAction(reload);

  const [open, setOpen] = useState<"add" | "edit" | "copy" | null>(null);
  const [target, setTarget] = useState<RoleRow | null>(null);
  const blank = { display_name: "", description: "", scope: "school" as "school" | "platform", institution_id: "", data_scope: "school" as "school" | "campus" };
  const [f, setF] = useState(blank);

  const roles = (data?.roles ?? []).filter((r) => (part === "default" ? r.is_system_default : !r.is_system_default));

  const openAdd = () => { setF(blank); setTarget(null); setOpen("add"); };
  const openEdit = (r: RoleRow) => { setF({ display_name: r.display_name, description: r.description ?? "", scope: r.scope, institution_id: r.institution_id ?? "", data_scope: r.data_scope }); setTarget(r); setOpen("edit"); };
  const openCopy = (r: RoleRow) => { setF({ ...blank, display_name: `${r.display_name} (copy)`, description: r.description ?? "", scope: r.scope, data_scope: r.data_scope }); setTarget(r); setOpen("copy"); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(() => {
      if (open === "edit" && target) {
        return adminFetch(`/role-config/roles/${target.id}`, json("PATCH", { ...(target.is_system_default ? {} : { display_name: f.display_name }), description: f.description || null, ...(target.scope === "school" ? { data_scope: f.data_scope } : {}) }));
      }
      return adminFetch("/role-config/roles", json("POST", { display_name: f.display_name, description: f.description || null, scope: f.scope, institution_id: f.institution_id || null, data_scope: f.data_scope, copy_from: open === "copy" ? target?.id : null }));
    });
    if (ok) setOpen(null);
  };

  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["default", "Default roles", data?.roles.filter((r) => r.is_system_default).length], ["custom", "Custom roles", data?.roles.filter((r) => !r.is_system_default).length]]} />
      <Panel
        title={part === "default" ? "Default roles" : "Custom roles"}
        sub={part === "default" ? "Roles every school gets, plus your platform team roles. They cannot be deleted." : "Roles created by your team. Give one to a single school, or to all."}
        right={<button type="button" className={btnPrimary} onClick={openAdd}>+ Add role</button>}
      >
        <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Role</Th><Th>For</Th><Th>Users</Th><Th>Permissions</Th><Th>Restrictions</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!roles.length && <Empty cols={6} loading={loading} text={part === "custom" ? "No custom roles yet. Add one, or copy a default role." : "No roles."} />}
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{r.display_name}</p><p className="max-w-xs text-xs text-slate-400">{r.description}</p></td>
                  <td className="px-4 py-3"><Badge tone={r.scope === "platform" ? "blue" : "gray"}>{r.scope === "platform" ? "Platform team" : r.school_name ?? "Schools"}</Badge></td>
                  <td className="px-4 py-3 tabular-nums">{r.user_count}</td>
                  <td className="px-4 py-3 tabular-nums">{r.name === "SuperAdmin" ? "Everything" : r.permission_count}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r.scope === "school" ? <>{r.data_scope === "campus" ? "Own campus only" : "Whole school"}{r.restricted_modules ? ` · ${r.restricted_modules} modules` : ""}</> : r.denied_pages ? `${r.denied_pages} pages blocked` : "None"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={small} onClick={onOpenPermissions}>Permissions</button>
                      {r.name !== "SuperAdmin" && <button type="button" className={small} onClick={() => openEdit(r)}>Edit</button>}
                      {r.name !== "SuperAdmin" && <button type="button" className={small} onClick={() => openCopy(r)}>Copy</button>}
                      {!r.is_system_default && <button type="button" className={small} disabled={act.busy || r.user_count > 0} title={r.user_count ? "Move its users first" : undefined} onClick={() => window.confirm(`Delete ${r.display_name}?`) && act.run(() => adminFetch(`/role-config/roles/${r.id}`, { method: "DELETE" }))}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={open !== null} title={open === "add" ? "Add role" : open === "copy" ? `Copy ${target?.display_name}` : `Edit ${target?.display_name}`} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="Name" hint={open === "edit" && target?.is_system_default ? "A default role keeps its name." : undefined}>
            <input className={inputCls} required minLength={3} maxLength={100} disabled={open === "edit" && target?.is_system_default} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
          </Field>
          <Field label="Description"><input className={inputCls} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          {open === "add" && (
            <Field label="Who can have it">
              <select className={inputCls} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as "school" | "platform", institution_id: "" })}>
                <option value="school">School staff</option><option value="platform">Your platform team</option>
              </select>
            </Field>
          )}
          {open !== "edit" && f.scope === "school" && (
            <Field label="Available to">
              <select className={inputCls} value={f.institution_id} onChange={(e) => setF({ ...f, institution_id: e.target.value })}>
                <option value="">Every school</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>Only {s.name}</option>)}
              </select>
            </Field>
          )}
          {(open === "edit" ? target?.scope === "school" : f.scope === "school") && (
            <Field label="What they can see" hint="Applied by each module that supports it. The student list uses it today.">
              <select className={inputCls} value={f.data_scope} onChange={(e) => setF({ ...f, data_scope: e.target.value as "school" | "campus" })}>
                <option value="school">Records of the whole school</option><option value="campus">Records of their own campus only</option>
              </select>
            </Field>
          )}
          {open !== "edit" && <p className="text-xs text-slate-400">{open === "copy" ? "The copy starts with the same permissions, module access and restrictions." : "A new role starts with no permissions. Tick them under Permissions."}</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>{open === "edit" ? "Save" : open === "copy" ? "Create copy" : "Create role"}</button></div>
        </form>
      </Modal>
    </>
  );
}
