"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";
import { VehiclePages } from "./transport-pages";
import { RoutePages, StudentAllocationPages } from "./transport-pages2";

const X = "/school/tr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Completed", "On time", "Boarded", "Done"].includes(s) ? "good" : ["Delayed", "Missing at stop", "Didn't board"].includes(s) ? "bad" : ["Scheduled", "In progress", "Boarded, no card", "Running"].includes(s) ? "info" : "mute");
const Sw = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5"><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;
const tiles = (items: [string, string | number, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;

// ═════════════ GPS tracking ═════════════
export function GpsPages({ tab }: { tab: "live-tracking" | "trip-history" | "device-status" }) {
  const lv = useLoad(() => (tab === "live-tracking" ? schoolFetch<{ type: string; on_road: number; routes: number; delayed: number; maint: string[]; items: { route: string; vehicle: string; driver: string; state: string; last: string; next: string; progress: number }[] }>(`${X}/live`) : Promise.resolve(null)), [tab]);
  const tp = useLoad(() => (tab === "trip-history" ? schoolFetch<{ items: { id: string; code: string; route: string; vehicle: string; ttype: string; started: string; ended: string; distance_km: number; trip_on: string; status: string }[] }>(`${X}/trips`) : Promise.resolve(null)), [tab]);
  const [search, setSearch] = useState(""); const [view, setView] = useState<NonNullable<typeof tp.data>["items"][number] | null>(null);
  if (tab === "device-status") return <VehiclePages tab="vehicle-list" />;
  if (tab === "live-tracking") {
    const x = lv.data; if (!x) return <Loading e={lv.error} />;
    return <div className="space-y-5"><ErrorBanner message={lv.error} /><p className="text-[13px] text-slate-600">Where every bus is now ({x.type === "Morning" ? "morning pickup" : "afternoon drop"}). Progress comes from the driver app: stops marked arrived. There is no GPS device feed or map yet.</p>
      {tiles([["On the road", x.on_road, `${x.type} · of ${x.routes} routes`], ["Delayed", x.delayed, "Started 10 minutes late"], ["In maintenance", x.maint.length, x.maint.join(", ") || "None"]])}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{x.items.map((c) => <div key={c.route} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[14px] font-semibold text-slate-900">{c.route} · {c.vehicle}</p><p className="mt-1 min-h-[2.5rem] text-[12px] text-slate-500">{c.last ? `Last stop ${c.last}` : "Not started"}{c.next ? ` · next ${c.next}` : ""}</p><div className="my-3 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-[#0294ce]" style={{ width: `${c.progress}%` }} /></div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><Chip tone={T(c.state)}>{c.state}</Chip><span className="text-[12px] text-slate-600">{c.driver}</span></div></div>)}</div>{!x.items.length && <p className="py-10 text-center text-sm text-slate-400">No active routes.</p>}</div>;
  }
  const all = tp.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length;
  return <div className="space-y-5" data-report><ErrorBanner message={tp.error} />{tiles([["Trips", all.length, "All records"], ["Completed", n("Completed"), `${pct(n("Completed"), all.length)} of shown`], ["Delayed", n("Delayed"), `${pct(n("Delayed"), all.length)} of shown`]])}
    <ListPanel title="Trips" noun="trips" search={search} onSearch={setSearch} exportName="trip-history" head={["Trip", "Route", "Vehicle", "Type", "Started", "Ended", "Distance", "Date", "Status"]} exportRows={rows.map((i) => [i.code, i.route, i.vehicle, i.ttype, i.started, i.ended, `${i.distance_km} km`, day(i.trip_on), i.status])}
      tableHead={["Trip", "Route", "Vehicle", "Type", "Started", "Ended", "Distance", "Date", "Status", ""]} empty={tp.loading ? "Loading…" : "No trips yet. Trips are recorded from the Driver App."}
      rows={rows.map((i) => [i.code, i.route, i.vehicle, i.ttype, i.started || "—", i.ended || "—", `${i.distance_km} km`, day(i.trip_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <p className="text-xs text-slate-500">Max speed isn&apos;t shown because no GPS device reports it.</p>
    <Modal open={!!view} title={view?.code ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Route" v={view.route} /><Row k="Vehicle" v={view.vehicle} /><Row k="Type" v={view.ttype} /><Row k="Started" v={view.started || "—"} /><Row k="Ended" v={view.ended || "—"} /><Row k="Distance" v={`${view.distance_km} km`} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal></div>;
}

// ═════════════ maintenance ═════════════
interface Mt { id: string; vehicle: string; mtype: string; details: string; vendor: string; due_on: string; cost: number; status: string }
export function MaintenancePages({ tab }: { tab: "service-schedule" | "repairs" | "insurance" }) {
  const type = { "service-schedule": "Service schedule", repairs: "Repairs", insurance: "Insurance" }[tab];
  const m = useLoad(() => schoolFetch<{ vehicles: { id: string; reg_no: string }[]; items: Mt[] }>(`${X}/maintenance?type=${encodeURIComponent(type)}`), [type]);
  const act = useAction(() => m.reload());
  const [search, setSearch] = useState(""); const [view, setView] = useState<Mt | null>(null); const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ vehicle_id: "", details: "", vendor: "", due_on: nowIst(), cost: "" });
  const all = m.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length;
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${X}/maintenance`, json("POST", { vehicle_id: f.vehicle_id || m.data?.vehicles[0]?.id, mtype: type, details: f.details, vendor: f.vendor, due_on: f.due_on, cost: Number(f.cost) || 0 })))) { setAdding(false); setF({ ...f, details: "", vendor: "", cost: "" }); } };
  const set = (status: string) => void act.run(() => schoolFetch(`${X}/maintenance/${view!.id}`, json("PATCH", { status }))).then((ok) => ok && setView(null));
  return <div className="space-y-5" data-report><ErrorBanner message={m.error || act.error} />{tiles([["Vehicle maintenance", all.length, "All records"], ...(["Scheduled", "In progress", "Done"] as const).filter((s) => n(s) || s === (tab === "repairs" ? "In progress" : "Scheduled")).map((s): [string, number, string] => [s, n(s), `${pct(n(s), all.length)} of shown`])])}
    <ListPanel title="Vehicle maintenance" noun="jobs" search={search} onSearch={setSearch} exportName={tab} head={["Vehicle", "Type", "Details", "Vendor", "Due / done", "Cost", "Status"]} exportRows={rows.map((i) => [i.vehicle, i.mtype, i.details, i.vendor, day(i.due_on), i.cost, i.status])}
      extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add job</button>} tableHead={["Vehicle", "Type", "Details", "Vendor", "Due / done", "Cost", "Status", ""]} empty={m.loading ? "Loading…" : "No jobs yet."}
      rows={rows.map((i) => [<b key="v" className="font-semibold text-slate-900">{i.vehicle}</b>, i.mtype, i.details || "—", i.vendor || "—", day(i.due_on), <span key="c" className="block text-right">{inr(i.cost)}</span>, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="d" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view ? `${view.vehicle} · ${view.mtype}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Details" v={view.details || "—"} /><Row k="Vendor" v={view.vendor || "—"} /><Row k="Due / done" v={day(view.due_on)} /><Row k="Cost" v={inr(view.cost)} /><Row k="Status" v={view.status} /></dl>
      <Foot close={() => setView(null)} left={<>{view.status === "Scheduled" && <button type="button" className={small} disabled={act.busy} onClick={() => set("In progress")}>Start</button>}{view.status !== "Done" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => set("Done")}>Mark done</button>}</>} /></>}</Modal>
    <Modal open={adding} title={`Add · ${type}`} onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Vehicle"><select className={inputCls} value={f.vehicle_id || m.data?.vehicles[0]?.id || ""} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })}>{m.data?.vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_no}</option>)}</select></Field><Field label="Details"><input className={inputCls} maxLength={200} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field><div className="grid grid-cols-3 gap-3"><Field label="Vendor"><input className={inputCls} maxLength={100} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field><Field label="Due on"><input type="date" required className={inputCls} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field><Field label="Cost (₹)"><input type="number" min={0} className={inputCls} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field></div><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal></div>;
}

// ═════════════ reports ═════════════
export function TransportReportPages({ tab }: { tab: "route-wise" | "vehicle-wise" | "student-wise" }) {
  const r = useLoad(() => (tab === "route-wise" ? schoolFetch<{ items: { area: string }[] }>(`${X}/routes`) : Promise.resolve(null)), [tab]);
  const v = useLoad(() => (tab === "vehicle-wise" ? schoolFetch<{ items: { vtype: string }[] }>(`${X}/vehicles`) : Promise.resolve(null)), [tab]);
  const a = useLoad(() => (tab === "student-wise" ? schoolFetch<{ items: { route: string; fee_term: number }[] }>(`${X}/allocations`) : Promise.resolve(null)), [tab]);
  const count = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((p, q) => q[1] - p[1]) as [string, number][]; };
  const fee = (() => { const m = new Map<string, number>(); for (const x of a.data?.items ?? []) m.set(x.route, (m.get(x.route) ?? 0) + x.fee_term); return [...m.entries()].sort((p, q) => q[1] - p[1]) as [string, number][]; })();
  return <div className="space-y-5"><ErrorBanner message={r.error || v.error || a.error} />
    {tab === "route-wise" && <Panel title="Area" sub="Count by area"><BarRows rows={count((r.data?.items ?? []).map((x) => x.area || "No area"))} /></Panel>}
    {tab === "vehicle-wise" && <Panel title="Type" sub="Count by type"><BarRows rows={count((v.data?.items ?? []).map((x) => x.vtype))} /></Panel>}
    {tab === "student-wise" && <Panel title="Route · bus fee / term" sub="Total by route"><BarRows rows={fee} format={inr} /></Panel>}
    {tab === "route-wise" ? <RoutePages tab="route-list" /> : tab === "vehicle-wise" ? <VehiclePages tab="vehicle-list" /> : <StudentAllocationPages tab="assign-stop" />}</div>;
}

// ═════════════ settings ═════════════
interface St { options: { seats_rule: string[]; warn_pct: number[]; stop_change: string[] }; seats_rule: string; standing: boolean; warn_pct: number; waitlist: boolean; n_10min: boolean; n_delay: boolean; n_board: boolean; n_speed: boolean; max_trip_min: number; pickup_window: string; female_attendant: boolean; stop_change: string }
export function TransportSettingsPages({ tab }: { tab: "capacity" | "notifications" | "route-rules" }) {
  const l = useLoad(() => schoolFetch<St>(`${X}/settings`), []); const act = useAction(() => l.reload());
  const [d, setD] = useState<Partial<St>>({}); const [msg, setMsg] = useState(""); const c = l.data; if (!c) return <Loading e={l.error} />;
  const v = <K extends keyof St>(k: K) => (d[k] ?? c[k]) as St[K];
  const save = async () => { setMsg(""); const { options, ...cur } = c; void options; if (await act.run(() => schoolFetch(`${X}/settings`, json("PUT", { ...cur, ...d })))) { setD({}); setMsg("Saved."); } };
  const tg = (k: "standing" | "waitlist" | "n_10min" | "n_delay" | "n_board" | "n_speed" | "female_attendant", t: string, h?: string) => <Sw key={k} title={t} hint={h}><Toggle checked={v(k)} onChange={(x) => setD({ ...d, [k]: x })} label={t} /></Sw>;
  const sel = "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px]";
  const body = tab === "capacity" ? <><Sw title="Seats per bus"><select aria-label="Seats per bus" className={sel} value={v("seats_rule")} onChange={(e) => setD({ ...d, seats_rule: e.target.value })}>{c.options.seats_rule.map((o) => <option key={o}>{o}</option>)}</select></Sw>{tg("standing", "Allow standing")}<Sw title="Warn when a route is"><select aria-label="Warn when a route is" className={sel} value={v("warn_pct")} onChange={(e) => setD({ ...d, warn_pct: Number(e.target.value) })}>{c.options.warn_pct.map((o) => <option key={o} value={o}>{o}% full</option>)}</select></Sw>{tg("waitlist", "Wait-list when full")}</>
    : tab === "notifications" ? <>{tg("n_10min", "Bus is 10 minutes away", "App notification to parents")}{tg("n_delay", "Bus delayed by more than 10 minutes", "SMS and app")}{tg("n_board", "Student boarded / dropped", "Needs RFID cards")}{tg("n_speed", "Over-speed alert to the transport manager", "Above 50 km/h")}</>
    : <><Sw title="Maximum trip time"><span className="flex items-center gap-2"><input type="number" min={10} max={300} aria-label="Maximum trip time" className="w-20 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px]" value={v("max_trip_min")} onChange={(e) => setD({ ...d, max_trip_min: Number(e.target.value) })} /><span className="text-[12px] text-slate-500">minutes</span></span></Sw><Sw title="Pickup window" hint="First to last stop"><input aria-label="Pickup window" className="w-40 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px]" maxLength={30} value={v("pickup_window")} onChange={(e) => setD({ ...d, pickup_window: e.target.value })} /></Sw>{tg("female_attendant", "A female attendant on every bus")}<Sw title="Change of stop needs"><select aria-label="Change of stop needs" className={sel} value={v("stop_change")} onChange={(e) => setD({ ...d, stop_change: e.target.value })}>{c.options.stop_change.map((o) => <option key={o}>{o}</option>)}</select></Sw></>;
  return <div>{msg && okBox(msg)}<ErrorBanner message={l.error || act.error} /><div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{{ capacity: "Capacity", notifications: "Notifications", "route-rules": "Route rules" }[tab]}</h2></div>{body}<div className="flex justify-end gap-2.5 px-5 py-3.5"><button type="button" className={btnGhost} onClick={() => { setD({}); setMsg(""); }}>Discard</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save</button></div></div>
    <p className="mt-3 text-xs text-slate-500">These are saved for the school. Only the bus-arrival alert to parents (from the Driver App) is sent today; the rest don&apos;t change behaviour yet.</p></div>;
}

// ═════════════ driver app ═════════════
export function DriverAppPage() {
  const [pick, setPick] = useState("");
  const rs = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${X}/routes`), []);
  const id = pick || rs.data?.items[0]?.id || "";
  const d = useLoad(() => (id ? schoolFetch<{ routes: { id: string; name: string }[]; route: string; type: string; driver: string; vehicle: string; trip: { id: string; status: string } | null; school_due: string; stops: { id: string; name: string; due: string; students: number; arrived: boolean }[]; alerts: { id: string; stop_name: string; families: number; at: string }[] }>(`${X}/driver-trip/${id}`) : Promise.resolve(null)), [id]);
  const act = useAction(() => d.reload()); const [msg, setMsg] = useState(""); const x = d.data;
  const nextStop = x?.stops.find((s) => !s.arrived);
  const arrive = (sid: string) => { let t = ""; void act.run(async () => { const r = await schoolFetch<{ families: number }>(`${X}/trips/${x!.trip!.id}/arrive`, json("POST", { stop_id: sid })); t = `${r.families} families were told the bus has arrived.`; }).then((ok) => ok && setMsg(t)); };
  return <div className="space-y-5"><ErrorBanner message={rs.error || d.error || act.error} />{okBox(msg)}
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Route<select aria-label="Route" value={id} onChange={(e) => { setPick(e.target.value); setMsg(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{rs.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>
    {!x ? <p className="py-10 text-center text-sm text-slate-400">{d.loading ? "Loading…" : "No routes yet."}</p> : <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="rounded-[28px] border-[6px] border-[#1d2b3a] bg-white p-4"><p className="text-[14px] font-semibold text-slate-900">{x.route} · {x.type}</p><p className="mb-3 text-[12px] text-slate-500">{x.driver || "No driver assigned"} · {x.vehicle || "no vehicle"}</p>
        {!x.trip && <button type="button" className={`${primaryCls} mb-3 w-full !py-2`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${X}/trips/start/${x.routes.length ? id : id}`, json("POST", {})))}>Start the trip</button>}
        <ul className="space-y-2">{x.stops.map((s) => <li key={s.id} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${s.arrived ? "border-[#bfe3d5] bg-[#eef8f3]" : s.id === nextStop?.id ? "border-[#026f9b] bg-[#f3f9fd]" : "border-slate-200"}`}><span><b className="block text-[13px] text-slate-900">{s.name}</b><span className="text-[11px] text-slate-500">Due {s.due || "—"} · {s.students} students</span></span>{s.arrived ? <span className="text-xs text-[#065740]">✓ Arrived</span> : s.id === nextStop?.id && x.trip?.status === "Running" ? <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => arrive(s.id)}>Arrived</button> : null}</li>)}
          <li className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]"><b>School gate</b><span className="block text-[11px] text-slate-500">Due {x.school_due || "—"}</span></li></ul>
        <p className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-center text-[12px] text-slate-600">SOS · alert school (not connected yet)</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Alerts sent to parents <span className="ml-1 text-xs font-normal text-slate-500">Today</span></h2></div>
        <ul>{x.alerts.map((a) => <li key={a.id} className="border-b border-slate-100 px-5 py-3 text-[13px] last:border-b-0"><b>{a.stop_name}</b> · {a.families} families told <span className="text-[11px] text-slate-500">at {new Date(a.at).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}</span></li>)}{!x.alerts.length && <li className="px-5 py-8 text-center text-sm text-slate-400">No alerts yet today. Tap Arrived at each stop and the families waiting there get a message.</li>}</ul></div></div>}</div>;
}

// ═════════════ route planner ═════════════
export function RoutePlannerPage() {
  const [p, setP] = useState({ seats: "48", longest: "50", walk: "500" }); const [q, setQ] = useState({ seats: "48", longest: "50" });
  const d = useLoad(() => schoolFetch<{ students: number; buses: number; km_day: number; longest: number; average: number; items: { name: string; area: string; stops: number; students: number; have: number; buses: number; ride: number; note: string; ok: boolean }[] }>(`${X}/planner?seats=${q.seats}&longest=${q.longest}`), [q.seats, q.longest]);
  const x = d.data; const sel = (k: "seats" | "longest" | "walk", t: string, opts: number[]) => <Field label={t}><select className={inputCls} value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select></Field>;
  return <div className="space-y-5"><ErrorBanner message={d.error} /><p className="text-[13px] text-slate-600">Checks each route against your seats and longest-ride limits, using the students on transport. It can&apos;t draw new routes: homes have no map locations yet.</p>
    <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Planning rules <span className="ml-1 text-xs font-normal text-slate-500">{x?.students ?? 0} students who use the bus</span></h2></div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">{sel("seats", "Seats per bus", [13, 17, 24, 26, 40, 48])}{sel("longest", "Longest ride (minutes)", [30, 40, 50, 60, 75, 90])}{sel("walk", "Walk to the stop (metres)", [250, 500, 750, 1000])}</div>
      <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={btnPrimary} onClick={() => setQ({ seats: p.seats, longest: p.longest })}>Plan routes</button></div></div>
    {tiles([["Buses needed", x?.buses ?? 0], ["Km a day", x?.km_day ?? 0, "4 trips on every route"], ["Longest ride", `${x?.longest ?? 0} min`], ["Average ride", `${x?.average ?? 0} min`]])}
    <ListPanel title="Routes" noun="routes" hideSearch search="" onSearch={() => undefined} exportName="route-plan" head={["Route", "Areas", "Stops", "Students", "Seats", "Ride", "Check"]} exportRows={(x?.items ?? []).map((i) => [i.name, i.area, i.stops, i.students, i.have || i.buses * Number(q.seats), `${i.ride} min`, i.note])}
      tableHead={["Route", "Areas", "Stops", "Students", "Seats", "Ride", "Check"]} empty={d.loading ? "Loading…" : "No routes yet."} rows={(x?.items ?? []).map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.area || "—", i.stops, `${i.students} / ${i.have || Number(q.seats)}`, i.have || "—", `${i.ride} min`, <Chip key="c" tone={i.ok ? "good" : "bad"}>{i.note}</Chip>])} /></div>;
}

// ═════════════ bus attendance ═════════════
export function BusAttendancePages({ tab }: { tab: "trip-roster" | "missed-boardings" }) {
  const rs = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${X}/routes`), []);
  const [pick, setPick] = useState(""); const [type, setType] = useState("Morning"); const id = pick || rs.data?.items[0]?.id || "";
  const ro = useLoad(() => (tab === "trip-roster" && id ? schoolFetch<{ route: string; trip: { status: string; started: string; ended: string } | null; expected: number; boarded: number; by_attendant: number; missing: number; stops: { id: string; name: string; time: string; students: { id: string; name: string; class_label: string; status: string; at: string | null }[] }[] }>(`${X}/roster/${id}?type=${type}`) : Promise.resolve(null)), [tab, id, type]);
  const ms = useLoad(() => (tab === "missed-boardings" ? schoolFetch<{ items: { student_id: string; student: string; class_label: string; trip: string; stop: string; status: string; resolution: string }[] }>(`${X}/missed`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => ro.reload()); const [search, setSearch] = useState("");
  if (tab === "missed-boardings") { const rows = (ms.data?.items ?? []).filter((i) => has(i, search)); return <div data-report><ErrorBanner message={ms.error} /><ListPanel title="Missed boardings today" noun="students" search={search} onSearch={setSearch} exportName="missed-boardings" head={["Student", "Class", "Trip", "Stop", "Status", "Resolution"]} exportRows={rows.map((i) => [i.student, i.class_label, i.trip, i.stop, i.status, i.resolution])} tableHead={["Student", "Class", "Trip", "Stop", "Status", "Resolution"]} empty={ms.loading ? "Loading…" : "Nobody missed the bus today."} rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.student}</b>, i.class_label, i.trip, i.stop, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.resolution])} /></div>; }
  const x = ro.data; const mark = (sid: string, status: string) => void act.run(() => schoolFetch(`${X}/boardings`, json("POST", { student_id: sid, ttype: type, status })));
  return <div className="space-y-5"><ErrorBanner message={rs.error || ro.error || act.error} />
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Route<select aria-label="Route" value={id} onChange={(e) => setPick(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{rs.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{["Morning", "Afternoon"].map((t) => <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full border px-3.5 py-1 text-[13px] ${type === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{t}</button>)}</div>
    {!x ? <p className="py-10 text-center text-sm text-slate-400">{ro.loading ? "Loading…" : "No routes yet."}</p> : <>
      {tiles([["Expected", x.expected, `${x.route} · ${type.toLowerCase()}`], ["Boarded", x.boarded, "Total"], ["Marked by attendant", x.by_attendant, "No card or card not read"], ["Didn't board", x.missing, "Missing or absent"]])}
      <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{type} trip <span className="ml-1 text-xs font-normal text-slate-500">{x.trip ? `${x.trip.status}${x.trip.started ? ` · started ${x.trip.started}` : ""}${x.trip.ended ? ` · ended ${x.trip.ended}` : ""}` : "not started"}</span></h2></div>
        <div className="space-y-4 p-5">{x.stops.map((s) => <div key={s.id} className="border-l-2 border-slate-200 pl-4"><p className="mb-1 text-[13px] font-semibold text-slate-900">{s.name} <span className="font-normal text-slate-500">{s.time}</span></p>{s.students.map((k) => <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-200 py-1.5 text-[13px]"><span><b>{k.name}</b> <span className="text-slate-500">{k.class_label}</span></span><span className="flex items-center gap-1.5">{k.status === "Expected" || k.status.startsWith("Missing") || k.status.startsWith("Absent") ? <>{k.status !== "Expected" && <Chip tone={T(k.status)}>{k.status}</Chip>}<button type="button" className={small} disabled={act.busy} onClick={() => mark(k.id, "Boarded, no card")}>Mark boarded (no card)</button>{k.status === "Expected" && <><button type="button" className={small} disabled={act.busy} onClick={() => mark(k.id, "Missing at stop")}>Missing at stop</button><button type="button" className={small} disabled={act.busy} onClick={() => mark(k.id, "Absent, parent told")}>Absent, parent told</button></>}</> : <Chip tone={T(k.status)}>{k.status}</Chip>}</span></div>)}{!s.students.length && <p className="text-[12px] text-slate-400">No students at this stop.</p>}</div>)}{!x.stops.length && <p className="text-sm text-slate-400">No stops on this route.</p>}</div></div>
      <p className="text-xs text-slate-500">RFID taps aren&apos;t connected to transport yet, so the attendant marks each student. Marking someone missing or absent sends the parent a message.</p></>}</div>;
}
