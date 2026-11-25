"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Empty, Loading } from "../../teacher/t/dash-pages";
import { name, pill } from "../../hr/h/ui";
import { useTransport } from "../context";
import { StepStrip } from "./strip";
import { docTone } from "./vehicle-pages";
import { Filtered, L, police } from "./ui";

interface Assigned { id: string; route: string; vehicle_id: string; vehicle: string; reg_no: string; used: number; seats: number; driver_id: string; driver: string; attendant_id: string; attendant: string; checks: string[] }
interface Veh { id: string; name: string; reg_no: string; model: string; seats: number; status: string; route: string; block: string }
interface Person { id: string; name: string; mobile: string; police: string; route?: string; licence_state?: string }
interface Data { routes: Assigned[]; vehicles: Veh[]; drivers: Person[]; attendants: Person[]; spare: { vehicles: Veh[]; drivers: Person[]; attendants: Person[] } }
const useData = () => useLoad(() => schoolFetch<Data>("/transport/assignments"), []);

function Assignments() {
  const { refreshBadges } = useTransport();
  const { data: x, error, loading, reload } = useData();
  const act = useAction(() => { reload(); refreshBadges(); });
  const [edit, setEdit] = useState<Assigned | null>(null);
  const [f, setF] = useState({ vehicle_id: "", driver_id: "", attendant_id: "" });
  const save = async (e: FormEvent) => { e.preventDefault(); if (edit && (await act.run(() => schoolFetch(`/transport/assignments/${edit.id}`, json("PUT", { vehicle_id: f.vehicle_id || null, driver_id: f.driver_id || null, attendant_id: f.attendant_id || null }))))) setEdit(null); };
  const elsewhere = (route?: string) => (route && route !== edit?.route ? ` · on ${route}` : "");
  return (
    <div data-report>
      <Head title="Assignments" subtitle="Which vehicle, driver and attendant run each route. The portal checks documents, licences, verification and seats." />
      <StepStrip active="assignment" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Route assignments" noun="routes" exportName="route-assignments" empty="No routes yet." head={["Route", "Vehicle", "Seats", "Driver", "Attendant", "Checks", ""]}
        rows={x.routes.map((r) => ({ key: r.id, find: `${r.route} ${r.vehicle} ${r.reg_no} ${r.driver} ${r.attendant}`, out: [r.route, `${r.vehicle} ${r.reg_no}`, `${r.used} / ${r.seats || "—"}`, r.driver, r.attendant, r.checks.join("; ") || "Valid"], cells: [
          <b key="r" className="font-semibold text-slate-900">{r.route}</b>, r.vehicle ? name(r.vehicle, r.reg_no === r.vehicle ? undefined : r.reg_no) : "—", `${r.used} / ${r.seats || "—"}`, r.driver || "—", r.attendant || "—",
          r.checks.length ? <span key="c" className="block whitespace-normal text-[12px] text-[#8a5a0b]">{r.checks.map((c) => <span key={c} className="block">{c}</span>)}</span> : <Chip key="c" tone="good">Valid</Chip>,
          <button key="b" type="button" className={pill} onClick={() => { setEdit(r); setF({ vehicle_id: r.vehicle_id, driver_id: r.driver_id, attendant_id: r.attendant_id }); }}>Change</button>,
        ] }))} />}
      <Modal open={!!edit} title={edit ? `${edit.route} · vehicle and crew` : ""} onClose={() => setEdit(null)}>
        {edit && x && <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <L label="Vehicle"><select className={inputCls} value={f.vehicle_id} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })}><option value="">No vehicle</option>{x.vehicles.map((v) => <option key={v.id} value={v.id}>{`${v.name} · ${v.reg_no} · ${v.seats} seats${elsewhere(v.route)}${v.status !== "Active" ? ` · ${v.status.toLowerCase()}` : v.block ? " · documents not in order" : ""}`}</option>)}</select></L>
          <L label="Driver"><select className={inputCls} value={f.driver_id} onChange={(e) => setF({ ...f, driver_id: e.target.value })}><option value="">No driver</option>{x.drivers.map((d) => <option key={d.id} value={d.id}>{`${d.name}${elsewhere(d.route)}${d.police === "Pending" ? " · verification pending" : d.licence_state === "Expired" ? " · licence expired" : ""}`}</option>)}</select></L>
          <L label="Attendant"><select className={inputCls} value={f.attendant_id} onChange={(e) => setF({ ...f, attendant_id: e.target.value })}><option value="">No attendant</option>{x.attendants.map((a) => <option key={a.id} value={a.id}>{`${a.name}${elsewhere(a.route)}${a.police === "Pending" ? " · verification pending" : ""}`}</option>)}</select></L>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setEdit(null)}>Close</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button></div>
        </form>}
      </Modal>
    </div>
  );
}

const Item = ({ mark, title, role, sub, chip }: { mark: string; title: string; role: string; sub: string; chip: ReactNode }) => (
  <li className="flex items-start gap-3 px-4 py-3">
    <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f8ecd6] text-[12px] font-bold text-[#8a5a0b]">{mark}</span>
    <span className="min-w-0 flex-1"><span className="block text-[13px] text-slate-900"><b>{title}</b> · {role}</span><span className="block text-[11.5px] text-slate-500">{sub}</span></span>
    {chip}
  </li>
);
function Spare() {
  const { data: x, error, loading } = useData();
  const people = x ? [...x.spare.drivers.map((p) => ({ ...p, role: "Driver" })), ...x.spare.attendants.map((p) => ({ ...p, role: "Attendant" }))] : [];
  return (
    <div data-report>
      <Head title="Spare Vehicles & Staff" subtitle="Vehicles and staff not on a route today: use them for substitutes and trips." />
      <StepStrip active="assignment" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <div className="grid items-stretch gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Spare vehicles">{x.spare.vehicles.length ? <ul className="divide-y divide-slate-100">{x.spare.vehicles.map((v) => <Item key={v.id} mark="B" title={v.name} role={v.reg_no} sub={`${v.model} · ${v.seats} seats`} chip={<Chip tone={v.status === "Active" ? "good" : docTone(v.status)}>{v.status === "Active" ? "Available" : v.status}</Chip>} />)}</ul> : <Empty text="Every vehicle is on a route." />}</Panel>
        <Panel title="Spare drivers and attendants">{people.length ? <ul className="divide-y divide-slate-100">{people.map((p) => <Item key={p.id} mark={p.role[0]} title={p.name} role={p.role} sub={p.mobile || "—"} chip={police(p.police)} />)}</ul> : <Empty text="Everyone is on a route." />}</Panel>
      </div>}
    </div>
  );
}

export function AssignmentPage({ tab }: { tab: "assignments" | "spare" }) { return tab === "assignments" ? <Assignments /> : <Spare />; }
