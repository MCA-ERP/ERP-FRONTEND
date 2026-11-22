"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnPrimary, useLoad } from "@/components/admin/ui";
import { useTeacher } from "../context";
import { Head, redBtn, whiteBtn } from "./head";

export const day = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const dayShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const rupees = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
export const Loading = ({ on }: { on: boolean }) => (on ? <p className="py-6 text-center text-sm text-slate-400">Loading…</p> : null);
export const Empty = ({ text }: { text: string }) => <p className="px-5 py-8 text-center text-sm text-slate-400">{text}</p>;

interface Cls { period: string; starts: string; ends: string; free: boolean; section: string; subject: string; room: string | null; substitution: boolean; state: "Done" | "Now" | "Next" | "" }
interface Task { key: string; tone: string; title: string; detail: string; action: string; go: string }
interface Dash {
  teacher: { first_name: string }; today: string; weekday: string; greeting: string; classes: Cls[]; class_count: number; substitution_count: number;
  register: { section: string; marked: boolean; present: number; total: number } | null; homework_to_check: number; parent_unread: number; syllabus: { percent: number; label: string } | null; tasks: Task[];
}

const ROUTINE: [string, string][] = [["Check today's timetable", "/teacher/timetable/my-timetable"], ["Select class and section", "/teacher/attendance/daily-attendance"], ["Mark attendance", "/teacher/attendance/daily-attendance"], ["Update lesson progress", "/teacher/subjects/my-subjects"], ["Create and publish homework", "/teacher/homework/homework-management"], ["Review student submissions", "/teacher/assignments/evaluation"], ["Enter marks for verification", "/teacher/examinations/marks-entry"], ["Respond to parent messages", "/teacher/communication/parent-messages"]];
const TONE: Record<string, string> = { alert: "bg-[#fce0df] text-[#ac2c28]", sub: "bg-[#f8ecd6] text-[#8a5a0b]", msg: "bg-[#f8ecd6] text-[#8a5a0b]", hw: "bg-[#dceff9] text-[#026f9b]", plan: "bg-[#dceff9] text-[#026f9b]", draft: "bg-[#dceff9] text-[#026f9b]", eval: "bg-[#dceff9] text-[#026f9b]", marks: "bg-[#f8ecd6] text-[#8a5a0b]" };
const MARK: Record<string, string> = { alert: "!", sub: "S", msg: "P", hw: "H", plan: "L", draft: "D", eval: "A", marks: "M" };

/** What a pending task's button does: open a page, or the substitutions dialog. */
function useGo() {
  const router = useRouter();
  const [subs, setSubs] = useState(false);
  return { subs, closeSubs: () => setSubs(false), go: (to: string) => (to === "dialog:substitutions" ? setSubs(true) : router.push(to)) };
}

function Subs({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: { id: string; date: string; status: string; section: string; subject: string; period: string; starts: string; ends: string; covering_for: string }[] }>("/teacher/substitutions"), []);
  const act = useAction(() => { reload(); onChanged(); });
  return (
    <Modal open title="Substitutions" onClose={onClose}>
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !data.items.length && <p className="py-4 text-center text-sm text-slate-400">No substitutions are waiting for you.</p>}
      <ul className="divide-y divide-slate-100">
        {data?.items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-slate-900">{s.section}{s.subject ? ` · ${s.subject}` : ""}</p><p className="text-xs text-slate-500">{s.period} · {s.starts}–{s.ends} · {day(s.date)}{s.covering_for ? ` · covering for ${s.covering_for}` : ""}</p></div>
            {s.status === "Pending" ? <button type="button" disabled={act.busy} className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/substitutions/${s.id}/accept`, json("POST", {})))}>Accept</button> : <Chip tone="good">{s.status === "Completed" ? "Done" : "Accepted"}</Chip>}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function TaskRows({ tasks, onGo }: { tasks: Task[]; onGo: (to: string) => void }) {
  if (!tasks.length) return <Empty text="Nothing is waiting for you right now." />;
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((t) => (
        <li key={t.key} className="flex items-center gap-3 px-5 py-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${TONE[t.tone] ?? TONE.hw}`}>{MARK[t.tone] ?? "•"}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-slate-900">{t.title}</p><p className="truncate text-[11px] text-slate-500">{t.detail}</p></div>
          <button type="button" onClick={() => onGo(t.go)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">{t.action}</button>
        </li>
      ))}
    </ul>
  );
}

export function TodaysClasses({ go }: { go: (tab: string) => void }) {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Dash>("/teacher/dashboard"), []);
  const { subs, closeSubs, go: open } = useGo();
  const { refreshBadges } = useTeacher();
  const dayKey = new Date().toLocaleDateString("en-CA");
  const [done, setDone] = useState<Record<number, boolean>>(() => { try { return typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem(`teacher-routine-${dayKey}`) ?? "{}"); } catch { return {}; } });
  const tick = (i: number, to: string) => { const next = { ...done, [i]: true }; setDone(next); try { localStorage.setItem(`teacher-routine-${dayKey}`, JSON.stringify(next)); } catch { /* storage unavailable */ } router.push(to); };
  const d = data;
  const nDone = Object.values(done).filter(Boolean).length;
  const when = d ? new Date(`${d.today}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const sub = d ? `${d.greeting}, ${d.teacher.first_name}. You have ${d.class_count} class${d.class_count === 1 ? "" : "es"}${d.substitution_count ? ` and ${d.substitution_count} substitution${d.substitution_count === 1 ? "" : "s"}` : ""} today, ${d.weekday} ${when}.` : "";
  return (
    <div data-report>
      <Head title="Today's Classes" subtitle={sub} action={<button type="button" className={redBtn} onClick={() => router.push("/teacher/attendance/daily-attendance")}>Mark attendance</button>} />
      <ErrorBanner message={error} />
      <Loading on={loading && !d} />
      {d && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">Today&apos;s routine</h2><span className="text-xs text-slate-500">{nDone} of {ROUTINE.length} done · opens each step</span></div>
            <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROUTINE.map(([label, to], i) => (
                <button key={label} type="button" onClick={() => tick(i, to)} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-[#41afda]">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${done[i] ? "bg-[#0294CE] text-white" : "bg-[#dceff9] text-[#026f9b]"}`}>{done[i] ? "✓" : i + 1}</span>
                  <span className="text-[12.5px] leading-tight text-slate-900">{label}</span>
                </button>
              ))}
            </div>
          </section>
          <Tiles items={[
            { label: "Classes today", value: d.class_count + d.substitution_count, sub: d.substitution_count ? `Includes ${d.substitution_count} substitution${d.substitution_count === 1 ? "" : "s"}` : "No substitutions" },
            { label: d.register ? `${d.register.section} attendance` : "Class attendance", value: d.register ? (d.register.marked ? `${d.register.present}/${d.register.total}` : "Not marked") : "—", sub: d.register ? (d.register.marked ? "Marked today" : "Your class register is open") : "You are not a class teacher" },
            { label: "To check", value: d.homework_to_check, sub: "Homework submissions" },
            { label: "Parent messages", value: d.parent_unread, sub: "Unread" },
            { label: "Syllabus", value: d.syllabus ? `${d.syllabus.percent}%` : "—", sub: d.syllabus?.label || "Add a lesson plan to track it" },
          ]} />
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">Today&apos;s classes</h2><span className="text-xs text-slate-500">{d.weekday.slice(0, 3)}{d.classes.find((c) => c.state === "Now") ? ` · now ${d.classes.find((c) => c.state === "Now")?.period}` : ""}</span><button type="button" onClick={() => router.push("/teacher/timetable/my-timetable")} className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">Week</button></div>
              {!d.classes.length ? <Empty text="No periods are set up for today." /> : (
                <ul className="divide-y divide-slate-100">
                  {d.classes.map((c) => (
                    <li key={c.period} className="flex items-center gap-3 px-5 py-3">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${c.free ? "bg-[#f8ecd6] text-[#8a5a0b]" : "bg-[#d9efe8] text-[#065740]"}`}>{c.period.replace(/^Period\s*/i, "P")}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-slate-900">{c.free ? "Free period" : <><b className="font-semibold">{c.section}</b> · {c.subject}{c.substitution ? " (substitution)" : ""}</>}</p>
                        <p className="truncate text-[11px] text-slate-500">{c.starts} – {c.ends}{c.room ? ` · Room ${c.room}` : ""}</p>
                      </div>
                      {c.state && <Chip tone={c.state === "Done" ? "good" : c.state === "Now" ? "info" : "mute"}>{c.state}</Chip>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">Pending tasks</h2><span className="text-xs text-slate-500">{d.tasks.length} to do</span><button type="button" onClick={() => go("pending-tasks")} className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">All</button></div>
              <TaskRows tasks={d.tasks.slice(0, 4)} onGo={open} />
            </section>
          </div>
        </div>
      )}
      {subs && <Subs onClose={closeSubs} onChanged={() => { reload(); refreshBadges(); }} />}
    </div>
  );
}

export function PendingTasks() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Dash>("/teacher/dashboard"), []);
  const { subs, closeSubs, go: open } = useGo();
  return (
    <div data-report>
      <Head title="Pending Tasks" subtitle="Everything waiting for you, most urgent first." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">Pending tasks</h2><span className="text-xs text-slate-500">{data.tasks.length} to do</span></div><TaskRows tasks={data.tasks} onGo={open} /></section>}
      {subs && <Subs onClose={closeSubs} onChanged={reload} />}
    </div>
  );
}

interface Note { key: string; type: string; title: string; detail: string; when: string; read: boolean; go: string | null }
const NOTE_MARK: Record<string, string> = { "Parent message": "P", Substitution: "S", Attendance: "!", "Lesson plan": "L", Leave: "V", "Help desk": "H" };
const NOTE_TONE: Record<string, string> = { Attendance: TONE.alert, Substitution: TONE.sub, "Parent message": TONE.msg };

export function Notifications() {
  const router = useRouter();
  const { refreshBadges } = useTeacher();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Note[]; total: number; unread: number; today: number }>("/teacher/notifications"), []);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [type, setType] = useState("");
  const [subs, setSubs] = useState(false);
  const act = useAction(() => { reload(); refreshBadges(); });
  const items = data?.items ?? [];
  const types = [...new Set(items.map((n) => n.type))];
  const shown = items.filter((n) => (filter === "all" || (filter === "unread" ? !n.read : n.read)) && (!type || n.type === type));
  const openNote = async (n: Note) => {
    if (!n.read) await act.run(() => schoolFetch("/teacher/notifications/read", json("POST", { keys: [n.key] })));
    if (n.go === "dialog:substitutions") setSubs(true); else if (n.go) router.push(n.go);
  };
  return (
    <div data-report>
      <Head title="Notifications" subtitle="Everything the portal has told you recently. Open one to go straight to it." action={<button type="button" disabled={act.busy || !data?.unread} className={whiteBtn} onClick={() => void act.run(() => schoolFetch("/teacher/notifications/read", json("POST", {})))}>Mark all as read</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Notifications", value: data.total, sub: "Last 7 days" }, { label: "Unread", value: data.unread, sub: "Newest first" }, { label: "Today", value: data.today }]} />
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            {([["all", `All (${data.total})`], ["unread", `Unread (${data.unread})`], ["read", `Read (${data.total - data.unread})`]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${filter === k ? "border-[#026f9b] bg-[#026f9b] text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}>{l}</button>)}
            <label className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[12px] text-slate-500">Type
              <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="bg-transparent font-semibold text-slate-900 outline-none"><option value="">All types</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </label>
            <span className="ml-auto text-xs text-slate-500">{shown.length} shown</span>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">Notifications</h2><span className="text-xs text-slate-500">{data.unread} unread</span></div>
            {!shown.length ? <Empty text="No notifications to show." /> : (
              <ul className="divide-y divide-slate-100">
                {shown.map((n) => (
                  <li key={n.key}>
                    <button type="button" onClick={() => void openNote(n)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${NOTE_TONE[n.type] ?? TONE.hw}`}>{NOTE_MARK[n.type] ?? "•"}</span>
                      <span className="min-w-0 flex-1"><span className={`block text-[13px] ${n.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</span><span className="block text-[11px] text-slate-500">{n.detail}</span><span className="block text-[11px] text-slate-400">{n.when}</span></span>
                      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {subs && <Subs onClose={() => setSubs(false)} onChanged={reload} />}
    </div>
  );
}

interface CheckState {
  campus: { name: string; geofence_m: number; location_set: boolean } | null;
  today: { checked_in: boolean; in: string | null; out: string | null; waiting_for_review: boolean };
  late_after: string; items: { date: string; in: string | null; out: string | null; method: string; status: string; late: boolean }[];
}
interface Where { campus: string | null; located: boolean; inside: boolean; distance_m: number | null; accuracy_m: number | null }

/** The selfie step: opens the camera, takes one frame. The picture is only used for this check-in and is not kept. */
function Selfie({ onTaken, onClose }: { onTaken: () => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" } }).then((s) => { stream = s; if (video.current) { video.current.srcObject = s; void video.current.play(); } }, () => setErr("The camera could not be opened. Allow camera access in your browser and try again."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  return (
    <Modal open title="Take a selfie" onClose={onClose}>
      {err ? <p className="text-sm text-rose-700">{err}</p> : <video ref={video} muted playsInline className="w-full rounded-xl bg-slate-900" />}
      <div className="mt-4 flex justify-end"><button type="button" disabled={!!err} className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={onTaken}>Use this photo</button></div>
    </Modal>
  );
}

export function CheckIn() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<CheckState>("/teacher/checkin"), []);
  const [where, setWhere] = useState<(Where & { lat: number; lng: number }) | null>(null);
  const [geoErr, setGeoErr] = useState(() => (typeof navigator !== "undefined" && !navigator.geolocation ? "This browser cannot share your location." : ""));
  const [selfie, setSelfie] = useState(false);
  const [camera, setCamera] = useState(false);
  const [msg, setMsg] = useState("");
  const act = useAction(reload);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(async (p) => {
      try { const w = await schoolFetch<Where>("/teacher/checkin/locate", json("POST", { lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: p.coords.accuracy })); setWhere({ ...w, lat: p.coords.latitude, lng: p.coords.longitude }); setGeoErr(""); } catch (e) { setGeoErr(e instanceof Error ? e.message : "Could not check your location."); }
    }, () => setGeoErr("Allow your location so the school can see you are on campus."), { enableHighAccuracy: true, maximumAge: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  const submit = (action: "in" | "out") => void act.run(async () => { const r = await schoolFetch<{ message: string }>("/teacher/checkin", json("POST", { action, lat: where?.lat, lng: where?.lng, accuracy_m: where?.accuracy_m ?? undefined, selfie })); setMsg(r.message); setSelfie(false); });
  const rows = (data?.items ?? []).filter((r) => !q || `${r.date} ${r.status} ${r.method}`.toLowerCase().includes(q.toLowerCase()));
  const week = (data?.items ?? []).slice(0, 7);
  const t = data?.today;
  return (
    <div data-report>
      <Head title="Check In" subtitle="Check in and out from your phone when you're on campus. It uses your location and a quick selfie." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            {geoErr ? <div className="rounded-xl bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{geoErr}</div>
              : !where ? <div className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500">Finding your location…</div>
              : where.inside ? <div className="flex items-start gap-3 rounded-xl bg-[#d9efe8] px-4 py-3"><span className="mt-1.5 size-3 shrink-0 rounded-full bg-[#065740]" /><div><p className="text-[13px] font-semibold text-slate-900">You are inside {where.campus ?? "the campus"}</p><p className="text-[11px] text-slate-700">{where.located && where.distance_m !== null ? `${where.distance_m} m from the campus${where.accuracy_m ? ` · location accurate to ${Math.round(where.accuracy_m)} m` : ""}` : "The school has not set the campus location yet, so any place counts."}</p></div></div>
              : <div className="flex items-start gap-3 rounded-xl bg-[#fce0df] px-4 py-3"><span className="mt-1.5 size-3 shrink-0 rounded-full bg-[#ac2c28]" /><div><p className="text-[13px] font-semibold text-slate-900">You are outside {where.campus ?? "the campus"}</p><p className="text-[11px] text-slate-700">{where.distance_m} m away. If you check in, the School Admin reviews it.</p></div></div>}
            <p className="mt-3 text-[12px] text-slate-500">{t?.checked_in ? `Last: checked in at ${t.in}${t.out ? ` · checked out at ${t.out}` : ""}` : t?.waiting_for_review ? "Your check-in is with the School Admin to review." : "You have not checked in today."}</p>
            {msg && <p role="status" className="mt-2 text-[13px] font-semibold text-[#065740]">{msg}</p>}
            <div className="mt-3 flex gap-2">
              {!t?.out && <button type="button" onClick={() => setCamera(true)} className={whiteBtn}>{selfie ? "Retake selfie" : "Take selfie"}</button>}
              {!t?.checked_in && !t?.waiting_for_review && <button type="button" disabled={!selfie || !where || act.busy} onClick={() => submit("in")} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Check in</button>}
              {t?.checked_in && !t.out && <button type="button" disabled={act.busy} onClick={() => submit("out")} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>Check out</button>}
            </div>
          </section>
          <Panel title="This week" sub={`${week.length} days`} right={<ExportPrint name="my-check-ins" head={["Day", "In", "Out", "Method", "Status"]} rows={rows.map((r) => [dayShort(r.date), r.in, r.out, r.method, r.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my check-ins" aria-label="Search my check-ins" className="w-full bg-transparent outline-none" /></label></div>
            <SimpleTable head={[{ h: "Day" }, { h: "In" }, { h: "Out" }, { h: "Method" }, { h: "Status" }]} empty="No check-ins yet." rows={rows.slice(0, 14).map((r) => [<b key="d" className="font-semibold text-slate-900">{dayShort(r.date)}</b>, r.in ?? "—", r.out ?? "—", r.method, <Chip key="s" tone={r.status === "On time" ? "good" : r.late || r.status === "Half day" ? "warn" : r.status === "Absent" ? "bad" : "info"}>{r.status}</Chip>])} />
          </Panel>
        </div>
      )}
      {camera && <Selfie onClose={() => setCamera(false)} onTaken={() => { setSelfie(true); setCamera(false); }} />}
    </div>
  );
}

interface Duty { id: string; event: string; date: string; venue: string; duty: string; time: string; response: string }
export function EventDuties() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Duty[] }>("/teacher/event-duties"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const items = useMemo(() => (data?.items ?? []).filter((d) => !q || `${d.event} ${d.duty} ${d.venue}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <div data-report>
      <Head title="Event Duties" subtitle="Event duties the School Admin gave you." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My event duties" sub={`${data.items.length} ${data.items.length === 1 ? "duty" : "duties"}`} right={<ExportPrint name="my-event-duties" head={["Event", "Date", "Duty", "Time"]} rows={items.map((d) => [d.event, d.date, d.duty, d.time])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my event duties" aria-label="Search my event duties" className="w-full bg-transparent outline-none" /></label></div>
          <SimpleTable head={[{ h: "Event" }, { h: "Duty" }, { h: "Time" }, { h: "" }]} empty="No event duties yet." rows={items.map((d) => [
            <div key="e"><p className="font-semibold text-slate-900">{d.event}</p><p className="text-[11px] text-slate-500">{day(d.date)}{d.venue ? ` · ${d.venue}` : ""}</p></div>, d.duty, d.time || "—",
            d.response === "Declined" ? <span key="a" className="flex items-center gap-2"><Chip tone="bad">Can&apos;t make it</Chip><button type="button" disabled={act.busy} className="text-xs font-semibold text-[#026f9b] hover:underline" onClick={() => void act.run(() => schoolFetch(`/teacher/event-duties/${d.id}/respond`, json("POST", { response: "Accepted" })))}>Undo</button></span>
              : <button key="a" type="button" disabled={act.busy} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400" onClick={() => void act.run(() => schoolFetch(`/teacher/event-duties/${d.id}/respond`, json("POST", { response: "Declined" })))}>Can&apos;t make it</button>,
          ])} />
        </Panel>
      )}
    </div>
  );
}
