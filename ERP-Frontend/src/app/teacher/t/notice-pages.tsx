"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Award, FlaskConical, Flame, Heart, Star, Trophy, TreePine } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { SearchBox, blueBtn, smallBtn } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const todayIso = () => new Date().toLocaleDateString("en-CA");
const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

// ═════════════ school notices ═════════════
interface Circ { id: string; code: string; title: string; audience: string; issued_by: string; circ_date: string; body: string; acknowledged: boolean }
export function Circulars() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Circ[] }>("/teacher/notices/circulars"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Circ | null>(null);
  const items = (data?.items ?? []).filter((c) => !q || `${c.code} ${c.title} ${c.audience} ${c.issued_by}`.toLowerCase().includes(q.toLowerCase()));
  const ack = (c: Circ) => void act.run(() => schoolFetch(`/teacher/notices/circulars/${c.id}/acknowledge`, json("POST", {})));
  return (
    <div data-report>
      <Head title="Circulars" subtitle="Circulars from the school. Acknowledge the ones meant for staff." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Circulars" sub={`${data.items.length} circulars`} right={<ExportPrint name="circulars" head={["No.", "Title", "For", "Issued by", "Date", "My status"]} rows={items.map((c) => [c.code, c.title, c.audience, c.issued_by, c.circ_date, c.acknowledged ? "Acknowledged" : "New"])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search circulars" /></div>
          <SimpleTable head={[{ h: "No." }, { h: "Title" }, { h: "For" }, { h: "Issued by" }, { h: "Date" }, { h: "My status" }, { h: "" }]} empty="No circular has been published yet." rows={items.map((c) => [c.code, <b key="t" className="font-semibold text-slate-900">{c.title}</b>, c.audience, c.issued_by, day(c.circ_date), <Chip key="s" tone={c.acknowledged ? "good" : "warn"}>{c.acknowledged ? "Acknowledged" : "New"}</Chip>,
            <span key="a" className="flex gap-1.5">{!c.acknowledged && <button type="button" disabled={act.busy} className={blueBtn} onClick={() => ack(c)}>Acknowledge</button>}<button type="button" className={smallBtn} onClick={() => setView(c)}>View details</button></span>])} />
        </Panel>
      )}
      {view && <Modal open title={`${view.code} · ${view.title}`} onClose={() => setView(null)}><KV rows={[["For", view.audience], ["Issued by", view.issued_by], ["Date", day(view.circ_date)], ["Circular", view.body || "—"]]} />{!view.acknowledged && <div className="mt-4 flex justify-end"><button type="button" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { ack(view); setView(null); }}>Acknowledge</button></div>}</Modal>}
    </div>
  );
}

export function Announcements() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: { id: string; title: string; audience: string; channels: string; send_on: string; state: string }[] }>("/teacher/notices/announcements"), []);
  const [q, setQ] = useState("");
  const [view, setView] = useState<{ title: string; audience: string; channels: string; send_on: string; state: string } | null>(null);
  const items = (data?.items ?? []).filter((a) => !q || `${a.title} ${a.audience}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Announcements" subtitle="School announcements for staff, students and parents." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Announcements" sub={`${data.items.length} announcements`} right={<ExportPrint name="announcements" head={["Title", "Audience", "Channels", "Send on", "Status"]} rows={items.map((a) => [a.title, a.audience, a.channels, a.send_on, a.state])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search announcements" /></div>
          <SimpleTable head={[{ h: "Title" }, { h: "Audience" }, { h: "Channels" }, { h: "Send on" }, { h: "Status" }, { h: "" }]} empty="No announcement yet." rows={items.map((a) => [a.title, a.audience, a.channels, day(a.send_on), <Chip key="s" tone={a.state === "Published" ? "good" : "info"}>{a.state}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(a)}>View details</button>])} />
        </Panel>
      )}
      {view && <Modal open title={view.title} onClose={() => setView(null)}><KV rows={[["Audience", view.audience], ["Channels", view.channels], ["Send on", day(view.send_on)], ["Status", view.state]]} /></Modal>}
    </div>
  );
}

// ═════════════ parent-teacher meeting ═════════════
interface Slots { session: { date: string; starts: string; ends: string; minutes: number; room: string; title: string } | null; slots: { id: string; time: string; status: string; student: string; class_label: string; parent: string; topic: string }[]; booked: number; free: number; blocked: number }
const ampm = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

export function MeetingSlots() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Slots>("/teacher/ptm/slots"), []);
  const act = useAction(reload);
  const s = data?.session;
  return (
    <div data-report>
      <Head title="My Slots" subtitle={s ? `Parent-teacher meeting on ${day(s.date)}, ${ampm(s.starts)} – ${ampm(s.ends)}. Parents book a ${s.minutes}-minute slot in the Parent portal. Click a free slot to block it.` : "Parent-teacher meeting slots appear here once the School Admin adds the meeting to the school calendar."} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !s && <Panel title="My slots"><Empty text="No parent-teacher meeting is coming up." /></Panel>}
      {data && s && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Booked", value: data.booked, sub: "Parents coming" }, { label: "Free", value: data.free, sub: "Open for booking" }, { label: "Blocked", value: data.blocked, sub: "Not available" }]} />
          <Panel title={`My slots · ${day(s.date)}`} sub={`${s.minutes} minutes each${s.room ? ` · ${s.room}` : ""}`}>
            <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
              {data.slots.map((x) => {
                const free = x.status === "Free"; const blocked = x.status === "Blocked"; const busy = x.status === "Booked" || x.status === "Met";
                return (
                  <button key={x.id} type="button" disabled={busy || act.busy} onClick={() => void act.run(() => schoolFetch(`/teacher/ptm/slots/${x.id}/toggle`, json("POST", {})))} title={busy ? `${x.parent} · ${x.topic}` : free ? "Click to block" : "Click to free"}
                    className={`rounded-lg border px-2.5 py-2 text-left text-[12px] ${busy ? "border-[#9fcfe6] bg-[#dceff9]" : blocked ? "border-[#e8c98a] bg-[#fdf3e0]" : "border-slate-200 bg-white hover:border-[#41afda]"}`}>
                    <span className="block text-slate-900">{x.time}</span><span className={`block truncate text-[11px] ${busy ? "font-semibold text-[#026f9b]" : "text-slate-500"}`}>{busy ? x.student : blocked ? "Blocked" : "Free"}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

export function MeetingBookings() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Slots>("/teacher/ptm/slots"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const rows = (data?.slots ?? []).filter((x) => (x.status === "Booked" || x.status === "Met") && (!q || `${x.parent} ${x.student} ${x.topic}`.toLowerCase().includes(q.toLowerCase())));
  const s = data?.session;
  return (
    <div data-report>
      <Head title="Bookings" subtitle="Parents who booked a slot with you. Add a note after each meeting; parents see a summary in the diary." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !s && <Panel title="Bookings"><Empty text="No parent-teacher meeting is coming up." /></Panel>}
      {data && s && (
        <Panel title={`Bookings · ${day(s.date)}`} sub={`${rows.length} bookings`} right={<ExportPrint name="meeting-bookings" head={["Time", "Parent", "Student", "Wants to discuss", "Status"]} rows={rows.map((x) => [x.time, x.parent, `${x.student} ${x.class_label}`, x.topic, x.status])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search bookings · ${day(s.date).toLowerCase()}`} /></div>
          <SimpleTable head={[{ h: "Time" }, { h: "Parent" }, { h: "Student" }, { h: "Wants to discuss" }, { h: "Status" }, { h: "" }]} empty="No parent has booked a slot yet." rows={rows.map((x) => [x.time, x.parent, <span key="s"><b className="font-semibold text-slate-900">{x.student}</b> <span className="text-slate-500">· {x.class_label}</span></span>, x.topic || "—", <Chip key="t" tone={x.status === "Met" ? "mute" : "info"}>{x.status === "Met" ? "Met" : "Booked"}</Chip>, x.status === "Booked" ? <button key="a" type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/ptm/slots/${x.id}/met`, json("POST", {})))}>Mark met</button> : null])} />
        </Panel>
      )}
    </div>
  );
}

// ═════════════ chat ═════════════
interface Thread { id: string; title: string; subtitle: string; last: string; last_at: string | null }
interface ChatData { thread: { id: string; title: string; subtitle: string }; messages: { id: string; mine: boolean; from: string; body: string; file_name: string; at: string }[] }
const ini = (t: string) => t.split(/[\s·]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

export function Chats() {
  const th = useLoad(() => schoolFetch<{ items: Thread[] }>("/teacher/chat/threads"), []);
  const [pick, setPick] = useState("");
  const id = th.data?.items.some((t) => t.id === pick) ? pick : th.data?.items[0]?.id ?? "";
  const msgs = useLoad(() => (id ? schoolFetch<ChatData>(`/teacher/chat/threads/${id}`) : Promise.resolve(null)), [id]);
  const act = useAction(() => { msgs.reload(); th.reload(); });
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.data]);
  const send = async (e: FormEvent) => { e.preventDefault(); if (!text.trim() && !file) return; if (await act.run(() => schoolFetch(`/teacher/chat/threads/${id}/messages`, json("POST", { body: text, file_name: file?.name })))) { setText(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; } };
  return (
    <div data-report>
      <Head title="Chats" subtitle="Chats with parents, your class groups and your department. Parents see you online only during school hours." />
      <ErrorBanner message={th.error || msgs.error || act.error} />
      <Loading on={th.loading && !th.data} />
      {th.data && !th.data.items.length && <Panel title="Chats"><Empty text="Your class groups appear here once you have classes." /></Panel>}
      {th.data && th.data.items.length > 0 && (
        <div className="space-y-4">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[17rem_1fr]" style={{ minHeight: "26rem" }}>
            <ul className="max-h-[26rem] overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-r">{th.data.items.map((t) => (
              <li key={t.id}><button type="button" onClick={() => setPick(t.id)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left ${t.id === id ? "bg-[#dceff9]" : "hover:bg-slate-50"}`}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d9efe8] text-[12px] font-bold text-[#065740]">{ini(t.title)}</span>
                <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-semibold text-slate-900">{t.title}</span>{t.last_at && <span className="shrink-0 text-[10.5px] text-slate-500">{shortDay(t.last_at)}</span>}</span><span className="block truncate text-[11.5px] text-slate-500">{t.last || t.subtitle}</span></span></button></li>))}</ul>
            <div className="flex min-w-0 flex-col">
              <div className="border-b border-slate-100 px-5 py-3"><p className="text-[14px] font-semibold text-slate-900">{msgs.data?.thread.title}</p><p className="text-[11.5px] text-slate-500">{msgs.data?.thread.subtitle}</p></div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-4" style={{ maxHeight: "21rem" }}>
                {msgs.data && !msgs.data.messages.length && <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello.</p>}
                {msgs.data?.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 text-[13px] ${m.mine ? "bg-[#dceff9] text-slate-900" : "border border-slate-200 bg-white text-slate-900"}`}>
                    {!m.mine && m.from && <p className="text-[11px] font-semibold text-[#026f9b]">{m.from}</p>}{m.body && <p className="whitespace-pre-wrap">{m.body}</p>}{m.file_name && <p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px]">📎 {m.file_name}</p>}<p className="mt-0.5 text-right text-[10px] text-slate-500">{clock(m.at)}</p></div></div>
                ))}
                <div ref={end} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
                <label className="grid size-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-slate-400" title="Attach a file">📎<input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={file ? `Attached: ${file.name}` : "Write a message…"} aria-label="Write a message" className={`${inputCls} flex-1`} />
                <button type="submit" disabled={act.busy || (!text.trim() && !file)} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Send</button>
              </form>
            </div>
          </div>
          <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">Chats are kept for the academic year and the School Admin can review reported messages. Don&apos;t share fee card or bank details in chat.</p>
        </div>
      )}
    </div>
  );
}

export function SharedFiles() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: { id: string; file: string; by: string; in: string; at: string }[] }>("/teacher/chat/files"), []);
  const [q, setQ] = useState("");
  const items = (data?.items ?? []).filter((f) => !q || `${f.file} ${f.by} ${f.in}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Shared Files" subtitle="Every file shared in your chats and groups." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Shared files" sub={`${data.items.length} files`} right={<ExportPrint name="shared-files" head={["File", "Shared by", "In", "Date"]} rows={items.map((f) => [f.file, f.by, f.in, f.at])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search shared files" /></div>
          <SimpleTable head={[{ h: "File" }, { h: "Shared by" }, { h: "In" }, { h: "Date" }]} empty="No file has been shared yet." rows={items.map((f) => [<b key="f" className="font-semibold text-slate-900">📎 {f.file}</b>, f.by, f.in, clock(f.at)])} />
        </Panel>
      )}
    </div>
  );
}

// ═════════════ photo gallery ═════════════
interface Album { id: string; title: string; event: string; date: string; audience: string; photos: number; caption: string; by: string; mine: boolean; status: string }
const GRAD = ["from-sky-300 to-indigo-500", "from-amber-200 to-lime-400", "from-teal-200 to-sky-500", "from-emerald-200 to-green-500", "from-lime-200 to-green-400", "from-fuchsia-300 to-pink-500", "from-indigo-300 to-purple-500"];
const ICON = [Star, Flame, FlaskConical, Trophy, TreePine, Heart, Award];

export function Albums({ go }: { go: (tab: string) => void }) {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Album[] }>("/teacher/gallery"), []);
  return (
    <div data-report>
      <Head title="Albums" subtitle="Every album, who uploaded it and who can see it." action={<button type="button" className={redBtn} onClick={() => go("upload-photos")}>Upload photos</button>} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && !data.items.length && <Panel title="Albums"><Empty text="No album has been published yet." /></Panel>}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {data?.items.map((a, i) => { const I = ICON[i % ICON.length]; return (
          <article key={a.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className={`grid h-32 place-items-center bg-gradient-to-br ${GRAD[i % GRAD.length]}`}><I className="size-10 text-white/90" aria-hidden="true" /></div>
            <div className="p-3"><p className="text-[13px] font-semibold text-slate-900">{a.title}</p><p className="text-[11px] text-slate-500">{day(a.date)} · {a.photos} photos · {a.audience}</p>{a.status !== "Published" && <p className="mt-2 inline-block rounded-md bg-[#f8ecd6] px-2 py-1 text-[11px] font-semibold text-[#8a5a0b]">● {a.status}</p>}</div>
          </article>); })}
      </div>
    </div>
  );
}

export function UploadPhotos({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ events: string[]; audiences: string[] }>("/teacher/gallery"), []);
  const act = useAction(reload);
  const blank = { title: "", event: "", date: todayIso(), audience: "", caption: "", blur: true, download: true, notify: true };
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const event = f.event || data?.events[0] || "";
  const audience = f.audience || data?.audiences[0] || "";
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!files.length) { setFileErr("Choose at least one photo."); return; } if (await act.run(() => schoolFetch("/teacher/gallery", json("POST", { title: f.title, event, date: f.date, audience, photos: files.length, caption: f.caption || undefined, blur: f.blur, download: f.download, notify: f.notify })))) { setF(blank); setFiles([]); setFileKey((k) => k + 1); go("albums"); } };
  const chk = (k: "blur" | "download" | "notify", label: string) => <label className="flex items-center gap-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="size-4 accent-[#0294CE]" />{label}</label>;
  return (
    <div data-report>
      <Head title="Upload Photos" subtitle="Share photos from a class activity. The School Admin approves them before parents can see them." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Upload photos</h2></div>
          {!data.audiences.length ? <Empty text="You have no classes yet, so there is nobody to share photos with." /> : (
            <div className="space-y-4 p-5">
              <L label="Album title"><input className={inputCls} required minLength={3} maxLength={160} placeholder="For example, Class 7 B · Children's Day" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></L>
              <div className="grid gap-4 sm:grid-cols-3">
                <L label="Event"><select className={inputCls} value={event} onChange={(e) => setF({ ...f, event: e.target.value })}>{data.events.map((x) => <option key={x}>{x}</option>)}</select></L>
                <L label="Date"><input type="date" className={inputCls} required max={todayIso()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></L>
                <L label="Who can see it"><select className={inputCls} value={audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{data.audiences.map((x) => <option key={x}>{x}</option>)}</select></L>
              </div>
              <L label="Photos" hint={fileErr || "JPG or PNG, up to 200 photos."}><input key={fileKey} type="file" multiple accept=".jpg,.jpeg,.png" className={FILE} onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length > 200) { setFileErr("Choose up to 200 photos."); e.target.value = ""; setFiles([]); } else { setFileErr(""); setFiles(list); } }} /></L>
              <L label="Caption"><input className={inputCls} maxLength={200} placeholder="One line about the album" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></L>
              <div className="space-y-2">{chk("blur", "Blur students who don't have photo consent")}{chk("download", "Let parents download photos")}{chk("notify", "Notify parents when it is published")}</div>
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFiles([]); setFileKey((k) => k + 1); setFileErr(""); }}>Clear</button><button type="submit" disabled={act.busy || !data.audiences.length} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>{act.busy ? "Sending…" : "Send for approval"}</button></div>
        </form>
      )}
    </div>
  );
}
