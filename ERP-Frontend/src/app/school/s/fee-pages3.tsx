"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls, printReceipt, tone } from "./fee-pages";
import type { Rcpt } from "./fee-pages";
import { PendingList } from "./fee-pages2";

const F = "/school/fees";
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const lakh = (n: number) => { if (Math.abs(n) < 100000) return inr(n); const v = n / 100000; return `₹${v >= 100 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(1).replace(/\.0$/, "")}L`; };
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const stTone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (s === "Posted" ? "info" : s === "Completed" ? "good" : s === "Needs mapping" ? "warn" : tone(s));
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const Cb = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => <input type="checkbox" aria-label={label} className="h-4 w-4 accent-[#026f9b]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;

// ═════════════ expenses ═════════════
interface XCat { id: string; name: string; monthly_budget: number; spent: number; approver: string; status: string }
interface Exp { id: string; voucher: string; category: string; approver: string; paid_to: string; amount: number; mode: string | null; spent_on: string; raised_by: string; status: string; decided_on: string | null }
const APPROVERS = ["Accountant", "Principal", "Transport manager", "Vice Principal", "School admin"];
export function ExpensePages({ tab }: { tab: "expense-categories" | "add-expense" | "approval" }) {
  const cats = useLoad(() => schoolFetch<{ items: XCat[] }>(`${F}/expense-categories`), []);
  const ex = useLoad(() => schoolFetch<{ categories: { id: string; name: string }[]; staff: { id: string; name: string }[]; items: Exp[] }>(`${F}/expenses`), []);
  const act = useAction(() => { cats.reload(); ex.reload(); });
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<XCat | Exp | null>(null);
  const [adding, setAdding] = useState(false);
  const [c, setC] = useState({ name: "", monthly_budget: "", approver: "Accountant" });
  const [f, setF] = useState({ voucher: "", category_id: "", paid_to: "", amount: "", mode: "", spent_on: nowIst(), raised_by: "" });
  const err = <ErrorBanner message={cats.error || ex.error || act.error} />;
  if (tab === "add-expense") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${F}/expenses`, json("POST", { voucher: f.voucher || undefined, category_id: f.category_id || ex.data?.categories[0]?.id, paid_to: f.paid_to, amount: Number(f.amount), mode: f.mode || null, spent_on: f.spent_on, raised_by: f.raised_by || null })))) { setF({ ...f, voucher: "", paid_to: "", amount: "", mode: "" }); setMsg("Saved. It is waiting in Approval."); } };
    return (
      <div>{okBox(msg)}
        <FormCard title="Add Expense" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF({ voucher: "", category_id: "", paid_to: "", amount: "", mode: "", spent_on: nowIst(), raised_by: "" }); setMsg(""); }} busy={act.busy} error={cats.error || ex.error || act.error}>
          <Field label="Voucher"><input className={inputCls} maxLength={30} placeholder="Automatic if empty" value={f.voucher} onChange={(e) => setF({ ...f, voucher: e.target.value })} /></Field>
          <Field label="Category"><select className={inputCls} required value={f.category_id || ex.data?.categories[0]?.id || ""} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{!ex.data?.categories.length && <option value="">Add a category first</option>}{ex.data?.categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Paid to"><input className={inputCls} required minLength={2} maxLength={120} value={f.paid_to} onChange={(e) => setF({ ...f, paid_to: e.target.value })} /></Field>
          <Field label="Amount"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Mode"><select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="">—</option>{["Cash", "UPI", "Card", "Cheque", "Bank"].map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Date"><input type="date" required className={inputCls} value={f.spent_on} onChange={(e) => setF({ ...f, spent_on: e.target.value })} /></Field>
          <Field label="Raised by"><select className={inputCls} value={f.raised_by} onChange={(e) => setF({ ...f, raised_by: e.target.value })}><option value="">Me</option>{ex.data?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </FormCard>
      </div>
    );
  }
  if (tab === "approval") {
    const all = (ex.data?.items ?? []).filter((x) => x.status === "Pending"); const rows = all.filter((x) => has(x, search));
    const decide = async (x: Exp, status: string) => { if (await act.run(() => schoolFetch(`${F}/expenses/${x.id}`, json("PATCH", { status })))) setView(null); };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Expenses", value: all.length, sub: "All records" }, { label: "Pending", value: all.length, sub: `${pct(all.length, all.length)} of shown` }]} />
        <ListPanel title="Expenses" noun="expenses" search={search} onSearch={setSearch} exportName="expense-approval" head={["Voucher", "Category", "Paid to", "Amount", "Mode", "Date", "Raised by", "Status"]} exportRows={rows.map((x) => [x.voucher, x.category, x.paid_to, x.amount, x.mode ?? "", day(x.spent_on), x.raised_by, x.status])}
          tableHead={["Voucher", "Category", "Paid to", "Amount", "Mode", "Date", "Raised by", "Status", ""]} empty={ex.loading ? "Loading…" : "Nothing is waiting for a decision."}
          rows={rows.map((x) => [x.voucher, x.category, x.paid_to, <span key="a" className="block text-right">{inr(x.amount)}</span>, x.mode ?? "—", day(x.spent_on), x.raised_by || "—", <Chip key="s" tone="warn">{x.status}</Chip>,
            <span key="b" className="flex gap-1.5"><button type="button" className={redBtn} disabled={act.busy} onClick={() => void decide(x, "Rejected")}>Reject</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void decide(x, "Approved")}>Approve</button><button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
        <Modal open={!!view} title={view && "voucher" in view ? view.voucher : ""} onClose={() => setView(null)}>{view && "voucher" in view && <><dl><Row k="Category" v={view.category} /><Row k="Paid to" v={view.paid_to} /><Row k="Amount" v={inr(view.amount)} /><Row k="Mode" v={view.mode ?? "—"} /><Row k="Date" v={day(view.spent_on)} /><Row k="Raised by" v={view.raised_by || "—"} /><Row k="Approver" v={view.approver || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  const all = cats.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/expense-categories`, json("POST", { name: c.name, monthly_budget: Number(c.monthly_budget) || 0, approver: c.approver })))) { setAdding(false); setC({ ...c, name: "", monthly_budget: "" }); } };
  const toggle = async (x: XCat) => { if (await act.run(() => schoolFetch(`${F}/expense-categories/${x.id}`, json("PATCH", { status: x.status === "Active" ? "Inactive" : "Active" })))) setView(null); };
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <Tiles items={[{ label: "Expense categories", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Expense categories" noun="categories" search={search} onSearch={setSearch} exportName="expense-categories" head={["Category", "Monthly budget", "Spent this month", "Approver", "Status"]} exportRows={rows.map((x) => [x.name, x.monthly_budget, x.spent, x.approver, x.status])}
        extra={<><button type="button" className={small} onClick={() => setAdding(true)}>+ Add category</button>{!all.length && <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { await schoolFetch(`${F}/expense-defaults`, json("POST", {})); setMsg("Standard categories added."); })}>Use the standard categories</button>}</>}
        tableHead={["Category", "Monthly budget", "Spent this month", "Approver", "Status", ""]} empty={cats.loading ? "Loading…" : "No categories yet."}
        rows={rows.map((x) => [x.name, inr(x.monthly_budget), inr(x.spent), x.approver, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view && "monthly_budget" in view ? view.name : ""} onClose={() => setView(null)}>{view && "monthly_budget" in view && <><dl><Row k="Monthly budget" v={inr(view.monthly_budget)} /><Row k="Spent this month" v={inr(view.spent)} /><Row k="Approver" v={view.approver} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void toggle(view)}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal>
      <Modal open={adding} title="Add an expense category" onClose={() => setAdding(false)}><form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input className={inputCls} required minLength={2} maxLength={80} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Monthly budget (₹)"><input type="number" min={0} className={inputCls} value={c.monthly_budget} onChange={(e) => setC({ ...c, monthly_budget: e.target.value })} /></Field><Field label="Approver"><select className={inputCls} value={c.approver} onChange={(e) => setC({ ...c, approver: e.target.value })}>{APPROVERS.map((x) => <option key={x}>{x}</option>)}</select></Field></div>
        <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ accounting ═════════════
interface Ent { date: string; voucher: string; account: string; narration: string; debit: number; credit: number; book: string; status: string; kind: string; mode: string }
export function AccountingPages({ tab }: { tab: "ledger" | "vouchers" | "cash-book" | "bank-book" }) {
  const book = tab === "cash-book" ? "Cash book" : tab === "bank-book" ? "Bank book" : "";
  const l = useLoad(() => schoolFetch<{ items: Ent[] }>(`${F}/ledger${book ? `?book=${encodeURIComponent(book)}` : ""}`), [book]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ent | null>(null);
  const all = l.data?.items ?? []; const rows = all.filter((x) => has(x, search));
  return (
    <div className="space-y-5" data-report><ErrorBanner message={l.error} />
      <Tiles items={[{ label: "Ledger", value: all.length, sub: "All records" }, { label: "Posted", value: all.length, sub: `${pct(all.length, all.length)} of shown` }]} />
      <ListPanel title="Ledger" noun="entries" search={search} onSearch={setSearch} exportName={tab} head={["Date", "Voucher", "Account", "Narration", "Debit", "Credit", "Book", "Status"]} exportRows={rows.map((x) => [day(x.date), x.voucher, x.account, x.narration, x.debit, x.credit, x.book, x.status])}
        tableHead={["Date", "Voucher", "Account", "Narration", "Debit", "Credit", "Book", "Status", ""]} empty={l.loading ? "Loading…" : "No entries yet. Receipts and approved expenses appear here."}
        rows={rows.map((x) => [day(x.date), x.voucher, x.account, x.narration, <span key="d" className="block text-right">{x.debit ? inr(x.debit) : "—"}</span>, <span key="c" className="block text-right">{x.credit ? inr(x.credit) : "—"}</span>, x.book, <Chip key="s" tone="info">{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.voucher ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Date" v={day(view.date)} /><Row k="Type" v={view.kind} /><Row k="Account" v={view.account} /><Row k="Narration" v={view.narration} /><Row k="Debit" v={view.debit ? inr(view.debit) : "—"} /><Row k="Credit" v={view.credit ? inr(view.credit) : "—"} /><Row k="Book" v={view.book} /><Row k="Mode" v={view.mode} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ financial reports ═════════════
interface Rep { today: string; students: number; annual: number; collected: number; pending: number; overdue: number; overdue_students: number; by_mode: [string, number][]; by_type: [string, number][]; by_class: [string, number][]; buckets: number[]; day: { cash: number; online: number; card: number; cheque: number }; month: { income: number; expenses: number; by_type: [string, number][] }; by_hour: number[]; recent: { amount: number; student: string; class_label: string; mode: string; at: string }[]; concessions: { given: number; by_type: [string, number][] } }
interface Pay { id: string; receipt_no: string; student: string; class_label: string; fee: string; total: number; mode: string; collected_at: string; paid_on: string; status: string }
function PayList({ title, only }: { title: string; only?: string }) {
  const p = useLoad(() => schoolFetch<{ items: Pay[] }>(`${F}/payments`), []);
  const [search, setSearch] = useState("");
  const rows = (p.data?.items ?? []).filter((x) => (!only || x.paid_on === only) && has(x, search));
  return (
    <div><ErrorBanner message={p.error} />
      <ListPanel title={title} noun="payments" search={search} onSearch={setSearch} exportName={title.toLowerCase().replace(/\W+/g, "-")} head={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status"]} exportRows={rows.map((x) => [x.receipt_no, x.student, x.class_label, x.fee, x.total, x.mode, x.collected_at, day(x.paid_on), x.status])}
        tableHead={["Receipt", "Student", "Class", "Fee", "Amount", "Mode", "Collected at", "Date", "Status", ""]} empty={p.loading ? "Loading…" : "No payments."}
        rows={rows.map((x) => [x.receipt_no, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.fee, <span key="a" className="block text-right">{inr(x.total)}</span>, x.mode, x.collected_at, day(x.paid_on), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => void schoolFetch<Rcpt>(`${F}/receipt/${x.id}`).then((r) => printReceipt(r))}>View details</button>])} />
    </div>
  );
}
export function FinReportPages({ tab }: { tab: "collection" | "outstanding" | "daily-cash" | "monthly-summary" }) {
  const r = useLoad(() => schoolFetch<Rep>(`${F}/reports`), []);
  const x = r.data;
  if (!x) return <Loading e={r.error} />;
  const head = <Tiles items={[{ label: "Annual fees", value: lakh(x.annual), sub: `${x.students.toLocaleString("en-IN")} students` }, { label: "Collected", value: lakh(x.collected), sub: `${pct(x.collected, x.annual)}` }, { label: "Pending", value: lakh(x.pending), sub: "Includes terms not yet due" }, { label: "Overdue", value: lakh(x.overdue), sub: `${x.overdue_students} students` }]} />;
  if (tab === "collection") return <div className="space-y-5">{head}<div className="grid gap-5 lg:grid-cols-2"><Panel title="Collected by mode" sub="This year"><BarRows rows={x.by_mode} format={lakh} /></Panel><Panel title="Collection by fee type"><BarRows rows={x.by_type} format={lakh} /></Panel></div><PayList title="Fee payments" /></div>;
  if (tab === "outstanding") return <div className="space-y-5">{head}<div className="grid gap-5 lg:grid-cols-2"><Panel title="Pending by class" sub="₹"><BarRows rows={x.by_class.filter(([, v]) => v > 0)} format={lakh} /></Panel><Panel title="Collection by fee type"><BarRows rows={x.by_type} format={lakh} /></Panel></div><PendingList kind="outstanding" title="Pending fees" /></div>;
  if (tab === "daily-cash") return <div className="space-y-5"><Tiles items={[{ label: "Cash", value: inr(x.day.cash), sub: "Today" }, { label: "UPI and net banking", value: inr(x.day.online), sub: "Today" }, { label: "Card", value: inr(x.day.card), sub: "Today" }, { label: "Cheques", value: inr(x.day.cheque), sub: "Today" }]} /><PayList title="Today's collections" only={x.today} /></div>;
  const net = x.month.income - x.month.expenses;
  return <div className="space-y-5"><Tiles items={[{ label: "Income", value: lakh(x.month.income), sub: "Fees collected" }, { label: "Expenses", value: lakh(x.month.expenses), sub: "Approved this month" }, { label: "Net", value: lakh(net), sub: "Income less expenses" }]} /><Panel title="By head" sub="This month so far"><BarRows rows={[...x.month.by_type, ["Expenses paid", x.month.expenses] as [string, number]]} format={lakh} /></Panel></div>;
}

// ═════════════ Tally ═════════════
interface TV { type: string; date: string; voucher: string; narration: string; amount: number; debit_ledger: string; credit_ledger: string }
const xml1 = (v: TV) => { const e = escapeHtml; return `<VOUCHER VCHTYPE="${v.type}" ACTION="Create">\n  <DATE>${v.date.replace(/-/g, "")}</DATE><VOUCHERNUMBER>${e(v.voucher)}</VOUCHERNUMBER>\n  <NARRATION>${e(v.narration)}</NARRATION>\n  <ALLLEDGERENTRIES.LIST><LEDGERNAME>${e(v.debit_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${v.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>\n  <ALLLEDGERENTRIES.LIST><LEDGERNAME>${e(v.credit_ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${v.amount.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>\n</VOUCHER>`; };
function saveText(name: string, text: string) { const u = URL.createObjectURL(new Blob([text], { type: "application/xml" })); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/^(\d+)\/(\d+)\/(\d+),/, "$3-$2-$1");
export function TallyPages({ tab }: { tab: "export-vouchers" | "ledger-mapping" }) {
  const ms = nowIst().slice(0, 7) + "-01";
  const [p, setP] = useState({ from: ms, to: nowIst(), type: "All" });
  const v = useLoad(() => (tab === "export-vouchers" ? schoolFetch<{ company: string; vouchers: TV[]; unmapped: string[] }>(`${F}/tally/vouchers?from=${p.from}&to=${p.to}&type=${p.type}`) : Promise.resolve(null)), [tab, p.from, p.to, p.type]);
  const hist = useLoad(() => (tab === "export-vouchers" ? schoolFetch<{ items: { id: string; exported_at: string; from_date: string; to_date: string; types: string; vouchers: number; status: string }[] }>(`${F}/tally/exports`) : Promise.resolve(null)), [tab]);
  const map = useLoad(() => (tab === "ledger-mapping" ? schoolFetch<{ items: { account: string; tally_ledger: string; tally_group: string; status: string }[] }>(`${F}/tally/mapping`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { hist.reload(); map.reload(); });
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<{ account: string; tally_ledger: string; tally_group: string } | null>(null);
  const [search, setSearch] = useState("");
  const err = <ErrorBanner message={v.error || hist.error || map.error || act.error} />;
  if (tab === "ledger-mapping") {
    const all = map.data?.items ?? []; const rows = all.filter((x) => has(x, search));
    return (
      <div data-report>{err}{okBox(msg)}
        <ListPanel title="Ledger mapping" noun="accounts" search={search} onSearch={setSearch} exportName="ledger-mapping" head={["MCA account", "Tally ledger", "Tally group", "Status"]} exportRows={rows.map((x) => [x.account, x.tally_ledger, x.tally_group, x.status])}
          extra={all.some((x) => x.status !== "Completed") ? <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${F}/tally/mapping/standard`, json("POST", {})); setMsg(`${r.added} accounts mapped with the standard ledgers.`); })}>Use the standard mapping</button> : null}
          tableHead={["MCA account", "Tally ledger", "Tally group", "Status", ""]} empty={map.loading ? "Loading…" : "No accounts."}
          rows={rows.map((x) => [<b key="a" className="font-semibold text-slate-900">{x.account}</b>, x.tally_ledger || "—", x.tally_group || "—", <Chip key="s" tone={stTone(x.status)}>{x.status}</Chip>, <button key="e" type="button" className={small} onClick={() => setEdit({ account: x.account, tally_ledger: x.tally_ledger, tally_group: x.tally_group })}>Edit</button>])} />
        <Modal open={!!edit} title={edit ? `Map ${edit.account}` : ""} onClose={() => setEdit(null)}>{edit && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act.run(() => schoolFetch(`${F}/tally/mapping`, json("PUT", edit))).then((ok) => { if (ok) setEdit(null); }); }}>
          <Field label="Tally ledger"><input className={inputCls} required maxLength={80} value={edit.tally_ledger} onChange={(e) => setEdit({ ...edit, tally_ledger: e.target.value })} /></Field>
          <Field label="Tally group"><input className={inputCls} required maxLength={40} value={edit.tally_group} onChange={(e) => setEdit({ ...edit, tally_group: e.target.value })} /></Field><FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal>
      </div>
    );
  }
  const vs = v.data?.vouchers ?? []; const un = v.data?.unmapped ?? [];
  const go = async () => {
    setMsg("");
    if (!vs.length) return setMsg("There are no vouchers in that period.");
    if (un.length) return setMsg(`Map these accounts first: ${un.join(", ")}.`);
    const body = `<ENVELOPE>\n<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n<BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${escapeHtml(v.data?.company ?? "")}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>\n<REQUESTDATA>\n${vs.map((x) => `<TALLYMESSAGE>\n${xml1(x)}\n</TALLYMESSAGE>`).join("\n")}\n</REQUESTDATA></IMPORTDATA></BODY>\n</ENVELOPE>\n`;
    saveText(`tally-vouchers-${p.from}-to-${p.to}.xml`, body);
    if (await act.run(() => schoolFetch(`${F}/tally/exports`, json("POST", { from: p.from, to: p.to, types: p.type, vouchers: vs.length })))) setMsg(`${vs.length} vouchers exported.`);
  };
  const hrows = hist.data?.items ?? [];
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Export vouchers</h2><span className="text-xs text-slate-500">Tally Prime · company “{v.data?.company ?? ""}”</span></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><Field label="From"><input type="date" className={inputCls} value={p.from} max={p.to} onChange={(e) => setP({ ...p, from: e.target.value })} /></Field><Field label="To"><input type="date" className={inputCls} value={p.to} min={p.from} onChange={(e) => setP({ ...p, to: e.target.value })} /></Field><Field label="Voucher types"><select className={inputCls} value={p.type} onChange={(e) => setP({ ...p, type: e.target.value })}>{["All", "Receipt", "Payment"].map((t) => <option key={t}>{t}</option>)}</select></Field><Field label="Format"><select className={inputCls} defaultValue="Tally XML"><option>Tally XML</option></select></Field></div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3.5"><button type="button" className={btnPrimary} disabled={act.busy || v.loading} onClick={() => void go()}>Export</button></div></div>
      <Panel title="Preview" sub="First voucher in the file"><pre className="overflow-x-auto p-5 text-[11px] leading-relaxed text-slate-700">{vs[0] ? xml1(vs[0]) : "No vouchers in this period."}</pre></Panel>
      <ListPanel title="Export history" noun="exports" hideSearch search="" onSearch={() => undefined} exportName="tally-export-history" head={["When", "Period", "Types", "Vouchers", "Status"]} exportRows={hrows.map((x) => [when(x.exported_at), `${x.from_date} to ${x.to_date}`, x.types, x.vouchers, x.status])}
        tableHead={["When", "Period", "Types", "Vouchers", "Status"]} empty={hist.loading ? "Loading…" : "Nothing exported yet."} rows={hrows.map((x) => [when(x.exported_at), `${day(x.from_date)} – ${day(x.to_date)}`, x.types, `${x.vouchers.toLocaleString("en-IN")} vouchers`, <Chip key="s" tone="good">{x.status}</Chip>])} />
    </div>
  );
}

// ═════════════ canteen wallet ═════════════
export function CanteenPages() {
  const c = useLoad(() => schoolFetch<{ students: { id: string; name: string; class_label: string; balance: number }[]; held: number; wallets: number; topped: number; topups: number; spent: number; low: number; daily: { date: string; topups: number; purchases: number; journal: string }[] }>(`${F}/canteen`), []);
  const act = useAction(() => c.reload());
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", kind: "Top-up", amount: "" });
  const x = c.data;
  if (!x) return <Loading e={c.error} />;
  const sel = f.student_id || x.students[0]?.id || "";
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/canteen`, json("POST", { student_id: sel, kind: f.kind, amount: Number(f.amount) })))) { setAdding(false); setF({ ...f, amount: "" }); } };
  return (
    <div className="space-y-5" data-report><ErrorBanner message={c.error || act.error} />
      <Tiles items={[{ label: "Held in wallets", value: inr(x.held), sub: `${x.wallets.toLocaleString("en-IN")} students` }, { label: "Topped up this month", value: inr(x.topped), sub: `${x.topups} top-ups` }, { label: "Spent this month", value: inr(x.spent), sub: "canteen income" }, { label: "Low balances", value: x.low, sub: "under ₹100" }]} />
      <Panel title="Daily posting" sub="One journal a day" right={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add transaction</button>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Top-ups (to wallet liability)</th><th className="px-3 py-2.5 font-medium">Purchases (to canteen income)</th><th className="px-3 py-2.5 font-medium">Journal</th></tr></thead>
          <tbody>{x.daily.map((d) => <tr key={d.date} className="border-t border-slate-100"><td className="px-5 py-3">{day(d.date)}</td><td className="px-3 py-3">{inr(d.topups)}</td><td className="px-3 py-3">{inr(d.purchases)}</td><td className="px-3 py-3">{d.journal}</td></tr>)}{!x.daily.length && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No wallet activity yet.</td></tr>}</tbody></table></div>
      </Panel>
      <Modal open={adding} title="Add a wallet transaction" onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
        <Field label="Student"><select className={inputCls} value={sel} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{x.students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_label} · {inr(s.balance)}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option>Top-up</option><option>Purchase</option></select></Field><Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field></div>
        <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ finance dashboards ═════════════
const HOURS = ["8–9 am", "9–10 am", "10–11 am", "11–12", "12–1 pm", "1–2 pm", "2–3 pm", "3–4 pm", "4–5 pm"];
const AGE = ["Not yet due", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"];
function Live() {
  const [meta, setMeta] = useState({ first: -1, stamp: "" });
  const r = useLoad(async () => { const d = await schoolFetch<Rep & { day: Rep["day"] & { total: number; receipts: number }; month: Rep["month"] & { receipts: number } }>(`${F}/reports`); setMeta((m) => ({ first: m.first < 0 ? d.day.receipts : m.first, stamp: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) })); return d; }, []);
  const reload = r.reload;
  useEffect(() => { const t = window.setInterval(() => reload(), 30000); return () => window.clearInterval(t); }, [reload]);
  const x = r.data;
  if (!x) return <Loading e={r.error} />;
  const fresh = Math.max(0, x.day.receipts - (meta.first < 0 ? x.day.receipts : meta.first));
  const stamp = meta.stamp;
  return (
    <div className="space-y-5"><ErrorBanner message={r.error} />
      <p className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">● Live · last updated {stamp} · {fresh} new {fresh === 1 ? "payment" : "payments"} since you opened this</p>
      <Tiles items={[{ label: "Collected today", value: inr(x.day.total), sub: `${x.day.receipts} receipts` }, { label: "This month", value: lakh(x.month.income), sub: `${x.month.receipts} receipts` }, { label: "Outstanding", value: lakh(x.pending), sub: `${x.overdue_students} students overdue` }, { label: "Revenue this year", value: lakh(x.collected), sub: `${pct(x.collected, x.annual)} of billed fees` }, { label: "Concessions given", value: lakh(x.concessions.given), sub: `${x.annual ? ((x.concessions.given / x.annual) * 100).toFixed(1) : 0}% of billed fees` }]} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Today by the hour" sub={day(x.today)}><BarRows rows={x.by_hour.map((v, i) => [HOURS[i], v] as [string, number])} format={lakh} /></Panel>
        <Panel title="Payments as they land" sub="From the counter and online"><ul>{x.recent.map((p, i) => <li key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px] first:border-t-0"><span><b>{inr(p.amount)}</b> <span className="text-slate-500">{p.student} · {p.class_label} · {p.mode}</span></span><span className="text-[11px] text-slate-500">{new Date(p.at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span></li>)}{!x.recent.length && <li className="px-5 py-8 text-center text-sm text-slate-400">No payments yet today.</li>}</ul></Panel>
        <Panel title="Outstanding by age" sub="All fee heads"><BarRows rows={x.buckets.map((v, i) => [AGE[i], v] as [string, number])} format={lakh} /></Panel>
        <Panel title="Concessions given" sub="By type"><BarRows rows={x.concessions.by_type} format={lakh} /></Panel>
      </div>
    </div>
  );
}
interface Ins { key: string; level: "high" | "medium"; title: string; text: string; suggest: string }
function Insights() {
  const l = useLoad(() => schoolFetch<{ items: Ins[] }>(`${F}/insights`), []);
  const act = useAction(() => l.reload());
  return (
    <div><ErrorBanner message={l.error || act.error} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{l.data?.items.map((i) => <div key={i.key} className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${i.level === "high" ? "border-l-[#e5413a]" : "border-l-[#d9902f]"}`}><div className="flex items-start justify-between gap-2"><h3 className="text-[14px] font-semibold text-slate-900">{i.title}</h3><Chip tone="warn">New</Chip></div><p className="mt-1.5 text-[13px] text-slate-700">{i.text}</p><p className="mt-2 text-[13px]"><b>Suggested:</b> {i.suggest}</p><div className="mt-3"><button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${F}/insights/review`, json("POST", { key: i.key })))}>Mark reviewed</button></div></div>)}</div>
      {l.data && !l.data.items.length && <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Nothing needs a look right now.</p>}
      <p className="mt-5 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Insights use only this school&apos;s own records and the checks switched on in Alert Rules.</p>
    </div>
  );
}
function AlertRules() {
  const l = useLoad(() => schoolFetch<{ items: { key: string; check: string; raises: string; on: boolean }[] }>(`${F}/alert-rules`), []);
  const act = useAction(() => l.reload());
  return (
    <div><ErrorBanner message={l.error || act.error} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Check</th><th className="px-3 py-2.5 font-medium">Raises</th><th className="px-3 py-2.5 font-medium">On</th></tr></thead>
        <tbody>{l.data?.items.map((r) => <tr key={r.key} className="border-t border-slate-100"><td className="px-5 py-3.5">{r.check}</td><td className="px-3 py-3.5">{r.raises}</td><td className="px-3 py-3.5"><label className="inline-flex items-center gap-2"><Cb checked={r.on} label={r.check} disabled={act.busy} onChange={(v) => void act.run(() => schoolFetch(`${F}/alert-rules`, json("PUT", { key: r.key, on: v })))} />{r.on ? "On" : "Off"}</label></td></tr>)}</tbody></table></div>
    </div>
  );
}
export function DashboardPages({ tab }: { tab: "leadership-live" | "ai-insights" | "alert-rules" }) { return tab === "leadership-live" ? <Live /> : tab === "ai-insights" ? <Insights /> : <AlertRules />; }

// ═════════════ auto reminders ═════════════
interface Step { key: string; offset: number; title: string; note: string; channel: string; on: boolean; text: string }
const fillT = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => ({ parent: "Mr. Prakash Reddy", child: "Aarav", instalment: "Instalment 3", amount: "₹34,400", due: "10 Nov", latefrom: "20 Nov" } as Record<string, string>)[k] ?? `{${k}}`);
function Schedule() {
  const l = useLoad(() => schoolFetch<{ channels: string[]; steps: Step[]; rules: { key: string; text: string; on: boolean }[] }>(`${F}/reminder-config`), []);
  const act = useAction(() => l.reload());
  const [d, setD] = useState<{ steps?: Step[]; rules?: Record<string, boolean> }>({});
  const [msg, setMsg] = useState("");
  const c = l.data;
  if (!c) return <Loading e={l.error} />;
  const steps = d.steps ?? c.steps; const rules = d.rules ?? Object.fromEntries(c.rules.map((r) => [r.key, r.on]));
  const set = (k: string, p: Partial<Step>) => setD({ ...d, steps: steps.map((s) => (s.key === k ? { ...s, ...p } : s)) });
  const save = async () => { setMsg(""); if (await act.run(() => schoolFetch(`${F}/reminder-config`, json("PUT", { steps: steps.map((s) => ({ key: s.key, on: s.on, channel: s.channel, text: s.text })), rules })))) { setD({}); setMsg("Schedule saved."); } };
  return (
    <div><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Reminder schedule</h2><span className="text-xs text-slate-500">For every instalment, transport and hostel fee</span></div>
        {steps.map((s) => <div key={s.key} className={`grid gap-4 border-b border-slate-100 px-5 py-4 md:grid-cols-[10rem_1fr] ${s.on ? "" : "opacity-60"}`}>
          <div><p className="text-[13px] font-semibold text-slate-900">{s.title}</p><p className="text-[11px] text-slate-500">{s.note}</p></div>
          <div className="space-y-2"><div className="flex flex-wrap items-center gap-3"><select aria-label={`${s.title} channel`} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px]" value={s.channel} onChange={(e) => set(s.key, { channel: e.target.value })}>{c.channels.map((ch) => <option key={ch}>{ch}</option>)}</select><label className="inline-flex items-center gap-1.5 text-[13px]"><Cb checked={s.on} label={`${s.title} on`} onChange={(v) => set(s.key, { on: v })} />On</label></div>
            <textarea aria-label={`${s.title} message`} rows={2} maxLength={500} className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px]" value={s.text} onChange={(e) => set(s.key, { text: e.target.value })} />
            <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><b>Preview:</b> {fillT(s.text)}</p></div></div>)}
        <div className="border-b border-slate-100 px-5 py-3.5"><h3 className="text-[14px] font-semibold text-slate-900">Rules</h3></div>
        <div className="space-y-2.5 px-5 py-4">{c.rules.map((r) => <label key={r.key} className="flex items-center gap-2.5 text-[13px]"><Cb checked={rules[r.key] ?? true} label={r.text} onChange={(v) => setD({ ...d, rules: { ...rules, [r.key]: v } })} />{r.text}</label>)}</div>
        <div className="flex justify-end px-5 py-3.5"><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save schedule</button></div></div>
    </div>
  );
}
function Queue() {
  const q = useLoad(() => schoolFetch<{ items: { student_id: string; student: string; class_label: string; father: string; step: string; channel: string; app: boolean; amount: number; message: string }[] }>(`${F}/reminder-queue`), []);
  const act = useAction(() => q.reload());
  const [msg, setMsg] = useState(""); const [search, setSearch] = useState("");
  const rows = (q.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div data-report><ErrorBanner message={q.error || act.error} />{okBox(msg)}
      <ListPanel title="Today's queue" noun="reminders" search={search} onSearch={setSearch} exportName="reminder-queue" head={["Student", "Class", "Parent", "Step", "Channel", "Amount", "Message"]} exportRows={rows.map((x) => [x.student, x.class_label, x.father, x.step, x.channel, x.amount, x.message])}
        extra={<button type="button" className={`${primaryCls} !px-3`} disabled={act.busy || !rows.some((x) => x.app)} onClick={() => void act.run(async () => { const r = await schoolFetch<{ sent: number; left: number }>(`${F}/reminder-queue/run`, json("POST", {})); setMsg(`${r.sent} sent in the parent app.${r.left ? ` ${r.left} use a channel that is not connected yet, or were already reminded today.` : ""}`); })}>Send parent app reminders</button>}
        tableHead={["Student", "Class", "Parent", "Step", "Channel", "Amount", "Message"]} empty={q.loading ? "Loading…" : "No reminders are due today."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.father || "—", x.step, x.channel, inr(x.amount), <span key="m" className="line-clamp-2 max-w-sm text-[12px] text-slate-600">{x.message}</span>])} />
    </div>
  );
}
function Log() {
  const q = useLoad(() => schoolFetch<{ items: { id: string; sent_on: string; student: string; class_label: string; amount: number; channel: string }[] }>(`${F}/reminder-log`), []);
  const [search, setSearch] = useState("");
  const rows = (q.data?.items ?? []).filter((x) => has(x, search));
  return <div data-report><ErrorBanner message={q.error} /><ListPanel title="Reminder log" noun="reminders" search={search} onSearch={setSearch} exportName="reminder-log" head={["Date", "Student", "Class", "Amount", "Channel"]} exportRows={rows.map((x) => [day(x.sent_on), x.student, x.class_label, x.amount, x.channel])} tableHead={["Date", "Student", "Class", "Amount", "Channel"]} empty={q.loading ? "Loading…" : "No reminders sent yet."} rows={rows.map((x) => [day(x.sent_on), <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, inr(x.amount), x.channel])} /></div>;
}
function Results() {
  const q = useLoad(() => schoolFetch<{ sent: number; families: number; paid_after: number; still_due: number }>(`${F}/reminder-results`), []);
  const x = q.data;
  if (!x) return <Loading e={q.error} />;
  return <div><ErrorBanner message={q.error} /><Tiles items={[{ label: "Reminders sent", value: x.sent, sub: "Last 30 days" }, { label: "Families reminded", value: x.families, sub: "Last 30 days" }, { label: "Paid since", value: x.paid_after, sub: `${pct(x.paid_after, x.families)} of reminded` }, { label: "Still due", value: x.still_due, sub: `${pct(x.still_due, x.families)} of reminded` }]} /></div>;
}
export function ReminderPages({ tab }: { tab: "reminder-schedule" | "todays-queue" | "reminder-log" | "results" }) { return tab === "reminder-schedule" ? <Schedule /> : tab === "todays-queue" ? <Queue /> : tab === "reminder-log" ? <Log /> : <Results />; }
void btnGhost; void (null as unknown as ReactNode);
