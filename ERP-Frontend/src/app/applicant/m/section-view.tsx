"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { HeadSlot } from "../../teacher/t/head";
import { useApplicant } from "../context";
import { MENU } from "./menu-config";
import { renderPage } from "./registry";

/** One submenu of the Applicant sidebar: the heading line, the page's own title (drawn by the page), its tabs, and the screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  if (!mod || !sec) notFound();
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} sectionKey={sec.key} sectionLabel={sec.label} pages={sec.pages} /></Suspense>;
}

function Body({ module, moduleLabel, sectionKey, sectionLabel, pages }: { module: string; moduleLabel: string; sectionKey: string; sectionLabel: string; pages: { key: string; title: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const a = useApplicant();
  const wanted = params.get("tab");
  const tab = pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key; // follows the address, so the bell and links can switch tabs on the same page
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const setTab = (t: string) => { const q = new URLSearchParams(params.toString()); q.set("tab", t); router.replace(`/applicant/${module}/${sectionKey}?${q.toString()}`, { scroll: false }); };
  return (
    <HeadSlot.Provider value={slot}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <div ref={setSlot} />
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      {a.apps.length > 1 && ["dashboard", "documents", "assessment", "fees"].includes(module) && (
        <label className="mb-4 flex items-center gap-2 text-[12.5px] text-slate-600">Showing
          <select className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-900" value={a.active?.id ?? ""} onChange={(e) => a.setActive(e.target.value)}>{a.apps.map((x) => <option key={x.id} value={x.id}>{x.child} · {x.class_sought}</option>)}</select>
        </label>
      )}
      {renderPage(module, sectionKey, tab, setTab) ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}
    </HeadSlot.Provider>
  );
}

/** The route of /applicant/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
