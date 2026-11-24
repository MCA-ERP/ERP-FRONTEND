"use client";

import { QuickActions } from "@/components/admin/quick-actions";

const ACTIONS = [
  { label: "Schools", mark: "S", href: "/super-admin/schools/directory" },
  { label: "School applications", mark: "A", href: "/super-admin/schools/registration?tab=application" },
  { label: "Subscriptions", mark: "$", href: "/super-admin/subscriptions/list" },
  { label: "Support tickets", mark: "?", href: "/super-admin/support/tickets" },
  { label: "Users", mark: "U", href: "/super-admin/users/directory" },
  { label: "Payments", mark: "₹", href: "/super-admin/payments/transactions" },
];
export function SuperAdminQuickActions() { return <QuickActions portal="super-admin" actions={ACTIONS} />; }
