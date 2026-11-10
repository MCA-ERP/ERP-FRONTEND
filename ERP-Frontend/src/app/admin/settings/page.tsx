"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { formatDateTime, setLocaleConfig } from "@/lib/locale-format";
import { Panel, TabBar } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, PageHeader, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Releases } from "./versions";

type Tab = "general" | "branding" | "contact" | "regional" | "datetime" | "notify" | "maintenance" | "app" | "versions";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "color" | "select" | "bool" | "multi" | "datetime";
  hint?: string;
  options?: ([string, string] | string)[];
  maxLength?: number;
}

const COUNTRIES: [string, string][] = [["IN", "India (₹ INR)"], ["AE", "United Arab Emirates (AED)"], ["NP", "Nepal (NPR)"], ["LK", "Sri Lanka (LKR)"], ["BD", "Bangladesh (BDT)"]];

const TABS: Record<Tab, { label: string; fields: FieldDef[]; note?: string }> = {
  general: {
    label: "General",
    fields: [
      { key: "general.platform_name", label: "Platform name", hint: "What the platform is called in emails, invoices and the website." },
      { key: "general.short_name", label: "Short name", hint: "Used where space is tight.", maxLength: 20 },
      { key: "general.tagline", label: "Tagline" },
      { key: "general.company", label: "Registered company" },
      { key: "general.main_domain", label: "Main domain", hint: "Like myclassassist.in" },
      { key: "general.trial_days", label: "Free trial length (days)", type: "number", hint: "Applies to schools created or moved to Trial from now on." },
      { key: "general.gst_number", label: "GST number" },
    ],
  },
  branding: {
    label: "Logo & colour",
    fields: [
      { key: "branding.logo_url", label: "Main logo", hint: "A full https:// address. Shown in emails and on the website." },
      { key: "branding.mark_url", label: "Logo mark", hint: "Square, for app icons." },
      { key: "branding.favicon_url", label: "Favicon", hint: "32 × 32 PNG." },
      { key: "branding.invoice_logo_url", label: "Invoice logo", hint: "Printed on invoices." },
      { key: "branding.primary_color", label: "Primary colour", type: "color" },
    ],
    note: "Logos are web addresses, because the portal has no file storage yet. Upload the image to your website or storage and paste its link. Branding is published at /api/v1/public/branding.",
  },
  contact: {
    label: "Contact",
    fields: [
      { key: "general.support_email", label: "Support email" },
      { key: "general.support_phone", label: "Support phone" },
      { key: "contact.whatsapp", label: "WhatsApp" },
      { key: "contact.hours", label: "Support hours", hint: "Like Mon – Sat, 8 am – 8 pm IST" },
      { key: "contact.sales_email", label: "Sales email" },
      { key: "contact.address", label: "Office address", type: "textarea" },
    ],
  },
  regional: {
    label: "Regional",
    fields: [
      { key: "regional.countries", label: "Countries", type: "multi", options: COUNTRIES, hint: "Countries your website offers schools. At least one." },
      { key: "locale.timezone", label: "Time zone", type: "select", options: ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"], hint: "Used for every date and time in this portal." },
      { key: "locale.currency", label: "Currency", type: "select", options: ["INR", "USD", "AED", "GBP", "SGD"] },
    ],
  },
  datetime: {
    label: "Date & time",
    fields: [
      { key: "locale.date_format", label: "Date format", type: "select", options: ["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
      { key: "locale.time_format", label: "Time format", type: "select", options: [["12h", "12-hour (8:30 am)"], ["24h", "24-hour (08:30)"]] },
      { key: "locale.show_seconds", label: "Show seconds", type: "bool" },
      { key: "locale.week_start", label: "Week starts on", type: "select", options: ["Monday", "Sunday"] },
      { key: "locale.financial_year", label: "Financial year", type: "select", options: [["April - March", "April – March"], ["January - December", "January – December"]] },
    ],
  },
  notify: {
    label: "Email & SMS",
    fields: [
      { key: "notify.email_from_name", label: "Email sender name" },
      { key: "notify.email_from_address", label: "Email sender address" },
      { key: "notify.reply_to", label: "Reply-to address", hint: "Where replies go. Empty: the sender address." },
      { key: "notify.sms_sender_id", label: "SMS sender ID", maxLength: 11, hint: "Up to 11 characters, as registered with your SMS provider." },
    ],
    note: "The sender name and address are used on every email. The mail and SMS accounts themselves are connected in the backend .env; see Integrations to test them.",
  },
  maintenance: {
    label: "Maintenance",
    fields: [
      { key: "maintenance.enabled", label: "Maintenance mode is on", type: "bool", hint: "Schools see the message and cannot sign in. Your team keeps working." },
      { key: "maintenance.message", label: "Message schools see", type: "textarea" },
      { key: "maintenance.starts_at", label: "Planned start", type: "datetime", hint: "Optional. Maintenance switches on by itself between the start and the end." },
      { key: "maintenance.ends_at", label: "Planned end", type: "datetime" },
    ],
  },
  app: {
    label: "Application",
    fields: [
      { key: "app.self_signup", label: "Allow self sign-up", type: "bool", hint: "Schools can register from the website and wait for approval. When off, the website refuses new sign-ups (demo requests still work)." },
    ],
  },
  versions: { label: "Versions", fields: [] },
};

const toIso = (local: string) => (local ? new Date(local).toISOString() : "");
const toLocal = (iso: unknown) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => { if (data) setDraft(data.settings); }, [data]);

  const def = TABS[tab];
  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const values = Object.fromEntries(def.fields.map((f) => {
        const v = draft[f.key];
        return [f.key, f.type === "number" ? Number(v) : f.type === "bool" ? v === true : f.type === "multi" ? (Array.isArray(v) ? v : []) : (v ?? "")];
      }));
      await adminFetch("/settings", json("PUT", { values }));
      setLocaleConfig({ time_zone: String(draft["locale.timezone"] ?? ""), date_format: String(draft["locale.date_format"] ?? ""), time_format: String(draft["locale.time_format"] ?? ""), show_seconds: draft["locale.show_seconds"] === true });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const maintenanceOn = draft["maintenance.enabled"] === true;
  const preview = tab === "datetime" && typeof draft["locale.date_format"] === "string"
    ? formatDateTime(new Date(), { timeZone: String(draft["locale.timezone"] || "Asia/Kolkata"), dateFormat: String(draft["locale.date_format"]), hour12: draft["locale.time_format"] !== "24h", seconds: draft["locale.show_seconds"] === true })
    : "";

  return (
    <>
      <PageHeader title="System settings" subtitle="Platform-wide configuration: identity, regions, formats, maintenance and versions." />
      <TabBar value={tab} onChange={(t) => { setTab(t); setSaved(false); setSaveError(""); }} tabs={(Object.keys(TABS) as Tab[]).map((k) => [k, TABS[k].label])} />
      <ErrorBanner message={error} />
      {tab === "versions" ? (
        <Releases />
      ) : (
        <Panel title={def.label}>
          <form onSubmit={submit} className="space-y-4 p-5">
            <ErrorBanner message={saveError} />
            {tab === "maintenance" && (
              <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${maintenanceOn ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                {maintenanceOn ? "Maintenance mode is ON. School users are being turned away." : "Maintenance mode is off. Schools can use the portal."}
              </p>
            )}
            {def.note && <p className="rounded-xl bg-mca-blue-sky/60 px-3 py-2 text-sm text-mca-blue-dark">{def.note}</p>}
            {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
            {data && (
              <div className="grid gap-4 sm:grid-cols-2">
                {def.fields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" || f.type === "multi" ? "sm:col-span-2" : ""}>
                    <Field label={f.label} hint={f.hint}>
                      <Control def={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />
                    </Field>
                  </div>
                ))}
              </div>
            )}
            {preview && <p className="text-sm text-slate-600">Preview: <b>{preview}</b></p>}
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
              <button type="submit" className={btnPrimary} disabled={saving || !data}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </Panel>
      )}
      {tab === "notify" && <TestSend />}
    </>
  );
}

function Control({ def: f, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const text = value === null || value === undefined ? "" : String(value);
  if (f.type === "select") {
    return (
      <select className={inputCls} value={text} onChange={(e) => onChange(e.target.value)}>
        {f.options!.map((o) => (typeof o === "string" ? <option key={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>))}
      </select>
    );
  }
  if (f.type === "bool") {
    return <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" className="size-5 accent-mca-blue" checked={value === true} onChange={(e) => onChange(e.target.checked)} />{value === true ? "On" : "Off"}</label>;
  }
  if (f.type === "multi") {
    const list = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-4">
        {f.options!.map((o) => {
          const [v, label] = typeof o === "string" ? [o, o] : o;
          return <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={list.includes(v)} onChange={() => onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])} />{label}</label>;
        })}
      </div>
    );
  }
  if (f.type === "color") {
    return (
      <div className="flex gap-2">
        <input type="color" aria-label={f.label} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200" value={text || "#0294ce"} onChange={(e) => onChange(e.target.value)} />
        <input className={inputCls} value={text} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  if (f.type === "textarea") return <textarea className={`${inputCls} min-h-[5rem]`} maxLength={f.maxLength} value={text} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === "datetime") return <input type="datetime-local" className={inputCls} value={toLocal(value)} onChange={(e) => onChange(toIso(e.target.value))} />;
  return <input type={f.type === "number" ? "number" : "text"} className={inputCls} maxLength={f.maxLength} value={text} onChange={(e) => onChange(e.target.value)} />;
}

interface TestResult {
  message: { channel: string; to_address: string; status: "sent" | "failed" | "queued"; error: string | null };
  providers: { email: { configured: boolean; host: string | null }; sms: { configured: boolean }; whatsapp?: { configured: boolean } };
}

/** Sends one real message to an address you type, so you can confirm the mail, SMS or WhatsApp account works. */
function TestSend() {
  const status = useLoad(() => adminFetch<{ providers: TestResult["providers"] }>("/communication/messages?pageSize=1"), []);
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TestResult["message"] | null>(null);
  const providers = status.data?.providers;
  const ready = providers ? Boolean(providers[channel]?.configured) : false;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await adminFetch<TestResult>("/communication/test", json("POST", { channel, to }));
      setResult(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The test could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <Panel title="Send a test message" sub="Goes out for real, to the address you enter">
        <form onSubmit={send} className="space-y-3 p-5">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            Email {providers?.email.configured ? <Badge tone="green">connected</Badge> : <Badge tone="gray">not configured</Badge>}
            SMS {providers?.sms.configured ? <Badge tone="green">connected</Badge> : <Badge tone="gray">not configured</Badge>}
            WhatsApp {providers?.whatsapp?.configured ? <Badge tone="green">connected</Badge> : <Badge tone="gray">not connected</Badge>}
          </p>
          <ErrorBanner message={error} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Channel">
              <select className={inputCls} value={channel} onChange={(e) => { setChannel(e.target.value as typeof channel); setResult(null); }}>
                <option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
            <div className="min-w-[16rem] flex-1">
              <Field label={channel === "email" ? "Send to" : "Mobile number"} hint={channel === "sms" ? "Uses the Renewal reminder SMS template, which needs its MSG91 template id first." : channel === "whatsapp" ? "Uses the Announcement WhatsApp template, which needs its Meta template name first." : undefined}>
                <input className={inputCls} required value={to} onChange={(e) => setTo(e.target.value)} placeholder={channel === "email" ? "you@example.com" : "98765 43210"} />
              </Field>
            </div>
            <button type="submit" className={btnPrimary} disabled={busy || !ready}>{busy ? "Sending…" : "Send test"}</button>
            <button type="button" className={btnGhost} onClick={status.reload}>Recheck</button>
          </div>
          {result && (
            <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${result.status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {result.status === "sent" ? `Sent to ${result.to_address}. Check the inbox (and spam) or phone.` : `Failed: ${result.error ?? "the provider refused the message"}`}
            </p>
          )}
        </form>
      </Panel>
    </div>
  );
}
