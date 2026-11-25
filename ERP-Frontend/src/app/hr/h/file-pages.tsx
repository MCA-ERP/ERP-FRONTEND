"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "../../teacher/t/head";
import { Loading, day, rupees } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, solid } from "./ui";

/** The bank transfer file and the statutory files, made from the month's payroll. */
const P = "/school/pay";
const nowMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
/** A due date in the month after `m`. */
const due = (m: string, dayOfMonth: number) => { const d = new Date(`${m}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(dayOfMonth); return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
const masked = (account: string) => (account ? `••${account.replace(/\s/g, "").slice(-4)}` : "Not set");

function save(file: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = file; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const useFile = <T,>(path: string) => { const month = nowMonth(); return { month, ...useLoad(() => schoolFetch<T & { approved: boolean }>(`${P}/${path}?month=${month}`), [month]) }; };
const Create = ({ label, approved, ready, onClick }: { label: string; approved: boolean; ready: boolean; onClick: () => void }) => <button type="button" className={redBtn} disabled={!approved || !ready} title={approved ? undefined : "Available once finance approves the payroll"} onClick={onClick}>{label}</button>;
const NotYet = ({ month }: { month: string }) => <p className="rounded-2xl border border-[#f1d9a6] bg-[#fff8e6] px-4 py-3 text-[13px] text-slate-800">This is a preview. The file can be created once finance approves the {monthName(month)} payroll.</p>;
const Preview = ({ sub, text }: { sub: string; text: string }) => (
  <Panel title="File preview" sub={sub}>
    <pre className="overflow-x-auto bg-slate-50 px-5 py-4 font-mono text-[11px] leading-relaxed text-slate-800">{text ? [...text.split("\n").slice(0, 6), text.split("\n").length > 6 ? "…" : ""].join("\n") : "Nothing to put in the file yet."}</pre>
  </Panel>
);

interface Ids { bank_name: string; bank_account: string; ifsc: string; uan: string; esi_no: string }
/** Opens one person's bank and statutory numbers; their name in the table is the way in. */
function useIds(reload: () => void) {
  const act = useAction(reload);
  const [edit, setEdit] = useState<(Ids & { id: string; name: string }) | null>(null);
  const open = (id: string, who: string) => void act.run(async () => { const b = await schoolFetch<Ids>(`${P}/bank/${id}`); setEdit({ id, name: who, ...b }); });
  const link = (id: string, who: string, sub?: string): ReactNode => <button type="button" className="text-left hover:underline" title="Bank and statutory details" onClick={() => open(id, who)}>{name(who, sub)}</button>;
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!edit) return; const { id, name: _n, ...body } = edit; void _n; if (await act.run(() => schoolFetch(`${P}/bank/${id}`, json("PUT", body)))) setEdit(null); };
  const field = (k: keyof Ids, label: string, max: number) => <label className="block"><span className="mb-1 block text-[12.5px] font-medium">{label}</span><input className={inputCls} maxLength={max} value={edit![k]} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} /></label>;
  const dialog = edit && (
    <Modal open title={`Bank and statutory details · ${edit.name}`} onClose={() => setEdit(null)}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">{field("bank_name", "Bank", 40)}{field("bank_account", "Account number", 20)}{field("ifsc", "IFSC", 11)}{field("uan", "UAN", 12)}{field("esi_no", "ESI IP number", 14)}</div>
        <ErrorBanner message={act.error} />
        <div className="flex items-center justify-end gap-3"><button type="submit" className={solid} disabled={act.busy}>Save</button></div>
      </form>
    </Modal>
  );
  return { link, dialog, error: edit ? "" : act.error };
}

interface Bank { debit_account: string; pay_date: string; total: number; transfers: number; missing: number; text: string; items: { id: string; name: string; emp_code: string; account: string; ifsc: string; net: number }[] }
export function BankFile() {
  const f = useFile<Bank>("bank-file");
  const ids = useIds(f.reload);
  const x = f.data;
  return (
    <div data-report className="space-y-5">
      <Head title="Bank Transfer File" subtitle={`The bulk salary transfer file for the bank, made from the approved ${monthName(f.month)} payroll. Upload it in your bank's net banking and every salary is paid in one go.`} action={<Create label="Create bank file" approved={!!x?.approved} ready={!!x?.text} onClick={() => save(`bank-transfer-${f.month}.csv`, x!.text)} />} />
      <ErrorBanner message={f.error || ids.error} />
      <Loading on={f.loading && !x} />
      {x && (
        <>
          {!x.approved && <NotYet month={f.month} />}
          <Tiles><Tile label="Transfers" value={x.transfers} sub={x.missing ? `${x.missing} without bank details` : "one per employee"} /><Tile label="Total to pay" value={rupees(x.total)} sub={`net pay, ${monthName(f.month)}`} /><Tile label="Debit account" value={masked(x.debit_account)} sub="salary account, set in Payroll Settings" /><Tile label="Pay date" value={day(x.pay_date)} sub="value date in the file" /></Tiles>
          <Preview sub="Bulk NEFT format · first lines" text={x.text} />
          <Table title="Transfers in this file" noun="employees" exportName={`bank-transfers-${f.month}`} empty="No staff."
            head={[{ h: "Employee" }, { h: "Employee ID" }, { h: "Account" }, { h: "IFSC" }, { h: "Net pay" }]}
            rows={x.items.map((i) => ({ key: i.id, find: `${i.name} ${i.emp_code} ${i.ifsc}`, out: [i.name, i.emp_code, i.account, i.ifsc, i.net], cells: [ids.link(i.id, i.name), i.emp_code, i.account || "Missing", i.ifsc || "—", rupees(i.net)] }))} />
          {ids.dialog}
        </>
      )}
    </div>
  );
}

interface Pf { members: number; ee: number; er: number; admin: number; missing_uan: number; text: string; items: { id: string; name: string; uan: string; gross: number; wages: number; ee: number; eps: number; epf: number }[] }
export function PfEcr() {
  const f = useFile<Pf>("pf-ecr");
  const ids = useIds(f.reload);
  const x = f.data;
  return (
    <div data-report className="space-y-5">
      <Head title="PF ECR" subtitle={`The PF electronic challan-cum-return (ECR) for ${monthName(f.month)}, ready to upload on the EPFO employer portal. Due by ${due(f.month, 15)}.`} action={<Create label="Create ECR file" approved={!!x?.approved} ready={!!x?.text} onClick={() => save(`pf-ecr-${f.month}.txt`, x!.text)} />} />
      <ErrorBanner message={f.error || ids.error} />
      <Loading on={f.loading && !x} />
      {x && (
        <>
          {!x.approved && <NotYet month={f.month} />}
          <Tiles><Tile label="Members" value={x.members} sub={x.missing_uan ? `${x.missing_uan} without a UAN` : undefined} /><Tile label="Employee share (12%)" value={rupees(x.ee)} sub="deducted from salary" /><Tile label="Employer share (12%)" value={rupees(x.er)} sub="3.67% EPF + 8.33% pension" /><Tile label="Admin charges (0.5%)" value={rupees(x.admin)} sub="paid with the challan" /></Tiles>
          <Preview sub="EPFO ECR text format" text={x.text} />
          <Table title={`PF contributions · ${monthName(f.month)}`} noun="members" exportName={`pf-${f.month}`} empty="Nobody has PF."
            head={[{ h: "Employee" }, { h: "UAN" }, { h: "Gross" }, { h: "PF wages" }, { h: "Employee 12%" }, { h: "Pension 8.33%" }, { h: "EPF 3.67%" }]}
            rows={x.items.map((i) => ({ key: i.id, find: `${i.name} ${i.uan}`, out: [i.name, i.uan, i.gross, i.wages, i.ee, i.eps, i.epf], cells: [ids.link(i.id, i.name), i.uan || "Missing", rupees(i.gross), rupees(i.wages), rupees(i.ee), rupees(i.eps), rupees(i.epf)] }))} />
          {ids.dialog}
        </>
      )}
    </div>
  );
}

interface Esi { insured: number; ee: number; er: number; missing_ip: number; text: string; items: { id: string; name: string; ip: string; days: number; wages: number; ee: number; er: number }[] }
export function EsiFile() {
  const f = useFile<Esi>("esi-file");
  const ids = useIds(f.reload);
  const x = f.data;
  return (
    <div data-report className="space-y-5">
      <Head title="ESI" subtitle={`ESI contributions for staff earning up to ₹21,000 a month, ready to file on the ESIC portal. Due by ${due(f.month, 15)}.`} action={<Create label="Create ESI file" approved={!!x?.approved} ready={!!x?.items.length} onClick={() => save(`esi-${f.month}.csv`, x!.text)} />} />
      <ErrorBanner message={f.error || ids.error} />
      <Loading on={f.loading && !x} />
      {x && (
        <>
          {!x.approved && <NotYet month={f.month} />}
          <Tiles><Tile label="Insured staff" value={x.insured} sub={x.missing_ip ? `${x.missing_ip} without an IP number` : "gross up to ₹21,000"} /><Tile label="Employee share (0.75%)" value={rupees(x.ee)} /><Tile label="Employer share (3.25%)" value={rupees(x.er)} /><Tile label="Total challan" value={rupees(x.ee + x.er)} sub="pay online on ESIC" /></Tiles>
          <Table title={`ESI contributions · ${monthName(f.month)}`} noun="insured persons" exportName={`esi-${f.month}`} empty="Nobody is covered."
            head={[{ h: "Employee" }, { h: "IP number" }, { h: "Days" }, { h: "Wages" }, { h: "Employee 0.75%" }, { h: "Employer 3.25%" }]}
            rows={x.items.map((i) => ({ key: i.id, find: `${i.name} ${i.ip}`, out: [i.name, i.ip, i.days, i.wages, i.ee, i.er], cells: [ids.link(i.id, i.name), i.ip || "Missing", i.days, rupees(i.wages), rupees(i.ee), rupees(i.er)] }))} />
          {ids.dialog}
        </>
      )}
    </div>
  );
}

interface Tax { pt: number; tds_total: number; slabs: [string, string, number][]; tds: { id: string; name: string; annual: number; tds: number }[]; regime: string }
export function PtTds() {
  const f = useFile<Tax>("pt-tds");
  const x = f.data;
  const [y, m] = f.month.split("-").map(Number);
  const year = m >= 4 ? y : y - 1; // the financial year starts in April
  const quarter = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 ? 3 : 4;
  const q = [{ due: `31 Jul ${year}`, months: "Apr–Jun" }, { due: `31 Oct ${year}`, months: "Jul–Sep" }, { due: `31 Jan ${year + 1}`, months: "Oct–Dec" }, { due: `31 May ${year + 1}`, months: "Jan–Mar" }][quarter - 1];
  const challans = () => downloadCsv(`pt-tds-challans-${f.month}`, ["Challan", "Employee", "Amount"], [["Professional tax", "Whole school", x!.pt], ...x!.tds.map((t) => ["TDS on salary", t.name, t.tds]), ["TDS on salary · total", "", x!.tds_total]]);
  return (
    <div data-report className="space-y-5">
      <Head title="PT and TDS" subtitle={`Telangana professional tax and income tax (TDS) deducted in ${monthName(f.month)}. The challans are worked out here; PT is due by ${due(f.month, 10)} and TDS by ${due(f.month, 7)}.`} action={<Create label="Create PT and TDS challans" approved={!!x?.approved} ready={!!x} onClick={challans} />} />
      <ErrorBanner message={f.error} />
      <Loading on={f.loading && !x} />
      {x && (
        <>
          {!x.approved && <NotYet month={f.month} />}
          <Tiles><Tile label="Professional tax" value={rupees(x.pt)} sub="Telangana · whole school" /><Tile label="TDS on salary" value={rupees(x.tds_total)} sub={x.regime} /><Tile label={`Form 24Q · Q${quarter}`} value={`Due ${q.due}`} sub={`${q.months} quarter`} /><Tile tone="green" label="Form 16" value="Issued in June" sub={`for ${year}–${String(year + 1).slice(2)}`} /></Tiles>
          <Panel title="Professional tax slabs · Telangana" sub="Listed employees"><SimpleTable head={[{ h: "Monthly salary" }, { h: "PT a month" }, { h: "Employees" }]} rows={x.slabs.map(([a, b, c]) => [a, b, c])} /></Panel>
          <Table title={`TDS on salary · ${monthName(f.month)}`} noun="employees" search={false} exportName={`tds-${f.month}`} empty="No TDS this month. Enter it under Statutory Deductions › Other Applicable Deductions."
            head={[{ h: "Employee" }, { h: "Annual salary" }, { h: "TDS this month" }]}
            rows={x.tds.map((t) => ({ key: t.id, find: t.name, out: [t.name, t.annual, t.tds], cells: [name(t.name), rupees(t.annual), <b key="t">{rupees(t.tds)}</b>] }))} />
          <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[12.5px] text-slate-700">TDS is the monthly amount entered for each person under Other Applicable Deductions; it is not worked out from tax declarations.</p>
        </>
      )}
    </div>
  );
}
