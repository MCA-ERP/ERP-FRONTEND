"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useScrollActive } from "@/components/admin/use-scroll-active";
import { useDragWidth } from "@/components/admin/use-drag-width";
import { Menu, X, PanelLeftClose, PanelLeftOpen, Bus, CalendarCheck, ChevronDown, GraduationCap, HeartPulse, IndianRupee, LayoutDashboard, Library, MessageSquare, MessagesSquare, MonitorCheck, MonitorPlay, Trophy, Users, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Assist } from "@/components/admin/assist";
import { ReportHost } from "@/components/admin/report-host";
import { RecordPage } from "@/components/admin/quick-actions";
import { MENU, allowedMenu, sectionHref } from "./p/menu-config";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, getAuthHeaders, homePathFor, type ServerUser } from "@/lib/api";
import { schoolFetch } from "@/lib/school-api";
import { SchoolContext } from "../school/context";
import { UserMenu } from "./user-menu";
import { ParentContext, type ParentMe } from "./context";
import { Breadcrumb, ParentSearch, ParentBell } from "./topbar";

const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, profile: Users, academics: GraduationCap, attendance: CalendarCheck, fees: IndianRupee, requests: MessageSquare, communication: MessagesSquare, events: Trophy, homework: MonitorCheck, online: MonitorPlay, transport: Bus, health: HeartPulse, library: Library, mess: Utensils };

export default function ParentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useScrollActive(pathname);
  const [user, setUser] = useState<ServerUser | null>(null);
  const [school, setSchool] = useState<{ name: string; code: string; logo?: string | null } | null>(null);
  const [me, setMe] = useState<ParentMe | null>(null);
  const [childId, setChildId] = useState(() => { try { return typeof window !== "undefined" ? localStorage.getItem("parent-child") ?? "" : ""; } catch { return ""; } });
  const [error, setError] = useState("");
  const [assistOpen, setAssistOpen] = useState(false);
  const [pick, setPick] = useState<{ at: string; key: string | null } | null>(null); // one module is open at a time
  const [navOpen, setNavOpen] = useState(false);
  const [slim, setSlim] = useState(() => { try { return typeof window !== "undefined" && localStorage.getItem("school-sidebar") === "slim"; } catch { return false; } });
  const [fly, setFly] = useState<{ key: string; top: number } | null>(null);
  useEffect(() => {
    if (!fly) return;
    const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-fly]")) setFly(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFly(null); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [fly]);
  const setSlimTo = (n: boolean) => { setSlim(n); setFly(null); try { localStorage.setItem("school-sidebar", n ? "slim" : "wide"); } catch { /* storage unavailable */ } };
  const toggleSlim = () => setSlimTo(!slim);
  const { w: sbW, begin: beginSb, reset: resetSb } = useDragWidth("school-sidebar-w", 256, 220, 420, "right", (raw) => { if ((raw < 150) !== slim) setSlimTo(raw < 150); });

  const refreshMe = useCallback(() => { schoolFetch<ParentMe>("/parent/me").then(setMe, () => undefined); }, []);
  const setChild = useCallback((id: string) => { setChildId(id); try { localStorage.setItem("parent-child", id); } catch { /* storage unavailable */ } }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      try {
        const me = await fetchServerUser(data.session.access_token);
        if (!live) return;
        if (me.mustChangePassword) return router.replace("/change-password");
        if (homePathFor(me) !== "/parent") return router.replace(homePathFor(me));
        const res = await fetch(`${API_BASE}/institution`, { headers: await getAuthHeaders(), cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not load your school.");
        if (!live) return;
        setSchool({ name: body.institution.name, code: body.institution.code, logo: body.institution.logo ?? null });
        // the children this parent may see come from the server
        const family = await schoolFetch<ParentMe>("/parent/me");
        if (!live) return;
        setMe(family);
        setUser(me);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Access check failed.");
      }
    })();
    return () => { live = false; };
  }, [router]);
  useEffect(() => { const t = setInterval(refreshMe, 60_000); return () => clearInterval(t); }, [refreshMe]);
  const ctx = useMemo(() => (user && school && me ? { user, school, me, child: me.children.find((c) => c.id === childId) ?? me.children[0] ?? null, setChild, refreshMe, hasModule: (m: string) => (user.modules ?? []).includes(m), can: (p: string) => (user.permissions ?? []).includes(p) } : null), [user, school, me, childId, setChild, refreshMe]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="mb-4 text-sm text-rose-700">{error}</p>
          <Link href="/login" className="text-sm font-semibold text-mca-blue">Back to sign in</Link>
        </div>
      </div>
    );
  }
  if (!ctx) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading your portal…</div>;

  // a sidebar item shows when the school's plan includes it
  if (!ctx.hasModule("parent_app")) return <div className="flex min-h-screen items-center justify-center p-6"><p className="max-w-sm text-center text-sm text-slate-600">Your school&apos;s plan does not include the Parent app. Please contact the school office.</p></div>;
  const modules = allowedMenu(ctx.hasModule);
  // the page list the assistant uses to open a page for the parent
  const guide = modules.map(([k, m]) => [m.label, ...m.sections.map((s) => `  ${s.label} (${sectionHref(k, s.key)}): ${s.pages.map((p) => p.title).join("; ")}`)].join("\n")).join("\n").slice(0, 5800);
  return (
    <ParentContext.Provider value={ctx}>
      <SchoolContext.Provider value={ctx}>
        <div className="min-h-screen bg-mca-cloud lg:flex">
          <aside id="portal-sidebar" aria-label="Main" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setNavOpen(false); }} style={{ "--sbw": `${sbW}px` } as CSSProperties} className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,86vw)] flex-col bg-[#dceff9] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${slim ? "lg:w-[68px]" : "lg:w-[var(--sbw)]"} ${navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
            <button type="button" aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-600 hover:bg-white/60 lg:hidden" onClick={() => setNavOpen(false)}><X className="h-5 w-5" aria-hidden="true" /></button>
            <div role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize" onPointerDown={beginSb} onDoubleClick={resetSb} className="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize hover:bg-[#0294CE]/30 lg:block" />
            <div className={`px-5 pb-3 pt-5 ${slim ? "lg:px-4" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="flex items-start justify-between gap-2"><div className="leading-[0]"><img src={ctx.school.logo || "/mca-logo.svg"} alt={ctx.school.logo ? ctx.school.name : "My Class Assist"} style={{ width: 112, height: "auto", maxHeight: 72, objectFit: "contain" }} className={slim ? "lg:hidden" : ""} /><img src="/mca-mark.svg" alt="" className={`hidden h-8 w-8 ${slim ? "lg:block" : ""}`} /></div><button type="button" onClick={toggleSlim} aria-label={slim ? "Open sidebar" : "Close sidebar"} title={slim ? "Open sidebar" : "Close sidebar"} className="absolute -right-3.5 top-7 z-30 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-[#0294CE] lg:flex">{slim ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}</button></div>
              <p className={`mt-2 truncate text-[13px] font-semibold text-slate-900 ${slim ? "lg:hidden" : ""}`}>{ctx.school.name}</p>
              <p className={`text-[11px] font-medium uppercase tracking-wide text-[#026f9b] ${slim ? "lg:hidden" : ""}`}>Parent Portal</p>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {modules.map(([key, mod], idx, all) => {
                const inside = key === "dashboard" ? pathname === "/parent" || pathname.startsWith("/parent/dashboard") : pathname.startsWith(`/parent/${key}/`);
                const ModIcon = ICONS[key] ?? LayoutDashboard;
                const open = pick && pick.at === (pathname.split("/")[2] ?? "") ? pick.key === key : inside;
                const heading = idx === 0 || all[idx - 1][1].group !== mod.group ? mod.group : "";
                const badge = key === "fees" ? ctx.me.badges.fees : 0;
                return (
                  <div key={key}>
                    {heading && <p className={`px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#026f9b] ${slim ? "lg:hidden" : ""}`}>{heading}</p>}
                    <button type="button" aria-expanded={open} title={mod.label} onClick={(e) => { if (slim && window.matchMedia("(min-width: 1024px)").matches) { const r = e.currentTarget.getBoundingClientRect(); setFly(fly?.key === key ? null : { key, top: r.top }); return; } setPick({ at: pathname.split("/")[2] ?? "", key: open ? null : key }); }}
                      className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-[13.5px] ${slim ? "lg:justify-center lg:px-0" : ""} ${inside ? "font-bold text-slate-900" : "font-medium text-slate-800 hover:bg-white/50"}`}>
                      <ModIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className={`flex-1 ${slim ? "lg:hidden" : ""}`}>{mod.label}</span>
                      {badge > 0 && <span className={`grid min-w-[18px] place-items-center rounded-full bg-white px-1 text-[11px] font-bold leading-[18px] text-[#e53a35] ${slim ? "lg:hidden" : ""}`}>{badge}</span>}
                      <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${slim ? "lg:hidden" : ""} ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {open && (
                      <div className={`ml-[19px] mt-0.5 flex flex-col gap-px border-l-2 border-[#026f9b]/25 pl-2.5 ${slim ? "lg:hidden" : ""}`}>
                        {mod.sections.map((sec) => {
                          const href = sectionHref(key, sec.key);
                          const on = pathname === href || (key === "dashboard" && sec.key === "my-dashboard" && pathname === "/parent");
                          return <Link key={sec.key} href={href} aria-current={on ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] ${on ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-800 hover:bg-white/50"}`}>{sec.label}</Link>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            {slim && fly && MENU[fly.key] && (
              <div data-fly="" role="menu" aria-label={MENU[fly.key].label} style={{ top: Math.min(fly.top, (typeof window !== "undefined" ? window.innerHeight : 800) - 60 - MENU[fly.key].sections.length * 34) }} className="fixed left-[72px] z-40 max-h-[80vh] min-w-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <p className="px-4 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#026f9b]">{MENU[fly.key].label}</p>
                {(modules.find(([k]) => k === fly.key)?.[1].sections ?? []).map((sec) => { const href = sectionHref(fly.key, sec.key); return <Link key={sec.key} role="menuitem" href={href} onClick={() => setFly(null)} aria-current={pathname === href ? "page" : undefined} className={`block px-4 py-1.5 text-[13px] hover:bg-slate-50 ${pathname === href ? "font-semibold text-slate-900" : "text-slate-800"}`}>{sec.label}</Link>; })}
              </div>
            )}
            <UserMenu name={ctx.me.parent.name} email={ctx.me.parent.parent_id || ctx.user.email} role={ctx.me.line} compact={slim} />
          </aside>
          {navOpen && <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
          <div className={`min-w-0 flex-1 ${assistOpen ? "lg:pr-[var(--assist-w,460px)]" : ""}`}>
            <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-slate-200 bg-[#f3f5f7]/90 px-4 py-3 backdrop-blur sm:px-6">
              <button type="button" aria-label="Open menu" aria-controls="portal-sidebar" aria-expanded={navOpen} className="mr-auto rounded-lg border border-slate-200 bg-white p-2 text-slate-700 sm:mr-0 lg:hidden" onClick={() => setNavOpen(true)}><Menu className="h-4 w-4" aria-hidden="true" /></button>
              <Breadcrumb />
              <ParentSearch />
              <ParentBell />
            </header>
            <main className="mx-auto max-w-6xl p-6">{children}</main>
          </div>
        </div>
        {ctx.hasModule("school_assistant") && <Assist scope="parent" push onOpenChange={setAssistOpen} nav={{ menu: Object.fromEntries(modules), href: sectionHref }} guide={guide} />}
        <RecordPage portal="parent" home="/parent" />
        <ReportHost />
      </SchoolContext.Provider>
    </ParentContext.Provider>
  );
}
