"use client";

import { adminFetch, type ReportsOverview } from "@/lib/admin-api";
import { BarRows, Panel, SimpleTable, StatGrid, lakh, num } from "@/components/admin/dash";
import { ErrorBanner, useLoad } from "@/components/admin/ui";

// ── overview ────────────────────────────────────────────────
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

function GrowthChart({ points }: { points: { month: string; students: number }[] }) {
  const W = 560, H = 200, left = 44, bottom = 24;
  const max = Math.max(1, ...points.map((p) => p.students));
  const x = (i: number) => left + (i * (W - left - 16)) / Math.max(1, points.length - 1);
  const y = (v: number) => 10 + ((max - v) / max) * (H - bottom - 10);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.students).toFixed(1)}`).join(" ");
  const area = `M${x(0)},${H - bottom} L${line.split(" ").join(" L")} L${x(points.length - 1)},${H - bottom}Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Students on the platform over the last 12 months" className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke="#e1e5ea" />
          <text x={left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{num(t)}</text>
        </g>
      ))}
      <path d={area} fill="#dceff9" />
      <polyline points={line} fill="none" stroke="#0294ce" strokeWidth="2" />
      {points.map((p, i) => (i % 2 === 0 || i === points.length - 1) && (
        <text key={p.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">{monthLabel(p.month)}</text>
      ))}
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].students)} r="4" fill="#0294ce" />
    </svg>
  );
}

export function Overview() {
  const { data, error, loading } = useLoad(() => adminFetch<ReportsOverview>("/reports/overview"), []);
  if (!data) return error ? <ErrorBanner message={error} /> : <div className={loading ? "h-40 animate-pulse rounded-2xl bg-slate-100" : ""} />;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Students on the platform", value: num(t.students), sub: "Enrolled records across all schools" },
          { label: "Live schools", value: num(t.liveSchools), sub: `${t.schools} registered` },
          { label: "Annual recurring revenue", value: lakh(t.arr_paise), sub: "Active schools" },
          { label: "Modules per school", value: t.avgModulesPerSchool, sub: `of ${t.totalModules} available` },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Students on the platform" sub="Last 12 months"><div className="p-4"><GrowthChart points={data.studentsGrowth} /></div></Panel>
        <Panel title="Module access" sub="% of live schools whose plan includes the module">
          <BarRows rows={data.moduleAccess.slice(0, 8).map((m): [string, number] => [m.name, m.percent])} format={(n) => `${n}%`} />
        </Panel>
      </div>
      <Panel title="Schools by state" sub={`${data.schoolsByState.length} states`}>
        <SimpleTable
          head={[{ h: "State" }, { h: "Schools", right: true }, { h: "Students", right: true }]}
          empty="No schools yet."
          rows={data.schoolsByState.map((s) => [s.state, num(s.schools), num(s.students)])}
        />
      </Panel>
      <p className="text-xs text-slate-400">Daily active users and app ratings need usage tracking and store connections, which are not built yet.</p>
    </div>
  );
}

