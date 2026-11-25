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
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";
import { VehiclePages } from "./transport-pages";

const X = "/school/tr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "mute" => (["Active", "Verified", "Online"].includes(s) ? "good" : ["Pending", "Transfer requested", "In maintenance"].includes(s) ? "warn" : s === "Expired" ? "bad" : "mute");
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const Tick = ({ items, rows }: { items: [string, string | number, string?][]; rows?: never }) => { void rows; return <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />; };
const cnt = (all: { status: string }[], s: string): [string, number, string] => [s, all.filter((x) => x.status === s).length, pct(all.filter((x) => x.status === s).length, all.length)];

// ═════════════ drivers ═════════════
interface Staff { id: string; name: string; emp_code: string; designation: string }
interface Dr { id: string; name: string; licence_no: string; licence_until: string | null; vehicle_id: string | null; vehicle: string; mobile: string; police: string; status: string; staff_id: string | null; staff: string }
/** The employee record behind a driver or attendant (HR's staff list). */
const StaffSelect = ({ staff, value, onChange }: { staff: Staff[]; value: string; onChange: (v: string) => void }) => <Field label="Staff record"><select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Not linked</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.emp_code ? ` · ${s.emp_code}` : ""}</option>)}</select></Field>;
export function DriverPages({ tab }: { tab: "driver-registration" | "license" | "documents" | "driver-to-vehicle" }) {
  const d = useLoad(() => schoolFetch<{ staff: Staff[]; linkable: boolean; vehicles: { id: string; reg_no: string }[]; items: Dr[] }>(`${X}/drivers`), []);
  const act = useAction(() => d.reload());
  const blank = { name: "", licence_no: "", licence_until: "", vehicle_id: "", mobile: "", police: "Pending", staff_id: "" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<Dr | null>(null);
  if (tab === "documents") return <VehiclePages tab="vehicle-documents" />;
  const err = d.error || act.error; const x = d.data;
  if (tab === "driver-registration") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${X}/drivers`, json("POST", { name: f.name, licence_no: f.licence_no, licence_until: f.licence_until || null, vehicle_id: f.vehicle_id || null, mobile: f.mobile, police: f.police, ...(f.staff_id ? { staff_id: f.staff_id } : {}) })))) { setF(blank); setMsg("Saved. It appears in the drivers list."); } };
    return <div>{okBox(msg)}<FormCard title="Driver Registration" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      {x?.linkable && <StaffSelect staff={x.staff} value={f.staff_id} onChange={(v) => setF({ ...f, staff_id: v, name: f.name || (x.staff.find((s) => s.id === v)?.name ?? "") })} />}
      <Field label="Driver"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Licence no."><input className={inputCls} required minLength={5} maxLength={30} value={f.licence_no} onChange={(e) => setF({ ...f, licence_no: e.target.value })} /></Field>
      <Field label="Licence valid until"><input type="date" className={inputCls} value={f.licence_until} onChange={(e) => setF({ ...f, licence_until: e.target.value })} /></Field>
      <Field label="Vehicle"><select className={inputCls} value={f.vehicle_id} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })}><option value="">Spare</option>{x?.vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_no}</option>)}</select></Field>
      <Field label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
      <Field label="Police verification"><select className={inputCls} value={f.police} onChange={(e) => setF({ ...f, police: e.target.value })}><option>Verified</option><option>Pending</option></select></Field></FormCard></div>;
  }
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search));
  return (
    <div className="space-y-5" data-report><ErrorBanner message={err} /><Tick items={[["Drivers", all.length, "All records"], [...cnt(all, "Active")]]} />
      <ListPanel title="Drivers" noun="drivers" search={search} onSearch={setSearch} exportName="drivers" head={["Driver", "Licence no.", "Licence valid until", "Vehicle", "Mobile", "Police verification", "Status"]} exportRows={rows.map((i) => [i.name, i.licence_no, i.licence_until ?? "", i.vehicle, i.mobile, i.police, i.status])}
        tableHead={["Driver", "Licence no.", "Licence valid until", "Vehicle", "Mobile", "Police verification", "Status", ""]} empty={d.loading ? "Loading…" : "No drivers yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.licence_no, i.licence_until ? day(i.licence_until) : "—", i.vehicle, i.mobile || "—", i.police, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Licence no." v={view.licence_no} /><Row k="Valid until" v={view.licence_until ? day(view.licence_until) : "—"} /><Row k="Vehicle" v={view.vehicle} /><Row k="Mobile" v={view.mobile || "—"} /><Row k="Police verification" v={view.police} />{x?.linkable && <Row k="Staff record" v={view.staff || "Not linked"} />}<Row k="Status" v={view.status} /></dl>
        <ErrorBanner message={act.error} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Licence valid until"><input type="date" className={inputCls} value={view.licence_until ?? ""} onChange={(e) => { const v = e.target.value || null; void act.run(() => schoolFetch(`${X}/drivers/${view.id}`, json("PATCH", { licence_until: v }))).then((ok) => ok && setView({ ...view, licence_until: v })); }} /></Field>
          {x?.linkable && <StaffSelect staff={x.staff} value={view.staff_id ?? ""} onChange={(v) => void act.run(() => schoolFetch(`${X}/drivers/${view.id}`, json("PATCH", { staff_id: v || null }))).then((ok) => ok && setView({ ...view, staff_id: v || null, staff: x.staff.find((s) => s.id === v)?.name ?? "" }))} />}<Field label="Vehicle"><select className={inputCls} value={view.vehicle_id ?? ""} onChange={(e) => void act.run(() => schoolFetch(`${X}/drivers/${view.id}`, json("PATCH", { vehicle_id: e.target.value || null }))).then((ok) => ok && setView(null))}><option value="">Spare</option>{x?.vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_no}</option>)}</select></Field></div>
        <Foot close={() => setView(null)} left={<>{view.police === "Pending" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/drivers/${view.id}`, json("PATCH", { police: "Verified" }))).then((ok) => ok && setView(null))}>Mark verified</button>}<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/drivers/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button></>} /></>}</Modal></div>
  );
}

// ═════════════ attendants ═════════════
interface At { id: string; name: string; route_id: string | null; vehicle_id: string | null; route: string; vehicle: string; mobile: string; shift: string; status: string; police: string; staff_id: string | null; staff: string }
export function AttendantPages({ tab }: { tab: "add-attendant" | "staff-allocation" }) {
  const a = useLoad(() => schoolFetch<{ staff: Staff[]; linkable: boolean; routes: { id: string; name: string }[]; vehicles: { id: string; reg_no: string }[]; items: At[] }>(`${X}/attendants`), []);
  const act = useAction(() => a.reload());
  const blank = { name: "", route_id: "", vehicle_id: "", mobile: "", shift: "Morning + afternoon", staff_id: "", police: "Pending" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [pick, setPick] = useState(""); const x = a.data;
  if (tab === "add-attendant") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${X}/attendants`, json("POST", { name: f.name, route_id: f.route_id || null, vehicle_id: f.vehicle_id || null, mobile: f.mobile, shift: f.shift, ...(f.staff_id ? { staff_id: f.staff_id } : {}), ...(x?.linkable ? { police: f.police } : {}) })))) { setF(blank); setMsg("Saved. It appears in the attendants list."); } };
    return <div>{okBox(msg)}<FormCard title="Add Attendant" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={a.error || act.error}>
      {x?.linkable && <StaffSelect staff={x.staff} value={f.staff_id} onChange={(v) => setF({ ...f, staff_id: v, name: f.name || (x.staff.find((s) => s.id === v)?.name ?? "") })} />}
      <Field label="Attendant"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Route"><select className={inputCls} value={f.route_id} onChange={(e) => setF({ ...f, route_id: e.target.value })}><option value="">—</option>{x?.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
      <Field label="Vehicle"><select className={inputCls} value={f.vehicle_id} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })}><option value="">—</option>{x?.vehicles.map((r) => <option key={r.id} value={r.id}>{r.reg_no}</option>)}</select></Field>
      <Field label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
      <Field label="Shift"><select className={inputCls} value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })}>{["Morning + afternoon", "Morning only", "Afternoon only"].map((s) => <option key={s}>{s}</option>)}</select></Field>
      {x?.linkable && <Field label="Police verification"><select className={inputCls} value={f.police} onChange={(e) => setF({ ...f, police: e.target.value })}><option>Verified</option><option>Pending</option></select></Field>}</FormCard></div>;
  }
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const view = all.find((i) => i.id === pick);
  const change = (body: object) => void act.run(() => schoolFetch(`${X}/attendants/${pick}`, json("PATCH", body)));
  return <div className="space-y-5" data-report><ErrorBanner message={a.error || act.error} /><Tick items={[["Attendants", all.length, "All records"], [...cnt(all, "Active")]]} />
    <ListPanel title="Attendants" noun="attendants" search={search} onSearch={setSearch} exportName="attendants" head={["Attendant", "Route", "Vehicle", "Mobile", "Shift", "Police verification", "Status"]} exportRows={rows.map((i) => [i.name, i.route, i.vehicle, i.mobile, i.shift, i.police, i.status])}
      tableHead={["Attendant", "Route", "Vehicle", "Mobile", "Shift", "Police verification", "Status", ""]} empty={a.loading ? "Loading…" : "No attendants yet."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.route, i.vehicle, i.mobile || "—", i.shift, i.police || "—", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setPick(i.id)}>View details</button>])} />
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setPick("")}>{view && <><ErrorBanner message={act.error} /><dl><Row k="Mobile" v={view.mobile || "—"} /><Row k="Shift" v={view.shift} /><Row k="Police verification" v={view.police || "—"} />{x?.linkable && <Row k="Staff record" v={view.staff || "Not linked"} />}<Row k="Status" v={view.status} /></dl>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Route"><select className={inputCls} value={view.route_id ?? ""} onChange={(e) => change({ route_id: e.target.value || null })}><option value="">—</option>{x?.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="Vehicle"><select className={inputCls} value={view.vehicle_id ?? ""} onChange={(e) => change({ vehicle_id: e.target.value || null })}><option value="">—</option>{x?.vehicles.map((r) => <option key={r.id} value={r.id}>{r.reg_no}</option>)}</select></Field>
        {x?.linkable && <StaffSelect staff={x.staff} value={view.staff_id ?? ""} onChange={(v) => change({ staff_id: v || null })} />}</div>
      <Foot close={() => setPick("")} left={<>{view.police === "Pending" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => change({ police: "Verified" })}>Mark verified</button>}<button type="button" className={small} disabled={act.busy} onClick={() => change({ status: view.status === "Active" ? "Inactive" : "Active" })}>{view.status === "Active" ? "Make inactive" : "Make active"}</button></>} /></>}</Modal></div>;
}

// ═════════════ routes ═════════════
interface Rt { id: string; name: string; area: string; distance_km: number; first_pickup: string; at_school: string; status: string; stops: number; students: number }
export function RoutePages({ tab }: { tab: "add-route" | "route-list" | "route-details" }) {
  const r = useLoad(() => schoolFetch<{ items: Rt[] }>(`${X}/routes`), []);
  const [pick, setPick] = useState(""); const items = r.data?.items ?? []; const id = pick || items[0]?.id || "";
  const det = useLoad(() => (tab === "route-details" && id ? schoolFetch<Rt & { items: { id: string; name: string; ord: number; pickup: string; drop: string; students: number }[] }>(`${X}/routes/${id}`) : Promise.resolve(null)), [tab, id]);
  const act = useAction(() => r.reload());
  const blank = { name: "", area: "", distance_km: "", first_pickup: "", at_school: "" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<Rt | null>(null);
  const err = r.error || det.error || act.error;
  if (tab === "add-route") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${X}/routes`, json("POST", { name: f.name, area: f.area, distance_km: Number(f.distance_km) || 0, first_pickup: f.first_pickup || null, at_school: f.at_school || null })))) { setF(blank); setMsg("Saved. It appears in Route List."); } };
    return <div>{okBox(msg)}<FormCard title="Add Route" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Route"><input className={inputCls} required minLength={2} maxLength={60} placeholder="Route 8" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Area"><input className={inputCls} maxLength={100} placeholder="Kondapur – Kothaguda" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
      <Field label="Distance (km)"><input type="number" min={0} className={inputCls} value={f.distance_km} onChange={(e) => setF({ ...f, distance_km: e.target.value })} /></Field>
      <Field label="First pickup"><input type="time" className={inputCls} value={f.first_pickup} onChange={(e) => setF({ ...f, first_pickup: e.target.value })} /></Field>
      <Field label="At school"><input type="time" className={inputCls} value={f.at_school} onChange={(e) => setF({ ...f, at_school: e.target.value })} /></Field></FormCard></div>;
  }
  if (tab === "route-details") {
    const x = det.data;
    return <div className="space-y-5"><ErrorBanner message={err} /><div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Route<select aria-label="Route" value={id} onChange={(e) => setPick(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{items.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.area}</option>)}</select></label></div>
      {!x ? <p className="py-10 text-center text-sm text-slate-400">{r.loading || det.loading ? "Loading…" : "No routes yet."}</p> : <>
        <Tick items={[["Stops", x.stops, `${x.distance_km} km`], ["Students", x.students], ["First pickup", x.first_pickup || "—"]]} />
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{x.name} · {x.area}</h2></div>
          <ol className="space-y-4 p-5">{x.items.map((s) => <li key={s.id} className="flex gap-3"><span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#0294ce] text-xs font-semibold text-white">{s.ord}</span><span><b className="block text-[14px] text-slate-900">{s.name}</b><span className="text-[12px] text-slate-500">Pickup {s.pickup || "—"} · drop {s.drop || "—"} · {s.students} students</span></span></li>)}
            {x.at_school && <li className="flex gap-3"><span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#0294ce] text-xs text-white">★</span><span><b className="block text-[14px] text-slate-900">School</b><span className="text-[12px] text-slate-500">Arrives {x.at_school}</span></span></li>}{!x.items.length && <li className="text-sm text-slate-400">No stops yet. Add them in Stop Management.</li>}</ol></div></>}</div>;
  }
  const rows = items.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={err} /><Tick items={[["Routes", items.length, "All records"], [...cnt(items, "Active")]]} />
    <ListPanel title="Routes" noun="routes" search={search} onSearch={setSearch} exportName="routes" head={["Route", "Area", "Stops", "Distance", "Students", "First pickup", "At school", "Status"]} exportRows={rows.map((i) => [i.name, i.area, i.stops, `${i.distance_km} km`, i.students, i.first_pickup, i.at_school, i.status])}
      tableHead={["Route", "Area", "Stops", "Distance", "Students", "First pickup", "At school", "Status", ""]} empty={r.loading ? "Loading…" : "No routes yet."}
      rows={rows.map((i) => [i.name, i.area || "—", i.stops, `${i.distance_km} km`, i.students, i.first_pickup || "—", i.at_school || "—", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Area" v={view.area || "—"} /><Row k="Stops" v={view.stops} /><Row k="Distance" v={`${view.distance_km} km`} /><Row k="Students" v={view.students} /><Row k="First pickup" v={view.first_pickup || "—"} /><Row k="At school" v={view.at_school || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/routes/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button>} /></>}</Modal></div>;
}

// ═════════════ stops ═════════════
export function StopPages({ tab }: { tab: "add-stop" | "stop-sequence" | "stop-timings" }) {
  const s = useLoad(() => schoolFetch<{ routes: { id: string; name: string }[]; items: { id: string; route_id: string; name: string; route: string; ord: number; pickup: string; drop: string; status: string; students: number }[] }>(`${X}/stops`), []);
  const act = useAction(() => s.reload());
  const blank = { name: "", route_id: "", ord: "1", pickup: "", drop: "" }; const [f, setF] = useState(blank);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const x = s.data;
  const [view, setView] = useState<NonNullable<typeof x>["items"][number] | null>(null); const [tm, setTm] = useState({ pickup: "", drop: "" });
  if (tab === "add-stop") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${X}/stops`, json("POST", { name: f.name, route_id: f.route_id || x?.routes[0]?.id, ord: Number(f.ord), pickup: f.pickup || null, drop: f.drop || null })))) { setF({ ...blank, route_id: f.route_id, ord: String(Number(f.ord) + 1) }); setMsg("Saved. It appears in Stop Sequence."); } };
    return <div>{okBox(msg)}<FormCard title="Add Stop" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={s.error || act.error}>
      <Field label="Stop"><input className={inputCls} required minLength={2} maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Route"><select className={inputCls} value={f.route_id || x?.routes[0]?.id || ""} onChange={(e) => setF({ ...f, route_id: e.target.value })}>{x?.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
      <Field label="Order"><input type="number" min={1} max={60} required className={inputCls} value={f.ord} onChange={(e) => setF({ ...f, ord: e.target.value })} /></Field>
      <Field label="Pickup"><input type="time" className={inputCls} value={f.pickup} onChange={(e) => setF({ ...f, pickup: e.target.value })} /></Field>
      <Field label="Drop"><input type="time" className={inputCls} value={f.drop} onChange={(e) => setF({ ...f, drop: e.target.value })} /></Field></FormCard></div>;
  }
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={s.error || act.error} /><Tick items={[["Stops", all.length, "All records"], [...cnt(all, "Active")]]} />
    <ListPanel title="Stops" noun="stops" search={search} onSearch={setSearch} exportName={tab} head={["Stop", "Route", "Order", "Pickup", "Drop", "Students", "Status"]} exportRows={rows.map((i) => [i.name, i.route, i.ord, i.pickup, i.drop, i.students, i.status])}
      tableHead={["Stop", "Route", "Order", "Pickup", "Drop", "Students", "Status", ""]} empty={s.loading ? "Loading…" : "No stops yet."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.route, i.ord, i.pickup || "—", i.drop || "—", i.students, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(i); setTm({ pickup: i.pickup, drop: i.drop }); }}>View details</button>])} />
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Route" v={view.route} /><Row k="Order" v={view.ord} /><Row k="Students" v={view.students} /><Row k="Status" v={view.status} /></dl><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Pickup"><input type="time" className={inputCls} value={tm.pickup} onChange={(e) => setTm({ ...tm, pickup: e.target.value })} /></Field><Field label="Drop"><input type="time" className={inputCls} value={tm.drop} onChange={(e) => setTm({ ...tm, drop: e.target.value })} /></Field></div>
      <Foot close={() => setView(null)} left={<><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/stops/${view.id}`, json("PATCH", { pickup: tm.pickup || null, drop: tm.drop || null }))).then((ok) => ok && setView(null))}>Save timings</button><button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/stops/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button></>} /></>}</Modal></div>;
}

// ═════════════ student allocation ═════════════
interface Al { student_id: string; student: string; class_label: string; route: string; stop: string; fee_term: number; from_on: string; status: string; route_id: string | null; stop_id: string | null }
export function StudentAllocationPages({ tab }: { tab: "assign-route" | "assign-stop" | "transfer-route" }) {
  const a = useLoad(() => schoolFetch<{ per_term: number; routes: { id: string; name: string }[]; stops: { id: string; route_id: string; name: string; ord: number }[]; students: { id: string; name: string; class_label: string }[]; items: Al[] }>(`${X}/allocations`), []);
  const act = useAction(() => a.reload());
  const [f, setF] = useState({ student_id: "", route_id: "", stop_id: "", from: nowIst() });
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<Al | null>(null); const [nr, setNr] = useState({ route_id: "", stop_id: "" });
  const x = a.data; if (!x) return <Loading e={a.error} />;
  const route = f.route_id || x.routes[0]?.id || ""; const stopsOf = (r: string) => x.stops.filter((s) => s.route_id === r);
  const free = x.students.filter((s) => !x.items.some((i) => i.student_id === s.id));
  if (tab === "assign-route") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let linked = true; if (await act.run(async () => { const r = await schoolFetch<{ fee_linked: boolean }>(`${X}/allocations`, json("POST", { student_id: f.student_id || free[0]?.id, route_id: route, stop_id: f.stop_id || null, from_on: f.from })); linked = r.fee_linked; })) setMsg(`Saved. It appears in Assign Stop.${linked ? " The bus fee is added to the student's fees." : " Add a Transport fee in Fee Structure › Optional Fees to bill it."}`); };
    return <div>{okBox(msg)}<FormCard title="Assign Route" cols="lg:grid-cols-5" onSubmit={save} onDiscard={() => setMsg("")} busy={act.busy} error={a.error || act.error}>
      <Field label="Student"><select className={inputCls} required value={f.student_id || free[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{free.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_label}</option>)}</select></Field>
      <Field label="Route"><select className={inputCls} value={route} onChange={(e) => setF({ ...f, route_id: e.target.value, stop_id: "" })}>{x.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
      <Field label="Stop"><select className={inputCls} value={f.stop_id} onChange={(e) => setF({ ...f, stop_id: e.target.value })}><option value="">—</option>{stopsOf(route).map((s) => <option key={s.id} value={s.id}>{s.ord}. {s.name}</option>)}</select></Field>
      <Field label="Bus fee / term (₹)"><input className={inputCls} readOnly value={x.per_term || "No transport fee set"} /></Field>
      <Field label="From"><input type="date" required className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field></FormCard></div>;
  }
  const all = x.items.filter((i) => tab === "transfer-route" ? i.status === "Transfer requested" : true); const rows = all.filter((i) => has(i, search));
  const ch = (body: object) => void act.run(() => schoolFetch(`${X}/allocations/${view!.student_id}`, json("PATCH", body))).then((ok) => ok && setView(null));
  return <div className="space-y-5" data-report><ErrorBanner message={a.error || act.error} /><Tick items={[["Transport allocation", all.length, "All records"], ...(tab === "assign-stop" ? [cnt(all, "Active")] : [])]} />
    <ListPanel title="Transport allocation" noun="students" search={search} onSearch={setSearch} exportName={tab} head={["Student", "Class", "Route", "Stop", "Bus fee / term", "From", "Status"]} exportRows={rows.map((i) => [i.student, i.class_label, i.route, i.stop, i.fee_term, day(i.from_on), i.status])}
      tableHead={["Student", "Class", "Route", "Stop", "Bus fee / term", "From", "Status", ""]} empty={a.loading ? "Loading…" : "Nothing in this list yet."}
      rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.student}</b>, i.class_label, i.route, i.stop, <span key="f" className="block text-right">{inr(i.fee_term)}</span>, day(i.from_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView(i); setNr({ route_id: i.route_id ?? "", stop_id: i.stop_id ?? "" }); }}>View details</button>])} />
    <Modal open={!!view} title={view?.student ?? ""} onClose={() => setView(null)}>{view && <><ErrorBanner message={act.error} /><dl><Row k="Class" v={view.class_label} /><Row k="Route" v={view.route} /><Row k="Stop" v={view.stop} /><Row k="From" v={day(view.from_on)} /><Row k="Status" v={view.status} /></dl>
      <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Route"><select className={inputCls} value={nr.route_id} onChange={(e) => setNr({ route_id: e.target.value, stop_id: "" })}>{x.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="Stop"><select className={inputCls} value={nr.stop_id} onChange={(e) => setNr({ ...nr, stop_id: e.target.value })}><option value="">—</option>{stopsOf(nr.route_id).map((s) => <option key={s.id} value={s.id}>{s.ord}. {s.name}</option>)}</select></Field></div>
      <Foot close={() => setView(null)} left={<><button type="button" className={small} disabled={act.busy} onClick={() => ch({ action: "remove" })}>Remove from transport</button>{view.status === "Active" && <button type="button" className={small} disabled={act.busy} onClick={() => ch({ action: "request_transfer" })}>Request transfer</button>}<button type="button" className={primaryCls} disabled={act.busy || !nr.route_id} onClick={() => ch(nr.route_id === view.route_id ? { action: "assign_stop", stop_id: nr.stop_id || null } : { action: "transfer", route_id: nr.route_id, stop_id: nr.stop_id || null })}>{nr.route_id === view.route_id ? "Save stop" : "Transfer"}</button></>} /></>}</Modal></div>;
}

// ═════════════ vehicle allocation ═════════════
export function VehicleAllocationPages({ tab }: { tab: "vehicle-to-route" | "driver-to-vehicle" }) {
  return tab === "vehicle-to-route" ? <VehiclePages tab="vehicle-list" /> : <DriverPages tab="license" />;
}

// ═════════════ transport fees ═════════════
export function TransportFeePages({ tab }: { tab: "fee-structure" | "collection" | "pending-fees" }) {
  const d = useLoad(() => schoolFetch<{ annual: number; per_term: number; terms: number; has_fee: boolean; routes: number; items: Al[]; pending: { student_id: string; student: string; class_label: string; father: string; mobile: string; due: number; days_overdue: number }[] }>(`${X}/fees`), []);
  const [search, setSearch] = useState(""); const x = d.data; if (!x) return <Loading e={d.error} />;
  if (tab === "fee-structure") return <div><ErrorBanner message={d.error} /><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Transport fee <span className="ml-1 text-xs font-normal text-slate-500">₹ per year</span></h2></div>
    {x.has_fee ? <table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-5 py-2.5">Distance</th><th className="px-3 py-2.5">Routes</th><th className="px-3 py-2.5">Annual fee</th><th className="px-3 py-2.5">Per term</th></tr></thead><tbody><tr className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">Every stop</td><td className="px-3 py-3">{x.routes} routes</td><td className="px-3 py-3">{inr(x.annual)}</td><td className="px-3 py-3">{inr(x.per_term)}</td></tr></tbody></table> : <p className="p-6 text-center text-sm text-slate-400">No transport fee yet. Add one in Fee &amp; Finance › Fee Structure › Optional Fees (type Transport).</p>}</div></div>;
  if (tab === "collection") {
    const rows = x.items.filter((i) => has(i, search));
    return <div className="space-y-5" data-report><Tick items={[["Transport allocation", x.items.length, "All records"], [...cnt(x.items, "Active")]]} /><ListPanel title="Transport allocation" noun="students" search={search} onSearch={setSearch} exportName="transport-collection" head={["Student", "Class", "Route", "Stop", "Bus fee / term", "From", "Status"]} exportRows={rows.map((i) => [i.student, i.class_label, i.route, i.stop, i.fee_term, day(i.from_on), i.status])}
      tableHead={["Student", "Class", "Route", "Stop", "Bus fee / term", "From", "Status"]} empty="No students on transport." rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.student}</b>, i.class_label, i.route, i.stop, <span key="f" className="block text-right">{inr(i.fee_term)}</span>, day(i.from_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>])} />
      <p className="text-xs text-slate-500">The bus fee is billed with each term&apos;s fees. Collect it in Fee &amp; Finance › Fee Collection.</p></div>;
  }
  const rows = x.pending.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><Tick items={[["Students with fees due", x.pending.length, "On transport"], ["Total due", inr(x.pending.reduce((n, i) => n + i.due, 0)), "All fees, not only the bus fee"]]} />
    <ListPanel title="Pending fees" noun="students" search={search} onSearch={setSearch} exportName="transport-pending" head={["Student", "Class", "Father", "Mobile", "Due", "Days overdue"]} exportRows={rows.map((i) => [i.student, i.class_label, i.father, i.mobile, i.due, i.days_overdue])}
      tableHead={["Student", "Class", "Father", "Mobile", "Due", "Days overdue"]} empty="Nobody on transport has fees due." rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.student}</b>, i.class_label, i.father || "—", i.mobile || "—", inr(i.due), i.days_overdue])} /></div>;
}
void FormFoot;
