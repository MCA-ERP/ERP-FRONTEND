"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Building2, FileText, LifeBuoy, Search, User } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

interface Hit { type: "school" | "invoice" | "ticket" | "user"; id: string; title: string; subtitle: string; href: string }
interface Alert { key: string; severity: "critical" | "warning" | "info"; title: string; detail: string; count: number; href: string }

const ICON = { school: Building2, invoice: FileText, ticket: LifeBuoy, user: User } as const;
const LABEL = { school: "Schools", invoice: "Invoices", ticket: "Tickets", user: "People" } as const;

/** Closes a popover on an outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open, close]);
  return ref;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await adminFetch<{ hits: Hit[] }>(`/search?q=${encodeURIComponent(q.trim())}`);
        setHits(r.hits);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };
  const groups = (Object.keys(LABEL) as (keyof typeof LABEL)[]).map((t) => [t, hits.filter((h) => h.type === t)] as const).filter(([, l]) => l.length);

  return (
    <div ref={ref} className="relative hidden w-72 max-w-[40vw] md:block">
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-within:border-[#41afda] focus-within:ring-2 focus-within:ring-[#41afda]/25">
        <Search className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="search" value={q} placeholder="Search schools, invoices, tickets" aria-label="Search schools, invoices, tickets"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0]); }}
        />
      </label>
      {open && q.trim().length >= 2 && (
        <div role="listbox" aria-label="Search results" className="absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-[26rem] max-w-[90vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Searching…</p>}
          {!loading && !hits.length && <p className="px-3 py-3 text-sm text-slate-400">Nothing found for “{q.trim()}”.</p>}
          {groups.map(([type, list]) => {
            const Icon = ICON[type];
            return (
              <div key={type}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{LABEL[type]}</p>
                {list.map((h) => (
                  <button key={type + h.id} type="button" role="option" aria-selected="false" onClick={() => go(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                    <Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{h.title}</span><span className="block truncate text-xs text-slate-500">{h.subtitle}</span></span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DOT = { critical: "bg-rose-500", warning: "bg-amber-500", info: "bg-mca-blue" } as const;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ alerts: Alert[]; total: number } | null>(null);
  const ref = useDismiss(open, () => setOpen(false));

  useEffect(() => {
    let live = true;
    const load = () => adminFetch<{ alerts: Alert[]; total: number }>("/notifications").then((r) => live && setData(r), () => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const total = data?.total ?? 0;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={total ? `Notifications, ${total} need attention` : "Notifications"} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#41afda]/30">
        <Bell className="size-[18px]" aria-hidden="true" />
        {total > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#f3f5f7] bg-[#e53a35] px-1 text-[11px] font-bold leading-4 text-white">{total}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-1.5 w-[22rem] max-w-[92vw] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <p className="px-3 pb-1 pt-2 text-sm font-bold text-slate-900">Needs your attention</p>
          {!data && <p className="px-3 py-4 text-sm text-slate-400">Loading…</p>}
          {data && !data.alerts.length && <p className="px-3 py-4 text-sm text-slate-500">Nothing needs attention right now.</p>}
          <ul className="max-h-[60vh] overflow-y-auto">
            {data?.alerts.map((a) => (
              <li key={a.key}>
                <Link href={a.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[a.severity]}`} aria-hidden="true" />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{a.title}</span><span className="block text-xs text-slate-500">{a.detail}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">This list is worked out from live data, so an item disappears once it is dealt with.</p>
        </div>
      )}
    </div>
  );
}
