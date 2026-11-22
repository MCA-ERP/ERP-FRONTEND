/**
 * The Teacher portal menu: each module is a sidebar group item, its sections are the links under it, and the pages
 * inside a section are its tabs. Modules without built pages show one placeholder page until they are built.
 */
export interface MenuPage { key: string; title: string }
export interface MenuSection { key: string; label: string; pages: MenuPage[] }
export interface MenuModule { label: string; group: string; sections: MenuSection[] }


export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "my-dashboard", label: "My Dashboard", pages: [{ key: "todays-classes", title: "Today's Classes" }, { key: "pending-tasks", title: "Pending Tasks" }, { key: "notifications", title: "Notifications" }, { key: "check-in", title: "Check In" }, { key: "event-duties", title: "Event Duties" }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  profile: { label: "My Profile", group: "Overview", sections: [
    { key: "personal-details", label: "Personal Details", pages: [{ key: "contact", title: "Contact" }, { key: "qualification", title: "Qualification" }, { key: "documents", title: "Documents" }] },
    { key: "my-payslips", label: "My Payslips", pages: [{ key: "payslips", title: "Payslips" }] },
    { key: "my-360-feedback", label: "My 360° Feedback", pages: [{ key: "peer-feedback", title: "Peer Feedback" }, { key: "my-360-results", title: "My 360° Results" }, { key: "my-competencies", title: "My Competencies" }] },
    { key: "my-claims", label: "My Claims", pages: [{ key: "submit-a-claim", title: "Submit a Claim" }, { key: "my-claims", title: "My Claims" }] },
    { key: "my-appraisal", label: "My Appraisal", pages: [{ key: "self-appraisal", title: "Self-Appraisal" }, { key: "my-kras", title: "My KRAs" }] },
  ] },
  classes: { label: "My Classes", group: "Teaching", sections: [
    { key: "assigned-classes", label: "Assigned Classes", pages: [{ key: "class-list", title: "Class List" }, { key: "section-list", title: "Section List" }] },
    { key: "student-directory", label: "Student Directory", pages: [{ key: "student-list", title: "Student List" }, { key: "student-profile", title: "Student Profile" }, { key: "health-alerts", title: "Health Alerts" }] },
    { key: "house-points", label: "House Points", pages: [{ key: "award-points", title: "Award Points" }] },
  ] },
  attendance: { label: "Attendance", group: "Teaching", sections: [
    { key: "daily-attendance", label: "Daily Attendance", pages: [{ key: "mark-attendance", title: "Mark Attendance" }, { key: "edit-request", title: "Edit Request" }] },
    { key: "attendance-history", label: "Attendance History", pages: [{ key: "daily", title: "Daily" }, { key: "monthly", title: "Monthly" }, { key: "yearly", title: "Yearly" }] },
    { key: "student-leave", label: "Student Leave", pages: [{ key: "requests", title: "Requests" }, { key: "history", title: "History" }] },
  ] },
  timetable: { label: "Timetable", group: "Teaching", sections: [
    { key: "my-timetable", label: "My Timetable", pages: [{ key: "daily", title: "Daily" }, { key: "weekly", title: "Weekly" }] },
    { key: "substitution", label: "Substitution", pages: [{ key: "assigned-substitution", title: "Assigned Substitution" }, { key: "free-periods", title: "Free Periods" }, { key: "todays-covers", title: "Today's Covers" }] },
  ] },
  subjects: { label: "Subjects", group: "Teaching", sections: [
    { key: "my-subjects", label: "My Subjects", pages: [{ key: "subject-list", title: "Subject List" }, { key: "syllabus", title: "Syllabus" }] },
    { key: "lesson-planning", label: "Lesson Planning", pages: [{ key: "lesson-plans", title: "Lesson Plans" }, { key: "chapter-progress", title: "Chapter Progress" }] },
  ] },
  homework: { label: "Homework", group: "Classwork", sections: [
    { key: "homework-management", label: "Homework Management", pages: [{ key: "create", title: "Create" }, { key: "edit", title: "Edit" }, { key: "publish", title: "Publish" }] },
    { key: "submissions", label: "Submissions", pages: [{ key: "pending", title: "Pending" }, { key: "submitted", title: "Submitted" }, { key: "late", title: "Late" }] },
  ] },
  assignments: { label: "Assignments", group: "Classwork", sections: [
    { key: "assignment-creation", label: "Assignment Creation", pages: [{ key: "create", title: "Create" }, { key: "assign", title: "Assign" }, { key: "due-dates", title: "Due Dates" }] },
    { key: "evaluation", label: "Evaluation", pages: [{ key: "marks", title: "Marks" }, { key: "feedback", title: "Feedback" }] },
  ] },
  "study-materials": { label: "Study Materials", group: "Classwork", sections: [
    { key: "upload-materials", label: "Upload Materials", pages: [{ key: "pdf", title: "PDF" }, { key: "documents", title: "Documents" }, { key: "videos", title: "Videos" }] },
    { key: "material-library", label: "Material Library", pages: [{ key: "my-materials", title: "My Materials" }, { key: "shared-materials", title: "Shared Materials" }] },
  ] }, "online-learning": { label: "Online Learning", group: "Classwork", sections: [
    { key: "online-classes", label: "Online Classes", pages: [{ key: "schedule", title: "Schedule" }, { key: "upcoming", title: "Upcoming" }, { key: "recordings", title: "Recordings" }] },
    { key: "online-tests", label: "Online Tests", pages: [{ key: "create-test", title: "Create Test" }, { key: "tests-results", title: "Tests & Results" }] },
  ] },
  examinations: { label: "Examinations", group: "Classwork", sections: [
    { key: "exam-schedule", label: "Exam Schedule", pages: [{ key: "upcoming", title: "Upcoming" }, { key: "completed", title: "Completed" }, { key: "my-invigilation", title: "My Invigilation" }] },
    { key: "marks-entry", label: "Marks Entry", pages: [{ key: "internal", title: "Internal" }, { key: "theory", title: "Theory" }, { key: "practical", title: "Practical" }, { key: "co-scholastic", title: "Co-Scholastic" }] },
    { key: "gradebook", label: "Gradebook", pages: [{ key: "student-wise", title: "Student-wise" }, { key: "class-wise", title: "Class-wise" }] },
    { key: "holistic-progress-card", label: "Holistic Progress Card", pages: [{ key: "enter-card", title: "Enter Card" }] },
    { key: "competitive-prep", label: "Competitive Prep", pages: [{ key: "my-batches", title: "My Batches" }, { key: "mock-test-analysis", title: "Mock Test Analysis" }, { key: "create-mock-test", title: "Create Mock Test" }] },
  ] },
  communication: { label: "Communication", group: "Parents & School", sections: [
    { key: "parent-messages", label: "Parent Messages", pages: [{ key: "inbox", title: "Inbox" }, { key: "sent", title: "Sent" }, { key: "replies", title: "Replies" }] },
    { key: "school-notices", label: "School Notices", pages: [{ key: "circulars", title: "Circulars" }, { key: "announcements", title: "Announcements" }] },
    { key: "parent-teacher-meeting", label: "Parent-Teacher Meeting", pages: [{ key: "my-slots", title: "My Slots" }, { key: "bookings", title: "Bookings" }] },
    { key: "chat", label: "Chat", pages: [{ key: "chats", title: "Chats" }, { key: "shared-files", title: "Shared Files" }] },
    { key: "photo-gallery", label: "Photo Gallery", pages: [{ key: "albums", title: "Albums" }, { key: "upload-photos", title: "Upload Photos" }] },
  ] }, "school-diary": { label: "School Diary", group: "Parents & School", sections: [
    { key: "daily-diary", label: "Daily Diary", pages: [{ key: "class-diary", title: "Class Diary" }, { key: "remarks", title: "Remarks" }] },
  ] },
  leave: { label: "Leave", group: "Leave & Reports", sections: [
    { key: "leave-application", label: "Leave Application", pages: [{ key: "apply", title: "Apply" }, { key: "history", title: "History" }, { key: "status", title: "Status" }, { key: "balance-and-policy", title: "Balance and Policy" }, { key: "comp-off", title: "Comp-off" }, { key: "team-leave-hod", title: "Team Leave (HOD)" }] },
  ] },
  reports: { label: "Reports", group: "Leave & Reports", sections: [
    { key: "class-reports", label: "Class Reports", pages: [{ key: "attendance", title: "Attendance" }, { key: "academic-performance", title: "Academic Performance" }] },
    { key: "student-reports", label: "Student Reports", pages: [{ key: "individual-performance", title: "Individual Performance" }] },
    { key: "my-feedback", label: "My Feedback", pages: [{ key: "student-feedback", title: "Student Feedback" }, { key: "staff-survey", title: "Staff Survey" }] },
  ] },
};

/** What each module needs in the school's plan (any one of the listed codes). Modules not listed are always shown. */
export const MENU_MODULES: Record<string, string[]> = {
  dashboard: ["teacher_app", "employee_self_service"], profile: ["employee_self_service"], classes: ["student_information", "academics"], attendance: ["attendance"], timetable: ["timetable"], subjects: ["academics"], homework: ["homework", "online_classes"], assignments: ["homework", "online_classes"],
  "study-materials": ["online_classes", "homework"], "online-learning": ["online_classes"], examinations: ["exams", "competitive_prep"], communication: ["school_diary", "notifications", "parent_app"], "school-diary": ["school_diary"], leave: ["employee_self_service"], reports: ["attendance", "exams", "student_information"],
};

export const sectionHref = (module: string, section: string) => `/teacher/${module}/${section}`;
