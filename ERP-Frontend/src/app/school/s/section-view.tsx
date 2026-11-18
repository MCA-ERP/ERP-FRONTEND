"use client";

import { notFound, useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { BUILT, MENU, PAGE_TEXT } from "./menu";
import { renderPage } from "./registry";

const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One submenu of the School sidebar: its header, its pages as tabs, and the working screen. */
export function SectionView({ module, section }: { module: string; section: string }) {
  const mod = MENU[module];
  const sec = mod?.sections.find((s) => s.key === section);
  if (!mod || !sec || !BUILT.has(module)) notFound();
  return <Suspense fallback={null}><Body key={`${module}/${section}`} module={module} moduleLabel={mod.label} sectionKey={sec.key} sectionLabel={sec.label} pages={sec.pages} /></Suspense>;
}

function Body({ module, moduleLabel, sectionKey, sectionLabel, pages }: { module: string; moduleLabel: string; sectionKey: string; sectionLabel: string; pages: { key: string; title: string }[] }) {
  const params = useSearchParams();
  const wanted = params.get("tab");
  const [tab, setTab] = useState(pages.some((p) => p.key === wanted) ? (wanted as string) : pages[0].key);
  const page = pages.find((p) => p.key === tab) ?? pages[0];
  const text = PAGE_TEXT[`${module}/${sectionKey}`]?.[page.key];
  const body = renderPage(module, sectionKey, page.key);
  return (
    <>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">{moduleLabel} · {sectionLabel}</p>
      <PageHeader title={text?.[0] ?? page.title} subtitle={(text?.[1] ?? "").replace("{today}", today())} />
      {pages.length > 1 && <TabBar value={tab} onChange={setTab} tabs={pages.map((p) => [p.key, p.title] as [string, string])} />}
      {body ?? <p className="py-10 text-center text-sm text-slate-400">This page is not available yet.</p>}
    </>
  );
}

/** The route of /school/<module>/<section>. */
export default function SectionRoute() {
  const { module, section } = useParams<{ module: string; section: string }>();
  return <SectionView module={module} section={section} />;
}
