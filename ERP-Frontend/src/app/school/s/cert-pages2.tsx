"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";

const V = "/school/cert";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const tiles = (items: [string, ReactNode, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const cnt = (all: { status: string }[], s: string): [string, number, string] => [s, all.filter((x) => x.status === s).length, `${pct(all.filter((x) => x.status === s).length, all.length)} of shown`];
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const dash = (s: string | number | null | undefined) => (s === null || s === undefined || s === "" ? "—" : s);
const Close = ({ on, children }: { on: () => void; children?: ReactNode }) => <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={small} onClick={on}>Close</button>{children}</div>;
const tone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (s === "Pending" || s === "Pending review" ? "warn" : s === "Rejected" || s === "Expired" || s === "Missing" ? "bad" : s === "Issued" || s === "Approved" || s === "Verified" ? "good" : "mute");

type Cert = { id: string; kind: string; code: string; student: string; class_label: string; purpose: string; requested_on: string; issued_on: string; status: string };
const KINDS = ["Bonafide", "Study", "Transfer", "Conduct", "Character", "Custom"];
/** The certificate register. `kind` limits it to one type; `status` limits it to one status; `approve` shows Reject / Approve; `apply` shows New application. */
export function CertRegisterPage({ kind = "All", status, approve, apply, title = "Certificates", exportName = "certificates" }: { kind?: string; status?: string; approve?: boolean; apply?: string; title?: string; exportName?: string }) {
  const d = useLoad(() => schoolFetch<{ students: { id: string; name: string }[]; items: Cert[] }>(`${V}/register/${kind}`), [kind]); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [v, setV] = useState<Cert | null>(null); const [n, setN] = useState<{ student_id: string; purpose: string } | null>(null); const x = d.data;
  const all = (x?.items ?? []).filter((i) => !status || i.status === status); const rows = all.filter((i) => has(i, search));
  const call = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/${id}/decide`, json("POST", { action }))).then((ok) => ok && setV(null));
  const save = async (e: FormEvent) => { e.preventDefault(); if (n && await act.run(() => schoolFetch(`${V}/request`, json("POST", { kind: apply, student_id: n.student_id || x?.students[0]?.id, purpose: n.purpose })))) setN(null); };
  const order = ["Issued", "Approved", "Pending", "Rejected"]; const shown = status ? [status] : order.filter((s) => all.some((a) => a.status === s));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{tiles([["Certificates", all.length, "Sample records shown"], ...(shown.length ? shown : ["Issued"]).map((s) => cnt(all, s))])}
    <ListPanel title={title} noun="certificates" search={search} onSearch={setSearch} exportName={exportName} extra={apply ? <button type="button" className={primaryCls} onClick={() => setN({ student_id: "", purpose: "" })}>New application</button> : undefined} head={["Cert. no.", "Type", "Student", "Class", "Purpose", "Requested", "Status"]} exportRows={rows.map((i) => [i.code, i.kind, i.student, i.class_label, i.purpose, day(i.requested_on), i.status])}
      tableHead={["Cert. no.", "Type", "Student", "Class", "Purpose", "Requested", "Status", ""]} empty={d.loading ? "Loading…" : "Nothing in this list yet."}
      rows={rows.map((i) => [i.code, i.kind, <b key="s" className="font-semibold text-[#026f9b]">{i.student}</b>, i.class_label, i.purpose, day(i.requested_on), <Chip key="c" tone={tone(i.status)}>{i.status}</Chip>,
        <span key="a" className="flex gap-1.5">{approve && i.status === "Pending" && <><button type="button" className={redBtn} disabled={act.busy} onClick={() => call(i.id, "reject")}>Reject</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => call(i.id, "approve")}>Approve</button></>}{i.status === "Approved" && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => call(i.id, "issue")}>Issue</button>}<button type="button" className={small} onClick={() => setV(i)}>View details</button></span>])} />
    <Modal open={!!v} title={v ? `${v.code} · ${v.kind}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Student" v={`${v.student} · ${v.class_label}`} /><Row k="Purpose" v={v.purpose} /><Row k="Requested" v={day(v.requested_on)} />{v.status === "Issued" && <Row k="Issued" v={day(v.issued_on)} />}<Row k="Status" v={v.status} /></dl><Close on={() => setV(null)} /></>}</Modal>
    <Modal open={!!n} title={`New ${apply?.toLowerCase()} application`} onClose={() => setN(null)}>{n && <form onSubmit={save} className="space-y-3"><ErrorBanner message={act.error} /><Field label="Student"><select className={inputCls} value={n.student_id || x?.students[0]?.id || ""} onChange={(e) => setN({ ...n, student_id: e.target.value })}>{x?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Purpose or reason"><input className={inputCls} required minLength={2} maxLength={120} value={n.purpose} onChange={(e) => setN({ ...n, purpose: e.target.value })} /></Field><Close on={() => setN(null)}><button type="submit" className={primaryCls} disabled={act.busy}>Save</button></Close></form>}</Modal></div>;
}
export function ReportsPage({ tab }: { tab: "issued-certificates" | "pending-applications" }) {
  return tab === "issued-certificates" ? <CertRegisterPage status="Issued" exportName="issued-certificates" /> : <CertRegisterPage status="Pending" exportName="pending-applications" />;
}

// ═════════════ verification ═════════════
type Ver = { found: false } | { found: true; genuine: boolean; kind: string; code: string; status: string; student: string; class_label: string; purpose: string; issued_on: string };
export function CertVerificationPages({ tab }: { tab: "certificate-number" | "verification-status" }) {
  const [code, setCode] = useState(""); const [res, setRes] = useState<Ver | null>(null); const act = useAction(() => undefined);
  if (tab === "verification-status") return <CertRegisterPage title="Certificates" exportName="verification-status" />;
  const check = async (e: FormEvent) => { e.preventDefault(); setRes(null); await act.run(async () => setRes(await schoolFetch<Ver>(`${V}/verify/${encodeURIComponent(code.trim())}`))); };
  return <div className="space-y-5"><form onSubmit={check} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Verify a certificate</h2></div>{act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
    <div className="p-5"><Field label="Certificate number"><input className={inputCls} required minLength={3} maxLength={30} placeholder="BG/CRT/2026/0412" value={code} onChange={(e) => setCode(e.target.value)} /></Field></div>
    <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setCode(""); setRes(null); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy} className={primaryCls}>Verify</button></div></form>
    {res && (res.found ? <div className={`rounded-2xl border px-4 py-3 text-[13px] ${res.genuine ? "border-[#b7e0c6] bg-[#eefaf2]" : "border-[#f1d9a6] bg-[#fff8e6]"}`}><b>{res.genuine ? "Genuine." : `Not issued yet (${res.status}).`}</b> {res.kind} certificate {res.code} for {res.student} · {res.class_label}, {res.purpose}{res.genuine ? `, issued ${day(res.issued_on)}` : ""}.</div> : <div className="rounded-2xl border border-[#f1c0be] bg-[#fdeeee] px-4 py-3 text-[13px]">No certificate has this number in this school.</div>)}</div>;
}

// ═════════════ document repository ═════════════
type Doc = { id: string; person: string; class_label: string; doc_type: string; file_name: string; uploaded_on: string; valid_until: string | null; status: string };
export function RepoDocumentPages({ tab }: { tab: "student-documents" | "staff-documents" }) {
  const kind = tab === "student-documents" ? "Student" : "Staff"; const d = useLoad(() => schoolFetch<{ types: string[]; people: { id: string; name: string }[]; items: Doc[] }>(`${V}/docs/${kind}`), [kind]); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [v, setV] = useState<Doc | null>(null); const blank = { person_id: "", doc_type: "", file_name: "", valid_until: "" }; const [f, setF] = useState<typeof blank | null>(null); const x = d.data;
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const set = (id: string, status: string) => void act.run(() => schoolFetch(`${V}/docs/${id}/status`, json("POST", { status }))).then((ok) => ok && setV(null));
  const save = async (e: FormEvent) => { e.preventDefault(); if (f && await act.run(() => schoolFetch(`${V}/docs`, json("POST", { owner_kind: kind, person_id: f.person_id || x?.people[0]?.id, doc_type: f.doc_type || x?.types[0], file_name: f.file_name, valid_until: f.valid_until || null })))) setF(null); };
  const stu = kind === "Student";
  return <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{tiles([[`${kind} documents`, all.length, "Sample records shown"], ...["Verified", "Pending review", "Expired"].map((s) => cnt(all, s))])}
    <ListPanel title={`${kind} documents`} noun="documents" search={search} onSearch={setSearch} exportName={tab} extra={<button type="button" className={primaryCls} onClick={() => setF({ ...blank })}>Add document</button>} head={[kind, ...(stu ? ["Class"] : []), "Document", "File", "Uploaded", ...(stu ? [] : ["Valid until"]), "Status"]} exportRows={rows.map((i) => [i.person, ...(stu ? [i.class_label] : []), i.doc_type, i.file_name, day(i.uploaded_on), ...(stu ? [] : [i.valid_until ? day(i.valid_until) : ""]), i.status])}
      tableHead={[kind, ...(stu ? ["Class"] : []), "Document", "File", "Uploaded", ...(stu ? [] : ["Valid until"]), "Status", ""]} empty={d.loading ? "Loading…" : "No documents yet."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-[#026f9b]">{i.person}</b>, ...(stu ? [i.class_label] : []), i.doc_type, i.file_name, day(i.uploaded_on), ...(stu ? [] : [i.valid_until ? day(i.valid_until) : "—"]), <Chip key="s" tone={tone(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <p className="text-xs text-slate-500">Only the file name is kept; the files themselves are not stored yet.</p>
    <Modal open={!!v} title={v ? `${v.person} · ${v.doc_type}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="File" v={v.file_name} /><Row k="Uploaded" v={day(v.uploaded_on)} /><Row k="Valid until" v={v.valid_until ? day(v.valid_until) : "—"} /><Row k="Status" v={v.status} /></dl><Close on={() => setV(null)}>{v.status !== "Verified" && v.status !== "Expired" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => set(v.id, "Verified")}>Mark verified</button>}{v.status !== "Missing" && <button type="button" className={small} disabled={act.busy} onClick={() => set(v.id, "Missing")}>Mark missing</button>}</Close></>}</Modal>
    <Modal open={!!f} title="Add document" onClose={() => setF(null)}>{f && <form onSubmit={save} className="space-y-3"><ErrorBanner message={act.error} /><Field label={kind}><select className={inputCls} value={f.person_id || x?.people[0]?.id || ""} onChange={(e) => setF({ ...f, person_id: e.target.value })}>{x?.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Document"><select className={inputCls} value={f.doc_type || x?.types[0] || ""} onChange={(e) => setF({ ...f, doc_type: e.target.value })}>{x?.types.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="File"><input type="file" required className={inputCls} onChange={(e) => setF({ ...f, file_name: e.target.files?.[0]?.name ?? "" })} /></Field><Field label="Valid until (optional)"><input type="date" className={inputCls} value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></Field><Close on={() => setF(null)}><button type="submit" className={primaryCls} disabled={act.busy}>Save</button></Close></form>}</Modal></div>;
}

// ═════════════ school events ═════════════
export function AddEventPage() {
  const o = useLoad(() => schoolFetch<{ venues: string[]; staff: string[]; audiences: string[] }>(`/school/events/options`), []); const act = useAction(() => undefined); const blank = { title: "", date: nowIst(), venue: "", staff: "", aud: "Whole school" }; const [f, setF] = useState(blank); const [msg, setMsg] = useState(""); const x = o.data;
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`/school/calendar`, json("POST", { title: f.title, event_date: f.date, kind: "Event", audience: f.aud, note: `${f.venue || x?.venues[0] || ""} · ${f.staff || x?.staff[0] || ""}`, published: true })))) { setF(blank); setMsg("Saved. It appears in Event Calendar."); } };
  return <div>{okBox(msg)}<FormCard title="Add Event" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={o.error || act.error}>
    <Field label="Event"><input className={inputCls} required minLength={2} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="Date"><input type="date" required className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
    <Field label="Venue"><select className={inputCls} value={f.venue || x?.venues[0] || ""} onChange={(e) => setF({ ...f, venue: e.target.value })}>{x?.venues.map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="In charge"><select className={inputCls} value={f.staff || x?.staff[0] || ""} onChange={(e) => setF({ ...f, staff: e.target.value })}>{x?.staff.map((v) => <option key={v}>{v}</option>)}</select></Field>
    <Field label="For"><select className={inputCls} value={f.aud} onChange={(e) => setF({ ...f, aud: e.target.value })}>{x?.audiences.map((v) => <option key={v}>{v}</option>)}</select></Field></FormCard></div>;
}
