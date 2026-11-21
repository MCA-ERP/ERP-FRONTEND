"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { inr, okBox, primaryCls } from "./fee-pages";

const V = "/school/inv";
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Verified", "Approved", "Matched", "Awarded", "Sent for payment", "Cash"].includes(s) ? "good" : ["Pending checks", "Pending", "Quotes in", "Open", "At risk", "Part order billed"].includes(s) ? "warn" : ["Rejected", "Blacklisted", "Quantity short", "Price differs", "Held"].includes(s) ? "bad" : "mute");
const tiles = (items: [string, string | number, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const dash = (n: number | null | undefined, suffix = "") => (n === null || n === undefined ? "—" : `${n}${suffix}`);

// ═════════════ vendor onboarding and scorecards ═════════════
type Vendor = { id: string; name: string; supplies: string; gstin: string; pan: string; bank_account: string; ifsc: string; msme: string; bank_status: string; vendor_status: string; rating: number | null; gst_ok: boolean; pan_ok: boolean; bank_details: boolean };
export function VendorPages({ tab }: { tab: "onboarding-and-checks" | "scorecards" }) {
  const d = useLoad(() => schoolFetch<{ items: Vendor[] }>(`${V}/vendors`), []); const sc = useLoad(() => (tab === "scorecards" ? schoolFetch<{ items: { id: string; name: string; orders: number; on_time: number | null; rating: number | null; status: string }[] }>(`${V}/scorecards`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { d.reload(); sc.reload(); }); const [search, setSearch] = useState(""); const [v, setV] = useState<Vendor | null>(null);
  const [f, setF] = useState({ pan: "", bank_account: "", ifsc: "", msme: "", rating: "" }); const err = d.error || sc.error || act.error;
  const open = (x: Vendor) => { setV(x); setF({ pan: x.pan, bank_account: x.bank_account, ifsc: x.ifsc, msme: x.msme, rating: x.rating ? String(x.rating) : "" }); };
  const run = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/vendors/${id}/action`, json("POST", { action }))).then((ok) => ok && setV(null));
  const save = async (e: FormEvent) => { e.preventDefault(); if (v && await act.run(() => schoolFetch(`${V}/vendors/${v.id}`, json("PUT", { pan: f.pan, bank_account: f.bank_account, ifsc: f.ifsc, msme: f.msme, rating: f.rating ? Number(f.rating) : null })))) setV(null); };
  const all = d.data?.items ?? [];
  if (tab === "scorecards") {
    const rows = (sc.data?.items ?? []).filter((i) => has(i, search));
    return <div className="space-y-5" data-report><ErrorBanner message={err} />
      <ListPanel title="Scorecards" noun="vendors" search={search} onSearch={setSearch} exportName="scorecards" head={["Vendor", "Orders", "On-time", "Rejected", "Price index", "Rating", "Status"]} exportRows={rows.map((i) => [i.name, i.orders, dash(i.on_time, "%"), "—", "—", dash(i.rating), i.status])}
        tableHead={["Vendor", "Orders", "On-time", "Rejected", "Price index", "Rating", "Status", ""]} empty={sc.loading ? "Loading…" : "No vendors yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.orders, dash(i.on_time, "%"), "—", "—", dash(i.rating), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.status === "Blacklisted" ? "" : <button key="b" type="button" className={redBtn} disabled={act.busy} onClick={() => run(i.id, "blacklist")}>Blacklist</button>])} /></div>;
  }
  const rows = all.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />
    <ListPanel title="Onboarding and Checks" noun="vendors" search={search} onSearch={setSearch} exportName="vendor-checks" head={["Vendor", "GST", "PAN", "Bank", "MSME", "Status"]} exportRows={rows.map((i) => [i.name, i.gst_ok ? "Valid" : "Invalid", i.pan_ok ? "Valid" : "Missing", i.bank_status, i.msme, i.vendor_status])}
      tableHead={["Vendor", "GST", "PAN", "Bank", "MSME", "Status", ""]} empty={d.loading ? "Loading…" : "No vendors yet."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, <Chip key="g" tone={i.gst_ok ? "good" : "bad"}>{i.gst_ok ? "Valid" : "Invalid"}</Chip>, <Chip key="p" tone={i.pan_ok ? "good" : "warn"}>{i.pan_ok ? "Valid" : "Missing"}</Chip>, <Chip key="b" tone={i.bank_status === "Verified" ? "good" : "warn"}>{i.bank_status}</Chip>, i.msme || "—", <Chip key="s" tone={T(i.vendor_status)}>{i.vendor_status}</Chip>, <button key="v" type="button" className={small} onClick={() => open(i)}>View details</button>])} />
    <Modal open={!!v} title={v?.name ?? ""} onClose={() => setV(null)}>{v && <form onSubmit={save} className="space-y-3">
      <dl><Row k="GSTIN" v={`${v.gstin || "—"} · ${v.gst_ok ? "format and check digit valid" : "not valid"}`} /></dl>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="PAN"><input className={inputCls} maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} /></Field><Field label="MSME no."><input className={inputCls} maxLength={30} value={f.msme} onChange={(e) => setF({ ...f, msme: e.target.value })} /></Field>
        <Field label="Bank account"><input className={inputCls} maxLength={20} value={f.bank_account} onChange={(e) => setF({ ...f, bank_account: e.target.value })} /></Field><Field label="IFSC"><input className={inputCls} maxLength={11} value={f.ifsc} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} /></Field>
        <Field label="Rating (1–5)"><input type="number" min={1} max={5} step={0.5} className={inputCls} value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} /></Field></div>
      <p className="text-xs text-slate-500">Checks are on format only. Bank status is marked by you; no test transfer is made from here.</p>
      <div className="flex flex-wrap justify-end gap-2"><button type="button" className={small} onClick={() => setV(null)}>Close</button><button type="submit" className={primaryCls} disabled={act.busy}>Save details</button>
        <button type="button" className={small} disabled={act.busy} onClick={() => run(v.id, "bank_check")}>Mark bank verified</button><button type="button" className={small} disabled={act.busy} onClick={() => run(v.id, v.vendor_status === "Verified" ? "reinstate" : "verify")}>{v.vendor_status === "Verified" ? "Reopen checks" : "Approve vendor"}</button><button type="button" className={redBtn} disabled={act.busy} onClick={() => run(v.id, "reject")}>Reject</button></div></form>}</Modal></div>;
}

// ═════════════ quotations ═════════════
type Quote = { id: string; supplier_id: string; vendor: string; unit_price: number; delivery_days: number; warranty: string; terms: string; total: number; score: number; l1: boolean; recommended: boolean };
type Rfq = { id: string; code: string; item_id: string; item: string; qty: number; closes_on: string; status: string; state: string; count: number; lowest: string; award_reason: string | null; quotes: Quote[] };
export function RfqPages({ tab }: { tab: "requests-for-quotation" | "comparison-sheet" }) {
  const d = useLoad(() => schoolFetch<{ items_list: { id: string; name: string }[]; vendors: { id: string; name: string }[]; items: Rfq[] }>(`${V}/rfqs`), []); const act = useAction(() => d.reload());
  const blank = { item_id: "", qty: "", closes_on: "" }; const [f, setF] = useState(blank); const [q, setQ] = useState({ supplier_id: "", unit_price: "", delivery_days: "", warranty: "", terms: "" });
  const [sel, setSel] = useState(""); const [why, setWhy] = useState(""); const [msg, setMsg] = useState(""); const [search, setSearch] = useState(""); const [v, setV] = useState<Rfq | null>(null); const [mk, setMk] = useState(false); const x = d.data;
  useEffect(() => { const h = () => setMk(true); window.addEventListener("inv-new-rfq", h); return () => window.removeEventListener("inv-new-rfq", h); }, []); const err = d.error || act.error;
  const all = x?.items ?? []; const cur = all.find((r) => r.id === (v?.id ?? sel)) ?? null;
  const create = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let c = ""; if (await act.run(async () => { const r = await schoolFetch<{ code: string }>(`${V}/rfqs`, json("POST", { item_id: f.item_id || x?.items_list[0]?.id, qty: Number(f.qty), closes_on: f.closes_on })); c = r.code; })) { setF(blank); setMk(false); setMsg(`${c} created. Add the vendors' quotes in Comparison Sheet.`); } };
  const addQuote = async (e: FormEvent) => { e.preventDefault(); if (cur && await act.run(() => schoolFetch(`${V}/quotes`, json("POST", { rfq_id: cur.id, supplier_id: q.supplier_id || x?.vendors[0]?.id, unit_price: Number(q.unit_price), delivery_days: Number(q.delivery_days), warranty: q.warranty, terms: q.terms })))) setQ({ supplier_id: "", unit_price: "", delivery_days: "", warranty: "", terms: "" }); };
  const doAward = (id: string, qid: string, reason: string) => void act.run(async () => { const r = await schoolFetch<{ po: string }>(`${V}/rfqs/${id}/award`, json("POST", { quote_id: qid, reason: reason || undefined })); setMsg(`Awarded. ${r.po} is waiting in Purchase Orders → Approval.`); setWhy(""); });
  if (tab === "comparison-sheet") {
    return <div className="space-y-5" data-report>{okBox(msg)}<ErrorBanner message={err} />
      <Panel title="Comparison Sheet" sub="Score: 50% price, 25% delivery, 25% vendor rating"><div className="space-y-3 p-4"><Field label="RFQ"><select className={`${inputCls} max-w-sm`} value={sel || all[0]?.id || ""} onChange={(e) => setSel(e.target.value)}>{all.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.item}</option>)}</select></Field>
        {!cur && !all.length ? <p className="text-sm text-slate-400">No RFQs yet.</p> : (() => { const r = all.find((y) => y.id === (sel || all[0]?.id)); if (!r) return null; return <>
          <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Vendor</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Delivery</th><th className="px-3 py-2">Warranty</th><th className="px-3 py-2">Terms</th><th className="px-3 py-2">Score</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>{r.quotes.map((o) => <tr key={o.id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{o.vendor} {o.l1 && <Chip tone="info">L1</Chip>} {o.recommended && <Chip tone="good">Recommended</Chip>}</td><td className="px-3 py-2 text-right">{inr(o.unit_price)}</td><td className="px-3 py-2 text-right">{inr(o.total)}</td><td className="px-3 py-2">{o.delivery_days} days</td><td className="px-3 py-2">{o.warranty || "—"}</td><td className="px-3 py-2">{o.terms || "—"}</td><td className="px-3 py-2">{o.score}</td>
              <td className="px-3 py-2">{r.status === "Open" && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => doAward(r.id, o.id, o.l1 ? "" : why)}>Award</button>}</td></tr>)}{!r.quotes.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No quotes yet.</td></tr>}</tbody></table></div>
          {r.status === "Open" ? <Field label="Reason (needed if not the lowest price)"><input className={`${inputCls} max-w-md`} maxLength={200} value={why} onChange={(e) => setWhy(e.target.value)} /></Field> : <p className="text-sm text-slate-600">Awarded{r.award_reason ? ` · ${r.award_reason}` : ""}.</p>}
          {r.status === "Open" && <form onSubmit={(e) => { setSel(r.id); void addQuote(e); }} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><Field label="Vendor"><select className={inputCls} value={q.supplier_id || x?.vendors[0]?.id || ""} onChange={(e) => setQ({ ...q, supplier_id: e.target.value })}>{x?.vendors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            <Field label="Unit price (₹)"><input type="number" min={1} required className={inputCls} value={q.unit_price} onChange={(e) => setQ({ ...q, unit_price: e.target.value })} /></Field><Field label="Delivery (days)"><input type="number" min={0} required className={inputCls} value={q.delivery_days} onChange={(e) => setQ({ ...q, delivery_days: e.target.value })} /></Field><Field label="Warranty"><input className={inputCls} maxLength={30} value={q.warranty} onChange={(e) => setQ({ ...q, warranty: e.target.value })} /></Field><Field label="Terms"><input className={inputCls} maxLength={40} value={q.terms} onChange={(e) => setQ({ ...q, terms: e.target.value })} /></Field><div className="flex items-end"><button type="submit" className={primaryCls} disabled={act.busy}>Add quote</button></div></form>}</>; })()}</div></Panel></div>;
  }
  const rows = all.filter((i) => has(i, search));
  return <div className="space-y-5" data-report>{okBox(msg)}<ErrorBanner message={err} />
    <ListPanel title="Requests for Quotation" noun="RFQs" search={search} onSearch={setSearch} exportName="rfqs" head={["RFQ no.", "Item", "Quantity", "Closes on", "Quotes", "Lowest", "Status"]} exportRows={rows.map((i) => [i.code, i.item, i.qty, day(i.closes_on), i.count, i.lowest, i.state])}
      tableHead={["RFQ no.", "Item", "Quantity", "Closes on", "Quotes", "Lowest", "Status", ""]} empty={d.loading ? "Loading…" : "No RFQs yet."}
      rows={rows.map((i) => [i.code, i.item, i.qty, day(i.closes_on), i.count, i.lowest, <Chip key="s" tone={T(i.state)}>{i.state}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <Modal open={mk} title="New RFQ" onClose={() => setMk(false)}><form onSubmit={create} className="space-y-3"><ErrorBanner message={act.error} />
      <Field label="Item"><select className={inputCls} value={f.item_id || x?.items_list[0]?.id || ""} onChange={(e) => setF({ ...f, item_id: e.target.value })}>{x?.items_list.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
      <Field label="Quantity"><input type="number" min={1} required className={inputCls} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field><Field label="Closes on"><input type="date" required className={inputCls} value={f.closes_on} onChange={(e) => setF({ ...f, closes_on: e.target.value })} /></Field>
      <div className="flex justify-end gap-2"><button type="button" className={small} onClick={() => setMk(false)}>Close</button><button type="submit" className={primaryCls} disabled={act.busy}>Save</button></div></form></Modal>
    <Modal open={!!v} title={v ? `${v.code} · ${v.item}` : ""} onClose={() => setV(null)}>{v && <><dl><Row k="Quantity" v={v.qty} /><Row k="Closes on" v={day(v.closes_on)} /><Row k="Quotes" v={v.count} /><Row k="Status" v={v.state} /></dl><div className="mt-4 flex justify-end"><button type="button" className={small} onClick={() => setV(null)}>Close</button></div></>}</Modal></div>;
}

// ═════════════ three-way match ═════════════
export function MatchPages() {
  const d = useLoad(() => schoolFetch<{ orders: { id: string; name: string }[]; month: number; matched: number; held: number; saved: number; items: { id: string; po: string; vendor: string; grn: string; bill_no: string; ordered: number; received: number; billed: number; result: string; decision: string }[] }>(`${V}/bills`), []); const act = useAction(() => d.reload());
  const [f, setF] = useState({ po_id: "", bill_no: "", amount: "" }); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const x = d.data; const err = d.error || act.error;
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/bills`, json("POST", { po_id: f.po_id || x?.orders[0]?.id, bill_no: f.bill_no, amount: Number(f.amount) })))) { setF({ po_id: "", bill_no: "", amount: "" }); setMsg("Bill added and matched against the order and receipts."); } };
  const dec = (id: string, action: string) => void act.run(() => schoolFetch(`${V}/bills/${id}/decide`, json("POST", { action })));
  const rows = (x?.items ?? []).filter((i) => has(i, search));
  return <div className="space-y-5" data-report>{okBox(msg)}<ErrorBanner message={err} />{tiles([["Bills this month", x?.month ?? 0], ["Matched", x?.matched ?? 0], ["Held", x?.held ?? 0], ["Saved by holding", inr(x?.saved ?? 0)]])}
    <FormCard title="Add vendor bill" cols="lg:grid-cols-3" onSubmit={save} onDiscard={() => setF({ po_id: "", bill_no: "", amount: "" })} busy={act.busy} error="" submitLabel="Match bill">
      <Field label="Purchase order"><select className={inputCls} value={f.po_id || x?.orders[0]?.id || ""} onChange={(e) => setF({ ...f, po_id: e.target.value })}>{x?.orders.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
      <Field label="Bill no."><input className={inputCls} required maxLength={30} value={f.bill_no} onChange={(e) => setF({ ...f, bill_no: e.target.value })} /></Field><Field label="Bill amount (₹)"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field></FormCard>
    <ListPanel title="Three-way Match" noun="bills" search={search} onSearch={setSearch} exportName="three-way-match" head={["PO", "Vendor", "GRN", "Bill no.", "Ordered", "Received", "Billed", "Result", "Decision"]} exportRows={rows.map((i) => [i.po, i.vendor, i.grn, i.bill_no, i.ordered, i.received, i.billed, i.result, i.decision])}
      tableHead={["PO", "Vendor", "GRN", "Bill no.", "Ordered", "Received", "Billed", "Result", "Action"]} empty={d.loading ? "Loading…" : "No bills yet."}
      rows={rows.map((i) => [i.po, i.vendor, i.grn, i.bill_no, inr(i.ordered), inr(i.received), inr(i.billed), <Chip key="r" tone={T(i.result)}>{i.result}</Chip>,
        i.decision === "Sent for payment" ? <Chip key="a" tone="good">Sent for payment</Chip> : <span key="a" className="flex flex-wrap gap-1.5">{i.result === "Matched" && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i.id, "send")}>Send for payment</button>}{i.result !== "Matched" && <><button type="button" className={redBtn} disabled={act.busy || i.decision === "Held"} onClick={() => dec(i.id, "hold")}>{i.decision === "Held" ? "Held" : "Hold and tell vendor"}</button><button type="button" className={small} disabled={act.busy} onClick={() => dec(i.id, "pay_received")}>Pay received value</button></>}</span>])} /></div>;
}

// ═════════════ store sales ═════════════
export function StoreSalesPage() {
  const d = useLoad(() => schoolFetch<{ students: { id: string; name: string }[]; items_list: { id: string; name: string; price: number; in_stock: number }[]; year_total: number; year_bills: number; month_total: number; month_bills: number; stock_value: number; low: number; by_month: [string, number][]; fast: [string, number][]; bills: { id: string; code: string; student: string; class_label: string; amount: number; paid_by: string; sold_at: string; sold_on: string; items: string }[] }>(`${V}/store`), []); const act = useAction(() => d.reload());
  const [stu, setStu] = useState(""); const [paid, setPaid] = useState("Cash"); const [at, setAt] = useState("Counter"); const [ln, setLn] = useState<{ item_id: string; qty: string }[]>([{ item_id: "", qty: "1" }]); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const x = d.data; const err = d.error || act.error;
  const lines = ln.map((l) => ({ item_id: l.item_id || x?.items_list[0]?.id || "", qty: Number(l.qty) })); const total = lines.reduce((n, l) => n + l.qty * (x?.items_list.find((i) => i.id === l.item_id)?.price ?? 0), 0);
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let c = ""; if (await act.run(async () => { const r = await schoolFetch<{ code: string; amount: number }>(`${V}/store`, json("POST", { student_id: stu || null, paid_by: paid, sold_at: at, lines })); c = `${r.code} saved for ${inr(r.amount)}. Stock is updated.`; })) { setLn([{ item_id: "", qty: "1" }]); setStu(""); setMsg(c); } };
  const rows = (x?.bills ?? []).filter((i) => has(i, search));
  return <div className="space-y-5" data-report>{okBox(msg)}<ErrorBanner message={err} />{tiles([["Sales this year", inr(x?.year_total ?? 0), `${x?.year_bills ?? 0} bills`], ["Sales this month", inr(x?.month_total ?? 0), `${x?.month_bills ?? 0} bills`], ["Stock value", inr(x?.stock_value ?? 0)], ["Low or out", x?.low ?? 0]])}
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Sales by month" sub="From April"><BarRows rows={x?.by_month ?? []} format={(n) => inr(n)} /></Panel><Panel title="Fast-moving items" sub="Quantity sold this year"><BarRows rows={x?.fast ?? []} /></Panel></div>
    <FormCard title="New bill" cols="lg:grid-cols-4" onSubmit={save} onDiscard={() => { setLn([{ item_id: "", qty: "1" }]); setStu(""); }} busy={act.busy} error="" submitLabel="Save bill">
      <Field label="Student (optional)"><select className={inputCls} value={stu} onChange={(e) => setStu(e.target.value)}><option value="">Walk-in</option>{x?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Paid by"><select className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)}>{["Cash", "UPI", "Card", "Online"].map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="Sold at"><select className={inputCls} value={at} onChange={(e) => setAt(e.target.value)}>{["Counter", "Parent app"].map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="Total"><input className={inputCls} readOnly value={inr(total)} /></Field>
      {ln.map((l, k) => <div key={k} className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_6rem_auto] lg:col-span-4"><select className={inputCls} aria-label="Item" value={l.item_id || x?.items_list[0]?.id || ""} onChange={(e) => setLn(ln.map((y, j) => (j === k ? { ...y, item_id: e.target.value } : y)))}>{x?.items_list.map((i) => <option key={i.id} value={i.id}>{i.name} · {inr(i.price)} · {i.in_stock} in stock</option>)}</select>
        <input type="number" min={1} aria-label="Quantity" className={inputCls} value={l.qty} onChange={(e) => setLn(ln.map((y, j) => (j === k ? { ...y, qty: e.target.value } : y)))} />{ln.length > 1 ? <button type="button" className={redBtn} onClick={() => setLn(ln.filter((_, j) => j !== k))}>Remove</button> : <span />}</div>)}
      <div className="lg:col-span-4"><button type="button" className={small} onClick={() => setLn([...ln, { item_id: "", qty: "1" }])}>+ Add item</button></div></FormCard>
    <ListPanel title="Latest bills" noun="bills" search={search} onSearch={setSearch} exportName="store-sales" head={["Bill no.", "Date", "Student", "Items", "Amount", "Paid by", "Sold at"]} exportRows={rows.map((i) => [i.code, day(i.sold_on), i.student, i.items, i.amount, i.paid_by, i.sold_at])}
      tableHead={["Bill no.", "Date", "Student", "Items", "Amount", "Paid by", "Sold at"]} empty={d.loading ? "Loading…" : "Nothing has been sold yet."}
      rows={rows.map((i) => [i.code, day(i.sold_on), i.student + (i.class_label ? ` · ${i.class_label}` : ""), <span key="i" className="block max-w-xs text-[12px]">{i.items}</span>, <span key="a" className="block text-right">{inr(i.amount)}</span>, i.paid_by, i.sold_at])} /></div>;
}
