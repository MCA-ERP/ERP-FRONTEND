"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useGoTab } from "../../school/s/tab-context";
import { useAdmissions } from "../context";
import { sectionHref } from "./menu-config";
import { PipelineStrip } from "./strip";
import { ChildCell, DataTable, INTEREST_TONE, ParentCell, blueBtn, dmy, has, pillBtn } from "./ui";

const CLASSES = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SOURCES = ["Front office", "Phone", "Walk-in", "Website", "Referral", "Admission fair", "Social media"];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const Label = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => <label className={`block min-w-0 ${wide ? "sm:col-span-2 lg:col-span-5" : ""}`}><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

// ═════════════ new enquiry ═════════════
export function NewEnquiry() {
  const go = useGoTab(); const a = useAdmissions();
  const blank = { source: "Front office", child: "", dob: "", gender: "Female", class_sought: "Class 1", parent_name: "", mobile: "", email: "", notes: "" };
  const [f, setF] = useState(blank);
  const act = useAction(() => a.refreshBadges());
  const set = (k: keyof typeof blank, v: string) => setF({ ...f, [k]: v });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/school/front-office/adm-enquiries", json("POST", { ...f, mobile: f.mobile.replace(/\D/g, "").slice(-10) })))) { setF(blank); go("enquiry-list"); }
  };
  return (
    <div>
      <Head title="New Enquiry" subtitle="Record an enquiry from the front office, a phone call or an admission fair. Website enquiries arrive here automatically." />
      <PipelineStrip active={1} />
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New enquiry</h2></div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Label label="Source"><select className={inputCls} value={f.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Label>
          <Label label="Child's name"><input className={inputCls} required maxLength={150} value={f.child} onChange={(e) => set("child", e.target.value)} /></Label>
          <Label label="Date of birth"><input type="date" className={inputCls} max={today()} value={f.dob} onChange={(e) => set("dob", e.target.value)} /></Label>
          <Label label="Gender"><select className={inputCls} value={f.gender} onChange={(e) => set("gender", e.target.value)}>{["Female", "Male", "Other"].map((s) => <option key={s}>{s}</option>)}</select></Label>
          <Label label="Class sought"><select className={inputCls} value={f.class_sought} onChange={(e) => set("class_sought", e.target.value)}>{CLASSES.map((s) => <option key={s}>{s}</option>)}</select></Label>
          <Label label="Parent's name"><input className={inputCls} required maxLength={150} value={f.parent_name} onChange={(e) => set("parent_name", e.target.value)} /></Label>
          <Label label="Mobile"><input className={inputCls} required inputMode="tel" placeholder="10-digit mobile" pattern="[0-9 +]{10,14}" title="A 10-digit mobile number" value={f.mobile} onChange={(e) => set("mobile", e.target.value)} /></Label>
          <Label label="Email"><input type="email" className={inputCls} maxLength={150} value={f.email} onChange={(e) => set("email", e.target.value)} /></Label>
          <Label label="Notes" wide><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} placeholder="What the family asked about" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Label>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save enquiry"}</button></div>
      </form>
    </div>
  );
}

// ═════════════ enquiry list ═════════════
interface Enq { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; enquiry_date: string }

export function EnquiryList() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: Enq[] }>("/admissions/enquiries"), []);
  const [search, setSearch] = useState(""); const [source, setSource] = useState("");
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const all = r.data?.items ?? [];
  const rows = all.filter((x) => has(x, search) && (!source || x.source === source));
  return (
    <div>
      <Head title="Enquiry List" subtitle="New enquiries waiting to be picked up by a counsellor. Create a lead to start follow-up." />
      <PipelineStrip active={1} />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="New enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName="new-enquiries" exportHead={["Child", "Class", "Enquiry no.", "Parent", "Mobile", "Source", "Received"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.parent_name, x.mobile, x.source, dmy(x.enquiry_date)])}
        filter={<select aria-label="Filter by source" className={`${inputCls} max-w-[11rem]`} value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option>{[...new Set(all.map((x) => x.source))].map((s) => <option key={s}>{s}</option>)}</select>}
        head={["Child", "Parent", "Source", "Received", ""]} empty={r.loading ? "Loading…" : "No new enquiries. Record one under New Enquiry."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, <ParentCell key="p" name={x.parent_name} mobile={x.mobile} />, <Chip key="s" tone="info">{x.source}</Chip>, dmy(x.enquiry_date), <button key="l" type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/admissions/enquiries/${x.id}/lead`, json("POST", {})))}>Create lead</button>])} />
    </div>
  );
}

// ═════════════ leads and follow-ups due ═════════════
interface Lead { id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; interest: "Hot" | "Warm" | "Cold"; last_on: string | null; last_how: string | null; next_followup: string | null; overdue: boolean; counsellor: string }

export function Leads({ due }: { due: boolean }) {
  const router = useRouter();
  const r = useLoad(() => schoolFetch<{ items: Lead[] }>(due ? "/admissions/followups/due" : "/admissions/leads"), [due]);
  const [search, setSearch] = useState("");
  const [log, setLog] = useState<Lead | null>(null); const [lost, setLost] = useState<Lead | null>(null);
  const act = useAction(() => r.reload());
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  const send = async (l: Lead) => { if (await act.run(() => schoolFetch(`/admissions/leads/${l.id}/application`, json("POST", {})))) router.push(`${sectionHref("applications", "admission-application")}?tab=application-list`); };
  return (
    <div>
      {due ? <Head title="Follow-ups Due" subtitle="Follow-ups due today or overdue." /> : <Head title="Leads" subtitle="Families your team is following up. Log every call or visit; send the application form when they're ready to apply." />}
      <PipelineStrip active={2} />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title={due ? "Follow-ups due" : "Leads"} noun="leads" search={search} onSearch={setSearch} exportName={due ? "followups-due" : "leads"} exportHead={["Child", "Class", "Parent", "Mobile", "Interest", "Last contact", "Next follow-up", "Counsellor"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.parent_name, x.mobile, x.interest, x.last_on ? `${dmy(x.last_on)} · ${x.last_how}` : "", dmy(x.next_followup), x.counsellor])}
        head={["Child", "Parent", "Interest", "Last contact", "Next follow-up", "Counsellor", ""]} empty={r.loading ? "Loading…" : due ? "Nothing is due. You are up to date." : "No leads yet. Create one from the Enquiry List."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, <ParentCell key="p" name={x.parent_name} mobile={x.mobile} />, <Chip key="i" tone={INTEREST_TONE[x.interest]}>{x.interest}</Chip>, x.last_on ? `${dmy(x.last_on)} · ${x.last_how}` : "—", <span key="n" className={x.overdue ? "text-[#c0392b]" : ""}>{dmy(x.next_followup)}</span>, x.counsellor,
          <span key="a" className="flex gap-1.5"><button type="button" className={pillBtn} onClick={() => setLog(x)}>Log follow-up</button><button type="button" className={blueBtn} disabled={act.busy} onClick={() => void send(x)}>Send application</button><button type="button" className={pillBtn} onClick={() => setLost(x)}>Mark lost</button></span>])} />
      {log && <LogFollowup lead={log} onClose={() => setLog(null)} onDone={() => { setLog(null); r.reload(); }} />}
      {lost && <MarkLost lead={lost} onClose={() => setLost(null)} onDone={() => { setLost(null); r.reload(); }} />}
    </div>
  );
}

function LogFollowup({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState(() => ({ how: "Call", outcome: "", interest: lead.interest as string, next_followup: new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) }));
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/leads/${lead.id}/followup`, json("POST", { ...f, next_followup: f.next_followup || null })))) onDone(); };
  return (
    <Modal open title={`Log follow-up · ${lead.child}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBanner message={act.error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Label label="How"><select className={inputCls} value={f.how} onChange={(e) => setF({ ...f, how: e.target.value })}>{["Call", "Visit", "Message", "Email"].map((s) => <option key={s}>{s}</option>)}</select></Label>
          <Label label="Interest now"><select className={inputCls} value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>{["Hot", "Warm", "Cold"].map((s) => <option key={s}>{s}</option>)}</select></Label>
        </div>
        <Label label="What was said"><textarea className={`${inputCls} min-h-[5rem]`} required maxLength={300} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })} /></Label>
        <Label label="Next follow-up"><input type="date" className={inputCls} min={today()} value={f.next_followup} onChange={(e) => setF({ ...f, next_followup: e.target.value })} /></Label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save follow-up"}</button></div>
      </form>
    </Modal>
  );
}

function MarkLost({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const act = useAction(() => undefined);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`/admissions/leads/${lead.id}/lost`, json("POST", { reason })))) onDone(); };
  return (
    <Modal open title={`Mark lost · ${lead.child}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBanner message={act.error} />
        <Label label="Why did the family not go ahead?"><input className={inputCls} required maxLength={200} placeholder="For example: chose another school" value={reason} onChange={(e) => setReason(e.target.value)} /></Label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Mark lost"}</button></div>
      </form>
    </Modal>
  );
}

// ═════════════ follow-up history ═════════════
interface Hist { id: string; done_on: string; how: string; outcome: string; interest: "Hot" | "Warm" | "Cold"; by: string; child: string; class_sought: string; code: string }

export function FollowupHistory() {
  const r = useLoad(() => schoolFetch<{ items: Hist[] }>("/admissions/followups/history"), []);
  const [search, setSearch] = useState("");
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Follow-up History" subtitle="Every call, visit and message logged by the admission team." />
      <PipelineStrip active={2} />
      <ErrorBanner message={r.error} />
      <DataTable title="Follow-up history" noun="follow-ups" search={search} onSearch={setSearch} exportName="followup-history" exportHead={["Date", "Child", "Class", "How", "By", "Outcome", "Interest"]}
        exportRows={rows.map((x) => [dmy(x.done_on), x.child, x.class_sought, x.how, x.by, x.outcome, x.interest])}
        head={["Date", "Child", "How", "By", "Outcome", "Interest"]} empty={r.loading ? "Loading…" : "No follow-ups logged yet."}
        rows={rows.map((x) => [dmy(x.done_on), <ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.how, x.by, x.outcome, <Chip key="i" tone={INTEREST_TONE[x.interest]}>{x.interest}</Chip>])} />
    </div>
  );
}

