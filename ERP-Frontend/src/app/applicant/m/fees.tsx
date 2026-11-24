"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel } from "@/components/admin/dash";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { Chip, DataTable, Head, Loading, Note, brandBtn, dmy, has, inr, printRows, whiteBtn } from "./kit";

interface Line { key: "application_fee" | "admission_fee"; label: string; amount: number; status: string; paid_on: string | null; can_pay: boolean; by?: string | null }
interface Receipt { ref: string; label: string; amount: number; mode: string; on: string | null }
interface Fees { online: boolean; key_id: string; items: { id: string; code: string; child: string; class_sought: string; lines: Line[]; receipts: Receipt[] }[] }

type Checkout = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: () => void) => void };
const rzp = () => (window as unknown as { Razorpay?: Checkout }).Razorpay;
const loadCheckout = () => new Promise<boolean>((ok) => {
  if (rzp()) return ok(true);
  const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => ok(true); s.onerror = () => ok(false); document.body.appendChild(s);
});
const classOnly = (c: string) => c.replace(/\s*·.*$/, "");

function useFees() {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Fees>(`/applicant/fees${a.active ? `?application=${a.active.id}` : ""}`), [a.active?.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const pay = async (appId: string, line: Line) => {
    setErr(""); setDone(""); setBusy(true);
    try {
      const o = await schoolFetch<{ order_id: string; amount: number; currency: string; key_id: string }>("/applicant/payments/order", json("POST", { application_id: appId, purpose: line.key }));
      const Rz = (await loadCheckout()) ? rzp() : undefined;
      if (!Rz) throw new Error("Could not open the payment window. Check your connection and try again.");
      await new Promise<void>((resolve, reject) => {
        const rz = new Rz({ key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: a.school.name, description: line.label, prefill: { name: a.name, email: a.user.email },
          handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => { schoolFetch("/applicant/payments/verify", json("POST", resp)).then(() => resolve(), reject); },
          modal: { ondismiss: () => reject(new Error("The payment was not completed.")) } });
        rz.on("payment.failed", () => reject(new Error("The payment failed. You were not charged, or the bank will refund it.")));
        rz.open();
      });
      setDone(`${line.label} received. Thank you.`); r.reload(); a.reloadApps(); a.refreshBadges();
    } catch (e) { setErr(e instanceof Error ? e.message : "The payment could not be completed."); } finally { setBusy(false); }
  };
  return { a, r, busy, err, done, pay };
}
const receiptRows = (r: Receipt[]) => r.map((x) => [x.ref, dmy(x.on), x.label, x.amount, x.mode]);
const NONE = <Note>You have no application yet. Fees appear here once you start one.</Note>;

// ═════════════ Application Fee ═════════════
export function ApplicationFee() {
  const { r, busy, err, done, pay } = useFees();
  const [search, setSearch] = useState("");
  const it = r.data?.items[0];
  const line = it?.lines.find((l) => l.key === "application_fee");
  const rows = (it?.receipts ?? []).filter((x) => x.label === "Application fee" && has(x, search));
  return (
    <div>
      <Head title="Application Fee" subtitle="The one-time application fee, paid when you submitted the application." />
      <ErrorBanner message={r.error || err} />
      {done && <Note tone="green">{done}</Note>}
      {!r.data ? <Loading /> : !it ? NONE : (
        <>
          {line?.can_pay && (r.data.online ? <Note tone="amber"><span className="flex flex-wrap items-center justify-between gap-3"><span>The application fee of <b>{inr(line.amount)}</b> is due before you submit.</span><button type="button" className={brandBtn} disabled={busy} onClick={() => void pay(it.id, line)}>{busy ? "Opening…" : `Pay ${inr(line.amount)}`}</button></span></Note> : <Note tone="amber">The application fee of <b>{inr(line.amount)}</b> is due. Online payment is not set up for this school yet: pay at the admissions office and they record it here.</Note>)}
          {line?.status === "Waived" && <Note tone="green">The school waived the application fee.</Note>}
          <DataTable title="Application fee" noun="payments" search={search} onSearch={setSearch} exportName="application-fee" exportHead={["Receipt", "Paid on", "For", "Amount", "Mode"]} exportRows={receiptRows(rows)}
            head={["Receipt", "Paid on", "For", "Amount", "Mode", "Status", ""]} empty="No payment yet."
            rows={rows.map((x) => [<span key="r" className="font-mono text-[12px]">{x.ref}</span>, dmy(x.on), `${x.label} · ${it.code}`, inr(x.amount), x.mode || "—", <Chip key="s" tone="good">Paid</Chip>, <button key="b" type="button" className={whiteBtn.replace("px-4 py-2", "px-3 py-1")} onClick={() => printRows(`receipt-${x.ref}`, [["Receipt", x.ref], ["Child", it.child], ["For", x.label], ["Amount", inr(x.amount)], ["Mode", x.mode || "—"], ["Date", dmy(x.on)]])}>Receipt</button>])} />
        </>
      )}
    </div>
  );
}

// ═════════════ Admission Fee ═════════════
export function AdmissionFee() {
  const { a, r, busy, err, done, pay } = useFees();
  const cls = classOnly(a.active?.class_sought ?? "Class 1");
  const f = useLoad(() => schoolFetch<{ rows: { fee: string; when: string; amount: number }[] }>(`/applicant/school/fees?class=${encodeURIComponent(cls)}`), [cls]);
  const it = r.data?.items[0];
  const line = it?.lines.find((l) => l.key === "admission_fee");
  const rows = (f.data?.rows ?? []).filter((x) => x.fee === "Admission fee" || x.fee === "Caution deposit" || /term/i.test(x.when)).map((x) => ({ fee: x.fee === "Caution deposit" ? "Caution deposit (refundable)" : /term/i.test(x.when) ? `Term 1 ${x.fee.toLowerCase()}` : x.fee, amount: x.amount }));
  const total = rows.reduce((n, x) => n + x.amount, 0);
  return (
    <div>
      <Head title="Admission Fee" subtitle={`You pay this after you get an offer. Here's what it will be for ${cls}.`} />
      <ErrorBanner message={r.error || f.error || err} />
      {done && <Note tone="green">{done}</Note>}
      {!r.data ? <Loading /> : !it ? NONE : (
        <>
          {line?.status === "Paid" ? <Note tone="green">The admission fee was received{line.paid_on ? ` on ${dmy(line.paid_on)}` : ""}. Thank you.</Note>
            : line?.can_pay ? <Note tone="amber"><span className="flex flex-wrap items-center justify-between gap-3"><span>Your offer is ready. Pay <b>{inr(line.amount)}</b> (admission fee and caution deposit){line.by ? ` by ${dmy(line.by)}` : ""} to confirm the seat.</span>{r.data.online ? <button type="button" className={brandBtn} disabled={busy} onClick={() => void pay(it.id, line)}>{busy ? "Opening…" : `Pay ${inr(line.amount)}`}</button> : <span className="text-[12px]">Pay at the admissions office.</span>}</span></Note>
            : <Note>Payment opens when the offer is made.</Note>}
          <Panel title="Amount due on offer" sub={cls}>
            <table className="w-full text-[13px]"><thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fee</th><th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map((x) => <tr key={x.fee}><td className="px-4 py-3">{x.fee}</td><td className="px-4 py-3">{inr(x.amount)}</td></tr>)}{!rows.length && <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">{f.loading ? "Loading…" : "The school has not set up its fees yet."}</td></tr>}{rows.length > 0 && <tr><td className="px-4 py-3 font-bold text-slate-900">Total</td><td className="px-4 py-3 font-bold text-slate-900">{inr(total)}</td></tr>}</tbody></table>
          </Panel>
        </>
      )}
    </div>
  );
}

// ═════════════ Receipts ═════════════
export function Receipts() {
  const { r } = useFees();
  const [search, setSearch] = useState("");
  const rows = (r.data?.items ?? []).flatMap((i) => i.receipts.map((x) => ({ ...x, child: i.child }))).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Receipts" subtitle="Every payment you've made to the school." />
      <ErrorBanner message={r.error} />
      <DataTable title="Receipts" noun="receipts" search={search} onSearch={setSearch} exportName="receipts" exportHead={["Receipt", "Date", "For", "Amount"]} exportRows={rows.map((x) => [x.ref, dmy(x.on), x.label, x.amount])}
        head={["Receipt", "Date", "For", "Amount", ""]} empty={r.loading ? "Loading…" : "No payments yet."}
        rows={rows.map((x) => [<span key="r" className="font-mono text-[12px]">{x.ref}</span>, dmy(x.on), <b key="f" className="font-semibold text-slate-900">{x.label}</b>, inr(x.amount), <button key="p" type="button" className={whiteBtn.replace("px-4 py-2", "px-3 py-1")} onClick={() => printRows(`receipt-${x.ref}`, [["Receipt", x.ref], ["Child", x.child], ["For", x.label], ["Amount", inr(x.amount)], ["Mode", x.mode || "—"], ["Date", dmy(x.on)]])}>Download</button>])} />
    </div>
  );
}
