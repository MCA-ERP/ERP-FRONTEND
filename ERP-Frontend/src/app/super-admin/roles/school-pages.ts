/** The pages of each school role's portal that are known today, from the Super Admin design. Menus without pages yet are listed with no sections. */
export interface SchoolMenu { key: string; label: string; sections: { key: string; label: string; pages: string[] }[] }
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const sec = (label: string, pages: string[]) => ({ key: slug(label), label, pages });
const menu = (label: string, sections: SchoolMenu["sections"] = []): SchoolMenu => ({ key: slug(label), label, sections });

export const SCHOOL_PAGES: Record<string, { portal: string; menus: SchoolMenu[] }> = {
  InstitutionAdmin: {
    portal: "School Admin portal",
    menus: [menu("Dashboard", [
      sec("Main Dashboard", ["School Overview", "KPI Cards"]), sec("Student Statistics", ["Total", "Active", "Inactive", "New Admissions"]),
      sec("Staff Statistics", ["Total Staff", "Teaching", "Non-Teaching"]), sec("Attendance Overview", ["Today", "Class-wise", "Monthly"]),
      sec("Admission Overview", ["Enquiries", "Applications", "Approved", "Rejected"]),
    ])],
  },
  Principal: { portal: "Principal portal", menus: [menu("Dashboard", [sec("Overview", ["School Statistics", "Attendance", "Fees", "Admissions"])])] },
  Faculty: {
    portal: "Teacher portal",
    menus: [
      menu("Dashboard", [sec("My Dashboard", ["Today's Classes", "Pending Tasks", "Notifications"])]),
      ...["My Profile", "My Classes", "Attendance", "Timetable", "Subjects", "Homework", "Assignments", "Study Materials", "Examinations", "Communication", "School Diary", "Leave", "Reports"].map((m) => menu(m)),
    ],
  },
};
