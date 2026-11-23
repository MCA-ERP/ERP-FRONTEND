"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";

const blueBtn = "rounded-full bg-[#026f9b] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const whiteBtn = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const yearLabel = () => { const n = new Date(); const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; return `${y}–${String((y + 1) % 100).padStart(2, "0")}`; };
const person = (name: string, sub: string) => <div><p className="font-semibold text-slate-900">{name}</p><p className="text-[11px] text-slate-500">{sub}</p></div>;
const tone = (s: string): "good" | "warn" | "bad" | "info" => (s === "Approved" ? "good" : s === "Rejected" ? "bad" : s === "Pending" ? "warn" : "info");

// ═════════════ concession register ═════════════
export function ConcessionRegister() {
  const r = useLoad(() => schoolFetch<{ items: { student: string; class_label: string; registration_no: string; concession: string; per_term: number; year: number }[]; students: number; given: number; terms: number }>("/accounts/concession-register"), []);
  const [q, setQ] = useState("");
  const x = r.data; const rows = (x?.items ?? []).filter((m) => has(m, q));
  return (
    <div>
      <Head title="Concession Register" subtitle="Students with a concession this year and what it saves them." />
      <ErrorBanner message={r.error} />
      {x && <div className="mb-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#dceff9] px-4 py-3.5"><p className="text-xs text-slate-700">Students</p><p className="text-[26px] font-bold tabular-nums">{x.students}</p><p className="text-xs text-slate-700">With a concession</p></div><div className="rounded-2xl bg-[#dceff9] px-4 py-3.5"><p className="text-xs text-slate-700">Given this year</p><p className="text-[26px] font-bold tabular-nums">{inr(x.given)}</p><p className="text-xs text-slate-700">{x.terms} terms</p></div></div>}
      <ListPanel title={`Concession register · ${yearLabel()}`} noun="students" search={q} onSearch={setQ} exportName="concession-register" head={["Student", "Class", "Admission no.", "Concession", "Per term", "A year"]}
        exportRows={rows.map((m) => [m.student, m.class_label, m.registration_no, m.concession, m.per_term, m.year])} tableHead={["Student", "Concession", "Per term", "A year"]}
        rows={rows.map((m) => [person(m.student, `${m.class_label} · ${m.registration_no}`), m.concession, inr(m.per_term), inr(m.year)])} empty="No approved concessions yet." />
    </div>
  );
}

// ═════════════ requests (the Principal decides them; the accountant sees where each is) ═════════════
export function ConcessionRequests({ parent }: { parent: boolean }) {
  const r = useLoad(() => schoolFetch<{ items: { id: string; student: string; class_label: string; registration_no: string; concession: string; reason: string; from: string; on: string; per_term: number; status: string }[] }>(`/accounts/concession-requests${parent ? "?source=Parent" : ""}`), [parent]);
  const [q, setQ] = useState("");
  const rows = (r.data?.items ?? []).filter((m) => has(m, q));
  return (
    <div>
      <Head title={parent ? "Parent Requests" : "Requests"} subtitle={parent ? "Concession requests from parents. The Principal decides them; your view shows where each one is." : "Concession requests. Once approved, the concession applies to invoices not yet paid."} />
      <ErrorBanner message={r.error} />
      <ListPanel title={parent ? "Parent requests" : "Concession requests"} noun="requests" search={q} onSearch={setQ} exportName={parent ? "parent-concession-requests" : "concession-requests"} head={["Student", "Class", "Concession", "Reason", "From", "Date", "Saves a term", "Status"]}
        exportRows={rows.map((m) => [m.student, m.class_label, m.concession, m.reason, m.from, dmy(m.on), m.per_term, m.status])} tableHead={["Student", "Concession", "Reason", "From", "Saves a term", "Status"]}
        rows={rows.map((m) => [person(m.student, `${m.class_label} · ${m.registration_no}`), <b key="c">{m.concession}</b>, m.reason || "—", person(m.from, dmy(m.on)), inr(m.per_term), <Chip key="s" tone={tone(m.status)}>{m.status}</Chip>])} empty="No requests yet." />
      <p className="mt-3 text-[12px] text-slate-500">Pending requests wait for the Principal or School Admin, who decide them in the School Admin portal.</p>
    </div>
  );
}

// ═════════════ concession types ═════════════
interface CType { id: string; name: string; value_text: string; for_whom: string; approved_by: string; students: number }
export function ConcessionTypes() {
  const r = useLoad(() => schoolFetch<{ items: CType[] }>("/accounts/concession-types"), []);
  const act = useAction(() => r.reload());
  const blank = { name: "", kind: "Percentage", value: "20", for_whom: "", approved_by: "Principal" };
  const [f, setF] = useState(blank);
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/accounts/concession-types", json("POST", { name: f.name, kind: f.kind, value: Number(f.value), for_whom: f.for_whom, approved_by: f.approved_by })))) setF(blank); };
  return (
    <div className="space-y-5">
      <Head title="Concession Types" subtitle="Concession types the school offers. Each one reduces tuition: by a percentage or a fixed amount a term." />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="Concession types" sub={`${r.data?.items.length ?? 0} types`}>
        <SimpleTable head={[{ h: "Concession" }, { h: "Value" }, { h: "For" }, { h: "Approved by" }, { h: "Students" }]} empty="Loading…" rows={(r.data?.items ?? []).map((t) => [<b key="n">{t.name}</b>, t.value_text, t.for_whom || "—", t.approved_by, t.students])} />
      </Panel>
      <Panel title="New concession type">
        <form onSubmit={save}>
          <div className="grid gap-4 p-5 md:grid-cols-5">
            <label className="text-[12px] text-slate-700">Name<input className={`${inputCls} mt-1`} required minLength={2} maxLength={60} placeholder="For example, Sports quota 20%" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Type<select className={`${inputCls} mt-1`} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option>Percentage</option><option>Fixed</option></select></label>
            <label className="text-[12px] text-slate-700">Value<input className={`${inputCls} mt-1`} type="number" min={1} required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /><span className="text-[11px] text-slate-500">Percent, or rupees a term</span></label>
            <label className="text-[12px] text-slate-700">For<input className={`${inputCls} mt-1`} maxLength={120} placeholder="Who qualifies" value={f.for_whom} onChange={(e) => setF({ ...f, for_whom: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Approved by<select className={`${inputCls} mt-1`} value={f.approved_by} onChange={(e) => setF({ ...f, approved_by: e.target.value })}>{["Automatic", "Accountant", "Principal", "School admin"].map((o) => <option key={o}>{o}</option>)}</select></label>
          </div>
          <div className="flex justify-end border-t border-slate-100 p-4"><button type="submit" className={blueBtn} disabled={act.busy}>Add concession type</button></div>
        </form>
      </Panel>
    </div>
  );
}

// ═════════════ parent payment ═════════════
interface PayView { student: { id: string; name: string; class_label: string }; parent: string; has_plan: boolean; terms: { term: number; name: string; date: string; amount: number; late: number; status: string }[]; paying: { term: number; name: string; amount: number } | null; methods: { name: string; sub: string }[] }
interface Gateway { id: string; txn: string; merchant: string; for_text: string; amount: number; method: string }

export function ParentPay() {
  const list = useLoad(() => schoolFetch<{ items: { id: string; name: string; class_label: string }[] }>("/accounts/parent-pay/students"), []);
  const [sid, setSid] = useState("");
  const pick = sid || list.data?.items[0]?.id || "";
  const v = useLoad(() => (pick ? schoolFetch<PayView>(`/accounts/parent-pay/student/${pick}`) : Promise.resolve(null)), [pick]);
  const [method, setMethod] = useState("PhonePe");
  const [gw, setGw] = useState<Gateway | null>(null);
  const [done, setDone] = useState("");
  const act = useAction(() => v.reload());
  const x = v.data;
  const start = async () => { setDone(""); await act.run(async () => { setGw(await schoolFetch<Gateway>("/accounts/parent-pay/start", json("POST", { student_id: pick, method }))); }); };
  const finish = async (ok: boolean) => { if (!gw) return; const id = gw.id; if (await act.run(async () => { const r = await schoolFetch<{ status: string; receipt_no: string; total: number }>(`/accounts/parent-pay/${id}/${ok ? "confirm" : "fail"}`, json("POST", {})); setDone(ok ? `Payment received. Receipt ${r.receipt_no} for ${inr(r.total)}.` : "The payment failed. Nothing was charged; the parent can try again."); })) setGw(null); };
  const tone2 = (s: string) => (s === "Paid" ? "good" : s === "Overdue" ? "bad" : s === "Upcoming" ? "warn" : "info") as "good" | "bad" | "warn" | "info";
  return (
    <div>
      <Head title="Outstanding & Pay" subtitle="What a parent sees in the Parent portal: outstanding fees, a payment method, then the payment gateway. Use it to check the flow or take a payment with a parent on the phone." />
      <ErrorBanner message={list.error || v.error || act.error} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Student
          <select aria-label="Student" value={pick} onChange={(e) => { setSid(e.target.value); setDone(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{list.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_label}</option>)}</select></label>
        {x?.parent && <span className="ml-auto text-[12px] text-slate-500">Parent: {x.parent}</span>}
      </div>
      {done && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">{done}</p>}
      {x && (
        <div className="space-y-4 rounded-2xl border border-dashed border-[#41afda] p-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">Parent portal · Fee payments</p>
          <Panel title={`Outstanding fees · ${x.student.name.split(" ")[0]}`} sub={`${x.terms.length} instalments`}>
            <SimpleTable head={[{ h: "Instalment" }, { h: "Due" }, { h: "Amount" }, { h: "Status" }]} empty={x.has_plan ? "Nothing here." : "No fee plan yet. Assign fees first."} rows={x.terms.map((t) => [<b key="t">{t.name}</b>, dmy(t.date), <span key="a">{inr(t.amount)}{t.late > 0 && <span className="ml-1 text-[11px] text-slate-500">incl. {inr(t.late)} late fee</span>}</span>, <Chip key="s" tone={tone2(t.status)}>{t.status}</Chip>])} />
          </Panel>
          <Panel title="Pay with" sub="Choose how to pay">
            <div className="flex flex-wrap gap-3 p-4" role="radiogroup" aria-label="Payment method">{x.methods.map((m) => <label key={m.name} className={`flex min-w-[8.5rem] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] ${method === m.name ? "border-[#0294CE] bg-[#f3f9fd] ring-1 ring-[#0294CE]/40" : "border-slate-200"}`}><input type="radio" name="method" className="accent-[#0294CE]" checked={method === m.name} onChange={() => setMethod(m.name)} /><span><b className="block text-slate-900">{m.name}</b><span className="text-[11px] text-slate-500">{m.sub}</span></span></label>)}</div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-[14px] text-slate-700">{x.paying ? <>Paying <b className="text-slate-900">{x.paying.name}</b>: <span className="text-[16px] text-slate-900">{inr(x.paying.amount)}</span></> : "Nothing is due right now."}</p><button type="button" className={blueBtn} disabled={!x.paying || act.busy} onClick={() => void start()}>{x.paying ? `Pay ${inr(x.paying.amount)}` : "Pay"}</button></div>
          </Panel>
        </div>
      )}
      <Modal open={!!gw} title="Payment gateway" onClose={() => void finish(false)}>
        {gw && <div>
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"><b className="text-[14px] text-slate-900">Secure payment</b><span className="text-[11px] text-slate-500">Razorpay · test mode</span></div>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-[13px]">{([["Merchant", gw.merchant], ["For", gw.for_text], ["Amount", inr(gw.amount)], ["Method", gw.method], ["Transaction", gw.txn]] as [string, string][]).map(([k, val]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{val}</dd></div>)}</dl>
          <p className="mt-3 text-[11px] text-slate-500">Test mode: no real money moves. The payment waits in Reconciliation until you confirm or fail it here.</p>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={whiteBtn} disabled={act.busy} onClick={() => void finish(false)}>Simulate failure</button><button type="button" className={blueBtn} disabled={act.busy} onClick={() => void finish(true)}>Confirm payment</button></div>
        </div>}
      </Modal>
    </div>
  );
}
