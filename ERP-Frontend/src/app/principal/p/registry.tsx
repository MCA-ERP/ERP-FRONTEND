import type { ReactNode } from "react";
import { renderPage as renderSchoolPage } from "../../school/s/registry";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { Payslips } from "../../teacher/t/profile-pages";
import { AdmissionsTab, AttendanceTab, FeesTab, SchoolStatistics, WithBar } from "./dash-pages";
import { Approvals, Concerns, Decided } from "./approval-pages";
import { NotificationSettings, PasswordSettings, ProfileSettings } from "./settings-pages";
import { ComplaintsPage, HelpDeskPage, SchoolReportPage, SchoolStorePage } from "./more-pages";
import { DecidedLeavePage, ApplicationsReview, ClassPerformancePage, ClassWisePage, ClassesPage, DailyAttendancePage, DefaultersPage, DisciplinePage, LessonPlansPage, MonthlyAttendancePage, SectionWisePage, StaffDailyPage, StaffExceptionsPage, StaffMonthlyPage, SubjectPerformancePage, SubjectsByClassPage, SubjectsPage, SyllabusPage, WorkloadPage } from "./review-pages";
import type { MenuPage } from "./menu-config";

type Go = (tab: string) => void;

/** The screen for one page (tab) of one submenu. Pages that come from the School Admin portal are drawn by its own screens. */
export function renderPage(module: string, section: string, page: MenuPage, go: Go, school?: [string, string]): ReactNode {
  const k = `${module}/${section}/${page.key}`;
  switch (k) {
    case "profile/my-payslips/payslips": return <Payslips key={k} />;
    case "dashboard/overview/school-statistics": return <SchoolStatistics key={k} />;
    case "dashboard/overview/attendance": return <AttendanceTab key={k} />;
    case "dashboard/overview/fees": return <FeesTab key={k} />;
    case "dashboard/overview/admissions": return <AdmissionsTab key={k} />;
    case "dashboard/help-desk/raise-a-request": return <WithBar key={k} name="raise-a-request"><RaiseRequest /></WithBar>;
    case "dashboard/help-desk/my-requests": return <WithBar key={k} name="my-requests"><MyRequests go={go} /></WithBar>;
    case "dashboard/school-calendar/month-view": return <WithBar key={k} name="month-view"><MonthView /></WithBar>;
    case "dashboard/school-calendar/coming-up": return <WithBar key={k} name="coming-up"><ComingUp /></WithBar>;
    case "academics/academic-overview/classes": return <ClassesPage key={k} />;
    case "academics/academic-overview/subjects": return <SubjectsPage key={k} />;
    case "academics/academic-overview/syllabus-progress": return <SyllabusPage key={k} />;
    case "academics/academic-overview/subjects-by-class": return <SubjectsByClassPage key={k} />;
    case "academics/teacher-monitoring/teacher-workload": return <WorkloadPage key={k} />;
    case "academics/teacher-monitoring/lesson-plans": return <LessonPlansPage key={k} />;
    case "academics/academic-review/class-performance": return <ClassPerformancePage key={k} />;
    case "academics/academic-review/subject-performance": return <SubjectPerformancePage key={k} />;
    case "students/student-directory/class-wise": return <ClassWisePage key={k} />;
    case "students/student-directory/section-wise": return <SectionWisePage key={k} />;
    case "students/student-discipline/incidents": return <DisciplinePage key={k} tab="incidents" />;
    case "students/student-discipline/actions": return <DisciplinePage key={k} tab="actions" />;
    case "students/student-discipline/follow-up": return <DisciplinePage key={k} tab="followup" />;
    case "attendance/student-attendance/daily": return <DailyAttendancePage key={k} />;
    case "attendance/student-attendance/monthly": return <MonthlyAttendancePage key={k} />;
    case "attendance/student-attendance/defaulters": return <DefaultersPage key={k} />;
    case "attendance/staff-attendance/daily": return <StaffDailyPage key={k} />;
    case "attendance/staff-attendance/monthly": return <StaffMonthlyPage key={k} />;
    case "attendance/staff-attendance/exceptions": return <StaffExceptionsPage key={k} />;
    case "admission/admission-review/applications": return <ApplicationsReview key={k} />;
    case "admission/admission-review/approvals": return <Approvals key={k} kind="admissions" />;
    case "hr/leave-approvals/approved": return <DecidedLeavePage key={k} status="Approved" />;
    case "hr/leave-approvals/rejected": return <DecidedLeavePage key={k} status="Rejected" />;
    case "fees/fee-overview/collection": return <FeesTab key={k} plain />;
    case "communication/circulars/approve": return <Approvals key={k} kind="circular" />;
    case "communication/parent-concerns/complaints": return <ComplaintsPage key={k} />;
    case "communication/parent-concerns/escalations": return <Concerns key={k} />;
    case "communication/parent-concerns/help-desk": return <HelpDeskPage key={k} />;
    case "fees/fee-overview/school-store": return <SchoolStorePage key={k} />;
    case "reports/school-reports/academic": return <SchoolReportPage key={k} kind="academic" />;
    case "reports/school-reports/attendance": return <SchoolReportPage key={k} kind="attendance" />;
    case "reports/school-reports/finance": return <SchoolReportPage key={k} kind="finance" />;
    case "settings/personal-settings/profile": return <ProfileSettings key={k} />;
    case "settings/personal-settings/password": return <PasswordSettings key={k} />;
    case "settings/personal-settings/notifications": return <NotificationSettings key={k} />;
    case "approvals/approval-centre/admissions": return <Approvals key={k} kind="admissions" />;
    case "approvals/approval-centre/leave": return <Approvals key={k} kind="leave" />;
    case "approvals/approval-centre/fees": return <Approvals key={k} kind="concession" />;
    case "approvals/approval-centre/results": return <Approvals key={k} kind="results" />;
    case "approvals/approval-centre/increments": return <Approvals key={k} kind="increment" />;
    case "approvals/approval-centre/claims": return <Approvals key={k} kind="claim" />;
    case "approvals/approval-centre/decided": return <Decided key={k} />;
  }
  const from = page.src ?? (school ? ([school[0], school[1], page.key] as [string, string, string]) : null);
  return from ? renderSchoolPage(from[0], from[1], from[2]) : null;
}
