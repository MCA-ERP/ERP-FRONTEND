/** The Parent portal menu: each module is a sidebar item, its sections are the links under it and the pages inside a
 *  section are its tabs. `needs` lists the plan modules (any one) a section needs; the backend checks the same. */
export interface MenuPage { key: string; title: string; needs?: string[] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; needs?: string[] }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }

const TALK = ["notifications", "school_diary", "chat", "sms_whatsapp", "whatsapp", "email"];

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "my-dashboard", label: "My Dashboard", pages: [
      { key: "student-overview", title: "Student Overview" }, { key: "attendance-summary", title: "Attendance Summary", needs: ["attendance"] }, { key: "academic-performance", title: "Academic Performance", needs: ["exams"] },
      { key: "fee-status", title: "Fee Status", needs: ["fees"] }, { key: "school-announcements", title: "School Announcements" }, { key: "upcoming-events", title: "Upcoming Events" }, { key: "notifications", title: "Notifications" },
    ] },
    { key: "house-points", label: "House Points", needs: ["house_points", "activities_events"], pages: [{ key: "standings", title: "Standings" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  profile: { label: "Parent Profile", group: "Overview", sections: [
    { key: "parent-information", label: "Parent Information", pages: [{ key: "parent-master", title: "Parent Master" }, { key: "linked-students", title: "Linked Students" }] },
    { key: "privacy-consent", label: "Privacy and Consent", pages: [{ key: "my-consents", title: "My Consents" }] },
  ] },
  academics: { label: "Academics", group: "Learning", sections: [
    { key: "academic-records", label: "Academic Records", needs: ["exams"], pages: [
      { key: "report-cards", title: "View Report Cards" }, { key: "marks", title: "Subject-wise Marks" }, { key: "coscholastic", title: "Co-Scholastic Grades" }, { key: "exam-schedule", title: "Exam Schedule" },
      { key: "progress", title: "Progress Reports" }, { key: "holistic", title: "Holistic Progress Card" }, { key: "exam-seat", title: "Exam Seat" },
    ] },
    { key: "syllabus-progress", label: "Syllabus Progress", needs: ["academics"], pages: [{ key: "syllabus", title: "Syllabus Progress" }] },
    { key: "class-timetable", label: "Class Timetable", needs: ["timetable"], pages: [{ key: "timetable", title: "Class Timetable" }] },
    { key: "competitive-prep", label: "Competitive Prep", needs: ["competitive_prep"], pages: [{ key: "competitive", title: "Competitive Prep" }] },
  ] },
  attendance: { label: "Attendance", group: "Learning", sections: [
    { key: "attendance-record", label: "Attendance Record", needs: ["attendance"], pages: [{ key: "monthly", title: "Monthly Summary" }, { key: "daily", title: "Daily Record" }, { key: "leave", title: "Leave Applications" }] },
  ] },
  fees: { label: "Fees", group: "School & me", sections: [
    { key: "fee-status", label: "Fee Payment", needs: ["fees"], pages: [{ key: "pay", title: "Pay Fees" }, { key: "receipts", title: "Receipts" }, { key: "concessions", title: "Concessions" }] },
  ] },
  requests: { label: "Requests", group: "School & me", sections: [
    { key: "my-requests", label: "My Requests", pages: [{ key: "new", title: "New Request" }, { key: "list", title: "Request Status" }] },
  ] },
  communication: { label: "Communication", group: "School & me", sections: [
    { key: "messages", label: "Messages", needs: TALK, pages: [{ key: "inbox", title: "Messages" }, { key: "write", title: "Message a Teacher" }] },
    { key: "meetings", label: "Parent–Teacher Meeting", needs: TALK, pages: [{ key: "ptm", title: "Book a Meeting" }] },
    { key: "notices", label: "Notices & Diary", needs: TALK, pages: [{ key: "announcements", title: "Circulars & Notices" }, { key: "class-diary", title: "Class Diary" }] },
  ] },
  events: { label: "Events & Gallery", group: "School & me", sections: [
    { key: "events-gallery", label: "Events & Gallery", needs: ["activities_events", "photo_gallery"], pages: [{ key: "events", title: "School Events" }, { key: "gallery", title: "Photo Gallery", needs: ["photo_gallery"] }] },
  ] },
  homework: { label: "Homework & Assignments", group: "School & me", sections: [
    { key: "homework", label: "Homework", needs: ["homework"], pages: [{ key: "homework", title: "Homework" }, { key: "assignments", title: "Assignments" }] },
  ] },
  online: { label: "Online Learning", group: "School & me", sections: [
    { key: "online-learning", label: "Online Learning", needs: ["online_classes", "homework"], pages: [{ key: "classes", title: "Online Classes" }, { key: "materials", title: "Study Materials" }, { key: "tests", title: "Online Tests" }] },
  ] },
  transport: { label: "Transport", group: "Care & services", sections: [
    { key: "school-bus", label: "School Bus", needs: ["transport"], pages: [{ key: "bus", title: "School Bus" }, { key: "boarding", title: "Boarding History" }] },
  ] },
  health: { label: "Health", group: "Care & services", sections: [
    { key: "health-record", label: "Health Record", needs: ["health_welfare"], pages: [{ key: "record", title: "Health Record" }, { key: "checkups", title: "Check-ups" }] },
  ] },
  library: { label: "Library", group: "Care & services", sections: [
    { key: "library", label: "Library Books", needs: ["library"], pages: [{ key: "books", title: "Library Books" }, { key: "fines", title: "Reservations & Fines" }] },
  ] },
  mess: { label: "Mess", group: "Care & services", sections: [
    { key: "mess", label: "Mess", needs: ["cafeteria", "hostel"], pages: [{ key: "plan", title: "Meal Plan" }, { key: "menu", title: "Weekly Menu" }] },
  ] },
};

export const sectionHref = (module: string, section: string, tab?: string) => `/parent/${module}/${section}${tab ? `?tab=${tab}` : ""}`;

/** The menu a school's plan allows: sections and tabs the plan does not include are left out. */
export function allowedMenu(has: (code: string) => boolean): [string, MenuModule][] {
  const ok = (needs?: string[]) => !needs || needs.some(has);
  return Object.entries(MENU).map(([k, m]) => [k, { ...m, sections: m.sections.filter((s) => ok(s.needs)).map((s) => ({ ...s, pages: s.pages.filter((p) => ok(p.needs)) })).filter((s) => s.pages.length) }] as [string, MenuModule]).filter(([, m]) => m.sections.length);
}
