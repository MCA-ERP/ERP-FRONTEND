"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { saveCsv, saveExcel, reportHtml } from "@/components/admin/csv";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { Field, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { okBox, primaryCls } from "./fee-pages";

const S = "/school";
const tiles = (items: [string, ReactNode, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const count = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) if (x) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((q, r) => r[1] - q[1]) as [string, number][]; };

// ═════════════ library books report ═════════════
export function LibraryBooksReport() {
  const d = useLoad(() => schoolFetch<{ items: { book_no: string; title: string; author: string; category: string; publisher: string; copies: number; available: number; status: string }[] }>(`${S}/lib/books`), []); const [search, setSearch] = useState(""); const [v, setV] = useState<(typeof all)[number] | null>(null);
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const av = all.filter((x) => x.available > 0).length; const dl = () => { try { saveCsv({ filename: "category", header: ["Category", "Count"], rows: count(all.map((x) => x.category)) }); } catch { /* download unavailable */ } };
  return <div className="space-y-5" data-report><ErrorBanner message={d.error} />{tiles([["Books", all.length, "Sample records shown"], ["Available", av, `${pct(av, all.length)} of shown`], ["All issued", all.length - av, `${pct(all.length - av, all.length)} of shown`]])}
    <Panel title="Category" sub="Count by category" right={<button type="button" className={small} onClick={dl}>Download</button>}><BarRows rows={count(all.map((x) => x.category))} /></Panel>
    <ListPanel title="Books" noun="titles" search={search} onSearch={setSearch} exportName="library-books" head={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available", "Status"]} exportRows={rows.map((i) => [i.book_no, i.title, i.author, i.category, i.publisher, i.copies, i.available, i.available > 0 ? "Available" : "All issued"])} tableHead={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available", "Status", ""]} empty={d.loading ? "Loading…" : "No books yet."}
      rows={rows.map((i) => [i.book_no, <b key="t" className="font-semibold text-slate-900">{i.title}</b>, i.author || "—", i.category || "—", i.publisher || "—", i.copies, i.available, <Chip key="s" tone={i.available > 0 ? "good" : "mute"}>{i.available > 0 ? "Available" : "All issued"}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={!!v} title={v?.title ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Author" v={v.author || "—"} /><Row k="Category" v={v.category || "—"} /><Row k="Publisher" v={v.publisher || "—"} /><Row k="Copies" v={v.copies} /><Row k="Available" v={v.available} /></dl><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

// ═════════════ custom reports ═════════════
type Ds = { key: string; label: string; columns: string[]; filter: string };
type Out = { name?: string; head: string[]; rows: (string | number)[][]; total: number };
function Result({ out, title }: { out: Out; title: string }) {
  const [q, setQ] = useState(""); const rows = out.rows.filter((r) => !q.trim() || r.join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  return <ListPanel title={title} noun="rows" search={q} onSearch={setQ} exportName={title} head={out.head} exportRows={rows} tableHead={out.head} empty="No rows match." rows={rows.slice(0, 500).map((r) => r.map((c) => c ?? ""))} />;
}
export function CustomReportPages({ tab }: { tab: "report-builder" | "saved-reports" }) {
  const o = useLoad(() => schoolFetch<{ datasets: Ds[] }>(`${S}/custom/options`), []); const sv = useLoad(() => schoolFetch<{ items: { id: string; name: string; data: string; created_by: string; created_at: string; columns: string[]; filter_value: string; group_by: string }[] }>(`${S}/custom/saved`), []); const act = useAction(() => sv.reload());
  const [ds, setDs] = useState(""); const [cols, setCols] = useState<string[] | null>(null); const [flt, setFlt] = useState(""); const [grp, setGrp] = useState(""); const [name, setName] = useState(""); const [out, setOut] = useState<Out | null>(null); const [msg, setMsg] = useState(""); const [search, setSearch] = useState(""); const [ran, setRan] = useState<Out | null>(null); const [v, setV] = useState<{ id: string; name: string; data: string; created_by: string; created_at: string; columns: string[]; filter_value: string; group_by: string } | null>(null);
  const cur = o.data?.datasets.find((d) => d.key === (ds || o.data?.datasets[0]?.key)); const use = cols ?? cur?.columns ?? []; const err = o.error || sv.error || act.error;
  if (tab === "report-builder") {
    const body = { dataset: cur?.key, columns: use, filter_value: flt || undefined, group_by: grp || undefined };
    const run = async (e: FormEvent) => { e.preventDefault(); setMsg(""); setOut(null); await act.run(async () => { setOut(await schoolFetch<Out>(`${S}/custom/run`, json("POST", body))); if (name.trim()) { await schoolFetch(`${S}/custom/saved`, json("POST", { ...body, name })); setMsg("Saved. It appears in Saved Reports."); setName(""); } }); };
    return <div className="space-y-5">{okBox(msg)}<form onSubmit={run} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Report builder</h2></div>{err && <div className="px-5 pt-4"><ErrorBanner message={err} /></div>}
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5"><Field label="Data"><select className={inputCls} value={cur?.key ?? ""} onChange={(e) => { setDs(e.target.value); setCols(null); setFlt(""); setGrp(""); }}>{o.data?.datasets.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Field>
        <Field label="Columns"><div className="flex flex-wrap gap-x-3 gap-y-1">{cur?.columns.map((c) => <label key={c} className="flex items-center gap-1 text-[12px]"><input type="checkbox" className="accent-[#0294ce]" checked={use.includes(c)} onChange={(e) => setCols(e.target.checked ? [...use, c] : use.filter((x) => x !== c))} />{c}</label>)}</div></Field>
        <Field label={`Filter · ${cur?.filter ?? ""} starts with`}><input className={inputCls} maxLength={60} placeholder="For example, Class 9" value={flt} onChange={(e) => setFlt(e.target.value)} /></Field>
        <Field label="Group by"><select className={inputCls} value={grp} onChange={(e) => setGrp(e.target.value)}><option value="">No grouping</option>{cur?.columns.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Save as (optional)"><input className={inputCls} maxLength={100} placeholder="For example, Board classes – fee due" value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
      <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setCols(null); setFlt(""); setGrp(""); setName(""); setOut(null); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy || !use.length} className={primaryCls}>{name.trim() ? "Run and save" : "Run"}</button></div></form>
      {out && <Result out={out} title={`${cur?.label ?? "Report"} · ${out.total} rows`} />}</div>;
  }
  const rows = (sv.data?.items ?? []).filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={err} /><ListPanel title="Saved reports" noun="reports" search={search} onSearch={setSearch} exportName="saved-reports" head={["Report", "Data", "Created by", "Saved"]} exportRows={rows.map((i) => [i.name, i.data, i.created_by, day(i.created_at)])} tableHead={["Report", "Data", "Created by", "Saved", ""]} empty={sv.loading ? "Loading…" : "Nothing saved yet. Build one in Report Builder."}
    rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, <Chip key="d" tone="mute">{i.data}</Chip>, i.created_by, day(i.created_at), <span key="a" className="flex gap-1.5"><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(async () => setRan(await schoolFetch<Out>(`${S}/custom/saved/${i.id}/run`, json("POST", {}))))}>Run</button><button type="button" className={small} onClick={() => setV(i)}>View details</button></span>])} />
    {ran && <Result out={ran} title={ran.name ?? "Result"} />}
    <Modal open={!!v} title={v?.name ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Data" v={v.data} /><Row k="Columns" v={v.columns.join(", ")} /><Row k="Filter" v={v.filter_value || "None"} /><Row k="Grouped by" v={v.group_by || "None"} /><Row k="Created by" v={v.created_by} /></dl><div className="mt-4 flex justify-end gap-2"><button type="button" className={small} onClick={() => setV(null)}>Close</button><button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28]" disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/custom/saved/${v.id}`, { method: "DELETE" })).then((ok) => ok && setV(null))}>Delete</button></div></>}</Modal></div>;
}

// ═════════════ export centre ═════════════
export function ExportCenterPages({ tab }: { tab: "excel" | "pdf" | "csv" | "print" }) {
  const d = useLoad(() => schoolFetch<{ items: { key: string; name: string; area: string; covers: string }[] }>(`${S}/export/catalog`), []); const act = useAction(() => undefined); const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const rows = (d.data?.items ?? []).filter((i) => has(i, search)); const label = { excel: "Excel", pdf: "PDF", csv: "CSV", print: "Print" }[tab];
  const go = async (key: string) => { setMsg(""); await act.run(async () => { const x = await schoolFetch<{ name: string; head: string[]; rows: (string | number)[][] }>(`${S}/export/data/${key}`); if (!x.head.length) { setMsg(`${x.name} has nothing to export yet.`); return; } const rep = { filename: key, header: x.head, rows: x.rows }; if (tab === "csv") saveCsv(rep); else if (tab === "excel") saveExcel(rep); else if (tab === "pdf") printHtml(reportHtml(rep)); else { armPrint(); downloadCsv(key, x.head, x.rows); } }); };
  return <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{msg && <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px]">{msg}</p>}
    <ListPanel title="Reports" noun="reports" search={search} onSearch={setSearch} exportName="export-center" head={["Report", "Area", "Covers"]} exportRows={rows.map((i) => [i.name, i.area, i.covers])} tableHead={["Report", "Area", "Covers", ""]} empty={d.loading ? "Loading…" : "Nothing to export."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, <Chip key="a" tone="mute">{i.area}</Chip>, i.covers, <button key="d" type="button" className={primaryCls} disabled={act.busy} onClick={() => void go(i.key)}>{tab === "print" ? "Print" : `Download ${label}`}</button>])} />
    <p className="text-xs text-slate-500">PDF opens the print window; choose “Save as PDF” there. Exam results aren&apos;t here because they depend on which exam and class you pick; use Examination Reports.</p></div>;
}

// ═════════════ school profile ═════════════
type Prof = { name: string; short_name: string; board: string; affiliation_no: string; udise_code: string; year_established: number | null; principal: string; email: string; phone: string; website: string; address: string; city: string; state: string; pin_code: string; map_link: string; has_logo: boolean; logo: string | null; signature: string | null; seal: string | null };
export function SchoolProfilePages({ tab }: { tab: "general-details" | "address" | "logo" }) {
  const d = useLoad(() => schoolFetch<Prof>(`${S}/profile`), []); const act = useAction(() => d.reload()); const [f, setF] = useState<Prof | null>(null); const [msg, setMsg] = useState(""); const x = f ?? d.data; const err = d.error || act.error;
  const field = (k: keyof Prof, label: string, extra?: { type?: string; span?: string }) => <div className={extra?.span}><Field label={label}><input type={extra?.type ?? "text"} className={inputCls} value={String(x?.[k] ?? "")} onChange={(e) => x && setF({ ...x, [k]: extra?.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value })} /></Field></div>;
  const save = (part: string, body: object) => async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${S}/profile/${part}`, json("PUT", body)))) { setF(null); setMsg("Saved."); } };
  const shell = (title: string, onSubmit: (e: FormEvent) => void, children: ReactNode) => <div>{okBox(msg)}<form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2></div>{err && <div className="px-5 pt-4"><ErrorBanner message={err} /></div>}<div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">{children}</div><div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setF(null); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy || !x} className={primaryCls}>Save</button></div></form></div>;
  if (!x) return <ErrorBanner message={err || ""} />;
  if (tab === "general-details") return shell("General details", save("general", { name: x.name, short_name: x.short_name, board: x.board, affiliation_no: x.affiliation_no, udise_code: x.udise_code, year_established: x.year_established, principal: x.principal, email: x.email, phone: x.phone, website: x.website }), <>{field("name", "School name", { span: "sm:col-span-2 lg:col-span-5" })}{field("short_name", "Short name")}{field("board", "Board")}{field("affiliation_no", "Affiliation no.")}{field("udise_code", "UDISE+ code")}{field("year_established", "Year established", { type: "number" })}{field("principal", "Principal")}{field("email", "Email", { type: "email" })}{field("phone", "Phone")}{field("website", "Website")}</>);
  if (tab === "address") return shell("Address", save("address", { address: x.address, city: x.city, state: x.state, pin_code: x.pin_code, map_link: x.map_link }), <><div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-[80px]`} maxLength={500} value={x.address} onChange={(e) => setF({ ...x, address: e.target.value })} /></Field></div>{field("city", "City")}{field("state", "State")}{field("pin_code", "PIN code")}{field("map_link", "Map link", { span: "lg:col-span-2" })}</>);
  return <LogoForm x={x} err={err} act={act} msg={msg} setMsg={setMsg} />;
}

type Slot = "logo" | "signature" | "seal";
function LogoForm({ x, err, act, msg, setMsg }: { x: Prof; err: string; act: ReturnType<typeof useAction>; msg: string; setMsg: (s: string) => void }) {
  const [staged, setStaged] = useState<Partial<Record<Slot, string | null>>>({}); const [bad, setBad] = useState("");
  const slots: [Slot, string, string][] = [["logo", "School logo", "Square PNG, at least 512 px"], ["signature", "Principal's signature", "For certificates and report cards"], ["seal", "School seal", "Round or square PNG"]];
  const pick = (k: Slot, file?: File) => { setBad(""); if (!file) return; if (file.size > 150_000) { setBad("Keep each image under 150 KB."); return; } const r = new FileReader(); r.onload = () => setStaged((s) => ({ ...s, [k]: String(r.result) })); r.readAsDataURL(file); };
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); const keys = Object.keys(staged) as Slot[]; if (!keys.length) { setBad("Choose a file first."); return; } if (await act.run(async () => { for (const k of keys) await schoolFetch(`${S}/profile/logo`, json("PUT", { kind: k, logo: staged[k] })); })) { setStaged({}); setMsg("Saved."); } };
  return <div>{okBox(msg)}<form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Logo</h2></div>{(err || bad) && <div className="px-5 pt-4"><ErrorBanner message={err || bad} /></div>}
    <div className="grid gap-5 p-5 sm:grid-cols-3">{slots.map(([k, label, hint]) => { const cur = staged[k] !== undefined ? staged[k] : x[k]; return <div key={k} className="space-y-2"><p className="text-[12px] text-slate-600">{label}</p>{cur ? <img src={cur} alt={label} className="h-20 w-20 rounded border border-slate-200 object-contain" /> : <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-slate-300 text-[11px] text-slate-400">None</div>}<input type="file" accept="image/png,image/jpeg" aria-label={label} onChange={(e) => pick(k, e.target.files?.[0])} /><p className="text-[11px] text-slate-500">{hint}</p>{cur && <button type="button" className={small} onClick={() => setStaged({ ...staged, [k]: null })}>Remove</button>}</div>; })}</div>
    <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => { setStaged({}); setBad(""); setMsg(""); }} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700">Discard</button><button type="submit" disabled={act.busy} className={primaryCls}>Save</button></div></form></div>;
}
