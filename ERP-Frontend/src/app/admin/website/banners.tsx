"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CmsItem } from "@/lib/admin-api";
import { Panel } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls } from "@/components/admin/ui";
import { Empty, Pills, createItem, dataText, dayEnd, dayStart, deleteItem, small, toDay, updateItem, useItems } from "./shared";

const WHERE = ["Home · top", "Pricing", "Features", "Dashboard (school portal)"];

type State = "live" | "scheduled" | "archived" | "draft";
const stateOf = (b: CmsItem): State => {
  if (b.status === "archived") return "archived";
  if (b.status === "draft") return "draft";
  const now = Date.now();
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return "archived";
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return "scheduled";
  return "live";
};
const TONE = { live: "green", scheduled: "blue", draft: "gray", archived: "gray" } as const;
const LABEL = { live: "Live", scheduled: "Scheduled", draft: "Draft", archived: "Archived" } as const;

export function BannersTab() {
  const [view, setView] = useState<"schedule" | "archive">("schedule");
  const { items, loading, error, busy, run } = useItems("banner");
  const [open, setOpen] = useState<CmsItem | "new" | null>(null);
  const blank = { title: "", where: WHERE[0], link: "", image_url: "", from: "", to: "", publish: true };
  const [f, setF] = useState(blank);
  const [formError, setFormError] = useState("");

  const openForm = (b: CmsItem | "new", reuse = false) => {
    setFormError("");
    setF(b === "new" ? blank : { title: b.title, where: dataText(b, "where") || WHERE[0], link: dataText(b, "link"), image_url: dataText(b, "image_url"), from: reuse ? "" : toDay(b.starts_at), to: reuse ? "" : toDay(b.ends_at), publish: b.status !== "draft" || reuse });
    setOpen(reuse ? "new" : b);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { title: f.title, data: { where: f.where, link: f.link, image_url: f.image_url }, starts_at: dayStart(f.from), ends_at: dayEnd(f.to), status: (f.publish ? "published" : "draft") as CmsItem["status"] };
    const ok = await run(async () => {
      try {
        if (open === "new") await createItem("banner", payload);
        else if (open) await updateItem(open.id, payload);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(null);
  };

  const rows = items.filter((b) => (view === "archive") === (stateOf(b) === "archived"));
  return (
    <>
      <Pills label="Banners" value={view} onChange={setView} items={[["schedule", "Live & scheduled"], ["archive", "Archive"]]} />
      <Panel title={view === "archive" ? "Archived banners" : "Live and scheduled banners"} sub="A banner shows between its start and end dates, and stops by itself after the end." right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ New banner</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Banner</Th><Th>Where</Th><Th>Starts</Th><Th>Ends</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={6}><Empty loading={loading}>{view === "archive" ? "No archived banners." : "No banners yet."}</Empty></td></tr>}
            {rows.map((b) => {
              const s = stateOf(b);
              return (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{b.title}</td>
                  <td className="px-4 py-3 text-slate-600">{dataText(b, "where") || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{b.starts_at ? fmtDate(b.starts_at) : "Immediately"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{b.ends_at ? fmtDate(b.ends_at) : "No end"}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[s]}>{LABEL[s]}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {s === "archived" ? (
                        <button type="button" className={`${btnGhost} ${small}`} onClick={() => openForm(b, true)}>Reuse</button>
                      ) : (
                        <>
                          <button type="button" className={`${btnGhost} ${small}`} onClick={() => openForm(b)}>Edit</button>
                          <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => run(() => updateItem(b.id, { status: "archived" }))}>Archive</button>
                        </>
                      )}
                      <button type="button" className={`${btnGhost} ${small}`} disabled={busy} onClick={() => window.confirm(`Delete "${b.title}"?`) && run(() => deleteItem(b.id))}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Modal open={open !== null} title={open === "new" ? "New banner" : "Edit banner"} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={formError} />
            <Field label="Banner text"><input className={inputCls} required maxLength={255} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Where"><select className={inputCls} value={f.where} onChange={(e) => setF({ ...f, where: e.target.value })}>{WHERE.map((w) => <option key={w}>{w}</option>)}</select></Field>
              <Field label="Button link"><input className={inputCls} placeholder="/pricing" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field>
              <Field label="Start" hint="Empty: show straight away."><input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
              <Field label="End" hint="Empty: show until archived."><input type="date" className={inputCls} min={f.from || undefined} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
            </div>
            <Field label="Image address" hint="Optional, 1600 × 400 px. Paste the link of an image already on your website or storage."><input className={inputCls} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={f.publish} onChange={(e) => setF({ ...f, publish: e.target.checked })} />Publish (turn off to keep it as a draft)</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>Save banner</button>
            </div>
          </form>
        </Modal>
      </Panel>
    </>
  );
}
