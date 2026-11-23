"use client";

import { QuickActions } from "@/components/admin/quick-actions";

const ACTIONS = [
  { label: "Schools", mark: "S", href: "/super-admin/schools" },
  { label: "School applications", mark: "A", href: "/super-admin/schools/applications" },
  { label: "Subscriptions", mark: "$", href: "/super-admin/subscriptions" },
  { label: "Support tickets", mark: "?", href: "/super-admin/support" },
  { label: "Users", mark: "U", href: "/super-admin/users" },
  { label: "Payments", mark: "₹", href: "/super-admin/payments" },
];
export function SuperAdminQuickActions() { return <QuickActions portal="super-admin" actions={ACTIONS} />; }
