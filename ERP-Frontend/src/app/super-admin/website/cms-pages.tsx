"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, type CmsItem, type Paged, type SchoolRow } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, useAction } from "@/components/admin/dash";
import { Chip, Tag } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small, smallPrimary } from "../schools/pages/shared";
import { createItem, dataText, dayEnd, dayStart, toDay, updateItem, useItems } from "./shared";
import { SitemapPanel } from "./seo";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const day = (iso: string | null | undefined) => (iso ? fmtDay(iso.slice(0, 10)) : "—");
const pathOf = (i: CmsItem) => dataText(i, "path") || (i.slug === "home" ? "/" : "/" + i.slug);
const status = (s: CmsItem["status"]): [string, "good" | "mute" | "warn"] => (s === "published" ? ["Published", "good"] : s === "archived" ? ["Archived", "warn"] : ["Draft", "mute"]);
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
function useCta(key: string, fn: () => void) {
  useEffect(() => { const h = (e: Event) => { if ((e as CustomEvent).detail === key) fn(); }; window.addEventListener("mca-cta", h); return () => window.removeEventListener("mca-cta", h); }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
/** A file picked in the browser, kept with the item as a small picture (up to 400 KB). */
function FilePick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState("");
  return (
    <div>
      <input type="file" accept="image/*" aria-label="Choose file" className="block w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-100 file:px-2 file:py-0.5" onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return;
        if (f.size > 400_000) { setErr("Pick a picture under 400 KB."); return; }
        setErr(""); const r = new FileReader(); r.onload = () => onChange(String(r.result)); r.readAsDataURL(f);
      }} />
      {value && <span className="mt-1 block text-xs text-slate-500">Picture chosen</span>}
      {err && <span className="mt-1 block text-xs text-rose-700">{err}</span>}
    </div>
  );
}
const LAYOUTS = ["Standard", "Landing page", "Article", "Legal"];

// ═════════════ Content management ═════════════
export type ContentTab = "add" | "edit" | "publish";
export function ContentPages({ tab }: { tab: ContentTab }) {
  const { items, loading, error, busy, run } = useItems("page");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<CmsItem | null>(null);
  const [view, setView] = useState<CmsItem | null>(null);
  const [saved, setSaved] = useState(false);
  const blank = { title: "", path: "/", layout: "Standard", body: "", status: "draft" as CmsItem["status"] };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const slugOf = (p: string) => (p === "/" ? "home" : p.replace(/^\/|\/$/g, "").replace(/\//g, "-"));
  const bad = (p: string) => (/^\/[a-z0-9\-/]*$/.test(p) ? "" : "The address must start with / and use lowercase letters, numbers and hyphens, like /about-us.");
  const save = async (e: FormEvent, existing?: CmsItem) => {
    e.preventDefault();
    const m = bad(f.path); setErr(m); if (m) return;
    const data = { ...(existing?.data ?? {}), path: f.path, layout: f.layout, sections: existing?.data?.sections ?? [] };
    const ok = await run(() => (existing ? updateItem(existing.id, { title: f.title, slug: slugOf(f.path), body: f.body, data, status: f.status }) : createItem("page", { title: f.title, slug: slugOf(f.path), body: f.body, data, status: "draft" })));
    if (ok) { setSaved(true); if (existing) setEdit(null); else setF(blank); }
  };
  const open = (p: CmsItem) => { setF({ title: p.title, path: pathOf(p), layout: dataText(p, "layout") || "Standard", body: p.body, status: p.status }); setErr(""); setEdit(p); };
  const list = items.filter((i) => i.status !== "archived" && (tab !== "publish" || i.status === "draft") && has(`${i.title} ${pathOf(i)}`, search));

  if (tab === "add") {
    return (
      <FormCard title="New page" saveLabel="Save as draft" busy={busy} saved={saved} error={err || error} onDiscard={() => { setF(blank); setSaved(false); setErr(""); }} onSubmit={(e) => save(e)}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Page title"><input className={inputCls} required value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setSaved(false); }} /></Labelled>
          <Labelled label="URL" hint="Lowercase, words joined by hyphens"><input className={inputCls} required value={f.path} onChange={(e) => { setF({ ...f, path: e.target.value }); setSaved(false); }} /></Labelled>
          <Labelled label="Layout"><select className={inputCls} value={f.layout} onChange={(e) => setF({ ...f, layout: e.target.value })}>{LAYOUTS.map((l) => <option key={l}>{l}</option>)}</select></Labelled>
        </div>
        <Labelled label="Content"><textarea className={`${inputCls} min-h-[6rem]`} value={f.body} onChange={(e) => { setF({ ...f, body: e.target.value }); setSaved(false); }} /></Labelled>
      </FormCard>
    );
  }
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title={tab === "edit" ? "Pages" : "Drafts"} sub={`${list.length} ${tab === "edit" ? "pages" : "drafts"}`} right={<ExportPrint name={`pages-${tab}`} head={["Page", "URL", "Status", "Updated"]} rows={list.map((p) => [p.title, pathOf(p), status(p.status)[0], p.updated_at.slice(0, 10)])} />}>
        <Search v={search} set={setSearch} label={tab === "edit" ? "Search pages" : "Search drafts"} />
        <SimpleTable head={[{ h: "Page" }, { h: "URL" }, ...(tab === "edit" ? [{ h: "Status" }] : []), { h: tab === "edit" ? "Updated" : "Saved" }, { h: "" }]} empty={loading ? "Loading…" : "No pages here."}
          rows={list.map((p) => [<b key="t" className="font-semibold text-slate-900">{p.title}</b>, pathOf(p), ...(tab === "edit" ? [<Chip key="s" tone={status(p.status)[1]}>{status(p.status)[0]}</Chip>] : []), day(p.updated_at),
            <span key="a" className="flex gap-1.5">{tab === "edit" ? <button type="button" className={small} onClick={() => open(p)}>Edit</button> : <button type="button" className={smallPrimary} disabled={busy} onClick={() => run(() => updateItem(p.id, { status: "published" }))}>Publish</button>}<button type="button" className={small} onClick={() => setView(p)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!edit} title={`Edit page · ${edit?.title ?? ""}`} onClose={() => setEdit(null)}>
        <form onSubmit={(e) => save(e, edit ?? undefined)} className="space-y-3">
          <ErrorBanner message={err || error} />
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Page title"><input className={inputCls} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Labelled>
            <Labelled label="URL"><input className={inputCls} required value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} /></Labelled>
            <Labelled label="Layout"><select className={inputCls} value={f.layout} onChange={(e) => setF({ ...f, layout: e.target.value })}>{LAYOUTS.map((l) => <option key={l}>{l}</option>)}</select></Labelled>
            <Labelled label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as CmsItem["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></Labelled>
          </div>
          <Labelled label="Content"><textarea className={`${inputCls} min-h-[6rem]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save page</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="URL" v={pathOf(view)} /><Row k="Status" v={<Chip tone={status(view.status)[1]}>{status(view.status)[0]}</Chip>} /><Row k="Layout" v={dataText(view, "layout") || "Standard"} /><Row k="Updated" v={day(view.updated_at)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Banners ═════════════
export type BannerTab = "add" | "schedule" | "archive";
const WHERE = ["Home · top", "Dashboard", "Pricing", "Features"];
export function BannerPages({ tab }: { tab: BannerTab }) {
  const { items, loading, error, busy, run } = useItems("banner");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CmsItem | null>(null);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const blank = { title: "", where: WHERE[0], link: "", from: "", to: "", image: "" };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank, v: string) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  const ended = (b: CmsItem) => b.status === "archived" || (!!b.ends_at && b.ends_at.slice(0, 10) < today);
  const live = (b: CmsItem) => b.status === "published" && (!b.starts_at || b.starts_at.slice(0, 10) <= today) && !ended(b);

  if (tab === "add") {
    return (
      <FormCard title="New banner" saveLabel="Add banner" busy={busy} saved={saved} error={error} onDiscard={() => { setF(blank); setSaved(false); }}
        onSubmit={async (e) => { e.preventDefault(); if (await run(() => createItem("banner", { title: f.title, data: { where: f.where, link: f.link, image_url: f.image }, starts_at: dayStart(f.from), ends_at: dayEnd(f.to), status: "published" }))) { setSaved(true); setF(blank); } }}>
        <Labelled label="Banner text"><input className={inputCls} required value={f.title} onChange={(e) => set("title", e.target.value)} /></Labelled>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="Where"><select className={inputCls} value={f.where} onChange={(e) => set("where", e.target.value)}>{WHERE.map((w) => <option key={w}>{w}</option>)}</select></Labelled>
          <Labelled label="Button link"><input className={inputCls} placeholder="/pricing" value={f.link} onChange={(e) => set("link", e.target.value)} /></Labelled>
          <Labelled label="Start"><input type="date" className={inputCls} value={f.from} onChange={(e) => set("from", e.target.value)} /></Labelled>
          <Labelled label="End"><input type="date" className={inputCls} min={f.from} value={f.to} onChange={(e) => set("to", e.target.value)} /></Labelled>
          <Labelled label="Image" hint="1600 × 400 px"><FilePick value={f.image} onChange={(v) => set("image", v)} /></Labelled>
        </div>
      </FormCard>
    );
  }
  const archive = tab === "archive";
  const list = items.filter((b) => (archive ? ended(b) : !ended(b)) && has(`${b.title} ${dataText(b, "where")}`, search));
  const reuse = (b: CmsItem) => run(() => createItem("banner", { title: b.title, data: b.data, status: "draft" }));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title={archive ? "Archived" : "Live and scheduled"} sub={`${list.length} banners`} right={<ExportPrint name={`banners-${tab}`} head={["Banner", "Where", "Starts", "Ends"]} rows={list.map((b) => [b.title, dataText(b, "where"), b.starts_at?.slice(0, 10), b.ends_at?.slice(0, 10)])} />}>
        <Search v={search} set={setSearch} label={archive ? "Search archived" : "Search live and scheduled"} />
        <SimpleTable head={archive ? [{ h: "Banner" }, { h: "Where" }, { h: "Ran" }, { h: "" }] : [{ h: "Banner" }, { h: "Where" }, { h: "Starts" }, { h: "Ends" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No banners here."}
          rows={list.map((b) => archive
            ? [<b key="t" className="font-semibold text-slate-900">{b.title}</b>, dataText(b, "where") || "—", `${day(b.starts_at)} – ${day(b.ends_at)}`, <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={busy} onClick={() => reuse(b)}>Reuse</button><button type="button" className={small} onClick={() => setView(b)}>View details</button></span>]
            : [<b key="t" className="font-semibold text-slate-900">{b.title}</b>, dataText(b, "where") || "—", day(b.starts_at), day(b.ends_at), <Chip key="s" tone={live(b) ? "good" : "info"}>{live(b) ? "Live" : b.status === "draft" ? "Draft" : "Scheduled"}</Chip>,
              <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={busy} onClick={() => run(() => updateItem(b.id, { status: "archived" }))}>Archive</button><button type="button" className={small} onClick={() => setView(b)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Where" v={dataText(view, "where") || "—"} /><Row k="Link" v={dataText(view, "link") || "—"} /><Row k="Runs" v={`${day(view.starts_at)} – ${day(view.ends_at)}`} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Blog ═════════════
export type BlogTab = "categories" | "posts" | "authors";
export function BlogPages({ tab }: { tab: BlogTab }) {
  const posts = useItems("blog");
  const cats = useItems("blog_category");
  const authors = useItems("author");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CmsItem | null>(null);
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ title: "", category: "", author: "", body: "", status: "draft" as CmsItem["status"], role: "", active: true });
  const fresh = () => setF({ title: "", category: cats.items[0]?.title ?? "", author: authors.items[0]?.title ?? "", body: "", status: "draft", role: "", active: true });
  useCta("cms/blog", () => { fresh(); setOpen("new"); });
  const count = (key: string, v: string) => posts.items.filter((p) => dataText(p, key) === v).length;
  const err = posts.error || cats.error || authors.error;
  const busy = posts.busy || cats.busy || authors.busy;

  if (tab === "categories") {
    const rows = cats.items.filter((c) => has(c.title, search));
    return (
      <div className="space-y-5">
        <ErrorBanner message={err} />
        <Panel title="Categories" sub={`${rows.length} categories`} right={<ExportPrint name="blog-categories" head={["Category", "Posts"]} rows={rows.map((c) => [c.title, count("category", c.title)])} />}>
          <Search v={search} set={setSearch} label="Search categories" />
          <SimpleTable head={[{ h: "Category" }, { h: "Posts", right: true }, { h: "" }]} empty={cats.loading ? "Loading…" : "No categories yet."} rows={rows.map((c) => [<b key="t" className="font-semibold text-slate-900">{c.title}</b>, count("category", c.title), <button key="v" type="button" className={small} onClick={() => setView(c)}>View details</button>])} />
        </Panel>
        <Modal open={open === "new"} title="New category" onClose={() => setOpen(null)}>
          <form onSubmit={async (e) => { e.preventDefault(); if (await cats.run(() => createItem("blog_category", { title: f.title.trim(), status: "published" }))) setOpen(null); }} className="space-y-3">
            <Labelled label="Name"><input className={inputCls} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Labelled>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>
          </form>
        </Modal>
        <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Posts" v={String(count("category", view.title))} /></dl><Footer on={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  if (tab === "authors") {
    const rows = authors.items.filter((a) => has(`${a.title} ${dataText(a, "role")}`, search));
    return (
      <div className="space-y-5">
        <ErrorBanner message={err} />
        <Panel title="Authors" sub={`${rows.length} authors`} right={<ExportPrint name="blog-authors" head={["Author", "Role", "Posts", "Status"]} rows={rows.map((a) => [a.title, dataText(a, "role"), count("author", a.title), a.status === "published" ? "Active" : "Inactive"])} />}>
          <Search v={search} set={setSearch} label="Search authors" />
          <SimpleTable head={[{ h: "Author" }, { h: "Role" }, { h: "Posts", right: true }, { h: "Status" }, { h: "" }]} empty={authors.loading ? "Loading…" : "No authors yet."}
            rows={rows.map((a) => [<b key="t" className="font-semibold text-slate-900">{a.title}</b>, dataText(a, "role") || "—", count("author", a.title), <Chip key="s" tone={a.status === "published" ? "good" : "mute"}>{a.status === "published" ? "Active" : "Inactive"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(a)}>View details</button>])} />
        </Panel>
        <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Role" v={dataText(view, "role") || "—"} /><Row k="Posts" v={String(count("author", view.title))} /></dl><Footer on={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  const rows = posts.items.filter((p) => has(`${p.title} ${dataText(p, "category")} ${dataText(p, "author")}`, search));
  const edit = (p: CmsItem) => { setF({ title: p.title, category: dataText(p, "category"), author: dataText(p, "author"), body: p.body, status: p.status, role: "", active: true }); setOpen(p); };
  const savePost = async (e: FormEvent) => {
    e.preventDefault();
    const data = { ...(open !== "new" && open ? open.data : {}), category: f.category, author: f.author };
    if (await posts.run(() => (open === "new" ? createItem("blog", { title: f.title, body: f.body, data, status: f.status }) : updateItem((open as CmsItem).id, { title: f.title, body: f.body, data, status: f.status })))) setOpen(null);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={err} />
      <Panel title="Posts" sub={`${rows.length} posts`} right={<ExportPrint name="blog-posts" head={["Post", "Category", "Author", "Status", "Date"]} rows={rows.map((p) => [p.title, dataText(p, "category"), dataText(p, "author"), status(p.status)[0], (p.published_at ?? p.updated_at).slice(0, 10)])} />}>
        <Search v={search} set={setSearch} label="Search posts" />
        <SimpleTable head={[{ h: "Post" }, { h: "Category" }, { h: "Author" }, { h: "Status" }, { h: "Date" }, { h: "" }]} empty={posts.loading ? "Loading…" : "No posts yet."}
          rows={rows.map((p) => [<b key="t" className="font-semibold text-slate-900">{p.title}</b>, dataText(p, "category") ? <Tag key="c">{dataText(p, "category")}</Tag> : "—", dataText(p, "author") || "—", <Chip key="s" tone={status(p.status)[1]}>{status(p.status)[0]}</Chip>, day(p.published_at ?? p.updated_at),
            <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(p)}>Edit</button><button type="button" className={small} onClick={() => setView(p)}>View details</button></span>])} />
      </Panel>
      <Modal open={open !== null && open !== "new" || open === "new"} title={open === "new" ? "New post" : `Edit post · ${(open as CmsItem | null)?.title ?? ""}`} onClose={() => setOpen(null)}>
        <form onSubmit={savePost} className="space-y-3">
          <Labelled label="Title"><input className={inputCls} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Labelled>
          <div className="grid grid-cols-3 gap-3">
            <Labelled label="Category"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">None</option>{cats.items.map((c) => <option key={c.id}>{c.title}</option>)}</select></Labelled>
            <Labelled label="Author"><select className={inputCls} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })}><option value="">None</option>{authors.items.map((a) => <option key={a.id}>{a.title}</option>)}</select></Labelled>
            <Labelled label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as CmsItem["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></Labelled>
          </div>
          <Labelled label="Content"><textarea className={`${inputCls} min-h-[8rem]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save post</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Category" v={dataText(view, "category") || "—"} /><Row k="Author" v={dataText(view, "author") || "—"} /><Row k="Status" v={status(view.status)[0]} /></dl><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{view.body}</p><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ Testimonials ═════════════
export type TestiTab = "add" | "edit" | "approve";
export function TestimonialPages({ tab }: { tab: TestiTab }) {
  const { items, loading, error, busy, run } = useItems("testimonial");
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CmsItem | null>(null);
  const [edit, setEdit] = useState<CmsItem | null>(null);
  const [saved, setSaved] = useState(false);
  const blank = { person: "", school: "", quote: "", photo: "", consent: false };
  const [f, setF] = useState(blank);
  const school = f.school || schools.data?.items[0]?.name || "";
  const set = (k: keyof typeof blank, v: string | boolean) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  const body = (existing?: CmsItem) => ({ title: f.person, body: f.quote, data: { ...(existing?.data ?? {}), author: f.person, school, image_url: f.photo, consent: f.consent } });
  const name = (t: CmsItem) => dataText(t, "author") || t.title;
  const tone = (t: CmsItem): [string, "good" | "warn"] => (t.status === "published" ? ["Approved", "good"] : ["Pending", "warn"]);

  const form = (existing?: CmsItem) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Name"><input className={inputCls} required value={f.person} onChange={(e) => set("person", e.target.value)} /></Labelled>
        <Labelled label="School"><select className={inputCls} value={school} onChange={(e) => set("school", e.target.value)}>{schools.data?.items.map((s) => <option key={s.id}>{s.name}</option>)}</select></Labelled>
      </div>
      <Labelled label="Quote"><textarea className={`${inputCls} min-h-[5rem]`} required value={f.quote} onChange={(e) => set("quote", e.target.value)} /></Labelled>
      <Labelled label="Photo" hint="Square, shown in a circle"><div className="max-w-sm"><FilePick value={f.photo} onChange={(v) => set("photo", v)} /></div></Labelled>
      <ToggleRow label="The school agreed to be quoted" hint="Keep their written consent on file" checked={f.consent} onChange={(v) => set("consent", v)} />
      {existing && null}
    </>
  );
  if (tab === "add") {
    return (
      <FormCard title="New testimonial" saveLabel="Add testimonial" busy={busy} saved={saved} error={error || schools.error} onDiscard={() => { setF(blank); setSaved(false); }}
        onSubmit={async (e) => { e.preventDefault(); if (await run(() => createItem("testimonial", { ...body(), status: "draft" }))) { setSaved(true); setF(blank); } }}>{form()}</FormCard>
    );
  }
  const list = items.filter((t) => (tab === "approve" ? t.status !== "published" : true) && has(`${name(t)} ${dataText(t, "school")} ${t.body}`, search));
  const approve = (t: CmsItem, ok: boolean) => run(() => updateItem(t.id, ok ? { status: "published", data: { ...t.data, consent: true } } : { status: "archived" }));
  const open = (t: CmsItem) => { setF({ person: name(t), school: dataText(t, "school"), quote: t.body, photo: dataText(t, "image_url"), consent: t.data?.consent === true || t.data?.consent === "true" }); setEdit(t); };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title={tab === "approve" ? "Waiting for approval" : "Testimonials"} sub={`${list.length} testimonials`} right={<ExportPrint name={`testimonials-${tab}`} head={["Person", "School", "Quote", "Status"]} rows={list.map((t) => [name(t), dataText(t, "school"), t.body, tone(t)[0]])} />}>
        <Search v={search} set={setSearch} label={tab === "approve" ? "Search waiting for approval" : "Search testimonials"} />
        <SimpleTable head={[{ h: "Person" }, { h: "Quote" }, ...(tab === "edit" ? [{ h: "Status" }] : []), { h: "" }]} empty={loading ? "Loading…" : "Nothing here."}
          rows={list.map((t) => [<div key="p"><p className="font-semibold text-slate-900">{name(t)}</p><p className="text-xs text-slate-400">{dataText(t, "school")}</p></div>, t.body, ...(tab === "edit" ? [<Chip key="s" tone={tone(t)[1]}>{tone(t)[0]}</Chip>] : []),
            <span key="a" className="flex gap-1.5">{tab === "approve" ? <><button type="button" className={small} disabled={busy} onClick={() => approve(t, false)}>Reject</button><button type="button" className={smallPrimary} disabled={busy} onClick={() => approve(t, true)}>Approve</button></> : <button type="button" className={small} onClick={() => open(t)}>Edit</button>}<button type="button" className={small} onClick={() => setView(t)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!edit} title={`Edit testimonial · ${edit ? name(edit) : ""}`} onClose={() => setEdit(null)}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (edit && (await run(() => updateItem(edit.id, body(edit))))) setEdit(null); }}>
          {form(edit ?? undefined)}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view ? name(view) : ""} onClose={() => setView(null)}>{view && <><p className="text-sm text-slate-800">“{view.body}”</p><dl className="mt-2"><Row k="School" v={dataText(view, "school") || "—"} /><Row k="Status" v={tone(view)[0]} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ FAQ ═════════════
export type FaqTab = "questions" | "answers" | "categories";
export function FaqPages({ tab }: { tab: FaqTab }) {
  const { items, loading, error, busy, run } = useItems("faq");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CmsItem | null>(null);
  const [open, setOpen] = useState(false);
  const [catView, setCatView] = useState<string | null>(null);
  const [f, setF] = useState({ question: "", category: "General", answer: "" });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useCta("cms/faq", () => { setF({ question: "", category: "General", answer: "" }); setOpen(true); });
  const cat = (q: CmsItem) => dataText(q, "category") || "General";
  const cats = [...new Set(items.map(cat))];
  const rows = items.filter((q) => has(`${q.title} ${cat(q)}`, search));
  const dirty = Object.keys(draft).filter((id) => draft[id] !== items.find((q) => q.id === id)?.body);

  if (tab === "answers") {
    return (
      <div className="space-y-5">
        <ErrorBanner message={error} />
        <Panel title="Answers">
          <div className="divide-y divide-slate-100">
            {!items.length && <p className="px-5 py-8 text-sm text-slate-500">{loading ? "Loading…" : "No questions yet."}</p>}
            {items.map((q) => (
              <div key={q.id} className="px-5 py-4">
                <p className="mb-2 text-[13.5px] font-medium text-slate-900">{q.title}</p>
                <textarea aria-label={`Answer to ${q.title}`} className={`${inputCls} min-h-[5rem]`} value={draft[q.id] ?? q.body} onChange={(e) => { setDraft({ ...draft, [q.id]: e.target.value }); setSaved(false); }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
            {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={!dirty.length} onClick={() => { setDraft({}); setSaved(false); }}>Discard</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!dirty.length || busy} onClick={async () => { if (await run(async () => { for (const id of dirty) await updateItem(id, { body: draft[id] }); })) { setDraft({}); setSaved(true); } }}>Save answers</button>
          </div>
        </Panel>
      </div>
    );
  }
  if (tab === "categories") {
    const crow = cats.filter((c) => has(c, search));
    return (
      <div className="space-y-5">
        <ErrorBanner message={error} />
        <Panel title="Categories" sub={`${crow.length} categories`} right={<ExportPrint name="faq-categories" head={["Category", "Questions"]} rows={crow.map((c) => [c, items.filter((q) => cat(q) === c).length])} />}>
          <Search v={search} set={setSearch} label="Search categories" />
          <SimpleTable head={[{ h: "Category" }, { h: "Questions", right: true }, { h: "" }]} empty={loading ? "Loading…" : "No categories yet."} rows={crow.map((c) => [<b key="t" className="font-semibold text-slate-900">{c}</b>, items.filter((q) => cat(q) === c).length, <button key="v" type="button" className={small} onClick={() => setCatView(c)}>View details</button>])} />
        </Panel>
        <Modal open={!!catView} title={catView ?? ""} onClose={() => setCatView(null)}><dl><Row k="Questions" v={String(items.filter((q) => cat(q) === catView).length)} /></dl><Footer on={() => setCatView(null)} /></Modal>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="Questions" sub={`${rows.length} questions`} right={<ExportPrint name="faq-questions" head={["Question", "Category", "Answer"]} rows={rows.map((q) => [q.title, cat(q), q.body])} />}>
        <Search v={search} set={setSearch} label="Search questions" />
        <SimpleTable head={[{ h: "Question" }, { h: "Category" }, { h: "" }]} empty={loading ? "Loading…" : "No questions yet."} rows={rows.map((q) => [<b key="t" className="font-semibold text-slate-900">{q.title}</b>, <Tag key="c">{cat(q)}</Tag>, <button key="v" type="button" className={small} onClick={() => setView(q)}>View details</button>])} />
      </Panel>
      <Modal open={open} title="New question" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => createItem("faq", { title: f.question, body: f.answer, data: { category: f.category.trim() || "General" }, status: "published" }))) setOpen(false); }}>
          <Labelled label="Question"><input className={inputCls} required value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></Labelled>
          <Labelled label="Category"><input className={inputCls} list="faq-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="faq-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Labelled>
          <Labelled label="Answer"><textarea className={`${inputCls} min-h-[6rem]`} required value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><p className="text-sm text-slate-800">{view.body}</p><dl className="mt-2"><Row k="Category" v={cat(view)} /></dl><Footer on={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ SEO ═════════════
export type SeoTab = "title" | "description" | "sitemap";
const RULE = { title: { key: "meta_title", head: "Meta titles", min: 30, max: 60, tag: "title" }, description: { key: "meta_description", head: "Meta descriptions", min: 120, max: 160, tag: "description" } } as const;

export function SeoPages({ tab }: { tab: SeoTab }) {
  if (tab === "sitemap") return <SitemapPanel />;
  const rule = RULE[tab];
  const { items, loading, error, busy, run } = useItems("page");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const val = (i: CmsItem) => draft[i.id] ?? dataText(i, rule.key);
  const rows = items.filter((i) => i.status !== "archived" && has(`${i.title} ${pathOf(i)}`, search));
  const len = (i: CmsItem) => val(i).trim().length;
  const bad = (n: number) => n < rule.min || n > rule.max;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title={rule.head} sub={`${rows.length} pages`} right={<ExportPrint name={`meta-${tab}`} head={["Page", "URL", tab === "title" ? "Title" : "Description", "Length"]} rows={rows.map((i) => [i.title, pathOf(i), val(i), len(i)])} />}>
        <Search v={search} set={setSearch} label={`Search ${rule.head.toLowerCase()}`} />
        <SimpleTable head={[{ h: "Page" }, ...(tab === "title" ? [{ h: "URL" }] : []), { h: tab === "title" ? "Title" : "Description" }, { h: "Length", right: true }, { h: "" }]} empty={loading ? "Loading…" : "No pages."}
          rows={rows.map((i) => [<b key="p" className="font-semibold text-slate-900">{i.title}</b>, ...(tab === "title" ? [pathOf(i)] : []),
            tab === "title" ? <input key="v" aria-label={`${i.title} meta title`} className={`${inputCls} max-w-md`} value={val(i)} onChange={(e) => setDraft({ ...draft, [i.id]: e.target.value })} /> : <textarea key="v" aria-label={`${i.title} meta description`} className={`${inputCls} min-h-[3.5rem] max-w-md`} value={val(i)} onChange={(e) => setDraft({ ...draft, [i.id]: e.target.value })} />,
            len(i) === 0 ? <Chip key="l" tone="bad">Missing</Chip> : <span key="l" className={bad(len(i)) ? "text-[#ac2c28]" : "text-[#026f9b]"}>{len(i)}</span>,
            <button key="s" type="button" className={smallPrimary} disabled={busy} onClick={async () => { if (await run(() => updateItem(i.id, { data: { ...i.data, [rule.key]: val(i).trim() } }))) setDraft((d) => { const n = { ...d }; delete n[i.id]; return n; }); }}>Save</button>])} />
      </Panel>
    </div>
  );
}

export { toDay, useAction };
