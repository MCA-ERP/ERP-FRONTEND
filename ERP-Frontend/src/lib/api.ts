import { supabase } from "./supabase/client";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const HEALTH_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/health";

export interface BackendHealth {
  status: string;
  service?: string;
  database?: {
    ok: boolean;
    message: string;
  };
  timestamp?: string;
}

export interface SisStats {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  totalPrograms: number;
  activeBatches: number;
  attendanceRate: string;
}

export interface StudentRecord {
  id: string;
  registration_no: string;
  roll_no: string;
  name: string;
  email: string;
  program: string;
  department: string;
  semester: number;
  status: string;
  cgpa?: string;
  attendance?: string;
}

export interface TimetableSlot {
  day: string;
  time: string;
  subject: string;
  code: string;
  room: string;
  faculty: string;
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Session token retrieval optional for public endpoints
  }

  return headers;
}

export interface ServerUser {
  id: string;
  email: string;
  role: string;
  roleDisplayName?: string;
  institutionId?: string;
  campusId?: string;
  /** Module codes the school may use; empty for SuperAdmin (who bypasses module checks). */
  modules?: string[];
}

/**
 * Resolve the signed-in user's ERP role from the backend (source of truth).
 */
export async function fetchServerUser(accessToken: string): Promise<ServerUser> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the ERP backend. Please try again shortly.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Access denied (${res.status}).`);
  }
  const data = await res.json();
  return data.user as ServerUser;
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(HEALTH_URL, { cache: "no-store" });
    if (!res.ok) {
      return { status: "degraded", database: { ok: false, message: `Status code ${res.status}` } };
    }
    return await res.json();
  } catch {
    return {
      status: "offline",
      database: { ok: false, message: "Backend API is currently offline on port 5000" },
    };
  }
}

export async function getSisStats(): Promise<SisStats> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/sis/stats`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch SIS stats");
    return await res.json();
  } catch {
    return {
      totalStudents: 0,
      totalFaculty: 0,
      totalDepartments: 0,
      totalPrograms: 0,
      activeBatches: 0,
      attendanceRate: "0.0%",
    };
  }
}

export async function getStudents(
  search = "",
  status = "",
  school_code = ""
): Promise<{ students: StudentRecord[]; total: number }> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (school_code) params.set("school_code", school_code);

    const res = await fetch(`${API_BASE}/sis/students?${params.toString()}`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch students");
    return await res.json();
  } catch {
    return {
      students: [],
      total: 0,
    };
  }
}


export async function getTimetable(): Promise<TimetableSlot[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/academics/timetable`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch timetable");
    const data = await res.json();
    return data.schedule || [];
  } catch {
    return [];
  }
}

export interface StudentEnrollmentPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  grade?: string;
  section?: string;
  roll_no?: string;
  school_name?: string;
  school_code?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  address?: string;
  registration_no?: string;
}

export interface SchoolRecord {
  id: string;
  name: string;
  code: string;
  type?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  student_count?: number;
  faculty_count?: number;
  is_active?: boolean;
  website?: string;
  created_at?: string;
}

/**
 * Enroll Student with automatic Student ID formula:
 * [First 3 letters of School] + ST + [3-digit sequence: 001, 002...] -> e.g. RAVST001
 */
export async function enrollStudent(
  payload: StudentEnrollmentPayload
): Promise<{ success: boolean; message: string; student: StudentRecord }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/sis/students`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server responded with ${res.status}`);
  }

  return await res.json();
}

/**
 * List all registered schools (SuperAdmin / Directory)
 */
export async function getAllSchools(): Promise<{ schools: SchoolRecord[] }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/institution/all`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch schools");
    return await res.json();
  } catch {
    return { schools: [] };
  }
}

/**
 * SuperAdmin register new school
 */
export async function registerSchool(schoolData: Partial<SchoolRecord>): Promise<{ success: boolean; school: SchoolRecord }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/institution/register`, {
    method: "POST",
    headers,
    body: JSON.stringify(schoolData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed with status ${res.status}`);
  }

  const data = await res.json();
  return { success: true, school: data.school };
}

/**
 * Look up school by short code (e.g. RAV)
 */
export async function getSchoolByCode(code: string): Promise<{ school: SchoolRecord }> {
  const upper = code.trim().toUpperCase();
  try {
    const res = await fetch(`${API_BASE}/institution/by-code/${encodeURIComponent(upper)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `School code '${upper}' not found.`);
    }
    return await res.json();
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : `School code '${upper}' not found.`);
  }
}

