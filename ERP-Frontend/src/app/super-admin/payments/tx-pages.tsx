"use client";

import Link from "next/link";
import { useState } from "react";
import { adminFetch, qs } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, inr, lakh } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, Pagination, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { small } from "../schools/pages/shared";

export type TxTab = "all" | "successful" | "failed" | "pending";
interface Tx {
  key: string; status: "successful" | "failed" | "pending"; code: string; amount_paise: number; refunded_paise: number; method: string | null; gateway: string; reference: string | null;
  school: string | null; invoice_number: string | null; kind: "renewal" | "subscription"; reason: string | null; at: string;
}
interface Res { items: Tx[]; total: number; page: number; pageSize: number }
const TITLE: Record<TxTab, [string, string, string]> = { all: ["All transactions", "payments", "Search all transactions"], successful: ["Successful payments", "payments", "Search successful payments"], failed: ["Failed payments", "payments", "Search failed payments"], pending: ["Pending payments", "payments", "Search pending payments"] };
const TONE = { successful: ["Paid", "good"], failed: ["Failed", "bad"], pending: ["Pending", "warn"] } as const;

/** Payments from schools: all, successful, failed or pending, with the count and amount for what is shown. */
export function TransactionPages({ tab, kind }: { tab: TxTab; kind?: "subscription" | "renewal" }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<Tx | null>(null);
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => adminFetch<Res>(`/payments/transactions${qs({ status: state || (tab === "all" ? "" : tab), kind, search: q, page, pageSize: 50 })}`), [tab, state, kind, q, page]);
  const items = data?.items ?? [];
  const total = items.reduce((a, t) => a + t.amount_paise, 0);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Payments", value: data ? String(data.total) : "…", sub: "Shown" }, { label: "Amount", value: lakh(total), sub: "Incl. GST" }]} />
      <Panel title={kind === "subscription" ? "Subscription payments" : kind === "renewal" ? "Renewal payments" : TITLE[tab][0]} sub={`${data?.total ?? 0} payments`} right={<ExportPrint name={`${tab}-payments`} head={["Payment", "Invoice", "School", "Type", "Amount", "Gateway", "Method", "Status", "Date"]} rows={items.map((t) => [t.code, t.invoice_number, t.school, t.kind === "renewal" ? "Renewal" : "Subscription", t.amount_paise / 100, t.gateway, t.method, TONE[t.status][0], t.at.slice(0, 10)])} />}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder={kind ? `Search ${kind} payments` : TITLE[tab][2]} aria-label="Search payments" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Status" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="successful">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option></select>
        </div>
        <SimpleTable head={[{ h: "Payment" }, { h: "School" }, { h: "Type" }, { h: "Amount", right: true }, { h: "Gateway" }, { h: "Method" }, { h: "Status" }, { h: "Date" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing here."}
          rows={items.map((t) => [
            <div key="p"><p className="font-semibold text-slate-900">{t.code}</p><p className="text-xs text-slate-400">{t.invoice_number}</p></div>,
            <div key="s"><p className="text-slate-900">{t.school}</p></div>, <Tag key="t">{t.kind === "renewal" ? "Renewal" : "Subscription"}</Tag>, inr(t.amount_paise),
            t.gateway === "razorpay" ? "Razorpay" : t.gateway, t.method ?? "—", <Chip key="st" tone={TONE[t.status][1]}>{TONE[t.status][0]}</Chip>, fmtDay(t.at.slice(0, 10)),
            <span key="a" className="flex gap-1.5">{t.status === "successful" && <Link href="/super-admin/payments/refunds" className={small}>Refund</Link>}<button type="button" className={small} onClick={() => setView(t)}>View details</button></span>,
          ])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={!!view} title={view?.code ?? ""} onClose={() => setView(null)}>
        {view && <div className="space-y-2 text-sm"><p><b>School:</b> {view.school}</p><p><b>Invoice:</b> {view.invoice_number}</p><p><b>Amount:</b> {inr(view.amount_paise)}{view.refunded_paise > 0 ? ` (refunded ${inr(view.refunded_paise)})` : ""}</p><p><b>Gateway:</b> {view.gateway}{view.reference ? ` · ${view.reference}` : ""}</p>{view.reason && <p><b>Reason:</b> {view.reason}</p>}<div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}
      </Modal>
    </div>
  );
}
