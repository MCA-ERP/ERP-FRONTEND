"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls } from "@/components/admin/ui";
import { Empty, Pills, StatusBadge, createItem, dataText, deleteItem, small, updateItem, useItems } from "./shared";

export function BlogTab() {
  const [view, setView] = useState<"posts" | "categories" | "authors">("posts");
  return (
    <>
      <Pills label="Blog" value={view} onChange={setView} items={[["posts", "Posts"], ["categories", "Categories"], ["authors", "Authors"]]} />
      {view === "posts" && <Posts />}
      {view === "categories" && <Categories />}
      {view === "authors" && <Authors />}
    </>
  );
}

function Posts() {
  const posts = useItems("blog");
  const cats = useItems("blog_category");
  const authors = useItems("author");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ title: "", slug: "", body: "", status: "draft" as CmsItem["status"], category: "", author: "", excerpt: "", image_url: "" });
  const [formError, setFormError] = useState("");

  const openForm = (p: CmsItem | "new") => {
    setFormError("");
    setF(p === "new"
      ? { title: "", slug: "", body: "", status: "draft", category: cats.items[0]?.title ?? "", author: authors.items.find((a) => a.status === "published")?.title ?? "", excerpt: "", image_url: "" }
      : { title: p.title, slug: p.slug, body: p.body, status: p.status, category: dataText(p, "category"), author: dataText(p, "author"), excerpt: dataText(p, "excerpt"), image_url: dataText(p, "image_url") });
    setOpen(p);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const data = { category: f.category, author: f.author, excerpt: f.excerpt, image_url: f.image_url };
    const ok = await posts.run(async () => {
      try {
        if (open === "new") await createItem("blog", { title: f.title, slug: f.slug || undefined, body: f.body, data, status: f.status });
        else if (open) await updateItem(open.id, { title: f.title, slug: f.slug, body: f.body, data, status: f.status });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  return (
    <Panel title="Posts" sub={`${posts.items.length} posts`} right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New post</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={posts.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Post</Th><Th>Category</Th><Th>Author</Th><Th>Status</Th><Th>Updated</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!posts.items.length && <tr><td colSpan={6}><Empty loading={posts.loading}>No posts yet.</Empty></td></tr>}
          {posts.items.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900">{p.title}<p className="font-mono text-xs font-normal text-slate-400">/blog/{p.slug}</p></td>
              <td className="px-4 py-3">{dataText(p, "category") ? <Badge tone="blue">{dataText(p, "category")}</Badge> : "—"}</td>
              <td className="px-4 py-3 text-slate-600">{dataText(p, "author") || "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(p.updated_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={`${btnGhost} ${small}`} disabled={posts.busy} onClick={() => posts.run(() => updateItem(p.id, { status: p.status === "published" ? "draft" : "published" }))}>{p.status === "published" ? "Unpublish" : "Publish"}</button>
                  <button type="button" className={`${btnGhost} ${small}`} onClick={() => openForm(p)}>Edit</button>
                  <button type="button" className={`${btnGhost} ${small}`} disabled={posts.busy} onClick={() => window.confirm(`Delete "${p.title}"?`) && posts.run(() => deleteItem(p.id))}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open !== null} title={open === "new" ? "New post" : "Edit post"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={formError} />
          <Field label="Title"><input className={inputCls} required maxLength={255} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Address" hint="The end of the web address. Leave blank to make it from the title."><input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                <option value="">None</option>
                {cats.items.map((c) => <option key={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <Field label="Author">
              <select className={inputCls} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })}>
                <option value="">None</option>
                {authors.items.filter((a) => a.status === "published" || a.title === f.author).map((a) => <option key={a.id}>{a.title}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Summary"><input className={inputCls} maxLength={300} value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} /></Field>
          <Field label="Cover image address"><input className={inputCls} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
          <Field label="Post"><textarea className={`${inputCls} min-h-[10rem]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as CmsItem["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={posts.busy}>Save</button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

function Categories() {
  const cats = useItems("blog_category");
  const posts = useItems("blog");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<CmsItem | null>(null);
  const count = (c: CmsItem) => posts.items.filter((p) => dataText(p, "category") === c.title).length;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await cats.run(() => (editing ? updateRename(editing, name) : createItem("blog_category", { title: name.trim(), status: "published" })))) {
      setName("");
      setEditing(null);
    }
  };
  /** Renaming also moves the posts, so none is left pointing at a name that no longer exists. */
  const updateRename = async (c: CmsItem, to: string) => {
    await updateItem(c.id, { title: to.trim() });
    await Promise.all(posts.items.filter((p) => dataText(p, "category") === c.title).map((p) => updateItem(p.id, { data: { ...p.data, category: to.trim() } })));
    posts.reload();
  };

  return (
    <Panel title="Categories" sub="Topics posts are filed under">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <div className="min-w-[14rem] flex-1"><Field label={editing ? `Rename "${editing.title}"` : "New category"}><input className={inputCls} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
        <button type="submit" className={btnPrimary} disabled={cats.busy}>{editing ? "Save name" : "Add category"}</button>
        {editing && <button type="button" className={btnGhost} onClick={() => { setEditing(null); setName(""); }}>Cancel</button>}
      </form>
      <div className="p-4 pb-0"><ErrorBanner message={cats.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Category</Th><Th>Posts</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!cats.items.length && <tr><td colSpan={3}><Empty loading={cats.loading}>No categories yet.</Empty></td></tr>}
          {cats.items.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{c.title}</td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{count(c)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" className={`${btnGhost} mr-2 ${small}`} onClick={() => { setEditing(c); setName(c.title); }}>Rename</button>
                <button type="button" className={`${btnGhost} ${small}`} disabled={cats.busy} onClick={() => window.confirm(`Delete "${c.title}"?`) && cats.run(() => deleteItem(c.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Authors() {
  const authors = useItems("author");
  const posts = useItems("blog");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ name: "", role: "", active: true });
  const [formError, setFormError] = useState("");
  const count = (a: CmsItem) => posts.items.filter((p) => dataText(p, "author") === a.title).length;

  const openForm = (a: CmsItem | "new") => {
    setFormError("");
    setF(a === "new" ? { name: "", role: "", active: true } : { name: a.title, role: dataText(a, "role"), active: a.status === "published" });
    setOpen(a);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { title: f.name.trim(), data: { role: f.role }, status: (f.active ? "published" : "draft") as CmsItem["status"] };
    const ok = await authors.run(async () => {
      try {
        if (open === "new") await createItem("author", payload);
        else if (open) {
          await updateItem(open.id, payload);
          if (open.title !== payload.title) await Promise.all(posts.items.filter((p) => dataText(p, "author") === open.title).map((p) => updateItem(p.id, { data: { ...p.data, author: payload.title } })));
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) {
      setOpen(null);
      posts.reload();
    }
  };

  return (
    <Panel title="Authors" sub="People who write for the blog" right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New author</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={authors.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Author</Th><Th>Role</Th><Th>Posts</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!authors.items.length && <tr><td colSpan={5}><Empty loading={authors.loading}>No authors yet. Add one before writing a post.</Empty></td></tr>}
          {authors.items.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{a.title}</td>
              <td className="px-4 py-3 text-slate-600">{dataText(a, "role") || "—"}</td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{count(a)}</td>
              <td className="px-4 py-3">{a.status === "published" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" className={`${btnGhost} mr-2 ${small}`} onClick={() => openForm(a)}>Edit</button>
                <button type="button" className={`${btnGhost} ${small}`} disabled={authors.busy} onClick={() => window.confirm(`Delete "${a.title}"?`) && authors.run(() => deleteItem(a.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open !== null} title={open === "new" ? "New author" : "Edit author"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={formError} />
          <Field label="Name"><input className={inputCls} required maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Role" hint="For example Content Editor or Education consultant."><input className={inputCls} maxLength={100} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Active (can be chosen for new posts)</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={authors.busy}>Save</button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
