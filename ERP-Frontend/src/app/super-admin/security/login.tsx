"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { ErrorBanner, Field, Th, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { Events } from "../users/activity";
import { small } from "../users/shared";

export function LoginSecurity() {
  const [view, setView] = useState<"history" | "failed" | "blocked">("history");
  return (
    <>
      <Pills label="Login security" value={view} onChange={setView} items={[["history", "Login history"], ["failed", "Failed logins"], ["blocked", "Blocked addresses"]]} />
      {view === "blocked" ? <Blocked /> : <Events key={view} failed={view === "failed"} blockable={view === "failed"} />}
    </>
  );
}

interface Block { id: string; cidr: string; reason: string | null; created_at: string }

function Blocked() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ entries: Block[] }>("/ip-blocklist"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ cidr: "", reason: "" });
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => adminFetch("/ip-blocklist", json("POST", f)))) setF({ cidr: "", reason: "" });
  };
  return (
    <Panel title="Blocked addresses" sub="Nobody can sign in or use the admin portal from these addresses. You can block one straight from Failed logins.">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <div className="w-56"><Field label="Address or range"><input className={inputCls} required placeholder="198.51.100.7 or 198.51.100.0/24" value={f.cidr} onChange={(e) => setF({ ...f, cidr: e.target.value })} /></Field></div>
        <div className="w-64"><Field label="Reason"><input className={inputCls} maxLength={200} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field></div>
        <button type="submit" className={btnPrimary} disabled={busy}>Block</button>
      </form>
      <div className="p-4 pb-0"><ErrorBanner message={error || actionError} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Address</Th><Th>Reason</Th><Th>Blocked</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.entries.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No addresses are blocked."}</td></tr>}
          {data?.entries.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3 font-mono text-xs font-semibold">{b.cidr}</td>
              <td className="px-4 py-3 text-slate-600">{b.reason || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(b.created_at)}</td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={busy} onClick={() => window.confirm(`Unblock ${b.cidr}?`) && run(() => adminFetch(`/ip-blocklist/${b.id}`, { method: "DELETE" }))}>Unblock</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
