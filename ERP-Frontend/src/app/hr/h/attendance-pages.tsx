"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Empty, Loading, day } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, pill, share, solid } from "./ui";

/** Staff attendance, biometric devices and geo-fencing, on the same records as the School Admin's attendance screens. */
const S = "/school/attendance";
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const stamp = (iso: string) => { const d = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); return `${d === todayIso() ? "Today" : day(d)} ${timeOf(iso)}`; };
const KV = ({ rows }: { rows: [string, string | number][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>;

// ═════════════ staff attendance ═════════════
type St = "P" | "A" | "L" | "H" | "V";
const MARKS: [St, string, string][] = [["P", "Present", "border-[#9fd6c5] bg-[#d9efe8] text-[#065740]"], ["A", "Absent", "border-[#f2b8b6] bg-[#fce0df] text-[#ac2c28]"], ["L", "Late", "border-[#e8c680] bg-[#f8ecd6] text-[#8a5a0b]"], ["H", "Half day", "border-[#e8c680] bg-[#f8ecd6] text-[#8a5a0b]"], ["V", "Leave", "border-[#a9d6ec] bg-[#dceff9] text-[#026f9b]"]];
interface Row { id: string; name: string; emp_code: string; department: string; status: St | null; in_time: string; out_time: string }

export function DailyAttendance() {
  const date = todayIso();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Row[] }>(`${S}/staff/sheet?date=${date}`), [date]);
  const act = useAction(reload);
  const rows = data?.items ?? [];
  const mark = (r: Row, status: St) => void act.run(() => schoolFetch(`${S}/staff/sheet`, json("PUT", { date, marks: [{ staff_id: r.id, status, in_time: r.in_time || null, out_time: r.out_time || null }] })));
  return (
    <div data-report>
      <Head title="Daily" subtitle="Today's staff attendance. Biometric punches fill this in automatically." />
      <ErrorBanner message={error || act.error} />
      <Table title={`Staff · ${day(date)}`} noun="shown" search={false} exportName="staff-attendance" empty={loading ? "Loading…" : "No staff yet."}
        head={[{ h: "Staff" }, { h: "Department" }, { h: "In" }, { h: "Out" }, ...MARKS.map(([, h]) => ({ h }))]}
        rows={rows.map((r) => ({ key: r.id, find: r.name, out: [r.name, r.department, r.in_time, r.out_time, ...MARKS.map(([k]) => (r.status === k ? "Yes" : ""))], cells: [name(r.name, r.emp_code), r.department, r.in_time || "—", r.out_time || "—",
          ...MARKS.map(([k, label, on]) => <button key={k} type="button" disabled={act.busy} aria-label={`${r.name}: ${label}`} aria-pressed={r.status === k} onClick={() => mark(r, k)} className={`size-7 rounded-md border text-[12px] font-semibold disabled:cursor-wait ${r.status === k ? on : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{k}</button>)] }))} />
    </div>
  );
}

export function MonthlyAttendance() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ label: string; items: { id: string; name: string; code: string; department: string; present: number; leave: number; absent: number; late: number }[] }>(`${S}/staff/monthly`), []);
  return (
    <div data-report>
      <Head title="Monthly" subtitle="Each staff member's attendance this month." />
      <ErrorBanner message={error} />
      <Table title={`Staff · ${data?.label ?? "this month"}`} noun="staff" exportName="staff-attendance-monthly" empty={loading ? "Loading…" : "No attendance recorded this month."}
        head={[{ h: "Staff" }, { h: "Department" }, { h: "Present" }, { h: "Leave" }, { h: "Absent" }, { h: "Late" }]}
        rows={(data?.items ?? []).map((r) => ({ key: r.id, find: `${r.name} ${r.department}`, out: [r.name, r.department, r.present, r.leave, r.absent, r.late], cells: [name(r.name, r.code), r.department, r.present, r.leave, r.absent, r.late] }))} />
    </div>
  );
}

export function DepartmentAttendance() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ marked: number; items: { department: string; present: number; total: number }[] }>(`${S}/staff/departments?date=${todayIso()}`), []);
  const rows = data?.items ?? [];
  return (
    <div data-report>
      <Head title="Department-wise" subtitle="Staff present today by department." />
      <ErrorBanner message={error} />
      <Panel title="Present by department" sub="Today">
        {rows.length ? <div className="space-y-2 p-4">{rows.map((d) => (
          <div key={d.department} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3 text-[13px]"><span className="truncate text-slate-700">{d.department}</span><div className="h-1.5 overflow-hidden rounded bg-[#e6f4fb]"><div className="h-full rounded bg-[#41afda]" style={{ width: `${d.total ? (d.present / d.total) * 100 : 0}%` }} /></div><span className="text-right tabular-nums text-slate-700">{d.present} of {d.total}</span></div>
        ))}</div> : <Empty text={loading ? "Loading…" : "No staff yet."} />}
      </Panel>
    </div>
  );
}

// ═════════════ biometric ═════════════
interface Sync { id: string; device: string; synced_at: string; punches: number; new_marked: number; status: string }
interface Mapping { id: string; staff_id: string; staff: string; department: string; device: string; biometric_id: string; fingerprints: string }
interface Bio { mappings: Mapping[]; syncs: Sync[]; staff: { id: string; emp_code?: string }[] }

export function SyncLog() {
  const { data, error, loading } = useLoad(() => schoolFetch<Bio>(`${S}/bio`), []);
  const [view, setView] = useState<Sync | null>(null);
  const all = data?.syncs ?? []; const ok = all.filter((x) => x.status === "Success").length;
  return (
    <div data-report className="space-y-5">
      <Head title="Sync Log" subtitle="All syncs, newest first." />
      <ErrorBanner message={error} />
      <Tiles><Tile label="Attendance sync" value={all.length} sub="Records shown" /><Tile label="Success" value={ok} sub={share(ok, all.length)} /><Tile tone={all.length - ok ? "red" : "blue"} label="Failed" value={all.length - ok} sub={share(all.length - ok, all.length)} /></Tiles>
      <Table title="Attendance sync" noun="syncs" exportName="attendance-sync" empty={loading ? "Loading…" : "No syncs yet."}
        head={[{ h: "Time" }, { h: "Device" }, { h: "Punches", right: true }, { h: "New staff marked", right: true }, { h: "Status" }, { h: "" }]}
        rows={all.map((x) => ({ key: x.id, find: `${x.device} ${x.status} ${stamp(x.synced_at)}`, out: [stamp(x.synced_at), x.device, x.punches, x.new_marked, x.status], cells: [stamp(x.synced_at), x.device, <span key="p" className="block text-right">{x.punches}</span>, <span key="n" className="block text-right">{x.new_marked}</span>, <Chip key="s" tone={x.status === "Success" ? "good" : "bad"}>{x.status}</Chip>, <button key="v" type="button" className={pill} onClick={() => setView(x)}>View details</button>] }))} />
      {view && <Modal open title={`${view.device} · ${stamp(view.synced_at)}`} onClose={() => setView(null)}><KV rows={[["Device", view.device], ["Time", stamp(view.synced_at)], ["Punches", view.punches], ["New staff marked", view.new_marked], ["Status", view.status]]} /></Modal>}
    </div>
  );
}

export function DeviceMapping() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Bio>(`${S}/bio`), []);
  const act = useAction(reload);
  const [view, setView] = useState<Mapping | null>(null);
  const code = new Map((data?.staff ?? []).map((s) => [s.id, s.emp_code ?? ""]));
  const set = (fingerprints: "Verified" | "Missing") => void act.run(() => schoolFetch(`${S}/bio/mappings/${view!.id}`, json("PATCH", { fingerprints }))).then((done) => done && setView(null));
  return (
    <div data-report>
      <Head title="Device Mapping" subtitle="Which biometric ID each staff member uses." />
      <ErrorBanner message={error || act.error} />
      <Table title="Device mapping" noun="staff" exportName="device-mapping" empty={loading ? "Loading…" : "Nobody is mapped to a device yet."}
        head={[{ h: "Staff" }, { h: "Department" }, { h: "Device" }, { h: "Biometric ID" }, { h: "Fingerprints" }, { h: "" }]}
        rows={(data?.mappings ?? []).map((x) => ({ key: x.id, find: `${x.staff} ${x.department} ${x.device} ${x.biometric_id}`, out: [x.staff, x.department, x.device, x.biometric_id, x.fingerprints], cells: [name(x.staff, code.get(x.staff_id)), x.department, x.device, x.biometric_id, <Chip key="f" tone={x.fingerprints === "Verified" ? "good" : "bad"}>{x.fingerprints}</Chip>, <button key="r" type="button" className={pill} onClick={() => setView(x)}>Re-enrol</button>] }))} />
      {view && (
        <Modal open title={`Re-enrol · ${view.staff}`} onClose={() => setView(null)}>
          <p className="text-[13px] text-slate-700">Enrol the fingerprints on device {view.device} under biometric ID {view.biometric_id}, then mark them verified.</p>
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={pill} disabled={act.busy} onClick={() => set("Missing")}>Mark as to be enrolled</button><button type="button" className={solid} disabled={act.busy} onClick={() => set("Verified")}>Mark verified</button></div>
        </Modal>
      )}
    </div>
  );
}

// ═════════════ geo-fencing ═════════════
interface Geo { id: string; staff: string; time: string; method: string; place: string; distance_m: number | null; geo_status: string; selfie: string; resolution: string }
const geoTone = (s: string) => (["Inside", "Matched", "Accepted"].includes(s) ? "good" : s === "Field duty" ? "info" : "bad") as "good" | "info" | "bad";

export function CheckinLog() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Geo[]; total_staff: number; checked_in: number }>(`${S}/geo?date=${todayIso()}`), []);
  const act = useAction(reload);
  const all = data?.items ?? [];
  const app = all.filter((r) => r.method.startsWith("Mobile app") && r.geo_status === "Inside").length;
  const decide = (r: Geo, action: "accept" | "absent") => void act.run(() => schoolFetch(`${S}/geo/${r.id}`, json("PATCH", { action })));
  return (
    <div data-report className="space-y-5">
      <Head title="Check-in Log" subtitle="Check-ins from the biometric devices, face scan and the staff mobile app. App check-ins count inside the campus geo-fence." />
      <ErrorBanner message={error || act.error} />
      <Tiles><Tile label="Checked in today" value={`${data?.checked_in ?? 0} of ${data?.total_staff ?? 0}`} /><Tile label="By mobile app" value={app} sub="Inside geo-fence" /><Tile label="Outside geo-fence" value={all.filter((r) => r.geo_status === "Outside").length} sub="Needs a reason" /><Tile label="Selfie didn't match" value={all.filter((r) => r.selfie === "No match").length} sub="Review" /></Tiles>
      <Table title="Check-ins today" noun="check-ins" exportName="geo-check-ins" empty={loading ? "Loading…" : "No check-ins today."}
        head={[{ h: "Staff" }, { h: "Time" }, { h: "Method" }, { h: "Where" }, { h: "Distance" }, { h: "Geo-fence" }, { h: "Selfie" }, { h: "" }]}
        rows={all.map((r) => ({ key: r.id, find: `${r.staff} ${r.method} ${r.place} ${r.geo_status}`, out: [r.staff, r.time, r.method, r.place, r.distance_m, r.geo_status, r.selfie], cells: [name(r.staff), r.time, r.method, r.place, r.distance_m === null ? "—" : `${r.distance_m.toLocaleString("en-IN")} m`, <Chip key="g" tone={geoTone(r.geo_status)}>{r.geo_status}</Chip>, <Chip key="s" tone={geoTone(r.selfie)}>{r.selfie}</Chip>,
          r.resolution ? <Chip key="r" tone={geoTone(r.resolution)}>{r.resolution}</Chip> : r.geo_status === "Outside" || r.selfie === "No match" ? <span key="a" className="flex gap-1.5"><button type="button" className={pill} disabled={act.busy} onClick={() => decide(r, "accept")}>Accept</button><button type="button" className={pill} disabled={act.busy} onClick={() => decide(r, "absent")}>Mark absent</button></span> : ""] }))} />
    </div>
  );
}

interface Campus { id: string; name: string; latitude: number | null; longitude: number | null; radius_m: number; covers: string }
interface Rules { window: string; selfie: boolean; field_anywhere: boolean; block_mock: boolean; home_online_days: boolean }
interface Settings { windows: string[]; campuses: Campus[]; late_after: string; rules: Rules; saved: boolean }

/** A drawing of the fence around the campus: the circle grows with the radius. */
function Fence({ radius }: { radius: number }) {
  const r = Math.max(34, Math.min(92, 30 + radius * 0.4));
  return (
    <svg viewBox="0 0 400 220" className="w-full rounded-2xl bg-slate-50" role="img" aria-label={`Geo-fence of ${radius} metres around the campus`}>
      <path d="M0 160 L400 118" stroke="#e2e5ea" strokeWidth="14" /><path d="M105 0 L140 220" stroke="#e2e5ea" strokeWidth="12" /><path d="M280 0 L312 220" stroke="#e2e5ea" strokeWidth="12" />
      <circle cx="200" cy="110" r={r} fill="rgba(11,107,79,0.12)" stroke="#065740" strokeWidth="3" strokeDasharray="9 7" />
      <rect x="175" y="90" width="50" height="38" rx="5" fill="#3a8fb0" /><circle cx="200" cy="108" r="6" fill="#ac2c28" />
    </svg>
  );
}

export function GeoSettings() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Settings>(`${S}/geo-settings`), []);
  const act = useAction(reload);
  const [edit, setEdit] = useState<{ for: Settings; campuses: Campus[]; late_after: string; rules: Rules } | null>(null);
  const [saved, setSaved] = useState(false);
  const [place, setPlace] = useState<{ id: string; lat: string; lng: string } | null>(null);
  const f = data ? (edit?.for === data ? edit : { for: data, campuses: data.campuses, late_after: data.late_after, rules: data.rules }) : null;
  const change = (patch: Partial<NonNullable<typeof f>>) => { if (f) { setEdit({ ...f, ...patch }); setSaved(false); } };
  const campus = (id: string, patch: Partial<Campus>) => change({ campuses: f!.campuses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const save = () => void act.run(() => schoolFetch(`${S}/geo-settings`, json("PUT", { campuses: f!.campuses.map((c) => ({ id: c.id, radius_m: Number(c.radius_m), covers: c.covers, latitude: c.latitude, longitude: c.longitude })), late_after: f!.late_after, rules: f!.rules }))).then((done) => { if (done) { setEdit(null); setSaved(true); } });
  const tick = (k: "selfie" | "field_anywhere" | "block_mock" | "home_online_days", label: string) => <label className="flex items-center gap-2 text-[13px] text-slate-900"><input type="checkbox" className="size-4 accent-[#026f9b]" checked={f!.rules[k]} onChange={(e) => change({ rules: { ...f!.rules, [k]: e.target.checked } })} />{label}</label>;
  return (
    <div className="space-y-5">
      <Head title="Geo-Fence Settings" subtitle="The area around each campus where staff can check in from the mobile app, and who may check in from outside it." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {f && (
        <>
          {!f.campuses.length && <Panel title="Campuses"><Empty text="No campus is set up yet. The School Admin adds campuses." /></Panel>}
          <div className="grid items-stretch gap-3 lg:grid-cols-[1.6fr_1fr]">
            {f.campuses.map((c) => (
              <section key={c.id} className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">{c.name}</h2><button type="button" className="text-[11.5px] text-slate-500 hover:text-[#026f9b] hover:underline" onClick={() => setPlace({ id: c.id, lat: c.latitude?.toString() ?? "", lng: c.longitude?.toString() ?? "" })}>{c.latitude === null ? "Set location" : `${c.latitude}, ${c.longitude}`}</button></div>
                <div className="space-y-3 p-3"><Fence radius={c.radius_m} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Radius (metres)</span><input type="number" min={20} max={5000} className={inputCls} value={c.radius_m} onChange={(e) => campus(c.id, { radius_m: Number(e.target.value) })} /></label>
                    <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Covers</span><input maxLength={160} className={inputCls} value={c.covers} onChange={(e) => campus(c.id, { covers: e.target.value })} /></label>
                  </div>
                </div>
              </section>
            ))}
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Rules</h2></div>
            <div className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-[12rem_12rem]">
                <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">App check-in window</span><select className={inputCls} value={f.rules.window} onChange={(e) => change({ rules: { ...f.rules, window: e.target.value } })}>{data!.windows.map((w) => <option key={w}>{w}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Late after</span><input type="time" className={inputCls} value={f.late_after} onChange={(e) => change({ late_after: e.target.value })} /></label>
              </div>
              {tick("selfie", "Take a selfie with every app check-in and match it to the staff photo")}
              {tick("field_anywhere", "Drivers, attendants and staff on field duty can check in from anywhere")}
              {tick("block_mock", "Block check-in from mock-location apps")}
              {tick("home_online_days", "Allow teachers to check in from home on declared online-teaching days")}
              <p className="text-[11.5px] text-slate-500">The radius, window, late time, selfie and driver rules are applied at check-in. Photo matching, mock-location blocking and online-teaching days are saved but not applied yet.</p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={save}>{act.busy ? "Saving…" : "Save rules"}</button></div>
          </section>
        </>
      )}
      {place && (
        <Modal open title="Campus location" onClose={() => setPlace(null)}>
          <form onSubmit={(e) => { e.preventDefault(); campus(place.id, { latitude: place.lat === "" ? null : Number(place.lat), longitude: place.lng === "" ? null : Number(place.lng) }); setPlace(null); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-[12.5px] font-medium">Latitude</span><input type="number" step="any" min={-90} max={90} className={inputCls} value={place.lat} onChange={(e) => setPlace({ ...place, lat: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-[12.5px] font-medium">Longitude</span><input type="number" step="any" min={-180} max={180} className={inputCls} value={place.lng} onChange={(e) => setPlace({ ...place, lng: e.target.value })} /></label>
            </div>
            <p className="text-[12px] text-slate-500">Until a campus has a location, app check-ins are not checked against its fence. Press Save rules to keep this change.</p>
            <div className="flex justify-end"><button type="submit" className={solid}>Use this location</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
