import type { ReactNode } from "react";
import { renderPage as renderSchoolPage } from "../../school/s/registry";
import { AnalyticsPages } from "../../school/s/hr-pages5";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { Claims, Payslips } from "../../teacher/t/profile-pages";
import { HiringPipeline, Notifications, Overview, PayrollStatus } from "./dash-pages";
import { MyContact, MyDocuments, MyEmployment, MyQualifications } from "./profile-pages";
import { ClaimRegister, Verification } from "./records-pages";
import { AssignStructure, EmployeeWise } from "./salary-pages";
import { CheckinLog, DailyAttendance, DepartmentAttendance, DeviceMapping, GeoSettings, MonthlyAttendance, SyncLog } from "./attendance-pages";
import { Applications, Approvals, LeaveBalance } from "./leave-pages";
import { GeneratePayroll, MonthlyPayroll, MonthlyPayrollReport } from "./payroll-pages";
import { AttendanceCalculation, Deductions } from "./calc-pages";
import { Approval, ApprovalHistory, PayslipDownload, PayslipGenerate, PayslipPreview } from "./approval-pages";
import { BankFile, EsiFile, PfEcr, PtTds } from "./file-pages";
import { BackgroundChecks, CareersPage, JoiningChecklist, NewJoiners, OfferLetters, Postings, RequestVacancy, ScreeningRules } from "./recruit-pages";
import { ExitInterviews, ExitLetters } from "./exit-pages";
import { ProbationReview } from "./probation-pages";
import { AttendanceReport, DeductionReport, LeaveReport, RecruitmentReport } from "./report-pages";
import { HrQuickActions } from "./quick";
import { Head } from "../../teacher/t/head";

type Go = (tab: string) => void;

/** Every tab of the HR Dashboard starts with Quick actions and Recent pages. */
const dash = (key: string, page: ReactNode) => <div key={key}><HrQuickActions />{page}</div>;

/** The screen for one page (tab) of one submenu. Pages that come from the School Admin portal are drawn by its own screens. */
export function renderPage(module: string, section: string, page: string, go: Go, school?: [string, string]): ReactNode {
  const k = `${module}/${section}/${page}`;
  switch (k) {
    case "dashboard/hr-dashboard/overview": return dash(k, <Overview />);
    case "dashboard/hr-dashboard/payroll-status": return dash(k, <PayrollStatus />);
    case "dashboard/hr-dashboard/notifications": return dash(k, <Notifications />);
    case "dashboard/hr-dashboard/hr-analytics": return dash(k, <AnalyticsHead tab="hr-analytics" />);
    case "dashboard/hr-dashboard/compliance-calendar": return dash(k, <AnalyticsHead tab="compliance-calendar" />);
    case "dashboard/hr-dashboard/scheduled-reports": return dash(k, <AnalyticsHead tab="scheduled-reports" />);
    case "dashboard/hr-dashboard/hiring-pipeline": return dash(k, <HiringPipeline />);
    case "dashboard/help-desk/raise-a-request": return <RaiseRequest key={k} />;
    case "dashboard/help-desk/my-requests": return <MyRequests key={k} go={go} />;
    case "dashboard/school-calendar/month-view": return <MonthView key={k} />;
    case "dashboard/school-calendar/coming-up": return <ComingUp key={k} />;
    case "profile/personal-details/contact": return <MyContact key={k} />;
    case "profile/personal-details/employment": return <MyEmployment key={k} />;
    case "profile/personal-details/qualification": return <MyQualifications key={k} />;
    case "profile/personal-details/documents": return <MyDocuments key={k} />;
    case "profile/my-payslips/payslips": return <Payslips key={k} />;
    case "profile/my-claims/submit-a-claim": return <Claims key={k} view="submit" go={go} />;
    case "profile/my-claims/my-claims": return <Claims key={k} view="list" go={go} empty="No claims yet." />;
    case "organisation/salary-structure/assign-structure": return <AssignStructure key={k} />;
    case "organisation/salary-structure/employee-wise": return <EmployeeWise key={k} />;
    case "attendance/staff-attendance/daily": return <DailyAttendance key={k} />;
    case "attendance/staff-attendance/monthly": return <MonthlyAttendance key={k} />;
    case "attendance/staff-attendance/department-wise": return <DepartmentAttendance key={k} />;
    case "attendance/biometric/sync-log": return <SyncLog key={k} />;
    case "attendance/biometric/device-mapping": return <DeviceMapping key={k} />;
    case "attendance/geo-fencing/check-in-log": return <CheckinLog key={k} />;
    case "attendance/geo-fencing/geo-fence-settings": return <GeoSettings key={k} />;
    case "leave/leave-management/applications": return <Applications key={k} />;
    case "leave/leave-management/approvals": return <Approvals key={k} />;
    case "leave/leave-management/leave-balance": return <LeaveBalance key={k} />;
    case "recruitment/vacancies/request-a-vacancy": return <RequestVacancy key={k} go={go} />;
    case "recruitment/job-posting/postings": return <Postings key={k} />;
    case "recruitment/job-posting/careers-page": return <CareersPage key={k} />;
    case "recruitment/candidates/screening-rules": return <ScreeningRules key={k} />;
    case "recruitment/verification-and-offers/background-checks": return <BackgroundChecks key={k} />;
    case "recruitment/verification-and-offers/offer-letters": return <OfferLetters key={k} go={go} />;
    case "recruitment/onboarding/new-joiners": return <NewJoiners key={k} go={go} />;
    case "recruitment/onboarding/joining-checklist": return <JoiningChecklist key={k} />;
    case "records/staff-exit/exit-interviews": return <ExitInterviews key={k} />;
    case "records/staff-exit/exit-letters": return <ExitLetters key={k} />;
    case "records/probation/probation-review": return <ProbationReview key={k} />;
    case "reports/hr-reports/recruitment": return <RecruitmentReport key={k} />;
    case "reports/payroll-reports/monthly-payroll": return <MonthlyPayrollReport key={k} />;
    case "reports/payroll-reports/annual-payroll": return <EmployeeWise key={k} title="Annual Payroll" />;
    case "reports/payroll-reports/deduction-report": return <DeductionReport key={k} />;
    case "reports/hr-reports/attendance": return <AttendanceReport key={k} />;
    case "reports/hr-reports/leave": return <LeaveReport key={k} />;
    case "payroll/attendance-calculation/working-days": return <AttendanceCalculation key={k} view="working" />;
    case "payroll/attendance-calculation/paid-leave": return <AttendanceCalculation key={k} view="paid" />;
    case "payroll/attendance-calculation/loss-of-pay": return <AttendanceCalculation key={k} view="lop" />;
    case "payroll/deductions/pf": return <Deductions key={k} kind="pf" />;
    case "payroll/deductions/esi": return <Deductions key={k} kind="esi" />;
    case "payroll/deductions/professional-tax": return <Deductions key={k} kind="pt" />;
    case "payroll/deductions/other-applicable-deductions": return <Deductions key={k} kind="other" />;
    case "payroll-approval/payroll-approval/hr-verification": return <Approval key={k} stage="hr" />;
    case "payroll-approval/payroll-approval/finance-approval": return <Approval key={k} stage="finance" />;
    case "payroll-approval/payroll-approval/approval-history": return <ApprovalHistory key={k} />;
    case "payslips/payslips/generate": return <PayslipGenerate key={k} />;
    case "payslips/payslips/preview": return <PayslipPreview key={k} />;
    case "payslips/payslips/download": return <PayslipDownload key={k} />;
    case "payslips/bank-and-statutory-files/bank-transfer-file": return <BankFile key={k} />;
    case "payslips/bank-and-statutory-files/pf-ecr": return <PfEcr key={k} />;
    case "payslips/bank-and-statutory-files/esi": return <EsiFile key={k} />;
    case "payslips/bank-and-statutory-files/pt-and-tds": return <PtTds key={k} />;
    case "payroll/payroll-processing/generate-payroll": return <GeneratePayroll key={k} />;
    case "payroll/payroll-processing/monthly-payroll": return <MonthlyPayroll key={k} />;
    case "records/verification/qualifications": return <Verification key={k} kind="qualification" />;
    case "records/verification/documents": return <Verification key={k} kind="document" />;
    case "records/staff-claims/claims": return <ClaimRegister key={k} />;
  }
  return school ? renderSchoolPage(school[0], school[1], page) : null;
}

const ANALYTICS: Record<"hr-analytics" | "compliance-calendar" | "scheduled-reports", [string, string]> = {
  "hr-analytics": ["HR Analytics", "Headcount, attrition, payroll cost and leave, month by month. Figures update as HR records change."],
  "compliance-calendar": ["Compliance Calendar", "Every statutory payment and return HR is responsible for, with its due date and filing proof."],
  "scheduled-reports": ["Scheduled Reports", "Reports planned on a schedule, who gets them and in which format."],
};
/** The School Admin's analytics, compliance and scheduled report screens, under this portal's page title. */
function AnalyticsHead({ tab }: { tab: keyof typeof ANALYTICS }) {
  return <><Head title={ANALYTICS[tab][0]} subtitle={ANALYTICS[tab][1]} /><AnalyticsPages tab={tab} /></>;
}
