"use client";

import type { ReactNode } from "react";
import { AcademicOverview, Alerts, ExamOverview, FeeOverview, RecentActivity } from "./dash-pages2";
import { PersonalDetails, Payslips } from "./profile-pages";
import { AppointmentPages, CallPages, EnquiryPages, PostPages, VisitorPages } from "./fo-pages";
import { MyLeave } from "./leave-pages";
import { ComplaintPages, GatePassPages, HelpDeskPages, ReportPages } from "./fo-pages2";
import { AdmissionEnquiryPages, ApplicationPages } from "./adm-pages";
import { MeritPages, OfferPages, OnlineApplicationPages as OnlinePages } from "./adm-pages4";
import { AcademicReportPages, ClassPromotionPages, RulesPages } from "./academic-pages4";
import { AttendanceSettingsPages, ClassTimetablePages, TimetableSetupPages } from "./timetable-pages";
import { AttendanceReportPages, BiometricPages, LeavePages, RfidPages, StaffAttendancePages } from "./attendance-pages2";
import { AttendanceEntryPages, CorrectionPages, StudentAttendancePages } from "./attendance-pages";
import { ClassPages, SectionPages, SubjectAllocationPages, SubjectPages } from "./academic-pages2";
import { CalendarPages, CurriculumPages, LessonPlanPages } from "./academic-pages3";
import { AcademicYearPages, SchoolBoardPages } from "./academic-pages";
import { LoginActivityPage, ParentFeedbackPages, ParentRequestPages } from "./parent-pages2";
import { AlumniPages } from "./alumni-pages";
import { FamilyMappingPages, ParentAccessPages, ParentCommunicationPages, ParentDirectoryPages, ParentProfilePages, ParentRegistrationPages } from "./parent-pages";
import { CertificatePages, StudentRecordPages, StudentReportPages, WithdrawalPages } from "./student-pages3";
import { ParentPages, PromotionPages, StudentAssignPages, StudentDocumentPages, StudentIdPages, StudentProfilePages } from "./student-pages2";
import { StudentDirectoryPages, StudentRegistrationPages } from "./student-pages";
import { AdmissionCommunicationPages, AdmissionDocumentPages, AdmissionReportPages, AutoRegistrationPage, ClassAllocationPages } from "./adm-pages3";
import { AdmissionFeePages, ApprovalPages, EntrancePages, InterviewPages, ProcessingPages, RegistrationPages } from "./adm-pages2";
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
  "mywork/my-payslips": () => <Payslips key="p" />,
  "mywork/my-leave": (p) => <MyLeave tab={p === "my-requests" ? "my-requests" : p === "balance-and-policy" ? "balance-and-policy" : p === "comp-off" ? "comp-off" : "apply"} key={p} />,
  "front-office/enquiry-desk": (p) => <EnquiryPages tab={p === "enquiry-list" ? "enquiry-list" : p === "follow-ups" ? "follow-ups" : "new-enquiry"} key={p} />,
  "front-office/visitor-management": (p) => <VisitorPages tab={p === "visitor-list" ? "visitor-list" : p === "visitor-pass" ? "visitor-pass" : "visitor-entry"} key={p} />,
  "front-office/appointment-management": (p) => <AppointmentPages tab={p === "appointment-list" ? "appointment-list" : p === "calendar" ? "calendar" : "new-appointment"} key={p} />,
  "front-office/telephone-management": (p) => <CallPages tab={p === "outgoing-calls" ? "outgoing-calls" : p === "call-register" ? "call-register" : "incoming-calls"} key={p} />,
  "front-office/complaint-register": (p) => <ComplaintPages tab={p === "complaint-list" ? "complaint-list" : p === "resolution" ? "resolution" : "new-complaint"} key={p} />,
  "front-office/gate-pass": (p) => <GatePassPages tab={p === "staff-gate-pass" ? "staff-gate-pass" : p === "approval" ? "approval" : "student-gate-pass"} key={p} />,
  "front-office/front-office-reports": (p) => <ReportPages tab={p === "visitor-report" ? "visitor-report" : p === "complaint-report" ? "complaint-report" : "enquiry-report"} key={p} />,
  "front-office/help-desk": (p) => <HelpDeskPages tab={p === "categories-and-reply-times" ? "categories-and-reply-times" : p === "help-desk-reports" ? "help-desk-reports" : "all-tickets"} key={p} />,
  "admission/admission-enquiry": (p) => <AdmissionEnquiryPages tab={p === "enquiry-list" ? "enquiry-list" : p === "enquiry-follow-up" ? "enquiry-follow-up" : "new-enquiry"} key={p} />,
  "admission/admission-application": (p) => <ApplicationPages tab={p === "online-applications" ? "online-applications" : p === "application-list" ? "application-list" : "new-application"} key={p} />,
  "admission/application-processing": (p) => <ProcessingPages tab={p === "eligibility-check" ? "eligibility-check" : p === "application-status" ? "application-status" : "document-verification"} key={p} />,
  "admission/entrance-examination": (p) => <EntrancePages tab={p === "exam-schedule" ? "exam-schedule" : p === "marks-entry" ? "marks-entry" : p === "results" ? "results" : "exam-setup"} key={p} />,
  "admission/interview-management": (p) => <InterviewPages tab={p === "interview-panel" ? "interview-panel" : p === "interview-results" ? "interview-results" : "interview-schedule"} key={p} />,
  "admission/admission-approval": (p) => <ApprovalPages tab={p === "approved" ? "approved" : p === "rejected" ? "rejected" : p === "waitlisted" ? "waitlisted" : p === "approval-levels" ? "approval-levels" : "approval-chain"} key={p} />,
  "admission/admission-fee": (p) => <AdmissionFeePages tab={p === "fee-collection" ? "fee-collection" : p === "payment-status" ? "payment-status" : "admission-fee-setup"} key={p} />,
  "admission/class-allocation": (p) => <ClassAllocationPages tab={p === "class" ? "class" : p === "section" ? "section" : p === "roll-number" ? "roll-number" : "academic-year"} key={p} />,
  "admission/admission-documents": (p) => <AdmissionDocumentPages tab={p === "previous-school-records" ? "previous-school-records" : p === "photos" ? "photos" : p === "other-documents" ? "other-documents" : "birth-certificate"} key={p} />,
  "admission/admission-communication": (p) => <AdmissionCommunicationPages tab={p === "interview-notification" ? "interview-notification" : p === "admission-confirmation" ? "admission-confirmation" : "application-confirmation"} key={p} />,
  "admission/admission-reports": (p) => <AdmissionReportPages tab={p === "application-report" ? "application-report" : p === "conversion-report" ? "conversion-report" : p === "admission-report" ? "admission-report" : p === "rejection-report" ? "rejection-report" : "enquiry-report"} key={p} />,
  "admission/online-application": (p) => <OnlinePages tab={p === "new-application" ? "new-application" : p === "tracker" ? "tracker" : p === "online-applications" ? "online-applications" : p === "programme-rules" ? "programme-rules" : p === "by-programme" ? "by-programme" : "eligibility-check"} key={p} />,
  "admission/merit-and-seats": (p) => <MeritPages tab={p === "ranking-rules" ? "ranking-rules" : p === "seat-matrix" ? "seat-matrix" : p === "seat-tracking" ? "seat-tracking" : "merit-list"} key={p} />,
  "admission/offers": (p) => <OfferPages tab={p === "letter-template" ? "letter-template" : p === "automatic-messages" ? "automatic-messages" : "offer-letters"} key={p} />,
  "students/student-directory": (p) => <StudentDirectoryPages tab={p === "active-students" ? "active-students" : p === "inactive-students" ? "inactive-students" : p === "new-admissions" ? "new-admissions" : "all-students"} key={p} />,
  "students/student-registration": (p) => <StudentRegistrationPages tab={p === "bulk-import" ? "bulk-import" : p === "registration-list" ? "registration-list" : "add-student"} key={p} />,
  "students/student-profile": (p) => <StudentProfilePages tab={p === "academic-details" ? "academic-details" : p === "contact-details" ? "contact-details" : "personal-details"} key={p} />,
  "students/parent-guardian": (p) => <ParentPages tab={p === "mother-details" ? "mother-details" : p === "guardian-details" ? "guardian-details" : "father-details"} key={p} />,
  "students/student-documents": (p) => <StudentDocumentPages tab={p === "photos" ? "photos" : p === "previous-records" ? "previous-records" : p === "other-documents" ? "other-documents" : "birth-certificate"} key={p} />,
  "students/student-id": (p) => <StudentIdPages tab={p === "generate-id" ? "generate-id" : p === "print-id" ? "print-id" : "id-card-design"} key={p} />,
  "students/class-allocation": (p) => <StudentAssignPages tab={p === "section-assignment" ? "section-assignment" : p === "roll-number" ? "roll-number" : "class-assignment"} key={p} />,
  "students/student-promotion": (p) => <PromotionPages tab={p === "promote-students" ? "promote-students" : p === "promotion-history" ? "promotion-history" : "promotion-list"} key={p} />,
  "students/student-transfer": (p) => <StudentRecordPages tab={p === "campus-transfer" ? "campus-transfer" : "transfer-within-school"} key={p} />,
  "students/student-withdrawal": (p) => <WithdrawalPages tab={p === "approval" ? "approval" : p === "leaving-records" ? "leaving-records" : "withdrawal-request"} key={p} />,
  "students/student-behaviour": (p) => <StudentRecordPages tab={p === "disciplinary-actions" ? "disciplinary-actions" : p === "remarks" ? "remarks" : "behaviour-records"} key={p} />,
  "students/student-health": (p) => <StudentRecordPages tab={p === "health-incidents" ? "health-incidents" : "medical-information"} key={p} />,
  "students/student-achievements": (p) => <StudentRecordPages tab={p === "sports" ? "sports" : p === "cultural-achievements" ? "cultural-achievements" : "academic"} key={p} />,
  "students/student-certificates": (p) => <CertificatePages tab={p === "study" ? "study" : p === "character" ? "character" : p === "transfer" ? "transfer" : "bonafide"} key={p} />,
  "students/student-reports": (p) => <StudentReportPages tab={p === "class-wise" ? "class-wise" : p === "gender-wise" ? "gender-wise" : p === "status-reports" ? "status-reports" : "student-list"} key={p} />,
  "students/alumni": (p) => <AlumniPages tab={p === "add-and-events" ? "add-and-events" : "alumni-directory"} key={p} />,
  "parents/parent-directory": (p) => <ParentDirectoryPages tab={p === "active-parents" ? "active-parents" : p === "inactive-parents" ? "inactive-parents" : "all-parents"} key={p} />,
  "parents/parent-registration": (p) => <ParentRegistrationPages tab={p === "bulk-import" ? "bulk-import" : "add-parent"} key={p} />,
  "parents/parent-profile": (p) => <ParentProfilePages tab={p === "contact-details" ? "contact-details" : p === "address" ? "address" : "personal-details"} key={p} />,
  "parents/family-mapping": (p) => <FamilyMappingPages tab={p === "sibling-mapping" ? "sibling-mapping" : p === "guardian-mapping" ? "guardian-mapping" : "link-students"} key={p} />,
  "parents/parent-access": (p) => <ParentAccessPages tab={p === "reset-password" ? "reset-password" : p === "activate-deactivate" ? "activate-deactivate" : "create-login"} key={p} />,
  "parents/parent-communication": (p) => <ParentCommunicationPages tab={p === "notifications" ? "notifications" : p === "meeting-history" ? "meeting-history" : "messages"} key={p} />,
  "parents/parent-requests": (p) => <ParentRequestPages tab={p === "profile-corrections" ? "profile-corrections" : p === "mobile-number-changes" ? "mobile-number-changes" : p === "other-requests" ? "other-requests" : p === "from-the-apps" ? "from-the-apps" : "leave-requests"} key={p} />,
  "parents/parent-feedback": (p) => <ParentFeedbackPages tab={p === "complaints" ? "complaints" : p === "resolution" ? "resolution" : "feedback-list"} key={p} />,
  "parents/parent-reports": (p) => p === "family-mapping" ? <FamilyMappingPages tab="sibling-mapping" key={p} /> : p === "login-activity" ? <LoginActivityPage key={p} /> : <ParentDirectoryPages tab="all-parents" heading="Parent List" key={p} />,
  "academics/academic-year": (p) => <AcademicYearPages tab={p === "edit-year" ? "edit-year" : p === "activate-year" ? "activate-year" : p === "close-year" ? "close-year" : "create-year"} key={p} />,
  "academics/school-board": (p) => <SchoolBoardPages tab={p === "icse" ? "icse" : p === "state-board" ? "state-board" : p === "other-board" ? "other-board" : "cbse"} key={p} />,
  "academics/class-management": (p) => <ClassPages tab={p === "edit-class" ? "edit-class" : p === "class-list" ? "class-list" : "add-class"} key={p} />,
  "academics/section-management": (p) => <SectionPages tab={p === "assign-class-teacher" ? "assign-class-teacher" : p === "section-list" ? "section-list" : "add-section"} key={p} />,
  "academics/subject-management": (p) => <SubjectPages tab={p === "subject-category" ? "subject-category" : p === "subject-list" ? "subject-list" : "add-subject"} key={p} />,
  "academics/subject-allocation": (p) => <SubjectAllocationPages tab={p === "teacher-wise-subject" ? "teacher-wise-subject" : "class-wise-subject"} key={p} />,
  "academics/curriculum-management": (p) => <CurriculumPages tab={p === "syllabus" ? "syllabus" : p === "learning-objectives" ? "learning-objectives" : "curriculum"} key={p} />,
  "academics/lesson-planning": (p) => <LessonPlanPages tab={p === "chapter-plan" ? "chapter-plan" : p === "lesson-progress" ? "lesson-progress" : "lesson-plan"} key={p} />,
  "academics/academic-calendar": (p) => <CalendarPages tab={p === "working-days" ? "working-days" : p === "academic-events" ? "academic-events" : p === "school-calendar" ? "school-calendar" : p === "add-to-calendar" ? "add-to-calendar" : "holidays"} key={p} />,
  "academics/academic-configuration": (p) => <RulesPages tab={p === "passing-marks" ? "passing-marks" : p === "promotion-rules" ? "promotion-rules" : "grading-system"} key={p} />,
  "academics/class-promotion": (p) => <ClassPromotionPages tab={p === "bulk-promotion" ? "bulk-promotion" : p === "retention" ? "retention" : "promotion-rules"} key={p} />,
  "academics/academic-reports": (p) => <AcademicReportPages tab={p === "subject-reports" ? "subject-reports" : p === "syllabus-completion" ? "syllabus-completion" : "class-reports"} key={p} />,
  "attendance/student-attendance": (p) => <StudentAttendancePages tab={p === "class-wise-attendance" ? "class-wise-attendance" : p === "subject-wise-attendance" ? "subject-wise-attendance" : "daily-attendance"} key={p} />,
  "attendance/attendance-entry": (p) => <AttendanceEntryPages tab={p === "mark-absent" ? "mark-absent" : p === "late" ? "late" : p === "half-day" ? "half-day" : p === "leave" ? "leave" : "mark-present"} key={p} />,
  "attendance/attendance-correction": (p) => <CorrectionPages tab={p === "approvals" ? "approvals" : p === "correction-history" ? "correction-history" : "correction-request"} key={p} />,
  "attendance/staff-attendance": (p) => <StaffAttendancePages tab={p === "department-wise" ? "department-wise" : p === "geo-check-ins" ? "geo-check-ins" : "daily-staff-attendance"} key={p} />,
  "attendance/biometric-attendance": (p) => <BiometricPages tab={p === "device-mapping" ? "device-mapping" : p === "attendance-sync" ? "attendance-sync" : "device-setup"} key={p} />,
  "attendance/rfid-and-qr-attendance": (p) => <RfidPages tab={p === "cards-and-qr-codes" ? "cards-and-qr-codes" : p === "live-scans" ? "live-scans" : p === "sync-and-exceptions" ? "sync-and-exceptions" : p === "parent-alerts" ? "parent-alerts" : "readers-and-scanners"} key={p} />,
  "attendance/leave-management": (p) => <LeavePages tab={p === "staff-leave" ? "staff-leave" : p === "leave-approval" ? "leave-approval" : "student-leave"} key={p} />,
  "attendance/attendance-reports": (p) => p === "monthly" ? <AttendanceReportPages tab="monthly" key={p} /> : p === "student-wise" ? <AttendanceReportPages tab="student-wise" key={p} /> : <StudentAttendancePages tab={p === "class-wise" ? "class-wise-attendance" : "daily-attendance"} key={p} />,
  "attendance/attendance-settings": (p) => <AttendanceSettingsPages tab={p === "late-rules" ? "late-rules" : p === "notification-settings" ? "notification-settings" : "attendance-rules"} key={p} />,
  "timetable/timetable-setup": (p) => <TimetableSetupPages tab={p === "working-days" ? "working-days" : p === "break-times" ? "break-times" : "academic-periods"} key={p} />,
  "timetable/class-timetable": (p) => <ClassTimetablePages tab={(["edit", "view", "publish", "ask-in-plain-words", "auto-generate", "generation-rules"].includes(p) ? p : "create") as "create"} key={p} />,
  "admission/student-registration": (p) => <RegistrationPages tab={p === "student-id" ? "student-id" : p === "registration" ? "registration" : p === "auto-registration" ? "auto-registration" : "generate-admission-number"} key={p} />,
  "front-office/postal-management": (p) => <PostPages tab={p === "outgoing-post" ? "outgoing-post" : p === "post-register" ? "post-register" : "incoming-post"} key={p} />,
};

export function renderPage(module: string, section: string, page: string): ReactNode {
  const render = table[`${module}/${section}`];
  return render ? render(page) : null;
}
