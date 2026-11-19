"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Picker, useRoster, usePick } from "./student-pages2";
import { useParents } from "./parent-pages";
import type { RosterItem } from "./student-pages2";

const SM = "/school/students-mgmt";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const rejectCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const Note = ({ children }: { children: ReactNode }) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{children}</p>;
const todayIso = () => new Date().toISOString().slice(0, 10);
const tone = (s: string): "good" | "warn" | "bad" | "mute" | "info" => (["Approved", "Completed", "Verified", "Active", "Resolved"].includes(s) && s !== "Active" ? "good" : s === "Active" ? "good" : ["Pending", "Open"].includes(s) ? "warn" : s === "Rejected" ? "bad" : s === "Parent informed" ? "mute" : "mute");

interface Rec { id: string; student_id: string; kind: string; title: string; extra: string | null; from_label: string | null; to_label: string | null; to_ref: string | null; record_date: string; status: string; name: string; class_label: string; blood_group: string }
interface RecData { items: Rec[]; statuses: string[] }

// ═════════════ generic student records ═════════════
interface Cfg { kind: string; noun: string; tabs: string[]; cols: string[]; cell: (r: Rec) => ReactNode[]; exportRow: (r: Rec) => (string | null)[]; tileOrder: string[]; allLabel: string; extraLabel?: string; titleLabel: string; actions?: (r: Rec) => [string, string, boolean][] }

const BEH = (kind: string, noun: string, order: string[]): Cfg => ({
  kind, noun, tabs: [], allLabel: "Behaviour records", tileOrder: order, titleLabel: "Details", extraLabel: "Recorded by",
  cols: ["Student", "Class", "Type", "Details", "Recorded by", "Date", "Status"],
  cell: (r) => [r.name, r.class_label, { behaviour: "Behaviour record", disciplinary: "Disciplinary action", remark: "Remark" }[kind] ?? kind, r.title, r.extra ?? "—", day(r.record_date)],
  exportRow: (r) => [r.name, r.class_label, kind, r.title, r.extra, day(r.record_date), r.status],
  actions: (r) => (r.status === "Open" ? [["Parent informed", "Parent informed", false], ["Close", "Closed", false]] : r.status === "Parent informed" ? [["Close", "Closed", false]] : []),
});
const HEALTH = (kind: string, order: string[]): Cfg => ({
  kind, noun: "health records", tabs: [], allLabel: "Health records", tileOrder: order, titleLabel: "Details",
  cols: ["Student", "Class", "Type", "Details", "Blood group", "Recorded", "Status"],
  cell: (r) => [r.name, r.class_label, kind === "medical" ? "Medical information" : "Health incident", r.title, r.blood_group || "—", day(r.record_date)],
  exportRow: (r) => [r.name, r.class_label, kind, r.title, r.blood_group, day(r.record_date), r.status],
  actions: (r) => (r.status === "Active" ? [["Mark resolved", "Resolved", true]] : []),
});
const ACH = (kind: string, cat: string, order: string[]): Cfg => ({
  kind, noun: "achievements", tabs: [], allLabel: "Achievements", tileOrder: order, titleLabel: "Achievement", extraLabel: "Level",
  cols: ["Student", "Class", "Category", "Achievement", "Level", "Date", "Status"],
  cell: (r) => [r.name, r.class_label, cat, r.title, r.extra ?? "—", day(r.record_date)],
  exportRow: (r) => [r.name, r.class_label, cat, r.title, r.extra, day(r.record_date), r.status],
  actions: (r) => (r.status === "Pending" ? [["Verify", "Verified", true]] : []),
});
const TRANSFER = (kind: string, label: string, order: string[]): Cfg => ({
  kind, noun: "transfers", tabs: [], allLabel: "Transfers", tileOrder: order, titleLabel: "Reason", extraLabel: "",
  cols: ["Student", "From", "To", "Type", "Reason", "Requested", "Status"],
  cell: (r) => [r.name, r.from_label ?? "—", r.to_label ?? "—", label, r.title, day(r.record_date)],
  exportRow: (r) => [r.name, r.from_label, r.to_label, label, r.title, day(r.record_date), r.status],
  actions: (r) => (r.status === "Pending" ? [["Reject", "Rejected", false], ["Approve", "Approved", true]] : r.status === "Approved" ? [["Mark completed", "Completed", true]] : []),
});

export type TransferTab = "transfer-within-school" | "campus-transfer";
export type BehaviourTab = "behaviour-records" | "disciplinary-actions" | "remarks";
export type HealthTab = "medical-information" | "health-incidents";
export type AchTab = "academic" | "sports" | "cultural-achievements";

const CFG: Record<string, Cfg> = {
  "transfer-within-school": TRANSFER("transfer_within", "Within school", ["Pending", "Rejected"]),
  "campus-transfer": TRANSFER("transfer_campus", "Campus transfer", ["Approved", "Completed", "Pending"]),
  "behaviour-records": BEH("behaviour", "behaviour records", ["Open", "Closed", "Parent informed"]),
  "disciplinary-actions": BEH("disciplinary", "behaviour records", ["Parent informed", "Open"]),
  remarks: BEH("remark", "behaviour records", ["Open", "Parent informed", "Closed"]),
  "medical-information": HEALTH("medical", ["Active", "Resolved"]),
  "health-incidents": HEALTH("incident", ["Resolved", "Active"]),
  academic: ACH("ach_academic", "Academic", ["Verified", "Pending"]),
  sports: ACH("ach_sports", "Sports", ["Verified", "Pending"]),
  "cultural-achievements": ACH("ach_cultural", "Cultural", ["Verified", "Pending"]),
};
const ALL_LABEL: Record<string, string> = { "transfer-within-school": "Transfers", "campus-transfer": "Transfers", "behaviour-records": "Behaviour records", "disciplinary-actions": "Behaviour records", remarks: "Behaviour records", "medical-information": "Health records", "health-incidents": "Health records", academic: "Achievements", sports: "Achievements", "cultural-achievements": "Achievements" };
const LEVELS = ["School", "District", "State", "National"];

export function StudentRecordPages({ tab }: { tab: string }) {
  const cfg = CFG[tab];
  const { data, error, loading, reload } = useLoad(() => schoolFetch<RecData>(`${SM}/records/${cfg.kind}`), [cfg.kind]);
  const roster = useRoster();
  const camps = useLoad(() => (cfg.kind === "transfer_campus" ? schoolFetch<{ items: { id: string; name: string }[] }>(`${SM}/campuses`) : Promise.resolve({ items: [] })), [cfg.kind]);
  const secs = useLoad(() => (cfg.kind === "transfer_within" ? schoolFetch<{ sections: { id: string; grade_name: string; name: string; academic_year_id: string }[] }>("/school/sections") : Promise.resolve({ sections: [] })), [cfg.kind]);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Rec | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", title: "", extra: "", to: "" });
  const all = data?.items ?? [];
  const rows = all.filter((r) => has(r, search));
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const T = ALL_LABEL[tab];
  const set = async (r: Rec, status: string) => { if (await act.run(() => schoolFetch(`${SM}/records/${r.id}`, json("PATCH", { status })))) setView(null); };
  const yearSecs = (secs.data?.sections ?? []).filter((s) => s.academic_year_id === roster.data?.year?.id);
  const openForm = () => { setF({ student_id: roster.data?.items[0]?.id ?? "", title: "", extra: cfg.kind.startsWith("ach_") ? "School" : "", to: "" }); setAdding(true); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { kind: cfg.kind, student_id: f.student_id, title: f.title, extra: f.extra };
    if (cfg.kind === "transfer_within") { const s = yearSecs.find((x) => x.id === f.to); body.to_ref = s?.id; body.to_label = s ? `${s.grade_name} ${s.name}` : ""; }
    if (cfg.kind === "transfer_campus") { const c = camps.data?.items.find((x) => x.id === f.to); body.to_ref = c?.id; body.to_label = c?.name ?? ""; }
    if (await act.run(() => schoolFetch(`${SM}/records`, json("POST", body)))) setAdding(false);
  };
  const first = cfg.tileOrder;
  const tiles = [{ label: T, value: all.length, sub: "All records" }, ...first.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))];
  const noun = cfg.kind.startsWith("transfer") ? "transfer request" : cfg.kind.startsWith("ach_") ? "achievement" : cfg.kind === "medical" || cfg.kind === "incident" ? "health record" : "record";
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || roster.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title={T} noun={cfg.noun} search={search} onSearch={setSearch} exportName={tab} head={cfg.cols} exportRows={rows.map(cfg.exportRow)}
        extra={<button type="button" className={small} onClick={openForm}>+ New {noun}</button>}
        tableHead={[...cfg.cols, ""]} empty={loading ? "Loading…" : "Nothing recorded yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, ...cfg.cell(r).slice(1), <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class" v={view.class_label || "—"} />{cfg.kind.startsWith("transfer") ? <><Row k="From" v={view.from_label ?? "—"} /><Row k="To" v={view.to_label ?? "—"} /></> : null}<Row k={cfg.titleLabel} v={view.title} />{cfg.extraLabel && <Row k={cfg.extraLabel} v={view.extra ?? "—"} />}{view.blood_group && <Row k="Blood group" v={view.blood_group} />}<Row k="Date" v={day(view.record_date)} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{(cfg.actions?.(view) ?? []).map(([label, status, primary]) => <button key={status} type="button" className={primary ? primaryCls : status === "Rejected" ? rejectCls : small} disabled={act.busy} onClick={() => void set(view, status)}>{label}</button>)}</>} /></>}</Modal>
      <Modal open={adding} title={`New ${noun}`} onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(roster.data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label}</option>)}</select></Field>
          {cfg.kind === "transfer_within" && <Field label="Move to"><select className={inputCls} required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}><option value="">Choose a section</option>{yearSecs.map((s) => <option key={s.id} value={s.id}>{s.grade_name} {s.name}</option>)}</select></Field>}
          {cfg.kind === "transfer_campus" && <Field label="Move to campus"><select className={inputCls} required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}><option value="">Choose a campus</option>{(camps.data?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
          <Field label={cfg.titleLabel}><input className={inputCls} required minLength={2} maxLength={300} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          {cfg.kind.startsWith("ach_") && <Field label="Level"><select className={inputCls} value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>}
          {cfg.extraLabel === "Recorded by" && <Field label="Recorded by"><input className={inputCls} maxLength={150} value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} /></Field>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ withdrawals ═════════════
interface Wd { id: string; student_id: string; code: string; reason: string; last_day: string; dues: number; requested_on: string; status: "Pending" | "Approved" | "Rejected" | "Completed"; name: string; class_label: string }
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export type WithdrawTab = "withdrawal-request" | "approval" | "leaving-records";

export function WithdrawalPages({ tab }: { tab: WithdrawTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Wd[] }>(`${SM}/withdrawals`), []);
  const roster = useRoster();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Wd | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", reason: "", last_day: todayIso(), dues: "0" });
  const all = data?.items ?? [];
  const base = tab === "approval" ? all.filter((r) => r.status === "Pending") : tab === "leaving-records" ? all.filter((r) => r.status === "Completed") : all;
  const rows = base.filter((r) => has(r, search));
  const n = (s: Wd["status"]) => base.filter((r) => r.status === s).length;
  const set = async (r: Wd, status: string) => { if (await act.run(() => schoolFetch(`${SM}/withdrawals/${r.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${SM}/withdrawals`, json("POST", { student_id: f.student_id, reason: f.reason, last_day: f.last_day, dues: Number(f.dues) || 0 })))) setAdding(false); };
  const clear = (r: Wd) => act.run(() => schoolFetch(`${SM}/withdrawals/${r.id}/dues`, json("PUT", { dues: 0 })));
  const tiles = tab === "approval" ? [{ label: "Withdrawals", value: base.length, sub: "All records" }, { label: "Pending", value: n("Pending"), sub: pct(n("Pending"), base.length) }]
    : tab === "leaving-records" ? [{ label: "Withdrawals", value: base.length, sub: "All records" }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), base.length) }]
      : [{ label: "Withdrawals", value: base.length, sub: "All records" }, { label: "Pending", value: n("Pending"), sub: pct(n("Pending"), base.length) }, { label: "Approved", value: n("Approved"), sub: pct(n("Approved"), base.length) }, { label: "Completed", value: n("Completed"), sub: pct(n("Completed"), base.length) }];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || roster.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Withdrawals" noun="withdrawals" search={search} onSearch={setSearch} exportName={tab} head={["Request no.", "Student", "Class", "Reason", "Last day", "Dues", "Requested", "Status"]}
        extra={tab === "withdrawal-request" ? <button type="button" className={small} onClick={() => { setF({ student_id: roster.data?.items[0]?.id ?? "", reason: "", last_day: todayIso(), dues: "0" }); setAdding(true); }}>+ New request</button> : null}
        exportRows={rows.map((r) => [r.code, r.name, r.class_label, r.reason, day(r.last_day), r.dues, day(r.requested_on), r.status])}
        tableHead={["Request no.", "Student", "Class", "Reason", "Last day", "Dues", "Requested", "Status", ""]} empty={loading ? "Loading…" : "No withdrawal requests."}
        rows={rows.map((r) => [r.code, <b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label, r.reason, day(r.last_day), <span key="d" className="block text-right">{inr(r.dues)}</span>, day(r.requested_on), <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{r.status === "Pending" && <><button type="button" className={rejectCls} disabled={act.busy} onClick={() => void set(r, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Approved")}>Approve</button></>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class" v={view.class_label || "—"} /><Row k="Reason" v={view.reason} /><Row k="Last day" v={day(view.last_day)} /><Row k="Dues" v={inr(view.dues)} /><Row k="Requested" v={day(view.requested_on)} /><Row k="Status" v={view.status} /></dl>
        <Foot close={() => setView(null)} left={<>{view.status === "Approved" && view.dues > 0 && <button type="button" className={small} disabled={act.busy} onClick={async () => { if (await clear(view)) setView({ ...view, dues: 0 }); }}>Mark dues cleared</button>}{view.status === "Approved" && <button type="button" className={primaryCls} disabled={act.busy || view.dues > 0} onClick={() => void set(view, "Completed")}>Complete withdrawal</button>}</>} /></>}</Modal>
      <Modal open={adding} title="New withdrawal request" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(roster.data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label}</option>)}</select></Field>
          <Field label="Reason"><input className={inputCls} required minLength={2} maxLength={200} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Last day"><input type="date" className={inputCls} required value={f.last_day} onChange={(e) => setF({ ...f, last_day: e.target.value })} /></Field><Field label="Dues (₹)"><input type="number" min={0} className={inputCls} value={f.dues} onChange={(e) => setF({ ...f, dues: e.target.value })} /></Field></div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ certificates ═════════════
interface CertData { school: { name: string; place: string; board: string }; year: string; cert_no: string; student: { name: string; registration_no: string; class_label: string; date_of_birth: string; father: string } }
export type CertTab = "bonafide" | "study" | "character" | "transfer";
const CERT_KIND: Record<CertTab, string> = { bonafide: "Bonafide", study: "Study", character: "Character", transfer: "Transfer" };
const lDate = (iso: string) => (iso ? day(iso) : "—");

function CertBody({ tab, d, date: when }: { tab: CertTab; d: CertData; date: string }) {
  const s = d.student;
  const b = (t: string) => <b>{t}</b>;
  const text = tab === "bonafide" ? <>This is to certify that {b(s.name)}, son/daughter of {s.father || "—"}, is a bonafide student of this school, studying in {b(s.class_label)} in the academic year {d.year}. Admission no. {s.registration_no}, date of birth {lDate(s.date_of_birth)}.</>
    : tab === "study" ? <>This is to certify that {b(s.name)} has studied in this school and is now in {b(s.class_label)}.</>
      : tab === "character" ? <>This is to certify that {b(s.name)} of {s.class_label} has been a student of this school. To the best of our knowledge, the student bears a good moral character.</>
        : <>Transfer certificate for {b(s.name)}, admission no. {s.registration_no}. Last class studied: {s.class_label}. Qualified for promotion: Yes.</>;
  return (
    <div className="mx-auto max-w-[460px] rounded-xl border-4 border-double border-[#c0e4f3] bg-white p-6 text-[13px] leading-relaxed text-slate-800">
      <p className="text-center text-[16px] font-bold text-slate-900">{d.school.name}</p>
      <p className="border-b-2 border-[#0294ce] pb-2 text-center text-[11px] text-slate-500">{[d.school.board && `Affiliated to ${d.school.board}`, d.school.place].filter(Boolean).join(" · ")}</p>
      <p className="my-3 text-center text-[14px] font-bold uppercase tracking-wide">{CERT_KIND[tab]} certificate</p>
      <p>{text}</p>
      <div className="mt-10 flex justify-between text-[11px] text-slate-500"><span className="border-t border-slate-400 pt-1">Date: {lDate(when)}</span><span className="border-t border-slate-400 px-6 pt-1">Principal</span></div>
    </div>
  );
}

export function CertificatePages({ tab }: { tab: CertTab }) {
  const p = usePick();
  const cert = useLoad(() => (p.id ? schoolFetch<CertData>(`${SM}/${p.id}/certificate`) : Promise.resolve(null)), [p.id]);
  const act = useAction(() => cert.reload());
  const [purpose, setPurpose] = useState("Passport application");
  const [when, setWhen] = useState(todayIso());
  const [msg, setMsg] = useState("");
  const d = cert.data;
  const issue = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(async () => { const r = await schoolFetch<{ item: { cert_no: string } }>(`${SM}/certificates`, json("POST", { student_id: p.id, kind: CERT_KIND[tab], purpose, issued_on: when })); setMsg(`Issued as ${r.item.cert_no}.`); })) setMsg((m) => m); };
  const print = () => {
    if (!d) return;
    const s = d.student;
    const body = tab === "bonafide" ? `This is to certify that <b>${s.name}</b>, son/daughter of ${s.father || "—"}, is a bonafide student of this school, studying in <b>${s.class_label}</b> in the academic year ${d.year}. Admission no. ${s.registration_no}, date of birth ${lDate(s.date_of_birth)}.`
      : tab === "study" ? `This is to certify that <b>${s.name}</b> has studied in this school and is now in <b>${s.class_label}</b>.`
        : tab === "character" ? `This is to certify that <b>${s.name}</b> of ${s.class_label} has been a student of this school. To the best of our knowledge, the student bears a good moral character.`
          : `Transfer certificate for <b>${s.name}</b>, admission no. ${s.registration_no}. Last class studied: ${s.class_label}. Qualified for promotion: Yes.`;
    const e = (t: string) => t.replace(/&/g, "&amp;");
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${CERT_KIND[tab]} certificate</title><style>@page{size:A4;margin:25mm}body{font:15px/1.9 Georgia,serif;color:#111827}.b{border:6px double #c0e4f3;padding:30px;min-height:240mm}h1{text-align:center;margin:0}p.s{text-align:center;color:#6b7280;margin:0 0 6px;border-bottom:2px solid #0294ce;padding-bottom:8px}h2{text-align:center;letter-spacing:.08em;text-transform:uppercase;font-size:17px;margin:26px 0}.f{display:flex;justify-content:space-between;margin-top:120px;color:#555;font-size:13px}.f span{border-top:1px solid #999;padding-top:4px;min-width:140px;text-align:center}</style></head><body><div class="b"><h1>${e(d.school.name)}</h1><p class="s">${e([d.school.board && `Affiliated to ${d.school.board}`, d.school.place].filter(Boolean).join(" · "))}</p><h2>${CERT_KIND[tab]} certificate</h2><p>${body}</p><p style="color:#6b7280;font-size:12px">Certificate no. ${e(d.cert_no)}${purpose ? ` · Purpose: ${e(purpose)}` : ""}</p><div class="f"><span>Date: ${lDate(when)}</span><span>Principal</span></div></div></body></html>`);
  };
  return (
    <div data-report>
      <ErrorBanner message={p.roster.error || cert.error || act.error} />
      <Picker roster={p.items} value={p.id} onChange={(id) => { p.setPick(id); setMsg(""); }} />
      {msg && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={issue} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Certificate details</h2></div>
          <div className="space-y-4 p-5">
            <Field label="Purpose"><input className={inputCls} maxLength={150} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Certificate no."><input className={inputCls} readOnly disabled value={d?.cert_no ?? ""} /></Field><Field label="Date of issue"><input type="date" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} /></Field></div>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setPurpose("Passport application"); setWhen(todayIso()); }}>Discard</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !p.id}>Issue certificate</button></div>
        </form>
        <Panel title="Preview" sub={`${CERT_KIND[tab]} certificate`} right={<button type="button" className={small} disabled={!d} onClick={print}>Print</button>}><div className="p-5">{d ? <CertBody tab={tab} d={d} date={when} /> : <p className="py-8 text-center text-sm text-slate-400">{cert.loading ? "Loading…" : "No student selected."}</p>}</div></Panel>
      </div>
    </div>
  );
}

// ═════════════ reports ═════════════
export type ReportsTab = "student-list" | "class-wise" | "gender-wise" | "status-reports";
const gOf = (r: RosterItem) => (/^m/i.test(r.gender ?? "") ? "Male" : /^f/i.test(r.gender ?? "") ? "Female" : "Other");
const stat = (r: RosterItem) => (r.status === "Enrolled" ? "Active" : r.status === "Left" ? "Withdrawn" : "Inactive");

export function StudentReportPages({ tab }: { tab: ReportsTab }) {
  const roster = useRoster();
  const parents = useParents();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [view, setView] = useState<{ title: string; rows: [string, string | number][] } | null>(null);
  const all = roster.data?.items ?? [];
  const classes = [...new Map(all.map((r) => [r.grade_id, r.class_name])).entries()];
  const byClass = classes.map(([id, name]) => { const m = all.filter((r) => r.grade_id === id); return { id, name, students: m.length, sections: new Set(m.map((r) => r.section_id)).size, boys: m.filter((r) => gOf(r) === "Male").length, girls: m.filter((r) => gOf(r) === "Female").length, active: m.filter((r) => r.status === "Enrolled").length }; });
  const list = all.filter((r) => (!grade || r.grade_id === grade) && (!gender || gOf(r) === gender) && has(r, search));
  const eb = <ErrorBanner message={roster.error} />;
  if (tab === "student-list") {
    return (
      <div className="space-y-5" data-report>{eb}
        <ListPanel title="Student list" noun="students" search={search} onSearch={setSearch} exportName="student-list" head={["Student", "Admission no.", "Class", "Gender", "Status"]} exportRows={list.map((r) => [r.name, r.registration_no, r.class_label, gOf(r), stat(r)])}
          extra={<><select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" aria-label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All classes</option>{classes.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select><select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">All genders</option><option>Male</option><option>Female</option></select></>}
          tableHead={["Student", "Class", "Gender", "Roll no.", "Status", ""]} empty={roster.loading ? "Loading…" : "No students."}
          rows={list.map((r) => [<div key="n"><p className="font-semibold text-[#026f9b]">{r.name}</p><p className="text-xs text-slate-400">{r.registration_no}</p></div>, r.class_label, gOf(r), r.roll_no || "—", <Chip key="s" tone={r.status === "Enrolled" ? "good" : "mute"}>{stat(r)}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: r.name, rows: [["Admission no.", r.registration_no], ["Class", r.class_label], ["Gender", gOf(r)], ["Roll no.", r.roll_no || "—"], ["Status", stat(r)]] })}>View details</button>])} />
        <Detail view={view} close={() => setView(null)} />
      </div>
    );
  }
  if (tab === "class-wise") {
    const rows = byClass.filter((c) => has(c, search));
    return (
      <div className="space-y-5" data-report>{eb}
        <Panel title="Students by class" sub={roster.data?.year?.name}><BarRows rows={byClass.map((c): [string, number] => [c.name, c.students])} /></Panel>
        <ListPanel title="Classes" noun="classes" search={search} onSearch={setSearch} exportName="class-wise" head={["Class", "Sections", "Students", "Status"]} exportRows={rows.map((c) => [c.name, c.sections, c.students, "Active"])}
          tableHead={["Class", "Sections", "Students", "Status", ""]} empty={roster.loading ? "Loading…" : "No classes with students yet."}
          rows={rows.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, c.sections, c.students, <Chip key="s" tone="good">Active</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: c.name, rows: [["Sections", c.sections], ["Students", c.students], ["Boys", c.boys], ["Girls", c.girls]] })}>View details</button>])} />
        <Detail view={view} close={() => setView(null)} />
      </div>
    );
  }
  if (tab === "gender-wise") {
    return (
      <div className="space-y-5" data-report>{eb}
        <Panel title="Gender-wise" sub={`${byClass.length} classes`} right={<span className="flex gap-2"><button type="button" className={small} onClick={() => import("@/components/admin/csv").then((m) => m.downloadCsv("gender-wise", ["Class", "Boys", "Girls", "Total"], byClass.map((c) => [c.name, c.boys, c.girls, c.students])))}>Export</button></span>}>
          <SimpleTable head={["Class", "Boys", "Girls", "Total", ""].map((h) => ({ h }))} empty={roster.loading ? "Loading…" : "No students yet."} rows={byClass.map((c) => [<b key="n" className="font-semibold text-slate-900">{c.name}</b>, c.boys, c.girls, c.students, <button key="v" type="button" className={small} onClick={() => setView({ title: c.name, rows: [["Boys", c.boys], ["Girls", c.girls], ["Total", c.students]] })}>View details</button>])} />
        </Panel>
        <Detail view={view} close={() => setView(null)} />
      </div>
    );
  }
  const n = (s: string) => all.filter((r) => stat(r) === s).length;
  const gone = list.filter((r) => stat(r) !== "Active");
  const father = (id: string) => (parents.data?.items ?? []).find((p) => p.students.some((k) => k.id === id));
  return (
    <div className="space-y-5" data-report>{eb}
      <Tiles items={[{ label: "Active", value: n("Active").toLocaleString("en-IN"), sub: pct(n("Active"), all.length) }, { label: "Inactive", value: n("Inactive"), sub: "Suspended, transferred or graduated" }, { label: "Withdrawn", value: n("Withdrawn"), sub: "Left the school" }]} />
      <ListPanel title="Not active" noun="students" search={search} onSearch={setSearch} exportName="status-report" head={["Student", "Admission no.", "Class", "Gender", "Father", "Mobile", "Status"]}
        exportRows={gone.map((r) => [r.name, r.registration_no, r.class_label, gOf(r), father(r.id)?.name ?? "", father(r.id)?.mobile ?? "", stat(r)])}
        extra={<><select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" aria-label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All classes</option>{classes.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}</select><select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">All genders</option><option>Male</option><option>Female</option></select></>}
        tableHead={["Student", "Class", "Gender", "Father", "Mobile", "Attendance", "Fee due", "Status", ""]} empty={roster.loading ? "Loading…" : "Nobody is inactive or withdrawn."}
        rows={gone.map((r) => [<div key="n"><p className="font-semibold text-[#026f9b]">{r.name}</p><p className="text-xs text-slate-400">{r.registration_no}</p></div>, r.class_label, gOf(r), father(r.id)?.name ?? "—", father(r.id)?.mobile || "—", "—", "—", <Chip key="s" tone="mute">{stat(r)}</Chip>,
          <span key="a" className="flex gap-1.5"><Link href="/school/students/student-profile" className={small}>Profile</Link><button type="button" className={small} onClick={() => setView({ title: r.name, rows: [["Admission no.", r.registration_no], ["Class", r.class_label], ["Gender", gOf(r)], ["Father", father(r.id)?.name ?? "—"], ["Mobile", father(r.id)?.mobile || "—"], ["Status", stat(r)]] })}>View details</button></span>])} />
      <Detail view={view} close={() => setView(null)} />
    </div>
  );
}

function Detail({ view, close }: { view: { title: string; rows: [string, string | number][] } | null; close: () => void }) {
  return <Modal open={!!view} title={view?.title ?? ""} onClose={close}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={close} /></>}</Modal>;
}

void Note;
