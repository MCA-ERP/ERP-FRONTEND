"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { useHr } from "../context";
import { inPlan } from "./menu-config";

const ACTIONS: { label: string; mark: string; href: string }[] = [
  { label: "Add employee", mark: "+", href: "/hr/employees/employee-registration" },
  { label: "Leave", mark: "L", href: "/hr/leave/leave-management?tab=approvals" },
  { label: "Staff attendance", mark: "✓", href: "/hr/attendance/staff-attendance" },
  { label: "Run payroll", mark: "₹", href: "/hr/payroll/payroll-processing?tab=generate-payroll" },
  { label: "Payslips", mark: "P", href: "/hr/payslips/payslips" },
  { label: "Vacancies", mark: "V", href: "/hr/recruitment/vacancies" },
  { label: "Candidates", mark: "C", href: "/hr/recruitment/candidates" },
  { label: "HR reports", mark: "≡", href: "/hr/reports/hr-reports" },
];
/** Quick actions and Recent pages above every tab of the HR Dashboard. */
export function HrQuickActions() {
  const a = useHr();
  return <QuickActions portal="hr" chips actions={ACTIONS.filter((x) => inPlan(x.href.split("?")[0].replace("/hr/", ""), a.hasModule))} />;
}
