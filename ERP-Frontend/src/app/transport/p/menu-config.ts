import { MENU as SCHOOL_MENU } from "../../school/s/menu-config";

/**
 * The Transport portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a
 * section are its tabs. The vehicles, crew, routes, stops, allocation, trip and fee screens work on the same records as
 * the School Admin's Transport module; the help desk, calendar, leave, payslip and claim screens are the ones every
 * staff portal shares.
 */
export interface MenuPage { key: string; title: string; /** the screen draws its own title */ own?: boolean; /** title and subtitle drawn above a shared screen */ text?: [string, string] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; school?: [string, string]; /** reached from links and search, not listed in the sidebar */ hidden?: boolean }
export interface MenuModule { label: string; group: string; sections: MenuSection[]; /** its place in the 8-step transport flow */ step?: number }

/** A whole section of a School Admin module, with its own tabs. */
const from = (module: string, section: string, label?: string): MenuSection => {
  const s = SCHOOL_MENU[module]?.sections.find((x) => x.key === section);
  if (!s) throw new Error(`${module} has no section ${section}`);
  return { key: section, label: label ?? s.label, school: [module, section], pages: s.pages.map((p) => ({ key: p.key, title: p.title })) };
};
/** A section of this portal's pages: each draws its own title. */
const mine = (key: string, label: string, tabs: [string, string][]): MenuSection => ({ key, label, pages: tabs.map(([k, title]) => ({ key: k, title, own: true })) });
const many = (key: string, label: string, group: string, sections: MenuSection[], step?: number): [string, MenuModule] => [key, { label, group, sections, step }];
const one = (key: string, label: string, group: string, section: MenuSection, step?: number) => many(key, label, group, [section], step);

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    mine("transport-dashboard", "Transport Dashboard", [["overview", "Overview"], ["notifications", "Notifications"], ["settings", "Settings"], ["sent-messages", "Sent Messages"], ["staff-exit-clearance", "Staff Exit Clearance"]]),
    { key: "my-claims", label: "My Claims", pages: [{ key: "submit-a-claim", title: "Submit a Claim" }, { key: "my-claims", title: "My Claims" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  mywork: { label: "My Work", group: "Overview", sections: [from("mywork", "my-leave", "My Leave"), { key: "my-payslips", label: "My Payslips", pages: [{ key: "payslips", title: "Payslips" }] }] },
  ...Object.fromEntries([
    one("vehicles", "Vehicles", "Fleet & Crew", mine("vehicles", "Vehicles", [["fleet", "Fleet"], ["add-vehicle", "Add Vehicle"], ["documents", "Documents"]]), 1),
    one("crew", "Drivers & Attendants", "Fleet & Crew", mine("drivers-and-attendants", "Drivers & Attendants", [["drivers", "Drivers"], ["attendants", "Attendants"], ["register", "Register"]]), 2),
    many("routes", "Routes & Stops", "Routes", [
      mine("routes-and-stops", "Routes & Stops", [["routes", "Routes"], ["stops", "Stops"], ["add-route", "Add Route"]]),
      mine("route-planner", "Route Planner", [["plan-routes", "Plan Routes"]]),
    ], 3),
    one("timings", "Route Timings", "Routes", mine("route-timings", "Route Timings", [["timetable", "Timetable"], ["stop-timings", "Stop Timings"]]), 4),
    one("allocation", "Student Allocation", "Routes", mine("student-allocation", "Student Allocation", [["assign-students", "Assign Students"], ["requests", "Requests"], ["parent-app-requests", "Parent App Requests"]]), 5),
    one("assignment", "Vehicle & Driver Assignment", "Routes", mine("vehicle-driver-assignment", "Vehicle & Driver Assignment", [["assignments", "Assignments"], ["spare", "Spare Vehicles & Staff"]]), 6),
    many("tracking", "Trip Tracking", "Daily Operations", [
      mine("trip-tracking", "Trip Tracking", [["live-trips", "Live Trips"], ["vehicle-status", "Vehicle Status"], ["trip-log", "Trip Log"]]),
      mine("driver-app", "Driver App", [["todays-trip", "Today’s Trip"]]),
      { key: "bus-attendance", label: "Bus Attendance", pages: [
        { key: "trip-roster", title: "Trip Roster", text: ["Trip Roster", "Today’s roster for a route. Mark each student; parents of missing students are told."] },
        { key: "missed-boardings", title: "Missed Boardings", own: true },
      ] },
    ], 7),
    one("parents", "Parent Updates", "Daily Operations", mine("parent-updates", "Parent Updates", [["send-update", "Send Update"], ["sent-updates", "Sent Updates"], ["what-parents-see", "What Parents See"]]), 8),
    one("fees", "Transport Fees", "Fees", mine("transport-fees", "Transport Fees", [["route-wise", "Route-wise Fees"], ["student-fees", "Student Fees"]])),
  ]),
};

/** What a sidebar item, section or page needs in the school's plan (any one). Keys: module, module/section or module/section/page. */
export const NEEDS: Record<string, string[]> = {
  ...Object.fromEntries(["dashboard/transport-dashboard", "vehicles", "crew", "routes", "timings", "allocation", "assignment", "tracking", "parents", "fees"].map((k) => [k, ["transport"]])),
  "dashboard/my-claims": ["employee_self_service"], "mywork/my-payslips": ["employee_self_service"], "dashboard/transport-dashboard/staff-exit-clearance": ["hr_payroll"],
};
/** Whether the school's plan has what this key and everything above it needs. */
export const inPlan = (key: string, has: (m: string) => boolean) => key.split("/").every((_, i, parts) => { const need = NEEDS[parts.slice(0, i + 1).join("/")]; return !need || need.some(has); });

export const sectionHref = (module: string, section: string) => `/transport/${module}/${section}`;
/** A module's first page, or one of its tabs (in whichever section has it). */
const to = (module: string, tab?: string) => `${sectionHref(module, (MENU[module].sections.find((s) => s.pages.some((p) => p.key === tab)) ?? MENU[module].sections[0]).key)}${tab ? `?tab=${tab}` : ""}`;

/** The 8 steps of running school transport, and the page each one is done on. */
export const STEPS: { label: string; module: string; href: string }[] = [
  ["Vehicles & documents", "vehicles"], ["Drivers & attendants", "crew"], ["Routes & stops", "routes"], ["Route timings", "timings"],
  ["Students to stops", "allocation"], ["Vehicles & drivers", "assignment"], ["Track trips", "tracking"], ["Share with parents", "parents"],
].map(([label, module]) => ({ label, module, href: to(module) }));
export const goTo = to;
