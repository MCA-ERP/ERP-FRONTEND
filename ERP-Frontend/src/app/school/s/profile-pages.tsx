"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { NOT_YET, day } from "./dash-pages";

export interface Profile {
  name: string; email: string; mobile: string | null; designation: string; joined_on: string; campus: string | null; school: string | null;
  contact: { alt_phone: string; personal_email: string; date_of_birth: string; blood_group: string; home_address: string; emergency_name: string; emergency_relation: string; emergency_phone: string };
}
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>
);

function Header({ p }: { p: Profile }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid size-14 place-items-center rounded-full bg-[#dceff9] text-lg font-bold text-[#026f9b]">{initials(p.name)}</span>
      <div className="min-w-0 flex-1"><p className="text-lg font-bold text-slate-900">{p.name}</p><p className="text-[13px] text-slate-500">{p.designation}{p.school ? ` · ${p.school}` : ""}</p></div>
      <p className="text-xs text-slate-500">Joined {day(p.joined_on)}{p.campus ? ` · ${p.campus}` : ""}</p>
    </div>
  );
}

export type PersonalTab = "contact" | "employment" | "qualification" | "documents";
export function PersonalDetails({ tab }: { tab: PersonalTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Profile>("/school/me/profile"), []);
  return (
    <div data-report>
      <ErrorBanner message={error} />
      {loading && !data && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
      {data && <Header p={data} />}
      {data && tab === "contact" && <ContactForm p={data} onSaved={reload} />}
      {data && tab === "employment" && <Employment p={data} />}
      {data && tab === "qualification" && <Qualifications />}
      {data && tab === "documents" && <Documents />}
    </div>
  );
}

const BLOOD = ["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const RELATION = ["", "Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

export function ContactForm({ p, onSaved }: { p: Profile; onSaved: () => void }) {
  const fromProfile = () => ({ mobile: p.mobile ?? "", ...p.contact });
  const [f, setF] = useState(fromProfile);
  const [saved, setSaved] = useState(false);
  const act = useAction(onSaved);
  useEffect(() => { setF(fromProfile()); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setSaved(false); };
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(false); if (await act.run(() => schoolFetch("/school/me/contact", json("PUT", f)))) setSaved(true); };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Contact details</h2></div>
      {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => set("mobile", e.target.value)} /></Field>
        <Field label="Alternate mobile"><input className={inputCls} maxLength={30} value={f.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} /></Field>
        <Field label="Official email" hint="Set by the school"><input className={inputCls} readOnly disabled value={p.email} /></Field>
        <Field label="Personal email"><input type="email" className={inputCls} maxLength={255} value={f.personal_email} onChange={(e) => set("personal_email", e.target.value)} /></Field>
        <Field label="Date of birth"><input type="date" className={inputCls} value={f.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
        <Field label="Blood group"><select className={inputCls} value={f.blood_group} onChange={(e) => set("blood_group", e.target.value)}>{BLOOD.map((b) => <option key={b} value={b}>{b || "—"}</option>)}</select></Field>
        <div className="sm:col-span-2 lg:col-span-5"><Field label="Home address"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={f.home_address} onChange={(e) => set("home_address", e.target.value)} /></Field></div>
        <Field label="Emergency contact"><input className={inputCls} maxLength={150} value={f.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} /></Field>
        <Field label="Relationship"><select className={inputCls} value={f.emergency_relation} onChange={(e) => set("emergency_relation", e.target.value)}>{RELATION.map((b) => <option key={b} value={b}>{b || "—"}</option>)}</select></Field>
        <Field label="Emergency mobile"><input className={inputCls} maxLength={30} value={f.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} /></Field>
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
        {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(fromProfile()); setSaved(false); }}>Discard</button>
        <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save contact details"}</button>
      </div>
    </form>
  );
}

const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 px-5">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-3 text-[13px]"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;

function Employment({ p }: { p: Profile }) {
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Employment"><KV rows={[["Employee ID", "—"], ["Designation", p.designation || "—"], ["Department", "—"], ["Reports to", "—"], ["Date of joining", day(p.joined_on)], ["Employment type", "—"], ["Campus", p.campus ?? "—"]]} /></Panel>
        <Panel title="Pay & statutory"><KV rows={[["Bank", "—"], ["PAN", "—"], ["UAN (PF)", "—"], ["ESI", "—"], ["Payslips", NOT_YET]]} /></Panel>
      </div>
      <p className="mt-5 rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">To change your bank account, designation or reporting manager, raise a request with HR. They update it in HR › Employee Profile.</p>
    </>
  );
}

interface Qual { id: string; title: string; institution: string; year: number; result: string | null; status: "Pending" | "Verified" }
function Qualifications() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Qual[] }>("/school/me/qualifications"), []);
  const act = useAction(reload);
  const [f, setF] = useState({ title: "", institution: "", year: String(new Date().getFullYear()), result: "" });
  const items = data?.items ?? [];
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(() => schoolFetch("/school/me/qualifications", json("POST", { title: f.title, institution: f.institution, year: Number(f.year), result: f.result })));
    if (ok) setF({ ...f, title: "", institution: "", result: "" });
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="My qualifications" sub={`${items.length} ${items.length === 1 ? "qualification" : "qualifications"}`} right={<ExportPrint name="my-qualifications" head={["Qualification", "Institution", "Year", "Result", "Status"]} rows={items.map((q) => [q.title, q.institution, q.year, q.result, q.status])} />}>
        <SimpleTable head={[{ h: "Qualification" }, { h: "Institution" }, { h: "Year" }, { h: "Result" }, { h: "Status" }]} empty={loading ? "Loading…" : "No qualifications added yet."}
          rows={items.map((q) => [<b key="t" className="font-semibold text-slate-900">{q.title}</b>, q.institution, q.year, q.result ?? "—", <Chip key="s" tone={q.status === "Verified" ? "good" : "warn"}>{q.status}</Chip>])} />
      </Panel>
      <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Add a qualification</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Qualification"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, MBA (HR)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Institution"><input className={inputCls} required minLength={2} maxLength={200} value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
          <Field label="Year"><input type="number" className={inputCls} required min={1950} max={2100} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></Field>
          <Field label="Result"><input className={inputCls} maxLength={100} placeholder="First class, 72%" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Add qualification</button></div>
      </form>
    </div>
  );
}

function Documents() {
  return (
    <Panel title="My documents" sub="0 documents" right={<ExportPrint name="my-documents" head={["Document", "File", "Status"]} rows={[]} />}>
      <SimpleTable head={[{ h: "Document" }, { h: "File" }, { h: "Status" }]} empty="No documents on file yet. Uploading will be available once file storage is set up." rows={[]} />
    </Panel>
  );
}
