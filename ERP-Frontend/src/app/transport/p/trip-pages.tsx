"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Empty, Loading, day } from "../../teacher/t/dash-pages";
import { Tile, Tiles, name, pill, solid } from "../../hr/h/ui";
import { useTransport } from "../context";
import { StepStrip } from "./strip";
import { Bar, Filtered, L, Note, PillSelect, select } from "./ui";

export interface Node { id: string | null; name: string; due: string; done: boolean; students: number | null }
export interface Run { id: string; route: string; vehicle: string; reg_no: string; driver: string; trip_id: string; state: string; late: number; running: boolean; started: string; stops: Node[]; last: string; next_id: string; next: string; next_due: string; on_board: number }
interface Board { type: "Morning" | "Afternoon"; now: string; routes: Run[]; on_road: number; completed: number; delayed: number; on_board: number }
const tone = (s: string) => (s === "Completed" ? "good" : s === "Delayed" || s === "In progress" ? "warn" : "mute") as "good" | "warn" | "mute";
const runName = (t: string) => (t === "Morning" ? "morning pickup" : "afternoon drop");
/** Load again every 30 seconds while the page is open. */
function useTick() { const [n, setN] = useState(0); useEffect(() => { const t = setInterval(() => setN((x) => x + 1), 30_000); return () => clearInterval(t); }, []); return n; }

/** The route as a line of stops, with the bus between the last stop reached and the next one. */
export function Track({ run }: { run: Run }) {
  const n = run.stops.length;
  if (!n) return <Empty text="This route has no stops yet." />;
  const W = Math.max(640, n * 96), H = 190;
  const at = (i: number) => ({ x: 50 + (n === 1 ? 0 : (i * (W - 100)) / (n - 1)), y: i % 2 ? 62 : 128 });
  let reached = -1; run.stops.forEach((s, i) => { if (s.done) reached = i; });
  const a = at(Math.max(0, reached)); const b = at(Math.min(n - 1, Math.max(0, reached) + 1));
  const bus = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <div className="overflow-x-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${run.route}: ${run.last ? `last stop ${run.last}` : "not started"}${run.next ? `, next ${run.next}` : ""}`} className="mx-auto w-full max-w-3xl rounded-xl bg-[#eef6fc]">
        <polyline points={run.stops.map((_, i) => `${at(i).x},${at(i).y}`).join(" ")} fill="none" stroke="#bfe0f1" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {run.stops.map((s, i) => { const p = at(i); return <g key={`${s.id ?? "school"}-${i}`}><circle cx={p.x} cy={p.y} r={8} fill={s.done ? "#0b7a57" : "#fff"} stroke={s.done ? "#0b7a57" : "#7aa7c4"} strokeWidth={2.5}><title>{`${s.name}${s.due ? ` · ${s.due}` : ""}`}</title></circle><text x={p.x} y={i % 2 ? p.y - 18 : p.y + 26} textAnchor="middle" fontSize={11} fill="#475569">{s.name.length > 20 ? `${s.name.slice(0, 19)}…` : s.name}</text></g>; })}
        {run.running && <g><line x1={bus.x} y1={bus.y - 24} x2={bus.x} y2={bus.y} stroke="#0294CE" strokeWidth={2} /><rect x={bus.x - 28} y={bus.y - 42} width={56} height={20} rx={5} fill="#0294CE" /><text x={bus.x} y={bus.y - 28} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{(run.vehicle || "Bus").slice(0, 8)}</text><circle cx={bus.x} cy={bus.y} r={5} fill="#0294CE" /></g>}
      </svg>
    </div>
  );
}

// ═════════════ step 7: live trips ═════════════
function LiveTrips() {
  const { refreshBadges } = useTransport();
  const tick = useTick();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Board>("/transport/live"), [tick]);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [pick, setPick] = useState(""); const [delay, setDelay] = useState(false); const [f, setF] = useState({ minutes: "", note: "" }); const [done, setDone] = useState("");
  const run = x?.routes.find((r) => r.id === pick) ?? x?.routes.find((r) => r.state === "Delayed") ?? x?.routes.find((r) => r.running) ?? x?.routes[0];
  const start = () => run && void act.run(() => schoolFetch(`/school/tr/trips/start/${run.id}`, json("POST", {})));
  const reach = () => run && void act.run(() => schoolFetch(`/school/tr/trips/${run.trip_id}/arrive`, json("POST", { stop_id: run.next_id })));
  const send = async (e: FormEvent) => { e.preventDefault(); if (!run) return; let n = 0; if (await act.run(async () => { n = (await schoolFetch<{ families: number }>(`/transport/trips/${run.trip_id}/delay`, json("POST", { minutes: Number(f.minutes), note: f.note || undefined }))).families; })) { setDelay(false); setF({ minutes: "", note: "" }); setDone(`Delay recorded. ${n} families told.`); } };
  return (
    <div data-report>
      <Head title="Live Trips" subtitle={x ? `${x.type === "Morning" ? "Morning pickup" : "Afternoon drop"} trips right now (${x.now}). Pick a route to follow its bus.` : "Pick a route to follow its bus."} />
      <StepStrip active="tracking" />
      <ErrorBanner message={error || (delay ? "" : act.error)} />
      {done && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">{done}</p>}
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Tiles>
          <Tile label="On the road" value={x.on_road} sub={x.type === "Morning" ? "Morning pickup" : "Afternoon drop"} />
          <Tile tone="green" label="Completed" value={x.completed} sub={`Of ${x.routes.length} trips`} />
          <Tile tone="amber" label="Delayed" value={x.delayed} sub="10+ minutes late" />
          <Tile label="Children on board" value={x.on_board} sub={x.type === "Morning" ? "On the way to school" : "Not yet dropped"} />
        </Tiles>
        {!run ? <Panel title="All trips"><Empty text="No active routes yet." /></Panel> : <>
          <Bar>
            <PillSelect label="Route" value={run.id} onChange={(v) => { setPick(v); setDone(""); }}>{x.routes.map((r) => <option key={r.id} value={r.id}>{r.route} · {r.state}</option>)}</PillSelect>
            <span className="ml-auto flex gap-2">
              {!run.trip_id && <button type="button" className={solid} disabled={act.busy} onClick={start}>Start trip</button>}
              {run.running && <button type="button" className={pill} onClick={() => { setDone(""); setDelay(true); }}>Report delay</button>}
              {run.running && run.next_id && <button type="button" className={solid} disabled={act.busy} onClick={reach}>Reached {run.next}</button>}
            </span>
          </Bar>
          <Panel title={`${run.route}${run.reg_no ? ` · ${run.reg_no}` : ""}`} sub={`${run.state}${run.late && run.running ? ` · ${run.late} min late` : ""}`}><Track run={run} /></Panel>
          <Filtered search={false} title={`All trips · ${runName(x.type)}`} noun="trips" exportName="live-trips" empty="No trips." head={["Route", "Vehicle", "Driver", "Last stop", "Next stop", "Status", ""]}
            rows={x.routes.map((r) => ({ key: r.id, find: r.route, out: [r.route, r.vehicle, r.driver, r.last, r.next ? `${r.next} ${r.next_due}` : "", `${r.state}${r.late && r.running ? ` +${r.late} min` : ""}`], cells: [
              <b key="r" className="font-semibold text-slate-900">{r.route}</b>, r.vehicle || "—", r.driver || "—", r.last || "—", r.next && r.running ? `${r.next} ${r.next_due}` : "—",
              <span key="s"><Chip tone={tone(r.state)}>{r.state}</Chip>{r.running && r.late > 0 && <span className="ml-1.5 text-[12px] text-slate-500">+{r.late} min</span>}</span>,
              <button key="f" type="button" className={pill} onClick={() => { setPick(r.id); setDone(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Follow</button>,
            ] }))} />
        </>}
      </div>}
      <Modal open={delay && !!run} title={run ? `Report delay · ${run.route}` : ""} onClose={() => setDelay(false)}>
        <form onSubmit={send} className="space-y-3">
          <ErrorBanner message={act.error} />
          <L label="Minutes late"><input type="number" required min={1} max={300} className={inputCls} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></L>
          <L label="Message to parents (optional)"><input className={inputCls} maxLength={200} placeholder="For example, heavy traffic" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></L>
          <p className="text-[12px] text-slate-500">Parents of the children still waiting are told in the parent app.</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setDelay(false)}>Close</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Send</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ vehicle status ═════════════
interface Status { id: string; name: string; reg_no: string; status: string; gps: string; next_service: string | null; service_state: string }
function VehicleStatus() {
  const { refreshBadges } = useTransport();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<{ items: Status[] }>("/transport/vehicle-status"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const set = (id: string, status: string) => void act.run(() => schoolFetch(`/school/tr/vehicles/${id}`, json("PATCH", { status })));
  return (
    <div data-report>
      <Head title="Vehicle Status" subtitle="Where each vehicle is, GPS, speed, fuel and the next service." />
      <StepStrip active="tracking" />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Filtered title="Vehicle status" noun="vehicles" exportName="vehicle-status" empty="No vehicles yet." head={["Vehicle", "Status", "GPS", "Speed", "Fuel", "Odometer", "Next service", ""]}
          rows={x.items.map((v) => ({ key: v.id, find: `${v.name} ${v.reg_no} ${v.status}`, out: [`${v.name} ${v.reg_no}`, v.status, v.gps, "", "", "", v.next_service ? day(v.next_service) : ""], cells: [
            name(v.name, v.reg_no === v.name ? undefined : v.reg_no), <Chip key="s" tone={v.status === "On trip" ? "good" : v.status === "At depot" ? "info" : v.status === "In maintenance" ? "warn" : "mute"}>{v.status}</Chip>, <Chip key="g" tone={v.gps === "On" ? "good" : "bad"}>{v.gps}</Chip>, "—", "—", "—",
            v.next_service ? <span key="n">{day(v.next_service)}{(v.service_state === "Expiring" || v.service_state === "Expired") && <span className="ml-1.5"><Chip tone={v.service_state === "Expired" ? "bad" : "warn"}>{v.service_state === "Expired" ? "Overdue" : "Expiring"}</Chip></span>}</span> : "—",
            v.status === "In maintenance" ? <button key="b" type="button" className={solid} disabled={act.busy} onClick={() => set(v.id, "Active")}>Back in service</button> : v.status === "Inactive" ? null : <button key="b" type="button" className={pill} disabled={act.busy} onClick={() => set(v.id, "In maintenance")}>Send for service</button>,
          ] }))} />
        <Note>Speed, fuel and odometer need a GPS feed, which is not connected. GPS shows the device setting on the vehicle record. Service dates come from the School Admin&apos;s maintenance schedule.</Note>
      </div>}
    </div>
  );
}

// ═════════════ trip log ═════════════
interface Logged { id: string; date: string; route: string; trip: string; started: string; ended: string; late: number; result: string }
function TripLog() {
  const { data: x, error, loading } = useLoad(() => schoolFetch<{ items: Logged[] }>("/transport/trip-log"), []);
  const [show, setShow] = useState("All");
  return (
    <div data-report>
      <Head title="Trip Log" subtitle="Completed trips with start and end times. A trip 10 or more minutes late counts as delayed." />
      <StepStrip active="tracking" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Trip log" noun="trips" exportName="trip-log" empty="No completed trips yet." head={["Date", "Route", "Trip", "Started", "Ended", "Result"]}
        filter={<select aria-label="Result" className={select} value={show} onChange={(e) => setShow(e.target.value)}>{["All", "On time", "Delayed"].map((s) => <option key={s}>{s}</option>)}</select>}
        rows={x.items.filter((t) => show === "All" || t.result === show).map((t) => ({ key: t.id, find: `${day(t.date)} ${t.route} ${t.trip} ${t.result}`, out: [day(t.date), t.route, t.trip, t.started, t.ended, `${t.result}${t.result === "Delayed" && t.late ? ` +${t.late} min` : ""}`], cells: [
          day(t.date), <b key="r" className="font-semibold text-slate-900">{t.route}</b>, t.trip, t.started || "—", t.ended || "—", <span key="s"><Chip tone={t.result === "Delayed" ? "warn" : "good"}>{t.result}</Chip>{t.result === "Delayed" && t.late > 0 && <span className="ml-1.5 text-[12px] text-slate-500">+{t.late} min</span>}</span>,
        ] }))} />}
    </div>
  );
}

// ═════════════ driver app ═════════════
interface Driver { type: string; routes: { id: string; name: string }[]; route: Run | null; alerts: { id: string; time: string; stop: string; families: number; message: string }[] }
function DriverApp() {
  const tick = useTick();
  const [pick, setPick] = useState("");
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Driver>(`/transport/driver${pick ? `?route_id=${pick}` : ""}`), [pick, tick]);
  const act = useAction(reload);
  const [sos, setSos] = useState(false); const [done, setDone] = useState("");
  const r = x?.route ?? null;
  const alert = async () => { if (!r) return; let code = ""; if (await act.run(async () => { code = (await schoolFetch<{ code: string }>("/transport/sos", json("POST", { route_id: r.id }))).code; })) { setSos(false); setDone(`The school was alerted (request ${code}). Call the school office as well.`); } };
  const gate = (s: Node) => s.id === null;
  return (
    <div>
      <Head title="Today’s Trip" subtitle={r ? `What the driver sees on ${r.route}${r.reg_no ? ` (${r.reg_no})` : ""}. Tapping Arrived at each stop alerts the parents waiting there and gives the next stop its arrival time.` : "What the driver sees on the route."} />
      <ErrorBanner message={error || (sos ? "" : act.error)} />
      {done && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">{done}</p>}
      <Loading on={loading && !x} />
      {x && (!r ? <p className="py-10 text-center text-sm text-slate-400">No active routes yet.</p> : <div className="grid items-start gap-8 lg:grid-cols-[18.5rem_1fr]">
        <div className="rounded-[28px] border-[7px] border-[#1d2b3a] bg-white p-3">
          <p className="flex items-center text-[13px] font-semibold text-slate-900"><select aria-label="Route" value={r.id} onChange={(e) => { setPick(e.target.value); setDone(""); }} className="cursor-pointer appearance-none bg-transparent font-semibold outline-none">{x.routes.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>&nbsp;· {x.type}</p>
          <p className="mb-2.5 text-[11.5px] text-slate-500">{r.driver || "No driver assigned"} · {r.reg_no || "no vehicle"}</p>
          {!r.trip_id && <button type="button" className={`${solid} mb-2.5 w-full !py-2`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/school/tr/trips/start/${r.id}`, json("POST", {})))}>Start the trip</button>}
          <ul className="space-y-2">{r.stops.map((s, i) => { const current = s.id !== null && s.id === r.next_id && r.running; return (
            <li key={`${s.id ?? "gate"}-${i}`} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${current ? "border-[#026f9b] bg-[#f3f9fd]" : "border-slate-200"}`}>
              <span className={s.done ? "opacity-60" : ""}><b className="block text-[12.5px] text-slate-900">{gate(s) ? "School gate" : s.name}</b><span className="text-[11px] text-slate-500">Due {s.due || "—"}{s.students !== null ? ` · ${s.students} students` : ""}</span></span>
              {s.done ? <Chip tone="good">Done</Chip> : current ? <button type="button" className={solid} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/school/tr/trips/${r.trip_id}/arrive`, json("POST", { stop_id: s.id })))}>Arrived</button> : null}
            </li>); })}</ul>
          <button type="button" className="mt-2.5 w-full rounded-full border border-slate-200 px-3 py-1.5 text-left text-[12px] text-slate-900 hover:border-[#e53a35]" onClick={() => { setDone(""); setSos(true); }}>SOS · alert school</button>
        </div>
        <Filtered search={false} title="Alerts sent to parents" noun="alerts" exportName="driver-alerts" empty="No alerts yet. Tap Arrived at each stop and the families waiting there get a message." head={["Time", "Stop", "Message"]}
          rows={x.alerts.map((a) => ({ key: a.id, find: a.stop, out: [a.time, a.stop, a.message], cells: [a.time, <b key="s" className="font-semibold text-slate-900">{a.stop}</b>, <span key="m" className="block whitespace-normal">{a.message}</span>] }))} />
      </div>)}
      <Modal open={sos} title="SOS · alert school" onClose={() => setSos(false)}>
        <ErrorBanner message={act.error} />
        <p className="text-[13px] text-slate-700">This sends a high-priority request to the School Admin for {r?.route}, with the driver and the last stop reached.</p>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setSos(false)}>Cancel</button><button type="button" className="rounded-full bg-[#e53a35] px-4 py-1.5 text-[13px] font-bold text-white hover:bg-[#ac2c28] disabled:opacity-60" disabled={act.busy} onClick={() => void alert()}>Alert the school</button></div>
      </Modal>
    </div>
  );
}

export function TripPage({ tab }: { tab: "live-trips" | "vehicle-status" | "trip-log" | "driver-app" }) {
  if (tab === "live-trips") return <LiveTrips />;
  if (tab === "vehicle-status") return <VehicleStatus />;
  return tab === "trip-log" ? <TripLog /> : <DriverApp />;
}
