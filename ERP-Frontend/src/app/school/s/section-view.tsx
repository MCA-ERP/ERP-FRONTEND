"use client";

import { notFound, useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { BUILT, MENU, MENU_MODULES, PAGE_CTA, PAGE_TEXT } from "./menu-config";
import { useSchool } from "../context";
import { renderPage } from "./registry";
import { TabContext } from "./tab-context";

const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One submenu of the School sidebar: its header, its pages as tabs, and the working screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  const school = useSchool();
  if (!mod || !sec || !BUILT.has(module)) notFound();
  if (MENU_MODULES[module] && !MENU_MODULES[module].some((m) => school.hasModule(m))) return <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{mod.label} is not part of your school&apos;s plan. Ask your administrator to upgrade or add this module.</p>;
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} flow={mod.flow} sectionKey={sec.key} sectionLabel={sec.label} pages={sec.pages} /></Suspense>;
}

function Body({ module, moduleLabel, flow, sectionKey, sectionLabel, pages }: { module: string; moduleLabel: string; flow?: string; sectionKey: string; sectionLabel: string; pages: { key: string; title: string }[] }) {
  const params = useSearchParams();
  const wanted = params.get("tab");
  const [tab, setTab] = useState(pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key);
  const page = pages.find((p) => p.key === tab) ?? pages[0];
  const text = PAGE_TEXT[`${module}/${sectionKey}`]?.[page.key];
  const body = renderPage(module, sectionKey, page.key);
  const router = useRouter();
  const cta = PAGE_CTA[`${module}/${sectionKey}/${page.key}`];
  return (
    <>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <PageHeader title={text?.[0] ?? page.title} subtitle={(text?.[1] ?? "").replace("{today}", today())} action={cta ? <button type="button" onClick={() => (cta.href ? router.push(cta.href) : cta.event ? window.dispatchEvent(new CustomEvent(cta.event)) : cta.print ? window.dispatchEvent(new CustomEvent("school-print")) : setTab(cta.tab))} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28]">{cta.label}</button> : undefined} />
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      {flow && <p className="mb-5 text-xs text-slate-500">{flow}</p>}
      <TabContext.Provider value={setTab}>{body ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}</TabContext.Provider>
    </>
  );
}

/** The route of /school/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
