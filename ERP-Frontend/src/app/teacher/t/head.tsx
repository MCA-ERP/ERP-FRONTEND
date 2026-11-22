"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/admin/ui";

/** Where a page's own title, subtitle and action button are drawn: above the tabs, set by the section view. */
export const HeadSlot = createContext<HTMLElement | null>(null);

export function Head({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const slot = useContext(HeadSlot);
  return slot ? createPortal(<PageHeader title={title} subtitle={subtitle} action={action} />, slot) : null;
}

export const redBtn = "rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28] disabled:opacity-60";
export const whiteBtn = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:border-slate-400 disabled:opacity-60";
