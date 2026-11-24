"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, okBox, primaryCls } from "./fee-pages";

const H = "/school/hr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
interface Cred { name?: string; emp_code?: string; email?: string; temporary_password?: string; role?: string }
const Creds = ({ list, close }: { list: Cred[]; close: () => void }) => (
  <Modal open={list.length > 0} title="Logins created" onClose={close}>
    <p className="mb-3 text-[13px] text-slate-600">Share these with each person now. The temporary password is shown only once, and they must change it when they sign in.</p>
    <div className="max-h-72 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Password</th></tr></thead><tbody>{list.map((c) => <tr key={c.email} className="border-t border-slate-100"><td className="px-3 py-2">{c.name}<span className="block text-[11px] text-slate-500">{c.emp_code}</span></td><td className="px-3 py-2">{c.email}</td><td className="px-3 py-2 font-mono">{c.temporary_password}</td></tr>)}</tbody></table></div>
    <Foot close={close} left={<button type="button" className={small} onClick={() => downloadCsv("staff-logins.csv", ["Name", "Employee ID", "Email", "Temporary password"], list.map((c) => [c.name ?? "", c.emp_code ?? "", c.email ?? "", c.temporary_password ?? ""]))}>Download CSV</button>} />
  </Modal>
);

// ═════════════ registration ═════════════
function parseCsv(text: string) {
  const out: { name: string; emp_code: string; designation: string; department: string; joined_on: string; mobile: string; email: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const c = (line.match(/("([^"]*)"|[^,]*)(,|$)/g) ?? []).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").trim());
    if (!c[0] || /^name$/i.test(c[0])) continue;
    const d = c[4]?.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/) ?? c[4]?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const iso = d ? (d[1].length === 4 ? `${d[1]}-${d[2]}-${d[3]}` : `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`) : "";
    out.push({ name: c[0], emp_code: c[1] ?? "", designation: c[2] ?? "", department: c[3] ?? "", joined_on: iso, mobile: c[5] ?? "", email: c[6] ?? "" });
  }
  return out;
}
export function EmployeeRegistrationPages({ tab }: { tab: "add-employee" | "bulk-import" }) {
  const lists = useLoad(() => schoolFetch<{ departments: string[]; designations: string[]; roles: string[] }>(`${H}/registration`), []);
  const act = useAction(() => undefined);
  const blank = { name: "", gender: "Female", date_of_birth: "", department: "", designation: "", staff_type: "Teaching", joined_on: nowIst(), mobile: "", email: "", monthly_salary: "", qualification: "", pan: "", role: "" };
  const [f, setF] = useState(blank);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<ReturnType<typeof parseCsv>>([]);
  const [res, setRes] = useState<{ valid: number; invalid: number; rows: { row: number; ok: boolean; error?: string }[] } | null>(null);
  const err = lists.error || act.error;
  if (tab === "add-employee") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let c: Cred | null = null; if (await act.run(async () => { c = await schoolFetch<Cred>(`${H}/employees`, json("POST", { name: f.name, email: f.email, mobile: f.mobile || undefined, department: f.department || undefined, designation: f.designation || undefined, staff_type: f.staff_type, role: f.role || undefined, joined_on: f.joined_on || null, gender: f.gender, date_of_birth: f.date_of_birth || null, monthly_salary: f.monthly_salary ? Number(f.monthly_salary) : null, qualification: f.qualification || undefined, pan: f.pan || undefined })); })) { setCreds(c ? [c] : []); setF(blank); setMsg("Employee added."); } };
    return (
      <div>{okBox(msg)}
        <FormCard title="New employee" cols="lg:grid-cols-5" submitLabel="Add employee" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
          <Field label="Full name"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Gender"><select className={inputCls} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>{["Female", "Male", "Other"].map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Date of birth"><input type="date" className={inputCls} value={f.date_of_birth} max={nowIst()} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></Field>
          <Field label="Department"><select className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">Choose a department</option>{lists.data?.departments.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Designation"><select className={inputCls} value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })}><option value="">Choose a designation</option>{lists.data?.designations.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Type"><select className={inputCls} value={f.staff_type} onChange={(e) => setF({ ...f, staff_type: e.target.value })}><option>Teaching</option><option>Non-teaching</option></select></Field>
          <Field label="Joining date"><input type="date" required className={inputCls} value={f.joined_on} onChange={(e) => setF({ ...f, joined_on: e.target.value })} /></Field>
          <Field label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
          <Field label="Email"><input type="email" required className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Monthly salary (₹)"><input type="number" min={0} className={inputCls} value={f.monthly_salary} onChange={(e) => setF({ ...f, monthly_salary: e.target.value })} /></Field>
          <Field label="Qualification"><input className={inputCls} maxLength={120} value={f.qualification} onChange={(e) => setF({ ...f, qualification: e.target.value })} /></Field>
          <Field label="PAN"><input className={inputCls} maxLength={10} placeholder="ABCDE1234F" value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} /></Field>
          <Field label="Login role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="">Automatic</option>{[...new Set(lists.data?.roles ?? [])].map((r) => <option key={r}>{r}</option>)}</select></Field>
        </FormCard>
        <Creds list={creds} close={() => setCreds([])} />
      </div>
    );
  }
  const template = () => downloadCsv("employee-import-template.csv", ["Name", "Employee ID", "Designation", "Department", "Joining date", "Mobile", "Email"], [["Sunitha Rao", "EMP-1210", "TGT", "Science", "01/12/2026", "+91 97010 22114", "sunitha.rao@school.example"]]);
  const pick = async (file?: File) => { if (!file) return; setRows(parseCsv(await file.text())); setRes(null); setMsg(""); };
  const run = async (dry: boolean) => {
    if (!rows.length) return setMsg("Choose a file first.");
    let r: { valid: number; invalid: number; rows: (Cred & { row: number; ok: boolean; error?: string })[] } | null = null;
    if (await act.run(async () => { r = await schoolFetch(`${H}/employees/bulk`, json("POST", { dry, rows: rows.map((x) => ({ name: x.name, emp_code: x.emp_code || undefined, designation: x.designation || undefined, department: x.department || undefined, joined_on: x.joined_on || undefined, mobile: x.mobile || undefined, email: x.email })) })); }) && r) {
      const x = r as { valid: number; invalid: number; rows: (Cred & { row: number; ok: boolean; error?: string })[] };
      setRes(x);
      if (!dry) { setCreds(x.rows.filter((y) => y.ok)); setMsg(`${x.valid} employees imported${x.invalid ? `, ${x.invalid} skipped` : ""}.`); setRows([]); }
    }
  };
  return (
    <div className="space-y-5"><ErrorBanner message={err} />{okBox(msg)}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[14px] font-semibold text-slate-900"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#dceff9] text-[#026f9b]">1</span>1. Download the template</p><p className="mt-1 text-[12px] text-slate-500">A CSV with the right columns and an example row.</p><div className="mt-6 border-t border-slate-100 pt-3"><button type="button" className={small} onClick={template}>Download template</button></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[14px] font-semibold text-slate-900"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#dceff9] text-[#026f9b]">2</span>2. Fill it in</p><p className="mt-1 text-[12px] text-slate-500">One row per employee. Dates as DD/MM/YYYY. Each person needs an email for their login.</p><p className="mt-6 border-t border-slate-100 pt-3 text-[12px] text-slate-500">7 columns</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[14px] font-semibold text-slate-900"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#dceff9] text-[#026f9b]">3</span>3. Upload</p><p className="mt-1 text-[12px] text-slate-500">We check every row before importing.</p><div className="mt-3 space-y-3 border-t border-slate-100 pt-3"><input type="file" accept=".csv,text/csv" aria-label="Employee file" onChange={(e) => void pick(e.target.files?.[0])} /><button type="button" className={`${primaryCls} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !rows.length} onClick={() => void run(true)}>Check file</button></div></div>
      </div>
      <Panel title="Preview" sub={rows.length ? `${rows.length} rows in the file` : "Sample check of an uploaded file"} right={<button type="button" className={`${btnPrimary} !px-3 !py-1 text-xs`} disabled={act.busy || !res || res.valid === 0} onClick={() => void run(false)}>Import valid rows</button>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Row</th><th className="px-3 py-2.5 font-medium">Name</th><th className="px-3 py-2.5 font-medium">Employee ID</th><th className="px-3 py-2.5 font-medium">Designation</th><th className="px-3 py-2.5 font-medium">Department</th><th className="px-3 py-2.5 font-medium">Joining date</th><th className="px-3 py-2.5 font-medium">Mobile</th><th className="px-3 py-2.5 font-medium">Check</th></tr></thead>
          <tbody>{rows.map((r, i) => { const c = res?.rows.find((x) => x.row === i + 2); return <tr key={i} className="border-t border-slate-100"><td className="px-5 py-2.5">{i + 2}</td><td className="px-3 py-2.5">{r.name}</td><td className="px-3 py-2.5">{r.emp_code || "—"}</td><td className="px-3 py-2.5">{r.designation}</td><td className="px-3 py-2.5">{r.department}</td><td className="px-3 py-2.5">{r.joined_on ? day(r.joined_on) : "—"}</td><td className="px-3 py-2.5">{r.mobile}</td><td className="px-3 py-2.5">{c ? <Chip tone={c.ok ? "good" : "bad"}>{c.ok ? "Verified" : c.error ?? "Invalid"}</Chip> : "—"}</td></tr>; })}{!rows.length && <tr><td colSpan={8} className="p-6 text-center text-slate-400">Choose a file to preview it here.</td></tr>}</tbody></table></div>
      </Panel>
      <Creds list={creds} close={() => setCreds([])} />
    </div>
  );
}

// ═════════════ employee profile ═════════════
interface Prof { id: string; name: string; email: string; designation: string; status: string; emp_code: string; department: string; mobile: string | null; gender: string | null; date_of_birth: string | null; blood_group: string | null; marital_status: string | null; pan: string | null; aadhaar: string; address: string | null; emergency_contact: string | null; qualifications: { id: string; title: string; place: string; year: number | null; result: string }[]; experience: { id: string; organisation: string; role: string; from_on: string; to_on: string | null }[] }
export function ProfilePages({ tab }: { tab: "personal" | "contact" | "qualification" | "experience" }) {
  const dir = useLoad(() => schoolFetch<{ items: { id: string; name: string; designation: string; emp_code: string }[] }>(`${H}/directory`), []);
  const [pick, setPick] = useState("");
  const id = pick || dir.data?.items[0]?.id || "";
  const p = useLoad(() => (id ? schoolFetch<Prof>(`${H}/profile/${id}`) : Promise.resolve(null)), [id]);
  const act = useAction(() => p.reload());
  const [d, setD] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<{ kind: "qualification" | "experience"; id: string; rows: [string, string][] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState({ title: "", place: "", year: "", result: "", organisation: "", role: "", from_on: "", to_on: "" });
  const x = p.data; const v = (k: string, cur: string | null | undefined) => d[k] ?? cur ?? "";
  const err = <ErrorBanner message={dir.error || p.error || act.error} />;
  const bar = (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Employee<select aria-label="Employee" value={id} onChange={(e) => { setPick(e.target.value); setD({}); setMsg(""); }} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!dir.data?.items.length && <option value="">No staff</option>}{dir.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}{s.designation ? ` · ${s.designation}` : ""}</option>)}</select></label>{x && <><Chip tone={x.status === "Active" ? "good" : "warn"}>{x.status}</Chip><span className="ml-auto text-[12px] text-slate-500">{x.emp_code} · {x.department || "No department"}</span></>}</div>
  );
  if (!x) return <div>{err}{bar}<p className="py-10 text-center text-sm text-slate-400">{p.loading || dir.loading ? "Loading…" : "No staff yet."}</p></div>;
  const save = async (e: FormEvent, body: Record<string, unknown>) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${H}/profile/${id}`, json("PUT", body)))) { setD({}); setMsg("Saved."); } };
  if (tab === "personal") return (
    <div>{err}{bar}{okBox(msg)}
      <FormCard title="Personal details" cols="lg:grid-cols-5" onSubmit={(e) => void save(e, { name: v("name", x.name), gender: v("gender", x.gender) || null, date_of_birth: v("dob", x.date_of_birth) || null, blood_group: v("blood", x.blood_group) || null, marital_status: v("marital", x.marital_status) || null, pan: v("pan", x.pan), aadhaar: v("aadhaar", "") || undefined })} onDiscard={() => { setD({}); setMsg(""); }} busy={act.busy} error="">
        <Field label="Full name"><input className={inputCls} required minLength={2} value={v("name", x.name)} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Gender"><select className={inputCls} value={v("gender", x.gender)} onChange={(e) => setD({ ...d, gender: e.target.value })}><option value="">—</option>{["Male", "Female", "Other"].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Date of birth"><input type="date" className={inputCls} value={v("dob", x.date_of_birth)} onChange={(e) => setD({ ...d, dob: e.target.value })} /></Field>
        <Field label="Blood group"><select className={inputCls} value={v("blood", x.blood_group)} onChange={(e) => setD({ ...d, blood: e.target.value })}><option value="">—</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Marital status"><select className={inputCls} value={v("marital", x.marital_status)} onChange={(e) => setD({ ...d, marital: e.target.value })}><option value="">—</option>{["Single", "Married", "Other"].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="PAN"><input className={inputCls} maxLength={10} value={v("pan", x.pan)} onChange={(e) => setD({ ...d, pan: e.target.value.toUpperCase() })} /></Field>
        <Field label="Aadhaar"><input className={inputCls} maxLength={14} placeholder={x.aadhaar || "12 digits"} value={d.aadhaar ?? ""} onChange={(e) => setD({ ...d, aadhaar: e.target.value })} /></Field>
      </FormCard>
    </div>
  );
  if (tab === "contact") return (
    <div>{err}{bar}{okBox(msg)}
      <FormCard title="Contact details" cols="lg:grid-cols-2" onSubmit={(e) => void save(e, { mobile: v("mobile", x.mobile), address: v("address", x.address), emergency_contact: v("emergency", x.emergency_contact) })} onDiscard={() => { setD({}); setMsg(""); }} busy={act.busy} error="">
        <Field label="Mobile"><input className={inputCls} maxLength={30} value={v("mobile", x.mobile)} onChange={(e) => setD({ ...d, mobile: e.target.value })} /></Field>
        <Field label="Email"><input className={inputCls} readOnly value={x.email} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><textarea rows={3} maxLength={300} className={inputCls} value={v("address", x.address)} onChange={(e) => setD({ ...d, address: e.target.value })} /></Field></div>
        <Field label="Emergency contact"><input className={inputCls} maxLength={160} value={v("emergency", x.emergency_contact)} onChange={(e) => setD({ ...d, emergency: e.target.value })} /></Field>
      </FormCard>
    </div>
  );
  const isQ = tab === "qualification";
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/profile/${id}/${isQ ? "qualifications" : "experience"}`, json("POST", isQ ? { title: q.title, place: q.place, year: q.year ? Number(q.year) : null, result: q.result } : { organisation: q.organisation, role: q.role, from_on: q.from_on, to_on: q.to_on || null })))) { setAdding(false); setQ({ title: "", place: "", year: "", result: "", organisation: "", role: "", from_on: "", to_on: "" }); } };
  const remove = async () => { if (view && await act.run(() => schoolFetch(`${H}/${view.kind}s/${view.id}`, { method: "DELETE" }))) setView(null); };
  return (
    <div data-report>{err}{bar}
      {isQ ? <ListPanel title="Qualifications" noun="qualifications" hideSearch search="" onSearch={() => undefined} exportName="qualifications" head={["Qualification", "Institution", "Year", "Result"]} exportRows={x.qualifications.map((r) => [r.title, r.place, r.year, r.result])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add qualification</button>} tableHead={["Qualification", "Institution", "Year", "Result", ""]} empty="No qualifications recorded."
        rows={x.qualifications.map((r) => [<b key="t" className="font-semibold text-slate-900">{r.title}</b>, r.place || "—", r.year ?? "—", r.result || "—", <button key="v" type="button" className={small} onClick={() => setView({ kind: "qualification", id: r.id, rows: [["Qualification", r.title], ["Institution", r.place || "—"], ["Year", String(r.year ?? "—")], ["Result", r.result || "—"]] })}>View details</button>])} />
        : <ListPanel title="Experience" noun="jobs" hideSearch search="" onSearch={() => undefined} exportName="experience" head={["Organisation", "Role", "From", "To"]} exportRows={x.experience.map((r) => [r.organisation, r.role, day(r.from_on), r.to_on ? day(r.to_on) : "Present"])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add experience</button>} tableHead={["Organisation", "Role", "From", "To", ""]} empty="No experience recorded."
          rows={x.experience.map((r) => [<b key="o" className="font-semibold text-slate-900">{r.organisation}</b>, r.role, day(r.from_on), r.to_on ? day(r.to_on) : "Present", <button key="v" type="button" className={small} onClick={() => setView({ kind: "experience", id: r.id, rows: [["Organisation", r.organisation], ["Role", r.role], ["From", day(r.from_on)], ["To", r.to_on ? day(r.to_on) : "Present"]] })}>View details</button>])} />}
      <Modal open={!!view} title={view?.kind === "qualification" ? "Qualification" : "Experience"} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, val]) => <Row key={k} k={k} v={val} />)}</dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void remove()}>Remove</button>} /></>}</Modal>
      <Modal open={adding} title={isQ ? "Add a qualification" : "Add experience"} onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3">
        {isQ ? <><Field label="Qualification"><input className={inputCls} required minLength={2} maxLength={100} value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} /></Field><Field label="Institution"><input className={inputCls} maxLength={120} value={q.place} onChange={(e) => setQ({ ...q, place: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Year"><input type="number" min={1950} max={2100} className={inputCls} value={q.year} onChange={(e) => setQ({ ...q, year: e.target.value })} /></Field><Field label="Result"><input className={inputCls} maxLength={60} value={q.result} onChange={(e) => setQ({ ...q, result: e.target.value })} /></Field></div></>
          : <><Field label="Organisation"><input className={inputCls} required minLength={2} maxLength={120} value={q.organisation} onChange={(e) => setQ({ ...q, organisation: e.target.value })} /></Field><Field label="Role"><input className={inputCls} required minLength={2} maxLength={100} value={q.role} onChange={(e) => setQ({ ...q, role: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" required className={inputCls} value={q.from_on} onChange={(e) => setQ({ ...q, from_on: e.target.value })} /></Field><Field label="To (empty if present)"><input type="date" className={inputCls} value={q.to_on} onChange={(e) => setQ({ ...q, to_on: e.target.value })} /></Field></div></>}
        <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ departments and designations ═════════════
export function DepartmentPages({ tab }: { tab: "department-list" | "add-department" }) {
  const l = useLoad(() => schoolFetch<{ campuses: { id: string; name: string }[]; staff: { id: string; name: string }[]; items: { id: string; name: string; head: string; campus: string; staff: number; status: string }[] }>(`${H}/departments`), []);
  const act = useAction(() => l.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [view, setView] = useState<{ id: string; name: string; head: string; campus: string; staff: number; status: string } | null>(null);
  const [f, setF] = useState({ name: "", head_id: "", campus_id: "" });
  const x = l.data; const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const a = all.filter((i) => i.status === "Active").length;
  if (tab === "add-department") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${H}/departments`, json("POST", { name: f.name, head_id: f.head_id || null, campus_id: f.campus_id || null })))) { setF({ name: "", head_id: "", campus_id: "" }); setMsg("Saved. It appears in the Department List."); } };
    return <div>{okBox(msg)}<FormCard title="Add Department" cols="lg:grid-cols-3" onSubmit={save} onDiscard={() => { setF({ name: "", head_id: "", campus_id: "" }); setMsg(""); }} busy={act.busy} error={l.error || act.error}>
      <Field label="Department"><input className={inputCls} required minLength={2} maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Head"><select className={inputCls} value={f.head_id} onChange={(e) => setF({ ...f, head_id: e.target.value })}><option value="">None yet</option>{x?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Campus"><select className={inputCls} value={f.campus_id} onChange={(e) => setF({ ...f, campus_id: e.target.value })}><option value="">Both</option>{x?.campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></FormCard></div>;
  }
  return (
    <div className="space-y-5" data-report><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <Tiles items={[{ label: "Departments", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Departments" noun="departments" search={search} onSearch={setSearch} exportName="departments" head={["Department", "Head", "Staff", "Campus", "Status"]} exportRows={rows.map((i) => [i.name, i.head, i.staff, i.campus, i.status])}
        extra={!all.length ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${H}/departments/from-staff`, json("POST", {})); setMsg(`${r.added} departments added from the staff records.`); })}>Add from staff records</button> : null}
        tableHead={["Department", "Head", "Staff", "Campus", "Status", ""]} empty={l.loading ? "Loading…" : "No departments yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.head || "—", <span key="s" className="block text-right">{i.staff}</span>, i.campus, <Chip key="t" tone={i.status === "Active" ? "good" : "mute"}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Head" v={view.head || "—"} /><Row k="Staff" v={view.staff} /><Row k="Campus" v={view.campus} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/departments/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal>
    </div>
  );
}
export function DesignationPages({ tab }: { tab: "designation-list" | "add-designation" }) {
  const l = useLoad(() => schoolFetch<{ items: { id: string; name: string; level: string; pay_band: string; staff: number; status: string }[] }>(`${H}/designations`), []);
  const act = useAction(() => l.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [view, setView] = useState<{ id: string; name: string; level: string; pay_band: string; staff: number; status: string } | null>(null);
  const [f, setF] = useState({ name: "", level: "L1", pay_band: "" });
  const all = l.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const a = all.filter((i) => i.status === "Active").length;
  if (tab === "add-designation") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${H}/designations`, json("POST", f)))) { setF({ name: "", level: "L1", pay_band: "" }); setMsg("Saved. It appears in the Designation List."); } };
    return <div>{okBox(msg)}<FormCard title="Add Designation" cols="lg:grid-cols-3" onSubmit={save} onDiscard={() => { setF({ name: "", level: "L1", pay_band: "" }); setMsg(""); }} busy={act.busy} error={l.error || act.error}>
      <Field label="Designation"><input className={inputCls} required minLength={2} maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Level"><select className={inputCls} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>{["L1", "L2", "L3", "L4", "L5", "L6"].map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Pay band"><input className={inputCls} maxLength={40} placeholder="₹1.2 – 1.6 L" value={f.pay_band} onChange={(e) => setF({ ...f, pay_band: e.target.value })} /></Field></FormCard></div>;
  }
  return (
    <div className="space-y-5" data-report><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <Tiles items={[{ label: "Designations", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Designations" noun="designations" search={search} onSearch={setSearch} exportName="designations" head={["Designation", "Level", "Staff", "Pay band", "Status"]} exportRows={rows.map((i) => [i.name, i.level, i.staff, i.pay_band, i.status])}
        extra={!all.length ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${H}/designations/from-staff`, json("POST", {})); setMsg(`${r.added} designations added from the staff records.`); })}>Add from staff records</button> : null}
        tableHead={["Designation", "Level", "Staff", "Pay band", "Status", ""]} empty={l.loading ? "Loading…" : "No designations yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.level, i.staff, i.pay_band || "—", <Chip key="t" tone={i.status === "Active" ? "good" : "mute"}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Level" v={view.level} /><Row k="Staff" v={view.staff} /><Row k="Pay band" v={view.pay_band || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/designations/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal>
    </div>
  );
}
