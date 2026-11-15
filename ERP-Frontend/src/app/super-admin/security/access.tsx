"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type AllowlistEntry } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { Badge, ErrorBanner, Field, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { Sessions } from "../users/activity";
import { deviceName, small } from "../users/shared";

export function AccessControl() {
  const [view, setView] = useState<"sessions" | "devices" | "networks">("sessions");
  return (
    <>
      <Pills label="Access control" value={view} onChange={setView} items={[["sessions", "Sessions"], ["devices", "Devices"], ["networks", "Allowed networks"]]} />
      {view === "sessions" && <SessionsPart />}
      {view === "devices" && <Devices />}
      {view === "networks" && <AllowedNetworks />}
    </>
  );
}

function SessionsPart() {
  const [note, setNote] = useState("");
  const { error, busy, run } = useAction(() => setNote((n) => n));
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" className={btnGhost} disabled={busy} onClick={() => window.confirm("Sign out everyone except you?") && run(async () => {
          const r = await adminFetch<{ ended: number }>("/security/sessions/end-others", json("POST", {}));
          setNote(`Ended ${r.ended} session${r.ended === 1 ? "" : "s"}. They have to sign in again; refresh the list.`);
        })}>End all other sessions</button>
        {note && <span role="status" className="text-sm text-emerald-800">{note}</span>}
      </div>
      <ErrorBanner message={error} />
      <Sessions />
    </>
  );
}

interface Device {
  id: string; label: string | null; created_at: string; last_used_at: string | null; expires_at: string; is_new: boolean;
  user_profiles: { first_name: string; last_name: string; email: string; institution_id: string | null; roles: { display_name: string } | null } | null;
}

function Devices() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ devices: Device[] }>("/security/devices"), []);
  const { error: actionError, busy, run } = useAction(reload);
  return (
    <Panel title="Trusted devices" sub="Devices that skip the sign-in code until they expire. Remove one and its owner has to enter a code again.">
      <div className="p-4 pb-0"><ErrorBanner message={error || actionError} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Person</Th><Th>Device</Th><Th>Trusted</Th><Th>Last used</Th><Th>Until</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.devices.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No trusted devices. A device appears here when someone ticks the remember box while entering a sign-in code."}</td></tr>}
          {data?.devices.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{d.user_profiles ? `${d.user_profiles.first_name} ${d.user_profiles.last_name}` : "—"}</p><p className="text-xs text-slate-400">{d.user_profiles?.email}{d.user_profiles?.roles ? " · " + d.user_profiles.roles.display_name : ""}</p></td>
              <td className="px-4 py-3 text-slate-600">{deviceName(d.label)} {d.is_new && <Badge tone="blue">New</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(d.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{d.last_used_at ? fmtDate(d.last_used_at) : "Not since"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(d.expires_at)}</td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={busy} onClick={() => window.confirm("Remove this device?") && run(() => adminFetch(`/security/devices/${d.id}`, { method: "DELETE" }))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function AllowedNetworks() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ entries: AllowlistEntry[]; yourIp: string }>("/ip-allowlist"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ cidr: "", label: "" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => adminFetch("/ip-allowlist", json("POST", f)))) setF({ cidr: "", label: "" });
  };
  const active = (data?.entries.length ?? 0) > 0;

  return (
    <Panel title="Allowed networks" sub={active ? "Only these addresses can use the admin portal" : "No restriction: any address can use the admin portal"}>
      <div className="space-y-3 p-4 pb-0">
        <ErrorBanner message={error || actionError} />
        <p className="rounded-xl bg-mca-blue-sky/60 px-3 py-2 text-sm text-mca-blue-dark">
          Your current address is <strong>{data?.yourIp ?? "…"}</strong>. The first entry you add switches the restriction on, and it must include your own address so you cannot lock yourself out.
        </p>
      </div>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <div className="w-56"><Field label="Address or range"><input className={inputCls} required placeholder="203.0.113.0/24" value={f.cidr} onChange={(e) => setF({ ...f, cidr: e.target.value })} /></Field></div>
        <div className="w-56"><Field label="Label"><input className={inputCls} placeholder="Head office" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field></div>
        <button type="submit" className={btnPrimary} disabled={busy}>Add</button>
        {data && !data.entries.length && (
          <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => adminFetch("/ip-allowlist", json("POST", { cidr: data.yourIp, label: "My current address" })))}>Allow only my address</button>
        )}
      </form>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Address</Th><Th>Label</Th><Th>Added</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.entries.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No entries."}</td></tr>}
          {data?.entries.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3 font-mono text-xs font-semibold">{e.cidr}</td>
              <td className="px-4 py-3 text-slate-600">{e.label || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(e.created_at)}</td>
              <td className="px-4 py-3 text-right"><button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm(`Remove ${e.cidr}?`) && run(() => adminFetch(`/ip-allowlist/${e.id}`, { method: "DELETE" }))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
