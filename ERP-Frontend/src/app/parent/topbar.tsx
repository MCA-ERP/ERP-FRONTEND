"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, FileText, Search } from "lucide-react";
import { schoolFetch } from "@/lib/school-api";
import { MENU, allowedMenu, sectionHref } from "./p/menu-config";
import { useParent } from "./context";

/** "Parent › Dashboard › My Dashboard" from the address. */
export function Breadcrumb() {
  const path = usePathname().split("/").filter(Boolean);
  const mod = MENU[path[1] ?? "dashboard"];
  const sec = mod?.sections.find((s) => s.key === (path[2] ?? mod.sections[0]?.key));
  return (
    <nav aria-label="Breadcrumb" className="mr-auto hidden min-w-0 items-center gap-1 truncate text-[12px] text-slate-500 sm:flex">
      <span>Parent</span><span aria-hidden="true">›</span><span>{mod?.label ?? "Dashboard"}</span>{sec && <><span aria-hidden="true">›</span><span className="font-medium text-slate-900">{sec.label}</span></>}
    </nav>
  );
}

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

interface Hit { type: string; id: string; title: string; subtitle: string; href: string }
/** Search the children's homework and library books, and every page of the portal. */
export function ParentSearch() {
  const router = useRouter();
  const { hasModule } = useParent();
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [found, setFound] = useState<Hit[]>([]); const [loading, setLoading] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const pages = useMemo<Hit[]>(() => allowedMenu(hasModule).flatMap(([k, mod]) => mod.sections.flatMap((s) => s.pages.map((p) => ({ type: "Pages", id: `${k}/${s.key}/${p.key}`, title: p.title, subtitle: `${mod.label} · ${s.label}`, href: sectionHref(k, s.key, p.key) })))), [hasModule]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try { setFound((await schoolFetch<{ hits: Hit[] }>(`/parent/search?q=${encodeURIComponent(q.trim())}`)).hits); } catch { setFound([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const needle = q.trim().toLowerCase();
  const hits = needle.length >= 2 ? [...found, ...pages.filter((p) => `${p.title} ${p.subtitle}`.toLowerCase().includes(needle)).slice(0, 6)] : [];
  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };
  const groups = [...new Set(hits.map((h) => h.type))].map((t) => [t, hits.filter((h) => h.type === t)] as const);
  return (
    <div ref={ref} className="relative hidden w-80 max-w-[40vw] md:block">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] focus-within:border-[#41afda] focus-within:ring-2 focus-within:ring-[#41afda]/25">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <input type="search" value={q} placeholder="Search fees, homework, books…" aria-label="Search fees, homework, books" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0]); }} />
      </label>
      {open && needle.length >= 2 && (
        <div role="listbox" aria-label="Search results" className="absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-[26rem] max-w-[90vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Searching…</p>}
          {!loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Nothing found for “{q.trim()}”.</p>}
          {groups.map(([type, list]) => { const Icon = type === "Books" ? BookOpen : FileText; return (
            <div key={type}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{type}</p>
              {list.map((h) => <button key={h.type + h.id} type="button" role="option" aria-selected="false" onClick={() => go(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"><Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{h.title}</span><span className="block truncate text-xs text-slate-500">{h.subtitle}</span></span></button>)}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

/** The bell: what the school told the family. Each line opens the page it is about. */
export function ParentBell() {
  const { me, refreshMe } = useParent();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ key: string; title: string; href: string; unread: boolean }[] | null>(null);
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => { if (open) schoolFetch<{ items: { key: string; title: string; href: string; unread: boolean }[] }>("/parent/notifications").then((r) => setItems(r.items.slice(0, 8)), () => setItems([])); }, [open]);
  const n = me.badges.unread;
  const go = (i: { key: string; href: string; unread: boolean }) => { setOpen(false); if (i.unread) void schoolFetch("/parent/notifications/read", { method: "POST", body: JSON.stringify({ keys: [i.key] }) }).then(refreshMe, () => undefined); router.push(i.href); };
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={n ? `Notifications, ${n} unread` : "Notifications"} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-400">
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {n > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#f3f5f7] bg-[#e53a35] px-1 text-[11px] font-bold leading-4 text-white">{n}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
          <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notifications</p>
          {items === null ? <p className="px-4 py-3 text-sm text-slate-400">Loading…</p> : !items.length ? <p className="px-4 py-3 text-sm text-slate-400">Nothing new. You are up to date.</p> : items.map((i) => <button key={i.key} type="button" role="menuitem" onClick={() => go(i)} className={`block w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50 ${i.unread ? "font-semibold text-slate-900" : "text-slate-600"}`}>{i.title}</button>)}
          <Link href={sectionHref("dashboard", "my-dashboard", "notifications")} onClick={() => setOpen(false)} className="mt-1 block border-t border-slate-100 px-4 pt-2 text-[12.5px] font-semibold text-[#026f9b]">All notifications</Link>
        </div>
      )}
    </div>
  );
}
