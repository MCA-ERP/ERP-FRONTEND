"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";

const blueBtn = "rounded-full bg-[#026f9b] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const redBtn = "rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28]";
const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const GROUPS = ["Assets", "Liabilities", "Fund", "Income", "Expenses"];
const base = "/accounts/accounting/books-of-account";

// ═════════════ chart of accounts ═════════════
export function ChartOfAccounts() {
  const router = useRouter();
  const r = useLoad(() => schoolFetch<{ items: { code: string; name: string; grp: string; balance: number }[] }>("/accounts/gl/chart"), []);
  const act = useAction(() => r.reload());
  const [q, setQ] = useState(""); const [g, setG] = useState("All groups");
  const blank = { code: "", name: "", grp: "Expenses" }; const [f, setF] = useState(blank);
  const rows = (r.data?.items ?? []).filter((m) => has(m, q) && (g === "All groups" || m.grp === g));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/accounts/gl/chart", json("POST", f)))) setF(blank); };
  return (
    <div className="space-y-5">
      <Head title="Chart of Accounts" subtitle="The chart of accounts. Fee categories, fines and expense heads post to these accounts." />
      <ErrorBanner message={r.error || act.error} />
      <ListPanel title="Chart of accounts" noun="accounts" search={q} onSearch={setQ} exportName="chart-of-accounts" head={["Code", "Account", "Group", "Balance"]}
        extra={<select aria-label="Group" value={g} onChange={(e) => setG(e.target.value)} className={`${inputCls} !w-auto`}>{["All groups", ...GROUPS].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [m.code, m.name, m.grp, m.balance])} tableHead={["Code", "Account", "Group", "Balance", ""]}
        rows={rows.map((m) => [m.code, <b key="n">{m.name}</b>, m.grp, inr(m.balance), <button key="l" type="button" className={pillBtn} onClick={() => router.push(`${base}?tab=general-ledger&account=${m.code}`)}>Ledger</button>])} empty="No accounts." />
      <Panel title="New account"><form onSubmit={save}>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <label className="text-[12px] text-slate-700">Code<input className={`${inputCls} mt-1`} required pattern="\d{4}" placeholder="For example, 5802" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></label>
          <label className="text-[12px] text-slate-700">Account name<input className={`${inputCls} mt-1`} required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="text-[12px] text-slate-700">Group<select className={`${inputCls} mt-1`} value={f.grp} onChange={(e) => setF({ ...f, grp: e.target.value })}>{GROUPS.map((o) => <option key={o}>{o}</option>)}</select></label>
        </div>
        <div className="flex justify-end border-t border-slate-100 p-4"><button type="submit" className={blueBtn} disabled={act.busy}>Add account</button></div>
      </form></Panel>
    </div>
  );
}

// ═════════════ journal ═════════════
interface JV { voucher: string; date: string; narration: string; source: string; amount: number; lines: { code: string; account: string; dr: number; cr: number }[] }
export function Journal() {
  const r = useLoad(() => schoolFetch<{ accounts: { code: string; name: string }[]; items: JV[] }>("/accounts/gl/journal"), []);
  const act = useAction(() => r.reload());
  const [q, setQ] = useState(""); const [src, setSrc] = useState("All sources"); const [view, setView] = useState<JV | null>(null); const [adding, setAdding] = useState(false);
  const blank = { date: new Date().toLocaleDateString("en-CA"), amount: "", debit: "5601", credit: "1101", narration: "" }; const [f, setF] = useState(blank);
  const rows = (r.data?.items ?? []).filter((m) => has(m, q) && (src === "All sources" || m.source === src));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/accounts/gl/journal", json("POST", { date: f.date, amount: Number(f.amount), debit: f.debit, credit: f.credit, narration: f.narration })))) { setAdding(false); setF(blank); } };
  const opts = (r.data?.accounts ?? []).map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>);
  return (
    <div>
      <Head title="Journal" subtitle="Every accounting entry. Receipts, fines and expenses post here automatically; add a journal entry for anything else." action={<button type="button" className={redBtn} onClick={() => setAdding(true)}>New journal entry</button>} />
      <ErrorBanner message={r.error || act.error} />
      <ListPanel title="Journal" noun="entries" search={q} onSearch={setQ} exportName="journal" head={["Voucher", "Date", "Narration", "Source", "Amount"]}
        extra={<select aria-label="Source" value={src} onChange={(e) => setSrc(e.target.value)} className={`${inputCls} !w-auto`}>{["All sources", "Receipts", "Fines", "Refunds", "Expenses", "Claims", "Manual"].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [m.voucher, dmy(m.date), m.narration, m.source, m.amount])} tableHead={["Voucher", "Date", "Narration", "Source", "Amount", ""]}
        rows={rows.map((m) => [m.voucher, dmy(m.date), m.narration, m.source, inr(m.amount), <button key="v" type="button" className={pillBtn} onClick={() => setView(m)}>View</button>])} empty="No entries yet." />
      <Modal open={adding} title="New journal entry" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-slate-700">Date<input type="date" className={`${inputCls} mt-1`} required max={new Date().toLocaleDateString("en-CA")} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Amount (₹)<input type="number" min={1} className={`${inputCls} mt-1`} required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label className="text-[12px] text-slate-700">Debit<select className={`${inputCls} mt-1`} value={f.debit} onChange={(e) => setF({ ...f, debit: e.target.value })}>{opts}</select></label>
            <label className="text-[12px] text-slate-700">Credit<select className={`${inputCls} mt-1`} value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })}>{opts}</select></label>
          </div>
          <label className="block text-[12px] text-slate-700">Narration<input className={`${inputCls} mt-1`} required minLength={3} maxLength={200} placeholder="For example, petty cash used for plumbing" value={f.narration} onChange={(e) => setF({ ...f, narration: e.target.value })} /></label>
          <div className="flex justify-end"><button type="submit" className={blueBtn} disabled={act.busy}>Post entry</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view ? `${view.voucher} · ${dmy(view.date)}` : ""} onClose={() => setView(null)}>
        {view && <div><p className="mb-3 text-[13px] text-slate-700">{view.narration}</p><SimpleTable head={[{ h: "Account" }, { h: "Debit" }, { h: "Credit" }]} rows={view.lines.map((l) => [`${l.code} · ${l.account}`, l.dr ? inr(l.dr) : "", l.cr ? inr(l.cr) : ""])} /></div>}
      </Modal>
    </div>
  );
}

// ═════════════ general ledger ═════════════
export function GeneralLedger() {
  const params = useSearchParams(); const router = useRouter();
  const code = params.get("account") ?? "1102";
  const r = useLoad(() => schoolFetch<{ account: { code: string; name: string }; accounts: { code: string; name: string }[]; items: { date: string; voucher: string; narration: string; debit: number; credit: number; balance: number }[]; balance: number }>(`/accounts/gl/ledger/${code}`), [code]);
  const [q, setQ] = useState(""); const x = r.data;
  const rows = (x?.items ?? []).filter((m) => has(m, q));
  return (
    <div>
      <Head title="General Ledger" subtitle="Every entry in one account with a running balance." />
      <ErrorBanner message={r.error} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Account<select aria-label="Account" value={code} onChange={(e) => router.replace(`${base}?tab=general-ledger&account=${e.target.value}`, { scroll: false })} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{(x?.accounts ?? [{ code, name: "" }]).map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></label>
        {x && <span className="ml-auto text-[12px] text-slate-500">Balance: {inr(x.balance)}</span>}
      </div>
      <ListPanel title={`General ledger · ${x ? `${x.account.code} ${x.account.name}` : ""}`} noun="entries" search={q} onSearch={setQ} exportName="general-ledger" head={["Date", "Voucher", "Narration", "Debit", "Credit", "Balance"]}
        exportRows={rows.map((m) => [dmy(m.date), m.voucher, m.narration, m.debit || "", m.credit || "", m.balance])} tableHead={["Date", "Voucher", "Narration", "Debit", "Credit", "Balance"]}
        rows={rows.map((m) => [dmy(m.date), m.voucher, m.narration, m.debit ? inr(m.debit) : "", m.credit ? inr(m.credit) : "", inr(m.balance)])} empty="No entries in this account yet." />
    </div>
  );
}

// ═════════════ financial statements ═════════════
interface St { as_on: string; from: string; trial: { items: { code: string; name: string; debit: number; credit: number }[]; debit: number; credit: number }; income_exp: { income: { name: string; amount: number }[]; concessions: number; total_income: number; expenses: { name: string; amount: number }[]; total_expenditure: number; surplus: number }; balance_sheet: { fund: { name: string; amount: number }[]; surplus: number; liabilities: { name: string; amount: number }[]; assets: { name: string; amount: number }[]; total_left: number; total_assets: number; balanced: boolean } }
const useStatements = () => useLoad(() => schoolFetch<St>("/accounts/gl/statements"), []);
const Total = ({ label, value }: { label: string; value: number }) => [<b key="l">{label}</b>, <b key="v">{inr(value)}</b>];

export function TrialBalance() {
  const r = useStatements(); const [q, setQ] = useState(""); const x = r.data;
  if (!x) return <><Head title="Trial Balance" /><Loading e={r.error} /></>;
  const rows = x.trial.items.filter((m) => has(m, q));
  return (
    <div>
      <Head title="Trial Balance" subtitle={`Trial balance as on ${dmy(x.as_on)}. Debits and credits must match.`} />
      <ListPanel title="Trial balance" noun="accounts" search={q} onSearch={setQ} exportName="trial-balance" head={["Code", "Account", "Debit", "Credit"]}
        exportRows={[...rows.map((m) => [m.code, m.name, m.debit || "", m.credit || ""]), ["", "Total", x.trial.debit, x.trial.credit]]} tableHead={["Code", "Account", "Debit", "Credit"]}
        rows={[...rows.map((m): ReactNode[] => [m.code, m.name, m.debit ? inr(m.debit) : "", m.credit ? inr(m.credit) : ""]), ["", <b key="t">Total</b>, <b key="d">{inr(x.trial.debit)}</b>, <b key="c">{inr(x.trial.credit)}</b>]]} empty="Nothing posted yet." />
      <p className={`mt-3 rounded-xl border px-4 py-2.5 text-xs ${x.trial.debit === x.trial.credit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{x.trial.debit === x.trial.credit ? "Balanced · debits equal credits." : "Debits and credits differ. Check the opening balances."}</p>
    </div>
  );
}

export function IncomeExpenditure() {
  const r = useStatements(); const x = r.data;
  if (!x) return <><Head title="Income & Expenditure" /><Loading e={r.error} /></>;
  const e = x.income_exp;
  return (
    <div className="space-y-5">
      <Head title="Income & Expenditure" subtitle={`Income and expenditure for ${dmy(x.from)} to ${dmy(x.as_on)}.`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Income"><SimpleTable head={[{ h: "Account" }, { h: "Amount" }]} empty="No income yet." rows={[...e.income.map((m): ReactNode[] => [m.name, inr(m.amount)]), ...(e.concessions ? [["Less: concessions allowed", `− ${inr(Math.abs(e.concessions))}`] as ReactNode[]] : []), Total({ label: "Total income", value: e.total_income })]} /></Panel>
        <Panel title="Expenditure"><SimpleTable head={[{ h: "Account" }, { h: "Amount" }]} empty="No expenditure yet." rows={[...e.expenses.map((m): ReactNode[] => [m.name, inr(m.amount)]), Total({ label: "Total expenditure", value: e.total_expenditure })]} /></Panel>
      </div>
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-sm text-slate-800">{e.surplus >= 0 ? "Surplus" : "Deficit"} for the period: <b>{inr(Math.abs(e.surplus))}</b></p>
    </div>
  );
}

export function BalanceSheet() {
  const r = useStatements(); const x = r.data;
  if (!x) return <><Head title="Balance Sheet" /><Loading e={r.error} /></>;
  const b = x.balance_sheet;
  return (
    <div className="space-y-5">
      <Head title="Balance Sheet" subtitle={`Balance sheet as on ${dmy(x.as_on)}.`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Fund and liabilities"><SimpleTable head={[{ h: "" }, { h: "Amount" }]} empty="Nothing yet." rows={[...b.fund.map((m): ReactNode[] => [m.name, inr(m.amount)]), ["Add: surplus for the period", inr(b.surplus)], ...b.liabilities.map((m): ReactNode[] => [m.name, inr(m.amount)]), Total({ label: "Total", value: b.total_left })]} /></Panel>
        <Panel title="Assets"><SimpleTable head={[{ h: "" }, { h: "Amount" }]} empty="Nothing yet." rows={[...b.assets.map((m): ReactNode[] => [m.name, inr(m.amount)]), Total({ label: "Total", value: b.total_assets })]} /></Panel>
      </div>
      <p className={`rounded-xl border px-4 py-2.5 text-xs ${b.balanced ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{b.balanced ? "Balanced · assets equal fund and liabilities." : "Not balanced yet. Opening balances (fund, fixed assets) have not been entered; post them as a journal entry."}</p>
    </div>
  );
}

// ═════════════ bank reconciliation ═════════════
const BankTile = ({ label, value, sub, bg }: { label: string; value: number; sub: string; bg: string }) => <div className={`rounded-2xl px-4 py-3.5 ${bg}`}><p className="text-xs text-slate-700">{label}</p><p className="mt-0.5 text-[24px] font-bold tabular-nums text-slate-900">{inr(value)}</p><p className="mt-0.5 text-xs text-slate-700">{sub}</p></div>;
export function BankRecon() {
  const r = useLoad(() => schoolFetch<{ since: string; books: number; pending_deposits: number; pending_payments: number; statement: number; items: { voucher: string; date: string; narration: string; deposit: number; withdrawal: number; on_statement: boolean }[] }>("/accounts/gl/bank"), []);
  const act = useAction(() => r.reload());
  const [q, setQ] = useState(""); const [f, setF] = useState("All"); const x = r.data;
  const rows = (x?.items ?? []).filter((m) => has(m, q) && (f === "All" || (f === "Pending" ? !m.on_statement : m.on_statement)));
  return (
    <div>
      <Head title="Bank Reconciliation" subtitle="Match the bank account in the books with the bank statement. Tick items as they appear on the statement." />
      <ErrorBanner message={r.error || act.error} />
      {x && <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <BankTile label="Balance in books" value={x.books} sub="Bank account" bg="bg-[#dceff9]" />
        <BankTile label="Deposits not yet credited" value={x.pending_deposits} sub="Gateway settlement, cheques in clearing" bg="bg-[#dceff9]" />
        <BankTile label="Payments not yet debited" value={x.pending_payments} sub="Cheques issued, not presented" bg="bg-[#dceff9]" />
        <BankTile label="Balance per bank statement" value={x.statement} sub="Should match the statement" bg="bg-[#dceff9]" />
      </div>}
      <ListPanel title={`Bank entries since ${x ? dmy(x.since) : ""}`} noun="entries" search={q} onSearch={setQ} exportName="bank-reconciliation" head={["Date", "Voucher", "Narration", "Deposit", "Withdrawal", "On statement"]}
        extra={<select aria-label="Filter" value={f} onChange={(e) => setF(e.target.value)} className={`${inputCls} !w-auto`}>{["All", "Pending", "Reconciled"].map((o) => <option key={o}>{o}</option>)}</select>}
        exportRows={rows.map((m) => [dmy(m.date), m.voucher, m.narration, m.deposit || "", m.withdrawal || "", m.on_statement ? "Reconciled" : "Pending"])} tableHead={["Date", "Voucher", "Narration", "Deposit", "Withdrawal", "On statement", ""]}
        rows={rows.map((m) => [dmy(m.date), m.voucher, m.narration, m.deposit ? inr(m.deposit) : "", m.withdrawal ? inr(m.withdrawal) : "", <Chip key="s" tone={m.on_statement ? "good" : "warn"}>{m.on_statement ? "Reconciled" : "Pending"}</Chip>, m.on_statement ? null : <button key="b" type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch("/accounts/gl/bank/mark", json("POST", { voucher: m.voucher })))}>Mark on statement</button>])} empty="No bank entries yet." />
    </div>
  );
}
