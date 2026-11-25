"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface HrContextValue {
  user: ServerUser;
  school: { name: string; code: string; logo?: string | null };
  /** The line under the name: the designation, or "HR Manager". */
  line: string;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  /** The count on Leave and on the bell; reload after a change. */
  badges: { leave: number; unread: number };
  refreshBadges: () => void;
}

export const HrContext = createContext<HrContextValue | null>(null);

export function useHr(): HrContextValue {
  const ctx = useContext(HrContext);
  if (!ctx) throw new Error("useHr must be used inside the HR layout.");
  return ctx;
}
