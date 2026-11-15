"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { Empty, Pills, StatusBadge, createItem, dataText, deleteItem, small, updateItem, useItems } from "./shared";

export function FaqTab() {
  const [view, setView] = useState<"questions" | "categories">("questions");
  const { items, loading, error, busy, run } = useItems("faq");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ question: "", answer: "", category: "", order: "0", published: true });
  const [formError, setFormError] = useState("");

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of items) m.set(dataText(q, "category") || "General", (m.get(dataText(q, "category") || "General") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const openForm = (q: CmsItem | "new") => {
    setFormError("");
    setF(q === "new" ? { question: "", answer: "", category: categories[0]?.[0] ?? "General", order: "0", published: true } : { question: q.title, answer: q.body, category: dataText(q, "category") || "General", order: String(q.sort_order), published: q.status === "published" });
    setOpen(q);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { title: f.question, body: f.answer, data: { category: f.category.trim() || "General" }, sort_order: Number(f.order) || 0, status: (f.published ? "published" : "draft") as CmsItem["status"] };
    const ok = await run(async () => {
      try {
        if (open === "new") await createItem("faq", { ...payload, slug: undefined });
        else if (open) await updateItem(open.id, payload);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  return (
    <>
      <Pills label="FAQ" value={view} onChange={setView} items={[["questions", "Questions & answers"], ["categories", "Categories"]]} />
      {view === "categories" ? (
        <Panel title="Categories" sub="Groups on the FAQ page. A category exists as long as a question uses it.">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Category</Th><Th>Questions</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!categories.length && <tr><td colSpan={2}><Empty loading={loading}>No questions yet.</Empty></td></tr>}
              {categories.map(([name, n]) => <tr key={name}><td className="px-4 py-3 font-semibold text-slate-900">{name}</td><td className="px-4 py-3 tabular-nums text-slate-600">{n}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      ) : (
        <Panel title="Questions" sub="Shown on the website's FAQ page, grouped by category" right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New question</button>}>
          <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Question</Th><Th>Category</Th><Th>Order</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!items.length && <tr><td colSpan={5}><Empty loading={loading}>No questions yet.</Empty></td></tr>}
              {items.map((q) => (
                <tr key={q.id} className="align-top hover:bg-slate-50">
                  <td className="max-w-lg px-4 py-3"><p className="font-semibold text-slate-900">{q.title}</p><p className="line-clamp-2 text-xs text-slate-400">{q.body}</p></td>
                  <td className="px-4 py-3"><Badge tone="blue">{dataText(q, "category") || "General"}</Badge></td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{q.sort_order}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className={`${btnGhost} mr-2 ${small}`} onClick={() => openForm(q)}>Edit</button>
                    <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => window.confirm("Delete this question?") && run(() => deleteItem(q.id))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Modal open={open !== null} title={open === "new" ? "New question" : "Edit question"} onClose={() => setOpen(null)}>
            <form onSubmit={save} className="space-y-3">
              <ErrorBanner message={formError} />
              <Field label="Question"><input className={inputCls} required maxLength={255} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></Field>
              <Field label="Answer"><textarea className={`${inputCls} min-h-[8rem]`} required value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" hint="Pick one or type a new one.">
                  <input className={inputCls} list="faq-cats" maxLength={60} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
                  <datalist id="faq-cats">{categories.map(([c]) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label="Order" hint="Lower numbers come first."><input type="number" min={0} className={inputCls} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />Show on the website</label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
                <button type="submit" className={btnPrimary} disabled={busy}>Save</button>
              </div>
            </form>
          </Modal>
        </Panel>
      )}
    </>
  );
}
