"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { useTeacher } from "../context";

const ALL: { label: string; mark: string; href: string; needs?: string[] }[] = [
  { label: "Check in", mark: "✓", href: "/teacher/dashboard/my-dashboard?tab=check-in" },
  { label: "Mark attendance", mark: "A", href: "/teacher/attendance/daily-attendance", needs: ["attendance"] },
  { label: "My timetable", mark: "T", href: "/teacher/timetable/my-timetable", needs: ["timetable"] },
  { label: "Homework", mark: "H", href: "/teacher/homework/homework-management", needs: ["homework", "online_classes"] },
  { label: "Parent messages", mark: "M", href: "/teacher/communication/parent-messages", needs: ["school_diary", "notifications", "parent_app"] },
  { label: "Apply for leave", mark: "L", href: "/teacher/leave/leave-application", needs: ["employee_self_service"] },
];
export function TeacherQuickActions() {
  const t = useTeacher();
  return <QuickActions portal="teacher" actions={ALL.filter((a) => !a.needs || a.needs.some((m) => t.hasModule(m)))} />;
}
