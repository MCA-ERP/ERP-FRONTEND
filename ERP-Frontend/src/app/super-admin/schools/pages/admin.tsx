"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, StatusPill, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small, useSchools } from "./shared";

export type AdminTab = "create" | "assign" | "access";

type Area = "users" | "fees" | "settings" | "reports" | "data_export";
interface AdminRow {
  id: string; name: string; email: string; status: string; designation: string | null; is_primary: boolean; others: number;
  school: { id: string; name: string; code: string; status: never } | null; access: Record<Area, boolean>;
}

const AREAS: [Area, string][] = [["users", "Users"], ["fees", "Fees"], ["settings", "Settings"], ["reports", "Reports"], ["data_export", "Data export"]];
const TYPES = ["Campus admin", "Primary admin", "Accounts admin", "Academic admin"];

const tempPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "7#"; // ends with a number and a symbol, which the password rules may require
};

export function SchoolAdmin({ tab }: { tab: AdminTab }) {
  return tab === "create" ? <CreateAdmin /> : tab === "assign" ? <AssignAdmin /> : <AdminAccess />;
}

function CreateAdmin() {
  const schools = useSchools();
  const list = schools.data?.items ?? [];
  const blank = { school: "", type: TYPES[0], name: "", email: "", phone: "", designation: "", link: true, twofa: true };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ text: string; password?: string } | null>(null);
  const school = list.find((s) => s.id === f.school) ?? list[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!school) return;
    const parts = f.name.trim().split(/\s+/);
    if (parts.length < 2) { setError("Enter the first and last name."); return; }
    setBusy(true); setError(""); setDone(null);
    const password = tempPassword();
    try {
      const res = await adminFetch<{ admin: { id: string } }>(`/schools/${school.id}/admins`, json("POST", {
        first_name: parts[0], last_name: parts.slice(1).join(" "), email: f.email.trim(), phone: f.phone.trim() || undefined, password,
        make_primary: f.type === "Primary admin", designation: f.designation.trim() || (f.type === "Primary admin" ? undefined : f.type), require_2fa: f.twofa,
      }));
      let sent = false;
      if (f.link) {
        try { await adminFetch(`/user-directory/${res.admin.id}/reset-password`, json("POST", { mode: "link" })); sent = true; } catch { /* the temporary password below still works */ }
      }
      setDone({ text: `${f.name} is now an administrator of ${school.name}.${sent ? ` A sign-in link was emailed to ${f.email}.` : ""}`, password: sent ? undefined : password });
      setF({ ...blank, school: f.school });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the administrator.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <FormCard title="New school admin" saveLabel="Create admin" onSubmit={submit} onDiscard={() => setF({ ...blank, school: f.school })} busy={busy} error={error} disabled={!school}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="School"><select className={inputCls} value={school?.id ?? ""} onChange={(e) => setF({ ...f, school: e.target.value })}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
          <Labelled label="Admin type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Labelled>
          <Labelled label="Full name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="Email"><input type="email" className={inputCls} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Labelled>
          <Labelled label="Mobile"><input className={inputCls} placeholder="+91" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Labelled>
          <Labelled label="Designation"><input className={inputCls} placeholder="e.g. Vice principal" value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Labelled>
        </div>
        <ToggleRow label="Email a sign-in link now" hint="They choose their own password from the link" checked={f.link} onChange={(v) => setF({ ...f, link: v })} />
        <ToggleRow label="Require two-factor sign-in" hint="Recommended for admins who handle fees. They get a code on their mobile number, or by email." checked={f.twofa} onChange={(v) => setF({ ...f, twofa: v })} />
      </FormCard>
      {done && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
          <p>{done.text}</p>
          {done.password && <p className="mt-1">Temporary password (shown once, they must change it at first sign-in): <code className="rounded bg-white px-1.5 py-0.5 font-mono">{done.password}</code></p>}
        </div>
      )}
    </div>
  );
}

function AssignAdmin() {
  const schools = useSchools();
  const admins = useLoad(() => adminFetch<{ admins: AdminRow[] }>("/school-admins"), []);
  const act = useAction(admins.reload);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const rows = (schools.data?.items ?? []).filter((s) => !needle || `${s.name} ${s.code}`.toLowerCase().includes(needle));
  const bySchool = (id: string) => (admins.data?.admins ?? []).filter((a) => a.school?.id === id);

  return (
    <div className="space-y-5">
      <ErrorBanner message={schools.error || admins.error || act.error} />
      <Panel title="Primary admins" sub={`${schools.data?.total ?? 0} schools`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv("primary-admins", ["School", "Primary admin", "Other admins"], rows.map((s) => [s.name, bySchool(s.id).find((a) => a.is_primary)?.name ?? "", Math.max(0, bySchool(s.id).length - 1)]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv("primary-admins", ["School", "Primary admin", "Other admins"], rows.map((s) => [s.name, bySchool(s.id).find((a) => a.is_primary)?.name ?? "", Math.max(0, bySchool(s.id).length - 1)])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search primary admins" aria-label="Search primary admins" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "School" }, { h: "Primary admin" }, { h: "Other admins", right: true }, { h: "School status" }, { h: "" }]}
          empty={schools.loading ? "Loading…" : "No schools yet."}
          rows={rows.map((s) => {
            const list = bySchool(s.id);
            const current = list.find((a) => a.is_primary)?.id ?? "";
            const pick = chosen[s.id] ?? current;
            return [
              <div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>,
              list.length
                ? <select key="p" aria-label={`Primary admin of ${s.name}`} className={`${inputCls} !w-auto !py-1`} value={pick} onChange={(e) => setChosen({ ...chosen, [s.id]: e.target.value })}>{list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                : <span key="p" className="text-slate-400">No admin yet</span>,
              Math.max(0, list.length - 1),
              <StatusPill key="st" status={s.status} />,
              <button key="b" type="button" className={small} disabled={act.busy || !pick || pick === current} onClick={() => act.run(() => adminFetch(`/schools/${s.id}/primary-admin`, json("POST", { admin_id: pick })))}>Save</button>,
            ];
          })}
        />
      </Panel>
    </div>
  );
}

function AdminAccess() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ admins: AdminRow[] }>("/school-admins"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const rows = (data?.admins ?? []).filter((a) => !q || `${a.name} ${a.email} ${a.school?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const set = (a: AdminRow, area: Area, value: boolean) => act.run(() => adminFetch(`/school-admins/${a.id}/access`, json("PUT", { [area]: value })));

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Admin access" sub={`${rows.length} admin${rows.length === 1 ? "" : "s"}`}
        right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv("admin-access", ["Admin", "School", "Type", ...AREAS.map(([, l]) => l), "Status"], rows.map((a) => [a.name, a.school?.name, a.is_primary ? "Primary admin" : a.designation ?? "Admin", ...AREAS.map(([k]) => (a.access[k] ? "Yes" : "No")), a.status]))}>Export</button><button type="button" className={small} onClick={() => { armPrint(); (() => downloadCsv("admin-access", ["Admin", "School", "Type", ...AREAS.map(([, l]) => l), "Status"], rows.map((a) => [a.name, a.school?.name, a.is_primary ? "Primary admin" : a.designation ?? "Admin", ...AREAS.map(([k]) => (a.access[k] ? "Yes" : "No")), a.status])))(); }}>Print</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search admin access" aria-label="Search admin access" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "Admin" }, { h: "Type" }, ...AREAS.map(([, l]) => ({ h: l })), { h: "Status" }]}
          empty={loading ? "Loading…" : "No school administrators yet."}
          rows={rows.map((a) => [
            <div key="a"><p className="font-semibold text-slate-900">{a.name}</p><p className="text-xs text-slate-400">{a.school?.name}</p></div>,
            <Tag key="t">{a.is_primary ? "Primary admin" : a.designation ?? "Admin"}</Tag>,
            ...AREAS.map(([k, label]) => (
              <input key={k} type="checkbox" className="h-4 w-4 accent-[#0294ce]" aria-label={`${label} for ${a.name}`} checked={a.access[k]} disabled={act.busy || (a.is_primary && k !== "data_export")} onChange={(e) => set(a, k, e.target.checked)} />
            )),
            a.status === "active" ? <Chip key="s" tone="good">Active</Chip> : <Chip key="s" tone="mute">{a.status}</Chip>,
          ])}
        />
        <p className="px-5 pb-4 pt-2 text-xs text-slate-500">The primary admin can always open everything except data export. Users, Fees, Settings and Reports switch off what a school admin can use in the school portal. Data export is recorded for when exports are added.</p>
      </Panel>
    </div>
  );
}
