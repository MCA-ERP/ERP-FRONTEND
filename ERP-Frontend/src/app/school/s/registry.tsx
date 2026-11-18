"use client";

import type { ReactNode } from "react";
import { AcademicOverview, Alerts, ExamOverview, FeeOverview, RecentActivity } from "./dash-pages2";
import { PersonalDetails, Payslips } from "./profile-pages";
import { AdmissionOverview, AttendanceOverview, MainDashboard, StaffStatistics, StudentStatistics } from "./dash-pages";

type Render = (page: string) => ReactNode;

/** The working screen of each submenu, by "module/section". A page is the tab inside it. */
const table: Record<string, Render> = {
  "dashboard/main-dashboard": (p) => <MainDashboard tab={p === "kpi-cards" ? "kpi-cards" : "school-overview"} key={p} />,
  "dashboard/student-statistics": (p) => <StudentStatistics tab={p === "new-admissions" ? "new" : p === "active" ? "active" : p === "inactive" ? "inactive" : "total"} key={p} />,
  "dashboard/staff-statistics": (p) => <StaffStatistics tab={p === "teaching" ? "teaching" : p === "non-teaching" ? "non" : "total"} key={p} />,
  "dashboard/attendance-overview": (p) => <AttendanceOverview tab={p === "class-wise" ? "class-wise" : p === "monthly" ? "monthly" : "today"} key={p} />,
  "dashboard/admission-overview": (p) => <AdmissionOverview tab={p === "applications" ? "applications" : p === "approved" ? "approved" : p === "rejected" ? "rejected" : "enquiries"} key={p} />,
  "dashboard/fee-overview": (p) => <FeeOverview tab={p === "pending" ? "pending" : p === "overdue" ? "overdue" : "collected"} key={p} />,
  "dashboard/academic-overview": (p) => <AcademicOverview tab={p === "subjects" ? "subjects" : p === "timetable" ? "timetable" : "classes"} key={p} />,
  "dashboard/exam-overview": (p) => <ExamOverview tab={p === "results-pending" ? "results-pending" : "upcoming-exams"} key={p} />,
  "dashboard/alerts": (p) => <Alerts tab={p === "reminders" ? "reminders" : "pending-approvals"} key={p} />,
  "dashboard/recent-activity": (p) => <RecentActivity tab={p === "recent-changes" ? "recent-changes" : "user-activity"} key={p} />,
  "profile/personal-details": (p) => <PersonalDetails tab={p === "employment" ? "employment" : p === "qualification" ? "qualification" : p === "documents" ? "documents" : "contact"} key={p} />,
  "profile/my-payslips": () => <Payslips key="p" />,
};

export function renderPage(module: string, section: string, page: string): ReactNode {
  const render = table[`${module}/${section}`];
  return render ? render(page) : null;
}
