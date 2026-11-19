"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, ColumnChart, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

const S = "/school/attendance";
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50";
const sel = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex flex-wrap gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const okBox = (m: string) => m && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{m}</p>;
const FormFoot = ({ close, busy }: { close: () => void; busy: boolean }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const when = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); const t = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }); const dd = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); return dd === todayIso() ? `Today ${t}` : `${day(dd)} ${t}`; };
const tone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Online", "Success", "Verified", "Issued", "OK", "Inside", "Matched", "Approved", "Accepted"].includes(s) ? "good" : ["Offline", "Failed", "Missing", "Lost", "Outside", "No match", "Blocked", "No scan", "Rejected", "Absent"].includes(s) ? "bad" : ["Low battery", "Not issued", "Late", "Pending", "Duplicate"].includes(s) ? "warn" : ["Field duty", "RFID", "QR", "In", "Out"].includes(s) ? "info" : "mute");

type St = "P" | "A" | "L" | "H" | "V";
const BTN: Record<St, string> = { P: "border-[#a8dcc8] bg-[#d9efe8] text-[#0d5c46]", A: "border-[#f0b5b3] bg-[#fce0df] text-[#ac2c28]", L: "border-[#f2d4a4] bg-[#fdebd2] text-[#8a4b08]", H: "border-[#c0e4f3] bg-[#dceff9] text-[#026f9b]", V: "border-[#d5c9ee] bg-[#e9e2f7] text-[#5b3fa0]" };

// ═════════════ staff attendance ═════════════
interface SStaff { id: string; name: string; department: string; status: St | null; in_time: string; out_time: string }
interface Geo { id: string; staff: string; time: string; method: string; place: string; distance_m: number | null; geo_status: string; selfie: string; resolution: string }
export type StaffTab = "daily-staff-attendance" | "department-wise" | "geo-check-ins";

export function StaffAttendancePages({ tab }: { tab: StaffTab }) {
  const [date, setDate] = useState(todayIso());
  const sheet = useLoad(() => (tab === "daily-staff-attendance" ? schoolFetch<{ items: SStaff[]; marked: number }>(`${S}/staff/sheet?date=${date}`) : Promise.resolve(null)), [tab, date]);
  const dept = useLoad(() => (tab === "department-wise" ? schoolFetch<{ items: { department: string; present: number; total: number }[]; marked: number }>(`${S}/staff/departments?date=${date}`) : Promise.resolve(null)), [tab, date]);
  const geo = useLoad(() => (tab === "geo-check-ins" ? schoolFetch<{ items: Geo[]; total_staff: number; checked_in: number }>(`${S}/geo?date=${date}`) : Promise.resolve(null)), [tab, date]);
  const staffAll = useLoad(() => schoolFetch<{ items: SStaff[] }>(`${S}/staff/sheet?date=${todayIso()}`), []);
  const act = useAction(() => { sheet.reload(); dept.reload(); geo.reload(); });
  const [marks, setMarks] = useState<Record<string, { status?: St; in_time?: string; out_time?: string }>>({});
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ staff_id: "", method: "Mobile app", place: "Main campus", distance_m: "", geo_status: "Inside", selfie: "Matched" });
  const err = <ErrorBanner message={sheet.error || dept.error || geo.error || staffAll.error || act.error} />;
  const staff = staffAll.data?.items ?? [];
  if (tab === "daily-staff-attendance") {
    const rows = sheet.data?.items ?? [];
    const cur = (s: SStaff) => marks[s.id]?.status ?? s.status ?? "P";
    const patch = (id: string, p: { status?: St; in_time?: string; out_time?: string }) => { setMarks((m) => ({ ...m, [id]: { ...m[id], ...p } })); setMsg(""); };
    const save = async () => { setMsg(""); if (await act.run(() => schoolFetch(`${S}/staff/sheet`, json("PUT", { date, marks: rows.map((s) => ({ staff_id: s.id, status: cur(s), in_time: (marks[s.id]?.in_time ?? s.in_time) || null, out_time: (marks[s.id]?.out_time ?? s.out_time) || null })) })))) { setMarks({}); setMsg("Staff attendance saved."); } };
    const t = "w-24 rounded border border-slate-200 bg-white px-1.5 py-1 text-[12px]";
    return (
      <div>{err}{okBox(msg)}
        <Panel title={`Staff · ${day(date)}`} sub={`${rows.length} shown`} right={<span className="flex items-center gap-2"><input type="date" aria-label="Date" max={todayIso()} value={date} onChange={(e) => { setDate(e.target.value); setMarks({}); setMsg(""); }} className={sel} /><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !rows.length} onClick={() => void save()}>{act.busy ? "Saving…" : "Save attendance"}</button></span>}>
          <SimpleTable head={["Staff", "Department", "In", "Out", "Present", "Absent", "Late", "Half day", "Leave"].map((h) => ({ h }))} empty={sheet.loading ? "Loading…" : "No staff yet."}
            rows={rows.map((s) => [<b key="n" className="font-semibold text-slate-900">{s.name}</b>, s.department, <input key="i" type="time" aria-label={`${s.name} in`} className={t} value={marks[s.id]?.in_time ?? s.in_time} onChange={(e) => patch(s.id, { in_time: e.target.value })} />, <input key="o" type="time" aria-label={`${s.name} out`} className={t} value={marks[s.id]?.out_time ?? s.out_time} onChange={(e) => patch(s.id, { out_time: e.target.value })} />,
              ...(["P", "A", "L", "H", "V"] as St[]).map((st) => <button key={st} type="button" aria-label={`${s.name} ${st}`} aria-pressed={cur(s) === st} onClick={() => patch(s.id, { status: st })} className={`h-7 w-7 rounded-md border text-[12px] font-semibold ${cur(s) === st ? BTN[st] : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>{st}</button>)])} />
        </Panel>
      </div>
    );
  }
  if (tab === "department-wise") {
    const rows = dept.data?.items ?? [];
    return (
      <div>{err}
        <Panel title="Present by department" sub="Today">
          {rows.length ? <div className="space-y-2 p-4">{rows.map((d) => <div key={d.department} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-[13px]"><span className="truncate text-slate-700">{d.department}</span><div className="h-2 overflow-hidden rounded bg-[#e6f4fb]"><div className="h-full rounded bg-[#41afda]" style={{ width: `${d.total ? (d.present / d.total) * 100 : 0}%` }} /></div><span className="text-right tabular-nums text-slate-700">{d.present} of {d.total}</span></div>)}</div> : <p className="p-6 text-center text-sm text-slate-400">{dept.loading ? "Loading…" : "No staff yet."}</p>}
        </Panel>
      </div>
    );
  }
  const g = geo.data;
  const all = g?.items ?? [];
  const rows = all.filter((r) => has(r, search));
  const app = all.filter((r) => r.method.startsWith("Mobile app") && r.geo_status !== "Outside").length;
  const decide = (r: Geo, action: "accept" | "absent") => act.run(() => schoolFetch(`${S}/geo/${r.id}`, json("PATCH", { action })));
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/geo`, json("POST", { staff_id: f.staff_id || staff[0]?.id, method: f.method, place: f.place, distance_m: f.distance_m ? Number(f.distance_m) : null, geo_status: f.geo_status, selfie: f.selfie })))) setAdding(false); };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Checked in today", value: `${g?.checked_in ?? 0} of ${g?.total_staff ?? 0}`, sub: day(date) }, { label: "By mobile app", value: app, sub: "Inside geo-fence" }, { label: "Outside geo-fence", value: all.filter((r) => r.geo_status === "Outside").length, sub: "Needs a reason" }, { label: "Selfie didn't match", value: all.filter((r) => r.selfie === "No match").length, sub: "Review" }]} />
      <ListPanel title="Check-ins today" noun="check-ins" search={search} onSearch={setSearch} exportName="geo-check-ins" head={["Staff", "Time", "Method", "Where", "Distance (m)", "Geo-fence", "Selfie"]} exportRows={rows.map((r) => [r.staff, r.time, r.method, r.place, r.distance_m, r.geo_status, r.selfie])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Record check-in</button>}
        tableHead={["Staff", "Time", "Method", "Where", "Distance", "Geo-fence", "Selfie", ""]} empty={geo.loading ? "Loading…" : "No check-ins today."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.staff}</b>, r.time, r.method, r.place, r.distance_m != null ? `${r.distance_m.toLocaleString("en-IN")} m` : "—", <Chip key="g" tone={tone(r.geo_status)}>{r.geo_status}</Chip>, <Chip key="s" tone={tone(r.selfie)}>{r.selfie}</Chip>,
          r.resolution ? <Chip key="r" tone={tone(r.resolution)}>{r.resolution}</Chip> : r.geo_status === "Outside" || r.selfie === "No match" ? <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => void decide(r, "accept")}>Accept</button><button type="button" className={small} disabled={act.busy} onClick={() => void decide(r, "absent")}>Mark absent</button></span> : ""])} />
      <Modal open={adding} title="Record a check-in" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Staff"><select className={inputCls} required value={f.staff_id || staff[0]?.id || ""} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Method"><select className={inputCls} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{["Mobile app", "Mobile app (field)", "Biometric", "Face scan"].map((m) => <option key={m}>{m}</option>)}</select></Field><Field label="Distance (m)"><input type="number" min={0} className={inputCls} value={f.distance_m} onChange={(e) => setF({ ...f, distance_m: e.target.value })} /></Field></div>
          <Field label="Where"><input className={inputCls} required minLength={2} maxLength={120} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Geo-fence"><select className={inputCls} value={f.geo_status} onChange={(e) => setF({ ...f, geo_status: e.target.value })}>{["Inside", "Outside", "Field duty"].map((m) => <option key={m}>{m}</option>)}</select></Field><Field label="Selfie"><select className={inputCls} value={f.selfie} onChange={(e) => setF({ ...f, selfie: e.target.value })}>{["Matched", "No match"].map((m) => <option key={m}>{m}</option>)}</select></Field></div>
          <FormFoot close={() => setAdding(false)} busy={act.busy} />
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ biometric ═════════════
interface Bio { devices: { id: string; code: string; location: string; model: string; status: string; last_sync: string | null; mapped: number }[]; mappings: { id: string; staff_id: string; staff: string; department: string; device_id: string; device: string; biometric_id: string; fingerprints: string }[]; syncs: { id: string; device: string; synced_at: string; punches: number; new_marked: number; status: string }[]; staff: { id: string; name: string }[] }
export type BioTab = "device-setup" | "device-mapping" | "attendance-sync";

export function BiometricPages({ tab }: { tab: BioTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Bio>(`${S}/bio`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<"" | "device" | "map" | "sync">("");
  const [view, setView] = useState<Bio["devices"][number] | null>(null);
  const [f, setF] = useState({ location: "", model: "", staff_id: "", device_id: "", biometric_id: "", fingerprints: "Verified", punches: "0", new_marked: "0", status: "Success" });
  const d = data?.devices ?? [];
  const err = <ErrorBanner message={error || act.error} />;
  const close = () => setOpen("");
  const submit = (path: string, method: string, body: unknown) => async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/bio/${path}`, json(method, body)))) close(); };
  const modals = <>
    <Modal open={open === "device"} title="Add a biometric device" onClose={close}><form onSubmit={submit("devices", "POST", { location: f.location, model: f.model })} className="space-y-3"><Field label="Location"><input className={inputCls} required minLength={2} maxLength={100} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field><Field label="Model"><input className={inputCls} required minLength={2} maxLength={60} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Field><FormFoot close={close} busy={act.busy} /></form></Modal>
    <Modal open={open === "map"} title="Map a staff member" onClose={close}><form onSubmit={submit("mappings", "PUT", { staff_id: f.staff_id || data?.staff[0]?.id, device_id: f.device_id || d[0]?.id, biometric_id: f.biometric_id, fingerprints: f.fingerprints })} className="space-y-3">
      <Field label="Staff"><select className={inputCls} required value={f.staff_id || data?.staff[0]?.id || ""} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>{(data?.staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Device"><select className={inputCls} required value={f.device_id || d[0]?.id || ""} onChange={(e) => setF({ ...f, device_id: e.target.value })}>{d.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.location}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Biometric ID"><input className={inputCls} required maxLength={20} value={f.biometric_id} onChange={(e) => setF({ ...f, biometric_id: e.target.value })} /></Field><Field label="Fingerprints"><select className={inputCls} value={f.fingerprints} onChange={(e) => setF({ ...f, fingerprints: e.target.value })}><option>Verified</option><option>Missing</option></select></Field></div><FormFoot close={close} busy={act.busy} /></form></Modal>
    <Modal open={open === "sync"} title="Log a sync" onClose={close}><form onSubmit={submit("syncs", "POST", { device_id: f.device_id || d[0]?.id, punches: Number(f.punches), new_marked: Number(f.new_marked), status: f.status })} className="space-y-3">
      <Field label="Device"><select className={inputCls} required value={f.device_id || d[0]?.id || ""} onChange={(e) => setF({ ...f, device_id: e.target.value })}>{d.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.location}</option>)}</select></Field>
      <div className="grid grid-cols-3 gap-3"><Field label="Punches"><input type="number" min={0} className={inputCls} value={f.punches} onChange={(e) => setF({ ...f, punches: e.target.value })} /></Field><Field label="New staff marked"><input type="number" min={0} className={inputCls} value={f.new_marked} onChange={(e) => setF({ ...f, new_marked: e.target.value })} /></Field><Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Success</option><option>Failed</option></select></Field></div><FormFoot close={close} busy={act.busy} /></form></Modal>
  </>;
  if (tab === "device-setup") {
    const rows = d.filter((x) => has(x, search));
    const on = d.filter((x) => x.status === "Online").length;
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Biometric devices", value: d.length, sub: "All records" }, { label: "Online", value: on, sub: `${pct(on, d.length)} of shown` }, { label: "Offline", value: d.length - on, sub: `${pct(d.length - on, d.length)} of shown` }]} />
        <ListPanel title="Biometric devices" noun="devices" search={search} onSearch={setSearch} exportName="biometric-devices" head={["Device ID", "Location", "Model", "Users mapped", "Last sync", "Status"]} exportRows={rows.map((x) => [x.code, x.location, x.model, x.mapped, when(x.last_sync), x.status])}
          extra={<button type="button" className={small} onClick={() => setOpen("device")}>+ Add device</button>} tableHead={["Device ID", "Location", "Model", "Users mapped", "Last sync", "Status", ""]} empty={loading ? "Loading…" : "No devices yet."}
          rows={rows.map((x) => [x.code, x.location, x.model, x.mapped, when(x.last_sync), <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
        <Modal open={!!view} title={view?.code ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Location" v={view.location} /><Row k="Model" v={view.model} /><Row k="Users mapped" v={view.mapped} /><Row k="Last sync" v={when(view.last_sync)} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
        {modals}
      </div>
    );
  }
  if (tab === "device-mapping") {
    const rows = (data?.mappings ?? []).filter((x) => has(x, search));
    const fp = (m: Bio["mappings"][number], v: "Verified" | "Missing") => act.run(() => schoolFetch(`${S}/bio/mappings/${m.id}`, json("PATCH", { fingerprints: v })));
    return (
      <div data-report>{err}
        <ListPanel title="Device mapping" noun="staff" search={search} onSearch={setSearch} exportName="device-mapping" head={["Staff", "Department", "Device", "Biometric ID", "Fingerprints"]} exportRows={rows.map((x) => [x.staff, x.department, x.device, x.biometric_id, x.fingerprints])}
          extra={<button type="button" className={small} disabled={!d.length} onClick={() => setOpen("map")}>+ Map staff</button>} tableHead={["Staff", "Department", "Device", "Biometric ID", "Fingerprints", ""]} empty={loading ? "Loading…" : "Nobody is mapped to a device yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.staff}</b>, x.department, x.device, x.biometric_id, <Chip key="f" tone={tone(x.fingerprints)}>{x.fingerprints}</Chip>, x.fingerprints === "Verified" ? <button key="a" type="button" className={small} disabled={act.busy} onClick={() => void fp(x, "Missing")}>Re-enrol</button> : <button key="a" type="button" className={small} disabled={act.busy} onClick={() => void fp(x, "Verified")}>Mark verified</button>])} />
        {modals}
      </div>
    );
  }
  const rows = (data?.syncs ?? []).filter((x) => has(x, search));
  const ok = (data?.syncs ?? []).filter((x) => x.status === "Success").length;
  const all = data?.syncs.length ?? 0;
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Attendance sync", value: all, sub: "All records" }, { label: "Success", value: ok, sub: `${pct(ok, all)} of shown` }, { label: "Failed", value: all - ok, sub: `${pct(all - ok, all)} of shown` }]} />
      <ListPanel title="Attendance sync" noun="syncs" search={search} onSearch={setSearch} exportName="attendance-sync" head={["Time", "Device", "Punches", "New staff marked", "Status"]} exportRows={rows.map((x) => [when(x.synced_at), x.device, x.punches, x.new_marked, x.status])}
        extra={<button type="button" className={small} disabled={!d.length} onClick={() => setOpen("sync")}>+ Log a sync</button>} tableHead={["Time", "Device", "Punches", "New staff marked", "Status"]} empty={loading ? "Loading…" : "No syncs yet."}
        rows={rows.map((x) => [when(x.synced_at), x.device, <span key="p" className="block text-right">{x.punches}</span>, <span key="n" className="block text-right">{x.new_marked}</span>, <Chip key="s" tone={tone(x.status)}>{x.status}</Chip>])} />
      {modals}
    </div>
  );
}

// ═════════════ RFID and QR ═════════════
interface Reader { id: string; code: string; kind: "RFID" | "QR"; label: string; location: string; mode: string; status: string; last_sync_time: string; last_sync_date: string; scans_today: number }
interface Card { student_id: string; name: string; class_label: string; registration_no: string; rfid_code: string; qr_code: string; issued_on: string; status: string }
interface Scan { id: string; time: string; student: string; class_label: string; where: string; how: string; direction: string; result: string; note: string }
interface Exc { student_id: string; name: string; class_label: string; card: string; first_scan: string; status: string; parent: string; phone: string }
export type RfidTab = "readers-and-scanners" | "cards-and-qr-codes" | "live-scans" | "sync-and-exceptions" | "parent-alerts";
const syncText = (r: Reader) => (r.last_sync_time ? (r.last_sync_date === todayIso() ? `Today ${r.last_sync_time}` : `${day(r.last_sync_date)} ${r.last_sync_time}`) : "—");

export function RfidPages({ tab }: { tab: RfidTab }) {
  const readers = useLoad(() => schoolFetch<{ items: Reader[]; scans_total: number }>(`${S}/readers`), []);
  const cards = useLoad(() => (tab === "cards-and-qr-codes" ? schoolFetch<{ items: Card[] }>(`${S}/cards`) : Promise.resolve(null)), [tab]);
  const scans = useLoad(() => (tab === "live-scans" ? schoolFetch<{ items: Scan[]; total: number; entered: number; problems: number }>(`${S}/scans`) : Promise.resolve(null)), [tab]);
  const sync = useLoad(() => (tab === "sync-and-exceptions" ? schoolFetch<{ total: number; present: number; late: number; no_scan: number; late_after: string; last_push_at: string | null; items: Exc[] }>(`${S}/sync`) : Promise.resolve(null)), [tab]);
  const alerts = useLoad(() => (tab === "parent-alerts" ? schoolFetch<{ late_after: string; no_tap: number; on_leave: number; items: { student_id: string; name: string; class_label: string; parent: string; phone: string }[] }>(`${S}/alerts`) : Promise.resolve(null)), [tab]);
  const roster = useLoad(() => schoolFetch<{ items: Card[] }>(`${S}/cards`), []);
  const act = useAction(() => { readers.reload(); cards.reload(); scans.reload(); sync.reload(); alerts.reload(); });
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("All");
  const [show, setShow] = useState("All");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<"" | "reader" | "tap">("");
  const [f, setF] = useState({ kind: "RFID", label: "RFID reader", location: "", mode: "Entry", student_id: "", device_id: "", how: "RFID", direction: "In", note: "" });
  const err = <ErrorBanner message={readers.error || cards.error || scans.error || sync.error || alerts.error || roster.error || act.error} />;
  const rd = readers.data?.items ?? [];
  const call = (phone: string) => (phone ? <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-[#026f9b] hover:underline">{phone}</a> : "—");
  if (tab === "readers-and-scanners") {
    const rows = rd.filter((r) => has(r, search) && (kind === "All" || r.kind === kind));
    const need = rd.filter((r) => r.status !== "Online").length;
    const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/readers`, json("POST", { kind: f.kind, label: f.label, location: f.location, mode: f.mode })))) setOpen(""); };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Devices", value: rd.length, sub: `${rd.filter((r) => r.kind === "RFID").length} RFID · ${rd.filter((r) => r.kind === "QR").length} QR` }, { label: "Online", value: rd.filter((r) => r.status === "Online").length, sub: "Sending scans" }, { label: "Need attention", value: need, sub: "Offline or low battery" }, { label: "Scans today", value: readers.data?.scans_total ?? 0, sub: "All devices" }]} />
        <ListPanel title="Readers and scanners" noun="devices" search={search} onSearch={setSearch} exportName="readers-and-scanners" head={["Device", "Type", "Location", "Mode", "Last sync", "Scans today", "Status"]} exportRows={rows.map((r) => [r.code, r.label, r.location, r.mode, syncText(r), r.scans_today, r.status])}
          extra={<><select className={sel} aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}><option>All</option><option>RFID</option><option>QR</option></select><button type="button" className={small} onClick={() => setOpen("reader")}>+ Add device</button></>}
          tableHead={["Device", "Type", "Location", "Mode", "Last sync", "Scans today", "Status", ""]} empty={readers.loading ? "Loading…" : "No readers yet."}
          rows={rows.map((r) => [r.code, <span key="t" className="flex items-center gap-2"><Chip tone="info">{r.kind}</Chip>{r.label}</span>, r.location, r.mode, syncText(r), r.scans_today, <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>, <button key="a" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${S}/readers/${r.id}`, json("PATCH", { status: r.status === "Online" ? "Offline" : "Online" })))}>{r.status === "Online" ? "Mark offline" : "Mark online"}</button>])} />
        <Modal open={open === "reader"} title="Add a reader or scanner" onClose={() => setOpen("")}><form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field label="Kind"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, label: e.target.value === "QR" ? "QR scanner" : "RFID reader" })}><option>RFID</option><option>QR</option></select></Field><Field label="Mode"><select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{["Entry", "Exit", "Both", "Board / drop"].map((m) => <option key={m}>{m}</option>)}</select></Field></div>
          <Field label="Type"><input className={inputCls} required minLength={2} maxLength={40} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field><Field label="Location"><input className={inputCls} required minLength={2} maxLength={100} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field><FormFoot close={() => setOpen("")} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "cards-and-qr-codes") {
    const all = cards.data?.items ?? [];
    const rows = all.filter((c) => has(c, search) && (show === "All" || c.status === show));
    return (
      <div data-report>{err}{okBox(msg)}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Show<select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none"><option value="All">All students</option><option value="Issued">Issued</option><option value="Lost">Lost</option><option value="Not issued">Not issued</option></select></label></div>
        <ListPanel title="RFID cards and QR codes" noun="students" search={search} onSearch={setSearch} exportName="cards-and-qr-codes" head={["Student", "Class", "Admission no.", "RFID card", "QR code", "Issued", "Status"]} exportRows={rows.map((c) => [c.name, c.class_label, c.registration_no, c.rfid_code, c.qr_code, c.issued_on ? day(c.issued_on) : "", c.status])}
          tableHead={["Student", "RFID card", "QR code", "Issued", "Status", ""]} empty={cards.loading ? "Loading…" : "No students."}
          rows={rows.map((c) => [<div key="n"><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.class_label} · {c.registration_no}</p></div>, c.rfid_code || "—", c.qr_code || "—", c.issued_on ? day(c.issued_on) : "—", <Chip key="s" tone={tone(c.status)}>{c.status}</Chip>,
            c.status === "Issued" ? <button key="a" type="button" className={small} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/cards/${c.student_id}/lost`, json("POST", {})))) setMsg(`${c.name}'s card is marked lost.`); }}>Lost</button> : <button key="a" type="button" className={primaryCls} disabled={act.busy} onClick={async () => { if (await act.run(() => schoolFetch(`${S}/cards`, json("POST", { student_id: c.student_id })))) setMsg(`Card issued to ${c.name}.`); }}>{c.status === "Lost" ? "Issue new card" : "Issue card"}</button>])} />
      </div>
    );
  }
  if (tab === "live-scans") {
    const s = scans.data;
    const rows = (s?.items ?? []).filter((r) => has(r, search) && (kind === "All" || r.how === kind) && (show === "All" || (show === "Problems" ? r.result !== "OK" : r.result === "OK")));
    const kids = roster.data?.items ?? [];
    const tap = async (e: FormEvent) => { e.preventDefault(); setMsg(""); let res = ""; if (await act.run(async () => { const r = await schoolFetch<{ result: string; note: string }>(`${S}/scans`, json("POST", { student_id: f.student_id || kids[0]?.student_id, device_id: f.device_id || null, how: f.how, direction: f.direction, note: f.note })); res = r.result === "OK" ? "Scan recorded." : `Scan recorded as ${r.result}${r.note ? ` (${r.note})` : ""}.`; })) { setOpen(""); setMsg(res); } };
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Scans today", value: s?.total ?? 0, sub: "RFID and QR" }, { label: "Entered school", value: s?.entered ?? 0, sub: "First gate scan" }, { label: "Problems", value: s?.problems ?? 0, sub: "Blocked or duplicate" }]} />
        <ListPanel title={`Live scans · ${day(todayIso())}`} noun="scans" search={search} onSearch={setSearch} exportName="live-scans" head={["Time", "Student", "Class", "Where", "How", "In / out", "Result", "Note"]} exportRows={rows.map((r) => [r.time, r.student, r.class_label, r.where, r.how, r.direction, r.result, r.note])}
          extra={<><select className={sel} aria-label="Result" value={show} onChange={(e) => setShow(e.target.value)}><option value="All">All</option><option>Problems</option><option>OK</option></select><select className={sel} aria-label="How" value={kind} onChange={(e) => setKind(e.target.value)}><option value="All">RFID and QR</option><option>RFID</option><option>QR</option></select><button type="button" className={primaryCls} onClick={() => setOpen("tap")}>Simulate a tap</button></>}
          tableHead={["Time", "Student", "Where", "How", "In / out", "Result", "Note"]} empty={scans.loading ? "Loading…" : "No scans yet today."}
          rows={rows.map((r) => [r.time, <div key="n"><p className="font-semibold text-slate-900">{r.student}</p><p className="text-xs text-slate-400">{r.class_label}</p></div>, r.where, <Chip key="h" tone="info">{r.how}</Chip>, <Chip key="d" tone="info">{r.direction}</Chip>, <Chip key="r" tone={tone(r.result)}>{r.result}</Chip>, r.note || "—"])} />
        <Modal open={open === "tap"} title="Simulate a tap" onClose={() => setOpen("")}><form onSubmit={tap} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id || kids[0]?.student_id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{kids.map((k) => <option key={k.student_id} value={k.student_id}>{k.name} · {k.class_label}</option>)}</select></Field>
          <Field label="Reader"><select className={inputCls} value={f.device_id} onChange={(e) => setF({ ...f, device_id: e.target.value })}><option value="">—</option>{rd.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.location}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="How"><select className={inputCls} value={f.how} onChange={(e) => setF({ ...f, how: e.target.value })}><option>RFID</option><option>QR</option></select></Field><Field label="In / out"><select className={inputCls} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}><option>In</option><option>Out</option></select></Field></div>
          <Field label="Note"><input className={inputCls} maxLength={120} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field><FormFoot close={() => setOpen("")} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "sync-and-exceptions") {
    const s = sync.data;
    const rows = (s?.items ?? []).filter((r) => has(r, search));
    const mark = (r: Exc, status: "P" | "A") => act.run(() => schoolFetch(`${S}/sync/mark`, json("POST", { student_id: r.student_id, status })));
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <div className="flex justify-end"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !s?.present} onClick={async () => { setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ pushed: number; kept: number }>(`${S}/sync/push`, json("POST", {})); t = `${r.pushed} students added to Daily Attendance. ${r.kept} already marked were left as they are.`; })) setMsg(t); }}>Push to daily attendance</button></div>
        <Tiles items={[{ label: "Present by scan", value: s?.present ?? 0, sub: `Of ${s?.total ?? 0}` }, { label: "Late", value: s?.late ?? 0, sub: `Scanned after ${s?.late_after ?? "08:15"}` }, { label: "No scan", value: s?.no_scan ?? 0, sub: "Absent unless marked" }, { label: "Last push", value: s?.last_push_at ? when(s.last_push_at) : "Not yet" }]} />
        <ListPanel title="Exceptions · no scan or late" noun="students" search={search} onSearch={setSearch} exportName="sync-exceptions" head={["Student", "Class", "Card", "First scan", "Status", "Parent", "Mobile"]} exportRows={rows.map((r) => [r.name, r.class_label, r.card, r.first_scan, r.status, r.parent, r.phone])}
          tableHead={["Student", "Card", "First scan", "Status", "Parent", ""]} empty={sync.loading ? "Loading…" : "No exceptions."}
          rows={rows.map((r) => [<div key="n"><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.class_label}</p></div>, <Chip key="c" tone={tone(r.card)}>{r.card}</Chip>, r.first_scan || "—", <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>, <div key="p"><p className="text-slate-900">{r.parent || "—"}</p><p className="text-xs">{call(r.phone)}</p></div>,
            <span key="a" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => void mark(r, "P")}>Present (forgot card)</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void mark(r, "A")}>Absent</button></span>])} />
      </div>
    );
  }
  const a = alerts.data;
  const rows = (a?.items ?? []).filter((r) => has(r, search));
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: `No tap by ${a?.late_after ?? "08:15"}`, value: a?.no_tap ?? 0, sub: "Not on approved leave" }, { label: "On leave (no alert)", value: a?.on_leave ?? 0, sub: "Leave approved" }]} />
      <ListPanel title={`Absent with no tap by ${a?.late_after ?? "08:15"}`} noun="students" search={search} onSearch={setSearch} exportName="parent-alerts" head={["Student", "Class", "Taps", "Alert", "Parent", "Mobile"]} exportRows={rows.map((r) => [r.name, r.class_label, "No tap", "Not sent", r.parent, r.phone])}
        tableHead={["Student", "Class", "Taps", "Alert", "Parent"]} empty={alerts.loading ? "Loading…" : "Every student has tapped in."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.class_label, "No tap", "Not sent. SMS isn't connected yet.", <div key="p"><p className="text-slate-900">{r.parent || "—"}</p><p className="text-xs">{call(r.phone)}</p></div>])} />
    </div>
  );
}

// ═════════════ leave ═════════════
interface Leave { id: string; ref: string; who: "Student" | "Staff"; name: string; detail: string; leave_type: string; from_date: string; to_date: string; days: number; applied_on: string; waiting_hours: number; status: string }
interface LeaveData { students: Leave[]; staff: Leave[]; students_list: { id: string; name: string; class_label: string }[] }
export type LeaveTab = "student-leave" | "staff-leave" | "leave-approval";

export function LeavePages({ tab }: { tab: LeaveTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<LeaveData>(`${S}/leaves`), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Leave | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", leave_type: "Family function", from_date: todayIso(), to_date: todayIso() });
  const stu = data?.students ?? [];
  const staff = data?.staff ?? [];
  const decide = async (l: Leave, status: "Approved" | "Rejected") => { if (await act.run(() => schoolFetch(`${S}/leaves/${l.who === "Staff" ? "staff" : "student"}/${l.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${S}/leaves/student`, json("POST", { ...f, student_id: f.student_id || data?.students_list[0]?.id })))) setAdding(false); };
  const err = <ErrorBanner message={error || act.error} />;
  const n = (l: Leave[], s: string) => l.filter((x) => x.status === s).length;
  const span = (l: Leave) => (l.to_date !== l.from_date ? `${day(l.from_date)} – ${day(l.to_date)}` : day(l.from_date));
  const detail = <Modal open={!!view} title={view ? `${view.ref} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <>
    <dl><Row k="For" v={view.who} /><Row k={view.who === "Student" ? "Class" : "Role"} v={view.detail} /><Row k="Leave type" v={view.leave_type} /><Row k="Dates" v={`${span(view)} · ${view.days} day${view.days === 1 ? "" : "s"}`} /><Row k="Applied" v={day(view.applied_on)} /><Row k="Status" v={view.status} /></dl>
    <Foot close={() => setView(null)} left={view.status === "Pending" ? <><button type="button" className={quietCls} disabled={act.busy} onClick={() => void decide(view, "Rejected")}>{view.who === "Staff" ? "Send back" : "Reject"}</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(view, "Approved")}>Approve</button></> : undefined} /></>}</Modal>;
  if (tab === "student-leave") {
    const rows = stu.filter((l) => has(l, search));
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Leave applications", value: stu.length, sub: "All records" }, { label: "Pending", value: n(stu, "Pending"), sub: `${pct(n(stu, "Pending"), stu.length)} of shown` }, { label: "Rejected", value: n(stu, "Rejected"), sub: `${pct(n(stu, "Rejected"), stu.length)} of shown` }, { label: "Approved", value: n(stu, "Approved"), sub: `${pct(n(stu, "Approved"), stu.length)} of shown` }]} />
        <ListPanel title="Leave applications" noun="applications" search={search} onSearch={setSearch} exportName="student-leave" head={["Ref.", "For", "Name", "Class / dept", "Leave type", "From", "Days", "Applied", "Status"]} exportRows={rows.map((l) => [l.ref, l.who, l.name, l.detail, l.leave_type, day(l.from_date), l.days, day(l.applied_on), l.status])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New application</button>} tableHead={["Ref.", "For", "Name", "Class / dept", "Leave type", "From", "Days", "Applied", "Status", ""]} empty={loading ? "Loading…" : "No leave applications yet."}
          rows={rows.map((l) => [l.ref, l.who, <span key="n" className="font-semibold text-[#026f9b]">{l.name}</span>, l.detail, l.leave_type, day(l.from_date), <span key="d" className="block text-right">{l.days}</span>, day(l.applied_on), <Chip key="s" tone={tone(l.status)}>{l.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(l)}>View details</button>])} />
        {detail}
        <Modal open={adding} title="New leave application" onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
          <Field label="Student"><select className={inputCls} required value={f.student_id || data?.students_list[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(data?.students_list ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_label}</option>)}</select></Field>
          <Field label="Leave type"><input className={inputCls} required minLength={2} maxLength={40} value={f.leave_type} onChange={(e) => setF({ ...f, leave_type: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" className={inputCls} required value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value, to_date: e.target.value > f.to_date ? e.target.value : f.to_date })} /></Field><Field label="To"><input type="date" className={inputCls} required min={f.from_date} value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></Field></div><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "staff-leave") {
    const waiting = staff.filter((l) => l.status === "Pending");
    const rows = waiting.filter((l) => has(l, search));
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Waiting for approval", value: waiting.length, sub: "With the principal" }, { label: "Approved", value: n(staff, "Approved"), sub: "This record" }, { label: "Rejected", value: n(staff, "Rejected"), sub: "Sent back" }]} />
        <ListPanel title="Leave waiting for approval" noun="requests" search={search} onSearch={setSearch} exportName="staff-leave" head={["Request", "Employee", "Role", "Leave", "Dates", "Days", "Waiting (h)"]} exportRows={rows.map((l) => [l.ref, l.name, l.detail, l.leave_type, span(l), l.days, l.waiting_hours])}
          tableHead={["Request", "Employee", "Leave", "Waiting", "Status", ""]} empty={loading ? "Loading…" : "No staff leave is waiting."}
          rows={rows.map((l) => [l.ref, <div key="e"><p className="font-semibold text-slate-900">{l.name}</p><p className="text-xs text-slate-400">{l.detail}</p></div>, <div key="l"><p className="text-slate-900">{l.leave_type}</p><p className="text-xs text-slate-400">{span(l)} · {l.days} day{l.days === 1 ? "" : "s"}</p></div>, `${l.waiting_hours} h`, <Chip key="s" tone="info">With Principal</Chip>,
            <span key="a" className="flex gap-1.5"><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(l, "Approved")}>Approve</button><button type="button" className={small} disabled={act.busy} onClick={() => void decide(l, "Rejected")}>Send back</button></span>])} />
        {detail}
      </div>
    );
  }
  const pending = [...stu, ...staff].filter((l) => l.status === "Pending").sort((a, b) => b.applied_on.localeCompare(a.applied_on));
  const rows = pending.filter((l) => has(l, search));
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Leave applications", value: pending.length, sub: "All records" }, { label: "Pending", value: pending.length, sub: pending.length ? "100% of shown" : "0% of shown" }]} />
      <ListPanel title="Leave applications" noun="applications" search={search} onSearch={setSearch} exportName="leave-approval" head={["Ref.", "For", "Name", "Class / dept", "Leave type", "From", "Days", "Applied", "Status"]} exportRows={rows.map((l) => [l.ref, l.who, l.name, l.detail, l.leave_type, day(l.from_date), l.days, day(l.applied_on), l.status])}
        tableHead={["Ref.", "For", "Name", "Class / dept", "Leave type", "From", "Days", "Applied", "Status", ""]} empty={loading ? "Loading…" : "Nothing is waiting for a decision."}
        rows={rows.map((l) => [l.ref, l.who, <span key="n" className="font-semibold text-[#026f9b]">{l.name}</span>, l.detail, l.leave_type, day(l.from_date), <span key="d" className="block text-right">{l.days}</span>, day(l.applied_on), <Chip key="s" tone="warn">Pending</Chip>,
          <span key="a" className="flex gap-1.5"><button type="button" className={quietCls} disabled={act.busy} onClick={() => void decide(l, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(l, "Approved")}>Approve</button><button type="button" className={small} onClick={() => setView(l)}>View details</button></span>])} />
      {detail}
    </div>
  );
}

// ═════════════ reports ═════════════
export type AttReportTab = "monthly" | "student-wise";
export function AttendanceReportPages({ tab }: { tab: AttReportTab }) {
  const monthly = useLoad(() => (tab === "monthly" ? schoolFetch<{ year: string; items: { month: string; label: string; avg: number; days: number }[] }>(`${S}/monthly`) : Promise.resolve(null)), [tab]);
  const sw = useLoad(() => (tab === "student-wise" ? schoolFetch<{ min: number; items: { student_id: string; name: string; class_label: string; days_present: number; days_marked: number; pct: number | null }[] }>(`${S}/student-wise`) : Promise.resolve(null)), [tab]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<{ title: string; rows: [string, string | number][] } | null>(null);
  const err = <ErrorBanner message={monthly.error || sw.error} />;
  const detail = <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={() => setView(null)} /></>}</Modal>;
  if (tab === "monthly") {
    const m = monthly.data?.items ?? [];
    return (
      <div className="space-y-5" data-report>{err}
        <Panel title="Monthly attendance" sub={monthly.data?.year}>{m.length ? <div className="p-4"><ColumnChart title="Monthly attendance" format={(n) => `${n}%`} data={m.map((x) => ({ label: x.label, value: x.avg }))} /></div> : <p className="p-6 text-center text-sm text-slate-400">{monthly.loading ? "Loading…" : "No attendance has been marked this year."}</p>}</Panel>
        <ListPanel title="By month" noun="months" search="" onSearch={() => undefined} hideSearch exportName="monthly-attendance" head={["Month", "Average", "Working days"]} exportRows={m.map((x) => [x.label, `${x.avg}%`, x.days])}
          tableHead={["Month", "Average", "Working days", ""]} empty={monthly.loading ? "Loading…" : "Nothing yet."}
          rows={m.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.label}</b>, `${x.avg}%`, x.days, <button key="v" type="button" className={small} onClick={() => setView({ title: x.label, rows: [["Average", `${x.avg}%`], ["Working days", x.days]] })}>View details</button>])} />
        {detail}
      </div>
    );
  }
  const min = sw.data?.min ?? 75;
  const rows = (sw.data?.items ?? []).filter((r) => has(r, search));
  return (
    <div data-report>{err}
      <ListPanel title="Student-wise" noun="students" search={search} onSearch={setSearch} exportName="student-wise-attendance" head={["Student", "Class", "Days present", "Days marked", "Attendance"]} exportRows={rows.map((r) => [r.name, r.class_label, r.days_present, r.days_marked, r.pct != null ? `${r.pct}%` : ""])}
        tableHead={["Student", "Class", "Days present", "Attendance", `Below ${min}%?`, ""]} empty={sw.loading ? "Loading…" : "No students."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-[#026f9b]">{r.name}</b>, r.class_label, r.days_present, <span key="p" className={r.pct != null && r.pct < min ? "text-[#c0392b]" : ""}>{r.pct != null ? `${r.pct}%` : "—"}</span>, r.pct == null ? "—" : <Chip key="w" tone={r.pct < min ? "warn" : "good"}>{r.pct < min ? "Warning" : "On track"}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ title: r.name, rows: [["Class", r.class_label], ["Days present", r.days_present], ["Days marked", r.days_marked], ["Attendance", r.pct != null ? `${r.pct}%` : "—"]] })}>View details</button>])} />
      {detail}
    </div>
  );
}
