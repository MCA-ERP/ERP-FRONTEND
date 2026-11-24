"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useAdmissions } from "../context";
import { PipelineStrip } from "./strip";
import { AMBER, BLUE, BarRows, ChildCell, DataTable, Tile, blueBtn, dmy, has } from "./ui";

const GREEN = "bg-[#d9efe8]";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const yr = (y: string) => y.replace(/^(\d{4})-(\d{4})$/, (_, a: string, b: string) => `${a}-${b.slice(2)}`);
const Label = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;
const Actions = ({ onCancel, busy, label }: { onCancel: () => void; busy: boolean; label: string }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onCancel}>Cancel</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={busy}>{busy ? "Saving…" : label}</button></div>;

// ═════════════ fee assignment ═════════════
export function AssignFees() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: { application_id: string; code: string; child: string; class_sought: string; admission_fee: number; caution: number; total: number }[] }>("/admissions/fee-assignment"), []);
  const [search, setSearch] = useState(""); const [pay, setPay] = useState<{ application_id: string; child: string; total: number } | null>(null);
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Assign Fees" subtitle="The admission fee and the refundable caution deposit for each approved child, from the school's Admission Fee Setup. Once the family pays, they move to registration." />
      <PipelineStrip active={7} />
      <ErrorBanner message={r.error} />
      <DataTable title="Fee assignment" noun="applicants" search={search} onSearch={setSearch} exportName="fee-assignment" exportHead={["Child", "Class", "Application no.", "Admission fee", "Caution deposit", "Amount due"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.admission_fee, x.caution, x.total])}
        head={["Child", "Admission fee", "Caution deposit", "Amount due", "Status", ""]} empty={r.loading ? "Loading…" : "No approved applications are waiting for the fee."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, inr(x.admission_fee), inr(x.caution), inr(x.total), <Chip key="s" tone="warn">Demand sent</Chip>, <button key="p" type="button" className={blueBtn} onClick={() => setPay({ application_id: x.application_id, child: x.child, total: x.total })}>Record payment</button>])} />
      {pay && <PayDialog row={pay} onClose={() => setPay(null)} onDone={() => { setPay(null); r.reload(); a.refreshBadges(); }} />}
    </div>
  );
}
function PayDialog({ row, onClose, onDone }: { row: { application_id: string; child: string; total: number }; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState("UPI"); const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/front-office/admission/fee-collect", json("POST", { application_id: row.application_id, mode })))) onDone(); };
  return <Modal open title={`Record payment · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} /><p className="text-[13px] text-slate-700">Amount due: <b>{inr(row.total)}</b> (admission fee and caution deposit)</p><Label label="Paid by"><select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>{["UPI", "Card", "Cash", "Cheque", "Net banking"].map((m) => <option key={m}>{m}</option>)}</select></Label><Actions onCancel={onClose} busy={act.busy} label="Record payment" /></form></Modal>;
}

export function FeeStructure() {
  const r = useLoad(() => schoolFetch<{ year: string; rows: { class_group: string; admission_fee: number; caution: number; form_fee: number }[]; pay_within_days: number }>("/admissions/fee-structure"), []);
  const x = r.data;
  return (
    <div>
      <Head title="Fee Structure" subtitle={`Fee structure used for new admissions${x?.year ? `, ${yr(x.year)}` : ""}. Edit it in School Admin › Admission › Admission Fee.`} />
      <PipelineStrip active={7} />
      <ErrorBanner message={r.error} />
      <div className="space-y-5">
        <Panel title="Application fee · paid when applying" sub={`${x?.rows.length ?? 0} class groups`}><SimpleTable head={[{ h: "Classes" }, { h: "When" }, { h: "Amount" }, { h: "Refund" }]} empty={r.loading ? "Loading…" : "Not set."} rows={(x?.rows ?? []).map((g) => [<b key="c" className="font-semibold text-slate-900">{g.class_group}</b>, "With the application form", inr(g.form_fee), "Non-refundable"])} /></Panel>
        <Panel title="Due on admission" sub={`Pay within ${x?.pay_within_days ?? 7} days of the offer`}><SimpleTable head={[{ h: "Classes" }, { h: "Admission fee" }, { h: "Caution deposit" }, { h: "When" }]} empty={r.loading ? "Loading…" : "Not set."} rows={(x?.rows ?? []).map((g) => [<b key="c" className="font-semibold text-slate-900">{g.class_group}</b>, inr(g.admission_fee), `${inr(g.caution)} (refundable)`, "One time"])} /></Panel>
      </div>
    </div>
  );
}

// ═════════════ registration ═════════════
export function Register() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: { application_id: string; code: string; child: string; class_sought: string; paid: number }[] }>("/admissions/registration"), []);
  const [search, setSearch] = useState("");
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Register" subtitle="Generate the admission number and student ID." />
      <PipelineStrip active={8} />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Ready to register" noun="students" search={search} onSearch={setSearch} exportName="ready-to-register" exportHead={["Child", "Class", "Application no.", "Fees paid"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.paid])}
        head={["Child", "Fees", "Admission no.", ""]} empty={r.loading ? "Loading…" : "Nobody has paid and is waiting to be registered."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, <span key="f" className="flex items-center gap-1.5"><Chip tone="good">Paid</Chip>{inr(x.paid)}</span>, "Generated on register", <button key="b" type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/school/front-office/adm-applications/${x.application_id}/admission-number`, json("POST", {})))}>Register</button>])} />
    </div>
  );
}

// ═════════════ class allocation ═════════════
interface Alloc { year: { id: string; name: string } | null; sections: { id: string; grade_id: string; class_name: string; name: string; capacity: number; students: number }[]; items: { application_id: string; code: string; child: string; class_sought: string; admission_no: string | null; grade_id: string | null; suggested: { section_id: string; label: string; students: number; capacity: number } | null }[] }

export function Allocate() {
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<Alloc>("/admissions/allocation"), []);
  const [search, setSearch] = useState(""); const [row, setRow] = useState<Alloc["items"][number] | null>(null);
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Allocate" subtitle="Assign academic year, section and roll number. The section with the most free seats is suggested." />
      <PipelineStrip active={9} />
      <ErrorBanner message={r.error} />
      <DataTable title="To allocate" noun="students" search={search} onSearch={setSearch} exportName="to-allocate" exportHead={["Child", "Class", "Application no.", "Admission no.", "Suggested"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.code, x.admission_no, x.suggested?.label])}
        head={["Child", "Admission no.", "Suggested", ""]} empty={r.loading ? "Loading…" : "Nobody is waiting for a class."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.admission_no ?? "—", x.suggested ? <span key="s">{x.suggested.label} <span className="text-slate-500">({x.suggested.students}/{x.suggested.capacity})</span></span> : "No section with a free seat", <button key="a" type="button" className={blueBtn} onClick={() => setRow(x)}>Allocate</button>])} />
      {row && r.data?.year && <AllocateDialog data={r.data} row={row} onClose={() => setRow(null)} onDone={() => { setRow(null); r.reload(); a.refreshBadges(); }} />}
      {row && !r.data?.year && <Modal open title="Allocate" onClose={() => setRow(null)}><p className="text-sm text-slate-700">The school has no academic year for the admissions yet. Create one in School Admin first.</p></Modal>}
    </div>
  );
}
function AllocateDialog({ data, row, onClose, onDone }: { data: Alloc; row: Alloc["items"][number]; onClose: () => void; onDone: () => void }) {
  const options = data.sections.filter((s) => s.grade_id === row.grade_id);
  const [section, setSection] = useState(row.suggested?.section_id ?? options[0]?.id ?? "");
  const chosen = options.find((s) => s.id === section);
  const [roll, setRoll] = useState("");
  const act = useAction(() => undefined);
  const go = async (e: FormEvent) => { e.preventDefault(); if (!chosen || !row.grade_id || !data.year) return; if (await act.run(() => schoolFetch(`/school/front-office/adm-applications/${row.application_id}/allocate`, json("POST", { academic_year_id: data.year?.id, grade_id: row.grade_id, section_id: chosen.id, roll_no: roll || String(chosen.students + 1) })))) onDone(); };
  return (
    <Modal open title={`Allocate · ${row.child}`} onClose={onClose}><form onSubmit={go} className="space-y-3"><ErrorBanner message={act.error} />
      {!options.length ? <p className="text-sm text-slate-700">There is no section for {row.class_sought} in {data.year?.name}. Add one in School Admin › Academics first.</p> : <>
        <Label label="Section"><select className={inputCls} value={section} onChange={(e) => setSection(e.target.value)}>{options.map((s) => <option key={s.id} value={s.id}>{s.class_name} {s.name} ({s.students}/{s.capacity})</option>)}</select></Label>
        <Label label="Roll number"><input className={inputCls} maxLength={30} placeholder={String((chosen?.students ?? 0) + 1)} value={roll} onChange={(e) => setRoll(e.target.value)} /></Label></>}
      <Actions onCancel={onClose} busy={act.busy || !options.length} label="Allocate" /></form></Modal>
  );
}

export function SectionStrength() {
  const r = useLoad(() => schoolFetch<Alloc>("/admissions/allocation"), []);
  const [search, setSearch] = useState("");
  const rows = (r.data?.sections ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Section Strength" subtitle={`Section strength for ${r.data?.year ? yr(r.data.year.name) : "the year"}, including new admissions.`} />
      <PipelineStrip active={9} />
      <ErrorBanner message={r.error} />
      <DataTable title="Section strength" noun="sections" search={search} onSearch={setSearch} exportName="section-strength" exportHead={["Class", "Section", "Students", "Free seats"]}
        exportRows={rows.map((x) => [x.class_name, x.name, x.students, x.capacity - x.students])}
        head={["Class", "Section", "Students", "Free seats"]} empty={r.loading ? "Loading…" : "No sections for this year."}
        rows={rows.map((x) => [<b key="c" className="font-semibold text-slate-900">{x.class_name}</b>, x.name, x.students, <b key="f">{x.capacity - x.students}</b>])} />
    </div>
  );
}

// ═════════════ admitted ═════════════
interface Adm { year: string; tiles: { admitted: number; profiles: number; fee_accounts: number; logins: number; collected: number }; items: { application_id: string; code: string; child: string; class_sought: string; admission_no: string | null; class_label: string; confirmed_at: string | null; student: boolean; parent: boolean; fees: boolean; klass: boolean; login: boolean }[] }

export function Admitted() {
  const r = useLoad(() => schoolFetch<Adm>("/admissions/admitted"), []);
  const [search, setSearch] = useState("");
  const x = r.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
  const t = x?.tiles;
  return (
    <div>
      <Head title="Admitted" subtitle="Admitted students. Each one now has a student profile, a parent profile, a fee account, a class and portal logins." />
      <PipelineStrip active={11} />
      <ErrorBanner message={r.error} />
      <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Tile label="Admitted" value={t?.admitted ?? 0} sub={x?.year ? yr(x.year) : ""} bg={BLUE} /><Tile label="Student profiles" value={t?.profiles ?? 0} sub="In Student Management" bg={BLUE} /><Tile label="Fee accounts" value={t?.fee_accounts ?? 0} sub={`${inr(t?.collected ?? 0)} collected incl. application fees`} bg={BLUE} /><Tile label="Portal logins" value={t?.logins ?? 0} sub="Student and parent" bg={BLUE} />
      </div>
      <DataTable title={`Admitted${x?.year ? ` · ${yr(x.year)}` : ""}`} noun="students" search={search} onSearch={setSearch} exportName="admitted" exportHead={["Student", "Class", "Application no.", "Admission no.", "Class and roll", "Confirmed"]}
        exportRows={rows.map((i) => [i.child, i.class_sought, i.code, i.admission_no, i.class_label, dmy(i.confirmed_at)])}
        head={["Student", "Admission no.", "Class", "Confirmed", "Created"]} empty={r.loading ? "Loading…" : "Nobody is admitted yet."}
        rows={rows.map((i) => [<ChildCell key="c" name={i.child} sub={`${i.class_sought} · ${i.code}`} />, i.admission_no ?? "—", i.class_label, dmy(i.confirmed_at), <span key="m" className="flex flex-wrap gap-1">{([["Student", i.student], ["Parent", i.parent], ["Fees", i.fees], ["Class", i.klass], ["Login", i.login]] as [string, boolean][]).map(([l, ok]) => <Chip key={l} tone={ok ? "good" : "mute"}>{l}</Chip>)}</span>])} />
    </div>
  );
}

// ═════════════ reports ═════════════
interface Reports { year: string; funnel: { label: string; count: number; pct: number }[]; fees: { collected: number; families: number; pending: number; pending_families: number; waived: number; by_group: { label: string; total: number }[]; by_source: { label: string; total: number }[]; register: { id: string; code: string; child: string; class_sought: string; status: string; amount: number; paid_on: string | null; how: string }[] }; sources: { source: string; enquiries: number; applications: number; admitted: number; pct: number }[]; counsellors: { name: string; leads: number; followups: number; admitted: number; lost: number }[] }
export type ReportTab = "funnel" | "application-fees" | "source-wise" | "counsellors";
const TITLES: Record<ReportTab, [string, string]> = { funnel: ["Funnel", "How enquiries turn into admissions this season."], "application-fees": ["Application Fees", "Application fees collected, pending and waived this season."], "source-wise": ["Source-wise", "Which channels bring families who actually join."], counsellors: ["Counsellors", "Each counsellor's leads and admissions."] };

export function AdmissionReports({ tab }: { tab: ReportTab }) {
  const r = useLoad(() => schoolFetch<Reports>("/admissions/reports"), []);
  const [search, setSearch] = useState(""); const [state, setState] = useState("");
  const x = r.data;
  return (
    <div>
      <Head title={TITLES[tab][0]} subtitle={TITLES[tab][1]} />
      <ErrorBanner message={r.error} />
      {!x ? <p className="py-10 text-center text-sm text-slate-400">Loading…</p> : tab === "funnel" ? (
        <Panel title="Conversion funnel" sub={yr(x.year)}><div className="space-y-3 px-5 py-4">{x.funnel.map((f) => <div key={f.label} className="flex items-center gap-3 text-[12.5px]"><span className="w-28 shrink-0 text-slate-900">{f.label}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${f.pct}%` }} /></span><span className="w-20 shrink-0 text-right tabular-nums text-slate-700">{f.count} · {f.pct}%</span></div>)}</div></Panel>
      ) : tab === "application-fees" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3"><Tile label="Collected" value={inr(x.fees.collected)} sub={`${x.fees.families} families`} bg={GREEN} /><Tile label="Pending" value={inr(x.fees.pending)} sub={`${x.fees.pending_families} families`} bg={AMBER} tone="text-[#8a5a0b]" /><Tile label="Waived" value={x.fees.waived} sub="families" bg={BLUE} /></div>
          <div className="grid gap-5 lg:grid-cols-2"><Panel title="Collected by class group"><BarRows rows={x.fees.by_group.map((g) => ({ label: g.label, value: g.total, max: Math.max(1, ...x.fees.by_group.map((y) => y.total)), text: inr(g.total) }))} /></Panel><Panel title="Collected by source"><BarRows rows={x.fees.by_source.map((g) => ({ label: g.label, value: g.total, max: Math.max(1, ...x.fees.by_source.map((y) => y.total)), text: inr(g.total) }))} /></Panel></div>
          <DataTable title="Application fee register" noun="families" search={search} onSearch={setSearch} exportName="application-fee-register" exportHead={["Child", "Class", "Application no.", "Status", "Amount", "Paid on", "Mode or reason"]}
            filter={<select aria-label="Filter by status" className={`${inputCls} max-w-[8rem]`} value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option>{["Paid", "Pending", "Waived"].map((s) => <option key={s}>{s}</option>)}</select>}
            exportRows={x.fees.register.filter((i) => has(i, search) && (!state || i.status === state)).map((i) => [i.child, i.class_sought, i.code, i.status, i.amount, dmy(i.paid_on), i.how])}
            head={["Child", "Status", "Amount", "Paid on", "Mode / reason"]} empty="No applications yet."
            rows={x.fees.register.filter((i) => has(i, search) && (!state || i.status === state)).map((i) => [<ChildCell key="c" name={i.child} sub={`${i.class_sought} · ${i.code}`} />, <Chip key="s" tone={i.status === "Paid" ? "good" : i.status === "Waived" ? "info" : "warn"}>{i.status}</Chip>, inr(i.amount), dmy(i.paid_on), i.how || "—"])} />
        </div>
      ) : tab === "source-wise" ? (
        <DataTable title="Source-wise" noun="sources" search={search} onSearch={setSearch} exportName="source-wise" exportHead={["Source", "Enquiries", "Applications", "Admitted", "Conversion"]} exportRows={x.sources.filter((s) => has(s, search)).map((s) => [s.source, s.enquiries, s.applications, s.admitted, `${s.pct}%`])}
          head={["Source", "Enquiries", "Applications", "Admitted", "Conversion"]} empty="No enquiries yet." rows={x.sources.filter((s) => has(s, search)).map((s) => [<b key="s" className="font-semibold text-slate-900">{s.source}</b>, s.enquiries, s.applications, s.admitted, `${s.pct}%`])} />
      ) : (
        <DataTable title="Counsellor performance" noun="counsellors" search={search} onSearch={setSearch} exportName="counsellors" exportHead={["Counsellor", "Leads", "Follow-ups", "Admitted", "Lost"]} exportRows={x.counsellors.filter((s) => has(s, search)).map((s) => [s.name, s.leads, s.followups, s.admitted, s.lost])}
          head={["Counsellor", "Leads", "Follow-ups", "Admitted", "Lost"]} empty="No leads have a counsellor yet." rows={x.counsellors.filter((s) => has(s, search)).map((s) => [<b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.leads, s.followups, s.admitted, s.lost])} />
      )}
    </div>
  );
}
