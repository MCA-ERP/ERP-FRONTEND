"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { SearchBox, blueBtn, smallBtn } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="break-all font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const todayIso = () => new Date().toLocaleDateString("en-CA");
const when = (d: string, t: string) => `${day(d)} · ${t}`;

// ═════════════ online classes ═════════════
interface Cls { id: string; topic: string; section_id: string; class_label: string; date: string; time: string; duration: number; platform: string; link: string; record: boolean; status: string; live: boolean; ended: boolean; recording: string; views: number; state?: string }
interface Classes { sections: { id: string; label: string }[]; platforms: string[]; upcoming: Cls[]; recordings: Cls[] }

export function ScheduleClass({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Classes>("/teacher/online/classes"), []);
  const act = useAction(reload);
  const blank = { section_id: "", topic: "", date: todayIso(), time: "16:00", duration: "45", platform: "Google Meet", link: "", notify: true, record: true };
  const [f, setF] = useState(blank);
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/teacher/online/classes", json("POST", { section_id: sec?.id, topic: f.topic, date: f.date, time: f.time, duration: Number(f.duration), platform: f.platform, link: f.link || undefined, notify: f.notify, record: f.record })))) { setF({ ...blank, section_id: f.section_id }); go("upcoming"); } };
  return (
    <div data-report>
      <Head title="Schedule" subtitle="Schedule a live class. Parents and students in the section see it in Online Classes with a Join button." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Schedule an online class</h2></div>
          {!data.sections.length ? <Empty text="You have no classes with a subject yet." /> : (
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
                <L label="Topic"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, Revision: Triangles" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></L>
                <L label="Date"><input type="date" className={inputCls} required min={todayIso()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></L>
                <L label="Start time"><input type="time" className={inputCls} required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></L>
                <L label="Duration (minutes)"><input type="number" className={inputCls} required min={5} max={300} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></L>
              </div>
              <L label="Platform"><select className={`${inputCls} w-auto min-w-[12rem]`} value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{data.platforms.map((p) => <option key={p}>{p}</option>)}</select></L>
              <L label="Meeting link" hint={f.platform === "Jitsi Meet" ? "Created automatically if left blank." : `Paste your ${f.platform} link. Only Jitsi Meet links are created for you.`}><input className={inputCls} type="url" maxLength={300} placeholder={f.platform === "Jitsi Meet" ? "Created automatically if left blank" : "https://…"} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></L>
            </div>
          )}
          {data.sections.length > 0 && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              <div className="flex items-center gap-3 px-5 py-3.5"><div className="flex-1"><p className="text-[13px] font-medium text-slate-900">Notify parents</p><p className="text-[11.5px] text-slate-500">App notification when you schedule it</p></div><Toggle checked={f.notify} onChange={(v) => setF({ ...f, notify: v })} label="Notify parents" /></div>
              <div className="flex items-center gap-3 px-5 py-3.5"><div className="flex-1"><p className="text-[13px] font-medium text-slate-900">Record the class</p><p className="text-[11.5px] text-slate-500">Upload the recording afterwards under Recordings</p></div><Toggle checked={f.record} onChange={(v) => setF({ ...f, record: v })} label="Record the class" /></div>
            </div>
          )}
          <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>{act.busy ? "Scheduling…" : "Schedule class"}</button></div>
        </form>
      )}
    </div>
  );
}

export function UpcomingClasses({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Classes>("/teacher/online/classes"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const items = (data?.upcoming ?? []).filter((c) => !q || `${c.class_label} ${c.topic} ${c.platform}`.toLowerCase().includes(q.toLowerCase()));
  const copy = async (c: Cls) => { try { await navigator.clipboard.writeText(c.link); setNote(`Link copied for ${c.class_label}.`); } catch { setNote(c.link); } };
  return (
    <div data-report>
      <Head title="Upcoming" subtitle="Your live and upcoming online classes." action={<button type="button" className={redBtn} onClick={() => go("schedule")}>Schedule a class</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {note && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{note}</p>}
      {data && (
        <Panel title="Upcoming online classes" sub={`${data.upcoming.length} classes`} right={<ExportPrint name="upcoming-online-classes" head={["Section", "Topic", "When", "Duration", "Platform", "Status"]} rows={items.map((c) => [c.class_label, c.topic, `${c.date} ${c.time}`, `${c.duration} min`, c.platform, c.state ?? ""])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search upcoming online classes" /></div>
          <SimpleTable head={[{ h: "Section" }, { h: "Topic" }, { h: "When" }, { h: "Duration" }, { h: "Platform" }, { h: "Status" }, { h: "" }]} empty="No online class is scheduled." rows={items.map((c) => [<b key="s" className="font-semibold text-slate-900">{c.class_label}</b>, c.topic, when(c.date, c.time), `${c.duration} min`, c.platform, <Chip key="st" tone={c.live ? "bad" : "info"}>{c.state}</Chip>,
            <span key="a" className="flex gap-1.5">{c.live ? <button type="button" className={blueBtn} onClick={() => window.open(c.link, "_blank", "noopener,noreferrer")}>Start class</button> : <><button type="button" className={smallBtn} onClick={() => void copy(c)}>Copy link</button><button type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/online/classes/${c.id}/cancel`, json("POST", {})))}>Cancel</button></>}</span>])} />
        </Panel>
      )}
    </div>
  );
}

export function Recordings() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Classes>("/teacher/online/classes"), []);
  const [up, setUp] = useState<Cls | null>(null);
  const act = useAction(() => { reload(); setUp(null); });
  const [q, setQ] = useState("");
  const [play, setPlay] = useState<Cls | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const items = (data?.recordings ?? []).filter((c) => !q || `${c.class_label} ${c.topic}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Recordings" subtitle="Finished classes. Upload a recording so absent students can catch up; parents see it under Watch recording." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Recordings" sub={`${data.recordings.length} classes`} right={<ExportPrint name="class-recordings" head={["Section", "Topic", "Held on", "Recording", "Views"]} rows={items.map((c) => [c.class_label, c.topic, c.date, c.recording, c.views])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search recordings" /></div>
          <SimpleTable head={[{ h: "Section" }, { h: "Topic" }, { h: "Held on" }, { h: "Recording" }, { h: "Views" }, { h: "" }]} empty="No class has finished yet." rows={items.map((c) => [<b key="s" className="font-semibold text-slate-900">{c.class_label}</b>, c.topic, day(c.date), c.recording || <span key="r" className="text-slate-500">Not uploaded</span>, c.recording ? c.views : "—", c.recording ? <button key="p" type="button" className={smallBtn} onClick={() => setPlay(c)}>Play</button> : <button key="u" type="button" className={blueBtn} onClick={() => { setFile(null); setUp(c); }}>Upload recording</button>])} />
        </Panel>
      )}
      {up && (
        <Modal open title={`Upload recording · ${up.class_label}`} onClose={() => setUp(null)}>
          <ErrorBanner message={act.error} />
          <L label="Recording" hint="MP4, up to 500 MB"><input type="file" accept=".mp4,.webm,.mkv" className={FILE} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></L>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setUp(null)}>Cancel</button><button type="button" disabled={!file || act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/online/classes/${up.id}/recording`, json("POST", { file_name: file!.name })))}>Upload</button></div>
        </Modal>
      )}
      {play && <Modal open title={play.topic} onClose={() => setPlay(null)}><KV rows={[["Class", play.class_label], ["Held on", day(play.date)], ["Recording", play.recording], ["Views", play.views]]} /></Modal>}
    </div>
  );
}

// ═════════════ online tests ═════════════
interface Q { question: string; a: string; b: string; c: string; d: string; correct: "A" | "B" | "C" | "D" }
const blankQ = (): Q => ({ question: "", a: "", b: "", c: "", d: "", correct: "A" });
interface Test { id: string; code: string; name: string; section_id: string; class_label: string; date: string | null; questions: number; minutes: number; submitted: number; total: number; average: number | null; state: string }
interface Tests { sections: { id: string; label: string }[]; items: Test[] }

export function CreateTest({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Tests>("/teacher/online/tests"), []);
  const act = useAction(reload);
  const blank = { section_id: "", name: "", opens_on: todayIso(), minutes: "20" };
  const [f, setF] = useState(blank);
  const [qs, setQs] = useState<Q[]>([blankQ()]);
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const setQ = (i: number, patch: Partial<Q>) => setQs(qs.map((q, n) => (n === i ? { ...q, ...patch } : q)));
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/teacher/online/tests", json("POST", { section_id: sec?.id, name: f.name, opens_on: f.opens_on, minutes: Number(f.minutes), questions: qs })))) { setF({ ...blank, section_id: f.section_id }); setQs([blankQ()]); go("tests-results"); } };
  return (
    <div data-report>
      <Head title="Create Test" subtitle="Set a multiple-choice test. It opens for the section on the date you choose and is marked automatically." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Create an online test</h2></div>
          {!data.sections.length ? <Empty text="You have no classes with a subject yet." /> : (
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
                <L label="Test name"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, Weekly quiz: Fractions" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
                <L label="Opens on"><input type="date" className={inputCls} required min={todayIso()} value={f.opens_on} onChange={(e) => setF({ ...f, opens_on: e.target.value })} /></L>
                <L label="Duration (minutes)"><input type="number" className={inputCls} required min={5} max={300} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></L>
              </div>
              {qs.map((q, i) => (
                <fieldset key={i} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-2 text-[13px] font-semibold text-slate-900">Question {i + 1}</legend>
                  <div className="space-y-3">
                    <L label="Question"><input className={inputCls} required minLength={3} maxLength={1000} placeholder="Type the question" value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} /></L>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {(["a", "b", "c", "d"] as const).map((k) => <L key={k} label={`Option ${k.toUpperCase()}`}><input className={inputCls} required={k === "a" || k === "b"} maxLength={300} value={q[k]} onChange={(e) => setQ(i, { [k]: e.target.value } as Partial<Q>)} /></L>)}
                      <L label="Correct answer"><select className={inputCls} value={q.correct} onChange={(e) => setQ(i, { correct: e.target.value as Q["correct"] })}>{["A", "B", "C", "D"].map((x) => <option key={x}>{x}</option>)}</select></L>
                    </div>
                    {qs.length > 1 && <button type="button" className="text-[12px] font-semibold text-[#ac2c28] hover:underline" onClick={() => setQs(qs.filter((_, n) => n !== i))}>Remove question {i + 1}</button>}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={qs.length >= 100} onClick={() => setQs([...qs, blankQ()])}>+ Add question</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>{act.busy ? "Publishing…" : "Publish test"}</button></div>
        </form>
      )}
    </div>
  );
}

interface Results { code: string; name: string; questions: number; submitted: number; total: number; average: number | null; highest: number | null; students: { student_id: string; roll_no: string; name: string; score: number | null }[] }
const tTone = (s: string) => (s === "Live" || s === "Completed" ? "good" : s === "Scheduled" ? "info" : "mute") as "good" | "info" | "mute";

export function TestsResults({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Tests>("/teacher/online/tests"), []);
  const [edit, setEdit] = useState<{ t: Test; name: string; opens_on: string; minutes: string } | null>(null);
  const act = useAction(() => { reload(); setEdit(null); });
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [err, setErr] = useState("");
  const items = (data?.items ?? []).filter((t) => !q || `${t.name} ${t.code} ${t.class_label}`.toLowerCase().includes(q.toLowerCase()));
  const open = async (t: Test) => { setErr(""); try { setRes(await schoolFetch<Results>(`/teacher/online/tests/${t.id}/results`)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not load the results."); } };
  return (
    <div data-report>
      <Head title="Tests & Results" subtitle="Online tests you've set. Students take them in the Parent portal; scores come in as soon as they submit." action={<button type="button" className={redBtn} onClick={() => go("create-test")}>Create a test</button>} />
      <ErrorBanner message={error || err || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My online tests" sub={`${data.items.length} tests`} right={<ExportPrint name="my-online-tests" head={["Test", "Code", "Section", "Date", "Questions", "Duration", "Submitted", "Average", "Status"]} rows={items.map((t) => [t.name, t.code, t.class_label, t.date, t.questions, `${t.minutes} min`, `${t.submitted}/${t.total}`, t.average, t.state])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search my online tests" /></div>
          <SimpleTable head={[{ h: "Test" }, { h: "Section" }, { h: "Date" }, { h: "Questions" }, { h: "Duration" }, { h: "Submitted" }, { h: "Average" }, { h: "Status" }, { h: "" }]} empty="You have not set an online test yet." rows={items.map((t) => [<div key="n"><p className="font-semibold text-slate-900">{t.name}</p><p className="text-[11px] text-slate-500">{t.code}</p></div>, t.class_label, t.date ? day(t.date) : "—", t.questions, `${t.minutes} min`, t.state === "Scheduled" ? "—" : `${t.submitted}/${t.total}`, t.average === null ? "—" : `${t.average}%`, <Chip key="s" tone={tTone(t.state)}>{t.state}</Chip>,
            t.state === "Scheduled" ? <button key="a" type="button" className={smallBtn} onClick={() => setEdit({ t, name: t.name, opens_on: t.date ?? todayIso(), minutes: String(t.minutes) })}>Edit</button> : <button key="a" type="button" className={blueBtn} onClick={() => void open(t)}>Results</button>])} />
        </Panel>
      )}
      {res && (
        <Modal open title={`${res.name} · ${res.code}`} onClose={() => setRes(null)}>
          <KV rows={[["Submitted", `${res.submitted} of ${res.total}`], ["Average", res.average === null ? "—" : `${res.average}%`], ["Highest", res.highest === null ? "—" : `${res.highest}%`]]} />
          <div className="mt-3 max-h-[45vh] overflow-y-auto"><SimpleTable head={[{ h: "Roll" }, { h: "Student" }, { h: "Score", right: true }]} empty="No student has submitted yet." rows={res.students.map((s) => [s.roll_no, s.name, s.score === null ? "—" : `${s.score}%`])} /></div>
        </Modal>
      )}
      {edit && (
        <Modal open title={`Edit ${edit.t.code}`} onClose={() => setEdit(null)}>
          <ErrorBanner message={act.error} />
          <div className="space-y-3"><L label="Test name"><input className={inputCls} maxLength={200} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></L><div className="grid gap-3 sm:grid-cols-2"><L label="Opens on"><input type="date" className={inputCls} min={todayIso()} value={edit.opens_on} onChange={(e) => setEdit({ ...edit, opens_on: e.target.value })} /></L><L label="Duration (minutes)"><input type="number" className={inputCls} min={5} max={300} value={edit.minutes} onChange={(e) => setEdit({ ...edit, minutes: e.target.value })} /></L></div></div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setEdit(null)}>Cancel</button><button type="button" disabled={act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/online/tests/${edit.t.id}`, json("PATCH", { name: edit.name, opens_on: edit.opens_on, minutes: Number(edit.minutes) })))}>Save changes</button></div>
        </Modal>
      )}
    </div>
  );
}
