"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, type CmsItem } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { API_BASE } from "@/lib/api";
import { Badge, ErrorBanner, Field, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Empty, Pills, dataText, small, updateItem, useItems } from "./shared";

const pathOf = (i: CmsItem) => dataText(i, "path") || (i.slug === "home" ? "/" : "/" + i.slug);

export function SeoTab() {
  const [view, setView] = useState<"title" | "description" | "sitemap">("title");
  return (
    <>
      <Pills label="SEO" value={view} onChange={setView} items={[["title", "Meta title"], ["description", "Meta description"], ["sitemap", "Sitemap"]]} />
      {view === "sitemap" ? <Sitemap /> : <Meta field={view} />}
    </>
  );
}

const RULES = {
  title: { key: "meta_title", label: "Meta title", sub: "The title search engines show for each page. Aim for 50 – 60 characters.", min: 30, max: 60 },
  description: { key: "meta_description", label: "Meta description", sub: "The summary under the title in search results. Aim for 120 – 160 characters.", min: 120, max: 160 },
} as const;

function Meta({ field }: { field: "title" | "description" }) {
  const rule = RULES[field];
  const { items, loading, error, busy, run } = useItems("page");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const pages = items.filter((i) => i.status !== "archived");
  const value = (i: CmsItem) => draft[i.id] ?? dataText(i, rule.key);
  const dirty = (i: CmsItem) => draft[i.id] !== undefined && draft[i.id] !== dataText(i, rule.key);

  const save = (i: CmsItem) =>
    run(async () => {
      await updateItem(i.id, { data: { ...i.data, [rule.key]: value(i).trim() } });
      setDraft((d) => { const { [i.id]: _gone, ...rest } = d; return rest; });
    });

  return (
    <Panel title={`${rule.label}s`} sub={rule.sub}>
      <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Page</Th><Th>{rule.label}</Th><Th>Length</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!pages.length && <tr><td colSpan={4}><Empty loading={loading}>Add a page first.</Empty></td></tr>}
          {pages.map((i) => {
            const n = value(i).trim().length;
            const good = n >= rule.min && n <= rule.max;
            return (
              <tr key={i.id} className="align-top">
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{i.title}</p><p className="font-mono text-xs text-slate-400">{pathOf(i)}</p></td>
                <td className="px-4 py-3">
                  {field === "title"
                    ? <input className={inputCls} aria-label={`${rule.label} for ${i.title}`} value={value(i)} onChange={(e) => setDraft({ ...draft, [i.id]: e.target.value })} />
                    : <textarea className={`${inputCls} min-h-[4rem]`} aria-label={`${rule.label} for ${i.title}`} value={value(i)} onChange={(e) => setDraft({ ...draft, [i.id]: e.target.value })} />}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{n ? <Badge tone={good ? "green" : "red"}>{n}</Badge> : <Badge tone="gray">Missing</Badge>}</td>
                <td className="px-4 py-3 text-right"><button type="button" className={`${btnPrimary} ${small}`} disabled={busy || !dirty(i)} onClick={() => save(i)}>Save</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

interface SitemapInfo { include_blog: boolean; urls: { title: string; path: string; lastmod: string | null; kind: "page" | "blog" }[]; site_url: string }

function Sitemap() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<SitemapInfo>("/cms/sitemap"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [site, setSite] = useState("");
  const [includeBlog, setIncludeBlog] = useState(true);
  useEffect(() => { if (data) { setSite(data.site_url); setIncludeBlog(data.include_blog); } }, [data]);

  const save = () => run(() => adminFetch("/cms/sitemap", json("PUT", { site_url: site, include_blog: includeBlog })));
  const link = `${API_BASE}/public/sitemap.xml`;

  return (
    <div className="space-y-4">
      <Panel title="Sitemap" sub="The list of pages search engines should crawl. It is built live from your published pages, so there is nothing to rebuild.">
        <div className="space-y-3 p-4">
          <ErrorBanner message={error || actionError} />
          <Field label="Website address" hint="The public address of your site, like https://www.myclassassist.in. Needed before the sitemap can be served.">
            <input className={inputCls} placeholder="https://www.example.in" value={site} onChange={(e) => setSite(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={includeBlog} onChange={(e) => setIncludeBlog(e.target.checked)} />Include blog posts</label>
          <p className="text-xs text-slate-500">Drafts are never included.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} disabled={busy} onClick={save}>Save sitemap settings</button>
            <a className={`${btnGhost} ${small}`} href={link} target="_blank" rel="noreferrer">Open sitemap.xml</a>
            <code className="break-all text-xs text-slate-500">{link}</code>
          </div>
        </div>
      </Panel>
      <Panel title="URLs in the sitemap" sub={`${data?.urls.length ?? 0} published addresses`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Page</Th><Th>Address</Th><Th>Last changed</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.urls.length && <tr><td colSpan={3}><Empty loading={loading}>Nothing is published yet.</Empty></td></tr>}
            {data?.urls.map((u) => (
              <tr key={u.kind + u.path}>
                <td className="px-4 py-3 font-semibold text-slate-900">{u.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.path}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{u.lastmod ? u.lastmod.slice(0, 10) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
