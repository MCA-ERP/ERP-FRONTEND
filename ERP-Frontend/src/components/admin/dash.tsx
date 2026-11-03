"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { adminFetch, type DashboardSummary, type SchoolRow, type SchoolStatus } from "@/lib/admin-api";
import { Card, ErrorBanner, PageHeader, useLoad } from "./ui";

// ── formatting ──────────────────────────────────────────────
export const num = (n: number) => n.toLocaleString("en-IN");
export const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
export const lakh = (paise: number) => `₹${(paise / 100 / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
export const fmtDay = (iso?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function daysTo(iso?: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

export const isLive = (s: SchoolRow) => s.status === "Active" || s.status === "Trial";
export const isInactive = (s: SchoolRow) => s.status === "Overdue" || s.status === "Suspended" || s.status === "Expired";

// ── small components ────────────────────────────────────────
const statusCls: Record<SchoolStatus, string> = {
  Active: "bg-mca-green-mint text-mca-green-deep",
  Trial: "bg-mca-blue-sky text-mca-blue-shade",
  Pending: "bg-amber-100 text-amber-800",
  Overdue: "bg-amber-100 text-amber-800",
  Suspended: "bg-mca-red-blush text-mca-red-hover",
  Expired: "bg-mca-red-blush text-mca-red-hover",
};

export function StatusPill({ status }: { status: SchoolStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

const planCls: Record<string, string> = {
  basic: "text-slate-500",
  standard: "text-mca-blue-shade",
  premium: "text-mca-blue-dark",
  enterprise: "text-mca-green",
};
export function PlanTag({ code, name }: { code: string | null; name: string | null }) {
  if (!code) return <span className="text-slate-400">—</span>;
  return <span className={`text-xs font-bold ${planCls[code] ?? "text-slate-600"}`}>{name}</span>;
}

export function SchoolCell({ s }: { s: SchoolRow }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{s.name}</p>
      <p className="text-xs text-slate-400">
        {s.code}
        {s.city ? ` · ${s.city}` : ""}
      </p>
    </div>
  );
}

const tileBg = ["bg-mca-blue-sky", "bg-mca-green-mint", "bg-mca-red-blush", "bg-[#c0e4f3]"];
export function StatGrid({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((s, i) => (
        <div key={s.label} className={`rounded-2xl p-5 ${tileBg[i % tileBg.length]}`}>
          <p className="text-xs font-semibold text-slate-600">{s.label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{s.value}</p>
          {s.sub && <p className="mt-1 text-xs text-slate-600">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function BarRows({ rows, format = num }: { rows: [string, number][]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="p-6 text-center text-sm text-slate-400">No data yet.</p>;
  return (
    <div className="space-y-2 p-4">
      {rows.map(([label, v]) => (
        <div key={label} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-700">{label}</span>
          <div className="h-2 overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded bg-[#41afda]" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-right font-semibold tabular-nums">{format(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: [T, string, (number | string)?][];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(([key, label, n]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={key === value}
          onClick={() => onChange(key)}
          className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-semibold transition ${
            key === value ? "border-[#41afda] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {label}
          {n !== undefined && <span className="ml-1.5 text-xs font-medium text-slate-400">{n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base text-slate-900">{title}</h2>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </Card>
  );
}

export function SimpleTable({
  head,
  rows,
  empty = "Nothing here yet.",
}: {
  head: { h: string; right?: boolean }[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {head.map((c) => (
              <th key={c.h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${c.right ? "text-right" : "text-left"}`}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-4 py-8 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {r.map((cell, j) => (
                <td key={j} className={`whitespace-nowrap px-4 py-3 ${head[j]?.right ? "text-right tabular-nums" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── data ────────────────────────────────────────────────────
export function useSummary() {
  return useLoad(() => adminFetch<DashboardSummary>("/dashboard/summary"), []);
}

/** Shared page frame: header, error banner, loading skeleton, then the page body once data exists. */
export function DashboardPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: (data: DashboardSummary) => ReactNode;
}) {
  const { data, error, loading } = useSummary();
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <ErrorBanner message={error} />
      {!data && loading && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}
      {data && <div className="space-y-6">{children(data)}</div>}
    </>
  );
}

export function useTab<T extends string>(initial: T) {
  return useState<T>(initial);
}

export function groupCount(schools: SchoolRow[], key: (s: SchoolRow) => string | null): [string, number][] {
  const m = new Map<string, number>();
  schools.forEach((s) => {
    const k = key(s) || "Unspecified";
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
