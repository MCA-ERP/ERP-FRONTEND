"use client";

import type { ReactNode } from "react";
import { QuickActions } from "@/components/admin/quick-actions";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { sectionHref } from "./menu-config";

export { dmy, Loading, Tile, DataTable, has, blueBtn, whiteBtn, pillBtn } from "../../admissions/m/ui";
export { Head } from "../../teacher/t/head";
export { Chip } from "@/components/admin/dash-ui";

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const redBtn = "rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28] disabled:opacity-60";
export const brandBtn = "rounded-full bg-[#0294CE] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#026f9b] disabled:opacity-50";
export const GREEN = "bg-[#dff3e8]";

/** A one-line note in a pale box. */
export const Note = ({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "green" }) => (
  <p className={`mb-4 rounded-xl border px-4 py-2.5 text-[13px] text-slate-800 ${tone === "amber" ? "border-[#f1d9a6] bg-[#fff8e6]" : tone === "green" ? "border-[#bfe3cf] bg-[#eefaf3]" : "border-[#bfe0f0] bg-[#f1f9fd]"}`}>{children}</p>
);

/** Opens the print preview with these rows (Download PDF, admit card, letter). */
export const printRows = (name: string, rows: [string, string][]) => { armPrint(); downloadCsv(name, ["Item", "Details"], rows); };

const ACTIONS = [
  { label: "My application", mark: "A", href: sectionHref("dashboard", "application-status") },
  { label: "Upload documents", mark: "↑", href: sectionHref("documents", "upload-documents") },
  { label: "Assessment", mark: "T", href: sectionHref("assessment", "assessment") },
  { label: "Fees and payment", mark: "₹", href: sectionHref("fees", "fees-and-payment") },
  { label: "Messages", mark: "✉", href: sectionHref("messages", "messages") },
  { label: "Subjects by class", mark: "B", href: `${sectionHref("school", "about-the-school")}?tab=subjects` },
];
export const FamilyQuickActions = () => <QuickActions portal="applicant" chips actions={ACTIONS} />;

/** The status pill colour for a word. */
export const toneOf = (s: string): "good" | "warn" | "bad" | "info" | "mute" =>
  /^(verified|paid|done|answered|open|accepted|confirmed|eligible|fee paid|offer made|waived)/i.test(s) ? "good" : /(few|re-upload|due|booked|upcoming|returned|borderline|waitlist|offered|draft|under review)/i.test(s) ? (/upcoming|booked/i.test(s) ? "info" : "warn") : /(full|not eligible|not selected|expired|rejected)/i.test(s) ? "bad" : "mute";
