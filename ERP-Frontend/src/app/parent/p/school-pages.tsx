"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, inputCls } from "@/components/admin/ui";
import { Head, redBtn } from "../../teacher/t/head";
import { useParent } from "../context";
import { AnnouncementDialog, AnnouncementList, type Ann } from "./dash-pages";
import { LEAVE_TYPES } from "./academic-pages";
import { ChildBar, DataTable, Empty, Lbl, Loaded, Note, Status, bluePill, bold, dmy, pill, row, useChildPath, useGet } from "./kit";

const field = `${inputCls} !py-1.5 text-[12.5px]`;
const Sent = ({ text }: { text: string }) => (text ? <span role="status" className="mr-auto text-[13px] font-semibold text-emerald-700">{text}</span> : null);

// ═════════════ requests ═════════════
interface Reqs { types: string[]; stops: string[]; items: { id: string; code: string; type: string; details: string; date: string; status: string }[] }
const LABEL: Record<string, string> = { leave: "Leave for my child", certificate: "A certificate", transport: "School bus change", mess: "Mess (lunch) for my child", medical: "Vaccination card or medical note", correction: "Correct a school record" };

export function NewRequest() {
  const { child } = useParent();
  const r = useGet<Reqs>(useChildPath("/parent/requests"));
  const [type, setType] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [done, setDone] = useState("");
  const [formKey, setFormKey] = useState(0);
  const act = useAction(r.reload);
  const types = r.data?.types ?? [];
  const t = types.includes(type) ? type : types[0] ?? "";
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const body = (): Record<string, unknown> => {
    if (t === "leave") return { leave_type: f.leave_type || LEAVE_TYPES[0], from_date: f.from_date, to_date: f.to_date || f.from_date };
    if (t === "certificate") return { kind: f.kind || "Bonafide", purpose: f.purpose };
    if (t === "transport") return { details: [f.stop || r.data?.stops[0], f.note].filter(Boolean).join(" · ").slice(0, 200) };
    if (t === "mess") return { meals: f.meals || "Lunch", diet: f.diet || "Veg", start_on: f.start_on };
    if (t === "medical") return { kind: f.mkind || "Medical note", details: f.details, attachment: f.attachment || undefined };
    return { details: f.details };
  };
  return (
    <>
      <Head title="New Request" subtitle="Ask the school for something for your child. Each request goes to the person who decides it." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (
          <form key={formKey} onSubmit={(e) => { e.preventDefault(); setDone(""); void act.run(async () => { const x = await schoolFetch<{ code?: string }>("/parent/requests", json("POST", { type: t, student_id: child?.id, ...body() })); setF({}); setFormKey((k) => k + 1); setDone(`Request ${x.code ?? ""} sent.`); }); }}>
            <Panel title="New request" sub="Goes straight to the right team">
              <ErrorBanner message={act.error} />
              <div className="grid gap-3.5 p-4 sm:grid-cols-3">
                <Lbl label="What do you need?"><select className={field} value={t} onChange={(e) => { setType(e.target.value); setF({}); setDone(""); }}>{types.map((x) => <option key={x} value={x}>{LABEL[x] ?? x}</option>)}</select></Lbl>
                {t === "leave" && <><Lbl label="Reason"><select className={field} onChange={set("leave_type")}>{LEAVE_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Lbl><Lbl label="From"><input type="date" required className={field} onChange={set("from_date")} /></Lbl><Lbl label="To"><input type="date" min={f.from_date} className={field} onChange={set("to_date")} /></Lbl></>}
                {t === "certificate" && <><Lbl label="Certificate"><select className={field} onChange={set("kind")}>{["Bonafide", "Study", "Conduct", "Character", "Transfer"].map((x) => <option key={x}>{x}</option>)}</select></Lbl><Lbl label="Purpose"><input required minLength={2} maxLength={120} className={field} onChange={set("purpose")} /></Lbl></>}
                {t === "transport" && <><Lbl label="Route and stop needed">{d.stops.length ? <select className={field} onChange={set("stop")}>{d.stops.map((x) => <option key={x}>{x}</option>)}</select> : <input required minLength={3} maxLength={150} className={field} onChange={set("stop")} placeholder="Route · stop" />}</Lbl><Lbl label="Note (optional)"><input maxLength={80} className={field} onChange={set("note")} /></Lbl></>}
                {t === "mess" && <><Lbl label="Meals"><select className={field} onChange={set("meals")}><option>Lunch</option><option>Lunch + snacks</option></select></Lbl><Lbl label="Food preference"><select className={field} onChange={set("diet")}><option>Veg</option><option>Non-veg</option><option>Jain</option></select></Lbl><Lbl label="Start on"><input type="date" required className={field} onChange={set("start_on")} /></Lbl></>}
                {t === "medical" && <><Lbl label="Type"><select className={field} onChange={set("mkind")}><option>Medical note</option><option>Vaccination card</option></select></Lbl><Lbl label="Attach a photo or file (optional)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-[12px]" onChange={(e) => setF({ ...f, attachment: e.target.files?.[0]?.name ?? "" })} /><span className="mt-1 block text-[11px] text-slate-500">Only the file name is recorded: hand the copy to the school nurse.</span></Lbl></>}
                {(t === "medical" || t === "correction") && <Lbl label="Details" className="sm:col-span-3"><textarea required minLength={3} maxLength={t === "medical" ? 300 : 400} className={`${field} min-h-[5rem]`} onChange={set("details")} /></Lbl>}
              </div>
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3"><Sent text={done} /><button type="button" className={`${pill} !py-1.5`} onClick={() => { setF({}); setFormKey((k) => k + 1); setDone(""); }}>Clear</button><button type="submit" className={bluePill} disabled={act.busy || !t || !child}>Send request</button></div>
            </Panel>
          </form>
        )}</Loaded>
      </div>
    </>
  );
}

export function RequestStatus({ go }: { go: (tab: string) => void }) {
  const r = useGet<Reqs>(useChildPath("/parent/requests"));
  const [view, setView] = useState<Reqs["items"][number] | null>(null);
  return (
    <>
      <Head title="Request Status" subtitle="Every request for your child and where it stands." action={<button type="button" className={redBtn} onClick={() => go("new")}>New request</button>} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => <DataTable title="My requests" sub={`${d.items.length} requests`} name="requests" search head={[{ h: "Number" }, { h: "Request" }, { h: "Details" }, { h: "Raised" }, { h: "Status" }]} empty="You have not raised a request yet."
          rows={d.items.map((x) => row([x.code, x.type, x.details, x.date, x.status], [x.code, bold(x.type), x.details, dmy(x.date), <Status key="s" value={x.status} />], <button type="button" className={pill} onClick={() => setView(x)}>View details</button>))} />}</Loaded>
      </div>
      {view && <Modal open title={`${view.code} · ${view.type}`} onClose={() => setView(null)}><p className="mb-2 text-[12.5px] text-slate-500">Raised {dmy(view.date)}</p><p className="mb-3 whitespace-pre-wrap text-[13px] text-slate-900">{view.details}</p><Status value={view.status} /></Modal>}
    </>
  );
}

// ═════════════ messages ═════════════
interface Msg { id: string; code: string; direction: "in" | "out"; subject: string; body: string; date: string; with: string; unread: boolean; status: string }
interface Msgs { teachers: { id: string; name: string; role: string }[]; items: Msg[] }

export function Inbox({ go }: { go: (tab: string) => void }) {
  const { refreshMe } = useParent();
  const r = useGet<Msgs>(useChildPath("/parent/messages"));
  const [open, setOpen] = useState<Msg | null>(null);
  const [reply, setReply] = useState("");
  const { child } = useParent();
  const act = useAction(r.reload);
  const view = (m: Msg) => { setOpen(m); setReply(""); if (m.unread) void schoolFetch(`/parent/messages/${m.id}/read`, json("POST", {})).then(() => { r.reload(); refreshMe(); }, () => undefined); };
  const table = (title: string, items: Msg[], who: string, empty: string) => <DataTable title={title} sub={`${items.length} messages`} search head={[{ h: "Date" }, { h: who }, { h: "Subject" }, { h: "Status" }]} empty={empty}
    rows={items.map((m) => row([m.date, m.with, m.subject, m.unread ? "New" : m.status], [dmy(m.date), bold(m.with), <span key="s" className={m.unread ? "font-semibold" : ""}>{m.subject}</span>, <Status key="t" value={m.unread ? "New" : m.status} />], <button type="button" className={pill} onClick={() => view(m)}>Open</button>))} />;
  return (
    <>
      <Head title="Messages" subtitle="Messages between you and your child's teachers and the school office." action={<button type="button" className={redBtn} onClick={() => go("write")}>Message a teacher</button>} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => <>{table("From the school", d.items.filter((m) => m.direction === "out"), "From", "No messages from the school yet.")}{table("Sent by you", d.items.filter((m) => m.direction === "in"), "To", "You have not sent a message yet.")}</>}</Loaded>
      </div>
      {open && (
        <Modal open title={open.subject} onClose={() => setOpen(null)}>
          <ErrorBanner message={act.error} />
          <p className="mb-2 text-[12.5px] text-slate-500">{open.direction === "out" ? "From" : "To"} {open.with} · {dmy(open.date)}</p>
          <p className="whitespace-pre-wrap text-[13px] text-slate-900">{open.body || "No further text."}</p>
          {open.direction === "out" && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              <Lbl label="Reply"><textarea className={`${field} min-h-[5rem]`} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} /></Lbl>
              <div className="flex justify-end"><button type="button" className={bluePill} disabled={act.busy || reply.trim().length < 2} onClick={() => void act.run(async () => { await schoolFetch("/parent/messages", json("POST", { student_id: child?.id, reply_to: open.id, body: reply })); setOpen(null); })}>Send reply</button></div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function WriteMessage() {
  const { child } = useParent();
  const r = useGet<Msgs>(useChildPath("/parent/messages"));
  const blank = { teacher_id: "", subject: "", body: "" };
  const [f, setF] = useState(blank);
  const [done, setDone] = useState("");
  const act = useAction(() => undefined);
  return (
    <>
      <Head title="Message a Teacher" subtitle="Write to your child's class teacher or a subject teacher. Replies come back under Messages." />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => (!d.teachers.length ? <Empty>No teacher is assigned to this class yet.</Empty> : (
          <form onSubmit={(e) => { e.preventDefault(); setDone(""); void act.run(async () => { await schoolFetch("/parent/messages", json("POST", { student_id: child?.id, ...f, teacher_id: d.teachers.some((t) => t.id === f.teacher_id) ? f.teacher_id : d.teachers[0].id })); setF(blank); setDone("Message sent."); }); }}>
            <Panel title="New message">
              <ErrorBanner message={act.error} />
              <div className="space-y-3.5 p-4">
                <Lbl label="To" className="max-w-md"><select className={field} value={f.teacher_id} onChange={(e) => setF({ ...f, teacher_id: e.target.value })}>{d.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.role ? ` · ${t.role}` : ""}</option>)}</select></Lbl>
                <Lbl label="Subject"><input required minLength={2} maxLength={200} className={field} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Lbl>
                <Lbl label="Message"><textarea required minLength={2} maxLength={2000} className={`${field} min-h-[7rem]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Lbl>
              </div>
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3"><Sent text={done} /><button type="button" className={`${pill} !py-1.5`} onClick={() => { setF(blank); setDone(""); }}>Clear</button><button type="submit" className={bluePill} disabled={act.busy}>Send message</button></div>
            </Panel>
          </form>
        ))}</Loaded>
      </div>
    </>
  );
}

// ═════════════ parent-teacher meeting ═════════════
interface Ptm { items: { session_id: string; date: string; room: string; teacher: string; role: string; booked: { id: string; time: string; topic: string; met: boolean } | null; free: { id: string; time: string }[] }[] }
export function Meetings() {
  const { child } = useParent();
  const r = useGet<Ptm>(useChildPath("/parent/ptm"));
  const [topic, setTopic] = useState("");
  const act = useAction(r.reload);
  return (
    <>
      <Head title="Book a Meeting" subtitle="Choose a free time with your child's teachers on the parent–teacher meeting day." />
      <div className="space-y-4">
        <ChildBar />
        <ErrorBanner message={act.error} />
        <Loaded r={r}>{(d) => (!d.items.length ? <Empty>No meeting slots are open yet. They appear here when the teachers publish them.</Empty> : (
          <>
            <Lbl label="What would you like to talk about? (optional)" className="max-w-xl"><input className={field} maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} /></Lbl>
            {d.items.map((s) => (
              <Panel key={s.session_id} title={s.teacher} sub={[s.role, dmy(s.date), s.room].filter(Boolean).join(" · ")}>
                {s.booked ? (
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]"><Status value={s.booked.met ? "Met" : "Booked"} /><span><b>{s.booked.time}</b>{s.booked.topic ? ` · ${s.booked.topic}` : ""}</span>
                    {!s.booked.met && <button type="button" className={`${pill} ml-auto`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/parent/ptm/${s.booked!.id}?child=${child?.id}`, { method: "DELETE" }))}>Cancel booking</button>}</div>
                ) : (
                  <div className="flex flex-wrap gap-2 px-4 py-3">{s.free.map((x) => <button key={x.id} type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch("/parent/ptm", json("POST", { student_id: child?.id, slot_id: x.id, topic: topic || undefined })))}>{x.time}</button>)}{!s.free.length && <span className="text-[13px] text-slate-500">All slots are taken.</span>}</div>
                )}
              </Panel>
            ))}
          </>
        ))}</Loaded>
      </div>
    </>
  );
}

// ═════════════ notices and class diary ═════════════
interface Notices { items: Ann[]; diary: { id: string; date: string; kind: string; entry: string; by: string; attachment: string; ask_ack: boolean; seen: boolean }[] }
export function Circulars() {
  const r = useGet<Notices>(useChildPath("/parent/notices"));
  const [open, setOpen] = useState<Ann | null>(null);
  return (
    <>
      <Head title="Circulars & Notices" subtitle="What the school has sent to parents." />
      <Loaded r={r}>{(d) => <AnnouncementList items={d.items} sub={`${d.items.length} in all`} onOpen={setOpen} />}</Loaded>
      {open && <AnnouncementDialog a={open} onClose={() => setOpen(null)} />}
    </>
  );
}
export function ClassDiary() {
  const { child } = useParent();
  const r = useGet<Notices>(useChildPath("/parent/notices"));
  const act = useAction(r.reload);
  return (
    <>
      <Head title="Class Diary" subtitle="Daily diary entries and teacher remarks. Mark an entry as seen to tell the teacher." />
      <div className="space-y-4">
        <ChildBar />
        <ErrorBanner message={act.error} />
        <Loaded r={r}>{(d) => (
          <DataTable title="Diary" sub={`${d.diary.length} entries`} name="class-diary" search head={[{ h: "Date" }, { h: "Type" }, { h: "Entry" }, { h: "By" }, { h: "Status" }]} empty="No diary entries yet."
            rows={d.diary.map((x) => row([x.date, x.kind, x.entry, x.by, x.seen ? "Seen" : "New"], [dmy(x.date), x.kind, <span key="e">{x.entry}{x.attachment && <span className="block text-[11px] text-slate-500">Attachment: {x.attachment}</span>}</span>, x.by, <Status key="s" value={x.seen ? "Done" : "New"} />], x.seen ? <span className="text-[11.5px] text-slate-500">Seen</span> : <button type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/parent/notices/diary/${x.id}/seen?child=${child?.id}`, json("POST", {})))}>Mark as seen</button>))} />
        )}</Loaded>
      </div>
    </>
  );
}

// ═════════════ events and gallery ═════════════
interface Events { gallery: boolean; events: { id: string; title: string; event_date: string; kind: string; note: string | null }[]; albums: { id: string; title: string; event: string; album_date: string; photo_count: number; caption: string }[] }
export function SchoolEvents() {
  const r = useGet<Events>("/parent/events");
  return (
    <>
      <Head title="School Events" subtitle="School and sports events for your children's classes." />
      <Loaded r={r}>{(d) => <DataTable title="Events" sub={`${d.events.length} events`} name="school-events" search head={[{ h: "Date" }, { h: "Event" }, { h: "Type" }, { h: "Details" }]} empty="No events yet." rows={d.events.map((e) => row([e.event_date, e.title, e.kind, e.note || "—"], [bold(dmy(e.event_date)), bold(e.title), e.kind, e.note || "—"]))} />}</Loaded>
    </>
  );
}
export function Gallery() {
  const r = useGet<Events>("/parent/events");
  return (
    <>
      <Head title="Photo Gallery" subtitle="Albums the school has published." />
      <Loaded r={r}>{(d) => (!d.albums.length ? <Empty>No albums have been published yet.</Empty> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.albums.map((a) => <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-[14px] text-slate-900">{a.title}</h2><p className="text-[12px] text-slate-500">{a.event} · {dmy(a.album_date)}</p><p className="mt-2 text-[12.5px] text-slate-700">{a.caption}</p><p className="mt-2 text-[12px] font-semibold text-[#026f9b]">{a.photo_count} photos</p></div>)}</div>
          <Note>The school records each album&apos;s details; the photos themselves are not yet stored in this app.</Note>
        </>
      ))}</Loaded>
    </>
  );
}

// ═════════════ homework and online learning (read only) ═════════════
interface Work { id: string; code: string; title: string; instructions: string; subject: string; teacher: string; given_on: string; due_on: string; status: string; marks: number | null; max_marks: number; feedback: string; files?: string[] }
function WorkPage({ kind, title, subtitle }: { kind: "homework" | "assignments"; title: string; subtitle: string }) {
  const r = useGet<{ homework: Work[]; assignments: Work[] }>(useChildPath("/parent/homework"));
  const [view, setView] = useState<Work | null>(null);
  return (
    <>
      <Head title={title} subtitle={subtitle} />
      <div className="space-y-4">
        <ChildBar />
        <Loaded r={r}>{(d) => <DataTable title={title} sub={`${d[kind].length} set`} name={kind} search head={[{ h: "Due" }, { h: "Subject" }, { h: "Title" }, { h: "Status" }, { h: "Marks" }]} empty={`No ${title.toLowerCase()} yet.`}
          rows={d[kind].map((w) => row([w.due_on, w.subject, w.title, w.status, w.marks ?? "—"], [dmy(w.due_on), w.subject, bold(w.title), <Status key="s" value={w.status} />, w.marks === null ? "—" : `${w.marks} / ${w.max_marks}`], <button type="button" className={pill} onClick={() => setView(w)}>View details</button>))} />}</Loaded>
      </div>
      {view && (
        <Modal open title={view.title} onClose={() => setView(null)}>
          <p className="mb-2 text-[12.5px] text-slate-500">{[view.subject, view.teacher, `due ${dmy(view.due_on)}`, `${view.max_marks} marks`].filter(Boolean).join(" · ")}</p>
          <p className="whitespace-pre-wrap text-[13px] text-slate-900">{view.instructions || "No further instructions."}</p>
          {!!view.files?.length && <p className="mt-2 text-[12.5px] text-slate-600">Files: {view.files.join(", ")}</p>}
          {view.feedback && <p className="mt-3 text-[13px]"><b>Teacher&apos;s feedback:</b> {view.feedback}</p>}
          <div className="mt-3"><Status value={view.status} /></div>
        </Modal>
      )}
    </>
  );
}
export const Homework = () => <WorkPage key="homework" kind="homework" title="Homework" subtitle="Homework set for your child's class and whether it has been handed in." />;
export const Assignments = () => <WorkPage key="assignments" kind="assignments" title="Assignments" subtitle="Assignments with marks and feedback once the teacher publishes them." />;

interface Online {
  classes: { id: string; name: string; date: string; time: string; minutes: number; platform: string; link: string; status: string; teacher: string }[];
  materials: { id: string; title: string; kind: string; subject: string; chapter: string; files: string[]; url: string; size: string; date: string }[];
  tests: { id: string; code: string; name: string; subject: string; questions: number; minutes: number; status: string; opens_on: string; score: number | null }[];
}
const useOnline = () => useGet<Online>(useChildPath("/parent/online"));
const open = (href: string, label: string) => (href ? <a href={href} target="_blank" rel="noopener noreferrer" className={pill}>{label}</a> : <span />);
export function OnlineClasses() {
  const r = useOnline();
  return (<><Head title="Online Classes" subtitle="Live classes for your child's section." /><div className="space-y-4"><ChildBar /><Loaded r={r}>{(d) => <DataTable title="Classes" sub={`${d.classes.length} sessions`} name="online-classes" head={[{ h: "Date" }, { h: "Time" }, { h: "Class" }, { h: "Teacher" }, { h: "Platform" }, { h: "Status" }]} empty="No online classes yet." rows={d.classes.map((c) => row([c.date, c.time, c.name, c.teacher, c.platform, c.status], [dmy(c.date), `${c.time} · ${c.minutes} min`, bold(c.name), c.teacher, c.platform, <Status key="s" value={c.status} />], open(c.link, "Join")))} />}</Loaded></div></>);
}
export function Materials() {
  const r = useOnline();
  return (<><Head title="Study Materials" subtitle="Notes, files and links the teachers have published." /><div className="space-y-4"><ChildBar /><Loaded r={r}>{(d) => <DataTable title="Materials" sub={`${d.materials.length} items`} name="study-materials" search head={[{ h: "Added" }, { h: "Subject" }, { h: "Title" }, { h: "Type" }, { h: "Chapter" }]} empty="No study materials yet." rows={d.materials.map((m) => row([m.date, m.subject, m.title, m.kind, m.chapter || "—"], [dmy(m.date), m.subject, <span key="t">{bold(m.title)}{m.files.length > 0 && <span className="block text-[11px] text-slate-500">{m.files.join(", ")}{m.size ? ` · ${m.size}` : ""}</span>}</span>, m.kind, m.chapter || "—"], open(m.url, "Open link")))} />}</Loaded></div></>);
}
export function Tests() {
  const r = useOnline();
  return (<><Head title="Online Tests" subtitle="Tests for your child's class and the scores of those taken." /><div className="space-y-4"><ChildBar /><Loaded r={r}>{(d) => <DataTable title="Tests" sub={`${d.tests.length} tests`} name="online-tests" head={[{ h: "Test" }, { h: "Subject" }, { h: "Questions" }, { h: "Minutes" }, { h: "Status" }, { h: "Score" }]} empty="No online tests yet." rows={d.tests.map((t) => row([t.name, t.subject, t.questions, t.minutes, t.status, t.score ?? "—"], [bold(t.name), t.subject, t.questions, t.minutes, <Status key="s" value={t.status} />, t.score === null ? "—" : `${t.score}%`]))} />}</Loaded></div></>);
}
