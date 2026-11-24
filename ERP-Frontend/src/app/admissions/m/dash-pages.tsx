"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Row } from "../../school/s/dash-pages";
import { Head, redBtn } from "../../teacher/t/head";
import { useAdmissions } from "../context";
import { sectionHref, STEP_LINKS } from "./menu-config";
import { PipelineStrip, type StepCount } from "./strip";
import { AMBER, BLUE, BarRows, ChildCell, DataTable, Loading, Tile, blueBtn, dmy, has, phone, pillBtn, whiteBtn } from "./ui";

// ═════════════ overview ═════════════
interface Overview {
  year: string; steps: StepCount[];
  tiles: { enquiries: { total: number; since: string | null }; applications: { total: number; pct: number }; admitted: { total: number; pct: number }; waiting: { total: number; approvals: number; followups: number }; fees: { collected: number; paid: number; pending: number } };
  funnel: { label: string; count: number }[]; seats: { name: string; taken: number; total: number }[];
  followups: { id: string; child: string; class_sought: string; counsellor: string; mobile: string | null; date: string }[]; sources: { label: string; count: number }[];
}
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const yearLabel = (y: string) => y.replace(/^(\d{4})-(\d{4})$/, (_, a: string, b: string) => `${a}-${b.slice(2)}`);

export function Overview() {
  const r = useLoad(() => schoolFetch<Overview>("/admissions/overview"), []);
  const router = useRouter();
  const x = r.data;
  const sub = (year: string) => `Admissions for ${yearLabel(year) || "this year"}: where every family is in the process, and what needs doing today.`;
  if (!x) return <><Head title="Overview" subtitle={sub("")} /><ErrorBanner message={r.error} /><Loading /></>;
  const t = x.tiles; const fmax = Math.max(1, ...x.funnel.map((f) => f.count));
  return (
    <div>
      <Head title="Overview" subtitle={sub(x.year)} action={<button type="button" className={redBtn} onClick={() => router.push(sectionHref("enquiries", "admission-enquiry"))}>New enquiry</button>} />
      <PipelineStrip steps={x.steps} />
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Tile label="Enquiries" value={t.enquiries.total} sub={t.enquiries.since ? `Since ${dmy(t.enquiries.since)}` : "None yet"} bg={BLUE} />
        <Tile label="Applications" value={t.applications.total} sub={`${t.applications.pct}% of enquiries`} bg={BLUE} />
        <Tile label="Admitted" value={t.admitted.total} sub={`${t.admitted.pct}% conversion`} bg={BLUE} />
        <Tile label="Waiting on you" value={t.waiting.total} sub={`${t.waiting.approvals} approval${t.waiting.approvals === 1 ? "" : "s"} · ${t.waiting.followups} follow-up${t.waiting.followups === 1 ? "" : "s"} due`} bg={AMBER} tone="text-[#8a5a0b]" />
        <Tile label="Admission fees" value={inr(t.fees.collected)} sub={`${t.fees.paid} paid · ${t.fees.pending} waiting`} bg={AMBER} tone="text-[#8a5a0b]" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Admission funnel" sub="Families at each step now"><BarRows rows={x.funnel.map((f) => ({ label: f.label, value: f.count, max: fmax, text: String(f.count) }))} /></Panel>
        <Panel title={`Seats · ${yearLabel(x.year)}`} sub="Admitted against seats"><BarRows rows={x.seats.map((s) => ({ label: s.name, value: s.taken, max: s.total, text: `${s.taken} / ${s.total}` }))} /></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Follow-ups due" sub="Today and overdue" right={<button type="button" className={pillBtn} onClick={() => router.push(sectionHref("leads", "lead-management"))}>Open leads</button>}>
          {x.followups.length ? <ul>{x.followups.map((f) => <li key={f.id} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0"><span className="grid size-8 place-items-center rounded-full bg-[#fde3e1] text-[13px] font-bold text-[#ac2c28]">{f.child.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-slate-900">{f.child} <span className="font-normal text-slate-500">· {f.class_sought}</span></span><span className="block text-[11.5px] text-slate-500">{f.counsellor} · {phone(f.mobile)}</span></span><span className="text-[12px] text-slate-700">{dmy(f.date)}</span></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">Nothing is due. You are up to date.</p>}
        </Panel>
        <Panel title="Source of enquiries" sub="This season"><BarRows rows={x.sources.map((s) => ({ label: s.label, value: s.count, max: Math.max(1, ...x.sources.map((y) => y.count)), text: String(s.count) }))} /></Panel>
      </div>
    </div>
  );
}

// ═════════════ pipeline ═════════════
interface Fam { key: string; kind: "enquiry" | "application"; id: string; code: string; child: string; class_sought: string; parent_name: string; mobile: string | null; source: string; counsellor: string; step: number; step_label: string; status: "Active" | "Admitted" | "Waitlisted" | "Returned" | "Rejected" | "Lost" }
const STATUS_TONE: Record<Fam["status"], "good" | "warn" | "bad" | "mute"> = { Active: "good", Admitted: "good", Waitlisted: "warn", Returned: "warn", Rejected: "bad", Lost: "mute" };

export function Pipeline() {
  const params = useSearchParams(); const router = useRouter();
  const r = useLoad(() => schoolFetch<{ year: string; items: Fam[] }>("/admissions/pipeline"), []);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [step, setStep] = useState("");
  const [view, setView] = useState<Fam | null>(null);
  const all = r.data?.items ?? [];
  const rows = all.filter((f) => has(f, search) && (!step || String(f.step) === step));
  const open = (f: Fam) => router.push(STEP_LINKS[f.step - 1].href);
  return (
    <div>
      <Head title="Pipeline" subtitle="Every family in the process. Open a name for the full record, or jump to the step it's waiting at." />
      <ErrorBanner message={r.error} />
      <DataTable title={r.data?.year ? `Admission pipeline · ${yearLabel(r.data.year)}` : "Admission pipeline"} noun="families" search={search} onSearch={setSearch} exportName="admission-pipeline" exportHead={["Child", "Class", "Code", "Parent", "Mobile", "Source", "Step", "Status", "Counsellor"]}
        exportRows={rows.map((f) => [f.child, f.class_sought, f.code, f.parent_name, f.mobile, f.source, `${f.step}/11 ${f.step_label}`, f.status, f.counsellor])}
        filter={<select aria-label="Filter by step" className={`${inputCls} max-w-[11rem]`} value={step} onChange={(e) => setStep(e.target.value)}><option value="">All steps</option>{STEP_LINKS.map((s, i) => <option key={s.label} value={i + 1}>{i + 1}. {s.label}</option>)}</select>}
        head={["Child", "Parent", "Source", "Step", "Status", "Counsellor", ""]} empty={r.loading ? "Loading…" : "No families yet. Record an enquiry to begin."}
        rows={rows.map((f) => [<ChildCell key="c" name={f.child} sub={`${f.class_sought} · ${f.code}`} onClick={() => setView(f)} />, <span key="p">{f.parent_name}</span>, <Chip key="s" tone="info">{f.source}</Chip>, <span key="t">{f.step}/11 {f.step_label}</span>, <Chip key="u" tone={STATUS_TONE[f.status]}>{f.status}</Chip>, f.counsellor, f.status === "Admitted" ? "" : <button key="o" type="button" className={pillBtn} onClick={() => open(f)}>Open step</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.child}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Class" v={view.class_sought} /><Row k="Parent" v={view.parent_name} /><Row k="Mobile" v={phone(view.mobile)} /><Row k="Source" v={view.source} /><Row k="Counsellor" v={view.counsellor} /><Row k="Step" v={`${view.step}/11 ${view.step_label}`} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{view.status !== "Admitted" && <button type="button" className={blueBtn} onClick={() => open(view)}>Open step</button>}<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
    </div>
  );
}

// ═════════════ notifications ═════════════
interface Note { key: string; tone: "bad" | "warn" | "info" | "good"; mark: string; title: string; note: string; when: string; read: boolean; href?: string }
const NOTE_ICON: Record<Note["tone"], string> = { bad: "bg-[#fde3e1] text-[#ac2c28]", warn: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]", good: "bg-[#d9efe8] text-[#065740]" };

export function Notifications() {
  const a = useAdmissions(); const router = useRouter();
  const r = useLoad(() => schoolFetch<{ items: Note[]; unread: number }>("/admissions/notifications"), []);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const open = (n: Note) => { void act.run(() => schoolFetch("/admissions/notifications/read", json("POST", { keys: [n.key] }))); if (n.href) router.push(n.href); };
  return (
    <div>
      <Head title="Notifications" subtitle="Everything the portal has told you recently. Open one to go straight to it." action={<button type="button" className={whiteBtn} disabled={act.busy || !r.data?.unread} onClick={() => void act.run(() => schoolFetch("/admissions/notifications/read", json("POST", {})))}>Mark all as read</button>} />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="All notifications">
        {!r.data ? <p className="p-6 text-center text-sm text-slate-400">Loading…</p> : !r.data.items.length ? <p className="p-6 text-center text-sm text-slate-400">Nothing new. You are up to date.</p> : <ul>{r.data.items.map((n) => (
          <li key={n.key} className={`border-t border-slate-100 first:border-t-0 ${n.read ? "" : "bg-[#f3f9fd]"}`}><button type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold ${NOTE_ICON[n.tone]}`}>{n.mark}</span>
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-slate-900">{n.title}</span><span className="block text-[12px] text-slate-500">{n.note}</span><span className="block text-[11.5px] text-slate-500">{n.when}</span></span>
            {!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
          </button></li>
        ))}</ul>}
      </Panel>
    </div>
  );
}
