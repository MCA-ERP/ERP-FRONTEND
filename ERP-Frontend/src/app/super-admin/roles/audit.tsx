"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Pagination, Th, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, small, type RoleRow } from "./shared";

interface Change { id: string; role_id: string | null; role_name: string; change_type: string; summary: string; added: string[]; removed: string[]; actor_name: string | null; created_at: string; roles: { display_name: string } | null }
interface Version { id: string; change_type: string; summary: string; added: string[]; removed: string[]; snapshot: { permissions: string[]; modules: string[]; denied_pages: string[]; data_scope: string }; actor_name: string | null; created_at: string }

const tone: Record<string, "green" | "red" | "blue" | "gray"> = { created: "green", copied: "green", deleted: "red", permissions: "blue", modules: "blue", pages: "blue", data_scope: "blue", assigned: "gray", updated: "gray", restored: "gray" };

export function PermissionAudit() {
  const [part, setPart] = useState<"changes" | "history">("changes");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["changes", "Changes"], ["history", "History"]]} />
      {part === "changes" ? <Changes /> : <History />}
    </>
  );
}

function Changes() {
  const [type, setType] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const roles = useLoad(() => adminFetch<{ roles: RoleRow[] }>("/role-config/roles"), []);
  const { data, error, loading } = useLoad(() => adminFetch<Paged<Change>>(`/role-config/changes${qs({ type, role, page })}`), [type, role, page]);
  return (
    <Panel title="Changes" sub="Every change to roles and permissions: who, what and when.">
      <div className="flex flex-wrap gap-3 p-4">
        <select className={`${inputCls} max-w-[12rem]`} aria-label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option>{roles.data?.roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
        <select className={`${inputCls} max-w-[12rem]`} aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All changes</option><option value="permissions">Permissions</option><option value="modules">Module access</option><option value="pages">Page access</option><option value="data_scope">Data scope</option><option value="assigned">Assignments</option><option value="created">Created</option><option value="deleted">Deleted</option>
        </select>
      </div>
      <ErrorBanner message={error} />
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>When</Th><Th>Role</Th><Th>Change</Th><Th>By</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <Empty cols={4} loading={loading} text="No changes recorded." />}
          {data?.items.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(c.created_at)}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{c.roles?.display_name ?? c.role_name}</td>
              <td className="px-4 py-3">
                <Badge tone={tone[c.change_type] ?? "gray"}>{c.change_type.replace("_", " ")}</Badge> <span className="text-slate-600">{c.summary}</span>
                {(c.added.length > 0 || c.removed.length > 0) && (
                  <p className="mt-1 break-words text-xs">
                    {c.added.map((a) => <span key={a} className="mr-2 text-emerald-700">+ {a}</span>)}
                    {c.removed.map((a) => <span key={a} className="mr-2 text-rose-700">− {a}</span>)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{c.actor_name ?? "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </Panel>
  );
}

function History() {
  const roles = useLoad(() => adminFetch<{ roles: RoleRow[] }>("/role-config/roles"), []);
  const [roleId, setRoleId] = useState("");
  const hist = useLoad(() => (roleId ? adminFetch<{ versions: Version[] }>(`/role-config/roles/${roleId}/history`) : Promise.resolve(null)), [roleId]);
  const act = useAction(hist.reload);
  const [msg, setMsg] = useState("");
  const role = roles.data?.roles.find((r) => r.id === roleId);

  const restore = (v: Version, index: number) => {
    if (!window.confirm(`Put ${role?.display_name} back to how it was on ${fmtDate(v.created_at)}? The current version stays in the history.`)) return;
    setMsg("");
    void act.run(async () => {
      const r = await adminFetch<{ skipped: number }>(`/role-config/roles/${roleId}/restore`, json("POST", { change_id: v.id }));
      setMsg(`Restored.${r.skipped ? ` ${r.skipped} permission(s) no longer exist and were skipped.` : ""}`);
    });
    void index;
  };

  return (
    <Panel title="History" sub="Versions of each role over time. Restore any earlier version.">
      <div className="space-y-4 p-5">
        <ErrorBanner message={roles.error || hist.error || act.error} />
        {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        <select className={`${inputCls} max-w-xs`} aria-label="Role" value={roleId} onChange={(e) => { setRoleId(e.target.value); setMsg(""); }}><option value="">Choose a role</option>{roles.data?.roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select>
        {roleId && (
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {!hist.data?.versions.length && <li className="px-4 py-6 text-center text-sm text-slate-400">{hist.loading ? "Loading…" : "No versions."}</li>}
            {hist.data?.versions.map((v, i) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{i === 0 ? "Current version" : fmtDate(v.created_at)} <span className="font-normal text-slate-500">· {v.snapshot.permissions.length} permissions{v.snapshot.modules.length ? ` · ${v.snapshot.modules.length} modules` : ""}{v.snapshot.denied_pages.length ? ` · ${v.snapshot.denied_pages.length} pages blocked` : ""}</span></p>
                  <p className="text-xs text-slate-500">{v.summary} · {v.actor_name ?? "System"}{i === 0 ? "" : ` · ${fmtDate(v.created_at)}`}</p>
                </div>
                {i > 0 && role?.name !== "SuperAdmin" && <button type="button" className={small} disabled={act.busy} onClick={() => restore(v, i)}>Restore this version</button>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}
