"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Empty, Loading, day } from "../../teacher/t/dash-pages";
import { name, pill, solid } from "../../hr/h/ui";
import { useTransport } from "../context";
import { StepStrip } from "./strip";
import { docTone } from "./vehicle-pages";
import { Bar, Filtered, L, PillSelect } from "./ui";
import { Foot } from "../../school/s/fee-pages";

// ═════════════ step 5: students to stops ═════════════
interface Student { id: string; name: string; class_label: string; admission_no: string; route_id: string; route: string; stop_id: string; stop: string; pickup: string; drop: string }
interface Option { route_id: string; route: string; stop_id: string; stop: string; seats_left: number | null }
interface Board { students: Student[]; options: Option[] }
const key = (route: string, stop: string) => (route ? `${route}|${stop}` : "");
const optionLabel = (o: Option) => `${o.route} · ${o.stop} · ${o.seats_left === null ? "no vehicle yet" : `${o.seats_left} seats left`}`;
const klass = (s: { class_label: string; admission_no: string }) => [s.class_label, s.admission_no].filter(Boolean).join(" · ");

function AssignStudents({ find, student }: { find?: string; student?: string }) {
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Board>("/transport/students"), []);
  const act = useAction(reload);
  const [show, setShow] = useState("all");
  const [pick, setPick] = useState<string | null>(student ?? null);
  const [value, setValue] = useState<string | null>(null);
  const who = x?.students.find((s) => s.id === pick);
  const close = () => { setPick(null); setValue(null); };
  const open = (s: Student) => { setPick(s.id); setValue(null); };
  const chosen = value ?? (who ? key(who.route_id, who.stop_id) : "");
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!who) return;
    const [route_id, stop_id] = chosen.split("|");
    if (await act.run(() => schoolFetch(`/transport/students/${who.id}/allocation`, json("PUT", { route_id: route_id || null, stop_id: stop_id || null })))) close();
  };
  const routes = [...new Map((x?.options ?? []).map((o) => [o.route_id, o.route])).entries()];
  const rows = (x?.students ?? []).filter((s) => (show === "all" ? true : show === "on" ? !!s.route : show === "off" ? !s.route : s.route_id === show));
  return (
    <div data-report>
      <Head title="Assign Students" subtitle="Give each child a route and the stop where they board. Seats left are checked against the vehicle on that route." />
      <StepStrip active="allocation" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Bar><PillSelect label="Show" value={show} onChange={setShow}><option value="all">All students</option><option value="on">On transport</option><option value="off">Not on transport</option>{routes.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</PillSelect></Bar>
        <Filtered title="Students" noun="students" initial={find ?? ""} exportName="transport-students" empty="No students." head={["Student", "Route", "Stop", "Pickup", "Drop", ""]}
          rows={rows.map((s) => ({ key: s.id, find: `${s.name} ${klass(s)} ${s.route} ${s.stop}`, out: [`${s.name} (${klass(s)})`, s.route || "Not on transport", s.stop, s.pickup, s.drop], cells: [
            name(s.name, klass(s)), s.route || <span key="r" className="text-slate-500">Not on transport</span>, s.stop || "—", s.pickup || "—", s.drop || "—",
            <button key="b" type="button" className={s.route ? pill : solid} onClick={() => open(s)}>{s.route ? "Change" : "Assign"}</button>,
          ] }))} />
      </div>}
      <Modal open={!!who} title={who ? `Route and stop · ${who.name}` : ""} onClose={close}>
        {who && x && <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <L label="Route and stop"><select className={inputCls} value={chosen} onChange={(e) => setValue(e.target.value)}><option value="">No transport</option>{who.route && !x.options.some((o) => o.route_id === who.route_id && o.stop_id === who.stop_id) && <option value={key(who.route_id, who.stop_id)}>{`${who.route} · ${who.stop || "No stop yet"}`}</option>}{x.options.map((o) => <option key={key(o.route_id, o.stop_id)} value={key(o.route_id, o.stop_id)} disabled={o.seats_left === 0 && o.route_id !== who.route_id}>{optionLabel(o)}</option>)}</select></L>
          <div className="flex justify-end"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button></div>
          <Foot close={close} />
        </form>}
      </Modal>
    </div>
  );
}

// ═════════════ requests ═════════════
interface Req { source: "parent" | "transfer" | "admission"; id: string; code: string; type: string; student_id: string; student: string; class_label: string; admission_no: string; now: string; asked: string; route_id: string; stop_id: string; received: string; status: string }
function Requests() {
  const { refreshBadges } = useTransport();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<{ items: Req[] }>("/transport/requests"), []);
  const board = useLoad(() => schoolFetch<Board>("/transport/students"), []);
  const act = useAction(() => { reload(); board.reload(); refreshBadges(); });
  const [choose, setChoose] = useState<Req | null>(null);
  const [value, setValue] = useState("");
  const decide = (r: Req, status: "Approved" | "Rejected", at?: string) => {
    const [route_id, stop_id] = (at ?? "").split("|");
    return act.run(() => schoolFetch("/transport/requests/decide", json("POST", { source: r.source, id: r.id, status, ...(at ? { route_id, stop_id: stop_id || null } : {}) })));
  };
  // a request that doesn't name a route and stop is approved by choosing them
  const approve = (r: Req) => { if (r.route_id && r.stop_id) void decide(r, "Approved"); else { setValue(""); setChoose(r); } };
  const save = async (e: FormEvent) => { e.preventDefault(); if (choose && (await decide(choose, "Approved", value))) setChoose(null); };
  return (
    <div data-report>
      <Head title="Requests" subtitle="Transport requests from parents: new transport, a different stop or a route change." />
      <StepStrip active="allocation" />
      <ErrorBanner message={error || (choose ? "" : act.error)} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Requests from parents" noun="requests" exportName="transport-requests" empty="No requests from parents." head={["Request", "Student", "Type", "Now", "Asked for", "Received", "Status", ""]}
        rows={x.items.map((r) => ({ key: `${r.source}:${r.id}`, find: `${r.code} ${r.student} ${r.type} ${r.now} ${r.asked} ${r.status}`, out: [r.code, r.student, r.type, r.now, r.asked, day(r.received), r.status], cells: [
          r.code, name(r.student, klass(r)), r.type, r.now || "—", <b key="a" className="block min-w-[11rem] max-w-[18rem] whitespace-normal font-semibold text-slate-900">{r.asked || "—"}</b>, day(r.received), <Chip key="s" tone={docTone(r.status === "Approved" ? "Valid" : r.status === "Rejected" ? "Expired" : "Expiring")}>{r.status}</Chip>,
          r.status === "Pending" ? <span key="b" className="flex gap-1.5"><button type="button" className={solid} disabled={act.busy} onClick={() => approve(r)}>Approve</button>{r.source !== "admission" && <button type="button" className={pill} disabled={act.busy} onClick={() => void decide(r, "Rejected")}>Reject</button>}</span> : null,
        ] }))} />}
      <Modal open={!!choose} title={choose ? `${choose.type} · ${choose.student}` : ""} onClose={() => setChoose(null)}>
        {choose && <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          {choose.asked && <p className="text-[13px] text-slate-600">Asked for: <b className="text-slate-900">{choose.asked}</b></p>}
          <L label="Route and stop"><select className={inputCls} required value={value} onChange={(e) => setValue(e.target.value)}><option value="">Choose</option>{(board.data?.options ?? []).map((o) => <option key={key(o.route_id, o.stop_id)} value={key(o.route_id, o.stop_id)}>{optionLabel(o)}</option>)}</select></L>
          <div className="flex justify-end"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Approve</button></div>
        </form>}
      </Modal>
    </div>
  );
}

interface AppReq { id: string; code: string; parent: string; student: string; class_label: string; details: string; raised_on: string; status: string }
function AppRequests() {
  const { refreshBadges } = useTransport();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<{ items: AppReq[] }>("/transport/app-requests"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const decide = (id: string, status: string) => void act.run(() => schoolFetch(`/transport/app-requests/${id}`, json("POST", { status })));
  return (
    <div data-report>
      <Head title="Parent App Requests" subtitle="Requests sent from the parent and student apps. Your reply goes straight back to them." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && (x.items.length ? <Filtered title="Transport requests from the parent app" noun="requests" exportName="transport-app-requests" empty="No requests." head={["Request", "Child", "Details", "Sent", "Status", ""]}
        rows={x.items.map((r) => { const child = [r.student, r.class_label.replace(/^Class /, "")].filter(Boolean).join(" · "); return { key: r.id, find: `${r.code} ${r.student} ${r.parent} ${r.details} ${r.status}`, out: [r.code, child, r.details, day(r.raised_on), r.status], cells: [
          r.code, <span key="c"><b className="font-semibold text-slate-900">{child || "—"}</b><span className="block text-[11px] text-slate-500">{r.parent}</span></span>, <span key="d" className="block max-w-[26rem] whitespace-normal">{r.details}</span>, day(r.raised_on), <Chip key="s" tone={r.status === "Declined" ? "bad" : "good"}>{r.status}</Chip>,
          r.status === "Sent" ? <span key="a" className="flex gap-1.5"><button type="button" className={solid} disabled={act.busy} onClick={() => decide(r.id, "Approved")}>Approve</button><button type="button" className={pill} disabled={act.busy} onClick={() => decide(r.id, "Declined")}>Decline</button></span> : null,
        ] }; })} /> : <Panel title="Transport requests from the parent app" sub="0 requests"><Empty text="Nothing from the parent app yet." /></Panel>)}
    </div>
  );
}

export function AllocationPage({ tab, find, student }: { tab: "assign-students" | "requests" | "parent-app-requests"; find?: string; student?: string }) {
  if (tab === "assign-students") return <AssignStudents key={`${find ?? ""}${student ?? ""}`} find={find} student={student} />;
  return tab === "requests" ? <Requests /> : <AppRequests />;
}
