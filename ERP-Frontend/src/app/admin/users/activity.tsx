"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Pagination, Th, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { deviceName, reasonLabel, small } from "./shared";

interface Ev {
  id: string; email: string; success: boolean; reason: string; ip_address: string | null; user_agent: string | null; created_at: string;
  institutions: { name: string } | null; user_profiles: { first_name: string; last_name: string; roles: { display_name: string } | null } | null;
}
type Hist = Paged<Ev> & { last24h: { signed_in: number; failed: number } };
interface Locked { id: string; email: string; first_name: string; last_name: string; locked_until: string; institutions: { name: string } | null }
interface Sess {
  session_id: string; ip_address: string | null; user_agent: string | null; created_at: string; last_seen_at: string;
  user_profiles: { email: string; first_name: string; last_name: string; roles: { display_name: string } | null; institutions: { name: string } | null } | null;
}

const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

export function LoginActivity() {
  const [part, setPart] = useState<"history" | "failed" | "sessions">("history");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["history", "Login history"], ["failed", "Failed attempts"], ["sessions", "Sessions"]]} />
      {part === "sessions" ? <Sessions /> : <Events failed={part === "failed"} key={part} />}
    </>
  );
}

export function Events({ failed, blockable = false }: { failed: boolean; blockable?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const path = failed ? "failed" : "history";
  const { data, error, loading } = useLoad(() => adminFetch<Hist & { locked?: Locked[] }>(`/login-activity/${path}${qs({ search: q, page })}`), [path, q, page]);
  const locked = useLoad(() => (failed ? adminFetch<Hist & { locked: Locked[] }>("/login-activity/failed?pageSize=1") : Promise.resolve(null)), [failed]);
  const act = useAction(locked.reload);
  const [blockNote, setBlockNote] = useState("");

  return (
    <>
      <ErrorBanner message={error || locked.error || act.error} />
      {blockNote && <p role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{blockNote}</p>}
      {failed && !!locked.data?.locked.length && (
        <div className="mb-6">
          <Panel title="Locked right now" sub="Locked after too many wrong passwords. They unlock by themselves, or you can unlock them.">
            <ul className="divide-y divide-slate-100">
              {locked.data.locked.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span><b className="text-slate-900">{u.first_name} {u.last_name}</b> <span className="text-slate-500">{u.email}{u.institutions ? " · " + u.institutions.name : ""}</span><br /><span className="text-xs text-slate-400">Locked until {fmtDate(u.locked_until)}</span></span>
                  <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/user-directory/${u.id}/state`, json("POST", { state: "unlock" })))}>Unlock</button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <Panel
        title={failed ? "Failed attempts" : "Login history"}
        sub={failed ? "Sign-ins that failed, and accounts that were locked as a result" : "Recent sign-ins across the platform"}
        right={data && <span className="text-xs text-slate-500">Last 24 hours: <b className="text-emerald-700">{data.last24h.signed_in} signed in</b> · <b className="text-rose-700">{data.last24h.failed} failed</b></span>}
      >
        <div className="p-4 pb-0"><input className={`${inputCls} max-w-xs`} placeholder="Search email or address…" aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Who</Th><Th>School</Th><Th>Result</Th><Th>From</Th><Th>When</Th>{blockable && <Th />}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <Empty cols={blockable ? 6 : 5} loading={loading} text={failed ? "No failed attempts." : "No sign-ins recorded yet."} />}
              {data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{e.user_profiles ? `${e.user_profiles.first_name} ${e.user_profiles.last_name}` : e.email}</p><p className="text-xs text-slate-400">{e.user_profiles ? e.email : "No such account"}{e.user_profiles?.roles ? " · " + e.user_profiles.roles.display_name : ""}</p></td>
                  <td className="px-4 py-3 text-slate-600">{e.institutions?.name ?? "Platform"}</td>
                  <td className="px-4 py-3"><Badge tone={e.success ? "green" : e.reason === "locked" ? "red" : "gray"}>{reasonLabel[e.reason] ?? e.reason}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.ip_address ?? "—"}<br />{deviceName(e.user_agent)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(e.created_at)}</td>
                  {blockable && (
                    <td className="px-4 py-3 text-right">
                      {!e.success && e.ip_address && (
                        <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Block ${e.ip_address}? Nobody can sign in from it until you unblock it.`) && act.run(async () => { await adminFetch("/ip-blocklist", json("POST", { cidr: e.ip_address, reason: `Failed sign-ins for ${e.email}` })); setBlockNote(`${e.ip_address} is now blocked.`); })}>Block IP</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </>
  );
}

export function Sessions() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Sess> & { timeout_minutes: number }>(`/login-activity/sessions${qs({ page })}`), [page]);
  const act = useAction(reload);
  return (
    <Panel title="Active sessions" sub={`Who is signed in right now. Sessions idle for more than ${data?.timeout_minutes ?? "…"} minutes end by themselves. End any you do not recognise.`}
      right={<button type="button" className={small} onClick={reload}>Refresh</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Who</Th><Th>Device</Th><Th>Signed in</Th><Th>Last active</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <Empty cols={5} loading={loading} text="No tracked sessions. People appear here when they sign in through the portal." />}
          {data?.items.map((s) => (
            <tr key={s.session_id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{s.user_profiles?.first_name} {s.user_profiles?.last_name}</p><p className="text-xs text-slate-400">{s.user_profiles?.email} · {s.user_profiles?.institutions?.name ?? "Platform"}</p></td>
              <td className="px-4 py-3 text-xs text-slate-600">{deviceName(s.user_agent)}<br />{s.ip_address ?? ""}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(s.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(s.last_seen_at)}</td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("End this session? They will be signed out.") && act.run(() => adminFetch(`/login-activity/sessions/${s.session_id}/end`, json("POST", {})))}>End session</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </Panel>
  );
}
