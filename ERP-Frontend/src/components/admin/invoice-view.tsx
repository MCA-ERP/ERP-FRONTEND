"use client";

import type { ReactNode } from "react";
import type { InvoiceDetail, InvoiceStatus } from "@/lib/admin-api";
import { Badge, fmtDate } from "./ui";
import { fmtDay, inr2 } from "./dash";

export const invoiceTone: Record<InvoiceStatus, "green" | "red" | "blue" | "gray"> = {
  Paid: "green",
  Issued: "blue",
  "Partially paid": "blue",
  Overdue: "red",
  Void: "gray",
};

/** Read-only invoice: header, lines, totals and the payments against it. Actions are passed in. */
export function InvoiceView({
  detail,
  paymentActions,
}: {
  detail: InvoiceDetail;
  paymentActions?: (paymentId: string, remainingPaise: number) => ReactNode;
}) {
  const { invoice: inv, lines, payments } = detail;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono text-lg text-slate-900">{inv.number}</h3>
        <Badge tone={invoiceTone[inv.status]}>{inv.status}</Badge>
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-slate-500">School</dt><dd className="text-slate-900">{inv.school_name} ({inv.school_code})</dd>
        <dt className="text-slate-500">For</dt><dd className="text-slate-900">{inv.description}</dd>
        {inv.period_start && (<><dt className="text-slate-500">Period</dt><dd>{fmtDay(inv.period_start)} – {fmtDay(inv.period_end)}</dd></>)}
        <dt className="text-slate-500">Issued</dt><dd>{fmtDay(inv.issue_date)}</dd>
        <dt className="text-slate-500">Due</dt><dd>{fmtDay(inv.due_on)}</dd>
        {inv.void_reason && (<><dt className="text-slate-500">Void reason</dt><dd>{inv.void_reason}</dd></>)}
      </dl>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">{l.description}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr2(l.unit_price_paise)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr2(l.amount_paise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums">{inr2(inv.subtotal_paise)}</td></tr>
            <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">GST @ {Number(inv.gst_rate_percent)}%</td><td className="px-3 py-1.5 text-right tabular-nums">{inr2(inv.tax_paise)}</td></tr>
            <tr className="font-semibold"><td colSpan={3} className="px-3 py-1.5 text-right">Total</td><td className="px-3 py-1.5 text-right tabular-nums">{inr2(inv.total_paise)}</td></tr>
            <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">Paid (net of refunds)</td><td className="px-3 py-1.5 text-right tabular-nums">{inr2(inv.paid_paise)}</td></tr>
            <tr className="font-semibold"><td colSpan={3} className="px-3 py-1.5 text-right">Balance due</td><td className="px-3 py-1.5 text-right tabular-nums">{inr2(inv.balance_paise)}</td></tr>
          </tfoot>
        </table>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</h4>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
          {payments.map((p) => {
            const refunded = p.refunds.reduce((a, r) => a + r.amount_paise, 0);
            return (
              <li key={p.id} className="px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-mono text-xs font-semibold">{p.code}</span>
                    <span className="ml-2 font-semibold tabular-nums">{inr2(p.amount_paise)}</span>
                    <span className="ml-2 text-slate-500">{p.method}{p.gateway === "razorpay" ? " · online" : ""}{p.reference ? ` · ${p.reference}` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {fmtDay(p.paid_on)}
                    {paymentActions?.(p.id, p.amount_paise - refunded)}
                  </span>
                </div>
                {p.refunds.map((r) => (
                  <p key={r.id} className="mt-1 text-xs text-rose-700">Refunded {inr2(r.amount_paise)} on {fmtDate(r.created_at)}: {r.reason}</p>
                ))}
              </li>
            );
          })}
          {payments.length === 0 && <li className="px-3 py-3 text-slate-400">No payments yet.</li>}
        </ul>
      </section>
      {detail.footer && <p className="whitespace-pre-wrap border-t border-slate-100 pt-3 text-xs text-slate-500">{detail.footer}</p>}
    </div>
  );
}
