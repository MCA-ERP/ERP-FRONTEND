"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type Announcement, type Audience, type MessageTemplate, type Plan } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, small, smallPrimary } from "../schools/pages/shared";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const CHANNEL: [string, string, string[]][] = [["inapp", "In-app", ["in_app"]], ["email", "Email", ["email"]], ["both", "Email + In-app", ["email", "in_app"]], ["emailsms", "Email + SMS", ["email", "sms"]], ["all", "Email + In-app + SMS", ["email", "in_app", "sms"]]];
const chanLabel = (c: string[]) => { const s = [...c].sort().join(","); return CHANNEL.find(([, , v]) => [...v].sort().join(",") === s)?.[1] ?? c.map((x) => (x === "in_app" ? "In-app" : x.toUpperCase())).join(" + "); };
const SEGMENT: Record<string, string> = { active: "Active schools", trial: "Trial schools", renewals_due: "Renewals due" };
const audLabel = (a: Audience, plans: Plan[]) => (a.type === "all" ? "All schools" : a.type === "segment" ? SEGMENT[a.segment] : a.type === "plans" ? a.plans.map((c) => plans.find((p) => p.code === c)?.name ?? c).join(", ") : `${a.school_ids.length} school${a.school_ids.length === 1 ? "" : "s"}`);

export type AnnTab = "create" | "schedule" | "publish" | "history";

export function AnnouncementPages({ tab }: { tab: AnnTab }) {
  const list = useLoad(() => adminFetch<{ announcements: Announcement[] }>("/communication/announcements"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const act = useAction(list.reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Announcement | null>(null);
  const [date, setDate] = useState<Record<string, string>>({});
  const all = list.data?.announcements ?? [];
  const p = plans.data?.plans ?? [];
  const err = list.error || plans.error || act.error;

  if (tab === "create") return <Create plans={p} onDone={list.reload} />;

  const rows = (tab === "schedule" ? all.filter((a) => a.status !== "sent") : tab === "publish" ? all.filter((a) => a.status === "draft") : all.filter((a) => a.status === "sent")).filter((a) => has(`${a.title} ${audLabel(a.audience, p)}`, search));
  const title = { schedule: "Schedule", publish: "Drafts", history: "Sent" }[tab];
  const toIso = (d: string) => new Date(`${d}T09:00:00`).toISOString();
  const schedule = (a: Announcement) => { const d = date[a.id]; if (d) void act.run(() => adminFetch(`/communication/announcements/${a.id}`, json("PATCH", { scheduled_for: toIso(d) }))); };
  const publish = (a: Announcement) => { if (window.confirm(`Send "${a.title}" now? This cannot be undone.`)) void act.run(() => adminFetch(`/communication/announcements/${a.id}/send`, json("POST", {}))); };
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const detail = (a: Announcement) => <button key="v" type="button" className={small} onClick={() => setView(a)}>View details</button>;
  const head = tab === "schedule" ? [{ h: "Title" }, { h: "Audience" }, { h: "Channels" }, { h: "Status" }, { h: "Send on" }, { h: "" }] : tab === "publish" ? [{ h: "Title" }, { h: "Audience" }, { h: "Channels" }, { h: "" }] : [{ h: "Title" }, { h: "Audience" }, { h: "Channels" }, { h: "Sent" }, { h: "Read by", right: true }, { h: "" }];
  const body = rows.map((a) => {
    const t = <b key="t" className="font-semibold text-slate-900">{a.title}</b>;
    const au = audLabel(a.audience, p);
    const ch = <Tag key="c">{chanLabel(a.channels)}</Tag>;
    if (tab === "schedule") return [t, au, ch, <Chip key="s" tone={a.status === "scheduled" ? "info" : "mute"}>{a.status === "scheduled" ? "Scheduled" : "Draft"}</Chip>, a.scheduled_for ? fmtDay(a.scheduled_for.slice(0, 10)) : "—",
      <span key="a" className="flex items-center gap-1.5">{a.status === "scheduled" ? <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/communication/announcements/${a.id}/unschedule`, json("POST", {})))}>Unschedule</button>
        : <><input type="date" aria-label={`Send ${a.title} on`} min={tomorrow} className={`${inputCls} !w-36 !py-1`} value={date[a.id] ?? ""} onChange={(e) => setDate({ ...date, [a.id]: e.target.value })} /><button type="button" className={smallPrimary} disabled={act.busy || !date[a.id]} onClick={() => schedule(a)}>Schedule</button></>}{detail(a)}</span>];
    if (tab === "publish") return [t, au, ch, <span key="a" className="flex gap-1.5"><button type="button" className={smallPrimary} disabled={act.busy} onClick={() => publish(a)}>Publish now</button>{detail(a)}</span>];
    return [t, au, ch, a.sent_at ? fmtDay(a.sent_at.slice(0, 10)) : "—", a.delivered ? `${Math.round((a.read_by / a.delivered) * 100)}%` : "—", detail(a)];
  });
  return (
    <div className="space-y-5">
      <ErrorBanner message={err} />
      <Panel title={title} sub={`${rows.length} ${tab === "publish" ? "drafts" : "announcements"}`} right={<ExportPrint name={`announcements-${tab}`} head={["Title", "Audience", "Channels", "Status", "Date"]} rows={rows.map((a) => [a.title, audLabel(a.audience, p), chanLabel(a.channels), a.status, (a.sent_at ?? a.scheduled_for ?? a.created_at).slice(0, 10)])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${title.toLowerCase()}`} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={head} rows={body} empty={list.loading ? "Loading…" : "Nothing here."} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p className="whitespace-pre-wrap text-slate-800">{view.body}</p><p className="text-xs text-slate-500">{audLabel(view.audience, p)} · {chanLabel(view.channels)}{view.status === "sent" ? ` · delivered to ${view.delivered}` : ""}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

function Create({ plans, onDone }: { plans: Plan[]; onDone: () => void }) {
  const blank = { title: "", send: "all", channels: "both", body: "" };
  const [f, setF] = useState(blank);
  const [saved, setSaved] = useState(false);
  const act = useAction(onDone);
  const set = (k: keyof typeof blank, v: string) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  const audience = (): Audience => (f.send === "all" ? { type: "all" } : f.send.startsWith("seg:") ? { type: "segment", segment: f.send.slice(4) as "active" | "trial" | "renewals_due" } : { type: "plans", plans: [f.send.slice(5)] });
  return (
    <FormCard title="New announcement" saveLabel="Save as draft" busy={act.busy} saved={saved} error={act.error} onDiscard={() => { setF(blank); setSaved(false); }}
      onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch("/communication/announcements", json("POST", { title: f.title, body: f.body, audience: audience(), channels: CHANNEL.find(([k]) => k === f.channels)?.[2] ?? ["in_app"], kind: "announcement" })))) { setSaved(true); setF(blank); } }}>
      <Labelled label="Title"><input className={inputCls} required placeholder="e.g. Fee module update" value={f.title} onChange={(e) => set("title", e.target.value)} /></Labelled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Send to"><select className={inputCls} value={f.send} onChange={(e) => set("send", e.target.value)}><option value="all">All schools</option>{Object.entries(SEGMENT).map(([k, l]) => <option key={k} value={`seg:${k}`}>{l}</option>)}{plans.map((p) => <option key={p.id} value={`plan:${p.code}`}>{p.name} plan</option>)}</select></Labelled>
        <Labelled label="Channels"><select className={inputCls} value={f.channels} onChange={(e) => set("channels", e.target.value)}>{CHANNEL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Labelled>
      </div>
      <Labelled label="Message"><textarea className={`${inputCls} min-h-[7rem]`} required placeholder="What school admins will read" value={f.body} onChange={(e) => set("body", e.target.value)} /></Labelled>
    </FormCard>
  );
}

// ═════════════ Email templates ═════════════
const WHEN: Record<string, string> = { welcome: "School approved", invoice_issued: "Invoice created", payment_received: "Payment captured", renewal_reminder: "30, 15 and 3 days before renewal", trial_ending: "Trial about to end", invoice_overdue: "Invoice past due", ticket_reply: "Support replies", announcement: "Announcement sent", login_otp: "Sign-in code requested" };

export function EmailTemplates() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ templates: MessageTemplate[] }>("/communication/templates"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<MessageTemplate | "new" | null>(null);
  const [view, setView] = useState<MessageTemplate | null>(null);
  const [f, setF] = useState({ name: "", subject: "", body: "" });
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "communication/email") { setF({ name: "", subject: "", body: "" }); setOpen("new"); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const rows = (data?.templates ?? []).filter((t) => t.channel === "email" && has(`${t.name} ${t.subject ?? ""}`, search));
  const edit = (t: MessageTemplate | "new") => { setF(t === "new" ? { name: "", subject: "", body: "" } : { name: t.name, subject: t.subject ?? "", body: t.body }); setOpen(t); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, channel: "email", subject: f.subject, body: f.body };
    if (await act.run(() => (open === "new" ? adminFetch("/communication/templates", json("POST", body)) : adminFetch(`/communication/templates/${(open as MessageTemplate).id}`, json("PATCH", body))))) setOpen(null);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Email templates" sub={`${rows.length} templates`} right={<span className="flex gap-2"><ExportPrint name="email-templates" head={["Template", "Sent when", "Active"]} rows={rows.map((t) => [t.name, (t.key && WHEN[t.key]) || "Sent by hand", t.is_active ? "Yes" : "No"])} /></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search email templates" aria-label="Search email templates" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Template" }, { h: "Sent when" }, { h: "Status" }, { h: "Active" }, { h: "" }]} empty={loading ? "Loading…" : "No email templates."}
          rows={rows.map((t) => [<b key="n" className="font-semibold text-slate-900">{t.name}</b>, (t.key && WHEN[t.key]) || "Sent by hand", <Chip key="s" tone={t.is_active ? "good" : "mute"}>{t.is_active ? "Live" : "Off"}</Chip>,
            <Toggle key="a" checked={t.is_active} disabled={act.busy} label={`${t.name} active`} onChange={(v) => act.run(() => adminFetch(`/communication/templates/${t.id}/active`, json("PATCH", { is_active: v })))} />,
            <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(t)}>Edit</button><button type="button" className={small} onClick={() => setView(t)}>View details</button></span>])} />
      </Panel>
      <Modal open={open !== null} title={open === "new" ? "New email template" : "Edit email template"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="Subject"><input className={inputCls} required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Labelled>
          <Labelled label="Message"><textarea className={`${inputCls} min-h-[8rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p><b>Subject:</b> {view.subject}</p><p className="whitespace-pre-wrap text-slate-800">{view.body}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}
