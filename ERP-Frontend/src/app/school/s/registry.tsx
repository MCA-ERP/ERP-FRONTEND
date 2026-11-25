"use client";

import type { ReactNode } from "react";
import { AcademicOverview, Alerts, ExamOverview, FeeOverview, RecentActivity } from "./dash-pages2";
import { PersonalDetails } from "./profile-pages";
import { Payslips } from "../../teacher/t/profile-pages";
import { AppointmentPages, CallPages, EnquiryPages, PostPages, VisitorPages } from "./fo-pages";
import { MyLeave } from "./leave-pages";
import { ComplaintPages, GatePassPages, HelpDeskPages, ReportPages } from "./fo-pages2";
import { AdmissionEnquiryPages, ApplicationPages } from "./adm-pages";
import { MeritPages, OfferPages, OnlineApplicationPages as OnlinePages } from "./adm-pages4";
import { AcademicReportPages, ClassPromotionPages, RulesPages } from "./academic-pages4";
import { AllocationListPage, RoomPages, SubstitutionPages, TeacherTimetablePages, TimetableReportPages, TimetableViewPages } from "./timetable-pages2";
import { ExamConfigPages } from "./exam-pages";
import { ExamRegistrationPages, ExamSchedulePages, ExamSetupPages } from "./exam-pages2";
import { MarksEntryPages, QuestionPages } from "./exam-pages3";
import { MarksVerificationPages, ReportCardPages, ResultsPages, StudentCard } from "./exam-pages4";
import { CompetitivePages } from "./exam-pages5";
import { AssignmentPages, HomeworkPages, LmsReportPages, MaterialPages, OnlineClassPages, OnlineTestPages, SubmissionPages, SyllabusPages } from "./lms-pages";
import { FeeCollectionPages, FeeConfigPages, FeeStructurePages, StudentFeePages } from "./fee-pages";
import { BudgetPages, ClaimPages, ReconPages, ReminderRunPages } from "./fee-pages4";
import { HrFlow, StaffDirectoryPages } from "./hr-pages";
import { DepartmentPages, DesignationPages, EmployeeRegistrationPages, ProfilePages } from "./hr-pages2";
import { RecruitmentPages } from "./hr-pages3";
import { AnalyticsPages, ExitPages, Profile360Pages, VacancyPages } from "./hr-pages5";
import { BankFilePages, PayrollApprovalPages, PayReportPages, PaySettingsPages, PayslipPages, SalaryPaymentPages } from "./pay-pages2";
import { VehiclePages } from "./transport-pages";
import { BusAttendancePages, DriverAppPage, GpsPages, MaintenancePages, RoutePlannerPage, TransportReportPages, TransportSettingsPages } from "./transport-pages3";
import { BookPages } from "./library-pages";
import { CopyPages, LibraryMasterPages } from "./library-pages2";
import { CanteenPage, ChargesPage, HostelComplaintPages, DayMenuPage, HostelFeePages, HostelReportPages, OptInPage } from "./hostel-pages2";
import { EmergencyPages, EntryExitPages, CampusGatePassPages, PassPages, VisitorRegistrationPages, SecurityReportPages, VerificationPages } from "./visitor-pages";
import { CertTemplatePages, IssueCertificatePages } from "./cert-pages";
import { SettingsApprovalPages, AuditPages, CommSettingsPages, DocumentSettingsPages, DpdpPages, IntegrationPage, NotificationPages, RolePages, UserPages } from "./settings-pages2";
import { AcademicPages, SchoolAttendanceSettings, CampusPages, ClassConfigPages, ExamSettingsPages, FeeSettingsPages, TimingPages } from "./settings-pages";
import { CustomReportPages, ExportCenterPages, LibraryBooksReport, SchoolProfilePages } from "./report-pages2";
import { AcademicReports, AttendanceReports, ExamReports, FeeReports, HrReports, StudentReports } from "./report-pages";
import { ActReportPages, AwardPages, ClubPages, CompetitionPages, CulturalPages, EventCommPages, EventMgmtPages, HousePages, SportsPages } from "./act-pages";
import { AddEventPage, CertRegisterPage, RepoDocumentPages, ReportsPage as CertReportsPage, CertVerificationPages } from "./cert-pages2";
import { OnlineApplicationPages as ProgrammeRulesView } from "./adm-pages3";
import { CounsellingPages, HealthRecordsPage, HealthReportPages, MedicationPages, ScreeningPages, WelfarePages } from "./health-pages2";
import { FirstAidPages, HealthProfilePages, MedicalVisitPages } from "./health-pages";
import { SurveyPages } from "./survey-pages";
import { AllocationPages, BedPages, BuildingPages, HostelAttendancePages, HostelRoomPages, MessPages, SetupPages } from "./hostel-pages";
import { ChatActivityPage, ChatbotPages, CommReportPages, DiaryPages, GalleryPages, ModerationPages, ParentConvPages } from "./comm-pages2";
import { AnnouncementPages, CircularPages, ComposeForm, MessageLog, NoticePages, TemplateList } from "./comm-pages";
import { MatchPages, RfqPages, VendorPages } from "./inv-pages2";
import { AssetPages, GrnPages, InventoryReportPages, OrderPages, RequestPages, StockIssuePages, StockPages, SupplierPages, UpkeepPages } from "./inv-pages";
import { AvailableReport, IssuePages, ItemPages, LibraryFinePage, LibrarySettingsPages, MembershipPages, ReservationPages } from "./library-pages3";
import { PendingList } from "./fee-pages2";
import { AttendantPages, DriverPages, RoutePages, StopPages, StudentAllocationPages, TransportFeePages, VehicleAllocationPages } from "./transport-pages2";
import { OnboardingPages, ProbationPages } from "./hr-pages6";
import { AttendanceCalcPages, PayDeductionPages, PayrollProcessingPages, SalaryConfigPages, SalaryStructurePages } from "./pay-pages";
import { DocumentPages, LeaveHrPages, PerformancePages } from "./hr-pages4";
import { AccountingPages, CanteenPages, DashboardPages, ExpensePages, ReminderPages, FinReportPages, TallyPages } from "./fee-pages3";
import { ConcessionPages, FinePages, InstallmentPages, PendingPages, ReceiptPages, RefundPages } from "./fee-pages2";
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
import { SchoolQuickActions } from "./quick";
import { AdmissionOverview, AttendanceOverview, MainDashboard, StaffStatistics, StudentStatistics } from "./dash-pages";

type Render = (page: string) => ReactNode;

/** The working screen of each submenu, by "module/section". A page is the tab inside it. */
const table: Record<string, Render> = {
  "dashboard/main-dashboard": (p) => <div key={p}>{p === "kpi-cards" ? null : <SchoolQuickActions />}<MainDashboard tab={p === "kpi-cards" ? "kpi-cards" : "school-overview"} /></div>,
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
  "timetable/teacher-timetable": (p) => <TeacherTimetablePages tab={p === "availability" ? "availability" : "teacher-allocation"} key={p} />,
  "timetable/room-management": (p) => <RoomPages tab={p === "room-allocation" ? "room-allocation" : "classroom-list"} key={p} />,
  "timetable/subject-allocation": (p) => <AllocationListPage tab={p === "teacher" ? "teacher" : p === "period-mapping" ? "period-mapping" : "subject"} key={p} />,
  "timetable/substitution": (p) => <SubstitutionPages tab={p === "free-periods" ? "free-periods" : p === "substitution-history" ? "substitution-history" : p === "smart-assign" ? "smart-assign" : "substitute-teacher"} key={p} />,
  "timetable/timetable-view": (p) => <TimetableViewPages tab={p === "teacher-wise" ? "teacher-wise" : p === "room-wise" ? "room-wise" : "class-wise"} key={p} />,
  "timetable/timetable-reports": (p) => <TimetableReportPages tab={p === "period-allocation" ? "period-allocation" : p === "conflicts" ? "conflicts" : "workload"} key={p} />,
  "examinations/exam-configuration": (p) => <ExamConfigPages tab={p === "grading-system" ? "grading-system" : p === "marks-settings" ? "marks-settings" : "exam-types"} key={p} />,
  "examinations/exam-setup": (p) => <ExamSetupPages tab={p === "exam-list" ? "exam-list" : p === "edit-exam" ? "edit-exam" : "create-exam"} key={p} />,
  "examinations/exam-schedule": (p) => <ExamSchedulePages tab={(["date-sheet", "hall-allocation", "generate-date-sheet", "seating-plan"].includes(p) ? p : "subject-schedule") as "subject-schedule"} key={p} />,
  "examinations/exam-registration": (p) => <ExamRegistrationPages tab={p === "hall-tickets" ? "hall-tickets" : "student-eligibility"} key={p} />,
  "examinations/question-papers": (p) => <QuestionPages tab={p === "paper-creation" ? "paper-creation" : p === "upload" ? "upload" : "question-bank"} key={p} />,
  "examinations/marks-entry": (p) => <MarksEntryPages tab={(["bulk-entry", "practical-marks", "internal-assessment", "co-scholastic-grades"].includes(p) ? p : "subject-wise-marks") as "subject-wise-marks"} key={p} />,
  "examinations/marks-verification": (p) => <MarksVerificationPages tab={p === "correction" ? "correction" : p === "approval" ? "approval" : "verification"} key={p} />,
  "examinations/results-processing": (p) => <ResultsPages tab={p === "rank-calculation" ? "rank-calculation" : p === "result-analysis" ? "result-analysis" : "grade-calculation"} key={p} />,
  "examinations/report-cards": (p) => <ReportCardPages tab={(["generate", "preview", "print", "publish", "holistic-progress-card"].includes(p) ? p : "templates") as "templates"} key={p} />,
  "examinations/examination-reports": (p) => p === "class-results" ? <ResultsPages tab="class-results" key={p} /> : p === "subject-analysis" ? <ResultsPages tab="subject-analysis" key={p} /> : <StudentCard key={p} />,
  "examinations/competitive-exams": (p) => <CompetitivePages tab={(["test-series", "readiness-analysis", "question-bank", "exam-registrations"].includes(p) ? p : "programmes") as "programmes"} key={p} />,
  "lms/homework": (p) => <HomeworkPages tab={p === "homework-list" ? "homework-list" : p === "edit" ? "edit" : "create-homework"} key={p} />,
  "lms/assignment": (p) => <AssignmentPages tab={p === "assign-to-class" ? "assign-to-class" : p === "due-dates" ? "due-dates" : "create-assignment"} key={p} />,
  "lms/study-materials": (p) => <MaterialPages tab={p === "pdfs" ? "pdfs" : p === "videos" ? "videos" : p === "links" ? "links" : "upload-notes"} key={p} />,
  "lms/online-classes": (p) => <OnlineClassPages tab={p === "schedule" ? "schedule" : p === "meeting-links" ? "meeting-links" : "create-session"} key={p} />,
  "lms/online-tests": (p) => <OnlineTestPages tab={p === "question-bank" ? "question-bank" : p === "test-results" ? "test-results" : "create-test"} key={p} />,
  "lms/student-submissions": (p) => <SubmissionPages tab={p === "pending" ? "pending" : p === "late-submissions" ? "late-submissions" : "submitted"} key={p} />,
  "lms/evaluation": (p) => <SubmissionPages tab={p === "feedback" ? "feedback" : p === "reassessment" ? "reassessment" : "marks"} key={p} />,
  "lms/syllabus-tracking": (p) => <SyllabusPages tab={p === "subject-progress" ? "subject-progress" : "chapter-completion"} key={p} />,
  "lms/lms-reports": (p) => <LmsReportPages tab={p === "student-performance" ? "student-performance" : "assignment-completion"} key={p} />,
  "fees/fee-configuration": (p) => <FeeConfigPages tab={p === "fee-heads" ? "fee-heads" : p === "fee-groups" ? "fee-groups" : "fee-categories"} key={p} />,
  "fees/fee-structure": (p) => <FeeStructurePages tab={p === "section-wise" ? "section-wise" : p === "optional-fees" ? "optional-fees" : "class-wise"} key={p} />,
  "fees/student-fee-assignment": (p) => <StudentFeePages tab={(["bulk", "scholarship", "fee-changes", "new-admissions"].includes(p) ? p : "individual") as "individual"} key={p} />,
  "fees/fee-collection": (p) => <FeeCollectionPages tab={p === "counter-collection" ? "counter-collection" : p === "online-collection" ? "online-collection" : "collect-fee"} key={p} />,
  "fees/fee-installments": (p) => <InstallmentPages tab={p === "due-dates" ? "due-dates" : p === "payment-schedule" ? "payment-schedule" : "installment-setup"} key={p} />,
  "fees/fee-concessions": (p) => <ConcessionPages tab={p === "scholarship" ? "scholarship" : p === "fee-waiver" ? "fee-waiver" : p === "parent-requests" ? "parent-requests" : "discount"} key={p} />,
  "fees/fine-management": (p) => <FinePages tab={p === "fine-rules" ? "fine-rules" : p === "fine-collection" ? "fine-collection" : "late-fee"} key={p} />,
  "fees/fee-receipts": (p) => <ReceiptPages tab={p === "print" ? "print" : p === "cancel" ? "cancel" : p === "duplicate" ? "duplicate" : "generate"} key={p} />,
  "fees/pending-fees": (p) => <PendingPages tab={p === "overdue" ? "overdue" : p === "defaulter-list" ? "defaulter-list" : "outstanding"} key={p} />,
  "fees/refund-management": (p) => <RefundPages tab={p === "approval" ? "approval" : p === "refund-history" ? "refund-history" : "refund-request"} key={p} />,
  "fees/expenses": (p) => <ExpensePages tab={p === "add-expense" ? "add-expense" : p === "approval" ? "approval" : "expense-categories"} key={p} />,
  "fees/accounting": (p) => <AccountingPages tab={p === "vouchers" ? "vouchers" : p === "cash-book" ? "cash-book" : p === "bank-book" ? "bank-book" : "ledger"} key={p} />,
  "fees/financial-reports": (p) => <FinReportPages tab={p === "outstanding" ? "outstanding" : p === "daily-cash" ? "daily-cash" : p === "monthly-summary" ? "monthly-summary" : "collection"} key={p} />,
  "fees/tally-export": (p) => <TallyPages tab={p === "ledger-mapping" ? "ledger-mapping" : "export-vouchers"} key={p} />,
  "fees/canteen-wallet": () => <CanteenPages />,
  "fees/finance-dashboards": (p) => <DashboardPages tab={p === "ai-insights" ? "ai-insights" : p === "alert-rules" ? "alert-rules" : "leadership-live"} key={p} />,
  "fees/auto-reminders": (p) => (p === "todays-queue" || p === "reminder-log" || p === "results" ? <ReminderRunPages tab={p} key={p} /> : <ReminderPages tab="reminder-schedule" key={p} />),
  "fees/reconciliation": (p) => <ReconPages tab={(["gateway-settlements", "payment-matching", "exceptions", "bank-statements", "matching-rules", "audit-log"].includes(p) ? p : "live-status") as "live-status"} key={p} />,
  "fees/budgets-and-forecasts": (p) => <BudgetPages tab={(["budget-vs-actual", "cash-flow", "fee-income"].includes(p) ? p : "budget-by-head") as "budget-by-head"} key={p} />,
  "fees/claims-and-advances": (p) => <ClaimPages tab={p === "advances" ? "advances" : p === "claim-rules" ? "claim-rules" : "staff-claims"} key={p} />,
  "hr/employee-directory": (p) => <HrWrap><StaffDirectoryPages tab={p === "teaching-staff" ? "teaching-staff" : p === "non-teaching-staff" ? "non-teaching-staff" : "all-staff"} key={p} /></HrWrap>,
  "hr/employee-registration": (p) => <HrWrap><EmployeeRegistrationPages tab={p === "bulk-import" ? "bulk-import" : "add-employee"} key={p} /></HrWrap>,
  "hr/employee-profile": (p) => <HrWrap><ProfilePages tab={(["contact", "qualification", "experience"].includes(p) ? p : "personal") as "personal"} key={p} /></HrWrap>,
  "hr/department": (p) => <HrWrap><DepartmentPages tab={p === "add-department" ? "add-department" : "department-list"} key={p} /></HrWrap>,
  "hr/designation": (p) => <HrWrap><DesignationPages tab={p === "add-designation" ? "add-designation" : "designation-list"} key={p} /></HrWrap>,
  "hr/recruitment": (p) => <HrWrap><RecruitmentPages tab={(["applications", "interviews", "resume-database", "shortlisting", "background-checks", "offer-letters", "create-offer"].includes(p) ? p : "job-openings") as "job-openings"} key={p} /></HrWrap>,
  "hr/staff-attendance": (p) => <HrWrap>{p === "biometric" ? <BiometricPages tab="attendance-sync" key={p} /> : <StaffAttendancePages tab={p === "monthly" ? "department-wise" : p === "geo-check-ins" ? "geo-check-ins" : "daily-staff-attendance"} key={p} />}</HrWrap>,
  "hr/leave-management": (p) => <HrWrap>{p === "applications" ? <LeavePages tab="staff-leave" key={p} /> : <LeaveHrPages tab={(["approvals", "leave-balance", "policy-rules", "comp-off"].includes(p) ? p : "leave-types") as "approvals"} key={p} />}</HrWrap>,
  "hr/staff-exit": (p) => <HrWrap><ExitPages tab={(["exit-approval", "relieving", "clearance", "full-and-final"].includes(p) ? p : "resignation") as "resignation"} key={p} /></HrWrap>,
  "hr/hr-reports": (p) => <HrWrap>{p === "attendance" ? <StaffAttendancePages tab="department-wise" key={p} /> : p === "leave" ? <LeavePages tab="staff-leave" key={p} /> : p === "recruitment" ? <RecruitmentPages tab="applications" key={p} /> : <StaffDirectoryPages tab="all-staff" key={p} />}</HrWrap>,
  "hr/employee-360": () => <HrWrap><Profile360Pages /></HrWrap>,
  "hr/hr-analytics-and-compliance": (p) => <HrWrap><AnalyticsPages tab={p === "compliance-calendar" ? "compliance-calendar" : p === "scheduled-reports" ? "scheduled-reports" : "hr-analytics"} key={p} /></HrWrap>,
  "hr/vacancies": (p) => <HrWrap><VacancyPages tab={p === "sanctioned-posts" ? "sanctioned-posts" : p === "request-a-vacancy" ? "request-a-vacancy" : "vacancy-requests"} key={p} /></HrWrap>,
  "hr/onboarding": (p) => <HrWrap><OnboardingPages tab={p === "joining-checklist" ? "joining-checklist" : "new-joiners"} key={p} /></HrWrap>,
  "hr/probation": (p) => <HrWrap>{p === "probation-review" ? <PerformancePages tab="reviews" key={p} /> : <ProbationPages key={p} />}</HrWrap>,
  "payroll/salary-configuration": (p) => <HrWrap><SalaryConfigPages tab={p === "allowances" ? "allowances" : p === "deductions" ? "deductions" : "salary-heads"} key={p} /></HrWrap>,
  "payroll/salary-structure": (p) => <HrWrap>{p === "designation-wise" ? <DesignationPages tab="designation-list" key={p} /> : <SalaryStructurePages tab={p === "employee-wise" ? "employee-wise" : "assign-structure"} key={p} />}</HrWrap>,
  "payroll/payroll-processing": (p) => <HrWrap><PayrollProcessingPages tab={p === "generate-payroll" ? "generate-payroll" : "monthly-payroll"} key={p} /></HrWrap>,
  "payroll/attendance-calculation": (p) => <HrWrap><AttendanceCalcPages tab={p === "paid-leave" ? "paid-leave" : p === "loss-of-pay" ? "loss-of-pay" : "working-days"} key={p} /></HrWrap>,
  "payroll/payroll-approval": (p) => <HrWrap><PayrollApprovalPages tab={p === "finance-approval" ? "finance-approval" : p === "approval-history" ? "approval-history" : "hr-verification"} key={p} /></HrWrap>,
  "payroll/payslips": (p) => <HrWrap><PayslipPages tab={p === "preview" ? "preview" : p === "print" ? "print" : p === "download" ? "download" : "generate"} key={p} /></HrWrap>,
  "payroll/salary-payments": (p) => <HrWrap><SalaryPaymentPages tab={p === "payment-status" ? "payment-status" : "payment-register"} key={p} /></HrWrap>,
  "payroll/payroll-reports": (p) => <HrWrap>{p === "annual-payroll" || p === "deduction-report" ? <PayReportPages tab={p} key={p} /> : <PayrollProcessingPages tab="monthly-payroll" key={p} />}</HrWrap>,
  "payroll/payroll-settings": (p) => <HrWrap><PaySettingsPages tab={p === "tax-rules" ? "tax-rules" : p === "payroll-policies" ? "payroll-policies" : "salary-cycle"} key={p} /></HrWrap>,
  "payroll/bank-and-statutory-files": (p) => <HrWrap><BankFilePages tab={p === "pf-ecr" ? "pf-ecr" : p === "esi" ? "esi" : p === "pt-and-tds" ? "pt-and-tds" : "bank-transfer-file"} key={p} /></HrWrap>,
  "transport/driver-management": (p) => <DriverPages tab={p === "license" ? "license" : p === "documents" ? "documents" : "driver-registration"} key={p} />,
  "transport/attendant-management": (p) => <AttendantPages tab={p === "staff-allocation" ? "staff-allocation" : "add-attendant"} key={p} />,
  "transport/route-management": (p) => <RoutePages tab={p === "route-list" ? "route-list" : p === "route-details" ? "route-details" : "add-route"} key={p} />,
  "transport/stop-management": (p) => <StopPages tab={p === "stop-sequence" ? "stop-sequence" : p === "stop-timings" ? "stop-timings" : "add-stop"} key={p} />,
  "transport/student-allocation": (p) => <StudentAllocationPages tab={p === "assign-stop" ? "assign-stop" : p === "transfer-route" ? "transfer-route" : "assign-route"} key={p} />,
  "transport/vehicle-allocation": (p) => <VehicleAllocationPages tab={p === "driver-to-vehicle" ? "driver-to-vehicle" : "vehicle-to-route"} key={p} />,
  "transport/transport-fees": (p) => p === "pending-fees" ? <PendingList kind="outstanding" key={p} /> : <TransportFeePages tab={p === "collection" ? "collection" : "fee-structure"} key={p} />,
  "transport/gps-tracking": (p) => <GpsPages tab={p === "trip-history" ? "trip-history" : p === "device-status" ? "device-status" : "live-tracking"} key={p} />,
  "transport/maintenance": (p) => <MaintenancePages tab={p === "repairs" ? "repairs" : p === "insurance" ? "insurance" : "service-schedule"} key={p} />,
  "transport/transport-reports": (p) => <TransportReportPages tab={p === "vehicle-wise" ? "vehicle-wise" : p === "student-wise" ? "student-wise" : "route-wise"} key={p} />,
  "transport/transport-settings": (p) => <TransportSettingsPages tab={p === "notifications" ? "notifications" : p === "route-rules" ? "route-rules" : "capacity"} key={p} />,
  "transport/driver-app": () => <DriverAppPage />,
  "transport/route-planner": () => <RoutePlannerPage />,
  "transport/bus-attendance": (p) => <BusAttendancePages tab={p === "missed-boardings" ? "missed-boardings" : "trip-roster"} key={p} />,
  "library/book-categories": (p) => <LibraryMasterPages kind="categories" tab={p === "add-category" ? "add" : "list"} key={p} />,
  "library/publishers": (p) => <LibraryMasterPages kind="publishers" tab={p === "add-publisher" ? "add" : "list"} key={p} />,
  "library/authors": (p) => <LibraryMasterPages kind="authors" tab={p === "add-author" ? "add" : "list"} key={p} />,
  "library/book-copies": (p) => <CopyPages tab={p === "barcode" ? "barcode" : "accession-number"} key={p} />,
  "library/membership": (p) => <MembershipPages tab={p === "staff-membership" ? "staff-membership" : "student-membership"} key={p} />,
  "library/book-issue": (p) => <IssuePages tab={p === "issue-history" ? "issue-history" : "issue-book"} key={p} />,
  "library/book-return": (p) => <IssuePages tab={p === "renewal" ? "renewal" : "return-book"} key={p} />,
  "library/reservation": (p) => <ReservationPages tab={p === "reservation-queue" ? "reservation-queue" : "book-reservation"} key={p} />,
  "library/fine-management": (p) => (p === "fine-collection" ? <LibraryFinePage key={p} /> : <LibrarySettingsPages tab="fine-rules" key={p} />),
  "library/library-reports": (p) => (p === "issued" || p === "overdue" || p === "lost" ? <IssuePages tab={p} key={p} /> : <AvailableReport key={p} />),
  "library/library-settings": (p) => <LibrarySettingsPages tab={p === "return-period" ? "return-period" : p === "fine-rules" ? "fine-rules" : "issue-limits"} key={p} />,
  "inventory/supplier-management": (p) => <SupplierPages tab={p === "add-supplier" ? "add-supplier" : "supplier-list"} key={p} />,
  "inventory/purchase-requests": (p) => <RequestPages tab={p === "pending-requests" ? "pending-requests" : "new-request"} key={p} />,
  "inventory/purchase-orders": (p) => <OrderPages tab={p === "po-list" ? "po-list" : p === "approval" ? "approval" : "create-po"} key={p} />,
  "inventory/goods-receipt": (p) => <GrnPages tab={p === "grn" ? "grn" : "receive-stock"} key={p} />,
  "inventory/stock-management": (p) => <StockPages tab={p === "stock-adjustment" ? "stock-adjustment" : "available-stock"} key={p} />,
  "inventory/stock-issue": (p) => <StockIssuePages tab={p === "issue-to-staff" ? "issue-to-staff" : "issue-to-department"} key={p} />,
  "inventory/asset-management": (p) => <AssetPages tab={p === "asset-allocation" ? "asset-allocation" : "asset-register"} key={p} />,
  "inventory/maintenance": (p) => <UpkeepPages tab={p === "service-schedule" ? "service-schedule" : "repairs"} key={p} />,
  "inventory/reports": (p) => <InventoryReportPages tab={(["purchase", "asset", "consumption", "store-sales"].includes(p) ? p : "stock") as "stock"} key={p} />,
  "inventory/vendor-management": (p) => <VendorPages tab={p === "scorecards" ? "scorecards" : "onboarding-and-checks"} key={p} />,
  "inventory/quotations": (p) => <RfqPages tab={p === "comparison-sheet" ? "comparison-sheet" : "requests-for-quotation"} key={p} />,
  "inventory/invoice-matching": () => <MatchPages />,
  "communication/circulars": (p) => <CircularPages tab={(["publish", "archive", "templates"].includes(p) ? p : "create-circular") as "publish"} key={p} />,
  "communication/announcements": (p) => <AnnouncementPages tab={p === "schedule" ? "schedule" : p === "publish" ? "publish" : "create"} key={p} />,
  "communication/notice-board": (p) => <NoticePages tab={p === "staff-notices" ? "Staff" : p === "parent-notices" ? "Parent" : "Student"} key={p} />,
  "communication/email": (p) => (p === "templates" ? <TemplateList key={p} /> : p === "sent-history" ? <MessageLog channel="Email" key={p} /> : <ComposeForm channel="Email" title="New Email" send="Send email" key={p} />),
  "communication/sms": (p) => (p === "templates" ? <TemplateList key={p} /> : p === "delivery-reports" ? <MessageLog channel="SMS" key={p} /> : <ComposeForm channel="SMS" title="New SMS" send="Send sms" key={p} />),
  "communication/whatsapp": (p) => (p === "campaigns" || p === "delivery-status" ? <MessageLog channel="WhatsApp" key={p} /> : <TemplateList key={p} />),
  "communication/in-app-notifications": (p) => (p === "notification-history" ? <MessageLog channel="In-App" key={p} /> : <ComposeForm channel="In-App" title="New notification" send="Send notification" key={p} />),
  "communication/school-diary": (p) => <DiaryPages tab={(["teacher-remarks", "parent-acknowledgement", "templates"].includes(p) ? p : "class-diary") as "templates"} key={p} />,
  "communication/parent-communication": (p) => <ParentConvPages tab={p === "teacher-replies" ? "teacher-replies" : "parent-messages"} key={p} />,
  "communication/communication-reports": (p) => <CommReportPages tab={p === "delivered" ? "delivered" : p === "failed" ? "failed" : "sent"} key={p} />,
  "communication/chatbot": (p) => <ChatbotPages tab={(["unanswered-questions", "faqs", "ratings-and-topics"].includes(p) ? p : "conversations") as "faqs"} key={p} />,
  "communication/photo-gallery": (p) => <GalleryPages tab={(["create-album", "pending-approval", "photo-consent"].includes(p) ? p : "albums") as "albums"} key={p} />,
  "communication/chat-moderation": (p) => (p === "chat-activity" ? <ChatActivityPage key={p} /> : <ModerationPages tab={p === "chat-rules" ? "chat-rules" : "reported-messages"} key={p} />),
  "communication/surveys-and-feedback": (p) => <SurveyPages tab={(["create-survey", "survey-results", "teacher-feedback"].includes(p) ? p : "surveys") as "surveys"} key={p} />,
  "hostel/hostel-setup": (p) => <SetupPages tab={p === "add-hostel" ? "add-hostel" : "hostel-list"} key={p} />,
  "hostel/building-management": (p) => <BuildingPages tab={p === "floors" ? "floors" : "buildings"} key={p} />,
  "hostel/room-management": (p) => <HostelRoomPages tab={p === "room-types" ? "room-types" : "room-list"} key={p} />,
  "hostel/bed-management": (p) => <BedPages tab={p === "availability" ? "availability" : "bed-list"} key={p} />,
  "hostel/student-allocation": (p) => <AllocationPages tab={p === "room-transfer" ? "room-transfer" : "room-allocation"} key={p} />,
  "hostel/hostel-attendance": (p) => <HostelAttendancePages tab={p === "outing-register" ? "outing-register" : "daily-attendance"} key={p} />,
  "hostel/mess-management": (p) => (p === "daily-menu" ? <DayMenuPage key={p} /> : p === "opt-in-requests" ? <OptInPage key={p} /> : p === "mess-charges" ? <ChargesPage key={p} /> : <MessPages tab={(["hostel-menu", "day-scholar-mess", "meal-plans"].includes(p) ? p : "meal-plans") as "meal-plans"} key={p} />),
  "hostel/hostel-complaints": (p) => <HostelComplaintPages tab={p === "assignment" ? "assignment" : p === "resolution" ? "resolution" : "new-complaint"} key={p} />,
  "hostel/hostel-fees": (p) => <HostelFeePages tab={p === "collection" ? "collection" : "fee-structure"} key={p} />,
  "hostel/hostel-reports": (p) => <HostelReportPages tab={p === "attendance" ? "attendance" : p === "fee-reports" ? "fee-reports" : "occupancy"} key={p} />,
  "hostel/canteen-counter": () => <CanteenPage />,
  "visitors/visitor-registration": (p) => <VisitorRegistrationPages tab={p === "visitor-list" ? "visitor-list" : "new-visitor"} key={p} />,
  "visitors/visitor-verification": (p) => <VerificationPages tab={p === "approval" ? "approval" : "identity-verification"} key={p} />,
  "visitors/visitor-pass": (p) => <PassPages tab={p === "print" ? "print" : p === "cancel" ? "cancel" : "generate"} key={p} />,
  "visitors/entry-exit": (p) => <EntryExitPages tab={p === "exit-register" ? "exit-register" : "entry-register"} key={p} />,
  "visitors/student-gate-pass": (p) => <CampusGatePassPages kind="Student" tab={p === "approval" ? "approval" : p === "issue" ? "issue" : "request"} key={p} />,
  "visitors/staff-gate-pass": (p) => <CampusGatePassPages kind="Staff" tab={p === "approval" ? "approval" : "request"} key={p} />,
  "visitors/emergency-register": (p) => <EmergencyPages tab={p === "incident-register" ? "incident-register" : "emergency-contacts"} key={p} />,
  "visitors/security-reports": (p) => <SecurityReportPages tab={p === "gate-pass" ? "gate-pass" : p === "incident-reports" ? "incident-reports" : "visitor"} key={p} />,
  "health/student-health-profiles": (p) => <HealthProfilePages tab={(["emergency-contacts", "vaccination-records", "parent-updates"].includes(p) ? p : "medical-information") as "parent-updates"} key={p} />,
  "health/medical-visits": (p) => <MedicalVisitPages tab={p === "visit-history" ? "visit-history" : "new-visit"} key={p} />,
  "health/first-aid": (p) => (p === "incident-details" ? <HealthRecordsPage key={p} /> : <FirstAidPages tab="first-aid-register" key={p} />),
  "health/health-screening": (p) => <ScreeningPages tab={(["weight", "vision", "health-checkups"].includes(p) ? p : "height") as "height"} key={p} />,
  "health/medication-register": (p) => <MedicationPages tab={p === "administration-logs" ? "administration-logs" : "medication-records"} key={p} />,
  "health/counselling": (p) => <CounsellingPages tab={p === "session-records" ? "session-records" : p === "follow-up" ? "follow-up" : "appointment"} key={p} />,
  "health/student-welfare": (p) => <WelfarePages tab={p === "support-actions" ? "support-actions" : "welfare-cases"} key={p} />,
  "health/health-reports": (p) => <HealthReportPages tab={p === "incidents" ? "incidents" : p === "screening" ? "screening" : "medical-visits"} key={p} />,
  "certificates/certificate-templates": (p) => <CertTemplatePages tab={p === "edit-template" ? "edit-template" : "add-template"} key={p} />,
  "certificates/bonafide-certificate": (p) => <IssueCertificatePages kind="Bonafide" tab={p === "preview" ? "preview" : p === "print" ? "print" : "generate"} key={p} />,
  "certificates/study-certificate": (p) => (p === "issue-register" ? <CertRegisterPage kind="Study" exportName="study-certificates" key={p} /> : <IssueCertificatePages kind="Study" tab="generate" key={p} />),
  "certificates/conduct-certificate": (p) => (p === "issue-register" ? <CertRegisterPage kind="Conduct" exportName="conduct-certificates" key={p} /> : <IssueCertificatePages kind="Conduct" tab="generate" key={p} />),
  "certificates/character-certificate": (p) => (p === "issue-register" ? <CertRegisterPage kind="Character" exportName="character-certificates" key={p} /> : <IssueCertificatePages kind="Character" tab="generate" key={p} />),
  "certificates/transfer-certificate": (p) => (p === "approval" ? <CertRegisterPage status="Pending" approve exportName="approvals" key={p} /> : p === "generate" ? <IssueCertificatePages kind="Transfer" tab="generate" key={p} /> : <CertRegisterPage kind="Transfer" apply="Transfer" exportName="transfer-applications" key={p} />),
  "certificates/custom-certificates": (p) => (p === "generate" ? <IssueCertificatePages kind="Custom" tab="generate" key={p} /> : <CertTemplatePages tab="add-template" title="Design Template" key={p} />),
  "certificates/document-repository": (p) => <RepoDocumentPages tab={p === "staff-documents" ? "staff-documents" : "student-documents"} key={p} />,
  "certificates/verification": (p) => (p === "programme-rules" ? <ProgrammeRulesView tab="programme-rules" key={p} /> : <CertVerificationPages tab={p === "verification-status" ? "verification-status" : "certificate-number"} key={p} />),
  "certificates/reports": (p) => <CertReportsPage tab={p === "pending-applications" ? "pending-applications" : "issued-certificates"} key={p} />,
  "activities/school-events": (p) => (p === "event-calendar" ? <CalendarPages tab="school-calendar" key={p} /> : <AddEventPage key={p} />),
  "activities/sports": (p) => <SportsPages tab={p === "team-allocation" ? "team-allocation" : "sports-list"} key={p} />,
  "activities/competitions": (p) => <CompetitionPages tab={p === "registration" ? "registration" : p === "results" ? "results" : "competition-setup"} key={p} />,
  "activities/clubs": (p) => <ClubPages tab={p === "membership" ? "membership" : "club-list"} key={p} />,
  "activities/cultural-activities": (p) => <CulturalPages tab={p === "participation" ? "participation" : "activities"} key={p} />,
  "activities/achievements": (p) => <AwardPages tab={p === "staff-awards" ? "staff-awards" : "student-awards"} key={p} />,
  "activities/event-communication": (p) => <EventCommPages tab={p === "notices" ? "notices" : "invitations"} key={p} />,
  "activities/reports": (p) => <ActReportPages tab={p === "achievements" ? "achievements" : "participation"} key={p} />,
  "activities/houses": (p) => <HousePages tab={p === "award-points" ? "award-points" : "standings"} key={p} />,
  "activities/event-management": (p) => <EventMgmtPages tab={(["volunteers-and-duties", "event-budget", "event-attendance"].includes(p) ? p : "registrations-and-rsvp") as "event-budget"} key={p} />,
  "reports/student-reports": (p) => <StudentReports tab={p === "student-strength" ? "student-strength" : p === "transfer" ? "transfer" : "admission"} key={p} />,
  "reports/academic-reports": (p) => <AcademicReports tab={p === "subject" ? "subject" : p === "syllabus-progress" ? "syllabus-progress" : "class"} key={p} />,
  "reports/attendance-reports": (p) => <AttendanceReports tab={p === "staff" ? "staff" : p === "class-wise" ? "class-wise" : "student"} key={p} />,
  "reports/examination-reports": (p) => <ExamReports tab={p === "ranks" ? "ranks" : p === "grade-analysis" ? "grade-analysis" : "results"} key={p} />,
  "reports/fee-reports": (p) => <FeeReports tab={p === "dues" ? "dues" : p === "concessions" ? "concessions" : "collection"} key={p} />,
  "reports/hr-reports": (p) => <HrReports tab={p === "attendance" ? "attendance" : p === "leave" ? "leave" : "staff-strength"} key={p} />,
  "reports/payroll-reports": (p) => <HrWrap>{p === "deductions" ? <PayReportPages tab="deduction-report" key={p} /> : p === "payment" ? <SalaryPaymentPages tab="payment-register" key={p} /> : <><SalaryStructurePages tab="assign-structure" key="a" /><SalaryStructurePages tab="employee-wise" key="b" /></>}</HrWrap>,
  "reports/transport-reports": (p) => <TransportReportPages tab={p === "vehicles" ? "vehicle-wise" : p === "allocation" ? "student-wise" : "route-wise"} key={p} />,
  "reports/library-reports": (p) => (p === "issues" || p === "returns" ? <IssuePages tab="issue-history" key={p} /> : <LibraryBooksReport key={p} />),
  "reports/inventory-reports": (p) => <InventoryReportPages tab={p === "purchases" ? "purchase" : p === "assets" ? "asset" : "stock"} key={p} />,
  "reports/custom-reports": (p) => <CustomReportPages tab={p === "saved-reports" ? "saved-reports" : "report-builder"} key={p} />,
  "reports/export-center": (p) => <ExportCenterPages tab={p === "pdf" ? "pdf" : p === "csv" ? "csv" : p === "print" ? "print" : "excel"} key={p} />,
  "settings/school-profile": (p) => <SchoolProfilePages tab={p === "address" ? "address" : p === "logo" ? "logo" : "general-details"} key={p} />,
  "settings/campuses": (p) => <CampusPages tab={p === "campus-settings" ? "campus-settings" : "campus-details"} key={p} />,
  "settings/academic-settings": (p) => <AcademicPages tab={p === "board" ? "board" : p === "medium" ? "medium" : "academic-year"} key={p} />,
  "settings/school-timings": (p) => <TimingPages tab={p === "periods" ? "periods" : p === "breaks" ? "breaks" : "working-days"} key={p} />,
  "settings/class-configuration": (p) => <ClassConfigPages tab={p === "section" ? "section" : p === "subject" ? "subject" : "class"} key={p} />,
  "settings/fee-settings": (p) => <FeeSettingsPages tab={(["application-fee", "installments", "payment-options"].includes(p) ? p : "fee-rules") as "installments"} key={p} />,
  "settings/attendance-settings": (p) => <SchoolAttendanceSettings tab={p === "notifications" ? "notifications" : "attendance-rules"} key={p} />,
  "settings/examination-settings": (p) => <ExamSettingsPages tab={p === "marks" ? "marks" : p === "result-rules" ? "result-rules" : "grading"} key={p} />,
  "settings/communication-settings": (p) => <CommSettingsPages tab={p === "email" ? "email" : p === "whatsapp" ? "whatsapp" : "sms"} key={p} />,
  "settings/integrations": () => <IntegrationPage />,
  "settings/user-management": (p) => <UserPages tab={p === "activate" ? "activate" : p === "deactivate" ? "deactivate" : "create-user"} key={p} />,
  "settings/roles-and-permissions": (p) => <RolePages tab={p === "permission-assignment" ? "permission-assignment" : "role-setup"} key={p} />,
  "settings/approval-workflow": (p) => <SettingsApprovalPages tab={p === "approval-routing" ? "approval-routing" : "approval-levels"} key={p} />,
  "settings/notification-settings": (p) => <NotificationPages tab={p === "trigger-rules" ? "trigger-rules" : "templates"} key={p} />,
  "settings/document-settings": (p) => <DocumentSettingsPages tab={p === "numbering" ? "numbering" : "certificate-templates"} key={p} />,
  "settings/audit-and-activity": (p) => <AuditPages tab={p === "change-history" ? "change-history" : "audit-logs"} key={p} />,
  "settings/data-protection-dpdp": (p) => <DpdpPages tab={p === "data-requests" ? "data-requests" : "consent-register"} key={p} />,
  "inventory/item-management": (p) => <ItemPages tab={p === "add-item" ? "add-item" : p === "item-categories" ? "item-categories" : "item-list"} key={p} />,
  "library/book-management": (p) => <BookPages tab={p === "book-list" ? "book-list" : p === "edit-book" ? "edit-book" : "add-book"} key={p} />,
  "transport/vehicle-management": (p) => <VehiclePages tab={p === "vehicle-list" ? "vehicle-list" : p === "vehicle-documents" ? "vehicle-documents" : "add-vehicle"} key={p} />,
  "payroll/deductions": (p) => <HrWrap><PayDeductionPages tab={p === "esi" ? "esi" : p === "professional-tax" ? "professional-tax" : p === "other-applicable-deductions" ? "other-applicable-deductions" : "pf"} key={p} /></HrWrap>,
  "hr/staff-documents": (p) => <HrWrap><DocumentPages tab={p === "id-proof" ? "id-proof" : p === "contracts" ? "contracts" : "certificates"} key={p} /></HrWrap>,
  "hr/staff-performance": (p) => <HrWrap><PerformancePages tab={(["reviews", "ratings", "360-feedback", "competency-matrix", "increment-recommendation", "kpis-and-kras", "appraisal-cycle"].includes(p) ? p : "appraisals") as "appraisals"} key={p} /></HrWrap>,
  "admission/student-registration": (p) => <RegistrationPages tab={p === "student-id" ? "student-id" : p === "registration" ? "registration" : p === "auto-registration" ? "auto-registration" : "generate-admission-number"} key={p} />,
  "front-office/postal-management": (p) => <PostPages tab={p === "outgoing-post" ? "outgoing-post" : p === "post-register" ? "post-register" : "incoming-post"} key={p} />,
};

const HrWrap = ({ children }: { children: ReactNode }) => <><HrFlow />{children}</>;
export function renderPage(module: string, section: string, page: string): ReactNode {
  const render = table[`${module}/${section}`];
  return render ? render(page) : null;
}
