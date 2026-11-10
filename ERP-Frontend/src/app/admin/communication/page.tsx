"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  adminFetch, json, qs, type Announcement, type AnnouncementKind, type Audience, type Campaign, type HistoryResponse, type MessageRow, type MessageTemplate, type MessagesResponse, type Paged, type Plan, type SchoolRow,
} from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import {
  Badge, ErrorBanner, Field, Modal, PageHeader, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad,
} from "@/components/admin/ui";

type Tab = "announcements" | "email" | "sms" | "whatsapp" | "notifications" | "history";
type Chan = "email" | "sms" | "whatsapp";

const KIND_LABEL: Record<AnnouncementKind, string> = { announcement: "Announcement", banner: "Banner", alert: "Alert", popup: "Pop-up" };
const SEGMENT_LABEL = { active: "Active schools (paying)", trial: "Schools on trial", renewals_due: "Renewals due in 30 days" } as const;

/** <input type="datetime-local"> value (local time) to an ISO string, and back. */
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const CHANNELS: { code: string; label: string }[] = [
  { code: "in_app", label: "In-app (school portal)" },
  { code: "email", label: "Email" },
  { code: "sms", label: "SMS" },
  { code: "whatsapp", label: "WhatsApp" },
];

const audienceLabel = (a: Audience, plans: Plan[]) =>
  a.type === "all" ? "All live schools" : a.type === "segment" ? SEGMENT_LABEL[a.segment] : a.type === "plans" ? `Plans: ${a.plans.map((c) => plans.find((p) => p.code === c)?.name ?? c).join(", ")}` : `${a.school_ids.length} selected school(s)`;

/** A row of small pills for the pages inside a tab. */
function Pills<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {items.map(([k, text]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${value === k ? "border-[#026f9b] bg-white text-[#026f9b] shadow-sm" : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

export default function CommunicationPage() {
  const [tab, setTab] = useState<Tab>("announcements");
  return (
    <>
      <PageHeader title="Communication" subtitle="Announcements, email, SMS and WhatsApp to schools, with templates, campaigns and delivery logs for each channel." />
      <TabBar value={tab} onChange={setTab} tabs={[["announcements", "Announcements"], ["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"], ["notifications", "Notifications"], ["history", "History"]]} />
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "email" && <ChannelTab channel="email" />}
      {tab === "sms" && <ChannelTab channel="sms" />}
      {tab === "whatsapp" && <ChannelTab channel="whatsapp" />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "history" && <DeliveryLog all />}
    </>
  );
}

function AnnouncementsTab() {
  const [view, setView] = useState<"all" | "scheduled" | "sent">("all");
  return (
    <>
      <Pills label="Announcements" value={view} onChange={setView} items={[["all", "Create & drafts"], ["scheduled", "Scheduled"], ["sent", "Published"]]} />
      <Announcements view={view} />
    </>
  );
}

const CHANNEL_NAME: Record<Chan, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

function ChannelTab({ channel }: { channel: Chan }) {
  const [view, setView] = useState<"templates" | "campaigns" | "logs">("templates");
  const status = useLoad(() => adminFetch<MessagesResponse>("/communication/messages?pageSize=1"), []);
  const connected = status.data?.providers[channel]?.configured;
  return (
    <>
      {status.data && !connected && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {channel === "email" && "Email is not connected yet. Add the SMTP_* settings to the backend .env."}
          {channel === "sms" && "SMS is not connected yet. Add MSG91_AUTH_KEY to the backend .env, then the approved template ids under Templates."}
          {channel === "whatsapp" && "WhatsApp is not connected yet. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID from your Meta WhatsApp Business account to the backend .env, then add each approved template's name under Templates."}
        </p>
      )}
      <Pills label={CHANNEL_NAME[channel]} value={view} onChange={setView} items={[["templates", "Templates"], ["campaigns", "Campaigns"], ["logs", "Delivery logs"]]} />
      {view === "templates" && <Templates channel={channel} />}
      {view === "campaigns" && <Campaigns channel={channel} />}
      {view === "logs" && <DeliveryLog channel={channel} />}
      {channel === "email" && view === "campaigns" && <OpenTrackingToggle />}
    </>
  );
}

function OpenTrackingToggle() {
  const { data, reload } = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const { error, busy, run } = useAction(reload);
  const on = data?.settings["communication.track_email_opens"] !== false;
  return (
    <div className="mt-3 text-sm text-slate-600">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4 accent-mca-blue" checked={on} disabled={busy || !data} onChange={() => run(() => adminFetch("/settings", json("PUT", { values: { "communication.track_email_opens": !on } })))} />
        Record when an announcement email is opened
      </label>
      <p className="mt-1 text-xs text-slate-400">Uses a tiny image in the email, so it needs API_PUBLIC_URL set in the backend .env. Some mail apps block images, so the Opened count is a minimum.</p>
      <ErrorBanner message={error} />
    </div>
  );
}

function NotificationsTab() {
  const [view, setView] = useState<"alerts" | "push">("alerts");
  return (
    <>
      <Pills label="Notifications" value={view} onChange={setView} items={[["alerts", "In-app alerts"], ["push", "Push notifications"]]} />
      {view === "alerts" ? (
        <Announcements alerts view="all" />
      ) : (
        <Panel title="Push notifications" sub="Notifications to phones">
          <p className="p-5 text-sm text-slate-600">
            Push notifications go to the My Class Assist mobile apps through Firebase Cloud Messaging. They are not available yet because the mobile apps are not built. Until then, use in-app alerts (banners, alerts and pop-ups in the school portal), email, SMS or WhatsApp.
          </p>
        </Panel>
      )}
    </>
  );
}

function Announcements({ alerts = false, view = "all" }: { alerts?: boolean; view?: "all" | "scheduled" | "sent" }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ announcements: Announcement[] }>("/communication/announcements"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const providers = useLoad(() => adminFetch<MessagesResponse>("/communication/messages?pageSize=1"), []);
  const channelState = (code: string): { ready: boolean; why?: string } =>
    code === "in_app"
      ? { ready: true }
      : providers.data?.providers[code as Chan]?.configured
        ? { ready: true }
        : { ready: false, why: code === "whatsapp" ? "not connected" : "not configured on the server" };
  const { error: actionError, busy, run } = useAction(reload);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState<Announcement | "new" | null>(null);
  const blank = { title: "", body: "", audience: "all" as Audience["type"], segment: "active" as keyof typeof SEGMENT_LABEL, plans: [] as string[], school_ids: [] as string[], channels: ["in_app"] as string[], kind: (alerts ? "banner" : "announcement") as AnnouncementKind, scheduled: "", ends: "" };
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");

  const openForm = (a: Announcement | "new") => {
    setFormError("");
    if (a === "new") setForm(blank);
    else
      setForm({
        title: a.title, body: a.body, audience: a.audience.type,
        segment: a.audience.type === "segment" ? a.audience.segment : "active",
        plans: a.audience.type === "plans" ? a.audience.plans : [], school_ids: a.audience.type === "schools" ? a.audience.school_ids : [],
        channels: a.channels, kind: a.kind, scheduled: toLocal(a.scheduled_for), ends: toLocal(a.ends_at),
      });
    setOpen(a);
  };

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const audience: Audience =
      form.audience === "all" ? { type: "all" }
        : form.audience === "segment" ? { type: "segment", segment: form.segment }
        : form.audience === "plans" ? { type: "plans", plans: form.plans }
        : { type: "schools", school_ids: form.school_ids };
    const body = {
      title: form.title, body: form.body, audience, channels: form.kind === "announcement" ? form.channels : ["in_app"],
      kind: form.kind, scheduled_for: toIso(form.scheduled), ends_at: toIso(form.ends),
    };
    setFormError("");
    const ok = await run(async () => {
      try {
        if (open === "new") await adminFetch("/communication/announcements", json("POST", body));
        else if (open) await adminFetch(`/communication/announcements/${open.id}`, json("PATCH", body));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  const send = async (a: Announcement) => {
    if (!window.confirm(`Send "${a.title}" now? This cannot be undone.`)) return;
    setNotice("");
    await run(async () => {
      const res = await adminFetch<{ delivered: number; email: number; sms: number; whatsapp?: number; skippedChannels: string[] }>(`/communication/announcements/${a.id}/send`, json("POST", {}));
      const parts = [
        a.channels.includes("in_app") ? `${res.delivered} school portal${res.delivered === 1 ? "" : "s"}` : "",
        res.email ? `${res.email} email${res.email === 1 ? "" : "s"} queued` : "",
        res.sms ? `${res.sms} SMS queued` : "",
        res.whatsapp ? `${res.whatsapp} WhatsApp queued` : "",
      ].filter(Boolean);
      setNotice(`Sent: ${parts.join(", ") || "no recipients found"}.${res.skippedChannels.length ? ` ${res.skippedChannels.join(", ")} was skipped: not connected.` : ""} Email, SMS and WhatsApp results appear under History.`);
    });
  };

  const items = (data?.announcements ?? [])
    .filter((a) => (alerts ? a.kind !== "announcement" : a.kind === "announcement"))
    .filter((a) => view === "all" || a.status === view);
  const live = (a: Announcement) => a.status === "sent" && !a.ended_at && (!a.ends_at || new Date(a.ends_at).getTime() > Date.now());
  return (
    <Panel
      title={alerts ? "In-app alerts" : "Announcements"}
      sub={alerts ? "Banners, alerts and pop-ups inside the school portal. Set an end date, or end one early." : "Shown in each school's portal, and by email, SMS or WhatsApp"}
      right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>{alerts ? "+ New alert" : "+ New announcement"}</button>}
    >
      <div className="p-4 pb-0"><ErrorBanner message={error || actionError} /></div>
      {notice && <p role="status" className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Title</Th><Th>Audience</Th><Th>Status</Th><Th>{alerts ? "Runs until" : "Created"}</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!items.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : view === "scheduled" ? "Nothing is scheduled." : view === "sent" ? "Nothing has been published yet." : alerts ? "No alerts yet." : "No announcements yet."}</td></tr>}
          {items.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{a.title}{a.kind !== "announcement" && <span className="ml-2"><Badge tone="blue">{KIND_LABEL[a.kind]}</Badge></span>}</p><p className="line-clamp-1 text-xs text-slate-400">{a.body}</p></td>
              <td className="px-4 py-3 text-slate-600">{audienceLabel(a.audience, plans.data?.plans ?? [])}</td>
              <td className="px-4 py-3">
                {a.status === "sent" ? (
                  <>
                    {a.ended_at || (a.ends_at && !live(a)) ? <Badge tone="gray">Ended</Badge> : <Badge tone="green">{alerts ? "Live" : "Sent"} · {a.delivered}</Badge>}
                    {a.channels.includes("in_app") && <p className="mt-1 text-xs text-slate-500">Read by {a.read_by} of {a.delivered}</p>}
                  </>
                ) : a.status === "scheduled" ? (
                  <><Badge tone="blue">Scheduled</Badge><p className="mt-1 text-xs text-slate-500">{fmtDate(a.scheduled_for)}</p></>
                ) : <Badge tone="gray">Draft</Badge>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{alerts ? (a.ended_at ? "Ended " + fmtDate(a.ended_at) : a.ends_at ? fmtDate(a.ends_at) : "No end date") : fmtDate(a.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {a.status === "sent" && live(a) && a.kind !== "announcement" && (
                  <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm("End this now? Schools will stop seeing it.") && run(() => adminFetch(`/communication/announcements/${a.id}/end`, json("POST", {})))}>End now</button>
                )}
                {a.status === "scheduled" && (
                  <div className="flex justify-end gap-2">
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => openForm(a)}>Edit</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => run(() => adminFetch(`/communication/announcements/${a.id}/unschedule`, json("POST", {})))}>Unschedule</button>
                  </div>
                )}
                {a.status === "draft" && (
                  <div className="flex justify-end gap-2">
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => openForm(a)}>Edit</button>
                    <button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => send(a)}>Send</button>
                    <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm("Delete this draft?") && run(() => adminFetch(`/communication/announcements/${a.id}`, { method: "DELETE" }))}>Delete</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={open !== null} title={open === "new" ? (alerts ? "New alert" : "New announcement") : "Edit"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={formError} />
          {alerts && (
            <Field label="Type">
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AnnouncementKind })}>
                <option value="banner">Banner (strip across the top)</option><option value="alert">Alert (highlighted notice)</option><option value="popup">Pop-up (shown once on sign-in)</option>
              </select>
            </Field>
          )}
          <Field label="Title"><input className={inputCls} required maxLength={255} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Message"><textarea className={`${inputCls} min-h-[7rem]`} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Field label="Audience">
            <select className={inputCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as Audience["type"] })}>
              <option value="all">All live schools</option>
              <option value="segment">A group of schools (active, trial, renewals due)</option>
              <option value="plans">Schools on certain plans</option><option value="schools">Specific schools</option>
            </select>
          </Field>
          {form.audience === "segment" && (
            <select className={inputCls} aria-label="Group" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value as keyof typeof SEGMENT_LABEL })}>
              {(Object.keys(SEGMENT_LABEL) as (keyof typeof SEGMENT_LABEL)[]).map((k) => <option key={k} value={k}>{SEGMENT_LABEL[k]}</option>)}
            </select>
          )}
          {form.audience === "plans" && (
            <div className="flex flex-wrap gap-3">
              {plans.data?.plans.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={form.plans.includes(p.code)} onChange={() => setForm({ ...form, plans: toggle(form.plans, p.code) })} />{p.name}</label>
              ))}
            </div>
          )}
          {form.audience === "schools" && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {schools.data?.items.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={form.school_ids.includes(s.id)} onChange={() => setForm({ ...form, school_ids: toggle(form.school_ids, s.id) })} />{s.name} <span className="text-xs text-slate-400">({s.status})</span></label>
              ))}
            </div>
          )}
          {form.kind === "announcement" && (
          <fieldset>
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</legend>
            <div className="space-y-1">
              {CHANNELS.map((c) => {
                const st = channelState(c.code);
                return (
                  <label key={c.code} className={`flex items-center gap-2 text-sm ${st.ready ? "" : "text-slate-400"}`}>
                    <input type="checkbox" className="size-4 accent-mca-blue" disabled={!st.ready} checked={form.channels.includes(c.code)} onChange={() => setForm({ ...form, channels: toggle(form.channels, c.code) })} />
                    {c.label}
                    {!st.ready && <span className="text-xs">({st.why})</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Send later (optional)" hint="Leave empty to keep it as a draft you send by hand.">
              <input type="datetime-local" className={inputCls} value={form.scheduled} onChange={(e) => setForm({ ...form, scheduled: e.target.value })} />
            </Field>
            {(form.kind !== "announcement" || form.channels.includes("in_app")) && (
              <Field label="Stop showing on (optional)" hint="After this, schools no longer see it in the portal.">
                <input type="datetime-local" className={inputCls} value={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.value })} />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={busy}>{form.scheduled ? "Schedule" : "Save draft"}</button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

function Campaigns({ channel }: { channel: Chan }) {
  const { data, error, loading } = useLoad(() => adminFetch<{ campaigns: Campaign[] }>("/communication/campaigns"), []);
  const cell = (c: Campaign, ch: Chan) => {
    if (!c.channels.includes(ch)) return <span className="text-slate-300">—</span>;
    const total = c.stats[ch + "_total"] ?? 0;
    return (
      <span className="text-xs text-slate-600">
        {c.stats[ch + "_sent"] ?? 0} sent{c.stats[ch + "_failed"] ? <span className="text-rose-700"> · {c.stats[ch + "_failed"]} failed</span> : null}{c.stats[ch + "_queued"] ? " · " + c.stats[ch + "_queued"] + " waiting" : ""} <span className="text-slate-400">of {total}</span>
      </span>
    );
  };
  const mine = (data?.campaigns ?? []).filter((c) => c.channels.includes(channel));
  return (
    <Panel title={`${CHANNEL_NAME[channel]} campaigns`} sub={`Announcements sent by ${CHANNEL_NAME[channel].toLowerCase()}, and how delivery went`}>
      <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Campaign</Th><Th>Sent</Th><Th>Delivery</Th>{channel === "email" && <Th>Opened</Th>}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!mine.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "Nothing has been sent on this channel yet."}</td></tr>}
          {mine.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="px-4 py-3 font-semibold text-slate-900">{c.title}{c.kind !== "announcement" && <span className="ml-2"><Badge tone="blue">{KIND_LABEL[c.kind]}</Badge></span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(c.sent_at)}</td>
              <td className="px-4 py-3">{cell(c, channel)}</td>
              {channel === "email" && (
                <td className="px-4 py-3 text-xs text-slate-600">
                  {c.stats.email_sent ? `${c.stats.email_opened ?? 0} of ${c.stats.email_sent} (${Math.round(((c.stats.email_opened ?? 0) / c.stats.email_sent) * 100)}%)` : <span className="text-slate-300">—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

const SENT_WHEN: Record<string, string> = {
  welcome: "A school is created",
  trial_ending: "3 days and 1 day before a trial ends",
  renewal_reminder: "7 days before a renewal",
  invoice_issued: "An invoice is issued",
  payment_received: "A payment is recorded",
  invoice_overdue: "1, 7 and 14 days after the due date",
  ticket_reply: "Support replies to a ticket",
  announcement: "An announcement is sent by SMS or WhatsApp",
};

function Templates({ channel }: { channel: Chan }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ templates: MessageTemplate[] }>("/communication/templates"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const templates = (data?.templates ?? []).filter((t) => t.channel === channel);
  const [open, setOpen] = useState<MessageTemplate | "new" | null>(null);
  const [f, setF] = useState({ name: "", channel: channel as MessageTemplate["channel"], subject: "", body: "", provider_template_id: "" });
  const [formError, setFormError] = useState("");

  const openForm = (t: MessageTemplate | "new") => {
    setFormError("");
    setF(t === "new" ? { name: "", channel, subject: "", body: "", provider_template_id: "" } : { name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body, provider_template_id: t.provider_template_id ?? "" });
    setOpen(t);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, channel: f.channel, subject: f.channel === "email" ? f.subject : null, body: f.body, provider_template_id: f.channel === "sms" || f.channel === "whatsapp" ? f.provider_template_id || null : null };
    const ok = await run(async () => {
      try {
        if (open === "new") await adminFetch("/communication/templates", json("POST", body));
        else if (open) await adminFetch(`/communication/templates/${open.id}`, json("PATCH", body));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  return (
    <Panel title={`${CHANNEL_NAME[channel]} templates`} sub="Use {{school_name}}, {{admin_name}} and {{date}} as placeholders" right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New template</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || actionError} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Channel</Th><Th>Sent when</Th><Th>Message</Th><Th>Active</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!templates.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No templates."}</td></tr>}
          {templates.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900">{t.name}{t.key && <span className="ml-2"><Badge tone="gray">System</Badge></span>}</td>
              <td className="px-4 py-3"><Badge tone="blue">{t.channel}</Badge>{t.channel === "sms" && !t.provider_template_id && <span className="ml-2 text-xs text-amber-700">needs MSG91 template id</span>}{t.channel === "whatsapp" && !t.provider_template_id && <span className="ml-2 text-xs text-amber-700">needs Meta template name</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{t.key ? SENT_WHEN[t.key] ?? "Automatically" : "When you pick it"}</td>
              <td className="max-w-xs truncate px-4 py-3 text-slate-600">{t.body}</td>
              <td className="px-4 py-3">
                <input type="checkbox" role="switch" aria-label={"Turn " + t.name + (t.is_active ? " off" : " on")} className="size-4 accent-mca-blue" checked={t.is_active} disabled={busy}
                  onChange={() => run(() => adminFetch("/communication/templates/" + t.id + "/active", json("PATCH", { is_active: !t.is_active })))} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" className={`${btnGhost} mr-2 !px-2.5 !py-1 text-xs`} onClick={() => openForm(t)}>Edit</button>
                <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy || !!t.key} title={t.key ? "System templates cannot be deleted" : undefined} onClick={() => window.confirm(`Delete "${t.name}"?`) && run(() => adminFetch(`/communication/templates/${t.id}`, { method: "DELETE" }))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open !== null} title={open === "new" ? "New template" : "Edit template"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={formError} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
            <Field label="Channel">
              <select className={inputCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as MessageTemplate["channel"] })}>
                <option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
          </div>
          {f.channel === "email" && <Field label="Subject"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>}
          {f.channel === "whatsapp" && (
            <Field label="Meta template name" hint="The name of the template approved in your WhatsApp Business account. Its numbered slots {{1}}, {{2}}... are filled with this message's placeholders in the order they appear.">
              <input className={inputCls} value={f.provider_template_id} onChange={(e) => setF({ ...f, provider_template_id: e.target.value })} />
            </Field>
          )}
          {f.channel === "sms" && (
            <Field label="MSG91 template id" hint="The id of the DLT-approved flow template in your MSG91 account. Its variables must be named like the placeholders, e.g. ##school_name##.">
              <input className={inputCls} value={f.provider_template_id} onChange={(e) => setF({ ...f, provider_template_id: e.target.value })} />
            </Field>
          )}
          <Field label="Message" hint={f.channel === "sms" ? "For SMS this text is what the log shows; phones receive the approved MSG91 template." : undefined}>
            <textarea className={`${inputCls} min-h-[8rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={busy}>Save</button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

function DeliveryLog({ channel: fixed, all = false }: { channel?: Chan; all?: boolean }) {
  const [pickedChannel, setChannel] = useState("");
  const channel = fixed ?? pickedChannel;
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(
    () => adminFetch<HistoryResponse>(`/communication/${all ? "history" : "messages"}${qs({ channel, status, search, page })}`),
    [channel, status, search, page]
  );
  const { error: actionError, busy, run } = useAction(reload);
  const [note, setNote] = useState("");
  const tone = { sent: "green", failed: "red", queued: "blue", cancelled: "gray" } as const;
  const stats = data?.last30Days;

  const retry = () =>
    run(async () => {
      const r = await adminFetch<{ retried: number; skipped: number }>("/communication/messages/retry", json("POST", {}));
      setNote(`Retrying ${r.retried} message${r.retried === 1 ? "" : "s"}${r.skipped ? `; ${r.skipped} skipped because the provider is not configured` : ""}. Refresh in a moment.`);
    });

  return (
    <Panel
      title={fixed ? `${CHANNEL_NAME[fixed]} delivery logs` : "History"}
      sub={fixed ? "Every message sent on this channel: sent, failed or still waiting" : "Everything that went out on every channel: sent, failed or still waiting"}
      right={
        <div className="flex items-center gap-2">
          <button type="button" className={btnGhost} onClick={reload}>Refresh</button>
          <button type="button" className={btnGhost} disabled={busy || !stats?.queued} onClick={() => window.confirm("Cancel every message still waiting to be sent?") && run(async () => { const r = await adminFetch<{ cancelled: number }>("/communication/messages/cancel", json("POST", {})); setNote("Cancelled " + r.cancelled + " waiting message" + (r.cancelled === 1 ? "" : "s") + "."); })}>Cancel waiting</button>
          <button type="button" className={btnGhost} disabled={busy || !stats?.failed} onClick={retry}>Retry failed</button>
        </div>
      }
    >
      <div className="space-y-3 p-4">
        <ErrorBanner message={error || actionError} />
        {note && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{note}</p>}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-slate-500">Last 30 days:</span>
          <Badge tone="green">Sent {stats?.sent ?? 0}</Badge>
          <Badge tone="red">Failed {stats?.failed ?? 0}</Badge>
          <Badge tone="blue">Pending {stats?.queued ?? 0}</Badge>
          <span className="ml-auto text-xs text-slate-500">
            Email: {data?.providers.email.configured ? `connected (${data.providers.email.host})` : "not configured"} · SMS: {data?.providers.sms.configured ? "connected" : "not configured"} · WhatsApp: {data?.providers.whatsapp?.configured ? "connected" : "not connected"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className={`${inputCls} max-w-xs`} placeholder="Search address or subject…" aria-label="Search messages" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {!fixed && (
            <select className={`${inputCls} max-w-[9rem]`} aria-label="Channel" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
              <option value="">All channels</option><option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
            </select>
          )}
          <select className={`${inputCls} max-w-[9rem]`} aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="queued">Pending</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>To</Th><Th>Message</Th><Th>School</Th><Th>Status</Th><Th>When</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No messages yet."}</td></tr>}
          {data?.items.map((m: MessageRow) => (
            <tr key={m.id} className="align-top">
              <td className="px-4 py-3"><p className="break-all text-slate-900">{m.to_address}</p><p className="text-xs uppercase text-slate-400">{m.channel}</p></td>
              <td className="max-w-sm px-4 py-3"><p className="truncate font-semibold text-slate-800">{m.subject || m.body.slice(0, 60)}</p><p className="text-xs text-slate-400">{m.related_type ?? ""}</p></td>
              <td className="px-4 py-3 text-slate-600">{m.institutions?.name ?? "—"}</td>
              <td className="px-4 py-3"><Badge tone={tone[m.status]}>{m.status}</Badge>{m.opened_at && <p className="mt-1 text-xs text-emerald-700">Opened {fmtDate(m.opened_at)}</p>}{m.error && <p className="mt-1 max-w-[16rem] text-xs text-rose-700">{m.error}</p>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(m.sent_at ?? m.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {m.status === "queued" ? (
                  <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => run(() => adminFetch("/communication/messages/cancel", json("POST", { ids: [m.id] })))}>Cancel</button>
                ) : (
                  <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => run(() => adminFetch("/communication/messages/" + m.id + "/resend", json("POST", {})))}>Resend</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      {all && !!data?.inApp?.length && !channel && (!status || status === "sent" || status === "queued") && (
        <div className="border-t border-slate-100">
          <h3 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">In-app announcements</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.inApp.filter((r) => !status || (status === "sent") === (r.status === "sent")).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-800">{r.title}</p><p className="text-xs uppercase text-slate-400">in-app{r.kind !== "announcement" ? " · " + KIND_LABEL[r.kind] : ""}</p></td>
                  <td className="px-4 py-3 text-slate-600">{r.schools} school{r.schools === 1 ? "" : "s"}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === "sent" ? "green" : "blue"}>{r.status === "sent" ? "sent" : "scheduled"}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(r.when)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
