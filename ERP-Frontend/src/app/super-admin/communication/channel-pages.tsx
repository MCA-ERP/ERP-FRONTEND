"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type Announcement, type Campaign, type HistoryResponse, type MessageRow, type MessageTemplate, type MessagesResponse, type Plan } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small, smallPrimary } from "../schools/pages/shared";

type Chan = "email" | "sms" | "whatsapp";
const NAME: Record<Chan, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const SENT_WHEN: Record<string, string> = {
  welcome: "School approved", trial_ending: "3 days before trial end", renewal_reminder: "30, 15 and 3 days before renewal", invoice_issued: "Invoice created", payment_received: "Payment captured",
  invoice_overdue: "Invoice past due", ticket_reply: "Support ticket reply", announcement: "Announcement sent", login_otp: "Sign-in and password reset",
};
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString() ? `Today ${p(d.getHours())}:${p(d.getMinutes())}` : `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const mask = (to: string, c: string) => { if (c === "email") return to; const d = to.replace(/\D/g, ""); return d.length >= 10 ? `+91 ${d.slice(-10, -5)} •••${d.slice(-2)}` : to; };
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[6rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;

export type ChanTab = "templates" | "campaigns" | "logs";
export function ChannelPages({ channel, tab }: { channel: Chan; tab: ChanTab }) {
  return tab === "templates" ? <Templates channel={channel} /> : tab === "campaigns" ? <Campaigns channel={channel} /> : <Logs channel={channel} />;
}

// ── templates ──
function Templates({ channel }: { channel: Chan }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ templates: MessageTemplate[] }>("/communication/templates"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<MessageTemplate | "new" | null>(null);
  const [view, setView] = useState<MessageTemplate | null>(null);
  const [f, setF] = useState({ name: "", subject: "", body: "", provider: "" });
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === `communication/${channel}`) { setF({ name: "", subject: "", body: "", provider: "" }); setOpen("new"); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, [channel]);
  const rows = (data?.templates ?? []).filter((t) => t.channel === channel && has(`${t.name} ${t.subject ?? ""}`, search));
  const status = (t: MessageTemplate): [string, "good" | "warn" | "mute"] => (t.is_active ? ["Live", "good"] : channel === "whatsapp" && !t.provider_template_id ? ["Pending approval", "warn"] : ["Off", "mute"]);
  const edit = (t: MessageTemplate | "new") => { setF(t === "new" ? { name: "", subject: "", body: "", provider: "" } : { name: t.name, subject: t.subject ?? "", body: t.body, provider: t.provider_template_id ?? "" }); setOpen(t); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, channel, subject: channel === "email" ? f.subject : null, body: f.body, provider_template_id: channel === "email" ? null : f.provider || null };
    if (await act.run(() => (open === "new" ? adminFetch("/communication/templates", json("POST", body)) : adminFetch(`/communication/templates/${(open as MessageTemplate).id}`, json("PATCH", body))))) setOpen(null);
  };
  const sentWhen = (t: MessageTemplate) => (t.key && SENT_WHEN[t.key]) || "Sent by hand";
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={`${NAME[channel]} templates`} sub={`${rows.length} templates`} right={<ExportPrint name={`${channel}-templates`} head={["Template", "Sent when", "Status", "Active"]} rows={rows.map((t) => [t.name, sentWhen(t), status(t)[0], t.is_active ? "Yes" : "No"])} />}>
        <Search v={search} set={setSearch} label={`Search ${channel} templates`} />
        <SimpleTable head={[{ h: "Template" }, { h: "Sent when" }, { h: "Status" }, { h: "Active" }, { h: "" }]} empty={loading ? "Loading…" : `No ${NAME[channel]} templates.`}
          rows={rows.map((t) => [<b key="n" className="font-semibold text-slate-900">{t.name}</b>, sentWhen(t), <Chip key="s" tone={status(t)[1]}>{status(t)[0]}</Chip>,
            <Toggle key="a" checked={t.is_active} disabled={act.busy} label={`${t.name} active`} onChange={(v) => act.run(() => adminFetch(`/communication/templates/${t.id}/active`, json("PATCH", { is_active: v })))} />,
            <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(t)}>Edit</button><button type="button" className={small} onClick={() => setView(t)}>View details</button></span>])} />
      </Panel>
      {channel === "sms" && <p role="note" className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">SMS templates must be registered on the DLT portal before use.</p>}
      {channel === "whatsapp" && <p role="note" className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">WhatsApp templates need Meta&apos;s approval before use. Approval usually takes up to a day.</p>}
      <Modal open={open !== null} title={open === "new" ? `New ${NAME[channel]} template` : `Edit template · ${(open as MessageTemplate | null)?.name ?? ""}`} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          {open === "new" && <Labelled label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>}
          {channel === "email" && <Labelled label="Subject"><input className={inputCls} required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Labelled>}
          {channel !== "email" && <Labelled label={channel === "sms" ? "DLT template id" : "Meta template id"}><input className={inputCls} value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} /></Labelled>}
          <Labelled label="Body" hint="Variables: {{school_name}}, {{admin_name}}, {{plan}}, {{amount}}, {{due_date}}"><textarea className={`${inputCls} min-h-[8rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save template</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>
        {view && <><dl><Row k="Template" v={view.name} /><Row k="Sent when" v={sentWhen(view)} /><Row k="Status" v={<Chip tone={status(view)[1]}>{status(view)[0]}</Chip>} /><Row k="Active" v={<Toggle checked={view.is_active} disabled label="Active" onChange={() => undefined} />} /></dl><Footer on={() => setView(null)} /></>}
      </Modal>
    </div>
  );
}

// ── campaigns ──
function Campaigns({ channel }: { channel: Chan }) {
  const { data, error, loading } = useLoad(() => adminFetch<{ campaigns: Campaign[] }>("/communication/campaigns"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Campaign | null>(null);
  const aud = (c: Campaign) => { const a = c.audience; return a.type === "all" ? "All school admins" : a.type === "segment" ? { active: "Active schools", trial: "Trial schools", renewals_due: "Renewals due" }[a.segment] : a.type === "plans" ? a.plans.map((x) => plans.data?.plans.find((p) => p.code === x)?.name ?? x).join(", ") : `${a.school_ids.length} schools`; };
  const rows = (data?.campaigns ?? []).filter((c) => c.channels.includes(channel) && has(c.title, search));
  const sent = (c: Campaign) => c.stats[`${channel}_sent`] ?? 0;
  const third = channel === "sms" ? "Clicks" : "Opened";
  const thirdVal = (c: Campaign) => { const s = c.stats[`${channel}_sent`] ?? 0; const o = c.stats[`${channel}_opened`]; return channel === "sms" || !s || o === undefined ? "—" : `${Math.round((o / s) * 100)}%`; };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || plans.error} />
      <Panel title={`${NAME[channel]} campaigns`} sub={`${rows.length} campaigns`} right={<ExportPrint name={`${channel}-campaigns`} head={["Campaign", "Audience", "Date", "Sent", "Delivered", third]} rows={rows.map((c) => [c.title, aud(c), c.sent_at.slice(0, 10), c.stats[`${channel}_total`] ?? sent(c), sent(c), thirdVal(c)])} />}>
        <Search v={search} set={setSearch} label={`Search ${channel} campaigns`} />
        <SimpleTable head={[{ h: "Campaign" }, { h: "Audience" }, { h: "Date" }, { h: "Sent", right: true }, { h: "Delivered", right: true }, { h: third, right: true }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing has been sent on this channel yet."}
          rows={rows.map((c) => [<b key="t" className="font-semibold text-slate-900">{c.title}</b>, aud(c), fmtDay(c.sent_at.slice(0, 10)), c.stats[`${channel}_total`] ?? sent(c), sent(c), thirdVal(c), <Chip key="s" tone="info">Sent</Chip>, <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>
        {view && <><dl><Row k="Audience" v={aud(view)} /><Row k="Sent on" v={fmtDay(view.sent_at.slice(0, 10))} /><Row k="Sent" v={String(view.stats[`${channel}_total`] ?? sent(view))} /><Row k="Delivered" v={String(sent(view))} /><Row k="Failed" v={String(view.stats[`${channel}_failed`] ?? 0)} /></dl><Footer on={() => setView(null)} /></>}
      </Modal>
    </div>
  );
}

// ── delivery logs ──
function Logs({ channel }: { channel: Chan }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<MessagesResponse>(`/communication/messages?channel=${channel}&pageSize=100`), [channel]);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<MessageRow | null>(null);
  const rows = (data?.items ?? []).filter((m) => has(`${m.subject ?? ""} ${m.related_type ?? ""} ${m.institutions?.name ?? ""} ${m.to_address}`, search));
  const label = (m: MessageRow) => m.subject || (m.related_type ? m.related_type.replace(/_/g, " ") : m.body.slice(0, 40));
  const res = (m: MessageRow): [string, "good" | "bad" | "info" | "mute"] => (m.status === "sent" ? (m.opened_at ? ["Delivered", "good"] : ["Delivered", "good"]) : m.status === "failed" ? ["Failed", "bad"] : m.status === "queued" ? ["Pending", "info"] : ["Cancelled", "mute"]);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={`${NAME[channel]} delivery log`} sub={`${rows.length} messages`} right={<ExportPrint name={`${channel}-delivery-log`} head={["Message", "School", "Recipient", "Result", "Time"]} rows={rows.map((m) => [label(m), m.institutions?.name, mask(m.to_address, channel), res(m)[0], when(m.sent_at ?? m.created_at)])} />}>
        <Search v={search} set={setSearch} label={`Search ${channel} delivery log`} />
        <SimpleTable head={[{ h: "Message" }, { h: "School" }, { h: "Recipient" }, { h: "Result" }, { h: "Time" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing has been sent on this channel yet."}
          rows={rows.map((m) => [<b key="m" className="font-semibold text-slate-900">{label(m)}</b>, m.institutions?.name ?? "—", mask(m.to_address, channel), <Chip key="r" tone={res(m)[1]}>{res(m)[0]}</Chip>, when(m.sent_at ?? m.created_at),
            <span key="a" className="flex gap-1.5">{m.status === "failed" && <button type="button" className={smallPrimary} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/communication/messages/${m.id}/resend`, json("POST", {})))}>Resend</button>}<button type="button" className={small} onClick={() => setView(m)}>View details</button></span>])} />
      </Panel>
      <MessageModal m={view} channel={channel} onClose={() => setView(null)} />
    </div>
  );
}

function MessageModal({ m, channel, onClose }: { m: MessageRow | null; channel: string; onClose: () => void }) {
  return (
    <Modal open={!!m} title={m ? (m.subject || m.related_type?.replace(/_/g, " ") || "Message") : ""} onClose={onClose}>
      {m && <><dl><Row k="To" v={`${m.institutions?.name ?? "—"} · ${mask(m.to_address, channel)}`} /><Row k="Status" v={m.status} /><Row k="Time" v={when(m.sent_at ?? m.created_at)} />{m.error && <Row k="Error" v={m.error} />}</dl><p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{m.body}</p><Footer on={onClose} /></>}
    </Modal>
  );
}

// ═════════════ Notifications ═════════════
export type NotifTab = "push" | "inapp";
export function NotificationPages({ tab }: { tab: NotifTab }) {
  return tab === "push" ? <Push /> : <InApp />;
}

function Push() {
  const [f, setF] = useState({ title: "", send: "all", message: "", opens: "dashboard", quiet: true });
  return (
    <div className="space-y-5">
      <FormCard title="Send a push notification" saveLabel="Send notification" disabled onDiscard={() => setF({ title: "", send: "all", message: "", opens: "dashboard", quiet: true })} onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Title"><input className={inputCls} maxLength={50} placeholder="Max 50 characters" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Labelled>
          <Labelled label="Send to"><select className={inputCls} value={f.send} onChange={(e) => setF({ ...f, send: e.target.value })}><option value="all">All school admins</option></select></Labelled>
        </div>
        <Labelled label="Message"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={150} placeholder="Max 150 characters" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Labelled>
        <Labelled label="Opens"><select className={`${inputCls} max-w-[12rem]`} value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })}><option value="dashboard">Dashboard</option></select></Labelled>
        <ToggleRow label="Respect quiet hours" hint="No notifications from 9 pm to 7 am" checked={f.quiet} onChange={(v) => setF({ ...f, quiet: v })} />
      </FormCard>
      <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-900">Push notifications are not connected yet: they need the mobile app and a push service. Until then, use an In-App Alert, which school admins see inside the portal.</p>
    </div>
  );
}

function InApp() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ announcements: Announcement[] }>("/communication/announcements"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Announcement | null>(null);
  const TYPE: Record<string, string> = { banner: "Banner", alert: "Alert", popup: "Pop-up" };
  const rows = (data?.announcements ?? []).filter((a) => a.kind !== "announcement" && has(a.title, search));
  const aud = (a: Announcement) => (a.audience.type === "all" ? "All schools" : a.audience.type === "segment" ? { active: "Active schools", trial: "New schools", renewals_due: "Renewals due" }[a.audience.segment] : a.audience.type === "plans" ? a.audience.plans.map((c) => plans.data?.plans.find((p) => p.code === c)?.name ?? c).join(", ") : `${a.audience.school_ids.length} schools`);
  const span = (a: Announcement) => { const d = (i: string | null) => (i ? `${new Date(i).getDate()} ${new Date(i).toLocaleString("en-IN", { month: "short" })}` : ""); return a.scheduled_for || a.sent_at ? `${d(a.scheduled_for ?? a.sent_at)}${a.ends_at ? ` – ${d(a.ends_at)}` : ""}` : a.ends_at ? `Until ${d(a.ends_at)}` : "Until ended"; };
  const live = (a: Announcement) => a.status === "sent" && !a.ended_at;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || plans.error || act.error} />
      <Panel title="In-app alerts" sub={`${rows.length} alerts`} right={<ExportPrint name="in-app-alerts" head={["Alert", "Type", "Shown to", "When", "Status"]} rows={rows.map((a) => [a.title, TYPE[a.kind], aud(a), span(a), live(a) ? "Active" : a.ended_at ? "Ended" : a.status])} />}>
        <Search v={search} set={setSearch} label="Search in-app alerts" />
        <SimpleTable head={[{ h: "Alert" }, { h: "Type" }, { h: "Shown to" }, { h: "When" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No in-app alerts yet."}
          rows={rows.map((a) => [<b key="t" className="font-semibold text-slate-900">{a.title}</b>, <Tag key="k">{TYPE[a.kind]}</Tag>, aud(a), span(a), <Chip key="s" tone={live(a) ? "good" : "mute"}>{live(a) ? "Active" : a.ended_at ? "Ended" : a.status === "draft" ? "Draft" : "Scheduled"}</Chip>,
            <span key="b" className="flex gap-1.5">{live(a) && <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("End this now? Schools will stop seeing it.") && act.run(() => adminFetch(`/communication/announcements/${a.id}/end`, json("POST", {})))}>End now</button>}<button type="button" className={small} onClick={() => setView(a)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><p className="whitespace-pre-wrap text-sm text-slate-800">{view.body}</p><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Communication history ═════════════
export type HistTab = "sent" | "failed" | "pending";
const HCHAN: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", in_app: "In-app", push: "Push" };

export function HistoryPages({ tab }: { tab: HistTab }) {
  const status = { sent: "sent", failed: "failed", pending: "queued" }[tab];
  const { data, error, loading, reload } = useLoad(() => adminFetch<HistoryResponse>(`/communication/history?status=${status}&pageSize=100`), [status]);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<MessageRow | null>(null);
  const label = (m: MessageRow) => m.subject || (m.related_type ? m.related_type.replace(/_/g, " ") : m.body.slice(0, 40));
  const msgs = (data?.items ?? []).filter((m) => has(`${label(m)} ${m.institutions?.name ?? ""}`, search));
  const app = tab === "sent" ? (data?.inApp ?? []).filter((a) => a.status === "sent" && has(a.title, search)) : tab === "pending" ? (data?.inApp ?? []).filter((a) => a.status === "queued" && has(a.title, search)) : [];
  const title = { sent: "Sent messages", failed: "Failed messages", pending: "Pending messages" }[tab];
  const chip = (): [string, "good" | "bad" | "warn"] => (tab === "sent" ? ["Sent", "good"] : tab === "failed" ? ["Failed", "bad"] : ["Pending", "warn"]);
  const total = msgs.length + app.length;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={title} sub={`${total} messages`} right={<ExportPrint name={`${tab}-messages`} head={["Channel", "Message", "To", "Status", "Time"]} rows={[...msgs.map((m) => [HCHAN[m.channel], label(m), m.institutions?.name, chip()[0], when(m.sent_at ?? m.created_at)]), ...app.map((a) => ["In-app", a.title, `${a.schools} schools`, chip()[0], when(a.when)])]} />}>
        <Search v={search} set={setSearch} label={`Search ${tab} messages`} />
        <SimpleTable head={[{ h: "Channel" }, { h: "Message" }, { h: "To" }, { h: "Status" }, { h: "Time" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing here."}
          rows={[
            ...msgs.map((m) => [<Tag key="c">{HCHAN[m.channel]}</Tag>, <b key="m" className="font-semibold text-slate-900">{label(m)}</b>, m.institutions?.name ?? "—", <Chip key="s" tone={chip()[1]}>{chip()[0]}</Chip>, when(m.sent_at ?? m.created_at),
              <span key="a" className="flex gap-1.5">{tab === "failed" && <button type="button" className={smallPrimary} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/communication/messages/${m.id}/resend`, json("POST", {})))}>Retry</button>}{tab === "pending" && <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch("/communication/messages/cancel", json("POST", { ids: [m.id] })))}>Cancel</button>}<button type="button" className={small} onClick={() => setView(m)}>View details</button></span>]),
            ...app.map((a) => [<Tag key="c">In-app</Tag>, <b key="m" className="font-semibold text-slate-900">{a.title}</b>, `${a.schools} school${a.schools === 1 ? "" : "s"}`, <Chip key="s" tone={chip()[1]}>{chip()[0]}</Chip>, when(a.when), ""]),
          ]} />
      </Panel>
      <MessageModal m={view} channel={view?.channel ?? ""} onClose={() => setView(null)} />
    </div>
  );
}
