"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field } from "../../school/s/fo-pages";
import { Loading, rupees } from "../../teacher/t/dash-pages";
import { Head } from "../../teacher/t/head";
import { Table, name, pill } from "./ui";

interface Person { id: string; name: string; designation: string; emp_code: string; department: string; status: string }
interface Assignment {
  staff_id: string; name: string; department: string; designation: string; structure: string; gross: number; effective_from: string | null; bank: string;
  earnings: [string, number][]; deductions: [string, number][]; total_deductions: number; net: number;
}
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

interface Structure { id: string; name: string; designation: string; department: string; structure: string; basic: number; allowances: number; gross: number; pf: number; esi: number; pt: number; other: number; deductions: number; net: number }

/** Every employee's monthly structure; Change opens Assign Structure for that person. */
export function EmployeeWise({ title = "Employee-wise" }: { title?: string } = {}) {
  const router = useRouter();
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Structure[] }>("/school/pay/structures"), []);
  const [view, setView] = useState<Structure | null>(null);
  const rows = data?.items ?? [];
  return (
    <div data-report>
      <Head title={title} subtitle="Monthly salary structure for each employee." />
      <ErrorBanner message={error} />
      <Table title="Employee-wise structure" noun="staff" exportName="employee-wise-structure" empty={loading ? "Loading…" : "No staff yet."}
        head={[{ h: "Staff" }, { h: "Department" }, { h: "Basic" }, { h: "Allowances" }, { h: "Gross" }, { h: "Deductions" }, { h: "Net" }, { h: "" }]}
        rows={rows.map((s) => ({ key: s.id, find: `${s.name} ${s.designation} ${s.department}`, out: [s.name, s.department, s.basic, s.allowances, s.gross, s.deductions, s.net], cells: [name(s.name, s.designation), s.department || "—", rupees(s.basic), rupees(s.allowances), rupees(s.gross), rupees(s.deductions), rupees(s.net),
          <span key="a" className="flex gap-1.5"><button type="button" className={pill} onClick={() => router.push(`/hr/organisation/salary-structure?tab=assign-structure&staff=${s.id}`)}>Change</button><button type="button" className={pill} onClick={() => setView(s)}>View details</button></span>] }))} />
      {view && <Modal open title={view.name} onClose={() => setView(null)}><dl className="divide-y divide-slate-100 text-[13px]">{([["Department", view.department || "—"], ["Designation", view.designation || "—"], ["Salary structure", view.structure || "—"], ["Basic", rupees(view.basic)], ["Allowances", rupees(view.allowances)], ["Gross", rupees(view.gross)], ["Provident fund", rupees(view.pf)], ["ESI", rupees(view.esi)], ["Professional tax", rupees(view.pt)], ["TDS / other", rupees(view.other)], ["Net", rupees(view.net)]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl></Modal>}
    </div>
  );
}

/** Step 2 of the workflow: one employee's department, designation and salary, with what it pays. */
export function AssignStructure() {
  const dir = useLoad(() => schoolFetch<{ items: Person[] }>("/school/hr/directory"), []);
  const lists = useLoad(() => schoolFetch<{ departments: string[]; designations: string[] }>("/school/hr/registration"), []);
  const levels = useLoad(() => schoolFetch<{ items: { name: string; level: string; status: string }[] }>("/school/hr/designations"), []);
  const [pick, setPick] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("staff") ?? ""));
  const person = dir.data?.items.find((p) => p.id === pick) ?? dir.data?.items[0];
  const id = person?.id ?? "";
  const a = useLoad(() => (id ? schoolFetch<Assignment>(`/school/pay/assignment/${id}`) : Promise.resolve(null)), [id]);
  const x = a.data && a.data.staff_id === id ? a.data : null;
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction(() => { a.reload(); dir.reload(); });
  const v = (k: "department" | "designation" | "structure" | "gross" | "from") => edit[k] ?? (x ? { department: x.department, designation: x.designation, structure: x.structure, gross: x.gross ? String(x.gross) : "", from: todayIso() }[k] : "");
  const set = (k: string, value: string) => { setEdit({ ...edit, [k]: value }); setSaved(false); };
  const structures = [...new Set([...(levels.data?.items.filter((d) => d.status === "Active").map((d) => `${d.name} · ${d.level}`.slice(0, 40)) ?? []), x?.structure ?? ""].filter(Boolean))];
  const options = (list: string[] | undefined, current: string) => [...new Set([...(list ?? []), current].filter(Boolean))].map((o) => <option key={o}>{o}</option>);
  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaved(false);
    if (await act.run(() => schoolFetch("/school/pay/assign-employee", json("PUT", { staff_id: id, department: v("department"), designation: v("designation"), structure: v("structure") || undefined, gross: Number(v("gross")), effective_from: v("from") })))) { setEdit({}); setSaved(true); }
  };
  return (
    <div data-report>
      <ErrorBanner message={dir.error || a.error || lists.error || act.error} />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Employee<select aria-label="Employee" value={id} onChange={(e) => { setPick(e.target.value); setEdit({}); setSaved(false); }} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!dir.data?.items.length && <option value="">No staff</option>}{dir.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}{s.designation ? ` · ${s.designation}` : ""}</option>)}</select></label>
        {person && <><Chip tone={person.status === "Active" ? "good" : "warn"}>{person.status}</Chip><span className="ml-auto text-[12px] text-slate-500">{person.emp_code} · {person.department || "No department"}</span></>}
      </div>
      <Loading on={(dir.loading || a.loading) && !x} />
      {!dir.loading && !dir.data?.items.length && <p className="py-10 text-center text-sm text-slate-400">No staff yet.</p>}
      {x && (
        <div className="grid items-stretch gap-5 lg:grid-cols-[1.6fr_1fr]">
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Assignment · {x.name}</h2></div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Field label="Department"><select className={inputCls} value={v("department")} onChange={(e) => set("department", e.target.value)}><option value="">Choose a department</option>{options(lists.data?.departments, v("department"))}</select></Field>
              <Field label="Designation"><select className={inputCls} value={v("designation")} onChange={(e) => set("designation", e.target.value)}><option value="">Choose a designation</option>{options(lists.data?.designations, v("designation"))}</select></Field>
              <Field label="Salary structure"><select className={inputCls} value={v("structure")} onChange={(e) => set("structure", e.target.value)}><option value="">Same as designation</option>{structures.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Monthly gross (₹)"><input type="number" min={1} required className={inputCls} value={v("gross")} onChange={(e) => set("gross", e.target.value)} /></Field>
              <Field label="Effective from"><input type="date" required className={inputCls} value={v("from")} onChange={(e) => set("from", e.target.value)} /></Field>
              <Field label="Bank account"><input className={inputCls} readOnly title="Changed under Payslips & Payments › Bank and Statutory Files" value={x.bank || "Not recorded"} /></Field>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
              {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
              <button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit({}); setSaved(false); }}>Discard</button>
              <button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save assignment"}</button>
            </div>
          </form>
          <Panel title="Salary breakdown" sub="Per month, current">
            {x.gross ? (
              <dl className="px-5 py-4 text-[13px]">
                {([...x.earnings.map(([k, n]) => [k, rupees(n), false]), ["Gross", rupees(x.gross), true], ...x.deductions.map(([k, n]) => [k === "TDS / other" ? "TDS" : k, `− ${rupees(n)}`, false]), ["Net pay", rupees(x.net), true]] as [string, string, boolean][]).map(([k, n, strong]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 py-1"><dt className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{k}</dt><dd className={strong ? "font-semibold text-slate-900" : "text-slate-900"}>{n}</dd></div>
                ))}
              </dl>
            ) : <p className="px-5 py-8 text-center text-sm text-slate-400">No salary set yet. Enter the monthly gross and save.</p>}
          </Panel>
        </div>
      )}
    </div>
  );
}
