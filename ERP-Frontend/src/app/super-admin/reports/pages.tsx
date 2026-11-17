"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Panel, SimpleTable, num } from "@/components/admin/dash";
import { ColumnChart, Chip, CountBars, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { small } from "../schools/pages/shared";
import Link from "next/link";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mon = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];
const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const lakh = (p: number) => Math.round((p / 1e7) * 10) / 10;
const cr = (p: number) => "₹" + (p / 1e9).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " Cr";

export type SchoolReportTab = "growth" | "activity";
export function SchoolReports({ tab }: { tab: SchoolReportTab }) {
  return tab === "growth" ? <SchoolGrowth /> : <SchoolActivity />;
}

function SchoolGrowth() {
  const { data, error } = useLoad(() => adminFetch<{ series: { month: string; schools: number; partial: boolean }[]; by_state: { state: string; count: number }[] }>("/reports/pages/school-growth"), []);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
      <div className="lg:col-span-2"><ErrorBanner message={error} /></div>
      <Panel title="Schools on the platform" sub="End of each month"><ColumnChart title="Schools on the platform" data={(data?.series ?? []).map((s) => ({ label: mon(s.month), value: s.schools, partial: s.partial }))} format={(n) => String(n)} /></Panel>
      <Panel title="New schools by state" sub="Last 12 months"><CountBars rows={(data?.by_state ?? []).map((s) => [s.state, s.count] as [string, number])} /></Panel>
    </div>
  );
}

interface Act { id: string; code: string; name: string; city: string | null; status: string; students: number; active_users_7d: number; last_sign_in: string | null; health: string }
function SchoolActivity() {
  const { data, error, loading } = useLoad(() => adminFetch<Act[]>("/reports/pages/school-activity"), []);
  const [search, setSearch] = useState("");
  const rows = (data ?? []).filter((s) => has(`${s.name} ${s.code} ${s.city}`, search));
  const tone = (h: string) => (h === "Healthy" ? "good" : h === "Warning" ? "warn" : "mute") as "good" | "warn" | "mute";
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="School activity" sub={`${rows.length} schools`} right={<ExportPrint name="school-activity" head={["School", "Active users (7 days)", "Attendance marked", "Fees collected online", "Health"]} rows={rows.map((s) => [s.name, s.active_users_7d, "", "", s.health])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search school activity" aria-label="Search school activity" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "School" }, { h: "Active users (7 days)", right: true }, { h: "Attendance marked", right: true }, { h: "Fees collected online", right: true }, { h: "Health" }, { h: "" }]} empty={loading ? "Loading…" : "No schools."}
          rows={rows.map((s) => [<div key="s"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></div>, num(s.active_users_7d), <span key="a" className="text-slate-400">—</span>, <span key="f" className="text-slate-400">—</span>, <Chip key="h" tone={tone(s.health)}>{s.health}</Chip>, <Link key="v" href={`/super-admin/schools/${s.id}`} className={small}>View details</Link>])} />
      </Panel>
      <p className="text-xs text-slate-500">Health comes from sign-ins: Healthy if someone signed in this week, Warning if only in the last 30 days. Attendance marked and fees collected online show once the Attendance and Fees modules are built.</p>
    </div>
  );
}

export type UserReportTab = "growth" | "engagement";
export function UserReports({ tab }: { tab: UserReportTab }) {
  return tab === "growth" ? <UserGrowth /> : <UserEngagement />;
}

function UserGrowth() {
  const { data, error } = useLoad(() => adminFetch<{ series: { month: string; accounts: number; partial: boolean }[]; by_role: { role: string; count: number }[] }>("/reports/pages/user-growth"), []);
  const k = (data?.series ?? []).some((s) => s.accounts >= 5000);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
      <div className="lg:col-span-2"><ErrorBanner message={error} /></div>
      <Panel title="Accounts on the platform" sub={k ? "Thousands, end of month" : "End of month"}><ColumnChart title="Accounts on the platform" data={(data?.series ?? []).map((s) => ({ label: mon(s.month), value: k ? Math.round(s.accounts / 100) / 10 : s.accounts, partial: s.partial }))} format={(n) => (k ? `${n}k` : String(n))} /></Panel>
      <Panel title="By role" sub="Now"><CountBars rows={(data?.by_role ?? []).map((r) => [r.role, r.count] as [string, number])} /></Panel>
    </div>
  );
}

interface Eng { dau: number; mau: number; month: string; stickiness_percent: number | null; avg_session_seconds: number | null; by_app: { app: string; users: number }[] }
function UserEngagement() {
  const { data, error } = useLoad(() => adminFetch<Eng>("/reports/pages/user-engagement"), []);
  const sess = data?.avg_session_seconds;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[
        { label: "Daily active users", value: data ? num(data.dau) : "…", sub: "Yesterday" },
        { label: "Monthly active users", value: data ? num(data.mau) : "…", sub: data?.month },
        { label: "Stickiness", value: data?.stickiness_percent != null ? `${data.stickiness_percent}%` : "—", sub: "Daily ÷ monthly" },
        { label: "Avg session", value: sess != null ? `${Math.floor(sess / 60)} m ${sess % 60} s` : "—", sub: "Typical session, last 30 days" },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <Panel title="Daily active users by app" sub="Yesterday"><CountBars rows={(data?.by_app ?? []).map((a) => [a.app, a.users] as [string, number])} /></Panel>
        <Panel title="Most used features" sub="Parent app, last 7 days"><p className="px-5 py-8 text-sm text-slate-500">Not recorded yet. It fills in once the parent app reports which screens people open.</p></Panel>
      </div>
    </div>
  );
}

export type FinReportTab = "revenue";
export function FinancialRevenue() {
  const { data, error } = useLoad(() => adminFetch<{ monthly: { month: string; collected_paise: number }[]; fy_label: string; fy_total_paise: number; by_plan: { plan_name: string; paise: number }[] }>("/reports/pages/financial-revenue"), []);
  const cur = new Date().toISOString().slice(0, 7);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
      <div className="lg:col-span-2"><ErrorBanner message={error} /></div>
      <Panel title="Collected per month" sub="₹ lakh"><ColumnChart title="Collected per month" data={(data?.monthly ?? []).map((m) => ({ label: mon(m.month), value: lakh(m.collected_paise), partial: m.month === cur }))} format={(n) => `${n}L`} /></Panel>
      <Panel title={`FY ${data?.fy_label ?? ""} by plan`} sub={data ? cr(data.fy_total_paise) : ""}><CountBars rows={(data?.by_plan ?? []).map((p) => [p.plan_name, p.paise] as [string, number])} format={cr} /></Panel>
    </div>
  );
}

interface Coll { series: { month: string; rate_percent: number; partial: boolean }[]; collection_rate_percent: number | null; on_time_percent: number | null; late_percent: number | null }
export function FinancialCollection() {
  const { data, error } = useLoad(() => adminFetch<Coll>("/reports/pages/financial-collection"), []);
  const pc = (n: number | null | undefined) => (n == null ? "—" : n + "%");
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Collection rate", value: pc(data?.collection_rate_percent), sub: "Last 12 months" }, { label: "On time", value: pc(data?.on_time_percent), sub: "Paid by the due date" }, { label: "Late", value: pc(data?.late_percent), sub: "After the invoice" }]} />
      <Panel title="Collection rate by month" sub="%"><ColumnChart title="Collection rate by month" data={(data?.series ?? []).map((s) => ({ label: mon(s.month), value: s.rate_percent, partial: s.partial }))} format={(n) => n + "%"} /></Panel>
      <p className="text-xs text-slate-500">The latest month is month to date, so it is lower.</p>
    </div>
  );
}
