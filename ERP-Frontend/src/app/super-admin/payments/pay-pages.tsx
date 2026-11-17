"use client";

import { useEffect, useState } from "react";
import { adminFetch, json, qs, type Analytics, type GatewayInfo, type InvoiceRow, type Paged } from "@/lib/admin-api";
import { API_BASE } from "@/lib/api";
import { Panel, SimpleTable, fmtDay, inr, lakh, useAction } from "@/components/admin/dash";
import { ColumnChart, Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, Pagination, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, STATES, small } from "../schools/pages/shared";
import { useBillingForm } from "../subscriptions/pages/billing";
import { InvoicePanel, NewInvoice } from "./invoices";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const cr = (p: number) => "₹" + (p / 100 / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " Cr";

// ═════════════ Invoices ═════════════
export type InvoiceTab = "all" | "generated" | "paid" | "unpaid";
const ITITLE: Record<InvoiceTab, string> = { all: "All invoices", generated: "Generated invoices", paid: "Paid invoices", unpaid: "Unpaid invoices" };
const istatus = (s: string): [string, "info" | "good" | "warn" | "mute"] => (s === "Paid" ? ["Paid", "good"] : s === "Issued" ? ["Generated", "info"] : s === "Void" ? ["Void", "mute"] : ["Unpaid", "warn"]);

export function InvoicePages({ tab }: { tab: InvoiceTab }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<InvoiceRow>>(`/payments/invoices${qs({ search: q, group: tab === "all" ? undefined : tab, page, pageSize: 50 })}`), [tab, q, page]);
  const act = useAction(reload);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "payments/invoices") setCreating(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const items = data?.items ?? [];
  const mail = (i: InvoiceRow, reminder: boolean) => act.run(async () => { const r = await adminFetch<{ sent_to: string }>(`/payments/invoices/${i.id}/email`, json("POST", { reminder })); setNote(`${reminder ? "Reminder" : "Invoice"} ${i.number} sent to ${r.sent_to}.`); });
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      {note && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}
      <Tiles items={[{ label: "Invoices", value: data ? String(data.total) : "…" }, { label: "Total", value: lakh(items.reduce((a, i) => a + i.total_paise, 0)), sub: "Incl. GST" }]} />
      <Panel title={ITITLE[tab]} sub={`${data?.total ?? 0} invoices`} right={<ExportPrint name={`${tab}-invoices`} head={["Invoice", "School", "Taxable", "GST", "Total", "Issued", "Status"]} rows={items.map((i) => [i.number, i.school_name, i.subtotal_paise / 100, i.tax_paise / 100, i.total_paise / 100, i.issue_date, istatus(i.status)[0]])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${tab === "all" ? "all" : tab} invoices`} aria-label="Search invoices" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <SimpleTable head={[{ h: "Invoice" }, { h: "School" }, { h: "Taxable", right: true }, { h: `GST ${items[0]?.gst_rate_percent ?? 18}%`, right: true }, { h: "Total", right: true }, { h: "Issued" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No invoices here."}
          rows={items.map((i) => [i.number, <div key="s"><p className="font-semibold text-slate-900">{i.school_name}</p><p className="text-xs text-slate-400">{i.description}</p></div>, inr(i.subtotal_paise), inr(i.tax_paise), inr(i.total_paise), fmtDay(i.issue_date), <Chip key="st" tone={istatus(i.status)[1]}>{istatus(i.status)[0]}</Chip>,
            <span key="a" className="flex gap-1.5">{istatus(i.status)[0] === "Unpaid" ? <button type="button" className={small} disabled={act.busy} onClick={() => mail(i, true)}>Send reminder</button> : i.status !== "Void" && <button type="button" className={small} disabled={act.busy} onClick={() => mail(i, false)}>Email</button>}<button type="button" className={small} onClick={() => setOpen(i.id)}>View details</button></span>])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={open !== null} title="Invoice" onClose={() => { setOpen(null); reload(); }}>{open && <InvoicePanel id={open} onChange={reload} onRecorded={() => { setOpen(null); reload(); }} />}</Modal>
      <Modal open={creating} title="New invoice" onClose={() => setCreating(false)}><NewInvoice onDone={(id) => { setCreating(false); reload(); setOpen(id); }} /></Modal>
    </div>
  );
}

// ═════════════ Refunds ═════════════
export type RefundTab = "requests" | "approved" | "rejected";
interface Req { id: string; amount_paise: number; reason: string; status: "pending" | "approved" | "rejected"; decision_note: string | null; created_at: string; payments: { code: string; gateway: string } | null; invoices: { number: string } | null; institutions: { name: string } | null }
const RTITLE: Record<RefundTab, string> = { requests: "Refund requests", approved: "Approved refunds", rejected: "Rejected refunds" };

export function RefundPages({ tab }: { tab: RefundTab }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Req | null>(null);
  const status = tab === "requests" ? "pending" : tab;
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Req>>(`/payments/refund-requests${qs({ status, pageSize: 100 })}`), [status]);
  const act = useAction(reload);
  const items = (data?.items ?? []).filter((r) => has(`${r.institutions?.name} ${r.reason} ${r.payments?.code}`, search));
  const ref = (r: Req) => `RF-${r.id.slice(0, 4).toUpperCase()}`;
  const decide = (r: Req, approve: boolean) => {
    let note: string | undefined;
    if (approve) { if (!window.confirm(`Pay back ${inr(r.amount_paise)} to ${r.institutions?.name}?${r.payments?.gateway === "razorpay" ? " It goes back through Razorpay and cannot be undone." : ""}`)) return; }
    else { const why = window.prompt("Why is this request turned down? The requester will see it."); if (!why?.trim()) return; note = why.trim(); }
    void act.run(() => adminFetch(`/payments/refund-requests/${r.id}/decide`, json("POST", { approve, note })));
  };
  const tone = { pending: ["Requested", "warn"], approved: ["Approved", "good"], rejected: ["Rejected", "bad"] } as const;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={RTITLE[tab]} sub={`${items.length} refunds`} right={<ExportPrint name={`${tab}-refunds`} head={["Refund", "School", "Payment", "Amount", "Reason", "Requested", "Status"]} rows={items.map((r) => [ref(r), r.institutions?.name, r.payments?.code, r.amount_paise / 100, r.reason, r.created_at.slice(0, 10), tone[r.status][0]])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${tab === "requests" ? "refund requests" : tab + " refunds"}`} aria-label="Search refunds" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Refund" }, { h: "School" }, { h: "Payment" }, { h: "Amount", right: true }, { h: "Reason" }, { h: "Requested" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No refunds here."}
          rows={items.map((r) => [ref(r), <b key="s" className="font-semibold text-slate-900">{r.institutions?.name}</b>, r.payments?.code ?? "—", inr(r.amount_paise), r.reason, fmtDay(r.created_at.slice(0, 10)), <Chip key="c" tone={tone[r.status][1]}>{tone[r.status][0]}</Chip>,
            <span key="a" className="flex gap-1.5">{tab === "requests" && <><button type="button" className={small} disabled={act.busy} onClick={() => decide(r, false)}>Reject</button><button type="button" className="rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50" disabled={act.busy} onClick={() => decide(r, true)}>Approve</button></>}<button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view ? ref(view) : ""} onClose={() => setView(null)}>
        {view && <div className="space-y-2 text-sm"><p><b>School:</b> {view.institutions?.name}</p><p><b>Payment:</b> {view.payments?.code} · invoice {view.invoices?.number}</p><p><b>Amount:</b> {inr(view.amount_paise)}</p><p><b>Reason:</b> {view.reason}</p>{view.decision_note && <p><b>Decision:</b> {view.decision_note}</p>}<div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}
      </Modal>
    </div>
  );
}

// ═════════════ Payment gateway ═════════════
export type GatewayTab = "config" | "api";
interface PaySettings { online_enabled: boolean; manual_methods: string[] }

export function GatewayPages({ tab }: { tab: GatewayTab }) {
  const info = useLoad(() => adminFetch<GatewayInfo>("/payments/gateway"), []);
  const settings = useLoad(() => adminFetch<PaySettings>("/payments/settings"), []);
  const events = useLoad(() => adminFetch<{ events: { id: string; type: string; received_at: string }[] }>("/payments/gateway/events"), []);
  const act = useAction(settings.reload);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState("");
  useEffect(() => { if (settings.data) { setOnline(settings.data.online_enabled); setSaved(false); } }, [settings.data]);
  const rz = info.data?.razorpay;
  const card = (code: string, name: string, sub: string, hint: string, ok: boolean, extra?: React.ReactNode) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#dceff9] text-xs font-bold text-[#026f9b]">{code}</span><div><p className="text-[13.5px] font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500">{sub}</p></div></div>
      <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{hint}</p>
      <div className="mt-3 flex items-center gap-2">{ok ? <Chip tone="good">Connected</Chip> : <Chip tone="mute">Not connected</Chip>}{extra}</div>
    </div>
  );
  if (tab === "api") {
    const hook = rz ? `${API_BASE.replace(/\/$/, "")}${rz.webhookPath.startsWith("/") ? "" : "/"}${rz.webhookPath}` : "";
    return (
      <div className="space-y-5">
        <ErrorBanner message={info.error || events.error} />
        <Panel title="Razorpay API">
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Labelled label="Mode"><input className={inputCls} disabled readOnly value={rz?.mode === "live" ? "Live" : rz?.mode === "test" ? "Test" : "Not set"} /></Labelled>
              <Labelled label="Key ID"><input className={inputCls} disabled readOnly value={rz?.keyHint ?? "Not set"} /></Labelled>
              <Labelled label="Key secret"><input className={inputCls} disabled readOnly value={rz?.configured ? "••••••••••••••••" : "Not set"} /></Labelled>
            </div>
            <Labelled label="Webhook URL"><input className={inputCls} disabled readOnly value={hook} /></Labelled>
            <Labelled label="Webhook secret"><input className={`${inputCls} max-w-xs`} disabled readOnly value={rz?.webhookSecretSet ? "••••••••••••" : "Not set"} /></Labelled>
            <p className="text-xs text-slate-500">The keys are set in the backend environment and are never shown here or editable from the browser.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
            <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Events</p><p className="truncate text-xs text-slate-500">{rz?.webhookEvents?.join(", ")}</p></div>
            <button type="button" className={small} disabled={act.busy} onClick={() => act.run(async () => { const r = await adminFetch<{ ok?: boolean; message?: string }>("/payments/gateway/test", json("POST", {})); setTest(r.message ?? (r.ok ? "Connected." : "Could not connect.")); })}>Send test event</button>
          </div>
          {test && <p role="status" className="border-t border-slate-100 px-5 py-3 text-sm text-slate-700">{test}</p>}
        </Panel>
        <Panel title="Recent events" sub={`${events.data?.events.length ?? 0} received`}>
          <SimpleTable head={[{ h: "Event" }, { h: "Received" }]} empty={events.loading ? "Loading…" : "No events received yet."} rows={(events.data?.events ?? []).map((e) => [e.type, new Date(e.received_at).toLocaleString("en-IN")])} />
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ErrorBanner message={info.error || settings.error || act.error} />
      <div className="grid gap-4 md:grid-cols-2">
        {card("RZ", "Razorpay", "UPI, cards, net banking, wallets", rz?.keyHint ?? "Keys not set", !!rz?.configured, rz?.configured && <Tag>Default</Tag>)}
        {card("BT", "Bank transfer", "NEFT / RTGS, cheque and cash", "Manual reconciliation", true)}
      </div>
      <FormCard title="Routing" saveLabel="Save routing" busy={act.busy} saved={saved} disabled={!settings.data} onDiscard={() => settings.data && setOnline(settings.data.online_enabled)}
        onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch("/payments/settings", json("PUT", { online_enabled: online })))) setSaved(true); }}>
        <div className="-mt-4">
          <div className="-mx-5 flex items-center gap-4 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Default gateway</p><p className="text-xs text-slate-500">Used for every new payment</p></div><select className={`${inputCls} max-w-[10rem]`} aria-label="Default gateway" disabled value="razorpay"><option value="razorpay">Razorpay</option></select></div>
          <ToggleRow label="Accept online payments" hint="Schools can pay invoices by UPI, card or net banking" checked={online} onChange={(v) => { setOnline(v); setSaved(false); }} />
        </div>
      </FormCard>
    </div>
  );
}

// ═════════════ Tax ═════════════
export type TaxTab = "gst" | "reports";
const KEYS = ["general.gst_number", "billing.billed_by", "billing.supplier_state", "billing.gst_rate_percent", "billing.sac_code", "billing.split_gst"];
const DEFAULTS = { "general.gst_number": "", "billing.billed_by": "", "billing.supplier_state": "", "billing.gst_rate_percent": 18, "billing.sac_code": "", "billing.split_gst": true };

export function TaxPages({ tab }: { tab: TaxTab }) {
  return tab === "gst" ? <Gst /> : <TaxReports />;
}

function Gst() {
  const f = useBillingForm(DEFAULTS, KEYS);
  const d = f.draft;
  const t = (k: string) => String(d[k] ?? "");
  const state = t("billing.supplier_state");
  return (
    <FormCard title="GST" saveLabel="Save GST settings" busy={f.busy} saved={f.saved} error={f.error} disabled={!f.ready} onDiscard={f.reset}
      onSubmit={(e) => { d["billing.gst_rate_percent"] = Number(d["billing.gst_rate_percent"]); return f.save(e); }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Labelled label="GSTIN"><input className={inputCls} value={t("general.gst_number")} onChange={(e) => f.set("general.gst_number", e.target.value)} /></Labelled>
        <Labelled label="Legal name"><input className={inputCls} value={t("billing.billed_by")} onChange={(e) => f.set("billing.billed_by", e.target.value)} /></Labelled>
        <Labelled label="State of registration"><select className={inputCls} value={state} onChange={(e) => f.set("billing.supplier_state", e.target.value)}><option value="">Choose</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Labelled>
        <Labelled label="Rate"><select className={inputCls} value={t("billing.gst_rate_percent")} onChange={(e) => f.set("billing.gst_rate_percent", Number(e.target.value))}>{[0, 5, 12, 18, 28].map((n) => <option key={n} value={n}>{n}%</option>)}</select></Labelled>
        <Labelled label="SAC code" hint="Confirm the right code with your CA"><input className={inputCls} value={t("billing.sac_code")} onChange={(e) => f.set("billing.sac_code", e.target.value)} /></Labelled>
      </div>
      <ToggleRow label={`CGST + SGST for ${state || "registered-state"} schools`} hint={`${Number(d["billing.gst_rate_percent"]) / 2}% + ${Number(d["billing.gst_rate_percent"]) / 2}%`} checked={d["billing.split_gst"] === true} onChange={(v) => f.set("billing.split_gst", v)} />
      <ToggleRow label="IGST for schools in other states" hint={`${d["billing.gst_rate_percent"]}%`} checked={d["billing.split_gst"] === true} disabled onChange={() => undefined} />
    </FormCard>
  );
}

interface TaxRep { month: string; summary: { taxable_paise: number; cgst_paise: number; sgst_paise: number; igst_paise: number; total_paise: number } }
const mon = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

function TaxReports() {
  const months = useLoad(() => adminFetch<{ months: { month: string }[] }>("/payments/tax-months"), []);
  const [rows, setRows] = useState<TaxRep[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<TaxRep | null>(null);
  const list = months.data?.months ?? [];
  useEffect(() => {
    let live = true;
    (async () => {
      const out: TaxRep[] = [];
      for (const m of [...list].sort((a, b) => a.month.localeCompare(b.month))) { try { out.push(await adminFetch<TaxRep>(`/payments/tax-report?month=${m.month}`)); } catch { /* a month that fails is left out */ } }
      if (live) setRows(out);
    })();
    return () => { live = false; };
  }, [months.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = rows.filter((r) => has(mon(r.month), search));
  const due = (m: string) => { const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + 1); return `Due 11 ${d.toLocaleDateString("en-IN", { month: "short" })}`; };
  return (
    <div className="space-y-5">
      <ErrorBanner message={months.error} />
      <Panel title="GST by month" sub={`${shown.length} months`} right={<ExportPrint name="gst-by-month" head={["Month", "Taxable value", "CGST", "SGST", "IGST", "Total GST"]} rows={shown.map((r) => [mon(r.month), r.summary.taxable_paise / 100, r.summary.cgst_paise / 100, r.summary.sgst_paise / 100, r.summary.igst_paise / 100, r.summary.total_paise / 100])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search GST by month" aria-label="Search GST by month" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Month" }, { h: "Taxable value", right: true }, { h: "CGST", right: true }, { h: "SGST", right: true }, { h: "IGST", right: true }, { h: "Total GST", right: true }, { h: "GSTR-1" }, { h: "" }]} empty={months.loading ? "Loading…" : "No invoices issued yet."}
          rows={shown.map((r) => [mon(r.month), inr(r.summary.taxable_paise), inr(r.summary.cgst_paise), inr(r.summary.sgst_paise), inr(r.summary.igst_paise), inr(r.summary.total_paise), <Chip key="g" tone="warn">{due(r.month)}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      </Panel>
      <p className="text-xs text-slate-500">Filing status is not tracked here; the due date is the 11th of the next month. Refunds are not netted off.</p>
      <Modal open={!!view} title={view ? mon(view.month) : ""} onClose={() => setView(null)}>
        {view && <div className="space-y-2 text-sm"><p><b>Taxable value:</b> {inr(view.summary.taxable_paise)}</p><p><b>CGST:</b> {inr(view.summary.cgst_paise)} · <b>SGST:</b> {inr(view.summary.sgst_paise)} · <b>IGST:</b> {inr(view.summary.igst_paise)}</p><p><b>Total GST:</b> {inr(view.summary.total_paise)}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}
      </Modal>
    </div>
  );
}

// ═════════════ Revenue ═════════════
export type RevenueTab = "daily" | "monthly" | "annual";
interface Day { date: string; collected_paise: number }
const dm = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const L = (p: number) => `₹${(p / 100 / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;

export function RevenuePages({ tab }: { tab: RevenueTab }) {
  return tab === "daily" ? <DailyRevenue /> : <PeriodRevenue annual={tab === "annual"} />;
}

function DailyRevenue() {
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const a = useLoad(() => adminFetch<{ days: Day[] }>(`/payments/revenue/daily?month=${cur}`), []);
  const b = useLoad(() => adminFetch<{ days: Day[] }>(`/payments/revenue/daily?month=${prev}`), []);
  const today = now.toISOString().slice(0, 10);
  const all = [...(b.data?.days ?? []), ...(a.data?.days ?? [])].filter((d) => d.date <= today).slice(-14);
  const best = all.reduce((m, d) => (d.collected_paise > (m?.collected_paise ?? -1) ? d : m), undefined as Day | undefined);
  const sum = all.reduce((x, d) => x + d.collected_paise, 0);
  const todayRow = all.find((d) => d.date === today);
  return (
    <div className="space-y-5">
      <ErrorBanner message={a.error || b.error} />
      <Tiles items={[
        { label: "Today", value: L(todayRow?.collected_paise ?? 0), sub: `${dm(today)}, so far` },
        { label: "Last 14 days", value: L(sum), sub: all.length ? `${dm(all[0].date)} · ${dm(all[all.length - 1].date)}` : undefined },
        { label: "Best day", value: L(best?.collected_paise ?? 0), sub: best ? dm(best.date) : undefined },
      ]} />
      <Panel title="Collected per day" sub="₹ lakh"><ColumnChart title="Collected per day" data={all.map((d) => ({ label: dm(d.date), value: Math.round(d.collected_paise / 1e5) / 100, partial: d.date === today }))} format={(n) => `${n}L`} /></Panel>
      <Panel title="By day" sub={`${all.length} days`} right={<ExportPrint name="revenue-by-day" head={["Day", "Collected"]} rows={[...all].reverse().map((d) => [d.date, d.collected_paise / 100])} />}>
        <SimpleTable head={[{ h: "Day" }, { h: "Collected", right: true }]} empty={a.loading ? "Loading…" : "No payments yet."} rows={[...all].reverse().map((d) => [dm(d.date), L(d.collected_paise)])} />
      </Panel>
    </div>
  );
}

function PeriodRevenue({ annual }: { annual: boolean }) {
  const an = useLoad(() => adminFetch<Analytics>("/payments/analytics"), []);
  const tax = useLoad(() => adminFetch<{ settings: Record<string, string | number> }>("/payments/tax-settings"), []);
  const rate = Number(tax.data?.settings["billing.gst_rate_percent"] ?? 18);
  const months = (an.data?.monthly ?? []).slice(-12);
  const fy = an.data?.byFinancialYear ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const mlabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" });
  const gst = (p: number) => Math.round((p * rate) / (100 + rate));
  if (annual) {
    const rows = [...fy].sort((a, b) => a.fy.localeCompare(b.fy));
    return (
      <div className="space-y-5">
        <ErrorBanner message={an.error} />
        <Panel title="Revenue by financial year" sub="₹ crore"><ColumnChart title="Revenue by financial year" data={rows.map((r, i) => ({ label: r.fy, value: Math.round((r.collected_paise / 1e9) * 100) / 100, partial: i === rows.length - 1 }))} format={(n) => `₹${n} Cr`} /></Panel>
        <Panel title="By year" sub={`${rows.length} years`} right={<ExportPrint name="revenue-by-year" head={["Financial year", "Revenue", "Growth"]} rows={rows.map((r, i) => [r.fy, r.collected_paise / 100, i && rows[i - 1].collected_paise ? Math.round((r.collected_paise / rows[i - 1].collected_paise - 1) * 100) + "%" : ""])} />}>
          <SimpleTable head={[{ h: "Financial year" }, { h: "Revenue", right: true }, { h: "Growth", right: true }]} empty={an.loading ? "Loading…" : "No revenue yet."}
            rows={[...rows].reverse().map((r) => { const i = rows.indexOf(r); const g = i && rows[i - 1].collected_paise ? Math.round((r.collected_paise / rows[i - 1].collected_paise - 1) * 100) : null; return [r.fy, cr(r.collected_paise), g === null ? "—" : <span key="g" className={g >= 0 ? "text-[#065740]" : "text-[#ac2c28]"}>{g >= 0 ? "▲" : "▼"} {Math.abs(g)}%</span>]; })} />
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ErrorBanner message={an.error || tax.error} />
      <Panel title="Collected per month" sub={months.length ? `${mlabel(months[0].month)} ${months[0].month.slice(0, 4)} - ${mlabel(months[months.length - 1].month)} ${months[months.length - 1].month.slice(0, 4)}, ₹ lakh` : "₹ lakh"}><ColumnChart title="Collected per month" data={months.map((m) => ({ label: mlabel(m.month), value: Math.round((m.collected_paise / 1e7) * 10) / 10, partial: m.month === thisMonth }))} format={(n) => `${n}L`} /></Panel>
      <Panel title="By month" sub={`${months.length} months`} right={<ExportPrint name="revenue-by-month" head={["Month", "Collected", "GST in it"]} rows={[...months].reverse().map((m) => [m.month, m.collected_paise / 100, gst(m.collected_paise) / 100])} />}>
        <SimpleTable head={[{ h: "Month" }, { h: "Collected", right: true }, { h: "GST in it", right: true }]} empty={an.loading ? "Loading…" : "No payments yet."} rows={[...months].reverse().map((m) => [mlabel(m.month), L(m.collected_paise), L(gst(m.collected_paise))])} />
      </Panel>
      <p className="text-xs text-slate-500">“GST in it” is worked out from the GST rate in Tax Management.</p>
    </div>
  );
}
