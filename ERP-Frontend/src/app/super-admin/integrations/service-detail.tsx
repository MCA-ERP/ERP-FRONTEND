"use client";

import { useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, StatGrid } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { Badge, ErrorBanner, Th, btnGhost, btnPrimary, fmtDate, useLoad } from "@/components/admin/ui";

type Service = "razorpay" | "sms" | "whatsapp" | "email";
interface Detail {
  key: Service; configured: boolean; mode: string | null;
  fields: { label: string; value: string }[];
  stats: { label: string; value: string; sub?: string }[];
  env: string[]; canTest: boolean; testNote?: string;
}
interface TestResult { ok: boolean; ms: number; message: string }
interface Dns { domain: string | null; checks: { name: string; status: "Verified" | "Missing" | "Unknown"; detail: string }[] }

const TITLE: Record<Service, { name: string; about: string }> = {
  razorpay: { name: "Razorpay", about: "The gateway for subscription and fee payments." },
  sms: { name: "SMS (MSG91)", about: "The service that sends SMS for the platform. Each SMS template must be approved on the DLT portal." },
  whatsapp: { name: "WhatsApp Business", about: "Template messages through Meta's WhatsApp Business Cloud API." },
  email: { name: "Email (SMTP)", about: "Sends email through your own mail server or provider, like Amazon SES, Brevo or Zoho." },
};

export function ServiceDetail({ service }: { service: Service }) {
  const { data, error, loading } = useLoad(() => adminFetch<Detail>(`/integrations/services/${service}`), [service]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const t = TITLE[service];

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      setResult(await adminFetch<TestResult>(`/integrations/services/${service}/test`, json("POST", {})));
    } catch (e) {
      setResult({ ok: false, ms: 0, message: e instanceof Error ? e.message : "The test failed." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {data && <StatGrid items={[{ label: "Status", value: data.configured ? "Connected" : "Not connected", sub: data.mode ? `${data.mode} mode` : undefined }, ...data.stats.map((s) => ({ label: s.label, value: s.value, sub: s.sub }))]} />}
      <Panel title={t.name} sub={t.about}
        right={data?.canTest ? <button type="button" className={btnPrimary} disabled={testing || !data.configured} onClick={test}>{testing ? "Testing…" : "Test connection"}</button> : undefined}>
        <div className="space-y-4 p-5">
          {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
          {result && (
            <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {result.ok ? `${result.message} (${result.ms} ms)` : result.message}
            </p>
          )}
          {data && !data.canTest && data.testNote && <p className="text-xs text-slate-500">{data.testNote}</p>}
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {data?.fields.map((f) => (
              <div key={f.label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{f.label}</dt><dd className="break-words text-sm text-slate-900">{f.value}</dd></div>
            ))}
          </dl>
          {data && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Where the credentials live</p>
              <p className="mt-1">Keys and passwords are set in the backend <code className="rounded bg-white px-1">.env</code>, never in this portal, so they cannot leak through the browser. Variables: {data.env.map((e) => <code key={e} className="mr-1 rounded bg-white px-1">{e}</code>)}. Restart the backend after changing them.</p>
            </div>
          )}
        </div>
      </Panel>
      {service === "email" && <EmailDns />}
    </div>
  );
}

const TONE = { Verified: "green", Missing: "red", Unknown: "gray" } as const;

function EmailDns() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<Dns>("/integrations/email-dns"), []);
  return (
    <Panel title="Sending domain checks" sub={data?.domain ? `Read from the DNS of ${data.domain}. These help your mail reach the inbox instead of spam.` : "Checks the domain you send from."}
      right={<button type="button" className={btnGhost} onClick={reload}>Check again</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Record</Th><Th>Result</Th><Th>Found</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.checks.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{loading ? "Checking…" : "Set the sender address (Settings → Email & SMS) to check its domain."}</td></tr>}
          {data?.checks.map((c) => (
            <tr key={c.name}><td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td><td className="px-4 py-3"><Badge tone={TONE[c.status]}>{c.status}</Badge></td><td className="break-all px-4 py-3 text-xs text-slate-500">{c.detail}</td></tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function Messaging() {
  const [view, setView] = useState<"sms" | "whatsapp" | "email">("sms");
  return (
    <>
      <Pills label="Messaging" value={view} onChange={setView} items={[["sms", "SMS"], ["whatsapp", "WhatsApp"], ["email", "Email"]]} />
      <ServiceDetail key={view} service={view} />
    </>
  );
}

interface DeliveryAll { id: string; event: string; status_code: number | null; success: boolean; error: string | null; duration_ms: number | null; attempted_at: string; webhooks: { url: string } | null }

export function DeliveryLog() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ deliveries: DeliveryAll[] }>("/integrations/deliveries"), []);
  return (
    <Panel title="Webhook delivery log" sub="Every event sent to your webhooks, newest first." right={<button type="button" className={btnGhost} onClick={reload}>Refresh</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>When</Th><Th>Endpoint</Th><Th>Event</Th><Th>Result</Th><Th>Time taken</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.deliveries.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No deliveries yet."}</td></tr>}
          {data?.deliveries.map((d) => (
            <tr key={d.id}>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(d.attempted_at)}</td>
              <td className="max-w-xs break-all px-4 py-3 font-mono text-xs text-slate-600">{d.webhooks?.url ?? "—"}</td>
              <td className="px-4 py-3 text-slate-700">{d.event}</td>
              <td className="px-4 py-3"><Badge tone={d.success ? "green" : "red"}>{d.success ? (d.status_code ?? "OK") : (d.status_code ?? "Failed")}</Badge>{d.error && <p className="mt-1 max-w-[16rem] text-xs text-rose-700">{d.error}</p>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{d.duration_ms !== null ? `${d.duration_ms} ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
