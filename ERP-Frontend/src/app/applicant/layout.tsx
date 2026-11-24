"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useScrollActive } from "@/components/admin/use-scroll-active";
import { useDragWidth } from "@/components/admin/use-drag-width";
import { Menu, X, PanelLeftClose, PanelLeftOpen, ChevronDown, CircleCheck, ClipboardList, FileText, IndianRupee, LayoutDashboard, MessageSquare, School, Upload, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Assist } from "@/components/admin/assist";
import { ReportHost } from "@/components/admin/report-host";
import { RecordPage } from "@/components/admin/quick-actions";
import { MENU, sectionHref } from "./m/menu-config";
import { supabase } from "@/lib/supabase/client";
import { fetchServerUser, homePathFor, type ServerUser } from "@/lib/api";
import { schoolFetch } from "@/lib/school-api";
import { UserMenu } from "./user-menu";
import { ApplicantContext, type FamilyApp } from "./context";
import { ApplicantBell, ApplicantSearch, Breadcrumb } from "./topbar";

const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, school: School, enquiry: Landmark, application: FileText, documents: Upload, assessment: ClipboardList, fees: IndianRupee, messages: MessageSquare };
void CircleCheck;

export default function ApplicantLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useScrollActive(pathname);
  const [user, setUser] = useState<ServerUser | null>(null);
  const [me, setMe] = useState<{ name: string; line: string; school: { name: string; code: string }; badges: { documents: number; unread: number } } | null>(null);
  const [apps, setApps] = useState<FamilyApp[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => { try { return typeof window !== "undefined" ? localStorage.getItem("applicant-active") : null; } catch { return null; } });
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

  const refreshBadges = useCallback(() => {
    schoolFetch<NonNullable<typeof me>>("/applicant/me").then((r) => setMe(r), () => undefined);
  }, []);
  const reloadApps = useCallback(() => {
    schoolFetch<{ items: FamilyApp[] }>("/applicant/applications").then((r) => setApps(r.items), () => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      try {
        const u = await fetchServerUser(data.session.access_token);
        if (!live) return;
        if (u.mustChangePassword) return router.replace("/change-password");
        if (homePathFor(u) !== "/applicant") return router.replace(homePathFor(u));
        const r = await schoolFetch<NonNullable<typeof me>>("/applicant/me");
        if (!live) return;
        setMe(r); setUser(u); reloadApps();
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Access check failed.");
      }
    })();
    return () => { live = false; };
  }, [router, reloadApps]);
  useEffect(() => { const t = setInterval(refreshBadges, 60_000); return () => clearInterval(t); }, [refreshBadges]);

  const active = apps.find((a) => a.id === activeId) ?? apps.find((a) => !a.draft) ?? apps[0] ?? null;
  const setActive = useCallback((id: string) => { setActiveId(id); try { localStorage.setItem("applicant-active", id); } catch { /* storage unavailable */ } }, []);
  const line = active ? `Applying for ${active.child.split(" ")[0]} · ${active.class_sought.replace(/\s*·.*$/, "")}` : me?.line ?? "";
  const ctx = useMemo(() => (user && me ? { user, school: me.school, name: me.name || user.fullName || user.email, line, apps, active, setActive, reloadApps, hasModule: (m: string) => (user.modules ?? []).includes(m), badges: me.badges, refreshBadges } : null), [user, me, line, apps, active, setActive, reloadApps, refreshBadges]);

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
  // the portal is the school's online admissions: without it in the plan there is nothing to open
  if (!ctx.hasModule("online_admissions")) return <div className="flex min-h-screen items-center justify-center p-6"><p className="max-w-sm text-center text-sm text-slate-700">Online admissions are not part of this school&apos;s plan. Please contact the school&apos;s admissions office.</p></div>;
  const modules = Object.entries(MENU);
  return (
    <ApplicantContext.Provider value={ctx}>
      <div className="min-h-screen bg-mca-cloud lg:flex">
        <aside id="portal-sidebar" aria-label="Main" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setNavOpen(false); }} style={{ "--sbw": `${sbW}px` } as CSSProperties} className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,86vw)] flex-col bg-[#dceff9] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${slim ? "lg:w-[68px]" : "lg:w-[var(--sbw)]"} ${navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
          <button type="button" aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-600 hover:bg-white/60 lg:hidden" onClick={() => setNavOpen(false)}><X className="size-5" aria-hidden="true" /></button>
          <div role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize" onPointerDown={beginSb} onDoubleClick={resetSb} className="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize hover:bg-[#0294CE]/30 lg:block" />
          <div className={`px-5 pb-3 pt-5 ${slim ? "lg:px-4" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="flex items-start justify-between gap-2"><div className="leading-[0]"><img src="/mca-logo.svg" alt="My Class Assist" style={{ width: 112, height: "auto" }} className={slim ? "lg:hidden" : ""} /><img src="/mca-mark.svg" alt="" className={`hidden size-8 ${slim ? "lg:block" : ""}`} /></div><button type="button" onClick={toggleSlim} aria-label={slim ? "Open sidebar" : "Close sidebar"} title={slim ? "Open sidebar" : "Close sidebar"} className="absolute -right-3.5 top-7 z-30 hidden size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-[#0294CE] lg:flex">{slim ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}</button></div>
            <p className={`mt-2 truncate text-[13px] font-semibold text-slate-900 ${slim ? "lg:hidden" : ""}`}>{ctx.school.name}</p>
            <p className={`text-[11px] font-medium uppercase tracking-wide text-[#026f9b] ${slim ? "lg:hidden" : ""}`}>Applicant portal · Families</p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {modules.map(([key, mod], idx, all) => {
              const inside = pathname.startsWith(`/applicant/${key}`) || (key === "dashboard" && pathname === "/applicant");
              const ModIcon = ICONS[key] ?? LayoutDashboard;
              const open = pick && pick.at === (pathname.split("/")[2] ?? "") ? pick.key === key : inside;
              const heading = idx === 0 || all[idx - 1][1].group !== mod.group ? mod.group : "";
              const badge = key === "documents" ? ctx.badges.documents : 0;
              return (
                <div key={key}>
                  {heading && <p className={`px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#026f9b] ${slim ? "lg:hidden" : ""}`}>{heading}</p>}
                  <button type="button" aria-expanded={open} title={mod.label} onClick={(e) => { if (slim && window.matchMedia("(min-width: 1024px)").matches) { const r = e.currentTarget.getBoundingClientRect(); setFly(fly?.key === key ? null : { key, top: r.top }); return; } setPick({ at: pathname.split("/")[2] ?? "", key: open ? null : key }); }}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-[13.5px] ${slim ? "lg:justify-center lg:px-0" : ""} ${inside ? "font-bold text-slate-900" : "font-medium text-slate-800 hover:bg-white/50"}`}>
                    <ModIcon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className={`flex-1 ${slim ? "lg:hidden" : ""}`}>{mod.label}</span>
                    {badge > 0 && <span className={`grid min-w-[18px] place-items-center rounded-full bg-white px-1 text-[11px] font-bold leading-[18px] text-[#e53a35] ${slim ? "lg:hidden" : ""}`}>{badge}</span>}
                    <ChevronDown className={`size-3.5 opacity-70 transition-transform ${slim ? "lg:hidden" : ""} ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {open && (
                    <div className={`ml-[19px] mt-0.5 flex flex-col gap-px border-l-2 border-[#026f9b]/25 pl-2.5 ${slim ? "lg:hidden" : ""}`}>
                      {mod.sections.map((sec) => {
                        const href = sectionHref(key, sec.key);
                        const on = pathname === href || (key === "dashboard" && pathname === "/applicant");
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
              {MENU[fly.key].sections.map((sec) => { const href = sectionHref(fly.key, sec.key); return <Link key={sec.key} role="menuitem" href={href} onClick={() => setFly(null)} aria-current={pathname === href ? "page" : undefined} className={`block px-4 py-1.5 text-[13px] hover:bg-slate-50 ${pathname === href ? "font-semibold text-slate-900" : "text-slate-800"}`}>{sec.label}</Link>; })}
            </div>
          )}
          <UserMenu name={ctx.name} email={ctx.user.email} role={ctx.line} compact={slim} />
        </aside>
        {navOpen && <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <div className={`min-w-0 flex-1 ${assistOpen ? "lg:pr-[var(--assist-w,460px)]" : ""}`}>
          <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-slate-200 bg-[#f3f5f7]/90 px-4 py-3 backdrop-blur sm:px-6">
            <button type="button" aria-label="Open menu" aria-controls="portal-sidebar" aria-expanded={navOpen} className="mr-auto rounded-lg border border-slate-200 bg-white p-2 text-slate-700 sm:mr-0 lg:hidden" onClick={() => setNavOpen(true)}><Menu className="size-4" aria-hidden="true" /></button>
            <Breadcrumb />
            <ApplicantSearch />
            <ApplicantBell />
          </header>
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </div>
      </div>
      {ctx.hasModule("school_assistant") && <Assist scope="applicant" push onOpenChange={setAssistOpen} nav={{ menu: Object.fromEntries(modules), href: sectionHref }} guide={modules.map(([k, m]) => [m.label, ...m.sections.map((s) => `  ${s.label} (${sectionHref(k, s.key)}): ${s.pages.map((p) => p.title).join("; ")}`)].join(String.fromCharCode(10))).join(String.fromCharCode(10)).slice(0, 5800)} />}
      <RecordPage portal="applicant" home="/applicant" />
      <ReportHost />
    </ApplicantContext.Provider>
  );
}
