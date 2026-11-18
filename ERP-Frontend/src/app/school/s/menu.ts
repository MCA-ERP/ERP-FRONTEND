import data from "./menu.json";

/**
 * The School Admin menu: every module, its submenus (sidebar links) and the pages inside each (tabs).
 * menu.json comes from the portal design. A module appears in the sidebar once its pages are built (BUILT).
 */
export interface MenuPage { key: string; title: string; description?: string }
export interface MenuSection { key: string; label: string; pages: MenuPage[] }
export interface MenuModule { label: string; flow?: string; sections: MenuSection[] }

export const MENU = data as Record<string, MenuModule>;

/** Modules whose pages are built. Others stay out of the sidebar until they are. */
export const BUILT = new Set(["dashboard"]);

/** The address of a submenu. The first Dashboard page is the school's home. */
export const sectionHref = (module: string, section: string) => (module === "dashboard" && section === "main-dashboard" ? "/school" : `/school/${module}/${section}`);

/** Page headings, taken from the design. {today} is replaced with the date. */
export const PAGE_TEXT: Record<string, Record<string, [string, string]>> = {
  "dashboard/main-dashboard": { "school-overview": ["School Overview", "How the school is doing today, {today}."], "kpi-cards": ["KPI Cards", "Headline numbers for this academic year against last year and this year's target."] },
  "dashboard/student-statistics": {
    total: ["Total", "Every student enrolled this year."], active: ["Active", "Students currently attending."],
    inactive: ["Inactive", "Students who are inactive or have withdrawn."], "new-admissions": ["New Admissions", "Students who joined this academic year."],
  },
  "dashboard/staff-statistics": { "total-staff": ["Total Staff", "Everyone on the school's payroll."], teaching: ["Teaching", "Teachers by department and level."], "non-teaching": ["Non-Teaching", "Administration, accounts, transport and support staff."] },
  "dashboard/attendance-overview": { today: ["Today", "Student attendance marked today."], "class-wise": ["Class-wise", "Attendance by class and section today."], monthly: ["Monthly", "Average daily attendance by month."] },
  "dashboard/admission-overview": {
    enquiries: ["Enquiries", "Admission enquiries this year."], applications: ["Applications", "Applications received this year."],
    approved: ["Approved", "Applications approved for admission."], rejected: ["Rejected", "Applications that were not approved."],
  },
};
