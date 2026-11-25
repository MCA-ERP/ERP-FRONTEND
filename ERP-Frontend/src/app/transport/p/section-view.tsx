"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { PAGE_CTA, PAGE_TEXT } from "../../school/s/menu-config";
import { TabContext } from "../../school/s/tab-context";
import { HeadSlot } from "../../teacher/t/head";
import { MENU, inPlan, type MenuPage } from "./menu-config";
import { useTransport } from "../context";
import { renderPage } from "./registry";

const stamp = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const notInPlan = (label: string) => <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">{label} is not part of your school&apos;s plan. Ask your administrator to add this module.</p>;

/** One submenu of the Transport sidebar: the heading line, the page's own title, its tabs, and the screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  const a = useTransport();
  if (!mod || !sec) notFound();
  if (!inPlan(`${module}/${section}`, a.hasModule)) return notInPlan(sec.label);
  const pages = sec.pages.filter((p) => inPlan(`${module}/${section}/${p.key}`, a.hasModule));
  if (!pages.length) return notInPlan(sec.label);
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} sectionKey={sec.key} sectionLabel={sec.label} pages={pages} school={sec.school} /></Suspense>;
}

function Body({ module, moduleLabel, sectionKey, sectionLabel, pages, school }: { module: string; moduleLabel: string; sectionKey: string; sectionLabel: string; pages: MenuPage[]; school?: [string, string] }) {
  const params = useSearchParams();
  const router = useRouter();
  const wanted = params.get("tab");
  const tab = pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key; // follows the address, so the bell and links can switch tabs on the same page
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const page = pages.find((p) => p.key === tab) ?? pages[0];
  const setTab = (t: string, extra?: Record<string, string>) => { router.replace(`/transport/${module}/${sectionKey}?${new URLSearchParams({ tab: t, ...extra })}`, { scroll: false }); };
  // a screen shared with the School Admin portal gets its title here
  const from = school ? [school[0], school[1], page.key] : null;
  const text = page.text ?? (from ? PAGE_TEXT[`${from[0]}/${from[1]}`]?.[from[2]] : undefined);
  const cta = from ? PAGE_CTA[`${from[0]}/${from[1]}/${from[2]}`] : undefined;
  const pick = { route: params.get("route") ?? undefined, find: params.get("q") ?? undefined, student: params.get("student") ?? undefined };
  return (
    <HeadSlot.Provider value={slot}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <div ref={setSlot} />
      {!page.own && (from || page.text) && <PageHeader title={text?.[0] ?? page.title} subtitle={(text?.[1] ?? "").replace("{today}", stamp())} action={cta ? <button type="button" onClick={() => (cta.event ? window.dispatchEvent(new CustomEvent(cta.event)) : cta.print ? window.dispatchEvent(new CustomEvent("school-print")) : setTab(cta.tab))} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28]">{cta.label}</button> : undefined} />}
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      <TabContext.Provider value={setTab}>{renderPage(module, sectionKey, page.key, setTab, pick, school) ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}</TabContext.Provider>
    </HeadSlot.Provider>
  );
}

/** The route of /transport/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
