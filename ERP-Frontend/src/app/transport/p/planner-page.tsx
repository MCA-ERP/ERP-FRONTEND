"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "../../teacher/t/head";
import { Empty, Loading } from "../../teacher/t/dash-pages";
import { Tiles, pill } from "../../hr/h/ui";
import { Done, FILE, Filtered, L, Note } from "./ui";

interface Pt { lat: number; lng: number }
interface Route { name: string; areas: string[]; students: number; ride: number; km: number; stops: (Pt & { name: string; area: string; homes: number })[] }
interface Data { upgraded: boolean; riders: number; located: number; school: Pt | null; homes: Pt[]; today: { buses: number; km_day: number; longest: number; average: number }; plan: { routes: Route[]; buses: number; km_day: number; longest: number; average: number } | null }
const COLORS = ["#2b7bbb", "#c0582b", "#27ae60", "#8e30c4", "#b8972b", "#b8266f", "#5fb82b", "#2bb8ae", "#3b2bc0", "#bb2b2b", "#0f766e", "#7c4a03"];
const colour = (i: number) => COLORS[i % COLORS.length];

/** Homes as small dots, stops as larger ones, each route a line ending at the school. */
function RouteMap({ school, homes, routes }: { school: Pt; homes: Pt[]; routes: Route[] }) {
  const all = [school, ...homes];
  const lats = all.map((p) => p.lat); const lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const shrink = Math.cos((school.lat * Math.PI) / 180);
  const W = 640, H = 560, pad = 40;
  const scale = Math.min((W - pad * 2) / Math.max(1e-6, (maxLng - minLng) * shrink), (H - pad * 2) / Math.max(1e-6, maxLat - minLat));
  const x = (p: Pt) => W / 2 + (p.lng - (minLng + maxLng) / 2) * shrink * scale;
  const y = (p: Pt) => H / 2 - (p.lat - (minLat + maxLat) / 2) * scale;
  const areas = new Map<string, Pt & { n: number }>();
  for (const r of routes) for (const s of r.stops) if (s.area) { const a = areas.get(s.area) ?? { lat: 0, lng: 0, n: 0 }; areas.set(s.area, { lat: (a.lat * a.n + s.lat) / (a.n + 1), lng: (a.lng * a.n + s.lng) / (a.n + 1), n: a.n + 1 }); }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the suggested routes" className="w-full rounded-xl bg-[#f8fafc]">
      {homes.map((h, i) => <circle key={i} cx={x(h)} cy={y(h)} r={2} fill="#a8b3c0" />)}
      {routes.map((r, i) => <g key={r.name}><polyline points={[...r.stops, school].map((p) => `${x(p)},${y(p)}`).join(" ")} fill="none" stroke={colour(i)} strokeWidth={2.5} strokeLinejoin="round" />{r.stops.map((s, k) => <circle key={k} cx={x(s)} cy={y(s)} r={5} fill={colour(i)} stroke="#fff" strokeWidth={1}><title>{`${r.name} · ${s.name} · ${s.homes}`}</title></circle>)}</g>)}
      {[...areas].map(([label, p]) => <text key={label} x={x(p)} y={y(p) - 12} textAnchor="middle" fontSize={13} fill="#64748b">{label}</text>)}
      <rect x={x(school) - 10} y={y(school) - 10} width={20} height={20} rx={4} fill="#0f172a" /><text x={x(school) + 16} y={y(school) + 5} fontSize={13} fill="#64748b">School</text>
    </svg>
  );
}

const vs = (now: number, was: number, unit = "") => (was ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11.5px] ${now <= was ? "bg-[#d9efe8] text-[#065740]" : "bg-[#f8ecd6] text-[#8a5a0b]"}`}>{now > was ? "↑" : now < was ? "↓" : "="} vs today {was}{unit}</span> : "No routes today");

/** Reads "admission_no,latitude,longitude,area" lines; a heading line is skipped. */
function parseHomes(text: string) {
  const rows = text.split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))).filter((c) => c.length >= 3 && c[0] && Number.isFinite(Number(c[1])) && c[1] !== "" && Number.isFinite(Number(c[2])) && c[2] !== "");
  return rows.map((c) => ({ admission_no: c[0], latitude: Number(c[1]), longitude: Number(c[2]), area: (c[3] ?? "").slice(0, 60) }));
}

export function PlannerPage() {
  const [rules, setRules] = useState({ seats: "48", longest: "50", walk: "500" });
  const [asked, setAsked] = useState(rules);
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Data>(`/transport/planner?seats=${asked.seats}&longest=${asked.longest}&walk=${asked.walk}`), [asked]);
  const act = useAction(reload);
  const [confirm, setConfirm] = useState(false); const [done, setDone] = useState("");
  const p = x?.plan ?? null;
  const apply = async () => { let n = 0; if (await act.run(async () => { n = (await schoolFetch<{ routes: number }>("/transport/planner/apply", json("POST", { seats: Number(asked.seats), longest: Number(asked.longest), walk: Number(asked.walk) }))).routes; })) { setConfirm(false); setDone(`${n} draft routes saved under Routes & Stops. Nothing running has changed: set their timings, put them into use, give them vehicles and move the students.`); } };
  const upload = async (file: File | undefined) => {
    if (!file) return; setDone("");
    const rows = parseHomes(await file.text());
    let text = "";
    if (await act.run(async () => { const r = await schoolFetch<{ saved: number; unknown_count: number }>("/transport/planner/homes", json("POST", { rows })); text = `${r.saved} home locations saved.${r.unknown_count ? ` ${r.unknown_count} admission numbers were not found.` : ""}`; })) setDone(text);
  };
  const sel = (k: "seats" | "longest" | "walk", label: string, options: number[]) => <L label={label}><select className={inputCls} value={rules[k]} onChange={(e) => setRules({ ...rules, [k]: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</select></L>;
  return (
    <div data-report>
      <Head title="Plan Routes" subtitle="Plans bus routes from where students live. It groups homes into stops within walking distance, then builds routes that keep each bus within its seats and the longest ride within your limit." action={<button type="button" className={redBtn} disabled={!p || act.busy} onClick={() => setConfirm(true)}>Apply this plan</button>} />
      <ErrorBanner message={error || (confirm ? "" : act.error)} />
      <Done text={done} />
      <Loading on={loading && !x} />
      {x && <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Planning rules</h2><span className="text-xs text-slate-500">{x.riders} students who use the bus</span></div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">{sel("seats", "Seats per bus", [13, 17, 24, 26, 40, 48])}{sel("longest", "Longest ride (minutes)", [30, 40, 50, 60, 75, 90])}{sel("walk", "Walk to the stop (metres)", [250, 500, 750, 1000])}</div>
          <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setAsked({ ...rules })}>Plan routes</button></div>
        </div>
        {p && x.school ? <>
          <Tiles>{([["Buses needed", p.buses, vs(p.buses, x.today.buses)], ["Km a day", p.km_day, vs(p.km_day, x.today.km_day)], ["Longest ride", `${p.longest} min`, vs(p.longest, x.today.longest)], ["Average ride", `${p.average} min`, vs(p.average, x.today.average)]] as const).map(([label, value, sub]) => <div key={label} className="rounded-2xl bg-[#e8f4fb] px-4 py-3.5"><p className="text-xs text-slate-700">{label}</p><p className="mt-0.5 text-[24px] font-bold leading-tight text-slate-900">{value}</p><div className="text-xs text-slate-600">{sub}</div></div>)}</Tiles>
          <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Suggested routes" sub="Each dot is a home; larger dots are stops"><div className="p-3"><RouteMap school={x.school} homes={x.homes} routes={p.routes} /></div></Panel>
            <Filtered search={false} title="Routes" noun="routes" exportName="route-plan" empty="No routes." head={["Route", "Areas", "Stops", "Students"]}
              rows={p.routes.map((r, i) => ({ key: r.name, find: r.name, out: [r.name, r.areas.join(", "), r.stops.length, `${r.students} / ${asked.seats}`], cells: [<span key="n" className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colour(i) }} aria-hidden="true" />{r.name}</span>, <span key="a" className="block max-w-[14rem] whitespace-normal">{r.areas.join(", ") || "—"}</span>, r.stops.length, `${r.students} / ${asked.seats}`] }))} />
          </div>
          <Note>Plans use straight-line distance × 1.25, an average of 25 km/h and 0.8 minutes per stop. Today&apos;s routes run {x.today.buses} buses with rides up to {x.today.longest} minutes; shorter rides need more buses. Check new stops on the ground before applying, and tell parents their new stop and time 2 weeks before the change.{x.located < x.riders ? ` ${x.riders - x.located} students have no home location and are not in this plan.` : ""}</Note>
          <label className={`${pill} inline-block cursor-pointer`}>Update home locations<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </> : <Panel title="Suggested routes">
          <Empty text={!x.school ? "The school's location is not set. The School Admin adds it under Attendance › Geo-Fence Settings (latitude and longitude)." : "No home locations yet. Upload them to plan routes."} />
          {x.upgraded ? <div className="mx-auto max-w-lg px-5 pb-6"><L label="Home locations file (CSV: admission no, latitude, longitude, area)"><input type="file" accept=".csv,text/csv" className={FILE} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></L></div> : <p className="pb-6 text-center text-[12.5px] text-slate-500">Home locations need a database update (migration 121).</p>}
        </Panel>}
      </div>}
      <Modal open={confirm} title="Apply this plan" onClose={() => setConfirm(false)}>
        <ErrorBanner message={act.error} />
        <p className="text-[13px] text-slate-700">The {p?.buses ?? 0} planned routes and their stops are saved as draft routes that are not in use. Your current routes, vehicles and students stay as they are.</p>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setConfirm(false)}>Cancel</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={() => void apply()}>Save draft routes</button></div>
      </Modal>
    </div>
  );
}
