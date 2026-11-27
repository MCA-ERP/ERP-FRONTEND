import { API_BASE, getAuthHeaders } from "./api";

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_locked: boolean;
}
export interface Grade {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}
export interface Section {
  id: string;
  grade_id: string;
  grade_name: string;
  academic_year_id: string;
  name: string;
  capacity: number;
  enrolled: number;
}
export interface Subject {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}
export interface SetupStep {
  key: string;
  label: string;
  done: boolean;
  count: number;
}
export interface SetupStatus {
  steps: SetupStep[];
  complete: boolean;
}

/** The staff self-service screens (help desk, calendar, claims, payslips) are shared by several portals: they ask for
 *  /teacher/..., and inside another portal that means that portal's own path. Fee & Finance also draws the School Admin's
 *  payroll approval and salary payment screens, which become its own /accounts/pay/... paths. */
const SHARED_PORTALS = ["accounts", "admissions", "principal", "hr", "transport", "parent"];
const portalPath = (path: string) => {
  if (typeof window === "undefined") return path;
  const portal = window.location.pathname.split("/")[1];
  if (portal === "accounts" && path.startsWith("/school/pay/")) return path.replace("/school/pay/", "/accounts/pay/");
  if (!path.startsWith("/teacher/")) return path;
  if (portal === "school" && path.startsWith("/teacher/payslips")) return path.replace("/teacher/payslips", "/school/me/payslips");
  return SHARED_PORTALS.includes(portal) ? path.replace("/teacher/", `/${portal}/`) : path;
};

/** Call any authenticated backend path, e.g. `/school/years` or `/sis/students`. */
export async function schoolFetch<T>(rawPath: string, init: RequestInit = {}): Promise<T> {
  const path = portalPath(rawPath);
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new Error("Cannot reach the ERP backend.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body as T;
}
