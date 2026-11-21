"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";

const H = "/school/hr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Completed", "Verified", "Available", "Complete", "Closed", "Approved"].includes(s) ? "good" : ["Pending review", "Scheduled", "Collecting", "Self-review pending", "Reviewer pending"].includes(s) ? "warn" : ["Expired", "Rejected"].includes(s) ? "bad" : ["In progress", "Moderation", "Used"].includes(s) ? "info" : "mute");
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const ctl = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]";

// ═════════════ leave ═════════════
export function LeaveHrPages({ tab }: { tab: "leave-types" | "approvals" | "leave-balance" | "policy-rules" | "comp-off" }) {
  const lt = useLoad(() => (tab === "leave-types" ? schoolFetch<{ items: { id: string; name: string; days_per_year: number; carry_forward: string; needs_proof: string; status: string }[] }>(`${H}/leave-types`) : Promise.resolve(null)), [tab]);
  const ap = useLoad(() => (tab === "approvals" ? schoolFetch<{ levels: { label: string; count: number; overdue: number }[]; items: { id: string; code: string; employee: string; detail: string; leave: string; from: string; days: number; route: string[]; level: number; waiting: string; overdue: boolean; status: string }[] }>(`${H}/leave-approvals`) : Promise.resolve(null)), [tab]);
  const bl = useLoad(() => (tab === "leave-balance" ? schoolFetch<{ year: string; items: { id: string; name: string; designation: string; department: string; casual: Bal; sick: Bal; earned: Bal; total_left: number }[] }>(`${H}/leave-balance`) : Promise.resolve(null)), [tab]);
  const po = useLoad(() => (tab === "policy-rules" ? schoolFetch<Pol>(`${H}/leave-policy`) : Promise.resolve(null)), [tab]);
  const co = useLoad(() => (tab === "comp-off" ? schoolFetch<{ staff: { id: string; name: string }[]; items: { id: string; employee: string; worked_on: string; reason: string; use_by: string; status: string }[] }>(`${H}/comp-offs`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { lt.reload(); ap.reload(); po.reload(); co.reload(); });
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [view, setView] = useState<{ title: string; rows: [string, string | number][]; id?: string; status?: string; days?: number } | null>(null);
  const [adding, setAdding] = useState(false); const [n, setN] = useState({ name: "", days: "", carry: "No", proof: "No" });
  const [p, setP] = useState<Partial<Pol>>({});
  const [g, setG] = useState({ profile_id: "", worked_on: nowIst(), reason: "" });
  const err = <ErrorBanner message={lt.error || ap.error || bl.error || po.error || co.error || act.error} />;
  if (tab === "leave-types") {
    const all = lt.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const a = all.filter((x) => x.status === "Active").length;
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/leave-types`, json("POST", { name: n.name, days_per_year: Number(n.days) || 0, carry_forward: n.carry, needs_proof: n.proof })))) { setAdding(false); setN({ name: "", days: "", carry: "No", proof: "No" }); } };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Leave types", value: all.length, sub: "All records" }, { label: "Active", value: a, sub: `${pct(a, all.length)} of shown` }]} />
        <ListPanel title="Leave types" noun="types" search={search} onSearch={setSearch} exportName="leave-types" head={["Leave type", "Days per year", "Carry forward", "Needs proof", "Status"]} exportRows={rows.map((x) => [x.name, x.days_per_year, x.carry_forward, x.needs_proof, x.status])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add leave type</button>} tableHead={["Leave type", "Days per year", "Carry forward", "Needs proof", "Status", ""]} empty={lt.loading ? "Loading…" : "No leave types."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.days_per_year, x.carry_forward, x.needs_proof, <Chip key="s" tone={x.status === "Active" ? "good" : "mute"}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setView({ title: x.name, id: x.id, status: x.status, days: x.days_per_year, rows: [["Days per year", x.days_per_year], ["Carry forward", x.carry_forward], ["Needs proof", x.needs_proof], ["Status", x.status]] }); }}>View details</button>])} />
        <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
          <Foot close={() => setView(null)} left={<><button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/leave-types/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Inactive" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Make inactive" : "Make active"}</button><button type="button" className={small} disabled={act.busy} onClick={() => { const v = window.prompt("Days per year", String(view.days)); if (v !== null && v.trim() !== "") void act.run(() => schoolFetch(`${H}/leave-types/${view.id}`, json("PATCH", { days_per_year: Number(v) }))).then((ok) => ok && setView(null)); }}>Change days</button></>} /></>}</Modal>
        <Modal open={adding} title="Add a leave type" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Leave type"><input className={inputCls} required minLength={2} maxLength={60} value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field><div className="grid grid-cols-3 gap-3"><Field label="Days per year"><input type="number" min={0} className={inputCls} value={n.days} onChange={(e) => setN({ ...n, days: e.target.value })} /></Field><Field label="Carry forward"><input className={inputCls} maxLength={40} value={n.carry} onChange={(e) => setN({ ...n, carry: e.target.value })} /></Field><Field label="Needs proof"><input className={inputCls} maxLength={40} value={n.proof} onChange={(e) => setN({ ...n, proof: e.target.value })} /></Field></div><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "approvals") {
    const x = ap.data; if (!x) return <Loading e={ap.error} />;
    const rows = x.items.filter((i) => has(i, search));
    const dec = (id: string, action: string) => void act.run(() => schoolFetch(`${H}/leave-approvals/${id}`, json("POST", { action })));
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={x.levels.map((l) => ({ label: l.label, value: l.count, sub: l.overdue ? <span className="text-[#ac2c28]">{l.overdue} overdue</span> : "None overdue" }))} />
        <ListPanel title="Leave waiting for approval" noun="requests" search={search} onSearch={setSearch} exportName="leave-approvals" head={["Request", "Employee", "Leave", "Route", "Waiting", "Status"]} exportRows={rows.map((i) => [i.code, i.employee, `${i.leave} · ${day(i.from)} · ${i.days} days`, i.route.join(" › "), i.waiting, i.status])}
          tableHead={["Request", "Employee", "Leave", "Route", "Waiting", "Status", ""]} empty={ap.loading ? "Loading…" : "Nothing is waiting."}
          rows={rows.map((i) => [i.code, <span key="e"><b className="font-semibold text-slate-900">{i.employee}</b><span className="block text-[11px] text-slate-500">{i.detail}</span></span>, <span key="l">{i.leave}<span className="block text-[11px] text-slate-500">{day(i.from)} · {i.days} {i.days === 1 ? "day" : "days"}</span></span>, <span key="r" className="flex flex-wrap gap-1">{i.route.map((r, k) => <Chip key={r} tone={k + 1 === i.level ? "info" : "mute"}>{r}</Chip>)}</span>, <span key="w" className={i.overdue ? "font-semibold text-[#ac2c28]" : ""}>{i.waiting}</span>, <Chip key="s" tone="info">{i.status}</Chip>,
            <span key="b" className="flex gap-1.5"><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i.id, "approve")}>Approve</button><button type="button" className={small} disabled={act.busy} onClick={() => dec(i.id, "send_back")}>Send back</button></span>])} />
      </div>
    );
  }
  if (tab === "leave-balance") {
    const x = bl.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
    const cell = (b: Bal) => `${b.left} left · ${b.used} used`;
    return (
      <div data-report>{err}
        <ListPanel title={`Leave balance · ${x?.year ?? ""}`} noun="staff" search={search} onSearch={setSearch} exportName="leave-balance" head={["Staff", "Department", "Casual left", "Casual used", "Sick left", "Sick used", "Earned left", "Total left"]} exportRows={rows.map((i) => [i.name, i.department, i.casual.left, i.casual.used, i.sick.left, i.sick.used, i.earned.left, i.total_left])}
          tableHead={["Staff", "Department", "Casual", "Sick", "Earned", "Total left", ""]} empty={bl.loading ? "Loading…" : "No staff."}
          rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-[#026f9b]">{i.designation}</span></span>, i.department || "—", cell(i.casual), cell(i.sick), `${i.earned.left} left`, <b key="t" className="font-semibold">{i.total_left} days</b>, <button key="v" type="button" className={small} onClick={() => setView({ title: i.name, rows: [["Casual", `${i.casual.left} left of ${i.casual.allowed}`], ["Sick", `${i.sick.left} left of ${i.sick.allowed}`], ["Earned", `${i.earned.left} left of ${i.earned.allowed}`], ["Total left", `${i.total_left} days`]] })}>View details</button>])} />
        <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><Foot close={() => setView(null)} /></>}</Modal>
      </div>
    );
  }
  if (tab === "policy-rules") {
    const c = po.data; if (!c) return <Loading e={po.error} />;
    const v = <K extends keyof Pol>(k: K) => (p[k] ?? c[k]) as Pol[K];
    const save = async () => { setMsg(""); if (await act.run(() => schoolFetch(`${H}/leave-policy`, json("PUT", { sandwich: v("sandwich"), half_day: v("half_day"), medical_days: Number(v("medical_days")), earned_notice: Number(v("earned_notice")), carry_forward: Number(v("carry_forward")), encash_year: Number(v("encash_year")), encash_exit: Number(v("encash_exit")), compoff_days: Number(v("compoff_days")), probation: v("probation"), runout: v("runout") })))) { setP({}); setMsg("Policy saved."); } };
    const num = (k: "medical_days" | "earned_notice" | "carry_forward" | "encash_year" | "encash_exit" | "compoff_days", label: string, hint: string) => <div key={k}><p className="mb-1 text-[12px] text-slate-700">{label}</p><div className="flex items-center gap-2"><input type="number" min={0} aria-label={label} className={`${ctl} w-24`} value={String(v(k))} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} /><span className="text-[12px] text-slate-500">days</span></div><p className="mt-1 text-[11px] text-[#026f9b]">{hint}</p></div>;
    const sel = (k: "sandwich" | "half_day" | "probation" | "runout", label: string, hint: string) => <div key={k}><p className="mb-1 text-[12px] text-slate-700">{label}</p><select aria-label={label} className={`${ctl} w-full`} value={v(k)} onChange={(e) => setP({ ...p, [k]: e.target.value })}>{c.options[k].map((o) => <option key={o}>{o}</option>)}</select><p className="mt-1 text-[11px] text-[#026f9b]">{hint}</p></div>;
    return (
      <div>{err}{okBox(msg)}
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Leave policy</h2><span className="text-xs text-slate-500">Teaching and non-teaching staff</span></div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {sel("sandwich", "Sandwich rule", "A Sunday or holiday between two leave days counts as leave")}{sel("half_day", "Half-day leave", "Staff can take half a day of casual or sick leave")}{num("medical_days", "Medical certificate", "Sick leave longer than this needs a doctor's certificate")}{num("earned_notice", "Earned leave notice", "Applied for this many days before earned leave starts. Enforced.")}{num("carry_forward", "Earned leave carry-forward", "Unused earned leave carried to next year, up to")}
            {num("encash_year", "Earned leave encashment", "Days that can be encashed each year")}{num("encash_exit", "Encashment at exit", "Earned leave paid out in the full and final settlement, up to")}{num("compoff_days", "Comp-off validity", "Comp-off for Sunday or holiday duty must be used within. Enforced.")}{sel("probation", "During probation", "Leave allowed while on probation")}{sel("runout", "When the balance runs out", "Leave beyond the balance becomes")}</div>
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5"><button type="button" className={btnGhost} onClick={() => { setP({}); setMsg(""); }}>Discard</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save policy</button></div></div>
        <p className="mt-3 text-xs text-slate-500">Earned leave notice and comp-off validity are applied. The other rules are saved and shown to staff but not enforced yet.</p>
      </div>
    );
  }
  const x = co.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
  const grant = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/comp-offs`, json("POST", { profile_id: g.profile_id || x?.staff[0]?.id, worked_on: g.worked_on, reason: g.reason })))) setG({ ...g, reason: "" }); };
  return (
    <div className="space-y-5" data-report>{err}
      <form onSubmit={grant} className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Grant a comp-off</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-3"><Field label="Employee"><select className={inputCls} value={g.profile_id || x?.staff[0]?.id || ""} onChange={(e) => setG({ ...g, profile_id: e.target.value })}>{x?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Worked on"><input type="date" required max={nowIst()} className={inputCls} value={g.worked_on} onChange={(e) => setG({ ...g, worked_on: e.target.value })} /></Field><Field label="Reason"><input className={inputCls} required minLength={2} maxLength={200} placeholder="For example, Sunday · Open day" value={g.reason} onChange={(e) => setG({ ...g, reason: e.target.value })} /></Field></div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="submit" className={btnPrimary} disabled={act.busy}>Grant comp-off</button></div></form>
      <ListPanel title="Comp-off register" noun="comp-offs" search={search} onSearch={setSearch} exportName="comp-off" head={["Employee", "Worked on", "Reason", "Use by", "Status"]} exportRows={rows.map((i) => [i.employee, day(i.worked_on), i.reason, day(i.use_by), i.status])}
        tableHead={["Employee", "Worked on", "Reason", "Use by", "Status", ""]} empty={co.loading ? "Loading…" : "No comp-offs yet."}
        rows={rows.map((i) => [<b key="e" className="font-semibold text-slate-900">{i.employee}</b>, day(i.worked_on), i.reason, day(i.use_by), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.status === "Available" ? <button key="u" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/comp-offs/${i.id}/use`, json("POST", {})))}>Mark used</button> : null])} />
    </div>
  );
}
interface Bal { allowed: number; used: number; left: number }
interface Pol { options: { sandwich: string[]; half_day: string[]; probation: string[]; runout: string[] }; sandwich: string; half_day: string; medical_days: number; earned_notice: number; carry_forward: number; encash_year: number; encash_exit: number; compoff_days: number; probation: string; runout: string }

// ═════════════ staff documents ═════════════
export function DocumentPages({ tab }: { tab: "certificates" | "id-proof" | "contracts" }) {
  const type = { certificates: "Certificates", "id-proof": "ID proof", contracts: "Contracts" }[tab];
  const d = useLoad(() => schoolFetch<{ staff: { id: string; name: string }[]; items: { id: string; staff: string; doc_type: string; file_name: string; uploaded_on: string; valid_until: string | null; status: string }[] }>(`${H}/documents/${encodeURIComponent(type)}`), [type]);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [adding, setAdding] = useState(false); const [f, setF] = useState({ staff_id: "", file_name: "", valid_until: "" });
  const [view, setView] = useState<(typeof rows)[number] | null>(null);
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length;
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/documents`, json("POST", { staff_id: f.staff_id || d.data?.staff[0]?.id, doc_type: type, file_name: f.file_name, valid_until: f.valid_until || null })))) { setAdding(false); setF({ ...f, file_name: "", valid_until: "" }); } };
  const tiles = tab === "certificates" ? [["Verified", n("Verified")], ["Expired", n("Expired")], ["Pending review", n("Pending review")]] : tab === "id-proof" ? [["Pending review", n("Pending review")], ["Verified", n("Verified")]] : [["Verified", n("Verified")], ["Pending review", n("Pending review")], ["Expired", n("Expired")]];
  return (
    <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />
      <Tiles items={[{ label: "Staff documents", value: all.length, sub: "All records" }, ...tiles.map(([l, v]) => ({ label: String(l), value: v, sub: `${pct(Number(v), all.length)} of shown` }))]} />
      <ListPanel title="Staff documents" noun="documents" search={search} onSearch={setSearch} exportName={`staff-${tab}`} head={["Staff", "Document", "File", "Uploaded", "Valid until", "Status"]} exportRows={rows.map((i) => [i.staff, i.doc_type, i.file_name, day(i.uploaded_on), i.valid_until ? day(i.valid_until) : "", i.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add document</button>} tableHead={["Staff", "Document", "File", "Uploaded", "Valid until", "Status", ""]} empty={d.loading ? "Loading…" : "No documents yet."}
        rows={rows.map((i) => [<b key="s" className="font-semibold text-slate-900">{i.staff}</b>, i.doc_type, i.file_name, day(i.uploaded_on), i.valid_until ? day(i.valid_until) : "—", <Chip key="t" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
      <Modal open={!!view} title={view?.staff ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Document" v={view.doc_type} /><Row k="File" v={view.file_name} /><Row k="Uploaded" v={day(view.uploaded_on)} /><Row k="Valid until" v={view.valid_until ? day(view.valid_until) : "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={view.status === "Pending review" ? <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/documents/${view.id}/verify`, json("POST", {}))).then((ok) => ok && setView(null))}>Mark verified</button> : undefined} /></>}</Modal>
      <Modal open={adding} title={`Add a document · ${type}`} onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Staff"><select className={inputCls} value={f.staff_id || d.data?.staff[0]?.id || ""} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>{d.data?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="File name"><input className={inputCls} required minLength={2} maxLength={160} placeholder="appointment-letter.pdf" value={f.file_name} onChange={(e) => setF({ ...f, file_name: e.target.value })} /></Field><Field label="Valid until"><input type="date" className={inputCls} value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></Field><p className="text-xs text-slate-500">Files can&apos;t be uploaded yet; only the file name is kept.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ staff performance ═════════════
type PerfTab = "appraisals" | "reviews" | "ratings" | "360-feedback" | "competency-matrix" | "increment-recommendation" | "kpis-and-kras" | "appraisal-cycle";
export function PerformancePages({ tab }: { tab: PerfTab }) {
  const kind = tab === "appraisals" ? "Appraisals" : tab === "reviews" ? "Reviews" : "Ratings";
  const ap = useLoad(() => (["appraisals", "reviews", "ratings"].includes(tab) ? schoolFetch<{ staff: { id: string; name: string }[]; items: { id: string; staff: string; kind: string; reviewer: string; period: string; rating: number | null; remarks: string; status: string }[] }>(`${H}/appraisals/${kind}`) : Promise.resolve(null)), [tab]);
  const fb = useLoad(() => (tab === "360-feedback" ? schoolFetch<{ cycle: string; items: Fb[] }>(`${H}/feedback360`) : Promise.resolve(null)), [tab]);
  const dir = useLoad(() => (tab === "competency-matrix" ? schoolFetch<{ items: { id: string; name: string; designation: string; emp_code: string; department: string; status: string }[] }>(`${H}/directory`) : Promise.resolve(null)), [tab]);
  const [pick, setPick] = useState("");
  const pid = pick || dir.data?.items[0]?.id || "";
  const cm = useLoad(() => (tab === "competency-matrix" && pid ? schoolFetch<{ items: { name: string; expected: number; level: number; gap: number | null; training: string }[] }>(`${H}/competency/${pid}`) : Promise.resolve(null)), [tab, pid]);
  const inc = useLoad(() => (tab === "increment-recommendation" ? schoolFetch<Inc>(`${H}/increments`) : Promise.resolve(null)), [tab]);
  const [grp, setGrp] = useState("Teacher");
  const kr = useLoad(() => (tab === "kpis-and-kras" ? schoolFetch<{ items: { id: string; area: string; weight: number; measure: string }[]; total: number }>(`${H}/kras/${grp}`) : Promise.resolve(null)), [tab, grp]);
  const cy = useLoad(() => (tab === "appraisal-cycle" ? schoolFetch<Cyc>(`${H}/cycle`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { ap.reload(); fb.reload(); cm.reload(); inc.reload(); kr.reload(); cy.reload(); });
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false); const [a, setA] = useState({ staff_id: "", reviewer: "", period: "", rating: "", remarks: "" });
  const [view, setView] = useState<{ id: string; title: string; rows: [string, string | number][]; status: string; rating: string } | null>(null);
  const [fe, setFe] = useState<{ id: string; name: string; v: Record<string, string> } | null>(null);
  const [sc, setSc] = useState<{ id: string; name: string; self: string; rev: string } | null>(null);
  const [kf, setKf] = useState({ area: "", weight: "", measure: "" }); const [addK, setAddK] = useState(false);
  const send = async () => { setMsg(""); let t = ""; if (await act.run(async () => { const r = await schoolFetch<{ sent: number }>(`${H}/increments/send`, json("POST", {})); t = `Sent ${r.sent} recommendations to the Principal.`; })) setMsg(t); };
  const go = useRef(send); useEffect(() => { go.current = send; });
  useEffect(() => { const h = () => void go.current(); window.addEventListener("hr-send-increments", h); return () => window.removeEventListener("hr-send-increments", h); }, []);
  const err = <ErrorBanner message={ap.error || fb.error || dir.error || cm.error || inc.error || kr.error || cy.error || act.error} />;

  if (["appraisals", "reviews", "ratings"].includes(tab)) {
    const all = ap.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (s: string) => all.filter((i) => i.status === s).length;
    const tiles = tab === "appraisals" ? [["Completed", n("Completed")], ["Scheduled", n("Scheduled")], ["In progress", n("In progress")]] : tab === "reviews" ? [["In progress", n("In progress")], ["Completed", n("Completed")]] : [["Completed", n("Completed")], ["In progress", n("In progress")], ["Scheduled", n("Scheduled")]];
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/appraisals`, json("POST", { staff_id: a.staff_id || ap.data?.staff[0]?.id, kind, reviewer: a.reviewer, period: a.period, rating: a.rating ? Number(a.rating) : null, remarks: a.remarks })))) { setAdding(false); setA({ ...a, period: "", rating: "", remarks: "" }); } };
    const upd = async (body: object) => { if (view && await act.run(() => schoolFetch(`${H}/appraisals/${view.id}`, json("PATCH", body)))) setView(null); };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Appraisals", value: all.length, sub: "All records" }, ...tiles.map(([l, v]) => ({ label: String(l), value: v, sub: `${pct(Number(v), all.length)} of shown` }))]} />
        <ListPanel title="Appraisals" noun="reviews" search={search} onSearch={setSearch} exportName={tab} head={["Staff", "Type", "Reviewer", "Period", "Rating", "Remarks", "Status"]} exportRows={rows.map((i) => [i.staff, i.kind, i.reviewer, i.period, i.rating ?? "", i.remarks, i.status])}
          extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add</button>} tableHead={["Staff", "Type", "Reviewer", "Period", "Rating", "Remarks", "Status", ""]} empty={ap.loading ? "Loading…" : "None yet."}
          rows={rows.map((i) => [<b key="s" className="font-semibold text-slate-900">{i.staff}</b>, i.kind, i.reviewer || "—", i.period, <span key="r" className="block text-right">{i.rating ?? "—"}</span>, i.remarks || "—", <Chip key="t" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView({ id: i.id, title: i.staff, status: i.status, rating: String(i.rating ?? ""), rows: [["Type", i.kind], ["Reviewer", i.reviewer || "—"], ["Period", i.period], ["Rating", i.rating ?? "—"], ["Remarks", i.remarks || "—"], ["Status", i.status]] })}>View details</button>])} />
        <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <><dl>{view.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Rating"><select className={inputCls} value={view.rating} onChange={(e) => setView({ ...view, rating: e.target.value })}><option value="">—</option>{[1, 2, 3, 4, 5].map((r) => <option key={r}>{r}</option>)}</select></Field><Field label="Status"><select className={inputCls} value={view.status} onChange={(e) => setView({ ...view, status: e.target.value })}>{["Scheduled", "In progress", "Completed"].map((s) => <option key={s}>{s}</option>)}</select></Field></div><Foot close={() => setView(null)} left={<button type="button" className={primaryCls} disabled={act.busy} onClick={() => void upd({ status: view.status, rating: view.rating ? Number(view.rating) : null })}>Save</button>} /></>}</Modal>
        <Modal open={adding} title={`Add · ${kind}`} onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Staff"><select className={inputCls} value={a.staff_id || ap.data?.staff[0]?.id || ""} onChange={(e) => setA({ ...a, staff_id: e.target.value })}>{ap.data?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><div className="grid grid-cols-3 gap-3"><Field label="Reviewer"><input className={inputCls} maxLength={100} value={a.reviewer} onChange={(e) => setA({ ...a, reviewer: e.target.value })} /></Field><Field label="Period"><input className={inputCls} required maxLength={30} placeholder="2026-27" value={a.period} onChange={(e) => setA({ ...a, period: e.target.value })} /></Field><Field label="Rating"><select className={inputCls} value={a.rating} onChange={(e) => setA({ ...a, rating: e.target.value })}><option value="">—</option>{[1, 2, 3, 4, 5].map((r) => <option key={r}>{r}</option>)}</select></Field></div><Field label="Remarks"><input className={inputCls} maxLength={200} value={a.remarks} onChange={(e) => setA({ ...a, remarks: e.target.value })} /></Field><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "360-feedback") {
    const x = fb.data; if (!x) return <Loading e={fb.error} />;
    const rows = x.items.filter((i) => has(i, search)); const done = x.items.filter((i) => i.status === "Complete").length;
    const sN = x.items.reduce((n, i) => n + i.students_n, 0); const pN = x.items.reduce((n, i) => n + i.parents_n, 0);
    const save = async (e: FormEvent) => { e.preventDefault(); if (fe && await act.run(() => schoolFetch(`${H}/feedback360/${fe.id}`, json("PUT", Object.fromEntries(Object.entries(fe.v).map(([k, v]) => [k, v === "" ? (k.endsWith("_n") ? 0 : null) : Number(v)])))))) setFe(null); };
    const n3 = (v: number | null) => (v === null ? "—" : v.toFixed(1));
    return (
      <div className="space-y-5" data-report>{err}
        <p className="text-[12px] text-slate-500">Weights: Self 10%, Peers 20%, HOD 30%, Students 25%, Parents 15%. Scores are entered here; the apps don&apos;t collect them yet.</p>
        <Tiles items={[{ label: "Teachers", value: x.items.length, sub: `${x.cycle} cycle` }, { label: "Complete", value: done, sub: "" }, { label: "Collecting", value: x.items.length - done, sub: "" }, { label: "Responses so far", value: (sN + pN).toLocaleString("en-IN"), sub: `students ${sN.toLocaleString("en-IN")} · parents ${pN.toLocaleString("en-IN")}` }]} />
        <ListPanel title={`360° feedback · ${x.cycle}`} noun="teachers" search={search} onSearch={setSearch} exportName="360-feedback" head={["Teacher", "Self", "Peers", "HOD", "Students", "Parents", "360° score", "Status"]} exportRows={rows.map((i) => [i.name, i.self ?? "", i.peers ?? "", i.hod ?? "", i.students ?? "", i.parents ?? "", i.score ?? "", i.status])}
          tableHead={["Teacher", "Self", "Peers", "HOD", "Students", "Parents", "360° score", "Status", ""]} empty={fb.loading ? "Loading…" : "No teaching staff."}
          rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.department}</span></span>, n3(i.self), n3(i.peers), n3(i.hod), n3(i.students), n3(i.parents), <b key="s" className="font-semibold">{i.score === null ? "—" : i.score.toFixed(2)}</b>, <Chip key="t" tone={T(i.status)}>{i.status}</Chip>, <button key="e" type="button" className={small} onClick={() => setFe({ id: i.id, name: i.name, v: { self: String(i.self ?? ""), peers: String(i.peers ?? ""), hod: String(i.hod ?? ""), students: String(i.students ?? ""), parents: String(i.parents ?? ""), students_n: String(i.students_n), parents_n: String(i.parents_n) } })}>Enter scores</button>])} />
        <Modal open={!!fe} title={fe ? `360° scores · ${fe.name}` : ""} onClose={() => setFe(null)}>{fe && <form onSubmit={save} className="space-y-3"><div className="grid grid-cols-3 gap-3">{(["self", "peers", "hod", "students", "parents"] as const).map((k) => <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} (0–5)`}><input type="number" min={0} max={5} step={0.1} className={inputCls} value={fe.v[k]} onChange={(e) => setFe({ ...fe, v: { ...fe.v, [k]: e.target.value } })} /></Field>)}</div><div className="grid grid-cols-2 gap-3"><Field label="Student responses"><input type="number" min={0} className={inputCls} value={fe.v.students_n} onChange={(e) => setFe({ ...fe, v: { ...fe.v, students_n: e.target.value } })} /></Field><Field label="Parent responses"><input type="number" min={0} className={inputCls} value={fe.v.parents_n} onChange={(e) => setFe({ ...fe, v: { ...fe.v, parents_n: e.target.value } })} /></Field></div><FormFoot close={() => setFe(null)} busy={act.busy} /></form>}</Modal>
      </div>
    );
  }
  if (tab === "competency-matrix") {
    const cur = dir.data?.items.find((s) => s.id === pid);
    return (
      <div>{err}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Employee<select aria-label="Employee" value={pid} onChange={(e) => setPick(e.target.value)} className="max-w-[26rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{dir.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}{s.designation ? ` · ${s.designation}` : ""}</option>)}</select></label>{cur && <><Chip tone="good">{cur.status}</Chip><span className="ml-auto text-[12px] text-slate-500">{cur.emp_code} · {cur.department}</span></>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Competencies · {cur?.name}</h2><span className="text-xs text-slate-500">expected level shown as the outline; click a dot to set the level</span></div>
          <ul>{cm.data?.items.map((c) => <li key={c.name} className="grid grid-cols-[14rem_9rem_5rem_1fr] items-center gap-3 border-b border-slate-100 px-5 py-3 text-[13px] last:border-b-0"><span className="text-slate-900">{c.name}</span><span className="flex gap-1">{[1, 2, 3, 4, 5].map((l) => <button key={l} type="button" aria-label={`${c.name} level ${l}`} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/competency/${pid}`, json("PUT", { competency: c.name, level: l })))} className={`h-3.5 w-3.5 rounded-full border-2 ${l <= c.level ? "bg-[#026f9b]" : "bg-slate-100"} ${l === c.expected ? "border-[#d9902f]" : "border-transparent"}`} />)}</span><span className={c.gap === null ? "text-slate-400" : c.gap > 0 ? "font-semibold text-[#ac2c28]" : "text-[#0b6b4f]"}>{c.gap === null ? "Not rated" : c.gap > 0 ? `Gap ${c.gap}` : "Meets"}</span><span className="text-slate-600">{c.training || "—"}</span></li>)}</ul></div>
        <p className="mt-4 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Levels come from the HOD&apos;s classroom observations, the 360° feedback and the teacher&apos;s self-assessment. Gaps feed the training plan for next term.</p>
      </div>
    );
  }
  if (tab === "increment-recommendation") {
    const x = inc.data; if (!x) return <Loading e={inc.error} />;
    const rows = x.items.filter((i) => has(i, search));
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Teachers", value: x.items.length, sub: "" }, { label: "Monthly cost of increments", value: inr(x.cost), sub: "from the next April" }, { label: "Increment budget", value: inr(x.budget), sub: `${x.budget_pct}% of teaching payroll` }, { label: "Over budget", value: inr(x.over), sub: x.over ? "trim before sending" : "within budget" }]} />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Bands</h2></div><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-5 py-2.5 font-medium">Combined score</th><th className="px-3 py-2.5 font-medium">Band</th><th className="px-3 py-2.5 font-medium">Increment</th></tr></thead><tbody>{x.bands.map((b, i) => <tr key={b.band} className="border-t border-slate-100"><td className="px-5 py-2.5">{i === 0 ? `${b.from} and above` : i === x.bands.length - 1 ? `0.0 – ${(x.bands[i - 1].from - 0.01).toFixed(2)}` : `${b.from.toFixed(1)} – ${(x.bands[i - 1].from - 0.01).toFixed(2)}`}</td><td className="px-3 py-2.5">{b.band}</td><td className="px-3 py-2.5">{b.inc}%</td></tr>)}</tbody></table></div>
        <ListPanel title={`Increment recommendations · ${x.cycle}`} noun="teachers" search={search} onSearch={setSearch} exportName="increments" head={["Teacher", "KRAs", "360°", "Competency", "Combined", "Band", "Increment %", "New salary"]} exportRows={rows.map((i) => [i.name, i.kra, i.feedback, i.competency, i.combined, i.band, i.inc, i.new_salary])}
          extra={<button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void send()}>Send to the Principal</button>} tableHead={["Teacher", "KRAs", "360°", "Competency", "Combined", "Band", "Increment", "New salary"]} empty={inc.loading ? "Loading…" : "No teaching staff."}
          rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}{i.sent && <span className="ml-1.5 text-[10px] font-normal text-[#0b6b4f]">sent</span>}</b>, i.kra || "—", i.feedback || "—", i.competency || "—", i.combined, i.band, <span key="p" className="flex items-center gap-1"><input type="number" min={0} max={50} aria-label={`${i.name} increment`} className={`${ctl} w-16`} defaultValue={i.inc} onBlur={(e) => { const v = Number(e.target.value); if (v !== i.inc) void act.run(() => schoolFetch(`${H}/increments/${i.id}`, json("PUT", { inc_pct: v }))); }} />%</span>, i.salary ? inr(i.new_salary) : "No salary set"])} />
      </div>
    );
  }
  if (tab === "kpis-and-kras") {
    const x = kr.data; const rows = x?.items ?? [];
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/kras`, json("POST", { grp, area: kf.area, weight: Number(kf.weight), measure: kf.measure })))) { setAddK(false); setKf({ area: "", weight: "", measure: "" }); } };
    return (
      <div className="space-y-4" data-report>{err}
        <div className="flex flex-wrap gap-2">{[["Teacher", "Teacher"], ["Non-teaching", "Non-teaching (office)"], ["Driver", "Driver and attendant"]].map(([k, l]) => <button key={k} type="button" onClick={() => setGrp(k)} className={`rounded-full border px-3.5 py-1 text-[13px] ${grp === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{l}</button>)}</div>
        <ListPanel title={`KRAs · ${grp}`} noun="areas" hideSearch search="" onSearch={() => undefined} exportName={`kras-${grp}`} head={["Key result area", "Weight", "How it's measured"]} exportRows={rows.map((i) => [i.area, `${i.weight}%`, i.measure])}
          extra={<button type="button" className={small} onClick={() => setAddK(true)}>+ Add area</button>} tableHead={["Key result area", "Weight", "How it's measured (KPIs)", ""]} empty={kr.loading ? "Loading…" : "No areas yet for this group."}
          rows={rows.map((i) => [<b key="a" className="font-semibold text-slate-900">{i.area}</b>, `${i.weight}%`, i.measure || "—", <button key="r" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/kras/${i.id}`, { method: "DELETE" }))}>Remove</button>])} />
        <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Weights add up to 100 (now {x?.total ?? 0}). Staff score themselves against these, then their reviewer does.</p>
        <Modal open={addK} title={`Add a key result area · ${grp}`} onClose={() => setAddK(false)}><form onSubmit={add} className="space-y-3"><Field label="Key result area"><input className={inputCls} required minLength={2} maxLength={100} value={kf.area} onChange={(e) => setKf({ ...kf, area: e.target.value })} /></Field><Field label={`Weight (%, ${100 - (x?.total ?? 0)} left)`}><input type="number" min={1} max={100} required className={inputCls} value={kf.weight} onChange={(e) => setKf({ ...kf, weight: e.target.value })} /></Field><Field label="How it's measured"><input className={inputCls} maxLength={240} value={kf.measure} onChange={(e) => setKf({ ...kf, measure: e.target.value })} /></Field><FormFoot close={() => setAddK(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  const x = cy.data; if (!x) return <Loading e={cy.error} />;
  const rows = x.items.filter((i) => has(i, search));
  const saveSc = async (e: FormEvent) => { e.preventDefault(); if (sc && await act.run(() => schoolFetch(`${H}/cycle/${sc.id}`, json("PUT", { ...(sc.self !== "" ? { self: Number(sc.self) } : {}), ...(sc.rev !== "" ? { reviewer: Number(sc.rev) } : {}) })))) setSc(null); };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "In this cycle", value: x.items.length, sub: `Teaching ${x.teaching} · non-teaching ${x.non_teaching}` }, { label: "Self-reviews done", value: `${x.self_pct}%`, sub: "" }, { label: "Reviewer scores done", value: `${x.reviewer_pct}%`, sub: "" }, { label: "Average final score", value: `${x.avg} / 5`, sub: "" }]} />
      <ListPanel title={`Appraisal cycle ${x.cycle}`} noun="staff" search={search} onSearch={setSearch} exportName="appraisal-cycle" head={["Staff", "Reviewer", "Self", "Reviewer score", "Final", "Band and increment", "Status"]} exportRows={rows.map((i) => [i.name, i.reviewer, i.self ?? "", i.reviewer_score ?? "", i.final ?? "", i.band ? `${i.band} · ${i.inc}%` : "", i.status])}
        extra={<button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${H}/cycle/start`, json("POST", {})); setMsg(`${r.added} staff added to the cycle.`); })}>{x.started ? "Add new staff" : "Start the cycle"}</button>}
        tableHead={["Staff", "Reviewer", "Self", "Reviewer", "Final", "Band and increment", "Status", ""]} empty={cy.loading ? "Loading…" : "The cycle hasn't started. Press “Start the cycle”."}
        rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.role}</span></span>, i.reviewer || "—", i.self ?? "—", i.reviewer_score ?? "—", i.final ?? "—", i.band ? <span key="b">{i.band} · <b>{i.inc}%</b></span> : "—", <Chip key="s" tone={T(i.status)}>{i.status}</Chip>,
          <span key="a" className="flex gap-1.5">{i.status !== "Closed" && <button type="button" className={small} onClick={() => setSc({ id: i.id, name: i.name, self: String(i.self ?? ""), rev: String(i.reviewer_score ?? "") })}>Score</button>}{i.status === "Moderation" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/cycle/${i.id}`, json("PUT", { close: true })))}>Close</button>}</span>])} />
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Modal open={!!sc} title={sc ? `Scores · ${sc.name}` : ""} onClose={() => setSc(null)}>{sc && <form onSubmit={saveSc} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Self-review (0–5)"><input type="number" min={0} max={5} step={0.1} className={inputCls} value={sc.self} onChange={(e) => setSc({ ...sc, self: e.target.value })} /></Field><Field label="Reviewer score (0–5)"><input type="number" min={0} max={5} step={0.1} className={inputCls} value={sc.rev} onChange={(e) => setSc({ ...sc, rev: e.target.value })} /></Field></div><p className="text-xs text-slate-500">The final score is 30% self-review and 70% reviewer. The band sets the increment.</p><FormFoot close={() => setSc(null)} busy={act.busy} /></form>}</Modal>
    </div>
  );
}
interface Fb { id: string; name: string; department: string; self: number | null; peers: number | null; hod: number | null; students: number | null; parents: number | null; students_n: number; parents_n: number; score: number | null; status: string }
interface Inc { cycle: string; bands: { from: number; band: string; inc: number }[]; budget_pct: number; items: { id: string; name: string; kra: number; feedback: number; competency: number; combined: number; band: string; inc: number; salary: number; new_salary: number; cost: number; sent: boolean }[]; cost: number; budget: number; over: number }
interface Cyc { cycle: string; started: boolean; items: { id: string; name: string; role: string; type: string; reviewer: string; self: number | null; reviewer_score: number | null; final: number | null; band: string; inc: number | null; status: string }[]; teaching: number; non_teaching: number; self_pct: number; reviewer_pct: number; avg: number }
