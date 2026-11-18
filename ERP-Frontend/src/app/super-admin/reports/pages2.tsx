"use client";

import Link from "next/link";
import { useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, num } from "@/components/admin/dash";
import { ColumnChart, Chip, CountBars, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { small } from "../schools/pages/shared";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const L = (p: number) => `₹${(p / 100 / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
const when = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const day = (iso: string) => fmtDay(iso.slice(0, 10));
const Close = ({ on }: { on: () => void }) => <div className="flex justify-end pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const NotRecorded = ({ title, text }: { title: string; text: string }) => <Panel title={title}><p className="px-5 py-8 text-sm text-slate-500">{text}</p></Panel>;

// ═════════════ Financial: Outstanding ═════════════
export function FinancialOutstanding() {
  const { data, error } = useLoad(() => adminFetch<{ open_invoices: number; outstanding_paise: number; overdue_paise: number; ageing: { label: string; count: number; total_paise: number }[] }>("/reports/pages/financial-outstanding"), []);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Outstanding", value: data ? L(data.outstanding_paise) : "…", sub: data ? `${data.open_invoices} invoice${data.open_invoices === 1 ? "" : "s"}` : undefined }, { label: "Overdue", value: data ? L(data.overdue_paise) : "…", sub: "Past due date" }]} />
      <Panel title="Ageing" sub="₹ by days past due"><CountBars rows={(data?.ageing ?? []).map((a) => [a.label, a.total_paise] as [string, number])} format={L} /></Panel>
    </div>
  );
}

// ═════════════ Subscriptions ═════════════
export type SubReportTab = "distribution" | "renewals" | "churn";
export function SubscriptionReports({ tab }: { tab: SubReportTab }) {
  return tab === "distribution" ? <Distribution /> : tab === "renewals" ? <Renewals /> : <Churn />;
}

function Distribution() {
  const { data, error } = useLoad(() => adminFetch<{ active: number; by_plan: { plan: string; schools: number; students: number }[] }>("/reports/pages/subs-distribution"), []);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><ErrorBanner message={error} /></div>
      <Panel title="Schools by plan" sub={data ? `${data.active} active` : ""}><CountBars rows={(data?.by_plan ?? []).map((p) => [p.plan, p.schools] as [string, number])} /></Panel>
      <Panel title="Students by plan"><CountBars rows={(data?.by_plan ?? []).map((p) => [p.plan, p.students] as [string, number])} /></Panel>
    </div>
  );
}

interface Ren { renewal_rate_percent: number | null; upgraded: number; items: { school_id: string; school: string; at: string; result: string; summary: string }[] }
function Renewals() {
  const { data, error, loading } = useLoad(() => adminFetch<Ren>("/reports/pages/subs-renewals"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ren["items"][number] | null>(null);
  const rows = (data?.items ?? []).filter((r) => has(`${r.school} ${r.result}`, search));
  const tone = (r: string) => (r === "Renewed" ? "good" : r === "Plan changed" ? "info" : "warn") as "good" | "info" | "warn";
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Renewal rate", value: data?.renewal_rate_percent != null ? `${data.renewal_rate_percent}%` : "—", sub: "Last 12 months" }, { label: "Upgraded at renewal", value: data ? String(data.upgraded) : "…", sub: "Plan changes" }]} />
      <Panel title="Renewals" sub={`${rows.length} renewals`} right={<ExportPrint name="renewals" head={["School", "Date", "Result", "Details"]} rows={rows.map((r) => [r.school, r.at.slice(0, 10), r.result, r.summary])} />}>
        <Search v={search} set={setSearch} label="Search renewals" />
        <SimpleTable head={[{ h: "School" }, { h: "Date" }, { h: "Result" }, { h: "Details" }, { h: "" }]} empty={loading ? "Loading…" : "No renewals recorded yet."}
          rows={rows.map((r) => [<b key="s" className="font-semibold text-slate-900">{r.school}</b>, day(r.at), <Chip key="c" tone={tone(r.result)}>{r.result}</Chip>, r.summary, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.school ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p>{view.result}: {view.summary}</p><p className="text-xs text-slate-500">{when(view.at)}</p><div className="flex justify-between pt-2"><Link href={`/super-admin/subscriptions/${view.school_id}`} className={small}>Open subscription</Link><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

interface Chu { churn_rate_percent: number; revenue_churn_percent: number; top_reason: string | null; top_count: number; items: { school_id: string; school: string; plan: string; left: string; reason: string }[] }
function Churn() {
  const { data, error, loading } = useLoad(() => adminFetch<Chu>("/reports/pages/subs-churn"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Chu["items"][number] | null>(null);
  const rows = (data?.items ?? []).filter((r) => has(`${r.school} ${r.reason}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[
        { label: "Churn rate", value: data ? `${data.churn_rate_percent}%` : "…", sub: "Schools lost, last 12 months" },
        { label: "Revenue churn", value: data ? `${data.revenue_churn_percent}%` : "…", sub: "Annual value lost" },
        { label: "Top reason", value: <span className="text-xl">{data?.top_reason ?? "—"}</span>, sub: data?.top_reason ? `${data.top_count} of ${data.items.length} schools` : undefined },
      ]} />
      <Panel title="Schools lost" sub={`${rows.length} schools`} right={<ExportPrint name="schools-lost" head={["School", "Plan", "Left", "Reason"]} rows={rows.map((r) => [r.school, r.plan, r.left.slice(0, 10), r.reason])} />}>
        <Search v={search} set={setSearch} label="Search schools lost" />
        <SimpleTable head={[{ h: "School" }, { h: "Plan" }, { h: "Left" }, { h: "Reason" }, { h: "" }]} empty={loading ? "Loading…" : "No school has left."}
          rows={rows.map((r) => [<b key="s" className="font-semibold text-slate-900">{r.school}</b>, <span key="p" className="text-[#026f9b]">{r.plan}</span>, day(r.left), r.reason, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.school ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p><b>Plan:</b> {view.plan}</p><p><b>Left:</b> {day(view.left)}</p><p><b>Reason:</b> {view.reason}</p><div className="flex justify-between pt-2"><Link href="/super-admin/subscriptions/discounts?tab=offers" className={small}>Win-back offer</Link><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

// ═════════════ Modules ═════════════
export type ModReportTab = "usage" | "adoption" | "errors";
interface Use { code: string; name: string; category: string; percent: number; schools: number }
export function ModuleReports({ tab }: { tab: ModReportTab }) {
  const { data, error, loading } = useLoad(() => (tab === "errors" ? Promise.resolve([] as Use[]) : adminFetch<Use[]>("/reports/pages/modules-usage")), [tab]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Use | null>(null);
  if (tab === "errors") return <NotRecorded title="Errors by module" text="Errors are not recorded per module yet. This page fills in once the modules report their errors." />;
  if (tab === "usage") {
    const rows = [...(data ?? [])].sort((a, b) => b.percent - a.percent);
    return <div className="space-y-5"><ErrorBanner message={error} /><Panel title="Module usage" sub="% of active schools"><CountBars rows={rows.map((m) => [m.name, m.percent] as [string, number])} format={(n) => n + "%"} /></Panel></div>;
  }
  const rows = (data ?? []).filter((m) => has(`${m.name} ${m.category}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="Adoption" sub={`${rows.length} modules`} right={<ExportPrint name="module-adoption" head={["Module", "Group", "Used by", "Schools"]} rows={rows.map((m) => [m.name, m.category, m.percent + "%", m.schools])} />}>
        <Search v={search} set={setSearch} label="Search adoption" />
        <SimpleTable head={[{ h: "Module" }, { h: "Group" }, { h: "Used by", right: true }, { h: "Median days to first use", right: true }, { h: "Trend" }, { h: "" }]} empty={loading ? "Loading…" : "No modules."}
          rows={rows.map((m) => [<b key="n" className="font-semibold text-slate-900">{m.name}</b>, <Tag key="g">{m.category}</Tag>, `${m.percent}%`, <span key="d" className="text-slate-400">—</span>, <span key="t" className="text-slate-400">—</span>, <button key="v" type="button" className={small} onClick={() => setView(m)}>View details</button>])} />
      </Panel>
      <p className="text-xs text-slate-500">“Used by” is the share of active schools that have the module on. Days to first use and the trend need usage tracking inside each module, which is not recorded yet.</p>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p>{view.schools} active school{view.schools === 1 ? "" : "s"} ({view.percent}%) have this module on.</p><div className="flex justify-between pt-2"><Link href={`/super-admin/modules/catalogue?tab=details&module=${view.code}`} className={small}>Open module</Link><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

// ═════════════ Security ═════════════
export type SecReportTab = "login" | "access" | "audit";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dl = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;

export function SecurityReports({ tab }: { tab: SecReportTab }) {
  return tab === "login" ? <LoginReport /> : tab === "access" ? <AccessReport /> : <AuditReport />;
}

function LoginReport() {
  const { data, error } = useLoad(() => adminFetch<{ sign_ins_30d: number; success_percent: number | null; failed_30d: number; failed_percent: number | null; blocked_ips: number; failed_by_day: { date: string; failed: number; partial: boolean }[] }>("/reports/pages/security-login"), []);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[
        { label: "Sign-ins (30 days)", value: data ? num(data.sign_ins_30d) : "…", sub: data?.success_percent != null ? `${data.success_percent}% successful` : undefined },
        { label: "Failed", value: data ? num(data.failed_30d) : "…", sub: data?.failed_percent != null ? `${data.failed_percent}% of attempts` : undefined },
        { label: "Blocked IPs", value: data ? String(data.blocked_ips) : "…", sub: "On the block list" },
      ]} />
      <Panel title="Failed sign-ins per day" sub="Last 7 days"><ColumnChart title="Failed sign-ins per day" data={(data?.failed_by_day ?? []).map((d) => ({ label: dl(d.date), value: d.failed, partial: d.partial }))} format={(n) => String(n)} /></Panel>
      <p className="text-xs text-slate-500">The last day is today so far.</p>
    </div>
  );
}

function AccessReport() {
  const { data, error, loading } = useLoad(() => adminFetch<{ at: string; user: string; role: string; opened: string; needed: string | null }[]>("/reports/pages/security-access"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<NonNullable<typeof data>[number] | null>(null);
  const rows = (data ?? []).filter((r) => has(`${r.user} ${r.role} ${r.opened}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="Denied access" sub={`${rows.length} events`} right={<ExportPrint name="denied-access" head={["User", "Role", "Tried to open", "When"]} rows={rows.map((r) => [r.user, r.role, r.opened, when(r.at)])} />}>
        <Search v={search} set={setSearch} label="Search denied access" />
        <SimpleTable head={[{ h: "User" }, { h: "Role" }, { h: "Tried to open" }, { h: "When" }, { h: "" }]} empty={loading ? "Loading…" : "Nobody was turned away in the last 30 days."}
          rows={rows.map((r) => [<b key="u" className="font-semibold text-slate-900">{r.user}</b>, <Tag key="r">{r.role}</Tag>, r.opened, when(r.at), <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.user ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p><b>Tried to open:</b> {view.opened}</p><p><b>Needed:</b> {view.needed ?? "—"}</p><p className="text-xs text-slate-500">{when(view.at)}</p><Close on={() => setView(null)} /></div>}</Modal>
    </div>
  );
}

function AuditReport() {
  const { data, error } = useLoad(() => adminFetch<{ by_user: { user: string; count: number }[] }>("/reports/pages/security-audit"), []);
  return <div className="space-y-5"><ErrorBanner message={error} /><Panel title="Changes by user" sub="Last 30 days"><CountBars rows={(data?.by_user ?? []).map((u) => [u.user, u.count] as [string, number])} /></Panel></div>;
}

// ═════════════ System ═════════════
export type SysReportTab = "performance" | "storage" | "errors";
export function SystemReports({ tab }: { tab: SysReportTab }) {
  if (tab === "performance") return <NotRecorded title="Average API response" text="Speed and uptime are not measured here yet. They appear once the platform sends its response times and uptime to this page." />;
  if (tab === "storage") return <NotRecorded title="Storage by school" text="Storage used is not measured yet, because schools can't upload files to the platform. It appears once uploads are on." />;
  return <NotRecorded title="Errors by type" text="Server and app errors are not collected here yet. They appear once an error log is connected." />;
}
