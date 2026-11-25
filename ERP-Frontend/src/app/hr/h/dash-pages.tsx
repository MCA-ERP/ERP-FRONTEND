"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { PayrollRuns as MonthlyPayrollTable } from "./payroll-pages";
import { Head, redBtn, whiteBtn } from "../../teacher/t/head";
import { Empty, Loading, day } from "../../teacher/t/dash-pages";
import { useHr } from "../context";
import { inPlan } from "./menu-config";

interface Waiting { key: string; count: number; tone: "warn" | "info"; title: string; detail: string; action: string; href: string }
interface Over {
  date: string; month: string; month_label: string; employees: number; teaching: number; non_teaching: number;
  attendance_marked: number; present: number; present_pct: number; attendance_source: string; on_leave: number; absent: number; leave_waiting: number;
  payroll_status: string; pay_date: string; steps: boolean[]; waiting: Waiting[]; headcount: [string, number][];
}

/** The 8 steps from a new employee to a paid salary, and the page each one is done on. */
const STEPS: [string, string][] = [
  ["Create employee profile", "/hr/employees/employee-registration"],
  ["Assign department, designation and salary", "/hr/organisation/salary-structure"],
  ["Record daily attendance", "/hr/attendance/staff-attendance"],
  ["Process employee leave", "/hr/leave/leave-management?tab=approvals"],
  ["Calculate salary and deductions", "/hr/payroll/payroll-processing?tab=generate-payroll"],
  ["HR verifies payroll", "/hr/payroll-approval/payroll-approval?tab=hr-verification"],
  ["Finance officer approves payroll", "/hr/payroll-approval/payroll-approval?tab=finance-approval"],
  ["Generate payslips and payments", "/hr/payslips/payslips?tab=generate"],
];
const PAY_ORDER = ["Calculated", "Verified", "Approved", "Paid"];
export const statusName: Record<string, string> = { Draft: "Not started", Calculated: "Calculated", Verified: "HR verified", Approved: "Approved", Paid: "Paid" };

const greeting = () => { const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const pill = "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-slate-900 hover:border-slate-400";

function Tile({ label, value, sub, tone = "blue" }: { label: string; value: string | number; sub: string; tone?: "blue" | "green" | "amber" }) {
  const bg = { blue: "bg-[#e8f4fb]", green: "bg-[#d9efe8]", amber: "bg-[#f8ecd6]" }[tone];
  return <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className={`mt-0.5 text-[24px] font-bold leading-tight tabular-nums ${tone === "amber" ? "text-[#8a5a0b]" : "text-slate-900"}`}>{value}</p><p className="mt-0.5 text-xs text-slate-600">{sub}</p></div>;
}

/** The four steps of a month's payroll, marking how far it has got. */
export function PayrollSteps({ status }: { status: string }) {
  const done = PAY_ORDER.indexOf(status) + 1; // 0 = nothing yet
  const steps: [string, boolean][] = [["Calculate salary", done >= 1], ["HR verification", done >= 2], ["Finance approval", done >= 3], ["Payslips and payment", done >= 4]];
  const next = steps.findIndex(([, ok]) => !ok);
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {steps.map(([label, ok], i) => (
        <div key={label} className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 ${i === next ? "border-[#41afda] bg-[#f3f9fd]" : ok ? "border-[#bfe3d5] bg-[#eef8f3]" : "border-slate-200 bg-white"}`}>
          <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${ok ? "bg-[#0b6b4f] text-white" : i === next ? "bg-[#026f9b] text-white" : "bg-slate-100 text-slate-600"}`}>{ok ? "✓" : i + 1}</span>
          <span className="min-w-0"><span className="block text-[12.5px] font-semibold text-slate-900">{label}</span><span className="block text-[11.5px] text-slate-500">{ok ? "Done" : i === next ? "Next" : "Waiting"}</span></span>
        </div>
      ))}
    </div>
  );
}

/** The month's payroll in four steps, with what happens next. */
function Tracker({ x }: { x: Over }) {
  const done = PAY_ORDER.indexOf(x.payroll_status) + 1; // 0 = nothing yet
  const next = done >= 4 ? -1 : done;
  const go: [string, string, string][] = [
    ["Calculate", "/hr/payroll/payroll-processing?tab=generate-payroll", `Calculate the ${x.month_label} payroll`],
    ["Verify", "/hr/payroll-approval/payroll-approval?tab=hr-verification", "Verify the payroll as HR"],
    ["View", "/hr/payroll-approval/payroll-approval?tab=finance-approval", "The finance officer approves it in Fee & Finance"],
    ["Payslips", "/hr/payslips/payslips?tab=generate", "Generate payslips. Accounts records the salary payments"],
  ];
  const action = next >= 0 ? go[next] : null;
  return (
    <Panel title={`${x.month_label} payroll`} sub={statusName[x.payroll_status] ?? x.payroll_status} right={action ? <Link href={action[1]} className={pill}>{action[0]}</Link> : undefined}>
      <div className="p-4">
        <PayrollSteps status={x.payroll_status} />
        <p className="mt-3 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">{action ? <>Next: <b>{action[2]}</b>.</> : <>The {x.month_label} payroll is paid.</>}</p>
      </div>
    </Panel>
  );
}

export function Overview() {
  const { user, hasModule } = useHr();
  const router = useRouter();
  const { data: x, error, loading } = useLoad(() => schoolFetch<Over>("/hr/overview"), []);
  const payroll = inPlan("payroll", hasModule);
  const done = x?.steps.filter(Boolean).length ?? 0;
  const first = (user.fullName ?? "").split(/\s+/)[0];
  return (
    <div data-report>
      <Head title="Overview" subtitle={`${greeting()}${first ? `, ${first}` : ""}. Here's HR today${x ? `, ${day(x.date)}` : ""}.`} action={payroll ? <button type="button" className={redBtn} onClick={() => router.push("/hr/payroll/payroll-processing?tab=generate-payroll")}>Calculate payroll</button> : undefined} />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (
        <div className="space-y-5">
          <Panel title="HR and payroll workflow" sub={`${done} of 8 done · opens each step`}>
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {STEPS.map(([label, href], i) => (
                <Link key={label} href={href} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] leading-snug text-slate-900 hover:border-[#41afda] ${x.steps[i] ? "border-[#bfe3d5] bg-[#eef8f3]" : "border-slate-200"}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${x.steps[i] ? "bg-[#0b6b4f] text-white" : "bg-[#dceff9] text-[#026f9b]"}`}>{x.steps[i] ? "✓" : i + 1}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </Panel>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Tile label="Employees" value={x.employees} sub={`${x.teaching} teaching · ${x.non_teaching} non-teaching`} />
            <Tile tone="green" label="Present today" value={x.attendance_marked ? x.present : "—"} sub={x.attendance_marked ? `${x.present_pct}%${x.attendance_source ? ` · ${x.attendance_source}` : ""}` : "Not marked yet"} />
            <Tile label="On leave" value={x.on_leave} sub={`${x.absent} absent without leave`} />
            <Tile tone="amber" label="Leave requests" value={x.leave_waiting} sub="Waiting for approval" />
            {payroll && <Tile label={`${x.month_label} payroll`} value={statusName[x.payroll_status] ?? x.payroll_status} sub={`Pay date ${x.pay_date}`} />}
          </div>
          <div className={`grid gap-5 ${payroll ? "lg:grid-cols-[1.6fr_1fr]" : ""}`}>
            {payroll && <Tracker x={x} />}
            <Panel title="Waiting for you">
              {x.waiting.length ? (
                <ul className="divide-y divide-slate-100">
                  {x.waiting.map((w) => (
                    <li key={w.key} className="flex items-center gap-3 px-4 py-3">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${w.tone === "warn" ? "bg-[#f8ecd6] text-[#8a5a0b]" : "bg-[#dceff9] text-[#026f9b]"}`}>{w.count}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-900">{w.title}</span><span className="block text-[11.5px] text-slate-500">{w.detail}</span></span>
                      <Link href={w.href} className={pill}>{w.action}</Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="Nothing is waiting for you." />}
            </Panel>
          </div>
          <Panel title="Headcount by department" sub="Employees">
            <BarRows rows={x.headcount} format={(v) => String(v)} />
          </Panel>
        </div>
      )}
    </div>
  );
}

export function PayrollStatus() {
  const { data: x, error, loading } = useLoad(() => schoolFetch<Over>("/hr/overview"), []);
  return (
    <div>
      <Head title="Payroll Status" subtitle="Where this month's payroll is, and what happens next." />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-5"><Tracker x={x} /><MonthlyPayrollTable /></div>}
    </div>
  );
}

interface Note { key: string; mark: string; tone: "warn" | "info" | "bad"; title: string; detail: string; href: string; read: boolean }
export function Notifications() {
  const { refreshBadges } = useHr();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Note[]; total: number }>("/hr/notifications"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const read = (keys?: string[]) => act.run(() => schoolFetch("/hr/notifications/read", json("POST", keys ? { keys } : {})));
  const items = data?.items ?? [];
  const tone = { warn: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]", bad: "bg-[#fce0df] text-[#ac2c28]" };
  return (
    <div>
      <Head title="Notifications" subtitle="Everything the portal has told you recently. Open one to go straight to it." action={<button type="button" className={whiteBtn} disabled={act.busy || !data?.total} onClick={() => void read()}>Mark all as read</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="All notifications" sub={`${data.total} unread`}>
          {items.length ? (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.key}>
                  <Link href={n.href} onClick={() => { if (!n.read) void read([n.key]); }} className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${n.read ? "" : "bg-[#f8fbfd]"}`}>
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${tone[n.tone]}`} aria-hidden="true">{n.mark}</span>
                    <span className="min-w-0 flex-1"><span className={`block text-[13px] text-slate-900 ${n.read ? "" : "font-semibold"}`}>{n.title}</span><span className="block text-[11.5px] text-slate-500">{n.detail}</span></span>
                    {!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty text="Nothing new. You are up to date." />}
        </Panel>
      )}
    </div>
  );
}

interface Pipe { open_posts: number; avg_days: number | null; acceptance: number | null; joining: number; funnel: [string, number][]; posts: { id: string; post: string; applied: number; shortlisted: number; selected: number; closes_on: string | null }[] }
export function HiringPipeline() {
  const { data: x, error, loading } = useLoad(() => schoolFetch<Pipe>("/hr/pipeline"), []);
  return (
    <div data-report>
      <Head title="Hiring Pipeline" subtitle="From vacancy to joining, for every open post." />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Open posts", value: x.open_posts }, { label: "Avg days to fill", value: x.avg_days ?? "—", sub: x.avg_days === null ? "No post filled yet" : undefined }, { label: "Offer acceptance", value: x.acceptance === null ? "—" : `${x.acceptance}%`, sub: x.acceptance === null ? "No offer answered yet" : undefined }, { label: "Joining this month", value: x.joining, sub: x.joining ? "Onboarding in progress" : undefined }]} />
          <Panel title="Hiring pipeline"><BarRows rows={x.funnel} format={(v) => String(v)} /></Panel>
          <Panel title="By post" sub={`${x.posts.length} ${x.posts.length === 1 ? "post" : "posts"}`} right={<ExportPrint name="hiring-by-post" head={["Post", "Applied", "Shortlisted", "Selected", "Closes"]} rows={x.posts.map((p) => [p.post, p.applied, p.shortlisted, p.selected, p.closes_on ? day(p.closes_on) : ""])} />}>
            <SimpleTable head={[{ h: "Post" }, { h: "Applied", right: true }, { h: "Shortlisted" }, { h: "Selected" }, { h: "Closes" }]} empty="No open posts." rows={x.posts.map((p) => [<b key="p" className="font-semibold text-slate-900">{p.post}</b>, <span key="a" className="block text-right">{p.applied}</span>, p.shortlisted, p.selected, p.closes_on ? day(p.closes_on) : "—"])} />
          </Panel>
        </div>
      )}
    </div>
  );
}
