"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, PageHeader, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

/** Calls the sign-in service's own account endpoints (these are not under /admin). */
async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/auth${path}`, { ...init, headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body as T;
}
const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

interface Account {
  has_profile: boolean;
  can_create_profile?: boolean;
  email?: string;
  profile?: { id: string; email: string; first_name: string; last_name: string; phone: string | null; role: string; last_login_at: string | null };
  two_factor?: { enabled: boolean; own_setting: boolean; required_by_platform: boolean; sms_ready: boolean; email_ready: boolean; sent_by: "sms" | "email" | "console" | "none" };
}
type Tab = "profile" | "password" | "2fa" | "activity";

const device = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" on ") || ua.slice(0, 40);
};

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("profile");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && ["profile", "password", "2fa", "activity"].includes(t)) setTab(t);
  }, []);
  const acc = useLoad(() => authFetch<Account>("/account"), []);

  return (
    <>
      <PageHeader title="My account" subtitle="Your details, password, sign-in code and recent sign-ins." />
      <ErrorBanner message={acc.error} />
      {acc.data && !acc.data.has_profile ? (
        <CreateProfile account={acc.data} onDone={acc.reload} />
      ) : (
        <>
          <TabBar value={tab} onChange={setTab} tabs={[["profile", "My profile"], ["password", "Change password"], ["2fa", "Two-factor authentication"], ["activity", "My login activity"]]} />
          {tab === "profile" && acc.data?.profile && <Profile account={acc.data} onSaved={acc.reload} />}
          {tab === "password" && <Password />}
          {tab === "2fa" && acc.data?.two_factor && <TwoFactor account={acc.data} onChanged={acc.reload} />}
          {tab === "activity" && <Activity />}
        </>
      )}
    </>
  );
}

function CreateProfile({ account, onDone }: { account: Account; onDone: () => void }) {
  const act = useAction(onDone);
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "" });
  const submit = async (e: FormEvent) => { e.preventDefault(); await act.run(() => authFetch("/account/create-profile", send("POST", { ...f, phone: f.phone || null }))); };

  if (!account.can_create_profile) {
    return <Panel title="No profile yet"><p className="p-5 text-sm text-slate-600">Your sign-in has no profile in the system, so these pages are not available. Ask a Super Administrator to create your account under Users.</p></Panel>;
  }
  return (
    <Panel title="Create your profile" sub={`You are signed in as ${account.email}, the first administrator. A profile adds your name and mobile number, and lets sign-in codes, sessions and login history work.`}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <ErrorBanner message={act.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><input className={inputCls} required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input className={inputCls} required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
          <Field label="Mobile number" hint="Sign-in codes are sent here."><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98765 43210" /></Field>
        </div>
        <div className="flex justify-end"><button type="submit" className={btnPrimary} disabled={act.busy}>Create profile</button></div>
        <p className="text-xs text-slate-400">After this you can remove your email from <code>SUPER_ADMIN_EMAILS</code> in the backend <code>.env</code>.</p>
      </form>
    </Panel>
  );
}

function Profile({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const p = account.profile!;
  const act = useAction(onSaved);
  const [f, setF] = useState({ first_name: p.first_name, last_name: p.last_name, phone: p.phone ?? "" });
  const [saved, setSaved] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (await act.run(() => authFetch("/account", send("PATCH", { first_name: f.first_name, last_name: f.last_name, phone: f.phone || null })))) setSaved(true);
  };
  return (
    <Panel title="My profile" sub="Your name and the mobile number your sign-in codes go to.">
      <form onSubmit={submit} className="space-y-4 p-5">
        <ErrorBanner message={act.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><input className={inputCls} required value={f.first_name} onChange={(e) => { setSaved(false); setF({ ...f, first_name: e.target.value }); }} /></Field>
          <Field label="Last name"><input className={inputCls} required value={f.last_name} onChange={(e) => { setSaved(false); setF({ ...f, last_name: e.target.value }); }} /></Field>
          <Field label="Email" hint="You sign in with this. It cannot be changed here."><input className={inputCls} value={p.email} disabled /></Field>
          <Field label="Role"><input className={inputCls} value={p.role} disabled /></Field>
          <Field label="Mobile number" hint="Sign-in codes are sent to this number."><input className={inputCls} value={f.phone} onChange={(e) => { setSaved(false); setF({ ...f, phone: e.target.value }); }} placeholder="98765 43210" /></Field>
        </div>
        <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}<button type="submit" className={btnPrimary} disabled={act.busy}>Save changes</button></div>
      </form>
    </Panel>
  );
}

function Password() {
  const act = useAction(() => undefined);
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [done, setDone] = useState(false);
  const [mismatch, setMismatch] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (f.next !== f.again) { setMismatch("The two new passwords are not the same."); return; }
    setMismatch("");
    if (await act.run(() => authFetch("/change-password", send("POST", { current_password: f.current, new_password: f.next })))) { setDone(true); setF({ current: "", next: "", again: "" }); }
  };
  return (
    <Panel title="Change password" sub="Choose something you do not use anywhere else. Signing in on your other devices ends when you change it.">
      <form onSubmit={submit} className="max-w-md space-y-4 p-5">
        <ErrorBanner message={mismatch || act.error} />
        {done && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Your password was changed.</p>}
        <Field label="Current password"><input type="password" autoComplete="current-password" className={inputCls} required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="New password" hint="At least 8 characters."><input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field label="New password again"><input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
        <button type="submit" className={btnPrimary} disabled={act.busy}>Change password</button>
      </form>
    </Panel>
  );
}

function TwoFactor({ account, onChanged }: { account: Account; onChanged: () => void }) {
  const t = account.two_factor!;
  const devices = useLoad(() => authFetch<{ devices: { id: string; label: string | null; created_at: string; last_used_at: string | null; expires_at: string }[] }>("/two-factor/devices"), []);
  const act = useAction(() => { onChanged(); devices.reload(); });
  const hasPhone = !!account.profile?.phone;
  const where = { sms: "to your mobile number", email: "to your email address", console: "to the backend console (development only: nothing is sent to you)", none: "nowhere yet: SMS and email are not set up" }[t.sent_by];

  return (
    <div className="space-y-6">
      <Panel title="Two-factor authentication" sub="After your password, you enter a 6-digit code. Even if someone learns your password, they cannot sign in without your phone.">
        <div className="space-y-4 p-5">
          <ErrorBanner message={act.error} />
          <p className="flex flex-wrap items-center gap-2 text-sm">
            Status: {t.enabled ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}
            {t.required_by_platform && <span className="text-xs text-slate-500">Your platform requires it for everyone on the team.</span>}
          </p>
          <p className="text-sm text-slate-600">Codes are sent <b>{where}</b>.</p>
          {t.sms_ready && !hasPhone && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Add your mobile number under My profile so codes go to your phone instead of your email.</p>}
          {t.sent_by === "none" && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">Codes cannot be sent yet, so this cannot be turned on. The platform team needs to set up SMS (and the Sign-in code template under Communication) or email.</p>}
          {!t.required_by_platform && (
            <button type="button" className={t.own_setting ? btnGhost : btnPrimary} disabled={act.busy || (!t.own_setting && t.sent_by === "none")}
              onClick={() => act.run(() => authFetch("/two-factor", send("PUT", { enabled: !t.own_setting })))}>
              {t.own_setting ? "Turn off for my account" : "Turn on for my account"}
            </button>
          )}
        </div>
      </Panel>
      <Panel title="Trusted devices" sub="Devices that skip the code for 30 days after you ticked “Trust this device”.">
        <ErrorBanner message={devices.error} />
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Device</Th><Th>Added</Th><Th>Last used</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!devices.data?.devices.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">{devices.loading ? "Loading…" : "No trusted devices."}</td></tr>}
            {devices.data?.devices.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 text-slate-800">{device(d.label)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(d.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{d.last_used_at ? fmtDate(d.last_used_at) : "Never"}</td>
                <td className="px-4 py-3 text-right"><button type="button" className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" disabled={act.busy} onClick={() => act.run(() => authFetch(`/two-factor/devices/${d.id}`, { method: "DELETE" }))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

interface Activity {
  events: { id: string; success: boolean; reason: string; ip_address: string | null; user_agent: string | null; created_at: string }[];
  sessions: { session_id: string; ip_address: string | null; user_agent: string | null; created_at: string; last_seen_at: string }[];
  current_session_id: string | null;
}
const reasons: Record<string, string> = { ok: "Signed in", bad_password: "Wrong password", locked: "Account locked", suspended: "Account turned off", school_inactive: "School not active", unknown_email: "No such account", sign_out: "Signed out", code_sent: "Code sent", code_failed: "Wrong code" };

function Activity() {
  const { data, error, loading, reload } = useLoad(() => authFetch<Activity>("/my-activity"), []);
  const act = useAction(reload);
  return (
    <div className="space-y-6">
      <ErrorBanner message={error || act.error} />
      <Panel title="Where you are signed in" sub="End any you do not recognise." right={<button type="button" className={btnGhost} onClick={reload}>Refresh</button>}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Device</Th><Th>Signed in</Th><Th>Last active</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.sessions.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">{loading ? "Loading…" : "No tracked sessions."}</td></tr>}
            {data?.sessions.map((s) => (
              <tr key={s.session_id}>
                <td className="px-4 py-3 text-slate-800">{device(s.user_agent)}<span className="block text-xs text-slate-400">{s.ip_address}</span>{s.session_id === data.current_session_id && <Badge tone="green">This device</Badge>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(s.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(s.last_seen_at)}</td>
                <td className="px-4 py-3 text-right">{s.session_id !== data.current_session_id && <button type="button" className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50" disabled={act.busy} onClick={() => window.confirm("End this session?") && act.run(() => authFetch(`/my-activity/sessions/${s.session_id}/end`, send("POST", {})))}>End session</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Recent sign-ins" sub="The last 30 attempts on your account">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Result</Th><Th>From</Th><Th>When</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data?.events.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5"><Badge tone={e.success ? "green" : "red"}>{reasons[e.reason] ?? e.reason}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{device(e.user_agent)} · {e.ip_address}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDate(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
