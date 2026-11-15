"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Th, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { Empty, type RoleRow } from "./shared";

interface U { id: string; email: string; first_name: string; last_name: string; status: string; institutions: { name: string } | null; roles: { name: string; display_name: string } | null }

export function Assignment() {
  const [part, setPart] = useState<"assign" | "reassign">("assign");
  const roles = useLoad(() => adminFetch<{ roles: RoleRow[] }>("/role-config/roles"), []);
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["assign", "Assign users"], ["reassign", "Reassign users"]]} />
      <ErrorBanner message={roles.error} />
      {part === "assign" ? <Assign roles={roles.data?.roles ?? []} done={roles.reload} /> : <Reassign roles={roles.data?.roles ?? []} done={roles.reload} />}
    </>
  );
}

function Assign({ roles, done }: { roles: RoleRow[]; done: () => void }) {
  const [roleId, setRoleId] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const users = useLoad(() => (q.length >= 2 ? adminFetch<Paged<U>>(`/user-directory${qs({ search: q, pageSize: 30 })}`) : Promise.resolve(null)), [q]);
  const act = useAction(() => { users.reload(); done(); });
  const role = roles.find((r) => r.id === roleId);

  const go = async () => {
    setMsg("");
    await act.run(async () => {
      const r = await adminFetch<{ moved: number }>(`/role-config/roles/${roleId}/assign`, json("POST", { user_ids: [...picked] }));
      setMsg(`${r.moved} user${r.moved === 1 ? "" : "s"} now ${r.moved === 1 ? "has" : "have"} the ${role?.display_name} role.`);
      setPicked(new Set());
    });
  };

  return (
    <Panel title="Assign users" sub="Give someone a role. Find them by name or email.">
      <div className="space-y-4 p-5">
        <ErrorBanner message={act.error} />
        {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        <div className="flex flex-wrap gap-3">
          <select className={`${inputCls} max-w-xs`} aria-label="Role to give" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Choose the role to give</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}{r.school_name ? ` (${r.school_name})` : ""}</option>)}
          </select>
          <input className={`${inputCls} max-w-xs`} placeholder="Search people (2+ letters)…" aria-label="Search people" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className={btnPrimary} disabled={act.busy || !roleId || !picked.size} onClick={go}>Assign to {picked.size || ""} {picked.size === 1 ? "person" : "people"}</button>
        </div>
        {role && <p className="text-xs text-slate-500">{role.scope === "platform" ? "Platform roles go to your own team (people with no school)." : "School roles go to people who belong to a school."}</p>}
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th /><Th>Person</Th><Th>School</Th><Th>Current role</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!users.data?.items.length && <Empty cols={4} loading={users.loading} text={q.length < 2 ? "Search to find people." : "No one found."} />}
            {users.data?.items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select ${u.first_name}`} className="size-4 accent-mca-blue" checked={picked.has(u.id)} onChange={() => { const n = new Set(picked); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); setPicked(n); }} /></td>
                <td className="px-4 py-2.5"><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                <td className="px-4 py-2.5 text-slate-600">{u.institutions?.name ?? "Platform"}</td>
                <td className="px-4 py-2.5"><Badge tone="blue">{u.roles?.display_name}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Reassign({ roles, done }: { roles: RoleRow[]; done: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const act = useAction(done);
  const people = useLoad(() => (from ? adminFetch<{ users: U[] }>(`/role-config/roles/${from}/users`) : Promise.resolve(null)), [from]);
  const fromRole = roles.find((r) => r.id === from);
  const toRole = roles.find((r) => r.id === to);

  const go = async () => {
    if (!window.confirm(`Move all ${people.data?.users.length ?? 0} ${fromRole?.display_name} users to ${toRole?.display_name}? Their access changes within a minute.`)) return;
    setMsg("");
    await act.run(async () => {
      const r = await adminFetch<{ moved: number }>(`/role-config/roles/${from}/reassign`, json("POST", { to_role_id: to }));
      setMsg(`Moved ${r.moved} user${r.moved === 1 ? "" : "s"} to ${toRole?.display_name}.`);
      people.reload();
    });
  };

  return (
    <Panel title="Reassign users" sub="Move everyone from one role to another, for example before deleting a custom role.">
      <div className="space-y-4 p-5">
        <ErrorBanner message={act.error} />
        {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${inputCls} max-w-xs`} aria-label="From role" value={from} onChange={(e) => { setFrom(e.target.value); setMsg(""); }}><option value="">Move people from…</option>{roles.filter((r) => r.user_count > 0).map((r) => <option key={r.id} value={r.id}>{r.display_name} ({r.user_count})</option>)}</select>
          <span className="text-slate-400">→</span>
          <select className={`${inputCls} max-w-xs`} aria-label="To role" value={to} onChange={(e) => setTo(e.target.value)}><option value="">…to</option>{roles.filter((r) => r.id !== from && (!fromRole || r.scope === fromRole.scope)).map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
          <button type="button" className={btnPrimary} disabled={act.busy || !from || !to || !people.data?.users.length} onClick={go}>Reassign {people.data?.users.length ?? ""}</button>
        </div>
        {people.data && (
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
            {!people.data.users.length && <li className="px-4 py-4 text-center text-slate-400">Nobody has this role.</li>}
            {people.data.users.map((u) => <li key={u.id} className="flex justify-between px-4 py-2"><span><b className="text-slate-900">{u.first_name} {u.last_name}</b> <span className="text-slate-400">{u.email}</span></span><span className="text-xs text-slate-500">{u.institutions?.name ?? "Platform"}</span></li>)}
          </ul>
        )}
      </div>
    </Panel>
  );
}
