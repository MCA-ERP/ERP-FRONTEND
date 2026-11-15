"use client";

import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { MENU, type MenuSection } from "./menu";
import { PAGED, renderPage } from "./registry";

/** One submenu of the Super Admin sidebar: its header, its pages as tabs (where they differ), and the working screen. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  if (!mod || !sec) notFound();
  return <SectionView key={`${module}/${section}`} module={module} moduleLabel={mod.label} section={sec} />;
}

function SectionView({ module, moduleLabel, section }: { module: string; moduleLabel: string; section: MenuSection }) {
  const paged = PAGED.has(`${module}/${section.key}`);
  const [tab, setTab] = useState(section.pages[0].key);
  const page = section.pages.find((p) => p.key === tab) ?? section.pages[0];
  const body = renderPage(module, section.key, paged ? page.key : section.pages[0].key);

  const title = paged ? page.title : section.label;
  const subtitle = paged
    ? page.description
    : section.pages.length > 1
      ? `${section.pages.map((p) => p.title).join(" · ")}. ${section.pages[0].description}`.trim()
      : section.pages[0].description;

  return (
    <>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {section.label}</p>
      <PageHeader title={title} subtitle={subtitle} />
      {paged && section.pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={section.pages.map((p) => [p.key, p.title] as [string, string])} />}
      {body ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}
    </>
  );
}
