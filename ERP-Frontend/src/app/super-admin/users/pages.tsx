"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type AdminUser, type Paged } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, Pagination, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small } from "../schools/pages/shared";
import { deviceName, reasonLabel } from "./shared";

const hm = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayWord = (iso: string) => { const d = new Date(iso); const y = new Date(Date.now() - 86_400_000); return d.toDateString() === new Date().toDateString() ? "Today" : d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const when = (iso: string | null | undefined, never = "—") => (iso ? `${dayWord(iso)} ${hm(new Date(iso))}` : never);
const has = (text: string, q: string) => !q.trim() || text.toLowerCase().includes(q.trim().toLowerCase());
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Credential({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-mono">{text}</p>
      <p className="mt-1 text-xs">Shown once. Share it securely; the person must choose their own password at the first sign-in.</p>
      <button type="button" className={`${btnPrimary} mt-3 !px-4 !py-1.5 text-[13px]`} onClick={onClose}>I have saved it</button>
    </div>
  );
}
async function sendDetails(profileId: string): Promise<string> {
  const r = await adminFetch<{ mode: string; temporary_password?: string }>(`/user-directory/${profileId}/reset-password`, json("POST", { mode: "temporary" }));
  return `Temporary password: ${r.temporary_password}`;
}

// ═════════════ Student accounts ═════════════
interface Stu {
  id: string; registration_no: string; first_name: string; last_name: string; user_profile_id: string | null; institutions: { name: string } | null;
  user_profiles: { email: string; status: string; last_login_at: string | null; locked_until: string | null } | null;
  student_enrollments: { enrolled_on: string; grades: { name: string } | null; sections: { name: string } | null }[];
}
const className = (s: Stu) => { const e = [...(s.student_enrollments ?? [])].sort((a, b) => b.enrolled_on.localeCompare(a.enrolled_on))[0]; return e ? `${e.grades?.name ?? ""} ${e.sections?.name ?? ""}`.trim() : ""; };

export function StudentLogins() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [cred, setCred] = useState("");
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Stu> & { stats: { students: number; with_login: number; never_signed_in: number } }>(`/student-accounts${qs({ search: q, page })}`), [q, page]);
  const act = useAction(reload);
  const st = data?.stats;
  const status = (s: Stu): [string, "good" | "mute" | "bad"] => (!s.user_profile_id ? ["No login", "mute"] : s.user_profiles?.status === "active" ? ["Active", "good"] : ["Inactive", "mute"]);
  const items = (data?.items ?? []).filter((s) => !state || status(s)[0].toLowerCase().replace(" ", "") === state);
  const make = (s: Stu) => act.run(async () => {
    if (s.user_profile_id) setCred(`${s.first_name} ${s.last_name}: ${await sendDetails(s.user_profile_id)}`);
    else { const r = await adminFetch<{ created: { login_id: string; temporary_password: string }[]; skipped: { reason: string }[] }>("/student-accounts", json("POST", { student_ids: [s.id] })); if (r.created[0]) setCred(`${s.first_name} ${s.last_name} · Login ${r.created[0].login_id} · Temporary password: ${r.created[0].temporary_password}`); else throw new Error(r.skipped[0]?.reason ?? "Could not create the account."); }
  });
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      {cred && <Credential text={cred} onClose={() => setCred("")} />}
      <Tiles items={[
        { label: "Students", value: st ? st.students.toLocaleString("en-IN") : "…", sub: "On the platform" },
        { label: "With app login", value: st ? `${pct(st.with_login, st.students)}%` : "…", sub: "Of students" },
        { label: "Never signed in", value: st ? st.never_signed_in.toLocaleString("en-IN") : "…", sub: "Send login details again" },
      ]} />
      <Panel title="Student accounts" sub={`${data?.total ?? 0} accounts`} right={<ExportPrint name="student-accounts" head={["Student", "School", "Admission no.", "Login ID", "Status", "Last sign-in"]} rows={items.map((s) => [`${s.first_name} ${s.last_name}`, s.institutions?.name, s.registration_no, s.user_profiles?.email.split("@")[0] ?? "", status(s)[0], when(s.user_profiles?.last_login_at, "Never")])} />}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search student accounts" aria-label="Search student accounts" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Status" value={state} onChange={(e) => setState(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="nologin">No login</option></select>
        </div>
        <SimpleTable head={[{ h: "Student" }, { h: "School" }, { h: "Admission no." }, { h: "Login ID" }, { h: "Status" }, { h: "Last sign-in" }, { h: "" }]} empty={loading ? "Loading…" : "No students found."}
          rows={items.map((s) => [
            <div key="n"><p className="font-semibold text-slate-900">{s.first_name} {s.last_name}</p><p className="text-xs text-slate-400">{className(s) || "—"}</p></div>,
            s.institutions?.name ?? "—", s.registration_no, s.user_profiles?.email.split("@")[0] ?? "—",
            <Chip key="st" tone={status(s)[1]}>{status(s)[0]}</Chip>, when(s.user_profiles?.last_login_at, "Never"),
            <button key="a" type="button" className={small} disabled={act.busy} onClick={() => make(s)}>{s.user_profile_id ? "Send login details" : "Create account"}</button>,
          ])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}

// ═════════════ Parent accounts ═════════════
interface Par { id: string; full_name: string; phone: string; user_profile_id: string | null; institutions: { name: string } | null; user_profiles: { status: string; last_login_at: string | null } | null; student_guardians: { students: { first_name: string; last_name: string } | null }[] }

export function ParentLogins() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cred, setCred] = useState("");
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Par> & { stats: { parents: number; with_login: number } }>(`/parent-accounts${qs({ search: q, page })}`), [q, page]);
  const act = useAction(reload);
  const st = data?.stats;
  const masked = (p: string) => { const d = p.replace(/\D/g, "").slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 2)}••• ••${d.slice(-2)}` : p; };
  const make = (p: Par) => act.run(async () => {
    if (p.user_profile_id) setCred(`${p.full_name}: ${await sendDetails(p.user_profile_id)}`);
    else { const r = await adminFetch<{ login_id: string; temporary_password: string }>("/parent-accounts", json("POST", { guardian_id: p.id })); setCred(`${p.full_name} · Login ${r.login_id} · Temporary password: ${r.temporary_password}`); }
  });
  const items = data?.items ?? [];
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      {cred && <Credential text={cred} onClose={() => setCred("")} />}
      <Tiles items={[
        { label: "Parent accounts", value: st ? st.parents.toLocaleString("en-IN") : "…", sub: "Linked to students" },
        { label: "With login", value: st ? `${pct(st.with_login, st.parents)}%` : "…", sub: "Of parents" },
        { label: "Without login", value: st ? (st.parents - st.with_login).toLocaleString("en-IN") : "…", sub: "Create their account" },
      ]} />
      <Panel title="Parent accounts" sub={`${data?.total ?? 0} accounts`} right={<ExportPrint name="parent-accounts" head={["Parent", "School", "Mobile", "Status", "Last sign-in"]} rows={items.map((p) => [p.full_name, p.institutions?.name, masked(p.phone), p.user_profile_id ? (p.user_profiles?.status === "active" ? "Active" : "Inactive") : "No login", when(p.user_profiles?.last_login_at, "—")])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search parent accounts" aria-label="Search parent accounts" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <SimpleTable head={[{ h: "Parent" }, { h: "School" }, { h: "Mobile" }, { h: "Status" }, { h: "Last sign-in" }, { h: "" }]} empty={loading ? "Loading…" : "No guardians found. Guardians are added when students are enrolled."}
          rows={items.map((p) => [
            <div key="n"><p className="font-semibold text-slate-900">{p.full_name}</p><p className="text-xs text-slate-400">{p.student_guardians.map((s) => s.students && `${s.students.first_name} ${s.students.last_name}`).filter(Boolean).join(", ") || "—"}</p></div>,
            p.institutions?.name ?? "—", masked(p.phone),
            !p.user_profile_id ? <Chip key="s" tone="mute">No login</Chip> : p.user_profiles?.status === "active" ? <Chip key="s" tone="good">Active</Chip> : <Chip key="s" tone="mute">Inactive</Chip>,
            when(p.user_profiles?.last_login_at, "—"),
            <button key="a" type="button" className={small} disabled={act.busy} onClick={() => make(p)}>{p.user_profile_id ? "Send login details" : "Create account"}</button>,
          ])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}

// ═════════════ Account management ═════════════
export type AccountTab = "create" | "edit" | "reset" | "disable";
type U = AdminUser & { locked_until?: string | null; last_login_at?: string | null };
const TYPES: { key: string; label: string; roles: string[]; platform: boolean }[] = [
  { key: "school_admin", label: "School admin", roles: ["InstitutionAdmin"], platform: false },
  { key: "principal", label: "Principal", roles: ["Principal"], platform: false },
  { key: "teacher", label: "Teacher", roles: ["Faculty"], platform: false },
  { key: "accountant", label: "Accountant", roles: ["Accountant"], platform: false },
  { key: "other", label: "Other staff", roles: ["Registrar", "HR", "Librarian"], platform: false },
  { key: "support", label: "Support staff", roles: ["PlatformManager", "Finance", "SupportAgent", "ContentEditor"], platform: true },
];
const typeOfUser = (u: U) => { const n = u.roles?.name ?? ""; return n === "SuperAdmin" ? "Super Admin" : !u.institution_id ? "Support staff" : n === "InstitutionAdmin" ? "School admin" : n === "Principal" ? "Principal" : n === "Faculty" ? "Teacher" : u.roles?.display_name ?? "—"; };
const gen = () => { const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = new Uint32Array(12); crypto.getRandomValues(b); return Array.from(b, (n) => c[n % c.length]).join("") + "7!"; };

export function AccountManagement({ tab }: { tab: AccountTab }) {
  return tab === "create" ? <CreateAccount /> : tab === "edit" ? <EditAccount /> : tab === "reset" ? <ResetPassword /> : <DisableAccounts />;
}

function CreateAccount() {
  const schools = useLoad(() => adminFetch<Paged<{ id: string; name: string }>>("/schools?pageSize=100"), []);
  const roles = useLoad(() => adminFetch<{ roles: { name: string; display_name: string }[] }>("/roles"), []);
  const blank = { type: "teacher", school: "", name: "", email: "", mobile: "", role: "Faculty", send: true, change: true };
  const [f, setF] = useState(blank);
  const [cred, setCred] = useState("");
  const act = useAction(() => undefined);
  const type = TYPES.find((t) => t.key === f.type) ?? TYPES[2];
  const school = f.school || schools.data?.items[0]?.id || "";
  const set = (k: keyof typeof blank, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const pickType = (k: string) => { const t = TYPES.find((x) => x.key === k) ?? TYPES[2]; setF((x) => ({ ...x, type: k, role: t.roles[0] })); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const pw = gen();
    const [first, ...rest] = f.name.trim().split(/\s+/);
    const ok = await act.run(async () => {
      const r = await adminFetch<{ emailed: boolean; email_error: string | null }>("/users", json("POST", { email: f.email, password: pw, first_name: first || "", last_name: rest.join(" ") || "-", phone: f.mobile.replace(/\D/g, "").slice(-10) || undefined, role: f.role, institution_id: type.platform ? null : school, must_change_password: f.change, send_details: f.send }));
      setCred(`${f.name} · Temporary password: ${pw}${f.send ? (r.emailed ? " · Sign-in details emailed." : ` · Not emailed${r.email_error ? ` (${r.email_error})` : ""}.`) : ""}`);
    });
    if (ok) setF(blank);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={schools.error || roles.error} />
      {cred && <Credential text={cred} onClose={() => setCred("")} />}
      <FormCard title="New account" saveLabel="Create" busy={act.busy} error={act.error} onDiscard={() => setF(blank)} onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="Account type"><select className={inputCls} value={f.type} onChange={(e) => pickType(e.target.value)}>{TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Labelled>
          <Labelled label="School"><select className={inputCls} disabled={type.platform} value={type.platform ? "" : school} onChange={(e) => set("school", e.target.value)}>{type.platform ? <option value="">Platform team</option> : schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
          <Labelled label="Full name"><input className={inputCls} required value={f.name} onChange={(e) => set("name", e.target.value)} /></Labelled>
          <Labelled label="Email or login ID"><input type="email" className={inputCls} required value={f.email} onChange={(e) => set("email", e.target.value)} /></Labelled>
          <Labelled label="Mobile"><input className={inputCls} placeholder="+91" value={f.mobile} onChange={(e) => set("mobile", e.target.value)} /></Labelled>
        </div>
        <Labelled label="Role"><select className={`${inputCls} max-w-[16rem]`} value={f.role} onChange={(e) => set("role", e.target.value)}>{type.roles.map((r) => <option key={r} value={r}>{roles.data?.roles.find((x) => x.name === r)?.display_name ?? r}</option>)}</select></Labelled>
        <ToggleRow label="Send sign-in details now" hint="By email, or SMS for parents and students" checked={f.send} onChange={(v) => set("send", v)} />
        <ToggleRow label="Ask to change password at first sign-in" checked={f.change} onChange={(v) => set("change", v)} />
      </FormCard>
    </div>
  );
}

function usePicker() {
  const users = useLoad(() => adminFetch<Paged<U>>("/user-directory?pageSize=100"), []);
  return users;
}
const UserSelect = ({ users, value, onChange, label }: { users: U[]; value: string; onChange: (v: string) => void; label: string }) => (
  <select aria-label={label} className={`${inputCls} max-w-xl`} value={value} onChange={(e) => onChange(e.target.value)}>
    {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} · {typeOfUser(u)}{u.institutions ? ` · ${u.institutions.name}` : " · Platform team"}</option>)}
  </select>
);

function EditAccount() {
  const users = usePicker();
  const list = users.data?.items ?? [];
  const [id, setId] = useState("");
  const u = list.find((x) => x.id === id) ?? list[0];
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [saved, setSaved] = useState(false);
  const act = useAction(users.reload);
  useEffect(() => { if (u) { setName(`${u.first_name} ${u.last_name}`.trim()); setStatus(u.status); setSaved(false); } }, [u?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <ErrorBanner message={users.error} />
      {list.length > 0 && <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><span className="rounded-full border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-1 text-[13px] text-[#026f9b]">Account</span><UserSelect users={list} value={u?.id ?? ""} onChange={setId} label="Account" /></div>}
      {u && (
        <FormCard title={`Edit ${u.first_name} ${u.last_name}`} saveLabel="Save account" busy={act.busy} saved={saved} error={act.error} onDiscard={() => { setName(`${u.first_name} ${u.last_name}`.trim()); setStatus(u.status); }}
          onSubmit={async (e) => { e.preventDefault(); const [first, ...rest] = name.trim().split(/\s+/); if (await act.run(() => adminFetch(`/users/${u.id}`, json("PATCH", { first_name: first, last_name: rest.join(" ") || "-", status })))) setSaved(true); }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Labelled label="Full name"><input className={inputCls} required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></Labelled>
            <Labelled label="Email or login ID"><input className={inputCls} value={u.email} disabled readOnly /></Labelled>
            <Labelled label="Account type"><input className={inputCls} value={typeOfUser(u)} disabled readOnly /></Labelled>
            <Labelled label="School"><input className={inputCls} value={u.institutions?.name ?? "Platform team"} disabled readOnly /></Labelled>
            <Labelled label="Status"><select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setSaved(false); }}><option value="active">Active</option><option value="suspended">Turned off</option></select></Labelled>
          </div>
        </FormCard>
      )}
    </div>
  );
}

function ResetPassword() {
  const users = usePicker();
  const list = users.data?.items ?? [];
  const [id, setId] = useState("");
  const [how, setHow] = useState<"link" | "temporary">("link");
  const [out, setOut] = useState(true);
  const [unlock, setUnlock] = useState(true);
  const [cred, setCred] = useState("");
  const [done, setDone] = useState("");
  const act = useAction(users.reload);
  const u = list.find((x) => x.id === id) ?? list[0];
  return (
    <div className="space-y-5">
      <ErrorBanner message={users.error} />
      {cred && <Credential text={cred} onClose={() => setCred("")} />}
      <FormCard title="Reset password" saveLabel="Reset password" busy={act.busy} saved={!!done} error={act.error} disabled={!u} onDiscard={() => { setHow("link"); setOut(true); setUnlock(true); setDone(""); }}
        onSubmit={async (e) => {
          e.preventDefault(); if (!u) return; setDone("");
          await act.run(async () => {
            const r = await adminFetch<{ mode: string; temporary_password?: string; sent_to?: string }>(`/user-directory/${u.id}/reset-password`, json("POST", { mode: how, end_sessions: out, unlock }));
            if (r.mode === "temporary") setCred(`${u.first_name} ${u.last_name} · Temporary password: ${r.temporary_password}`); else setDone(`Reset link sent to ${r.sent_to}`);
          });
        }}>
        <Labelled label="Account"><UserSelect users={list} value={u?.id ?? ""} onChange={setId} label="Account" /></Labelled>
        <Labelled label="How"><select className={`${inputCls} max-w-[16rem]`} value={how} onChange={(e) => setHow(e.target.value as "link" | "temporary")}><option value="link">Email a reset link</option><option value="temporary">Set a temporary password</option></select></Labelled>
        <ToggleRow label="Sign out of all devices" hint="Ends every open session for this account" checked={out} onChange={setOut} />
        <ToggleRow label="Unlock the account too" hint="If it was locked after wrong passwords" checked={unlock} onChange={setUnlock} />
      </FormCard>
      {done && <p role="status" className="text-sm font-semibold text-emerald-700">{done}</p>}
    </div>
  );
}

function DisableAccounts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<U | null>(null);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<U>>(`/user-directory${qs({ state: "active", search: q, page })}`), [q, page]);
  const act = useAction(reload);
  const items = data?.items ?? [];
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Active accounts" sub={`${data?.total ?? 0} accounts`} right={<ExportPrint name="active-accounts" head={["Name", "Type", "School", "Last sign-in"]} rows={items.map((u) => [`${u.first_name} ${u.last_name}`, typeOfUser(u), u.institutions?.name ?? "Platform team", when(u.last_login_at)])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search active accounts" aria-label="Search active accounts" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <SimpleTable head={[{ h: "Name" }, { h: "Type" }, { h: "School" }, { h: "Last sign-in" }, { h: "" }]} empty={loading ? "Loading…" : "No active accounts."}
          rows={items.map((u) => [
            <div key="n"><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></div>,
            <Tag key="t">{typeOfUser(u)}</Tag>, u.institutions?.name ?? "Platform team", when(u.last_login_at),
            <span key="a" className="flex items-center gap-1.5">
              {u.roles?.name === "SuperAdmin" ? <span className="px-2 text-xs text-slate-500">Protected</span> : <button type="button" className="rounded-full border border-[#f2b8b6] bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:bg-[#fce0df]" disabled={act.busy} onClick={() => window.confirm(`Turn off ${u.first_name}'s account? They will be signed out.`) && act.run(() => adminFetch(`/user-directory/${u.id}/state`, json("POST", { state: "disable" })))}>Disable</button>}
              <button type="button" className={small} onClick={() => setView(u)}>View details</button>
            </span>,
          ])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={!!view} title={view ? `${view.first_name} ${view.last_name}` : ""} onClose={() => setView(null)}>
        {view && <dl className="space-y-2 text-sm"><p><b>Email:</b> {view.email}</p><p><b>Type:</b> {typeOfUser(view)}</p><p><b>School:</b> {view.institutions?.name ?? "Platform team"}</p><p><b>Last sign-in:</b> {when(view.last_login_at)}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></dl>}
      </Modal>
    </div>
  );
}

// ═════════════ Login activity ═════════════
export type LoginTab = "history" | "failed" | "sessions";
interface Ev { id: string; email: string; success: boolean; reason: string; ip_address: string | null; user_agent: string | null; created_at: string; institutions: { name: string } | null; user_profiles: { first_name: string; last_name: string; roles: { display_name: string } | null } | null }
type Hist = Paged<Ev> & { last24h: { signed_in: number; failed: number } };
interface Sess { session_id: string; ip_address: string | null; user_agent: string | null; created_at: string; last_seen_at: string; is_current: boolean; user_profiles: { first_name: string; last_name: string; roles: { display_name: string } | null; institutions: { name: string } | null } | null }

export function LoginActivityPages({ tab }: { tab: LoginTab }) {
  return tab === "sessions" ? <SessionsPage /> : <EventsPage failed={tab === "failed"} />;
}

function EventsPage({ failed }: { failed: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<Ev | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => adminFetch<Hist & { locked?: unknown[] }>(`/login-activity/${failed ? "failed" : "history"}${qs({ search: q, page })}`), [failed, q, page]);
  const sets = useLoad(() => (failed ? adminFetch<{ settings: Record<string, unknown> }>("/settings") : Promise.resolve(null)), [failed]);
  const items = data?.items ?? [];
  const who = (e: Ev) => (e.user_profiles ? `${e.user_profiles.first_name} ${e.user_profiles.last_name}` : e.email);
  const role = (e: Ev) => e.user_profiles?.roles?.display_name ?? "—";
  const maxF = Number(sets.data?.settings["security.max_failed_logins"] ?? 5);
  const lockM = Number(sets.data?.settings["security.lockout_minutes"] ?? 15);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {failed && (
        <Tiles items={[
          { label: "Failed today", value: data ? String(data.last24h.failed) : "…", sub: "In the last 24 hours" },
          { label: "Locked accounts", value: data?.locked ? String(data.locked.length) : "…", sub: "Unlock from User Directory" },
          { label: "Lockout rule", value: `${maxF} tries`, sub: `${lockM}-minute lock` },
        ]} />
      )}
      <Panel title={failed ? "Failed attempts" : "Sign-ins"} sub={`${data?.total ?? 0} ${failed ? "attempts" : "sign-ins"}`}
        right={<ExportPrint name={failed ? "failed-attempts" : "sign-ins"} head={failed ? ["Login", "Type", "IP address", "Device", "Time", "Reason", "Result"] : ["User", "School", "IP address", "Device", "Result", "Time"]} rows={items.map((e) => failed ? [e.email, role(e), e.ip_address, deviceName(e.user_agent), when(e.created_at), reasonLabel[e.reason] ?? e.reason, e.reason === "locked" ? "Blocked" : "Failed"] : [who(e), e.institutions?.name ?? "", e.ip_address, deviceName(e.user_agent), reasonLabel[e.reason] ?? e.reason, when(e.created_at)])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={failed ? "Search failed attempts" : "Search sign-ins"} aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <SimpleTable
          head={failed ? [{ h: "Login" }, { h: "Type" }, { h: "IP address" }, { h: "Location" }, { h: "Device" }, { h: "Time" }, { h: "Reason" }, { h: "Result" }, { h: "" }] : [{ h: "User" }, { h: "School" }, { h: "IP address" }, { h: "Device" }, { h: "Result" }, { h: "Time" }, { h: "" }]}
          empty={loading ? "Loading…" : failed ? "No failed attempts." : "No sign-ins recorded yet."}
          rows={items.map((e) => failed
            ? [e.email, e.user_profiles ? role(e) : "—", e.ip_address ?? "—", "—", deviceName(e.user_agent), when(e.created_at), reasonLabel[e.reason] ?? e.reason, <Chip key="r" tone="bad">{e.reason === "locked" ? "Blocked" : "Failed"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(e)}>View details</button>]
            : [<div key="u"><p className="font-semibold text-slate-900">{who(e)}</p><p className="text-xs text-slate-400">{role(e)}</p></div>, e.institutions?.name ?? "—", e.ip_address ?? "—", deviceName(e.user_agent), <Chip key="r" tone={e.success ? "good" : "bad"}>{e.success ? "Success" : reasonLabel[e.reason] ?? "Failed"}</Chip>, when(e.created_at), <button key="v" type="button" className={small} onClick={() => setView(e)}>View details</button>])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={!!view} title={view ? who(view) : ""} onClose={() => setView(null)}>
        {view && <dl className="space-y-2 text-sm"><p><b>Login:</b> {view.email}</p><p><b>Result:</b> {view.success ? "Signed in" : reasonLabel[view.reason] ?? view.reason}</p><p><b>IP address:</b> {view.ip_address ?? "—"}</p><p><b>Device:</b> {deviceName(view.user_agent)}</p><p><b>Time:</b> {when(view.created_at)}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></dl>}
      </Modal>
    </div>
  );
}

function SessionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Sess> & { timeout_minutes: number }>(`/login-activity/sessions${qs({ page })}`), [page]);
  const act = useAction(reload);
  const items = (data?.items ?? []).filter((s) => has(`${s.user_profiles?.first_name} ${s.user_profiles?.last_name} ${s.ip_address ?? ""}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Open sessions" sub={`${data?.total ?? 0} sessions`}
        right={<span className="flex gap-2"><button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("End every open session except yours? Everyone else will be signed out.") && act.run(() => adminFetch("/login-activity/sessions/end-others", json("POST", {})))}>End all other sessions</button><ExportPrint name="open-sessions" head={["User", "Device", "IP address", "Started", "State"]} rows={items.map((s) => [`${s.user_profiles?.first_name} ${s.user_profiles?.last_name}`, deviceName(s.user_agent), s.ip_address, when(s.created_at), s.is_current ? "This device" : "Active"])} /></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search open sessions" aria-label="Search open sessions" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "User" }, { h: "Device" }, { h: "Location" }, { h: "IP address" }, { h: "Started" }, { h: "State" }, { h: "" }]} empty={loading ? "Loading…" : "No tracked sessions. People appear here when they sign in through the portal."}
          rows={items.map((s) => [
            <div key="u"><p className="font-semibold text-slate-900">{s.user_profiles?.first_name} {s.user_profiles?.last_name}</p><p className="text-xs text-slate-400">{s.user_profiles?.roles?.display_name}{s.user_profiles?.institutions ? ` · ${s.user_profiles.institutions.name}` : ""}</p></div>,
            deviceName(s.user_agent), "—", s.ip_address ?? "—", when(s.created_at), s.is_current ? <Chip key="c" tone="info">This device</Chip> : <Chip key="c" tone="good">Active</Chip>,
            <span key="a" className="flex gap-1.5">{!s.is_current && <button type="button" className="rounded-full border border-[#f2b8b6] bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:bg-[#fce0df]" disabled={act.busy} onClick={() => window.confirm("End this session? They will be signed out.") && act.run(() => adminFetch(`/login-activity/sessions/${s.session_id}/end`, json("POST", {})))}>End session</button>}</span>,
          ])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}
