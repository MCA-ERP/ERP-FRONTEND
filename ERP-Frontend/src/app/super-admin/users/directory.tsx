"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type AdminUser, type Paged, type Role, type SchoolRow } from "@/lib/admin-api";
import { Panel, SimpleTable, TabBar, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
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

const hm = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayWord = (iso: string) => { const d = new Date(iso); const t = new Date(); const y = new Date(Date.now() - 86_400_000); return d.toDateString() === t.toDateString() ? "Today" : d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const lastIn = (iso: string | null | undefined, time: boolean, never: string) => (iso ? `${dayWord(iso)}${time ? ", " + hm(new Date(iso)) : ""}` : never);
const INVITE_ROLES: [string, string][] = [["PlatformManager", "Platform Manager"], ["Finance", "Finance"], ["SupportAgent", "Support Agent"], ["ContentEditor", "Content Editor"]];
const tempPassword = () => { const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = new Uint32Array(12); crypto.getRandomValues(b); return Array.from(b, (n) => c[n % c.length]).join("") + "7!"; };

interface FormState { email: string; password: string; first_name: string; last_name: string; phone: string; role: string; institution_id: string; status: string }
const emptyForm: FormState = { email: "", password: "", first_name: "", last_name: "", phone: "", role: "", institution_id: "", status: "active" };

/**
 * The people list. `fixedGroup` (a role group like "super_admin" or "teachers") and `fixedState` ("active", "inactive", "locked")
 * pin the list to one page of the User Management menu and hide the matching filter.
 */
export function Directory({ fixedGroup, fixedState, layout }: { fixedGroup?: string; fixedState?: string; layout?: "super" | "support" | "admins" } = {}) {
  const [group, setGroup] = useState(fixedGroup ?? "");
  const [state, setState] = useState(fixedState ?? "");
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
  const [invite, setInvite] = useState<{ name: string; email: string; role: string } | null>(null);
  const [inviteResult, setInviteResult] = useState("");
  const settings = useLoad(() => (layout === "support" ? adminFetch<{ settings: Record<string, unknown> }>("/settings") : Promise.resolve(null)), [layout]);
  const primaries = useLoad(() => (layout === "admins" ? adminFetch<{ items: { id: string; is_primary: boolean }[] }>("/school-admins?pageSize=500") : Promise.resolve(null)), [layout]);
  useEffect(() => {
    if (!layout) return;
    const key = layout === "admins" ? "users/school/admins" : layout === "super" ? "users/platform/super" : "users/platform/support";
    const h = (e: Event) => {
      if ((e as CustomEvent).detail !== key) return;
      if (layout === "admins") { setForm({ ...emptyForm, role: "InstitutionAdmin" }); setFormError(""); setEditing("new"); }
      else { setInvite({ name: "", email: "", role: layout === "super" ? "SuperAdmin" : "SupportAgent" }); setInviteResult(""); }
    };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, [layout]);
  const sendInvite = async () => {
    if (!invite) return;
    const [first, ...rest] = invite.name.trim().split(/\s+/);
    const pw = tempPassword();
    const ok = await act.run(() => adminFetch("/users", json("POST", { email: invite.email, password: pw, first_name: first || "", last_name: rest.join(" ") || "-", role: invite.role, institution_id: null })));
    if (ok) setInviteResult(pw);
  };
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
      {layout ? (() => {
        const items = data?.items ?? [];
        const twoFactor = settings.data?.settings["security.require_2fa_staff"] === true;
        const primary = new Map((primaries.data?.items ?? []).map((p) => [p.id, p.is_primary]));
        const status = (u: Row) => (isLocked(u) ? <Chip tone="bad">Locked</Chip> : u.status === "active" ? <Chip tone="good">Active</Chip> : <Chip tone="mute">Inactive</Chip>);
        const person = (u: Row, light: boolean) => <div><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className={light ? "text-xs text-slate-500" : "text-xs text-slate-400"}>{u.email}</p></div>;
        const resetBtn = (u: Row) => <button type="button" className={small} onClick={() => { setReset(u); setResetMode("temporary"); setResetPw(""); setResetResult(""); }}>Reset password</button>;
        const details = (u: Row) => <button type="button" className={small} onClick={() => openEdit(u)}>View details</button>;
        const titles = { super: ["Super Admins", "super-admins", "Search super admins"], support: ["Platform team", "platform-team", "Search platform team"], admins: ["School admins", "school-admins", "Search school admins"] }[layout];
        const head = layout === "super" ? [{ h: "Name" }, { h: "Status" }, { h: "Last sign-in" }, { h: "" }] : layout === "support" ? [{ h: "Name" }, { h: "Role" }, { h: "Two-factor" }, { h: "Status" }, { h: "Last sign-in" }, { h: "" }] : [{ h: "Name" }, { h: "School" }, { h: "Type" }, { h: "Status" }, { h: "Last sign-in" }, { h: "" }];
        const rows = items.map((u) => layout === "super" ? [person(u, true), status(u), lastIn(u.last_login_at, true, "—"), <span key="a" className="flex gap-1.5">{resetBtn(u)}{details(u)}</span>]
          : layout === "support" ? [person(u, true), <Tag key="r">{u.roles?.display_name || "—"}</Tag>, <Chip key="t" tone={twoFactor ? "good" : "mute"}>{twoFactor ? "On" : "Off"}</Chip>, status(u), lastIn(u.last_login_at, true, "—"), <span key="a" className="flex gap-1.5">{resetBtn(u)}{details(u)}</span>]
          : [person(u, false), u.institutions?.name ?? "—", <Tag key="p">{primary.get(u.id) ? "Primary admin" : "Admin"}</Tag>, status(u), lastIn(u.last_login_at, false, "Never"),
              <span key="a" className="flex gap-1.5">{isLocked(u) ? <button type="button" className="rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67]" disabled={act.busy} onClick={() => stateAct(u, "unlock")}>Unlock</button> : resetBtn(u)}{details(u)}</span>]);
        return (
          <Panel title={titles[0]} sub={`${data?.total ?? 0} account${data?.total === 1 ? "" : "s"}`} right={<ExportPrint name={titles[1]} head={head.filter((x) => x.h).map((x) => x.h)} rows={items.map((u) => [`${u.first_name} ${u.last_name}`, ...(layout === "admins" ? [u.institutions?.name, primary.get(u.id) ? "Primary admin" : "Admin"] : layout === "support" ? [u.roles?.display_name, twoFactor ? "On" : "Off"] : []), u.status, lastIn(u.last_login_at, true, "")])} />}>
            <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={titles[2]} aria-label={titles[2]} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
            <SimpleTable head={head} rows={rows} empty={loading ? "Loading…" : "No users found."} />
            {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
          </Panel>
        );
      })() : (
        <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {fixedState === undefined ? (
          <TabBar value={state} onChange={(s) => { setState(s); setPage(1); }} tabs={STATES.map(([k, l]) => [k, l, k === "" ? c?.all : k === "active" ? c?.active : k === "inactive" ? c?.inactive : c?.locked] as [string, string, number | undefined])} />
        ) : <span />}
        <button type="button" className={`${btnPrimary} mb-5`} onClick={openNew}>+ Create user</button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          {fixedGroup === undefined && (
            <select className={`${inputCls} max-w-[13rem]`} aria-label="Who" value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }}>
              {GROUPS.map(([k, l]) => <option key={k} value={k}>{l}{k && c ? ` (${c.groups[k] ?? 0})` : ""}</option>)}
            </select>
          )}
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
        </>
      )}

      <Modal open={!!invite} title="Invite team member" onClose={() => setInvite(null)}>
        {invite && (inviteResult ? (
          <div className="space-y-3">
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">Temporary password: {inviteResult}</p>
            <p className="text-xs text-slate-500">Shown once. Give it to {invite.name} securely; they must change it when they first sign in.</p>
            <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => setInvite(null)}>Done</button></div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void sendInvite(); }}>
            <ErrorBanner message={act.error} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name"><input className={inputCls} required value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /></Field>
              <Field label="Work email"><input type="email" className={inputCls} required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
            </div>
            <Field label="Role">
              {layout === "super" ? <select className={inputCls} disabled value="SuperAdmin"><option value="SuperAdmin">Super Admin</option></select>
                : <select className={inputCls} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{INVITE_ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
            </Field>
            <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setInvite(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Send invite</button></div>
          </form>
        ))}
      </Modal>

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
