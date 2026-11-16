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
  "users/platform", "users/school", "users/staff", "users/directory", "users/accounts", "users/login",
]);

const SETTINGS_TAB = { general: "general", regional: "regional", language: "regional", datetime: "datetime", files: "app", email: "notify", config: "maintenance", version: "versions" } as const;

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
  "subscriptions/change": () => <SubscriptionsView embedded initialTab="changes" />,
  "subscriptions/trial": () => <SubscriptionsView embedded initialTab="trials" />,
  "subscriptions/discounts": () => <SubscriptionsView embedded initialTab="discounts" />,
  "subscriptions/billing": () => <SubscriptionsView embedded initialTab="billing" />,

  // ── Module Management ──
  "modules/catalogue": () => <ModulesView embedded initialTab="catalogue" />,
  "modules/academic": () => <ModulesView embedded initialTab="catalogue" />,
  "modules/administrative": () => <ModulesView embedded initialTab="catalogue" />,
  "modules/communication": () => <ModulesView embedded initialTab="catalogue" />,
  "modules/advanced": () => <ModulesView embedded initialTab="catalogue" />,
  "modules/configuration": () => <ModulesView embedded initialTab="config" />,
  "modules/allocation": () => <ModulesView embedded initialTab="school" />,
  "modules/pricing": () => <ModulesView embedded initialTab="pricing" />,
  "modules/updates": () => <ModulesView embedded initialTab="updates" />,

  // ── Role & Permissions ──
  "roles/catalogue": () => <RolesView embedded initialTab="catalogue" />,
  "roles/creation": () => <RolesView embedded initialTab="catalogue" />,
  "roles/permissions": () => <RolesView embedded initialTab="matrix" />,
  "roles/approvals": () => <RolesView embedded initialTab="approvals" />,
  "roles/menu": () => <RolesView embedded initialTab="access" />,
  "roles/data": () => <RolesView embedded initialTab="data" />,
  "roles/assignment": () => <RolesView embedded initialTab="assignment" />,
  "roles/audit": () => <RolesView embedded initialTab="audit" />,

  // ── Payment Management ──
  "payments/transactions": () => <PaymentsView embedded initialTab="tx" />,
  "payments/school": () => <PaymentsView embedded initialTab="school" />,
  "payments/invoices": () => <PaymentsView embedded initialTab="invoices" />,
  "payments/refunds": () => <PaymentsView embedded initialTab="refunds" />,
  "payments/gateway": () => <PaymentsView embedded initialTab="gateway" />,
  "payments/tax": () => <PaymentsView embedded initialTab="tax" />,
  "payments/revenue": () => <PaymentsView embedded initialTab="revenue" />,

  // ── Support Management ──
  "support/tickets": () => <SupportView embedded initialTab="tickets" />,
  "support/categories": () => <SupportView embedded initialTab="categories" />,
  "support/assignment": () => <SupportView embedded initialTab="assignment" />,
  "support/kb": () => <SupportView embedded initialTab="kb" />,
  "support/feedback": () => <SupportView embedded initialTab="feedback" />,
  "support/escalations": () => <SupportView embedded initialTab="escalations" />,

  // ── Reports & Analytics: one submenu per report group ──
  ...Object.fromEntries(["schools", "users", "financial", "subscriptions", "modules", "security", "system"].map((g) => [`reports/${g}`, () => <ReportsView embedded initialGroup={g} key={g} />])),

  // ── Communication ──
  "communication/announcements": () => <CommunicationView embedded initialTab="announcements" />,
  "communication/email": () => <CommunicationView embedded initialTab="email" />,
  "communication/sms": () => <CommunicationView embedded initialTab="sms" />,
  "communication/whatsapp": () => <CommunicationView embedded initialTab="whatsapp" />,
  "communication/notifications": () => <CommunicationView embedded initialTab="notifications" />,
  "communication/history": () => <CommunicationView embedded initialTab="history" />,

  // ── Website / CMS ──
  "cms/pages": () => <WebsiteView embedded initialTab="pages" />,
  "cms/content": () => <WebsiteView embedded initialTab="pages" />,
  "cms/banners": () => <WebsiteView embedded initialTab="banners" />,
  "cms/blog": () => <WebsiteView embedded initialTab="blog" />,
  "cms/testimonials": () => <WebsiteView embedded initialTab="testimonials" />,
  "cms/faq": () => <WebsiteView embedded initialTab="faq" />,
  "cms/seo": () => <WebsiteView embedded initialTab="seo" />,

  // ── Integration Management ──
  "integrations/payment": () => <IntegrationsView embedded initialTab="payments" />,
  "integrations/sms": () => <IntegrationsView embedded initialTab="messaging" />,
  "integrations/whatsapp": () => <IntegrationsView embedded initialTab="messaging" />,
  "integrations/email": () => <IntegrationsView embedded initialTab="messaging" />,
  "integrations/maps": () => <IntegrationsView embedded initialTab="apps" />,
  "integrations/biometric": () => <IntegrationsView embedded initialTab="apps" />,
  "integrations/api": () => <IntegrationsView embedded initialTab="api" />,

  // ── Security & Audit ──
  "security/login": () => <SecurityView embedded initialTab="login" />,
  "security/audit": () => <SecurityView embedded initialTab="audit" />,
  "security/access": () => <SecurityView embedded initialTab="access" />,
  "security/backups": () => <SecurityView embedded initialTab="backups" />,
  "security/retention": () => <SecurityView embedded initialTab="retention" />,
  "security/settings": () => <SecurityView embedded initialTab="settings" />,
  "security/incidents": () => <SecurityView embedded initialTab="incidents" />,

  // ── System Settings ──
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
