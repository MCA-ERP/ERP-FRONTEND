"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls } from "@/components/admin/ui";
import { Empty, Pills, StatusBadge, createItem, dataText, deleteItem, small, updateItem, useItems } from "./shared";

interface Section { name: string; heading: string; text: string }
const LAYOUTS = ["Standard", "Landing page", "Article", "Legal"];
const pathOf = (i: CmsItem) => dataText(i, "path") || (i.slug === "home" ? "/" : "/" + i.slug);
const sectionsOf = (i: CmsItem): Section[] => (Array.isArray(i.data?.sections) ? (i.data.sections as Section[]) : []);

export function PagesTab() {
  const [view, setView] = useState<"all" | "drafts">("all");
  const { items, loading, error, busy, run } = useItems("page");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ title: "", path: "", layout: "Standard", body: "", status: "draft" as CmsItem["status"], sections: [] as Section[] });
  const [formError, setFormError] = useState("");

  const openForm = (item: CmsItem | "new") => {
    setFormError("");
    setF(item === "new"
      ? { title: "", path: "/", layout: "Standard", body: "", status: "draft", sections: [] }
      : { title: item.title, path: pathOf(item), layout: dataText(item, "layout") || "Standard", body: item.body, status: item.status, sections: sectionsOf(item) });
    setOpen(item);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\/[a-z0-9\-/]*$/.test(f.path)) return setFormError("The address must start with / and use lowercase letters, numbers and hyphens, like /about-us.");
    const slug = f.path === "/" ? "home" : f.path.replace(/^\/|\/$/g, "").replace(/\//g, "-");
    const existing = open && open !== "new" ? open.data : {};
    const data = { ...existing, path: f.path, layout: f.layout, sections: f.sections.filter((s) => s.name.trim() || s.heading.trim() || s.text.trim()) };
    const ok = await run(async () => {
      try {
        if (open === "new") await createItem("page", { title: f.title, slug, body: f.body, data, status: f.status });
        else if (open) await updateItem(open.id, { title: f.title, slug, body: f.body, data, status: f.status });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  const setSection = (i: number, patch: Partial<Section>) => setF({ ...f, sections: f.sections.map((s, n) => (n === i ? { ...s, ...patch } : s)) });
  const move = (i: number, by: -1 | 1) => {
    const next = [...f.sections];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setF({ ...f, sections: next });
  };
  const rows = view === "drafts" ? items.filter((i) => i.status === "draft") : items.filter((i) => i.status !== "archived");

  return (
    <>
      <Pills label="Pages" value={view} onChange={setView} items={[["all", "All pages"], ["drafts", "Drafts to publish"]]} />
      <Panel title={view === "drafts" ? "Drafts" : "Website pages"} sub="Pages and the sections on them. Only published pages are served." right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New page</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Page</Th><Th>Address</Th><Th>Layout</Th><Th>Status</Th><Th>Updated</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={6}><Empty loading={loading}>{view === "drafts" ? "No drafts." : "No pages yet."}</Empty></td></tr>}
            {rows.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{i.title}<p className="text-xs font-normal text-slate-400">{sectionsOf(i).length} section{sectionsOf(i).length === 1 ? "" : "s"}</p></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{pathOf(i)}</td>
                <td className="px-4 py-3 text-slate-600">{dataText(i, "layout") || "Standard"}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(i.updated_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" className={`${i.status === "published" ? btnGhost : btnPrimary} ${small}`} disabled={busy} onClick={() => run(() => updateItem(i.id, { status: i.status === "published" ? "draft" : "published" }))}>{i.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button type="button" className={`${btnGhost} ${small}`} onClick={() => openForm(i)}>Edit</button>
                    <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => window.confirm(`Delete "${i.title}"?`) && run(() => deleteItem(i.id))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Modal open={open !== null} title={open === "new" ? "New page" : "Edit page"} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={formError} />
            <Field label="Page title"><input className={inputCls} required maxLength={255} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Address" hint="Lowercase, words joined by hyphens. / is the home page."><input className={inputCls} required value={f.path} onChange={(e) => setF({ ...f, path: e.target.value.trim().toLowerCase() })} /></Field>
              <Field label="Layout"><select className={inputCls} value={f.layout} onChange={(e) => setF({ ...f, layout: e.target.value })}>{LAYOUTS.map((l) => <option key={l}>{l}</option>)}</select></Field>
            </div>
            <Field label="Content" hint="The main text. Use sections below for blocks like a hero or a call to action."><textarea className={`${inputCls} min-h-[6rem]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</legend>
              {f.sections.map((s, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500">{i + 1}.</span>
                    <input className={inputCls} aria-label={`Section ${i + 1} name`} placeholder="Name, e.g. Hero" value={s.name} onChange={(e) => setSection(i, { name: e.target.value })} />
                    <button type="button" className={`${btnGhost} ${small}`} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                    <button type="button" className={`${btnGhost} ${small}`} aria-label="Move down" disabled={i === f.sections.length - 1} onClick={() => move(i, 1)}>↓</button>
                    <button type="button" className={`${btnGhost} ${small}`} onClick={() => setF({ ...f, sections: f.sections.filter((_, n) => n !== i) })}>Remove</button>
                  </div>
                  <input className={inputCls} aria-label={`Section ${i + 1} heading`} placeholder="Heading" value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} />
                  <textarea className={`${inputCls} min-h-[4rem]`} aria-label={`Section ${i + 1} text`} placeholder="Text" value={s.text} onChange={(e) => setSection(i, { text: e.target.value })} />
                </div>
              ))}
              <button type="button" className={btnGhost} onClick={() => setF({ ...f, sections: [...f.sections, { name: "", heading: "", text: "" }] })}>+ Add section</button>
            </fieldset>
            <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as CmsItem["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>{f.status === "published" ? "Save and publish" : "Save draft"}</button>
            </div>
          </form>
        </Modal>
      </Panel>
    </>
  );
}
