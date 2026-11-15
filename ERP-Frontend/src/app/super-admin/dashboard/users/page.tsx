"use client";

import { useState } from "react";
import type { SchoolRow } from "@/lib/admin-api";
import {
  BarRows, DashboardPage, Panel, SchoolCell, SimpleTable, StatGrid, TabBar, num,
} from "@/components/admin/dash";

type Tab = "total" | "admins" | "teachers" | "students" | "parents";

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: "Super admins",
  InstitutionAdmin: "School admins",
  Principal: "Principals",
  Registrar: "Registrars",
  Faculty: "Teachers",
  Student: "Students",
  Parent: "Parents",
  Accountant: "Accountants",
  HR: "HR",
  Librarian: "Librarians",
};

export default function UserStatisticsPage() {
  const [tab, setTab] = useState<Tab>("total");

  return (
    <DashboardPage title="User statistics" subtitle="Accounts and records across every school.">
      {({ schools, userCounts, platformTeam }) => {
        const roleTotal = (roles: string[]) =>
          userCounts.filter((r) => roles.includes(r.role)).reduce((a, r) => a + r.n, 0);

        const perSchool = (roles: string[]) => {
          const m = new Map<string, number>();
          userCounts.forEach((r) => {
            if (r.institution_id && roles.includes(r.role)) m.set(r.institution_id, (m.get(r.institution_id) ?? 0) + r.n);
          });
          return schools.map((s) => ({ s, n: m.get(s.id) ?? 0 })).sort((a, b) => b.n - a.n);
        };

        const accounts = userCounts.reduce((a, r) => a + r.n, 0);
        const students = schools.reduce((a, s) => a + s.students, 0);
        const admins = roleTotal(["InstitutionAdmin", "Principal"]);
        const teachers = roleTotal(["Faculty"]);
        const parents = roleTotal(["Parent"]);

        const bySchool = (title: string, noun: string, rows: { s: SchoolRow; n: number }[]) => (
          <Panel title={title} sub={`${rows.length} schools`}>
            <SimpleTable
              head={[{ h: "School" }, { h: noun, right: true }]}
              empty="No schools yet."
              rows={rows.map(({ s, n }) => [<SchoolCell key="s" s={s} />, num(n)])}
            />
          </Panel>
        );

        const roleRows: [string, number][] = Object.keys(ROLE_LABEL)
          .map((r): [string, number] => [ROLE_LABEL[r], roleTotal([r])])
          .filter((r) => r[1] > 0)
          .sort((a, b) => b[1] - a[1]);

        return (
          <>
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[
                ["total", "Total users", num(accounts)],
                ["admins", "Admins", num(admins + platformTeam)],
                ["teachers", "Teachers", num(teachers)],
                ["students", "Students", num(students)],
                ["parents", "Parents", num(parents)],
              ]}
            />

            {tab === "total" && (
              <>
                <StatGrid
                  items={[
                    { label: "User accounts", value: num(accounts), sub: "Active accounts with a login" },
                    { label: "Student records", value: num(students), sub: "Enrolled students (may not have logins)" },
                    { label: "Teachers", value: num(teachers) },
                    { label: "Parents", value: num(parents) },
                  ]}
                />
                <Panel title="Accounts by role"><BarRows rows={roleRows} /></Panel>
              </>
            )}

            {tab === "admins" && (
              <>
                <StatGrid
                  items={[
                    { label: "Platform team", value: num(platformTeam), sub: "Not tied to a school" },
                    { label: "School admins & principals", value: num(admins) },
                  ]}
                />
                {bySchool("Admins by school", "Admins & principals", perSchool(["InstitutionAdmin", "Principal"]))}
              </>
            )}

            {tab === "teachers" && (
              <>
                <StatGrid
                  items={[
                    { label: "Teachers", value: num(teachers) },
                    { label: "Schools with teachers", value: num(perSchool(["Faculty"]).filter((r) => r.n > 0).length) },
                  ]}
                />
                {bySchool("Teachers by school", "Teachers", perSchool(["Faculty"]))}
              </>
            )}

            {tab === "students" && (
              <>
                <StatGrid
                  items={[
                    { label: "Student records", value: num(students) },
                    { label: "Largest school", value: num(Math.max(0, ...schools.map((s) => s.students))) },
                  ]}
                />
                {bySchool("Students by school", "Students", schools.map((s) => ({ s, n: s.students })).sort((a, b) => b.n - a.n))}
              </>
            )}

            {tab === "parents" && (
              <>
                <StatGrid
                  items={[
                    { label: "Parent accounts", value: num(parents) },
                    { label: "Per student", value: students ? (parents / students).toFixed(2) : "—", sub: "Parent accounts per student record" },
                  ]}
                />
                {bySchool("Parent accounts by school", "Parents", perSchool(["Parent"]))}
              </>
            )}
          </>
        );
      }}
    </DashboardPage>
  );
}
