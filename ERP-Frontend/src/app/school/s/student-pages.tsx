"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { json, qs } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useGoTab } from "./tab-context";

const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const mask = (m: string) => { const d = (m ?? "").replace(/\D/g, ""); return d.length >= 10 ? `+91 ${d.slice(-10, -5)} ${d.slice(-5)}` : m || "—"; };

interface Stu { id: string; name: string; registration_no: string; class_section: string; class_id: string | null; gender: string; father: string; mobile: string; status: string; category: string; admission_date: string; raw_status: string }
interface StuData { year: { name: string } | null; list: Stu[]; grades: { id: string; name: string }[] }

// ═════════════ Student directory ═════════════
export type DirTab = "all-students" | "active-students" | "inactive-students" | "new-admissions";
const TITLE: Record<DirTab, string> = { "all-students": "All students", "active-students": "Active students", "inactive-students": "Inactive students", "new-admissions": "New admissions" };
const API_TAB: Record<DirTab, string> = { "all-students": "total", "active-students": "active", "inactive-students": "inactive", "new-admissions": "new" };

export function StudentDirectoryPages({ tab }: { tab: DirTab }) {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [view, setView] = useState<Stu | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => schoolFetch<StuData>(`/school/dashboard/students${qs({ tab: API_TAB[tab], search: q, grade, gender })}`), [tab, q, grade, gender]);
  const rows = data?.list ?? [];
  const status = (s: Stu) => (s.raw_status === "Active" ? "Active" : s.raw_status === "Left" ? "Withdrawn" : s.status);
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Panel title={TITLE[tab]} sub={`${rows.length} students`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => downloadCsv(`students-${tab}`, ["Student", "Admission no.", "Class", "Gender", "Father", "Mobile", "Status"], rows.map((r) => [r.name, r.registration_no, r.class_section, r.gender, r.father, r.mobile, status(r)]))}>Export</button></span>}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder={`Search ${TITLE[tab].toLowerCase()}`} aria-label="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All classes</option>{(data?.grades ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">All genders</option><option value="male">Male</option><option value="female">Female</option></select>
        </div>
        <SimpleTable head={["Student", "Class", "Gender", "Father", "Mobile", "Attendance", "Fee due", "Status", ""].map((h) => ({ h }))} empty={loading ? "Loading…" : "No students."}
          rows={rows.map((r) => [<div key="n"><p className="font-semibold text-[#026f9b]">{r.name}</p><p className="text-xs text-slate-400">{r.registration_no}</p></div>, r.class_section, r.gender, r.father, mask(r.mobile), "—", "—", <Chip key="s" tone={r.raw_status === "Active" ? "good" : "mute"}>{status(r)}</Chip>,
            <span key="a" className="flex gap-1.5"><Link href="/school/students" className={small}>Profile</Link><button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Admission no." v={view.registration_no} /><Row k="Class" v={view.class_section} /><Row k="Gender" v={view.gender} /><Row k="Category" v={view.category} /><Row k="Father" v={view.father} /><Row k="Mobile" v={view.mobile} /><Row k="Admitted" v={day(view.admission_date)} /><Row k="Status" v={status(view)} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Student registration ═════════════
export type RegTab = "add-student" | "bulk-import" | "registration-list";
export function StudentRegistrationPages({ tab }: { tab: RegTab }) {
  return tab === "add-student" ? <AddStudent /> : tab === "bulk-import" ? <BulkImport /> : <RegistrationList />;
}

interface Section { id: string; grade_id: string; name: string }
interface Setup { grades: { id: string; name: string }[]; sections: Section[] }
const useSetup = () => useLoad(async (): Promise<Setup> => {
  const [years, grades] = await Promise.all([schoolFetch<{ years: { id: string; is_current: boolean }[] }>("/school/years"), schoolFetch<{ grades: { id: string; name: string; is_active: boolean }[] }>("/school/grades")]);
  const cur = years.years.find((y) => y.is_current);
  const sections = cur ? (await schoolFetch<{ sections: Section[] }>(`/school/sections?academic_year_id=${cur.id}`)).sections : [];
  return { grades: grades.grades.filter((g) => g.is_active), sections };
}, []);

function AddStudent() {
  const go = useGoTab();
  const setup = useSetup();
  const act = useAction(() => undefined);
  const blank = { first_name: "", last_name: "", date_of_birth: "", gender: "Female", grade_id: "", section: "", guardian_name: "", guardian_phone: "", address: "" };
  const [f, setF] = useState(blank);
  const G = setup.data?.grades ?? [];
  const gradeId = f.grade_id || G[0]?.id || "";
  const secs = (setup.data?.sections ?? []).filter((s) => s.grade_id === gradeId);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const grade = G.find((g) => g.id === gradeId);
    if (!grade) return;
    const { grade_id: _g, ...rest } = f;
    void _g;
    if (await act.run(() => schoolFetch("/sis/students", json("POST", { ...rest, section: f.section || secs[0]?.name || "", grade: grade.name, guardian_relation: "Father" })))) { setF(blank); go("registration-list"); }
  };
  return (
    <FormCard title="New student" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error || setup.error}>
      <Field label="First name"><input className={inputCls} required maxLength={100} value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
      <Field label="Last name"><input className={inputCls} required maxLength={100} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
      <Field label="Date of birth"><input type="date" className={inputCls} value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></Field>
      <Field label="Gender"><select className={inputCls} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></Field>
      <Field label="Class"><select className={inputCls} value={gradeId} onChange={(e) => setF({ ...f, grade_id: e.target.value, section: "" })}>{G.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
      <Field label="Section"><select className={inputCls} value={f.section || secs[0]?.name || ""} onChange={(e) => setF({ ...f, section: e.target.value })}>{!secs.length && <option value="">No section</option>}{secs.map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Father's name"><input className={inputCls} maxLength={200} value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} /></Field>
      <Field label="Parent mobile"><input className={inputCls} maxLength={30} inputMode="tel" placeholder="+91" value={f.guardian_phone} onChange={(e) => setF({ ...f, guardian_phone: e.target.value })} /></Field>
      <div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
    </FormCard>
  );
}

const COLS = ["Name", "Class", "Section", "Date of birth", "Father", "Mobile"];
interface Line { row: number; name: string; cls: string; section: string; dob: string; father: string; mobile: string; problem: string }
export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim()));
}

function BulkImport() {
  const setup = useSetup();
  const act = useAction(() => undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState("");
  const G = setup.data?.grades ?? [];
  const check = (cells: string[], row: number): Line => {
    const [name = "", cls = "", section = "", dob = "", father = "", mobile = ""] = cells.map((c) => c.trim());
    const bits = (dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? []);
    const problems: string[] = [];
    if (!name.includes(" ")) problems.push("name (first and last)");
    if (!G.some((g) => g.name.toLowerCase() === cls.toLowerCase())) problems.push("class");
    if (!bits.length) problems.push("date of birth");
    if (!mobile) problems.push("mobile");
    return { row, name, cls, section, dob, father, mobile, problem: problems.join(", ") };
  };
  const onFile = async (file: File | undefined) => {
    setResult(""); setFileError("");
    if (!file) return;
    if (file.size > 500_000) { setFileError("Keep the file under 500 KB."); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setFileError("The file has no student rows."); return; }
    setLines(rows.slice(1, 301).map((r, i) => check(r, i + 2)));
  };
  const valid = lines.filter((l) => !l.problem);
  const doImport = async () => {
    let ok = 0; const fails: string[] = [];
    await act.run(async () => {
      for (const l of valid) {
        const [first, ...rest] = l.name.split(/\s+/);
        const [d, m, y] = l.dob.split("/");
        try { await schoolFetch("/sis/students", json("POST", { first_name: first, last_name: rest.join(" "), grade: G.find((g) => g.name.toLowerCase() === l.cls.toLowerCase())!.name, section: l.section, date_of_birth: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, guardian_name: l.father, guardian_phone: l.mobile, guardian_relation: "Father" })); ok++; }
        catch (e) { fails.push(`Row ${l.row}: ${e instanceof Error ? e.message : "failed"}`); }
      }
    });
    setResult(`${ok} students imported.${fails.length ? ` ${fails.length} failed: ${fails.slice(0, 3).join(" · ")}` : ""}`);
    setLines(lines.filter((l) => l.problem));
  };
  const template = () => downloadCsv("student-import-template", COLS, [["Riya Shah", G[0]?.name ?? "Class 1", "A", "12/04/2019", "Kiran Shah", "9848012311"]]);
  const box = "flex min-h-[8.5rem] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4";
  return (
    <div className="space-y-5">
      <ErrorBanner message={fileError || setup.error || act.error} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className={box}><b className="text-[14px] text-slate-900">1. Download the template</b><p className="text-xs text-slate-500">A CSV with the right columns and an example row</p><button type="button" className={`${small} mt-auto w-fit`} onClick={template}>Download template</button></div>
        <div className={box}><b className="text-[14px] text-slate-900">2. Fill it in</b><p className="text-xs text-slate-500">One row per student. Dates as DD/MM/YYYY. The class must match a class name exactly.</p><p className="mt-auto text-xs text-slate-500">{COLS.length} columns</p></div>
        <div className={box}><b className="text-[14px] text-slate-900">3. Upload</b><p className="text-xs text-slate-500">We check every row before importing</p><input type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(e) => void onFile(e.target.files?.[0])} className="text-sm" /></div>
      </div>
      {result && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>}
      <Panel title="Preview" sub={lines.length ? `${valid.length} of ${lines.length} rows are ready` : "Upload a file to see its rows checked"} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !valid.length} onClick={() => void doImport()}>{act.busy ? "Importing…" : "Import valid rows"}</button>}>
        <SimpleTable head={["Row", ...COLS, "Check"].map((h) => ({ h }))} empty="No file checked yet." rows={lines.map((l) => [l.row, l.name, l.cls, l.section, l.dob, l.father, l.mobile, l.problem ? <span key="c" className="flex items-center gap-1.5"><Chip tone="bad">Missing</Chip><span className="text-xs text-slate-600">{l.problem}</span></span> : <Chip key="c" tone="good">Verified</Chip>])} />
      </Panel>
    </div>
  );
}

function RegistrationList() {
  const { data, error, loading } = useLoad(() => schoolFetch<StuData>("/school/dashboard/students?tab=new"), []);
  const [search, setSearch] = useState("");
  const all = data?.list ?? [];
  const rows = all.filter((r) => !search.trim() || JSON.stringify(Object.values(r)).toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <ListPanel title="Registrations" noun="students" search={search} onSearch={setSearch} exportName="registrations" head={["Student", "Admission no.", "Class", "Father", "Mobile", "Registered"]}
        exportRows={rows.map((r) => [r.name, r.registration_no, r.class_section, r.father, r.mobile, day(r.admission_date)])}
        tableHead={["Student", "Admission no.", "Class", "Father", "Mobile", "Registered"]} empty={loading ? "Loading…" : "Nobody registered this year yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.registration_no, r.class_section, r.father, mask(r.mobile), day(r.admission_date)])} />
    </div>
  );
}

void btnGhost;
