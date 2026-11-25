"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "../../teacher/t/head";
import { Loading, day } from "../../teacher/t/dash-pages";
import { Tile, Tiles, name, pill } from "../../hr/h/ui";
import { Bar, Done, Filtered, L, PillSelect } from "./ui";

interface Term { amount: number; paid: number; billed: boolean; state: string }
interface Fees {
  year: string; per_term: number; term_count: number; billed_terms: number[]; riders: number; billed: number; collected: number; pending: number; pending_students: number; accountant: string;
  routes: { id: string; name: string; area: string; riders: number; per_term: number; billed: number; collected: number; pending: number }[];
  students: { id: string; name: string; class_label: string; route_id: string; route: string; stop: string; terms: Term[]; billed: number; pending: number; reminded_on: string | null }[];
}
const useFees = () => useLoad(() => schoolFetch<Fees>("/transport/fees"), []);
const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const terms = (list: number[]) => (!list.length ? "No term due yet" : list.length === 1 ? `Term ${list[0]}` : `Terms ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

function RouteWise({ go }: { go: (tab: string, extra?: Record<string, string>) => void }) {
  const { data: x, error, loading } = useFees();
  const [ask, setAsk] = useState(false); const [change, setChange] = useState(""); const [done, setDone] = useState("");
  const act = useAction(() => undefined);
  const send = async (e: FormEvent) => { e.preventDefault(); let text = ""; if (await act.run(async () => { const r = await schoolFetch<{ code: string; told: number }>("/transport/fees/ask", json("POST", { change })); text = `Request ${r.code} sent to Fee & Finance.${r.told ? "" : " No accountant login was found, so ask the School Admin too."}`; })) { setAsk(false); setChange(""); setDone(text); } };
  return (
    <div data-report>
      <Head title="Route-wise Fees" subtitle={x ? `${x.per_term ? `Transport fee is ${rs(x.per_term)} a term for every stop.` : "No transport fee is set yet."} Fees are billed and collected in Fee & Finance; this page shows where each route stands.` : "Where each route stands."} />
      <ErrorBanner message={error} />
      <Done text={done} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Tiles>
          <Tile label="Riders" value={x.riders} sub="Students with a route" />
          <Tile label="Billed so far" value={rs(x.billed)} sub={terms(x.billed_terms)} />
          <Tile tone="green" label="Collected" value={rs(x.collected)} sub={`${x.billed ? Math.round((x.collected / x.billed) * 100) : 0}% of billed`} />
          <Tile tone="amber" label="Pending" value={rs(x.pending)} sub={`${x.pending_students} student${x.pending_students === 1 ? "" : "s"}`} />
        </Tiles>
        <Filtered title={`Route-wise transport fees · ${x.year}`} noun="routes" exportName="route-wise-transport-fees" empty="No routes yet." head={["Route", "Riders", "Fee a term", "Billed", "Collected", "Pending", ""]}
          rows={x.routes.map((r) => ({ key: r.id, find: `${r.name} ${r.area}`, out: [`${r.name} ${r.area}`, r.riders, r.per_term, r.billed, r.collected, r.pending], cells: [
            name(r.name, r.area || undefined), r.riders, r.per_term ? rs(r.per_term) : "—", rs(r.billed), rs(r.collected), r.pending ? <b key="p" className="font-semibold text-[#ac2c28]">{rs(r.pending)}</b> : "—",
            <button key="s" type="button" className={pill} onClick={() => go("student-fees", { route: r.name })}>Students</button>,
          ] }))} />
        <Panel title="Fee rule">
          <dl className="space-y-1.5 px-4 py-4 text-[12.5px]">
            {([["Transport fee", x.per_term ? <><b>{rs(x.per_term)}</b> a term, the same for every stop</> : "Not set"], ["Set in", `Fee & Finance › Fee Structure › Optional Fees${x.accountant ? ` · ${x.accountant}, Accountant` : ""}`], ["Joining mid-term", "Every term of the year is charged, whenever the child joins"]] as const).map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>)}
          </dl>
          <div className="flex justify-end border-t border-slate-100 px-4 py-3"><button type="button" className={pill} onClick={() => { setDone(""); setAsk(true); }}>Ask Fee &amp; Finance to change it</button></div>
        </Panel>
      </div>}
      <Modal open={ask} title="Ask Fee & Finance to change the transport fee" onClose={() => setAsk(false)}>
        <form onSubmit={send} className="space-y-3">
          <ErrorBanner message={act.error} />
          <L label="What should change, and why?"><textarea className={`${inputCls} min-h-[5.5rem]`} required minLength={3} maxLength={400} value={change} onChange={(e) => setChange(e.target.value)} /></L>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setAsk(false)}>Close</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Send request</button></div>
        </form>
      </Modal>
    </div>
  );
}

const termTone = (s: string) => (s === "Paid" ? "good" : s === "Overdue" ? "bad" : s === "Part paid" || s === "Due" ? "warn" : "info") as "good" | "bad" | "warn" | "info";
function StudentFees({ route }: { route?: string }) {
  const { data: x, error, loading, reload } = useFees();
  const act = useAction(reload);
  const [pick, setPick] = useState(route ?? ""); const [show, setShow] = useState("all"); const [done, setDone] = useState("");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const rows = (x?.students ?? []).filter((s) => (!pick || s.route === pick) && (show === "all" || (show === "pending" ? s.pending > 0 : show === "overdue" ? s.terms.some((t) => t.state === "Overdue") : s.pending === 0)));
  const due = rows.filter((s) => s.pending > 0 && s.reminded_on !== today);
  const remind = async (ids: string[]) => {
    setDone(""); let text = "";
    if (await act.run(async () => { const r = await schoolFetch<{ reminded: number; already: number; no_parent: number }>("/transport/fees/remind", json("POST", { student_ids: ids })); text = `${r.reminded} parent${r.reminded === 1 ? "" : "s"} reminded in the parent app.${r.already ? ` ${r.already} already reminded today.` : ""}${r.no_parent ? ` ${r.no_parent} have no parent on record.` : ""}`; })) setDone(text);
  };
  const count = x?.term_count ?? 0;
  return (
    <div data-report>
      <Head title="Student Fees" subtitle="Each rider's transport fee by term. Paid status comes from Fee & Finance receipts." action={<button type="button" className={redBtn} disabled={act.busy || !due.length} onClick={() => void remind(due.map((s) => s.id))}>Remind all pending</button>} />
      <ErrorBanner message={error || act.error} />
      <Done text={done} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Bar>
          <PillSelect label="Route" value={pick} onChange={setPick}><option value="">All routes</option>{x.routes.map((r) => <option key={r.id}>{r.name}</option>)}</PillSelect>
          <PillSelect label="Show" value={show} onChange={setShow}><option value="all">Everyone</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="clear">Nothing pending</option></PillSelect>
        </Bar>
        <Filtered title="Student transport fees" noun="students" exportName="student-transport-fees" empty="No students to show." head={["Student", "Route and stop", ...Array.from({ length: count }, (_, i) => `Term ${i + 1}`), "Pending", "Reminder", ""]}
          rows={rows.map((s) => ({ key: s.id, find: `${s.name} ${s.class_label} ${s.route} ${s.stop}`, out: [`${s.name} (${s.class_label})`, `${s.route} ${s.stop}`, ...s.terms.map((t) => t.state), s.pending, s.reminded_on ? day(s.reminded_on) : ""], cells: [
            name(s.name, s.class_label), name(s.route, s.stop || undefined),
            ...s.terms.map((t, i) => (t.state ? <Chip key={i} tone={termTone(t.state)}>{t.state}</Chip> : "—")),
            s.pending ? <b key="p" className="font-semibold text-slate-900">{rs(s.pending)}</b> : "—", s.reminded_on ? `Sent ${day(s.reminded_on)}` : "—",
            s.pending ? <button key="r" type="button" className={pill} disabled={act.busy || s.reminded_on === today} onClick={() => void remind([s.id])}>Remind parent</button> : null,
          ] }))} />
      </div>}
    </div>
  );
}

export function FeePage({ tab, go, route }: { tab: "route-wise" | "student-fees"; go: (tab: string, extra?: Record<string, string>) => void; route?: string }) {
  return tab === "route-wise" ? <RouteWise go={go} /> : <StudentFees key={route ?? ""} route={route} />;
}
