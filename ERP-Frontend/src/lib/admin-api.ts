import { API_BASE, getAuthHeaders } from "./api";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SchoolStatus = "Pending" | "Trial" | "Active" | "Overdue" | "Suspended" | "Expired";

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
  counts: { all: number; pending: number; active: number; inactive: number };
}

export interface SchoolDetail {
  school: SchoolRow & { address: string | null; website: string | null };
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
