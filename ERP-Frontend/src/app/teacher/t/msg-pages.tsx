"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { useTeacher } from "../context";
import { Head } from "./head";
import { Loading, day } from "./dash-pages";
import { SearchBox, blueBtn, smallBtn, usePickedSection } from "./ui";

const L = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium text-slate-900">{v}</dd></div>)}</dl>;
const stTone = (s: string) => (s === "Replied" ? "good" : s === "Unread" ? "warn" : "mute") as "good" | "warn" | "mute";

interface Msg { id: string; code: string; from: string; student: string; subject: string; preview: string; received: string; status: string }
export function Inbox() {
  const { refreshBadges } = useTeacher();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Msg[]; unread: number }>("/teacher/messages/inbox"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [q, setQ] = useState("");
  const [view, setView] = useState<Msg | null>(null);
  const [reply, setReply] = useState<{ m: Msg; body: string } | null>(null);
  const items = (data?.items ?? []).filter((m) => !q || `${m.from} ${m.student} ${m.subject} ${m.preview}`.toLowerCase().includes(q.toLowerCase()));
  const read = (m: Msg) => void act.run(() => schoolFetch(`/teacher/messages/${m.id}/read`, json("POST", {})));
  return (
    <div data-report>
      <Head title="Inbox" subtitle="Messages from parents of your students. Try to reply within one working day." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Inbox" sub={`${data.items.length} messages`} right={<ExportPrint name="parent-inbox" head={["Ref.", "From", "Message", "Received", "Status"]} rows={items.map((m) => [m.code, m.from, `${m.subject}: ${m.preview}`, m.received, m.status])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search inbox" /></div>
          <SimpleTable head={[{ h: "Ref." }, { h: "From" }, { h: "Message" }, { h: "Received" }, { h: "Status" }, { h: "" }]} empty="No parent has written to you yet." rows={items.map((m) => [m.code,
            <div key="f"><p className="font-semibold text-slate-900">{m.from}</p><p className="text-[11px] text-slate-500">{m.student}</p></div>, <div key="m" className="max-w-md whitespace-normal"><p className="font-semibold text-slate-900">{m.subject}</p><p className="text-[11px] text-slate-500">{m.preview}</p></div>, day(m.received), <Chip key="s" tone={stTone(m.status)}>{m.status}</Chip>,
            <span key="a" className="flex gap-1.5"><button type="button" className={blueBtn} onClick={() => setReply({ m, body: "" })}>Reply</button>{m.status === "Unread" && <button type="button" disabled={act.busy} className={smallBtn} onClick={() => read(m)}>Mark read</button>}<button type="button" className={smallBtn} onClick={() => { setView(m); if (m.status === "Unread") read(m); }}>View details</button></span>])} />
        </Panel>
      )}
      {view && <Modal open title={view.subject} onClose={() => setView(null)}><KV rows={[["From", view.from], ["About", view.student || "—"], ["Received", day(view.received)], ["Message", view.preview || "—"], ["Status", <Chip key="s" tone={stTone(view.status)}>{view.status}</Chip>]]} /></Modal>}
      {reply && (
        <Modal open title={`Reply to ${reply.m.from}`} onClose={() => setReply(null)}>
          <ErrorBanner message={act.error} />
          <p className="mb-3 text-[12.5px] text-slate-600">{reply.m.subject}</p>
          <L label="Your reply"><textarea className={`${inputCls} min-h-[6rem]`} required minLength={2} maxLength={2000} value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} /></L>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setReply(null)}>Cancel</button><button type="button" disabled={act.busy || reply.body.trim().length < 2} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/messages/${reply.m.id}/reply`, json("POST", { body: reply.body }))).then((ok) => ok && setReply(null))}>Send reply</button></div>
        </Modal>
      )}
    </div>
  );
}

interface Sent { items: { id: string; to: string; student: string; class_label: string; subject: string; body: string; sent: string; channel: string; status: string }[]; sections: { id: string; label: string }[]; parents: { guardian_id: string; student_id: string; section_id: string; label: string }[] }
export function SentMessages() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Sent>("/teacher/messages/sent"), []);
  const act = useAction(reload);
  const [sec, pick] = usePickedSection(data?.sections ?? [], null);
  const [f, setF] = useState({ to: "all", channel: "App", subject: "", body: "" });
  const [q, setQ] = useState("");
  const [done, setDone] = useState("");
  const [view, setView] = useState<Sent["items"][number] | null>(null);
  const label = data?.sections.find((s) => s.id === sec)?.label ?? "";
  const parents = (data?.parents ?? []).filter((p) => p.section_id === sec);
  const to = f.to === "all" || parents.some((p) => p.guardian_id === f.to) ? f.to : "all";
  const items = (data?.items ?? []).filter((m) => !q || `${m.to} ${m.student} ${m.subject}`.toLowerCase().includes(q.toLowerCase()));
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(async () => { const r = await schoolFetch<{ sent: number }>("/teacher/messages/sent", json("POST", { section_id: sec, to, channel: f.channel, subject: f.subject, body: f.body })); setDone(`Sent to ${r.sent} ${r.sent === 1 ? "parent" : "parents"}.`); })) setF({ ...f, subject: "", body: "" }); };
  return (
    <div data-report>
      <Head title="Sent" subtitle="Write to one parent or the whole section, and see what you've sent." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Section<select aria-label="Section" value={sec} onChange={(e) => pick(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <span className="ml-auto text-[12px] text-slate-500">{label} · {parents.length} parents</span></div>
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New message</h2></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <L label="To"><select className={inputCls} value={to} onChange={(e) => setF({ ...f, to: e.target.value })}><option value="all">All parents in {label}</option>{parents.map((p) => <option key={`${p.guardian_id}${p.student_id}`} value={p.guardian_id}>{p.label}</option>)}</select></L>
                <L label="Send by"><select className={`${inputCls} sm:max-w-[12rem]`} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option>App</option><option disabled>App + SMS (not connected)</option></select></L>
              </div>
              <L label="Subject"><input className={inputCls} required minLength={2} maxLength={200} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></L>
              <L label="Message"><textarea className={`${inputCls} min-h-[6rem]`} required minLength={2} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></L>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF({ ...f, subject: "", body: "" }); setDone(""); }}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Send message</button></div>
          </form>
          <Panel title="Sent" sub={`${data.items.length} messages`} right={<ExportPrint name="sent-messages" head={["To", "Student", "Class", "Subject", "Sent", "Channel", "Status"]} rows={items.map((m) => [m.to, m.student, m.class_label, m.subject, m.sent, m.channel, m.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search sent" /></div>
            <SimpleTable head={[{ h: "To" }, { h: "Student" }, { h: "Class" }, { h: "Subject" }, { h: "Sent" }, { h: "Channel" }, { h: "Status" }, { h: "" }]} empty="You have not sent a message yet." rows={items.map((m) => [m.to, m.student, m.class_label, m.subject, day(m.sent), m.channel, <Chip key="s" tone={m.status === "Read" ? "mute" : "good"}>{m.status}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(m)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={view.subject} onClose={() => setView(null)}><KV rows={[["To", view.to], ["Student", view.student], ["Class", view.class_label], ["Sent", day(view.sent)], ["Channel", view.channel], ["Message", view.body || "—"], ["Status", view.status]]} /></Modal>}
    </div>
  );
}

interface Rep { id: string; code: string; parent: string; student: string; class_label: string; re: string; reply: string; received: string; status: string }
export function Replies() {
  const { refreshBadges } = useTeacher();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Rep[] }>("/teacher/messages/replies"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [q, setQ] = useState("");
  const [view, setView] = useState<Rep | null>(null);
  const all = data?.items ?? [];
  const items = all.filter((m) => !q || `${m.parent} ${m.student} ${m.re} ${m.reply}`.toLowerCase().includes(q.toLowerCase()));
  const unread = all.filter((m) => m.status === "Unread").length;
  const sh = (n: number) => (all.length ? `${Math.round((n / all.length) * 100)}% of shown` : "");
  const read = (m: Rep) => void act.run(() => schoolFetch(`/teacher/messages/${m.id}/read`, json("POST", {})));
  return (
    <div data-report>
      <Head title="Replies" subtitle="Parents' replies to messages you sent." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Replies", value: all.length, sub: "This year" }, { label: "Read", value: all.length - unread, sub: sh(all.length - unread) }, { label: "Unread", value: unread, sub: sh(unread) }]} />
          <Panel title="Replies" sub={`${all.length} replies`} right={<ExportPrint name="parent-replies" head={["Parent", "Student", "Class", "Re", "Reply", "Received", "Status"]} rows={items.map((m) => [m.parent, m.student, m.class_label, m.re, m.reply, m.received, m.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search replies" /></div>
            <SimpleTable head={[{ h: "Parent" }, { h: "Student" }, { h: "Class" }, { h: "Re" }, { h: "Reply" }, { h: "Received" }, { h: "Status" }, { h: "" }]} empty="No parent has replied to your messages yet." rows={items.map((m) => [m.parent, m.student, m.class_label, m.re, <span key="r" className="whitespace-normal">{m.reply}</span>, day(m.received), <Chip key="s" tone={m.status === "Unread" ? "warn" : "mute"}>{m.status}</Chip>, <span key="a" className="flex gap-1.5">{m.status === "Unread" && <button type="button" disabled={act.busy} className={smallBtn} onClick={() => read(m)}>Mark read</button>}<button type="button" className={smallBtn} onClick={() => { setView(m); if (m.status === "Unread") read(m); }}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {view && <Modal open title={view.re} onClose={() => setView(null)}><KV rows={[["From", view.parent], ["About", `${view.student} · ${view.class_label}`], ["Received", day(view.received)], ["Reply", view.reply]]} /></Modal>}
    </div>
  );
}
