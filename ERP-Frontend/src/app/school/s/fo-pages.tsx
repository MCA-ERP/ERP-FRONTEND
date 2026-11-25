"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json, qs } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Row, day, small } from "./dash-pages";
import { useSchool } from "../context";
import { useGoTab } from "./tab-context";

// ═════════════ shared bits ═════════════
export const p2 = (n: number) => String(n).padStart(2, "0");
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "—");
export const mask = (m: string | null | undefined) => { const d = (m ?? "").replace(/\D/g, ""); return d.length >= 8 ? `+91 ${d.slice(-10, -5)}••${d.slice(-2)}` : (m || "—"); };
export const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}% of shown` : "—");
export const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface Items<T> { items: T[] }
export function useRegister<T>(name: string, query: Record<string, string | undefined> = {}) {
  const r = useLoad(() => schoolFetch<Items<T>>(`/school/front-office/${name}${qs(query)}`), [name, JSON.stringify(query)]);
  return { rows: r.data?.items ?? [], loading: r.loading, error: r.error, reload: r.reload };
}
export interface StaffChoice { id: string; name: string; role: string }
export const useStaff = () => useLoad(() => schoolFetch<Items<StaffChoice>>("/school/front-office/staff"), []);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

/** A form card: heading, fields in a grid, Discard / Save at the bottom. */
export function FormCard({ title, onSubmit, onDiscard, busy, error, children, cols = "lg:grid-cols-5", submitLabel = "Save" }: { submitLabel?: string; title: string; onSubmit: (e: FormEvent) => void; onDiscard: () => void; busy: boolean; error: string; children: ReactNode; cols?: string }) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2></div>
      {error && <div className="px-5 pt-4"><ErrorBanner message={error} /></div>}
      <div className={`grid gap-4 p-5 sm:grid-cols-2 ${cols}`}>{children}</div>
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onDiscard}>Discard</button>
        <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}

/** A table panel: heading, count, Export / Print, search box, the table. */
export function ListPanel({ title, noun, search, onSearch, exportName, head, exportRows, tableHead, rows, empty, extra, hideSearch, filters }: { filters?: ReactNode; title: string; noun: string; search: string; onSearch: (s: string) => void; exportName: string; head: string[]; exportRows: (string | number | null | undefined)[][]; tableHead: string[]; rows: ReactNode[][]; empty: string; extra?: ReactNode; hideSearch?: boolean }) {
  return (
    <Panel title={title} sub={`${rows.length} ${noun}`} right={<span className="flex items-center gap-2">{extra}<ExportPrint name={exportName} head={head} rows={exportRows} /></span>}>
      {!hideSearch && <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} value={search} onChange={(e) => onSearch(e.target.value)} />{filters}</div>}
      <SimpleTable head={tableHead.map((h) => ({ h }))} rows={rows} empty={empty} />
    </Panel>
  );
}
export const has = (r: unknown, q: string) => !q.trim() || JSON.stringify(Object.values(r as object)).toLowerCase().includes(q.trim().toLowerCase());

export function printHtml(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentDocument;
  if (!d) { f.remove(); return; }
  d.open(); d.write(html); d.close();
  window.setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); window.setTimeout(() => f.remove(), 1500); }, 250);
}

// ═════════════ Enquiry desk ═════════════
interface Enquiry { id: string; code: string; visitor: string; purpose: string; mobile: string | null; assigned_to: string | null; assigned_name: string | null; enquiry_date: string; next_followup: string | null; status: "Open" | "Follow-up" | "Converted" | "Closed" }
interface Followup { id: string; note: string; next_followup: string | null; created_at: string; staff: { first_name: string; last_name: string } | null }
const PURPOSES = ["Admission", "Transport", "Fee query", "Meet the principal", "Vendor", "Job enquiry", "Other"];
const enqTone = (s: Enquiry["status"]): "warn" | "mute" | "good" => (s === "Open" ? "warn" : s === "Converted" ? "good" : "mute");

export type EnquiryTab = "new-enquiry" | "enquiry-list" | "follow-ups";
export function EnquiryPages({ tab }: { tab: EnquiryTab }) {
  return tab === "new-enquiry" ? <NewEnquiry /> : <EnquiryList followOnly={tab === "follow-ups"} />;
}

function NewEnquiry() {
  const go = useGoTab();
  const staff = useStaff();
  const blank = { visitor: "", purpose: "Admission", mobile: "", assigned_to: "", enquiry_date: todayIso(), next_followup: todayIso() };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/school/front-office/enquiries", json("POST", { ...f, assigned_to: f.assigned_to || null })))) { setF(blank); go("enquiry-list"); }
  };
  return (
    <FormCard title="New Enquiry" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error || staff.error}>
      <Field label="Visitor"><input className={inputCls} required maxLength={150} value={f.visitor} onChange={(e) => setF({ ...f, visitor: e.target.value })} /></Field>
      <Field label="Purpose"><select className={inputCls} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{PURPOSES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Mobile"><input className={inputCls} maxLength={30} inputMode="tel" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
      <Field label="Assigned to"><select className={inputCls} value={f.assigned_to} onChange={(e) => setF({ ...f, assigned_to: e.target.value })}><option value="">Nobody yet</option>{(staff.data?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Date"><input type="date" className={inputCls} value={f.enquiry_date} onChange={(e) => setF({ ...f, enquiry_date: e.target.value })} /></Field>
      <Field label="Next follow-up"><input type="date" className={inputCls} value={f.next_followup} onChange={(e) => setF({ ...f, next_followup: e.target.value })} /></Field>
    </FormCard>
  );
}

function EnquiryList({ followOnly }: { followOnly: boolean }) {
  const { rows: all, loading, error, reload } = useRegister<Enquiry>("enquiries");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Enquiry | null>(null);
  const [log, setLog] = useState<Enquiry | null>(null);
  const [note, setNote] = useState({ note: "", next_followup: "" });
  const history = useLoad(() => (view ? schoolFetch<Items<Followup>>(`/school/front-office/enquiries/${view.id}/followups`) : Promise.resolve({ items: [] as Followup[] })), [view?.id]);
  const base = followOnly ? all.filter((r) => r.status === "Follow-up") : all;
  const rows = base.filter((r) => has(r, search));
  const n = (s: Enquiry["status"]) => base.filter((r) => r.status === s).length;
  const canLog = (r: Enquiry) => r.status === "Open" || r.status === "Follow-up";
  const saveLog = async (e: FormEvent) => { e.preventDefault(); if (log && (await act.run(() => schoolFetch(`/school/front-office/enquiries/${log.id}/followups`, json("POST", { note: note.note, next_followup: note.next_followup || null }))))) setLog(null); };
  const setStatus = (r: Enquiry, status: Enquiry["status"]) => act.run(() => schoolFetch(`/school/front-office/enquiries/${r.id}`, json("PATCH", { status }))).then((ok) => ok && setView(null));
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={followOnly
        ? [{ label: "Enquiries", value: base.length, sub: "All records" }, { label: "Follow-up", value: n("Follow-up"), sub: pct(n("Follow-up"), base.length) }]
        : [{ label: "Enquiries", value: base.length, sub: "All records" }, { label: "Open", value: n("Open"), sub: pct(n("Open"), base.length) }, { label: "Follow-up", value: n("Follow-up"), sub: pct(n("Follow-up"), base.length) }, { label: "Converted", value: n("Converted"), sub: pct(n("Converted"), base.length) }]} />
      <ListPanel title="Enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName={followOnly ? "follow-ups" : "enquiries"} head={["Enquiry no.", "Visitor", "Purpose", "Mobile", "Assigned to", "Date", "Next follow-up", "Status"]}
        exportRows={rows.map((r) => [r.code, r.visitor, r.purpose, r.mobile, r.assigned_name, day(r.enquiry_date), day(r.next_followup), r.status])}
        tableHead={["Enquiry no.", "Visitor", "Purpose", "Mobile", "Assigned to", "Date", "Next follow-up", "Status", ""]} empty={loading ? "Loading…" : "No enquiries yet."}
        rows={rows.map((r) => [r.code, r.visitor, r.purpose, mask(r.mobile), r.assigned_name ?? "—", day(r.enquiry_date), day(r.next_followup), <Chip key="s" tone={enqTone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{canLog(r) && <button type="button" className={small} onClick={() => { setNote({ note: "", next_followup: "" }); setLog(r); }}>Log follow-up</button>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.visitor}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Purpose" v={view.purpose} /><Row k="Mobile" v={view.mobile ?? "—"} /><Row k="Assigned to" v={view.assigned_name ?? "—"} /><Row k="Date" v={day(view.enquiry_date)} /><Row k="Next follow-up" v={day(view.next_followup)} /><Row k="Status" v={view.status} /></dl>
        {!!history.data?.items.length && <div className="mt-3 border-t border-slate-100 pt-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-ups</p><ul className="space-y-1.5 text-sm">{history.data.items.map((h) => <li key={h.id}><span className="text-slate-500">{day(h.created_at)}</span> · {h.note}{h.staff ? <span className="text-slate-400"> ({h.staff.first_name})</span> : null}</li>)}</ul></div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="flex gap-1.5">{(view.status === "Open" || view.status === "Follow-up") && <><button type="button" className={small} disabled={act.busy} onClick={() => setStatus(view, "Converted")}>Mark converted</button><button type="button" className={small} disabled={act.busy} onClick={() => setStatus(view, "Closed")}>Close</button></>}</span>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
        </div></>}</Modal>
      <Modal open={!!log} title={log ? `Log follow-up · ${log.visitor}` : ""} onClose={() => setLog(null)}>
        <form onSubmit={saveLog} className="space-y-3">
          <Field label="What was said"><textarea className={`${inputCls} min-h-[5rem]`} required minLength={2} maxLength={500} value={note.note} onChange={(e) => setNote({ ...note, note: e.target.value })} /></Field>
          <Field label="Next follow-up"><input type="date" className={inputCls} value={note.next_followup} onChange={(e) => setNote({ ...note, next_followup: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setLog(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Visitors ═════════════
interface Visitor { id: string; visit_date: string; visitor: string; purpose: string; details: string | null; meeting: string | null; id_proof: string | null; in_time: string | null; out_time: string | null }
const VISIT_PURPOSES = ["Maintenance / service", "Parent meeting", "Official visit", "Interview", "Delivery", "Other"];
const vStatus = (v: Visitor) => (v.out_time ? "Checked out" : "Checked in");

export type VisitorTab = "visitor-entry" | "visitor-list" | "visitor-pass";
export function VisitorPages({ tab }: { tab: VisitorTab }) {
  return tab === "visitor-entry" ? <VisitorEntry /> : tab === "visitor-list" ? <VisitorList /> : <VisitorPass />;
}

function VisitorEntry() {
  const go = useGoTab();
  const blank = { visit_date: todayIso(), visitor: "", purpose: VISIT_PURPOSES[0], details: "", meeting: "", id_proof: "", in_time: "", out_time: "" };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/visitors", json("POST", f)))) { setF(blank); go("visitor-list"); } };
  return (
    <FormCard title="Visitor Entry" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error}>
      <Field label="Date"><input type="date" className={inputCls} value={f.visit_date} onChange={(e) => setF({ ...f, visit_date: e.target.value })} /></Field>
      <Field label="Visitor"><input className={inputCls} required maxLength={150} value={f.visitor} onChange={(e) => setF({ ...f, visitor: e.target.value })} /></Field>
      <Field label="Purpose"><select className={inputCls} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{VISIT_PURPOSES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Details"><input className={inputCls} maxLength={300} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
      <Field label="Meeting"><input className={inputCls} maxLength={150} value={f.meeting} onChange={(e) => setF({ ...f, meeting: e.target.value })} /></Field>
      <Field label="ID proof"><input className={inputCls} maxLength={80} placeholder="Aadhaar ••1234" value={f.id_proof} onChange={(e) => setF({ ...f, id_proof: e.target.value })} /></Field>
      <Field label="In"><input type="time" className={inputCls} value={f.in_time} onChange={(e) => setF({ ...f, in_time: e.target.value })} /></Field>
      <Field label="Out"><input type="time" className={inputCls} value={f.out_time} onChange={(e) => setF({ ...f, out_time: e.target.value })} /></Field>
    </FormCard>
  );
}

function VisitorList() {
  const { rows: all, loading, error, reload } = useRegister<Visitor>("visitors");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Visitor | null>(null);
  const rows = all.filter((r) => has(r, search));
  const out = all.filter((r) => r.out_time).length;
  const checkOut = async (v: Visitor) => { const t = `${p2(new Date().getHours())}:${p2(new Date().getMinutes())}`; if (await act.run(() => schoolFetch(`/school/front-office/visitors/${v.id}`, json("PATCH", { out_time: t })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Visitors", value: all.length, sub: "All records" }, { label: "Checked out", value: out, sub: pct(out, all.length) }, { label: "Checked in", value: all.length - out, sub: pct(all.length - out, all.length) }]} />
      <ListPanel title="Visitors" noun="visitors" search={search} onSearch={setSearch} exportName="visitors" head={["Date", "Visitor", "Purpose", "Details", "Meeting", "ID proof", "In", "Out", "Status"]}
        exportRows={rows.map((r) => [day(r.visit_date), r.visitor, r.purpose, r.details, r.meeting, r.id_proof, hm(r.in_time), hm(r.out_time), vStatus(r)])}
        tableHead={["Date", "Visitor", "Purpose", "Details", "Meeting", "ID proof", "In", "Out", "Status", ""]} empty={loading ? "Loading…" : "No visitors yet."}
        rows={rows.map((r) => [day(r.visit_date), r.visitor, r.purpose, r.details ?? "—", r.meeting ?? "—", r.id_proof ?? "—", hm(r.in_time), hm(r.out_time), <Chip key="s" tone="mute">{vStatus(r)}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.visitor ?? ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Date" v={day(view.visit_date)} /><Row k="Purpose" v={view.purpose} /><Row k="Details" v={view.details ?? "—"} /><Row k="Meeting" v={view.meeting ?? "—"} /><Row k="ID proof" v={view.id_proof ?? "—"} /><Row k="In" v={hm(view.in_time)} /><Row k="Out" v={hm(view.out_time)} /><Row k="Status" v={vStatus(view)} /></dl>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><span>{!view.out_time && <button type="button" className={small} disabled={act.busy} onClick={() => void checkOut(view)}>Check out now</button>}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
    </div>
  );
}

function VisitorPass() {
  const { school } = useSchool();
  const { rows, loading, error } = useRegister<Visitor>("visitors");
  const [pick, setPick] = useState("");
  const v = rows.find((r) => r.id === pick) ?? rows[0];
  const print = () => {
    if (!v) return;
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Visitor pass</title><style>@page{size:A5;margin:12mm}body{font:13px/1.5 system-ui,Arial,sans-serif;color:#111827}h1{font-size:18px;text-align:center;margin:0}p.s{text-align:center;color:#6b7280;margin:0 0 6px}hr{border:0;border-top:2px solid #0294ce}.d{font-size:26px;font-weight:700;color:#026f9b;text-align:center;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:4px 6px;vertical-align:top}td:first-child{color:#6b7280;width:90px}.sg{display:flex;justify-content:space-between;margin-top:40px;color:#6b7280;font-size:11px}.sg span{border-top:1px solid #9ca3af;padding-top:4px;min-width:110px;text-align:center}</style></head><body><h1>${esc(school.name)}</h1><p class="s">Visitor pass</p><hr><div class="d">${esc(v.visit_date)}</div><table><tr><td>Visitor</td><td>${esc(v.visitor)}</td></tr><tr><td>Purpose</td><td>${esc(v.purpose)}</td></tr><tr><td>Details</td><td>${esc(v.details)}</td></tr><tr><td>Meeting</td><td>${esc(v.meeting)}</td></tr><tr><td>ID proof</td><td>${esc(v.id_proof)}</td></tr><tr><td>In</td><td>${esc(hm(v.in_time))}</td></tr><tr><td>Out</td><td>${esc(hm(v.out_time))}</td></tr><tr><td>Status</td><td>${esc(vStatus(v))}</td></tr></table><div class="sg"><span>Issued by front office</span><span>Security</span></div></body></html>`);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Pass
          <select aria-label="Pass" value={v?.id ?? ""} onChange={(e) => setPick(e.target.value)} className="max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
            {!rows.length && <option value="">{loading ? "Loading…" : "No visitors yet"}</option>}
            {rows.map((r) => <option key={r.id} value={r.id}>{r.visit_date} · {r.visitor}</option>)}
          </select>
        </label>
      </div>
      {v && (
        <Panel title="Visitor pass" sub={v.visitor} right={<button type="button" onClick={print} className="rounded-full bg-[#026f9b] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#014a67]">Print</button>}>
          <div className="p-6">
            <div className="mx-auto max-w-[300px] rounded-xl border border-slate-200 bg-white p-5 text-[13px]">
              <p className="text-center text-[15px] font-bold text-slate-900">{school.name}</p>
              <p className="border-b-2 border-[#0294ce] pb-2 text-center text-xs text-slate-500">Visitor pass</p>
              <p className="my-3 text-center text-2xl font-bold text-[#026f9b]">{v.visit_date}</p>
              <dl>{([["Visitor", v.visitor], ["Purpose", v.purpose], ["Details", v.details ?? "—"], ["Meeting", v.meeting ?? "—"], ["ID proof", v.id_proof ?? "—"], ["In", hm(v.in_time)], ["Out", hm(v.out_time)], ["Status", vStatus(v)]] as [string, string][]).map(([k, x]) => <div key={k} className="grid grid-cols-[5rem_1fr] gap-2 py-0.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{x}</dd></div>)}</dl>
              <div className="mt-8 flex justify-between text-[11px] text-slate-500"><span className="border-t border-slate-400 pt-1">Issued by front office</span><span className="border-t border-slate-400 px-5 pt-1">Security</span></div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ═════════════ Appointments ═════════════
interface Appointment { id: string; code: string; with_whom: string; visitor: string; purpose: string; appt_date: string; appt_time: string | null; status: "Pending" | "Confirmed" | "Completed" | "Cancelled" }
const WITH = ["Principal", "Vice principal", "Accountant", "Admissions head", "Class teacher", "Counsellor"];
const APPT_PURPOSES = ["Admission discussion", "Academic progress", "Fee discussion", "Other"];
const apTone = (s: Appointment["status"]): "good" | "warn" | "mute" => (s === "Pending" ? "warn" : s === "Cancelled" ? "mute" : "good");

export type AppointmentTab = "new-appointment" | "appointment-list" | "calendar";
export function AppointmentPages({ tab }: { tab: AppointmentTab }) {
  return tab === "new-appointment" ? <NewAppointment /> : tab === "appointment-list" ? <AppointmentList /> : <AppointmentCalendar />;
}

function NewAppointment() {
  const go = useGoTab();
  const blank = { with_whom: WITH[0], visitor: "", purpose: APPT_PURPOSES[0], appt_date: todayIso(), appt_time: "" };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/appointments", json("POST", f)))) { setF(blank); go("appointment-list"); } };
  return (
    <FormCard title="New Appointment" onSubmit={submit} onDiscard={() => setF(blank)} busy={act.busy} error={act.error}>
      <Field label="With"><select className={inputCls} value={f.with_whom} onChange={(e) => setF({ ...f, with_whom: e.target.value })}>{WITH.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Visitor"><input className={inputCls} required maxLength={150} value={f.visitor} onChange={(e) => setF({ ...f, visitor: e.target.value })} /></Field>
      <Field label="Purpose"><select className={inputCls} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{APPT_PURPOSES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Date"><input type="date" className={inputCls} required value={f.appt_date} onChange={(e) => setF({ ...f, appt_date: e.target.value })} /></Field>
      <Field label="Time"><input type="time" className={inputCls} value={f.appt_time} onChange={(e) => setF({ ...f, appt_time: e.target.value })} /></Field>
    </FormCard>
  );
}

function AppointmentList() {
  const { rows: all, loading, error, reload } = useRegister<Appointment>("appointments");
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Appointment | null>(null);
  const rows = all.filter((r) => has(r, search));
  const n = (s: Appointment["status"]) => all.filter((r) => r.status === s).length;
  const setStatus = async (a: Appointment, status: Appointment["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/appointments/${a.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Appointments", value: all.length, sub: "All records" }, { label: "Confirmed", value: n("Confirmed"), sub: pct(n("Confirmed"), all.length) }, { label: "Pending", value: n("Pending"), sub: pct(n("Pending"), all.length) }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), all.length) }]} />
      <ListPanel title="Appointments" noun="appointments" search={search} onSearch={setSearch} exportName="appointments" head={["Ref.", "With", "Visitor", "Purpose", "Date", "Time", "Status"]}
        exportRows={rows.map((r) => [r.code, r.with_whom, r.visitor, r.purpose, day(r.appt_date), hm(r.appt_time), r.status])}
        tableHead={["Ref.", "With", "Visitor", "Purpose", "Date", "Time", "Status", ""]} empty={loading ? "Loading…" : "No appointments yet."}
        rows={rows.map((r) => [r.code, r.with_whom, r.visitor, r.purpose, day(r.appt_date), hm(r.appt_time), <Chip key="s" tone={apTone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.visitor}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="With" v={view.with_whom} /><Row k="Purpose" v={view.purpose} /><Row k="Date" v={day(view.appt_date)} /><Row k="Time" v={hm(view.appt_time)} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="flex gap-1.5">
            {view.status === "Pending" && <button type="button" className={small} disabled={act.busy} onClick={() => void setStatus(view, "Confirmed")}>Confirm</button>}
            {(view.status === "Pending" || view.status === "Confirmed") && <><button type="button" className={small} disabled={act.busy} onClick={() => void setStatus(view, "Completed")}>Mark completed</button><button type="button" className={small} disabled={act.busy} onClick={() => void setStatus(view, "Cancelled")}>Cancel</button></>}
          </span>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button>
        </div></>}</Modal>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function AppointmentCalendar() {
  const { rows, error } = useRegister<Appointment>("appointments");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const key = (d: number) => `${cursor.y}-${p2(cursor.m + 1)}-${p2(d)}`;
  const today = todayIso();
  const move = (by: number) => setCursor((c) => { const d = new Date(c.y, c.m + by, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button type="button" className={small} aria-label="Previous month" onClick={() => move(-1)}>←</button>
          <h2 className="text-base font-semibold text-slate-900">{first.toLocaleString("en-IN", { month: "short", year: "numeric" })}</h2>
          <button type="button" className={small} aria-label="Next month" onClick={() => move(1)}>→</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="border-b border-slate-100 bg-[#f3f9fd] text-center text-[11.5px] font-semibold text-slate-600">{DAYS.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {cells.map((d, i) => {
            const list = d ? rows.filter((r) => r.appt_date === key(d) && r.status !== "Cancelled") : [];
            return (
              <div key={i} className={`min-h-[84px] border-b border-r border-slate-100 p-1.5 ${d ? "" : "bg-slate-50"} ${d && key(d) === today ? "ring-2 ring-inset ring-[#41afda]" : ""}`}>
                {d && <p className={`text-xs font-semibold ${i % 7 === 6 ? "text-[#ac2c28]" : "text-slate-700"}`}>{d}</p>}
                {list.slice(0, 3).map((r) => <p key={r.id} className="mt-1 truncate rounded bg-[#dceff9] px-1.5 py-0.5 text-[11px] text-[#026f9b]">{r.with_whom} · {hm(r.appt_time)}</p>)}
                {list.length > 3 && <p className="mt-1 text-[11px] text-slate-500">+{list.length - 3} more</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════ Telephone ═════════════
interface Call { id: string; code: string; direction: "Incoming" | "Outgoing"; caller: string; number: string | null; about: string; handled_by: string | null; duration_min: number; call_date: string; follow_up: "Not needed" | "Callback due" | "Done" }
const CALL_ABOUT = ["Admission", "Fee due", "Bus delay", "Event enquiry", "Leave", "Vendor follow-up", "Other"];
const fuTone = (s: Call["follow_up"]): "good" | "mute" => (s === "Done" ? "good" : "mute");

export type CallTab = "incoming-calls" | "outgoing-calls" | "call-register";
export function CallPages({ tab }: { tab: CallTab }) {
  const dir = tab === "incoming-calls" ? "Incoming" : tab === "outgoing-calls" ? "Outgoing" : undefined;
  const { rows: all, loading, error, reload } = useRegister<Call>("calls", { direction: dir });
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Call | null>(null);
  const [adding, setAdding] = useState(false);
  const staff = useStaff();
  const blank = { direction: dir ?? "Incoming", caller: "", number: "", about: CALL_ABOUT[0], handled_by: "", duration_min: "0", call_date: todayIso(), follow_up: "Not needed" };
  const [f, setF] = useState(blank);
  const rows = all.filter((r) => has(r, search));
  const n = (s: Call["follow_up"]) => all.filter((r) => r.follow_up === s).length;
  const order: Call["follow_up"][] = tab === "outgoing-calls" ? ["Callback due", "Not needed", "Done"] : ["Not needed", "Done", "Callback due"];
  const regOrder: Call["follow_up"][] = ["Not needed", "Callback due", "Done"];
  const tileOrder = tab === "call-register" ? regOrder : order;
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/calls", json("POST", { ...f, duration_min: Number(f.duration_min) || 0 })))) setAdding(false); };
  const setFollow = async (c: Call, follow_up: Call["follow_up"]) => { if (await act.run(() => schoolFetch(`/school/front-office/calls/${c.id}`, json("PATCH", { follow_up })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Calls", value: all.length, sub: "All records" }, ...tileOrder.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))]} />
      <ListPanel title="Calls" noun="calls" search={search} onSearch={setSearch} exportName={tab} head={["Call no.", "Direction", "Caller / called", "Number", "About", "Handled by", "Duration (min)", "Date", "Follow-up"]}
        extra={<button type="button" className={small} onClick={() => { setF(blank); setAdding(true); }}>+ Log call</button>}
        exportRows={rows.map((r) => [r.code, r.direction, r.caller, r.number, r.about, r.handled_by, r.duration_min, day(r.call_date), r.follow_up])}
        tableHead={["Call no.", "Direction", "Caller / called", "Number", "About", "Handled by", "Duration (min)", "Date", "Follow-up", ""]} empty={loading ? "Loading…" : "No calls yet."}
        rows={rows.map((r) => [r.code, r.direction, r.caller, mask(r.number), r.about, r.handled_by ?? "—", <span key="d" className="block text-right">{r.duration_min}</span>, day(r.call_date), <Chip key="f" tone={fuTone(r.follow_up)}>{r.follow_up}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.caller}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Direction" v={view.direction} /><Row k="Number" v={view.number ?? "—"} /><Row k="About" v={view.about} /><Row k="Handled by" v={view.handled_by ?? "—"} /><Row k="Duration" v={`${view.duration_min} min`} /><Row k="Date" v={day(view.call_date)} /><Row k="Follow-up" v={view.follow_up} /></dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{view.follow_up === "Callback due" && <button type="button" className={small} disabled={act.busy} onClick={() => void setFollow(view, "Done")}>Mark done</button>}{view.follow_up === "Not needed" && <button type="button" className={small} disabled={act.busy} onClick={() => void setFollow(view, "Callback due")}>Callback due</button>}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
      <Modal open={adding} title="Log a call" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Direction"><select className={inputCls} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as "Incoming" | "Outgoing" })}><option>Incoming</option><option>Outgoing</option></select></Field>
          <Field label="Caller / called"><input className={inputCls} required maxLength={150} value={f.caller} onChange={(e) => setF({ ...f, caller: e.target.value })} /></Field>
          <Field label="Number"><input className={inputCls} maxLength={30} inputMode="tel" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
          <Field label="About"><select className={inputCls} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })}>{CALL_ABOUT.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Handled by"><select className={inputCls} value={f.handled_by} onChange={(e) => setF({ ...f, handled_by: e.target.value })}><option value="">—</option>{(staff.data?.items ?? []).map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Duration (min)"><input type="number" min={0} max={600} className={inputCls} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} value={f.call_date} onChange={(e) => setF({ ...f, call_date: e.target.value })} /></Field>
          <Field label="Follow-up"><select className={inputCls} value={f.follow_up} onChange={(e) => setF({ ...f, follow_up: e.target.value })}><option>Not needed</option><option>Callback due</option><option>Done</option></select></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ Postal ═════════════
interface Post { id: string; code: string; direction: "Incoming" | "Outgoing"; party: string; post_type: string; courier: string | null; handled_by: string | null; post_date: string; status: "Delivered" | "In transit" | "Pending dispatch" }
const POST_TYPES = ["Letter", "Parcel", "Registered post", "Courier", "Other"];
const COURIERS = ["India Post", "DTDC", "Blue Dart", "Hand delivered", "Other"];

export type PostTab = "incoming-post" | "outgoing-post" | "post-register";
export function PostPages({ tab }: { tab: PostTab }) {
  const dir = tab === "incoming-post" ? "Incoming" : tab === "outgoing-post" ? "Outgoing" : undefined;
  const { rows: all, loading, error, reload } = useRegister<Post>("post", { direction: dir });
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Post | null>(null);
  const [adding, setAdding] = useState(false);
  const staff = useStaff();
  const blank = { direction: dir ?? "Incoming", party: "", post_type: POST_TYPES[0], courier: COURIERS[0], handled_by: "", post_date: todayIso(), status: dir === "Outgoing" ? "Pending dispatch" : "Delivered" };
  const [f, setF] = useState(blank);
  const rows = all.filter((r) => has(r, search));
  const n = (s: Post["status"]) => all.filter((r) => r.status === s).length;
  const order: Post["status"][] = tab === "outgoing-post" ? ["In transit", "Delivered", "Pending dispatch"] : tab === "post-register" ? ["Delivered", "In transit", "Pending dispatch"] : ["Delivered", "Pending dispatch", "In transit"];
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/post", json("POST", f)))) setAdding(false); };
  const setStatus = async (p: Post, status: Post["status"]) => { if (await act.run(() => schoolFetch(`/school/front-office/post/${p.id}`, json("PATCH", { status })))) setView(null); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Tiles items={[{ label: "Post", value: all.length, sub: "All records" }, ...order.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))]} />
      <ListPanel title="Post" noun="items" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Direction", "From / to", "Type", "Courier", "Received / sent by", "Date", "Status"]}
        extra={<button type="button" className={small} onClick={() => { setF(blank); setAdding(true); }}>+ Log post</button>}
        exportRows={rows.map((r) => [r.code, r.direction, r.party, r.post_type, r.courier, r.handled_by, day(r.post_date), r.status])}
        tableHead={["Ref.", "Direction", "From / to", "Type", "Courier", "Received / sent by", "Date", "Status", ""]} empty={loading ? "Loading…" : "No post yet."}
        rows={rows.map((r) => [r.code, r.direction, r.party, r.post_type, r.courier ?? "—", r.handled_by ?? "—", day(r.post_date), <Chip key="s" tone={r.status === "Delivered" ? "good" : "mute"}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.party}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Direction" v={view.direction} /><Row k="From / to" v={view.party} /><Row k="Type" v={view.post_type} /><Row k="Courier" v={view.courier ?? "—"} /><Row k="Handled by" v={view.handled_by ?? "—"} /><Row k="Date" v={day(view.post_date)} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{view.status === "Pending dispatch" && <button type="button" className={small} disabled={act.busy} onClick={() => void setStatus(view, "In transit")}>Mark dispatched</button>}{view.status !== "Delivered" && <button type="button" className={small} disabled={act.busy} onClick={() => void setStatus(view, "Delivered")}>Mark delivered</button>}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
      <Modal open={adding} title="Log post" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Direction"><select className={inputCls} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as "Incoming" | "Outgoing" })}><option>Incoming</option><option>Outgoing</option></select></Field>
          <Field label="From / to"><input className={inputCls} required maxLength={150} value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.post_type} onChange={(e) => setF({ ...f, post_type: e.target.value })}>{POST_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Courier"><select className={inputCls} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })}>{COURIERS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Received / sent by"><select className={inputCls} value={f.handled_by} onChange={(e) => setF({ ...f, handled_by: e.target.value })}><option value="">—</option>{(staff.data?.items ?? []).map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Date"><input type="date" className={inputCls} value={f.post_date} onChange={(e) => setF({ ...f, post_date: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Delivered</option><option>In transit</option><option>Pending dispatch</option></select></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

