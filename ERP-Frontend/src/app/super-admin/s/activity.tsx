"use client";

import Link from "next/link";
import { adminFetch, qs, type Paged, type SchoolList } from "@/lib/admin-api";
import { PlanTag, StatGrid, StatusPill, fmtDay, num } from "@/components/admin/dash";
import { Tiles } from "@/components/admin/dash-ui";
import { hourLabel } from "@/components/admin/dash-data";
import { useRange } from "@/components/admin/range";
import { Badge, Card, ErrorBanner, Th, fmtDate, useLoad } from "@/components/admin/ui";
import { Events } from "@/app/super-admin/users/activity";
import AuditLogs from "@/app/super-admin/audit-logs/page";

/** Recent Logins: who signed in, from where, and whether it worked. */
export function RecentLogins() {
  const range = useRange();
  const stats = useLoad(() => adminFetch<{ signed_in: number; failed: number; peak_hour: number | null; mobile_share: number | null }>(`/dashboard/activity${qs({ from: range.from, to: range.to })}`), [range.from, range.to]);
  const s = stats.data;
  return (
    <>
      <ErrorBanner message={stats.error} />
      <Tiles items={[
        { label: "Sign-ins", value: s ? num(s.signed_in) : "…", sub: range.label },
        { label: "Failed sign-ins", value: s ? num(s.failed) : "…", sub: range.label },
        { label: "Peak hour", value: s ? hourLabel(s.peak_hour) : "…", sub: "When most people sign in" },
        { label: "Mobile share", value: s ? (s.mobile_share === null ? "—" : `${s.mobile_share}%`) : "…", sub: "Of all sign-ins" },
      ]} />
      <div className="mt-6"><Events failed={false} /></div>
    </>
  );
}

interface UserRow { id: string; first_name: string; last_name: string; email: string; created_at: string; roles?: { display_name: string } | null; institutions?: { name: string } | null }

/** Recent Registrations: newly registered schools and new user accounts. */
export function RecentRegistrations() {
  const schools = useLoad(() => adminFetch<SchoolList>(`/schools${qs({ pageSize: 10 })}`), []);
  const users = useLoad(() => adminFetch<Paged<UserRow>>(`/user-directory${qs({ pageSize: 10 })}`), []);
  const list = schools.data?.items ?? [];
  const month = Date.now() - 30 * 86_400_000;
  const fresh = list.filter((x) => new Date(x.created_at).getTime() >= month).length;
  return (
    <>
      <ErrorBanner message={schools.error || users.error} />
      <StatGrid items={[
        { label: "New schools", value: schools.data ? fresh : "…", sub: "Last 30 days" },
        { label: "Awaiting approval", value: schools.data?.counts.pending ?? "…", sub: "Self sign-ups and new registrations" },
        { label: "User accounts", value: users.data ? num(users.data.total) : "…", sub: "Across the platform" },
      ]} />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-4 py-3.5"><h2 className="text-base font-semibold">Recent school registrations</h2><span className="text-sm text-slate-500">Newest first</span></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>School</Th><Th>Board</Th><Th>Plan</Th><Th>Registered</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!list.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{schools.loading ? "Loading…" : "No schools registered yet."}</td></tr>}
            {list.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}</p></td>
                <td className="px-4 py-3 text-slate-600">{s.board ? <Badge>{s.board}</Badge> : "—"}</td>
                <td className="px-4 py-3"><PlanTag code={s.plan_code} name={s.plan_name} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDay(s.created_at)}</td>
                <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link href={s.status === "Pending" ? `/super-admin/schools/${s.id}?tab=setup` : `/super-admin/schools/${s.id}`} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold hover:border-slate-400">{s.status === "Pending" ? "Review" : "View details"}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-4 py-3.5"><h2 className="text-base font-semibold">New user accounts</h2><span className="text-sm text-slate-500">Newest first</span></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Role</Th><Th>School</Th><Th>Date</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!users.data?.items.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{users.loading ? "Loading…" : "No accounts yet."}</td></tr>}
            {[...(users.data?.items ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                <td className="px-4 py-3">{u.roles?.display_name ? <Badge tone="blue">{u.roles.display_name}</Badge> : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{u.institutions?.name ?? "Platform team"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{u.created_at ? fmtDate(u.created_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}

/** System Activity: what the platform did and what was changed, newest first. */
export function SystemActivity() {
  return <Card className="border-0 bg-transparent shadow-none"><AuditLogs /></Card>;
}
