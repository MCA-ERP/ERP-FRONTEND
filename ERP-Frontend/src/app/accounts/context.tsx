"use client";

import { createContext, useContext } from "react";
import type { ServerUser } from "@/lib/api";

export interface AccountsContextValue {
  user: ServerUser;
  school: { name: string; code: string };
  /** The line under the name: "Accountant". */
  line: string;
  hasModule: (code: string) => boolean;
  can: (permission: string) => boolean;
  /** The count on Installment Dues and on the bell; reload after a change. */
  badges: { overdue: number; unread: number };
  refreshBadges: () => void;
}

export const AccountsContext = createContext<AccountsContextValue | null>(null);

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error("useAccounts must be used inside the Accounts layout.");
  return ctx;
}
