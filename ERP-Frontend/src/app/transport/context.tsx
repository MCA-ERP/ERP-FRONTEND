"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface TransportContextValue {
  user: ServerUser;
  school: { name: string; code: string; logo?: string | null };
  /** The line under the name: the designation, or "Transport Manager". */
  line: string;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  /** The count on Vehicles (documents due) and on the bell; reload after a change. */
  badges: { documents: number; unread: number };
  refreshBadges: () => void;
}

export const TransportContext = createContext<TransportContextValue | null>(null);

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext);
  if (!ctx) throw new Error("useTransport must be used inside the Transport layout.");
  return ctx;
}
