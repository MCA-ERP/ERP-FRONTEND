import { MENU as SCHOOL_MENU, MENU_MODULES } from "../../school/s/menu-config";

/**
 * The Principal portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a
 * section are its tabs. The dashboard, help desk, calendar and the Approvals module are this portal's own. Everything
 * else is the School Admin portal's screens (`school` names the [module, section] they come from), so the Principal and
 * the School Admin work on the same records.
 */
export interface MenuPage { key: string; title: string; /** the School Admin page this tab shows: [module, section, page] */ src?: [string, string, string]; /** title and subtitle drawn above that page */ text?: [string, string] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; /** the School Admin [module, section] whose screens this section draws */ school?: [string, string] }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }

const leave = SCHOOL_MENU.mywork.sections.find((s) => s.key === "my-leave")!;
const details = SCHOOL_MENU.profile.sections.find((s) => s.key === "personal-details")!;

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "overview", label: "Overview", pages: [{ key: "school-statistics", title: "School Statistics" }, { key: "attendance", title: "Attendance" }, { key: "fees", title: "Fees" }, { key: "admissions", title: "Admissions" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  profile: { label: "My Profile", group: "Overview", sections: [
    { key: "personal-details", label: "Personal Details", school: ["profile", "personal-details"], pages: details.pages.map((p) => ({ key: p.key, title: p.title })) },
    { key: "my-payslips", label: "My Payslips", school: ["mywork", "my-payslips"], pages: [{ key: "payslips", title: "Payslips" }] },
  ] },
  mywork: { label: "My Work", group: "Overview", sections: [
    { key: "my-leave", label: "My Leave", school: ["mywork", "my-leave"], pages: leave.pages.map((p) => ({ key: p.key, title: p.title })) },
  ] },
  academics: { label: "Academics", group: "Teaching & Learning", sections: [
    { key: "academic-overview", label: "Academic Overview", pages: [{ key: "classes", title: "Classes" }, { key: "subjects", title: "Subjects" }, { key: "syllabus-progress", title: "Syllabus Progress" }, { key: "subjects-by-class", title: "Subjects by Class" }] },
    { key: "teacher-monitoring", label: "Teacher Monitoring", pages: [{ key: "teacher-workload", title: "Teacher Workload" }, { key: "lesson-plans", title: "Lesson Plans" }] },
    { key: "academic-review", label: "Academic Review", pages: [{ key: "class-performance", title: "Class Performance" }, { key: "subject-performance", title: "Subject Performance" }] },
  ] },
  students: { label: "Students", group: "Teaching & Learning", sections: [
    { key: "student-directory", label: "Student Directory", pages: [{ key: "class-wise", title: "Class-wise" }, { key: "section-wise", title: "Section-wise" }] },
    { key: "student-discipline", label: "Student Discipline", pages: [{ key: "incidents", title: "Incidents" }, { key: "actions", title: "Actions" }, { key: "follow-up", title: "Follow-up" }] },
  ] },
  attendance: { label: "Attendance", group: "Teaching & Learning", sections: [
    { key: "student-attendance", label: "Student Attendance", pages: [{ key: "daily", title: "Daily" }, { key: "monthly", title: "Monthly" }, { key: "defaulters", title: "Defaulters" }] },
    { key: "staff-attendance", label: "Staff Attendance", pages: [{ key: "daily", title: "Daily" }, { key: "monthly", title: "Monthly" }, { key: "exceptions", title: "Exceptions" }] },
  ] },
  examinations: { label: "Examinations", group: "Teaching & Learning", sections: [
    { key: "exam-monitoring", label: "Exam Monitoring", pages: [
      { key: "schedule", title: "Schedule", src: ["examinations", "exam-schedule", "subject-schedule"] },
      { key: "marks-entry-status", title: "Marks Entry Status", src: ["examinations", "marks-verification", "verification"], text: ["Marks Entry Status", "Which subjects have marks entered, verified and approved."] },
      { key: "date-sheet", title: "Date Sheet", src: ["examinations", "exam-schedule", "date-sheet"] },
      { key: "seating-plan", title: "Seating Plan", src: ["examinations", "exam-schedule", "seating-plan"] },
    ] },
    { key: "results", label: "Results", pages: [
      { key: "results-review", title: "Results Review", src: ["examinations", "marks-verification", "approval"], text: ["Results Review", "Verified results waiting for your approval before parents see them."] },
      { key: "performance-analysis", title: "Performance Analysis", src: ["examinations", "results-processing", "result-analysis"], text: ["Performance Analysis", "Every class in the latest exam, subject by subject."] },
      { key: "holistic-progress-cards", title: "Holistic Progress Cards", src: ["examinations", "report-cards", "holistic-progress-card"] },
    ] },
    { key: "competitive-exams", label: "Competitive Exams", pages: [
      { key: "readiness", title: "Readiness", src: ["examinations", "competitive-exams", "readiness-analysis"] },
      { key: "test-series", title: "Test Series", src: ["examinations", "competitive-exams", "test-series"] },
    ] },
  ] },
  admission: { label: "Admissions", group: "People", sections: [
    { key: "admission-review", label: "Admission Review", pages: [
      { key: "applications", title: "Applications" },
      { key: "interviews", title: "Interviews", src: ["admission", "interview-management", "interview-schedule"], text: ["Interviews", "All interviews, newest first."] },
      { key: "approvals", title: "Approvals" },
      { key: "merit-list", title: "Merit List", src: ["admission", "merit-and-seats", "merit-list"] },
      { key: "seat-matrix", title: "Seat Matrix", src: ["admission", "merit-and-seats", "seat-matrix"] },
      { key: "seat-tracking", title: "Seat Tracking", src: ["admission", "merit-and-seats", "seat-tracking"] },
    ] },
  ] },
  hr: { label: "Staff", group: "People", sections: [
    { key: "staff-directory", label: "Staff Directory", pages: [
      { key: "teaching", title: "Teaching", src: ["hr", "employee-directory", "teaching-staff"], text: ["Teaching", "Teachers."] },
      { key: "non-teaching", title: "Non-Teaching", src: ["hr", "employee-directory", "non-teaching-staff"], text: ["Non-Teaching", "Administration, accounts, transport and support staff."] },
    ] },
    { key: "staff-performance", label: "Staff Performance", pages: [
      { key: "reviews", title: "Reviews", src: ["hr", "staff-performance", "reviews"] },
      { key: "appraisals", title: "Appraisals", src: ["hr", "staff-performance", "appraisals"] },
      { key: "appraisal-cycle", title: "Appraisal Cycle", src: ["hr", "staff-performance", "appraisal-cycle"] },
      { key: "student-feedback", title: "Student Feedback", src: ["hr", "staff-performance", "360-feedback"], text: ["Student Feedback", "What students said about each teacher in the feedback survey. Scores show only when enough students answered."] },
    ] },
    { key: "leave-approvals", label: "Leave Approvals", pages: [
      { key: "pending", title: "Pending", src: ["hr", "leave-management", "approvals"], text: ["Pending", "Leave goes up the chain only as far as it needs to. Each level has a time limit; overdue requests move up on their own and the applicant always sees where theirs is."] },
      { key: "approved", title: "Approved" },
      { key: "rejected", title: "Rejected" },
    ] },
    { key: "hiring-approvals", label: "Hiring Approvals", pages: [
      { key: "vacancy-approvals", title: "Vacancy Approvals", src: ["hr", "vacancies", "vacancy-requests"], text: ["Vacancy Approvals", "New and replacement posts asking for your approval. Approved posts go to Finance for the budget."] },
      { key: "probation-decisions", title: "Probation Decisions", src: ["hr", "probation", "probation-review"], text: ["Probation Decisions", "Staff on probation, their reviews and when a decision is due. Confirm, extend or end probation; confirmation letters are generated automatically."] },
    ] },
  ] },
  fees: { label: "Finance", group: "School-wide", sections: [
    { key: "fee-overview", label: "Fee Overview", pages: [
      { key: "collection", title: "Collection" },
      { key: "outstanding", title: "Outstanding", src: ["fees", "pending-fees", "outstanding"], text: ["Outstanding", "Students with fees still to pay."] },
      { key: "defaulters", title: "Defaulters", src: ["fees", "pending-fees", "defaulter-list"], text: ["Defaulters", "Students overdue for more than 30 days. The school's rules apply after this."] },
      { key: "school-store", title: "School Store" },
      { key: "leadership-live", title: "Leadership Live", src: ["fees", "finance-dashboards", "leadership-live"] },
    ] },
  ] },
  communication: { label: "Communication", group: "School-wide", sections: [
    { key: "circulars", label: "Circulars", pages: [
      { key: "create", title: "Create", src: ["communication", "circulars", "create-circular"], text: ["Create", "Fill in the details and save. It appears in the list straight away."] },
      { key: "approve", title: "Approve" },
      { key: "publish", title: "Publish", src: ["communication", "circulars", "publish"] },
    ] },
    { key: "parent-concerns", label: "Parent Concerns", pages: [{ key: "complaints", title: "Complaints" }, { key: "escalations", title: "Escalations" }, { key: "help-desk", title: "Help Desk" }] },
    { key: "photo-gallery", label: "Photo Gallery", pages: [
      { key: "albums", title: "Albums", src: ["communication", "photo-gallery", "albums"] },
      { key: "pending-approval", title: "Pending Approval", src: ["communication", "photo-gallery", "pending-approval"] },
    ] },
  ] },
  activities: { label: "Activities", group: "School-wide", sections: [
    { key: "events", label: "Events", pages: [
      { key: "sports", title: "Sports", src: ["activities", "sports", "sports-list"], text: ["Sports", "Events marked “Sports”."] },
      { key: "cultural", title: "Cultural", src: ["activities", "cultural-activities", "activities"], text: ["Cultural", "Events marked “Cultural”."] },
      { key: "competitions", title: "Competitions", src: ["activities", "competitions", "competition-setup"], text: ["Competitions", "Events marked “Competitions”."] },
      { key: "house-standings", title: "House Standings", src: ["activities", "houses", "standings"] },
      { key: "registrations-and-budget", title: "Registrations and Budget", src: ["activities", "event-management", "event-budget"], text: ["Registrations and Budget", "Budget and spending for each event."] },
    ] },
  ] },
  reports: { label: "Reports", group: "School-wide", sections: [
    { key: "school-reports", label: "School Reports", pages: [{ key: "academic", title: "Academic" }, { key: "attendance", title: "Attendance" }, { key: "finance", title: "Finance" }] },
  ] },
  approvals: { label: "Approvals", group: "Decisions", sections: [
    { key: "approval-centre", label: "Approval Centre", pages: [
      { key: "admissions", title: "Admissions" }, { key: "leave", title: "Leave" }, { key: "fees", title: "Fees" }, { key: "results", title: "Results" }, { key: "increments", title: "Increments" }, { key: "claims", title: "Claims" }, { key: "decided", title: "Decided" },
    ] },
  ] },
  settings: { label: "Settings", group: "Decisions", sections: [
    { key: "personal-settings", label: "Personal Settings", pages: [{ key: "profile", title: "Profile" }, { key: "password", title: "Password" }, { key: "notifications", title: "Notifications" }] },
  ] },
};

/** Which Super Admin modules a sidebar item needs (any one is enough). Own items are always there. */
export const NEEDS: Record<string, string[]> = Object.fromEntries(Object.keys(MENU).filter((k) => MENU_MODULES[k]).map((k) => [k, MENU_MODULES[k]]));
NEEDS.hr = MENU_MODULES.hr;

export const sectionHref = (module: string, section: string) => `/principal/${module}/${section}`;
