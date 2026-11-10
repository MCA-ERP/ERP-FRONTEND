"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { GraduationCap, LayoutDashboard, LifeBuoy, ReceiptText, Settings2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, getAuthHeaders, homePathFor, type ServerUser } from "@/lib/api";
import LogoutButton from "@/components/logout";
import { SchoolContext } from "./context";

const nav = [
  { href: "/school", label: "Home", icon: LayoutDashboard },
  { href: "/school/setup", label: "Academic setup", icon: Settings2, permission: "academics.setup.manage" },
  { href: "/school/students", label: "Students", icon: GraduationCap, module: "student_information" },
  { href: "/school/billing", label: "Billing", icon: ReceiptText, permission: "admin.settings.manage" },
  { href: "/school/support", label: "Support", icon: LifeBuoy, permission: "academics.setup.manage" },
  { href: "/school/help", label: "Help centre", icon: BookOpen },
];

export default function SchoolLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ServerUser | null>(null);
  const [school, setSchool] = useState<{ name: string; code: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      try {
        const me = await fetchServerUser(data.session.access_token);
        if (!live) return;
        if (me.mustChangePassword) return router.replace("/change-password");
        if (homePathFor(me) === "/admin") return router.replace("/admin");

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

  const items = nav.filter((n) => (!n.permission || ctx.can(n.permission)) && (!n.module || ctx.hasModule(n.module)));

  return (
    <SchoolContext.Provider value={ctx}>
      <div className="min-h-screen bg-mca-cloud lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mca-logo.svg" alt="" className="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{ctx.school.name}</p>
              <p className="text-xs text-slate-500">{ctx.user.roleDisplayName ?? ctx.user.role}</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            {items.map(({ href, label, icon: Icon }) => {
              const active = href === "/school" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-mca-blue-sky text-mca-blue-shade" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
            <p className="text-sm text-slate-500">
              Signed in as <span className="font-semibold text-slate-800">{ctx.user.email}</span>
            </p>
            <LogoutButton />
          </header>
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </div>
      </div>
    </SchoolContext.Provider>
  );
}
