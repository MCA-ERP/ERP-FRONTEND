"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, useStaff } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useRoster } from "./student-pages2";

const C = "/school/competitive";
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const inr = (n: number) => (n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`);
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const rTone = (s: string): "good" | "warn" | "bad" | "mute" => (s === "On track" ? "good" : s === "Borderline" ? "warn" : s === "Needs support" ? "bad" : "mute");
const Box = ({ title, children }: { title: string; children: ReactNode }) => <><p className="mb-1 text-[12.5px] font-medium text-slate-900">{title}</p>{children}</>;
void Box;

interface Prog { id: string; name: string; exams: string; who: string; students: number; mentor: string; sessions: number; mocks: number; average: number | null }
interface Test { id: string; name: string; programme: string; date: string; questions: number; minutes: number; took: number; members: number; average: number | null; top_score: number | null; top_name: string; status: "Done" | "Upcoming" }
interface Ready { programmes: { id: string; name: string }[]; programme: { id: string; name: string; who: string } | null; students: number; counts: { on: number; border: number; needs: number }; items: { student_id: string; name: string; class_label: string; last3: number[]; est: number | null; readiness: string }[] }
interface Bank { id: string; subject: string; easy: number; medium: number; hard: number; past_papers: string }
interface Reg { id: string; student_id: string; name: string; class_label: string; exam: string; exam_date: string; fee: number; status: "Fee pending" | "Registered" | "Admit card issued" }
export type CompTab = "programmes" | "test-series" | "readiness-analysis" | "question-bank" | "exam-registrations";

export function CompetitivePages({ tab }: { tab: CompTab }) {
  const pr = useLoad(() => schoolFetch<{ students: number; mocks: number; on_track: number; questions: number; items: Prog[] }>(`${C}/programmes`), []);
  const ts = useLoad(() => (tab === "test-series" ? schoolFetch<{ items: Test[] }>(`${C}/tests`) : Promise.resolve(null)), [tab]);
  const [pick, setPick] = useState("");
  const rd = useLoad(() => (tab === "readiness-analysis" ? schoolFetch<Ready>(`${C}/readiness${pick ? `?programme_id=${pick}` : ""}`) : Promise.resolve(null)), [tab, pick]);
  const bk = useLoad(() => (tab === "question-bank" ? schoolFetch<{ items: Bank[] }>(`${C}/bank`) : Promise.resolve(null)), [tab]);
  const rg = useLoad(() => (tab === "exam-registrations" ? schoolFetch<{ items: Reg[]; students: { id: string; name: string; class_label: string }[] }>(`${C}/registrations`) : Promise.resolve(null)), [tab]);
  const staff = useStaff();
  const roster = useRoster();
  const act = useAction(() => { pr.reload(); ts.reload(); rd.reload(); bk.reload(); rg.reload(); });
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<"" | "prog" | "test" | "bank" | "reg" | "score">("");
  const [view, setView] = useState<Record<string, string | number> | null>(null);
  const [viewTitle, setViewTitle] = useState("");
  const [f, setF] = useState({ name: "", exams: "", who: "", mentor_id: "", sessions: "2", programme_id: "", test_date: todayIso(), questions: "50", minutes: "60", subject: "", easy: "0", medium: "0", hard: "0", past_papers: "", student_id: "", exam: "", exam_date: todayIso(), fee: "0", test_id: "", score: "" });
  const err = <ErrorBanner message={pr.error || ts.error || rd.error || bk.error || rg.error || staff.error || roster.error || act.error} />;
  const close = () => setOpen("");
  const show = (title: string, rows: Record<string, string | number>) => { setViewTitle(title); setView(rows); };
  const detail = <Modal open={!!view} title={viewTitle} onClose={() => setView(null)}>{view && <><dl>{Object.entries(view).map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={() => setView(null)} /></>}</Modal>;
  const send = (path: string, body: unknown, method = "POST", text = "") => async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${C}/${path}`, json(method, body)))) { close(); if (text) setMsg(text); } };
  const progs = pr.data?.items ?? [];
  const pid = f.programme_id || progs[0]?.id || "";
  const kids = roster.data?.items ?? [];
  const sel = (v: string, on: (x: string) => void, opts: { id: string; name: string }[], none = "") => <select className={inputCls} value={v} onChange={(e) => on(e.target.value)}>{none && <option value="">{none}</option>}{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>;

  if (tab === "programmes") {
    const rows = progs.filter((x) => has(x, search));
    const d = pr.data;
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Students in programmes", value: d?.students ?? 0, sub: `${progs.length} programmes` }, { label: "Mock tests this term", value: d?.mocks ?? 0 }, { label: "On track", value: `${d?.on_track ?? 0}%`, sub: "Average 70% or above in the last three mocks" }, { label: "Questions in bank", value: (d?.questions ?? 0).toLocaleString("en-IN") }]} />
        <ListPanel title="Programmes" noun="programmes" search={search} onSearch={setSearch} exportName="programmes" head={["Programme", "Exams", "Who", "Students", "Mentor", "Sessions a week", "Mocks done", "Average"]} exportRows={rows.map((x) => [x.name, x.exams, x.who, x.students, x.mentor, x.sessions, x.mocks, x.average != null ? `${x.average}%` : ""])}
          extra={<button type="button" className={small} onClick={() => setOpen("prog")}>+ New programme</button>} tableHead={["Programme", "Exams", "Who", "Students", "Mentor", "Sessions a week", "Mocks done", "Average", ""]} empty={pr.loading ? "Loading…" : "No programmes yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.exams || "—", x.who || "—", <span key="s" className="block text-right">{x.students}</span>, x.mentor || "—", <span key="w" className="block text-right">{x.sessions}</span>, <span key="m" className="block text-right">{x.mocks}</span>, x.average != null ? `${x.average}%` : "—", <button key="v" type="button" className={small} onClick={() => show(x.name, { Exams: x.exams || "—", Who: x.who || "—", Students: x.students, Mentor: x.mentor || "—", "Sessions a week": x.sessions, "Mocks done": x.mocks, Average: x.average != null ? `${x.average}%` : "—" })}>View details</button>])} />
        {detail}
        <Modal open={open === "prog"} title="New programme" onClose={close}><form onSubmit={send("programmes", { name: f.name, exams: f.exams, who: f.who, mentor_id: f.mentor_id || null, sessions: Number(f.sessions), student_ids: [] }, "POST", "Programme added. Add students from the readiness page after the first mock.")} className="space-y-3">
          <Field label="Programme"><input className={inputCls} required minLength={2} maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Exams"><input className={inputCls} maxLength={200} value={f.exams} onChange={(e) => setF({ ...f, exams: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Who"><input className={inputCls} maxLength={100} placeholder="Classes 11 – 12" value={f.who} onChange={(e) => setF({ ...f, who: e.target.value })} /></Field><Field label="Sessions a week"><input type="number" min={0} max={14} className={inputCls} value={f.sessions} onChange={(e) => setF({ ...f, sessions: e.target.value })} /></Field></div>
          <Field label="Mentor">{sel(f.mentor_id, (x) => setF({ ...f, mentor_id: x }), staff.data?.items ?? [], "—")}</Field><FormFoot close={close} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "test-series") {
    const all = ts.data?.items ?? [];
    const rows = all.filter((x) => has(x, search));
    const mark = all.find((t) => t.id === (f.test_id || all.find((x) => x.status === "Done")?.id));
    return (
      <div data-report>{err}{okBox(msg)}
        <ListPanel title="Test series" noun="tests" search={search} onSearch={setSearch} exportName="test-series" head={["Test", "Programme", "Date", "Questions", "Minutes", "Took it", "Average", "Top score", "Status"]} exportRows={rows.map((x) => [x.name, x.programme, day(x.date), x.questions, x.minutes, `${x.took}/${x.members}`, x.average != null ? `${x.average}%` : "", x.top_score != null ? `${x.top_score}% ${x.top_name}` : "", x.status])}
          extra={<><button type="button" className={small} onClick={() => setOpen("test")}>+ New test</button><button type="button" className={small} disabled={!all.some((x) => x.status === "Done")} onClick={() => setOpen("score")}>Enter scores</button></>}
          tableHead={["Test", "Programme", "Date", "Questions", "Minutes", "Took it", "Average", "Top score", "Status", ""]} empty={ts.loading ? "Loading…" : "No tests yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.programme, day(x.date), x.questions, x.minutes, `${x.took} / ${x.members}`, x.average != null ? `${x.average}%` : "—", x.top_score != null ? `${x.top_score}% · ${x.top_name}` : "—", <Chip key="s" tone={x.status === "Done" ? "mute" : "info"}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => show(x.name, { Programme: x.programme, Date: day(x.date), Questions: x.questions, Minutes: x.minutes, "Took it": `${x.took} of ${x.members}`, Average: x.average != null ? `${x.average}%` : "—", Status: x.status })}>View details</button>])} />
        {detail}
        <Modal open={open === "test"} title="New test" onClose={close}><form onSubmit={send("tests", { programme_id: pid, name: f.name, test_date: f.test_date, questions: Number(f.questions), minutes: Number(f.minutes) })} className="space-y-3">
          <Field label="Programme">{sel(pid, (x) => setF({ ...f, programme_id: x }), progs)}</Field><Field label="Test"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3"><Field label="Date"><input type="date" className={inputCls} required value={f.test_date} onChange={(e) => setF({ ...f, test_date: e.target.value })} /></Field><Field label="Questions"><input type="number" min={1} className={inputCls} value={f.questions} onChange={(e) => setF({ ...f, questions: e.target.value })} /></Field><Field label="Minutes"><input type="number" min={5} className={inputCls} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field></div><FormFoot close={close} busy={act.busy} /></form></Modal>
        <Modal open={open === "score"} title="Enter a score" onClose={close}><form onSubmit={send("results", { test_id: mark?.id, results: [{ student_id: f.student_id || kids[0]?.id, score_pct: Number(f.score) }] }, "POST", "Score saved.")} className="space-y-3">
          <Field label="Test">{sel(mark?.id ?? "", (x) => setF({ ...f, test_id: x }), all.filter((x) => x.status === "Done").map((x) => ({ id: x.id, name: x.name })))}</Field><Field label="Student">{sel(f.student_id || kids[0]?.id || "", (x) => setF({ ...f, student_id: x }), kids.map((k) => ({ id: k.id, name: `${k.name} · ${k.class_label}` })))}</Field>
          <Field label="Score (%)"><input type="number" min={0} max={100} step="0.1" required className={inputCls} value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></Field><p className="text-xs text-slate-500">The student must already be in the programme.</p><FormFoot close={close} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "readiness-analysis") {
    const r = rd.data;
    const rows = (r?.items ?? []).filter((x) => has(x, search));
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <div className="flex flex-wrap gap-2">{(r?.programmes ?? []).map((x) => <button key={x.id} type="button" onClick={() => setPick(x.id)} className={`rounded-full px-3.5 py-1.5 text-[13px] ${r?.programme?.id === x.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{x.name}</button>)}</div>
        <Tiles items={[{ label: "Students", value: r?.students ?? 0, sub: r?.programme?.who }, { label: "On track", value: r?.counts.on ?? 0, sub: "Average 70% or above" }, { label: "Borderline", value: r?.counts.border ?? 0, sub: "50% to 70%" }, { label: "Needs support", value: r?.counts.needs ?? 0, sub: "Below 50%" }]} />
        <ListPanel title="Students" noun="students" search={search} onSearch={setSearch} exportName="readiness" head={["Student", "Class", "Last 3 mocks", "Est. percentile", "Readiness"]} exportRows={rows.map((x) => [x.name, x.class_label, x.last3.map((n) => `${n}%`).join(" → "), x.est ?? "", x.readiness])}
          tableHead={["Student", "Class", "Last 3 mocks", "Est. percentile", "Readiness", "Weak chapters", ""]} empty={rd.loading ? "Loading…" : "No students in this programme yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-[#026f9b]">{x.name}</b>, x.class_label, x.last3.length ? x.last3.map((n) => `${Math.round(n)}%`).join(" → ") : "—", x.est ?? "—", <Chip key="r" tone={rTone(x.readiness)}>{x.readiness}</Chip>, <span key="w" className="text-slate-400">Not recorded</span>, <button key="v" type="button" className={small} onClick={() => show(x.name, { Class: x.class_label, "Last 3 mocks": x.last3.map((n) => `${n}%`).join(" → ") || "—", "Estimated percentile": x.est ?? "—", Readiness: x.readiness })}>View details</button>])} />
        <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Percentiles are estimates from the average of the last three mocks. Chapter-wise accuracy isn&apos;t recorded yet.</p>
        {detail}
      </div>
    );
  }
  if (tab === "question-bank") {
    const rows = (bk.data?.items ?? []).filter((x) => has(x, search));
    return (
      <div data-report>{err}{okBox(msg)}
        <ListPanel title="Question bank" noun="subjects" search={search} onSearch={setSearch} exportName="competitive-question-bank" head={["Subject", "Easy", "Medium", "Hard", "Past papers", "Total"]} exportRows={rows.map((x) => [x.subject, x.easy, x.medium, x.hard, x.past_papers, x.easy + x.medium + x.hard])}
          extra={<button type="button" className={small} onClick={() => setOpen("bank")}>Import questions</button>} tableHead={["Subject", "Easy", "Medium", "Hard", "Past papers", "Total"]} empty={bk.loading ? "Loading…" : "No questions yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.subject}</b>, <span key="e" className="block text-right">{x.easy.toLocaleString("en-IN")}</span>, <span key="m" className="block text-right">{x.medium.toLocaleString("en-IN")}</span>, <span key="h" className="block text-right">{x.hard.toLocaleString("en-IN")}</span>, x.past_papers || "—", <b key="t" className="block text-right font-semibold">{(x.easy + x.medium + x.hard).toLocaleString("en-IN")}</b>])} />
        <Modal open={open === "bank"} title="Import questions" onClose={close}><form onSubmit={send("bank", { subject: f.subject, easy: Number(f.easy), medium: Number(f.medium), hard: Number(f.hard), past_papers: f.past_papers }, "PUT", "Question counts saved.")} className="space-y-3">
          <Field label="Subject"><input className={inputCls} required minLength={2} maxLength={100} placeholder="Physics (JEE / NEET)" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">{(["easy", "medium", "hard"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input type="number" min={0} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}</div>
          <Field label="Past papers"><input className={inputCls} maxLength={40} placeholder="2010 – 2026" value={f.past_papers} onChange={(e) => setF({ ...f, past_papers: e.target.value })} /></Field><p className="text-xs text-slate-500">This records how many questions you hold. It doesn&apos;t upload the questions.</p><FormFoot close={close} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  const rows = (rg.data?.items ?? []).filter((x) => has(x, search));
  const set = (x: Reg, status: string) => act.run(() => schoolFetch(`${C}/registrations/${x.id}`, json("PATCH", { status })));
  return (
    <div data-report>{err}{okBox(msg)}
      <ListPanel title="Exam registrations" noun="registrations" search={search} onSearch={setSearch} exportName="exam-registrations" head={["Student", "Class", "Exam", "Exam date", "Fee", "Status"]} exportRows={rows.map((x) => [x.name, x.class_label, x.exam, day(x.exam_date), inr(x.fee), x.status])}
        extra={<button type="button" className={small} onClick={() => setOpen("reg")}>+ New registration</button>} tableHead={["Student", "Class", "Exam", "Exam date", "Fee", "Status", ""]} empty={rg.loading ? "Loading…" : "No registrations yet."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-[#026f9b]">{x.name}</b>, x.class_label, x.exam, day(x.exam_date), inr(x.fee), <Chip key="s" tone={x.status === "Fee pending" ? "warn" : "good"}>{x.status}</Chip>,
          <span key="a" className="flex gap-1.5">{x.status === "Fee pending" && <><button type="button" className={small} disabled={act.busy} onClick={async () => { setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ sent: number }>(`${C}/registrations/${x.id}/remind`, json("POST", {})); t = `Reminder sent to ${r.sent} parent${r.sent === 1 ? "" : "s"}.`; })) setMsg(t); }}>Remind parent</button><button type="button" className={small} disabled={act.busy} onClick={() => void set(x, "Registered")}>Mark paid</button></>}{x.status === "Registered" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(x, "Admit card issued")}>Issue admit card</button>}<button type="button" className={small} onClick={() => show(x.name, { Class: x.class_label, Exam: x.exam, "Exam date": day(x.exam_date), Fee: inr(x.fee), Status: x.status })}>View details</button></span>])} />
      {detail}
      <Modal open={open === "reg"} title="New registration" onClose={close}><form onSubmit={send("registrations", { student_id: f.student_id || kids[0]?.id, exam: f.exam, exam_date: f.exam_date, fee: Number(f.fee) })} className="space-y-3">
        <Field label="Student">{sel(f.student_id || kids[0]?.id || "", (x) => setF({ ...f, student_id: x }), kids.map((k) => ({ id: k.id, name: `${k.name} · ${k.class_label}` })))}</Field><Field label="Exam"><input className={inputCls} required minLength={2} maxLength={100} value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Exam date"><input type="date" className={inputCls} required value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} /></Field><Field label="Fee (₹)"><input type="number" min={0} className={inputCls} value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Field></div><FormFoot close={close} busy={act.busy} /></form></Modal>
    </div>
  );
}
