"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading, day, rupees } from "../../teacher/t/dash-pages";
import { useHr } from "../context";

interface Queue {
  documents: { id: string; staff: string; title: string | null; doc_type: string; file_name: string; uploaded_on: string }[];
  qualifications: { id: string; staff: string; title: string; institution: string; year: number; result: string | null; certificate_name: string | null }[];
}
const verifyBtn = "rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-60";

/** What staff added in their own portals and HR has to check. */
export function Verification({ kind }: { kind: "qualification" | "document" }) {
  const { refreshBadges } = useHr();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Queue>("/hr/verification"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const verify = (id: string) => void act.run(() => schoolFetch(`/hr/verification/${kind}/${id}`, json("POST", {})));
  const btn = (id: string) => <button key="v" type="button" className={verifyBtn} disabled={act.busy} onClick={() => verify(id)}>Verify</button>;
  const q = data?.qualifications ?? []; const d = data?.documents ?? [];
  return (
    <div data-report>
      <Head title={kind === "qualification" ? "Qualifications" : "Documents"} subtitle={kind === "qualification" ? "Qualifications staff added that are waiting for HR to verify." : "Documents staff uploaded that are waiting for HR to verify."} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (kind === "qualification" ? (
        <Panel title="Waiting to be verified" sub={`${q.length} ${q.length === 1 ? "qualification" : "qualifications"}`} right={<ExportPrint name="qualifications-to-verify" head={["Staff", "Qualification", "Institution", "Year", "Result", "Certificate"]} rows={q.map((x) => [x.staff, x.title, x.institution, x.year, x.result, x.certificate_name])} />}>
          <SimpleTable head={[{ h: "Staff" }, { h: "Qualification" }, { h: "Institution" }, { h: "Year" }, { h: "Result" }, { h: "Certificate" }, { h: "" }]} empty="Nothing is waiting." rows={q.map((x) => [<b key="s" className="font-semibold text-slate-900">{x.staff}</b>, x.title, x.institution, x.year, x.result ?? "—", x.certificate_name ?? "—", btn(x.id)])} />
        </Panel>
      ) : (
        <Panel title="Waiting to be verified" sub={`${d.length} ${d.length === 1 ? "document" : "documents"}`} right={<ExportPrint name="documents-to-verify" head={["Staff", "Document", "Type", "File", "Uploaded"]} rows={d.map((x) => [x.staff, x.title ?? x.file_name, x.doc_type, x.file_name, day(x.uploaded_on)])} />}>
          <SimpleTable head={[{ h: "Staff" }, { h: "Document" }, { h: "Type" }, { h: "File" }, { h: "Uploaded" }, { h: "" }]} empty="Nothing is waiting." rows={d.map((x) => [<b key="s" className="font-semibold text-slate-900">{x.staff}</b>, x.title ?? x.file_name, x.doc_type, x.file_name, day(x.uploaded_on), btn(x.id)])} />
        </Panel>
      ))}
    </div>
  );
}

interface Claim { id: string; code: string; staff: string; dept: string; ctype: string; description: string; claim_on: string; amount: number; receipts: number; status: string; approver: string; paid_on: string | null }
/** Claims staff raised in their own portals. The approvers (accounts, Principal) decide them; HR follows them here. */
export function ClaimRegister() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Claim[]; waiting: number; to_pay: number; to_pay_amount: number; paid_month: number }>("/hr/claim-register"), []);
  const [q, setQ] = useState("");
  const rows = (data?.items ?? []).filter((c) => !q || `${c.code} ${c.staff} ${c.ctype} ${c.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-report>
      <Head title="Claims" subtitle="Claims staff sent from their portals, who approves each one and whether it is paid." />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Waiting for approval", value: data.waiting }, { label: "Approved, to pay", value: data.to_pay, sub: rupees(data.to_pay_amount) }, { label: "Paid this month", value: rupees(data.paid_month) }]} />
          <Panel title="Staff claims" sub={`${rows.length} ${rows.length === 1 ? "claim" : "claims"}`} right={<ExportPrint name="staff-claims" head={["Ref.", "Staff", "Department", "Type", "For", "Date", "Amount", "Approver", "Status"]} rows={rows.map((c) => [c.code, c.staff, c.dept, c.ctype, c.description, day(c.claim_on), c.amount, c.approver, c.status])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff claims" aria-label="Search staff claims" className="w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-[#41afda]" /></div>
            <SimpleTable head={[{ h: "Ref." }, { h: "Staff" }, { h: "Type" }, { h: "Date" }, { h: "Amount", right: true }, { h: "Approver" }, { h: "Status" }]} empty="No claims yet." rows={rows.map((c) => [c.code, <span key="s"><b className="font-semibold text-slate-900">{c.staff}</b><span className="block text-[11px] text-slate-500">{c.dept}</span></span>, <span key="t">{c.ctype}<span className="block text-[11px] text-slate-500">{c.description}</span></span>, day(c.claim_on), <span key="a" className="block text-right">{rupees(c.amount)}</span>, c.approver || "—", <Chip key="c" tone={c.status === "Paid" || c.status === "Approved" ? "good" : c.status === "Rejected" ? "bad" : "warn"}>{c.status}</Chip>])} />
          </Panel>
        </div>
      )}
    </div>
  );
}
