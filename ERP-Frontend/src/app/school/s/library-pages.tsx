"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { Foot, FormFoot, okBox } from "./fee-pages";

const L = "/school/lib";
interface B { id: string; book_no: string; title: string; author: string; category: string; publisher: string; copies: number; available: number; status: string }
const nextNo = (xs: B[]) => `B${String(Math.max(0, ...xs.map((x) => Number(x.book_no.replace(/\D/g, "")) || 0)) + 1).padStart(2, "0")}`;

export function BookPages({ tab }: { tab: "add-book" | "book-list" | "edit-book" }) {
  const b = useLoad(() => schoolFetch<{ categories: string[]; publishers: string[]; items: B[] }>(`${L}/books`), []);
  const act = useAction(() => b.reload());
  const blank = { book_no: "", title: "", author: "", category: "", publisher: "", copies: "1", available: "1" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<B | null>(null);
  const [pick, setPick] = useState(""); const [e, setE] = useState<Partial<Record<keyof B, string>>>({});
  const x = b.data; const items = x?.items ?? []; const err = b.error || act.error;
  const lists = <><datalist id="lib-cat">{x?.categories.map((c) => <option key={c} value={c} />)}</datalist><datalist id="lib-pub">{x?.publishers.map((c) => <option key={c} value={c} />)}</datalist></>;
  if (tab === "add-book") {
    const save = async (ev: FormEvent) => { ev.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${L}/books`, json("POST", { book_no: f.book_no || nextNo(items), title: f.title, author: f.author, category: f.category, publisher: f.publisher, copies: Number(f.copies), available: Number(f.available) })))) { setF(blank); setMsg("Saved. It appears in Book List."); } };
    return <div>{okBox(msg)}{lists}<FormCard title="Add Book" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Book no."><input className={inputCls} maxLength={20} placeholder={nextNo(items)} value={f.book_no} onChange={(ev) => setF({ ...f, book_no: ev.target.value })} /></Field>
      <Field label="Title"><input className={inputCls} required maxLength={200} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} /></Field>
      <Field label="Author"><input className={inputCls} maxLength={120} value={f.author} onChange={(ev) => setF({ ...f, author: ev.target.value })} /></Field>
      <Field label="Category"><input className={inputCls} list="lib-cat" maxLength={80} value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} /></Field>
      <Field label="Publisher"><input className={inputCls} list="lib-pub" maxLength={80} value={f.publisher} onChange={(ev) => setF({ ...f, publisher: ev.target.value })} /></Field>
      <Field label="Copies"><input type="number" min={0} max={1000} required className={inputCls} value={f.copies} onChange={(ev) => setF({ ...f, copies: ev.target.value, available: f.available > ev.target.value ? ev.target.value : f.available })} /></Field>
      <Field label="Available"><input type="number" min={0} max={Number(f.copies)} required className={inputCls} value={f.available} onChange={(ev) => setF({ ...f, available: ev.target.value })} /></Field></FormCard></div>;
  }
  if (tab === "edit-book") {
    const cur = items.find((i) => i.id === (pick || items[0]?.id)); const v = (k: keyof B) => e[k] ?? String(cur?.[k] ?? "");
    const save = async (ev: FormEvent) => { ev.preventDefault(); setMsg(""); if (cur && await act.run(() => schoolFetch(`${L}/books/${cur.id}`, json("PUT", { title: v("title"), author: v("author"), category: v("category"), publisher: v("publisher"), copies: Number(v("copies")), available: Number(v("available")) })))) { setE({}); setMsg("Saved."); } };
    return <div>{okBox(msg)}{lists}<div className="mb-5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Choose<select aria-label="Book" value={cur?.id ?? ""} onChange={(ev) => { setPick(ev.target.value); setE({}); setMsg(""); }} className="max-w-[28rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{items.map((i) => <option key={i.id} value={i.id}>{i.book_no} · {i.title}</option>)}</select></label></div>
      {cur ? <FormCard title={`Edit ${cur.book_no}`} submitLabel="Save changes" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setE({}); setMsg(""); }} busy={act.busy} error={err}>
        <Field label="Book no."><input className={inputCls} readOnly value={cur.book_no} /></Field>
        <Field label="Title"><input className={inputCls} required maxLength={200} value={v("title")} onChange={(ev) => setE({ ...e, title: ev.target.value })} /></Field>
        <Field label="Author"><input className={inputCls} maxLength={120} value={v("author")} onChange={(ev) => setE({ ...e, author: ev.target.value })} /></Field>
        <Field label="Category"><input className={inputCls} list="lib-cat" maxLength={80} value={v("category")} onChange={(ev) => setE({ ...e, category: ev.target.value })} /></Field>
        <Field label="Publisher"><input className={inputCls} list="lib-pub" maxLength={80} value={v("publisher")} onChange={(ev) => setE({ ...e, publisher: ev.target.value })} /></Field>
        <Field label="Copies"><input type="number" min={0} max={1000} required className={inputCls} value={v("copies")} onChange={(ev) => setE({ ...e, copies: ev.target.value })} /></Field>
        <Field label="Available"><input type="number" min={0} required className={inputCls} value={v("available")} onChange={(ev) => setE({ ...e, available: ev.target.value })} /></Field>
        <Field label="Status"><select className={inputCls} value={Number(v("available")) > 0 ? "Available" : "All issued"} onChange={(ev) => setE({ ...e, available: ev.target.value === "All issued" ? "0" : String(Math.max(1, Number(v("available")))) })}><option>Available</option><option>All issued</option></select></Field></FormCard> : <p className="py-10 text-center text-sm text-slate-400">{b.loading ? "Loading…" : "No books yet."}</p>}</div>;
  }
  const rows = items.filter((i) => has(i, search)); const n = (s: string) => items.filter((i) => i.status === s).length;
  return <div className="space-y-5" data-report><ErrorBanner message={err} /><Tiles items={[{ label: "Books", value: items.length, sub: "All records" }, { label: "Available", value: n("Available"), sub: `${pct(n("Available"), items.length)} of shown` }, { label: "All issued", value: n("All issued"), sub: `${pct(n("All issued"), items.length)} of shown` }]} />
    <ListPanel title="Books" noun="titles" search={search} onSearch={setSearch} exportName="books" head={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available", "Status"]} exportRows={rows.map((i) => [i.book_no, i.title, i.author, i.category, i.publisher, i.copies, i.available, i.status])}
      tableHead={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available", "Status", ""]} empty={b.loading ? "Loading…" : "No books yet."}
      rows={rows.map((i) => [i.book_no, <b key="t" className="font-semibold text-slate-900">{i.title}</b>, i.author || "—", i.category || "—", i.publisher || "—", i.copies, i.available, <Chip key="s" tone={i.status === "Available" ? "good" : "mute"}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Book no." v={view.book_no} /><Row k="Author" v={view.author || "—"} /><Row k="Category" v={view.category || "—"} /><Row k="Publisher" v={view.publisher || "—"} /><Row k="Copies" v={view.copies} /><Row k="Available" v={view.available} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    <span className="hidden"><FormFoot close={() => undefined} busy={false} /></span></div>;
}
