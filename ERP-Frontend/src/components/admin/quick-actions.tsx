"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Quick actions and recent pages for the top of a portal's dashboard. Used by every admin portal. */
export interface QuickAction { label: string; mark: string; href: string }
interface Recent { href: string; label: string }

const key = (portal: string) => `recent-pages:${portal}`;
const read = (portal: string): Recent[] => { try { const v = JSON.parse(localStorage.getItem(key(portal)) ?? "[]"); return Array.isArray(v) ? v.filter((x) => x && typeof x.href === "string" && typeof x.label === "string").slice(0, 5) : []; } catch { return []; } };
const labelOf = (path: string) => path.split("/").filter(Boolean).slice(1).slice(-1).map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))[0] ?? "Dashboard";

/** Put once in a portal's layout: remembers the pages the person opens (the five latest), in this browser only. */
export function RecordPage({ portal, home }: { portal: string; home: string }) {
  const path = usePathname();
  useEffect(() => {
    if (!path || path === home) return;
    try {
      const list = read(portal).filter((r) => r.href !== path);
      localStorage.setItem(key(portal), JSON.stringify([{ href: path, label: labelOf(path) }, ...list].slice(0, 5)));
    } catch { /* storage unavailable */ }
  }, [path, portal, home]);
  return null;
}

export function QuickActions({ portal, actions, chips = false }: { portal: string; actions: QuickAction[]; chips?: boolean }) {
  const [recent, setRecent] = useState<Recent[]>([]);
  useEffect(() => { setRecent(read(portal)); }, [portal]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Quick actions">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Quick actions</h2><span className="text-xs text-slate-500">Your everyday tasks, one tap away</span></div>
      {chips ? <div className="flex flex-wrap gap-2.5 p-4">{actions.map((a) => <Link key={a.label} href={a.href} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-900 hover:border-[#41afda] hover:bg-[#f3f9fd]"><span className="text-[12px] font-semibold text-[#026f9b]" aria-hidden="true">{a.mark}</span>{a.label}</Link>)}</div> : <div className="grid gap-3 p-4 sm:grid-cols-2">{actions.map((a) => <Link key={a.label} href={a.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-medium text-slate-900 hover:border-[#41afda] hover:bg-[#f3f9fd]"><span className="w-4 text-center text-[13px] font-semibold text-[#026f9b]" aria-hidden="true">{a.mark}</span>{a.label}</Link>)}</div>}
      <div className="flex flex-wrap items-baseline gap-3 border-t border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Recent pages</h2><span className="text-xs text-slate-500">Where you were last</span></div>
      {recent.length ? <div className="flex flex-wrap gap-2 px-5 pb-4">{recent.map((r) => <Link key={r.href} href={r.href} className="rounded-full border border-slate-200 px-3 py-1 text-[12.5px] text-slate-800 hover:border-[#41afda]">{r.label}</Link>)}</div> : <p className="px-5 pb-4 text-sm text-slate-500">Pages you open will show here.</p>}
    </section>
  );
}
