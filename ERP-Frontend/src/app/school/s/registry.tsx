"use client";

import type { ReactNode } from "react";
import { AdmissionOverview, AttendanceOverview, MainDashboard, StaffStatistics, StudentStatistics } from "./dash-pages";

type Render = (page: string) => ReactNode;

/** The working screen of each submenu, by "module/section". A page is the tab inside it. */
const table: Record<string, Render> = {
  "dashboard/main-dashboard": (p) => <MainDashboard tab={p === "kpi-cards" ? "kpi-cards" : "school-overview"} key={p} />,
  "dashboard/student-statistics": (p) => <StudentStatistics tab={p === "new-admissions" ? "new" : p === "active" ? "active" : p === "inactive" ? "inactive" : "total"} key={p} />,
  "dashboard/staff-statistics": (p) => <StaffStatistics tab={p === "teaching" ? "teaching" : p === "non-teaching" ? "non" : "total"} key={p} />,
  "dashboard/attendance-overview": (p) => <AttendanceOverview tab={p === "class-wise" ? "class-wise" : p === "monthly" ? "monthly" : "today"} key={p} />,
  "dashboard/admission-overview": (p) => <AdmissionOverview tab={p === "applications" ? "applications" : p === "approved" ? "approved" : p === "rejected" ? "rejected" : "enquiries"} key={p} />,
};

export function renderPage(module: string, section: string, page: string): ReactNode {
  const render = table[`${module}/${section}`];
  return render ? render(page) : null;
}
