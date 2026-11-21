"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, useLoad } from "@/components/admin/ui";
import { ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useExams } from "./exam-pages2";
import { useRoster } from "./student-pages2";

const S = "/school";
const EX = "/school/exams";
const primaryCls = "rounded-full bg-[#026f9b] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Bar = ({ children }: { children: ReactNode }) => <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">{children}</div>;
const Pill = ({ label, children }: { label: string; children: ReactNode }) => <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">{label}{children}</label>;
const pillSel = "cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none";
const vTone = (s: string): "good" | "mute" => (s === "Submitted" || s === "Approved" || s === "Published" || s === "Generated" ? "good" : "mute");

// ═════════════ marks verification ═════════════
interface V { exam_id: string; section_id: string; subject_id: string; component: string; exam: string; class_label: string; subject: string; teacher: string; entered: number; average: number | null; submitted: string | null; status: string }
export type VerifyTab = "verification" | "correction" | "approval";
export function MarksVerificationPages({ tab }: { tab: VerifyTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: V[] }>(`${EX}/verification`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<V | null>(null);
  const [msg, setMsg] = useState("");
  const all = (data?.items ?? []).filter((x) => x.status !== "Verified");
  const list = tab === "correction" ? all.filter((x) => x.status === "Returned for correction") : all;
  const rows = list.filter((x) => has(x, search));
  const n = (s: string) => list.filter((x) => x.status === s).length;
  const go = async (x: V, action: "verify" | "return", text: string) => { setMsg(""); if (await act.run(() => schoolFetch(`${EX}/verification`, json("POST", { exam_id: x.exam_id, section_id: x.section_id, subject_id: x.subject_id, component: x.component, action })))) { setMsg(text); setView(null); } };
  const tiles = tab === "correction" ? [{ label: "Marks verification", value: list.length, sub: "All records" }, { label: "Returned for correction", value: n("Returned for correction"), sub: `${pct(n("Returned for correction"), list.length)} of shown` }]
    : [{ label: "Marks verification", value: list.length, sub: "All records" }, { label: "Submitted", value: n("Submitted"), sub: `${pct(n("Submitted"), list.length)} of shown` }, { label: "Returned for correction", value: n("Returned for correction"), sub: `${pct(n("Returned for correction"), list.length)} of shown` }];
  const [a, b] = tab === "approval" ? ["Reject", "Approve"] : ["Return", "Verify"];
  return (
    <div className="space-y-5" data-report><ErrorBanner message={error || act.error} />{okBox(msg)}
      <Tiles items={tiles} />
      <ListPanel title="Marks verification" noun="subjects" search={search} onSearch={setSearch} exportName={tab} head={["Exam", "Class", "Subject", "Teacher", "Entered", "Average", "Submitted", "Status"]} exportRows={rows.map((x) => [x.exam, x.class_label, x.subject, x.teacher, x.entered, x.average != null ? `${x.average}%` : "", x.submitted ? day(x.submitted.slice(0, 10)) : "", x.status])}
        tableHead={["Exam", "Class", "Subject", "Teacher", "Entered", "Average", "Submitted", "Status", ""]} empty={loading ? "Loading…" : "Nothing is waiting for verification."}
        rows={rows.map((x) => [x.exam, x.class_label, x.component === "Theory" ? x.subject : `${x.subject} · ${x.component}`, x.teacher || "—", x.entered, x.average != null ? `${x.average}%` : "—", x.submitted ? day(x.submitted.slice(0, 10)) : "—", <Chip key="s" tone={vTone(x.status)}>{x.status}</Chip>,
          <span key="a" className="flex gap-1.5">{tab !== "correction" && <><button type="button" className={quietCls} disabled={act.busy || x.status !== "Submitted"} onClick={() => void go(x, "return", `${x.subject} (${x.class_label}) sent back to the teacher.`)}>{a}</button><button type="button" className={primaryCls} disabled={act.busy || x.status !== "Submitted"} onClick={() => void go(x, "verify", `${x.subject} (${x.class_label}) ${tab === "approval" ? "approved" : "verified"} and locked.`)}>{b}</button></>}<button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.subject} · ${view.class_label}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Exam" v={view.exam} /><Row k="Component" v={view.component} /><Row k="Teacher" v={view.teacher || "—"} /><Row k="Entered" v={view.entered} /><Row k="Average" v={view.average != null ? `${view.average}%` : "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ results ═════════════
interface Student { id: string; name: string; roll_no: string; class_label: string; subjects: { subject_id: string; subject: string; marks: number | null; absent: boolean; pct: number | null }[]; total: number; out: number; pct: number | null; grade: string; pass: boolean; rank: number }
interface Res { exam: string; max: number; label: string; verified: boolean; subjects: { id: string; name: string }[]; students: Student[] }
interface An { exam: string; class_name: string; students: number; pass_rate: number; below: number; pass_mark: number; average: number; toppers: number; by_subject: { name: string; avg: number }[]; distribution: { grade: string; n: number }[] }
function useExamSection() {
  const exams = useExams();
  const secs = useLoad(() => schoolFetch<{ items: { id: string; label: string }[] }>(`${S}/section-rows`), []);
  const [e, setE] = useState(""); const [s, setS] = useState("");
  const examId = e || exams.data?.items.find((x) => x.status !== "Draft")?.id || exams.data?.items[0]?.id || "";
  const sectionId = s || secs.data?.items[0]?.id || "";
  const bar = (extra?: ReactNode) => <Bar><Pill label="Exam"><select aria-label="Exam" value={examId} onChange={(x) => setE(x.target.value)} className={pillSel}>{!exams.data?.items.length && <option value="">No exams</option>}{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill><Pill label="Class"><select aria-label="Section" value={sectionId} onChange={(x) => setS(x.target.value)} className={pillSel}>{secs.data?.items.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Pill>{extra}</Bar>;
  return { examId, sectionId, bar, error: exams.error || secs.error };
}

export type ResultsTab = "grade-calculation" | "rank-calculation" | "result-analysis" | "class-results" | "subject-analysis";
export function ResultsPages({ tab }: { tab: ResultsTab }) {
  const p = useExamSection();
  const needRes = tab === "grade-calculation" || tab === "rank-calculation" || tab === "class-results";
  const res = useLoad(() => (needRes && p.examId && p.sectionId ? schoolFetch<Res>(`${EX}/results?exam_id=${p.examId}&section_id=${p.sectionId}`) : Promise.resolve(null)), [needRes, p.examId, p.sectionId]);
  const an = useLoad(() => (!needRes && p.examId && p.sectionId ? schoolFetch<An>(`${EX}/analysis?exam_id=${p.examId}&section_id=${p.sectionId}`) : Promise.resolve(null)), [needRes, p.examId, p.sectionId]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Student | null>(null);
  const err = <ErrorBanner message={p.error || res.error || an.error} />;
  if (!needRes) {
    const a = an.data;
    return (
      <div className="space-y-5">{err}{p.bar()}
        <Tiles items={[{ label: "Pass rate", value: a ? `${a.pass_rate}%` : "—", sub: a ? `${a.below} students below ${a.pass_mark}% in a subject` : undefined }, { label: "Class average", value: a ? `${a.average}%` : "—", sub: "Verified marks only" }, { label: "Toppers", value: `${a?.toppers ?? 0} students`, sub: "Above 95%" }]} />
        <Panel title="Average by subject" sub="%">{a?.by_subject.length ? <BarRows rows={a.by_subject.map((x): [string, number] => [x.name, x.avg])} format={(n) => `${n}%`} /> : <p className="p-6 text-center text-sm text-slate-400">{an.loading ? "Loading…" : "Verify marks to see results."}</p>}</Panel>
        <Panel title="Grade distribution" sub="Students">{a?.distribution.length ? <BarRows rows={a.distribution.map((x): [string, number] => [x.grade, x.n])} /> : <p className="p-6 text-center text-sm text-slate-400">No data yet.</p>}</Panel>
      </div>
    );
  }
  const r = res.data;
  const list = tab === "rank-calculation" ? [...(r?.students ?? [])].filter((s) => s.pct !== null).sort((a, b) => a.rank - b.rank) : r?.students ?? [];
  const rows = list.filter((s) => has(s, search));
  return (
    <div data-report>{err}{p.bar()}
      <ListPanel title={tab === "rank-calculation" ? "Ranks" : `${r?.label ?? "Class"} grades`} noun="students" search={search} onSearch={setSearch} exportName={tab} head={tab === "rank-calculation" ? ["Rank", "Student", "Roll", "Overall"] : ["Roll", "Student", "Total", "%", "Grade"]} exportRows={rows.map((s) => (tab === "rank-calculation" ? [s.rank, s.name, s.roll_no, s.pct != null ? `${s.pct}%` : ""] : [s.roll_no, s.name, `${s.total} / ${s.out}`, s.pct != null ? `${s.pct}%` : "", s.grade]))}
        tableHead={tab === "rank-calculation" ? ["Rank", "Student", "Roll", "Overall", ""] : ["Roll", "Student", "Total", "%", "Grade", ""]} empty={res.loading ? "Loading…" : "Nothing to show. Verify the marks for this class in Marks Verification first."}
        rows={rows.map((s) => (tab === "rank-calculation" ? [s.rank, <b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.roll_no || "—", s.pct != null ? `${Math.round(s.pct)}%` : "—", <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>] : [s.roll_no || "—", <b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.pct != null ? `${s.total} / ${s.out}` : "—", s.pct != null ? `${Math.round(s.pct)}%` : "—", s.grade ? <Chip key="g" tone="mute">{s.grade}</Chip> : "—", <button key="v" type="button" className={small} onClick={() => setView(s)}>View details</button>]))} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.subjects.map((x) => <Row key={x.subject_id} k={x.subject} v={x.absent ? "Absent" : x.marks != null ? `${x.marks} / ${r?.max} (${x.pct}%)` : "—"} />)}<Row k="Total" v={`${view.total} / ${view.out}`} /><Row k="Grade" v={view.grade || "—"} />{view.rank > 0 && <Row k="Rank" v={view.rank} />}<Row k="Result" v={view.pass ? "Pass" : "Needs attention"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ report card ═════════════
interface Card { school: string; exam: string; year: string; name: string; class_label: string; roll_no: string; attendance: number | null; max: number; subjects: { name: string; marks: number | null; pct: number | null; grade: string }[]; total: number; out: number; pct: number | null; grade: string; rank: number; coscholastic: { area: string; grade: string }[]; remark: string; verified: boolean }
function CardView({ d }: { d: Card }) {
  const th = "px-2 py-1.5 text-left text-[11px] font-medium uppercase text-slate-500";
  return (
    <div className="mx-auto max-w-[480px] rounded-xl border border-slate-300 p-6 text-[13px]">
      <p className="text-center text-[16px] font-bold text-slate-900">{d.school}</p>
      <p className="border-b-2 border-[#0294ce] pb-2 text-center text-[11px] text-slate-500">Report card · {d.exam} · {d.year}</p>
      <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1.5"><dt className="text-slate-500">Student</dt><dd>{d.name}</dd><dt className="text-slate-500">Class</dt><dd>{d.class_label}{d.roll_no ? ` · roll ${d.roll_no}` : ""}</dd><dt className="text-slate-500">Attendance</dt><dd>{d.attendance != null ? `${d.attendance}%` : "—"}</dd></dl>
      <table className="mt-4 w-full"><thead><tr className="bg-[#f3f9fd]"><th className={th}>Subject</th><th className={th}>Marks ({d.max})</th><th className={th}>Grade</th></tr></thead><tbody>{d.subjects.map((s) => <tr key={s.name} className="border-t border-slate-100"><td className="px-2 py-1.5">{s.name}</td><td className="px-2 py-1.5">{s.marks ?? "Ab"}</td><td className="px-2 py-1.5">{s.grade || "—"}</td></tr>)}{!d.subjects.length && <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">Marks aren&apos;t verified yet.</td></tr>}</tbody></table>
      {d.coscholastic.length > 0 && <table className="mt-3 w-full"><thead><tr className="bg-[#f3f9fd]"><th className={th}>Co-scholastic</th><th className={th}>Grade</th></tr></thead><tbody>{d.coscholastic.map((c) => <tr key={c.area} className="border-t border-slate-100"><td className="px-2 py-1.5">{c.area}</td><td className="px-2 py-1.5">{c.grade}</td></tr>)}</tbody></table>}
      {d.verified && <p className="mt-3"><b>Total:</b> {d.total} / {d.out} · {d.pct}% · {d.grade}{d.rank ? ` · rank ${d.rank}` : ""}</p>}
      {d.remark && <p className="mt-2"><b>Class teacher&apos;s remark:</b> {d.remark}</p>}
      <div className="mt-8 flex justify-between text-[11px] text-slate-500"><span className="border-t border-slate-400 pt-1">Class teacher</span><span className="border-t border-slate-400 px-5 pt-1">Principal</span><span className="border-t border-slate-400 px-5 pt-1">Parent</span></div>
    </div>
  );
}
function printCard(d: Card) {
  const e = escapeHtml;
  printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Report card</title><style>@page{size:A4;margin:18mm}body{font:13px Arial,sans-serif;color:#111}h1{text-align:center;margin:0}.s{text-align:center;color:#555;border-bottom:2px solid #0294ce;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #ddd}th{background:#eef5fa;font-size:11px;text-transform:uppercase}.f{display:flex;justify-content:space-between;margin-top:50px;color:#555}.f span{border-top:1px solid #888;padding-top:3px;min-width:110px;text-align:center}</style></head><body><h1>${e(d.school)}</h1><p class="s">Report card · ${e(d.exam)} · ${e(d.year)}</p><p>Student: <b>${e(d.name)}</b><br>Class: ${e(d.class_label)}${d.roll_no ? ` · roll ${e(d.roll_no)}` : ""}<br>Attendance: ${d.attendance != null ? d.attendance + "%" : "—"}</p><table><tr><th>Subject</th><th>Marks (${d.max})</th><th>Grade</th></tr>${d.subjects.map((s) => `<tr><td>${e(s.name)}</td><td>${s.marks ?? "Ab"}</td><td>${e(s.grade)}</td></tr>`).join("")}</table>${d.coscholastic.length ? `<table><tr><th>Co-scholastic</th><th>Grade</th></tr>${d.coscholastic.map((c) => `<tr><td>${e(c.area)}</td><td>${e(c.grade)}</td></tr>`).join("")}</table>` : ""}${d.verified ? `<p><b>Total:</b> ${d.total} / ${d.out} · ${d.pct}% · ${e(d.grade)}</p>` : ""}<p><b>Class teacher's remark:</b> ${e(d.remark)}</p><div class="f"><span>Class teacher</span><span>Principal</span><span>Parent</span></div></body></html>`);
}

export function StudentCard({ heading }: { heading?: string }) {
  const exams = useExams();
  const roster = useRoster();
  const [e, setE] = useState(""); const [s, setS] = useState("");
  const examId = e || exams.data?.items.find((x) => x.status !== "Draft")?.id || exams.data?.items[0]?.id || "";
  const sid = s || roster.data?.items[0]?.id || "";
  const card = useLoad(() => (examId && sid ? schoolFetch<Card>(`${EX}/report-card?exam_id=${examId}&student_id=${sid}`) : Promise.resolve(null)), [examId, sid]);
  const d = card.data;
  return (
    <div><ErrorBanner message={exams.error || roster.error || card.error} />
      <Bar><Pill label="Exam"><select aria-label="Exam" value={examId} onChange={(x) => setE(x.target.value)} className={pillSel}>{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill><Pill label="Student"><select aria-label="Student" value={sid} onChange={(x) => setS(x.target.value)} className={pillSel}>{roster.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.class_label}</option>)}</select></Pill><Chip tone="good">Active</Chip><Link href="/school/students" className={`${small} ml-auto`}>Open full profile</Link></Bar>
      <Panel title={heading ?? "Report card"} sub={d?.name} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!d} onClick={() => d && printCard(d)}>Print</button>}>
        <div className="p-5">{d ? <CardView d={d} /> : <p className="p-8 text-center text-sm text-slate-400">{card.loading ? "Loading…" : "Choose an exam and a student."}</p>}</div>
      </Panel>
    </div>
  );
}

export type CardTab = "templates" | "generate" | "preview" | "print" | "publish" | "holistic-progress-card";
interface Tpl { id: string; name: string; about: string; status: "Active" | "Draft" }
interface Run { section_id: string; label: string; marks: "Approved" | "Pending"; run: "Not started" | "Generated" | "Published" }
export function ReportCardPages({ tab }: { tab: CardTab }) {
  const exams = useExams();
  const [e, setE] = useState("");
  const examId = e || exams.data?.items.find((x) => x.status !== "Draft")?.id || exams.data?.items[0]?.id || "";
  const tpl = useLoad(() => (tab === "templates" ? schoolFetch<{ items: Tpl[] }>(`${EX}/report-templates`) : Promise.resolve(null)), [tab]);
  const runs = useLoad(() => ((tab === "generate" || tab === "publish") && examId ? schoolFetch<{ items: Run[] }>(`${EX}/report-cards?exam_id=${examId}`) : Promise.resolve(null)), [tab, examId]);
  const hol = useLoad(() => (tab === "holistic-progress-card" ? schoolFetch<{ total: number; complete: number; stages: { name: string; total: number; complete: number; pct: number }[] }>(`${EX}/holistic`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { tpl.reload(); runs.reload(); });
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [prev, setPrev] = useState<Tpl | null>(null);
  const err = <ErrorBanner message={exams.error || tpl.error || runs.error || hol.error || act.error} />;
  if (tab === "preview" || tab === "print") return <StudentCard />;
  if (tab === "templates") {
    return (
      <div>{err}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(tpl.data?.items ?? []).map((t) => <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#dceff9] text-[12px] font-bold text-[#026f9b]">RC</span><div><p className="text-[14px] font-semibold text-slate-900">{t.name}</p><p className="text-[12px] text-slate-500">{t.about}</p></div></div><div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3"><Chip tone={t.status === "Active" ? "good" : "mute"}>{t.status}</Chip><button type="button" className={small} onClick={() => setPrev(t)}>Preview</button><button type="button" className={`${small} ml-auto`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${EX}/report-templates/${t.id}`, json("PATCH", { status: t.status === "Active" ? "Draft" : "Active" })))}>{t.status === "Active" ? "Make draft" : "Activate"}</button></div></div>)}{tpl.loading && <p className="text-sm text-slate-400">Loading…</p>}</div>
        <Modal open={!!prev} title={prev?.name ?? ""} onClose={() => setPrev(null)}>{prev && <><p className="text-[13px] text-slate-600">{prev.about}. Open Preview to see a student&apos;s report card in this format.</p><Foot close={() => setPrev(null)} /></>}</Modal>
      </div>
    );
  }
  if (tab === "holistic-progress-card") {
    const h = hol.data;
    return (
      <div className="space-y-5">{err}
        <Tiles items={[{ label: "Cards complete", value: (h?.complete ?? 0).toLocaleString("en-IN"), sub: `of ${(h?.total ?? 0).toLocaleString("en-IN")} students` }, { label: "Parent observations", value: "—", sub: "Not recorded yet" }, { label: "Student reflections", value: "—", sub: "Not recorded yet" }]} />
        <Panel title="By stage" sub="Term 1 · co-scholastic grades complete">{h?.stages.length ? <BarRows rows={h.stages.map((x): [string, number] => [x.name, x.pct])} format={(n) => `${n}%`} /> : <p className="p-6 text-center text-sm text-slate-400">{hol.loading ? "Loading…" : "No students yet."}</p>}</Panel>
      </div>
    );
  }
  const rows = (runs.data?.items ?? []).filter((x) => has(x, search) && (tab !== "publish" || x.run !== "Not started"));
  const call = async (path: string, x: Run, text: string) => { setMsg(""); if (await act.run(() => schoolFetch(`${EX}/report-cards/${path}`, json("POST", { exam_id: examId, section_id: x.section_id })))) setMsg(text); };
  const pick = <Bar><Pill label="Exam"><select aria-label="Exam" value={examId} onChange={(x) => setE(x.target.value)} className={pillSel}>{exams.data?.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Pill></Bar>;
  return (
    <div data-report>{err}{okBox(msg)}{pick}
      <ListPanel title={tab === "generate" ? "Classes" : "Ready to publish"} noun="sections" search={search} onSearch={setSearch} exportName={tab} head={tab === "generate" ? ["Section", "Marks", "Report cards"] : ["Section", "Report cards", "Status"]} exportRows={rows.map((x) => (tab === "generate" ? [x.label, x.marks, x.run] : [x.label, "Generated", x.run === "Published" ? "Published" : "Draft"]))}
        tableHead={tab === "generate" ? ["Section", "Marks", "Report cards", ""] : ["Section", "Report cards", "Status", ""]} empty={runs.loading ? "Loading…" : tab === "publish" ? "Generate report cards first." : "No sections."}
        rows={rows.map((x) => (tab === "generate"
          ? [<b key="n" className="font-semibold text-slate-900">{x.label}</b>, <Chip key="m" tone={x.marks === "Approved" ? "good" : "warn"}>{x.marks}</Chip>, <Chip key="r" tone={x.run === "Not started" ? "mute" : "info"}>{x.run}</Chip>, <button key="g" type="button" className={primaryCls} disabled={act.busy || x.marks !== "Approved" || x.run === "Published"} onClick={() => void call("generate", x, `Report cards generated for ${x.label}.`)}>Generate</button>]
          : [<b key="n" className="font-semibold text-slate-900">{x.label}</b>, "Generated", <Chip key="s" tone={x.run === "Published" ? "good" : "mute"}>{x.run === "Published" ? "Published" : "Draft"}</Chip>, x.run === "Generated" ? <button key="p" type="button" className={primaryCls} disabled={act.busy} onClick={() => void call("publish", x, `Published for ${x.label}. Parents get a notification.`)}>Publish</button> : ""]))} />
    </div>
  );
}
