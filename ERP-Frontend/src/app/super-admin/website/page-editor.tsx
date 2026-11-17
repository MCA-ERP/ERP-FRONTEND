"use client";

import { useEffect, useState } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { fmtDay, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { createItem, dataText, updateItem, useItems } from "./shared";

export type PageTab = "home" | "about" | "features" | "contact";
interface Section { name: string; heading: string; text: string }
const TITLE: Record<PageTab, string> = { home: "Home", about: "About", features: "Features", contact: "Contact" };
const PATH: Record<PageTab, string> = { home: "/", about: "/about", features: "/features", contact: "/contact" };
const sectionsOf = (i: CmsItem): Section[] => (Array.isArray(i.data?.sections) ? (i.data.sections as Section[]) : []);

/** One website page: its sections (heading and text) on the left, and the page's address, status and publish on the right. */
export function WebsitePageEditor({ tab }: { tab: PageTab }) {
  const { items, loading, error, reload } = useItems("page");
  const act = useAction(reload);
  const page = items.find((i) => i.slug === (tab === "home" ? "home" : tab));
  const [sections, setSections] = useState<Section[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSections(page ? sectionsOf(page) : []); setSaved(false); }, [page?.id, page?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, patch: Partial<Section>) => { setSections((s) => s.map((x, n) => (n === i ? { ...x, ...patch } : x))); setSaved(false); };
  const clean = () => sections.filter((s) => s.name.trim() || s.heading.trim() || s.text.trim());
  const data = () => ({ ...(page?.data ?? {}), path: PATH[tab], layout: dataText(page ?? ({ data: {} } as CmsItem), "layout") || "Standard", sections: clean() });
  const save = async () => { if (page && (await act.run(() => updateItem(page.id, { data: data() })))) setSaved(true); };
  const publish = () => page && act.run(() => updateItem(page.id, { data: data(), status: "published" }));
  const create = () => act.run(() => createItem("page", { title: TITLE[tab], slug: tab === "home" ? "home" : tab, body: "", data: { path: PATH[tab], layout: "Standard", sections: [{ name: "Hero", heading: "", text: "" }] }, status: "draft" }));
  const label = (s: Section, i: number) => `${i + 1}. ${s.name || "Section"}`;

  if (!page) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || act.error} />
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">
          {loading ? "Loading…" : <>The {TITLE[tab]} page hasn&apos;t been created yet.<div className="mt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={create}>Create the {TITLE[tab]} page</button></div></>}
        </div>
      </div>
    );
  }
  const published = page.status === "published";
  const Dl = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-[13px]"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.9fr_1fr]">
      <div className="lg:col-span-2"><ErrorBanner message={error || act.error} /></div>
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{TITLE[tab]} page</h2></div>
        <div className="divide-y divide-slate-100">
          {sections.map((s, i) => (
            <div key={i} className="px-5 py-4">
              <p className="mb-2.5 text-[13.5px] font-medium text-slate-900">{label(s, i)}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Heading</span><input className={inputCls} value={s.heading} onChange={(e) => set(i, { heading: e.target.value })} /></label>
                <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Text</span><input className={inputCls} value={s.text} onChange={(e) => set(i, { text: e.target.value })} /></label>
              </div>
            </div>
          ))}
          {!sections.length && <p className="px-5 py-6 text-sm text-slate-500">This page has no sections yet.</p>}
        </div>
        <div className="flex items-center gap-2.5 border-t border-slate-100 px-5 py-3">
          <button type="button" className={`${btnGhost} !px-3 !py-1.5 text-xs`} onClick={() => { setSections((s) => [...s, { name: "Section", heading: "", text: "" }]); setSaved(false); }}>+ Add section</button>
          {saved && <span role="status" className="text-sm font-semibold text-emerald-700">Saved</span>}
          <span className="ml-auto flex gap-2.5">
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setSections(sectionsOf(page)); setSaved(false); }}>Discard</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={save}>{published ? "Save changes" : "Save draft"}</button>
          </span>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Page</h2></div>
        <dl className="px-5 py-3">
          <Dl k="URL" v={PATH[tab]} />
          <Dl k="Status" v={<Chip tone={published ? "good" : "mute"}>{published ? "Published" : "Draft"}</Chip>} />
          <Dl k="Last published" v={page.published_at ? fmtDay(page.published_at.slice(0, 10)) : "—"} />
          <Dl k="Sections" v={clean().length} />
          <Dl k="Views" v="—" />
        </dl>
        <div className="flex gap-2.5 px-5 pb-4">
          <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => window.open(PATH[tab], "_blank")}>Preview</button>
          <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={publish}>{published ? "Publish changes" : "Publish"}</button>
        </div>
      </section>
    </div>
  );
}
