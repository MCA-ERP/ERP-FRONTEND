"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";

const P = "/school/pay";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const lk = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n));
export const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
export const MonthPill = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Month<input type="month" aria-label="Month" value={value} max={nowIst().slice(0, 7)} onChange={(e) => e.target.value && onChange(e.target.value)} className="bg-transparent py-1.5 font-semibold text-slate-900 outline-none" /></label></div>;

// ═════════════ salary configuration ═════════════
export function SalaryConfigPages({ tab }: { tab: "salary-heads" | "allowances" | "deductions" }) {
  const type = tab === "allowances" ? "Allowance" : tab === "deductions" ? "Deduction" : "";
  const h = useLoad(() => schoolFetch<{ items: { id: string; name: string; htype: string; calc: string; taxable: string; status: string }[] }>(`${P}/heads${type ? `?type=${type}` : ""}`), [type]);
  const act = useAction(() => h.reload());
  const [search, setSearch] = useState(""); const [adding, setAdding] = useState(false); const [f, setF] = useState({ name: "", htype: type || "Earning", calc: "", taxable: "Yes" });
  const [view, setView] = useState<NonNullable<typeof h.data>["items"][number] | null>(null);
  const all = h.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${P}/heads`, json("POST", f)))) { setAdding(false); setF({ ...f, name: "", calc: "" }); } };
  return (
    <div className="space-y-5" data-report><ErrorBanner message={h.error || act.error} />
      <Tiles items={[{ label: "Salary heads", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
      <ListPanel title="Salary heads" noun="heads" search={search} onSearch={setSearch} exportName={tab} head={["Head", "Type", "Calculation", "Taxable", "Status"]} exportRows={rows.map((x) => [x.name, x.htype, x.calc, x.taxable, x.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add head</button>} tableHead={["Head", "Type", "Calculation", "Taxable", "Status", ""]} empty={h.loading ? "Loading…" : "No heads."}
        rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.htype, x.calc || "—", x.taxable, <Chip key="s" tone={x.status === "Active" ? "good" : "mute"}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Type" v={view.htype} /><Row k="Calculation" v={view.calc || "—"} /><Row k="Taxable" v={view.taxable} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${P}/heads/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal>
      <Modal open={adding} title="Add a salary head" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Head"><input className={inputCls} required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><div className="grid grid-cols-3 gap-3"><Field label="Type"><select className={inputCls} value={f.htype} onChange={(e) => setF({ ...f, htype: e.target.value })}>{["Earning", "Allowance", "Deduction"].map((t) => <option key={t}>{t}</option>)}</select></Field><Field label="Calculation"><input className={inputCls} maxLength={120} value={f.calc} onChange={(e) => setF({ ...f, calc: e.target.value })} /></Field><Field label="Taxable"><select className={inputCls} value={f.taxable} onChange={(e) => setF({ ...f, taxable: e.target.value })}>{["Yes", "No", "Partly", "—"].map((t) => <option key={t}>{t}</option>)}</select></Field></div><p className="text-xs text-slate-500">The statutory rules (PF, ESI, professional tax, loss of pay) are built in. A head you add is listed but does not change payroll amounts.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ salary structure ═════════════
interface Sr { id: string; name: string; emp_code: string; designation: string; department: string; structure: string; basic: number; allowances: number; allow_pct: number; gross: number; effective_from: string | null; pf: number; esi: number; pt: number; other: number; deductions: number; net: number }
export function SalaryStructurePages({ tab }: { tab: "assign-structure" | "employee-wise" }) {
  const s = useLoad(() => schoolFetch<{ items: Sr[] }>(`${P}/structures`), []);
  const lists = useLoad(() => schoolFetch<{ departments: string[]; designations: string[] }>("/school/hr/registration"), []);
  const act = useAction(() => s.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [a, setA] = useState({ staff_id: "", structure: "", basic: "", pct: "40", month: nowIst().slice(0, 7) });
  const [e, setE] = useState({ staff_id: "", department: "", designation: "", gross: "", from: nowIst() });
  const [view, setView] = useState<Sr | null>(null);
  const items = s.data?.items ?? []; const err = <ErrorBanner message={s.error || lists.error || act.error} />;
  if (tab === "assign-structure") {
    const sel = items.find((x) => x.id === (a.staff_id || items[0]?.id)); const gross = Math.round((Number(a.basic) || 0) * (1 + (Number(a.pct) || 0) / 100));
    const save = async (ev: FormEvent) => { ev.preventDefault(); setMsg(""); if (sel && await act.run(() => schoolFetch(`${P}/assign`, json("PUT", { staff_id: sel.id, structure: a.structure || sel.designation, basic: Number(a.basic), allow_pct: Number(a.pct), effective_from: `${a.month}-01` })))) { setMsg("Structure assigned."); setA({ ...a, basic: "" }); } };
    const rows = items.filter((x) => x.effective_from && has(x, search));
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <FormCard title="Assign a structure" cols="lg:grid-cols-5" submitLabel="Assign structure" onSubmit={save} onDiscard={() => { setA({ ...a, basic: "" }); setMsg(""); }} busy={act.busy} error="">
          <Field label="Employee"><select className={inputCls} value={sel?.id ?? ""} onChange={(ev) => setA({ ...a, staff_id: ev.target.value })}>{items.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.emp_code}</option>)}</select></Field>
          <Field label="Structure"><input className={inputCls} list="pay-struct" maxLength={40} placeholder={sel?.designation} value={a.structure} onChange={(ev) => setA({ ...a, structure: ev.target.value })} /><datalist id="pay-struct">{lists.data?.designations.map((d) => <option key={d} value={d} />)}</datalist></Field>
          <Field label="Basic pay (₹ a month)"><input type="number" min={1} required className={inputCls} value={a.basic} onChange={(ev) => setA({ ...a, basic: ev.target.value })} /></Field>
          <Field label="Allowances (% of basic)"><input type="number" min={0} max={500} className={inputCls} value={a.pct} onChange={(ev) => setA({ ...a, pct: ev.target.value })} /></Field>
          <Field label="Effective from"><input type="month" required className={inputCls} value={a.month} onChange={(ev) => setA({ ...a, month: ev.target.value })} /></Field>
          <p className="text-[13px] text-slate-600 sm:col-span-2 lg:col-span-5">Gross: <b>{inr(gross)}</b> a month</p>
        </FormCard>
        <ListPanel title="Recently assigned" noun="assignments" search={search} onSearch={setSearch} exportName="assigned-structures" head={["Employee", "Structure", "Basic", "Allowances", "Gross", "From"]} exportRows={rows.map((x) => [`${x.name} · ${x.emp_code}`, x.structure, x.basic, `${x.allow_pct}%`, x.gross, x.effective_from ?? ""])}
          tableHead={["Employee", "Structure", "Basic", "Allowances", "Gross", "From"]} empty={s.loading ? "Loading…" : "Nothing assigned yet."} rows={rows.map((x) => [`${x.name} · ${x.emp_code}`, x.structure || "—", inr(x.basic), `${x.allow_pct}%`, inr(x.gross), x.effective_from ? new Date(x.effective_from).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"])} />
      </div>
    );
  }
  const sel = items.find((x) => x.id === (e.staff_id || items[0]?.id));
  const save = async (ev: FormEvent) => { ev.preventDefault(); setMsg(""); if (sel && await act.run(() => schoolFetch(`${P}/assign-employee`, json("PUT", { staff_id: sel.id, department: e.department || sel.department, designation: e.designation || sel.designation, gross: Number(e.gross), effective_from: e.from })))) { setMsg("Assigned."); setE({ ...e, gross: "" }); } };
  const rows = items.filter((x) => has(x, search));
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <FormCard title="Assign department, designation and salary" cols="lg:grid-cols-5" submitLabel="Assign" onSubmit={save} onDiscard={() => setE({ ...e, gross: "" })} busy={act.busy} error="">
        <Field label="Employee"><select className={inputCls} value={sel?.id ?? ""} onChange={(ev) => setE({ ...e, staff_id: ev.target.value, department: "", designation: "" })}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Department"><input className={inputCls} list="pay-dept" maxLength={60} value={e.department || sel?.department || ""} onChange={(ev) => setE({ ...e, department: ev.target.value })} /><datalist id="pay-dept">{lists.data?.departments.map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Designation"><input className={inputCls} list="pay-des" maxLength={100} value={e.designation || sel?.designation || ""} onChange={(ev) => setE({ ...e, designation: ev.target.value })} /><datalist id="pay-des">{lists.data?.designations.map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Monthly gross (₹)"><input type="number" min={1} required className={inputCls} value={e.gross} onChange={(ev) => setE({ ...e, gross: ev.target.value })} /></Field>
        <Field label="Effective from"><input type="date" required className={inputCls} value={e.from} onChange={(ev) => setE({ ...e, from: ev.target.value })} /></Field>
      </FormCard>
      <ListPanel title="Employee-wise structure" noun="staff" search={search} onSearch={setSearch} exportName="employee-wise-structure" head={["Staff", "Basic", "Allowances", "Gross", "Deductions", "Net"]} exportRows={rows.map((x) => [x.name, x.basic, x.allowances, x.gross, x.deductions, x.net])}
        tableHead={["Staff", "Basic", "Allowances", "Gross", "Deductions", "Net", ""]} empty={s.loading ? "Loading…" : "No staff."}
        rows={rows.map((x) => [<span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-[#026f9b]">{x.designation}</span></span>, inr(x.basic), inr(x.allowances), inr(x.gross), inr(x.deductions), inr(x.net), <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Department" v={view.department || "—"} /><Row k="Designation" v={view.designation || "—"} /><Row k="Basic" v={inr(view.basic)} /><Row k="Allowances" v={inr(view.allowances)} /><Row k="Gross" v={inr(view.gross)} /><Row k="Provident fund" v={inr(view.pf)} /><Row k="ESI" v={inr(view.esi)} /><Row k="Professional tax" v={inr(view.pt)} /><Row k="Other deductions" v={inr(view.other)} /><Row k="Net" v={inr(view.net)} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ attendance calculation ═════════════
interface Ac { month: string; working_days: number; items: { id: string; name: string; emp_code: string; department: string; gross: number; deductions: number; working_days: number; present: number; paid_leave: number; lop: number; lop_amount: number; net: number }[] }
export function AttendanceCalcPages({ tab }: { tab: "working-days" | "paid-leave" | "loss-of-pay" }) {
  const [month, setMonth] = useState(nowIst().slice(0, 7));
  const d = useLoad(() => schoolFetch<Ac>(`${P}/attendance?month=${month}`), [month]);
  const [search, setSearch] = useState(""); const [view, setView] = useState<Ac["items"][number] | null>(null);
  const t = { "working-days": "Working days", "paid-leave": "Paid leave", "loss-of-pay": "Loss of pay" }[tab];
  const rows = (d.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div data-report><ErrorBanner message={d.error} /><MonthPill value={month} onChange={setMonth} />
      <ListPanel title={`${t} · ${label(month)}`} noun="staff" search={search} onSearch={setSearch} exportName={tab} head={["Staff", "Working days", "Present", "Paid leave", "Loss of pay", "LOP amount"]} exportRows={rows.map((x) => [x.name, x.working_days, x.present, x.paid_leave, x.lop, x.lop_amount])}
        tableHead={["Staff", "Working days", "Present", "Paid leave", "Loss of pay", "LOP amount", ""]} empty={d.loading ? "Loading…" : "No staff."}
        rows={rows.map((x) => [<span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-slate-500">{x.emp_code}</span></span>, x.working_days, x.present, x.paid_leave, x.lop, x.lop_amount ? inr(x.lop_amount) : "—", <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <p className="mt-3 text-xs text-slate-500">Working days exclude Sundays. Staff are counted present unless marked absent; leave beyond approved leave is loss of pay at gross ÷ 30 a day.</p>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Working days" v={view.working_days} /><Row k="Present" v={view.present} /><Row k="Paid leave" v={view.paid_leave} /><Row k="Loss of pay" v={view.lop} /><Row k="LOP amount" v={view.lop_amount ? inr(view.lop_amount) : "—"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ deductions ═════════════
export function PayDeductionPages({ tab }: { tab: "pf" | "esi" | "professional-tax" | "other-applicable-deductions" }) {
  const s = useLoad(() => schoolFetch<{ items: Sr[] }>(`${P}/structures`), []);
  const act = useAction(() => s.reload());
  const [search, setSearch] = useState(""); const [edit, setEdit] = useState<{ id: string; name: string; v: string } | null>(null);
  const key = ({ pf: "pf", esi: "esi", "professional-tax": "pt", "other-applicable-deductions": "other" } as const)[tab];
  const title = { pf: "PF", esi: "ESI", "professional-tax": "Professional Tax", "other-applicable-deductions": "Other Applicable Deductions" }[tab];
  const sub = { pf: "Provident fund: 12% of basic, capped at ₹1,800 a month.", esi: "Employee State Insurance: 0.75% for staff earning up to ₹21,000.", "professional-tax": "Professional tax as per the Telangana slab.", "other-applicable-deductions": "Income tax deducted at source, as per each person's declaration. Enter the monthly amount." }[tab];
  const all = (s.data?.items ?? []).filter((x) => tab === "esi" ? x.esi > 0 : tab === "other-applicable-deductions" ? true : true); const rows = all.filter((x) => (tab === "other-applicable-deductions" ? x.other > 0 || has(x, search) : true) && has(x, search));
  const total = rows.reduce((n, x) => n + x[key], 0);
  return (
    <div className="space-y-5" data-report><ErrorBanner message={s.error || act.error} /><p className="text-[13px] text-slate-600">{sub}</p>
      <Tiles items={[{ label: "Staff covered", value: `${tab === "other-applicable-deductions" ? all.filter((x) => x.other > 0).length : all.length} shown`, sub: "" }, { label: "This month", value: inr(all.reduce((n, x) => n + x[key], 0)), sub: "Employee share" }]} />
      <ListPanel title={title} noun="staff" search={search} onSearch={setSearch} exportName={tab} head={["Staff", "Gross", title]} exportRows={rows.map((x) => [x.name, x.gross, x[key]])}
        tableHead={["Staff", "Gross", title, ""]} empty={s.loading ? "Loading…" : "Nobody is covered."}
        rows={rows.map((x) => [<span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-slate-500">{x.emp_code}</span></span>, inr(x.gross), inr(x[key]), tab === "other-applicable-deductions" ? <button key="e" type="button" className={small} onClick={() => setEdit({ id: x.id, name: x.name, v: String(x.other) })}>Set amount</button> : null])} />
      <p className="text-xs text-slate-500">Total shown: {inr(total)}</p>
      <Modal open={!!edit} title={edit ? `Other deductions · ${edit.name}` : ""} onClose={() => setEdit(null)}>{edit && <form onSubmit={(ev) => { ev.preventDefault(); void act.run(() => schoolFetch(`${P}/other-deduction/${edit.id}`, json("PUT", { amount: Number(edit.v) || 0 }))).then((ok) => ok && setEdit(null)); }} className="space-y-3"><Field label="Monthly amount (₹)"><input type="number" min={0} className={inputCls} value={edit.v} onChange={(ev) => setEdit({ ...edit, v: ev.target.value })} /></Field><FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal>
    </div>
  );
}

// ═════════════ payroll processing ═════════════
export function PayrollProcessingPages({ tab }: { tab: "monthly-payroll" | "generate-payroll" }) {
  const r = useLoad(() => schoolFetch<{ current: string; items: { id: string; month: string; status: string; staff: number; gross: number; deductions: number; net: number }[] }>(`${P}/runs`), []);
  const [month, setMonth] = useState(nowIst().slice(0, 7));
  const c = useLoad(() => (tab === "generate-payroll" ? schoolFetch<Ac>(`${P}/attendance?month=${month}`) : Promise.resolve(null)), [tab, month]);
  const act = useAction(() => { r.reload(); c.reload(); });
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<{ id: string; month: string } | null>(null);
  const det = useLoad(() => (view?.id ? schoolFetch<{ items: { staff_id: string; name: string; emp_code: string; working_days: number; present: number; paid_leave: number; lop: number; gross: number; deductions: number; net: number }[] }>(`${P}/runs/${view.id}`) : Promise.resolve(null)), [view?.id]);
  const calc = async (m: string) => { setMsg(""); let t = ""; if (await act.run(async () => { const x = await schoolFetch<{ staff: number; net: number }>(`${P}/calculate`, json("POST", { month: m })); t = `${label(m)} calculated for ${x.staff} staff. Net pay ${inr(x.net)}. It is ready for HR to verify.`; })) setMsg(t); };
  const go = useRef(calc); useEffect(() => { go.current = calc; });
  useEffect(() => { const h = () => void go.current(month); window.addEventListener("pay-calculate", h); return () => window.removeEventListener("pay-calculate", h); }, [month]);
  const err = <ErrorBanner message={r.error || c.error || act.error || det.error} />;
  if (tab === "generate-payroll") {
    const x = c.data; const items = (x?.items ?? []).filter((i) => i.gross > 0); const rows = items.filter((i) => has(i, search));
    const gross = items.reduce((n, i) => n + i.gross, 0); const ded = items.reduce((n, i) => n + i.deductions + i.lop_amount, 0);
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}<MonthPill value={month} onChange={setMonth} />
        <Tiles items={[{ label: "Staff", value: `${items.length} shown`, sub: `Of ${x?.items.length ?? 0}` }, { label: "Gross", value: inr(gross), sub: "" }, { label: "Deductions", value: inr(ded), sub: "PF, ESI, PT, other, loss of pay" }, { label: "Net pay", value: inr(gross - ded), sub: "" }]} />
        <ListPanel title="Preview" noun="staff" search={search} onSearch={setSearch} exportName="payroll-preview" head={["Staff", "Days paid", "Gross", "Deductions", "Net"]} exportRows={rows.map((i) => [i.name, i.present + i.paid_leave, i.gross, i.deductions + i.lop_amount, i.net])}
          tableHead={["Staff", "Days paid", "Gross", "Deductions", "Net"]} empty={c.loading ? "Loading…" : "No staff have a salary set. Assign structures first."}
          rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.emp_code}</span></span>, i.present + i.paid_leave, inr(i.gross), inr(i.deductions + i.lop_amount), inr(i.net)])} />
      </div>
    );
  }
  const all = r.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const n = (s: string) => all.filter((x) => x.status === s).length;
  return (
    <div className="space-y-5" data-report>{err}{okBox(msg)}
      <Tiles items={[{ label: "Payroll runs", value: all.length, sub: "All records" }, { label: "Calculated", value: n("Calculated"), sub: `${pct(n("Calculated"), all.length)} of shown` }, { label: "Draft", value: n("Draft"), sub: `${pct(n("Draft"), all.length)} of shown` }]} />
      <ListPanel title="Payroll runs" noun="runs" search={search} onSearch={setSearch} exportName="payroll-runs" head={["Month", "Staff", "Gross", "Deductions", "Net pay", "Status"]} exportRows={rows.map((x) => [label(x.month), x.staff, x.gross, x.deductions, x.net, x.status])}
        tableHead={["Month", "Staff", "Gross", "Deductions", "Net pay", "Status", ""]} empty={r.loading ? "Loading…" : "No runs yet."}
        rows={rows.map((x) => [label(x.month), x.staff || "—", x.gross ? lk(x.gross) : "—", x.deductions ? lk(x.deductions) : "—", x.net ? lk(x.net) : "—", <Chip key="s" tone={x.status === "Draft" ? "mute" : "good"}>{x.status}</Chip>, <span key="b" className="flex gap-1.5">{["Draft", "Calculated"].includes(x.status) && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void calc(x.month)}>{x.status === "Draft" ? "Calculate" : "Recalculate"}</button>}{x.id && <button type="button" className={small} onClick={() => setView({ id: x.id, month: x.month })}>View details</button>}</span>])} />
      <Modal open={!!view} title={view ? label(view.month) : ""} onClose={() => setView(null)}>{view && <><div className="max-h-80 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Deductions</th><th className="px-3 py-2">Net</th></tr></thead><tbody>{det.data?.items.map((i) => <tr key={i.staff_id} className="border-t border-slate-100"><td className="px-3 py-2">{i.name}<span className="block text-[11px] text-slate-500">{i.emp_code} · LOP {i.lop}</span></td><td className="px-3 py-2">{inr(i.gross)}</td><td className="px-3 py-2">{inr(i.deductions)}</td><td className="px-3 py-2 font-semibold">{inr(i.net)}</td></tr>)}</tbody></table></div><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}
void Loading;
