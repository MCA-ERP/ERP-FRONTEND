"use client";

export interface RoleRow {
  id: string; name: string; display_name: string; description: string | null; is_system_default: boolean;
  scope: "platform" | "school"; data_scope: "school" | "campus"; institution_id: string | null; school_name: string | null;
  user_count: number; permission_count: number; restricted_modules: number; denied_pages: number;
}

export const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

export const AREAS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" }, { key: "schools", label: "School management" }, { key: "subscriptions", label: "Subscriptions & plans" },
  { key: "modules", label: "Module management" }, { key: "users", label: "User management" }, { key: "roles", label: "Roles & permissions" },
  { key: "payments", label: "Payments" }, { key: "support", label: "Support" }, { key: "reports", label: "Reports & analytics" },
  { key: "communication", label: "Communication" }, { key: "cms", label: "Website / CMS" }, { key: "integrations", label: "Integrations" },
  { key: "security", label: "Security & audit" }, { key: "settings", label: "System settings" },
];
