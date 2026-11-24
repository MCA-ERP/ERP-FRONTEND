import type { ReactNode } from "react";
import { AdmissionsQuickActions } from "./quick";
import { renderPage as renderSchoolPage } from "../../school/s/registry";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { Claims, Payslips } from "../../teacher/t/profile-pages";
import { Notifications, Overview, Pipeline } from "./dash-pages";
import { EnquiryList, FollowupHistory, Leads, NewEnquiry } from "./lead-pages";
import { Confirmation, FeePlans, PortalAccounts } from "./onboard-pages";
import { AdmissionReports, AssignFees, Admitted, Allocate, FeeStructure, Register, SectionStrength, type ReportTab } from "./onb2-pages";
import { ApplicationsTab, BoardTransfers, EligibilityRules, ResultsEntry, Schedule, VerificationPending, VerificationReturned, WaitlistedRejected } from "./sel-pages";
import type { MenuPage } from "./menu-config";

type Go = (tab: string) => void;
/** The Quick actions card and Recent pages sit above every tab of the Admissions Dashboard. */
const Dash = ({ children }: { children: ReactNode }) => <div><AdmissionsQuickActions />{children}</div>;

/** The screen for one page (tab) of one submenu. Pages that come from the School Admin portal are drawn by its own screens. */
export function renderPage(module: string, section: string, page: MenuPage, go: Go, school?: [string, string]): ReactNode {
  const k = `${module}/${section}/${page.key}`;
  switch (k) {
    case "dashboard/admissions-dashboard/overview": return <Dash key={k}><Overview /></Dash>;
    case "dashboard/admissions-dashboard/pipeline": return <Dash key={k}><Pipeline /></Dash>;
    case "dashboard/admissions-dashboard/notifications": return <Dash key={k}><Notifications /></Dash>;
    case "dashboard/my-claims/submit-a-claim": return <Claims key={k} view="submit" go={go} />;
    case "dashboard/my-claims/my-claims": return <Claims key={k} view="list" go={go} />;
    case "dashboard/help-desk/raise-a-request": return <RaiseRequest key={k} />;
    case "dashboard/help-desk/my-requests": return <MyRequests key={k} go={go} />;
    case "dashboard/school-calendar/month-view": return <MonthView key={k} />;
    case "dashboard/school-calendar/coming-up": return <ComingUp key={k} />;
    case "mywork/my-payslips/payslips": return <Payslips key={k} />;
    case "enquiries/admission-enquiry/new-enquiry": return <NewEnquiry key={k} />;
    case "enquiries/admission-enquiry/enquiry-list": return <EnquiryList key={k} />;
    case "leads/lead-management/leads": return <Leads key={k} due={false} />;
    case "leads/lead-management/followups-due": return <Leads key={k} due />;
    case "leads/lead-management/followup-history": return <FollowupHistory key={k} />;
    case "applications/applications/applications": return <ApplicationsTab key={k} />;
    case "verification/verification/pending": return <VerificationPending key={k} />;
    case "verification/verification/returned": return <VerificationReturned key={k} />;
    case "verification/verification/eligibility-rules": return <EligibilityRules key={k} />;
    case "verification/verification/board-transfers": return <BoardTransfers key={k} />;
    case "test-interview/test-interview/schedule": return <Schedule key={k} />;
    case "test-interview/test-interview/results-entry": return <ResultsEntry key={k} />;
    case "approval/admission-approval/waitlisted-rejected": return <WaitlistedRejected key={k} />;
    case "fee-assignment/fee-assignment/assign-fees": return <AssignFees key={k} />;
    case "fee-assignment/fee-assignment/fee-structure": return <FeeStructure key={k} />;
    case "fee-assignment/fee-assignment/fee-plans": return <FeePlans key={k} />;
    case "registration/student-registration/register": return <Register key={k} />;
    case "class-allocation/class-allocation/allocate": return <Allocate key={k} />;
    case "class-allocation/class-allocation/section-strength": return <SectionStrength key={k} />;
    case "confirmation/confirmation/admitted": return <Admitted key={k} />;
    case "reports/admission-reports/funnel": case "reports/admission-reports/application-fees": case "reports/admission-reports/source-wise": case "reports/admission-reports/counsellors": return <AdmissionReports key={k} tab={page.key as ReportTab} />;
    case "portal-accounts/portal-accounts/generate-accounts": return <PortalAccounts key={k} tab="to-create" />;
    case "confirmation/confirmation/send-confirmation": return <Confirmation key={k} tab="to-confirm" />;
  }
  const from = page.src ?? (school ? ([school[0], school[1], page.key] as [string, string, string]) : null);
  return from ? renderSchoolPage(from[0], from[1], from[2]) : null;
}
