import { MENU as SCHOOL_MENU } from "../../school/s/menu-config";

/**
 * The Admissions portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a
 * section are its tabs. Enquiries, leads, the dashboard and the last onboarding steps are this portal's own; the steps in
 * between are the School Admin Admission module's screens (`school` names the section they come from), so both portals
 * work on the same applications, documents, tests, interviews, approvals and fees.
 */
export interface MenuPage { key: string; title: string; /** title and subtitle drawn above a page that comes from the School Admin portal */ text?: [string, string]; /** the School Admin page this tab shows: [module, section, page] */ src?: [string, string, string] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; school?: [string, string] }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }

/** A whole section of the School Admin Admission module (or only some of its pages). */
const adm = (section: string, label?: string, only?: string[]): MenuSection => {
  const s = SCHOOL_MENU.admission.sections.find((x) => x.key === section);
  if (!s) throw new Error(`Admission has no section ${section}`);
  return { key: section, label: label ?? s.label, school: ["admission", section], pages: s.pages.filter((p) => !only || only.includes(p.key)).map((p) => ({ key: p.key, title: p.title })) };
};
const mywork = SCHOOL_MENU.mywork.sections.find((s) => s.key === "my-leave")!;

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "admissions-dashboard", label: "Admissions Dashboard", pages: [{ key: "overview", title: "Overview" }, { key: "pipeline", title: "Pipeline" }, { key: "notifications", title: "Notifications" }] },
    { key: "my-claims", label: "My Claims", pages: [{ key: "submit-a-claim", title: "Submit a Claim" }, { key: "my-claims", title: "My Claims" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  mywork: { label: "My Work", group: "Overview", sections: [
    { key: "my-leave", label: "My Leave", school: ["mywork", "my-leave"], pages: mywork.pages.map((p) => ({ key: p.key, title: p.title })) },
    { key: "my-payslips", label: "My Payslips", pages: [{ key: "payslips", title: "Payslips" }] },
  ] },
  enquiries: { label: "Enquiries", group: "Pre-admission", sections: [
    { key: "admission-enquiry", label: "Admission Enquiry", pages: [{ key: "new-enquiry", title: "New Enquiry" }, { key: "enquiry-list", title: "Enquiry List" }] },
  ] },
  leads: { label: "Leads & Follow-up", group: "Pre-admission", sections: [
    { key: "lead-management", label: "Lead Management", pages: [{ key: "leads", title: "Leads" }, { key: "followups-due", title: "Follow-ups Due" }, { key: "followup-history", title: "Follow-up History" }] },
  ] },
  applications: { label: "Applications", group: "Pre-admission", sections: [
    { key: "applications", label: "Applications", pages: [
      { key: "applications", title: "Applications", text: ["Applications", "Application forms sent to families, and forms filled at the front office. The application fee must be paid or waived before the form goes for verification."] },
      { key: "online-applications", title: "Online Applications", src: ["admission", "online-application", "online-applications"], text: ["Online Applications", "Applications from the online form (families on the website, or staff for walk-in families in Online Application › New Application). Each action here moves the application's 7-step tracker, which the family also gets by SMS and email."] },
      { key: "by-programme", title: "By Programme", src: ["admission", "online-application", "by-programme"], text: ["By Programme", "Applications by programme, with how many passed the eligibility check, were borderline or were turned away before paying."] },
    ] },
  ] },
  "online-application": { label: "Online Application", group: "Pre-admission", sections: [
    { key: "online-application", label: "Online Application", pages: [
      { key: "eligibility-check", title: "Eligibility Check", src: ["admission", "online-application", "eligibility-check"] },
      { key: "new-application", title: "New Application", src: ["admission", "online-application", "new-application"], text: ["New Application", "Fill the programme-specific application for a walk-in or phone family. The form changes with the programme chosen."] },
      { key: "tracker", title: "Tracker", src: ["admission", "online-application", "tracker"], text: ["Tracker", "Every online application with its 7-step progress, exactly as the family sees it. Move applications on from Applications › Online Applications."] },
    ] },
  ] },
  verification: { label: "Verification", group: "Selection", sections: [
    { key: "verification", label: "Verification", pages: [
      { key: "pending", title: "Pending" }, { key: "returned", title: "Returned" }, { key: "eligibility-rules", title: "Eligibility Rules" }, { key: "board-transfers", title: "Board Transfers" },
      { key: "programme-rules", title: "Programme Rules", src: ["admission", "online-application", "programme-rules"], text: ["Programme Rules", "Eligibility rules for each programme. Families see the same rules when they check eligibility on the school website and in Online Application › Eligibility Check, before they pay the application fee."] },
    ] },
  ] },
  "test-interview": { label: "Test & Interview", group: "Selection", sections: [
    { key: "test-interview", label: "Test & Interview", pages: [{ key: "schedule", title: "Schedule" }, { key: "results-entry", title: "Results Entry" }] },
  ] },
  approval: { label: "Approval", group: "Selection", sections: [
    { key: "admission-approval", label: "Admission Approval", pages: [
      { key: "approval-chain", title: "Approval Chain", src: ["admission", "admission-approval", "approval-chain"] },
      { key: "waitlisted-rejected", title: "Waitlisted & Rejected" },
      { key: "approval-levels", title: "Approval Levels", src: ["admission", "admission-approval", "approval-levels"] },
    ] },
    { key: "merit-list", label: "Merit List", pages: [
      { key: "merit-list", title: "Merit List", src: ["admission", "merit-and-seats", "merit-list"] },
      { key: "ranking-rules", title: "Ranking Rules", src: ["admission", "merit-and-seats", "ranking-rules"] },
    ] },
    { key: "seat-matrix", label: "Seat Matrix", pages: [
      { key: "seat-matrix", title: "Seat Matrix", src: ["admission", "merit-and-seats", "seat-matrix"], text: ["Seat Matrix", "Seats by class and category, with how many are confirmed. RTE / EWS seats apply to the entry classes (Nursery and Class 1)."] },
      { key: "seat-tracking", title: "Seat Tracking", src: ["admission", "merit-and-seats", "seat-tracking"], text: ["Seat Tracking", "Every seat offered, from offer to confirmed admission. Offers that pass their deadline expire on their own and the seat goes to the next family on the waitlist."] },
    ] },
    adm("offers"),
  ] },
  "fee-assignment": { label: "Fee Assignment", group: "Onboarding", sections: [
    { key: "fee-assignment", label: "Fee Assignment", pages: [{ key: "assign-fees", title: "Assign Fees" }, { key: "fee-structure", title: "Fee Structure" }, { key: "fee-plans", title: "Annual Fee Plan" }] },
  ] },
  registration: { label: "Registration", group: "Onboarding", sections: [
    { key: "student-registration", label: "Student Registration", pages: [{ key: "register", title: "Register" }, { key: "auto-registration", title: "Auto Registration", src: ["admission", "student-registration", "auto-registration"] }] },
  ] },
  "class-allocation": { label: "Class Allocation", group: "Onboarding", sections: [
    { key: "class-allocation", label: "Class Allocation", pages: [{ key: "allocate", title: "Allocate" }, { key: "section-strength", title: "Section Strength" }] },
  ] },
  "portal-accounts": { label: "Portal Accounts", group: "Onboarding", sections: [
    { key: "portal-accounts", label: "Portal Accounts", pages: [{ key: "generate-accounts", title: "Generate Accounts" }] },
  ] },
  confirmation: { label: "Confirmation", group: "Onboarding", sections: [
    { key: "confirmation", label: "Confirmation", pages: [{ key: "send-confirmation", title: "Send Confirmation" }, { key: "admitted", title: "Admitted" }] },
  ] },
  reports: { label: "Reports", group: "Insights", sections: [
    { key: "admission-reports", label: "Admission Reports", pages: [{ key: "funnel", title: "Funnel" }, { key: "application-fees", title: "Application Fees" }, { key: "source-wise", title: "Source-wise" }, { key: "counsellors", title: "Counsellors" }] },
  ] },
};

/** What a module, section or page needs in the school's plan (any one). The whole portal needs Admissions; these need more. Keys: module, module/section or module/section/page. */
export const NEEDS: Record<string, string[]> = {
  "dashboard/my-claims": ["employee_self_service"], "mywork/my-payslips": ["employee_self_service"],
  "online-application": ["online_admissions"], "approval/merit-list": ["online_admissions"], "approval/seat-matrix": ["online_admissions"], "approval/offers": ["online_admissions"],
  "applications/applications/online-applications": ["online_admissions"], "applications/applications/by-programme": ["online_admissions"], "verification/verification/programme-rules": ["online_admissions"],
  "fee-assignment/fee-assignment/fee-plans": ["fees"],
};

/** The 11 steps of an admission, each with the page that does the work. */
export const STEP_LINKS: { label: string; href: string }[] = [
  { label: "Enquiry", href: "/admissions/enquiries/admission-enquiry?tab=enquiry-list" },
  { label: "Lead", href: "/admissions/leads/lead-management" },
  { label: "Application", href: "/admissions/applications/applications" },
  { label: "Verification", href: "/admissions/verification/verification" },
  { label: "Test / Interview", href: "/admissions/test-interview/test-interview" },
  { label: "Approval", href: "/admissions/approval/admission-approval" },
  { label: "Fee assignment", href: "/admissions/fee-assignment/fee-assignment" },
  { label: "Registration", href: "/admissions/registration/student-registration" },
  { label: "Class allocation", href: "/admissions/class-allocation/class-allocation" },
  { label: "Portal accounts", href: "/admissions/portal-accounts/portal-accounts" },
  { label: "Confirmation", href: "/admissions/confirmation/confirmation" },
];

export const sectionHref = (module: string, section: string) => `/admissions/${module}/${section}`;
