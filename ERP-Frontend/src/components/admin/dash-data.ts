import type { DashboardSummary } from "@/lib/admin-api";

export interface UserBuckets {
  /** Platform team and everyone who runs a school: principals, registrars, accountants and so on. */
  admins: number;
  platform: number;
  schoolAdmins: number;
  teachers: number;
  /** Enrolled student records, which may not have a login. */
  students: number;
  parents: number;
  total: number;
}

/** Splits the account counts into the four groups the Dashboard talks about. Pure, so it is easy to check. */
export function userBuckets(userCounts: DashboardSummary["userCounts"], schools: { students: number }[]): UserBuckets {
  let platform = 0, schoolAdmins = 0, teachers = 0, parents = 0;
  for (const r of userCounts) {
    if (r.role === "Faculty") teachers += r.n;
    else if (r.role === "Parent") parents += r.n;
    else if (r.role === "Student") continue; // counted from the student records
    else if (r.institution_id === null) platform += r.n;
    else schoolAdmins += r.n;
  }
  const students = schools.reduce((a, s) => a + s.students, 0);
  const admins = platform + schoolAdmins;
  return { admins, platform, schoolAdmins, teachers, students, parents, total: admins + teachers + students + parents };
}

/** Per school and per group, for the "Users by school" table. */
export function usersBySchool(userCounts: DashboardSummary["userCounts"], schools: DashboardSummary["schools"]) {
  const by = new Map<string, { admins: number; teachers: number; parents: number }>();
  for (const r of userCounts) {
    if (!r.institution_id || r.role === "Student") continue;
    const row = by.get(r.institution_id) ?? { admins: 0, teachers: 0, parents: 0 };
    if (r.role === "Faculty") row.teachers += r.n;
    else if (r.role === "Parent") row.parents += r.n;
    else row.admins += r.n;
    by.set(r.institution_id, row);
  }
  return schools.map((s) => {
    const u = by.get(s.id) ?? { admins: 0, teachers: 0, parents: 0 };
    return { school: s, ...u, students: s.students, total: u.admins + u.teachers + u.parents + s.students };
  });
}

/** "8–9 am" for hour 8, in 12-hour style. */
export function hourLabel(h: number | null): string {
  if (h === null) return "—";
  const f = (x: number) => `${x % 12 === 0 ? 12 : x % 12}`;
  const end = (h + 1) % 24;
  const sfx = (x: number) => (x < 12 ? "am" : "pm");
  return sfx(h) === sfx(end) ? `${f(h)}–${f(end)} ${sfx(h)}` : `${f(h)} ${sfx(h)}–${f(end)} ${sfx(end)}`;
}
