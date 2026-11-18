"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, qs, type BackupInfo, type Paged } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { small } from "../schools/pages/shared";
import { deviceName } from "../users/shared";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const Note = ({ title, text }: { title: string; text: string }) => <Panel title={title}><p className="px-5 py-8 text-sm text-slate-500">{text}</p></Panel>;
const danger = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";

// ═════════════ Access control ═════════════
export type AccessTab = "sessions" | "devices";
interface Sess { session_id: string; ip_address: string | null; user_agent: string | null; created_at: string; last_seen_at: string; is_current: boolean; user_profiles: { first_name: string; last_name: string; roles: { display_name: string } | null; institutions: { name: string } | null } | null }
interface Dev { id: string; label: string | null; created_at: string; last_used_at: string | null; is_new: boolean; user_profiles: { first_name: string; last_name: string; email: string; roles: { display_name: string } | null } | null }

export function AccessControlPages({ tab, onEndOthers }: { tab: AccessTab; onEndOthers?: () => void }) {
  void onEndOthers;
  return tab === "sessions" ? <Sessions /> : <Devices />;
}

function Sessions() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Sess> & { timeout_minutes: number }>(`/login-activity/sessions${qs({ pageSize: 100 })}`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Sess | null>(null);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "security/access") { if (window.confirm("End every open session except yours? Everyone else will be signed out.")) void act.run(() => adminFetch("/login-activity/sessions/end-others", json("POST", {}))); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const timeout = data?.timeout_minutes ?? 480;
  const idle = (s: Sess) => Date.now() - new Date(s.last_seen_at).getTime() > 30 * 60_000;
  const rows = (data?.items ?? []).filter((s) => has(`${s.user_profiles?.first_name} ${s.user_profiles?.last_name} ${s.ip_address ?? ""}`, search));
  const name = (s: Sess) => `${s.user_profiles?.first_name ?? ""} ${s.user_profiles?.last_name ?? ""}`.trim();
  const state = (s: Sess): [string, "info" | "good" | "mute"] => (s.is_current ? ["This device", "info"] : idle(s) ? ["Idle", "mute"] : ["Active", "good"]);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Sessions" sub={`${rows.length} sessions`} right={<ExportPrint name="sessions" head={["User", "Device", "IP address", "Started", "State"]} rows={rows.map((s) => [name(s), deviceName(s.user_agent), s.ip_address, when(s.created_at), state(s)[0]])} />}>
        <Search v={search} set={setSearch} label="Search sessions" />
        <SimpleTable head={[{ h: "User" }, { h: "Device" }, { h: "Location" }, { h: "IP address" }, { h: "Started" }, { h: "State" }, { h: "" }]} empty={loading ? "Loading…" : "No tracked sessions."}
          rows={rows.map((s) => [<div key="u"><p className="font-semibold text-slate-900">{name(s)}</p><p className="text-xs text-slate-400">{s.user_profiles?.roles?.display_name}{s.user_profiles?.institutions ? ` · ${s.user_profiles.institutions.name}` : ""}</p></div>, deviceName(s.user_agent), "—", s.ip_address ?? "—", when(s.created_at), <Chip key="c" tone={state(s)[1]}>{state(s)[0]}</Chip>,
            <span key="a" className="flex gap-1.5">{!s.is_current && <button type="button" className={danger} disabled={act.busy} onClick={() => window.confirm("End this session? They will be signed out.") && act.run(() => adminFetch(`/login-activity/sessions/${s.session_id}/end`, json("POST", {})))}>End</button>}<button type="button" className={small} onClick={() => setView(s)}>View details</button></span>])} />
      </Panel>
      <p className="text-xs text-slate-500">Sessions idle for more than {timeout} minutes end by themselves.</p>
      <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Device" v={deviceName(view.user_agent)} /><Row k="IP address" v={view.ip_address ?? "—"} /><Row k="Started" v={when(view.created_at)} /><Row k="Last active" v={when(view.last_seen_at)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

function Devices() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ devices: Dev[] }>("/security/devices"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Dev | null>(null);
  const rows = (data?.devices ?? []).filter((d) => has(`${d.user_profiles?.first_name} ${d.user_profiles?.last_name} ${d.label ?? ""}`, search));
  const name = (d: Dev) => `${d.user_profiles?.first_name ?? ""} ${d.user_profiles?.last_name ?? ""}`.trim();
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Devices" sub={`${rows.length} devices`} right={<ExportPrint name="devices" head={["Person", "Device", "Trust", "Last used"]} rows={rows.map((d) => [name(d), d.label, d.is_new ? "New" : "Trusted", when(d.last_used_at ?? d.created_at)])} />}>
        <Search v={search} set={setSearch} label="Search devices" />
        <SimpleTable head={[{ h: "Person" }, { h: "Device" }, { h: "Location" }, { h: "Trust" }, { h: "Last used" }, { h: "" }]} empty={loading ? "Loading…" : "No remembered devices."}
          rows={rows.map((d) => [<b key="p" className="font-semibold text-slate-900">{name(d)}</b>, d.label ?? "—", "—", <Chip key="t" tone={d.is_new ? "warn" : "good"}>{d.is_new ? "New" : "Trusted"}</Chip>, when(d.last_used_at ?? d.created_at),
            <span key="a" className="flex gap-1.5"><button type="button" className={danger} disabled={act.busy} onClick={() => window.confirm("Remove this device? The person will be asked for a code next time.") && act.run(() => adminFetch(`/security/devices/${d.id}`, { method: "DELETE" }))}>Remove</button><button type="button" className={small} onClick={() => setView(d)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Email" v={view.user_profiles?.email ?? "—"} /><Row k="Device" v={view.label ?? "—"} /><Row k="Added" v={when(view.created_at)} /><Row k="Last used" v={when(view.last_used_at)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Backups ═════════════
export type BackupTab = "schedule" | "history";
export function BackupPages({ tab }: { tab: BackupTab }) {
  const { data, error } = useLoad(() => adminFetch<BackupInfo>("/backups"), []);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Note title={tab === "schedule" ? "Backup schedule" : "Backups"} text={`${data?.note ?? "Backups are run by the database provider."} The platform doesn't run or list backups itself, so there is no schedule to edit and no history to show here.`} />
      {data && <p className="text-xs text-slate-500">Provider: {data.provider}</p>}
    </div>
  );
}

// ═════════════ Retention ═════════════
export type RetentionTab = "policies" | "archive";
interface Status { login_events: { days: number }; audit_logs: { days: number } }
const FIXED = [["Student records", "Never removed by the platform", "Each school owns its student data."], ["Invoices and payments", "Never removed", "Needed for tax rules."], ["Support tickets", "Never removed", "Kept as the history of each school's requests."]];

export function RetentionPages({ tab }: { tab: RetentionTab }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Status>("/security/retention"), []);
  const act = useAction(reload);
  const [d, setD] = useState({ audit: "", login: "" });
  const [saved, setSaved] = useState(false);
  const reset = () => data && setD({ audit: String(data.audit_logs.days), login: String(data.login_events.days) });
  useEffect(() => { reset(); setSaved(false); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (tab === "archive") return <Note title="Archive" text="Nothing is archived yet. Records are either kept or deleted when their time is up; there is no separate archive." />;
  const days = (v: string, k: "audit" | "login") => <span key={k} className="flex items-center gap-2"><input type="number" min={30} className={`${inputCls} !w-24`} aria-label={`${k} days`} value={v} onChange={(e) => { setD({ ...d, [k]: e.target.value }); setSaved(false); }} /><span className="text-xs text-slate-500">days</span></span>;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <form className="rounded-2xl border border-slate-200 bg-white" onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch("/security/retention", json("PUT", { login_events_days: Number(d.login), audit_logs_days: Number(d.audit) })))) setSaved(true); }}>
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Retention policies</h2></div>
        <SimpleTable head={[{ h: "Data" }, { h: "Keep for" }, { h: "Then" }, { h: "Why" }]} empty={loading ? "Loading…" : ""}
          rows={[
            [<b key="a" className="font-semibold text-slate-900">Audit logs</b>, days(d.audit, "audit"), "Delete", "Internal policy"],
            [<b key="l" className="font-semibold text-slate-900">Sign-in history</b>, days(d.login, "login"), "Delete", "—"],
            ...FIXED.map(([w, p, y]) => [<b key={w} className="font-semibold text-slate-900">{w}</b>, p, "Keep", y]),
          ]} />
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
          {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
          <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { reset(); setSaved(false); }}>Discard</button>
          <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save policies</button>
        </div>
      </form>
    </div>
  );
}
