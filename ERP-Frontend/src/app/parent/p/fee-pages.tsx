"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { armPrint, downloadCsv } from "@/components/admin/csv";
import { ErrorBanner, inputCls } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useParent } from "../context";
import { ChildBar, DataTable, Lbl, Loaded, Note, Status, Tiles, bluePill, bold, dmy, inr, pill, row, useChildPath, useGet } from "./kit";

interface Line { key: string; label: string; due: number; term: number }
interface Pay { id: string; receipt_no: string; total: number; paid_on: string; mode: string; collected_at: string; status: string }
interface Fees { online: boolean; has_plan: boolean; outstanding: number; lines: Line[]; terms: { term: number; name: string; due_date: string; amount: number; due: number; status: string; receipt: string }[]; payments: Pay[]; concessions: { id: string; code: string; ctype: string; reason: string; amount: number; requested_on: string; status: string; source: string }[] }
const useFees = () => useGet<Fees>(useChildPath("/parent/fees"));

type Checkout = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: () => void) => void };
const rzp = () => (window as unknown as { Razorpay?: Checkout }).Razorpay;
const loadCheckout = () => new Promise<boolean>((ok) => {
  if (rzp()) return ok(true);
  const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => ok(true); s.onerror = () => ok(false); document.body.appendChild(s);
});

export function PayFees() {
  const { child, school, user, refreshMe } = useParent();
  const r = useFees();
  const [off, setOff] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const lines = r.data?.lines ?? [];
  const chosen = lines.filter((l) => !off.includes(l.key));
  const total = chosen.reduce((n, l) => n + l.due, 0);
  // the browser names the fee lines only: the server works out the amount and checks the gateway's answer
  const pay = async () => {
    setError(""); setDone(""); setBusy(true);
    try {
      const o = await schoolFetch<{ order_id: string; amount: number; currency: string; key_id: string; name: string; parent: string }>("/parent/fees/order", json("POST", { student_id: child?.id, line_keys: chosen.map((l) => l.key) }));
      const Rz = (await loadCheckout()) ? rzp() : undefined;
      if (!Rz) throw new Error("Could not open the payment window. Check your connection and try again.");
      const receipt = await new Promise<string>((resolve, reject) => {
        const rz = new Rz({ key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: school.name, description: `School fees · ${o.name}`, prefill: { name: o.parent, email: user.email },
          handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => { schoolFetch<{ receipt_no: string }>("/parent/fees/verify", json("POST", resp)).then((v) => resolve(v.receipt_no), reject); },
          modal: { ondismiss: () => reject(new Error("The payment was not completed.")) } });
        rz.on("payment.failed", () => reject(new Error("The payment failed. You were not charged, or the bank will refund it.")));
        rz.open();
      });
      setDone(`Payment received. Receipt ${receipt}.`); setOff([]); r.reload(); refreshMe();
    } catch (e) { setError(e instanceof Error ? e.message : "The payment could not be completed."); r.reload(); } finally { setBusy(false); }
  };
  return (
    <>
      <Head title="Pay Fees" subtitle="What is due now, and the year's fee by term. A receipt is made as soon as a payment is confirmed." />
      <div className="space-y-4">
        <ChildBar />
        <ErrorBanner message={error} />
        {done && <Note tone="green">{done}</Note>}
        <Loaded r={r}>{(d) => (
          <>
            <Panel title="Due now" sub={d.outstanding ? inr(d.outstanding) : undefined}>
              {!d.has_plan ? <p className="px-5 py-8 text-center text-[13px] text-slate-400">No fee plan has been set for this child yet.</p> : !d.lines.length ? <p className="px-5 py-8 text-center text-[13px] text-slate-400">Nothing is due right now.</p> : (
                <>
                  <ul className="divide-y divide-slate-100">{d.lines.map((l) => <li key={l.key}><label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[#0294CE]" checked={!off.includes(l.key)} onChange={(e) => setOff(e.target.checked ? off.filter((k) => k !== l.key) : [...off, l.key])} /><span className="flex-1 text-slate-900">{l.label}</span><span className="font-semibold tabular-nums">{inr(l.due)}</span></label></li>)}</ul>
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-4 py-3">
                    {!d.online && <span className="mr-auto text-[12.5px] text-slate-600">Online payment is not set up for this school yet. Please pay at the school&apos;s fee counter.</span>}
                    <button type="button" className="rounded-full bg-[#e53a35] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#ac2c28] disabled:opacity-50" disabled={busy || !d.online || !total} onClick={() => void pay()}>{busy ? "Opening…" : `Pay ${inr(total)}`}</button>
                  </div>
                </>
              )}
            </Panel>
            <DataTable title="This year's fees" sub={`${d.terms.length} terms`} name="fee-terms" head={[{ h: "Term" }, { h: "Due date" }, { h: "Amount" }, { h: "Still due" }, { h: "Status" }, { h: "Receipt" }]} empty="No fee plan yet."
              rows={d.terms.map((t) => row([t.name, t.due_date, t.amount, t.due, t.status, t.receipt || "—"], [bold(t.name), dmy(t.due_date), inr(t.amount), inr(t.due), <Status key="s" value={t.status} />, t.receipt || "—"]))} />
          </>
        )}</Loaded>
      </div>
    </>
  );
}

interface Receipt { receipt_no: string; school: string; student: string; class_label: string; registration_no: string; paid_on: string; mode: string; total: number; concession: number; lines: { label: string; amount: number }[] }
export function Receipts() {
  const r = useFees();
  const [error, setError] = useState("");
  const print = async (id: string) => {
    setError("");
    try {
      const x = await schoolFetch<Receipt>(`/parent/fees/receipts/${id}`);
      armPrint();
      downloadCsv(`receipt-${x.receipt_no}`, ["Item", "Details"], [["School", x.school], ["Receipt", x.receipt_no], ["Student", `${x.student} · ${x.class_label}`], ["Admission no.", x.registration_no], ["Paid on", dmy(x.paid_on)], ["Mode", x.mode], ...x.lines.map((l) => [l.label, inr(l.amount)]), ...(x.concession ? [["Concession", `- ${inr(x.concession)}`]] : []), ["Total paid", inr(x.total)]]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open the receipt."); }
  };
  return (
    <>
      <Head title="Receipts" subtitle="Every payment recorded for your child, online or at the fee counter." />
      <div className="space-y-4">
        <ChildBar />
        <ErrorBanner message={error} />
        <Loaded r={r}>{(d) => <DataTable title="Payments" sub={`${d.payments.length} payments`} name="fee-receipts" search head={[{ h: "Receipt" }, { h: "Date" }, { h: "Amount" }, { h: "Mode" }, { h: "Paid at" }, { h: "Status" }]} empty="No payment yet."
          rows={d.payments.map((p) => row([p.receipt_no, p.paid_on, p.total, p.mode, p.collected_at, p.status], [bold(p.receipt_no), dmy(p.paid_on), inr(p.total), p.mode, p.collected_at, <Status key="s" value={p.status} />], p.status === "Paid" ? <button type="button" className={pill} onClick={() => void print(p.id)}>Receipt</button> : <span />))} />}</Loaded>
      </div>
    </>
  );
}

const CTYPES = ["Scholarship", "Sibling", "Staff ward", "Financial aid", "Discount", "Fee waiver", "Other"];
export function Concessions() {
  const { child } = useParent();
  const r = useFees();
  const blank = { ctype: CTYPES[0], amount: "", reason: "" };
  const [f, setF] = useState(blank);
  const [done, setDone] = useState("");
  const act = useAction(r.reload);
  const field = `${inputCls} !py-1.5 text-[12.5px]`;
  return (
    <>
      <Head title="Concessions" subtitle="Ask the school for a fee concession. The decision shows here." />
      <div className="space-y-4">
        <ChildBar />
        <form onSubmit={(e) => { e.preventDefault(); setDone(""); void act.run(async () => { const x = await schoolFetch<{ code: string }>("/parent/fees/concessions", json("POST", { student_id: child?.id, ctype: f.ctype, reason: f.reason, amount: Number(f.amount) })); setF(blank); setDone(`Request ${x.code} sent to the school.`); }); }}>
          <Panel title="New concession request">
            <ErrorBanner message={act.error} />
            <div className="grid gap-3.5 p-4 sm:grid-cols-3">
              <Lbl label="Type"><select className={field} value={f.ctype} onChange={(e) => setF({ ...f, ctype: e.target.value })}>{CTYPES.map((t) => <option key={t}>{t}</option>)}</select></Lbl>
              <Lbl label="Amount for the year (₹)"><input type="number" min={1} max={10000000} required className={field} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Lbl>
              <Lbl label="Reason"><input required minLength={3} maxLength={200} className={field} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Lbl>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3">{done && <span role="status" className="mr-auto text-[13px] font-semibold text-emerald-700">{done}</span>}<button type="submit" className={bluePill} disabled={act.busy || !child}>Send request</button></div>
          </Panel>
        </form>
        <Loaded r={r}>{(d) => (
          <>
            <Tiles items={[{ label: "Approved this year", value: inr(d.concessions.filter((c) => c.status === "Approved").reduce((n, c) => n + c.amount, 0)), tone: "green" }]} />
            <DataTable title="Concessions" sub={`${d.concessions.length} requests`} name="concessions" head={[{ h: "Number" }, { h: "Type" }, { h: "Reason" }, { h: "Amount" }, { h: "Asked on" }, { h: "Status" }]} empty="No concession requested." rows={d.concessions.map((c) => row([c.code, c.ctype, c.reason, c.amount, c.requested_on, c.status], [c.code, c.ctype, c.reason, inr(c.amount), dmy(c.requested_on), <Status key="s" value={c.status} />]))} />
          </>
        )}</Loaded>
      </div>
    </>
  );
}
