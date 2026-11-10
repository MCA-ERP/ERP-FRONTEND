"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Building2, ChevronDown, ChevronUp, Clock, FileBarChart, Headphones, HelpCircle, KeyRound, LayoutDashboard, LayoutTemplate, Landmark, Lock, LogOut, Menu,
  MessageSquare, Plug, Puzzle, Repeat, ShieldCheck, SlidersHorizontal, User as UserIcon, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, type ServerUser } from "@/lib/api";
import { adminFetch } from "@/lib/admin-api";
import { setLocaleConfig } from "@/lib/locale-format";
import { useSignOut } from "@/components/logout";
import { GlobalSearch, NotificationBell } from "@/components/admin/topbar";

/** `area` is the platform permission area; an item shows when the person may view it. */
interface Child { href: string; label: string; area?: string }
interface Item { href: string; label: string; icon: LucideIcon; area: string; children?: Child[]; badge?: "schools" | "support"; group?: string }

const NAV: Item[] = [
  { group: "Overview", href: "/admin", label: "Dashboard", icon: LayoutDashboard, area: "dashboard", children: [
    { href: "/admin", label: "Platform overview" },
    { href: "/admin/dashboard/schools", label: "School statistics" },
    { href: "/admin/dashboard/users", label: "User statistics" },
    { href: "/admin/dashboard/subscriptions", label: "Subscription statistics" },
    { href: "/admin/dashboard/revenue", label: "Revenue analytics", area: "payments" },
  ] },
  { group: "Schools & plans", href: "/admin/schools", label: "School Management", icon: Building2, area: "schools", badge: "schools", children: [
    { href: "/admin/schools", label: "All schools" },
    { href: "/admin/schools/applications", label: "Applications" },
    { href: "/admin/schools/approval", label: "Approval" },
    { href: "/admin/schools/campuses", label: "Campuses" },
  ] },
  { href: "/admin/subscriptions", label: "Subscription Management", icon: Repeat, area: "subscriptions" },
  { href: "/admin/modules", label: "Module Management", icon: Puzzle, area: "modules" },
  { group: "People & access", href: "/admin/users", label: "User Management", icon: Users, area: "users" },
  { href: "/admin/roles", label: "Role & Permissions", icon: ShieldCheck, area: "roles", children: [
    { href: "/admin/roles", label: "Roles & permissions" },
    { href: "/admin/platform-access", label: "Platform access" },
  ] },
  { group: "Operations", href: "/admin/payments", label: "Payment Management", icon: Landmark, area: "payments" },
  { href: "/admin/support", label: "Support Management", icon: Headphones, area: "support", badge: "support" },
  { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3, area: "reports" },
  { group: "Outreach", href: "/admin/communication", label: "Communication", icon: MessageSquare, area: "communication" },
  { href: "/admin/website", label: "Website / CMS", icon: LayoutTemplate, area: "cms" },
  { group: "Platform", href: "/admin/integrations", label: "Integration Management", icon: Plug, area: "integrations" },
  { href: "/admin/security", label: "Security & Audit", icon: Lock, area: "security", children: [
    { href: "/admin/security", label: "Security & audit" },
    { href: "/admin/audit-logs", label: "Audit logs" },
  ] },
  { href: "/admin/settings", label: "System Settings", icon: SlidersHorizontal, area: "settings" },
];
void FileBarChart;

const matches = (pathname: string, href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
/** The most specific link that fits the address, so a child does not also light up its parent's other links. */
const bestOf = (pathname: string, hrefs: string[]) => hrefs.filter((h) => matches(pathname, h)).sort((a, b) => b.length - a.length)[0] ?? null;

/** Platform staff: SuperAdmin, or a user with no school who holds at least one platform permission. */
function isPlatformStaff(u: ServerUser) {
  return u.role === "SuperAdmin" || (!u.institutionId && (u.permissions ?? []).some((p) => p.startsWith("platform.")));
}

const initials = (u: ServerUser) => {
  const src = u.fullName?.trim() || u.email.split("@")[0].replace(/[._-]+/g, " ");
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ServerUser | null>(null);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [badges, setBadges] = useState<{ schools: number; support: number }>({ schools: 0, support: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut, busy: signingOut } = useSignOut();
  const [supportEmail, setSupportEmail] = useState("");
  useEffect(() => {
    fetch(`${API_BASE}/public/branding`).then((r) => r.json()).then((b) => { setSupportEmail(String(b.support_email ?? "")); setLocaleConfig(b.locale); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        const me = await fetchServerUser(data.session.access_token);
        if (!live) return;
        if (me.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
        if (!isPlatformStaff(me)) {
          router.replace("/school");
          return;
        }
        setUser(me);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Access check failed.");
      }
    })();
    return () => {
      live = false;
    };
  }, [router]);

  const can = (area: string) => !!user && (user.role === "SuperAdmin" || (user.permissions ?? []).includes(`platform.${area}.view`));

  // counts shown next to Schools (waiting for approval) and Support (open tickets); refreshed every minute
  useEffect(() => {
    if (!user) return;
    let live = true;
    const load = async () => {
      const [s, t] = await Promise.all([
        can("schools") ? adminFetch<{ counts: { pending: number } }>("/schools?pageSize=1").catch(() => null) : null,
        can("support") ? adminFetch<{ counts: { open: number } }>("/support/tickets?pageSize=1").catch(() => null) : null,
      ]);
      if (live) setBadges({ schools: s?.counts.pending ?? 0, support: t?.counts.open ?? 0 });
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => { live = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // close the mobile menu and the profile menu when moving around
  useEffect(() => { setNavOpen(false); setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [menuOpen]);

  const items = useMemo(
    () => (user ? NAV.filter((i) => can(i.area)).map((i) => ({ ...i, children: i.children?.filter((c) => can(c.area ?? i.area)) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  // breadcrumb: where the current address sits in the menu
  const crumbs = useMemo(() => {
    for (const i of items) {
      const kids = i.children ?? [];
      const hit = bestOf(pathname, [i.href, ...kids.map((k) => k.href)]);
      if (!hit) continue;
      const kid = kids.find((k) => k.href === hit);
      return kid && kid.label !== i.label ? [i.label, kid.label] : [i.label];
    }
    if (pathname.startsWith("/admin/account")) return ["My account"];
    return [];
  }, [items, pathname]);

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

  if (!user) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Checking access…</div>;

  const allHrefs = items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]);
  const current = bestOf(pathname, allHrefs);

  const sidebar = (
    <aside
      id="admin-sidebar"
      aria-label="Main"
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,86vw)] flex-col bg-[#dceff9] text-slate-900 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:translate-x-0 ${navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
    >
      <div className="flex items-start justify-between px-[18px] pb-3.5 pt-5">
        <div className="flex flex-col gap-2.5">
          <Link href="/admin" aria-label="My Class Assist, Super Admin home" className="inline-block leading-[0]">
            <Image src="/mca-logo.svg" alt="My Class Assist" width={132} height={74} priority style={{ width: "132px", height: "auto" }} />
          </Link>
          <p className="text-xs font-semibold text-slate-900">Super Admin · Portal 01</p>
        </div>
        <button type="button" aria-label="Close menu" className="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 lg:hidden" onClick={() => setNavOpen(false)}><X className="size-5" aria-hidden="true" /></button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-4 pt-1">
        {items.map((item) => {
          const kids = item.children;
          const Icon = item.icon;
          const hrefs = [item.href, ...(kids?.map((k) => k.href) ?? [])];
          const inGroup = hrefs.includes(current ?? "");
          const onParent = !kids?.length && current === item.href;
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <div key={item.href} className="flex flex-col gap-0.5">
              {item.group && <p className="px-2.5 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#026f9b]">{item.group}</p>}
              <Link
                href={item.href}
                aria-current={onParent ? "page" : undefined}
                aria-expanded={kids?.length ? inGroup : undefined}
                className={`flex items-center gap-[11px] rounded-full px-2.5 py-2 text-[13.5px] transition ${onParent ? "bg-white font-semibold shadow-[0_1px_2px_rgba(2,111,155,0.12)]" : "font-medium hover:bg-[#0294ce]/10"} ${inGroup ? "font-bold" : ""}`}
              >
                <Icon className={`size-[18px] shrink-0 ${onParent ? "text-[#026f9b]" : ""}`} strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                {count > 0 && <span className="rounded-full bg-white px-[7px] text-[11px] font-bold leading-[18px] text-[#ac2c28]" aria-label={`${count} waiting`}>{count}</span>}
                {kids?.length ? <ChevronDown className={`size-3.5 shrink-0 opacity-70 transition-transform ${inGroup ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden="true" /> : null}
              </Link>
              {kids?.length && inGroup ? (
                <div className="my-0.5 ml-[19px] flex flex-col gap-px border-l-2 border-[#026f9b]/25 pl-2.5">
                  {kids.map((k) => {
                    const on = current === k.href;
                    return (
                      <Link key={k.href} href={k.href} aria-current={on ? "page" : undefined}
                        className={`rounded-full px-2.5 py-1.5 text-[13px] transition ${on ? "bg-white font-semibold shadow-[0_1px_2px_rgba(2,111,155,0.12)]" : "font-medium hover:bg-[#0294ce]/10"}`}>
                        {k.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div ref={menuRef} className="relative border-t border-[#c0e4f3] px-[18px] py-3.5">
        {menuOpen && (
          <div role="menu" aria-label="Your account" className="absolute inset-x-3 bottom-[calc(100%-4px)] max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dceff9] text-xs font-bold text-[#026f9b]">{initials(user)}</span>
              <span className="min-w-0"><b className="block truncate text-sm font-semibold text-slate-900">{user.fullName?.trim() || user.email.split("@")[0]}</b><span className="block truncate text-xs text-slate-500">{user.email}</span></span>
            </div>
            <div className="my-1 border-t border-slate-100" />
            {[
              { href: "/admin/account?tab=profile", label: "My profile", icon: UserIcon },
              { href: "/admin/account?tab=password", label: "Change password", icon: KeyRound },
              { href: "/admin/account?tab=2fa", label: "Two-factor authentication", icon: ShieldCheck },
              { href: "/admin/account?tab=activity", label: "My login activity", icon: Clock },
              ...(can("settings") ? [{ href: "/admin/settings", label: "System settings", icon: SlidersHorizontal }] : []),
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
                <Icon className="size-4 shrink-0 text-[#026f9b]" aria-hidden="true" />{label}
              </Link>
            ))}
            <a role="menuitem" href={supportEmail ? `mailto:${supportEmail}` : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
              <HelpCircle className="size-4 shrink-0 text-[#026f9b]" aria-hidden="true" />Help &amp; support
            </a>
            <div className="my-1 border-t border-slate-100" />
            <button type="button" role="menuitem" disabled={signingOut} onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#ac2c28] hover:bg-rose-50 disabled:opacity-60">
              <LogOut className="size-4 shrink-0" aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
        <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-xl text-left text-[12.5px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0294ce]/30">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#026f9b]">{initials(user)}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-sm font-semibold text-slate-900">{user.fullName?.trim() || user.email.split("@")[0]}</b>
            <span className="block truncate text-slate-800">{user.roleDisplayName ?? user.role}</span>
          </span>
          <ChevronUp className={`size-4 shrink-0 transition-transform ${menuOpen ? "" : "rotate-180"}`} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f7] lg:flex">
      {sidebar}
      {navOpen && <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-[#f3f5f7]/90 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" aria-label="Open menu" aria-controls="admin-sidebar" aria-expanded={navOpen} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 lg:hidden" onClick={() => setNavOpen(true)}>
            <Menu className="size-4" aria-hidden="true" />
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-sm text-slate-500">
            Super Admin{crumbs.map((c, i) => <span key={c}> › {i === crumbs.length - 1 ? <b className="font-semibold text-slate-900">{c}</b> : c}</span>)}
          </nav>
          <GlobalSearch />
          <NotificationBell />
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
