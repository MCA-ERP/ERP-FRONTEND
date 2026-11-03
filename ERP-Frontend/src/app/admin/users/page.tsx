"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type AdminUser, type SchoolRow, type Paged, type Role } from "@/lib/admin-api";
import {
  Badge, Card, EmptyRow, ErrorBanner, Field, Modal, PageHeader, Pagination, Th,
  btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad,
} from "@/components/admin/ui";

interface FormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  institution_id: string;
  status: string;
}

const emptyForm: FormState = {
  email: "", password: "", first_name: "", last_name: "", phone: "", role: "", institution_id: "", status: "active",
};

const statusTone = { active: "green", suspended: "red", pending: "blue" } as const;

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const { data, error, loading, reload } = useLoad(
    () => adminFetch<Paged<AdminUser>>(`/users${qs({ search: debounced, role, status, page })}`),
    [debounced, role, status, page]
  );
  const roles = useLoad(() => adminFetch<{ roles: Role[] }>("/roles"), []);
  const institutions = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);

  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => {
    setForm({ ...emptyForm, role: roles.data?.roles.find((r) => r.name !== "SuperAdmin")?.name || "" });
    setFormError("");
    setEditing("new");
  };
  const openEdit = (u: AdminUser) => {
    setForm({
      email: u.email, password: "", first_name: u.first_name, last_name: u.last_name, phone: u.phone || "",
      role: u.roles?.name || "", institution_id: u.institution_id || "", status: u.status,
    });
    setFormError("");
    setEditing(u);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing === "new") {
        await adminFetch("/users", json("POST", {
          email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name,
          phone: form.phone || undefined, role: form.role, institution_id: form.institution_id || null,
        }));
      } else if (editing) {
        await adminFetch(`/users/${editing.id}`, json("PATCH", {
          first_name: form.first_name, last_name: form.last_name, phone: form.phone || null,
          role: form.role, status: form.status, institution_id: form.institution_id || null,
        }));
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: AdminUser) => {
    setActionError("");
    try {
      await adminFetch(`/users/${u.id}`, json("PATCH", { status: u.status === "active" ? "suspended" : "active" }));
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Accounts, roles and access across all institutions."
        action={<button type="button" className={btnPrimary} onClick={openNew}>+ Add user</button>}
      />
      <ErrorBanner message={error || actionError} />

      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input
            className={`${inputCls} max-w-xs`} placeholder="Search name or email…" aria-label="Search users"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className={`${inputCls} max-w-[12rem]`} aria-label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {roles.data?.roles.map((r) => <option key={r.id} value={r.name}>{r.display_name}</option>)}
          </select>
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50">
              <tr><Th>User</Th><Th>Role</Th><Th>Institution</Th><Th>Status</Th><Th>Created</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={6} loading={loading} text="No users found." />}
              {data?.items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><Badge tone="blue">{u.roles?.display_name || "—"}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{u.institutions?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[u.status as keyof typeof statusTone] || "gray"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className={`${btnGhost} mr-2 !px-2.5 !py-1`} onClick={() => openEdit(u)}>Edit</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1`} onClick={() => toggleStatus(u)}>
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={editing !== null} title={editing === "new" ? "Add user" : "Edit user"} onClose={() => setEditing(null)}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={formError} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} required value={form.first_name} onChange={set("first_name")} /></Field>
            <Field label="Last name"><input className={inputCls} required value={form.last_name} onChange={set("last_name")} /></Field>
          </div>
          <Field label="Email">
            <input type="email" className={inputCls} required value={form.email} onChange={set("email")} disabled={editing !== "new"} />
          </Field>
          {editing === "new" && (
            <Field label="Temporary password" hint="At least 8 characters. Share it securely; the user can change it later.">
              <input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={form.password} onChange={set("password")} />
            </Field>
          )}
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select className={inputCls} required value={form.role} onChange={set("role")}>
                <option value="" disabled>Select role…</option>
                {roles.data?.roles.map((r) => <option key={r.id} value={r.name}>{r.display_name}</option>)}
              </select>
            </Field>
            <Field label="Institution">
              <select className={inputCls} value={form.institution_id} onChange={set("institution_id")}>
                <option value="">None (platform-level)</option>
                {institutions.data?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
          </div>
          {editing !== "new" && (
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
