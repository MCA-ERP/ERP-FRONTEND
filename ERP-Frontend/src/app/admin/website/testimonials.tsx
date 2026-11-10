"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { Empty, Pills, createItem, dataText, deleteItem, small, updateItem, useItems } from "./shared";

const hasConsent = (t: CmsItem) => t.data?.consent === true || t.data?.consent === "true";
const LABEL = { draft: "Pending", published: "Approved", archived: "Rejected" } as const;
const TONE = { draft: "blue", published: "green", archived: "gray" } as const;

export function TestimonialsTab() {
  const [view, setView] = useState<"all" | "approve">("all");
  const { items, loading, error, busy, run } = useItems("testimonial");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const [f, setF] = useState({ person: "", school: "", quote: "", photo: "", consent: false });
  const [formError, setFormError] = useState("");

  const openForm = (t: CmsItem | "new") => {
    setFormError("");
    setF(t === "new" ? { person: "", school: "", quote: "", photo: "", consent: false } : { person: dataText(t, "author") || t.title, school: dataText(t, "school"), quote: t.body, photo: dataText(t, "image_url"), consent: hasConsent(t) });
    setOpen(t);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const data = { author: f.person, school: f.school, image_url: f.photo, consent: f.consent };
    const ok = await run(async () => {
      try {
        if (open === "new") await createItem("testimonial", { title: f.person, body: f.quote, data });
        else if (open) await updateItem(open.id, { title: f.person, body: f.quote, data });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  const rows = view === "approve" ? items.filter((t) => t.status === "draft") : items;
  return (
    <>
      <Pills label="Testimonials" value={view} onChange={setView} items={[["all", "All testimonials"], ["approve", `Waiting for approval (${items.filter((t) => t.status === "draft").length})`]]} />
      <Panel title={view === "approve" ? "Waiting for approval" : "Testimonials"} sub="Only approved testimonials appear on the website, and only with the school's consent." right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Add testimonial</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Person</Th><Th>Quote</Th><Th>Consent</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={5}><Empty loading={loading}>{view === "approve" ? "Nothing to approve." : "No testimonials yet."}</Empty></td></tr>}
            {rows.map((t) => (
              <tr key={t.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{dataText(t, "author") || t.title}</p><p className="text-xs text-slate-400">{dataText(t, "school")}</p></td>
                <td className="max-w-md px-4 py-3 text-slate-600">{t.body}</td>
                <td className="px-4 py-3">{hasConsent(t) ? <Badge tone="green">On file</Badge> : <Badge tone="red">Missing</Badge>}</td>
                <td className="px-4 py-3"><Badge tone={TONE[t.status]}>{LABEL[t.status]}</Badge></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {t.status !== "published" && <button type="button" className={`${btnPrimary} ${small}`} disabled={busy || !hasConsent(t)} title={hasConsent(t) ? undefined : "Add the school's consent first (Edit)"} onClick={() => run(() => updateItem(t.id, { status: "published" }))}>Approve</button>}
                    {t.status === "draft" && <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => run(() => updateItem(t.id, { status: "archived" }))}>Reject</button>}
                    {t.status === "published" && <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => run(() => updateItem(t.id, { status: "draft" }))}>Take down</button>}
                    <button type="button" className={`${btnGhost} ${small}`} onClick={() => openForm(t)}>Edit</button>
                    <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => window.confirm("Delete this testimonial?") && run(() => deleteItem(t.id))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Modal open={open !== null} title={open === "new" ? "New testimonial" : "Edit testimonial"} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={formError} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={inputCls} required maxLength={150} value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} /></Field>
              <Field label="School"><input className={inputCls} maxLength={200} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} /></Field>
            </div>
            <Field label="Quote"><textarea className={`${inputCls} min-h-[6rem]`} required value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></Field>
            <Field label="Photo address" hint="Optional. Square, shown in a circle."><input className={inputCls} value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })} /></Field>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-mca-blue" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /><span>The school agreed to be quoted<br /><span className="text-xs text-slate-400">Keep their written consent on file. A testimonial cannot be approved without this.</span></span></label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      </Panel>
    </>
  );
}
