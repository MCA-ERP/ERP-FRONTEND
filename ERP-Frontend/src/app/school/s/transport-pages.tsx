"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, okBox } from "./fee-pages";

const X = "/school/tr";
interface V { id: string; reg_no: string; vtype: string; seats: number; route: string; fitness_until: string | null; gps: string; status: string; fitness: string }
interface D { id: string; vehicle: string; doc_type: string; file_name: string; valid_until: string | null; state: string }
const T = (s: string): "good" | "warn" | "bad" | "mute" => (["Active", "Valid", "Online"].includes(s) ? "good" : ["Expiring soon", "Offline", "In maintenance"].includes(s) ? "warn" : s === "Expired" ? "bad" : "mute");

export function VehiclePages({ tab }: { tab: "add-vehicle" | "vehicle-list" | "vehicle-documents" }) {
  const v = useLoad(() => schoolFetch<{ routes: string[]; items: V[]; docs: D[] }>(`${X}/vehicles`), []);
  const act = useAction(() => v.reload());
  const blank = { reg_no: "", vtype: "Bus", seats: "24", route: "", fitness_until: "", gps: "Online" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<V | null>(null);
  const [adding, setAdding] = useState(false); const [dc, setDc] = useState({ vehicle_id: "", doc_type: "Insurance", file_name: "", valid_until: "" });
  const err = v.error || act.error; const x = v.data;
  if (tab === "add-vehicle") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${X}/vehicles`, json("POST", { reg_no: f.reg_no, vtype: f.vtype, seats: Number(f.seats), route: f.route, fitness_until: f.fitness_until || null, gps: f.gps })))) { setF(blank); setMsg("Saved. It appears in Vehicle List."); } };
    return <div>{okBox(msg)}<FormCard title="Add Vehicle" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Vehicle"><input className={inputCls} required minLength={3} maxLength={30} placeholder="TS09 AB 1234" value={f.reg_no} onChange={(e) => setF({ ...f, reg_no: e.target.value })} /></Field>
      <Field label="Type"><select className={inputCls} value={f.vtype} onChange={(e) => setF({ ...f, vtype: e.target.value })}>{["Bus", "Mini bus", "Van", "Car"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Seats"><input type="number" min={1} max={80} required className={inputCls} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} /></Field>
      <Field label="Route"><input className={inputCls} list="tr-routes" maxLength={60} placeholder="Route 1" value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} /><datalist id="tr-routes">{x?.routes.map((r) => <option key={r} value={r} />)}</datalist></Field>
      <Field label="Fitness valid until"><input type="date" className={inputCls} value={f.fitness_until} onChange={(e) => setF({ ...f, fitness_until: e.target.value })} /></Field>
      <Field label="GPS"><select className={inputCls} value={f.gps} onChange={(e) => setF({ ...f, gps: e.target.value })}>{["Online", "Offline", "None"].map((t) => <option key={t}>{t}</option>)}</select></Field></FormCard></div>;
  }
  if (tab === "vehicle-documents") {
    const all = x?.docs ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.state === s).length;
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${X}/vehicle-docs`, json("POST", { vehicle_id: dc.vehicle_id || x?.items[0]?.id, doc_type: dc.doc_type, file_name: dc.file_name, valid_until: dc.valid_until || null })))) { setAdding(false); setDc({ ...dc, file_name: "", valid_until: "" }); } };
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><Tiles items={[{ label: "Vehicle documents", value: all.length, sub: "All records" }, { label: "Valid", value: n("Valid"), sub: `${pct(n("Valid"), all.length)} of shown` }, { label: "Expiring soon", value: n("Expiring soon"), sub: "Within 30 days" }, { label: "Expired", value: n("Expired"), sub: `${pct(n("Expired"), all.length)} of shown` }]} />
      <ListPanel title="Vehicle documents" noun="documents" search={search} onSearch={setSearch} exportName="vehicle-documents" head={["Vehicle", "Document", "File", "Valid until", "Status"]} exportRows={rows.map((i) => [i.vehicle, i.doc_type, i.file_name, i.valid_until ?? "", i.state])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add document</button>} tableHead={["Vehicle", "Document", "File", "Valid until", "Status"]} empty={v.loading ? "Loading…" : "No documents yet."}
        rows={rows.map((i) => [<b key="v" className="font-semibold text-slate-900">{i.vehicle}</b>, i.doc_type, i.file_name, i.valid_until ? day(i.valid_until) : "—", <Chip key="s" tone={T(i.state)}>{i.state}</Chip>])} />
      <Modal open={adding} title="Add a vehicle document" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Vehicle"><select className={inputCls} value={dc.vehicle_id || x?.items[0]?.id || ""} onChange={(e) => setDc({ ...dc, vehicle_id: e.target.value })}>{x?.items.map((i) => <option key={i.id} value={i.id}>{i.reg_no}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Document"><input className={inputCls} list="tr-doc-types" required maxLength={30} value={dc.doc_type} onChange={(e) => setDc({ ...dc, doc_type: e.target.value })} /><datalist id="tr-doc-types">{["Insurance", "Registration (RC)", "Permit", "Pollution (PUC)", "Fitness certificate"].map((t) => <option key={t} value={t} />)}</datalist></Field><Field label="Valid until"><input type="date" className={inputCls} value={dc.valid_until} onChange={(e) => setDc({ ...dc, valid_until: e.target.value })} /></Field></div><Field label="File name"><input className={inputCls} required minLength={2} maxLength={160} value={dc.file_name} onChange={(e) => setDc({ ...dc, file_name: e.target.value })} /></Field><p className="text-xs text-slate-500">Files can&apos;t be uploaded yet; only the file name is kept.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal></div>;
  }
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const a = all.filter((i) => i.status === "Active").length;
  return (
    <div className="space-y-5" data-report><ErrorBanner message={err} />
      <Tiles items={[{ label: "Vehicles", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }, { label: "In maintenance", value: all.filter((i) => i.status === "In maintenance").length, sub: `${pct(all.filter((i) => i.status === "In maintenance").length, all.length)} of shown` }]} />
      <ListPanel title="Vehicles" noun="vehicles" search={search} onSearch={setSearch} exportName="vehicles" head={["Vehicle", "Type", "Seats", "Route", "Fitness valid until", "GPS", "Status"]} exportRows={rows.map((i) => [i.reg_no, i.vtype, i.seats, i.route, i.fitness_until ?? "", i.gps, i.status])}
        tableHead={["Vehicle", "Type", "Seats", "Route", "Fitness", "GPS", "Status", ""]} empty={v.loading ? "Loading…" : "No vehicles yet."}
        rows={rows.map((i) => [<b key="r" className="font-semibold text-slate-900">{i.reg_no}</b>, i.vtype, i.seats, i.route || "—", i.fitness_until ? <span key="f">{day(i.fitness_until)} <Chip tone={T(i.fitness)}>{i.fitness}</Chip></span> : "—", <Chip key="g" tone={T(i.gps)}>{i.gps}</Chip>, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
      <Modal open={!!view} title={view?.reg_no ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Type" v={view.vtype} /><Row k="Seats" v={view.seats} /><Row k="Route" v={view.route || "—"} /><Row k="Fitness valid until" v={view.fitness_until ? day(view.fitness_until) : "—"} /><Row k="GPS" v={view.gps} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/vehicles/${view.id}`, json("PATCH", { status: view.status === "Active" ? "In maintenance" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Send for maintenance" : "Make active"}</button>} /></>}</Modal>
    </div>
  );
}
