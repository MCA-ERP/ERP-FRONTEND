"use client";

import { adminFetch, qs } from "@/lib/admin-api";
import { DashboardPage, Panel, SimpleTable, num } from "@/components/admin/dash";
import { CountBars, StackedBar, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { userBuckets, usersBySchool } from "@/components/admin/dash-data";
import { useRange } from "@/components/admin/range";
import { useLoad } from "@/components/admin/ui";

type Tab = "total" | "admins" | "teachers" | "students" | "parents";
type Group = "admins" | "teachers" | "students" | "parents";

const NAME: Record<Group, string> = { admins: "Admins", teachers: "Teachers", students: "Students", parents: "Parents" };

interface Activity { active_yesterday: { total: number; by_kind: Record<string, number> } }

export default function UserStatisticsPage({ tab = "total" }: { tab?: Tab }) {
  const range = useRange();
  const activity = useLoad(() => adminFetch<Activity>(`/dashboard/activity${qs({ from: range.from, to: range.to })}`), [range.from, range.to]);

  return (
    <DashboardPage title="User statistics" subtitle="Accounts and records across every school.">
      {({ schools, userCounts }) => {
        const u = userBuckets(userCounts, schools);
        const rows = usersBySchool(userCounts, schools);
        const live = schools.filter((s) => s.status === "Active" || s.status === "Trial").length;
        const group = (g: Group) => rows.map((r) => ({ ...r, n: r[g] })).sort((a, b) => b.n - a.n);
        const yesterday = activity.data?.active_yesterday;

        const byRole = (g: Group, title: string, sub: string) => (
          <Panel title={title} sub={sub}>
            <SimpleTable
              head={[{ h: "School" }, { h: NAME[g], right: true }, { h: "Share", right: true }, { h: "" }]}
              empty="No schools yet."
              rows={group(g).map((r) => [
                <div key="s"><p className="font-semibold text-slate-900">{r.school.name}</p><p className="text-xs text-slate-400">{r.school.code}{r.school.city ? ` · ${r.school.city}` : ""}</p></div>,
                num(r.n),
                u[g] ? `${Math.round((r.n / u[g]) * 100)}%` : "—",
                <ViewButton key="v" href={`/super-admin/schools/${r.school.id}`} />,
              ])}
            />
          </Panel>
        );

        return (
          <>
            {tab === "total" && (
              <>
                <Tiles items={[
                  { label: "Total users", value: num(u.total), sub: "Accounts plus student records" },
                  { label: "Admins", value: num(u.admins), sub: `${u.platform} platform + ${u.schoolAdmins} school` },
                  { label: "Teachers", value: num(u.teachers), sub: u.teachers && u.students ? `1 per ${Math.round(u.students / u.teachers)} students` : undefined },
                  { label: "Students", value: num(u.students), sub: `In ${live} live school${live === 1 ? "" : "s"}` },
                  { label: "Parents", value: num(u.parents), sub: "Parent accounts" },
                ]} />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <Panel title="Users by role" sub={`${num(u.total)} users`}>
                    <StackedBar parts={[{ label: "Admins", value: u.admins }, { label: "Teachers", value: u.teachers }, { label: "Students", value: u.students }, { label: "Parents", value: u.parents }]} />
                    <p className="px-4 pb-4 pt-2 text-xs text-slate-500">Students are enrolled student records, which may not all have a login.</p>
                  </Panel>
                  <Panel title="Active yesterday" sub={yesterday ? `${num(yesterday.total)} signed in` : "By kind of person"}>
                    <CountBars rows={Object.entries(yesterday?.by_kind ?? {}) as [string, number][]} />
                  </Panel>
                </div>
                <Panel title="Users by school" sub={`${rows.length} school${rows.length === 1 ? "" : "s"}`}>
                  <SimpleTable
                    head={[{ h: "School" }, { h: "Admins", right: true }, { h: "Teachers", right: true }, { h: "Students", right: true }, { h: "Parents", right: true }, { h: "Total", right: true }, { h: "" }]}
                    empty="No schools yet."
                    rows={[...rows].sort((a, b) => b.total - a.total).map((r) => [
                      <div key="s"><p className="font-semibold text-slate-900">{r.school.name}</p><p className="text-xs text-slate-400">{r.school.code}{r.school.city ? ` · ${r.school.city}` : ""}</p></div>,
                      num(r.admins), num(r.teachers), num(r.students), num(r.parents), <b key="t" className="font-semibold text-slate-900">{num(r.total)}</b>,
                      <ViewButton key="v" href={`/super-admin/schools/${r.school.id}`} />,
                    ])}
                  />
                </Panel>
              </>
            )}

            {tab === "admins" && (
              <>
                <Tiles items={[
                  { label: "Admins", value: num(u.admins), sub: "Everyone who runs the platform or a school" },
                  { label: "Platform team", value: num(u.platform), sub: "Not tied to a school" },
                  { label: "School admins & staff", value: num(u.schoolAdmins), sub: "Principals, registrars, accountants" },
                ]} />
                {byRole("admins", "Admins by school", "School administrators and staff")}
              </>
            )}

            {tab === "teachers" && (
              <>
                <Tiles items={[
                  { label: "Teachers", value: num(u.teachers) },
                  { label: "Schools with teachers", value: num(group("teachers").filter((r) => r.n > 0).length), sub: `of ${schools.length}` },
                  { label: "Students per teacher", value: u.teachers ? Math.round(u.students / u.teachers) : "—", sub: "Across the platform" },
                ]} />
                {byRole("teachers", "Teachers by school", "Teacher accounts")}
              </>
            )}

            {tab === "students" && (
              <>
                <Tiles items={[
                  { label: "Student records", value: num(u.students), sub: "Enrolled students" },
                  { label: "Largest school", value: num(Math.max(0, ...schools.map((s) => s.students))) },
                  { label: "Average per school", value: schools.length ? num(Math.round(u.students / schools.length)) : "—" },
                ]} />
                {byRole("students", "Students by school", "Enrolled student records")}
              </>
            )}

            {tab === "parents" && (
              <>
                <Tiles items={[
                  { label: "Parent accounts", value: num(u.parents) },
                  { label: "Per student", value: u.students ? (u.parents / u.students).toFixed(2) : "—", sub: "Parent accounts per student record" },
                ]} />
                {byRole("parents", "Parent accounts by school", "Parents who can sign in")}
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
