"use client";

import { useState } from "react";
import { schoolFetch } from "@/lib/school-api";
import { Panel } from "@/components/admin/dash";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { BOARDS } from "../../admissions/m/sel-pages";
import { useApplicant } from "../context";
import { Chip, DataTable, Head, Loading, Note, dmy, has, inr, toneOf } from "./kit";

const yearLabel = (y: string) => y.replace(/^(\d{4})-(\d{4})$/, (_, a: string, b: string) => `${a}-${b.slice(2)}`);
const classOnly = (c: string) => c.replace(/\s*·.*$/, "");

// ═════════════ Overview ═════════════
interface Overview { name: string; board: string; affiliation_no: string; established: number | null; principal: string; classes: string; students: number; teachers: number; campuses: string[]; week: string; contact: { email: string; phone: string; website: string; address: string } }
export function SchoolOverview() {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Overview>("/applicant/school/overview"), []);
  const x = r.data;
  const facts: [string, string][] = x ? ([["Board", x.board], ["Classes", x.classes], ["Students", x.students ? x.students.toLocaleString("en-IN") : ""], ["Teachers", x.teachers ? String(x.teachers) : ""], ["Campuses", x.campuses.join("\n")], ["School hours", x.week], ["Principal", x.principal], ["Established", x.established ? String(x.established) : ""], ["Address", x.contact.address], ["Phone", x.contact.phone], ["Email", x.contact.email]] as [string, string][]).filter(([, v]) => v) : [];
  return (
    <div>
      <Head title="Overview" subtitle={`Why families choose ${x?.name || a.school.name}.`} />
      <ErrorBanner message={r.error} />
      {!x ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Panel title={x.name} sub={[x.board, x.affiliation_no ? `affiliation no. ${x.affiliation_no}` : ""].filter(Boolean).join(" · ")}>
            {facts.length ? <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-[13px]">{facts.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-line text-slate-900">{v}</dd></div>)}</dl> : <p className="p-6 text-center text-sm text-slate-400">The school has not filled in its profile yet.</p>}
          </Panel>
          <Panel title="Highlights"><p className="p-6 text-center text-sm text-slate-400">The school has not added highlights yet.</p></Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ Classes & Seats ═════════════
interface Classes { year: string; items: { name: string; classes: string; eligibility: string; assessment: string; seats: number; left: number; status: string }[] }
export function ClassesSeats() {
  const r = useLoad(() => schoolFetch<Classes>("/applicant/school/classes"), []);
  const [search, setSearch] = useState("");
  const x = r.data; const y = yearLabel(x?.year ?? "");
  const rows = (x?.items ?? []).filter((i) => has(i, search));
  return (
    <div>
      <Head title="Classes & Seats" subtitle={`Seats open for ${y || "this year"}. Numbers update every day.`} />
      <ErrorBanner message={r.error} />
      <DataTable title={`Classes and seats${y ? ` · ${y}` : ""}`} noun="classes" search={search} onSearch={setSearch} exportName="classes-and-seats" exportHead={["Class", "Eligibility", "Seats", "Seats left", "Status"]}
        exportRows={rows.map((i) => [i.name, i.eligibility, i.seats, i.left, i.status])} head={["Class", "Eligibility", "Seats", "Seats left", "Status"]} empty={r.loading ? "Loading…" : "The school has not set up its seats yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.eligibility, i.seats, <span key="l" className={i.status === "Open" ? "" : "font-semibold text-[#ac2c28]"}>{i.left}</span>, <Chip key="s" tone={toneOf(i.status)}>{i.status}</Chip>])} />
    </div>
  );
}

// ═════════════ Fee Structure ═════════════
interface Fee { class: string; rows: { fee: string; when: string; amount: number }[]; seat: { admission_fee: number; caution: number; total: number } }
export function FeeStructure() {
  const a = useApplicant();
  const cls = classOnly(a.active?.class_sought ?? "Class 1");
  const r = useLoad(() => schoolFetch<Fee>(`/applicant/school/fees?class=${encodeURIComponent(cls)}`), [cls]);
  const yr = useLoad(() => schoolFetch<{ year: string }>("/applicant/school/classes"), []);
  const [search, setSearch] = useState("");
  const x = r.data; const rows = (x?.rows ?? []).filter((i) => has(i, search));
  return (
    <div>
      <Head title="Fee Structure" subtitle={`Fees for ${cls}, ${yearLabel(yr.data?.year ?? "")}. Other classes differ slightly; the office can share the exact fee for each class.`} />
      <ErrorBanner message={r.error} />
      <DataTable title={`Fee structure · ${cls}`} noun="fee heads" search={search} onSearch={setSearch} exportName="fee-structure" exportHead={["Fee", "When", "Amount"]} exportRows={rows.map((i) => [i.fee, i.when, i.amount])}
        head={["Fee", "When", "Amount"]} empty={r.loading ? "Loading…" : "The school has not set up its fees yet."} rows={rows.map((i) => [<b key="f" className="font-semibold text-slate-900">{i.fee}</b>, i.when, inr(i.amount)])} />
      {x && x.seat.total > 0 && <div className="mt-4"><Note>To confirm a seat you pay the admission fee and the caution deposit ({inr(x.seat.total)}) by the deadline on your offer.</Note></div>}
    </div>
  );
}

// ═════════════ Admission Calendar ═════════════
export function AdmissionCalendar() {
  const r = useLoad(() => schoolFetch<{ items: { date: string; what: string; details: string; status: string }[] }>("/applicant/school/calendar"), []);
  const yr = useLoad(() => schoolFetch<{ year: string }>("/applicant/school/classes"), []);
  const [search, setSearch] = useState("");
  const rows = (r.data?.items ?? []).filter((i) => has(i, search));
  return (
    <div>
      <Head title="Admission Calendar" subtitle={`Important dates for ${yearLabel(yr.data?.year ?? "")} admissions.`} />
      <ErrorBanner message={r.error} />
      <DataTable title="Admission calendar" noun="dates" search={search} onSearch={setSearch} exportName="admission-calendar" exportHead={["Date", "What", "Details", "Status"]} exportRows={rows.map((i) => [dmy(i.date), i.what, i.details, i.status])}
        head={["Date", "What", "Details", "Status"]} empty={r.loading ? "Loading…" : "The school has not published admission dates yet."} rows={rows.map((i) => [dmy(i.date), <b key="w" className="font-semibold text-slate-900">{i.what}</b>, i.details, <Chip key="s" tone={toneOf(i.status)}>{i.status}</Chip>])} />
    </div>
  );
}

// ═════════════ FAQs ═════════════
export function Faqs() {
  const r = useLoad(() => schoolFetch<{ items: { question: string; answer: string }[] }>("/applicant/school/faqs"), []);
  return (
    <div>
      <Head title="FAQs" subtitle="Answers to what parents ask most." />
      <ErrorBanner message={r.error} />
      <Panel title="Frequently asked questions" sub={r.data ? `${r.data.items.length} questions` : ""}>
        {!r.data ? <Loading /> : !r.data.items.length ? <p className="p-6 text-center text-sm text-slate-400">The school has not published any answers yet. Send them a question under Enquiry & Visit.</p> : <ul className="divide-y divide-slate-100">{r.data.items.map((f) => <li key={f.question} className="flex gap-3 px-5 py-3.5"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#dceff9] text-[12px] font-bold text-[#026f9b]">?</span><span><b className="block text-[13px] text-slate-900">{f.question}</b><span className="block text-[13px] text-slate-700">{f.answer}</span></span></li>)}</ul>}
      </Panel>
    </div>
  );
}

// ═════════════ Subjects by Class ═════════════
interface Subjects { board: string; affiliation_no: string; classes: { name: string; subjects: { name: string; type: string }[] }[] }
const boardKey = (b: string) => (/icse|isc/i.test(b) ? "ICSE / ISC" : /cbse/i.test(b) ? "CBSE" : "");
export function SubjectsByClass() {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Subjects>("/applicant/school/subjects"), []);
  const x = r.data;
  const start = classOnly(a.active?.class_sought ?? "");
  const [pick, setPick] = useState("");
  const [prev, setPrev] = useState("CBSE");
  const names = x?.classes.map((c) => c.name) ?? [];
  const cls = names.includes(pick) ? pick : names.includes(start) ? start : names[0] ?? "";
  const mine = x?.classes.find((c) => c.name === cls);
  const own = boardKey(x?.board ?? "");
  const other = Object.keys(BOARDS).find((b) => b !== prev) ?? "";
  const ref = (b: string) => BOARDS[b]?.subjects[cls];
  return (
    <div>
      <Head title="Subjects by Class" subtitle={`What your child will study at ${a.school.name}, class by class, and how it compares with their current board.`} />
      <ErrorBanner message={r.error} />
      {!x ? <Loading /> : (
        <>
          {x.board && <p className="mb-4 text-[12.5px] text-slate-600">{a.school.name} follows <b className="text-slate-900">{x.board}</b>{x.affiliation_no ? ` (affiliation no. ${x.affiliation_no})` : ""}.</p>}
          <Panel title={`Subjects in ${cls || "—"}`}>
            <div className="flex flex-wrap gap-2 p-4">{names.map((c) => <button key={c} type="button" onClick={() => setPick(c)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${c === cls ? "border-[#026f9b] bg-[#026f9b] font-semibold text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}>{c}</button>)}</div>
            {mine?.subjects.length ? <table className="w-full text-[13px]"><thead className="bg-slate-50"><tr>{["Subject", "Type"].map((h) => <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{mine.subjects.map((s) => <tr key={s.name}><td className="px-4 py-2.5 font-semibold text-slate-900">{s.name}</td><td className="px-4 py-2.5"><Chip tone={s.type === "Compulsory" ? "info" : "good"}>{s.type}</Chip></td></tr>)}</tbody></table> : <p className="px-5 pb-6 text-center text-sm text-slate-400">{names.length ? "The school has not listed subjects for this class yet." : "The school has not set up its classes and subjects yet."}</p>}
          </Panel>
          <p className="my-4 text-[12.5px] text-slate-600">Moving from another board? Choose it below to see the subjects side by side.</p>
          <Panel title="Compare boards" sub="Same class, side by side">
            <div className="space-y-3 p-5"><label className="block text-[12.5px] text-slate-700">Previous board<select className={`${inputCls} mt-1 block max-w-[12rem]`} value={prev} onChange={(e) => setPrev(e.target.value)}>{Object.keys(BOARDS).map((b) => <option key={b}>{b}</option>)}</select></label><span className="text-[12.5px] text-slate-600">compared with {other}</span></div>
            {ref(prev) || ref(other) ? <div className="grid border-t border-slate-100 lg:grid-cols-2">{[prev, other].map((b) => ref(b) ? <div key={b} className="min-w-0 border-slate-100 lg:border-r lg:last:border-r-0"><p className="px-5 pb-1 pt-3 text-[13.5px] font-semibold text-slate-900">{ref(b)!.title}</p><table className="w-full text-[12.5px]"><tbody className="divide-y divide-slate-100">{ref(b)!.rows.map((s) => <tr key={s[0]}><td className="px-4 py-2.5 font-semibold text-slate-900">{s[0]}</td><td className="px-4 py-2.5"><Chip tone={s[1] === "Compulsory" ? "info" : s[1] === "Choose" ? "good" : "mute"}>{s[1]}</Chip></td><td className="px-4 py-2.5 text-slate-700">{s[2]}</td></tr>)}</tbody></table></div> : null)}</div>
              : <p className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-400">A side-by-side comparison for {cls || "this class"} is not available yet. It is shown for Class 9{own ? `, against ${x.board}` : ""}.</p>}
          </Panel>
        </>
      )}
    </div>
  );
}
