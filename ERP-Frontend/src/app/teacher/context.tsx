"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface TeacherContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  /** The line under the name: "Mathematics teacher". */
  line: string;
  hasModule: (code: string) => boolean;
  /** Counts for the bell and the Communication badge; reload after a change. */
  badges: { unread: number; parent_unread: number };
  refreshBadges: () => void;
}

export const TeacherContext = createContext<TeacherContextValue | null>(null);

export function useTeacher(): TeacherContextValue {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacher must be used inside the Teacher layout.");
  return ctx;
}
