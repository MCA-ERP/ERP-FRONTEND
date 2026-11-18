"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, SimpleTable, num, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Labelled, small } from "../schools/pages/shared";

export type RoleTab = "default" | "custom";
interface Role {
  id: string; name: string; display_name: string; description: string | null; is_system_default: boolean; scope: "platform" | "school"; data_scope: "school" | "campus";
  institution_id: string | null; school_name: string | null; user_count: number; permission_count: number; denied_pages: number; based_on: string | null;
}

export function RoleCatalogue({ tab }: { tab: RoleTab }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ roles: Role[]; menus_total: number }>("/role-config/roles"), []);
  const schools = useLoad(() => adminFetch<{ items: { id: string; name: string }[] }>("/schools?pageSize=100"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Role | null>(null);
  const [edit, setEdit] = useState<Role | null>(null);
  const [add, setAdd] = useState(false);
  const blank = { name: "", description: "", scope: "school", school: "", copy: "" };
  const [f, setF] = useState(blank);
  const [ef, setEf] = useState({ name: "", description: "", data_scope: "school" });
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "roles/catalogue") setAdd(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);

  const roles = data?.roles ?? [];
  const total = data?.menus_total ?? 0;
  const q = search.trim().toLowerCase();
  const match = (r: Role) => !q || `${r.display_name} ${r.description ?? ""}`.toLowerCase().includes(q);
  const school = roles.filter((r) => r.is_system_default && r.scope === "school" && match(r));
  const platform = roles.filter((r) => r.is_system_default && r.scope === "platform");
  const custom = roles.filter((r) => !r.is_system_default && match(r));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const copy = roles.find((r) => r.id === f.copy);
    const ok = await act.run(() => adminFetch("/role-config/roles", json("POST", { display_name: f.name, description: f.description || null, scope: copy?.scope ?? f.scope, institution_id: (copy?.scope ?? f.scope) === "school" && f.school ? f.school : null, copy_from: f.copy || null })));
    if (ok) { setAdd(false); setF(blank); }
  };
  const copyRole = (r: Role) => {
    const name = window.prompt(`Name for the copy of ${r.display_name}:`, `${r.display_name} (copy)`);
    if (name?.trim()) void act.run(() => adminFetch("/role-config/roles", json("POST", { display_name: name.trim(), scope: r.scope, copy_from: r.id })));
  };
  const openEdit = (r: Role) => { setEf({ name: r.display_name, description: r.description ?? "", data_scope: r.data_scope }); setEdit(r); };
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (edit && (await act.run(() => adminFetch(`/role-config/roles/${edit.id}`, json("PATCH", { display_name: ef.name, description: ef.description || null, data_scope: ef.data_scope }))))) setEdit(null);
  };
  const searchBox = (label: string) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={search} onChange={(e) => setSearch(e.target.value)} /></div>;
  const scopeLabel = (r: Role) => (r.data_scope === "campus" ? "Campus" : "School");

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error || schools.error} />
      {tab === "default" ? (
        <>
          <Panel title="School roles" sub={`${school.length} roles`} right={<ExportPrint name="school-roles" head={["Role", "What they can do", "Users", "Data scope"]} rows={school.map((r) => [r.display_name, r.description, r.user_count, scopeLabel(r)])} />}>
            {searchBox("Search school roles")}
            <SimpleTable head={[{ h: "Role" }, { h: "What they can do" }, { h: "Users", right: true }, { h: "Data scope" }, { h: "Type" }, { h: "" }]} empty={loading ? "Loading…" : "No roles."}
              rows={school.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.display_name}</b>, r.description ?? "—", num(r.user_count), <Tag key="d">{scopeLabel(r)}</Tag>, <Chip key="t" tone="info">Default</Chip>,
                <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => copyRole(r)}>Copy</button><button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
          </Panel>
          <Panel title="Platform roles" sub={`${platform.length} roles`} right={<ExportPrint name="platform-roles" head={["Role", "Menus with access", "Users"]} rows={platform.map((r) => [r.display_name, `${total - r.denied_pages} of ${total}`, r.user_count])} />}>
            <SimpleTable head={[{ h: "Role" }, { h: "Menus with access", right: true }, { h: "Users", right: true }, { h: "" }]} empty={loading ? "Loading…" : "No roles."}
              rows={platform.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.display_name}</b>, `${total - r.denied_pages} of ${total}`, num(r.user_count), <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
          </Panel>
        </>
      ) : (
        <Panel title="Custom roles" sub={`${custom.length} roles`} right={<ExportPrint name="custom-roles" head={["Role", "Created for", "Based on", "What they can do", "Users"]} rows={custom.map((r) => [r.display_name, r.school_name ?? "Platform", r.based_on, r.description, r.user_count])} />}>
          {searchBox("Search custom roles")}
          <SimpleTable head={[{ h: "Role" }, { h: "Created for" }, { h: "Based on" }, { h: "What they can do" }, { h: "Users", right: true }, { h: "" }]} empty={loading ? "Loading…" : "No custom roles yet."}
            rows={custom.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.display_name}</b>, r.scope === "platform" ? "Platform" : r.school_name ?? "All schools", r.based_on ? <Tag key="b">{r.based_on}</Tag> : "—", r.description ?? "—", num(r.user_count),
              <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => openEdit(r)}>Edit</button><button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
        </Panel>
      )}

      <Modal open={add} title="Add role" onClose={() => setAdd(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label="Role name"><input className={inputCls} required minLength={3} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="What they can do"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Start from"><select className={inputCls} value={f.copy} onChange={(e) => setF({ ...f, copy: e.target.value })}><option value="">Blank</option>{roles.filter((r) => r.name !== "SuperAdmin").map((r) => <option key={r.id} value={r.id}>Copy of {r.display_name}</option>)}</select></Labelled>
            <Labelled label="For"><select className={inputCls} disabled={!!f.copy && roles.find((r) => r.id === f.copy)?.scope === "platform"} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value, scope: "school" })}><option value="">All schools</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
          </div>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setAdd(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Add role</button></div>
        </form>
      </Modal>
      <Modal open={!!edit} title={`Edit ${edit?.display_name ?? ""}`} onClose={() => setEdit(null)}>
        <form onSubmit={saveEdit} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label="Role name"><input className={inputCls} required minLength={3} value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} /></Labelled>
          <Labelled label="What they can do"><input className={inputCls} value={ef.description} onChange={(e) => setEf({ ...ef, description: e.target.value })} /></Labelled>
          <Labelled label="Data scope"><select className={inputCls} value={ef.data_scope} onChange={(e) => setEf({ ...ef, data_scope: e.target.value })}><option value="school">School</option><option value="campus">Campus</option></select></Labelled>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.display_name ?? ""} onClose={() => setView(null)}>
        {view && (
          <dl className="space-y-2 text-sm">
            <p className="text-slate-800">{view.description || "No description."}</p>
            <p><b>Users:</b> {num(view.user_count)}</p>
            <p><b>Permissions:</b> {view.permission_count}</p>
            <p><b>Menus with access:</b> {total - view.denied_pages} of {total}</p>
            {!view.is_system_default && <p><b>Created for:</b> {view.scope === "platform" ? "Platform" : view.school_name ?? "All schools"}</p>}
            <div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
