"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading, day } from "../../teacher/t/dash-pages";
import { Row } from "../../school/s/dash-pages";
import { name, pill, solid } from "../../hr/h/ui";
import { useTransport } from "../context";
import { StepStrip } from "./strip";
import { docTone } from "./vehicle-pages";
import { Done, FILE, Filtered, L, fileProblem, police, sendFile } from "./ui";

interface Person { id: string; name: string; mobile: string; status: string; police: string; experience: number | null; first_aid: boolean | null; route: string; files: { id: string; name: string }[] }
interface Driver extends Person { licence_no: string; licence_until: string | null; licence_state: string }
interface Crew { upgraded: boolean; drivers: Driver[]; attendants: Person[] }
const years = (n: number | null) => (n === null ? "—" : `${n} year${n === 1 ? "" : "s"}`);

function Roster({ kind }: { kind: "drivers" | "attendants" }) {
  const { refreshBadges } = useTransport();
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<Crew>("/transport/crew"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const [view, setView] = useState("");
  const [renew, setRenew] = useState<Driver | null>(null);
  const [till, setTill] = useState(""); const [file, setFile] = useState<File | null>(null); const [fileErr, setFileErr] = useState("");
  const driver = kind === "drivers"; const role = driver ? "driver" : "attendant";
  const list: Person[] = (driver ? x?.drivers : x?.attendants) ?? [];
  const person = list.find((p) => p.id === view);
  const verify = (id: string) => void act.run(() => schoolFetch(`/transport/crew/${role}/${id}/verify`, json("POST", {})));
  const pick = (f: File | null) => { const bad = f ? fileProblem(f) : ""; setFileErr(bad); setFile(bad ? null : f); };
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!renew) return;
    const ok = await act.run(async () => { await schoolFetch(`/transport/crew/drivers/${renew.id}/licence`, json("POST", { licence_until: till })); if (file) await sendFile(`/crew/driver/${renew.id}/documents?name=${encodeURIComponent(file.name)}`, file); });
    if (ok) setRenew(null); else reload();
  };
  const open = (id: string) => void act.run(async () => { const r = await schoolFetch<{ url: string }>(`/transport/crew-documents/${id}/link`); window.open(r.url, "_blank", "noopener,noreferrer"); });
  const upload = (id: string, f: File | undefined) => { if (!f) return; const bad = fileProblem(f); setFileErr(bad); if (!bad) void act.run(() => sendFile(`/crew/${role}/${id}/documents?name=${encodeURIComponent(f.name)}`, f)); };
  const who = (p: Person) => <button type="button" title="View details" className="text-left hover:underline" onClick={() => { setFileErr(""); setView(p.id); }}>{name(p.name, p.mobile || undefined)}</button>;
  const actions = (p: Person & Partial<Driver>) => (
    <span className="flex gap-1.5">
      {driver && (p.licence_state === "Expired" || p.licence_state === "Expiring") && <button type="button" className={pill} onClick={() => { setRenew(p as Driver); setTill(""); setFile(null); setFileErr(""); }}>Update licence</button>}
      {p.police === "Pending" && <button type="button" className={solid} disabled={act.busy} onClick={() => verify(p.id)}>Mark verified</button>}
    </span>
  );
  return (
    <div data-report>
      <Head title={driver ? "Drivers" : "Attendants"} subtitle={driver ? "Drivers with licence, police verification and the route each one drives." : "Attendants travel on every trip to help children on and off the bus."} />
      <StepStrip active="crew" />
      <ErrorBanner message={error || (renew || view ? "" : act.error)} />
      <Loading on={loading && !x} />
      {x && (driver ? (
        <Filtered key="d" title="Drivers" noun="drivers" exportName="drivers" empty="No drivers yet. Add one under Register." head={["Driver", "Licence", "Licence status", "Experience", "Police verification", "Route", ""]}
          rows={x.drivers.map((p) => ({ key: p.id, find: `${p.name} ${p.mobile} ${p.licence_no} ${p.route}`, out: [`${p.name} ${p.mobile}`, `${p.licence_no} ${p.licence_until ? `till ${day(p.licence_until)}` : ""}`, p.licence_state, years(p.experience), p.police, p.route], cells: [
            who(p), name(p.licence_no, p.licence_until ? `till ${day(p.licence_until)}` : undefined), <Chip key="l" tone={docTone(p.licence_state)}>{p.licence_state}</Chip>, years(p.experience), police(p.police), <span key="r" className={p.route === "Spare" || p.route === "Inactive" ? "text-slate-500" : ""}>{p.route}</span>, actions(p),
          ] }))} />
      ) : (
        <Filtered key="a" title="Attendants" noun="attendants" exportName="attendants" empty="No attendants yet. Add one under Register." head={["Attendant", "Experience", "First aid trained", "Police verification", "Route", ""]}
          rows={x.attendants.map((p) => { const aid = p.first_aid === null ? "" : p.first_aid ? "Yes" : "No"; return { key: p.id, find: `${p.name} ${p.mobile} ${p.route}`, out: [`${p.name} ${p.mobile}`, years(p.experience), aid, p.police, p.route], cells: [
            who(p), years(p.experience), aid ? <Chip key="f" tone={p.first_aid ? "good" : "info"}>{aid}</Chip> : "—", police(p.police), <span key="r" className={p.route === "Spare" || p.route === "Inactive" ? "text-slate-500" : ""}>{p.route}</span>, actions(p),
          ] }; })} />
      ))}
      <Modal open={!!renew} title={renew ? `Update licence · ${renew.name}` : ""} onClose={() => setRenew(null)}>
        {renew && <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <dl><Row k="Licence no." v={renew.licence_no} /><Row k="Valid till" v={renew.licence_until ? day(renew.licence_until) : "—"} /></dl>
          <L label="New valid till date"><input type="date" required className={inputCls} min={new Date().toLocaleDateString("en-CA")} value={till} onChange={(e) => setTill(e.target.value)} /></L>
          {x?.upgraded && <L label="Scan of the licence (PDF or photo, up to 5 MB)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={FILE} onChange={(e) => pick(e.target.files?.[0] ?? null)} /></L>}
          {fileErr && <p role="alert" className="text-[12px] text-[#ac2c28]">{fileErr}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setRenew(null)}>Close</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button></div>
        </form>}
      </Modal>
      <Modal open={!!person} title={person?.name ?? ""} onClose={() => setView("")}>
        {person && <>
          <ErrorBanner message={act.error} />
          <dl><Row k="Mobile" v={person.mobile || "—"} /><Row k="Experience" v={years(person.experience)} /><Row k="First aid trained" v={person.first_aid === null ? "—" : person.first_aid ? "Yes" : "No"} /><Row k="Police verification" v={person.police || "—"} /><Row k="Route" v={person.route} />
            <Row k="Documents" v={person.files.length ? <span className="flex flex-col items-start gap-1">{person.files.map((f) => <button key={f.id} type="button" className="font-semibold text-[#026f9b] hover:underline" onClick={() => open(f.id)}>{f.name}</button>)}</span> : "None uploaded"} /></dl>
          {x?.upgraded && <div className="mt-2"><L label="Add a document (PDF or photo, up to 5 MB)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={FILE} onChange={(e) => { upload(person.id, e.target.files?.[0]); e.target.value = ""; }} /></L></div>}
          {fileErr && <p role="alert" className="mt-1 text-[12px] text-[#ac2c28]">{fileErr}</p>}
          <div className="mt-4 flex justify-between gap-2 border-t border-slate-100 pt-3">
            <button type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/school/tr/${driver ? "drivers" : "attendants"}/${person.id}`, json("PATCH", { status: person.status === "Active" ? "Inactive" : "Active" })))}>{person.status === "Active" ? "Make inactive" : "Make active"}</button>
            <button type="button" className={solid} onClick={() => setView("")}>Close</button>
          </div>
        </>}
      </Modal>
    </div>
  );
}

// ═════════════ register ═════════════
function Register({ go }: { go: (tab: string) => void }) {
  const { refreshBadges } = useTransport();
  const blank = { role: "Driver", name: "", mobile: "", licence_no: "", licence_until: "", experience: "", first_aid: "Yes", police: "Pending" };
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState(""); const [done, setDone] = useState("");
  const act = useAction(refreshBadges);
  const driver = f.role === "Driver";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    const failed: string[] = []; let linked = false;
    const ok = await act.run(async () => {
      const r = await schoolFetch<{ id: string; staff_linked: boolean }>("/transport/crew", json("POST", { role: f.role, name: f.name, mobile: f.mobile, ...(driver ? { licence_no: f.licence_no, licence_until: f.licence_until } : {}), experience_years: Number(f.experience || 0), first_aid: f.first_aid === "Yes", police: f.police }));
      linked = r.staff_linked;
      for (const file of files) await sendFile(`/crew/${f.role.toLowerCase()}/${r.id}/documents?name=${encodeURIComponent(file.name)}`, file).catch((err: Error) => failed.push(err.message));
    });
    if (ok) { setDone(`${f.name} registered.${linked ? " Linked to their staff record (same mobile number)." : ""}${failed.length ? " Some documents were not uploaded: add them from the list." : ""}`); setF(blank); setFiles([]); setFileErr(failed.join(" ")); }
  };
  return (
    <div>
      <Head title="Register" subtitle="Register a driver or attendant. They can be put on a route once police verification is done." />
      <StepStrip active="crew" />
      <Done text={done} />
      {done && <p className="mb-4 text-[12.5px]"><button type="button" className="font-semibold text-[#026f9b] underline" onClick={() => go("drivers")}>See the lists</button></p>}
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Register driver or attendant</h2></div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <L label="Role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option>Driver</option><option>Attendant</option></select></L>
          <L label="Full name"><input className={inputCls} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
          <L label="Mobile"><input className={inputCls} required inputMode="tel" minLength={10} maxLength={20} placeholder="+91" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></L>
          <L label="Driving licence number" hint="Drivers only"><input className={inputCls} required={driver} disabled={!driver} minLength={5} maxLength={30} value={f.licence_no} onChange={(e) => setF({ ...f, licence_no: e.target.value })} /></L>
          <L label="Licence valid till" hint="Drivers only"><input type="date" className={inputCls} required={driver} disabled={!driver} value={f.licence_until} onChange={(e) => setF({ ...f, licence_until: e.target.value })} /></L>
          <L label="Experience (years)"><input type="number" className={inputCls} required min={0} max={60} value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} /></L>
          <L label="First aid trained"><select className={inputCls} value={f.first_aid} onChange={(e) => setF({ ...f, first_aid: e.target.value })}><option>Yes</option><option>No</option></select></L>
          <L label="Police verification"><select className={inputCls} value={f.police} onChange={(e) => setF({ ...f, police: e.target.value })}><option>Pending</option><option>Verified</option></select></L>
          <div className="sm:col-span-2 lg:col-span-5">
            <span className="mb-1 block text-[12.5px] font-medium text-slate-900">Documents</span>
            <label className={`${pill} inline-block cursor-pointer`}>Upload ID, licence and verification<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => { const list = Array.from(e.target.files ?? []); setFileErr(list.map(fileProblem).find(Boolean) ?? ""); setFiles([...files, ...list.filter((x) => !fileProblem(x))]); e.target.value = ""; }} /></label>
            {fileErr && <p role="alert" className="mt-1.5 text-[12px] text-[#ac2c28]">{fileErr}</p>}
            {files.length > 0 && <ul className="mt-2 space-y-1 text-[12.5px]">{files.map((x, i) => <li key={`${x.name}-${i}`} className="flex gap-2"><span className="min-w-0 truncate text-slate-900">{x.name}</span><button type="button" className="font-semibold text-[#ac2c28]" onClick={() => setFiles(files.filter((_, k) => k !== i))}>Remove</button></li>)}</ul>}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Register"}</button></div>
      </form>
    </div>
  );
}

export function CrewPage({ tab, go }: { tab: "drivers" | "attendants" | "register"; go: (tab: string) => void }) {
  return tab === "register" ? <Register go={go} /> : <Roster key={tab} kind={tab} />;
}
