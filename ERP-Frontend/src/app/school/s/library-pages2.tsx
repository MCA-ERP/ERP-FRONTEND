"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { Foot, FormFoot, okBox, primaryCls } from "./fee-pages";

const L = "/school/lib";
type Kind = "categories" | "publishers" | "authors";
interface M { id: string; name: string; status: string; shelf?: string; city?: string; contact?: string; titles: number; copies?: number; most_issued?: string }
const CFG: Record<Kind, { one: string; many: string; head: string[]; row: (m: M) => (string | number)[] }> = {
  categories: { one: "Category", many: "Book categories", head: ["Category", "Titles", "Copies", "Shelf"], row: (m) => [m.name, m.titles, m.copies ?? 0, m.shelf || "—"] },
  publishers: { one: "Publisher", many: "Publishers", head: ["Publisher", "City", "Titles", "Contact"], row: (m) => [m.name, m.city || "—", m.titles, m.contact || "—"] },
  authors: { one: "Author", many: "Authors", head: ["Author", "Titles", "Most issued"], row: (m) => [m.name, m.titles, m.most_issued ?? "—"] },
};

export function LibraryMasterPages({ kind, tab }: { kind: Kind; tab: "list" | "add" }) {
  const c = CFG[kind]; const d = useLoad(() => schoolFetch<{ items: M[] }>(`${L}/${kind}`), [kind]); const act = useAction(() => d.reload());
  const blank = { name: "", shelf: "", city: "", contact: "" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<M | null>(null);
  const all = d.data?.items ?? []; const err = d.error || act.error;
  if (tab === "add") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${L}/${kind}`, json("POST", kind === "categories" ? { name: f.name, shelf: f.shelf } : kind === "publishers" ? { name: f.name, city: f.city, contact: f.contact } : { name: f.name })))) { setF(blank); setMsg(`Saved. It appears in the ${c.one} List.`); } };
    return <div>{okBox(msg)}<FormCard title={`Add ${c.one}`} cols={kind === "authors" ? "lg:grid-cols-1" : "lg:grid-cols-3"} onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label={c.one}><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      {kind === "categories" && <Field label="Shelf"><input className={inputCls} maxLength={30} placeholder="A1-A4" value={f.shelf} onChange={(e) => setF({ ...f, shelf: e.target.value })} /></Field>}
      {kind === "publishers" && <><Field label="City"><input className={inputCls} maxLength={60} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field><Field label="Contact"><input className={inputCls} maxLength={60} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field></>}
    </FormCard><p className="mt-3 text-xs text-slate-500">Titles{kind === "categories" ? " and copies" : ""} are counted from the books, so they aren&apos;t typed here.</p></div>;
  }
  const rows = all.filter((i) => has(i, search)); const a = all.filter((i) => i.status === "Active").length;
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{okBox(msg)}<Tiles items={[{ label: c.many, value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
    <ListPanel title={c.many} noun="records" search={search} onSearch={setSearch} exportName={kind} head={[...c.head, "Status"]} exportRows={rows.map((i) => [...c.row(i), i.status])}
      extra={!all.length ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${L}/${kind}/from-books`, json("POST", {})); setMsg(`${r.added} added from the books.`); })}>Add from the books</button> : null}
      tableHead={[...c.head, "Status", ""]} empty={d.loading ? "Loading…" : "None yet."} rows={rows.map((i) => [...c.row(i).map((v, k) => (k === 0 ? <b key="n" className="font-semibold text-slate-900">{v}</b> : v)), <Chip key="s" tone={i.status === "Active" ? "good" : "mute"}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl>{c.head.slice(1).map((h, k) => <Row key={h} k={h} v={c.row(view)[k + 1]} />)}<Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${L}/${kind}/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal></div>;
}

// ═════════════ copies and barcodes ═════════════
const P: Record<string, string> = { "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", B: "nnwnnwnnw", G: "nnnnnwwnw", "*": "nwnnwnwnn" };
/** A Code 39 barcode as SVG rects. */
function bars(text: string) {
  let x = 0; const out: { x: number; w: number }[] = [];
  for (const ch of `*${text}*`) { const p = P[ch]; if (!p) continue; for (let i = 0; i < 9; i++) { const w = p[i] === "w" ? 3 : 1; if (i % 2 === 0) out.push({ x, w }); x += w; } x += 1; }
  return { rects: out, width: x };
}
const Barcode = ({ text }: { text: string }) => { const b = bars(text); return <svg viewBox={`0 0 ${b.width} 30`} preserveAspectRatio="none" className="h-9 w-full" aria-label={`Barcode ${text}`}>{b.rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={30} fill="#111" />)}</svg>; };
const svgText = (text: string) => { const b = bars(text); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${b.width} 30" preserveAspectRatio="none" style="width:100%;height:34px">${b.rects.map((r) => `<rect x="${r.x}" y="0" width="${r.w}" height="30" fill="#111"/>`).join("")}</svg>`; };
interface C { id: string; book_id: string; accession_no: string; barcode: string; shelf: string; call_no: string; status: string; title: string }
export function CopyPages({ tab }: { tab: "accession-number" | "barcode" }) {
  const d = useLoad(() => schoolFetch<{ books: { id: string; title: string }[]; items: C[] }>(`${L}/copies`), []); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<C | null>(null); const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ book_id: "", count: "1", shelf: "", call_no: "" });
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length; const err = d.error || act.error;
  if (tab === "barcode") {
    const labels = rows.slice(0, 24);
    const print = () => printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>body{font:11px Arial;margin:10mm}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.l{border:1px dashed #999;padding:6px;text-align:center;height:24mm}.l b{display:block;font-size:12px}</style></head><body><div class="g">${labels.map((c) => `<div class="l">${svgText(c.barcode)}<b>${c.barcode}</b>${c.title.replace(/</g, "&lt;")} · ${c.accession_no}</div>`).join("")}</div></body></html>`);
    return <div><ErrorBanner message={err} /><div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Labels <span className="ml-1 text-xs font-normal text-slate-500">{labels.length} shown</span></h2><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={!labels.length} onClick={print}>Print labels</button></div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{labels.map((c) => <div key={c.id} className="rounded-lg border border-dashed border-slate-300 p-3 text-center"><Barcode text={c.barcode} /><p className="mt-1 text-[12px] font-semibold text-slate-900">{c.barcode}</p><p className="text-[11px] text-slate-500">{c.title} · {c.accession_no}</p></div>)}{!labels.length && <p className="col-span-full py-6 text-center text-sm text-slate-400">{d.loading ? "Loading…" : "No copies yet. Add them in Accession Number."}</p>}</div></div></div>;
  }
  const add = async (e: FormEvent) => { e.preventDefault(); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ added: number; first: string }>(`${L}/copies`, json("POST", { book_id: f.book_id || d.data?.books[0]?.id, count: Number(f.count), shelf: f.shelf, call_no: f.call_no })); t = `${r.added} copies added, starting at accession no. ${r.first}.`; })) { setAdding(false); setMsg(t); } };
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{okBox(msg)}<Tiles items={[{ label: "Book copies", value: all.length, sub: "All records" }, { label: "Issued", value: n("Issued"), sub: `${pct(n("Issued"), all.length)} of shown` }, { label: "Available", value: n("Available"), sub: `${pct(n("Available"), all.length)} of shown` }]} />
    <ListPanel title="Book copies" noun="copies" search={search} onSearch={setSearch} exportName="book-copies" head={["Accession no.", "Title", "Barcode", "Shelf", "Call no.", "Status"]} exportRows={rows.map((i) => [i.accession_no, i.title, i.barcode, i.shelf, i.call_no, i.status])}
      extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add copies</button>} tableHead={["Accession no.", "Title", "Barcode", "Shelf", "Call no.", "Status", ""]} empty={d.loading ? "Loading…" : "No copies yet."}
      rows={rows.map((i) => [i.accession_no, <b key="t" className="font-semibold text-slate-900">{i.title}</b>, i.barcode, i.shelf || "—", i.call_no || "—", <Chip key="s" tone={i.status === "Available" ? "good" : "mute"}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Accession no." v={view.accession_no} /><Row k="Barcode" v={view.barcode} /><Row k="Shelf" v={view.shelf || "—"} /><Row k="Call no." v={view.call_no || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${L}/copies/${view.id}`, json("PATCH", { status: view.status === "Available" ? "Issued" : "Available" }))).then((ok) => ok && setView(null))}>Mark {view.status === "Available" ? "issued" : "available"}</button>} /></>}</Modal>
    <Modal open={adding} title="Add copies" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Book"><select className={inputCls} value={f.book_id || d.data?.books[0]?.id || ""} onChange={(e) => setF({ ...f, book_id: e.target.value })}>{d.data?.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></Field><div className="grid grid-cols-3 gap-3"><Field label="How many"><input type="number" min={1} max={100} required className={inputCls} value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} /></Field><Field label="Shelf"><input className={inputCls} maxLength={30} value={f.shelf} onChange={(e) => setF({ ...f, shelf: e.target.value })} /></Field><Field label="Call no."><input className={inputCls} maxLength={40} value={f.call_no} onChange={(e) => setF({ ...f, call_no: e.target.value })} /></Field></div><p className="text-xs text-slate-500">Accession numbers and barcodes are made automatically. The book&apos;s copies and available counts go up too.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal></div>;
}
