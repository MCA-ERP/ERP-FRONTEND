"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, FileText, Search, UserRound } from "lucide-react";
import { schoolFetch } from "@/lib/school-api";
import { MENU, sectionHref } from "./m/menu-config";
import { useApplicant } from "./context";

/** "Applicant › Dashboard › Application Status" from the address. */
export function Breadcrumb() {
  const path = usePathname().split("/").filter(Boolean);
  const mod = MENU[path[1] ?? "dashboard"];
  const sec = mod?.sections.find((s) => s.key === (path[2] ?? mod.sections[0]?.key));
  return (
    <nav aria-label="Breadcrumb" className="mr-auto hidden min-w-0 items-center gap-1 truncate text-[12px] text-slate-500 sm:flex">
      <span>Applicant</span><span aria-hidden="true">›</span><span>{mod?.label ?? "Dashboard"}</span>{sec && <><span aria-hidden="true">›</span><span className="font-medium text-slate-900">{sec.label}</span></>}
    </nav>
  );
}

interface Hit { type: "page" | "mine"; id: string; title: string; subtitle: string; href: string }
const ICON = { page: FileText, mine: UserRound } as const;
const LABEL = { mine: "Your records", page: "Pages" } as const;

/** Search for the Applicant top bar: your documents and applications, and every page of the portal. */
export function ApplicantSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<Hit[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pages = useMemo<Hit[]>(() => Object.entries(MENU).flatMap(([k, mod]) => mod.sections.flatMap((s) => [
    { type: "page" as const, id: `${k}/${s.key}`, title: s.label, subtitle: mod.label, href: sectionHref(k, s.key) },
    ...(s.pages.length > 1 ? s.pages.map((p) => ({ type: "page" as const, id: `${k}/${s.key}/${p.key}`, title: p.title, subtitle: `${mod.label} › ${s.label}`, href: `${sectionHref(k, s.key)}?tab=${p.key}` })) : []),
  ])), []);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await schoolFetch<{ hits: { key: string; title: string; subtitle: string; href: string }[] }>(`/applicant/search?q=${encodeURIComponent(q.trim())}`);
        setMine(r.hits.map((h) => ({ type: "mine" as const, id: h.key, title: h.title, subtitle: h.subtitle, href: h.href })));
      } catch { setMine([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const needle = q.trim().toLowerCase();
  const pageHits = needle.length >= 2 ? pages.filter((p) => p.title.toLowerCase().includes(needle) || p.subtitle.toLowerCase().includes(needle)).slice(0, 6) : [];
  const hits = [...(needle.length >= 2 ? mine : []), ...pageHits];
  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };
  const groups = (Object.keys(LABEL) as (keyof typeof LABEL)[]).map((t) => [t, hits.filter((h) => h.type === t)] as const).filter(([, l]) => l.length);
  return (
    <div ref={ref} className="relative hidden w-80 max-w-[40vw] md:block">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] focus-within:border-[#41afda] focus-within:ring-2 focus-within:ring-[#41afda]/25">
        <Search className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <input type="search" value={q} placeholder="Search documents, slots, fees…" aria-label="Search documents, slots and fees" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      </label>
      {open && q.trim().length >= 2 && (
        <div role="listbox" aria-label="Search results" className="absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-[26rem] max-w-[90vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hits.length && <p className="px-3 py-3 text-sm text-slate-400">Nothing found for “{q.trim()}”.</p>}
          {groups.map(([type, list]) => {
            const Icon = ICON[type];
            return (
              <div key={type}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{LABEL[type]}</p>
                {list.map((h) => <button key={type + h.id} type="button" role="option" aria-selected="false" onClick={() => go(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"><Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-slate-900">{h.title}</span><span className="block truncate text-[11.5px] text-slate-500">{h.subtitle}</span></span></button>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The bell: how many notifications are unread; it opens the Notifications tab. */
export function ApplicantBell() {
  const { badges } = useApplicant();
  const router = useRouter();
  const n = badges.unread;
  return (
    <button type="button" onClick={() => router.push(`${sectionHref("dashboard", "application-status")}?tab=notifications`)} aria-label={n ? `Notifications, ${n} unread` : "Notifications"}
      className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#41afda]/30">
      <Bell className="size-[18px]" aria-hidden="true" />
      {n > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#f3f5f7] bg-[#e53a35] px-1 text-[11px] font-bold leading-4 text-white">{n}</span>}
    </button>
  );
}
