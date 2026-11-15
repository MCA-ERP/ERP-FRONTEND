"use client";

import type { ReactNode } from "react";
import PlatformOverviewPage from "@/app/super-admin/page";
import AuditLogsPage from "@/app/super-admin/audit-logs/page";
import RevenueStats from "@/app/super-admin/dashboard/revenue/page";
import SchoolStats from "@/app/super-admin/dashboard/schools/page";
import SubscriptionStats from "@/app/super-admin/dashboard/subscriptions/page";
import UserStats from "@/app/super-admin/dashboard/users/page";
import CommunicationView from "@/app/super-admin/communication/view";
import IntegrationsView from "@/app/super-admin/integrations/view";
import ModulesView from "@/app/super-admin/modules/view";
import PaymentsView from "@/app/super-admin/payments/view";
import ReportsView from "@/app/super-admin/reports/view";
import RolesView from "@/app/super-admin/roles/view";
import SchoolApplications from "@/app/super-admin/schools/applications/page";
import SchoolApproval from "@/app/super-admin/schools/approval/page";
import SchoolCampuses from "@/app/super-admin/schools/campuses/page";
import { AdminsSection, ConfigSection, DocumentsSection, HistorySection, ProfileSection } from "@/app/super-admin/schools/[id]/sections";
import SchoolsView from "@/app/super-admin/schools/view";
import SecurityView from "@/app/super-admin/security/view";
import SettingsView from "@/app/super-admin/settings/view";
import SubscriptionsView from "@/app/super-admin/subscriptions/view";
import SupportView from "@/app/super-admin/support/view";
import { USERS_SECTIONS } from "@/app/super-admin/users/sections";
import { Events } from "@/app/super-admin/users/activity";
import WebsiteView from "@/app/super-admin/website/view";
import { AlertsPanel } from "./alerts";
import { WithSchool } from "./school-picker";

/**
 * What each submenu shows. Pages inside a submenu are tabs only where each one shows different content (see PAGED);
 * otherwise the submenu opens the matching working screen and lists the pages it covers.
 */
export const PAGED = new Set([
  "dashboard/overview", "dashboard/schools", "dashboard/users", "dashboard/subs", "dashboard/revenue", "dashboard/activity", "dashboard/alerts",
  "schools/registration", "schools/directory", "schools/status",
  "users/platform", "users/school", "users/staff", "users/directory", "users/accounts", "users/login",
]);

const DIRECTORY_TAB: Record<string, "all" | "active" | "inactive" | "suspended" | "pending"> = { all: "all", active: "active", inactive: "inactive", suspended: "suspended" };
const STATUS_TAB: Record<string, "all" | "active" | "inactive" | "suspended" | "pending"> = { activate: "pending", deactivate: "active", suspend: "active", reactivate: "suspended" };
const SETTINGS_TAB = { general: "general", regional: "regional", language: "regional", datetime: "datetime", files: "app", email: "notify", config: "maintenance", version: "versions" } as const;

type Render = (page: string) => ReactNode;
const table: Record<string, Render> = {
  // ── Dashboard ──
  "dashboard/overview": () => <PlatformOverviewPage />,
  "dashboard/schools": () => <SchoolStats />,
  "dashboard/users": () => <UserStats />,
  "dashboard/subs": () => <SubscriptionStats />,
  "dashboard/revenue": () => <RevenueStats />,
  "dashboard/activity": (p) => (p === "logins" ? <Events failed={false} key="l" /> : p === "registrations" ? <SchoolsView embedded initialTab="all" key="r" /> : <AuditLogsPage />),
  "dashboard/alerts": (p) => <AlertsPanel category={p} key={p} />,

  // ── School Management ──
  "schools/registration": (p) => (p === "application" ? <SchoolApplications /> : p === "approval" ? <SchoolApproval /> : <SchoolsView embedded initialTab="pending" />),
  "schools/directory": (p) => <SchoolsView embedded initialTab={DIRECTORY_TAB[p] ?? "all"} key={p} />,
  "schools/profile": () => <WithSchool>{(id) => <ProfileSection id={id} onSaved={() => undefined} />}</WithSchool>,
  "schools/configuration": () => <WithSchool>{(id) => <ConfigSection id={id} />}</WithSchool>,
  "schools/campus": () => <SchoolCampuses />,
  "schools/admin": () => <WithSchool>{(id) => <AdminsSection id={id} />}</WithSchool>,
  "schools/status": (p) => <SchoolsView embedded initialTab={STATUS_TAB[p] ?? "all"} key={p} />,
  "schools/documents": () => <WithSchool>{(id) => <DocumentsSection id={id} onChanged={() => undefined} />}</WithSchool>,
  "schools/history": () => <WithSchool>{(id) => <HistorySection id={id} />}</WithSchool>,

  // ── Subscription Management ──
  "subscriptions/plans": () => <SubscriptionsView embedded initialTab="plans" />,
  "subscriptions/features": () => <SubscriptionsView embedded initialTab="plans" />,
  "subscriptions/list": () => <SubscriptionsView embedded initialTab="list" />,
  "subscriptions/school": () => <SubscriptionsView embedded initialTab="list" />,
  "subscriptions/renewal": () => <SubscriptionsView embedded initialTab="renewals" />,
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
