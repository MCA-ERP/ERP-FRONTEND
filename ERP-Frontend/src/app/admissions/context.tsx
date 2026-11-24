"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface AdmissionsContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  /** The line under the name: "Admissions Head". */
  line: string;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  /** The count on Approval and on the bell; reload after a change. */
  badges: { approvals: number; unread: number };
  refreshBadges: () => void;
}

export const AdmissionsContext = createContext<AdmissionsContextValue | null>(null);

export function useAdmissions(): AdmissionsContextValue {
  const ctx = useContext(AdmissionsContext);
  if (!ctx) throw new Error("useAdmissions must be used inside the Admissions layout.");
  return ctx;
}
