"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Award, BarChart3, BedDouble, Briefcase, Bus, CalendarCheck, ChevronDown, ClipboardCheck, Clock, FileText, GraduationCap, HeartPulse, IndianRupee, Landmark, LayoutDashboard, Library, MessageSquare, Monitor, Package, Settings, ShieldCheck, Trophy, UserRound, Users, UsersRound, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReportHost } from "@/components/admin/report-host";
import { Assist } from "@/components/admin/assist";
import { BUILT, GROUP, MENU, sectionHref } from "./s/menu-config";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, getAuthHeaders, homePathFor, type ServerUser } from "@/lib/api";
import { UserMenu } from "./user-menu";
import { SchoolContext } from "./context";

const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, profile: UserRound, mywork: Briefcase, "front-office": Landmark, admission: FileText, students: Users, parents: UsersRound, academics: GraduationCap, attendance: CalendarCheck, timetable: Clock, examinations: ClipboardCheck, lms: Monitor, fees: IndianRupee, hr: Briefcase, payroll: Wallet, transport: Bus, library: Library, inventory: Package, communication: MessageSquare, hostel: BedDouble, visitors: ShieldCheck, health: HeartPulse, certificates: Award, activities: Trophy, reports: BarChart3, settings: Settings };

export default function SchoolLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ServerUser | null>(null);
  const [school, setSchool] = useState<{ name: string; code: string } | null>(null);
  const [error, setError] = useState("");
  const [shut, setShut] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      try {
        const me = await fetchServerUser(data.session.access_token);
        if (!live) return;
        if (me.mustChangePassword) return router.replace("/change-password");
        if (homePathFor(me) === "/super-admin") return router.replace("/super-admin");

        const res = await fetch(`${API_BASE}/institution`, { headers: await getAuthHeaders(), cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not load your school.");
        if (!live) return;
        setSchool({ name: body.institution.name, code: body.institution.code });
        setUser(me);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Access check failed.");
      }
    })();
    return () => {
      live = false;
    };
  }, [router]);

  const ctx = useMemo(
    () =>
      user && school
        ? {
            user,
            school,
            can: (p: string) => user.role === "SuperAdmin" || (user.permissions ?? []).includes(p),
            hasModule: (m: string) => user.role === "SuperAdmin" || (user.modules ?? []).includes(m),
          }
        : null,
    [user, school]
  );

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
  if (!ctx) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading your school…</div>;

  return (
    <SchoolContext.Provider value={ctx}>
      <div className="min-h-screen bg-mca-cloud lg:flex">
        <aside className="border-b border-sky-100 bg-[#dceff9] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0">
          <div className="px-5 pb-3 pt-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mca-logo.svg" alt="My Class Assist" className="h-14 w-auto" />
            <p className="mt-2 truncate text-[13px] font-semibold text-slate-900">{ctx.school.name}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#026f9b]">{ctx.user.roleDisplayName ?? ctx.user.role}</p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
            {Object.entries(MENU).filter(([k]) => BUILT.has(k)).map(([key, mod], idx, all) => {
              const inside = key === "dashboard" ? pathname === "/school" || pathname.startsWith("/school/dashboard") : pathname.startsWith(`/school/${key}`);
              const ModIcon = ICONS[key] ?? LayoutDashboard;
              const open = shut[key] === undefined ? inside : !shut[key];
              const heading = idx === 0 || GROUP[all[idx - 1][0]] !== GROUP[key] ? GROUP[key] : "";
              return (
                <div key={key}>
                  {heading && <p className="px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#026f9b]">{heading}</p>}
                  <button type="button" aria-expanded={open} onClick={() => setShut({ ...shut, [key]: open })}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-[13.5px] ${inside ? "font-bold text-slate-900" : "font-medium text-slate-800 hover:bg-white/50"}`}>
                    <ModIcon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1">{mod.label}</span>
                    <ChevronDown className={`size-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {open && (
                    <div className="ml-[19px] mt-0.5 flex flex-col gap-px border-l-2 border-[#026f9b]/25 pl-2.5">
                      {mod.sections.map((sec) => {
                        const href = sectionHref(key, sec.key);
                        const on = pathname === href;
                        return <Link key={sec.key} href={href} aria-current={on ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] ${on ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-800 hover:bg-white/50"}`}>{sec.label}</Link>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <UserMenu name={ctx.user.fullName ?? ctx.user.email} email={ctx.user.email} role={ctx.user.roleDisplayName ?? ctx.user.role} />
        </aside>
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </div>
      </div>
      <ReportHost />
      <Assist scope="school" />
    </SchoolContext.Provider>
  );
}
