"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { Badge, ErrorBanner, Th, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

type View = "password" | "mfa" | "sessions";
type Item =
  | { key: string; label: string; hint: string; type: "number"; min?: number; max?: number }
  | { key: string; label: string; hint: string; type: "bool" }
  | { key: string; label: string; hint: string; type: "select"; options: [string, string][] };

const GROUPS: Record<View, { title: string; sub: string; items: Item[] }> = {
  password: {
    title: "Password policy",
    sub: "Applies when a password is set or changed. Existing passwords keep working until they are changed.",
    items: [
      { key: "security.min_password_length", label: "Minimum length", hint: "In characters.", type: "number", min: 8, max: 64 },
      { key: "security.password_require_number", label: "Needs a number", hint: "", type: "bool" },
      { key: "security.password_require_symbol", label: "Needs a symbol", hint: "Like # or @.", type: "bool" },
      { key: "security.password_block_common", label: "Block common passwords", hint: "Like password123, and passwords that are just the person's own name or email.", type: "bool" },
      { key: "security.max_failed_logins", label: "Lock the account after", hint: "Wrong passwords in a row.", type: "number", min: 3, max: 20 },
      { key: "security.lockout_minutes", label: "Locked for", hint: "Minutes. An administrator can unlock sooner.", type: "number", min: 1, max: 1440 },
    ],
  },
  mfa: {
    title: "Two-factor sign-in",
    sub: "A 6-digit code, sent to the person's mobile number (or email when SMS is not set up), after the password.",
    items: [
      { key: "security.require_2fa_staff", label: "Platform team", hint: "Required for everyone on the team. It cannot be switched on until a code can be delivered.", type: "bool" },
      { key: "security.require_2fa_school_admins", label: "School administrators", hint: "Recommended for schools that collect fees online.", type: "bool" },
      { key: "security.remember_device_days", label: "Remember a device for", hint: "Days. 0 asks for a code at every sign-in.", type: "select", options: [["0", "Never"], ["7", "7 days"], ["30", "30 days"], ["90", "90 days"]] },
    ],
  },
  sessions: {
    title: "Sessions",
    sub: "How long a signed-in person can stay idle, and how many sessions they can have.",
    items: [
      { key: "security.session_timeout_minutes", label: "Sign out after being idle for", hint: "Minutes, for everyone. 15 to 10,080 (a week).", type: "number", min: 15, max: 10080 },
      { key: "security.single_session_staff", label: "One session per person (platform team)", hint: "Signing in somewhere new signs the team member out everywhere else.", type: "bool" },
    ],
  },
};

export function SecuritySettings() {
  const [view, setView] = useState<View>("password");
  return (
    <>
      <Pills label="Security settings" value={view} onChange={setView} items={[["password", "Password policy"], ["mfa", "Two-factor"], ["sessions", "Session timeout"]]} />
      <Group key={view} view={view} />
      {view === "mfa" && <TeamCoverage />}
    </>
  );
}

function Group({ view }: { view: View }) {
  const g = GROUPS[view];
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [saved, setSaved] = useState(false);
  const { error: actionError, busy, run } = useAction(reload);

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(g.items.map((i) => [i.key, i.type === "bool" ? data.settings[i.key] === true : String(data.settings[i.key] ?? "")])));
  }, [data, g.items]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const values = Object.fromEntries(g.items.map((i) => [i.key, i.type === "bool" ? draft[i.key] === true : Number(draft[i.key])]));
    if (await run(() => adminFetch("/settings", json("PUT", { values })))) setSaved(true);
  };

  return (
    <Panel title={g.title} sub={g.sub}>
      <form onSubmit={save} className="space-y-4 p-5">
        <ErrorBanner message={error || actionError} />
        {g.items.map((i) => (
          <div key={i.key} className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{i.label}</p>
              {i.hint && <p className="text-xs text-slate-500">{i.hint}</p>}
            </div>
            {i.type === "bool" ? (
              <input type="checkbox" role="switch" className="size-5 accent-mca-blue" aria-label={i.label} checked={draft[i.key] === true} onChange={(e) => setDraft({ ...draft, [i.key]: e.target.checked })} />
            ) : i.type === "select" ? (
              <select className={`${inputCls} w-40`} aria-label={i.label} value={String(draft[i.key] ?? "")} onChange={(e) => setDraft({ ...draft, [i.key]: e.target.value })}>
                {i.options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
              </select>
            ) : (
              <input type="number" min={i.min} max={i.max} className={`${inputCls} w-32`} aria-label={i.label} value={String(draft[i.key] ?? "")} onChange={(e) => setDraft({ ...draft, [i.key]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
          <button type="submit" className={btnPrimary} disabled={busy || !data}>Save</button>
        </div>
      </form>
    </Panel>
  );
}

interface Person { id: string; first_name: string; last_name: string; email: string; has_phone: boolean; code_on: boolean; last_login_at: string | null; roles: { display_name: string } }

function TeamCoverage() {
  const { data, error, loading } = useLoad(() => adminFetch<{ required: boolean; people: Person[] }>("/security/mfa"), []);
  return (
    <div className="mt-4">
      <Panel title="Platform team and sign-in codes" sub="Who gets a code at sign-in, and whether it can reach them.">
        <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Person</Th><Th>Role</Th><Th>Code at sign-in</Th><Th>Mobile number</Th><Th>Last sign-in</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.people.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No team members."}</td></tr>}
            {data?.people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-400">{p.email}</p></td>
                <td className="px-4 py-3 text-slate-600">{p.roles.display_name}</td>
                <td className="px-4 py-3">{p.code_on ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}</td>
                <td className="px-4 py-3">{p.has_phone ? <Badge tone="green">Set</Badge> : <Badge tone={p.code_on ? "red" : "gray"}>{p.code_on ? "Missing: code goes to email" : "Not set"}</Badge>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{p.last_login_at ? fmtDate(p.last_login_at) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
