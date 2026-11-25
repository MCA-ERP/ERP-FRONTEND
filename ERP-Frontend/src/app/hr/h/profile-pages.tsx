"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { ContactForm, Field, type Profile } from "../../school/s/profile-pages";
import { Loading, day } from "../../teacher/t/dash-pages";

/** The signed-in person's own record. Everything here is scoped by the server to the signed-in profile. */
interface Emp { emp_code: string; designation: string; department: string; reports_to: string; joined_on: string | null; employment_type: string; campus: string; bank: string; pan: string; uan: string; esi: string }

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const FileBtn = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const tooBig = (f: File | undefined) => !!f && f.size > 5 * 1024 * 1024;
const small = `${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`;

const useMine = () => useLoad(async () => {
  const [p, e] = await Promise.all([schoolFetch<Profile>("/school/me/profile"), schoolFetch<Emp>("/hr/profile/employment").catch(() => null)]);
  return { p, e };
}, []);

function Header({ p, e }: { p: Profile; e: Emp | null }) {
  const joined = e?.joined_on ?? p.joined_on;
  return (
    <section className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid size-14 place-items-center rounded-full bg-[#dceff9] text-lg font-bold text-[#026f9b]">{initials(p.name)}</span>
      <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-900">{p.name}</p><p className="text-[13px] text-slate-500">{[e?.designation || p.designation, e?.department, e?.emp_code].filter(Boolean).join(" · ")}</p></div>
      <p className="text-xs text-slate-500">Joined {day(joined)}{p.campus ? ` · ${p.campus}` : ""}</p>
    </section>
  );
}

export function MyContact() {
  const { data, error, loading, reload } = useMine();
  return <div data-report><ErrorBanner message={error} /><Loading on={loading && !data} />{data && <><Header p={data.p} e={data.e} /><ContactForm p={data.p} onSaved={reload} /></>}</div>;
}

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="space-y-0.5 px-5 py-4">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-1 text-[13px]"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v || "—"}</dd></div>)}</dl>;

export function MyEmployment() {
  const { data, error, loading } = useMine();
  const e = data?.e;
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && <Header p={data.p} e={data.e} />}
      {data && !e && <ErrorBanner message="Your employment record could not be loaded." />}
      {e && (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Employment"><KV rows={[["Employee ID", e.emp_code], ["Designation", e.designation], ["Department", e.department], ["Reports to", e.reports_to], ["Date of joining", day(e.joined_on)], ["Employment type", e.employment_type], ["Campus", e.campus]]} /></Panel>
            <Panel title="Pay & statutory"><KV rows={[["Bank", e.bank], ["PAN", e.pan], ["UAN (PF)", e.uan], ["ESI", e.esi], ["Payslips", <Link key="p" href="/hr/profile/my-payslips" className="text-[#026f9b] hover:underline">My Payslips</Link>]]} /></Panel>
          </div>
          <p className="mt-5 rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">To change your bank account, designation or reporting manager, raise a request with HR. They update it in HR › Employee Profile.</p>
        </>
      )}
    </div>
  );
}

interface Qual { id: string; title: string; institution: string; year: number; result: string | null; status: string }
export function MyQualifications() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Qual[] }>("/hr/profile/qualifications"), []);
  const act = useAction(reload);
  const blank = { title: "", institution: "", year: String(new Date().getFullYear()), result: "", certificate_name: "" };
  const [f, setF] = useState(blank);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const items = data?.items ?? [];
  const add = async (ev: FormEvent) => {
    ev.preventDefault();
    if (await act.run(() => schoolFetch("/hr/profile/qualifications", json("POST", { title: f.title, institution: f.institution, year: Number(f.year), result: f.result, certificate_name: f.certificate_name || undefined })))) { setF(blank); setFileKey((k) => k + 1); }
  };
  return (
    <div data-report className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="My qualifications" sub={`${items.length} ${items.length === 1 ? "qualification" : "qualifications"}`} right={<ExportPrint name="my-qualifications" head={["Qualification", "Institution", "Year", "Result", "Status"]} rows={items.map((q) => [q.title, q.institution, q.year, q.result, q.status])} />}>
        <SimpleTable head={[{ h: "Qualification" }, { h: "Institution" }, { h: "Year" }, { h: "Result" }, { h: "Status" }]} empty={loading ? "Loading…" : "No qualifications added yet."}
          rows={items.map((q) => [<b key="t" className="font-semibold text-slate-900">{q.title}</b>, q.institution, q.year, q.result ?? "—", <Chip key="s" tone={q.status === "Verified" ? "good" : "warn"}>{q.status}</Chip>])} />
      </Panel>
      <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Add a qualification</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Qualification"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, MBA (HR)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Institution"><input className={inputCls} required minLength={2} maxLength={200} value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
          <Field label="Year"><input type="number" className={inputCls} required min={1950} max={2100} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></Field>
          <Field label="Result"><input className={inputCls} maxLength={100} placeholder="First class, 72%" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} /></Field>
          <Field label="Certificate" hint={fileErr || "PDF or photo"}><input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className={FileBtn} onChange={(e) => { const file = e.target.files?.[0]; if (tooBig(file)) { setFileErr("That file is over 5 MB."); e.target.value = ""; setF({ ...f, certificate_name: "" }); } else { setFileErr(""); setF({ ...f, certificate_name: file?.name ?? "" }); } }} /></Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={small} disabled={act.busy}>Add qualification</button></div>
      </form>
    </div>
  );
}

interface Doc { id: string | null; title: string; type: string; file_name: string; status: string }
export function MyDocuments() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Doc[]; missing: { title: string }[] }>("/hr/profile/documents"), []);
  const act = useAction(reload);
  const [fileErr, setFileErr] = useState("");
  const items = data?.items ?? []; const missing = data?.missing.length ?? 0;
  const upload = (d: Doc, file: File | undefined) => {
    if (!file) return;
    if (tooBig(file)) { setFileErr("That file is over 5 MB."); return; }
    setFileErr("");
    void act.run(() => schoolFetch("/hr/profile/documents", json("POST", { title: d.title, type: d.type, file_name: file.name })));
  };
  return (
    <div data-report className="space-y-5">
      <ErrorBanner message={error || act.error || fileErr} />
      <Loading on={loading && !data} />
      {missing > 0 && <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800"><b>{missing} document{missing > 1 ? "s" : ""} missing.</b> Upload {missing > 1 ? "them" : "it"} so HR can complete your file.</p>}
      {data && (
        <Panel title="My documents" sub={`${items.length} documents`} right={<ExportPrint name="my-documents" head={["Document", "File", "Status"]} rows={items.map((d) => [d.title, d.file_name, d.status])} />}>
          <SimpleTable head={[{ h: "Document" }, { h: "File" }, { h: "Status" }, { h: "" }]} empty="No documents on file yet." rows={items.map((d) => [<b key="t" className="font-semibold text-slate-900">{d.title}</b>, d.file_name || "—", <Chip key="s" tone={d.status === "Verified" ? "good" : d.status === "Missing" ? "bad" : "warn"}>{d.status}</Chip>,
            d.status === "Missing" ? <label key="u" className={`inline-block cursor-pointer rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] focus-within:ring-2 focus-within:ring-[#41afda] ${act.busy ? "pointer-events-none opacity-60" : ""}`}>Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" aria-label={`Upload ${d.title}`} onChange={(e) => { upload(d, e.target.files?.[0]); e.target.value = ""; }} /></label> : ""])} />
        </Panel>
      )}
    </div>
  );
}
