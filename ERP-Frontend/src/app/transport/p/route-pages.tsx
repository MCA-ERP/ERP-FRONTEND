"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading } from "../../teacher/t/dash-pages";
import { name, pill } from "../../hr/h/ui";
import { StepStrip } from "./strip";
import { Bar, Done, Filtered, L, Note, PillSelect, select } from "./ui";

interface Book { routes: { id: string; name: string; area: string; stops: number; distance_km: number; students: number; vehicle: string; status: string }[]; stops: { id: string; route: string; number: number; name: string; children: number | null }[]; next_name: string }
const useBook = () => useLoad(() => schoolFetch<Book>("/transport/routes"), []);

function RouteList({ go }: { go: (tab: string, extra?: Record<string, string>) => void }) {
  const { data: x, error, loading, reload } = useBook();
  const act = useAction(reload);
  return (
    <div data-report>
      <Head title="Routes" subtitle="Each route with its stops, distance and students." />
      <StepStrip active="routes" />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Routes" noun="routes" exportName="routes" empty="No routes yet. Create one under Add Route." head={["Route", "Stops", "Distance", "Students", "Vehicle", ""]}
        rows={x.routes.map((r) => ({ key: r.id, find: `${r.name} ${r.area} ${r.vehicle}`, out: [`${r.name} ${r.area}`, r.stops, `${r.distance_km} km`, r.students, r.vehicle], cells: [
          <span key="n">{name(r.name, r.area || undefined)}{r.status !== "Active" && <span className="ml-1.5"><Chip tone="mute">Not in use</Chip></span>}</span>, r.stops, `${r.distance_km} km`, r.students, r.vehicle || "—",
          r.status === "Active" ? <button key="s" type="button" className={pill} onClick={() => go("stops", { route: r.name })}>Stops</button> : <button key="a" type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/transport/routes/${r.id}/activate`, json("POST", {})))}>Put into use</button>,
        ] }))} />}
    </div>
  );
}

function Stops({ route }: { route?: string }) {
  const { data: x, error, loading } = useBook();
  const [pick, setPick] = useState(route ?? "");
  return (
    <div data-report>
      <Head title="Stops" subtitle="Every stop in pickup order, with the number of children who board there." />
      <StepStrip active="routes" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Stops" noun="stops" exportName="stops" empty="No stops yet." head={["Route", "#", "Stop", "Children"]}
        filter={<select aria-label="Route" className={select} value={pick} onChange={(e) => setPick(e.target.value)}><option value="">All routes</option>{x.routes.filter((r) => r.status === "Active").map((r) => <option key={r.id}>{r.name}</option>)}</select>}
        rows={x.stops.filter((s) => !pick || s.route === pick).map((s) => ({ key: s.id, find: `${s.route} ${s.name}`, out: [s.route, s.number, s.name, s.children ?? ""], cells: [<b key="r" className="font-semibold text-slate-900">{s.route}</b>, s.number, s.name, s.children ?? "—"] }))} />}
    </div>
  );
}

const startRows = () => [0, 8, 16, 24].map((m) => ({ name: "", minutes: String(m) }));
function AddRoute({ go }: { go: (tab: string) => void }) {
  const { data: x, error, reload } = useBook();
  const [f, setF] = useState({ name: "", area: "", distance: "" });
  const [stops, setStops] = useState(startRows);
  const [done, setDone] = useState("");
  const act = useAction(reload);
  const next = x?.next_name ?? "Route 1";
  const setStop = (i: number, k: "name" | "minutes", v: string) => {
    const list = stops.map((s, n) => (n === i ? { ...s, [k]: v } : s));
    // a fresh row appears once the last one is being filled
    if (k === "name" && v && i === list.length - 1 && list.length < 60) list.push({ name: "", minutes: String(Number(list[i].minutes || 0) + 8) });
    setStops(list);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    const label = f.name.trim() || next;
    if (await act.run(() => schoolFetch("/transport/routes", json("POST", { name: label, area: f.area, distance_km: Number(f.distance) || 0, stops: stops.filter((s) => s.name.trim()).map((s) => ({ name: s.name, minutes: Number(s.minutes) || 0 })) })))) { setF({ name: "", area: "", distance: "" }); setStops(startRows()); setDone(`${label} created. Set its start, arrival and departure under Route Timings, then give it a vehicle.`); }
  };
  return (
    <div>
      <Head title="Add Route" subtitle="Create a route and list its stops in pickup order. Minutes are from the first stop; the last stop is the school." />
      <StepStrip active="routes" />
      <ErrorBanner message={error} />
      <Done text={done} />
      {done && <p className="mb-4 text-[12.5px]"><button type="button" className="font-semibold text-[#026f9b] underline" onClick={() => go("routes")}>See the routes</button></p>}
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New route</h2></div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <L label="Route name"><input className={inputCls} maxLength={60} placeholder={next} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
          <L label="Area"><input className={inputCls} maxLength={100} placeholder="For example, Kokapet – Gandipet" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></L>
          <L label="Distance (km)"><input type="number" required min={0} max={500} className={inputCls} value={f.distance} onChange={(e) => setF({ ...f, distance: e.target.value })} /></L>
        </div>
        <div className="flex items-baseline gap-2 border-y border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Stops</h2><span className="text-xs text-slate-500">Name · minutes from first stop</span></div>
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {stops.flatMap((s, i) => [
              <L key={`n${i}`} label={`Stop ${i + 1}`}><input className={inputCls} required={i === 0} minLength={2} maxLength={100} placeholder={i === 0 ? "First pickup stop" : ""} value={s.name} onChange={(e) => setStop(i, "name", e.target.value)} /></L>,
              <L key={`m${i}`} label="Minutes"><input type="number" min={0} max={300} className={inputCls} value={s.minutes} onChange={(e) => setStop(i, "minutes", e.target.value)} /></L>,
            ])}
          </div>
          <p className="mt-3 text-[12px] text-slate-500">School (main gate) is added as the last stop automatically.</p>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Create route"}</button></div>
      </form>
    </div>
  );
}

// ═════════════ step 4: timings ═════════════
interface Timing { id: string; name: string; area: string; start: string; at_school: string; departure: string; last_drop: string; stops: { id: string; name: string; pickup: string; drop: string }[] }
interface Times { starts: string; reach_by: string; routes: Timing[] }
const useTimes = () => useLoad(() => schoolFetch<Times>("/transport/timings"), []);

function Timetable() {
  const { data: x, error, loading, reload } = useTimes();
  const act = useAction(reload);
  const [edit, setEdit] = useState<Timing | null>(null);
  const [f, setF] = useState({ start: "", at_school: "", departure: "" });
  const save = async (e: FormEvent) => { e.preventDefault(); if (edit && (await act.run(() => schoolFetch(`/transport/timings/${edit.id}`, json("PUT", f))))) setEdit(null); };
  return (
    <div data-report>
      <Head title="Timetable" subtitle="Morning pickup start, arrival at school and afternoon departure for every route. Stop times move with the route." />
      <StepStrip active="timings" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <Filtered title="Route timings" noun="routes" exportName="route-timings" empty="No routes yet." head={["Route", "Morning start", "At school", "School departure", "Last drop", ""]}
          rows={x.routes.map((r) => ({ key: r.id, find: r.name, out: [r.name, r.start, r.at_school, r.departure, r.last_drop], cells: [
            <b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.start || "—", r.at_school || "—", r.departure || "—", r.last_drop || "—",
            <button key="e" type="button" className={pill} onClick={() => { setEdit(r); setF({ start: r.start, at_school: r.at_school, departure: r.departure }); }}>Edit</button>,
          ] }))} />
        {x.starts && <Note>School starts at {x.starts}. Every route must reach school by {x.reach_by}.</Note>}
      </div>}
      <Modal open={!!edit} title={edit ? `Timings · ${edit.name}` : ""} onClose={() => setEdit(null)}>
        {edit && <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid gap-3 sm:grid-cols-3">
            <L label="Morning start"><input type="time" required className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></L>
            <L label="At school"><input type="time" required className={inputCls} value={f.at_school} onChange={(e) => setF({ ...f, at_school: e.target.value })} /></L>
            <L label="School departure"><input type="time" required className={inputCls} value={f.departure} onChange={(e) => setF({ ...f, departure: e.target.value })} /></L>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setEdit(null)}>Close</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button></div>
        </form>}
      </Modal>
    </div>
  );
}

function StopTimings() {
  const { data: x, error, loading } = useTimes();
  const [pick, setPick] = useState("");
  const r = x?.routes.find((y) => y.id === pick) ?? x?.routes[0];
  return (
    <div data-report>
      <Head title="Stop Timings" subtitle="Pickup and drop time at each stop. Parents see these times." />
      <StepStrip active="timings" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (!r ? <p className="py-10 text-center text-sm text-slate-400">No routes yet.</p> : <div className="space-y-4">
        <Bar><PillSelect label="Route" value={r.id} onChange={setPick}>{x.routes.map((y) => <option key={y.id} value={y.id}>{y.area ? `${y.name} · ${y.area}` : y.name}</option>)}</PillSelect></Bar>
        <Filtered key={r.id} search={false} title={`${r.name} · stop timings`} noun="stops" exportName="stop-timings" empty="No stops on this route." head={["Stop", "Morning pickup", "Afternoon drop"]}
          rows={r.stops.map((s) => ({ key: s.id, find: s.name, out: [s.name, s.pickup, s.drop], cells: [s.name, s.pickup || "—", s.drop || "—"] }))} />
      </div>)}
    </div>
  );
}

export function RoutePage({ tab, go, route }: { tab: "routes" | "stops" | "add-route" | "timetable" | "stop-timings"; go: (tab: string, extra?: Record<string, string>) => void; route?: string }) {
  if (tab === "routes") return <RouteList go={go} />;
  if (tab === "stops") return <Stops key={route ?? ""} route={route} />;
  if (tab === "add-route") return <AddRoute go={go} />;
  return tab === "timetable" ? <Timetable /> : <StopTimings />;
}
