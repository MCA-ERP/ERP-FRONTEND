"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { HeadSlot } from "../../teacher/t/head";
import { useParent } from "../context";
import { MENU, allowedMenu, sectionHref } from "./menu-config";
import { renderPage } from "./registry";

/** One submenu of the Parent sidebar: the heading line, the page's own title, its tabs, and the screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const a = useParent();
  const full = MENU[module]?.sections.find((s) => s.key === section);
  if (!full) notFound();
  const mod = allowedMenu(a.hasModule).find(([k]) => k === module)?.[1];
  const sec = mod?.sections.find((s) => s.key === section);
  if (!mod || !sec) return <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{full.label} is not part of your school&apos;s plan. Please contact the school office.</p>;
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} sectionKey={sec.key} sectionLabel={sec.label} pages={sec.pages} /></Suspense>;
}

function Body({ module, moduleLabel, sectionKey, sectionLabel, pages }: { module: string; moduleLabel: string; sectionKey: string; sectionLabel: string; pages: { key: string; title: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { child } = useParent();
  const wanted = params.get("tab");
  const tab = pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key; // follows the address, so links can switch tabs on the same page
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const setTab = (t: string) => router.replace(sectionHref(module, sectionKey, t), { scroll: false });
  return (
    <HeadSlot.Provider value={slot}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <div ref={setSlot} />
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      {/* the screen is drawn afresh for another child, so a half-filled form never moves from one child to the other */}
      <Fragment key={`${tab}:${child?.id ?? ""}`}>{renderPage(module, sectionKey, tab, setTab) ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}</Fragment>
    </HeadSlot.Provider>
  );
}

/** The route of /parent/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
