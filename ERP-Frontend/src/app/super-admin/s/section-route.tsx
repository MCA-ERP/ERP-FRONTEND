"use client";

import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { HeaderHidden, PageHeader } from "@/components/admin/ui";
import { MENU, sectionHref, type MenuSection } from "./menu";
import { PageActions } from "./page-actions";
import { PAGED, renderPage } from "./registry";
import { RangeProvider } from "@/components/admin/range";

/** One submenu of the Super Admin sidebar: its header, its pages as tabs (where they differ), and the working screen. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  if (!mod || !sec) notFound();
  return (
    <RangeProvider>
      <SectionView key={`${module}/${section}`} module={module} moduleLabel={mod.label} section={sec} />
    </RangeProvider>
  );
}

/** The Dashboard's first page, shown at /super-admin itself. */
export function DashboardOverviewRoute() {
  const mod = MENU.dashboard;
  return (
    <RangeProvider>
      <SectionView module="dashboard" moduleLabel={mod.label} section={mod.sections[0]} />
    </RangeProvider>
  );
}

/** The red button at the top right of some pages, and where it goes. */
const CTA: Record<string, { label: string; module?: string; section?: string; page?: string; event?: string }> = {
  "users/platform/super": { label: "+ Invite", event: "users/platform/super" },
  "users/platform/support": { label: "+ Invite", event: "users/platform/support" },
  "users/school/admins": { label: "+ Create admin", event: "users/school/admins" },
  "modules/catalogue/all": { label: "+ Add module", event: "modules/catalogue/all" },
  "modules/configuration/flags": { label: "+ New flag", event: "modules/configuration/flags" },
  "modules/pricing/bundle": { label: "+ New bundle", event: "modules/pricing/bundle" },
  "schools/registration/application": { label: "+ Add school", module: "schools", section: "registration", page: "add" },
  "schools/directory/all": { label: "+ Add school", module: "schools", section: "registration", page: "add" },
  "subscriptions/plans/list": { label: "+ New plan", module: "subscriptions", section: "plans", page: "create" },
  "schools/campus/list": { label: "+ Add campus", module: "schools", section: "campus", page: "add" },
};

function SectionView({ module, moduleLabel, section }: { module: string; moduleLabel: string; section: MenuSection }) {
  const paged = PAGED.has(`${module}/${section.key}`);
  const router = useRouter();
  const params = useSearchParams();
  const fromUrl = params.get("tab");
  const valid = (t: string | null) => (t && section.pages.some((p) => p.key === t) ? t : null);
  const [tab, setTab] = useState(valid(fromUrl) ?? section.pages[0].key);
  // links like ?tab=details open that page, also when the address changes while this page stays
  useEffect(() => { const t = valid(fromUrl); if (t) setTab(t); }, [fromUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = section.pages.find((p) => p.key === tab) ?? section.pages[0];
  const bodyRef = useRef<HTMLDivElement>(null);
  const body = renderPage(module, section.key, paged ? page.key : section.pages[0].key);

  const addSchool = module === "dashboard" && section.key === "overview";
  const cta = paged ? CTA[`${module}/${section.key}/${page.key}`] : undefined;
  const goCta = () => {
    if (!cta) return;
    if (cta.event) { window.dispatchEvent(new CustomEvent("mca-cta", { detail: cta.event })); return; }
    if (!cta.module || !cta.section) return;
    if (cta.module === module && cta.section === section.key) setTab(cta.page ?? tab);
    else router.push(`${sectionHref(cta.module, cta.section)}?tab=${cta.page ?? ""}`);
  };
  const title = paged ? page.title : section.label;
  const subtitle = paged
    ? page.description
    : section.pages.length > 1
      ? `${section.pages.map((p) => p.title).join(" · ")}. ${section.pages[0].description}`.trim()
      : section.pages[0].description;

  return (
    <>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {section.label}</p>
      <PageHeader title={title} subtitle={subtitle} action={addSchool ? <Link href="/super-admin/schools/registration" className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28]">+ Add school</Link> : cta ? <button type="button" onClick={goCta} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28]">{cta.label}</button> : undefined} />
      {paged && section.pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={section.pages.map((p) => [p.key, p.title] as [string, string])} />}
      {module === "dashboard" && <PageActions target={bodyRef} name={`${section.key}-${page.key}`} />}
      <div ref={bodyRef}><HeaderHidden.Provider value>{body ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}</HeaderHidden.Provider></div>
    </>
  );
}
