"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, FileText, Search, User } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { MENU, sectionHref } from "./h/menu-config";
import { useHr } from "./context";

/** "HR › Dashboard › HR Dashboard" from the address. */
export function Breadcrumb() {
  const path = usePathname().split("/").filter(Boolean);
  const mod = MENU[path[1] ?? "dashboard"];
  const sec = mod?.sections.find((s) => s.key === (path[2] ?? mod.sections[0]?.key));
  return (
    <nav aria-label="Breadcrumb" className="mr-auto hidden min-w-0 items-center gap-1 truncate text-[12px] text-slate-500 sm:flex">
      <span>HR</span><span aria-hidden="true">›</span><span>{mod?.label ?? "Dashboard"}</span>{sec && <><span aria-hidden="true">›</span><span className="font-medium text-slate-900">{sec.label}</span></>}
    </nav>
  );
}

interface Hit { type: "page" | "staff"; id: string; title: string; subtitle: string; href: string }
const ICON = { page: FileText, staff: User } as const;
const LABEL = { staff: "Employees", page: "Pages" } as const;

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open, close]);
  return ref;
}

/** Search this school's employees, and every page of the portal. */
export function HrSearch({ modules }: { modules: [string, { label: string; sections: { key: string; label: string }[] }][] }) {
  const router = useRouter();
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [people, setPeople] = useState<Hit[]>([]); const [loading, setLoading] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const pages = useMemo<Hit[]>(() => modules.flatMap(([k, mod]) => mod.sections.map((s) => ({ type: "page" as const, id: `${k}/${s.key}`, title: s.label, subtitle: mod.label, href: sectionHref(k, s.key) }))), [modules]);
  const staffPage = modules.some(([k]) => k === "employees");
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await schoolFetch<{ hits: { type: "staff"; id: string; title: string; subtitle: string }[] }>(`/hr/search?q=${encodeURIComponent(q.trim())}`);
        setPeople(r.hits.map((h) => ({ ...h, href: "/hr/employees/employee-directory" })));
      } catch { setPeople([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const needle = q.trim().toLowerCase();
  const hits = needle.length >= 2 ? [...(staffPage ? people : []), ...pages.filter((p) => p.title.toLowerCase().includes(needle) || p.subtitle.toLowerCase().includes(needle)).slice(0, 6)] : [];
  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };
  const groups = (Object.keys(LABEL) as (keyof typeof LABEL)[]).map((t) => [t, hits.filter((h) => h.type === t)] as const).filter(([, l]) => l.length);
  return (
    <div ref={ref} className="relative hidden w-80 max-w-[40vw] md:block">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] focus-within:border-[#41afda] focus-within:ring-2 focus-within:ring-[#41afda]/25">
        <Search className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <input type="search" value={q} placeholder="Search employees" aria-label="Search employees" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0]); }} />
      </label>
      {open && q.trim().length >= 2 && (
        <div role="listbox" aria-label="Search results" className="absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-[26rem] max-w-[90vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Searching…</p>}
          {!loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Nothing found for “{q.trim()}”.</p>}
          {groups.map(([type, list]) => { const Icon = ICON[type]; return (
            <div key={type}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{LABEL[type]}</p>
              {list.map((h) => <button key={type + h.id} type="button" role="option" aria-selected="false" onClick={() => go(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"><Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{h.title}</span><span className="block truncate text-xs text-slate-500">{h.subtitle}</span></span></button>)}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

interface Note { key: string; title: string; href: string; read: boolean }
/** The bell: what needs HR now. Each line opens the page where it is dealt with. */
export function HrBell() {
  const { badges, refreshBadges } = useHr();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[] | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  useEffect(() => { if (open) schoolFetch<{ items: Note[] }>("/hr/notifications").then((r) => setItems(r.items), () => setItems([])); }, [open]);
  const n = badges.unread;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={n ? `Notifications, ${n} unread` : "Notifications"} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#41afda]/30">
        <Bell className="size-[18px]" aria-hidden="true" />
        {n > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#f3f5f7] bg-[#e53a35] px-1 text-[11px] font-bold leading-4 text-white">{n}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
          <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notifications</p>
          {items === null ? <p className="px-4 py-3 text-sm text-slate-400">Loading…</p> : !items.length ? <p className="px-4 py-3 text-sm text-slate-400">Nothing new. You are up to date.</p> : items.map((i) => <Link key={i.key} role="menuitem" href={i.href} onClick={() => { setOpen(false); void schoolFetch("/hr/notifications/read", json("POST", { keys: [i.key] })).then(refreshBadges, () => undefined); }} className={`block px-4 py-2.5 text-[13px] text-slate-900 hover:bg-slate-50 ${i.read ? "text-slate-500" : "font-semibold"}`}>{i.title}</Link>)}
        </div>
      )}
    </div>
  );
}
