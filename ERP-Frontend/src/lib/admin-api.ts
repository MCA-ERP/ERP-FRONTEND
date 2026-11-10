import { API_BASE, getAuthHeaders } from "./api";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SchoolStatus = "Pending" | "Trial" | "Active" | "Overdue" | "Suspended" | "Expired" | "Inactive";

export interface SchoolRow {
  id: string;
  code: string;
  name: string;
  type: string | null;
  board: string | null;
  city: string | null;
  state: string | null;
  status: SchoolStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  plan_code: string | null;
  plan_name: string | null;
  price_per_student_paise: number | null;
  renews_on: string | null;
  trial_ends_on: string | null;
  students: number;
  arr_paise: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  price_per_student_paise: number;
  student_limit: number | null;
  sort_order: number;
}

export interface SchoolList extends Paged<SchoolRow> {
  counts: { all: number; pending: number; active: number; inactive: number; suspended?: number };
}

export interface SchoolDetail {
  school: SchoolRow & { address: string | null; website: string | null; gst_number: string | null };
  campuses: { id: string; code: string; name: string; city: string | null; state: string | null }[];
  subscriptions: {
    id: string;
    started_on: string;
    renews_on: string | null;
    trial_ends_on: string | null;
    ended_on: string | null;
    is_current: boolean;
    plans: { code: string; name: string } | null;
  }[];
  userCounts: { role: string; n: number }[];
}

export interface DashboardSummary {
  generatedAt: string;
  schools: SchoolRow[];
  userCounts: { institution_id: string | null; role: string; n: number }[];
  plans: Plan[];
  platformTeam: number;
  pendingUsers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  institution_id: string | null;
  role_id: string;
  roles: { name: string; display_name: string } | null;
  institutions: { name: string; code: string } | null;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_default: boolean;
  scope?: "platform" | "school";
  data_scope?: "school" | "campus";
  institution_id?: string | null;
  permission_ids: string[];
  user_count: number;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export interface AuditLog {
  id: string;
  old_data?: unknown;
  entity_id?: string | null;
  actor_email: string | null;
  action: string;
  entity_name: string;
  new_data: unknown;
  ip_address: string | null;
  created_at: string;
}

export interface ModuleRow {
  code: string;
  name: string;
  description: string | null;
  is_core: boolean;
  is_enabled: boolean;
  sort_order: number;
  category?: string;
  build_status?: "live" | "beta" | "planned";
  addon_price_paise?: number;
  version?: string | null;
  min_plan?: string | null;
  schools_with_access?: number;
}

export interface ModuleCatalogue {
  liveSchools: number;
  modules: ModuleRow[];
}

export interface PlanMatrix {
  modules: ModuleRow[];
  plans: { id: string; code: string; name: string; sort_order: number; module_codes: string[] }[];
}

export interface SchoolModuleAccess {
  planCode: string | null;
  studentLimit: number | null;
  modules: {
    code: string;
    name: string;
    is_core: boolean;
    globally_enabled: boolean;
    via_plan: boolean;
    override: boolean | null;
    effective: boolean;
  }[];
}

export interface TicketRow {
  id: string;
  code: string;
  subject: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In progress" | "Waiting on school" | "Resolved" | "Closed";
  raised_by_name: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  institutions: { name: string; code: string } | null;
  assignee: { first_name: string; last_name: string } | null;
}
export interface TicketList extends Paged<TicketRow> {
  counts: { all: number; open: number; resolved: number };
}
export interface TicketMessage {
  id: string;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}
export interface TicketDetail {
  ticket: TicketRow;
  messages: TicketMessage[];
}

export type Audience =
  | { type: "all" }
  | { type: "plans"; plans: string[] }
  | { type: "schools"; school_ids: string[] }
  | { type: "segment"; segment: "active" | "trial" | "renewals_due" };
export type AnnouncementKind = "announcement" | "banner" | "alert" | "popup";
export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  channels: string[];
  kind: AnnouncementKind;
  status: "draft" | "scheduled" | "sent";
  scheduled_for: string | null;
  ends_at: string | null;
  ended_at: string | null;
  sent_at: string | null;
  created_at: string;
  delivered: number;
  read_by: number;
}
export interface Campaign {
  id: string;
  title: string;
  channels: string[];
  kind: AnnouncementKind;
  audience: Audience;
  sent_at: string;
  schools: number;
  stats: Record<string, number>;
}
export interface MessageTemplate {
  id: string;
  name: string;
  key: string | null;
  channel: "in_app" | "email" | "sms" | "whatsapp";
  subject: string | null;
  body: string;
  provider_template_id: string | null;
  is_active: boolean;
}

export interface MessageRow {
  id: string;
  channel: "email" | "sms" | "whatsapp";
  to_address: string;
  subject: string | null;
  body: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  error: string | null;
  related_type: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
  opened_at?: string | null;
  open_count?: number;
  institutions: { name: string } | null;
}
export interface Providers {
  email: { configured: boolean; host: string | null };
  sms: { configured: boolean };
  whatsapp: { configured: boolean };
}
export interface MessagesResponse extends Paged<MessageRow> {
  last30Days: { sent: number; failed: number; queued: number };
  providers: Providers;
}
export interface HistoryResponse extends MessagesResponse {
  inApp: { id: string; title: string; kind: AnnouncementKind; status: "sent" | "queued"; when: string | null; schools: number }[];
}

export type CmsType = "page" | "blog" | "banner" | "testimonial" | "blog_category" | "author" | "faq";
export interface CmsItem {
  id: string;
  type: CmsType;
  slug: string;
  title: string;
  body: string;
  // values are strings, except a page's sections list and a testimonial's consent
  data: Record<string, any>;
  status: "draft" | "published" | "archived";
  sort_order: number;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}

export interface BackupInfo {
  provider: string;
  note: string;
  migrations: { version: string; applied_at: string }[];
}
export interface AllowlistEntry {
  id: string;
  cidr: string;
  label: string | null;
  created_at: string;
}

export type InvoiceStatus = "Issued" | "Partially paid" | "Overdue" | "Paid" | "Void";
export interface InvoiceRow {
  id: string;
  number: string;
  institution_id: string;
  school_name: string;
  school_code: string;
  description: string;
  period_start: string | null;
  period_end: string | null;
  issue_date: string;
  due_on: string;
  subtotal_paise: number;
  gst_rate_percent: number;
  tax_paise: number;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  status: InvoiceStatus;
  void_reason: string | null;
}
export interface InvoiceDetail {
  invoice: InvoiceRow;
  footer?: string;
  lines: { id: string; description: string; quantity: number; unit_price_paise: number; amount_paise: number }[];
  payments: {
    id: string;
    code: string;
    amount_paise: number;
    method: string;
    gateway: string;
    reference: string | null;
    paid_on: string;
    notes: string | null;
    refunds: { id: string; amount_paise: number; reason: string; created_at: string }[];
  }[];
}
export interface PaymentRow {
  id: string;
  code: string;
  amount_paise: number;
  method: string;
  gateway: string;
  reference: string | null;
  paid_on: string;
  invoices: { number: string } | null;
  institutions: { name: string; code: string } | null;
  refunds: { amount_paise: number }[];
}
export interface RefundRow {
  id: string;
  amount_paise: number;
  reason: string;
  gateway_refund_id: string | null;
  created_at: string;
  payments: { code: string; method: string; invoices: { number: string } | null; institutions: { name: string } | null } | null;
}
export interface GatewayInfo {
  razorpay: { configured: boolean; keyHint: string | null; mode: "live" | "test" | null; webhookSecretSet: boolean; webhookPath: string; webhookEvents: string[] };
  manual: { methods: string[] };
}
export interface InvoiceSuggestion {
  description: string;
  period_start: string;
  period_end: string;
  lines: { description: string; quantity: number; unit_price_paise: number }[];
  note?: string;
}
export interface Analytics {
  totals: { collected_this_month_paise: number; collected_this_fy_paise: number; outstanding_paise: number; overdue_paise: number };
  monthly: { month: string; invoiced_paise: number; collected_paise: number; refunded_paise: number; net_paise: number }[];
  byFinancialYear: { fy: string; invoiced_paise: number; collected_paise: number; refunded_paise: number; net_paise: number }[];
  ageing: { label: string; count: number; total_paise: number }[];
  outstanding: { id: string; number: string; school_name: string; description: string; due_on: string; balance_paise: number; status: string; days_late: number }[];
}

export interface ReportInfo {
  key: string;
  name: string;
  description: string;
  area: string;
  usesRange: boolean;
}
export interface ReportColumn {
  key: string;
  label: string;
  kind: "text" | "int" | "money" | "date";
}
export interface ReportResult {
  name: string;
  group?: string;
  range: { from: string; to: string };
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary: { label: string; value: string | number; kind?: ReportColumn["kind"] }[];
  truncated: boolean;
}
export interface ReportsOverview {
  totals: { schools: number; liveSchools: number; students: number; arr_paise: number; avgModulesPerSchool: number; totalModules: number };
  studentsGrowth: { month: string; students: number }[];
  moduleAccess: { name: string; schools: number; percent: number }[];
  schoolsByState: { state: string; schools: number; students: number }[];
}

export interface ServiceRow {
  group: string;
  key: string;
  name: string;
  description: string;
  status: "Connected" | "Not configured" | "Planned";
  link?: string;
}
export interface ServicesResponse {
  services: ServiceRow[];
  stats: { connected: number; available: number; activeKeys: number; activeWebhooks: number; failedDeliveries24h: number };
}
export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  key_last4: string;
  scopes: string[];
  status: "active" | "revoked";
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}
export interface WebhookRow {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  active: boolean;
  created_at: string;
  last_delivery: { success: boolean; status_code: number | null; error: string | null; attempted_at: string } | null;
}
export interface DeliveryRow {
  id: string;
  event: string;
  status_code: number | null;
  success: boolean;
  error: string | null;
  duration_ms: number | null;
  attempted_at: string;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new Error("Cannot reach the ERP backend.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body as T;
}

export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
