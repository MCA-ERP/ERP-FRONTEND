"use client";

import { Badge } from "@/components/admin/ui";
import { Toggle } from "@/components/admin/toggle";

export const CATEGORIES = ["Academic", "Administrative", "Communication", "Advanced"] as const;
export type Category = (typeof CATEGORIES)[number];
export type BuildStatus = "live" | "beta" | "planned";

export const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function Switch(props: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return <Toggle {...props} />;
}

export function BuildBadge({ status }: { status: BuildStatus }) {
  return status === "live" ? <Badge tone="green">Built</Badge> : status === "beta" ? <Badge tone="blue">Beta</Badge> : <Badge tone="gray">Not built yet</Badge>;
}

export const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);
