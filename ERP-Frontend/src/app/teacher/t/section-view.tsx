"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { MENU, MENU_MODULES } from "./menu-config";
import { useTeacher } from "../context";
import { HeadSlot } from "./head";
import { renderPage } from "./registry";

/** One submenu of the Teacher sidebar: the heading line, the page's own title (drawn by the page), its tabs, and the screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  const teacher = useTeacher();
  if (!mod || !sec) notFound();
  if (MENU_MODULES[module] && !MENU_MODULES[module].some((m) => teacher.hasModule(m))) return <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{mod.label} is not part of your school&apos;s plan. Ask your administrator to add this module.</p>;
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} sectionKey={sec.key} sectionLabel={sec.label} pages={sec.pages} /></Suspense>;
}

function Body({ module, moduleLabel, sectionKey, sectionLabel, pages }: { module: string; moduleLabel: string; sectionKey: string; sectionLabel: string; pages: { key: string; title: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const wanted = params.get("tab");
  const [tab, setTabState] = useState(pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const page = pages.find((p) => p.key === tab) ?? pages[0];
  const setTab = (t: string) => { setTabState(t); router.replace(`/teacher/${module}/${sectionKey}?tab=${t}`, { scroll: false }); };
  return (
    <HeadSlot.Provider value={slot}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <div ref={setSlot} />
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      {renderPage(module, sectionKey, page.key, setTab) ?? <><div className="mb-6"><h1 className="text-2xl text-slate-900">{sectionLabel === "Overview" ? moduleLabel : sectionLabel}</h1></div><p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p></>}
    </HeadSlot.Provider>
  );
}

/** The route of /teacher/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
