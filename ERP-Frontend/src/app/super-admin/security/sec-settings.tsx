"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Field as FormField, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { small, smallPrimary } from "../schools/pages/shared";
import { Fields, Field, Select, SelectLine, SettingsCard, ToggleLine, useSettings } from "../settings/kit";
import type { Opt } from "../settings/kit";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;

// ═════════════ Security settings ═════════════
export type SettingsTab = "password" | "mfa" | "timeout";
const n = (v: number, one: string, many = one + "s") => `${v} ${v === 1 ? one : many}`;

export function SecuritySettingsPages({ tab }: { tab: SettingsTab }) {
  return tab === "password" ? <PasswordPolicy /> : tab === "mfa" ? <Mfa /> : <Timeout />;
}

function PasswordPolicy() {
  const s = useSettings({ "security.min_password_length": 8, "security.password_expiry_days": 0, "security.password_history": 0, "security.max_failed_logins": 5, "security.password_require_number": true, "security.password_require_symbol": false, "security.password_block_common": true });
  const d = s.draft;
  const length: Opt[] = [8, 10, 12, 14, 16].map((v) => [v, `${v} characters`]);
  const expiry: Opt[] = [[0, "Never"], ...[30, 60, 90, 180, 365].map((v): Opt => [v, `${v} days`])];
  const history: Opt[] = [[0, "Not checked"], ...[3, 5, 10, 24].map((v): Opt => [v, `${v} passwords`])];
  const lock: Opt[] = [3, 5, 10, 20].map((v) => [v, `${v} wrong tries`]);
  return (
    <SettingsCard title="Password policy" s={s} saveLabel="Save policy" onSubmit={(e) => void s.save(e)}>
      <Fields cols={4}>
        <Field label="Minimum length"><Select label="Minimum length" value={d["security.min_password_length"]} onChange={(v) => s.set("security.min_password_length", Number(v))} options={length} /></Field>
        <Field label="Expiry (platform team)"><Select label="Expiry" value={d["security.password_expiry_days"]} onChange={(v) => s.set("security.password_expiry_days", Number(v))} options={expiry} /></Field>
        <Field label="Can't reuse the last"><Select label="Can't reuse the last" value={d["security.password_history"]} onChange={(v) => s.set("security.password_history", Number(v))} options={history} /></Field>
        <Field label="Lock after"><Select label="Lock after" value={d["security.max_failed_logins"]} onChange={(v) => s.set("security.max_failed_logins", Number(v))} options={lock} /></Field>
      </Fields>
      <ToggleLine label="Needs a number" checked={d["security.password_require_number"] === true} onChange={(v) => s.set("security.password_require_number", v)} />
      <ToggleLine label="Needs a symbol" checked={d["security.password_require_symbol"] === true} onChange={(v) => s.set("security.password_require_symbol", v)} />
      <ToggleLine label="Block common passwords" hint="Like 'password123' or the school's name" checked={d["security.password_block_common"] === true} onChange={(v) => s.set("security.password_block_common", v)} />
    </SettingsCard>
  );
}

interface Person { id: string; first_name: string; last_name: string; email: string; has_phone: boolean; code_on: boolean; otp_enabled: boolean; last_login_at: string | null; roles: { display_name: string } }

function Mfa() {
  const s = useSettings({ "security.require_2fa_staff": false, "security.require_2fa_school_admins": false, "security.require_2fa_principals": false, "security.mfa_methods": "app_or_sms", "security.remember_device_days": 30 });
  const team = useLoad(() => adminFetch<{ people: Person[] }>("/security/mfa"), []);
  const act = useAction(() => undefined);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Person | null>(null);
  const [sent, setSent] = useState("");
  const d = s.draft;
  const missing = (team.data?.people ?? []).filter((p) => !p.has_phone && !p.otp_enabled);
  const rows = missing.filter((p) => has(`${p.first_name} ${p.last_name} ${p.roles.display_name}`, search));
  const name = (p: Person) => `${p.first_name} ${p.last_name}`;
  const remind = (p: Person) => act.run(async () => { await adminFetch(`/security/mfa/${p.id}/remind`, json("POST", {})); setSent(`Reminder sent to ${p.email}.`); });
  const days: Opt[] = [[0, "Never"], [7, "7 days"], [30, "30 days"], [90, "90 days"]];
  const methods: Opt[] = [["app_or_sms", "Authenticator app or SMS"], ["sms", "SMS only"], ["email", "Email only"]];
  return (
    <div className="space-y-5">
      <SettingsCard title="Two-factor sign-in" s={s} onSubmit={(e) => void s.save(e)}>
        <ToggleLine label="Platform team" hint={d["security.require_2fa_staff"] === true ? `Required. ${n(missing.length, "person", "people")} haven't set it up yet.` : "Not required."} checked={d["security.require_2fa_staff"] === true} onChange={(v) => s.set("security.require_2fa_staff", v)} />
        <ToggleLine label="School admins" hint="Recommended for schools that collect fees online" checked={d["security.require_2fa_school_admins"] === true} onChange={(v) => s.set("security.require_2fa_school_admins", v)} />
        <ToggleLine label="Principals and accountants" checked={d["security.require_2fa_principals"] === true} onChange={(v) => s.set("security.require_2fa_principals", v)} />
        <SelectLine label="Methods allowed" value={d["security.mfa_methods"]} onChange={(v) => s.set("security.mfa_methods", String(v))} options={methods} />
        <SelectLine label="Remember a device for" value={d["security.remember_device_days"]} onChange={(v) => s.set("security.remember_device_days", Number(v))} options={days} />
      </SettingsCard>
      <Panel title="Team members without 2FA" sub={n(missing.length, "person", "people")} right={<ExportPrint name="team-without-2fa" head={["Name", "Role", "Last sign-in"]} rows={rows.map((p) => [name(p), p.roles.display_name, when(p.last_login_at)])} />}>
        <ErrorBanner message={team.error || act.error} />
        {sent && <p role="status" className="border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-emerald-700">{sent}</p>}
        {missing.length > 4 && <Search v={search} set={setSearch} label="Search team members" />}
        <SimpleTable head={[{ h: "Name" }, { h: "Role" }, { h: "Last sign-in" }, { h: "" }]} empty={team.loading ? "Loading…" : "Everyone on the team has it set up."}
          rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{name(p)}</b>, <Tag key="r">{p.roles.display_name}</Tag>, p.last_login_at ? when(p.last_login_at) : "—",
            <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => { setSent(""); void remind(p); }}>Remind</button><button type="button" className={small} onClick={() => setView(p)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Email" v={view.email} /><Row k="Role" v={view.roles.display_name} /><Row k="Mobile number" v={view.has_phone ? "Set" : "Not set"} /><Row k="Last sign-in" v={when(view.last_login_at)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

function Timeout() {
  const s = useSettings({ "security.session_timeout_minutes": 480, "security.session_timeout_app_days": 90, "security.logout_on_browser_close": false, "security.single_session_staff": false });
  const d = s.draft;
  const school = s.raw["security.session_timeout_school_minutes"];
  const [schoolMin, setSchoolMin] = useState<number | null>(null);
  const shown = schoolMin ?? (typeof school === "number" ? school : Number(d["security.session_timeout_minutes"]));
  const mins = (v: number) => (v < 60 ? `${v} minutes` : v === 60 ? "1 hour" : v % 60 === 0 ? `${v / 60} hours` : `${v} minutes`);
  const portal: Opt[] = [15, 30, 60, 120, 480].map((v) => [v, mins(v)]);
  const schools: Opt[] = [30, 60, 120, 240, 480].map((v) => [v, mins(v)]);
  const app: Opt[] = [30, 90, 180].map((v) => [v, `${v} days`]);
  return (
    <SettingsCard title="Session timeout" s={{ ...s, discard: () => { s.discard(); setSchoolMin(null); } }} onSubmit={(e: FormEvent) => void s.save(e, { "security.session_timeout_school_minutes": shown })}>
      <SelectLine label="Super Admin portal" hint="Sign out after inactivity" value={d["security.session_timeout_minutes"]} onChange={(v) => s.set("security.session_timeout_minutes", Number(v))} options={portal} />
      <SelectLine label="School portals" value={shown} onChange={(v) => { setSchoolMin(Number(v)); }} options={schools} />
      <SelectLine label="Parent and student apps" hint="Stay signed in on the phone" value={d["security.session_timeout_app_days"]} onChange={(v) => s.set("security.session_timeout_app_days", Number(v))} options={app} />
      <ToggleLine label="Sign out when the browser closes" checked={d["security.logout_on_browser_close"] === true} onChange={(v) => s.set("security.logout_on_browser_close", v)} />
      <ToggleLine label="Allow only one session per person" hint="Platform team" checked={d["security.single_session_staff"] === true} onChange={(v) => s.set("security.single_session_staff", v)} />
    </SettingsCard>
  );
}

// ═════════════ Incident management ═════════════
export type IncidentTab = "alerts" | "history";
type Sev = "Low" | "Medium" | "High";
type IncStatus = "Open" | "Investigating" | "Mitigated" | "Resolved";
interface Alert { id: string; severity: Sev; title: string; detail: string; when: string; ip?: string; blocked?: boolean; status: "New" | "Acknowledged" | "Resolved" }
interface Incident { id: string; code: string; title: string; severity: Sev; status: IncStatus; notes: string; started_at: string; resolved_at: string | null }

const alertSev: Record<Sev, [string, "bad" | "warn" | "info"]> = { High: ["Critical", "bad"], Medium: ["Warning", "warn"], Low: ["Info", "info"] };
const alertState: Record<Alert["status"], "warn" | "mute" | "good"> = { New: "warn", Acknowledged: "mute", Resolved: "good" };
const incSev: Record<Sev, "mute" | "warn" | "bad"> = { Low: "mute", Medium: "warn", High: "bad" };
const incState: Record<IncStatus, "bad" | "warn" | "info" | "good"> = { Open: "bad", Investigating: "warn", Mitigated: "info", Resolved: "good" };

export function IncidentPages({ tab }: { tab: IncidentTab }) {
  return tab === "alerts" ? <Alerts /> : <History />;
}

function Alerts() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ alerts: Alert[] }>("/security/alerts"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Alert | null>(null);
  const rows = (data?.alerts ?? []).filter((a) => has(`${a.title} ${a.detail}`, search));
  const mark = (a: Alert, status: "acknowledged" | "resolved") => act.run(() => adminFetch("/security/alerts/status", json("POST", { id: a.id, status })));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Security alerts" sub={n(rows.length, "alert")} right={<ExportPrint name="security-alerts" head={["Alert", "Severity", "Details", "When", "Status"]} rows={rows.map((a) => [a.title, alertSev[a.severity][0], a.detail, when(a.when), a.status])} />}>
        <Search v={search} set={setSearch} label="Search security alerts" />
        <SimpleTable head={[{ h: "Alert" }, { h: "Severity" }, { h: "Details" }, { h: "When" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing needs attention."}
          rows={rows.map((a) => [<b key="t" className="font-semibold text-slate-900">{a.title}</b>, <Chip key="s" tone={alertSev[a.severity][1]}>{alertSev[a.severity][0]}</Chip>, <span key="d" className="text-[13px]">{a.detail}</span>, when(a.when), <Chip key="st" tone={alertState[a.status]}>{a.status}</Chip>,
            <span key="a" className="flex gap-1.5">
              {a.status === "New" && <button type="button" className={small} disabled={act.busy} onClick={() => mark(a, "acknowledged")}>Acknowledge</button>}
              {a.status === "Acknowledged" && <button type="button" className={smallPrimary} disabled={act.busy} onClick={() => mark(a, "resolved")}>Resolve</button>}
              <button type="button" className={small} onClick={() => setView(a)}>View details</button>
            </span>])} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Severity" v={alertSev[view.severity][0]} /><Row k="Details" v={view.detail} /><Row k="When" v={when(view.when)} /><Row k="Status" v={view.status} />{view.ip && <Row k="IP address" v={view.blocked ? `${view.ip} (blocked)` : view.ip} />}</dl>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span>{view.ip && !view.blocked && <button type="button" className={small} disabled={act.busy} onClick={async () => { if (window.confirm(`Block ${view.ip}? Nobody can sign in from it until you unblock it.`) && (await act.run(() => adminFetch("/ip-blocklist", json("POST", { cidr: view.ip, reason: view.title })))) ) setView(null); }}>Block IP</button>}</span>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
        </div></>}</Modal>
    </div>
  );
}

function History() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ incidents: Incident[] }>("/security/incidents"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Incident | null>(null);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState({ status: "Open" as IncStatus, notes: "" });
  const [f, setF] = useState({ title: "", severity: "Medium" as Sev, notes: "" });
  const [formError, setFormError] = useState("");
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "security/incidents") { setFormError(""); setF({ title: "", severity: "Medium", notes: "" }); setAdding(true); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const rows = (data?.incidents ?? []).filter((i) => has(`${i.code} ${i.title} ${i.notes}`, search));
  const open = (i: Incident) => { setEdit({ status: i.status, notes: i.notes }); setFormError(""); setView(i); };
  const report = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(async () => { try { await adminFetch("/security/incidents", json("POST", f)); } catch (err) { setFormError(err instanceof Error ? err.message : "Save failed."); throw err; } });
    if (ok) setAdding(false);
  };
  const update = async (e: FormEvent) => {
    e.preventDefault();
    if (!view) return;
    const ok = await act.run(async () => { try { await adminFetch(`/security/incidents/${view.id}`, json("PATCH", edit)); } catch (err) { setFormError(err instanceof Error ? err.message : "Save failed."); throw err; } });
    if (ok) setView(null);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Incidents" sub={n(rows.length, "incident")} right={<ExportPrint name="incidents" head={["Incident", "What happened", "Severity", "Status", "Started", "Notes"]} rows={rows.map((i) => [i.code, i.title, i.severity, i.status, when(i.started_at), i.notes])} />}>
        <Search v={search} set={setSearch} label="Search incidents" />
        <SimpleTable head={[{ h: "Incident" }, { h: "What happened" }, { h: "Severity" }, { h: "Status" }, { h: "Started" }, { h: "Notes" }, { h: "" }]} empty={loading ? "Loading…" : "No incidents reported."}
          rows={rows.map((i) => [i.code, <b key="t" className="font-semibold text-slate-900">{i.title}</b>, <Chip key="s" tone={incSev[i.severity]}>{i.severity}</Chip>, <Chip key="st" tone={incState[i.status]}>{i.status}</Chip>, when(i.started_at), <span key="n" className="text-[13px]">{i.notes || "—"}</span>, <button key="v" type="button" className={small} onClick={() => open(i)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view ? `${view.code} · ${view.title}` : ""} onClose={() => setView(null)}>{view && (
        <form onSubmit={update} className="space-y-3">
          <ErrorBanner message={formError} />
          <dl><Row k="Severity" v={view.severity} /><Row k="Started" v={when(view.started_at)} />{view.resolved_at && <Row k="Resolved" v={when(view.resolved_at)} />}</dl>
          <FormField label="Status"><select className={inputCls} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as IncStatus })}>{(["Open", "Investigating", "Mitigated", "Resolved"] as IncStatus[]).map((x) => <option key={x}>{x}</option>)}</select></FormField>
          <FormField label="Notes" hint="What you found and what was done."><textarea className={`${inputCls} min-h-[6rem]`} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setView(null)}>Close</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>)}</Modal>
      <Modal open={adding} title="Report an incident" onClose={() => setAdding(false)}>
        <form onSubmit={report} className="space-y-3">
          <ErrorBanner message={formError} />
          <FormField label="What happened"><input className={inputCls} required minLength={3} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></FormField>
          <FormField label="Severity"><select className={inputCls} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Sev })}>{(["Low", "Medium", "High"] as Sev[]).map((x) => <option key={x}>{x}</option>)}</select></FormField>
          <FormField label="Notes" hint="What you found and what was done."><textarea className={`${inputCls} min-h-[6rem]`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Report incident</button></div>
        </form>
      </Modal>
    </div>
  );
}
