"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, json, type Permission, type Role } from "@/lib/admin-api";
import { Panel, TabBar } from "@/components/admin/dash";
import { Badge, ErrorBanner, btnPrimary, useLoad } from "@/components/admin/ui";
import { AREAS } from "./shared";

/**
 * A grid of rows (menus or approvals) by roles. Ticking a cell grants that permission to that role.
 * Changes are saved together, one request per role that changed.
 */
function Grid({
  rows, roles, perms, codeFor, reload, locked,
}: {
  rows: { key: string; label: string }[]; roles: Role[]; perms: Permission[];
  codeFor: (rowKey: string) => string; reload: () => void; locked?: (r: Role) => boolean;
}) {
  const idByCode = useMemo(() => new Map(perms.map((p) => [p.code, p.id])), [perms]);
  const [edits, setEdits] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setEdits({}), [roles]);

  const current = (r: Role) => edits[r.id] ?? new Set(r.permission_ids);
  const toggle = (r: Role, permId: string) => {
    setSaved(false);
    setEdits((prev) => {
      const next = new Set(prev[r.id] ?? r.permission_ids);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return { ...prev, [r.id]: next };
    });
  };
  const dirty = Object.keys(edits);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      for (const id of dirty) await adminFetch(`/roles/${id}/permissions`, json("PUT", { permission_ids: [...edits[id]] }));
      setSaved(true);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ErrorBanner message={error} />
      <div className="mb-3 flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
        <button type="button" className={btnPrimary} disabled={!dirty.length || saving} onClick={save}>{saving ? "Saving…" : `Save${dirty.length ? ` (${dirty.length} role${dirty.length === 1 ? "" : "s"})` : ""}`}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr><th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">&nbsp;</th>{roles.map((r) => <th key={r.id} className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600">{r.display_name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const code = codeFor(row.key);
              const id = idByCode.get(code);
              return (
                <tr key={row.key} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.label}</td>
                  {roles.map((r) => (
                    <td key={r.id} className="px-3 py-2.5 text-center">
                      {r.name === "SuperAdmin" ? <span className="text-xs text-slate-400" title="Always allowed">✓</span>
                        : <input type="checkbox" className="size-4 accent-mca-blue" aria-label={`${r.display_name}: ${row.label}`} disabled={!id || saving || locked?.(r)} checked={!!id && current(r).has(id)} onChange={() => id && toggle(r, id)} />}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

const ACTIONS = [["view", "View"], ["create", "Create"], ["edit", "Edit"], ["delete", "Delete"]] as const;
const DESC = {
  view: "Who can see each menu.", create: "Who can add new records in each menu.", edit: "Who can change records in each menu.", delete: "Who can delete records in each menu.",
} as const;

export function PermissionMatrix() {
  const [action, setAction] = useState<(typeof ACTIONS)[number][0]>("view");
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);
  const platform = (roles.data?.roles ?? []).filter((r) => r.scope === "platform");
  return (
    <>
      <TabBar value={action} onChange={setAction} tabs={ACTIONS.map(([k, l]) => [k, l] as [typeof action, string])} />
      <ErrorBanner message={roles.error || perms.error} />
      <Panel title={`${ACTIONS.find(([k]) => k === action)![1]} permissions`} sub={DESC[action] + " Applies to your platform team. School roles are set under Role permissions."}>
        <div className="p-4">
          {perms.data && <Grid key={action} rows={AREAS} roles={platform} perms={perms.data.permissions} codeFor={(area) => `platform.${area}.${action}`} reload={roles.reload} />}
        </div>
      </Panel>
    </>
  );
}

const APPROVALS = [
  { key: "admission", label: "Admission", sub: "Who approves new admissions." },
  { key: "fees", label: "Fees", sub: "Who approves concessions, waivers and write-offs." },
  { key: "payroll", label: "Payroll", sub: "Who approves salary runs and changes." },
  { key: "results", label: "Results", sub: "Who approves exam results before parents see them." },
];

export function Approvals() {
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);
  const school = (roles.data?.roles ?? []).filter((r) => r.scope === "school" && r.name !== "Student" && r.name !== "Parent");
  return (
    <Panel title="Approval permissions" sub="Who may approve each kind of request in a school.">
      <div className="space-y-3 p-4">
        <ErrorBanner message={roles.error || perms.error} />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">These rights are recorded now. The approval screens come with the Admission, Fees, Payroll and Exams modules, which are not built yet.</p>
        <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">{APPROVALS.map((a) => <Badge key={a.key} tone="gray">{a.label}: {a.sub}</Badge>)}</div>
        {perms.data && <Grid rows={APPROVALS.map((a) => ({ key: a.key, label: a.label }))} roles={school} perms={perms.data.permissions} codeFor={(k) => `approvals.${k}`} reload={roles.reload} />}
      </div>
    </Panel>
  );
}
