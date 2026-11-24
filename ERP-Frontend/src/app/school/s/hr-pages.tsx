"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, okBox } from "./fee-pages";

interface S { id: string; emp_code: string; name: string; email: string; department: string; designation: string; role: string; type: "Teaching" | "Non-teaching"; mobile: string; joined_on: string | null; status: string }
export const STEPS = ["Create employee profile", "Assign department, designation and salary", "Record daily attendance", "Process employee leave", "Calculate salary and deductions", "HR verifies payroll", "Finance officer approves", "Generate payslips and payments"];

export function StaffDirectoryPages({ tab }: { tab: "all-staff" | "teaching-staff" | "non-teaching-staff" }) {
  const d = useLoad(() => schoolFetch<{ month: string; steps: boolean[]; items: S[] }>("/school/hr/directory"), []);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [dept, setDept] = useState("");
  const lists = useLoad(() => schoolFetch<{ departments: string[]; designations: string[] }>("/school/hr/registration"), []);
  const [view, setView] = useState<S | null>(null); const [edit, setEdit] = useState<{ id: string; department: string; designation: string; staff_type: string; mobile: string; joined_on: string } | null>(null);
  const [msg, setMsg] = useState("");
  const x = d.data;
  const scope = (x?.items ?? []).filter((s) => (tab === "all-staff" ? true : tab === "teaching-staff" ? s.type === "Teaching" : s.type === "Non-teaching"));
  const depts = [...new Set(scope.map((s) => s.department).filter(Boolean))].sort();
  const rows = scope.filter((s) => (!dept || s.department === dept) && has(s, search));
  const title = { "all-staff": "All staff", "teaching-staff": "Teaching staff", "non-teaching-staff": "Non-teaching staff" }[tab];
  const save = async (e: FormEvent) => { e.preventDefault(); if (edit && await act.run(() => schoolFetch(`/school/hr/staff/${edit.id}`, json("PATCH", { department: edit.department, designation: edit.designation, staff_type: edit.staff_type, mobile: edit.mobile, joined_on: edit.joined_on || null })))) { setEdit(null); setMsg("Saved."); } };
  const open = (s: S) => setEdit({ id: s.id, department: s.department, designation: s.designation, staff_type: s.type, mobile: s.mobile, joined_on: s.joined_on ?? "" });
  return (
    <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{okBox(msg)}
      <ListPanel title={title} noun="staff" search={search} onSearch={setSearch} exportName={tab} head={["Employee", "Name", "Department", "Designation", "Type", "Mobile", "Joined", "Status"]} exportRows={rows.map((s) => [s.emp_code, s.name, s.department, s.designation, s.type, s.mobile, day(s.joined_on), s.status])}
        extra={<select aria-label="Department" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All departments</option>{depts.map((n) => <option key={n}>{n}</option>)}</select>}
        tableHead={["Name", "Department", "Designation", "Type", "Mobile", "Joined", "Status", ""]} empty={d.loading ? "Loading…" : "No staff yet."}
        rows={rows.map((s) => [<span key="n"><b className="font-semibold text-slate-900">{s.name}</b><span className="block text-[11px] text-slate-500">{s.emp_code}</span></span>, s.department || "—", s.designation ? <span key="d" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{s.designation}</span> : "—", s.type, s.mobile || "—", day(s.joined_on), <Chip key="s" tone={s.status === "Active" ? "good" : "warn"}>{s.status}</Chip>,
          <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => open(s)}>Profile</button><button type="button" className={small} onClick={() => setView(s)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.name} · ${view.emp_code}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Department" v={view.department || "—"} /><Row k="Designation" v={view.designation || "—"} /><Row k="Login role" v={view.role} /><Row k="Type" v={view.type} /><Row k="Email" v={view.email} /><Row k="Mobile" v={view.mobile || "—"} /><Row k="Joined" v={day(view.joined_on)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={!!edit} title="Staff profile" onClose={() => setEdit(null)}>{edit && <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><Field label="Department"><select className={inputCls} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })}><option value="">Choose a department</option>{[...new Set([...(lists.data?.departments ?? []), edit.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}</select></Field><Field label="Designation"><select className={inputCls} value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })}><option value="">Choose a designation</option>{[...new Set([...(lists.data?.designations ?? []), edit.designation].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}</select></Field></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Type"><select className={inputCls} value={edit.staff_type} onChange={(e) => setEdit({ ...edit, staff_type: e.target.value })}><option>Teaching</option><option>Non-teaching</option></select></Field><Field label="Mobile"><input className={inputCls} maxLength={30} value={edit.mobile} onChange={(e) => setEdit({ ...edit, mobile: e.target.value })} /></Field><Field label="Joined"><input type="date" className={inputCls} value={edit.joined_on} onChange={(e) => setEdit({ ...edit, joined_on: e.target.value })} /></Field></div>
        <FormFoot close={() => setEdit(null)} busy={act.busy} /></form>}</Modal>
    </div>
  );
}

/** The HR and payroll workflow strip shown above every HR page. */
export function HrFlow() {
  const d = useLoad(() => schoolFetch<{ month: string; steps: boolean[]; payroll?: string }>("/school/hr/flow"), []);
  const x = d.data; const done = x?.steps.filter(Boolean).length ?? 0; const next = x?.steps.findIndex((v) => !v) ?? 0;
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">HR and payroll workflow</h2><span className="text-xs text-slate-500">{x?.month} · {done} of 8 done · payroll: {x?.payroll ?? "Draft"}</span></div>
      <div className="flex flex-wrap gap-2.5 p-4">{STEPS.map((t, i) => <div key={t} className={`flex min-w-[10rem] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] ${i === next ? "border-[#026f9b] bg-white shadow-[0_0_0_1px_#026f9b]" : x?.steps[i] ? "border-[#bfe3d5] bg-[#eef8f3]" : "border-slate-200"}`}><span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${x?.steps[i] ? "bg-[#0b6b4f] text-white" : i === next ? "bg-[#026f9b] text-white" : "bg-[#dceff9] text-[#026f9b]"}`}>{x?.steps[i] ? "✓" : i + 1}</span><span>{t}{i === next && <span className="block text-[10px] text-slate-500">Next step</span>}</span></div>)}</div></div>
  );
}
