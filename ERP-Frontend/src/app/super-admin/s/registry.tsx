"use client";

import type { ReactNode } from "react";
import PlatformOverviewPage from "@/app/super-admin/dashboard/overview/view";
import RevenueStats from "@/app/super-admin/dashboard/revenue/view";
import SchoolStats from "@/app/super-admin/dashboard/schools/view";
import SubscriptionStats from "@/app/super-admin/dashboard/subscriptions/view";
import UserStats from "@/app/super-admin/dashboard/users/view";
import CommunicationView from "@/app/super-admin/communication/view";
import IntegrationsView from "@/app/super-admin/integrations/view";
import ModulesView from "@/app/super-admin/modules/view";
import PaymentsView from "@/app/super-admin/payments/view";
import ReportsView from "@/app/super-admin/reports/view";
import RolesView from "@/app/super-admin/roles/view";
import { RoleCatalogue, type RoleTab } from "@/app/super-admin/roles/catalogue-pages";
import { PermissionPages, RoleCreation, type CreationTab, type PermTab } from "@/app/super-admin/roles/role-pages";
import { ApprovalChain, type ApprovalTab } from "@/app/super-admin/roles/approval-pages";
import { DataPermissions, MenuPermissions, PermissionAudit, RoleAssignment, type AssignTab, type AuditTab, type DataTab, type MenuTab } from "@/app/super-admin/roles/more-pages";
import { TransactionPages, type TxTab } from "@/app/super-admin/payments/tx-pages";
import { GatewayPages, InvoicePages, RefundPages, RevenuePages, TaxPages, type GatewayTab, type InvoiceTab, type RefundTab, type RevenueTab, type TaxTab } from "@/app/super-admin/payments/pay-pages";
import { ApiManagement, BiometricIntegration, EmailIntegration, MapsIntegration, PaymentIntegration, SmsIntegration, WhatsappIntegration, type ApiTab, type EmailTab, type PayTab } from "@/app/super-admin/integrations/int-pages";
import { IncidentPages, SecuritySettingsPages, type IncidentTab, type SettingsTab } from "@/app/super-admin/security/sec-settings";
import { ConfigPages, DateTimePages, EmailConfiguration, FilePages, GeneralPages, LanguagePages, RegionalPages, type SysConfigTab, type DateTimeTab, type FilesTab, type GeneralTab, type LanguageTab, type RegionalTab } from "@/app/super-admin/settings/sys-pages";
import { AccessControlPages, BackupPages, RetentionPages, type AccessTab, type BackupTab, type RetentionTab } from "@/app/super-admin/security/sec-pages2";
import { AuditLogs, LoginSecurity, type AuditTab as SecAuditTab, type LoginTab as SecLoginTab } from "@/app/super-admin/security/sec-pages";
import { BannerPages, BlogPages, ContentPages, FaqPages, SeoPages, TestimonialPages, type BannerTab, type BlogTab, type ContentTab, type FaqTab, type SeoTab as CmsSeoTab, type TestiTab } from "@/app/super-admin/website/cms-pages";
import { WebsitePageEditor, type PageTab } from "@/app/super-admin/website/page-editor";
import { TicketPages, type TicketTab } from "@/app/super-admin/support/ticket-pages";
import { AssignmentPages, CategoryPages, EscalationPages, FeedbackPages, KnowledgePages, type AssignTab as SupAssignTab, type CatTab, type EscTab, type FeedbackTab, type KbTab } from "@/app/super-admin/support/more-pages";
import { ChannelPages, HistoryPages, NotificationPages, type ChanTab, type HistTab, type NotifTab } from "@/app/super-admin/communication/channel-pages";
import { AnnouncementPages, type AnnTab } from "@/app/super-admin/communication/ann-pages";
import { FinancialOutstanding, ModuleReports, SecurityReports, SubscriptionReports, SystemReports, type ModReportTab, type SecReportTab, type SubReportTab, type SysReportTab } from "@/app/super-admin/reports/pages2";
import { FinancialCollection, FinancialRevenue, SchoolReports, UserReports, type SchoolReportTab, type UserReportTab } from "@/app/super-admin/reports/pages";
import SchoolApplications from "@/app/super-admin/schools/applications/page";
import SchoolApproval from "@/app/super-admin/schools/approval/page";
import { AddSchool } from "@/app/super-admin/schools/add-school";
import { SchoolAdmin, type AdminTab } from "@/app/super-admin/schools/pages/admin";
import { SchoolCampus, type CampusTab } from "@/app/super-admin/schools/pages/campus";
import { SchoolConfiguration, type ConfigTab } from "@/app/super-admin/schools/pages/config";
import { SchoolDirectory, type DirectoryTab } from "@/app/super-admin/schools/pages/directory";
import { SchoolProfile, type ProfileTab } from "@/app/super-admin/schools/pages/profile";
import { SchoolStatus, type StatusTab } from "@/app/super-admin/schools/pages/status";
import SecurityView from "@/app/super-admin/security/view";
import SettingsView from "@/app/super-admin/settings/view";
import { SchoolDocuments, type DocTab } from "@/app/super-admin/schools/pages/documents";
import { SchoolHistory, type HistoryTab } from "@/app/super-admin/schools/pages/history";
import { PlanFeatures, type FeatureTab } from "@/app/super-admin/subscriptions/pages/features";
import { SubscriptionList, type ListTab } from "@/app/super-admin/subscriptions/pages/list";
import { PlanManagement, type PlanTab } from "@/app/super-admin/subscriptions/pages/plans";
import { RenewalManagement, type RenewalTab } from "@/app/super-admin/subscriptions/pages/renewal";
import { SchoolSubscriptionPage, type SchoolSubTab } from "@/app/super-admin/subscriptions/pages/school";
import { PlanChanges, type ChangeTab } from "@/app/super-admin/subscriptions/pages/changes";
import { BillingSettings, type BillingTab } from "@/app/super-admin/subscriptions/pages/billing";
import { TrialManagement, type TrialTab } from "@/app/super-admin/subscriptions/pages/trial";
import { Coupons, Offers, Special } from "@/app/super-admin/subscriptions/discounts";
import { ModuleBody, ModuleCatalogueNew, type CatalogueTab } from "@/app/super-admin/modules/pages";
import { ModuleConfiguration, type ConfigTab as ModConfigTab } from "@/app/super-admin/modules/config-pages";
import { ModuleAllocation, ModulePricing, ModuleVersions, type AllocTab, type PricingTab } from "@/app/super-admin/modules/alloc-pages";
import { Updates as ModuleReleases } from "@/app/super-admin/modules/pricing-updates";
import SubscriptionsView from "@/app/super-admin/subscriptions/view";
import SupportView from "@/app/super-admin/support/view";
import { USERS_SECTIONS } from "@/app/super-admin/users/sections";
import { Events } from "@/app/super-admin/users/activity";
import WebsiteView from "@/app/super-admin/website/view";
import { RecentLogins, RecentRegistrations, SystemActivity } from "./activity";
import { AlertsPanel } from "./alerts";
import { KpiSummary } from "./kpi";
import { WithSchool } from "./school-picker";

/**
 * What each submenu shows. Pages inside a submenu are tabs only where each one shows different content (see PAGED);
 * otherwise the submenu opens the matching working screen and lists the pages it covers.
 */
export const PAGED = new Set([
  "dashboard/overview", "dashboard/schools", "dashboard/users", "dashboard/subs", "dashboard/revenue", "dashboard/activity", "dashboard/alerts",
  "schools/registration", "schools/directory", "schools/status", "schools/profile", "schools/configuration", "schools/campus", "schools/admin",
  "schools/documents", "schools/history", "subscriptions/plans", "subscriptions/features", "subscriptions/list", "subscriptions/school", "subscriptions/renewal",
  "subscriptions/change", "subscriptions/trial", "subscriptions/discounts", "subscriptions/billing", "modules/catalogue", "modules/academic", "modules/administrative", "modules/communication", "modules/advanced",
  "modules/configuration", "modules/allocation", "modules/pricing", "modules/updates", "roles/catalogue", "roles/creation", "roles/permissions", "roles/approvals", "roles/menu", "roles/data", "roles/assignment", "roles/audit", "payments/transactions", "payments/school", "payments/invoices", "payments/refunds", "payments/gateway", "payments/tax", "payments/revenue", "support/tickets", "support/categories", "support/assignment", "support/kb", "support/feedback", "support/escalations", "reports/schools", "reports/users", "reports/financial", "reports/subscriptions", "reports/modules", "reports/security", "reports/system", "communication/announcements", "communication/email", "communication/sms", "communication/whatsapp", "communication/notifications", "communication/history", "cms/pages", "cms/content", "cms/banners", "cms/blog", "cms/testimonials", "cms/faq", "cms/seo", "integrations/payment", "integrations/sms", "integrations/whatsapp", "integrations/email", "integrations/maps", "integrations/biometric", "integrations/api", "security/login", "security/audit", "security/access", "security/backups", "security/retention", "security/settings", "security/incidents", "system-settings/general", "system-settings/regional", "system-settings/language", "system-settings/datetime", "system-settings/files", "system-settings/email", "system-settings/config",
  "users/platform", "users/school", "users/staff", "users/directory", "users/accounts", "users/login",
]);

const SETTINGS_TAB = { version: "versions" } as const;

type Render = (page: string) => ReactNode;
const table: Record<string, Render> = {
  // ── Dashboard ──
  "dashboard/overview": (p) => (p === "kpi" ? <KpiSummary key="k" /> : <PlatformOverviewPage key="o" />),
  "dashboard/schools": (p) => <SchoolStats key={p} tab={p as "total" | "active" | "inactive"} />,
  "dashboard/users": (p) => <UserStats key={p} tab={p as "total" | "admins" | "teachers" | "students" | "parents"} />,
  "dashboard/subs": (p) => <SubscriptionStats key={p} tab={p as "active" | "expired" | "trial" | "renewal"} />,
  "dashboard/revenue": (p) => <RevenueStats key={p} tab={p as "monthly" | "annual" | "outstanding"} />,
  "dashboard/activity": (p) => (p === "logins" ? <RecentLogins key="l" /> : p === "registrations" ? <RecentRegistrations key="r" /> : <SystemActivity key="s" />),
  "dashboard/alerts": (p) => <AlertsPanel category={p} key={p} />,

  // ── School Management ──
  "schools/registration": (p) => (p === "application" ? <SchoolApplications /> : p === "approval" ? <SchoolApproval /> : <AddSchool />),
  "schools/directory": (p) => <SchoolDirectory tab={p as DirectoryTab} key={p} />,
  "schools/profile": (p) => <SchoolProfile tab={p as ProfileTab} key={p} />,
  "schools/configuration": (p) => <SchoolConfiguration tab={p as ConfigTab} key={p} />,
  "schools/campus": (p) => <SchoolCampus tab={p as CampusTab} key={p} />,
  "schools/admin": (p) => <SchoolAdmin tab={p as AdminTab} key={p} />,
  "schools/status": (p) => <SchoolStatus tab={p as StatusTab} key={p} />,
  "schools/documents": (p) => <SchoolDocuments tab={p as DocTab} key={p} />,
  "schools/history": (p) => <SchoolHistory tab={p as HistoryTab} key={p} />,

  // ── Subscription Management ──
  "subscriptions/plans": (p) => <PlanManagement tab={p as PlanTab} key={p} />,
  "subscriptions/features": (p) => <PlanFeatures tab={p as FeatureTab} key={p} />,
  "subscriptions/list": (p) => <SubscriptionList tab={p as ListTab} key={p} />,
  "subscriptions/school": (p) => <SchoolSubscriptionPage tab={p as SchoolSubTab} key={p} />,
  "subscriptions/renewal": (p) => <RenewalManagement tab={p as RenewalTab} key={p} />,
  "subscriptions/change": (p) => <PlanChanges tab={p as ChangeTab} key={p} />,
  "subscriptions/trial": (p) => <TrialManagement tab={p as TrialTab} key={p} />,
  "subscriptions/discounts": (p) => (p === "offers" ? <Offers key={p} /> : p === "special" ? <Special key={p} /> : <Coupons key={p} />),
  "subscriptions/billing": (p) => <BillingSettings tab={p as BillingTab} key={p} />,

  // ── Module Management ──
  "modules/catalogue": (p) => <ModuleCatalogueNew tab={p as CatalogueTab} key={p} />,
  "modules/academic": (p) => <ModuleBody code={p} key={p} />,
  "modules/administrative": (p) => <ModuleBody code={p} key={p} />,
  "modules/communication": (p) => <ModuleBody code={p} key={p} />,
  "modules/advanced": (p) => <ModuleBody code={p} key={p} />,
  "modules/configuration": (p) => <ModuleConfiguration tab={p as ModConfigTab} key={p} />,
  "modules/allocation": (p) => <ModuleAllocation tab={p as AllocTab} key={p} />,
  "modules/pricing": (p) => <ModulePricing tab={p as PricingTab} key={p} />,
  "modules/updates": (p) => (p === "version" ? <ModuleVersions key={p} /> : <ModuleReleases only={p === "notes" ? "notes" : "status"} key={p} />),

  // ── Role & Permissions ──
  "roles/catalogue": (p) => <RoleCatalogue tab={p as RoleTab} key={p} />,
  "roles/creation": (p) => <RoleCreation tab={p as CreationTab} key={p} />,
  "roles/permissions": (p) => <PermissionPages tab={p as PermTab} key={p} />,
  "roles/approvals": (p) => <ApprovalChain tab={p as ApprovalTab} key={p} />,
  "roles/menu": (p) => <MenuPermissions tab={p as MenuTab} key={p} />,
  "roles/data": (p) => <DataPermissions tab={p as DataTab} key={p} />,
  "roles/assignment": (p) => <RoleAssignment tab={p as AssignTab} key={p} />,
  "roles/audit": (p) => <PermissionAudit tab={p as AuditTab} key={p} />,

  // ── Payment Management ──
  "payments/transactions": (p) => <TransactionPages tab={p as TxTab} key={p} />,
  "payments/school": (p) => <TransactionPages tab="all" kind={p === "renewal" ? "renewal" : "subscription"} key={p} />,
  "payments/invoices": (p) => <InvoicePages tab={p as InvoiceTab} key={p} />,
  "payments/refunds": (p) => <RefundPages tab={p as RefundTab} key={p} />,
  "payments/gateway": (p) => <GatewayPages tab={p as GatewayTab} key={p} />,
  "payments/tax": (p) => <TaxPages tab={p as TaxTab} key={p} />,
  "payments/revenue": (p) => <RevenuePages tab={p as RevenueTab} key={p} />,

  // ── Support Management ──
  "support/tickets": (p) => <TicketPages tab={p as TicketTab} key={p} />,
  "support/categories": (p) => <CategoryPages tab={p as CatTab} key={p} />,
  "support/assignment": (p) => <AssignmentPages tab={p as SupAssignTab} key={p} />,
  "support/kb": (p) => <KnowledgePages tab={p as KbTab} key={p} />,
  "support/feedback": (p) => <FeedbackPages tab={p as FeedbackTab} key={p} />,
  "support/escalations": (p) => <EscalationPages tab={p as EscTab} key={p} />,

  // ── Reports & Analytics: one submenu per report group ──
  "reports/subscriptions": (p) => <SubscriptionReports tab={p as SubReportTab} key={p} />,
  "reports/modules": (p) => <ModuleReports tab={p as ModReportTab} key={p} />,
  "reports/security": (p) => <SecurityReports tab={p as SecReportTab} key={p} />,
  "reports/system": (p) => <SystemReports tab={p as SysReportTab} key={p} />,
  "reports/schools": (p) => <SchoolReports tab={p as SchoolReportTab} key={p} />,
  "reports/users": (p) => <UserReports tab={p as UserReportTab} key={p} />,
  "reports/financial": (p) => (p === "revenue" ? <FinancialRevenue key={p} /> : p === "collection" ? <FinancialCollection key={p} /> : p === "outstanding" ? <FinancialOutstanding key={p} /> : <ReportsView embedded initialGroup="financial" key={p} />),

  // ── Communication ──
  "communication/announcements": (p) => <AnnouncementPages tab={p as AnnTab} key={p} />,
  "communication/email": (p) => <ChannelPages channel="email" tab={p as ChanTab} key={p} />,
  "communication/sms": (p) => <ChannelPages channel="sms" tab={p as ChanTab} key={p} />,
  "communication/whatsapp": (p) => <ChannelPages channel="whatsapp" tab={p as ChanTab} key={p} />,
  "communication/notifications": (p) => <NotificationPages tab={p as NotifTab} key={p} />,
  "communication/history": (p) => <HistoryPages tab={p as HistTab} key={p} />,

  // ── Website / CMS ──
  "cms/pages": (p) => <WebsitePageEditor tab={p as PageTab} key={p} />,
  "cms/content": (p) => <ContentPages tab={p as ContentTab} key={p} />,
  "cms/banners": (p) => <BannerPages tab={p as BannerTab} key={p} />,
  "cms/blog": (p) => <BlogPages tab={p as BlogTab} key={p} />,
  "cms/testimonials": (p) => <TestimonialPages tab={p as TestiTab} key={p} />,
  "cms/faq": (p) => <FaqPages tab={p as FaqTab} key={p} />,
  "cms/seo": (p) => <SeoPages tab={p as CmsSeoTab} key={p} />,

  // ── Integration Management ──
  "integrations/payment": (p) => <PaymentIntegration tab={p as PayTab} key={p} />,
  "integrations/sms": () => <SmsIntegration />,
  "integrations/whatsapp": () => <WhatsappIntegration />,
  "integrations/email": (p) => <EmailIntegration tab={p as EmailTab} key={p} />,
  "integrations/maps": (p) => <MapsIntegration tab={p as "api" | "tracking"} key={p} />,
  "integrations/biometric": () => <BiometricIntegration />,
  "integrations/api": (p) => <ApiManagement tab={p as ApiTab} key={p} />,

  // ── Security & Audit ──
  "security/login": (p) => <LoginSecurity tab={p as SecLoginTab} key={p} />,
  "security/audit": (p) => <AuditLogs tab={p as SecAuditTab} key={p} />,
  "security/access": (p) => <AccessControlPages tab={p as AccessTab} key={p} />,
  "security/backups": (p) => <BackupPages tab={p as BackupTab} key={p} />,
  "security/retention": (p) => <RetentionPages tab={p as RetentionTab} key={p} />,
  "security/settings": (p) => <SecuritySettingsPages tab={p as SettingsTab} key={p} />,
  "security/incidents": (p) => <IncidentPages tab={p as IncidentTab} key={p} />,

  // ── System Settings ──
  "system-settings/general": (p) => <GeneralPages tab={p as GeneralTab} key={p} />,
  "system-settings/regional": (p) => <RegionalPages tab={p as RegionalTab} key={p} />,
  "system-settings/language": (p) => <LanguagePages tab={p as LanguageTab} key={p} />,
  "system-settings/datetime": (p) => <DateTimePages tab={p as DateTimeTab} key={p} />,
  "system-settings/files": (p) => <FilePages tab={p as FilesTab} key={p} />,
  "system-settings/email": () => <EmailConfiguration key="e" />,
  "system-settings/config": (p) => <ConfigPages tab={p as SysConfigTab} key={p} />,
  ...Object.fromEntries(Object.entries(SETTINGS_TAB).map(([k, tab]) => [`system-settings/${k}`, () => <SettingsView embedded initialTab={tab} key={k} />])),
};

/** The content of one page of one submenu, or null when the address is not part of the menu. */
export function renderPage(module: string, section: string, page: string): ReactNode {
  if (module === "users") {
    const found = USERS_SECTIONS.find((s) => s.key === section)?.pages.find((p) => p.key === page) ?? USERS_SECTIONS.find((s) => s.key === section)?.pages[0];
    return found ? found.render() : null;
  }
  const render = table[`${module}/${section}`];
  return render ? render(page) : null;
}
