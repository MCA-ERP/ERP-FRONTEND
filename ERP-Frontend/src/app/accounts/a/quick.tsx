"use client";

import { QuickActions } from "@/components/admin/quick-actions";

const ACTIONS = [
  { label: "Collect fee", mark: "₹", href: "/accounts/fee-collection/fee-collection" },
  { label: "Receipts", mark: "R", href: "/accounts/receipts-ledger/receipts-ledger" },
  { label: "Overdue reminders", mark: "!", href: "/accounts/installment-dues/installment-dues?tab=overdue-reminders" },
  { label: "Generate invoices", mark: "I", href: "/accounts/invoices/invoices?tab=generate-invoices" },
  { label: "Add fine", mark: "F", href: "/accounts/fines/fines?tab=add-fine" },
  { label: "Concession requests", mark: "C", href: "/accounts/concessions/concessions?tab=requests" },
  { label: "Expenses", mark: "E", href: "/accounts/expenses/expenses" },
  { label: "Reports", mark: "≡", href: "/accounts/reports/finance-reports" },
];
export function AccountsQuickActions() { return <QuickActions portal="accounts" actions={ACTIONS} />; }
