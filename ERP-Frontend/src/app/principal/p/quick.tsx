"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { usePrincipal } from "../context";

const ACTIONS: { label: string; mark: string; href: string; needs?: string[] }[] = [
  { label: "Approval centre", mark: "!", href: "/principal/approvals/approval-centre?tab=admissions" },
  { label: "Leave approvals", mark: "L", href: "/principal/approvals/approval-centre?tab=leave", needs: ["hr_payroll"] },
  { label: "Admission review", mark: "A", href: "/principal/approvals/approval-centre?tab=admissions", needs: ["admissions", "online_admissions"] },
  { label: "Student attendance", mark: "✓", href: "/principal/dashboard/overview?tab=attendance", needs: ["attendance"] },
  { label: "Exam results", mark: "R", href: "/principal/approvals/approval-centre?tab=results", needs: ["exams"] },
  { label: "Circulars", mark: "✉", href: "/principal/communication/circulars?tab=approve", needs: ["sms_whatsapp", "email", "notifications", "whatsapp", "school_diary", "helpdesk", "surveys", "photo_gallery", "chat", "ai_chatbot"] },
  { label: "Parent concerns", mark: "?", href: "/principal/communication/parent-concerns" },
  { label: "Fee overview", mark: "₹", href: "/principal/dashboard/overview?tab=fees", needs: ["fees"] },
  { label: "Subjects by class", mark: "B", href: "/principal/academics/academic-overview?tab=subjects-by-class", needs: ["academics", "student_information"] },
];
/** Quick actions and Recent pages above every tab of the Dashboard Overview. */
export function PrincipalQuickActions() {
  const a = usePrincipal();
  return <QuickActions portal="principal" chips actions={ACTIONS.filter((x) => !x.needs || x.needs.some((m) => a.hasModule(m)))} />;
}
