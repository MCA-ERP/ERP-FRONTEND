"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  adminFetch, json, qs,
  type InvoiceDetail, type InvoiceRow, type InvoiceSuggestion, type Paged, type SchoolRow,
} from "@/lib/admin-api";
import { fmtDay, inr2, useAction } from "@/components/admin/dash";
import { InvoiceView, invoiceTone } from "@/components/admin/invoice-view";
import {
  Badge, Card, EmptyRow, ErrorBanner, Field, Modal, Pagination, Th,
  btnGhost, btnPrimary, inputCls, useDebounced, useLoad,
} from "@/components/admin/ui";

const METHODS = ["UPI", "Card", "Net banking", "Bank transfer", "Cheque", "Cash", "Other"];
const toPaise = (rupees: string) => Math.round(Number(rupees) * 100);

// ── invoices ────────────────────────────────────────────────
export function Invoices({ onChange, group }: { onChange: () => void; group?: "generated" | "paid" | "unpaid" }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const { data, error, loading, reload } = useLoad(
    () => adminFetch<Paged<InvoiceRow>>(`/payments/invoices${qs({ search: debounced, status: group ? undefined : status, group, page })}`),
    [debounced, status, group, page]
  );
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = () => { reload(); onChange(); };

  return (
    <>
      <ErrorBanner message={error} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search invoice or school…" aria-label="Search invoices" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {!group && (
            <select className={`${inputCls} max-w-[11rem]`} aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {["Issued", "Partially paid", "Overdue", "Paid", "Void"].map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={() => setCreating(true)}>+ New invoice</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50">
              <tr><Th>Invoice</Th><Th>School</Th><Th>Total</Th><Th>Balance</Th><Th>Due</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={6} loading={loading} text="No invoices yet." />}
              {data?.items.map((i) => (
                <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(i.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setOpenId(i.id)}><span className="block font-mono text-xs font-semibold">{i.number}</span><span className="text-xs text-slate-400">{i.description}</span></button></td>
                  <td className="px-4 py-3 text-slate-700">{i.school_name}</td>
                  <td className="px-4 py-3 tabular-nums">{inr2(i.total_paise)}</td>
                  <td className="px-4 py-3 tabular-nums">{inr2(i.balance_paise)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDay(i.due_on)}</td>
                  <td className="px-4 py-3"><Badge tone={invoiceTone[i.status]}>{i.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={creating} title="New invoice" onClose={() => setCreating(false)}>
        <NewInvoice onDone={(id) => { setCreating(false); refresh(); setOpenId(id); }} />
      </Modal>
      <Modal open={openId !== null} title="Invoice" onClose={() => { setOpenId(null); refresh(); }}>
        {openId && <InvoicePanel id={openId} onChange={refresh} />}
      </Modal>
    </>
  );
}

function NewInvoice({ onDone }: { onDone: (id: string) => void }) {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const [f, setF] = useState({ institution_id: "", description: "", due_on: "", period_start: "", period_end: "" });
  const [lines, setLines] = useState([{ description: "", quantity: "1", price: "" }]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fillFromPlan = async () => {
    setError("");
    setNote("");
    try {
      const s = await adminFetch<InvoiceSuggestion>(`/payments/invoices/suggest/${f.institution_id}`);
      setF((x) => ({ ...x, description: s.description, period_start: s.period_start, period_end: s.period_end }));
      setLines(s.lines.map((l) => ({ description: l.description, quantity: String(l.quantity), price: String(l.unit_price_paise / 100) })));
      setNote(s.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the invoice.");
    }
  };

  const subtotal = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * toPaise(l.price || "0"), 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<InvoiceDetail>("/payments/invoices", json("POST", {
        institution_id: f.institution_id, description: f.description,
        due_on: f.due_on || undefined, period_start: f.period_start || null, period_end: f.period_end || null,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unit_price_paise: toPaise(l.price) })),
      }));
      onDone(res.invoice.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invoice.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorBanner message={error} />
      <Field label="School">
        <div className="flex gap-2">
          <select className={inputCls} required value={f.institution_id} onChange={(e) => setF({ ...f, institution_id: e.target.value })}>
            <option value="" disabled>Select school…</option>
            {schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
          <button type="button" className={btnGhost} disabled={!f.institution_id} onClick={fillFromPlan}>Fill from plan</button>
        </div>
      </Field>
      {note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{note}</p>}
      <Field label="Description"><input className={inputCls} required minLength={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Due date" hint="Blank = payment terms"><input type="date" className={inputCls} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
        <Field label="Period from"><input type="date" className={inputCls} value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></Field>
        <Field label="Period to"><input type="date" className={inputCls} value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></Field>
      </div>
      <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Lines</legend>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_7rem_auto] items-center gap-2">
            <input className={inputCls} required placeholder="Description" aria-label="Line description" value={l.description} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <input type="number" min={1} className={inputCls} required aria-label="Quantity" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
            <input type="number" min={0} step="0.01" className={inputCls} required placeholder="₹ each" aria-label="Unit price in rupees" value={l.price} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            <button type="button" className="px-2 text-slate-400 hover:text-rose-600" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs font-semibold text-mca-blue hover:underline" onClick={() => setLines([...lines, { description: "", quantity: "1", price: "" }])}>+ Add line</button>
          <span className="text-sm text-slate-500">Subtotal {inr2(subtotal)} · GST is added automatically</span>
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Creating…" : "Create invoice"}</button>
      </div>
    </form>
  );
}

function InvoicePanel({ id, onChange }: { id: string; onChange: () => void }) {
  const detail = useLoad(() => adminFetch<InvoiceDetail>(`/payments/invoices/${id}`), [id]);
  const reload = () => { detail.reload(); onChange(); };
  const { error, busy, run } = useAction(reload);
  const [pay, setPay] = useState({ amount: "", method: "Bank transfer", reference: "", paid_on: "" });
  const [refund, setRefund] = useState<{ id: string; max: number } | null>(null);
  const [refundF, setRefundF] = useState({ amount: "", reason: "" });

  if (!detail.data) return <p className="py-8 text-center text-sm text-slate-400">{detail.error || "Loading…"}</p>;
  const { invoice } = detail.data;
  const open = invoice.status !== "Paid" && invoice.status !== "Void";

  const record = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() => adminFetch(`/payments/invoices/${id}/payments`, json("POST", {
      amount_paise: toPaise(pay.amount), method: pay.method, reference: pay.reference || null, paid_on: pay.paid_on || undefined,
    })));
    if (ok) setPay({ amount: "", method: "Bank transfer", reference: "", paid_on: "" });
  };

  const [asked, setAsked] = useState(false);
  const doRefund = async (e: FormEvent, approval = false) => {
    e.preventDefault();
    if (!refund) return;
    const body = { amount_paise: refundF.amount ? toPaise(refundF.amount) : undefined, reason: refundF.reason };
    const ok = await run(() => adminFetch(approval ? `/payments/${refund.id}/refund-requests` : `/payments/${refund.id}/refund`, json("POST", body)));
    if (ok) { setRefund(null); setRefundF({ amount: "", reason: "" }); setAsked(approval); }
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || detail.error} />
      {asked && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Sent for approval. Someone else decides it under Refunds → Refund requests.</p>}
      <InvoiceView
        detail={detail.data}
        paymentActions={(pid, remaining) =>
          remaining > 0 ? (
            <button type="button" className="font-semibold text-rose-700 hover:underline" onClick={() => { setRefund({ id: pid, max: remaining }); setRefundF({ amount: String(remaining / 100), reason: "" }); }}>Refund</button>
          ) : null
        }
      />

      {refund && (
        <form onSubmit={(e) => doRefund(e)} className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-semibold text-rose-900">Refund (up to {inr2(refund.max)})</p>
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <input type="number" step="0.01" min={0.01} max={refund.max / 100} className={inputCls} aria-label="Refund amount in rupees" value={refundF.amount} onChange={(e) => setRefundF({ ...refundF, amount: e.target.value })} />
            <input className={inputCls} required minLength={3} placeholder="Reason" aria-label="Reason" value={refundF.reason} onChange={(e) => setRefundF({ ...refundF, reason: e.target.value })} />
          </div>
          <p className="text-xs text-rose-800">Online payments are refunded through Razorpay and cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setRefund(null)}>Cancel</button>
            <button type="button" className={btnGhost} disabled={busy || refundF.reason.length < 3} onClick={(e) => doRefund(e as unknown as FormEvent, true)}>Ask for approval</button>
            <button type="submit" className={btnPrimary} disabled={busy}>Refund now</button>
          </div>
        </form>
      )}

      {open && (
        <form onSubmit={record} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">Record a payment received outside the gateway</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" min={0.01} max={invoice.balance_paise / 100} required placeholder={`Amount (max ${inr2(invoice.balance_paise)})`} className={inputCls} aria-label="Amount in rupees" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <select className={inputCls} aria-label="Method" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            <input className={inputCls} placeholder="Reference (UTR, cheque no.)" aria-label="Reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
            <input type="date" className={inputCls} aria-label="Paid on" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} />
          </div>
          <div className="flex justify-end"><button type="submit" className={btnPrimary} disabled={busy}>Record payment</button></div>
        </form>
      )}

      {invoice.status !== "Void" && invoice.paid_paise === 0 && (
        <button type="button" className="text-sm font-semibold text-rose-700 hover:underline" disabled={busy} onClick={() => {
          const reason = window.prompt("Why is this invoice being voided?");
          if (reason) void run(() => adminFetch(`/payments/invoices/${id}/void`, json("POST", { reason })));
        }}>Void this invoice</button>
      )}
    </div>
  );
}

