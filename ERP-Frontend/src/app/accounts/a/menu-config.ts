import { MENU as SCHOOL_MENU } from "../../school/s/menu-config";

/**
 * The Accounts (Fee & Finance) portal menu: each module is a sidebar item, its sections are the links under it and the
 * pages inside a section are its tabs. Fee set-up, billing and books are the School Admin's Fee & Finance screens
 * (`school` names the section they come from); the dashboard, insights, hiring budget and My Work pages are this portal's own.
 */
export interface MenuPage { key: string; title: string; /** title and subtitle drawn above a page that comes from the School Admin portal */ text?: [string, string]; /** the School Admin page this tab shows: [module, section, page] */ src?: [string, string, string] }
export interface MenuSection { key: string; label: string; pages: MenuPage[]; school?: [string, string] }
export interface MenuModule { label: string; group: string; sections: MenuSection[]; /** the step of the fee workflow this module is (1 to 7), drawn as a strip under its tabs */ flow?: number }

/** A whole section of the School Admin portal's Fee & Finance module (or only some of its pages). */
const fees = (section: string, label?: string, only?: string[]): MenuSection => {
  const s = SCHOOL_MENU.fees.sections.find((x) => x.key === section);
  if (!s) throw new Error(`Fee & Finance has no section ${section}`);
  return { key: section, label: label ?? s.label, school: ["fees", section], pages: s.pages.filter((p) => !only || only.includes(p.key)).map((p) => ({ key: p.key, title: p.title })) };
};

/** One section whose tabs are chosen one by one from School Admin pages: [key, tab title, source page, optional title and subtitle]. */
const pick = (key: string, label: string, tabs: [string, string, [string, string, string], [string, string]?][]): MenuSection => ({ key, label, pages: tabs.map(([k, title, src, text]) => ({ key: k, title, src, text })) });

export const MENU: Record<string, MenuModule> = {
  dashboard: { label: "Dashboard", group: "Overview", sections: [
    { key: "finance-dashboard", label: "Finance Dashboard", pages: [
      { key: "overview", title: "Overview" }, { key: "leadership-live", title: "Leadership Live" }, { key: "notifications", title: "Notifications" }, { key: "sent-messages", title: "Sent Messages" },
      { key: "reconciliation", title: "Reconciliation", src: ["fees", "reconciliation", "live-status"], text: ["Reconciliation", "Reconciliation as it happens. New payments appear here within seconds, with their receipt."] },
      { key: "staff-exit-clearance", title: "Staff Exit Clearance" },
    ] },
    { key: "ai-insights", label: "AI Insights", pages: [{ key: "insights", title: "Insights" }, { key: "alert-rules", title: "Alert Rules" }] },
    { key: "my-claims", label: "My Claims", pages: [{ key: "submit-a-claim", title: "Submit a Claim" }, { key: "my-claims", title: "My Claims" }] },
    { key: "hiring-budget", label: "Hiring Budget", pages: [{ key: "post-approvals", title: "Post Approvals" }, { key: "salary-budget", title: "Salary Budget" }, { key: "final-settlements", title: "Final Settlements" }] },
    { key: "payroll-approval", label: "Payroll Approval", pages: [{ key: "finance-approval", title: "Finance Approval", src: ["payroll", "payroll-approval", "finance-approval"] }, { key: "approval-history", title: "Approval History", src: ["payroll", "payroll-approval", "approval-history"] }, { key: "payment-register", title: "Payment Register", src: ["payroll", "salary-payments", "payment-register"] }, { key: "payment-status", title: "Payment Status", src: ["payroll", "salary-payments", "payment-status"] }] },
    { key: "help-desk", label: "Help Desk", pages: [{ key: "raise-a-request", title: "Raise a Request" }, { key: "my-requests", title: "My Requests" }] },
    { key: "school-calendar", label: "School Calendar", pages: [{ key: "month-view", title: "Month View" }, { key: "coming-up", title: "Coming Up" }] },
  ] },
  mywork: { label: "My Work", group: "Overview", sections: [
    { key: "my-leave", label: "My Leave", school: ["mywork", "my-leave"], pages: SCHOOL_MENU.mywork.sections.find((s) => s.key === "my-leave")!.pages.map((p) => ({ key: p.key, title: p.title })) },
    { key: "my-payslips", label: "My Payslips", pages: [{ key: "payslips", title: "Payslips" }] },
  ] },
  "fee-categories": { label: "Fee Categories", group: "Fee Set-up", flow: 1, sections: [
    pick("fee-categories", "Fee Categories", [["categories", "Categories", ["fees", "fee-configuration", "fee-categories"]], ["add-category", "Add Category", ["fees", "fee-configuration", "fee-categories"], ["Add Category", "Add a new fee category, for example a field trip or uniform fee."]]]),
  ] },
  "fee-structures": { label: "Fee Structures", group: "Fee Set-up", flow: 2, sections: [
    pick("fee-structures", "Fee Structures", [["class-wise", "Class-wise", ["fees", "fee-structure", "class-wise"]], ["instalment-plan", "Instalment Plan", ["fees", "fee-installments", "installment-setup"], ["Instalment Plan", "Three instalments a year. Late fee starts after the grace period."]]]),
  ] },
  "fee-assignment": { label: "Fee Assignment", group: "Fee Set-up", flow: 3, sections: [
    pick("fee-assignment", "Fee Assignment", [["assign-to-students", "Assign to Students", ["fees", "student-fee-assignment", "individual"], ["Assign to Students", "Assign the class fee structure to each student, with transport, mess and any concession. Then generate their instalment dues."]], ["fee-changes", "Fee Changes", ["fees", "student-fee-assignment", "fee-changes"]], ["new-admissions", "New Admissions", ["fees", "student-fee-assignment", "new-admissions"]]]),
  ] },
  concessions: { label: "Concessions", group: "Fee Set-up", sections: [
    { key: "concessions", label: "Concessions", pages: [{ key: "concession-register", title: "Concession Register" }, { key: "requests", title: "Requests" }, { key: "concession-types", title: "Concession Types" }, { key: "parent-requests", title: "Parent Requests" }] },
  ] },
  invoices: { label: "Invoices", group: "Billing & Collection", sections: [{ key: "invoices", label: "Invoices", pages: [{ key: "invoices", title: "Invoices" }, { key: "generate-invoices", title: "Generate Invoices" }] }] },
  "installment-dues": { label: "Installment Dues", group: "Billing & Collection", flow: 4, sections: [
    { key: "installment-dues", label: "Installment Dues", pages: [{ key: "due-list", title: "Due List" }, { key: "overdue-reminders", title: "Overdue & Reminders", src: ["fees", "pending-fees", "overdue"], text: ["Overdue & Reminders", "Overdue instalments. Reminders go to parents by SMS, WhatsApp and the Parent portal."] }, { key: "generate-dues", title: "Generate Dues", src: ["fees", "student-fee-assignment", "bulk"], text: ["Generate Dues", "Assign this year's fees to a whole class at once."] }] },
    fees("auto-reminders", "Auto Reminders"),
  ] },
  "parent-payment": { label: "Parent Payment", group: "Billing & Collection", flow: 5, sections: [
    { key: "parent-payment", label: "Parent Payment", pages: [{ key: "outstanding-pay", title: "Outstanding & Pay" }] },
  ] },
  "fee-collection": { label: "Fee Collection", group: "Billing & Collection", flow: 99, sections: [
    pick("fee-collection", "Fee Collection", [["counter-collection", "Counter Collection", ["fees", "fee-collection", "collect-fee"], ["Counter Collection", "Take a payment at the fee counter: cash, cheque, card or UPI on the school's machine."]], ["online-payments", "Online Payments", ["fees", "fee-collection", "online-collection"], ["Online Payments", "Payments from the gateway. Successful ones post automatically; pending ones are matched with the bank settlement."]]]),
  ] },
  fines: { label: "Fines", group: "Billing & Collection", sections: [
    pick("fines", "Fines", [["fines-register", "Fines Register", ["fees", "fine-management", "fine-collection"], ["Fines Register", "Every fine: late fees on instalments, cheque bounces, ID cards, damage and library fines. Collect or waive with a reason."]], ["add-fine", "Add Fine", ["fees", "fine-management", "fine-collection"], ["Add Fine", "Add a fine to a student's account. It shows in the Parent portal and can be paid with fees."]], ["fine-rules", "Fine Rules", ["fees", "fine-management", "fine-rules"], ["Fine Rules", "Fine types and amounts. The late fee rule is applied to instalments automatically."]]]),
  ] },
  "receipts-ledger": { label: "Receipts & Ledger", group: "Books & Accounts", flow: 6, sections: [
    { key: "receipts-ledger", label: "Receipts & Ledger", pages: [{ key: "receipts", title: "Receipts", src: ["fees", "fee-receipts", "cancel"], text: ["Receipts", "Every fee receipt. Each one posts to the student's ledger and the cash or bank book automatically."] }, { key: "student-ledger", title: "Student Ledger" }, { key: "day-book", title: "Day Book", src: ["fees", "accounting", "cash-book"], text: ["Day Book", "Fee postings to the cash book and bank book, newest first."] }, { key: "canteen-wallet", title: "Canteen Wallet", src: ["fees", "canteen-wallet", "wallet-summary"] }] },
  ] },
  expenses: { label: "Expenses", group: "Books & Accounts", sections: [
    { key: "expenses", label: "Expenses", pages: [{ key: "expenses", title: "Expenses" }, { key: "add-expense", title: "Add Expense", src: ["fees", "expenses", "add-expense"], text: ["Add Expense", "Record a bill. Up to the category's limit it is approved by the accountant; above that it goes to the Principal."] }, { key: "approvals", title: "Approvals", src: ["fees", "expenses", "approval"], text: ["Approvals", "Bills waiting for approval, and approved bills waiting to be paid."] }, { key: "vendors", title: "Vendors" }, { key: "expense-summary", title: "Expense Summary" }] },
    fees("claims-and-advances", "Claims and Advances"),
  ] },
  accounting: { label: "Accounting", group: "Books & Accounts", sections: [
    { key: "books-of-account", label: "Books of Account", pages: [{ key: "chart-of-accounts", title: "Chart of Accounts" }, { key: "journal", title: "Journal" }, { key: "general-ledger", title: "General Ledger" }] },
    { key: "financial-statements", label: "Financial Statements", pages: [{ key: "trial-balance", title: "Trial Balance" }, { key: "income-expenditure", title: "Income & Expenditure" }, { key: "balance-sheet", title: "Balance Sheet" }] },
    { key: "bank-reconciliation", label: "Bank Reconciliation", pages: [{ key: "bank-reconciliation", title: "Bank Reconciliation" }] },
    fees("tally-export", "Tally Export"),
    { key: "live-reconciliation", label: "Live Reconciliation", pages: [{ key: "live-status", title: "Live Status", src: ["fees", "reconciliation", "live-status"] }, { key: "gateway-settlements", title: "Gateway Settlements", src: ["fees", "reconciliation", "gateway-settlements"] }, { key: "payment-matching", title: "Payment Matching", src: ["fees", "reconciliation", "payment-matching"] }, { key: "exceptions", title: "Exceptions", src: ["fees", "reconciliation", "exceptions"] }] },
    { key: "bank-statements", label: "Bank Statements", pages: [{ key: "upload-auto-match", title: "Upload and Auto-match", src: ["fees", "reconciliation", "bank-statements"], text: ["Upload and Auto-match", "Upload the bank statement and every line is matched on its own to receipts, gateway payouts, cheques, payments and bank charges."] }, { key: "matching-rules", title: "Matching Rules", src: ["fees", "reconciliation", "matching-rules"] }, { key: "audit-log", title: "Reconciliation Audit Log", src: ["fees", "reconciliation", "audit-log"] }] },
  ] },
  budgets: { label: "Budgets & Forecasts", group: "Books & Accounts", sections: [
    { key: "budget", label: "Budget", pages: [{ key: "budget-by-head", title: "Budget by Head", src: ["fees", "budgets-and-forecasts", "budget-by-head"] }, { key: "budget-vs-actual", title: "Budget vs Actual", src: ["fees", "budgets-and-forecasts", "budget-vs-actual"] }] },
    { key: "forecasts", label: "Forecasts", pages: [{ key: "cash-flow", title: "Cash Flow", src: ["fees", "budgets-and-forecasts", "cash-flow"] }, { key: "fee-income", title: "Fee Income", src: ["fees", "budgets-and-forecasts", "fee-income"] }] },
  ] },
  reports: { label: "Reports", group: "Insights", sections: [{ key: "finance-reports", label: "Finance Reports", pages: [{ key: "class-wise", title: "Class-wise" }, { key: "category-wise", title: "Category-wise" }] }] },
};

/** What a page needs in the school's plan (any one). The whole portal needs Fee & Finance; these pages need more. Keys: module/section or module/section/page. */
export const NEEDS: Record<string, string[]> = {
  "dashboard/my-claims": ["employee_self_service"], "mywork/my-payslips": ["employee_self_service"],
  "dashboard/hiring-budget": ["hr_payroll", "payroll"], "dashboard/payroll-approval": ["hr_payroll", "payroll"], "dashboard/finance-dashboard/staff-exit-clearance": ["hr_payroll", "payroll"],
};

export const sectionHref = (module: string, section: string) => `/accounts/${module}/${section}`;
