import type { ReactNode } from "react";
import { AccountsQuickActions } from "./quick";
import { renderPage as renderSchoolPage } from "../../school/s/registry";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { PayrollApprovalPages, SalaryPaymentPages } from "../../school/s/pay-pages2";
import { Claims, Payslips } from "../../teacher/t/profile-pages";
import { ExitClearance, LeadershipLive, Notifications, Overview, SentMessages } from "./dash-pages";
import { AlertRules, FinalSettlements, Insights, PostApprovals, SalaryBudget } from "./fin-pages";
import { ConcessionRegister, ConcessionRequests, ConcessionTypes, ParentPay } from "./conc-pages";
import { DueList, GenerateInvoices, Invoices } from "./bill-pages";
import { ExpenseSummary, Expenses, StudentLedger, Vendors } from "./books-pages";
import { BalanceSheet, BankRecon, ChartOfAccounts, GeneralLedger, IncomeExpenditure, Journal, TrialBalance } from "./gl-pages";
import { CategoryWise, ClassWise } from "./rep-pages";
import type { MenuPage } from "./menu-config";

type Go = (tab: string) => void;

/** The screen for one page (tab) of one submenu. Pages that come from the School Admin portal are drawn by its own screens. */
export function renderPage(module: string, section: string, page: MenuPage, go: Go, school?: [string, string]): ReactNode {
  const k = `${module}/${section}/${page.key}`;
  switch (k) {
    case "dashboard/finance-dashboard/overview": return <div key={k}><AccountsQuickActions /><Overview /></div>;
    case "dashboard/finance-dashboard/leadership-live": return <LeadershipLive key={k} />;
    case "dashboard/finance-dashboard/notifications": return <Notifications key={k} />;
    case "dashboard/finance-dashboard/sent-messages": return <SentMessages key={k} />;
    case "dashboard/finance-dashboard/staff-exit-clearance": return <ExitClearance key={k} />;
    case "dashboard/ai-insights/insights": return <Insights key={k} />;
    case "dashboard/ai-insights/alert-rules": return <AlertRules key={k} />;
    case "dashboard/my-claims/submit-a-claim": return <Claims key={k} view="submit" go={go} />;
    case "dashboard/my-claims/my-claims": return <Claims key={k} view="list" go={go} />;
    case "dashboard/hiring-budget/post-approvals": return <PostApprovals key={k} />;
    case "dashboard/hiring-budget/salary-budget": return <SalaryBudget key={k} />;
    case "dashboard/hiring-budget/final-settlements": return <FinalSettlements key={k} />;
    // the School Admin screens, on the Accounts portal own /accounts/pay paths
    case "dashboard/payroll-approval/finance-approval": return <PayrollApprovalPages key={k} tab="finance-approval" />;
    case "dashboard/payroll-approval/approval-history": return <PayrollApprovalPages key={k} tab="approval-history" />;
    case "dashboard/payroll-approval/payment-register": return <SalaryPaymentPages key={k} tab="payment-register" />;
    case "dashboard/payroll-approval/payment-status": return <SalaryPaymentPages key={k} tab="payment-status" />;
    case "dashboard/help-desk/raise-a-request": return <RaiseRequest key={k} />;
    case "dashboard/help-desk/my-requests": return <MyRequests key={k} go={go} />;
    case "dashboard/school-calendar/month-view": return <MonthView key={k} />;
    case "dashboard/school-calendar/coming-up": return <ComingUp key={k} />;
    case "concessions/concessions/concession-register": return <ConcessionRegister key={k} />;
    case "concessions/concessions/requests": return <ConcessionRequests key={k} parent={false} />;
    case "concessions/concessions/concession-types": return <ConcessionTypes key={k} />;
    case "concessions/concessions/parent-requests": return <ConcessionRequests key={k} parent />;
    case "parent-payment/parent-payment/outstanding-pay": return <ParentPay key={k} />;
    case "invoices/invoices/invoices": return <Invoices key={k} />;
    case "invoices/invoices/generate-invoices": return <GenerateInvoices key={k} go={go} />;
    case "installment-dues/installment-dues/due-list": return <DueList key={k} />;
    case "receipts-ledger/receipts-ledger/student-ledger": return <StudentLedger key={k} />;
    case "expenses/expenses/expenses": return <Expenses key={k} />;
    case "expenses/expenses/vendors": return <Vendors key={k} />;
    case "expenses/expenses/expense-summary": return <ExpenseSummary key={k} />;
    case "accounting/books-of-account/chart-of-accounts": return <ChartOfAccounts key={k} />;
    case "accounting/books-of-account/journal": return <Journal key={k} />;
    case "accounting/books-of-account/general-ledger": return <GeneralLedger key={k} />;
    case "accounting/financial-statements/trial-balance": return <TrialBalance key={k} />;
    case "accounting/financial-statements/income-expenditure": return <IncomeExpenditure key={k} />;
    case "accounting/financial-statements/balance-sheet": return <BalanceSheet key={k} />;
    case "accounting/bank-reconciliation/bank-reconciliation": return <BankRecon key={k} />;
    case "reports/finance-reports/class-wise": return <ClassWise key={k} />;
    case "reports/finance-reports/category-wise": return <CategoryWise key={k} />;
    case "mywork/my-payslips/payslips": return <Payslips key={k} />;
  }
  const from = page.src ?? (school ? ([school[0], school[1], page.key] as [string, string, string]) : null);
  return from ? renderSchoolPage(from[0], from[1], from[2]) : null;
}
