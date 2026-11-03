"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Building2, ClipboardList, CreditCard, LayoutDashboard, Puzzle, ShieldCheck, Users, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchServerUser, type ServerUser } from "@/lib/api";
import LogoutButton from "@/components/logout";

const nav = [
  { group: "Dashboard", items: [
    { href: "/admin", label: "Platform overview", icon: LayoutDashboard },
    { href: "/admin/dashboard/schools", label: "School statistics", icon: BarChart3 },
    { href: "/admin/dashboard/users", label: "User statistics", icon: UsersRound },
    { href: "/admin/dashboard/subscriptions", label: "Subscription statistics", icon: CreditCard },
  ] },
  { group: "Manage", items: [
    { href: "/admin/schools", label: "Schools", icon: Building2 },
    { href: "/admin/modules", label: "Modules", icon: Puzzle },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
  ] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ServerUser | null>(null);
  const [error, setError] = useState("");

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
        if (me.role !== "SuperAdmin") {
          router.replace("/dashboard");
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="mb-4 text-sm text-rose-700">{error}</p>
          <Link href="/login" className="text-sm font-semibold text-mca-blue">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-mca-cloud lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mca-logo.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="text-sm font-extrabold text-slate-900">My Class Assist</p>
            <p className="text-xs text-slate-500">Admin Portal</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {nav.map(({ group, items }) => (
            <div key={group} className="flex gap-1 lg:flex-col">
              <p className="hidden px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-mca-blue-shade lg:block">{group}</p>
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-semibold text-slate-800">{user.email}</span>
          </p>
          <LogoutButton />
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
