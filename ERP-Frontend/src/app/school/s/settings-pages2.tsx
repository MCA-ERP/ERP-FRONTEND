"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";
import { Tbl } from "./report-pages";
import type { R } from "./report-pages";
import { KvForm, Line, Shell, STORED, sw } from "./settings-pages";
import { MENU } from "./menu-config";
import { TemplateList } from "./comm-pages";

const S = "/school";
const KV = "/settings2/kv";
const tiles = (items: [string, ReactNode, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const dash = (s: ReactNode) => (s === null || s === undefined || s === "" ? "—" : s);
const bold = (s: string, blue = false) => <b key={s} className={`font-semibold ${blue ? "text-[#026f9b]" : "text-slate-900"}`}>{s}</b>;
const when = (iso: string) => { const d = new Date(iso); return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}`; };
const tone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Active", "Connected", "Given", "Done"].includes(s) ? "good" : ["Locked", "Withdrawn", "Declined"].includes(s) ? "bad" : ["Open"].includes(s) ? "warn" : "mute");
const chip = (s: string) => <Chip key={s} tone={tone(s)}>{s}</Chip>;

// ═════════════ communication settings ═════════════
export function CommSettingsPages({ tab }: { tab: "sms" | "email" | "whatsapp" }) {
  const note = "Messages are not sent yet because no provider is connected. These details are saved for when one is.";
  if (tab === "sms") return <KvForm base={KV} group="sms" title="SMS" note={note} defs={[{ k: "provider", label: "Provider", kind: "select", options: ["MSG91", "Textlocal", "Twilio", "Other"] }, { k: "sender_id", label: "Sender ID", hint: "Up to 6 letters", kind: "text" }, { k: "dlt_entity_id", label: "DLT entity ID", kind: "text", w: "!w-64" }]} />;
  if (tab === "email") return <KvForm base={KV} group="email" title="Email" note={note} defs={[{ k: "from_name", label: "From name", kind: "text", w: "!w-72" }, { k: "from_address", label: "From address", kind: "text", w: "!w-72" }, { k: "reply_to", label: "Reply-to", kind: "text", w: "!w-72" }]} />;
  return <KvForm base={KV} group="whatsapp" title="WhatsApp" note={note} defs={[{ k: "business_number", label: "Business number", kind: "text", w: "!w-64" }, { k: "provider", label: "Provider", kind: "select", options: ["Interakt", "Meta Cloud API", "Gupshup", "Other"] }]} />;
}

// ═════════════ integrations ═════════════
export function IntegrationPage() {
  const d = useLoad(() => schoolFetch<{ items: { service: string; provider: string; used: string; status: string }[] }>(`${S}/settings2/integrations`), []); const all = d.data?.items ?? []; const on = all.filter((x) => x.status === "Connected").length;
  return <div className="space-y-5"><ErrorBanner message={d.error} />{tiles([["Connected", `${on} of ${all.length}`, "Detected from the server settings"], ["Not set up", all.length - on, "Can be switched on"], ["Managed by", "Super Admin", "Platform › Integrations"]])}
    <Tbl title="Connected services" noun="services" head={["Service", "Provider", "Used for", "Status"]} empty={d.loading ? "Loading…" : "Nothing listed."} rows={all.map((x): R => ({ cells: [bold(x.service), x.provider, x.used, chip(x.status)], text: [x.service, x.provider, x.used, x.status] }))} />
    <p className="text-xs text-slate-500">Status shows only what the server can see (payment and mail keys). Devices and messaging services show “Not set up” until they are connected.</p></div>;
}

// ═════════════ users ═════════════
type U = { id: string; name: string; role: string; login: string; last_login: string | null; status: string };
const ROLE_OPTS = ["Faculty", "ClassTeacher", "Accountant", "Librarian", "Receptionist", "SchoolNurse", "Counsellor", "TransportManager", "MessManager", "StoreIncharge", "ExamCoordinator", "HR", "Registrar", "FrontOfficeSecurity"];
export function UserPages({ tab }: { tab: "create-user" | "activate" | "deactivate" }) {
  const d = useLoad(() => schoolFetch<{ items: U[] }>(`${S}/settings2/users`), []); const act = useAction(() => d.reload()); const [v, setV] = useState<U | null>(null);
  const blank = { name: "", email: "", mobile: "", staff_type: "Non-teaching", role: "Receptionist" }; const [f, setF] = useState(blank); const [msg, setMsg] = useState("");
  const set = (u: U, active: boolean) => void act.run(() => schoolFetch(`${S}/settings2/users/${u.id}`, json("POST", { active }))).then((ok) => ok && setV(null));
  if (tab === "create-user") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${S}/hr/employees`, json("POST", { name: f.name, email: f.email, mobile: f.mobile || undefined, staff_type: f.staff_type, role: f.role })))) { setF(blank); setMsg("Saved. The user appears in Activate / Deactivate."); } };
    return <Shell title="Create User" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={act.error} msg={msg}><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-[12px] text-slate-600">Name<input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label><label className="text-[12px] text-slate-600">Login (email)<input type="email" className={inputCls} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label className="text-[12px] text-slate-600">Mobile<input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></label><label className="text-[12px] text-slate-600">Role<select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLE_OPTS.map((o) => <option key={o}>{o}</option>)}</select></label>
      <label className="text-[12px] text-slate-600">Staff type<select className={inputCls} value={f.staff_type} onChange={(e) => setF({ ...f, staff_type: e.target.value })}><option>Teaching</option><option>Non-teaching</option></select></label></div></Shell>;
  }
  const all = (d.data?.items ?? []).filter((u) => (tab === "activate" ? u.status !== "Active" : u.status === "Active")); const st = ["Inactive", "Locked", "Active"].filter((s) => all.some((u) => u.status === s));
  return <div className="space-y-5"><ErrorBanner message={d.error || act.error} />{tiles([["Users", all.length, "Sample records shown"], ...(st.length ? st : [tab === "activate" ? "Inactive" : "Active"]).map((s): [string, number, string] => [s, all.filter((u) => u.status === s).length, `${pct(all.filter((u) => u.status === s).length, all.length)} of shown`])])}
    <Tbl title="Users" noun="users" head={["Name", "Role", "Login", "Last sign-in", "Status"]} empty={d.loading ? "Loading…" : tab === "activate" ? "Everyone can sign in." : "No users."} rows={all.map((u): R => ({ cells: [u.name, u.role, u.login, u.last_login ? when(u.last_login) : "—", chip(u.status)], text: [u.name, u.role, u.login, u.last_login ? when(u.last_login) : "", u.status] }))} />
    <div className="flex flex-wrap gap-2">{all.map((u) => <button key={u.id} type="button" className={tab === "activate" ? primaryCls : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28]"} disabled={act.busy} onClick={() => setV(u)}>{tab === "activate" ? "Activate" : "Deactivate"} · {u.name}</button>)}</div>
    <Modal open={!!v} title={v ? `${tab === "activate" ? "Activate" : "Deactivate"} ${v.name}?` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Role" v={v.role} /><Row k="Login" v={v.login} /></dl><div className="mt-4 flex justify-end gap-2"><button type="button" className={small} onClick={() => setV(null)}>Close</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => set(v, tab === "activate")}>{tab === "activate" ? "Activate" : "Deactivate"}</button></div></>}</Modal></div>;
}

// ═════════════ roles ═════════════
const ALL = Object.keys(MENU);
const DEFAULT_MENU: Record<string, string[]> = { "School Admin": ALL, Principal: ALL.filter((k) => k !== "settings"), Accountant: ["dashboard", "fees", "payroll", "reports"], Receptionist: ["dashboard", "front-office", "admission", "visitors"], Teacher: ["dashboard", "students", "attendance", "timetable", "examinations", "lms", "communication", "health"], Librarian: ["dashboard", "library"], "Transport Manager": ["dashboard", "transport"] };
export function RolePages({ tab }: { tab: "role-setup" | "permission-assignment" }) {
  const r = useLoad(() => (tab === "role-setup" ? schoolFetch<{ items: { id: string; display_name: string; description: string | null; users: number; custom: boolean; own: boolean }[] }>(`${S}/settings2/roles`) : Promise.resolve(null)), [tab]);
  const m = useLoad(() => (tab === "permission-assignment" ? schoolFetch<{ roles: string[]; custom: string[]; map: Record<string, string[]> | null }>(`${S}/settings2/role-menus`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { m.reload(); r.reload(); }); const [f, setF] = useState<Record<string, string[]> | null>(null); const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false); const [nf, setNf] = useState({ display_name: "", description: "", copy: "" });
  if (tab === "role-setup") {
    const all = r.data?.items ?? [];
    const create = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${S}/settings2/roles`, json("POST", { display_name: nf.display_name, description: nf.description || undefined, copy_menus_from: nf.copy || undefined })))) { setAdding(false); setNf({ display_name: "", description: "", copy: "" }); setMsg("Role added. Set what it can open under Permission Assignment."); } };
    const drop = async (id: string, name: string) => { if (window.confirm(`Delete the role ${name}?`)) { setMsg(""); if (await act.run(() => schoolFetch(`${S}/settings2/roles/${id}`, { method: "DELETE" }))) setMsg("Role deleted."); } };
    return <div className="space-y-5">{okBox(msg)}<ErrorBanner message={r.error || act.error} />
      <Tbl title="Roles" noun="roles" head={["Role", "Can do", "Users", "Kind"]} empty={r.loading ? "Loading…" : "No roles."} nav={<button type="button" className={primaryCls} onClick={() => setAdding(true)}>+ Add role</button>}
        rows={all.map((x): R => ({ cells: [bold(x.display_name), dash(x.description), <span key="u" className="block text-right">{x.users}</span>, <span key="k" className="flex items-center gap-2"><span className="text-[12px] text-slate-500">{x.own ? "Added for this school" : x.custom ? "Added by the platform team" : "Built in"}</span>{x.own && <button key="d" type="button" className={small} disabled={act.busy || x.users > 0} title={x.users > 0 ? "Move its users to another role first" : "Delete this role"} onClick={() => void drop(x.id, x.display_name)}>Delete</button>}</span>], text: [x.display_name, x.description ?? "", x.users, x.own ? "Added for this school" : x.custom ? "Added by the platform team" : "Built in"] }))} />
      <Modal open={adding} title="Add a role" onClose={() => setAdding(false)}>
        <form onSubmit={create} className="space-y-3">
          <label className="block text-[12px] text-slate-700">Role name<input className={`${inputCls} mt-1`} required minLength={3} maxLength={100} placeholder="For example, Exam Coordinator" value={nf.display_name} onChange={(e) => setNf({ ...nf, display_name: e.target.value })} /></label>
          <label className="block text-[12px] text-slate-700">What it does<input className={`${inputCls} mt-1`} maxLength={500} placeholder="One line for the role list" value={nf.description} onChange={(e) => setNf({ ...nf, description: e.target.value })} /></label>
          <label className="block text-[12px] text-slate-700">Start from<select className={`${inputCls} mt-1`} value={nf.copy} onChange={(e) => setNf({ ...nf, copy: e.target.value })}><option value="">Dashboard only</option>{["Principal", "Accountant", "Receptionist", "Teacher", "Librarian", "Transport Manager"].map((x) => <option key={x}>{x}</option>)}</select></label>
          <p className="text-[11px] text-slate-500">The role appears in Permission Assignment straight away. Staff are given the role in HR, then see only the menus you tick.</p>
          <div className="flex justify-end gap-2"><button type="button" className={small} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={primaryCls} disabled={act.busy}>Add role</button></div>
        </form>
      </Modal></div>;
  }
  const roles = m.data?.roles ?? []; const custom = m.data?.custom ?? []; const map = f ?? m.data?.map ?? DEFAULT_MENU;
  const menusOf = (role: string) => map[role] ?? (custom.includes(role) ? ALL : []);
  const on = (role: string, k: string) => role === "School Admin" || menusOf(role).includes(k);
  const toggle = (role: string, k: string) => { const cur = menusOf(role); setF({ ...map, [role]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] }); };
  const save = async () => { setMsg(""); if (await act.run(() => schoolFetch(`${S}/settings2/role-menus`, json("PUT", { map })))) { setF(null); setMsg("Saved."); } };
  return <div className="space-y-5">{okBox(msg)}<ErrorBanner message={m.error || act.error} /><div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Permissions <span className="ml-1 text-xs font-normal text-slate-500">Tick to allow</span></h2><button type="button" className={primaryCls} disabled={act.busy || !f} onClick={() => void save()}>Save</button></div>
    <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-5 py-2">Menu</th>{roles.map((x) => <th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{ALL.map((k) => <tr key={k} className="border-t border-slate-100"><td className="px-5 py-2.5 font-semibold">{MENU[k].label}</td>{roles.map((x) => <td key={x} className="px-3 py-2.5"><input type="checkbox" aria-label={`${MENU[k].label} for ${x}`} className="h-4 w-4 accent-[#0294ce]" checked={on(x, k)} disabled={x === "School Admin"} onChange={() => toggle(x, k)} /></td>)}</tr>)}</tbody></table></div></div>
    <p className="text-xs text-slate-500">Roles you add under Role Setup appear here and their menus are enforced in the sidebar. The built-in roles keep their usual access: their ticks are saved, and what they can do is still decided by their role in the system.</p></div>;
}

// ═════════════ approval workflow ═════════════
export function SettingsApprovalPages({ tab }: { tab: "approval-levels" | "approval-routing" }) {
  const d = useLoad(() => (tab === "approval-levels" ? schoolFetch<{ rows: string[][] }>(`${S}/settings2/levels`) : Promise.resolve(null)), [tab]); const act = useAction(() => d.reload()); const [f, setF] = useState<string[][] | null>(null); const [msg, setMsg] = useState("");
  if (tab === "approval-routing") return <KvForm base={KV} group="approval_routing" title="Approval routing" note={STORED} defs={[{ k: "on_leave", label: "If an approver is on leave", kind: "select", options: ["Send to their backup", "Skip to next level", "Wait"] }, { k: "escalate_days", label: "Escalate if not approved within", kind: "select", options: ["1", "2", "3", "5"], suffix: "days" }, { k: "mobile", label: "Approve from the mobile app", kind: "toggle" }, { k: "digest", label: "Email a daily digest of pending approvals", hint: "At 9:00 am", kind: "toggle" }]} />;
  const rows = f ?? d.data?.rows; if (!rows) return <ErrorBanner message={d.error || ""} />;
  const set = (i: number, j: number, v: string) => setF(rows.map((r, k) => (k === i ? r.map((c, l) => (l === j ? v : c)) : r)));
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${S}/settings2/levels`, json("PUT", { rows })))) { setF(null); setMsg("Saved."); } };
  return <Shell title="Approval levels" onSubmit={save} onDiscard={() => { setF(null); setMsg(""); }} busy={act.busy} error={d.error || act.error} msg={msg}><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-5 py-2">What</th><th className="px-3 py-2">Level 1</th><th className="px-3 py-2">Level 2</th><th className="px-3 py-2">Level 3</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r[0]} className="border-t border-slate-100"><td className="px-5 py-2 font-semibold">{r[0]}</td>{[1, 2, 3].map((j) => <td key={j} className="px-3 py-1.5"><input aria-label={`${r[0]} level ${j}`} className={inputCls} maxLength={60} placeholder="—" value={r[j]} onChange={(e) => set(i, j, e.target.value)} /></td>)}</tr>)}</tbody></table><p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">{STORED}</p></Shell>;
}

// ═════════════ notification settings ═════════════
export function NotificationPages({ tab }: { tab: "templates" | "trigger-rules" }) {
  if (tab === "templates") return <TemplateList />;
  return <KvForm base={KV} group="triggers" title="Trigger rules" note={STORED} defs={[{ k: "absent", label: "Student absent", hint: "SMS + app to parents at 10:00 am", kind: "toggle" }, { k: "fee_due", label: "Fee due in 7 days", hint: "App + email", kind: "toggle" }, { k: "fee_overdue", label: "Fee overdue", hint: "SMS every 7 days, up to 3 times", kind: "toggle" }, { k: "homework", label: "Homework assigned", hint: "App notification", kind: "toggle" }, { k: "report_card", label: "Report card published", hint: "App + email", kind: "toggle" }, { k: "bus_delayed", label: "Bus delayed", hint: "App notification", kind: "toggle" }, { k: "birthday", label: "Birthday wishes", hint: "App notification at 7:00 am", kind: "toggle" }]} />;
}

// ═════════════ document settings ═════════════
export function DocumentSettingsPages({ tab }: { tab: "certificate-templates" | "numbering" }) {
  const d = useLoad(() => (tab === "certificate-templates" ? schoolFetch<{ items: { name: string; size: string; signed_by: string; last_edited: string; status: string }[] }>(`${S}/cert/templates`) : Promise.resolve(null)), [tab]);
  if (tab === "numbering") return <KvForm base={KV} group="numbering" title="Numbering" note="Use {year} for the year and {0000} for the running number. Certificate numbers already follow BG/CRT/{year}/{0000}; the other formats are saved for the screens that will use them." defs={[{ k: "admission", label: "Admission no.", kind: "text", w: "!w-64" }, { k: "receipt", label: "Fee receipt", kind: "text", w: "!w-64" }, { k: "certificate", label: "Certificate", kind: "text", w: "!w-64" }, { k: "transfer", label: "Transfer certificate", kind: "text", w: "!w-64" }, { k: "employee", label: "Employee ID", kind: "text", w: "!w-64" }, { k: "accession", label: "Library accession", kind: "text", w: "!w-64" }, { k: "restart", label: "Restart numbers each academic year", hint: "For admission and certificate numbers", kind: "toggle" }]} />;
  const all = d.data?.items ?? []; const act = all.filter((x) => x.status === "Active").length;
  return <div className="space-y-5"><ErrorBanner message={d.error} />{tiles([["Certificate templates", all.length, "Sample records shown"], ["Active", act, `${pct(act, all.length)} of shown`], ["Draft", all.length - act, `${pct(all.length - act, all.length)} of shown`]])}
    <Tbl title="Certificate templates" noun="templates" head={["Template", "Size", "Signed by", "Last edited", "Status"]} empty={d.loading ? "Loading…" : "No templates yet. Add them in Certificates."} rows={all.map((x): R => ({ cells: [bold(x.name), x.size, x.signed_by, day(x.last_edited), chip(x.status)], text: [x.name, x.size, x.signed_by, day(x.last_edited), x.status] }))} /></div>;
}

// ═════════════ audit ═════════════
export function AuditPages({ tab }: { tab: "audit-logs" | "change-history" }) {
  const d = useLoad(() => schoolFetch<{ items: { time: string; user: string; action: string; record: string; ip: string; status: string }[]; changes: { when: string; by: string; area: string; field: string; before: string; after: string }[] }>(`${S}/settings2/audit`), []);
  if (tab === "audit-logs") { const all = d.data?.items ?? []; return <div className="space-y-5"><ErrorBanner message={d.error} />{tiles([["Audit log", all.length, "Latest 1,000 events"], ["Logged", all.length, "100% of shown"]])}<Tbl title="Audit log" noun="events" head={["Time", "User", "Action", "Record", "IP", "Status"]} empty={d.loading ? "Loading…" : "Nothing logged yet."} rows={all.map((x): R => ({ cells: [when(x.time), x.user, x.action, dash(x.record), dash(x.ip), chip("Logged")], text: [when(x.time), x.user, x.action, x.record, x.ip, "Logged"] }))} /></div>; }
  const c = d.data?.changes ?? [];
  return <div className="space-y-5"><ErrorBanner message={d.error} /><Tbl title="Change history" noun="changes" head={["When", "By", "Area", "Field", "Before", "After"]} empty={d.loading ? "Loading…" : "No recorded changes yet."} rows={c.map((x): R => ({ cells: [when(x.when), x.by, <Chip key="a" tone="mute">{x.area}</Chip>, bold(x.field || "—"), dash(x.before), dash(x.after)], text: [when(x.when), x.by, x.area, x.field, x.before, x.after] }))} /></div>;
}

// ═════════════ DPDP ═════════════
export function DpdpPages({ tab }: { tab: "consent-register" | "data-requests" }) {
  const d = useLoad(() => schoolFetch<{ families: number; photo_withdrawn: number; open: number; consents: { id: string; parent_name: string; purpose: string; choice: string; source: string; recorded_at: string }[]; requests: { id: string; parent_name: string; kind: string; details: string; requested_on: string; status: string }[] }>(`${S}/settings2/dpdp`), []); const act = useAction(() => d.reload()); const x = d.data;
  const top = tiles([["Families", (x?.families ?? 0).toLocaleString("en-IN"), "with parent records"], ["Photo consent withdrawn", x?.photo_withdrawn ?? 0, "hidden from the gallery automatically"], ["Requests open", x?.open ?? 0, "reply within 7 days"], ["Children's data", "Verifiable parental consent", "DPDP section 9"]]);
  if (tab === "consent-register") return <div className="space-y-5"><ErrorBanner message={d.error} />{top}<Tbl title="Consent register" noun="entries" head={["When", "Parent", "Purpose", "Choice", "Source"]} empty={d.loading ? "Loading…" : "No consent entries yet. They are recorded when parents give or withdraw consent in the Parent app."} rows={(x?.consents ?? []).map((c): R => ({ cells: [when(c.recorded_at), bold(c.parent_name), c.purpose, chip(c.choice), c.source], text: [when(c.recorded_at), c.parent_name, c.purpose, c.choice, c.source] }))} /><p className="text-xs text-slate-500">Entries can&apos;t be edited or deleted.</p></div>;
  return <div className="space-y-5"><ErrorBanner message={d.error || act.error} />{top}<Tbl title="Data requests" noun="requests" head={["Requested", "Parent", "Request", "Details", "Status"]} empty={d.loading ? "Loading…" : "No requests. Parents ask from the Parent app."} rows={(x?.requests ?? []).map((q): R => ({ cells: [day(q.requested_on), bold(q.parent_name), q.kind, q.details, chip(q.status)], text: [day(q.requested_on), q.parent_name, q.kind, q.details, q.status] }))} />
    <div className="flex flex-wrap gap-2">{(x?.requests ?? []).filter((q) => q.status === "Open").flatMap((q) => [<button key={`${q.id}d`} type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/settings2/data-requests/${q.id}`, json("POST", { status: "Done" })))}>Mark done · {q.parent_name}</button>, <button key={`${q.id}x`} type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/settings2/data-requests/${q.id}`, json("POST", { status: "Declined" })))}>Decline · {q.parent_name}</button>])}</div></div>;
}
void Line; void sw;
