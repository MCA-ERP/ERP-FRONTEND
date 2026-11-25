"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading, day } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, pill, solid } from "../../hr/h/ui";
import { Row } from "../../school/s/dash-pages";
import { useTransport } from "../context";
import { goTo } from "./menu-config";
import { StepStrip } from "./strip";

interface Vehicle { id: string; name: string; reg_no: string; model: string; seats: number; year: number | null; route: string; gps: string; status: string; documents: string; block: string }
interface Doc { id: string | null; vehicle_id: string; vehicle: string; reg_no: string; doc_type: string; file_name: string; valid_until: string | null; state: string }
interface Fleet { types: string[]; items: Vehicle[]; docs: Doc[]; seats: number; active: number; maintenance: number; due: number }

export const docTone = (s: string) => (s === "Valid" || s === "Active" ? "good" : s === "Expired" ? "bad" : s === "Expiring" || s === "In maintenance" ? "warn" : "mute") as "good" | "warn" | "bad" | "mute";
export const useFleet = () => useLoad(() => schoolFetch<Fleet>("/transport/vehicles"), []);
const MAX = 5 * 1024 * 1024;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const fileProblem = (f: File) => (!["application/pdf", "image/png", "image/jpeg"].includes(f.type) ? `${f.name}: use a PDF, JPG or PNG file.` : f.size > MAX ? `${f.name}: the file is larger than 5 MB.` : "");
async function sendScan(vehicle: string, docType: string, file: File) {
  const headers = { ...((await getAuthHeaders()) as Record<string, string>), "Content-Type": file.type };
  const res = await fetch(`${API_BASE}/transport/vehicles/${vehicle}/scan?doc_type=${encodeURIComponent(docType)}&name=${encodeURIComponent(file.name)}`, { method: "POST", headers, body: file });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Could not upload ${file.name}.`);
}
const L = ({ label, children }: { label: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

// ═════════════ fleet ═════════════
function FleetPage() {
  const { refreshBadges } = useTransport();
  const router = useRouter();
  const params = useSearchParams();
  const { data: x, error, loading, reload } = useFleet();
  const act = useAction(() => { reload(); refreshBadges(); });
  const [view, setView] = useState<Vehicle | null>(null);
  const find = params.get("q")?.toLowerCase() ?? "";
  return (
    <div data-report>
      <Head title="Fleet" subtitle="Every school vehicle with its capacity, documents and current status." />
      <StepStrip active="vehicles" />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && (
        <div className="space-y-4">
          <Tiles>
            <Tile label="Vehicles" value={x.items.length} sub={`${x.active} active`} />
            <Tile label="Seats" value={x.seats} sub="Across the fleet" />
            <Tile tone="amber" label="Documents due" value={x.due} sub="Expired or due in 30 days" />
            <Tile label="In maintenance" value={x.maintenance} sub="Not available for trips" />
          </Tiles>
          {find && <p className="text-[12.5px] text-slate-600">Showing “{params.get("q")}” · <button type="button" className="font-semibold text-[#026f9b]" onClick={() => router.replace(goTo("vehicles", "fleet"))}>Show all</button></p>}
          <Table title="Fleet" noun="vehicles" exportName="fleet" empty="No vehicles yet. Add one under Add Vehicle." head={[{ h: "Vehicle" }, { h: "Model" }, { h: "Year" }, { h: "Route" }, { h: "Documents" }, { h: "Status" }, { h: "" }]}
            rows={x.items.filter((v) => !find || `${v.name} ${v.reg_no}`.toLowerCase().includes(find)).map((v) => ({ key: v.id, find: `${v.name} ${v.reg_no} ${v.model} ${v.route} ${v.documents} ${v.status}`, out: [`${v.name} ${v.reg_no}`, `${v.model} · ${v.seats} seats`, v.year ?? "", v.route, v.documents, v.status], cells: [
              <button key="n" type="button" className="text-left hover:underline" title="View details" onClick={() => setView(v)}>{name(v.name, v.reg_no === v.name ? undefined : v.reg_no)}</button>,
              `${v.model} · ${v.seats} seats`, v.year ?? "—", v.route || "—", <Chip key="d" tone={docTone(v.documents)}>{v.documents}</Chip>, <Chip key="s" tone={docTone(v.status)}>{v.status}</Chip>,
              <button key="b" type="button" className={pill} onClick={() => router.push(`${goTo("vehicles", "documents")}&q=${encodeURIComponent(v.reg_no)}`)}>Documents</button>,
            ] }))} />
        </div>
      )}
      <Modal open={!!view} title={view ? `${view.name} · ${view.reg_no}` : ""} onClose={() => setView(null)}>
        {view && <>
          <ErrorBanner message={act.error} />
          <dl><Row k="Model" v={view.model} /><Row k="Seats" v={view.seats} /><Row k="Year" v={view.year ?? "—"} /><Row k="Route" v={view.route || "—"} /><Row k="GPS device" v={view.gps} /><Row k="Documents" v={view.documents} /><Row k="Status" v={view.status} /></dl>
          <div className="mt-4 flex justify-between gap-2 border-t border-slate-100 pt-3">
            <button type="button" className={pill} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/school/tr/vehicles/${view.id}`, json("PATCH", { status: view.status === "Active" ? "In maintenance" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Send for maintenance" : "Make active"}</button>
            <button type="button" className={solid} onClick={() => setView(null)}>Close</button>
          </div>
        </>}
      </Modal>
    </div>
  );
}

// ═════════════ add vehicle ═════════════
const DATES: [string, string][] = [["Registration (RC)", "Registration (RC) valid till"], ["Insurance", "Insurance valid till"], ["Fitness certificate", "Fitness certificate valid till"], ["Pollution (PUC)", "Pollution (PUC) valid till"], ["Permit", "Permit valid till"], ["Road tax", "Road tax valid till"]];
function AddVehicle({ go }: { go: (tab: string) => void }) {
  const { refreshBadges } = useTransport();
  const { data: x, error, reload } = useFleet();
  const year = String(new Date().getFullYear());
  const blank = { fleet_name: "", reg_no: "", make_model: "", seats: "24", year, gps: "Fitted" };
  const [f, setF] = useState(blank);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [scans, setScans] = useState<{ file: File; doc: string }[]>([]);
  const [fileErr, setFileErr] = useState("");
  const [done, setDone] = useState("");
  const act = useAction(() => { reload(); refreshBadges(); });
  const next = `Bus ${(x?.items ?? []).reduce((n, v) => Math.max(n, Number(v.name.match(/^bus\s+(\d+)$/i)?.[1] ?? 0)), x?.items.length ?? 0) + 1}`;
  const pick = (list: File[]) => {
    const bad = list.map(fileProblem).find(Boolean) ?? "";
    setFileErr(bad);
    const free = DATES.map(([t]) => t).filter((t) => !scans.some((s) => s.doc === t));
    setScans([...scans, ...list.filter((file) => !fileProblem(file)).map((file, i) => ({ file, doc: DATES.map(([t]) => t).find((t) => file.name.toLowerCase().includes(t.split(" ")[0].toLowerCase())) ?? free[i] ?? DATES[0][0] }))]);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    const noDate = scans.find((s) => !dates[s.doc]);
    if (noDate) return setFileErr(`Enter the expiry date for ${noDate.doc} before uploading its scan.`);
    const failed: string[] = [];
    const label = f.fleet_name.trim() || next;
    const ok = await act.run(async () => {
      const r = await schoolFetch<{ id: string }>("/transport/vehicles", json("POST", { fleet_name: label, reg_no: f.reg_no, make_model: f.make_model, seats: Number(f.seats), year: Number(f.year), gps: f.gps, documents: DATES.filter(([t]) => dates[t]).map(([t]) => ({ doc_type: t, valid_until: dates[t] })) }));
      for (const s of scans) await sendScan(r.id, s.doc, s.file).catch((err: Error) => failed.push(err.message));
    });
    if (ok) { setF(blank); setDates({}); setScans([]); setFileErr(failed.join(" ")); setDone(`${label} added.${failed.length ? " Some scans were not uploaded: add them under Documents." : ""}`); }
  };
  return (
    <div>
      <Head title="Add Vehicle" subtitle="Add a vehicle and register its documents. It can be given a route once the documents are in." />
      <StepStrip active="vehicles" />
      <ErrorBanner message={error} />
      {done && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">{done} <button type="button" className="font-semibold underline" onClick={() => go("fleet")}>See the fleet</button></p>}
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New vehicle</h2></div>
        {act.error && <div className="px-5 pt-4"><ErrorBanner message={act.error} /></div>}
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <L label="Fleet name"><input className={inputCls} maxLength={40} placeholder={next} value={f.fleet_name} onChange={(e) => setF({ ...f, fleet_name: e.target.value })} /></L>
          <L label="Registration number"><input className={inputCls} required minLength={3} maxLength={30} placeholder="TS 07 UB 0000" value={f.reg_no} onChange={(e) => setF({ ...f, reg_no: e.target.value })} /></L>
          <L label="Make and model"><input className={inputCls} required minLength={2} maxLength={80} placeholder="For example, Tata Starbus" value={f.make_model} onChange={(e) => setF({ ...f, make_model: e.target.value })} /></L>
          <L label="Seats (students)"><input type="number" className={inputCls} required min={1} max={80} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} /></L>
          <L label="Year"><input type="number" className={inputCls} required min={1980} max={2100} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></L>
          <L label="GPS device"><select className={inputCls} value={f.gps} onChange={(e) => setF({ ...f, gps: e.target.value })}><option>Fitted</option><option>Not fitted</option></select></L>
        </div>
        <div className="flex items-baseline gap-2 border-y border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Documents</h2><span className="text-xs text-slate-500">Expiry dates · upload a scan of each</span></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {DATES.map(([t, label]) => <L key={t} label={label}><input type="date" className={inputCls} value={dates[t] ?? ""} onChange={(e) => setDates({ ...dates, [t]: e.target.value })} /></L>)}
          <div className="sm:col-span-2 lg:col-span-5">
            <span className="mb-1 block text-[12.5px] font-medium text-slate-900">Scans</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${pill} cursor-pointer`}>Upload documents<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => { pick(Array.from(e.target.files ?? [])); e.target.value = ""; }} /></label>
              <span className="text-[12px] text-slate-500">PDF or photo, up to 5 MB each</span>
            </div>
            {fileErr && <p role="alert" className="mt-1.5 text-[12px] text-[#ac2c28]">{fileErr}</p>}
            {scans.length > 0 && <ul className="mt-2 space-y-1.5">{scans.map((s, i) => (
              <li key={`${s.file.name}-${i}`} className="flex flex-wrap items-center gap-2 text-[12.5px]"><span className="min-w-0 truncate text-slate-900">{s.file.name}</span>
                <select aria-label={`Document for ${s.file.name}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px]" value={s.doc} onChange={(e) => setScans(scans.map((y, k) => (k === i ? { ...y, doc: e.target.value } : y)))}>{DATES.map(([t]) => <option key={t}>{t}</option>)}</select>
                <button type="button" className="font-semibold text-[#ac2c28]" onClick={() => setScans(scans.filter((_, k) => k !== i))}>Remove</button></li>
            ))}</ul>}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Add vehicle"}</button></div>
      </form>
    </div>
  );
}

// ═════════════ documents ═════════════
function DocumentsPage() {
  const { refreshBadges } = useTransport();
  const params = useSearchParams();
  const { data: x, error, loading, reload } = useFleet();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<{ doc: Doc; renew: boolean } | null>(null);
  const [till, setTill] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState("");
  const act = useAction(() => { reload(); refreshBadges(); });
  const rows = (x?.docs ?? []).filter((d) => (filter === "All" || d.state === filter) && (!q.trim() || `${d.vehicle} ${d.reg_no} ${d.doc_type}`.toLowerCase().includes(q.trim().toLowerCase())));
  const show = (doc: Doc, renew: boolean) => { setOpen({ doc, renew }); setTill(""); setFile(null); setFileErr(""); };
  const known = !!open && (x?.types ?? []).includes(open.doc.doc_type);
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!open) return;
    const ok = await act.run(async () => {
      if (open.renew) await schoolFetch(`/transport/vehicles/${open.doc.vehicle_id}/documents`, json("POST", { doc_type: open.doc.doc_type, valid_until: till }));
      if (file) await sendScan(open.doc.vehicle_id, open.doc.doc_type, file);
    });
    if (ok) setOpen(null); else reload();
  };
  const view = async (id: string) => { await act.run(async () => { const r = await schoolFetch<{ url: string }>(`/transport/documents/${id}/link`); window.open(r.url, "_blank", "noopener,noreferrer"); }); };
  return (
    <div data-report>
      <Head title="Documents" subtitle="Registration, insurance, fitness, pollution, permit and road tax for every vehicle. Renew before the expiry date." />
      <StepStrip active="vehicles" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (
        <Panel title="Vehicle documents" sub={`${rows.length} document${rows.length === 1 ? "" : "s"}`} right={<ExportPrint name="vehicle-documents" head={["Vehicle", "Registration", "Document", "Valid till", "Status"]} rows={rows.map((d) => [d.vehicle, d.reg_no, d.doc_type, d.valid_until ? day(d.valid_until) : "", d.state])} />}>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            <label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vehicle documents" aria-label="Search vehicle documents" className="w-full bg-transparent outline-none" /></label>
            <select aria-label="Status" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]" value={filter} onChange={(e) => setFilter(e.target.value)}>{["All", "Expired", "Expiring", "Valid", "No date"].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <SimpleTable head={[{ h: "Vehicle" }, { h: "Document" }, { h: "Valid till" }, { h: "Status" }, { h: "" }]} empty="No documents yet." rows={rows.map((d) => {
            const due = d.state === "Expired" || d.state === "Expiring";
            return [<span key="v"><b className="font-semibold text-slate-900">{d.vehicle}</b>{d.reg_no !== d.vehicle && <span className="text-slate-500"> {d.reg_no}</span>}</span>, d.doc_type, d.valid_until ? day(d.valid_until) : "—", <Chip key="s" tone={docTone(d.state)}>{d.state}</Chip>,
              <button key="b" type="button" className={due ? solid : pill} onClick={() => show(d, due)}>{due ? "Renew" : "View"}</button>];
          })} />
        </Panel>
      )}
      <Modal open={!!open} title={open ? `${open.doc.vehicle} · ${open.doc.doc_type}` : ""} onClose={() => setOpen(null)}>
        {open && (
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={act.error} />
            <dl><Row k="Registration" v={open.doc.reg_no} /><Row k="Valid till" v={open.doc.valid_until ? day(open.doc.valid_until) : "—"} /><Row k="Status" v={open.doc.state} /><Row k="Scan" v={open.doc.file_name && open.doc.file_name !== "No scan yet" ? open.doc.file_name : "No scan yet"} /></dl>
            {known && open.renew && <L label="New valid till date"><input type="date" required className={inputCls} min={new Date().toLocaleDateString("en-CA")} value={till} onChange={(e) => setTill(e.target.value)} /></L>}
            {known && <L label={open.renew ? "Scan of the new document (PDF or photo, up to 5 MB)" : "Upload a scan (PDF or photo, up to 5 MB)"}><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={FILE} onChange={(e) => { const f = e.target.files?.[0] ?? null; const bad = f ? fileProblem(f) : ""; setFileErr(bad); setFile(bad ? null : f); if (bad) e.target.value = ""; }} /></L>}
            {fileErr && <p role="alert" className="text-[12px] text-[#ac2c28]">{fileErr}</p>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="flex gap-2">{open.doc.id && open.doc.file_name !== "No scan yet" && <button type="button" className={pill} disabled={act.busy} onClick={() => void view(open.doc.id!)}>Open scan</button>}{known && !open.renew && <button type="button" className={pill} onClick={() => setOpen({ ...open, renew: true })}>Renew</button>}</span>
              <span className="flex gap-2"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => setOpen(null)}>Close</button>{known && (open.renew || file) && <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button>}</span>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function VehiclePage({ tab, go }: { tab: "fleet" | "add-vehicle" | "documents"; go: (tab: string) => void }) {
  return tab === "fleet" ? <FleetPage /> : tab === "add-vehicle" ? <AddVehicle go={go} /> : <DocumentsPage />;
}
