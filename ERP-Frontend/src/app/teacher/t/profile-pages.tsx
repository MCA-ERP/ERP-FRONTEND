"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "./head";
import { Empty, Loading, day, rupees } from "./dash-pages";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const Search_ = ({ q, onQ, label }: { q: string; onQ: (v: string) => void; label: string }) => <div className="border-b border-slate-100 px-5 py-3"><label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => onQ(e.target.value)} placeholder={label} aria-label={label} className="w-full bg-transparent outline-none" /></label></div>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FileBtn = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const tooBig = (f: File | undefined) => !!f && f.size > 5 * 1024 * 1024;

// ═════════════ personal details ═════════════
interface Profile {
  name: string; email: string; mobile: string | null; designation: string; campus: string | null; emp_code: string | null; subjects: string[]; class_teacher_of: string | null; joined_on: string | null; experience_years: number | null; show_mobile_to_parents: boolean;
  contact: { alt_phone: string; personal_email: string; home_address: string; emergency_name: string; emergency_relation: string; emergency_phone: string };
}
const RELATION = ["", "Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

function PersonHeader({ p }: { p: Profile }) {
  const line = [p.designation, p.subjects[0], p.emp_code, p.class_teacher_of ? `Class teacher of ${p.class_teacher_of}` : ""].filter(Boolean).join(" · ");
  return (
    <section className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid size-14 place-items-center rounded-full bg-[#dceff9] text-lg font-bold text-[#026f9b]">{initials(p.name)}</span>
      <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-900">{p.name}</p><p className="text-[13px] text-slate-500">{line}</p></div>
      <dl className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1 text-[12px]"><dt className="text-slate-500">Joined</dt><dd className="font-medium text-slate-900">{day(p.joined_on)}</dd><dt className="text-slate-500">Experience</dt><dd className="font-medium text-slate-900">{p.experience_years === null ? "—" : `${p.experience_years} years`}</dd><dt className="text-slate-500">Campus</dt><dd className="font-medium text-slate-900">{p.campus ?? "—"}</dd></dl>
    </section>
  );
}

export function Contact() {
  const { data: p, error, loading, reload } = useLoad(() => schoolFetch<Profile>("/teacher/profile"), []);
  const from = (x: Profile) => ({ mobile: x.mobile ?? "", ...x.contact, show_mobile_to_parents: x.show_mobile_to_parents });
  const [edit, setEdit] = useState<{ for: Profile; v: ReturnType<typeof from> } | null>(null);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const f = p ? (edit?.for === p ? edit.v : from(p)) : null;
  const setF = (v: ReturnType<typeof from> | null) => setEdit(p && v ? { for: p, v } : null);
  const set = (k: string, v: string | boolean) => { setF({ ...f!, [k]: v }); setSaved(false); };
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(false); if (await act.run(() => schoolFetch("/teacher/profile/contact", json("PUT", f)))) setSaved(true); };
  return (
    <div data-report>
      <Head title="Contact" subtitle="How the school and parents reach you. Your school email can't be changed here." />
      <ErrorBanner message={error} />
      <Loading on={loading && !p} />
      {p && f && (
        <>
          <PersonHeader p={p} />
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Contact details</h2></div>
            {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <L label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => set("mobile", e.target.value)} /></L>
              <L label="Alternate mobile"><input className={inputCls} maxLength={30} value={f.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} /></L>
              <L label="School email"><input className={inputCls} readOnly disabled value={p.email} /></L>
              <L label="Personal email"><input type="email" className={inputCls} maxLength={255} value={f.personal_email} onChange={(e) => set("personal_email", e.target.value)} /></L>
              <div className="sm:col-span-2 lg:col-span-4"><L label="Home address"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={f.home_address} onChange={(e) => set("home_address", e.target.value)} /></L></div>
              <L label="Emergency contact"><input className={inputCls} maxLength={150} value={f.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} /></L>
              <L label="Relationship"><select className={inputCls} value={f.emergency_relation} onChange={(e) => set("emergency_relation", e.target.value)}>{RELATION.map((b) => <option key={b} value={b}>{b || "—"}</option>)}</select></L>
              <L label="Emergency mobile"><input className={inputCls} maxLength={30} value={f.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} /></L>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5"><div className="flex-1"><p className="text-[13px] font-medium text-slate-900">Show my mobile to parents</p><p className="text-[11.5px] text-slate-500">Parents see only your school email when off</p></div><Toggle checked={f.show_mobile_to_parents} onChange={(v) => set("show_mobile_to_parents", v)} label="Show my mobile to parents" /></div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
              {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
              <button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit(null); setSaved(false); }}>Discard</button>
              <button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save contact details"}</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

interface Qual { id: string; title: string; subject: string | null; institution: string; year: number; result: string | null; status: string; certificate_name: string | null }
export function Qualification() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Qual[] }>("/teacher/profile/qualifications"), []);
  const who = useLoad(() => schoolFetch<{ subjects: string[] }>("/teacher/profile"), []);
  const act = useAction(reload);
  const blank = { title: "", subject: null as string | null, institution: "", year: String(new Date().getFullYear()), result: "", certificate_name: "" };
  const [f0, setF] = useState(blank);
  const f = { ...f0, subject: f0.subject ?? who.data?.subjects[0] ?? "" };
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Qual | null>(null);
  const items = useMemo(() => (data?.items ?? []).filter((x) => !q || `${x.title} ${x.subject} ${x.institution}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/teacher/profile/qualifications", json("POST", { title: f.title, subject: f.subject, institution: f.institution, year: Number(f.year), result: f.result, certificate_name: f.certificate_name || undefined })))) { setF({ ...blank, subject: f.subject }); setFileKey((k) => k + 1); }
  };
  return (
    <div data-report>
      <Head title="Qualification" subtitle="Your degrees and certificates. HR verifies anything you add." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Panel title="Qualifications" sub={`${data.items.length} ${data.items.length === 1 ? "qualification" : "qualifications"}`} right={<ExportPrint name="my-qualifications" head={["Qualification", "Subject", "Institution", "Year", "Result", "Status"]} rows={items.map((x) => [x.title, x.subject, x.institution, x.year, x.result, x.status])} />}>
            <Search_ q={q} onQ={setQ} label="Search qualifications" />
            <SimpleTable head={[{ h: "Qualification" }, { h: "Subject" }, { h: "Institution" }, { h: "Year" }, { h: "Result" }, { h: "Status" }, { h: "" }]} empty="No qualifications added yet." rows={items.map((x) => [x.title, x.subject ?? "—", x.institution, x.year, x.result ?? "—", <Chip key="s" tone={x.status === "Verified" ? "good" : "warn"}>{x.status}</Chip>, <button key="v" type="button" onClick={() => setView(x)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">View details</button>])} />
          </Panel>
          <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Add a qualification</h2></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
              <L label="Qualification"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, M.Sc." value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></L>
              <L label="Subject"><input className={inputCls} maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></L>
              <L label="Institution"><input className={inputCls} required minLength={2} maxLength={200} value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></L>
              <L label="Year"><input type="number" className={inputCls} required min={1950} max={2100} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></L>
              <L label="Result"><input className={inputCls} maxLength={100} placeholder="First class, 72%" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} /></L>
              <div className="sm:col-span-2"><L label="Certificate" hint={fileErr || "PDF or photo, up to 5 MB"}><input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className={FileBtn} onChange={(e) => { const file = e.target.files?.[0]; if (tooBig(file)) { setFileErr("That file is over 5 MB."); e.target.value = ""; setF({ ...f, certificate_name: "" }); } else { setFileErr(""); setF({ ...f, certificate_name: file?.name ?? "" }); } }} /></L></div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Add qualification</button></div>
          </form>
        </div>
      )}
      {view && <Modal open title={view.title} onClose={() => setView(null)}><KV rows={[["Subject", view.subject ?? "—"], ["Institution", view.institution], ["Year", view.year], ["Result", view.result ?? "—"], ["Certificate", view.certificate_name ?? "Not uploaded"], ["Status", <Chip key="s" tone={view.status === "Verified" ? "good" : "warn"}>{view.status}</Chip>]]} /></Modal>}
    </div>
  );
}

interface Doc { id: string | null; title: string; type: string; file_name: string; uploaded_on: string | null; valid_until: string | null; due_on: string | null; status: string }
export function Documents() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Doc[]; requirements: { title: string; type: string }[]; missing: { title: string; due_on: string | null }[] }>("/teacher/profile/documents"), []);
  const act = useAction(reload);
  const [pick, setPick] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Doc | null>(null);
  const req = data?.requirements ?? [];
  const chosen = req.find((r) => r.title === (pick || data?.missing[0]?.title || req[0]?.title));
  const items = useMemo(() => (data?.items ?? []).filter((d) => !q || `${d.title} ${d.type} ${d.status}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !chosen) { setFileErr("Choose a file to upload."); return; }
    if (await act.run(() => schoolFetch("/teacher/profile/documents", json("POST", { title: chosen.title, type: chosen.type, file_name: file.name })))) { setFile(null); setFileKey((k) => k + 1); setPick(""); }
  };
  const m = data?.missing ?? [];
  return (
    <div data-report>
      <Head title="Documents" subtitle="Documents HR keeps on file for you." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          {m.length > 0 && <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800"><b>{m.length} document{m.length > 1 ? "s" : ""} missing.</b> Upload your {m.map((x) => x.title.toLowerCase()).join(", ")}{m[0].due_on ? ` by ${day(m[0].due_on)}` : ""}.</p>}
          <Panel title="My documents" sub={`${data.items.length} documents`} right={<ExportPrint name="my-documents" head={["Document", "Type", "Uploaded", "Valid till", "Status"]} rows={items.map((d) => [d.title, d.type, d.uploaded_on ?? "", d.valid_until ?? "", d.status])} />}>
            <Search_ q={q} onQ={setQ} label="Search my documents" />
            <SimpleTable head={[{ h: "Document" }, { h: "Type" }, { h: "Uploaded" }, { h: "Valid till" }, { h: "Status" }, { h: "" }]} empty="No documents on file yet." rows={items.map((d) => [d.title, d.type, d.uploaded_on ? day(d.uploaded_on) : "—", d.valid_until ? day(d.valid_until) : d.due_on ? `Due ${day(d.due_on)}` : "—", <Chip key="s" tone={d.status === "Verified" ? "good" : d.status === "Missing" ? "bad" : "warn"}>{d.status}</Chip>,
              <span key="a" className="flex gap-2">{d.status === "Missing" && <button type="button" onClick={() => { setPick(d.title); document.getElementById("doc-upload")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67]">Upload</button>}<button type="button" onClick={() => setView(d)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">View details</button></span>])} />
          </Panel>
          <form id="doc-upload" onSubmit={upload} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Upload a document</h2></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <L label="Document"><select className={inputCls} value={chosen?.title ?? ""} onChange={(e) => setPick(e.target.value)}>{req.map((r) => <option key={r.title} value={r.title}>{r.title}</option>)}</select></L>
              <L label="File" hint={fileErr || "PDF or photo, up to 5 MB"}><input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className={FileBtn} onChange={(e) => { const f = e.target.files?.[0] ?? null; if (tooBig(f ?? undefined)) { setFileErr("That file is over 5 MB."); e.target.value = ""; setFile(null); } else { setFileErr(""); setFile(f); } }} /></L>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setFile(null); setFileKey((k) => k + 1); setFileErr(""); }}>Discard</button><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Upload</button></div>
          </form>
        </div>
      )}
      {view && <Modal open title={view.title} onClose={() => setView(null)}><KV rows={[["Type", view.type], ["File", view.file_name || "Not uploaded"], ["Uploaded", view.uploaded_on ? day(view.uploaded_on) : "—"], ["Valid till", view.valid_until ? day(view.valid_until) : "—"], ["Status", view.status]]} /></Modal>}
    </div>
  );
}

// ═════════════ payslips ═════════════
interface Slip { month: string; school: string; employee: string; emp_code: string | null; designation: string; bank: string | null; days_paid: number; earnings: [string, number][]; deductions: [string, number][]; gross: number; total_deductions: number; net: number; paid: boolean }
interface Pay { months: { month: string; net: number; status: string }[]; selected: string | null; slip: Slip | null; this_year: { net: number; count: number }; bank_last4: string | null; bank_name: string | null }
const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export function Payslips() {
  const [month, setMonth] = useState("");
  const { data, error, loading } = useLoad(() => schoolFetch<Pay>(`/teacher/payslips${month ? `?month=${month}` : ""}`), [month]);
  const d = data;
  const s = d?.slip;
  const printSlip = () => { if (!s) return; armPrint(); downloadCsv(`payslip-${s.month}`, ["Item", "Type", "Amount"], [...s.earnings.map(([k, v]) => [k, "Earning", v]), ...s.deductions.map(([k, v]) => [k, "Deduction", v]), ["Net pay", "", s.net]]); };
  const all = () => d && downloadCsv("my-payslips", ["Month", "Net pay", "Status"], d.months.map((m) => [monthName(m.month), m.net, m.status]));
  const one = (m: string) => { setMonth(m); setTimeout(() => window.dispatchEvent(new Event("resize")), 0); };
  return (
    <div data-report>
      <Head title="Payslips" subtitle="Your monthly payslips. Download any month as a PDF for loans, visas or tax filing." action={<span className="flex gap-2"><button type="button" disabled={!d?.months.length} className={whiteBtn} onClick={all}>Download all ({d?.months.length ?? 0})</button><button type="button" disabled={!s} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28] disabled:opacity-60" onClick={printSlip}>Download PDF</button></span>} />
      <ErrorBanner message={error} />
      <Loading on={loading && !d} />
      {d && !d.months.length && <Panel title="My payslips" sub="0 payslips"><Empty text="No payslips yet. They appear here once payroll is approved and paid for a month." /></Panel>}
      {d && d.months.length > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Month<select aria-label="Month" value={d.selected ?? ""} onChange={(e) => one(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{d.months.map((m) => <option key={m.month} value={m.month}>{monthName(m.month)}</option>)}</select></label>
            {s && <span className="ml-auto text-[12px] text-slate-500">{s.employee}{s.emp_code ? ` · ${s.emp_code}` : ""}</span>}
          </div>
          {s && <Tiles items={[{ label: `Net pay · ${new Date(`${s.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long" })}`, value: rupees(s.net), sub: s.bank ? `Credited to ${s.bank}` : undefined }, { label: "Gross", value: rupees(s.gross), sub: "Before deductions" }, { label: "Deductions", value: rupees(s.total_deductions), sub: "PF, ESI, tax" }, { label: "This year", value: rupees(d.this_year.net), sub: `${d.this_year.count} payslips` }]} />}
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {s && (
              <Panel title="Payslip" sub={monthName(s.month)} right={<button type="button" className="rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67]" onClick={printSlip}>Download PDF</button>}>
                <div className="m-5 rounded-lg border border-slate-200 p-5 text-[12.5px]">
                  <p className="text-center text-[15px] font-bold text-slate-900">{s.school}</p><p className="mb-3 border-b-2 border-[#0294CE] pb-2 text-center text-[11px] text-slate-500">Payslip for {monthName(s.month)}</p>
                  <KV rows={[["Employee", `${s.employee}${s.emp_code ? ` · ${s.emp_code}` : ""}`], ["Designation", s.designation], ["Bank", s.bank ?? "—"], ["Days paid", s.days_paid]]} />
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <SimpleTable head={[{ h: "Earnings" }, { h: "₹", right: true }]} rows={[...s.earnings.map(([k, v]) => [k, rupees(v)]), [<b key="g">Gross</b>, <b key="gv">{rupees(s.gross)}</b>]]} />
                    <SimpleTable head={[{ h: "Deductions" }, { h: "₹", right: true }]} rows={[...s.deductions.map(([k, v]) => [k, rupees(v)]), [<b key="t">Total</b>, <b key="tv">{rupees(s.total_deductions)}</b>]]} />
                  </div>
                  <p className="mt-3 text-right font-semibold text-slate-900">Net pay {rupees(s.net)}</p><p className="mt-2 text-[11px] text-slate-500">Computer-generated payslip. No signature needed.</p>
                </div>
              </Panel>
            )}
            <Panel title="All my payslips" sub={`${d.months.length} months`} right={<ExportPrint name="my-payslips" head={["Month", "Net pay", "Status"]} rows={d.months.map((m) => [monthName(m.month), m.net, m.status])} />}>
              <SimpleTable head={[{ h: "Month" }, { h: "Net pay" }, { h: "Status" }, { h: "" }]} rows={d.months.map((m) => [<b key="m" className="font-semibold text-slate-900">{monthName(m.month)}</b>, rupees(m.net), <Chip key="s" tone={m.status === "Paid" ? "good" : "info"}>{m.status}</Chip>, <span key="a" className="flex gap-1.5"><button type="button" onClick={() => one(m.month)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">View</button><button type="button" onClick={() => { one(m.month); setTimeout(printSlip, 600); }} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">Download</button></span>])} />
            </Panel>
          </div>
          <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">The next payslip appears here once that month&apos;s payroll is approved and paid.</p>
        </div>
      )}
    </div>
  );
}

// ═════════════ 360° feedback ═════════════
interface Peers { cycle: string; questions: string[]; items: { ratee_id: string; name: string; role: string; subject: string; status: string; scores: Record<string, number> }[] }
function PeerCard({ p, questions, onDone }: { p: Peers["items"][number]; questions: string[]; onDone: () => void }) {
  const [s, setS] = useState<Record<string, number>>(p.scores ?? {});
  const act = useAction(onDone);
  const done = p.status === "Submitted";
  const full = questions.every((q) => s[q]);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"><h2 className="text-[14px] font-semibold text-slate-900">{p.name}</h2><span className="text-[11px] text-slate-500">{[p.role, p.subject].filter(Boolean).join(" · ")}</span><span className="ml-auto"><Chip tone={done ? "good" : "warn"}>{done ? "Submitted" : "Due"}</Chip></span></div>
      <ErrorBanner message={act.error} />
      <div className="px-5 py-2">
        {questions.map((q) => (
          <div key={q} className="flex items-center gap-3 border-b border-slate-100 py-2 text-[12.5px] last:border-0"><span className="flex-1 text-slate-900">{q}</span>
            <span role="radiogroup" aria-label={`${p.name}: ${q}`} className="flex gap-3">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex items-center gap-1 text-slate-600"><input type="radio" name={`${p.ratee_id}-${q}`} disabled={done} checked={s[q] === n} onChange={() => setS({ ...s, [q]: n })} className="size-3.5 accent-[#0294CE]" />{n}</label>)}</span>
          </div>
        ))}
      </div>
      {!done && <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" disabled={!full || act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/feedback/peers/${p.ratee_id}`, json("POST", { scores: s })))}>Submit</button></div>}
    </section>
  );
}

export function PeerFeedback() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Peers>("/teacher/feedback/peers"), []);
  return (
    <div data-report>
      <Head title="Peer Feedback" subtitle="Rate three colleagues the school picked for you. Answers are anonymous: teachers see only the average from all their peers." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && !data.items.length && <Panel title="Colleagues to rate"><Empty text="There are no colleagues to rate yet." /></Panel>}
      <div className="space-y-5">{data?.items.map((p) => <PeerCard key={p.ratee_id} p={p} questions={data.questions} onDone={reload} />)}</div>
    </div>
  );
}

interface Results { cycle: string; score: number | null; responses: number; groups: { key: string; label: string; weight: number; score: number | null; n: number }[]; strongest: { label: string; score: number } | null; to_work_on: { label: string; score: number } | null }
export function Feedback360() {
  const { data, error, loading } = useLoad(() => schoolFetch<Results>("/teacher/feedback/results"), []);
  const cyc = data ? data.cycle.replace("-", "–") : "";
  const by = data?.groups.filter((g) => g.n > 0 && g.key !== "self" && g.key !== "hod").map((g) => `${g.label.toLowerCase()} ${g.n}`) ?? [];
  const hod = data?.groups.find((g) => g.key === "hod");
  return (
    <div data-report>
      <Head title="My 360° Results" subtitle={`Your 360° feedback for ${cyc || "this year"}, shared once everyone has answered. Individual answers stay anonymous.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (data.score === null ? <Panel title="By group" sub="Out of 5"><Empty text="Your 360° results appear here once people have given feedback." /></Panel> : (
        <div className="space-y-5">
          <Tiles items={[{ label: "360° score", value: <>{data.score.toFixed(2)} <span className="text-base font-semibold">/ 5</span></>, sub: "weighted" }, { label: "Responses", value: data.responses, sub: [...by, hod?.n ? "HOD 1" : ""].filter(Boolean).join(" · ") }, { label: "Strongest", value: data.strongest?.label ?? "—", sub: data.strongest ? `${data.strongest.score}/5` : undefined }, { label: "To work on", value: data.to_work_on?.label ?? "—", sub: data.to_work_on ? `${data.to_work_on.score}/5` : undefined }]} />
          <Panel title="By group" sub="Out of 5">
            <div className="space-y-3 px-5 py-4">{data.groups.map((g) => <div key={g.key} className="flex items-center gap-3 text-[12.5px]"><span className="w-28 text-slate-900">{g.label} ({g.weight}%)</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${((g.score ?? 0) / 5) * 100}%` }} /></span><span className="w-8 text-right tabular-nums text-slate-700">{g.score ?? "—"}</span></div>)}</div>
          </Panel>
          <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">Comments from students and parents are summarised by HR before you see them, so no one can be identified.</p>
        </div>
      ))}
    </div>
  );
}

interface Comp { who: { name: string; role: string; emp_code: string | null; subject: string }; items: { competency: string; level: number; expected: number; training: string; gap: number }[] }
export function Competencies() {
  const { data, error, loading } = useLoad(() => schoolFetch<Comp>("/teacher/feedback/competencies"), []);
  const n = data?.items.length ?? 0;
  return (
    <div data-report>
      <Head title="My Competencies" subtitle={`Your level in ${n ? (["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? n) : "the"} teaching competencies against what your role expects, from classroom observations and 360° feedback, with training suggested for each gap.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <p className="text-[11px] text-slate-500">{[data.who.emp_code, data.who.subject].filter(Boolean).join(" · ")}</p>
          <Panel title={`Competencies · ${data.who.name}`} sub={`${data.who.role} · expected level shown as the outline`}>
            {!data.items.length ? <Empty text="Your competency levels have not been recorded yet." /> : (
              <ul className="px-5">{data.items.map((c) => (
                <li key={c.competency} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-[12.5px] last:border-0">
                  <span className="w-44 text-slate-900">{c.competency}</span>
                  <span className="flex gap-1" role="img" aria-label={`Level ${c.level} of 5, expected ${c.expected}`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={`size-3 rounded-full ${i <= c.level ? "bg-[#026f9b]" : "bg-slate-200"} ${i === c.expected ? "ring-2 ring-[#e8a317] ring-offset-1" : ""}`} />)}</span>
                  <span className={`w-16 font-medium ${c.gap ? "text-[#8a5a0b]" : "text-[#065740]"}`}>{c.gap ? `Gap ${c.gap}` : "Meets"}</span><span className="flex-1 text-slate-600">{c.training || "—"}</span>
                </li>))}</ul>
            )}
          </Panel>
          <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">Levels come from the HOD&apos;s classroom observations, the 360° feedback and the teacher&apos;s self-assessment. Gaps feed the training plan for next term.</p>
        </div>
      )}
    </div>
  );
}

// ═════════════ claims ═════════════
interface Rule { ctype: string; limit_amount: number; per: string; receipt_above: number; approver: string; limit_text: string; receipt_text: string }
interface Claim { id: string; code: string; ctype: string; description: string; claim_on: string; amount: number; receipts: number; status: string; paid_on: string | null }
const claimTone = (s: string) => (s === "Paid" || s === "Approved" ? "good" : s === "Rejected" ? "bad" : "info") as "good" | "bad" | "info";
export function Claims({ view, go, empty = "You have not submitted a claim yet." }: { view: "submit" | "list"; go: (tab: string) => void; empty?: string }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ rules: Rule[]; items: Claim[] }>("/teacher/claims"), []);
  const today = new Date().toLocaleDateString("en-CA");
  const blank = { ctype: "", claim_on: today, amount: "", description: "" };
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const [q, setQ] = useState("");
  const act = useAction(reload);
  const rules = data?.rules ?? [];
  const rule = rules.find((r) => r.ctype === (f.ctype || rules[0]?.ctype));
  const items = useMemo(() => (data?.items ?? []).filter((c) => !q || `${c.code} ${c.ctype} ${c.description} ${c.status}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/teacher/claims", json("POST", { ctype: rule?.ctype, claim_on: f.claim_on, amount: Number(f.amount), description: f.description, receipts: files.length })))) { setF(blank); setFiles([]); setFileKey((k) => k + 1); go("my-claims"); }
  };
  if (view === "submit") {
    return (
      <div data-report>
        <Head title="Submit a Claim" subtitle="Claim money you spent for the school. Add a photo of each bill; you'll be paid with your next salary once approved." />
        <ErrorBanner message={error} />
        <Loading on={loading && !data} />
        {data && (
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New claim</h2></div>
            <div className="space-y-4 p-5">
              {act.error && <ErrorBanner message={act.error} />}
              <div className="grid gap-4 sm:grid-cols-3">
                <L label="Type"><select className={inputCls} value={rule?.ctype ?? ""} onChange={(e) => setF({ ...f, ctype: e.target.value })}>{rules.map((r) => <option key={r.ctype} value={r.ctype}>{r.ctype}</option>)}</select></L>
                <L label="Date spent"><input type="date" className={inputCls} required max={today} value={f.claim_on} onChange={(e) => setF({ ...f, claim_on: e.target.value })} /></L>
                <L label="Amount (₹)"><input type="number" className={inputCls} required min={1} step={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></L>
              </div>
              <L label="What was it for?"><input className={inputCls} required minLength={3} maxLength={200} placeholder="For example, cab to the CBSE regional office for board registrations" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></L>
              <L label="Bills and receipts" hint={fileErr}><input key={fileKey} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className={FileBtn} onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.some((x) => tooBig(x))) { setFileErr("Each file must be 5 MB or less."); e.target.value = ""; setFiles([]); } else { setFileErr(""); setFiles(list); } }} /></L>
              {rule && <p className="text-[12px] text-slate-600"><b>{rule.ctype}:</b> up to {rule.limit_text}; receipts needed {rule.receipt_text.toLowerCase()}; approved by {rule.approver.startsWith("HOD") ? "your " : "the "}{rule.approver}.</p>}
            </div>
            <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFiles([]); setFileKey((k) => k + 1); }}>Clear</button><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Sending…" : "Submit claim"}</button></div>
          </form>
        )}
      </div>
    );
  }
  return (
    <div data-report>
      <Head title="My Claims" subtitle="Your claims and where each one is." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="My claims" sub={`${data.items.length} ${data.items.length === 1 ? "claim" : "claims"}`} right={<ExportPrint name="my-claims" head={["Claim", "Type", "For", "Date", "Amount", "Status"]} rows={items.map((c) => [c.code, c.ctype, c.description, c.claim_on, c.amount, c.status])} />}>
          <Search_ q={q} onQ={setQ} label="Search my claims" />
          <SimpleTable head={[{ h: "Claim" }, { h: "Type" }, { h: "For" }, { h: "Date" }, { h: "Amount" }, { h: "Status" }]} empty={empty} rows={items.map((c) => [c.code, c.ctype, c.description, day(c.claim_on), rupees(c.amount), <Chip key="s" tone={claimTone(c.status)}>{c.status}</Chip>])} />
        </Panel>
      )}
    </div>
  );
}

// ═════════════ appraisal ═════════════
interface Appr { cycle: string; reviewer: string; status: string; locked: boolean; self_score: number | null; reviewer_score: number | null; final_score: number | null; goals: string; submitted_on: string | null; kras: { id: string; area: string; weight: number; measure: string; score: number | null; evidence: string }[] }
export function Appraisal({ view, go }: { view: "self" | "kras"; go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Appr>("/teacher/appraisal"), []);
  type Ls = Record<string, { score: number; evidence: string }>;
  const [edit, setEdit] = useState<{ for: Appr; lines: Ls; goals: string } | null>(null);
  const act = useAction(reload);
  const lines: Ls = data ? (edit?.for === data ? edit.lines : Object.fromEntries(data.kras.map((k) => [k.id, { score: k.score ?? 0, evidence: k.evidence }]))) : {};
  const goals = data ? (edit?.for === data ? edit.goals : data.goals) : "";
  const setLines = (l: Ls) => data && setEdit({ for: data, lines: l, goals });
  const setGoals = (g: string) => data && setEdit({ for: data, lines, goals: g });
  const cyc = data ? data.cycle.replace("-", "–") : "";
  const ready = !!data && data.kras.length > 0 && data.kras.every((k) => (lines[k.id]?.score ?? 0) > 0);
  const submit = async () => { if (await act.run(() => schoolFetch("/teacher/appraisal/self", json("POST", { goals, lines: data!.kras.map((k) => ({ kra_id: k.id, score: lines[k.id].score, evidence: lines[k.id].evidence })) })))) go("my-kras"); };
  if (view === "kras") {
    return (
      <div data-report>
        <Head title="My KRAs" subtitle="Your KRAs, how they're measured and where your appraisal stands." />
        <ErrorBanner message={error} />
        <Loading on={loading && !data} />
        {data && (
          <div className="space-y-5">
            <Tiles items={[{ label: "Self-score", value: data.self_score ?? "—" }, { label: "Reviewer", value: data.reviewer_score ?? "—", sub: data.reviewer || undefined }, { label: "Final", value: data.final_score ?? "—" }, { label: "Status", value: data.status }]} />
            <Panel title="My KRAs" sub={`${data.kras.length} areas`} right={<ExportPrint name="my-kras" head={["Key result area", "Weight", "How it's measured"]} rows={data.kras.map((k) => [k.area, `${k.weight}%`, k.measure])} />}>
              <SimpleTable head={[{ h: "Key result area" }, { h: "Weight" }, { h: "How it's measured" }]} empty="Your school has not set KRAs for teachers yet." rows={data.kras.map((k) => [<b key="a" className="font-semibold text-slate-900">{k.area}</b>, `${k.weight}%`, <span key="m" className="whitespace-normal">{k.measure}</span>])} />
            </Panel>
          </div>
        )}
      </div>
    );
  }
  return (
    <div data-report>
      <Head title="Self-Appraisal" subtitle={`Score yourself against your KRAs and add evidence.${data?.reviewer ? ` Your reviewer, ${data.reviewer}, scores you next.` : ""}`} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && !data.kras.length && <Panel title="Self-appraisal"><Empty text="Your school has not set KRAs for teachers yet." /></Panel>}
      {data && data.kras.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Self-appraisal {cyc}</h2><span className="text-xs text-slate-500">Teacher KRAs</span></div>
          {data.locked && <p className="mx-5 mt-4 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">Your self-appraisal went to your reviewer{data.submitted_on ? ` on ${day(data.submitted_on)}` : ""}. It can no longer be changed.</p>}
          <div className="divide-y divide-slate-100">
            {data.kras.map((k) => (
              <div key={k.id} className="px-5 py-3">
                <div className="flex items-start gap-3"><div className="flex-1"><p className="text-[13px] font-semibold text-slate-900">{k.area} · {k.weight}%</p><p className="text-[11px] text-slate-500">{k.measure}</p></div>
                  <span role="radiogroup" aria-label={`${k.area} score`} className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={lines[k.id]?.score === n} aria-label={`${n} of 5`} disabled={data.locked} onClick={() => setLines({ ...lines, [k.id]: { ...(lines[k.id] ?? { evidence: "" }), score: n } })} className={`text-xl leading-none ${n <= (lines[k.id]?.score ?? 0) ? "text-[#e8a317]" : "text-slate-300 hover:text-[#e8a317]"} disabled:hover:text-slate-300`}>★</button>)}</span></div>
                <textarea className={`${inputCls} mt-2 min-h-[2.5rem]`} rows={1} maxLength={1000} disabled={data.locked} placeholder="Evidence: results, observations, certificates…" aria-label={`${k.area} evidence`} value={lines[k.id]?.evidence ?? ""} onChange={(e) => setLines({ ...lines, [k.id]: { ...(lines[k.id] ?? { score: 0 }), evidence: e.target.value } })} />
              </div>
            ))}
            <div className="px-5 py-3"><L label="Goals for next year"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={1500} disabled={data.locked} placeholder="For example, take the Olympiad batch to 70% average" value={goals} onChange={(e) => setGoals(e.target.value)} /></L></div>
          </div>
          {!data.locked && <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" disabled={!ready || act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void submit()}>{act.busy ? "Sending…" : "Submit self-appraisal"}</button></div>}
        </section>
      )}
    </div>
  );
}
