"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type AdminUser, type Paged, type Role, type SchoolRow } from "@/lib/admin-api";
import { TabBar, useAction } from "@/components/admin/dash";
import { Badge, Card, EmptyRow, ErrorBanner, Field, Modal, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { small } from "./shared";

type Row = AdminUser & { failed_login_count?: number; locked_until?: string | null; must_change_password?: boolean; last_login_at?: string | null };
interface Counts { groups: Record<string, number>; all: number; active: number; inactive: number; locked: number }

const GROUPS: [string, string][] = [
  ["", "All users"], ["super_admin", "Super Admin"], ["support_staff", "Support staff"], ["school_admin", "School admins"], ["principal", "Principals"],
  ["teachers", "Teachers"], ["accountants", "Accountants"], ["other_staff", "Other staff"],
];
const STATES: [string, string][] = [["", "All"], ["active", "Active"], ["inactive", "Inactive"], ["locked", "Locked"]];
const isLocked = (u: Row) => !!u.locked_until && new Date(u.locked_until).getTime() > Date.now();

interface FormState { email: string; password: string; first_name: string; last_name: string; phone: string; role: string; institution_id: string; status: string }
const emptyForm: FormState = { email: "", password: "", first_name: "", last_name: "", phone: "", role: "", institution_id: "", status: "active" };

export function Directory() {
  const [group, setGroup] = useState("");
  const [state, setState] = useState("");
  const [school, setSchool] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const counts = useLoad(() => adminFetch<Counts>("/user-directory/counts"), []);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Row>>(`/user-directory${qs({ group, state, school, search: q, page })}`), [group, state, school, q, page]);
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const act = useAction(() => { reload(); counts.reload(); });

  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [reset, setReset] = useState<Row | null>(null);
  const [resetMode, setResetMode] = useState<"temporary" | "link">("temporary");
  const [resetPw, setResetPw] = useState("");
  const [resetResult, setResetResult] = useState("");
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setForm({ ...emptyForm, role: roles.data?.roles.find((r) => r.name !== "SuperAdmin")?.name || "", institution_id: school }); setFormError(""); setEditing("new"); };
  const openEdit = (u: Row) => { setForm({ email: u.email, password: "", first_name: u.first_name, last_name: u.last_name, phone: u.phone || "", role: u.roles?.name || "", institution_id: u.institution_id || "", status: u.status }); setFormError(""); setEditing(u); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const ok = await act.run(async () => {
      try {
        if (editing === "new") {
          await adminFetch("/users", json("POST", { email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name, phone: form.phone || undefined, role: form.role, institution_id: form.institution_id || null }));
        } else if (editing) {
          await adminFetch(`/users/${editing.id}`, json("PATCH", { first_name: form.first_name, last_name: form.last_name, phone: form.phone || null, role: form.role, status: form.status, institution_id: form.institution_id || null }));
        }
      } catch (err) { setFormError(err instanceof Error ? err.message : "Save failed."); throw err; }
    });
    if (ok) setEditing(null);
  };

  const doReset = async () => {
    if (!reset) return;
    setResetResult("");
    await act.run(async () => {
      const r = await adminFetch<{ mode: string; temporary_password?: string; sent_to?: string }>(`/user-directory/${reset.id}/reset-password`, json("POST", resetMode === "temporary" ? { mode: "temporary", password: resetPw || undefined } : { mode: "link" }));
      setResetResult(r.mode === "link" ? `A reset link was sent to ${r.sent_to}.` : `Temporary password: ${r.temporary_password}`);
    });
  };
  const stateAct = (u: Row, s: "disable" | "enable" | "unlock") => act.run(() => adminFetch(`/user-directory/${u.id}/state`, json("POST", { state: s })));

  const c = counts.data;
  return (
    <>
      <ErrorBanner message={error || act.error} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabBar value={state} onChange={(s) => { setState(s); setPage(1); }} tabs={STATES.map(([k, l]) => [k, l, k === "" ? c?.all : k === "active" ? c?.active : k === "inactive" ? c?.inactive : c?.locked] as [string, string, number | undefined])} />
        <button type="button" className={`${btnPrimary} mb-5`} onClick={openNew}>+ Create user</button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <select className={`${inputCls} max-w-[13rem]`} aria-label="Who" value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }}>
            {GROUPS.map(([k, l]) => <option key={k} value={k}>{l}{k && c ? ` (${c.groups[k] ?? 0})` : ""}</option>)}
          </select>
          <select className={`${inputCls} max-w-[14rem]`} aria-label="School" value={school} onChange={(e) => { setSchool(e.target.value); setPage(1); }}>
            <option value="">All schools</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className={`${inputCls} max-w-xs`} placeholder="Search name, email or phone…" aria-label="Search users" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>User</Th><Th>Role</Th><Th>School</Th><Th>Status</Th><Th>Last sign-in</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={6} loading={loading} text="No users found." />}
              {data?.items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                  <td className="px-4 py-3"><Badge tone="blue">{u.roles?.display_name || "—"}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{u.institutions?.name || "Platform"}</td>
                  <td className="px-4 py-3">
                    {isLocked(u) ? <Badge tone="red">Locked</Badge> : u.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone={u.status === "pending" ? "blue" : "gray"}>{u.status === "suspended" ? "Turned off" : u.status}</Badge>}
                    {u.must_change_password && <p className="mt-1 text-xs text-amber-700">Has not set own password</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{u.last_login_at ? fmtDate(u.last_login_at) : "Never"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={small} onClick={() => openEdit(u)}>Edit</button>
                      <button type="button" className={small} onClick={() => { setReset(u); setResetMode("temporary"); setResetPw(""); setResetResult(""); }}>Reset password</button>
                      {isLocked(u) && <button type="button" className={small} disabled={act.busy} onClick={() => stateAct(u, "unlock")}>Unlock</button>}
                      {u.status === "active"
                        ? <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Turn off ${u.first_name}'s account? They will be signed out.`) && stateAct(u, "disable")}>Disable</button>
                        : <button type="button" className={small} disabled={act.busy} onClick={() => stateAct(u, "enable")}>Enable</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={editing !== null} title={editing === "new" ? "Create user" : "Edit user"} onClose={() => setEditing(null)}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={formError} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} required value={form.first_name} onChange={set("first_name")} /></Field>
            <Field label="Last name"><input className={inputCls} required value={form.last_name} onChange={set("last_name")} /></Field>
          </div>
          <Field label="Email"><input type="email" className={inputCls} required value={form.email} onChange={set("email")} disabled={editing !== "new"} /></Field>
          {editing === "new" && <Field label="Temporary password" hint="At least 8 characters. Share it securely; they must change it at first sign-in."><input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={form.password} onChange={set("password")} /></Field>}
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><select className={inputCls} required value={form.role} onChange={set("role")}><option value="" disabled>Select role…</option>{roles.data?.roles.map((r) => <option key={r.id} value={r.name}>{r.display_name}</option>)}</select></Field>
            <Field label="School"><select className={inputCls} value={form.institution_id} onChange={set("institution_id")}><option value="">None (platform team)</option>{schools.data?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
          </div>
          {editing !== "new" && <Field label="Status"><select className={inputCls} value={form.status} onChange={set("status")}><option value="active">Active</option><option value="suspended">Turned off</option><option value="pending">Pending</option></select></Field>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setEditing(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>{act.busy ? "Saving…" : "Save"}</button></div>
        </form>
      </Modal>

      <Modal open={!!reset} title={`Reset password: ${reset?.first_name ?? ""} ${reset?.last_name ?? ""}`} onClose={() => setReset(null)}>
        <div className="space-y-3">
          <ErrorBanner message={act.error} />
          {resetResult ? (
            <>
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">{resetResult}</p>
              <p className="text-xs text-slate-500">{resetResult.startsWith("Temporary") ? "Shown once. Give it to the user securely; they must change it when they sign in, and any sessions they had were ended." : ""}</p>
              <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => setReset(null)}>Done</button></div>
            </>
          ) : (
            <>
              <fieldset className="space-y-2 text-sm">
                <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-mca-blue" checked={resetMode === "temporary"} onChange={() => setResetMode("temporary")} /><span><b>Set a temporary password</b><br /><span className="text-slate-500">Works for every account. Leave blank to have one made for you.</span></span></label>
                <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-mca-blue" checked={resetMode === "link"} onChange={() => setResetMode("link")} /><span><b>Email a reset link</b><br /><span className="text-slate-500">Only for people with a real mailbox. Sent by the sign-in service.</span></span></label>
              </fieldset>
              {resetMode === "temporary" && <Field label="Password (optional)"><input type="text" autoComplete="off" className={inputCls} minLength={8} value={resetPw} onChange={(e) => setResetPw(e.target.value)} /></Field>}
              <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setReset(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={doReset}>Reset password</button></div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
