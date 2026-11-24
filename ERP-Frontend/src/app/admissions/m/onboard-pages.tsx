"use client";

import Link from "next/link";
import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnPrimary, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useAdmissions } from "../context";
import { sectionHref } from "./menu-config";
import { PipelineStrip } from "./strip";
import { ChildCell, DataTable, ParentCell, blueBtn, has, pillBtn } from "./ui";

const inr = (n: number | null) => (n === null ? "—" : `₹${n.toLocaleString("en-IN")}`);
const Mark = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => <Chip tone={ok ? "good" : "warn"}>{ok ? yes : no}</Chip>;

// ═════════════ fee assignment: the annual fee plan ═════════════
interface Plan { application_id: string; code: string; child: string; class_sought: string; admission_no: string | null; assigned: boolean; has_group: boolean; annual: number | null }

export function FeePlans() {
  const r = useLoad(() => schoolFetch<{ items: Plan[] }>("/admissions/fee-plans"), []);
  const [search, setSearch] = useState("");
  const act = useAction(() => r.reload());
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  return (
    <div>
      <Head title="Annual Fee Plan" subtitle="The annual fee plan of each child who has a class. It comes from the school's fee structure for the class; concessions are decided by the accounts team." />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Annual fee plans" noun="children" search={search} onSearch={setSearch} exportName="annual-fee-plans" exportHead={["Child", "Class", "Admission no.", "Annual fee", "Plan"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.admission_no, x.annual, x.assigned ? "Assigned" : "Not assigned"])}
        head={["Child", "Admission no.", "Annual fee", "Plan", ""]} empty={r.loading ? "Loading…" : "No child has a class yet. Finish Class Allocation first."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.admission_no ?? "—", inr(x.annual), <Mark key="p" ok={x.assigned} yes="Assigned" no="Not assigned" />,
          x.assigned ? "" : <button key="a" type="button" className={blueBtn} disabled={act.busy || !x.has_group} title={x.has_group ? "" : "The school has no fee group for this class yet"} onClick={() => void act.run(() => schoolFetch(`/admissions/fee-plans/${x.application_id}`, json("POST", {})))}>Assign fee plan</button>])} />
    </div>
  );
}

// ═════════════ portal accounts ═════════════
interface Acc { application_id: string; code: string; child: string; class_sought: string; admission_no: string | null; parent_name: string; mobile: string | null; student_login: boolean; parent_login: boolean; confirmed: boolean }
interface Made { created: { who: string; name: string; login_id: string; temporary_password: string }[]; problems: string[] }

export function PortalAccounts({ tab }: { tab: "to-create" | "created" }) {
  const todo = tab === "to-create";
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: Acc[] }>("/admissions/portal-accounts"), []);
  const [search, setSearch] = useState("");
  const [made, setMade] = useState<{ child: string; r: Made } | null>(null);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => (todo ? !(x.student_login && x.parent_login) : x.student_login && x.parent_login) && has(x, search));
  const create = async (x: Acc) => { let out: Made | null = null; if (await act.run(async () => { out = await schoolFetch<Made>(`/admissions/portal-accounts/${x.application_id}`, json("POST", {})); })) setMade({ child: x.child, r: out as unknown as Made }); };
  return (
    <div>
      <><Head title="Generate Accounts" subtitle="Create Student portal and Parent portal logins. Usernames are generated; the temporary passwords are shown once, to hand to the family." /><PipelineStrip active={10} /></>
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Accounts to generate" noun="children" search={search} onSearch={setSearch} exportName={todo ? "signins-to-create" : "signins-created"} exportHead={["Child", "Class", "Admission no.", "Parent", "Mobile", "Student sign-in", "Parent sign-in"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.admission_no, x.parent_name, x.mobile, x.student_login ? "Created" : "Not yet", x.parent_login ? "Created" : "Not yet"])}
        head={["Child", "Admission no.", "Parent", "Student sign-in", "Parent sign-in", ""]} empty={r.loading ? "Loading…" : todo ? "Nothing to create. Every child with a class has sign-ins." : "No sign-ins created yet."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.admission_no ?? "—", <ParentCell key="p" name={x.parent_name} mobile={x.mobile} />, <Mark key="s" ok={x.student_login} yes="Created" no="Not yet" />, <Mark key="g" ok={x.parent_login} yes="Created" no="Not yet" />,
          todo ? <button key="a" type="button" className={blueBtn} disabled={act.busy} onClick={() => void create(x)}>Generate</button> : ""])} />
      <Modal open={!!made} title={made ? `Sign-ins for ${made.child}` : ""} onClose={() => setMade(null)}>{made && <>
        {made.r.problems.length > 0 && <div className="mb-3"><ErrorBanner message={made.r.problems.join(" ")} /></div>}
        {made.r.created.length ? <>
          <p className="mb-3 text-[13px] text-slate-700">Give these to the family now. The passwords are not shown again, and each person must change theirs at the first sign-in.</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{made.r.created.map((c) => <li key={c.who} className="px-4 py-3 text-[13px]"><p className="font-semibold text-slate-900">{c.who} · {c.name}</p><p className="text-slate-700">Sign-in ID: <b>{c.login_id}</b></p><p className="text-slate-700">Temporary password: <b className="font-mono">{c.temporary_password}</b></p></li>)}</ul>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><ExportPrint name={`signins-${made.child.replace(/\s+/g, "-").toLowerCase()}`} head={["Who", "Name", "Sign-in ID", "Temporary password"]} rows={made.r.created.map((c) => [c.who, c.name, c.login_id, c.temporary_password])} /><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setMade(null)}>Done</button></div>
        </> : <div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setMade(null)}>Close</button></div>}
      </>}</Modal>
    </div>
  );
}

// ═════════════ confirmation ═════════════
interface Conf { application_id: string; code: string; child: string; class_sought: string; admission_no: string | null; accounts: boolean; fee_plan: boolean; confirmed: boolean }

export function Confirmation({ tab }: { tab: "to-confirm" | "admitted" }) {
  const todo = tab === "to-confirm";
  const a = useAdmissions();
  const r = useLoad(() => schoolFetch<{ items: Conf[] }>("/admissions/confirmations"), []);
  const [search, setSearch] = useState("");
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const rows = (r.data?.items ?? []).filter((x) => (todo ? !x.confirmed : x.confirmed) && has(x, search));
  return (
    <div>
      <><Head title="Send Confirmation" subtitle="Send the admission confirmation and the welcome message. This completes the admission. It needs the sign-ins and the fee plan." /><PipelineStrip active={11} /></>
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Ready to confirm" noun="children" search={search} onSearch={setSearch} exportName={todo ? "to-confirm" : "admitted"} exportHead={["Child", "Class", "Admission no.", "Sign-ins", "Fee plan"]}
        exportRows={rows.map((x) => [x.child, x.class_sought, x.admission_no, x.accounts ? "Created" : "Not yet", x.fee_plan ? "Assigned" : "Not assigned"])}
        head={["Child", "Admission no.", "Sign-ins", "Fee plan", ""]} empty={r.loading ? "Loading…" : todo ? "Nothing waiting. Allocate a class first." : "Nobody is admitted yet."}
        rows={rows.map((x) => [<ChildCell key="c" name={x.child} sub={`${x.class_sought} · ${x.code}`} />, x.admission_no ?? "—", <Mark key="s" ok={x.accounts} yes="Created" no="Not yet" />, <Mark key="f" ok={x.fee_plan} yes="Assigned" no="Not assigned" />,
          todo ? <span key="a" className="flex gap-1.5">{x.accounts && x.fee_plan ? <button type="button" className={blueBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/admissions/confirmations/${x.application_id}`, json("POST", {})))}>Send and confirm</button> : <Link className={pillBtn} href={!x.accounts ? sectionHref("portal-accounts", "portal-accounts") : `${sectionHref("fee-assignment", "fee-assignment")}?tab=fee-plans`}>{!x.accounts ? "Create sign-ins" : "Assign fee plan"}</Link>}</span> : ""])} />
    </div>
  );
}
