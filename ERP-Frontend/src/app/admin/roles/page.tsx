"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, json, type Permission, type Role } from "@/lib/admin-api";
import { Badge, Card, ErrorBanner, PageHeader, btnPrimary, useLoad } from "@/components/admin/ui";

export default function RolesPage() {
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const perms = useLoad(() => adminFetch<{ permissions: Permission[] }>("/permissions"), []);

  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState("");

  const selected = roles.data?.roles.find((r) => r.id === selectedId);

  useEffect(() => {
    if (!selectedId && roles.data?.roles.length) setSelectedId(roles.data.roles[0].id);
  }, [roles.data, selectedId]);

  useEffect(() => {
    setChecked(new Set(selected?.permission_ids ?? []));
    setSaved(false);
  }, [selected]);

  const grouped = useMemo(() => {
    const m = new Map<string, Permission[]>();
    perms.data?.permissions.forEach((p) => m.set(p.module, [...(m.get(p.module) ?? []), p]));
    return Array.from(m.entries());
  }, [perms.data]);

  const locked = selected?.name === "SuperAdmin";
  const dirty =
    !!selected &&
    (checked.size !== selected.permission_ids.length || selected.permission_ids.some((id) => !checked.has(id)));

  const toggle = (id: string) => {
    setSaved(false);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setActionError("");
    try {
      await adminFetch(`/roles/${selected.id}/permissions`, json("PUT", { permission_ids: Array.from(checked) }));
      setSaved(true);
      roles.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Roles & Permissions" subtitle="Control what each role can do across the ERP." />
      <ErrorBanner message={roles.error || perms.error || actionError} />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card className="self-start p-2">
          <ul>
            {roles.data?.roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-current={r.id === selectedId}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    r.id === selectedId ? "bg-mca-blue-sky text-mca-blue-shade" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{r.display_name}</span>
                  <span className="text-xs text-slate-400">{r.user_count} users</span>
                </button>
              </li>
            ))}
            {roles.loading && !roles.data && <li className="px-3 py-6 text-center text-sm text-slate-400">Loading…</li>}
          </ul>
        </Card>

        <Card>
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg text-slate-900">{selected.display_name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selected.description}</p>
                  {locked && <div className="mt-2"><Badge tone="blue">Full access · fixed</Badge></div>}
                </div>
                <div className="flex items-center gap-3">
                  {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
                  <button type="button" className={btnPrimary} disabled={locked || !dirty || saving} onClick={save}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
              <div className="space-y-6 p-5">
                {grouped.map(([module, list]) => (
                  <fieldset key={module}>
                    <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{module}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((p) => (
                        <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-mca-blue"
                            checked={locked || checked.has(p.id)}
                            disabled={locked}
                            onChange={() => toggle(p.id)}
                          />
                          <span>
                            <span className="block font-mono text-xs font-semibold text-slate-800">{p.code}</span>
                            <span className="text-xs text-slate-500">{p.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {perms.data && grouped.length === 0 && <p className="text-sm text-slate-400">No permissions defined. Run the seed script.</p>}
              </div>
            </>
          ) : (
            <p className="p-10 text-center text-sm text-slate-400">Select a role.</p>
          )}
        </Card>
      </div>
    </>
  );
}
