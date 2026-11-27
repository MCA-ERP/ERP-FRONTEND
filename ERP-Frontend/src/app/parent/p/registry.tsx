import type { ReactNode } from "react";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { AcademicPerformance, AttendanceSummary, FeeStatusTab, HousePoints, Notifications, SchoolAnnouncements, StudentOverview, UpcomingEvents, WithBar } from "./dash-pages";
import { LinkedStudents, MyConsents, ParentMaster } from "./profile-pages";
import { AttendanceDaily, AttendanceMonthly, CoScholastic, Competitive, ExamSchedule, ExamSeat, HolisticCard, LeaveApplications, ProgressReports, ReportCards, SubjectMarks, Syllabus, Timetable } from "./academic-pages";
import { Concessions, PayFees, Receipts } from "./fee-pages";
import { Assignments, Circulars, ClassDiary, Gallery, Homework, Inbox, Materials, Meetings, NewRequest, OnlineClasses, RequestStatus, SchoolEvents, Tests, WriteMessage } from "./school-pages";
import { Boarding, Books, Checkups, Fines, HealthRecord, MealPlan, Menu, SchoolBus } from "./care-pages";
import { useParent } from "../context";

type Go = (tab: string) => void;

/** The shared help desk form, with the parent's "For which child?". */
function ParentRaise() {
  const { me, child } = useParent();
  return <RaiseRequest forChildren={{ options: me.children.map((c) => [c.id, [c.name, c.class_label].filter(Boolean).join(" · ")] as [string, string]), initial: child?.id ?? "" }} />;
}
const CALENDAR = "Holidays, exams, parent–teacher meetings, events and fee due dates in one place.";

const PAGES: Record<string, (go: Go) => ReactNode> = {
  "dashboard/my-dashboard/student-overview": () => <WithBar><StudentOverview /></WithBar>,
  "dashboard/my-dashboard/attendance-summary": () => <WithBar><AttendanceSummary /></WithBar>,
  "dashboard/my-dashboard/academic-performance": () => <WithBar><AcademicPerformance /></WithBar>,
  "dashboard/my-dashboard/fee-status": () => <WithBar><FeeStatusTab /></WithBar>,
  "dashboard/my-dashboard/school-announcements": () => <WithBar><SchoolAnnouncements /></WithBar>,
  "dashboard/my-dashboard/upcoming-events": () => <WithBar><UpcomingEvents /></WithBar>,
  "dashboard/my-dashboard/notifications": () => <WithBar><Notifications /></WithBar>,
  "dashboard/house-points/standings": () => <HousePoints />,
  "dashboard/help-desk/raise-a-request": () => <ParentRaise />,
  "dashboard/help-desk/my-requests": (go) => <MyRequests go={go} />,
  "dashboard/school-calendar/month-view": () => <MonthView subtitle={CALENDAR} />,
  "dashboard/school-calendar/coming-up": () => <ComingUp />,
  "profile/parent-information/parent-master": () => <ParentMaster />,
  "profile/parent-information/linked-students": () => <LinkedStudents />,
  "profile/privacy-consent/my-consents": () => <MyConsents />,
  "academics/academic-records/report-cards": () => <ReportCards />,
  "academics/academic-records/marks": () => <SubjectMarks />,
  "academics/academic-records/coscholastic": () => <CoScholastic />,
  "academics/academic-records/exam-schedule": () => <ExamSchedule />,
  "academics/academic-records/progress": () => <ProgressReports />,
  "academics/academic-records/holistic": () => <HolisticCard />,
  "academics/academic-records/exam-seat": () => <ExamSeat />,
  "academics/syllabus-progress/syllabus": () => <Syllabus />,
  "academics/class-timetable/timetable": () => <Timetable />,
  "academics/competitive-prep/competitive": () => <Competitive />,
  "attendance/attendance-record/monthly": () => <AttendanceMonthly />,
  "attendance/attendance-record/daily": () => <AttendanceDaily />,
  "attendance/attendance-record/leave": () => <LeaveApplications />,
  "fees/fee-status/pay": () => <PayFees />,
  "fees/fee-status/receipts": () => <Receipts />,
  "fees/fee-status/concessions": () => <Concessions />,
  "requests/my-requests/new": () => <NewRequest />,
  "requests/my-requests/list": (go) => <RequestStatus go={go} />,
  "communication/messages/inbox": (go) => <Inbox go={(t) => go(t)} />,
  "communication/messages/write": () => <WriteMessage />,
  "communication/meetings/ptm": () => <Meetings />,
  "communication/notices/announcements": () => <Circulars />,
  "communication/notices/class-diary": () => <ClassDiary />,
  "events/events-gallery/events": () => <SchoolEvents />,
  "events/events-gallery/gallery": () => <Gallery />,
  "homework/homework/homework": () => <Homework />,
  "homework/homework/assignments": () => <Assignments />,
  "online/online-learning/classes": () => <OnlineClasses />,
  "online/online-learning/materials": () => <Materials />,
  "online/online-learning/tests": () => <Tests />,
  "transport/school-bus/bus": () => <SchoolBus />,
  "transport/school-bus/boarding": () => <Boarding />,
  "health/health-record/record": () => <HealthRecord />,
  "health/health-record/checkups": () => <Checkups />,
  "library/library/books": () => <Books />,
  "library/library/fines": () => <Fines />,
  "mess/mess/plan": () => <MealPlan />,
  "mess/mess/menu": () => <Menu />,
};

/** The screen for one page (tab) of one submenu. */
export function renderPage(module: string, section: string, page: string, go: Go): ReactNode {
  return PAGES[`${module}/${section}/${page}`]?.(go) ?? null;
}
