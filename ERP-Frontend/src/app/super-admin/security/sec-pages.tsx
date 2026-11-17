"use client";

import { useState } from "react";
import { adminFetch, json, qs, type AuditLog, type Paged } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, Pagination, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { small } from "../schools/pages/shared";
import { deviceName, reasonLabel } from "../users/shared";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;

export type LoginTab = "history" | "failed";
interface Ev { id: string; email: string; success: boolean; reason: string; ip_address: string | null; user_agent: string | null; created_at: string; institutions: { name: string } | null; user_profiles: { first_name: string; last_name: string; roles: { display_name: string } | null } | null }
interface Res extends Paged<Ev> { locked?: unknown[] }

export function LoginSecurity({ tab }: { tab: LoginTab }) {
  const failed = tab === "failed";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<Ev | null>(null);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Res>(`/login-activity/${failed ? "failed" : "history"}${qs({ search: q, page })}`), [failed, q, page]);
  const act = useAction(reload);
  const items = data?.items ?? [];
  const who = (e: Ev) => (e.user_profiles ? `${e.user_profiles.first_name} ${e.user_profiles.last_name}` : e.email);
  const role = (e: Ev) => e.user_profiles?.roles?.display_name ?? "—";
  const result = (e: Ev): [string, "good" | "bad" | "warn"] => (e.success ? ["Success", "good"] : e.reason === "locked" ? ["Locked", "bad"] : e.reason === "bad_password" ? ["Failed", "bad"] : ["Blocked", "bad"]);
  const block = (e: Ev) => e.ip_address && window.confirm(`Block ${e.ip_address}? Nobody can sign in from it until you unblock it.`) && act.run(() => adminFetch("/ip-blocklist", json("POST", { cidr: e.ip_address, reason: "Blocked from failed sign-ins" })));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={failed ? "Failed sign-ins" : "Sign-ins"} sub={`${data?.total ?? 0} ${failed ? "attempts" : "sign-ins"}`}
        right={<ExportPrint name={failed ? "failed-sign-ins" : "sign-ins"} head={failed ? ["Login", "IP address", "Time", "Reason", "Result"] : ["User", "School", "IP address", "Device", "Result", "Time"]} rows={items.map((e) => failed ? [e.email, e.ip_address, when(e.created_at), reasonLabel[e.reason] ?? e.reason, result(e)[0]] : [who(e), e.institutions?.name, e.ip_address, deviceName(e.user_agent), result(e)[0], when(e.created_at)])} />}>
        <Search v={search} set={setSearch} label={failed ? "Search failed sign-ins" : "Search sign-ins"} />
        <SimpleTable
          head={failed ? [{ h: "Login" }, { h: "IP address" }, { h: "Location" }, { h: "Time" }, { h: "Reason" }, { h: "Result" }, { h: "" }] : [{ h: "User" }, { h: "School" }, { h: "IP address" }, { h: "Device" }, { h: "Result" }, { h: "Time" }, { h: "" }]}
          empty={loading ? "Loading…" : "Nothing here."}
          rows={items.map((e) => failed
            ? [e.email, e.ip_address ?? "—", "—", when(e.created_at), reasonLabel[e.reason] ?? e.reason, <Chip key="r" tone={result(e)[1]}>{result(e)[0]}</Chip>, <span key="a" className="flex gap-1.5">{e.ip_address && <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400" disabled={act.busy} onClick={() => block(e)}>Block IP</button>}<button type="button" className={small} onClick={() => setView(e)}>View details</button></span>]
            : [<div key="u"><p className="font-semibold text-slate-900">{who(e)}</p><p className="text-xs text-slate-400">{role(e)}</p></div>, e.institutions?.name ?? "—", e.ip_address ?? "—", deviceName(e.user_agent), <Chip key="r" tone={result(e)[1]}>{result(e)[0]}</Chip>, when(e.created_at), <button key="v" type="button" className={small} onClick={() => setView(e)}>View details</button>])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={!!view} title={view ? who(view) : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Login" v={view.email} /><Row k="Result" v={reasonLabel[view.reason] ?? view.reason} /><Row k="IP address" v={view.ip_address ?? "—"} /><Row k="Device" v={deviceName(view.user_agent)} /><Row k="Time" v={when(view.created_at)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

export type AuditTab = "activity" | "changes";
const nice = (a: string) => { const t = a.replace(/[._]/g, " ").replace(/\s+/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function AuditLogs({ tab }: { tab: AuditTab }) {
  const changes = tab === "changes";
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AuditLog | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => adminFetch<Paged<AuditLog>>(changes ? `/security/data-changes${qs({ page, pageSize: 25 })}` : `/audit-logs${qs({ search: q, page, pageSize: 25 })}`), [changes, q, page]);
  const all = data?.items ?? [];
  const users = [...new Set(all.map((l) => l.actor_email ?? "System"))];
  const items = all.filter((l) => (!user || (l.actor_email ?? "System") === user) && (!changes || has(`${l.entity_name} ${l.action} ${l.actor_email}`, search)));
  const diffs = (l: AuditLog) => { const a = obj(l.old_data), b = obj(l.new_data); return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => ({ field: k, from: a[k], to: b[k] })); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title={changes ? "Data changes" : "User activity"} sub={`${items.length} events`} right={<ExportPrint name={changes ? "data-changes" : "user-activity"} head={["Time", "User", "Action", "Record", "IP"]} rows={items.map((l) => [l.created_at, l.actor_email ?? "System", nice(l.action), l.entity_name, l.ip_address])} />}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder={changes ? "Search data changes" : "Search user activity"} aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="User" value={user} onChange={(e) => setUser(e.target.value)}><option value="">All users</option>{users.map((u) => <option key={u}>{u}</option>)}</select>
        </div>
        <SimpleTable head={changes ? [{ h: "Time" }, { h: "User" }, { h: "Record" }, { h: "What changed" }, { h: "" }] : [{ h: "Time" }, { h: "User" }, { h: "Action" }, { h: "Record" }, { h: "IP" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing recorded yet."}
          rows={items.map((l) => changes
            ? [when(l.created_at), l.actor_email ?? "System", l.entity_name, <span key="c" className="text-xs">{diffs(l).slice(0, 2).map((d) => `${d.field}: ${show(d.from)} → ${show(d.to)}`).join("; ") || "—"}</span>, <button key="v" type="button" className={small} onClick={() => setView(l)}>View details</button>]
            : [when(l.created_at), l.actor_email ?? "System", <b key="a" className="font-semibold text-slate-900">{nice(l.action)}</b>, l.entity_name, l.ip_address ?? "—", <button key="v" type="button" className={small} onClick={() => setView(l)}>View details</button>])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={!!view} title={view ? nice(view.action) : ""} onClose={() => setView(null)}>{view && <><dl><Row k="User" v={view.actor_email ?? "System"} /><Row k="Record" v={view.entity_name} /><Row k="Time" v={when(view.created_at)} /><Row k="IP" v={view.ip_address ?? "—"} /></dl>{diffs(view).slice(0, 12).map((d) => <p key={d.field} className="mt-1 text-xs"><b className="text-slate-700">{d.field}</b>: <span className="text-rose-700">{show(d.from)}</span> → <span className="text-emerald-700">{show(d.to)}</span></p>)}<Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}
