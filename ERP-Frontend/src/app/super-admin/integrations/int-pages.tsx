"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type ApiKeyRow, type DeliveryRow, type WebhookRow } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Labelled, ToggleRow, small, smallPrimary } from "../schools/pages/shared";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
};
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Note = ({ title, text }: { title: string; text: string }) => <Panel title={title}><p className="px-5 py-8 text-sm text-slate-500">{text}</p></Panel>;

type Service = "razorpay" | "sms" | "whatsapp" | "email";
interface Detail { key: Service; configured: boolean; mode: string | null; fields: { label: string; value: string }[]; stats: { label: string; value: string; sub?: string }[]; env: string[]; canTest: boolean; testNote?: string }
interface Test { ok: boolean; ms: number; message: string }
const useDetail = (s: Service) => useLoad(() => adminFetch<Detail>(`/integrations/services/${s}`), [s]);

function ServicePanel({ service, title, only }: { service: Service; title: string; only?: string[] }) {
  const { data, error } = useDetail(service);
  const [res, setRes] = useState<Test | null>(null);
  const act = useAction(() => undefined);
  const fields = (data?.fields ?? []).filter((f) => !only || only.includes(f.label));
  const test = () => act.run(async () => setRes(await adminFetch<Test>(`/integrations/services/${service}/test`, json("POST", {})).catch((e) => ({ ok: false, ms: 0, message: e instanceof Error ? e.message : "The test failed." }))));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      {data && <Tiles items={[{ label: "Status", value: data.configured ? "Connected" : "Not connected", sub: data.mode ? `${data.mode} mode` : undefined }, ...data.stats.slice(0, 2).map((s) => ({ label: s.label, value: s.value, sub: s.sub }))]} />}
      <Panel title={title}>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => <Labelled key={f.label} label={f.label}><input className={inputCls} readOnly disabled value={f.value} /></Labelled>)}
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Connection</p><p className="text-xs text-slate-500">{res ? `${res.message}${res.ok ? ` (${res.ms} ms)` : ""}` : data?.testNote ?? "Check that the platform can reach the service"}</p></div>
          <button type="button" className={small} disabled={act.busy || !data?.canTest || !data?.configured} onClick={test}>{service === "sms" ? "Send test" : "Test connection"}</button>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Keys and passwords are set in the backend <code className="rounded bg-slate-100 px-1">{(data?.env ?? []).join(", ") || ".env"}</code> and are never shown or edited in the browser.</p>
      </Panel>
    </div>
  );
}

// ── payment ──
export type PayTab = "razorpay" | "other";
export function PaymentIntegration({ tab }: { tab: PayTab }) {
  if (tab === "razorpay") return <ServicePanel service="razorpay" title="Razorpay" />;
  const { data } = useDetail("razorpay");
  const card = (code: string, name: string, sub: string, ok: boolean, hint?: string) => (
    <div key={code} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#dceff9] text-xs font-bold text-[#026f9b]">{code}</span><div><p className="text-[13.5px] font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500">{sub}</p></div></div>
      {hint && <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{hint}</p>}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">{ok ? <Chip tone="good">Connected</Chip> : <Chip tone="mute">Not connected</Chip>}<button type="button" disabled title="Not available yet" className={ok ? small : smallPrimary}>{ok ? "Settings" : "Connect"}</button></div>
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {card("CF", "Cashfree", "Backup gateway · UPI, cards, EMI", false)}
      {card("PU", "PayU", "Cards and net banking", false)}
      {card("PP", "PhonePe PG", "UPI-first checkout", false)}
      {card("BT", "Bank transfer", "NEFT / RTGS · manual reconciliation", true)}
      {data && null}
    </div>
  );
}

export const SmsIntegration = () => <ServicePanel service="sms" title="MSG91" />;
export const WhatsappIntegration = () => <ServicePanel service="whatsapp" title="WhatsApp Business API" />;

// ── email ──
export type EmailTab = "smtp" | "provider";
export function EmailIntegration({ tab }: { tab: EmailTab }) {
  if (tab === "smtp") return <ServicePanel service="email" title="SMTP server" />;
  return <EmailProvider />;
}
function EmailProvider() {
  const dns = useLoad(() => adminFetch<{ domain: string | null; checks: { name: string; status: "Verified" | "Missing" | "Unknown"; detail: string }[] }>("/integrations/email-dns"), []);
  const set = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const [track, setTrack] = useState(true);
  const [saved, setSaved] = useState(false);
  const act = useAction(set.reload);
  useEffect(() => { if (set.data) setTrack(set.data.settings["communication.track_email_opens"] !== false); }, [set.data]);
  const tone = { Verified: "good", Missing: "bad", Unknown: "mute" } as const;
  return (
    <div className="space-y-5">
      <ErrorBanner message={dns.error || set.error || act.error} />
      <Panel title="Email provider" right={<button type="button" className={small} onClick={dns.reload}>Check again</button>}>
        <p className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600">Sending domain: <b className="text-slate-900">{dns.data?.domain ?? "not set"}</b></p>
        {(dns.data?.checks ?? []).map((c) => (
          <div key={c.name} className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.detail}</p></div><Chip tone={tone[c.status]}>{c.status}</Chip></div>
        ))}
        {!dns.data?.checks.length && <p className="px-5 py-6 text-sm text-slate-500">{dns.loading ? "Checking…" : "Set the sender address first (Settings › Email & SMS)."}</p>}
        <ToggleRow label="Track opens" checked={track} onChange={(v) => { setTrack(v); setSaved(false); }} />
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
          {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
          <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => set.data && setTrack(set.data.settings["communication.track_email_opens"] !== false)}>Discard</button>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch("/settings", json("PUT", { values: { "communication.track_email_opens": track } })))) setSaved(true); }}>Save provider settings</button>
        </div>
      </Panel>
    </div>
  );
}

// ── maps / biometric ──
export function MapsIntegration({ tab }: { tab: "api" | "tracking" }) {
  return tab === "api" ? <Note title="Maps API" text="A maps service isn't connected yet. It's needed for the Transport module's routes, stops and live bus tracking, which isn't built." /> : <Note title="Vehicles" text="Vehicle tracking isn't available yet. GPS devices appear here once the Transport module is built and buses report their position." />;
}
export const BiometricIntegration = () => <Note title="Devices" text="Biometric devices aren't connected yet. They appear here once the Attendance module supports fingerprint and face devices." />;

// ── API management ──
export type ApiTab = "keys" | "webhooks" | "logs";
export function ApiManagement({ tab }: { tab: ApiTab }) {
  return tab === "keys" ? <Keys /> : tab === "webhooks" ? <Hooks /> : <Logs />;
}

function Keys() {
  const keys = useLoad(() => adminFetch<{ keys: ApiKeyRow[] }>("/integrations/api-keys"), []);
  const meta = useLoad(() => adminFetch<{ events: string[]; scopes: string[] }>("/integrations/meta"), []);
  const act = useAction(keys.reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ApiKeyRow | null>(null);
  const [f, setF] = useState({ name: "", scopes: [] as string[] });
  const [made, setMade] = useState("");
  useEffect(() => { const h = (e: Event) => { if ((e as CustomEvent).detail === "integrations/api") { setF({ name: "", scopes: [] }); setMade(""); setOpen(true); } }; window.addEventListener("mca-cta", h); return () => window.removeEventListener("mca-cta", h); }, []);
  const rows = (keys.data?.keys ?? []).filter((k) => has(k.name, search));
  const masked = (k: ApiKeyRow) => `${k.key_prefix}_••••••••${k.key_last4}`;
  return (
    <div className="space-y-5">
      <ErrorBanner message={keys.error || meta.error || act.error} />
      <Panel title="API keys" sub={`${rows.length} keys`} right={<ExportPrint name="api-keys" head={["Name", "Key", "Scope", "Last used", "Status"]} rows={rows.map((k) => [k.name, masked(k), k.scopes.join(", "), k.last_used_at?.slice(0, 10), k.status])} />}>
        <Search v={search} set={setSearch} label="Search api keys" />
        <SimpleTable head={[{ h: "Name" }, { h: "Key" }, { h: "Scope" }, { h: "Last used" }, { h: "Status" }, { h: "" }]} empty={keys.loading ? "Loading…" : "No API keys yet."}
          rows={rows.map((k) => [<b key="n" className="font-semibold text-slate-900">{k.name}</b>, <span key="k" className="font-mono text-xs">{masked(k)}</span>, k.scopes.join(", "), when(k.last_used_at), <Chip key="s" tone={k.status === "active" ? "good" : "mute"}>{k.status === "active" ? "Active" : "Revoked"}</Chip>,
            <span key="a" className="flex gap-1.5">{k.status === "active" && <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400" disabled={act.busy} onClick={() => window.confirm(`Revoke "${k.name}"? Apps using it stop working.`) && act.run(() => adminFetch(`/integrations/api-keys/${k.id}/revoke`, json("POST", {})))}>Revoke</button>}<button type="button" className={small} onClick={() => setView(k)}>View details</button></span>])} />
      </Panel>
      <Modal open={open} title="Generate API key" onClose={() => setOpen(false)}>
        {made ? (
          <div className="space-y-3"><p role="status" className="break-all rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">{made}</p><p className="text-xs text-slate-500">Copy it now: it is shown only once.</p><Footer on={() => setOpen(false)} /></div>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await act.run(async () => { const r = await adminFetch<{ key: string }>("/integrations/api-keys", json("POST", f)); setMade(r.key); }); }}>
            <Labelled label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
            <fieldset><legend className="mb-1 text-[12.5px] font-medium text-slate-900">Scope</legend><div className="flex flex-wrap gap-3">{meta.data?.scopes.map((s) => <label key={s} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={f.scopes.includes(s)} onChange={() => setF({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] })} />{s}</label>)}</div></fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy || !f.scopes.length}>Generate key</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Key" v={masked(view)} /><Row k="Scope" v={view.scopes.join(", ")} /><Row k="Created" v={fmtDay(view.created_at.slice(0, 10))} /><Row k="Last used" v={when(view.last_used_at)} /><Row k="Calls" v={String(view.use_count)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

function Hooks() {
  const hooks = useLoad(() => adminFetch<{ webhooks: WebhookRow[] }>("/integrations/webhooks"), []);
  const meta = useLoad(() => adminFetch<{ events: string[]; scopes: string[] }>("/integrations/meta"), []);
  const act = useAction(hooks.reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WebhookRow | null>(null);
  const [f, setF] = useState({ url: "", events: [] as string[] });
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { const h = (e: Event) => { if ((e as CustomEvent).detail === "integrations/webhooks") { setF({ url: "", events: [] }); setSecret(""); setOpen(true); } }; window.addEventListener("mca-cta", h); return () => window.removeEventListener("mca-cta", h); }, []);
  const rows = (hooks.data?.webhooks ?? []).filter((h) => has(h.url, search));
  const test = (h: WebhookRow) => act.run(async () => { const r = await adminFetch<{ success: boolean; status_code: number | null; error: string | null }>(`/integrations/webhooks/${h.id}/test`, json("POST", {})); setNote(r.success ? `Test delivered (${r.status_code}).` : `Test failed: ${r.error ?? r.status_code}`); });
  return (
    <div className="space-y-5">
      <ErrorBanner message={hooks.error || meta.error || act.error} />
      {note && <p role="status" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">{note}</p>}
      <Panel title="Webhooks" sub={`${rows.length} endpoints`} right={<ExportPrint name="webhooks" head={["Endpoint", "Events", "Last delivery"]} rows={rows.map((h) => [h.url, h.events.join(", "), h.last_delivery ? (h.last_delivery.success ? "Success" : "Failed") : ""])} />}>
        <Search v={search} set={setSearch} label="Search webhooks" />
        <SimpleTable head={[{ h: "Endpoint" }, { h: "Events" }, { h: "Last delivery" }, { h: "" }]} empty={hooks.loading ? "Loading…" : "No webhooks yet."}
          rows={rows.map((h) => [h.url, h.events.join(", "), h.last_delivery ? <Chip key="l" tone={h.last_delivery.success ? "good" : "bad"}>{h.last_delivery.success ? "Success" : "Failed"}</Chip> : "—", <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => test(h)}>Send test</button><button type="button" className={small} onClick={() => setView(h)}>View details</button></span>])} />
      </Panel>
      <Modal open={open} title="Add webhook" onClose={() => setOpen(false)}>
        {secret ? <div className="space-y-3"><p role="status" className="break-all rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">{secret}</p><p className="text-xs text-slate-500">This signing secret is shown only once.</p><Footer on={() => setOpen(false)} /></div> : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await act.run(async () => { const r = await adminFetch<{ secret: string }>("/integrations/webhooks", json("POST", { url: f.url, events: f.events })); setSecret(r.secret); }); }}>
            <Labelled label="Endpoint"><input className={inputCls} required placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Labelled>
            <fieldset><legend className="mb-1 text-[12.5px] font-medium text-slate-900">Events</legend><div className="flex flex-wrap gap-3">{meta.data?.events.map((s) => <label key={s} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={f.events.includes(s)} onChange={() => setF({ ...f, events: f.events.includes(s) ? f.events.filter((x) => x !== s) : [...f.events, s] })} />{s}</label>)}</div></fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy || !f.events.length}>Add webhook</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!view} title={view?.url ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Events" v={view.events.join(", ")} /><Row k="Active" v={<Toggle checked={view.active} disabled={act.busy} label="Active" onChange={(v) => act.run(async () => { await adminFetch(`/integrations/webhooks/${view.id}`, json("PATCH", { active: v })); setView({ ...view, active: v }); })} />} /></dl><div className="mt-3 flex gap-2"><button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("Delete this webhook and its history?") && act.run(async () => { await adminFetch(`/integrations/webhooks/${view.id}`, { method: "DELETE" }); setView(null); })}>Delete</button></div><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

interface Del extends DeliveryRow { webhook?: string }
function Logs() {
  const all = useLoad(() => adminFetch<{ deliveries: (Del & { webhook_url?: string; webhooks?: { url: string } | null })[] }>("/integrations/deliveries"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<NonNullable<typeof all.data>["deliveries"][number] | null>(null);
  const url = (d: NonNullable<typeof all.data>["deliveries"][number]) => d.webhook_url ?? d.webhooks?.url ?? "webhook";
  const rows = (all.data?.deliveries ?? []).filter((d) => has(`${d.event} ${url(d)}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={all.error} />
      <Panel title="Webhook log" sub={`${rows.length} calls`} right={<ExportPrint name="webhook-log" head={["Time", "Event", "Endpoint", "Status", "Time taken"]} rows={rows.map((d) => [d.attempted_at, d.event, url(d), d.status_code, d.duration_ms])} />}>
        <Search v={search} set={setSearch} label="Search webhook log" />
        <SimpleTable head={[{ h: "Time" }, { h: "Event" }, { h: "Endpoint" }, { h: "Status" }, { h: "Time taken" }, { h: "" }]} empty={all.loading ? "Loading…" : "No deliveries yet."}
          rows={rows.map((d) => [when(d.attempted_at), <Tag key="e">{d.event}</Tag>, url(d), <Chip key="s" tone={d.success ? "good" : "warn"}>{d.status_code ?? "—"}</Chip>, d.duration_ms != null ? `${d.duration_ms} ms` : "—", <button key="v" type="button" className={small} onClick={() => setView(d)}>View details</button>])} />
      </Panel>
      <p className="text-xs text-slate-500">Calls made to the platform&apos;s own API aren&apos;t logged yet; this lists the webhook deliveries it sends.</p>
      <Modal open={!!view} title={view?.event ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Endpoint" v={url(view)} /><Row k="Status" v={String(view.status_code ?? "—")} /><Row k="Result" v={view.success ? "Delivered" : view.error ?? "Failed"} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}
