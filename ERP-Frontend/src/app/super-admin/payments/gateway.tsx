"use client";

import { useState } from "react";
import { adminFetch, json, type GatewayInfo } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Th, btnGhost, btnPrimary, fmtDate, useLoad } from "@/components/admin/ui";

interface PaySettings { online_enabled: boolean; manual_methods: string[]; all_methods: string[] }

export function Gateway() {
  const [part, setPart] = useState<"config" | "api">("config");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["config", "Gateway configuration"], ["api", "API settings"]]} />
      {part === "config" ? <Config /> : <ApiSettings />}
    </>
  );
}

function Config() {
  const info = useLoad(() => adminFetch<GatewayInfo>("/payments/gateway"), []);
  const settings = useLoad(() => adminFetch<PaySettings>("/payments/settings"), []);
  const act = useAction(settings.reload);
  const s = settings.data;
  const rz = info.data?.razorpay;

  const toggleMethod = (m: string) => {
    if (!s) return;
    const next = s.manual_methods.includes(m) ? s.manual_methods.filter((x) => x !== m) : [...s.manual_methods, m];
    void act.run(() => adminFetch("/payments/settings", json("PUT", { manual_methods: next })));
  };

  return (
    <div className="space-y-6">
      <ErrorBanner message={info.error || settings.error || act.error} />
      <Panel title="How schools pay" sub="Which gateways collect payments, and how.">
        <ul className="divide-y divide-slate-100">
          <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-semibold text-slate-900">Razorpay: pay online</p>
              <p className="text-sm text-slate-500">Cards, UPI and net banking from the school&apos;s Billing page. {rz?.configured ? <Badge tone="green">Keys connected{rz.mode ? ` · ${rz.mode}` : ""}</Badge> : <Badge tone="gray">Keys not set</Badge>}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" role="switch" className="size-4 accent-mca-blue" checked={s?.online_enabled ?? true} disabled={!s || act.busy} onChange={(e) => act.run(() => adminFetch("/payments/settings", json("PUT", { online_enabled: e.target.checked })))} />
              Accept online payments
            </label>
          </li>
          <li className="px-5 py-4">
            <p className="font-semibold text-slate-900">Recorded by your team</p>
            <p className="mb-3 text-sm text-slate-500">Payments received outside the gateway, entered on an invoice. Untick a method to stop accepting it.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {s?.all_methods.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={s.manual_methods.includes(m)} disabled={act.busy || (s.manual_methods.length === 1 && s.manual_methods.includes(m))} onChange={() => toggleMethod(m)} />{m}</label>
              ))}
            </div>
          </li>
        </ul>
      </Panel>
      <Panel title="Other gateways" sub="Backup and alternative gateways">
        <p className="p-5 text-sm text-slate-600">Only Razorpay is connected. Another gateway (for example Cashfree) needs its own integration, which is not built yet.</p>
      </Panel>
    </div>
  );
}

function ApiSettings() {
  const info = useLoad(() => adminFetch<GatewayInfo>("/payments/gateway"), []);
  const events = useLoad(() => adminFetch<{ events: { id: string; type: string; received_at: string }[] }>("/payments/gateway/events"), []);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const act = useAction(() => undefined);
  const rz = info.data?.razorpay;

  return (
    <div className="space-y-6">
      <ErrorBanner message={info.error || events.error || act.error} />
      <Panel title="Razorpay" sub="Keys, webhooks and mode">
        <div className="space-y-3 p-5 text-sm">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Mode</dt><dd>{rz?.mode ? <Badge tone={rz.mode === "live" ? "green" : "blue"}>{rz.mode}</Badge> : <Badge tone="gray">Not set</Badge>}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Key id</dt><dd className="font-mono text-xs">{rz?.keyHint ?? "Not set"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Webhook secret</dt><dd>{rz?.webhookSecretSet ? <Badge tone="green">Set</Badge> : <Badge tone="gray">Not set</Badge>}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Webhook address</dt><dd className="font-mono text-xs">{rz?.webhookPath}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-500">Events to enable</dt><dd>{rz?.webhookEvents.join(", ")}</dd></div>
          </dl>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <button type="button" className={btnPrimary} disabled={act.busy} onClick={() => act.run(async () => setResult(await adminFetch("/payments/gateway/test", json("POST", {}))))}>Test connection</button>
            {result && <span role="status" className={`text-sm font-semibold ${result.ok ? "text-mca-green" : "text-rose-700"}`}>{result.message}</span>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
            <p className="font-semibold text-slate-800">To connect or change keys</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Put <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code> and <code>RAZORPAY_WEBHOOK_SECRET</code> in the backend <code>.env</code> and restart the backend.</li>
              <li>In Razorpay, add a webhook to <code>{rz?.webhookPath}</code> on your public backend address, with the same secret.</li>
            </ol>
            <p className="mt-2 text-xs text-slate-400">Keys live only in the server environment. They are never shown here or stored in the database.</p>
          </div>
        </div>
      </Panel>
      <Panel title="Recent webhook events" sub="What the gateway has told us lately" right={<button type="button" className={btnGhost} onClick={events.reload}>Refresh</button>}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Event</Th><Th>Id</Th><Th>Received</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!events.data?.events.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">{events.loading ? "Loading…" : "No events received yet."}</td></tr>}
            {events.data?.events.map((e) => <tr key={e.id}><td className="px-4 py-2.5 font-semibold text-slate-800">{e.type}</td><td className="px-4 py-2.5 font-mono text-xs text-slate-500">{e.id}</td><td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDate(e.received_at)}</td></tr>)}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
