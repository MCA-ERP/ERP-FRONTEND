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

/** Call any authenticated backend path, e.g. `/school/years` or `/sis/students`. */
export async function schoolFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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
