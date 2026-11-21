"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Award, Camera, FlaskConical, Flame, Heart, Music, Star, Trophy, TreePine } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";

const V = "/school/comm";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Delivered", "Acknowledged", "Replied", "Published", "Kept", "Received", "Helpful"].includes(s) ? "good" : ["Pending", "Unread", "Open", "Waiting for parent", "Pending approval", "Scheduled"].includes(s) ? "warn" : ["Failed", "Removed", "Sent back"].includes(s) ? "bad" : s === "Sent" || s === "Closed" ? "info" : "mute");
const tiles = (items: [string, ReactNode, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const cnt = (all: { status: string }[], s: string): [string, number, string] => [s, all.filter((x) => x.status === s).length, `${pct(all.filter((x) => x.status === s).length, all.length)} of shown`];
const present = (all: { status: string }[], order: string[]) => { const p = order.filter((s) => all.some((x) => x.status === s)); return (p.length ? p : [order[0]]).map((s) => cnt(all, s)); };
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const when = (iso: string) => { const d = new Date(iso); return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`; };
const Close = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end"><button type="button" className={small} onClick={on}>Close</button></div>;
const Check = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => <label className="flex items-center gap-2 text-[13px] text-slate-800"><input type="checkbox" className="h-4 w-4 accent-[#0294ce]" checked={on} onChange={(e) => set(e.target.checked)} />{label}</label>;
const notice = (t: ReactNode) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{t}</p>;

// ═════════════ school diary ═════════════
type Entry = { id: string; class_label: string; kind: string; entry: string; by_name: string; diary_date: string; status: string };
type DTpl = { id: string; name: string; body: string; used: number };
export function DiaryPages({ tab }: { tab: "class-diary" | "teacher-remarks" | "parent-acknowledgement" | "templates" }) {
  const d = useLoad(() => schoolFetch<{ items: Entry[]; templates: DTpl[] }>(`${V}/diary`), []); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [v, setV] = useState<Entry | null>(null); const [ed, setEd] = useState<{ id: string; name: string; body: string } | null>(null); const x = d.data; const err = d.error || act.error;
  if (tab === "templates") {
    const rows = (x?.templates ?? []).filter((i) => has(i, search));
    const save = async (e: FormEvent) => { e.preventDefault(); if (ed && await act.run(() => schoolFetch(ed.id ? `${V}/diary-templates/${ed.id}` : `${V}/diary-templates`, json(ed.id ? "PUT" : "POST", { name: ed.name, body: ed.body })))) setEd(null); };
    return <div className="space-y-5" data-report><ErrorBanner message={err} />{notice("Teachers see these as one-tap choices when writing the class diary or a remark.")}
      <ListPanel title="Diary templates" noun="templates" search={search} onSearch={setSearch} exportName="diary-templates" head={["Template", "Wording", "Used this term"]} exportRows={rows.map((i) => [i.name, i.body, i.used])}
        tableHead={["Template", "Wording", "Used this term", ""]} empty={d.loading ? "Loading…" : "No templates."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.body, i.used, <button key="e" type="button" className={small} onClick={() => setEd({ id: i.id, name: i.name, body: i.body })}>Edit</button>])} />
      <button type="button" className={primaryCls} onClick={() => setEd({ id: "", name: "", body: "" })}>+ New template</button>
      <Modal open={!!ed} title={ed?.id ? "Edit template" : "New template"} onClose={() => setEd(null)}>{ed && <form onSubmit={save} className="space-y-3"><ErrorBanner message={act.error} /><Field label="Template"><input className={inputCls} required maxLength={80} value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field><Field label="Wording"><textarea className={`${inputCls} min-h-[80px]`} required maxLength={300} value={ed.body} onChange={(e) => setEd({ ...ed, body: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className={small} onClick={() => setEd(null)}>Close</button><button type="submit" className={primaryCls} disabled={act.busy}>Save</button></div></form>}</Modal></div>;
  }
  const scope = (x?.items ?? []).filter((i) => (tab === "class-diary" ? i.kind === "Class diary" : tab === "teacher-remarks" ? i.kind === "Teacher remark" : true)); const rows = scope.filter((i) => has(i, search));
  const ack = (id: string) => void act.run(() => schoolFetch(`${V}/diary/${id}/ack`, json("POST", {}))).then((ok) => ok && setV(null));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["School diary", scope.length, "Sample records shown"], ...present(scope, ["Acknowledged", "Sent"])])}
    <ListPanel title="School diary" noun="entries" search={search} onSearch={setSearch} exportName={tab} head={["Class", "Type", "Entry", "By", "Date", "Acknowledged", "Status"]} exportRows={rows.map((i) => [i.class_label, i.kind, i.entry, i.by_name, day(i.diary_date), "", i.status])}
      tableHead={["Class", "Type", "Entry", "By", "Date", "Acknowledged", "Status", ""]} empty={d.loading ? "Loading…" : "No diary entries yet. Teachers write them in the Teacher app."}
      rows={rows.map((i) => [i.class_label, i.kind, i.entry, i.by_name, day(i.diary_date), "—", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v ? `${v.class_label} · ${v.kind}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Entry" v={v.entry} /><Row k="By" v={v.by_name} /><Row k="Date" v={day(v.diary_date)} /><Row k="Status" v={v.status} /></dl><div className="mt-4 flex justify-end gap-2"><button type="button" className={small} onClick={() => setV(null)}>Close</button>{v.status === "Sent" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => ack(v.id)}>Mark acknowledged</button>}</div></>}</Modal></div>;
}

// ═════════════ parent conversations ═════════════
type Conv = { id: string; parent_name: string; student_name: string; teacher_name: string; last_message: string; kind: string; status: string; created_at: string };
export function ParentConvPages({ tab }: { tab: "parent-messages" | "teacher-replies" }) {
  const d = useLoad(() => schoolFetch<{ items: Conv[] }>(`${V}/conversations`), []); const [search, setSearch] = useState(""); const [v, setV] = useState<Conv | null>(null);
  const kind = tab === "parent-messages" ? "Parent message" : "Teacher reply"; const scope = (d.data?.items ?? []).filter((i) => i.kind === kind).map((i) => ({ ...i, status: i.status })); const rows = scope.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} />{tiles([["Parent conversations", scope.length, "Sample records shown"], ...present(scope, tab === "parent-messages" ? ["Unread", "Closed", "Replied"] : ["Replied", "Closed", "Unread"])])}
    <ListPanel title="Parent conversations" noun="conversations" search={search} onSearch={setSearch} exportName={tab} head={["Parent", "Student", "Teacher", "Last message", "Type", "Time", "Status"]} exportRows={rows.map((i) => [i.parent_name, i.student_name, i.teacher_name, i.last_message, i.kind, day(i.created_at), i.status])}
      tableHead={["Parent", "Student", "Teacher", "Last message", "Type", "Time", "Status", ""]} empty={d.loading ? "Loading…" : "No conversations yet. They come from the Parent app."}
      rows={rows.map((i) => [i.parent_name, <b key="s" className="font-semibold text-[#026f9b]">{i.student_name}</b>, i.teacher_name, i.last_message, i.kind, day(i.created_at), <Chip key="c" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v ? `${v.parent_name} · ${v.student_name}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Teacher" v={v.teacher_name} /><Row k="Type" v={v.kind} /><Row k="Time" v={when(v.created_at)} /><Row k="Status" v={v.status} /><Row k="Last message" v={v.last_message} /></dl><Close on={() => setV(null)} /></>}</Modal></div>;
}

// ═════════════ communication reports ═════════════
type AllMsg = { id: string; ref: string; channel: string; title: string; message: string; audience: string; class_label: string; recipients: number; send_on: string; status: string };
export const chan = (c: string) => (c === "In-App" ? "App" : c);
export function CommReportPages({ tab }: { tab: "sent" | "delivered" | "failed" }) {
  const d = useLoad(() => schoolFetch<{ items: AllMsg[] }>(`${V}/all-messages`), []); const [search, setSearch] = useState(""); const [v, setV] = useState<AllMsg | null>(null);
  const scope = (d.data?.items ?? []).filter((i) => (tab === "sent" ? true : tab === "delivered" ? i.status === "Delivered" : i.status === "Failed")); const rows = scope.filter((i) => has(i, search));
  const tl: [string, number, string][] = tab === "sent" ? ["Delivered", "Failed", "Pending"].filter((s) => s === "Delivered" || scope.some((x) => x.status === s)).map((s) => cnt(scope, s)) : [cnt(scope, tab === "delivered" ? "Delivered" : "Failed")];
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} />{tiles([["Message log", scope.length, "Sample records shown"], ...tl])}
    <ListPanel title="Message log" noun="messages" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Channel", "Message", "Recipients", "Delivered", "Sent", "Status"]} exportRows={rows.map((i) => [i.ref, chan(i.channel), i.title, i.recipients, "", day(i.send_on), i.status])}
      tableHead={["Ref.", "Channel", "Message", "Recipients", "Delivered", "Sent", "Status", ""]} empty={d.loading ? "Loading…" : "Nothing here yet."}
      rows={rows.map((i) => [i.ref, chan(i.channel), i.title, <span key="r" className="block text-right">{i.recipients.toLocaleString("en-IN")}</span>, "—", day(i.send_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v ? `${v.ref} · ${v.title}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Channel" v={chan(v.channel)} /><Row k="Sent to" v={`${v.audience} · ${v.class_label}`} /><Row k="Recipients" v={v.recipients} /><Row k="Date" v={day(v.send_on)} /><Row k="Status" v={v.status} /><Row k="Message" v={v.message} /></dl><Close on={() => setV(null)} /></>}</Modal></div>;
}

// ═════════════ chatbot ═════════════
type Bot = { conversations: { id: string; channel: string; who: string; preview: string; messages: number; outcome: string; rating: string | null; created_at: string }[]; unanswered: { id: string; question: string; times_asked: number; channel: string; sent_to: string }[]; faqs: { id: string; topic: string; question: string; answer: string; enabled: boolean; used: number }[]; week: number; week_whatsapp: number; week_website: number; no_staff: number | null; handed: number; enquiries: number; helpful: number | null; ratings: number; avg_reply: number | null; busiest: number | null; languages: [string, number][]; topics: [string, number][]; handed_to: [string, number][] };
const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} – ${(h + 1) % 12 === 0 ? 12 : (h + 1) % 12} ${h + 1 >= 12 && h + 1 < 24 ? "pm" : "am"}`;
export function ChatbotPages({ tab }: { tab: "conversations" | "unanswered-questions" | "faqs" | "ratings-and-topics" }) {
  const d = useLoad(() => schoolFetch<Bot>(`${V}/chatbot`), []); const act = useAction(() => d.reload()); const [search, setSearch] = useState(""); const [v, setV] = useState<Bot["conversations"][number] | null>(null); const [q, setQ] = useState<{ id: string; question: string } | null>(null); const [ans, setAns] = useState(""); const x = d.data; const err = d.error || act.error;
  if (!x) return <ErrorBanner message={err || ""} />;
  if (tab === "unanswered-questions") {
    const rows = x.unanswered.filter((i) => has(i, search)); const save = async (e: FormEvent) => { e.preventDefault(); if (q && await act.run(() => schoolFetch(`${V}/chatbot/unanswered/${q.id}/answer`, json("POST", { answer: ans })))) { setQ(null); setAns(""); } };
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><ListPanel title="Unanswered questions" noun="questions" search={search} onSearch={setSearch} exportName="unanswered" head={["Question", "Times asked", "Channel", "Sent to"]} exportRows={rows.map((i) => [i.question, i.times_asked, i.channel, i.sent_to])}
      tableHead={["Question", "Times asked", "Channel", "Sent to", ""]} empty="Nothing is waiting for an answer." rows={rows.map((i) => [i.question, <span key="t" className="block text-right text-[#026f9b]">{i.times_asked}</span>, i.channel, i.sent_to, <button key="a" type="button" className={`${primaryCls} !py-1`} onClick={() => { setQ(i); setAns(""); }}>Add an answer</button>])} />
      <Modal open={!!q} title={q?.question ?? ""} onClose={() => setQ(null)}><form onSubmit={save} className="space-y-3"><ErrorBanner message={act.error} /><Field label="Answer"><textarea className={`${inputCls} min-h-[90px]`} required maxLength={1000} value={ans} onChange={(e) => setAns(e.target.value)} /></Field><p className="text-xs text-slate-500">It is saved as an FAQ and switched on.</p><div className="flex justify-end gap-2"><button type="button" className={small} onClick={() => setQ(null)}>Close</button><button type="submit" className={primaryCls} disabled={act.busy}>Save answer</button></div></form></Modal></div>;
  }
  if (tab === "faqs") {
    const rows = x.faqs.filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><ListPanel title="FAQs" noun="answers" search={search} onSearch={setSearch} exportName="faqs" head={["Topic", "Question", "Answer", "Used", "On"]} exportRows={rows.map((i) => [i.topic, i.question, i.answer, i.used, i.enabled ? "On" : "Off"])}
      tableHead={["Topic", "Question", "Answer", "Used", "On"]} empty="No FAQs yet."
      rows={rows.map((i) => [i.topic, <b key="q" className="font-semibold text-slate-900">{i.question}</b>, <textarea key={`a${i.id}${i.answer}`} aria-label={`Answer to ${i.question}`} className={`${inputCls} min-h-[56px] w-80`} maxLength={1000} defaultValue={i.answer} placeholder="Write the school's answer" onBlur={(e) => { if (e.target.value !== i.answer) void act.run(() => schoolFetch(`${V}/chatbot/faqs/${i.id}`, json("PATCH", { answer: e.target.value }))); }} />, `${i.used} times`,
        <label key="o" className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[#0294ce]" checked={i.enabled} disabled={act.busy} onChange={(e) => void act.run(() => schoolFetch(`${V}/chatbot/faqs/${i.id}`, json("PATCH", { enabled: e.target.checked })))} />On</label>])} /></div>;
  }
  if (tab === "ratings-and-topics") return <div className="space-y-5"><ErrorBanner message={err} />{tiles([["Helpful", x.helpful === null ? "—" : `${x.helpful}%`, `From ${x.ratings.toLocaleString("en-IN")} ratings`], ["Average reply time", x.avg_reply === null ? "—" : `${x.avg_reply} s`], ["Busiest hour", x.busiest === null ? "—" : hour(x.busiest)], ["Languages", x.languages.length ? x.languages.map(([l, p]) => `${l} ${p}%`).join(" · ") : "—"]])}
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Top topics" sub="This week"><BarRows rows={x.topics} /></Panel><Panel title="Handed to a person" sub="This week"><BarRows rows={x.handed_to} /></Panel></div></div>;
  const rows = x.conversations.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Conversations this week", x.week.toLocaleString("en-IN"), `WhatsApp ${x.week_whatsapp.toLocaleString("en-IN")}, website ${x.week_website.toLocaleString("en-IN")}`], ["Answered without staff", x.no_staff === null ? "—" : `${x.no_staff}%`, "Target 80%"], ["Handed to a person", x.handed, "As help desk tickets or enquiries"], ["Admission enquiries", x.enquiries, "From the website assistant"]])}
    <ListPanel title="Latest conversations" noun="conversations" search={search} onSearch={setSearch} exportName="chatbot-conversations" head={["When", "Channel", "Who", "Messages", "Outcome", "Rating"]} exportRows={rows.map((i) => [when(i.created_at), i.channel, i.who, i.messages, i.outcome, i.rating ?? ""])}
      tableHead={["When", "Channel", "Who", "Messages", "Outcome", "Rating", ""]} empty={d.loading ? "Loading…" : "No conversations yet. The assistant is not connected to WhatsApp or the website."}
      rows={rows.map((i) => [when(i.created_at), <Chip key="c" tone={i.channel === "WhatsApp" ? "good" : "info"}>{i.channel}</Chip>, <span key="w"><span className="block">{i.who}</span><span className="block text-[11px] text-slate-500">{i.preview}</span></span>, <span key="m" className="block text-right">{i.messages}</span>, i.outcome, i.rating ?? "—", <button key="r" type="button" className={small} onClick={() => setV(i)}>Read</button>])} />
    <Modal open={!!v} title={v?.who ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="When" v={when(v.created_at)} /><Row k="Channel" v={v.channel} /><Row k="Messages" v={v.messages} /><Row k="Outcome" v={v.outcome} /><Row k="Rating" v={v.rating ?? "—"} /><Row k="First message" v={v.preview} /></dl><Close on={() => setV(null)} /></>}</Modal></div>;
}

// ═════════════ photo gallery ═════════════
type Album = { id: string; title: string; event: string; album_date: string; audience: string; photo_count: number; caption: string; uploaded_by: string; status: string };
const ICON: Record<string, typeof Star> = { "Children's Day carnival": Star, "Annual Day": Award, "Sports Day": Trophy, "Diwali celebrations": Flame, "Field trip": TreePine, "Class activity": FlaskConical, Other: Camera };
const GRAD = ["from-sky-300 to-indigo-500", "from-pink-300 to-orange-400", "from-amber-300 to-rose-300", "from-teal-300 to-sky-500", "from-emerald-300 to-green-500", "from-lime-300 to-emerald-400", "from-fuchsia-300 to-pink-500", "from-indigo-300 to-violet-500"];
export function GalleryPages({ tab }: { tab: "albums" | "create-album" | "pending-approval" | "photo-consent" }) {
  const d = useLoad(() => schoolFetch<{ events: string[]; items: Album[]; year_albums: number; photos: number; waiting: number; no_consent: number }>(`${V}/albums`), []); const c = useLoad(() => (tab === "photo-consent" ? schoolFetch<{ items: { id: string; student_name: string; class_label: string; parent_name: string; reason: string; recorded_on: string; status: string }[] }>(`${V}/consent`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { d.reload(); c.reload(); }); const blank = { title: "", event: "", album_date: nowIst(), audience: "Whole school", caption: "", files: 0, blur: true, dl: true, notify: true }; const [f, setF] = useState(blank); const [msg, setMsg] = useState(""); const [search, setSearch] = useState(""); const [v, setV] = useState<Album | null>(null); const x = d.data; const err = d.error || c.error || act.error;
  const note = `${x?.no_consent ?? 0} families`;
  if (tab === "create-album") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/albums`, json("POST", { title: f.title, event: f.event || x?.events[0], album_date: f.album_date, audience: f.audience, photo_count: f.files, caption: f.caption || undefined, blur_no_consent: f.blur, allow_download: f.dl, notify_parents: f.notify })))) { setF(blank); setMsg("Album published."); } };
    return <div className="space-y-5">{okBox(msg)}{notice(<><b>{note}</b> have withdrawn photo consent. Their children are blurred automatically before an album is published.</>)}
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">New album</h2></div>{err && <div className="px-5 pt-4"><ErrorBanner message={err} /></div>}
        <div className="space-y-4 p-5"><Field label="Album title"><input className={inputCls} required maxLength={160} placeholder="For example, Class 7 B · Children's Day" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Event"><select className={inputCls} value={f.event || x?.events[0] || ""} onChange={(e) => setF({ ...f, event: e.target.value })}>{x?.events.map((o) => <option key={o}>{o}</option>)}</select></Field><Field label="Date"><input type="date" required className={inputCls} value={f.album_date} onChange={(e) => setF({ ...f, album_date: e.target.value })} /></Field>
            <Field label="Who can see it"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{["Whole school", "Parents only", "Staff only"].map((o) => <option key={o}>{o}</option>)}</select></Field></div>
          <Field label="Photos"><input type="file" accept="image/jpeg,image/png" multiple className={inputCls} onChange={(e) => setF({ ...f, files: e.target.files?.length ?? 0 })} /></Field><p className="-mt-2 text-[11px] text-slate-500">JPG or PNG, up to 200 photos. Photo files are not uploaded yet; the album and its photo count are saved.</p>
          <Field label="Caption"><input className={inputCls} maxLength={200} placeholder="One line about the album" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></Field>
          <div className="space-y-2"><Check label="Blur students who don't have photo consent" on={f.blur} set={(blur) => setF({ ...f, blur })} /><Check label="Let parents download photos" on={f.dl} set={(dl) => setF({ ...f, dl })} /><Check label="Notify parents when it is published" on={f.notify} set={(notify) => setF({ ...f, notify })} /></div></div>
        <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setF(blank); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Clear</button><button type="submit" disabled={act.busy} className={primaryCls}>Publish album</button></div></form></div>;
  }
  if (tab === "pending-approval") {
    const rows = (x?.items ?? []).filter((i) => i.status === "Pending approval" && has(i, search)); const dec = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/albums/${id}/decide`, json("POST", { action })));
    return <div className="space-y-5" data-report><ErrorBanner message={err} />{notice(<><b>{note}</b> have withdrawn photo consent. Their children are blurred automatically before an album is published.</>)}
      <ListPanel title="Waiting for approval" noun="albums" search={search} onSearch={setSearch} exportName="pending-albums" head={["Album", "Date", "Photos", "For", "Uploaded by"]} exportRows={rows.map((i) => [i.title, day(i.album_date), i.photo_count, i.audience, i.uploaded_by])}
        tableHead={["Album", "Date", "Photos", "For", "Uploaded by", ""]} empty={d.loading ? "Loading…" : "Nothing is waiting for approval."}
        rows={rows.map((i) => [<b key="t" className="font-semibold text-slate-900">{i.title}</b>, day(i.album_date), i.photo_count, i.audience, i.uploaded_by, <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => setV(i)}>View</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i.id, "publish")}>Publish</button><button type="button" className={small} disabled={act.busy} onClick={() => dec(i.id, "send_back")}>Send back</button></span>])} />
      <Modal open={!!v} title={v?.title ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Event" v={v.event} /><Row k="Date" v={day(v.album_date)} /><Row k="Photos" v={v.photo_count} /><Row k="For" v={v.audience} /><Row k="Uploaded by" v={v.uploaded_by || "—"} />{v.caption && <Row k="Caption" v={v.caption} />}</dl><Close on={() => setV(null)} /></>}</Modal></div>;
  }
  if (tab === "photo-consent") {
    const rows = (c.data?.items ?? []).filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><ListPanel title="No photo consent" noun="students" search={search} onSearch={setSearch} exportName="photo-consent" head={["Student", "Class", "Parent", "Recorded", "Reason", "Status"]} exportRows={rows.map((i) => [i.student_name, i.class_label, i.parent_name, day(i.recorded_on), i.reason, i.status])}
      tableHead={["Student", "Class", "Parent", "Recorded", "Reason", "Status", ""]} empty={c.loading ? "Loading…" : "Every student has photo consent."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.student_name}</b>, i.class_label, i.parent_name, day(i.recorded_on), i.reason, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="m" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${V}/consent/${i.id}/received`, json("POST", {})))}>Mark consent received</button>])} /></div>;
  }
  const cards = (x?.items ?? []).filter((i) => i.status !== "Sent back");
  return <div className="space-y-5"><ErrorBanner message={err} />{tiles([["Albums this year", x?.year_albums ?? 0], ["Photos", (x?.photos ?? 0).toLocaleString("en-IN")], ["Waiting for approval", x?.waiting ?? 0, "From teachers"], ["Without photo consent", x?.no_consent ?? 0, "Blurred automatically"]])}
    {!cards.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">{d.loading ? "Loading…" : "No albums yet."}</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{cards.map((a, k) => { const Ic = ICON[a.event] ?? Heart ?? Music; return <button key={a.id} type="button" onClick={() => setV(a)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left"><div className={`flex h-32 items-center justify-center bg-gradient-to-br ${GRAD[k % GRAD.length]}`}><Ic className="h-10 w-10 text-white/90" /></div><div className="p-3"><b className="block text-[13px] text-slate-900">{a.title}</b><span className="block text-[11px] text-slate-500">{day(a.album_date)} · {a.photo_count} photos · {a.audience}</span>{a.status === "Pending approval" && <span className="mt-2 inline-block"><Chip tone="warn">Pending approval</Chip></span>}</div></button>; })}</div>}
    <Modal open={!!v} title={v?.title ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Event" v={v.event} /><Row k="Date" v={day(v.album_date)} /><Row k="Photos" v={v.photo_count} /><Row k="Who can see it" v={v.audience} /><Row k="Uploaded by" v={v.uploaded_by || "—"} /><Row k="Status" v={v.status} />{v.caption && <Row k="Caption" v={v.caption} />}</dl><Close on={() => setV(null)} /></>}</Modal></div>;
}

// ═════════════ chat moderation ═════════════
type Rep = { id: string; code: string; chat: string; reported_by: string; reason: string; reported_on: string; decision: string; decision_note: string | null };
export function ModerationPages({ tab }: { tab: "reported-messages" | "chat-rules" | "chat-activity" }) {
  const d = useLoad(() => (tab === "chat-rules" ? Promise.resolve(null) : schoolFetch<{ items: Rep[] }>(`${V}/chat-reports`)), [tab]); const r = useLoad(() => (tab === "chat-rules" ? schoolFetch<{ opens_at: string; closes_at: string; parents_can_message: string; keep_history: string; blocked_words: string; groups_announcement_only: boolean; students_groups_only: boolean; show_read_ticks: boolean }>(`${V}/chat-rules`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => d.reload()); const [search, setSearch] = useState(""); const [rm, setRm] = useState<Rep | null>(null); const [why, setWhy] = useState(""); const [form, setForm] = useState<NonNullable<typeof r.data> | null>(null); const [msg, setMsg] = useState(""); const err = d.error || r.error || act.error;
  if (tab === "chat-rules") {
    const f = form ?? r.data; if (!f) return <ErrorBanner message={err || ""} />;
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/chat-rules`, json("PUT", f)))) setMsg("Rules saved."); };
    return <div>{okBox(msg)}<form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Chat rules</h2></div>{err && <div className="px-5 pt-4"><ErrorBanner message={err} /></div>}
      <div className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-4"><Field label="Chats open from"><input type="time" required className={inputCls} value={f.opens_at} onChange={(e) => setForm({ ...f, opens_at: e.target.value })} /></Field><Field label="Chats close at"><input type="time" required className={inputCls} value={f.closes_at} onChange={(e) => setForm({ ...f, closes_at: e.target.value })} /></Field>
        <Field label="Who parents can message"><select className={inputCls} value={f.parents_can_message} onChange={(e) => setForm({ ...f, parents_can_message: e.target.value })}>{["Class teacher and subject teachers", "Class teacher only", "Nobody (announcements only)"].map((o) => <option key={o}>{o}</option>)}</select></Field><Field label="Keep chat history for"><select className={inputCls} value={f.keep_history} onChange={(e) => setForm({ ...f, keep_history: e.target.value })}>{["The academic year", "One term", "One month", "Always"].map((o) => <option key={o}>{o}</option>)}</select></Field></div>
        <Field label="Blocked words (one per line)"><textarea className={`${inputCls} min-h-[84px]`} maxLength={2000} value={f.blocked_words} onChange={(e) => setForm({ ...f, blocked_words: e.target.value })} /></Field>
        <div className="space-y-2"><Check label="Class parent groups are announcement-only (teachers post, parents read)" on={f.groups_announcement_only} set={(v) => setForm({ ...f, groups_announcement_only: v })} /><Check label="Students can message teachers only in class groups, not one-to-one" on={f.students_groups_only} set={(v) => setForm({ ...f, students_groups_only: v })} /><Check label={"Show “read” ticks to teachers"} on={f.show_read_ticks} set={(v) => setForm({ ...f, show_read_ticks: v })} /></div>
        <p className="text-[11px] text-slate-500">The rules are saved here. They take effect once the Parent, Student and Teacher chat is connected.</p></div>
      <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" disabled={act.busy} className={primaryCls}>Save rules</button></div></form></div>;
  }
  const all = d.data?.items ?? []; const scope = tab === "chat-activity" ? all.filter((i) => i.decision !== "Open") : all; const rows = scope.filter((i) => has(i, search));
  const go = (id: string, action: "keep" | "remove", note?: string) => void act.run(() => schoolFetch(`${V}/chat-reports/${id}/decide`, json("POST", { action, note }))).then((ok) => { if (ok) { setRm(null); setWhy(""); } });
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tab === "chat-activity" && tiles([["Reports decided", scope.length], ["Kept", scope.filter((x) => x.decision === "Kept").length], ["Removed", scope.filter((x) => x.decision === "Removed").length]])}
    <ListPanel title={tab === "chat-activity" ? "Decisions" : "Reported messages"} noun="reports" search={search} onSearch={setSearch} exportName={tab} head={["Report", "Chat", "Reported by", "Reason", "Date", "Decision"]} exportRows={rows.map((i) => [i.code, i.chat, i.reported_by, i.reason, day(i.reported_on), i.decision])}
      tableHead={["Report", "Chat", "Reported by", "Reason", "Date", "Decision", ""]} empty={d.loading ? "Loading…" : "No reports. People report messages from the chat in the Parent, Student and Teacher apps."}
      rows={rows.map((i) => [i.code, i.chat, i.reported_by, i.reason, day(i.reported_on), <Chip key="d" tone={T(i.decision)}>{i.decision}</Chip>, i.decision === "Open" ? <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => go(i.id, "keep")}>Keep</button><button type="button" className={small} disabled={act.busy} onClick={() => { setRm(i); setWhy(""); }}>Remove message</button></span> : i.decision_note ?? ""])} />
    <Modal open={!!rm} title={rm ? `Remove message · ${rm.code}` : ""} onClose={() => setRm(null)}>{rm && <form onSubmit={(e) => { e.preventDefault(); go(rm.id, "remove", why); }} className="space-y-3"><ErrorBanner message={act.error} /><Field label="Why is it removed? This is saved with the decision."><textarea className={`${inputCls} min-h-[70px]`} required maxLength={200} value={why} onChange={(e) => setWhy(e.target.value)} /></Field><div className="flex justify-end gap-2"><button type="button" className={small} onClick={() => setRm(null)}>Close</button><button type="submit" className={redBtn} disabled={act.busy}>Remove message</button></div></form>}</Modal></div>;
}

export function ChatActivityPage() {
  const d = useLoad(() => schoolFetch<{ messages: number | null; active_parents: number | null; reply_hours: number | null; reported: number; open: number; groups: [string, number][]; files: [string, number][] }>(`${V}/chat-activity`), []); const x = d.data;
  return <div className="space-y-5"><ErrorBanner message={d.error} />{tiles([["Messages this month", x?.messages === null || !x ? "—" : x.messages.toLocaleString("en-IN")], ["Active parents", x?.active_parents === null || !x ? "—" : x.active_parents.toLocaleString("en-IN")], ["Teacher reply time", x?.reply_hours === null || !x ? "—" : `${x.reply_hours} h`, "During school hours"], ["Reported", x?.reported ?? 0, `${x?.open ?? 0} open`]])}
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Most active class groups" sub="Messages this month"><BarRows rows={x?.groups ?? []} /></Panel><Panel title="Files shared" sub="This month"><BarRows rows={x?.files ?? []} /></Panel></div>
    <p className="text-xs text-slate-500">Message and file counts appear once the Parent, Student and Teacher chat is connected. Reports are counted now.</p></div>;
}
