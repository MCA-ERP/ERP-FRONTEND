import { MENU as SCHOOL_MENU } from "../../school/s/menu-config";

/**
 * The HR portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a section
 * are its tabs. The dashboard, personal record, verification and claims pages are this portal's own; the help desk,
 * calendar, payslips and claims screens are the ones every staff portal shares; everything else is the School Admin's
 * HR and Payroll screens (`school` names the section they come from), so HR and the School Admin work on the same records.
 */
export interface MenuPage { key: string; title: string; /** the screen draws its own title */ own?: boolean; /** title and subtitle drawn above a page that comes from the School Admin portal */ text?: [string, string] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; school?: [string, string]; /** reached from links and search, not listed in the sidebar */ hidden?: boolean }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }

/** A whole section of a School Admin module, with its own tabs. */
const from = (module: string, section: string, label?: string): MenuSection => {
  const s = SCHOOL_MENU[module]?.sections.find((x) => x.key === section);
  if (!s) throw new Error(`${module} has no section ${section}`);
  return { key: section, label: label ?? s.label, school: [module, section], pages: s.pages.map((p) => ({ key: p.key, title: p.title })) };
};

/** A section whose screen draws its own title (it names the chosen employee). */
const ownTitles = (s: MenuSection): MenuSection => ({ ...s, pages: s.pages.map((p) => ({ ...p, own: true })) });
/** A section with this portal's wording on one of its tabs. */
const titled = (s: MenuSection, page: string, text: [string, string]): MenuSection => ({ ...s, pages: s.pages.map((p) => (p.key === page ? { ...p, text } : p)) });

/** A section of this portal's own pages: each draws its own title. */
const mine = (key: string, label: string, tabs: [string, string][]): MenuSection => ({ key, label, pages: tabs.map(([k, title]) => ({ key: k, title, own: true })) });
/** Some tabs of a School Admin section, in this order. */
const only = (s: MenuSection, keys: string[]): MenuSection => ({ ...s, pages: keys.map((k) => { const p = s.pages.find((x) => x.key === k); if (!p) throw new Error(`${s.key} has no tab ${k}`); return p; }) });
/** The tabs this portal draws itself, titles included. */
const ownPages = (s: MenuSection, keys: string[]): MenuSection => ({ ...s, pages: s.pages.map((p) => (keys.includes(p.key) ? { ...p, own: true } : p)) });

/** A section with more tabs of this portal's own after the School Admin ones. */
const plus = (s: MenuSection, tabs: [string, string][]): MenuSection => ({ ...s, pages: [...s.pages.filter((p) => !tabs.some(([k]) => k === p.key)), ...tabs.map(([k, title]) => ({ key: k, title, own: true }))] });
/** Several tabs with this portal's wording. */
const worded = (s: MenuSection, texts: Record<string, string>): MenuSection => Object.entries(texts).reduce((acc, [key, text]) => titled(acc, key, [acc.pages.find((p) => p.key === key)?.title ?? key, text]), s);

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "hr-dashboard", label: "HR Dashboard", pages: [{ key: "overview", title: "Overview" }, { key: "payroll-status", title: "Payroll Status" }, { key: "notifications", title: "Notifications" }, { key: "hr-analytics", title: "HR Analytics" }, { key: "compliance-calendar", title: "Compliance Calendar" }, { key: "scheduled-reports", title: "Scheduled Reports" }, { key: "hiring-pipeline", title: "Hiring Pipeline" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  profile: { label: "My Profile", group: "Overview", sections: [
    { key: "personal-details", label: "Personal Details", pages: [
      { key: "contact", title: "Contact", text: ["Contact", "How the school reaches you. Your official email can't be changed here."] },
      { key: "employment", title: "Employment", text: ["Employment", "Your employment record. Ask HR if anything here is wrong."] },
      { key: "qualification", title: "Qualification", text: ["Qualification", "Your degrees and certificates. HR verifies anything you add."] },
      { key: "documents", title: "Documents", text: ["Documents", "Documents HR keeps on file for you."] },
    ] },
    { key: "my-payslips", label: "My Payslips", pages: [{ key: "payslips", title: "Payslips" }] },
    { key: "my-claims", label: "My Claims", pages: [{ key: "submit-a-claim", title: "Submit a Claim" }, { key: "my-claims", title: "My Claims" }] },
  ] },
  mywork: { label: "My Work", group: "Overview", sections: [from("mywork", "my-leave", "My Leave")] },
  employees: { label: "Employees", group: "People", sections: [from("hr", "employee-directory"), from("hr", "employee-registration"), ownTitles(from("hr", "employee-profile"))] },
  organisation: { label: "Organisation", group: "People", sections: [from("hr", "department", "Departments"), from("hr", "designation", "Designations"), ownPages(titled(from("payroll", "salary-structure", "Salary Structure"), "assign-structure", ["Assign Structure", "Step 2: put an employee in a department, give them a designation and a salary structure. Payroll uses this from the next run."]), ["employee-wise"])] },
  attendance: { label: "Attendance", group: "Time & Leave", sections: [
    mine("staff-attendance", "Staff Attendance", [["daily", "Daily"], ["monthly", "Monthly"], ["department-wise", "Department-wise"]]),
    mine("biometric", "Biometric", [["sync-log", "Sync Log"], ["device-mapping", "Device Mapping"]]),
    mine("geo-fencing", "Geo-Fencing", [["check-in-log", "Check-in Log"], ["geo-fence-settings", "Geo-Fence Settings"]]),
  ] },
  leave: { label: "Leave", group: "Time & Leave", sections: [
    ownPages({ ...only(from("hr", "leave-management", "Leave Management"), ["applications", "approvals", "leave-types", "leave-balance"]) }, ["applications", "approvals", "leave-balance"]),
    titled({ ...only(from("hr", "leave-management", "Leave Policies"), ["policy-rules", "comp-off"]), key: "leave-policies" }, "policy-rules", ["Policy Rules", "The leave rules the portal applies when staff apply and when balances are worked out. Change a rule and it applies from the next application."]),
  ] },
  payroll: { label: "Payroll", group: "Payroll", sections: [ownPages(only(from("payroll", "payroll-processing"), ["generate-payroll", "monthly-payroll"]), ["generate-payroll", "monthly-payroll"]), from("payroll", "salary-configuration"), ownPages(from("payroll", "attendance-calculation"), ["working-days", "paid-leave", "loss-of-pay"]), ownPages(from("payroll", "deductions", "Statutory Deductions"), ["pf", "esi", "professional-tax", "other-applicable-deductions"])] },
  "payroll-approval": { label: "Payroll Approval", group: "Payroll", sections: [ownPages(from("payroll", "payroll-approval", "Verification & Approval"), ["hr-verification", "finance-approval", "approval-history"])] },
  payslips: { label: "Payslips & Payments", group: "Payroll", sections: [ownPages(only(from("payroll", "payslips"), ["generate", "preview", "download"]), ["generate", "preview", "download"]), from("payroll", "salary-payments"), ownPages(from("payroll", "bank-and-statutory-files"), ["bank-transfer-file", "pf-ecr", "esi", "pt-and-tds"])] },
  recruitment: { label: "Recruitment", group: "Records", sections: [
    only(from("hr", "recruitment", "Recruitment"), ["job-openings", "applications", "interviews"]),
    ownPages(from("hr", "vacancies", "Vacancies"), ["request-a-vacancy"]),
    mine("job-posting", "Job Posting", [["postings", "Postings"], ["careers-page", "Careers Page"]]),
    { key: "candidates", label: "Candidates", school: ["hr", "recruitment"], pages: [{ key: "resume-database", title: "Resume Database" }, { key: "screening-rules", title: "Screening Rules", own: true }, { key: "shortlisting", title: "Shortlisting" }] },
    ownPages({ ...only(from("hr", "recruitment", "Verification and Offers"), ["background-checks", "offer-letters", "create-offer"]), key: "verification-and-offers" }, ["background-checks", "offer-letters"]),
    ownPages(from("hr", "onboarding", "Onboarding"), ["new-joiners", "joining-checklist"]),
  ] },
  records: { label: "Staff Records", group: "Records", sections: [
    from("hr", "employee-360"),
    from("hr", "staff-documents"),
    { key: "verification", label: "Verification", hidden: true, pages: [{ key: "qualifications", title: "Qualifications" }, { key: "documents", title: "Documents" }] },
    worded(from("hr", "staff-performance"), {
      "360-feedback": "Feedback on each teacher from five sides. Weights: Self 10%, Peers 20%, HOD 30%, Students 25%, Parents 15%.",
      "competency-matrix": "Each teacher's level in eight teaching competencies against what their role expects, with training suggested for every gap. Levels: 1 beginner to 5 expert.",
      "increment-recommendation": "A recommended increment for each teacher from three scores: KRAs 50%, 360° feedback 30% and competencies 20%. Change any figure before sending it to the Principal.",
      "kpis-and-kras": "Key result areas and how each is measured, by role. Weights add up to 100. Staff score themselves against these, then their reviewer does.",
      "appraisal-cycle": "Where each person is in the appraisal cycle. The final score is 30% self-review and 70% reviewer. The band sets the increment.",
    }),
    only(plus(worded(from("hr", "staff-exit"), {
      "exit-approval": "Items waiting for a decision.",
      clearance: "Every department confirms the leaver owes nothing before the final settlement is paid.",
      "full-and-final": "Final settlement for each leaver: pay to the last day, leave encashment, gratuity, less advances and tax. It goes to Finance once every department has cleared the leaver.",
    }), [["exit-interviews", "Exit Interviews"], ["exit-letters", "Exit Letters"]]), ["resignation", "exit-approval", "relieving", "clearance", "exit-interviews", "full-and-final", "exit-letters"]),
    ownPages(from("hr", "probation"), ["probation-review"]),
    { key: "staff-claims", label: "Staff Claims", hidden: true, pages: [{ key: "claims", title: "Claims" }] },
  ] },
  reports: { label: "Reports", group: "Insights & Settings", sections: [ownPages(titled(from("hr", "hr-reports"), "employee-list", ["Employee List", "Everyone on staff."]), ["attendance", "leave", "recruitment"]), ownPages(from("payroll", "payroll-reports"), ["monthly-payroll", "annual-payroll", "deduction-report"])] },
  settings: { label: "Settings", group: "Insights & Settings", sections: [from("payroll", "payroll-settings")] },
};

const HR = ["hr_payroll"]; const PAY = ["payroll", "hr_payroll"];
/** What a sidebar item, section or page needs in the school's plan (any one). Keys: module, module/section or module/section/page. */
export const NEEDS: Record<string, string[]> = {
  employees: HR, "organisation/department": HR, "organisation/designation": HR, "organisation/salary-structure": PAY, leave: HR, recruitment: HR, records: HR, attendance: ["attendance"],
  payroll: PAY, "payroll-approval": PAY, payslips: PAY, settings: PAY,
  "reports/hr-reports": HR, "reports/payroll-reports": PAY,
  "profile/my-payslips": ["employee_self_service"], "profile/my-claims": ["employee_self_service"], "profile/personal-details/qualification": ["employee_self_service"], "profile/personal-details/documents": ["employee_self_service"], "profile/personal-details/employment": ["employee_self_service"],
  "dashboard/hr-dashboard/payroll-status": PAY, "dashboard/hr-dashboard/hr-analytics": HR, "dashboard/hr-dashboard/compliance-calendar": HR, "dashboard/hr-dashboard/scheduled-reports": HR, "dashboard/hr-dashboard/hiring-pipeline": HR,
};
/** Whether the school's plan has what this key and everything above it needs. */
export const inPlan = (key: string, has: (m: string) => boolean) => key.split("/").every((_, i, parts) => { const need = NEEDS[parts.slice(0, i + 1).join("/")]; return !need || need.some(has); });

export const sectionHref = (module: string, section: string) => `/hr/${module}/${section}`;
