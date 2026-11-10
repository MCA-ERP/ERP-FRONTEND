"use client";

import { Badge } from "@/components/admin/ui";

export interface PlanFull {
  id: string; code: string; name: string; description: string | null; price_per_student_paise: number;
  student_limit: number | null; staff_limit: number | null; campus_limit: number | null; storage_gb: number | null;
  trial_days: number | null; sort_order: number; is_active: boolean; schools: number; module_count: number;
}
export interface SubRow {
  id: string; code: string; name: string; status: string; plan_code: string | null; plan_name: string | null;
  price_per_student_paise: number | null; renews_on: string | null; trial_ends_on: string | null; students: number; arr_paise: number;
}
export interface Quote {
  school: string; plan_name: string; cycle: "annual" | "quarterly"; students: number; list_price_paise: number; unit_price_paise: number;
  applied: { type: string; name: string; detail: string }; period_start: string; period_end: string; note?: string;
  total_paise: number; addons: { name: string; unit_price_paise: number; bundle?: boolean }[];
  lines: { description: string; quantity: number; unit_price_paise: number }[];
}

export const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const limitText = (n: number | null, unit = "") => (n === null ? "Unlimited" : n.toLocaleString("en-IN") + unit);
export const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function UsageBar({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-600">{label}</span><span className="tabular-nums text-slate-500">{used.toLocaleString("en-IN")} / {limitText(cap)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemax={cap ?? undefined}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-mca-blue"}`} style={{ width: cap ? pct + "%" : "8%" }} />
      </div>
    </div>
  );
}

export function PricingBadge({ applied }: { applied: Quote["applied"] }) {
  if (applied.type === "none") return <Badge tone="gray">List price</Badge>;
  return <Badge tone="green">{applied.name}: {applied.detail}</Badge>;
}
