"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface ParentChild { id: string; name: string; first_name: string; class_label: string; roll_no: string; class_teacher: string }
export interface ParentMe {
  parent: { name: string; parent_id: string };
  /** The line under the name: "Parent of Aarav and Diya". */
  line: string;
  children: ParentChild[];
  badges: { unread: number; fees: number };
  today: string;
}

export interface ParentContextValue {
  user: ServerUser;
  school: { name: string; code: string; logo?: string | null };
  me: ParentMe;
  /** The child the pages are about. Only ever one of me.children; the server checks it again. */
  child: ParentChild | null;
  setChild: (id: string) => void;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  refreshMe: () => void;
}

export const ParentContext = createContext<ParentContextValue | null>(null);

export function useParent(): ParentContextValue {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error("useParent must be used inside the Parent layout.");
  return ctx;
}
