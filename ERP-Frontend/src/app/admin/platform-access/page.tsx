"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, json, type Permission, type Role } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, Th, btnPrimary, useLoad } from "@/components/admin/ui";

const AREAS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" }, { key: "schools", label: "School management" }, { key: "subscriptions", label: "Subscriptions & plans" },
  { key: "modules", label: "Module management" }, { key: "users", label: "User management" }, { key: "roles", label: "Roles & permissions" },
  { key: "payments", label: "Payments" }, { key: "support", label: "Support" }, { key: "reports", label: "Reports & analytics" },
  { key: "communication", label: "Communication" }, { key: "cms", label: "Website / CMS" }, { key: "integrations", label: "Integrations" },
  { key: "security", label: "Security & audit" }, { key: "settings", label: "System settings" },
];
const ACTIONS = ["view", "create", "edit", "delete"] as const;
const PLATFORM_ROLES = ["SuperAdmin", "PlatformManager", "Finance", "SupportAgent", "ContentEditor"];

export default function PlatformAccessPage() {
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);

  const staffRoles = roles.data?.roles.filter((r) => PLATFORM_ROLES.includes(r.name)).sort((a, b) => PLATFORM_ROLES.indexOf(a.name) - PLATFORM_ROLES.indexOf(b.name)) ?? [];
  const [roleId, setRoleId] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!roleId && staffRoles.length) setRoleId((staffRoles.find((r) => r.name === "PlatformManager") ?? staffRoles[0]).id);
  }, [staffRoles, roleId]);

  const role = staffRoles.find((r) => r.id === roleId);
  const idByCode = useMemo(() => new Map(perms.data?.permissions.map((p) => [p.code, p.id]) ?? []), [perms.data]);
  const platformIds = useMemo(() => new Set(perms.data?.permissions.filter((p) => p.code.startsWith("platform.")).map((p) => p.id) ?? []), [perms.data]);

  useEffect(() => {
    setChecked(new Set(role?.permission_ids.filter((id) => platformIds.has(id)) ?? []));
    setSaved(false);
  }, [role, platformIds]);

  const locked = role?.name === "SuperAdmin";
  const idFor = (area: string, action: string) => idByCode.get(`platform.${area}.${action}`);
  const original = new Set(role?.permission_ids.filter((id) => platformIds.has(id)) ?? []);
  const dirty = checked.size !== original.size || Array.from(checked).some((id) => !original.has(id));

  const toggle = (area: string, action: string) => {
    const id = idFor(area, action);
    if (!id) return;
    setSaved(false);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        // create / edit / delete only make sense together with view
        const view = idFor(area, "view");
        if (action !== "view" && view) next.add(view);
      }
      if (action === "view") ACTIONS.forEach((a) => a !== "view" && !next.has(id) && next.delete(idFor(area, a)!));
      return next;
    });
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    setSaveError("");
    try {
      // keep whatever non-platform permissions the role already has
      const others = role.permission_ids.filter((id) => !platformIds.has(id));
      await adminFetch(`/roles/${role.id}/permissions`, json("PUT", { permission_ids: [...others, ...Array.from(checked)] }));
      setSaved(true);
      roles.reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Platform access" subtitle="What each platform team role can see and change." />
      <ErrorBanner message={roles.error || perms.error || saveError} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Platform roles">
        {staffRoles.map((r) => (
          <button
            key={r.id} type="button" role="tab" aria-selected={r.id === roleId} onClick={() => setRoleId(r.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${r.id === roleId ? "border-mca-blue bg-mca-blue-sky text-mca-blue-shade" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {r.display_name} <span className="ml-1 text-xs font-normal text-slate-400">{r.user_count}</span>
          </button>
        ))}
      </div>

      <Panel
        title={role?.display_name ?? "Role"}
        sub={role?.description ?? undefined}
        right={
          <div className="flex items-center gap-3">
            {locked && <Badge tone="blue">Full access · fixed</Badge>}
            {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
            <button type="button" className={btnPrimary} disabled={locked || !dirty || saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><Th>Area</Th>{ACTIONS.map((a) => <th key={a} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{a}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {AREAS.map((area) => (
                <tr key={area.key} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{area.label}</td>
                  {ACTIONS.map((a) => {
                    const id = idFor(area.key, a);
                    return (
                      <td key={a} className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox" className="size-4 accent-mca-blue disabled:opacity-60" aria-label={`${area.label}: ${a}`}
                          disabled={locked || !id} checked={locked || (!!id && checked.has(id))} onChange={() => toggle(area.key, a)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-3 text-xs text-slate-400">Create, edit and delete need View. Super Administrators can always do everything, and only they can create other Super Administrators.</p>
    </>
  );
}
