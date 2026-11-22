"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, History, KeyRound, LogOut, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useSignOut } from "@/components/logout";
import { sectionHref } from "./s/menu-config";

const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

/** The account menu at the bottom of the sidebar. */
export function UserMenu({ name, email, role, compact = false }: { name: string; email: string; role: string; compact?: boolean }) {
  const [open, setOpen] = useState(false); const box = useRef<HTMLDivElement>(null); const { signOut, busy } = useSignOut();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const items: [string, typeof UserRound, string][] = [["My profile", UserRound, sectionHref("profile", "personal-details")], ["Change password", KeyRound, "/change-password"], ["Users & logins", ShieldCheck, sectionHref("settings", "user-management")], ["Audit log", History, sectionHref("settings", "audit-and-activity")], ["School settings", SlidersHorizontal, sectionHref("settings", "school-profile")], ["Help & support", CircleHelp, "/school/help"]];
  return (
    <div ref={box} className="relative border-t border-sky-100 p-3">
      {open && (
        <div role="menu" className={`absolute bottom-[calc(100%-4px)] left-3 z-30 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl right-3 ${compact ? "lg:right-auto lg:w-64" : ""}`}>
          <div className="flex items-center gap-3 px-4 pb-3 pt-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dceff9] text-[12px] font-bold text-[#026f9b]">{initials(name)}</span><div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-slate-900">{name}</p><p className="break-all text-[11.5px] leading-tight text-slate-500">{email}</p></div></div>
          <div className="border-t border-slate-100 py-1">{items.map(([label, Icon, href]) => <Link key={label} role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-slate-800 hover:bg-slate-50"><Icon className="size-4 text-[#026f9b]" aria-hidden="true" />{label}</Link>)}</div>
          <div className="border-t border-slate-100 pt-1"><button type="button" role="menuitem" disabled={busy} onClick={() => void signOut()} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-[#ac2c28] hover:bg-slate-50 disabled:opacity-50"><LogOut className="size-4" aria-hidden="true" />{busy ? "Signing out…" : "Sign out"}</button></div>
        </div>
      )}
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={name} className={`flex w-full items-center gap-3 rounded-full py-1.5 text-left hover:bg-white/50 px-2 ${compact ? "lg:justify-center lg:px-0" : ""}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#026f9b]">{initials(name)}</span>
        <span className={`min-w-0 flex-1 ${compact ? "lg:hidden" : ""}`}><span className="block truncate text-[13px] font-semibold text-slate-900">{name}</span><span className="block text-[11.5px] text-slate-600">{role}</span></span>
        <ChevronDown className={`size-4 shrink-0 text-slate-600 transition-transform ${compact ? "lg:hidden" : ""} ${open ? "" : "rotate-180"}`} aria-hidden="true" />
      </button>
    </div>
  );
}
