"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface SchoolContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  can: (permission: string) => boolean;
  hasModule: (code: string) => boolean;
}

export const SchoolContext = createContext<SchoolContextValue | null>(null);

export function useSchool(): SchoolContextValue {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used inside the school layout.");
  return ctx;
}
