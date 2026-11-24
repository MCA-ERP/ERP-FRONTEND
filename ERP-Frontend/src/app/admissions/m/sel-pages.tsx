"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useAdmissions } from "../context";
import { PipelineStrip } from "./strip";
import { AMBER, BLUE, ChildCell, DataTable, ParentCell, Tile, blueBtn, dmy, has, phone, pillBtn } from "./ui";

const GREEN = "bg-[#d9efe8]";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const Label = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const Actions = ({ onCancel, busy, label }: { onCancel: () => void; busy: boolean; label: string }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onCancel}>Cancel</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={busy}>{busy ? "Saving…" : label}</button></div>;
const Tiles3 = ({ children }: { children: ReactNode }) => <div className="mb-5 grid gap-3 sm:grid-cols-3">{children}</div>;

// ═════════════ applications ═════════════
interface AppRow { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; form: "Form sent" | "In progress" | "Returned"; reason: string | null; fee_status: "Pending" | "Paid" | "Waived"; fee: number; docs: number; docs_of: number; reminded_on: string | null; dob: string; gender: string; email: string; address: string; prev_school: string }
interface AppsData { items: AppRow[]; tiles: { pending: number; collected: number; families: number; waived: number } }

export function ApplicationsTab() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<AppsData>("/admissions/applications"), []);
  const [search, setSearch] = useState("");
  const [dlg, setDlg] = useState<{ kind: "fee" | "waive" | "fill"; row: AppRow } | null>(null);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  const t = r.data?.tiles;
  const call = (x: AppRow, path: string) => void act.run(() => schoolFetch(`/admissions/applications/${x.id}/${path}`, json("POST", {})));
  return (
    <div>
      <Head title="Applications" subtitle="Application forms sent to families, and forms filled at the front office. The application fee must be paid or waived before the form goes for verification." />
      <PipelineStrip active={3} />
      <ErrorBanner message={r.error || act.error} />
      <Tiles3>
        <Tile label="Fee pending" value={t?.pending ?? 0} sub="Forms waiting on the fee" bg={AMBER} tone="text-[#8a5a0b]" />
        <Tile label="Collected this season" value={inr(t?.collected ?? 0)} sub={`${t?.families ?? 0} families`} bg={GREEN} />
        <Tile label="Waived" value={t?.waived ?? 0} sub="Staff wards, siblings" bg={BLUE} />
      </Tiles3>
      <DataTable title="Applications" noun="applications" search={search} onSearch={setSearch} exportName="applications" exportHead={["Child", "Class", "Application no.", "Parent", "Mobile", "Form", "Fee status", "Fee", "Documents"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.parent_name, x.mobile, x.form, x.fee_status, x.fee, `${x.docs}/${x.docs_of}`])}
        head={["Child", "Parent", "Form", "Application fee", "Docs", ""]} empty={r.loading ? "Loading…" : "No application forms are waiting. Send an application from Leads & Follow-up."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.parent_name,
          <span key="f" className="block leading-tight"><Chip tone="warn">{x.form}</Chip>{x.reason && <span className="mt-0.5 block text-[11.5px] text-slate-500">{x.reason}</span>}</span>,
          <span key="p" className="flex items-center gap-1.5"><Chip tone={x.fee_status === "Paid" ? "good" : x.fee_status === "Waived" ? "info" : "warn"}>{x.fee_status}</Chip>{x.fee_status !== "Waived" && inr(x.fee)}</span>, `${x.docs}/${x.docs_of}`,
          x.fee_status === "Pending"
            ? <span key="a" className="flex gap-1.5"><button type="button" className={blueBtn} disabled={act.busy} onClick={() => setDlg({ kind: "fee", row: x })}>Collect fee</button><button type="button" className={pillBtn} onClick={() => setDlg({ kind: "waive", row: x })}>Waive</button><button type="button" className={pillBtn} onClick={() => setDlg({ kind: "fill", row: x })}>Fill at front office</button><button type="button" className={pillBtn} disabled={act.busy} title={x.reminded_on ? `Last reminded ${dmy(x.reminded_on)}` : ""} onClick={() => call(x, "remind")}>{x.reminded_on ? "Remind again" : "Remind"}</button></span>
            : <span key="a" className="flex gap-1.5"><button type="button" className={blueBtn} disabled={act.busy} onClick={() => call(x, "submit")}>Review and submit</button><button type="button" className={pillBtn} onClick={() => setDlg({ kind: "fill", row: x })}>Fill at front office</button></span>])} />
      {dlg?.kind === "fee" && <FeeDialog row={dlg.row} onClose={() => setDlg(null)} onDone={() => { setDlg(null); r.reload(); a.refreshBadges(); }} />}
      {dlg?.kind === "waive" && <WaiveDialog row={dlg.row} onClose={() => setDlg(null)} onDone={() => { setDlg(null); r.reload(); }} />}
      {dlg?.kind === "fill" && <FillDialog row={dlg.row} onClose={() => setDlg(null)} onDone={() => { setDlg(null); r.reload(); }} />}
    </div>
  );
}

function FeeDialog({ row, onClose, onDone }: { row: AppRow; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState("UPI"); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/applications/${row.id}/fee`, json("POST", { mode })))) onDone(); };
  return <Modal open title={`Collect fee · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} /><p className="text-[13px] text-slate-700">Application fee for {row.class_sought}: <b>{inr(row.fee)}</b></p><Label label="Paid by"><select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>{["UPI", "Card", "Cash", "Cheque", "Net banking"].map((m) => <option key={m}>{m}</option>)}</select></Label><Actions onCancel={onClose} busy={act.busy} label="Collect fee" /></form></Modal>;
}
function WaiveDialog({ row, onClose, onDone }: { row: AppRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("Staff ward"); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/applications/${row.id}/waive`, json("POST", { reason })))) onDone(); };
  return <Modal open title={`Waive fee · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} /><Label label="Reason"><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{["Staff ward", "Sibling", "Principal's approval"].map((m) => <option key={m}>{m}</option>)}</select></Label><Actions onCancel={onClose} busy={act.busy} label="Waive fee" /></form></Modal>;
}
function FillDialog({ row, onClose, onDone }: { row: AppRow; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ dob: row.dob, gender: row.gender, email: row.email, address: row.address, prev_school: row.prev_school }); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/applications/${row.id}/details`, json("PUT", f)))) onDone(); };
  return (
    <Modal open title={`Fill at front office · ${row.child}`} onClose={onClose}>
      <form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} />
        <div className="grid gap-3 sm:grid-cols-2"><Label label="Date of birth"><input type="date" className={inputCls} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} /></Label><Label label="Gender"><select className={inputCls} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">Not stated</option>{["Female", "Male", "Other"].map((g) => <option key={g}>{g}</option>)}</select></Label></div>
        <Label label="Email"><input type="email" className={inputCls} maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Label>
        <Label label="Address"><input className={inputCls} maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Label>
        <Label label="Previous school"><input className={inputCls} maxLength={200} value={f.prev_school} onChange={(e) => setF({ ...f, prev_school: e.target.value })} /></Label>
        <Actions onCancel={onClose} busy={act.busy} label="Save details" />
      </form>
    </Modal>
  );
}

// ═════════════ verification ═════════════
interface Pend { id: string; code: string; child: string; class_sought: string; dob: string | null; age: number | null; state: "Eligible" | "Borderline" | "Not eligible" | "No date of birth"; min_age: number | null; next: string }
const E_TONE = { Eligible: "good", Borderline: "warn", "Not eligible": "bad", "No date of birth": "mute" } as const;

export function VerificationPending() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: Pend[] }>("/admissions/verification/pending"), []);
  const [search, setSearch] = useState(""); const [ret, setRet] = useState<Pend | null>(null);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  const ref = new Date().getMonth() >= 5 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  return (
    <div>
      <Head title="Pending" subtitle={`Check each family's documents and eligibility. Age is checked automatically against 31 March ${ref}.`} />
      <PipelineStrip active={4} />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Waiting for verification" noun="applications" search={search} onSearch={setSearch} exportName="waiting-for-verification" exportHead={["Child", "Class", "Application no.", "Born", "Age on 31 Mar", "Eligibility", "Next"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, dmy(x.dob), x.age, x.state, x.next])}
        head={["Child", "Born", `Age on 31 Mar`, "Eligibility", "Next", ""]} empty={r.loading ? "Loading…" : "Nothing is waiting for verification."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, dmy(x.dob), x.age ?? "—", <span key="e" className="flex items-center gap-1.5"><Chip tone={E_TONE[x.state]}>{x.state}</Chip>{x.min_age !== null && <span className="text-[11.5px] text-slate-500">needs {x.min_age}+</span>}</span>, x.next,
          <span key="a" className="flex gap-1.5"><button type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/admissions/verification/${x.id}/verify`, json("POST", {})))}>Verify</button><button type="button" className={pillBtn} onClick={() => setRet(x)}>Return</button></span>])} />
      {ret && <ReturnDialog row={ret} onClose={() => setRet(null)} onDone={() => { setRet(null); r.reload(); a.refreshBadges(); }} />}
    </div>
  );
}
function ReturnDialog({ row, onClose, onDone }: { row: Pend; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(""); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/verification/${row.id}/return`, json("POST", { reason })))) onDone(); };
  return <Modal open title={`Return to parent · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} /><Label label="What needs correcting"><input className={inputCls} required maxLength={200} placeholder="For example: birth certificate photo is blurred" value={reason} onChange={(e) => setReason(e.target.value)} /></Label><Actions onCancel={onClose} busy={act.busy} label="Return" /></form></Modal>;
}

export function VerificationReturned() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; child: string; class_sought: string; reason: string; parent_name: string; mobile: string | null }[] }>("/admissions/verification/returned"), []);
  const [search, setSearch] = useState("");
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Returned" subtitle="Applications sent back to parents for a correction. They come back to verification once fixed." />
      <PipelineStrip active={4} />
      <ErrorBanner message={r.error} />
      <DataTable title="Returned to parents" noun="applications" search={search} onSearch={setSearch} exportName="returned-to-parents" exportHead={["Child", "Class", "Application no.", "Reason", "Parent", "Mobile"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.reason, x.parent_name, x.mobile])}
        head={["Child", "Reason", "Parent"]} empty={r.loading ? "Loading…" : "Nothing has been returned."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.reason, <span key="p">{x.parent_name} · {phone(x.mobile)}</span>])} />
    </div>
  );
}

interface Rule { class_name: string; min_age: number; seats: number; needs_assessment: boolean; assessment: string }
export function EligibilityRules() {
  const r = useLoad(() => schoolFetch<{ year: string; items: Rule[] }>("/admissions/eligibility-rules"), []);
  const act = useAction(() => r.reload());
  const year = r.data?.year ?? ""; const ref = year.slice(-4);
  const label = year.replace(/^(\d{4})-(\d{4})$/, (_, x: string, y: string) => `${x}-${y.slice(2)}`);
  return (
    <div>
      <Head title="Eligibility Rules" subtitle="Age criteria and whether each class needs a test or interview. Change it here for this school." />
      <PipelineStrip active={4} />
      <ErrorBanner message={r.error || act.error} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">{label ? `Eligibility rules · ${label}` : "Eligibility rules"}</h2><span className="text-xs text-slate-500">{r.data?.items.length ?? 0} classes</span></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Class", `Minimum age on 31 Mar ${ref}`, "Seats", "Assessment", "Test / interview needed"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(r.data?.items ?? []).map((x) => <tr key={x.class_name}><td className="px-4 py-3 font-semibold text-slate-900">{x.class_name}</td><td className="px-4 py-3">{x.min_age} years</td><td className="px-4 py-3">{x.seats}</td><td className="px-4 py-3">{x.assessment}</td>
            <td className="px-4 py-3"><button type="button" role="switch" aria-checked={x.needs_assessment} aria-label={`${x.class_name} needs a test or interview`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch("/admissions/eligibility-rules", json("PUT", { class_name: x.class_name, needs_assessment: !x.needs_assessment })))} className={`relative h-5 w-9 rounded-full transition ${x.needs_assessment ? "bg-[#0294CE]" : "bg-slate-300"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${x.needs_assessment ? "left-[18px]" : "left-0.5"}`} /></button></td></tr>)}
            {!r.data?.items.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{r.loading ? "Loading…" : "No classes yet."}</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}

// ═════════════ board transfers (reference) ═════════════
const CHECKLIST = ["Collect the transfer certificate and the latest marks statement from the previous school.", "Telugu is compulsory up to Class 10 in Telangana. Note if the student has not studied it, so the school can plan support.", "Classes 10 and 12 take transfer students only, as set in Programme Rules.", "For Class 11 Science (PCM) and Commerce with Mathematics, the student needs Mathematics Standard in Class 10 or the same level from their board.", "Compare the subjects below and record any gaps on the application."];
type SubjectRow = [string, "Compulsory" | "Choose" | "School-assessed", string];
const BOARDS: Record<string, { name: string; classes: string[]; subjects: Record<string, { title: string; rows: SubjectRow[] }> }> = {
  CBSE: { name: "CBSE", classes: ["Class 9"], subjects: { "Class 9": { title: "CBSE · Class 9 (Secondary)", rows: [["English (R1)", "Compulsory", "Language and literature"], ["Hindi (R2)", "Compulsory", "Second language"], ["Telugu (R3)", "Compulsory", "Third language; two of the three must be Indian languages"], ["Mathematics", "Compulsory", "Standard for everyone; students may also take the Advanced level"], ["Science", "Compulsory", "Standard for everyone; students may also take the Advanced level"], ["Social Science", "Compulsory", "New textbooks from 2026-27"], ["Vocational Education", "School-assessed", "Skill course, assessed by the school"]] } } },
  "ICSE / ISC": { name: "ICSE / ISC", classes: ["Class 9"], subjects: { "Class 9": { title: "ICSE / ISC · Class 9", rows: [["Group I: English", "Compulsory", "Language and literature"], ["Group I: Second language (Hindi or Telugu)", "Compulsory", "Language and literature"], ["Group I: History, Civics and Geography", "Compulsory", "Social sciences"], ["Group II: Mathematics; Science (Physics, Chemistry, Biology)", "Choose", "Most students take both; other choices are Economics, Commercial Studies, Environmental Science or a foreign language"], ["Group III: Computer Applications", "Choose", "Or Economic Applications, Commercial Applications, Art, Physical Education or Yoga"]] } } },
};
const ALL_CLASSES = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];

export function BoardTransfers() {
  const [board, setBoard] = useState("CBSE"); const [cls, setCls] = useState("Class 9");
  const other = board === "CBSE" ? "ICSE / ISC" : "CBSE";
  const side = (b: string) => BOARDS[b].subjects[cls];
  return (
    <div>
      <Head title="Board Transfers" subtitle="For students joining from another board: see what they studied and what they will study here." />
      <PipelineStrip active={4} />
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Before you admit a student from another board</h2><span className="text-xs text-slate-500">Checklist</span></div><ul className="list-disc space-y-1.5 px-9 py-4 text-[13px] text-slate-800">{CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ul></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Compare boards</h2><span className="text-xs text-slate-500">Same class, side by side</span></div>
        <div className="space-y-3 p-5"><label className="block text-[12.5px] text-slate-700">Previous board<select className={`${inputCls} mt-1 max-w-[12rem] block`} value={board} onChange={(e) => setBoard(e.target.value)}>{Object.keys(BOARDS).map((b) => <option key={b}>{b}</option>)}</select></label><span className="text-[12.5px] text-slate-600">compared with {other}</span>
          <div className="flex flex-wrap gap-2">{ALL_CLASSES.map((c) => <button key={c} type="button" onClick={() => setCls(c)} className={`rounded-full border px-3 py-1 text-[12.5px] ${c === cls ? "border-[#026f9b] bg-[#026f9b] font-semibold text-white" : "border-slate-200 text-slate-800 hover:border-slate-400"}`}>{c}</button>)}</div></div>
        {side("CBSE") ? <div className="grid border-t border-slate-100 lg:grid-cols-2">{[board, other].map((b) => <div key={b} className="min-w-0 border-slate-100 lg:border-r lg:last:border-r-0"><p className="px-5 pb-1 pt-3 text-[13.5px] font-semibold text-slate-900">{side(b).title}</p>
          <table className="w-full text-[12.5px]"><thead className="bg-slate-50"><tr>{["Subject", "Type", "What it covers"].map((h) => <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{side(b).rows.map((r) => <tr key={r[0]}><td className="px-4 py-2.5 font-semibold text-slate-900">{r[0]}</td><td className="px-4 py-2.5"><Chip tone={r[1] === "Compulsory" ? "info" : r[1] === "Choose" ? "good" : "mute"}>{r[1]}</Chip></td><td className="px-4 py-2.5 text-slate-700">{r[2]}</td></tr>)}</tbody></table></div>)}</div>
          : <p className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-400">The subject comparison for {cls} has not been added yet. Only Class 9 is available.</p>}
      </div>
    </div>
  );
}

// ═════════════ test and interview ═════════════
export function Schedule() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; assessment: string }[] }>("/admissions/selection/to-schedule"), []);
  const [search, setSearch] = useState(""); const [book, setBook] = useState<{ id: string; child: string } | null>(null);
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Schedule" subtitle="Book a test or interaction slot for each child whose documents are verified." />
      <PipelineStrip active={5} />
      <ErrorBanner message={r.error} />
      <DataTable title="To schedule" noun="applicants" search={search} onSearch={setSearch} exportName="to-schedule" exportHead={["Child", "Class", "Application no.", "Assessment", "Parent", "Mobile"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.assessment, x.parent_name, x.mobile])}
        head={["Child", "Assessment", "Parent", ""]} empty={r.loading ? "Loading…" : "Nobody is waiting for a slot."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.assessment, <ParentCell key="p" name={x.parent_name} mobile={x.mobile} />, <button key="s" type="button" className={blueBtn} onClick={() => setBook({ id: x.id, child: x.child })}>Schedule</button>])} />
      {book && <BookDialog row={book} onClose={() => setBook(null)} onDone={() => { setBook(null); r.reload(); a.refreshBadges(); }} />}
    </div>
  );
}
function BookDialog({ row, onClose, onDone }: { row: { id: string; child: string }; onClose: () => void; onDone: () => void }) {
  const panels = useLoad(() => schoolFetch<{ items: { id: string; name: string; status: string }[] }>("/school/front-office/adm-panels"), []);
  const [f, setF] = useState({ panel_name: "", interview_date: "", interview_time: "10:00" }); const act = useAction(() => undefined);
  const list = (panels.data?.items ?? []).filter((p) => p.status === "Active");
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/selection/${row.id}/schedule`, json("POST", { ...f, panel_name: f.panel_name || list[0]?.name || "" })))) onDone(); };
  return (
    <Modal open title={`Schedule · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} />
      <Label label="Panel">{list.length ? <select className={inputCls} value={f.panel_name || list[0].name} onChange={(e) => setF({ ...f, panel_name: e.target.value })}>{list.map((p) => <option key={p.id}>{p.name}</option>)}</select> : <input className={inputCls} required maxLength={120} placeholder="For example: Admissions panel" value={f.panel_name} onChange={(e) => setF({ ...f, panel_name: e.target.value })} />}</Label>
      <div className="grid gap-3 sm:grid-cols-2"><Label label="Date"><input type="date" className={inputCls} required value={f.interview_date} onChange={(e) => setF({ ...f, interview_date: e.target.value })} /></Label><Label label="Time"><input type="time" className={inputCls} value={f.interview_time} onChange={(e) => setF({ ...f, interview_time: e.target.value })} /></Label></div>
      <Actions onCancel={onClose} busy={act.busy} label="Schedule" /></form></Modal>
  );
}

export function ResultsEntry() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; child: string; class_sought: string; panel_name: string; interview_date: string; interview_time: string | null; status: string }[] }>("/admissions/selection/results"), []);
  const [search, setSearch] = useState(""); const [row, setRow] = useState<{ id: string; child: string } | null>(null);
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Results Entry" subtitle="Enter the score and the panel's recommendation after each test or interaction." />
      <PipelineStrip active={5} />
      <ErrorBanner message={r.error} />
      <DataTable title="Results to enter" noun="applicants" search={search} onSearch={setSearch} exportName="results-to-enter" exportHead={["Child", "Class", "Application no.", "When", "Panel", "Status"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, `${dmy(x.interview_date)} ${x.interview_time?.slice(0, 5) ?? ""}`, x.panel_name, x.status])}
        head={["Child", "When", "Status", ""]} empty={r.loading ? "Loading…" : "No results are waiting to be entered."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, `${dmy(x.interview_date)} · ${x.interview_time?.slice(0, 5) ?? "—"}`, <Chip key="s" tone="warn">{x.status}</Chip>, <button key="e" type="button" className={blueBtn} onClick={() => setRow({ id: x.id, child: x.child })}>Enter result</button>])} />
      {row && <ResultDialog row={row} onClose={() => setRow(null)} onDone={() => { setRow(null); r.reload(); a.refreshBadges(); }} />}
    </div>
  );
}
function ResultDialog({ row, onClose, onDone }: { row: { id: string; child: string }; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ score: "", recommendation: "Recommend" }); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/selection/${row.id}/result`, json("POST", { score: Number(f.score), recommendation: f.recommendation })))) onDone(); };
  return <Modal open title={`Enter result · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} />
    <div className="grid gap-3 sm:grid-cols-2"><Label label="Score (out of 100)"><input type="number" min={0} max={100} required className={inputCls} value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></Label><Label label="Panel's recommendation"><select className={inputCls} value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })}>{["Recommend", "Waitlist", "Do not recommend"].map((m) => <option key={m}>{m}</option>)}</select></Label></div>
    <Actions onCancel={onClose} busy={act.busy} label="Save result" /></form></Modal>;
}

// ═════════════ approval: waitlisted and rejected ═════════════
export function WaitlistedRejected() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; child: string; class_sought: string; decision: "Waitlisted" | "Rejected" }[] }>("/admissions/waitlisted-rejected"), []);
  const [search, setSearch] = useState("");
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Waitlisted & Rejected" subtitle="Waitlisted and rejected applicants. Approve a waitlisted child when a seat frees up." />
      <PipelineStrip active={6} />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Waitlisted and rejected" noun="applicants" search={search} onSearch={setSearch} exportName="waitlisted-rejected" exportHead={["Child", "Class", "Application no.", "Decision"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.decision])}
        head={["Child", "Decision", "Note", ""]} empty={r.loading ? "Loading…" : "Nobody is waitlisted or rejected."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, <Chip key="d" tone={x.decision === "Waitlisted" ? "warn" : "bad"}>{x.decision}</Chip>, "—", x.decision === "Waitlisted" ? <button key="a" type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/admissions/waitlisted-rejected/${x.id}/approve`, json("POST", {})))}>Approve now</button> : ""])} />
    </div>
  );
}
