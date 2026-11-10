"use client";

import { useState } from "react";
import { adminFetch, qs } from "@/lib/admin-api";
import { TabBar, fmtDay, inr2 } from "@/components/admin/dash";
import { Badge, Card, EmptyRow, ErrorBanner, Pagination, Th, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";

interface Tx {
  key: string; status: "successful" | "failed" | "pending"; code: string; amount_paise: number; refunded_paise: number; method: string | null;
  gateway: string; reference: string | null; school: string | null; invoice_number: string | null; kind: "renewal" | "subscription"; reason: string | null; at: string;
}
interface Res { items: Tx[]; total: number; page: number; pageSize: number; counts: { successful: number; pending: number; failed: number } }
const METHODS = ["UPI", "Card", "Net banking", "Bank transfer", "Cheque", "Cash", "Other", "Online"];
const tone = { successful: "green", failed: "red", pending: "blue" } as const;
const label = { successful: "Successful", failed: "Failed", pending: "Pending" } as const;

/** `kind` narrows to subscription or renewal payments (the "School payments" views). */
export function Transactions({ kind }: { kind?: "subscription" | "renewal" }) {
  const [status, setStatus] = useState<"" | "successful" | "failed" | "pending">("");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => adminFetch<Res>(`/payments/transactions${qs({ status, kind, method, search: q, page })}`), [status, kind, method, q, page]);
  const c = data?.counts;

  return (
    <>
      <TabBar
        value={status}
        onChange={(s) => { setStatus(s); setPage(1); }}
        tabs={[["", "All transactions", c ? c.successful + c.pending + c.failed : undefined], ["successful", "Successful", c?.successful], ["failed", "Failed", c?.failed], ["pending", "Pending", c?.pending]]}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search payment no. or reference…" aria-label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[11rem]`} aria-label="Method" value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">All methods</option>{METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <span className="text-xs text-slate-500">
            {status === "failed" ? "Online payment attempts that did not go through." : status === "pending" ? "Online payments a school started but has not completed." : kind === "renewal" ? "Payments for renewal invoices." : kind === "subscription" ? "First-time subscription payments and other invoices." : "Payments received, and online attempts that failed or are still open."}
          </span>
        </div>
        <div className="px-4"><ErrorBanner message={error} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>Transaction</Th><Th>Invoice</Th><Th>School</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>When</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={7} loading={loading} text="Nothing here." />}
              {data?.items.map((t) => (
                <tr key={t.key} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-mono text-xs font-semibold">{t.code}</p>{!kind && <p className="text-xs text-slate-400">{t.kind === "renewal" ? "Renewal" : "Subscription"}</p>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-700">{t.school}</td>
                  <td className="px-4 py-3 tabular-nums">{inr2(t.amount_paise)}{t.refunded_paise > 0 && <span className="ml-2 text-xs text-rose-700">−{inr2(t.refunded_paise)}</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{t.method ?? "—"}{t.gateway === "razorpay" && <span className="ml-1 text-xs text-slate-400">online</span>}</td>
                  <td className="px-4 py-3"><Badge tone={tone[t.status]}>{label[t.status]}</Badge>{t.reason && <p className={`mt-1 max-w-[14rem] text-xs ${t.status === "failed" ? "text-rose-700" : "text-slate-400"}`}>{t.reason}</p>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{t.status === "successful" ? fmtDay(t.at.slice(0, 10)) : fmtDate(t.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
