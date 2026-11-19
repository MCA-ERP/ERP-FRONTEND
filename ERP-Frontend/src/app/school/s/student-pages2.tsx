"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

const SM = "/school/students-mgmt";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const Note = ({ children }: { children: ReactNode }) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{children}</p>;

export interface RosterItem { gender?: string; id: string; name: string; registration_no: string; class_name: string; class_label: string; grade_id: string; section_id: string | null; section: string; roll_no: string; status: string; sort: number }
interface Roster { year: { id: string; name: string } | null; items: RosterItem[] }
export const useRoster = () => useLoad(() => schoolFetch<Roster>(`${SM}/roster`), []);

/** The student the page is about. */
export function Picker({ roster, value, onChange }: { roster: RosterItem[]; value: string; onChange: (id: string) => void }) {
  const cur = roster.find((r) => r.id === value) ?? roster[0];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Student
        <select aria-label="Student" value={cur?.id ?? ""} onChange={(e) => onChange(e.target.value)} className="max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!roster.length && <option value="">No students</option>}{roster.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label || "—"}</option>)}</select>
      </label>
      {cur && <Chip tone={cur.status === "Enrolled" ? "good" : "mute"}>{cur.status === "Enrolled" ? "Active" : cur.status}</Chip>}
      <Link href="/school/students" className={`${small} ml-auto`}>Open full profile</Link>
    </div>
  );
}

export function usePick() {
  const roster = useRoster();
  const [pick, setPick] = useState("");
  const items = roster.data?.items ?? [];
  const id = pick || items[0]?.id || "";
  return { roster, items, id, setPick, name: items.find((r) => r.id === id)?.name.split(" ")[0] ?? "" };
}

interface Guardian { relation: string; id?: string; full_name?: string; phone?: string; email?: string; occupation?: string; qualification?: string; annual_income?: number | null; can_pick_up?: boolean }
interface Student {
  id: string; registration_no: string; status: string; campus: string;
  personal: { first_name: string; last_name: string; date_of_birth: string; gender: string; blood_group: string; religion: string; category: string; aadhaar_last4: string; house: string };
  academic: { roll_no: string; grade_id: string; section_id: string; class_label: string; previous_school: string; medium: string; second_language: string };
  contact: { address: string; email: string; emergency_name: string; emergency_phone: string };
  guardians: Guardian[];
}
const useStudent = (id: string) => useLoad(() => (id ? schoolFetch<Student>(`${SM}/${id}`) : Promise.resolve(null)), [id]);
const sel = (v: string, set: (s: string) => void, opts: string[], label: string) => <select aria-label={label} className={inputCls} value={v} onChange={(e) => set(e.target.value)}><option value="">—</option>{[...new Set([...opts, ...(v && !opts.includes(v) ? [v] : [])])].map((o) => <option key={o}>{o}</option>)}</select>;

// ═════════════ Student profile ═════════════
export type ProfileTab = "personal-details" | "academic-details" | "contact-details";
export function StudentProfilePages({ tab }: { tab: ProfileTab }) {
  const p = usePick();
  const st = useStudent(p.id);
  return (
    <div data-report>
      <ErrorBanner message={p.roster.error || st.error} />
      <Picker roster={p.items} value={p.id} onChange={p.setPick} />
      {st.data ? <ProfileForm key={`${st.data.id}-${tab}`} s={st.data} tab={tab} reload={st.reload} /> : <p className="py-8 text-center text-sm text-slate-400">{st.loading || p.roster.loading ? "Loading…" : "No students yet."}</p>}
    </div>
  );
}

function ProfileForm({ s, tab, reload }: { s: Student; tab: ProfileTab; reload: () => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const parts = { "personal-details": "personal", "academic-details": "academic", "contact-details": "contact" } as const;
  const base: Record<string, string> = tab === "personal-details" ? { ...s.personal } : tab === "academic-details" ? { previous_school: s.academic.previous_school, medium: s.academic.medium, second_language: s.academic.second_language } : { ...s.contact };
  const v = (k: string) => f[k] ?? base[k] ?? "";
  const set = (k: string, x: string) => { setSaved(false); setF({ ...f, [k]: x }); };
  const submit = async (e: FormEvent) => { e.preventDefault(); const body = Object.fromEntries(Object.keys(base).map((k) => [k, v(k)])); if (await act.run(() => schoolFetch(`${SM}/${s.id}/${parts[tab]}`, json("PUT", body)))) { setSaved(true); setF({}); } };
  const inp = (k: string, label: string, o: { type?: string; max?: number; req?: boolean } = {}) => <Field label={label}><input type={o.type ?? "text"} className={inputCls} maxLength={o.max ?? 150} required={o.req} value={v(k)} onChange={(e) => set(k, e.target.value)} /></Field>;
  const ro = (label: string, value: string) => <Field label={label}><input className={inputCls} readOnly disabled value={value} /></Field>;
  const title = { "personal-details": "Personal details", "academic-details": "Academic details", "contact-details": "Contact details" }[tab];
  return (
    <FormCard title={title} onSubmit={submit} onDiscard={() => { setF({}); setSaved(false); }} busy={act.busy} error={act.error}>
      {tab === "personal-details" && <>
        {inp("first_name", "First name", { req: true })}{inp("last_name", "Last name", { req: true })}{inp("date_of_birth", "Date of birth", { type: "date" })}
        <Field label="Gender">{sel(v("gender"), (x) => set("gender", x), ["Male", "Female", "Other"], "Gender")}</Field>
        <Field label="Blood group">{sel(v("blood_group"), (x) => set("blood_group", x), ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], "Blood group")}</Field>
        {inp("religion", "Religion", { max: 50 })}
        <Field label="Category">{sel(v("category"), (x) => set("category", x), ["General", "OBC", "SC", "ST", "EWS"], "Category")}</Field>
        <Field label="Aadhaar (last 4 digits)"><input className={inputCls} inputMode="numeric" maxLength={4} placeholder="XXXX XXXX 0000" value={v("aadhaar_last4")} onChange={(e) => set("aadhaar_last4", e.target.value.replace(/\D/g, ""))} /></Field>
        <Field label="House">{sel(v("house"), (x) => set("house", x), ["Red", "Blue", "Green", "Yellow"], "House")}</Field>
      </>}
      {tab === "academic-details" && <>
        {ro("Admission no.", s.registration_no)}{ro("Class", s.academic.class_label || "—")}{ro("Roll no.", s.academic.roll_no || "—")}{ro("Campus", s.campus || "—")}
        {inp("previous_school", "Previous school")}{inp("medium", "Medium", { max: 40 })}
        <Field label="Second language">{sel(v("second_language"), (x) => set("second_language", x), ["Hindi", "Telugu", "Sanskrit", "French", "Urdu"], "Second language")}</Field>
      </>}
      {tab === "contact-details" && <>
        <div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={v("address")} onChange={(e) => set("address", e.target.value)} /></Field></div>
        {ro("Father's mobile", s.guardians.find((g) => g.relation === "Father")?.phone ?? "—")}{ro("Mother's mobile", s.guardians.find((g) => g.relation === "Mother")?.phone ?? "—")}
        {inp("email", "Email", { type: "email", max: 255 })}{inp("emergency_name", "Emergency contact", { max: 100 })}{inp("emergency_phone", "Emergency mobile", { max: 30 })}
      </>}
      {saved && <p role="status" className="text-sm font-semibold text-emerald-700 sm:col-span-2 lg:col-span-5">Saved</p>}
    </FormCard>
  );
}

// ═════════════ Parent / guardian ═════════════
export type ParentTab = "father-details" | "mother-details" | "guardian-details";
const INCOME = ["", "Below ₹3 lakh", "₹3 – 10 lakh", "₹10 – 25 lakh", "Above ₹25 lakh"];
const incomeValue: Record<string, number> = { "Below ₹3 lakh": 200000, "₹3 – 10 lakh": 600000, "₹10 – 25 lakh": 1500000, "Above ₹25 lakh": 3000000 };
const incomeLabel = (n: number | null | undefined) => (n == null ? "" : n < 300000 ? INCOME[1] : n < 1000000 ? INCOME[2] : n < 2500000 ? INCOME[3] : INCOME[4]);

export function ParentPages({ tab }: { tab: ParentTab }) {
  const p = usePick();
  const st = useStudent(p.id);
  return (
    <div data-report>
      <ErrorBanner message={p.roster.error || st.error} />
      <Picker roster={p.items} value={p.id} onChange={p.setPick} />
      {st.data ? <ParentForm key={`${st.data.id}-${tab}`} s={st.data} tab={tab} reload={st.reload} /> : <p className="py-8 text-center text-sm text-slate-400">{st.loading || p.roster.loading ? "Loading…" : "No students yet."}</p>}
    </div>
  );
}

function ParentForm({ s, tab, reload }: { s: Student; tab: ParentTab; reload: () => void }) {
  const rel = tab === "father-details" ? "Father" : tab === "mother-details" ? "Mother" : "Guardian";
  const g = s.guardians.find((x) => (rel === "Guardian" ? !["Father", "Mother"].includes(x.relation) : x.relation === rel));
  const base = { full_name: g?.full_name ?? "", phone: g?.phone === "-" ? "" : g?.phone ?? "", occupation: g?.occupation ?? "", email: g?.email ?? "", qualification: g?.qualification ?? "", income: incomeLabel(g?.annual_income), guardian_relation: rel === "Guardian" ? g?.relation ?? "Grandparent" : "", can_pick_up: g?.can_pick_up ?? false };
  const [f, setF] = useState(base);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const set = <K extends keyof typeof base>(k: K, x: (typeof base)[K]) => { setSaved(false); setF({ ...f, [k]: x }); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { relation: rel, full_name: f.full_name, phone: f.phone, email: f.email, occupation: f.occupation, qualification: f.qualification, annual_income: incomeValue[f.income] ?? null, ...(rel === "Guardian" ? { guardian_relation: f.guardian_relation, can_pick_up: f.can_pick_up } : {}) };
    if (await act.run(() => schoolFetch(`${SM}/${s.id}/guardian`, json("PUT", body)))) setSaved(true);
  };
  const t = rel === "Guardian" ? "Guardian's" : `${rel}'s`;
  return (
    <FormCard title={`${t} details`} onSubmit={submit} onDiscard={() => { setF(base); setSaved(false); }} busy={act.busy} error={act.error}>
      <Field label={`${t} name`}><input className={inputCls} required maxLength={200} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
      {rel === "Guardian" && <Field label="Relation"><select className={inputCls} value={f.guardian_relation} onChange={(e) => set("guardian_relation", e.target.value)}>{["Grandparent", "Uncle", "Aunt", "Sibling", "Other"].map((o) => <option key={o}>{o}</option>)}</select></Field>}
      <Field label="Mobile"><input className={inputCls} maxLength={30} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
      {rel !== "Guardian" && <><Field label="Occupation"><input className={inputCls} maxLength={100} value={f.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
        <Field label="Email"><input type="email" className={inputCls} maxLength={255} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Qualification"><input className={inputCls} maxLength={100} value={f.qualification} onChange={(e) => set("qualification", e.target.value)} /></Field></>}
      {rel === "Father" && <Field label="Annual income"><select className={inputCls} value={f.income} onChange={(e) => set("income", e.target.value)}>{INCOME.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select></Field>}
      {rel === "Guardian" && <label className="flex items-center gap-2 text-[12.5px] font-medium text-slate-900 sm:col-span-2 lg:col-span-5"><input type="checkbox" className="size-4 accent-[#026f9b]" checked={f.can_pick_up} onChange={(e) => set("can_pick_up", e.target.checked)} />Allowed to pick up the student</label>}
      {saved && <p role="status" className="text-sm font-semibold text-emerald-700 sm:col-span-2 lg:col-span-5">Saved</p>}
    </FormCard>
  );
}

// ═════════════ Student documents ═════════════
export type DocTab = "birth-certificate" | "photos" | "previous-records" | "other-documents";
const DOC_FOR: Record<DocTab, string> = { "birth-certificate": "Birth certificate", photos: "Photos", "previous-records": "Previous records", "other-documents": "Other documents" };
interface SDoc { id: string; student_id: string; doc_type: string; file_name: string | null; status: "Pending review" | "Verified" | "Expired" | "Missing"; created_at: string; name: string; registration_no: string; class_label: string }
const docTone = (s: SDoc["status"]): "good" | "warn" | "bad" => (s === "Verified" ? "good" : s === "Pending review" ? "warn" : "bad");

export function StudentDocumentPages({ tab }: { tab: DocTab }) {
  const type = DOC_FOR[tab];
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: SDoc[] }>(`${SM}/documents?type=${encodeURIComponent(type)}`), [type]);
  const roster = useRoster();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<SDoc | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", file_name: "" });
  const all = data?.items ?? [];
  const rows = all.filter((r) => has(r, search));
  const n = (s: SDoc["status"]) => all.filter((r) => r.status === s).length;
  const kinds: SDoc["status"][] = tab === "birth-certificate" ? ["Verified", "Expired"] : tab === "photos" ? ["Pending review"] : tab === "previous-records" ? ["Verified", "Missing"] : ["Expired", "Verified"];
  const set = async (d: SDoc, status: SDoc["status"]) => { if (await act.run(() => schoolFetch(`${SM}/documents/${d.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${SM}/documents`, json("POST", { student_id: f.student_id, doc_type: type, file_name: f.file_name })))) setAdding(false); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || roster.error || act.error} />
      <Tiles items={[{ label: "Student documents", value: all.length, sub: "All records" }, ...kinds.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))]} />
      <ListPanel title="Student documents" noun="documents" search={search} onSearch={setSearch} exportName={tab} head={["Student", "Class", "Document", "File", "Uploaded", "Status"]}
        extra={<button type="button" className={small} onClick={() => { setF({ student_id: roster.data?.items[0]?.id ?? "", file_name: "" }); setAdding(true); }}>+ Add document</button>}
        exportRows={rows.map((r) => [r.name, r.class_label, r.doc_type, r.file_name, day(r.created_at), r.status])}
        tableHead={["Student", "Class", "Document", "File", "Uploaded", "Status", ""]} empty={loading ? "Loading…" : "No documents of this kind yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label || "—", r.doc_type, r.file_name ?? "—", day(r.created_at), <Chip key="s" tone={docTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${type} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Student" v={view.name} /><Row k="Class" v={view.class_label || "—"} /><Row k="File" v={view.file_name ?? "—"} /><Row k="Uploaded" v={day(view.created_at)} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{view.status !== "Verified" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Verified")}>Verify</button>}{view.status !== "Expired" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Expired")}>Mark expired</button>}{view.status !== "Missing" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "Missing")}>Mark missing</button>}</>} /></>}</Modal>
      <Modal open={adding} title={`Add ${type.toLowerCase()}`} onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(roster.data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label}</option>)}</select></Field>
          <Field label="File name (note only; uploading is not available yet)"><input className={inputCls} maxLength={150} value={f.file_name} onChange={(e) => setF({ ...f, file_name: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Student ID ═════════════
interface IdSettings { school: string; place: string; template: string; valid_until: string; signature: string; show: Record<string, boolean> }
interface CardData { settings: IdSettings; student: { name: string; registration_no: string; class_label: string; blood_group: string; parent_phone: string; address: string } }
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const mDate = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`; };

function IdCard({ cfg, s }: { cfg: IdSettings; s: CardData["student"] }) {
  const on = (k: string) => cfg.show[k];
  const rows: [string, string, string][] = [["Admission no.", "Adm. no.", s.registration_no], ["Class", "Class", s.class_label], ["Blood group", "Blood", s.blood_group || "—"], ["Parent mobile", "Parent", s.parent_phone || "—"], ["Address", "Address", s.address || "—"]];
  return (
    <div className="mx-auto w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="bg-[#0294ce] px-3 py-2.5 text-center text-white"><b className="block text-[13px]">{cfg.school}</b><small className="text-[10px] opacity-90">{cfg.place}</small></div>
      {on("Photo") && <div className="mx-auto mt-3 grid size-16 place-items-center rounded-xl border-2 border-white bg-[#dceff9] text-xl font-bold text-[#026f9b] shadow-[0_0_0_1px_#e5e7eb]">{initials(s.name)}</div>}
      <p className="mt-1.5 text-center text-[14px] font-bold text-slate-900">{s.name}</p>
      <dl className="grid grid-cols-[4.2rem_1fr] gap-x-2 gap-y-0.5 px-4 py-2 text-[11px]">{rows.filter(([k]) => on(k)).map(([k, l, v]) => <div key={k} className="contents"><dt className="text-slate-500">{l}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}</dl>
      <div className="flex items-center justify-between bg-[#f3f9fd] px-3 py-1.5 text-[10px] text-slate-600">{on("QR code") ? <span className="grid size-6 place-items-center rounded bg-slate-900 text-[8px] font-bold text-white">QR</span> : <span />}<span>Valid till {mDate(cfg.valid_until)}</span></div>
    </div>
  );
}

export type IdTab = "id-card-design" | "generate-id" | "print-id";
export function StudentIdPages({ tab }: { tab: IdTab }) {
  return tab === "id-card-design" ? <IdDesign /> : tab === "generate-id" ? <IdGenerate /> : <IdPrint />;
}

const SHOW = ["Photo", "Admission no.", "Class", "Blood group", "Parent mobile", "Address", "Bus route", "QR code"];
function IdDesign() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<IdSettings>(`${SM}/id/settings`), []);
  const p = usePick();
  const card = useLoad(() => (p.id ? schoolFetch<CardData>(`${SM}/${p.id}/card`) : Promise.resolve(null)), [p.id]);
  const act = useAction(reload);
  const [d, setD] = useState<IdSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setD(data); }, [data]);
  const set = (k: Partial<IdSettings>) => { setSaved(false); setD((x) => (x ? { ...x, ...k } : x)); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (d && (await act.run(() => schoolFetch(`${SM}/id/settings`, json("PUT", { template: d.template, valid_until: d.valid_until, signature: d.signature, show: d.show }))))) setSaved(true); };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" data-report>
      <ErrorBanner message={error || card.error || act.error} />
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">ID card design</h2></div>
        {d && <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Template"><select className={inputCls} value={d.template} onChange={(e) => set({ template: e.target.value })}>{["Portrait, blue band", "Portrait, plain", "Landscape"].map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Valid until"><input type="date" className={inputCls} value={d.valid_until} onChange={(e) => set({ valid_until: e.target.value })} /></Field>
            <Field label="Signature"><select className={inputCls} value={d.signature} onChange={(e) => set({ signature: e.target.value })}>{["Principal", "Vice principal", "Class teacher"].map((o) => <option key={o}>{o}</option>)}</select></Field>
          </div>
          <div><p className="mb-2 text-[12.5px] font-medium text-slate-900">Show on the card</p><div className="flex flex-wrap gap-2">{SHOW.map((k) => <label key={k} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[13px]"><input type="checkbox" className="size-4 accent-[#026f9b]" checked={!!d.show[k]} onChange={(e) => set({ show: { ...d.show, [k]: e.target.checked } })} />{k}</label>)}</div></div>
        </div>}
        {loading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { if (data) setD(data); setSaved(false); }}>Discard</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !d}>Save design</button></div>
      </form>
      <Panel title="Preview" sub="Front"><div className="p-5">{d && card.data ? <IdCard cfg={d} s={card.data.student} /> : <p className="py-8 text-center text-sm text-slate-400">{p.items.length ? "Loading…" : "Add a student to see a preview."}</p>}</div></Panel>
    </div>
  );
}

interface CardRow { id: string; name: string; class_label: string; registration_no: string; photo: "Verified" | "Pending" | "Missing"; card: "Generated" | "Pending" }
function IdGenerate() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: CardRow[] }>(`${SM}/id/cards`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const all = data?.items ?? [];
  const rows = all.filter((r) => has(r, search));
  const gen = (body: object) => act.run(() => schoolFetch(`${SM}/id/generate`, json("POST", body)));
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <div className="flex justify-end"><button type="button" onClick={() => void gen({ all: true })} disabled={act.busy} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white hover:bg-[#ac2c28] disabled:opacity-60">Generate all</button></div>
      <ListPanel title="Students" noun="students" search={search} onSearch={setSearch} exportName="id-cards" head={["Student", "Class", "Admission no.", "Photo", "ID card"]} exportRows={rows.map((r) => [r.name, r.class_label, r.registration_no, r.photo, r.card])}
        tableHead={["Student", "Class", "Admission no.", "Photo", "ID card", ""]} empty={loading ? "Loading…" : "No students yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label, r.registration_no, <Chip key="p" tone={r.photo === "Verified" ? "good" : r.photo === "Pending" ? "warn" : "bad"}>{r.photo}</Chip>, <Chip key="c" tone={r.card === "Generated" ? "info" : "warn"}>{r.card}</Chip>, <button key="g" type="button" className={small} disabled={act.busy} onClick={() => void gen({ ids: [r.id] })}>Generate</button>] as ReactNode[])} />
    </div>
  );
}

function IdPrint() {
  const p = usePick();
  const card = useLoad(() => (p.id ? schoolFetch<CardData>(`${SM}/${p.id}/card`) : Promise.resolve(null)), [p.id]);
  const c = card.data;
  const print = () => {
    if (!c) return;
    const on = (k: string) => c.settings.show[k];
    const s = c.student;
    const line = (k: string, l: string, v: string) => (on(k) ? `<tr><td>${l}</td><td><b>${v.replace(/</g, "&lt;")}</b></td></tr>` : "");
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>ID card</title><style>@page{size:54mm 86mm;margin:0}body{margin:0;font:11px system-ui,Arial,sans-serif}.c{width:54mm;height:86mm;box-sizing:border-box;border:1px solid #ddd}.h{background:#0294ce;color:#fff;text-align:center;padding:6px}.h b{display:block;font-size:12px}.p{width:50px;height:50px;margin:8px auto 2px;border-radius:8px;background:#dceff9;color:#026f9b;display:grid;place-items:center;font-size:18px;font-weight:700}.n{text-align:center;font-size:13px;font-weight:700}table{margin:6px 10px;border-collapse:collapse}td{padding:1px 6px 1px 0;font-size:10px}.f{position:absolute;bottom:4mm;right:4mm;font-size:9px;color:#555}</style></head><body><div class="c"><div class="h"><b>${c.settings.school.replace(/</g, "&lt;")}</b>${c.settings.place.replace(/</g, "&lt;")}</div>${on("Photo") ? `<div class="p">${initials(s.name)}</div>` : ""}<div class="n">${s.name.replace(/</g, "&lt;")}</div><table>${line("Admission no.", "Adm. no.", s.registration_no)}${line("Class", "Class", s.class_label)}${line("Blood group", "Blood", s.blood_group || "—")}${line("Parent mobile", "Parent", s.parent_phone || "—")}${line("Address", "Address", s.address || "—")}</table><div class="f">Valid till ${mDate(c.settings.valid_until)}</div></div></body></html>`);
  };
  return (
    <div data-report>
      <ErrorBanner message={p.roster.error || card.error} />
      <Picker roster={p.items} value={p.id} onChange={p.setPick} />
      <Panel title="ID card" sub={c?.student.name} right={<button type="button" className={primaryCls} disabled={!c} onClick={print}>Print</button>}><div className="p-6">{c ? <IdCard cfg={c.settings} s={c.student} /> : <p className="py-8 text-center text-sm text-slate-400">{card.loading ? "Loading…" : "No student selected."}</p>}</div></Panel>
    </div>
  );
}

// ═════════════ Class allocation (existing students) ═════════════
export type AssignTab = "class-assignment" | "section-assignment" | "roll-number";
interface GradeOpt { id: string; name: string }
interface SecOpt { id: string; grade_id: string; name: string }
export function StudentAssignPages({ tab }: { tab: AssignTab }) {
  const roster = useRoster();
  const grades = useLoad(() => schoolFetch<{ grades: GradeOpt[] }>("/school/grades"), []);
  const sections = useLoad(() => schoolFetch<{ sections: (SecOpt & { academic_year_id: string })[] }>("/school/sections"), []);
  const act = useAction(roster.reload);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Record<string, { g?: string; s?: string; r?: string }>>({});
  const items = (roster.data?.items ?? []).filter((r) => has(r, search));
  const G = grades.data?.grades ?? [];
  const S = (sections.data?.sections ?? []).filter((x) => x.academic_year_id === roster.data?.year?.id);
  const val = (r: RosterItem) => { const p = pick[r.id] ?? {}; const g = p.g ?? r.grade_id; const secs = S.filter((x) => x.grade_id === g); const s = p.s && secs.some((x) => x.id === p.s) ? p.s : secs.some((x) => x.id === r.section_id) ? r.section_id! : secs[0]?.id ?? ""; return { g, s, secs, r: p.r ?? r.roll_no }; };
  const upd = (id: string, k: "g" | "s" | "r", v: string) => setPick({ ...pick, [id]: { ...pick[id], [k]: v } });
  const save = (r: RosterItem) => { const v = val(r); return act.run(() => schoolFetch(`${SM}/${r.id}/assign`, json("PUT", { grade_id: v.g, section_id: v.s, roll_no: v.r }))).then((ok) => { if (ok) setPick((x) => { const { [r.id]: _drop, ...rest } = x; void _drop; return rest; }); }); };
  const title = { "class-assignment": "Class Assignment", "section-assignment": "Section Assignment", "roll-number": "Roll Number" }[tab];
  return (
    <div data-report>
      <ErrorBanner message={roster.error || grades.error || sections.error || act.error} />
      <ListPanel title={title} noun="students" search={search} onSearch={setSearch} exportName={tab} head={["Student", "Admission no.", "Class", "Section", "Roll no."]} exportRows={items.map((r) => [r.name, r.registration_no, r.class_name, r.section, r.roll_no])}
        tableHead={["Student", "Admission no.", "Class", "Section", "Roll no.", ""]} empty={roster.loading ? "Loading…" : "No students yet."}
        rows={items.map((r) => { const v = val(r); return [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.registration_no,
          <select key="g" aria-label="Class" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={v.g} onChange={(e) => upd(r.id, "g", e.target.value)}>{G.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>,
          <select key="s" aria-label="Section" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" value={v.s} onChange={(e) => upd(r.id, "s", e.target.value)}>{!v.secs.length && <option value="">None</option>}{v.secs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>,
          <input key="r" aria-label="Roll number" className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" maxLength={30} value={v.r} onChange={(e) => upd(r.id, "r", e.target.value)} />,
          <button key="b" type="button" className={primaryCls} disabled={act.busy || !v.s || !v.r.trim()} onClick={() => void save(r)}>Save</button>]; })} />
      <p className="mt-4 text-xs text-slate-500">Changes apply to this academic year ({roster.data?.year?.name ?? "—"}).</p>
    </div>
  );
}

// ═════════════ Promotion ═════════════
interface PItem extends RosterItem { next_class: string | null; state: "Ready" | "Promoted" | "Held for review"; decided_at: string | null }
interface PData { year: { id: string; name: string } | null; years: { id: string; name: string; is_current: boolean }[]; grades: { id: string; name: string }[]; items: PItem[] }
export type PromoTab = "promotion-list" | "promote-students" | "promotion-history";
const pTone = (s: PItem["state"]): "info" | "mute" => (s === "Ready" ? "info" : "mute");

export function PromotionPages({ tab }: { tab: PromoTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<PData>(`${SM}/promotion`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PItem | null>(null);
  const [cls, setCls] = useState("");
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const all = data?.items ?? [];
  const next = (data?.years ?? []).filter((y) => y.id !== data?.year?.id);
  const targetId = target || next[0]?.id || "";
  const run = async (ids: string[], hold: boolean) => { await act.run(async () => { const r = await schoolFetch<{ done: number; skipped: string[] }>(`${SM}/promotion`, json("POST", { student_ids: ids, target_year_id: targetId, hold })); setMsg(`${r.done} ${hold ? "held back" : "promoted"}.${r.skipped.length ? ` Skipped: ${r.skipped.slice(0, 3).join("; ")}` : ""}`); setChosen({}); }); };
  const n = (s: PItem["state"]) => all.filter((r) => r.state === s).length;
  const note = !next.length ? <Note>Promotion needs next year&apos;s academic year and its sections. Add them under Academic setup first.</Note> : null;

  if (tab === "promote-students") {
    const gid = cls || data?.grades[0]?.id || "";
    const list = all.filter((r) => r.grade_id === gid && r.state === "Ready");
    const g = data?.grades.find((x) => x.id === gid);
    const sel2 = list.filter((r) => chosen[r.id]);
    return (
      <div className="space-y-5" data-report>
        <ErrorBanner message={error || act.error} />{note}
        {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Class<select aria-label="Class" className="bg-transparent py-1.5 font-semibold text-slate-900 outline-none" value={gid} onChange={(e) => { setCls(e.target.value); setChosen({}); }}>{(data?.grades ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Into<select aria-label="Next academic year" className="bg-transparent py-1.5 font-semibold text-slate-900 outline-none" value={targetId} onChange={(e) => setTarget(e.target.value)}>{next.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
        </div>
        <Panel title={`${g?.name ?? "Class"} → ${list[0]?.next_class ?? "next class"}`} sub={`${list.length} students`}>
          <SimpleTable head={["", "Roll", "Student", "Result", "Attendance", "Promote to"].map((h) => ({ h }))} empty={loading ? "Loading…" : "Nobody in this class is waiting to be promoted."}
            rows={list.map((r) => [<input key="c" type="checkbox" aria-label={`Select ${r.name}`} className="size-4 accent-[#026f9b]" checked={!!chosen[r.id]} onChange={(e) => setChosen({ ...chosen, [r.id]: e.target.checked })} />, r.roll_no || "—", r.name, "—", "—", r.next_class ? `${r.next_class}${r.section ? ` ${r.section}` : ""}` : "No next class"])} />
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3"><span className="mr-auto text-xs text-slate-500">{sel2.length} selected. Results and attendance are not recorded yet.</span>
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !sel2.length || !targetId} onClick={() => void run(sel2.map((r) => r.id), true)}>Hold back</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !sel2.length || !targetId} onClick={() => void run(sel2.map((r) => r.id), false)}>Promote selected</button></div>
        </Panel>
      </div>
    );
  }
  const base = tab === "promotion-history" ? all.filter((r) => r.state === "Promoted") : all;
  const rows = base.filter((r) => has(r, search));
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />{tab === "promotion-list" && note}
      <Tiles items={tab === "promotion-history" ? [{ label: "Promotions", value: base.length, sub: "All records" }, { label: "Promoted", value: base.length, sub: pct(base.length, base.length) }] : [{ label: "Promotions", value: base.length, sub: "All records" }, { label: "Ready", value: n("Ready"), sub: pct(n("Ready"), base.length) }, { label: "Promoted", value: n("Promoted"), sub: pct(n("Promoted"), base.length) }, { label: "Held for review", value: n("Held for review"), sub: pct(n("Held for review"), base.length) }]} />
      <ListPanel title="Promotions" noun="students" search={search} onSearch={setSearch} exportName={tab} head={["Student", "Current class", "Result", "Attendance", "Next class", "Status"]} exportRows={rows.map((r) => [r.name, r.class_label, "—", "—", r.next_class, r.state])}
        tableHead={["Student", "Current class", "Result", "Attendance", "Next class", "Status", ""]} empty={loading ? "Loading…" : "Nothing here yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label, "—", "—", r.next_class ? "Promote to next class" : "No next class", <Chip key="s" tone={pTone(r.state)}>{r.state}</Chip>,
          <span key="a" className="flex gap-1.5">{tab === "promotion-list" && r.state === "Ready" && r.next_class && <button type="button" className={primaryCls} disabled={act.busy || !targetId} onClick={() => void run([r.id], false)}>Promote</button>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Admission no." v={view.registration_no} /><Row k="Current class" v={view.class_label} /><Row k="Next class" v={view.next_class ?? "—"} /><Row k="Status" v={view.state} />{view.decided_at && <Row k="Decided" v={day(view.decided_at)} />}</dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

void Toggle;
