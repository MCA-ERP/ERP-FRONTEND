"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged, type RefundRow } from "@/lib/admin-api";
import { Panel, TabBar, inr2, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Pagination, Th, btnPrimary, fmtDate, useLoad } from "@/components/admin/ui";

interface Req {
  id: string; amount_paise: number; reason: string; status: "pending" | "approved" | "rejected"; requester_name: string | null; decider_name: string | null;
  decision_note: string | null; decided_at: string | null; last_error: string | null; created_at: string;
  payments: { code: string; method: string; gateway: string } | null; invoices: { number: string } | null; institutions: { name: string } | null;
}
const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>;

export function Refunds({ onChange }: { onChange: () => void }) {
  const [part, setPart] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const reqs = useLoad(() => (part === "approved" ? Promise.resolve(null) : adminFetch<Paged<Req> & { pending: number }>(`/payments/refund-requests${qs({ status: part, page })}`)), [part, page]);
  const done = useLoad(() => (part === "approved" ? adminFetch<{ refunds: RefundRow[] }>("/payments/refunds") : Promise.resolve(null)), [part]);
  const pendingCount = useLoad(() => adminFetch<{ pending: number }>("/payments/refund-requests?pageSize=1&status=pending"), []);
  const act = useAction(() => { reqs.reload(); pendingCount.reload(); onChange(); });

  const decide = (r: Req, approve: boolean) => {
    let note: string | undefined;
    if (approve) {
      if (!window.confirm(`Pay back ${inr2(r.amount_paise)} to ${r.institutions?.name}?${r.payments?.gateway === "razorpay" ? " It goes back through Razorpay and cannot be undone." : ""}`)) return;
    } else {
      const why = window.prompt("Why is this request turned down? The requester will see it.");
      if (!why?.trim()) return;
      note = why.trim();
    }
    void act.run(() => adminFetch(`/payments/refund-requests/${r.id}/decide`, json("POST", { approve, note })));
  };

  return (
    <>
      <TabBar value={part} onChange={(p) => { setPart(p); setPage(1); }} tabs={[["pending", "Refund requests", pendingCount.data?.pending], ["approved", "Approved"], ["rejected", "Rejected"]]} />
      <ErrorBanner message={reqs.error || done.error || act.error} />
      {part === "approved" ? (
        <Panel title="Approved refunds" sub="Refunds that were paid back, including ones made directly from an invoice">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Payment</Th><Th>Invoice</Th><Th>School</Th><Th>Amount</Th><Th>Reason</Th><Th>When</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!done.data?.refunds.length && <Empty cols={6} loading={done.loading} text="No refunds." />}
              {done.data?.refunds.map((r) => (
                <tr key={r.id}><td className="px-4 py-3 font-mono text-xs">{r.payments?.code}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{r.payments?.invoices?.number}</td><td className="px-4 py-3">{r.payments?.institutions?.name}</td><td className="px-4 py-3 tabular-nums">{inr2(r.amount_paise)}</td><td className="px-4 py-3 text-slate-600">{r.reason}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(r.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : (
        <Panel title={part === "pending" ? "Refund requests" : "Rejected requests"} sub={part === "pending" ? "Waiting for a decision. A refund someone asked for must be approved by a different person." : "Requests that were turned down"}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Payment</Th><Th>School</Th><Th>Amount</Th><Th>Reason</Th><Th>Asked by</Th><Th>When</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!reqs.data?.items.length && <Empty cols={7} loading={reqs.loading} text={part === "pending" ? "No requests waiting." : "None."} />}
              {reqs.data?.items.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-mono text-xs font-semibold">{r.payments?.code}</p><p className="font-mono text-xs text-slate-400">{r.invoices?.number}</p></td>
                  <td className="px-4 py-3 text-slate-700">{r.institutions?.name}</td>
                  <td className="px-4 py-3 tabular-nums">{inr2(r.amount_paise)}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{r.reason}{r.decision_note && <p className="mt-1 text-xs text-rose-700">Declined: {r.decision_note} ({r.decider_name})</p>}{r.last_error && <p className="mt-1 text-xs text-amber-700">Last attempt failed: {r.last_error}</p>}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.requester_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(r.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.status === "pending" ? <div className="flex justify-end gap-2"><button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy} onClick={() => decide(r, true)}>Approve &amp; refund</button><button type="button" className={small} disabled={act.busy} onClick={() => decide(r, false)}>Reject</button></div> : <Badge tone="red">Rejected</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reqs.data && <Pagination page={reqs.data.page} pageSize={reqs.data.pageSize} total={reqs.data.total} onChange={setPage} />}
        </Panel>
      )}
    </>
  );
}
