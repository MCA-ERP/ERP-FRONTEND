"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, mask, pct, todayIso, useRegister, useStaff } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useGoTab } from "./tab-context";

const CLASSES = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SOURCES = ["Website", "Referral", "Walk-in", "Phone", "Front office", "Admission fair", "Social media"];
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";

// ═════════════ Admission enquiry ═════════════
interface AEnquiry { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; counsellor: string | null; assigned_name: string | null; enquiry_date: string; status: "New" | "Follow-up" | "Converted" | "Closed" }
const aeTone = (s: AEnquiry["status"]): "warn" | "mute" | "good" => (s === "New" ? "warn" : s === "Converted" ? "good" : "mute");

export type AdmEnquiryTab = "new-enquiry" | "enquiry-list" | "enquiry-follow-up";
export function AdmissionEnquiryPages({ tab }: { tab: AdmEnquiryTab }) {
  return tab === "new-enquiry" ? <NewAdmEnquiry /> : <AdmEnquiryList followOnly={tab === "enquiry-follow-up"} />;
}

function NewAdmEnquiry() {
  const go = useGoTab();
  const staff = useStaff();
  const blank = { child: "", class_sought: CLASSES[0], parent_name: "", mobile: "", source: "Website", counsellor: "", enquiry_date: todayIso() };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/adm-enquiries", json("POST", { ...f, counsellor: f.counsellor || null })))) { setF(blank); go("enquiry-list"); } };
  return (
    <FormCard title="New Enquiry" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error || staff.error}>
      <Field label="Child"><input className={inputCls} required maxLength={150} value={f.child} onChange={(e) => setF({ ...f, child: e.target.value })} /></Field>
      <Field label="Class sought"><select className={inputCls} value={f.class_sought} onChange={(e) => setF({ ...f, class_sought: e.target.value })}>{CLASSES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Parent"><input className={inputCls} required maxLength={150} value={f.parent_name} onChange={(e) => setF({ ...f, parent_name: e.target.value })} /></Field>
      <Field label="Mobile"><input className={inputCls} maxLength={30} inputMode="tel" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
      <Field label="Source"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Counsellor"><select className={inputCls} value={f.counsellor} onChange={(e) => setF({ ...f, counsellor: e.target.value })}><option value="">Nobody yet</option>{(staff.data?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Date"><input type="date" className={inputCls} value={f.enquiry_date} onChange={(e) => setF({ ...f, enquiry_date: e.target.value })} /></Field>
    </FormCard>
  );
}

function AdmEnquiryList({ followOnly }: { followOnly: boolean }) {
  const { rows: all, loading, error, reload } = useRegister<AEnquiry>("adm-enquiries");
  const act = useAction(reload);
  const go = useGoTab();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<AEnquiry | null>(null);
  const base = followOnly ? all.filter((r) => r.status === "Follow-up") : all;
  const rows = base.filter((r) => has(r, search));
  const n = (s: AEnquiry["status"]) => base.filter((r) => r.status === s).length;
  const canConvert = (r: AEnquiry) => r.status === "New" || r.status === "Follow-up";
  const convert = async (r: AEnquiry) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-enquiries/${r.id}/convert`, json("POST", {})))) { setView(null); window.alert(`${r.child} is now an application. Open Admission Application → Application List to see it.`); } };
  const set = async (r: AEnquiry, status: AEnquiry["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-enquiries/${r.id}`, json("PATCH", { status })))) setView(null); };
  void go;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={followOnly ? [{ label: "Admission enquiries", value: base.length, sub: "All records" }, { label: "Follow-up", value: n("Follow-up"), sub: pct(n("Follow-up"), base.length) }]
        : [{ label: "Admission enquiries", value: base.length, sub: "All records" }, { label: "New", value: n("New"), sub: pct(n("New"), base.length) }, { label: "Follow-up", value: n("Follow-up"), sub: pct(n("Follow-up"), base.length) }, { label: "Converted", value: n("Converted"), sub: pct(n("Converted"), base.length) }]} />
      <ListPanel title="Admission enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName="admission-enquiries" head={["Enquiry no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Counsellor", "Date", "Status"]}
        exportRows={rows.map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.mobile, r.source, r.assigned_name, day(r.enquiry_date), r.status])}
        tableHead={["Enquiry no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Counsellor", "Date", "Status", ""]} empty={loading ? "Loading…" : "No admission enquiries yet."}
        rows={rows.map((r) => [r.code, <b key="c" className="font-semibold text-[#026f9b]">{r.child}</b>, r.class_sought, r.parent_name, mask(r.mobile), r.source, r.assigned_name ?? "—", day(r.enquiry_date), <Chip key="s" tone={aeTone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{canConvert(r) && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void convert(r)}>Convert to application</button>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Source" v={view.source} /><Row k="Counsellor" v={view.assigned_name ?? "—"} /><Row k="Date" v={day(view.enquiry_date)} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{view.status === "New" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Follow-up")}>Mark follow-up</button>}{canConvert(view) && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Closed")}>Close</button>}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
    </div>
  );
}

// ═════════════ Admission application ═════════════
interface Application { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; details: Record<string, string>; applied_on: string; status: "Under review" | "Approved" | "Allocated" | "Returned" | "Rejected" | "Waitlisted" }

export type ApplicationTab = "new-application" | "online-applications" | "application-list";
export function ApplicationPages({ tab }: { tab: ApplicationTab }) {
  return tab === "new-application" ? <NewApplication /> : <ApplicationList online={tab === "online-applications"} />;
}

const STEPS = ["Personal details", "Parent details", "Academic details", "Documents", "Review and submit"];
const BLOOD = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const blankApp = { child: "", dob: "", gender: "Female", class_sought: "Class 1", blood_group: "O+", aadhaar: "", mother_tongue: "", parent_name: "", relation: "Father", mobile: "", email: "", occupation: "", address: "", prev_school: "", prev_class: "", prev_result: "", tc_number: "", source: "Front office" };

export function NewApplication() {
  const go = useGoTab();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(blankApp);
  const act = useAction(() => undefined);
  const set = (k: keyof typeof blankApp, v: string) => setF({ ...f, [k]: v });
  const next = (e: FormEvent) => { e.preventDefault(); if (step < STEPS.length - 1) setStep(step + 1); };
  const submit = async () => {
    const { child, class_sought, parent_name, mobile, source, ...details } = f;
    if (await act.run(() => schoolFetch("/school/front-office/adm-applications", json("POST", { child, class_sought, parent_name, mobile, source, details })))) { setF(blankApp); setStep(0); go("application-list"); }
  };
  const input = (k: keyof typeof blankApp, label: string, extra: { type?: string; required?: boolean; max?: number } = {}) => <Field label={label}><input type={extra.type ?? "text"} className={inputCls} required={extra.required} maxLength={extra.max ?? 150} value={f[k]} onChange={(e) => set(k, e.target.value)} /></Field>;
  const pick = (k: keyof typeof blankApp, label: string, options: string[]) => <Field label={label}><select className={inputCls} value={f[k]} onChange={(e) => set(k, e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select></Field>;
  return (
    <div className="space-y-4">
      <ol className="flex gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1 basis-0">
            <button type="button" disabled={i > step} onClick={() => setStep(i)} className={`flex w-full items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${i === step ? "border-[#41afda] bg-[#f3f9fd] font-semibold text-slate-900" : "border-slate-200 bg-white text-slate-600"} disabled:opacity-70`}>
              <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${i === step ? "bg-[#0294ce] text-white" : i < step ? "bg-[#d9efe8] text-[#065740]" : "border border-slate-300 text-slate-500"}`}>{i < step ? "✓" : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>
      <form onSubmit={next} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{STEPS[step]}</h2></div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {step === 0 && <>
            <div className="sm:col-span-2 lg:col-span-5">{input("child", "Child's full name", { required: true })}</div>
            {input("dob", "Date of birth", { type: "date" })}
            {pick("gender", "Gender", ["Female", "Male", "Other"])}
            {pick("class_sought", "Class applying for", CLASSES)}
            {pick("blood_group", "Blood group", BLOOD)}
            {input("aadhaar", "Aadhaar (optional)", { max: 20 })}
            {input("mother_tongue", "Mother tongue", { max: 40 })}
          </>}
          {step === 1 && <>
            {input("parent_name", "Parent or guardian's name", { required: true })}
            {pick("relation", "Relation", ["Father", "Mother", "Guardian"])}
            {input("mobile", "Mobile", { max: 30, required: true })}
            {input("email", "Email", { type: "email", max: 200 })}
            {input("occupation", "Occupation", { max: 100 })}
            <div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-[4.5rem]`} maxLength={400} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field></div>
          </>}
          {step === 2 && <>
            {input("prev_school", "Previous school")}
            {input("prev_class", "Last class studied", { max: 40 })}
            {input("prev_result", "Last result", { max: 60 })}
            {input("tc_number", "Transfer certificate no.", { max: 60 })}
            {pick("source", "How did they hear about us", ["Front office", ...SOURCES.filter((s) => s !== "Front office"), "Online"])}
          </>}
          {step === 3 && <p className="text-sm text-slate-600 sm:col-span-2 lg:col-span-5">Documents (birth certificate, previous school records, photos) are collected after the application is saved. Uploading is not available yet, so note on the application which ones the parent has handed in.</p>}
          {step === 4 && <dl className="sm:col-span-2 lg:col-span-5 grid gap-x-8 sm:grid-cols-2">
            {([["Child", f.child], ["Class", f.class_sought], ["Date of birth", f.dob || "—"], ["Gender", f.gender], ["Parent", f.parent_name], ["Mobile", f.mobile], ["Email", f.email || "—"], ["Previous school", f.prev_school || "—"], ["Source", f.source]] as [string, string][]).map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </dl>}
        </div>
        <div className="flex items-center justify-between gap-2.5 border-t border-slate-100 px-5 py-3">
          <span className="text-[13px] text-slate-500">Step {step + 1} of {STEPS.length}</span>
          <span className="flex gap-2">
            {step > 0 && <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setStep(step - 1)}>Back</button>}
            {step < STEPS.length - 1 ? <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`}>Save and continue</button> : <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !f.child || !f.parent_name || !f.mobile} onClick={() => void submit()}>{act.busy ? "Submitting…" : "Submit application"}</button>}
          </span>
        </div>
      </form>
    </div>
  );
}

const apTone = (s: Application["status"]): "good" | "mute" | "warn" | "bad" => (s === "Allocated" || s === "Approved" ? "good" : s === "Under review" ? "warn" : s === "Rejected" ? "bad" : "mute");

export function ApplicationList({ online }: { online: boolean }) {
  const { rows: all, loading, error, reload } = useRegister<Application>("adm-applications", { source: online ? "Online" : undefined });
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Application | null>(null);
  const rows = all.filter((r) => has(r, search));
  const n = (s: Application["status"]) => all.filter((r) => r.status === s).length;
  const set = async (a: Application, status: Application["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/adm-applications/${a.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={online ? [{ label: "Applications", value: all.length, sub: "All records" }] : [{ label: "Applications", value: all.length, sub: "All records" }, { label: "Allocated", value: n("Allocated"), sub: pct(n("Allocated"), all.length) }, { label: "Under review", value: n("Under review"), sub: pct(n("Under review"), all.length) }, { label: "Approved", value: n("Approved"), sub: pct(n("Approved"), all.length) }]} />
      <ListPanel title="Applications" noun="applications" search={search} onSearch={setSearch} exportName={online ? "online-applications" : "applications"} head={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status"]}
        exportRows={rows.map((r) => [r.code, r.child, r.class_sought, r.parent_name, r.mobile, r.source, day(r.applied_on), r.status])}
        tableHead={["Application no.", "Child", "Class sought", "Parent", "Mobile", "Source", "Applied on", "Status", ""]} empty={loading ? "Loading…" : "Nothing in this list yet."}
        rows={rows.map((r) => [r.code, r.child, r.class_sought, r.parent_name, mask(r.mobile), r.source, day(r.applied_on), <Chip key="s" tone={apTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class sought" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Source" v={view.source} /><Row k="Applied on" v={day(view.applied_on)} />
          {Object.entries(view.details ?? {}).filter(([, v]) => v).map(([k, v]) => <Row key={k} k={k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())} v={String(v)} />)}<Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="flex gap-1.5">{view.status === "Under review" && <><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Approved")}>Approve</button><button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Returned")}>Return</button><button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Rejected")}>Reject</button></>}{view.status === "Approved" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Allocated")}>Mark allocated</button>}</span>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
        </div></>}</Modal>
    </div>
  );
}
