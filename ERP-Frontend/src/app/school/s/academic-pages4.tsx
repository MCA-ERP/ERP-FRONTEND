"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, useLoad } from "@/components/admin/ui";
import { ListPanel, has, pct } from "./fo-pages";
import { Row, small } from "./dash-pages";

const S = "/school";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;

// ═════════════ rules (grading, passing marks, promotion) ═════════════
interface Rules { grading_scale: string; primary_grading: string; pass_mark: number; pass_mark_theory: number; grace_marks: number; retest_subjects: number; auto_promote: boolean; min_attendance: number; fail_one_action: string; no_detention_upto: string; detention_approver: string }
export type RulesTab = "grading-system" | "passing-marks" | "promotion-rules";
const SCALES = ["CBSE 8-point (A1 – E)", "5-point (A – E)", "Percentage only"];
const BANDS: Record<string, [string, string, string, string, string][]> = {
  "CBSE 8-point (A1 – E)": [["91 – 100", "A1", "10", "Outstanding", ""], ["81 – 90", "A2", "9", "Excellent", ""], ["71 – 80", "B1", "8", "Very good", ""], ["61 – 70", "B2", "7", "Good", ""], ["51 – 60", "C1", "6", "Above average", ""], ["41 – 50", "C2", "5", "Average", ""], ["33 – 40", "D", "4", "Pass", ""], ["Below 33", "E", "—", "Needs improvement", "b"]],
  "5-point (A – E)": [["81 – 100", "A", "5", "Excellent", ""], ["61 – 80", "B", "4", "Good", ""], ["41 – 60", "C", "3", "Average", ""], ["33 – 40", "D", "2", "Pass", ""], ["Below 33", "E", "—", "Needs improvement", "b"]],
  "Percentage only": [],
};
const row = "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5";
const Rl = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className={row}><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;

export function RulesPages({ tab, bare }: { tab: RulesTab; bare?: boolean }) {
  const { data, error, reload } = useLoad(() => schoolFetch<Rules>(`${S}/academic-rules`), []);
  const act = useAction(reload);
  const [d, setD] = useState<Partial<Rules>>({});
  const [saved, setSaved] = useState("");
  const r = data ? { ...data, ...d } : null;
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => { setD((o) => ({ ...o, [k]: v })); setSaved(""); };
  const save = async (label: string) => { setSaved(""); if (await act.run(() => schoolFetch(`${S}/academic-rules`, json("PUT", d)))) { setD({}); setSaved(label); } };
  const num = (k: "pass_mark" | "pass_mark_theory" | "grace_marks" | "min_attendance", pctSign: boolean) => (
    <span className="inline-flex items-center gap-1"><input type="number" aria-label={k} min={0} max={pctSign ? 100 : 20} className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-[13px]" value={r?.[k] ?? ""} onChange={(e) => set(k, Number(e.target.value))} />{pctSign && <span className="text-[13px] text-slate-600">%</span>}</span>
  );
  const foot = (label: string) => <div className="flex justify-end gap-2.5 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setD({}); setSaved(""); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save("Saved")}>{act.busy ? "Saving…" : label}</button></div>;
  void bare;
  return (
    <div>
      <ErrorBanner message={error || act.error} />{okBox(saved)}
      {tab === "grading-system" && r && <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Grading system</h2></div>
        {BANDS[r.grading_scale].length ? <table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Marks (%)</th><th className="px-3 py-2.5 font-medium">Grade</th><th className="px-3 py-2.5 font-medium">Grade point</th><th className="px-3 py-2.5 font-medium">Remark</th></tr></thead>
          <tbody>{BANDS[r.grading_scale].map(([m, g, p, rem, b]) => <tr key={g} className="border-t border-slate-100"><td className={`px-5 py-3 ${b ? "font-semibold" : "font-semibold"}`}>{m}</td><td className="px-3 py-3"><Chip tone="info">{g}</Chip></td><td className="px-3 py-3">{p}</td><td className="px-3 py-3">{rem}</td></tr>)}</tbody></table>
          : <p className="px-5 py-6 text-[13px] text-slate-500">Marks are shown as percentages. There are no grade bands.</p>}
        <div className={`${row} border-t`}><div><p className="text-[13px] text-slate-900">Scale</p><p className="text-[11px] text-[#026f9b]">{r.grading_scale.startsWith("CBSE") ? "CBSE 8-point scale for Classes 6 – 12" : r.grading_scale === "Percentage only" ? "Percentage marks for Classes 6 – 12" : "5-point scale for Classes 6 – 12"}</p></div>
          <select className={sel} aria-label="Scale" value={r.grading_scale} onChange={(e) => set("grading_scale", e.target.value)}>{SCALES.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className={row}><span className="text-[13px] text-slate-900">Classes 1 – 5</span><select className={sel} aria-label="Classes 1 – 5" value={r.primary_grading} onChange={(e) => set("primary_grading", e.target.value)}>{["Descriptive indicators + grades", "Descriptive indicators only", "Same as above"].map((x) => <option key={x}>{x}</option>)}</select></div>
        {foot("Save grading")}
      </div>}
      {tab === "passing-marks" && r && <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Passing marks</h2></div>
        <Rl title="Pass mark per subject" hint="Theory and practical combined">{num("pass_mark", true)}</Rl>
        <Rl title="Pass mark in theory alone" hint="Classes 9 – 12">{num("pass_mark_theory", true)}</Rl>
        <Rl title="Grace marks allowed" hint="Per subject, principal's approval">{num("grace_marks", false)}</Rl>
        <Rl title="Students failing in" hint="Get a re-test before results"><select className={sel} aria-label="Students failing in" value={r.retest_subjects} onChange={(e) => set("retest_subjects", Number(e.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} subject{n > 1 ? "s" : ""}</option>)}</select></Rl>
        {foot("Save")}
      </div>}
      {tab === "promotion-rules" && r && <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Promotion rules</h2></div>
        <Rl title="Promote automatically" hint="When the student passes all subjects"><Toggle checked={r.auto_promote} onChange={(v) => set("auto_promote", v)} label="Promote automatically" /></Rl>
        <Rl title="Minimum attendance to be promoted">{num("min_attendance", true)}</Rl>
        <Rl title={`Students failing ${r.retest_subjects} subject${r.retest_subjects > 1 ? "s" : ""}`}><select className={sel} aria-label="Students failing" value={r.fail_one_action} onChange={(e) => set("fail_one_action", e.target.value)}>{["Re-test, then promote", "Detain", "Promote with support"].map((x) => <option key={x}>{x}</option>)}</select></Rl>
        <Rl title="Classes 1 – 8" hint="No-detention policy"><select className={sel} aria-label="No-detention policy" value={r.no_detention_upto} onChange={(e) => set("no_detention_upto", e.target.value)}>{["Always promote", "Follow the rules"].map((x) => <option key={x}>{x}</option>)}</select></Rl>
        <Rl title="Who approves detentions"><select className={sel} aria-label="Who approves detentions" value={r.detention_approver} onChange={(e) => set("detention_approver", e.target.value)}>{["Principal", "Vice Principal", "Class teacher"].map((x) => <option key={x}>{x}</option>)}</select></Rl>
        {foot("Save")}
      </div>}
    </div>
  );
}

// ═════════════ bulk promotion & retention ═════════════
interface PItem { id: string; name: string; roll_no: string; class_name: string; class_label: string; grade_id: string; section: string; state: string; next_class: string | null }
interface PData { year: { id: string; name: string } | null; years: { id: string; name: string; is_current: boolean }[]; grades: { id: string; name: string }[]; items: PItem[] }
const SM = "/school/students-mgmt";
export type PromoTab = "promotion-rules" | "bulk-promotion" | "retention";

export function ClassPromotionPages({ tab }: { tab: PromoTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<PData>(`${SM}/promotion`), []);
  const att = useLoad(() => schoolFetch<{ items: Record<string, number> }>(`${S}/attendance/summary`), []);
  const act = useAction(reload);
  const [grade, setGrade] = useState("");
  const [off, setOff] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PItem | null>(null);
  if (tab === "promotion-rules") return <RulesPages tab="promotion-rules" />;
  const grades = (data?.grades ?? []).filter((g) => data?.items.some((i) => i.grade_id === g.id));
  const gid = grade || grades[0]?.id || "";
  const cur = grades.find((g) => g.id === gid);
  const all = data?.items ?? [];
  const aPct = (id: string) => (att.data?.items[id] !== undefined ? `${att.data.items[id]}%` : "—");
  if (tab === "retention") {
    const held = all.filter((i) => i.state === "Held for review").filter((i) => has(i, search));
    return (
      <div className="space-y-5" data-report>
        <ErrorBanner message={error} />
        <Tiles items={[{ label: "Promotions", value: held.length, sub: "All records" }, { label: "Held for review", value: held.length, sub: "100% of shown" }]} />
        <ListPanel title="Promotions" noun="students" search={search} onSearch={setSearch} exportName="retention" head={["Student", "Current class", "Attendance", "Next class", "Status"]} exportRows={held.map((i) => [i.name, i.class_label, aPct(i.id), i.next_class ? "Promote to next class" : "No next class", i.state])}
          tableHead={["Student", "Current class", "Result", "Attendance", "Next class", "Status", ""]} empty={loading ? "Loading…" : "Nobody is held back."}
          rows={held.map((i) => [<b key="n" className="font-semibold text-[#026f9b]">{i.name}</b>, i.class_label, "—", aPct(i.id), i.next_class ? "Promote to next class" : "—", <Chip key="s" tone="mute">{i.state}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
        <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Attendance" v={aPct(view.id)} /><Row k="Next class" v={view.next_class ?? "—"} /><Row k="Status" v={view.state} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  const kids = all.filter((i) => i.grade_id === gid).sort((a, b) => (parseInt(a.roll_no) || 9999) - (parseInt(b.roll_no) || 9999) || a.name.localeCompare(b.name));
  const years = (data?.years ?? []).filter((y) => y.id !== data?.year?.id);
  const tgt = target || years[0]?.id || "";
  const ready = kids.filter((k) => k.state === "Ready");
  const next = kids[0]?.next_class;
  const go = async () => {
    setMsg("");
    const keep = ready.filter((k) => off.includes(k.id)).map((k) => k.id);
    const move = ready.filter((k) => !off.includes(k.id)).map((k) => k.id);
    const ok = await act.run(async () => {
      let done = 0; let skipped: string[] = [];
      if (move.length) { const r = await schoolFetch<{ done: number; skipped: string[] }>(`${SM}/promotion`, json("POST", { student_ids: move, target_year_id: tgt })); done += r.done; skipped = r.skipped; }
      if (keep.length) await schoolFetch(`${SM}/promotion`, json("POST", { student_ids: keep, target_year_id: tgt, hold: true }));
      setMsg(`${done} promoted, ${keep.length} held back.${skipped.length ? ` Skipped: ${skipped.slice(0, 3).join("; ")}` : ""}`);
    });
    if (ok) setOff([]);
  };
  return (
    <div>
      <ErrorBanner message={error || act.error} />{okBox(msg)}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Class
          <select aria-label="Class" value={gid} onChange={(e) => { setGrade(e.target.value); setOff([]); setMsg(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!grades.length && <option value="">No classes</option>}{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] text-slate-600">Move to year<select aria-label="Next academic year" className={sel} value={tgt} onChange={(e) => setTarget(e.target.value)}>{!years.length && <option value="">Create the next year first</option>}{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
      </div>
      <Panel title={`${cur?.name ?? "Class"}${next ? ` → ${next}` : ""}`} sub={`${kids.length} students`} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !ready.length || !tgt} onClick={() => void go()}>{act.busy ? "Working…" : "Promote"}</button>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="w-10 px-4 py-2.5" /><th className="px-3 py-2.5 font-medium">Roll</th><th className="px-3 py-2.5 font-medium">Student</th><th className="px-3 py-2.5 font-medium">Result</th><th className="px-3 py-2.5 font-medium">Attendance</th><th className="px-3 py-2.5 font-medium">Promote to</th></tr></thead>
          <tbody>{kids.map((k) => { const stays = off.includes(k.id); const done = k.state !== "Ready"; return <tr key={k.id} className="border-t border-slate-100"><td className="px-4 py-3"><input type="checkbox" aria-label={`Promote ${k.name}`} className="h-4 w-4 accent-[#026f9b]" disabled={done || !next} checked={!done && !stays} onChange={() => setOff(stays ? off.filter((x) => x !== k.id) : [...off, k.id])} /></td><td className="px-3 py-3">{k.roll_no || "—"}</td><td className="px-3 py-3">{k.name}</td>
            <td className="px-3 py-3"><Chip tone="mute">{done ? k.state : stays ? "Detained" : "Pass"}</Chip></td><td className="px-3 py-3">{aPct(k.id)}</td><td className="px-3 py-3">{done ? "—" : stays || !next ? `Stays in ${k.class_name}` : `${next}${k.section ? ` ${k.section}` : ""}`}</td></tr>; })}
            {!kids.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No students in this class."}</td></tr>}</tbody></table></div>
      </Panel>
    </div>
  );
}

// ═════════════ academic reports ═════════════
interface Ch { id: string; class_label: string; subject: string; chapter: string; periods: number; objective: string; month: string; status: string }
export type AcReportTab = "class-reports" | "subject-reports" | "syllabus-completion";

export function AcademicReportPages({ tab }: { tab: AcReportTab }) {
  const classes = useLoad(() => schoolFetch<{ items: { id: string; name: string; stage: string; sections: number; students: number; campus: string; status: string }[] }>(`${S}/classes`), []);
  const cur = useLoad(() => schoolFetch<{ items: Ch[] }>(`${S}/curriculum`), []);
  const lessons = useLoad(() => schoolFetch<{ items: { status: string }[] }>(`${S}/lesson-plans`), []);
  const subjects = useLoad(() => schoolFetch<{ items: { id: string; name: string; status: string }[] }>(`${S}/subject-rows`), []);
  const years = useLoad(() => schoolFetch<{ items: { name: string; status: string }[] }>(`${S}/academic-years`), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ch | null>(null);
  const err = <ErrorBanner message={classes.error || cur.error || lessons.error || subjects.error} />;
  const ch = cur.data?.items ?? [];
  const done = (c: Ch[]) => c.filter((x) => x.status === "Completed").length;
  if (tab === "class-reports") {
    const all = classes.data?.items ?? [];
    const rows = all.filter((c) => has(c, search));
    return (
      <div className="space-y-5" data-report>{err}
        <Panel title="Students by class" sub={years.data?.items.find((y) => y.status === "Active")?.name}><BarRows rows={all.map((c): [string, number] => [c.name, c.students])} /></Panel>
        <ListPanel title="Classes" noun="classes" search={search} onSearch={setSearch} exportName="class-report" head={["Class", "Stage", "Sections", "Students", "Campus", "Status"]} exportRows={rows.map((c) => [c.name, c.stage, c.sections, c.students, c.campus, c.status])}
          tableHead={["Class", "Stage", "Sections", "Students", "Campus", "Status"]} empty={classes.loading ? "Loading…" : "No classes yet."}
          rows={rows.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, c.stage || "—", c.sections, c.students, c.campus || "—", <Chip key="s" tone={c.status === "Active" ? "good" : "mute"}>{c.status}</Chip>])} />
      </div>
    );
  }
  const bySubject = [...new Set(ch.map((c) => c.subject))].map((s) => { const m = ch.filter((c) => c.subject === s); return { s, n: m.length, p: Math.round((done(m) / m.length) * 100) }; });
  if (tab === "subject-reports") {
    const lp = lessons.data?.items ?? [];
    const ap = lp.filter((l) => l.status === "Approved").length;
    const sub = subjects.data?.items ?? [];
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Subjects", value: sub.length, sub: `${sub.filter((s) => s.status === "Active").length} active` }, { label: "Syllabus completed", value: pct(done(ch), ch.length), sub: `${done(ch)} of ${ch.length} chapters` }, { label: "Lesson plans approved", value: pct(ap, lp.length), sub: `${ap} of ${lp.length} plans` }]} />
        <Panel title="Syllabus completed by subject" sub="%">
          {bySubject.length ? <div className="space-y-2 p-4">{bySubject.map((b) => <div key={b.s} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-[13px]"><span className="truncate text-slate-700">{b.s}</span><div className="h-2 overflow-hidden rounded bg-[#e6f4fb]"><div className="h-full rounded bg-[#41afda]" style={{ width: `${b.p}%` }} /></div><span className="text-right tabular-nums text-slate-700">{b.p}%</span></div>)}</div> : <p className="p-6 text-center text-sm text-slate-400">{cur.loading ? "Loading…" : "No chapters yet."}</p>}
        </Panel>
      </div>
    );
  }
  const rows = ch.filter((c) => has(c, search));
  const n = (s: string) => ch.filter((c) => c.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Syllabus", value: ch.length, sub: "All records" }, { label: "Completed", value: n("Completed"), sub: `${pct(n("Completed"), ch.length)} of shown` }, { label: "In progress", value: n("In progress"), sub: `${pct(n("In progress"), ch.length)} of shown` }, { label: "Not started", value: n("Not started"), sub: `${pct(n("Not started"), ch.length)} of shown` }]} />
      <Panel title="Subject" sub="Count by subject" right={<button type="button" className={small} onClick={() => downloadCsv("syllabus-by-subject", ["Subject", "Chapters", "Completed %"], bySubject.map((b) => [b.s, b.n, `${b.p}%`]))}>Download</button>}>
        <BarRows rows={[...bySubject].sort((a, b) => b.n - a.n).map((b): [string, number] => [b.s, b.n])} />
      </Panel>
      <ListPanel title="Syllabus" noun="chapters" search={search} onSearch={setSearch} exportName="syllabus" head={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status"]} exportRows={rows.map((c) => [c.class_label, c.subject, c.chapter, c.periods, c.objective, c.month, c.status])}
        tableHead={["Class", "Subject", "Chapter", "Periods", "Learning objective", "Planned month", "Status", ""]} empty={cur.loading ? "Loading…" : "No chapters yet."}
        rows={rows.map((c) => [c.class_label, c.subject, c.chapter, <span key="p" className="block text-right">{c.periods}</span>, c.objective || "—", c.month || "—", <Chip key="s" tone={c.status === "Completed" ? "good" : c.status === "In progress" ? "info" : "mute"}>{c.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
      <Modal open={!!view} title={view?.chapter ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Subject" v={view.subject} /><Row k="Periods" v={view.periods} /><Row k="Learning objective" v={view.objective || "—"} /><Row k="Planned month" v={view.month || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}
