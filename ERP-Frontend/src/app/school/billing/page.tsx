"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json, qs, type InvoiceDetail, type InvoiceRow, type Paged } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { fmtDay, inr2 } from "@/components/admin/dash";
import { InvoiceView, invoiceTone } from "@/components/admin/invoice-view";
import { Badge, Card, EmptyRow, ErrorBanner, Field, Modal, PageHeader, Pagination, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";

interface Checkout {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  invoice_number: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

/** Load Razorpay's checkout script once, only when someone actually pays. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

interface PlanInfo { code: string; name: string; price_per_student_paise: number; student_limit: number | null; staff_limit: number | null; campus_limit: number | null }
interface SubInfo {
  subscription: { renews_on: string | null; trial_ends_on: string | null; billing_cycle: string; plans: PlanInfo & { id: string } } | null;
  usage: { students: number; staff: number; campuses: number };
  requests: { id: string; kind: string; status: string; note: string | null; decision_note: string | null; to_plan: { name: string } | null }[];
  plans: PlanInfo[];
}

/** The school's plan, how much of it they use, and a way to ask for a different one. */
function PlanCard() {
  const { data, error, reload } = useLoad(() => schoolFetch<SubInfo>("/school/subscription"), []);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!data?.subscription) return error ? <ErrorBanner message={error} /> : null;
  const p = data.subscription.plans;
  const pending = data.requests.find((r) => r.status === "pending");
  const last = data.requests.find((r) => r.status !== "pending");
  const line = (label: string, used: number, cap: number | null) => <span className="mr-4">{label}: <b>{used}</b>{cap === null ? "" : " of " + cap}</span>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await schoolFetch("/school/subscription/request", { method: "POST", ...json("POST", { plan_code: plan, note: note || undefined }) });
      setOpen(false);
      reload();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your plan</p>
          <p className="text-lg font-bold text-slate-900">{p.name}</p>
          <p className="mt-1 text-sm text-slate-600">{line("Students", data.usage.students, p.student_limit)}{line("Staff", data.usage.staff, p.staff_limit)}{line("Campuses", data.usage.campuses, p.campus_limit)}</p>
          {data.subscription.renews_on && <p className="text-xs text-slate-500">Renews on {fmtDay(data.subscription.renews_on)} · billed {data.subscription.billing_cycle}</p>}
          {data.subscription.trial_ends_on && <p className="text-xs text-slate-500">Free trial ends on {fmtDay(data.subscription.trial_ends_on)}</p>}
        </div>
        <div className="text-right">
          {pending ? <Badge tone="blue">Your request to move to {pending.to_plan?.name} is waiting</Badge> : <button type="button" className={btnGhost} onClick={() => { setPlan(""); setNote(""); setErr(""); setOpen(true); }}>Change plan</button>}
          {!pending && last && <p className="mt-1 text-xs text-slate-500">Last request: {last.status === "approved" ? "approved" : "declined"}{last.decision_note ? " — " + last.decision_note : ""}</p>}
        </div>
      </div>
      <Modal open={open} title="Ask for a different plan" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={err} />
          <Field label="New plan">
            <select className={inputCls} required value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="">Choose a plan</option>
              {data.plans.filter((x) => x.code !== p.code).map((x) => <option key={x.code} value={x.code}>{x.name} — {inr2(x.price_per_student_paise)} per student a year</option>)}
            </select>
          </Field>
          <Field label="Anything we should know? (optional)"><textarea className={inputCls + " min-h-[4rem]"} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <p className="text-xs text-slate-500">Our team reviews every request. Nothing changes until it is approved.</p>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy || !plan}>Send request</button></div>
        </form>
      </Modal>
    </Card>
  );
}

export default function BillingPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Paged<InvoiceRow>>(`/school/billing/invoices${qs({ page })}`), [page]);
  const config = useLoad(() => schoolFetch<{ online_payments: boolean }>("/school/billing/config"), []);
  const [openId, setOpenId] = useState<string | null>(null);

  const due = data?.items.filter((i) => i.status !== "Paid" && i.status !== "Void").reduce((a, i) => a + i.balance_paise, 0) ?? 0;

  return (
    <>
      <PageHeader title="Billing" subtitle="Your My Class Assist invoices and payments." />
      <ErrorBanner message={error || config.error} />
      <PlanCard />
      {due > 0 && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Amount due: <strong>{inr2(due)}</strong>
        </p>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50"><tr><Th>Invoice</Th><Th>Total</Th><Th>Balance</Th><Th>Due</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={5} loading={loading} text="No invoices yet." />}
              {data?.items.map((i) => (
                <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(i.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setOpenId(i.id)}><span className="block font-mono text-xs font-semibold">{i.number}</span><span className="text-xs text-slate-400">{i.description}</span></button></td>
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

      <Modal open={openId !== null} title="Invoice" onClose={() => { setOpenId(null); reload(); }}>
        {openId && <SchoolInvoice id={openId} online={config.data?.online_payments === true} onPaid={reload} />}
      </Modal>
    </>
  );
}

function SchoolInvoice({ id, online, onPaid }: { id: string; online: boolean; onPaid: () => void }) {
  const detail = useLoad(() => schoolFetch<InvoiceDetail>(`/school/billing/invoices/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!detail.data) return <p className="py-8 text-center text-sm text-slate-400">{detail.error || "Loading…"}</p>;
  const { invoice } = detail.data;
  const payable = invoice.status !== "Paid" && invoice.status !== "Void" && invoice.balance_paise > 0;

  const pay = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const order = await schoolFetch<Checkout>(`/school/billing/invoices/${id}/order`, json("POST", {}));
      await loadCheckout();
      if (!window.Razorpay) throw new Error("The payment window is unavailable.");

      const checkout = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "My Class Assist",
        description: `Invoice ${order.invoice_number}`,
        handler: async (response: RazorpayResponse) => {
          try {
            await schoolFetch("/school/billing/verify", json("POST", response));
            setNotice("Payment received. Thank you!");
            detail.reload();
            onPaid();
          } catch (e) {
            setError(e instanceof Error ? e.message : "We could not confirm the payment. If money was deducted, it will be matched automatically.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", (r) => {
        setError(r.error?.description || "The payment failed. You have not been charged.");
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error || detail.error} />
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <InvoiceView detail={detail.data} />
      {payable && (
        online ? (
          <button type="button" className={`${btnPrimary} w-full`} disabled={busy} onClick={pay}>{busy ? "Waiting for payment…" : `Pay ${inr2(invoice.balance_paise)} online`}</button>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Online payment is not available yet. Pay by bank transfer and quote <strong>{invoice.number}</strong>; we will record it on your invoice.</p>
        )
      )}
    </div>
  );
}
