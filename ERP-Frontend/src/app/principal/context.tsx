"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface PrincipalContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  /** The line under the name: "Principal". */
  line: string;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  /** The count on Approvals and on the bell; reload after a decision. */
  badges: { approvals: number; unread: number };
  refreshBadges: () => void;
}

export const PrincipalContext = createContext<PrincipalContextValue | null>(null);

export function usePrincipal(): PrincipalContextValue {
  const ctx = useContext(PrincipalContext);
  if (!ctx) throw new Error("usePrincipal must be used inside the Principal layout.");
  return ctx;
}
