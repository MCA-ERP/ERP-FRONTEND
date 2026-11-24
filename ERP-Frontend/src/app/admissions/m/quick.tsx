"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { useAdmissions } from "../context";

const ACTIONS = [
  { label: "New enquiry", mark: "+", href: "/admissions/enquiries/admission-enquiry" },
  { label: "Applications", mark: "A", href: "/admissions/applications/applications" },
  { label: "Online applications", mark: "@", href: "/admissions/applications/applications?tab=online-applications", needs: ["online_admissions"] },
  { label: "Verification", mark: "✓", href: "/admissions/verification/verification" },
  { label: "Test and interview", mark: "T", href: "/admissions/test-interview/test-interview" },
  { label: "Merit list", mark: "M", href: "/admissions/approval/merit-list", needs: ["online_admissions"] },
  { label: "Offers", mark: "O", href: "/admissions/approval/offers", needs: ["online_admissions"] },
  { label: "Seat matrix", mark: "S", href: "/admissions/approval/seat-matrix", needs: ["online_admissions"] },
];
export function AdmissionsQuickActions() {
  const a = useAdmissions();
  return <QuickActions portal="admissions" chips actions={ACTIONS.filter((x) => !x.needs || x.needs.some((m) => a.hasModule(m)))} />;
}
