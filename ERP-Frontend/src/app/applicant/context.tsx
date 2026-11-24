"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface FamilyApp { id: string; code: string; child: string; class_sought: string; applied_on: string; draft: boolean; label: string; steps: { n: number; label: string; state: "done" | "current" | "todo" }[] }

export interface ApplicantContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  /** The family's name, and the line under it: "Applying for Vivaan · Class 1". */
  name: string;
  line: string;
  apps: FamilyApp[];
  /** The application the pages show now (the family can switch when it has more than one). */
  active: FamilyApp | null;
  setActive: (id: string) => void;
  reloadApps: () => void;
  hasModule: (code: string) => boolean;
  /** Documents to re-upload (sidebar) and unread notifications (bell); reload after a change. */
  badges: { documents: number; unread: number };
  refreshBadges: () => void;
}

export const ApplicantContext = createContext<ApplicantContextValue | null>(null);

export function useApplicant(): ApplicantContextValue {
  const ctx = useContext(ApplicantContext);
  if (!ctx) throw new Error("useApplicant must be used inside the Applicant layout.");
  return ctx;
}
