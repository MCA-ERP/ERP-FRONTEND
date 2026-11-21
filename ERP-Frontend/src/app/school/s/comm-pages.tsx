"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";
import { useGoTab } from "./tab-context";

const V = "/school/comm";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Approved", "Published", "Live", "Delivered", "Scheduled"].includes(s) ? "good" : ["Pending approval", "Pending"].includes(s) ? "warn" : ["Expired", "Failed", "Rejected"].includes(s) ? "bad" : "mute");
const tiles = (items: [string, string | number, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const cnt = (all: { status: string }[], s: string): [string, number, string] => [s, all.filter((x) => x.status === s).length, `${pct(all.filter((x) => x.status === s).length, all.length)} of shown`];
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-[13px] text-slate-800">{label}<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={`relative h-[22px] w-10 rounded-full ${on ? "bg-[#0294ce]" : "bg-slate-300"}`}><span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : ""}`} /></button></div>;
const Actions = ({ children }: { children: ReactNode }) => <span className="flex gap-1.5">{children}</span>;

// ═════════════ circulars ═════════════
type Circ = { id: string; code: string; title: string; audience: string; issued_by: string; circ_date: string; status: string; body: string };
const OFFICES = ["Exam cell", "Principal's office", "Admin office", "Accounts", "Transport office", "Library"];
export function CircularPages({ tab }: { tab: "create-circular" | "publish" | "archive" | "templates" }) {
  const d = useLoad(() => schoolFetch<{ audiences: string[]; items: Circ[]; templates: { key: string; name: string; audience: string; wording: string; used: number; last_used: string | null }[] }>(`${V}/circulars`), []); const act = useAction(() => d.reload()); const go = useGoTab();
  const blank = { code: "", title: "", audience: "Staff", issued_by: OFFICES[0], circ_date: nowIst(), template_key: "" }; const [f, setF] = useState(blank); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [v, setV] = useState<Circ | null>(null);
  const x = d.data; const err = d.error || act.error;
  if (tab === "create-circular") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let c = ""; if (await act.run(async () => { const r = await schoolFetch<{ code: string }>(`${V}/circulars`, json("POST", { ...f, code: f.code || undefined, template_key: f.template_key || null })); c = r.code; })) { setF(blank); setMsg(`${c} saved. It appears in Publish for approval.`); } };
    return <div>{okBox(msg)}<FormCard title="Create Circular" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Circular no."><input className={inputCls} maxLength={20} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field><Field label="Title"><input className={inputCls} required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="For"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{(x?.audiences ?? ["Staff"]).map((a) => <option key={a}>{a}</option>)}</select></Field><Field label="Issued by"><select className={inputCls} value={f.issued_by} onChange={(e) => setF({ ...f, issued_by: e.target.value })}>{OFFICES.map((a) => <option key={a}>{a}</option>)}</select></Field>
      <Field label="Date"><input type="date" required className={inputCls} value={f.circ_date} onChange={(e) => setF({ ...f, circ_date: e.target.value })} /></Field></FormCard></div>;
  }
  if (tab === "templates") {
    const rows = (x?.templates ?? []).filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Templates keep circulars consistent. Words in {"{braces}"} are filled in when you use one.</p>
      <ListPanel title="Circular templates" noun="templates" search={search} onSearch={setSearch} exportName="circular-templates" head={["Template", "For", "Wording", "Used", "Last used"]} exportRows={rows.map((i) => [i.name, i.audience, i.wording, i.used, i.last_used ? day(i.last_used) : ""])}
        tableHead={["Template", "For", "Wording", "Used", "Last used", ""]} empty={d.loading ? "Loading…" : "No templates."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.audience, <span key="w" className="block max-w-xl text-[12px]">{i.wording}</span>, i.used, i.last_used ? day(i.last_used) : "—", <button key="u" type="button" className={primaryCls} onClick={() => { setF({ ...blank, title: i.name, audience: i.audience, template_key: i.key }); go("create-circular"); }}>Use template</button>])} /></div>;
  }
  const status = tab === "publish" ? "Draft" : "Archived"; const scope = (x?.items ?? []).filter((i) => i.status === status); const rows = scope.filter((i) => has(i, search));
  const dec = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/circulars/${id}/decide`, json("POST", { action }))).then((ok) => ok && setV(null));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Circulars", scope.length, "Sample records shown"], cnt(scope, status)])}
    <ListPanel title="Circulars" noun="circulars" search={search} onSearch={setSearch} exportName={tab} head={["Circular no.", "Title", "For", "Issued by", "Date", "Status"]} exportRows={rows.map((i) => [i.code, i.title, i.audience, i.issued_by, day(i.circ_date), i.status])}
      tableHead={["Circular no.", "Title", "For", "Issued by", "Date", "Status", ""]} empty={d.loading ? "Loading…" : tab === "publish" ? "Nothing is waiting for a decision." : "Nothing archived yet."}
      rows={rows.map((i) => [i.code, i.title, i.audience, i.issued_by, day(i.circ_date), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <Actions key="a">{tab === "publish" && <><button type="button" className={redBtn} disabled={act.busy} onClick={() => dec(i.id, "reject")}>Reject</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i.id, "approve")}>Approve</button></>}<button type="button" className={small} onClick={() => setV(i)}>View details</button></Actions>])} />
    <Modal open={!!v} title={v ? `${v.code} · ${v.title}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="For" v={v.audience} /><Row k="Issued by" v={v.issued_by} /><Row k="Date" v={day(v.circ_date)} /><Row k="Status" v={v.status} />{v.body && <Row k="Wording" v={v.body} />}</dl><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

// ═════════════ announcements ═════════════
type Ann = { id: string; title: string; audience: string; channels: string; send_on: string; status: string };
export function AnnouncementPages({ tab }: { tab: "create" | "schedule" | "publish" }) {
  const d = useLoad(() => schoolFetch<{ channels: string[]; items: Ann[] }>(`${V}/announcements`), []); const act = useAction(() => d.reload());
  const blank = { title: "", audience: "Everyone", channels: "App + SMS", send_on: nowIst() }; const [f, setF] = useState(blank); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [v, setV] = useState<Ann | null>(null); const x = d.data; const err = d.error || act.error;
  if (tab === "create") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/announcements`, json("POST", f)))) { setF(blank); setMsg("Saved. It appears in Schedule."); } };
    return <div>{okBox(msg)}<FormCard title="Create" cols="lg:grid-cols-4" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Title"><input className={inputCls} required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="Audience"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["Everyone", "Students", "Staff", "Parents"].map((a) => <option key={a}>{a}</option>)}</select></Field>
      <Field label="Channels"><select className={inputCls} value={f.channels} onChange={(e) => setF({ ...f, channels: e.target.value })}>{(x?.channels ?? ["App + SMS"]).map((a) => <option key={a}>{a}</option>)}</select></Field><Field label="Send on"><input type="date" required min={nowIst()} className={inputCls} value={f.send_on} onChange={(e) => setF({ ...f, send_on: e.target.value })} /></Field></FormCard></div>;
  }
  const status = tab === "publish" ? "Draft" : "Scheduled"; const scope = (x?.items ?? []).filter((i) => i.status === status); const rows = scope.filter((i) => has(i, search));
  const dec = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/announcements/${id}/decide`, json("POST", { action })));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Announcements", scope.length, "Sample records shown"], cnt(scope, status)])}
    <ListPanel title="Announcements" noun="announcements" search={search} onSearch={setSearch} exportName={tab} head={["Title", "Audience", "Channels", "Send on", "Status"]} exportRows={rows.map((i) => [i.title, i.audience, i.channels, day(i.send_on), i.status])}
      tableHead={["Title", "Audience", "Channels", "Send on", "Status", ""]} empty={d.loading ? "Loading…" : tab === "publish" ? "Nothing is waiting for a decision." : "Nothing scheduled yet."}
      rows={rows.map((i) => [i.title, i.audience, i.channels, day(i.send_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <Actions key="a">{tab === "publish" && <><button type="button" className={redBtn} disabled={act.busy} onClick={() => dec(i.id, "reject")}>Reject</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i.id, "approve")}>Approve</button></>}<button type="button" className={small} onClick={() => setV(i)}>View details</button></Actions>])} />
    <Modal open={!!v} title={v?.title ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Audience" v={v.audience} /><Row k="Channels" v={v.channels} /><Row k="Send on" v={day(v.send_on)} /><Row k="Status" v={v.status} /></dl><p className="mt-3 text-xs text-slate-500">Nothing is sent automatically yet; no SMS or e-mail service is connected.</p><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

// ═════════════ notice board ═════════════
type Notice = { id: string; title: string; audience: string; posted_by: string; posted_on: string; expires_on: string; status: string };
export function NoticePages({ tab }: { tab: "Student" | "Staff" | "Parent" }) {
  const d = useLoad(() => schoolFetch<{ items: Notice[] }>(`${V}/notices`), []); const [search, setSearch] = useState(""); const [v, setV] = useState<Notice | null>(null);
  const scope = (d.data?.items ?? []).filter((i) => i.audience === tab); const rows = scope.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} />{tiles([["Notices", scope.length, "Sample records shown"], cnt(scope, "Live"), cnt(scope, "Expired")])}
    <ListPanel title="Notices" noun="notices" search={search} onSearch={setSearch} exportName={`${tab}-notices`} head={["Notice", "Audience", "Posted by", "Posted", "Expires", "Status"]} exportRows={rows.map((i) => [i.title, `${i.audience} notices`, i.posted_by, day(i.posted_on), day(i.expires_on), i.status])}
      tableHead={["Notice", "Audience", "Posted by", "Posted", "Expires", "Status", ""]} empty={d.loading ? "Loading…" : "No notices yet."}
      rows={rows.map((i) => [i.title, `${i.audience} notices`, i.posted_by, day(i.posted_on), day(i.expires_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v?.title ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Audience" v={`${v.audience} notices`} /><Row k="Posted by" v={v.posted_by} /><Row k="Posted" v={day(v.posted_on)} /><Row k="Expires" v={day(v.expires_on)} /><Row k="Status" v={v.status} /></dl><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

// ═════════════ templates, compose and the message log (Email, SMS, WhatsApp, In-App) ═════════════
type Tpl = { id: string; name: string; channel: string; variables: string; body: string; status: string; used: number };
export function TemplateList() {
  const d = useLoad(() => schoolFetch<{ items: Tpl[] }>(`${V}/templates`), []); const act = useAction(() => d.reload()); const [search, setSearch] = useState(""); const [v, setV] = useState<Tpl | null>(null);
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const cur = all.find((i) => i.id === v?.id) ?? null; const err = d.error || act.error;
  const set = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/templates/${id}/status`, json("POST", { action }))).then((ok) => ok && setV(null));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Message templates", all.length, "Sample records shown"], cnt(all, "Approved"), cnt(all, "Pending approval"), cnt(all, "Draft")])}
    <ListPanel title="Message templates" noun="templates" search={search} onSearch={setSearch} exportName="message-templates" head={["Template", "Channel", "Variables", "Used this month", "Status"]} exportRows={rows.map((i) => [i.name, i.channel, i.variables, i.used, i.status])}
      tableHead={["Template", "Channel", "Variables", "Used this month", "Status", ""]} empty={d.loading ? "Loading…" : "No templates."}
      rows={rows.map((i) => [i.name, i.channel, i.variables, <span key="u" className="block text-right">{i.used.toLocaleString("en-IN")}</span>, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!cur} title={cur?.name ?? ""} onClose={() => setV(null)}>{cur && <><dl><Row k="Channel" v={cur.channel} /><Row k="Variables" v={cur.variables} /><Row k="Wording" v={cur.body} /><Row k="Status" v={cur.status} /></dl>
      <div className="mt-4 flex justify-end gap-2"><button type="button" className={small} onClick={() => setV(null)}>Close</button>{cur.status === "Draft" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => set(cur.id, "submit")}>Send for approval</button>}{cur.status === "Pending approval" && <><button type="button" className={redBtn} disabled={act.busy} onClick={() => set(cur.id, "withdraw")}>Send back to draft</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => set(cur.id, "approve")}>Approve</button></>}</div></>}</Modal></div>;
}

type Msg = { id: string; ref: string; channel: string; title: string; subject: string; message: string; audience: string; class_label: string; recipients: number; send_on: string; status: string };
export function MessageLog({ channel }: { channel: "Email" | "SMS" | "WhatsApp" | "In-App" }) {
  const d = useLoad(() => schoolFetch<{ items: Msg[] }>(`${V}/messages/${channel}`), [channel]); const [search, setSearch] = useState(""); const [v, setV] = useState<Msg | null>(null);
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const extra = ["Pending", "Scheduled", "Failed"].filter((s) => all.some((x) => x.status === s));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} />{tiles([["Message log", all.length, "Sample records shown"], cnt(all, "Delivered"), ...extra.map((s) => cnt(all, s))])}
    <ListPanel title={channel === "In-App" ? "Notifications" : "Message log"} noun="messages" search={search} onSearch={setSearch} exportName={`${channel}-messages`} head={["Ref.", "Channel", "Message", "Recipients", "Delivered", "Sent", "Status"]} exportRows={rows.map((i) => [i.ref, i.channel === "In-App" ? "App" : i.channel, i.title, i.recipients, "", day(i.send_on), i.status])}
      tableHead={["Ref.", "Channel", "Message", "Recipients", "Delivered", "Sent", "Status", ""]} empty={d.loading ? "Loading…" : "Nothing has been sent yet."}
      rows={rows.map((i) => [i.ref, i.channel === "In-App" ? "App" : i.channel, i.title, <span key="r" className="block text-right">{i.recipients.toLocaleString("en-IN")}</span>, "—", day(i.send_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v ? `${v.ref} · ${v.title}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Sent to" v={`${v.audience} · ${v.class_label}`} /><Row k="Recipients" v={v.recipients} /><Row k="Date" v={day(v.send_on)} /><Row k="Status" v={v.status} />{v.subject && <Row k="Subject" v={v.subject} />}<Row k="Message" v={v.message} /></dl>
      <p className="mt-3 text-xs text-slate-500">Delivery is not tracked yet: no {channel === "In-App" ? "app push" : channel} service is connected, so messages stay {v.status === "Scheduled" ? "scheduled" : "pending"}.</p><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

export function ComposeForm({ channel, title, send }: { channel: "Email" | "SMS" | "In-App"; title: string; send: string }) {
  const o = useLoad(() => schoolFetch<{ classes: { id: string; name: string }[]; templates: { id: string; name: string; channel: string; body: string }[] }>(`${V}/options`), []); const act = useAction(() => o.reload());
  const blank = { subject: "", audience: "All parents", grade_id: "", template_id: "", message: "", later: false, schedule_for: nowIst(), copy: true }; const [f, setF] = useState(blank); const [msg, setMsg] = useState("");
  const tpls = (o.data?.templates ?? []).filter((t) => t.channel === channel);
  const pick = (id: string) => { const t = tpls.find((x) => x.id === id); setF({ ...f, template_id: id, message: t ? t.body : f.message, subject: t && channel === "Email" && !f.subject ? t.name : f.subject }); };
  const submit = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ ref: string; recipients: number }>(`${V}/messages`, json("POST", { channel, subject: f.subject || undefined, audience: f.audience, grade_id: f.audience === "All staff" ? null : f.grade_id || null, template_id: f.template_id || null, message: f.message, schedule_for: f.later ? f.schedule_for : null, copy_to_me: f.copy })); t = `${r.ref} saved for ${r.recipients.toLocaleString("en-IN")} recipients. See the log for its status; nothing is delivered until a ${channel === "In-App" ? "push" : channel} service is connected.`; })) { setF(blank); setMsg(t); } };
  return <div>{okBox(msg)}<form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2></div>
    {(o.error || act.error) && <div className="px-5 pt-4"><ErrorBanner message={o.error || act.error} /></div>}
    <div className="space-y-4 p-5">{channel === "Email" && <Field label="Subject"><input className={inputCls} maxLength={160} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>}
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Send to"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["All parents", "All students", "All staff"].map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Class"><select className={inputCls} disabled={f.audience === "All staff"} value={f.grade_id} onChange={(e) => setF({ ...f, grade_id: e.target.value })}><option value="">All classes</option>{o.data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Template"><select className={inputCls} value={f.template_id} onChange={(e) => pick(e.target.value)}><option value="">None</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div>
      <Field label="Message"><textarea className={`${inputCls} min-h-[84px]`} required maxLength={channel === "SMS" ? 160 : 1000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      {channel === "SMS" && <p className="text-[11px] text-slate-500">160 characters per SMS. Only DLT-approved templates can be sent.</p>}</div>
    <Toggle label="Schedule for later" on={f.later} set={(later) => setF({ ...f, later })} />{f.later && <div className="border-t border-slate-100 px-5 py-3"><Field label="Send on"><input type="date" min={nowIst()} className={`${inputCls} max-w-xs`} value={f.schedule_for} onChange={(e) => setF({ ...f, schedule_for: e.target.value })} /></Field></div>}
    <Toggle label="Send a copy to me" on={f.copy} set={(copy) => setF({ ...f, copy })} />
    <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setF(blank); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy} className={primaryCls}>{act.busy ? "Sending…" : send}</button></div></form></div>;
}
