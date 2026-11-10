"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  adminFetch, json,
  type ApiKeyRow, type DeliveryRow, type ServicesResponse, type WebhookRow,
} from "@/lib/admin-api";
import { Panel, StatGrid, TabBar, num, useAction } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { DeliveryLog, Messaging, ServiceDetail } from "./service-detail";
import { Badge, ErrorBanner, Field, Modal, PageHeader, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

type Tab = "apps" | "payments" | "messaging" | "api";

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>("apps");
  const services = useLoad(() => adminFetch<ServicesResponse>("/integrations/services"), []);
  const s = services.data?.stats;

  return (
    <>
      <PageHeader title="Integrations" subtitle="Services the platform connects to, and keys for your own apps and partners." />
      <ErrorBanner message={services.error} />
      <StatGrid
        items={[
          { label: "Connected services", value: s?.connected ?? 0, sub: `of ${s?.available ?? 0} listed` },
          { label: "Active API keys", value: s?.activeKeys ?? 0 },
          { label: "Webhook endpoints", value: s?.activeWebhooks ?? 0, sub: "Active" },
          { label: "Failed deliveries", value: s?.failedDeliveries24h ?? 0, sub: "Last 24 hours" },
        ]}
      />
      <div className="mt-6">
        <TabBar value={tab} onChange={setTab} tabs={[["apps", "Connected services"], ["payments", "Payments"], ["messaging", "SMS, WhatsApp & email"], ["api", "API & webhooks"]]} />
        {tab === "apps" && <Services data={services.data} />}
        {tab === "payments" && <ServiceDetail service="razorpay" />}
        {tab === "messaging" && <Messaging />}
        {tab === "api" && <ApiTab onChange={services.reload} />}
      </div>
    </>
  );
}

function ApiTab({ onChange }: { onChange: () => void }) {
  const [view, setView] = useState<"keys" | "log">("keys");
  return (
    <>
      <Pills label="API" value={view} onChange={setView} items={[["keys", "Keys & webhooks"], ["log", "Delivery log"]]} />
      {view === "keys" ? <KeysAndHooks onChange={onChange} /> : <DeliveryLog />}
    </>
  );
}

// ── connected services ──────────────────────────────────────
const statusTone = { Connected: "green", "Not configured": "red", Planned: "gray" } as const;

function Services({ data }: { data: ServicesResponse | null }) {
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  const groups = Array.from(new Set(data.services.map((s) => s.group)));
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{g}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.services.filter((s) => s.group === g).map((s) => (
              <div key={s.key} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-mca-blue-sky text-sm font-bold text-mca-blue-shade">{s.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.description}</p></div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                  <Badge tone={statusTone[s.status]}>{s.status === "Planned" ? "Not available yet" : s.status}</Badge>
                  {s.link && <Link href={s.link} className="text-xs font-semibold text-mca-blue hover:underline">Settings</Link>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── API keys and webhooks ───────────────────────────────────
function Secret({ title, value, note, onClose }: { title: string; value: string; note: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="mb-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-800">{value}</code>
        <button type="button" className={btnGhost} onClick={async () => { await navigator.clipboard.writeText(value).catch(() => undefined); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className="text-xs text-amber-900">{note}</p>
      <button type="button" className="text-xs font-semibold text-amber-900 underline" onClick={onClose}>I have saved it</button>
    </div>
  );
}

function KeysAndHooks({ onChange }: { onChange: () => void }) {
  const meta = useLoad(() => adminFetch<{ events: string[]; scopes: string[] }>("/integrations/meta"), []);
  const keys = useLoad(() => adminFetch<{ keys: ApiKeyRow[] }>("/integrations/api-keys"), []);
  const hooks = useLoad(() => adminFetch<{ webhooks: WebhookRow[] }>("/integrations/webhooks"), []);
  const refresh = () => { keys.reload(); hooks.reload(); onChange(); };
  const { error: actionError, busy, run } = useAction(refresh);

  const [secret, setSecret] = useState<{ title: string; value: string; note: string } | null>(null);
  const [keyForm, setKeyForm] = useState<{ name: string; scopes: string[] } | null>(null);
  const [hookForm, setHookForm] = useState<{ id?: string; url: string; description: string; events: string[] } | null>(null);
  const [deliveriesFor, setDeliveriesFor] = useState<WebhookRow | null>(null);
  const [formError, setFormError] = useState("");
  const [note, setNote] = useState("");

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const saveKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyForm) return;
    setFormError("");
    const ok = await run(async () => {
      try {
        const res = await adminFetch<{ key: string }>("/integrations/api-keys", json("POST", keyForm));
        setSecret({ title: "Your new API key", value: res.key, note: "Copy it now. For security it is shown only once and cannot be recovered; if you lose it, revoke it and create another." });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not create the key.");
        throw err;
      }
    });
    if (ok) setKeyForm(null);
  };

  const saveHook = async (e: FormEvent) => {
    e.preventDefault();
    if (!hookForm) return;
    setFormError("");
    const body = { url: hookForm.url, description: hookForm.description || null, events: hookForm.events };
    const ok = await run(async () => {
      try {
        if (hookForm.id) await adminFetch(`/integrations/webhooks/${hookForm.id}`, json("PATCH", body));
        else {
          const res = await adminFetch<{ secret: string }>("/integrations/webhooks", json("POST", body));
          setSecret({ title: "Signing secret for this webhook", value: res.secret, note: "Use it to verify the X-MCA-Signature header on each delivery. It is shown only once; you can rotate it later." });
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not save the webhook.");
        throw err;
      }
    });
    if (ok) setHookForm(null);
  };

  const sendTest = async (h: WebhookRow) => {
    setNote("");
    await run(async () => {
      const r = await adminFetch<{ success: boolean; status_code: number | null; error: string | null }>(`/integrations/webhooks/${h.id}/test`, json("POST", {}));
      setNote(r.success ? `Test delivered (${r.status_code}).` : `Test failed: ${r.error ?? "no answer"}`);
    });
  };

  return (
    <div className="space-y-6">
      <ErrorBanner message={keys.error || hooks.error || actionError} />
      {secret && <Secret {...secret} onClose={() => setSecret(null)} />}
      {note && <p role="status" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{note}</p>}

      <Panel title="API keys" sub="For partners who read your data" right={<button type="button" className={btnPrimary} onClick={() => { setFormError(""); setKeyForm({ name: "", scopes: [] }); }}>+ Generate key</button>}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Key</Th><Th>Scopes</Th><Th>Last used</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!keys.data?.keys.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{keys.loading ? "Loading…" : "No API keys yet."}</td></tr>}
            {keys.data?.keys.map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.key_prefix}…{k.key_last4}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{k.scopes.join(", ")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{k.last_used_at ? `${fmtDate(k.last_used_at)} · ${num(k.use_count)} calls` : "Never"}</td>
                <td className="px-4 py-3">{k.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Revoked</Badge>}</td>
                <td className="px-4 py-3 text-right">
                  {k.status === "active" && (
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm(`Revoke "${k.name}"? Apps using it will stop working immediately.`) && run(() => adminFetch(`/integrations/api-keys/${k.id}/revoke`, json("POST", {})))}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Using a key</p>
          <p>Send it as <code>Authorization: Bearer &lt;key&gt;</code>. Available now: <code>GET /api/v1/partner/schools</code> (scope schools:read) and <code>GET /api/v1/partner/invoices</code> (scope invoices:read). Both accept <code>page</code> and <code>pageSize</code>.</p>
        </div>
      </Panel>

      <Panel title="Webhooks" sub="Events we send to your other systems" right={<button type="button" className={btnPrimary} onClick={() => { setFormError(""); setHookForm({ url: "", description: "", events: [] }); }}>+ Add webhook</button>}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Endpoint</Th><Th>Events</Th><Th>Last delivery</Th><Th>Active</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!hooks.data?.webhooks.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{hooks.loading ? "Loading…" : "No webhooks yet."}</td></tr>}
            {hooks.data?.webhooks.map((h) => (
              <tr key={h.id} className="align-top">
                <td className="max-w-xs px-4 py-3"><p className="break-all font-mono text-xs text-slate-800">{h.url}</p>{h.description && <p className="text-xs text-slate-400">{h.description}</p>}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{h.events.join(", ")}</td>
                <td className="px-4 py-3">
                  {h.last_delivery ? <Badge tone={h.last_delivery.success ? "green" : "red"}>{h.last_delivery.success ? "Success" : `Failed${h.last_delivery.status_code ? ` · ${h.last_delivery.status_code}` : ""}`}</Badge> : <Badge tone="gray">None yet</Badge>}
                </td>
                <td className="px-4 py-3"><input type="checkbox" className="size-4 accent-mca-blue" aria-label={`${h.url} active`} checked={h.active} disabled={busy} onChange={() => run(() => adminFetch(`/integrations/webhooks/${h.id}`, json("PATCH", { active: !h.active })))} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => sendTest(h)}>Send test</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => setDeliveriesFor(h)}>Deliveries</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => { setFormError(""); setHookForm({ id: h.id, url: h.url, description: h.description ?? "", events: h.events }); }}>Edit</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm("Create a new signing secret? The old one stops working immediately.") && run(async () => {
                      const r = await adminFetch<{ secret: string }>(`/integrations/webhooks/${h.id}/rotate-secret`, json("POST", {}));
                      setSecret({ title: "New signing secret", value: r.secret, note: "Update the receiver now: deliveries signed with the old secret will fail verification." });
                    })}>Rotate secret</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm("Delete this webhook and its delivery history?") && run(() => adminFetch(`/integrations/webhooks/${h.id}`, { method: "DELETE" }))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Verifying a delivery</p>
          <p>Each request has <code>X-MCA-Signature: t=&lt;unix time&gt;,v1=&lt;hex&gt;</code>, where v1 is the HMAC-SHA256 of <code>&lt;t&gt;.&lt;raw body&gt;</code> using your signing secret. Reject requests with an old timestamp, and use <code>X-MCA-Delivery</code> to ignore repeats. Endpoints must use https and be reachable from the internet.</p>
        </div>
      </Panel>

      <Modal open={keyForm !== null} title="Generate API key" onClose={() => setKeyForm(null)}>
        {keyForm && (
          <form onSubmit={saveKey} className="space-y-3">
            <ErrorBanner message={formError} />
            <Field label="Name" hint="What this key is for, e.g. Tally sync"><input className={inputCls} required minLength={2} value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} /></Field>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Scopes</legend>
              {meta.data?.scopes.map((sc) => (
                <label key={sc} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={keyForm.scopes.includes(sc)} onChange={() => setKeyForm({ ...keyForm, scopes: toggle(keyForm.scopes, sc) })} /><code>{sc}</code></label>
              ))}
            </fieldset>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setKeyForm(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Generate</button></div>
          </form>
        )}
      </Modal>

      <Modal open={hookForm !== null} title={hookForm?.id ? "Edit webhook" : "Add webhook"} onClose={() => setHookForm(null)}>
        {hookForm && (
          <form onSubmit={saveHook} className="space-y-3">
            <ErrorBanner message={formError} />
            <Field label="Endpoint address" hint="Must start with https://"><input className={inputCls} required placeholder="https://example.com/hooks/mca" value={hookForm.url} onChange={(e) => setHookForm({ ...hookForm, url: e.target.value })} /></Field>
            <Field label="Description"><input className={inputCls} maxLength={200} value={hookForm.description} onChange={(e) => setHookForm({ ...hookForm, description: e.target.value })} /></Field>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Events</legend>
              <div className="grid grid-cols-2 gap-x-3">
                {meta.data?.events.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={hookForm.events.includes(ev)} onChange={() => setHookForm({ ...hookForm, events: toggle(hookForm.events, ev) })} /><code className="text-xs">{ev}</code></label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setHookForm(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>
          </form>
        )}
      </Modal>

      <Modal open={deliveriesFor !== null} title="Recent deliveries" onClose={() => setDeliveriesFor(null)}>
        {deliveriesFor && <Deliveries hook={deliveriesFor} onResent={refresh} />}
      </Modal>
    </div>
  );
}

function Deliveries({ hook, onResent }: { hook: WebhookRow; onResent: () => void }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ deliveries: DeliveryRow[] }>(`/integrations/webhooks/${hook.id}/deliveries`), [hook.id]);
  const { error: actionError, busy, run } = useAction(() => { reload(); onResent(); });
  return (
    <div className="space-y-3">
      <p className="break-all font-mono text-xs text-slate-500">{hook.url}</p>
      <ErrorBanner message={error || actionError} />
      <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
        {!data?.deliveries.length && <li className="px-3 py-6 text-center text-slate-400">{loading ? "Loading…" : "Nothing has been sent yet."}</li>}
        {data?.deliveries.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Badge tone={d.success ? "green" : "red"}>{d.success ? "Delivered" : "Failed"}</Badge>
            <span className="font-mono text-xs">{d.event}</span>
            <span className="text-xs text-slate-400">{d.status_code ?? "no answer"} · {d.duration_ms ?? 0} ms</span>
            <span className="ml-auto text-xs text-slate-500">{fmtDate(d.attempted_at)}</span>
            {d.error && <p className="w-full text-xs text-rose-700">{d.error}</p>}
            {d.event !== "ping" && <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => run(() => adminFetch(`/integrations/webhooks/${hook.id}/deliveries/${d.id}/redeliver`, json("POST", {})))}>Resend</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
