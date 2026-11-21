"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";

const F = "/school/fees";
const money = (n: number) => (Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n));
const lak = (n: number) => (Math.abs(n) >= 1e5 ? `${(n / 1e5).toFixed(1)}` : String(n));
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const at = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Matched", "Auto", "Manual", "Paid", "Sent", "Approved", "Settled", "Cleared", "Valid", "Rule on"].includes(s) ? "good" : ["Scheduled", "Waiting for bank", "Awaiting bank", "Not settled yet", "Submitted", "HOD approved", "Suggested", "Open"].includes(s) ? "info" : ["Held back", "Open ", "Difference", "No receipt", "No match", "Missing"].includes(s) ? "warn" : ["Failed", "Rejected"].includes(s) ? "bad" : "mute");
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;

// ═════════════ reminders: queue, log, results ═════════════
interface QItem { key: string; student_id: string; term: number; step_key: string; student: string; class_label: string; father: string; fee: string; amount: number; step: string; offset: number; channel: string; app: boolean; status: "Scheduled" | "Held back" | "Sent"; message: string }
function Queue() {
  const q = useLoad(() => schoolFetch<{ items: QItem[]; going_out: number; overdue_steps: number; skipped: number; skipped_paid: number; skipped_concession: number; calls: number }>(`${F}/reminder-queue`), []);
  const act = useAction(() => q.reload());
  const [msg, setMsg] = useState(""); const [search, setSearch] = useState("");
  const send = async (keys?: string[]) => { let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ sent: number; not_connected: number; no_parent: number }>(`${F}/reminder-queue/send`, json("POST", keys ? { keys } : {})); t = `${r.sent} sent in the parent app.${r.not_connected ? ` ${r.not_connected} use a channel that is not connected yet.` : ""}${r.no_parent ? ` ${r.no_parent} have no parent on file.` : ""}`; })) setMsg(t); };
  const go = useRef(send);
  useEffect(() => { go.current = send; });
  useEffect(() => { const h = () => void go.current(); window.addEventListener("fee-send-all", h); return () => window.removeEventListener("fee-send-all", h); }, []);
  const x = q.data; if (!x) return <Loading e={q.error} />;
  const rows = x.items.filter((i) => has(i, search));
  const hold = (i: QItem) => void act.run(() => schoolFetch(`${F}/reminder-queue/hold`, json("POST", { student_id: i.student_id, term: i.term, step_key: i.step_key, hold: i.status !== "Held back" })));
  return (
    <div className="space-y-5" data-report><ErrorBanner message={q.error || act.error} />{okBox(msg)}
      <Tiles items={[{ label: "Going out today", value: x.going_out, sub: "Scheduled, not held back" }, { label: "Overdue steps", value: x.overdue_steps, sub: "After the due date" }, { label: "Skipped", value: x.skipped, sub: `Already paid · ${x.skipped_paid}${x.skipped_concession ? ` · concession under review ${x.skipped_concession}` : ""}` }, { label: "Calls for accounts", value: x.calls, sub: "From the call-list step" }]} />
      <ListPanel title="Today's queue" noun="reminders" search={search} onSearch={setSearch} exportName="reminder-queue" head={["Family", "Student", "Fee", "Amount", "Step", "Channel", "Status"]} exportRows={rows.map((i) => [i.father, `${i.student} · ${i.class_label}`, i.fee, i.amount, i.step, i.channel, i.status])}
        tableHead={["Family", "Fee", "Amount", "Step", "Channel", "Status", ""]} empty={q.loading ? "Loading…" : "No reminders are due today."}
        rows={rows.map((i) => [<span key="f"><b className="font-semibold text-slate-900">{i.father || "—"}</b><span className="block text-[11px] text-slate-500">{i.student} · {i.class_label}</span></span>, i.fee, inr(i.amount), i.step, i.channel, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>,
          <span key="b" className="flex gap-1.5">{i.status !== "Sent" && <><button type="button" className={small} disabled={act.busy} onClick={() => hold(i)}>{i.status === "Held back" ? "Release" : "Hold back"}</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void send([i.key])}>Send now</button></>}</span>])} />
    </div>
  );
}
function Log() {
  const q = useLoad(() => schoolFetch<{ items: { id: string; sent_on: string; step: string; channel: string; sent_to: number; delivered: number; read: number; paid3: number }[] }>(`${F}/reminder-log`), []);
  const [search, setSearch] = useState("");
  const rows = (q.data?.items ?? []).filter((x) => has(x, search));
  return <div data-report><ErrorBanner message={q.error} /><ListPanel title="Reminder log" noun="batches" search={search} onSearch={setSearch} exportName="reminder-log" head={["Sent", "Step", "Channel", "Sent to", "Delivered", "Read", "Paid within 3 days"]} exportRows={rows.map((x) => [x.sent_on, x.step, x.channel, x.sent_to, x.delivered, x.read, x.paid3])}
    tableHead={["Sent", "Step", "Channel", "Sent to", "Delivered", "Read", "Paid within 3 days"]} empty={q.loading ? "Loading…" : "Nothing has been sent yet."}
    rows={rows.map((x) => [`${day(x.sent_on)}, 09:00`, <b key="s" className="font-semibold text-slate-900">{x.step}</b>, x.channel, <span key="t" className="block text-right">{x.sent_to}</span>, `${x.delivered} (${pct(x.delivered, x.sent_to)})`, `${x.read} read`, <span key="p"><b>{x.paid3}</b> ({pct(x.paid3, x.sent_to)})</span>])} /></div>;
}
function Results() {
  const q = useLoad(() => schoolFetch<{ sent: number; families: number; paid3: number; paid3_pct: number; collected: number; by_step: [string, number][]; by_channel: [string, number][] }>(`${F}/reminder-results`), []);
  const x = q.data; if (!x) return <Loading e={q.error} />;
  const p = (n: number) => `${n}%`;
  return <div className="space-y-5"><ErrorBanner message={q.error} /><Tiles items={[{ label: "Reminders sent", value: x.sent, sub: "Last 30 days" }, { label: "Families reminded", value: x.families, sub: "Last 30 days" }, { label: "Paid within 3 days", value: `${x.paid3_pct}%`, sub: `${x.paid3} families` }, { label: "Collected after reminders", value: money(x.collected), sub: "Within 3 days of a reminder" }]} />
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Families paying within 3 days of each step"><BarRows rows={x.by_step} format={p} /></Panel><Panel title="Best channel" sub="Paid within 3 days"><BarRows rows={x.by_channel} format={p} /></Panel></div></div>;
}
export function ReminderRunPages({ tab }: { tab: "todays-queue" | "reminder-log" | "results" }) { return tab === "todays-queue" ? <Queue /> : tab === "reminder-log" ? <Log /> : <Results />; }

// ═════════════ reconciliation ═════════════
interface Stl { id: string; ref: string; payments_on: string; payments: number; gross: number; fee_gst: number; net: number; bank_amount: number | null; bank_credit_on: string | null; bank_ref: string | null; status: string }
interface BL { id: string; line_on: string; narration: string; money_in: number; money_out: number; matched_to: string | null; rule_note: string | null; journal: string | null; status: string }
function parseStatement(text: string) {
  const rows: { date: string; narration: string; money_in: number; money_out: number }[] = [];
  const num = (s: string | undefined) => Math.round(parseFloat((s ?? "").replace(/[₹,\s]/g, "")) || 0);
  for (const line of text.split(/\r?\n/)) {
    const c = (line.match(/("([^"]*)"|[^,]*)(,|$)/g) ?? []).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").trim());
    const d = c[0]?.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? c[0]?.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (!d || !c[1]) continue;
    const date = d[1].length === 4 ? `${d[1]}-${d[2]}-${d[3]}` : `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
    rows.push({ date, narration: c[1].slice(0, 240), money_in: num(c[2]), money_out: num(c[3]) });
  }
  return rows;
}
export function ReconPages({ tab }: { tab: "live-status" | "gateway-settlements" | "payment-matching" | "exceptions" | "bank-statements" | "matching-rules" | "audit-log" }) {
  const live = useLoad(() => (tab === "live-status" ? schoolFetch<{ today_count: number; today_amount: number; week_matched: number; week_total: number; exceptions: number; unmatched: number; incoming: { at: string; student: string; class_label: string; mode: string; amount: number; receipt: string }[] }>(`${F}/recon/live`) : Promise.resolve(null)), [tab]);
  const stl = useLoad(() => (tab === "gateway-settlements" ? schoolFetch<{ items: Stl[]; week_total: number; week_matched: number; fees: number; unsettled: number; unsettled_amount: number }>(`${F}/recon/settlements`) : Promise.resolve(null)), [tab]);
  const pay = useLoad(() => (tab === "payment-matching" ? schoolFetch<{ items: { id: string; payment: string; student: string; class_label: string; amount: number; mode: string; at: string; receipt: string; payout: string; status: string }[] }>(`${F}/recon/payments`) : Promise.resolve(null)), [tab]);
  const exc = useLoad(() => (tab === "exceptions" ? schoolFetch<{ items: { id: string; kind: string; detail: string; amount: number; status: string; fix: string }[]; open: number; amount: number; cleared_month: number; avg_days: number }>(`${F}/recon/exceptions`) : Promise.resolve(null)), [tab]);
  const bank = useLoad(() => (tab === "bank-statements" ? schoolFetch<{ items: BL[]; total: number; auto: number; suggested: number; none: number }>(`${F}/recon/bank`) : Promise.resolve(null)), [tab]);
  const rules = useLoad(() => (tab === "matching-rules" ? schoolFetch<{ items: { key: string; order: number; rule: string; how: string; posts: string; on: boolean }[] }>(`${F}/recon/rules`) : Promise.resolve(null)), [tab]);
  const aud = useLoad(() => (tab === "audit-log" ? schoolFetch<{ items: { id: string; at: string; who: string; action: string; item: string; details: string; journal: string | null }[] }>(`${F}/recon/audit`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { live.reload(); stl.reload(); pay.reload(); exc.reload(); bank.reload(); rules.reload(); aud.reload(); });
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [rec, setRec] = useState(false); const [f, setF] = useState({ ref: "", on: nowIst(), fee: "" });
  const [cr, setCr] = useState<Stl | null>(null); const [g, setG] = useState({ amount: "", on: nowIst(), ref: "" });
  const [up, setUp] = useState(false); const [csv, setCsv] = useState("");
  useEffect(() => { const h = () => setUp(true); window.addEventListener("fee-upload-statement", h); return () => window.removeEventListener("fee-upload-statement", h); }, []);
  const err = <ErrorBanner message={live.error || stl.error || pay.error || exc.error || bank.error || rules.error || aud.error || act.error} />;
  if (tab === "live-status") {
    const x = live.data; if (!x) return <Loading e={live.error} />;
    return (
      <div className="space-y-5">{err}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px]"><span>● Not connected to a gateway or bank feed. Record settlements and upload bank statements by hand.</span><button type="button" className={small} onClick={() => live.reload()}>Sync now</button></div>
        <Tiles items={[{ label: "Payments today", value: x.today_count, sub: `${inr(x.today_amount)} · all receipted` }, { label: "Payouts matched", value: `${x.week_matched} of ${x.week_total}`, sub: "Last 7 days" }, { label: "Open exceptions", value: x.exceptions, sub: "See Exceptions" }, { label: "Unmatched bank lines", value: inr(x.unmatched), sub: "Upload a statement to match" }]} />
        <Panel title="Incoming payments" sub="Online payments today"><ul className="space-y-2 p-4">{x.incoming.map((p, i) => <li key={i} className="grid grid-cols-[4rem_1fr_auto_auto] items-center gap-4 rounded-lg border border-slate-200 px-3 py-2 text-[13px]"><span>{clock(p.at)}</span><span><b>{p.student}</b> <span className="text-slate-500">{p.class_label} · {p.mode}</span></span><b>{inr(p.amount)}</b><Chip tone={p.receipt === "Missing" ? "warn" : "good"}>{p.receipt === "Missing" ? "No receipt" : `Receipt ${p.receipt}`}</Chip></li>)}{!x.incoming.length && <li className="py-6 text-center text-sm text-slate-400">No online payments yet today.</li>}</ul></Panel>
      </div>
    );
  }
  if (tab === "gateway-settlements") {
    const x = stl.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
    const rs = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/recon/settlements`, json("POST", { ref: f.ref, payments_on: f.on, fee_gst: Number(f.fee) || 0 })))) { setRec(false); setF({ ...f, ref: "", fee: "" }); } };
    const bc = async (e: FormEvent) => { e.preventDefault(); if (cr && await act.run(() => schoolFetch(`${F}/recon/settlements/${cr.id}`, json("PUT", { bank_amount: Number(g.amount), bank_credit_on: g.on, bank_ref: g.ref || undefined })))) setCr(null); };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Settlements matched", value: `${x?.week_matched ?? 0} of ${x?.week_total ?? 0}`, sub: "Last 7 days" }, { label: "Gateway fees and GST", value: inr(x?.fees ?? 0), sub: "All settlements" }, { label: "Not yet settled", value: x?.unsettled ?? 0, sub: `${inr(x?.unsettled_amount ?? 0)} in online payments` }]} />
        <ListPanel title="Gateway settlements" noun="settlements" search={search} onSearch={setSearch} exportName="gateway-settlements" head={["Settlement", "Payments on", "Payments", "Gross", "Fee + GST", "Net", "Bank credit", "Status"]} exportRows={rows.map((i) => [i.ref, day(i.payments_on), i.payments, i.gross, i.fee_gst, i.net, i.bank_credit_on ? `${i.bank_amount} on ${i.bank_credit_on}` : "", i.status])}
          extra={<button type="button" className={small} onClick={() => setRec(true)}>+ Record settlement</button>} tableHead={["Settlement", "Payments on", "Payments", "Gross", "Fee + GST", "Net", "Bank credit", "Status", ""]} empty={stl.loading ? "Loading…" : "No settlements recorded."}
          rows={rows.map((i) => [i.ref, day(i.payments_on), i.payments, inr(i.gross), `− ${inr(i.fee_gst)}`, inr(i.net), i.bank_credit_on ? <span key="b">{inr(i.bank_amount ?? 0)}<span className="block text-[11px] text-slate-500">{day(i.bank_credit_on)}{i.bank_ref ? ` · ${i.bank_ref}` : ""}</span></span> : "Expected", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.status === "Waiting for bank" || i.status === "Difference" ? <button key="c" type="button" className={small} onClick={() => { setCr(i); setG({ amount: String(i.net), on: nowIst(), ref: "" }); }}>Record bank credit</button> : null])} />
        <Modal open={rec} title="Record a settlement" onClose={() => setRec(false)}><form onSubmit={rs} className="space-y-3"><Field label="Settlement ID"><input className={inputCls} required minLength={3} maxLength={40} placeholder="setl_..." value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Payments made on"><input type="date" required className={inputCls} value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></Field><Field label="Fee and GST (₹)"><input type="number" min={0} className={inputCls} value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Field></div><p className="text-xs text-slate-500">All online payments received that day and not yet settled are included.</p><FormFoot close={() => setRec(false)} busy={act.busy} /></form></Modal>
        <Modal open={!!cr} title={cr ? `Bank credit · ${cr.ref}` : ""} onClose={() => setCr(null)}><form onSubmit={bc} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Amount credited (₹)"><input type="number" min={0} required className={inputCls} value={g.amount} onChange={(e) => setG({ ...g, amount: e.target.value })} /></Field><Field label="Credited on"><input type="date" required className={inputCls} value={g.on} onChange={(e) => setG({ ...g, on: e.target.value })} /></Field></div><Field label="Bank reference"><input className={inputCls} maxLength={60} value={g.ref} onChange={(e) => setG({ ...g, ref: e.target.value })} /></Field><p className="text-xs text-slate-500">It matches when the amount equals the net of {cr ? inr(cr.net) : ""}.</p><FormFoot close={() => setCr(null)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "payment-matching") {
    const rows = (pay.data?.items ?? []).filter((i) => has(i, search));
    return <div data-report>{err}<ListPanel title="Payment matching" noun="payments" search={search} onSearch={setSearch} exportName="payment-matching" head={["Payment", "Student", "Amount", "Mode", "Time", "Receipt", "Payout", "Status"]} exportRows={rows.map((i) => [i.payment, i.student, i.amount, i.mode, at(i.at), i.receipt, i.payout, i.status])}
      tableHead={["Payment", "Student", "Amount", "Mode", "Time", "Receipt", "Payout", "Status"]} empty={pay.loading ? "Loading…" : "No online payments yet."}
      rows={rows.map((i) => [i.payment, <span key="n"><b className="font-semibold text-slate-900">{i.student}</b><span className="block text-[11px] text-slate-500">{i.class_label}</span></span>, inr(i.amount), i.mode, at(i.at), i.receipt === "Missing" ? <Chip key="r" tone="bad">Missing</Chip> : i.receipt, i.payout, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>])} /></div>;
  }
  if (tab === "exceptions") {
    const x = exc.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
    const LBL: Record<string, string> = { receipt: "Create receipt", refund: "Refund the second payment", clear: "Mark cleared" };
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Open exceptions", value: x?.open ?? 0, sub: "Clear before month-end" }, { label: "Amount involved", value: inr(x?.amount ?? 0), sub: "" }, { label: "Cleared this month", value: x?.cleared_month ?? 0, sub: "" }, { label: "Average time to clear", value: `${x?.avg_days ?? 0} days`, sub: "" }]} />
        <ListPanel title="Exceptions" noun="items" search={search} onSearch={setSearch} exportName="exceptions" head={["Type", "What happened", "Amount", "Status"]} exportRows={rows.map((i) => [i.kind, i.detail, i.amount, i.status])}
          tableHead={["Type", "What happened", "Amount", "Status", ""]} empty={exc.loading ? "Loading…" : "Nothing to fix."}
          rows={rows.map((i) => [<b key="k" className="font-semibold text-slate-900">{i.kind}</b>, i.detail, <span key="a" className="block text-right">{inr(i.amount)}</span>, <Chip key="s" tone={i.status === "Open" ? "warn" : "good"}>{i.status}</Chip>, i.status === "Open" ? <button key="b" type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${F}/recon/exceptions/${i.id}`, json("POST", { action: i.fix }))).then((ok) => ok && setMsg(`${LBL[i.fix]} done.`))}>{LBL[i.fix]}</button> : null])} />
      </div>
    );
  }
  if (tab === "bank-statements") {
    const x = bank.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
    const load = async (file?: File) => { if (file) setCsv(await file.text()); };
    const submit = async () => { const parsed = parseStatement(csv); if (!parsed.length) return setMsg("No lines found. Use columns: date, narration, money in, money out."); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ added: number; auto: number; suggested: number; none: number; duplicates: number }>(`${F}/recon/bank`, json("POST", { rows: parsed.map((r) => ({ date: r.date, narration: r.narration, money_in: r.money_in, money_out: r.money_out })) })); t = `${r.added} lines added: ${r.auto} matched on their own, ${r.suggested} suggested, ${r.none} with no match.${r.duplicates ? ` ${r.duplicates} were already uploaded.` : ""}`; })) { setUp(false); setCsv(""); setMsg(t); } };
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Statement lines", value: x?.total ?? 0, sub: "All uploaded" }, { label: "Matched on their own", value: x?.auto ?? 0, sub: `${pct(x?.auto ?? 0, x?.total ?? 0)} of lines` }, { label: "Suggested", value: x?.suggested ?? 0, sub: "Confirm with one click" }, { label: "No match", value: x?.none ?? 0, sub: "Needs a look" }]} />
        <ListPanel title="Statement lines" noun="lines" search={search} onSearch={setSearch} exportName="bank-statement" head={["Date", "Narration", "In", "Out", "Matched to", "Journal", "Status"]} exportRows={rows.map((i) => [day(i.line_on), i.narration, i.money_in, i.money_out, i.matched_to ?? "", i.journal ?? "", i.status])}
          tableHead={["Date", "Narration", "In", "Out", "Matched to", "Journal", "Status", ""]} empty={bank.loading ? "Loading…" : "No statement uploaded yet."}
          rows={rows.map((i) => [day(i.line_on), i.narration, <span key="i" className="block text-right">{i.money_in ? inr(i.money_in) : ""}</span>, <span key="o" className="block text-right">{i.money_out ? inr(i.money_out) : ""}</span>, i.matched_to ? <span key="m">{i.matched_to}<span className="block text-[11px] text-slate-500">{i.rule_note ? `Rule: ${i.rule_note}` : ""}</span></span> : "—", i.journal ?? "—", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.status === "Suggested" ? <button key="c" type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${F}/recon/bank/${i.id}/confirm`, json("POST", {})))}>Confirm</button> : null])} />
        <Modal open={up} title="Upload a bank statement" onClose={() => setUp(false)}><div className="space-y-3"><p className="text-[13px] text-slate-600">A CSV with the columns date, narration, money in, money out. Dates can be 2026-11-02 or 02-11-2026.</p><input type="file" accept=".csv,text/csv,text/plain" aria-label="Statement file" onChange={(e) => void load(e.target.files?.[0])} />
          <textarea aria-label="Statement lines" rows={7} className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-[12px]" placeholder={"2026-11-02,NEFT UTR123456 FEE,34400,0\n2026-11-02,BANK CHGS,0,708"} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setUp(false)}>Cancel</button><button type="button" className={btnPrimary} disabled={act.busy || !csv.trim()} onClick={() => void submit()}>Upload and match</button></div></div></Modal>
      </div>
    );
  }
  if (tab === "matching-rules") {
    const rows = rules.data?.items ?? [];
    return <div className="space-y-5" data-report>{err}<ListPanel title="Matching rules" noun="rules" hideSearch search="" onSearch={() => undefined} exportName="matching-rules" head={["Order", "Rule", "How it matches", "Posts", "Status"]} exportRows={rows.map((r) => [r.order, r.rule, r.how, r.posts, r.on ? "Rule on" : "Rule off"])}
      tableHead={["Order", "Rule", "How it matches", "Posts", "Status", ""]} empty={rules.loading ? "Loading…" : "No rules."} rows={rows.map((r) => [r.order, <b key="r" className="font-semibold text-slate-900">{r.rule}</b>, r.how, r.posts, <Chip key="s" tone={r.on ? "good" : "mute"}>{r.on ? "Rule on" : "Rule off"}</Chip>, <button key="b" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${F}/recon/rules`, json("PUT", { key: r.key, on: !r.on })))}>{r.on ? "Turn off" : "Turn on"}</button>])} />
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Amounts must match to the rupee. Anything that doesn&apos;t match any rule stays in the list for the accountant. The cash deposit rule is saved but not applied yet.</p></div>;
  }
  const rows = (aud.data?.items ?? []).filter((i) => has(i, search));
  return <div data-report>{err}<ListPanel title="Reconciliation audit log" noun="entries" search={search} onSearch={setSearch} exportName="reconciliation-audit" head={["When", "Who", "Action", "Item", "Details", "Journal"]} exportRows={rows.map((i) => [at(i.at), i.who, i.action, i.item, i.details, i.journal ?? ""])}
    tableHead={["When", "Who", "Action", "Item", "Details", "Journal"]} empty={aud.loading ? "Loading…" : "Nothing logged yet."} rows={rows.map((i) => [at(i.at), <Chip key="w" tone={i.who === "System" ? "info" : "mute"}>{i.who}</Chip>, <b key="a" className="font-semibold text-slate-900">{i.action}</b>, i.item, i.details, i.journal ?? "—"])} /></div>;
}

// ═════════════ budgets and forecasts ═════════════
interface Bud { id: string; head: string; department: string; annual: number; revised: number | null; spent: number; used: number; projected: number }
export function BudgetPages({ tab }: { tab: "budget-by-head" | "budget-vs-actual" | "cash-flow" | "fee-income" }) {
  const b = useLoad(() => (tab === "budget-by-head" ? schoolFetch<{ months_done: number; pace: number; items: Bud[]; total: number; spent: number; spent_pct: number; projected: number; over: number; heads_over: number }>(`${F}/budgets`) : Promise.resolve(null)), [tab]);
  const v = useLoad(() => (tab === "budget-vs-actual" ? schoolFetch<{ months: { label: string; budget: number; actual: number }[]; since: string; heads: string[] }>(`${F}/budget-actual`) : Promise.resolve(null)), [tab]);
  const c = useLoad(() => (tab === "cash-flow" ? schoolFetch<{ opening: number; rows: { month: string; label: string; opening: number; fees_in: number; other_in: number; running: number; capital: number; closing: number }[]; tightest: { label: string; closing: number } }>(`${F}/cash-flow`) : Promise.resolve(null)), [tab]);
  const fi = useLoad(() => (tab === "fee-income" ? schoolFetch<{ rate: number; items: { name: string; date: string; billed: number; expected: number; pct: number; based_on: string }[] }>(`${F}/fee-income`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { b.reload(); c.reload(); });
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false); const [f, setF] = useState({ head: "", department: "", annual: "" });
  const [rev, setRev] = useState<Bud | null>(null); const [rv, setRv] = useState("");
  const [plan, setPlan] = useState<{ opening: string; months: Record<string, { o: string; r: string; c: string }> } | null>(null);
  const err = <ErrorBanner message={b.error || v.error || c.error || fi.error || act.error} />;
  if (tab === "budget-by-head") {
    const x = b.data; if (!x) return <Loading e={b.error} />;
    const rows = x.items.filter((i) => has(i, search));
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/budgets`, json("POST", { head: f.head, department: f.department, annual: Number(f.annual) })))) { setAdding(false); setF({ head: "", department: "", annual: "" }); } };
    const propose = async (e: FormEvent) => { e.preventDefault(); if (rev && await act.run(() => schoolFetch(`${F}/budgets/${rev.id}`, json("PATCH", { revised: Number(rv) })))) setRev(null); };
    return (
      <div className="space-y-5" data-report>{err}
        <p className="text-[13px] text-slate-600">{x.months_done} {x.months_done === 1 ? "month is" : "months are"} done, so {x.pace}% used is on pace.</p>
        <Tiles items={[{ label: "Budget this year", value: money(x.total), sub: `${x.items.length} heads` }, { label: "Spent so far", value: money(x.spent), sub: `${x.spent_pct}% · on pace is ${x.pace}%` }, { label: "Projected for the year", value: money(x.projected), sub: x.over ? `Over by ${money(x.over)}` : "Within budget" }, { label: "Heads over pace", value: x.heads_over, sub: "Review" }]} />
        <ListPanel title="Budget by head" noun="heads" search={search} onSearch={setSearch} exportName="budget-by-head" head={["Head", "Department", "Budget", "Spent", "Used %", "Projected", "Revised estimate"]} exportRows={rows.map((i) => [i.head, i.department, i.annual, i.spent, i.used, i.projected, i.revised ?? ""])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add head</button>} tableHead={["Head", "Budget", "Spent so far", "Used", "Projected for the year", "Revised estimate", ""]} empty={b.loading ? "Loading…" : "No budget heads yet."}
          rows={rows.map((i) => [<span key="h"><b className="font-semibold text-slate-900">{i.head}</b><span className="block text-[11px] text-slate-500">{i.department}</span></span>, money(i.annual), money(i.spent), <span key="u" className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded bg-slate-100"><span className={`block h-full ${i.used > x.pace + 5 ? "bg-[#c0392b]" : i.used > x.pace ? "bg-[#b9770e]" : "bg-[#0b6b4f]"}`} style={{ width: `${Math.min(100, i.used)}%` }} /></span>{i.used}%</span>, money(i.projected), i.revised ? money(i.revised) : "—", i.projected > i.annual && !i.revised ? <button key="p" type="button" className={small} onClick={() => { setRev(i); setRv(String(i.projected)); }}>Propose revised estimate</button> : null])} />
        <Modal open={adding} title="Add a budget head" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Head"><input className={inputCls} required minLength={2} maxLength={80} placeholder="Same name as an expense category" value={f.head} onChange={(e) => setF({ ...f, head: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Department"><input className={inputCls} maxLength={40} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field><Field label="Budget for the year (₹)"><input type="number" min={0} required className={inputCls} value={f.annual} onChange={(e) => setF({ ...f, annual: e.target.value })} /></Field></div><p className="text-xs text-slate-500">Spending is counted from approved expenses in the category with the same name.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
        <Modal open={!!rev} title={rev ? `Revised estimate · ${rev.head}` : ""} onClose={() => setRev(null)}><form onSubmit={propose} className="space-y-3"><Field label="Revised estimate for the year (₹)"><input type="number" min={0} required className={inputCls} value={rv} onChange={(e) => setRv(e.target.value)} /></Field><FormFoot close={() => setRev(null)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "budget-vs-actual") {
    const x = v.data; if (!x) return <Loading e={v.error} />;
    const max = Math.max(1, ...x.months.flatMap((m) => [m.budget, m.actual])); const H = 200;
    return (
      <div className="space-y-4">{err}
        {x.since && <p className="text-[13px] text-slate-600">Spending has been above budget since {x.since}{x.heads.length ? `, mostly ${x.heads.join(", ")}` : ""}.</p>}
        <Panel title="Budget against actual, by month" sub="₹ lakh">
          <div className="flex items-end gap-4 overflow-x-auto px-6 pb-2 pt-6" style={{ height: H + 70 }}>{x.months.map((m) => <div key={m.label} className="flex flex-1 flex-col items-center gap-2"><div className="flex items-end gap-1.5" style={{ height: H }}><div title={`Budget ${money(m.budget)}`} className="w-6 rounded-t bg-slate-200" style={{ height: Math.max(2, (m.budget / max) * H) }} /><div title={`Actual ${money(m.actual)}`} className="w-6 rounded-t bg-[#026f9b]" style={{ height: Math.max(2, (m.actual / max) * H) }} /></div><span className="text-xs text-slate-500">{m.label}</span><span className="text-[10px] text-slate-400">{lak(m.actual)} / {lak(m.budget)}</span></div>)}{!x.months.length && <p className="w-full py-10 text-center text-sm text-slate-400">No months yet.</p>}</div>
          <div className="flex gap-4 border-t border-slate-100 px-6 py-3 text-xs text-slate-500"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-200" />Budget</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#026f9b]" />Actual</span></div>
        </Panel>
      </div>
    );
  }
  if (tab === "cash-flow") {
    const x = c.data; if (!x) return <Loading e={c.error} />;
    const open = () => setPlan({ opening: String(x.opening), months: Object.fromEntries(x.rows.map((r) => [r.month, { o: String(r.other_in), r: String(r.running), c: String(r.capital) }])) });
    const save = async (e: FormEvent) => { e.preventDefault(); if (plan && await act.run(() => schoolFetch(`${F}/cash-flow`, json("PUT", { opening: Number(plan.opening) || 0, months: Object.entries(plan.months).map(([month, m]) => ({ month, other_in: Number(m.o) || 0, running: Number(m.r) || 0, capital: Number(m.c) || 0 })) })))) setPlan(null); };
    return (
      <div className="space-y-5" data-report>{err}
        <p className={`rounded-xl border px-4 py-2.5 text-[13px] ${x.tightest.closing < 0 ? "border-[#e8b3b0] bg-[#fdf1f0]" : "border-[#f1dcae] bg-[#fdf6e7]"}`}><b>{x.tightest.label} is the tightest month:</b> cash falls to about {money(x.tightest.closing)}. Fees in come from each instalment&apos;s remaining dues and how earlier instalments were paid; the other figures are your plan.</p>
        <ListPanel title="Cash-flow forecast" noun="months" hideSearch search="" onSearch={() => undefined} exportName="cash-flow" head={["Month", "Opening", "Fees in", "Other in", "Salaries and running costs", "Capital payments", "Closing"]} exportRows={x.rows.map((r) => [r.label, r.opening, r.fees_in, r.other_in, r.running, r.capital, r.closing])}
          extra={<button type="button" className={small} onClick={open}>Edit plan</button>} tableHead={["Month", "Opening", "Fees in", "Other in", "Salaries and running costs", "Capital payments", "Closing"]} empty="No months."
          rows={x.rows.map((r) => [<b key="m" className="font-semibold text-slate-900">{r.label}</b>, lak(r.opening), lak(r.fees_in), lak(r.other_in), `− ${lak(r.running)}`, `− ${lak(r.capital)}`, <b key="c" className={r.closing < 0 ? "text-[#ac2c28]" : ""}>{lak(r.closing)}</b>])} />
        <Modal open={!!plan} title="Edit the cash plan" onClose={() => setPlan(null)}>{plan && <form onSubmit={save} className="space-y-3"><Field label="Cash and bank balance today (₹)"><input type="number" required className={inputCls} value={plan.opening} onChange={(e) => setPlan({ ...plan, opening: e.target.value })} /></Field>
          {x.rows.map((r) => <div key={r.month} className="grid grid-cols-4 items-end gap-2"><span className="pb-2 text-[13px] font-semibold">{r.label}</span>{(["o", "r", "c"] as const).map((k, i) => <Field key={k} label={["Other in", "Running costs", "Capital"][i]}><input type="number" min={0} className={inputCls} value={plan.months[r.month][k]} onChange={(e) => setPlan({ ...plan, months: { ...plan.months, [r.month]: { ...plan.months[r.month], [k]: e.target.value } } })} /></Field>)}</div>)}
          <FormFoot close={() => setPlan(null)} busy={act.busy} /></form>}</Modal>
      </div>
    );
  }
  const x = fi.data; if (!x) return <Loading e={fi.error} />;
  return <div data-report>{err}<ListPanel title="Fee income forecast" noun="due dates" hideSearch search="" onSearch={() => undefined} exportName="fee-income-forecast" head={["Due", "Date", "Billed", "Expected", "Based on"]} exportRows={x.items.map((i) => [i.name, i.date, i.billed, i.expected, i.based_on])}
    tableHead={["Due", "Date", "Billed", "Expected", "Based on"]} empty="Nothing is waiting to be collected." rows={x.items.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, day(i.date), money(i.billed), <span key="e"><b>{money(i.expected)}</b> ({i.pct}%)</span>, i.based_on])} /></div>;
}

// ═════════════ claims and advances ═════════════
interface Clm { id: string; code: string; staff: string; dept: string; ctype: string; description: string; claim_on: string; amount: number; receipts: number; status: string; limit: number; approver: string }
export function ClaimPages({ tab }: { tab: "staff-claims" | "advances" | "claim-rules" }) {
  const c = useLoad(() => (tab === "staff-claims" ? schoolFetch<{ staff: { id: string; name: string }[]; types: string[]; items: Clm[]; waiting: number; to_pay: number; to_pay_amount: number; paid_month: number; avg_days: number }>(`${F}/claims`) : Promise.resolve(null)), [tab]);
  const a = useLoad(() => (tab === "advances" ? schoolFetch<{ staff: { id: string; name: string }[]; items: { id: string; staff: string; purpose: string; given: number; settle_by: string; settled: number; balance: number; status: string }[] }>(`${F}/advances`) : Promise.resolve(null)), [tab]);
  const r = useLoad(() => (tab === "claim-rules" ? schoolFetch<{ items: { ctype: string; limit_text: string; receipt_text: string; approver: string }[] }>(`${F}/claim-rules`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { c.reload(); a.reload(); });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Clm | null>(null);
  const [adding, setAdding] = useState(false); const [f, setF] = useState({ staff_id: "", ctype: "", description: "", claim_on: nowIst(), amount: "", receipts: "1" });
  const [adv, setAdv] = useState(false); const [g, setG] = useState({ staff_id: "", purpose: "", given: "", settle_by: nowIst() });
  const [set, setSet] = useState<{ id: string; staff: string; balance: number } | null>(null); const [sa, setSa] = useState("");
  const err = <ErrorBanner message={c.error || a.error || r.error || act.error} />;
  if (tab === "claim-rules") {
    const rows = r.data?.items ?? [];
    return <div className="space-y-5" data-report>{err}<ListPanel title="Claim rules" noun="types" hideSearch search="" onSearch={() => undefined} exportName="claim-rules" head={["Type", "Limit", "Receipt needed", "Approved by"]} exportRows={rows.map((x) => [x.ctype, x.limit_text, x.receipt_text, x.approver])} tableHead={["Type", "Limit", "Receipt needed", "Approved by"]} empty={r.loading ? "Loading…" : "No rules."} rows={rows.map((x) => [<b key="t" className="font-semibold text-slate-900">{x.ctype}</b>, x.limit_text, x.receipt_text, x.approver])} />
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Claims must be made within 30 days of spending. Anything above the limit goes to the Principal.</p></div>;
  }
  if (tab === "advances") {
    const x = a.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/advances`, json("POST", { staff_id: g.staff_id || x?.staff[0]?.id, purpose: g.purpose, given: Number(g.given), settle_by: g.settle_by })))) { setAdv(false); setG({ ...g, purpose: "", given: "" }); } };
    const settle = async (e: FormEvent) => { e.preventDefault(); if (set && await act.run(() => schoolFetch(`${F}/advances/${set.id}`, json("PATCH", { amount: Number(sa) })))) setSet(null); };
    return (
      <div data-report>{err}
        <ListPanel title="Advances" noun="advances" search={search} onSearch={setSearch} exportName="advances" head={["Staff", "Purpose", "Given", "Settle by", "Settled", "Balance", "Status"]} exportRows={rows.map((i) => [i.staff, i.purpose, i.given, i.settle_by, i.settled, i.balance, i.status])}
          extra={<button type="button" className={small} onClick={() => setAdv(true)}>+ Record advance</button>} tableHead={["Staff", "Purpose", "Given", "Settle by", "Settled", "Balance", "Status", ""]} empty={a.loading ? "Loading…" : "No advances yet."}
          rows={rows.map((i) => [<b key="s" className="font-semibold text-slate-900">{i.staff}</b>, i.purpose, inr(i.given), day(i.settle_by), inr(i.settled), inr(i.balance), <Chip key="t" tone={i.status === "Settled" ? "good" : "warn"}>{i.status}</Chip>, i.balance > 0 ? <button key="b" type="button" className={small} onClick={() => { setSet({ id: i.id, staff: i.staff, balance: i.balance }); setSa(String(i.balance)); }}>Record settlement</button> : null])} />
        <Modal open={adv} title="Record an advance" onClose={() => setAdv(false)}><form onSubmit={add} className="space-y-3"><Field label="Staff"><select className={inputCls} value={g.staff_id || x?.staff[0]?.id || ""} onChange={(e) => setG({ ...g, staff_id: e.target.value })}>{x?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Purpose"><input className={inputCls} required minLength={2} maxLength={160} value={g.purpose} onChange={(e) => setG({ ...g, purpose: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={g.given} onChange={(e) => setG({ ...g, given: e.target.value })} /></Field><Field label="Settle by"><input type="date" required className={inputCls} value={g.settle_by} onChange={(e) => setG({ ...g, settle_by: e.target.value })} /></Field></div><FormFoot close={() => setAdv(false)} busy={act.busy} /></form></Modal>
        <Modal open={!!set} title={set ? `Settlement · ${set.staff}` : ""} onClose={() => setSet(null)}><form onSubmit={settle} className="space-y-3"><Field label={`Amount settled (₹, up to ${set ? inr(set.balance) : ""})`}><input type="number" min={1} max={set?.balance} required className={inputCls} value={sa} onChange={(e) => setSa(e.target.value)} /></Field><FormFoot close={() => setSet(null)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  const x = c.data; if (!x) return <Loading e={c.error} />;
  const rows = x.items.filter((i) => has(i, search));
  const move = async (i: Clm, action: string) => { if (await act.run(() => schoolFetch(`${F}/claims/${i.id}`, json("PATCH", { action })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/claims`, json("POST", { staff_id: f.staff_id || x.staff[0]?.id, ctype: f.ctype || x.types[0], description: f.description, claim_on: f.claim_on, amount: Number(f.amount), receipts: Number(f.receipts) || 0 })))) { setAdding(false); setF({ ...f, description: "", amount: "" }); } };
  const open = (i: Clm) => ["Submitted", "HOD approved"].includes(i.status);
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Waiting", value: x.waiting, sub: "" }, { label: "Approved, to pay", value: x.to_pay, sub: inr(x.to_pay_amount) }, { label: "Paid this month", value: inr(x.paid_month), sub: "" }, { label: "Average time to pay", value: `${x.avg_days} days`, sub: "" }]} />
      <ListPanel title="Staff claims" noun="claims" search={search} onSearch={setSearch} exportName="staff-claims" head={["Claim", "Staff", "Type", "Description", "Date", "Amount", "Receipts", "Status"]} exportRows={rows.map((i) => [i.code, i.staff, i.ctype, i.description, day(i.claim_on), i.amount, i.receipts, i.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New claim</button>} tableHead={["Claim", "Staff", "Type", "Date", "Amount", "Receipts", "Status", ""]} empty={c.loading ? "Loading…" : "No claims yet."}
        rows={rows.map((i) => [i.code, <span key="s"><b className="font-semibold text-slate-900">{i.staff}</b><span className="block text-[11px] text-slate-500">{i.dept}</span></span>, <span key="t"><b className="font-semibold">{i.ctype}</b><span className="block max-w-xs text-[11px] text-slate-500">{i.description}</span></span>, day(i.claim_on), inr(i.amount), `${i.receipts} attached`, <Chip key="c" tone={T(i.status)}>{i.status}</Chip>,
          <span key="b" className="flex gap-1.5">{open(i) && <><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void move(i, "approve")}>Approve</button><button type="button" className={small} disabled={act.busy} onClick={() => void move(i, "reject")}>Reject</button></>}{i.status === "Approved" && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void move(i, "pay")}>Pay</button>}<button type="button" className={small} onClick={() => setView(i)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.staff}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Type" v={view.ctype} /><Row k="Description" v={view.description || "—"} /><Row k="Date" v={day(view.claim_on)} /><Row k="Amount" v={inr(view.amount)} /><Row k="Limit" v={inr(view.limit)} /><Row k="Receipts" v={`${view.receipts} attached`} /><Row k="Approved by" v={view.approver} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={adding} title="New staff claim" onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3"><Field label="Staff"><select className={inputCls} value={f.staff_id || x.staff[0]?.id || ""} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>{x.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={f.ctype || x.types[0]} onChange={(e) => setF({ ...f, ctype: e.target.value })}>{x.types.map((t) => <option key={t}>{t}</option>)}</select></Field><Field label="Date"><input type="date" required max={nowIst()} className={inputCls} value={f.claim_on} onChange={(e) => setF({ ...f, claim_on: e.target.value })} /></Field></div>
        <Field label="Description"><input className={inputCls} maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Receipts attached"><input type="number" min={0} className={inputCls} value={f.receipts} onChange={(e) => setF({ ...f, receipts: e.target.value })} /></Field></div>
        <p className="text-xs text-slate-500">Receipt files can&apos;t be uploaded yet; enter how many you hold.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
