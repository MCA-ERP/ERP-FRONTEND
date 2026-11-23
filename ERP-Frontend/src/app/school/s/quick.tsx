"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { useSchool } from "../context";

const ALL: { label: string; mark: string; href: string; needs?: string[] }[] = [
  { label: "Add student", mark: "+", href: "/school/students/student-registration?tab=add-student", needs: ["student_information"] },
  { label: "Mark attendance", mark: "✓", href: "/school/attendance/student-attendance", needs: ["attendance"] },
  { label: "Collect fee", mark: "₹", href: "/school/fees/fee-collection", needs: ["fees"] },
  { label: "Add employee", mark: "+", href: "/school/hr/employee-registration?tab=add-employee", needs: ["hr_payroll"] },
  { label: "New enquiry", mark: "E", href: "/school/admission/admission-enquiry?tab=new-enquiry", needs: ["admissions", "online_admissions"] },
  { label: "Run payroll", mark: "P", href: "/school/payroll/payroll-processing", needs: ["payroll", "hr_payroll"] },
  { label: "Circulars", mark: "C", href: "/school/communication/circulars", needs: ["sms_whatsapp", "email", "notifications", "whatsapp", "school_diary"] },
  { label: "Exam schedule", mark: "X", href: "/school/examinations/exam-schedule", needs: ["exams"] },
];
/** The School Admin dashboard's quick actions: only the ones this school's plan includes. */
export function SchoolQuickActions() {
  const s = useSchool();
  return <QuickActions portal="school" actions={ALL.filter((a) => !a.needs || a.needs.some((m) => s.hasModule(m)))} />;
}
