"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { usePathname } from "next/navigation";
import { escapeHtml } from "@/components/admin/csv";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";
import { useGoTab } from "./tab-context";

const H = "/school/hr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const lpa = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L/yr` : inr(n));
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Selected", "Accepted", "Verified", "Completed", "Offered"].includes(s) ? "good" : ["Open", "New", "On hold", "Sent", "In progress"].includes(s) ? "warn" : ["Rejected", "Declined"].includes(s) ? "bad" : ["Interviewing", "Shortlisted", "Interview scheduled", "Scheduled", "Interviewed"].includes(s) ? "info" : "mute");
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const Chips = ({ items, value, onChange }: { items: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) => <div className="mb-4 flex flex-wrap gap-2">{items.map((i) => <button key={i.id} type="button" onClick={() => onChange(i.id)} className={`rounded-full border px-3.5 py-1 text-[13px] ${value === i.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{i.label}</button>)}</div>;

interface Op { id: string; position: string; department: string; posted_on: string; closes_on: string | null; status: string; req_qualification: string; needs_bed: boolean; min_experience: number; budget_annual: number; applications: number }
interface Cd { id: string; app_code: string; cv_code: string; opening_id: string | null; position: string; name: string; current_org: string; city: string; qualification: string; experience: number; expected_annual: number; source: string; stage: string; demo_score: number | null; interview_score: number | null; applied_on: string; rules: { label: string; ok: boolean }[]; rule_pct: number }
interface Iv { id: string; candidate_id: string; candidate: string; position: string; panel: string; on_date: string; at_time: string; mode: string; status: string; score: number | null }
interface Of { id: string; code: string; candidate: string; position: string; annual_cost: number; joining_on: string; probation: number; valid_days: number; sent_on: string; status: string; split: { basic: number; hra: number; special: number; pf: number } }
type Tab = "job-openings" | "applications" | "interviews" | "resume-database" | "shortlisting" | "background-checks" | "offer-letters" | "create-offer";

export function offerLetter(o: { school: string; address: string; principal?: string }, name: string, position: string, annual: number, joining: string, probation: number, valid: number, s: Of["split"], when: string) {
  const e = escapeHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Offer letter</title><style>body{font:13px Arial,sans-serif;color:#111;padding:32px;max-width:640px;margin:auto}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #ddd}th{background:#eef5fa;font-size:11px;text-transform:uppercase}td+td,th+th{text-align:right}</style></head><body><b>${e(o.school)}</b><br>${e(o.address)}<p>${e(day(when))}</p><p>Dear ${e(name)},</p><p>We are pleased to offer you the post of <b>${e(position)}</b> from <b>${e(day(joining))}</b>, at an annual cost to the school of <b>${inr(annual)}</b>.</p><table><tr><th>Component</th><th>Per month</th></tr><tr><td>Basic</td><td>${inr(s.basic)}</td></tr><tr><td>House rent allowance</td><td>${inr(s.hra)}</td></tr><tr><td>Special allowance</td><td>${inr(s.special)}</td></tr><tr><td>Employer PF</td><td>${inr(s.pf)}</td></tr></table><p>You will be on probation for ${probation} months. Your appointment is subject to satisfactory background verification and original certificates.</p><p>Please accept within ${valid} days.</p><p><br>${o.principal ? `${e(o.principal)}<br>` : ""}Principal</p></body></html>`;
}
function split(annual: number) { const m = Math.round(annual / 12); const basic = Math.round(m / 2); const hra = Math.round(basic * 0.4); const pf = Math.min(Math.round(basic * 0.12), 1800); return { basic, hra, special: m - basic - hra - pf, pf }; }

export function RecruitmentPages({ tab }: { tab: Tab }) {
  const listOnly = usePathname() === "/hr/recruitment/recruitment";
  const inHr = usePathname().startsWith("/hr/");
  const op = useLoad(() => schoolFetch<{ items: Op[] }>(`${H}/openings`), []);
  const cd = useLoad(() => schoolFetch<{ items: Cd[] }>(`${H}/candidates`), []);
  const iv = useLoad(() => (tab === "interviews" ? schoolFetch<{ candidates: { id: string; name: string; position: string }[]; items: Iv[] }>(`${H}/interviews`) : Promise.resolve(null)), [tab]);
  const ck = useLoad(() => (tab === "background-checks" ? schoolFetch<{ items: { candidate_id: string; name: string; position: string; employer: boolean; refs: boolean; police: boolean; certificates: boolean; id_address: boolean; overall: string }[] }>(`${H}/checks`) : Promise.resolve(null)), [tab]);
  const of = useLoad(() => (tab === "offer-letters" || tab === "create-offer" ? schoolFetch<{ school: string; address: string; principal?: string; selected: { id: string; name: string; position: string; expected: number }[]; items: Of[] }>(`${H}/offers`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { op.reload(); cd.reload(); iv.reload(); ck.reload(); of.reload(); });
  const go = useGoTab();
  const [search, setSearch] = useState(""); const msg = ""; const [chip, setChip] = useState("all");
  const [view, setView] = useState<Cd | null>(null); const [demo, setDemo] = useState("");
  const [openOp, setOpenOp] = useState<Op | null>(null);
  const [addOp, setAddOp] = useState(false); const [o, setO] = useState({ position: "", department: "", closes_on: "", req_qualification: "", needs_bed: false, min_experience: "", budget_annual: "" });
  const [addC, setAddC] = useState(false); const [c, setC] = useState({ name: "", opening_id: "", current_org: "", city: "", qualification: "", experience: "", expected_annual: "", source: "Careers page" });
  const [sch, setSch] = useState(false); const [s, setS] = useState({ candidate_id: "", panel: "", on_date: nowIst(), at_time: "10:00", mode: "In person" });
  const [fin, setFin] = useState<Iv | null>(null); const [score, setScore] = useState("");
  const [f, setF] = useState({ candidate_id: "", annual_cost: "", joining_on: nowIst(), probation: "6", valid_days: "7" });
  const err = <ErrorBanner message={op.error || cd.error || iv.error || ck.error || of.error || act.error} />;
  const cands = cd.data?.items ?? []; const ops = op.data?.items ?? [];
  const nC = (st: string) => cands.filter((x) => x.stage === st).length;
  const addOpening = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/openings`, json("POST", { position: o.position, department: o.department, closes_on: o.closes_on || null, req_qualification: o.req_qualification, needs_bed: o.needs_bed, min_experience: Number(o.min_experience) || 0, budget_annual: Number(o.budget_annual) || 0 })))) { setAddOp(false); setO({ ...o, position: "", department: "" }); } };
  const addCand = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/candidates`, json("POST", { name: c.name, opening_id: c.opening_id || null, current_org: c.current_org, city: c.city, qualification: c.qualification, experience: Number(c.experience) || 0, expected_annual: Number(c.expected_annual) || 0, source: c.source })))) { setAddC(false); setC({ ...c, name: "", current_org: "", qualification: "" }); } };
  const move = async (x: Cd, action: string) => { if (await act.run(() => schoolFetch(`${H}/candidates/${x.id}/move`, json("POST", { action })))) setView(null); };
  const candForm = <Modal open={addC} title="Add a candidate" onClose={() => setAddC(false)}><form onSubmit={addCand} className="space-y-3"><Field label="Name"><input className={inputCls} required minLength={2} maxLength={120} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Applied for"><select className={inputCls} value={c.opening_id} onChange={(e) => setC({ ...c, opening_id: e.target.value })}><option value="">—</option>{ops.map((x) => <option key={x.id} value={x.id}>{x.position}</option>)}</select></Field><Field label="Source"><select className={inputCls} value={c.source} onChange={(e) => setC({ ...c, source: e.target.value })}>{["Careers page", "Naukri", "LinkedIn", "Referral", "Walk-in", "Other"].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Current organisation"><input className={inputCls} maxLength={120} value={c.current_org} onChange={(e) => setC({ ...c, current_org: e.target.value })} /></Field><Field label="City"><input className={inputCls} maxLength={60} value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} /></Field><Field label="Qualification"><input className={inputCls} maxLength={120} placeholder="M.Sc. Physics · B.Ed." value={c.qualification} onChange={(e) => setC({ ...c, qualification: e.target.value })} /></Field><Field label="Experience (years)"><input type="number" min={0} className={inputCls} value={c.experience} onChange={(e) => setC({ ...c, experience: e.target.value })} /></Field><Field label="Expected pay (₹ a year)"><input type="number" min={0} className={inputCls} value={c.expected_annual} onChange={(e) => setC({ ...c, expected_annual: e.target.value })} /></Field></div><FormFoot close={() => setAddC(false)} busy={act.busy} /></form></Modal>;

  if (tab === "job-openings") {
    const rows = ops.filter((x) => has(x, search)); const n = (v: string) => ops.filter((x) => x.status === v).length;
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Job openings", value: ops.length, sub: "All records" }, { label: "Open", value: n("Open"), sub: `${pct(n("Open"), ops.length)} of shown` }, { label: "Interviewing", value: n("Interviewing"), sub: `${pct(n("Interviewing"), ops.length)} of shown` }, { label: "Closed", value: n("Closed"), sub: `${pct(n("Closed"), ops.length)} of shown` }]} />
        <ListPanel title="Job openings" noun="openings" search={search} onSearch={setSearch} exportName="job-openings" head={["Position", "Department", "Posted", "Applications", "Closes", "Status"]} exportRows={rows.map((x) => [x.position, x.department, day(x.posted_on), x.applications, x.closes_on ? day(x.closes_on) : "", x.status])}
          extra={listOnly ? null : <button type="button" className={small} onClick={() => setAddOp(true)}>+ Post opening</button>} tableHead={["Position", "Department", "Posted", "Applications", "Closes", "Status", ""]} empty={op.loading ? "Loading…" : "No openings yet."}
          rows={rows.map((x) => [<b key="p" className="font-semibold text-slate-900">{x.position}</b>, x.department || "—", day(x.posted_on), <span key="a" className="block text-right">{x.applications}</span>, x.closes_on ? day(x.closes_on) : "—", <Chip key="s" tone={T(x.status)}>{x.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setOpenOp(x)}>View details</button>])} />
        <Modal open={!!openOp} title={openOp?.position ?? ""} onClose={() => setOpenOp(null)}>{openOp && <><dl><Row k="Department" v={openOp.department || "—"} /><Row k="Posted" v={day(openOp.posted_on)} /><Row k="Closes" v={openOp.closes_on ? day(openOp.closes_on) : "—"} /><Row k="Applications" v={openOp.applications} /><Row k="Needs" v={[openOp.req_qualification, openOp.needs_bed ? "B.Ed" : "", openOp.min_experience ? `${openOp.min_experience}+ yrs` : ""].filter(Boolean).join(" · ") || "—"} /><Row k="Budget" v={openOp.budget_annual ? inr(openOp.budget_annual) : "—"} /><Row k="Status" v={openOp.status} /></dl>
          <Foot close={() => setOpenOp(null)} left={<>{["Open", "Interviewing", "Closed"].filter((x) => x !== openOp.status).map((x) => <button key={x} type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/openings/${openOp.id}`, json("PATCH", { status: x }))).then((ok) => ok && setOpenOp(null))}>Mark {x.toLowerCase()}</button>)}</>} /></>}</Modal>
        <Modal open={addOp} title="Post an opening" onClose={() => setAddOp(false)}><form onSubmit={addOpening} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Position"><input className={inputCls} required minLength={2} maxLength={100} value={o.position} onChange={(e) => setO({ ...o, position: e.target.value })} /></Field><Field label="Department"><input className={inputCls} maxLength={60} value={o.department} onChange={(e) => setO({ ...o, department: e.target.value })} /></Field><Field label="Closes on"><input type="date" className={inputCls} value={o.closes_on} onChange={(e) => setO({ ...o, closes_on: e.target.value })} /></Field><Field label="Budget (₹ a year)"><input type="number" min={0} className={inputCls} value={o.budget_annual} onChange={(e) => setO({ ...o, budget_annual: e.target.value })} /></Field><Field label="Qualifications wanted (any of)"><input className={inputCls} maxLength={120} placeholder="M.Sc, Ph.D" value={o.req_qualification} onChange={(e) => setO({ ...o, req_qualification: e.target.value })} /></Field><Field label="Minimum experience (years)"><input type="number" min={0} className={inputCls} value={o.min_experience} onChange={(e) => setO({ ...o, min_experience: e.target.value })} /></Field></div><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[#026f9b]" checked={o.needs_bed} onChange={(e) => setO({ ...o, needs_bed: e.target.checked })} />B.Ed needed</label><FormFoot close={() => setAddOp(false)} busy={act.busy} /></form></Modal>
      </div>
    );
  }
  if (tab === "applications") {
    const rows = cands.filter((x) => has(x, search));
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Job applications", value: cands.length, sub: "All records" }, { label: "New", value: nC("New"), sub: `${pct(nC("New"), cands.length)} of shown` }, { label: "Shortlisted", value: nC("Shortlisted"), sub: `${pct(nC("Shortlisted"), cands.length)} of shown` }, { label: "Interview scheduled", value: nC("Interview scheduled"), sub: `${pct(nC("Interview scheduled"), cands.length)} of shown` }]} />
        <ListPanel title="Job applications" noun="applications" search={search} onSearch={setSearch} exportName="job-applications" head={["Ref.", "Candidate", "Position", "Experience", "Applied", "Status"]} exportRows={rows.map((x) => [x.app_code, x.name, x.position, `${x.experience} yrs`, day(x.applied_on), x.stage])}
          extra={<button type="button" className={small} onClick={() => setAddC(true)}>+ Add application</button>} tableHead={["Ref.", "Candidate", "Position", "Experience", "Applied", "Status", ""]} empty={cd.loading ? "Loading…" : "No applications yet."}
          rows={rows.map((x) => [x.app_code, <b key="n" className="font-semibold text-slate-900">{x.name}</b>, x.position || "—", `${x.experience} yrs`, day(x.applied_on), <Chip key="s" tone={T(x.stage)}>{x.stage}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
        <Modal open={!!view} title={view ? `${view.app_code} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <><ErrorBanner message={act.error} /><dl><Row k="Position" v={view.position || "—"} /><Row k="Qualification" v={view.qualification || "—"} /><Row k="Experience" v={`${view.experience} yrs`} /><Row k="Current organisation" v={`${view.current_org || "—"}${view.city ? ` · ${view.city}` : ""}`} /><Row k="Expected pay" v={view.expected_annual ? lpa(view.expected_annual) : "—"} /><Row k="Source" v={view.source} /><Row k="Applied" v={day(view.applied_on)} /><Row k="Status" v={view.stage} /></dl>
          <Foot close={() => setView(null)} left={!["Offered", "Accepted"].includes(view.stage) ? <>{["New", "On hold"].includes(view.stage) && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void move(view, "shortlist")}>Shortlist</button>}{view.stage !== "On hold" && <button type="button" className={small} disabled={act.busy} onClick={() => void move(view, "hold")}>Hold</button>}{view.stage !== "Rejected" && <button type="button" className={small} disabled={act.busy} onClick={() => void move(view, "reject")}>Reject</button>}</> : undefined} /></>}</Modal>
        {candForm}
      </div>
    );
  }
  if (tab === "interviews") {
    const x = iv.data; const all = x?.items ?? []; const rows = all.filter((i) => has(i, search)); const n = (v: string) => all.filter((i) => i.status === v).length;
    const book = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/interviews`, json("POST", { candidate_id: s.candidate_id || x?.candidates[0]?.id, panel: s.panel, on_date: s.on_date, at_time: s.at_time, mode: s.mode })))) setSch(false); };
    const done = async (st: "Completed" | "Cancelled") => { if (fin && await act.run(() => schoolFetch(`${H}/interviews/${fin.id}`, json("PATCH", st === "Completed" ? { status: st, score: Number(score) } : { status: st })))) { setFin(null); setScore(""); } };
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Interviews", value: all.length, sub: "All records" }, { label: "Scheduled", value: n("Scheduled"), sub: `${pct(n("Scheduled"), all.length)} of shown` }, { label: "Completed", value: n("Completed"), sub: `${pct(n("Completed"), all.length)} of shown` }, { label: "Selected", value: n("Selected"), sub: `${pct(n("Selected"), all.length)} of shown` }]} />
        <ListPanel title="Interviews" noun="interviews" search={search} onSearch={setSearch} exportName="interviews" head={["Candidate", "Position", "Panel", "Date", "Time", "Mode", "Status"]} exportRows={rows.map((i) => [i.candidate, i.position, i.panel, day(i.on_date), i.at_time, i.mode, i.status])}
          extra={<button type="button" className={small} onClick={() => setSch(true)}>+ Schedule interview</button>} tableHead={["Candidate", "Position", "Panel", "Date", "Time", "Mode", "Status", ""]} empty={iv.loading ? "Loading…" : "No interviews yet."}
          rows={rows.map((i) => [<b key="c" className="font-semibold text-slate-900">{i.candidate}</b>, i.position || "—", i.panel || "—", day(i.on_date), i.at_time, i.mode, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, i.status === "Scheduled" ? <button key="b" type="button" className={small} onClick={() => { setFin(i); setScore(""); }}>Record result</button> : i.score !== null ? <span key="sc" className="text-[12px] text-slate-500">{i.score} / 10</span> : null])} />
        <Modal open={sch} title="Schedule an interview" onClose={() => setSch(false)}><form onSubmit={book} className="space-y-3"><Field label="Candidate"><select className={inputCls} value={s.candidate_id || x?.candidates[0]?.id || ""} onChange={(e) => setS({ ...s, candidate_id: e.target.value })}>{x?.candidates.map((k) => <option key={k.id} value={k.id}>{k.name}{k.position ? ` · ${k.position}` : ""}</option>)}</select></Field><Field label="Panel"><input className={inputCls} maxLength={160} placeholder="Vice principal, coordinator" value={s.panel} onChange={(e) => setS({ ...s, panel: e.target.value })} /></Field><div className="grid grid-cols-3 gap-3"><Field label="Date"><input type="date" required className={inputCls} value={s.on_date} onChange={(e) => setS({ ...s, on_date: e.target.value })} /></Field><Field label="Time"><input type="time" required className={inputCls} value={s.at_time} onChange={(e) => setS({ ...s, at_time: e.target.value })} /></Field><Field label="Mode"><select className={inputCls} value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value })}>{["In person", "Video call", "Phone"].map((m) => <option key={m}>{m}</option>)}</select></Field></div><FormFoot close={() => setSch(false)} busy={act.busy} /></form></Modal>
        <Modal open={!!fin} title={fin ? `Result · ${fin.candidate}` : ""} onClose={() => setFin(null)}>{fin && <div className="space-y-3"><Field label="Panel score (out of 10)"><input type="number" min={0} max={10} step={0.5} className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} /></Field><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={small} disabled={act.busy} onClick={() => void done("Cancelled")}>Cancel interview</button><button type="button" className={primaryCls} disabled={act.busy || !score} onClick={() => void done("Completed")}>Mark completed</button></div></div>}</Modal>
      </div>
    );
  }
  if (tab === "resume-database") {
    const month = nowIst().slice(0, 7); const src = new Map<string, number>(); for (const x of cands) src.set(x.source, (src.get(x.source) ?? 0) + 1);
    const top = [...src.entries()].sort((a, b) => b[1] - a[1])[0];
    const pool = cands.filter((x) => ["Shortlisted", "Interviewed", "On hold"].includes(x.stage)).length;
    const rows = cands.filter((x) => (chip === "all" || x.opening_id === chip) && has(x, search));
    return (
      <div className="space-y-5" data-report>{err}
        <Tiles items={[{ label: "Résumés", value: cands.length, sub: cands.length ? `Since ${new Date(`${cands.reduce((a, x) => (x.applied_on < a ? x.applied_on : a), cands[0].applied_on)}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : "" }, { label: "This month", value: cands.filter((x) => x.applied_on.startsWith(month)).length, sub: "" }, { label: "Top source", value: top?.[0] ?? "—", sub: top ? `${pct(top[1], cands.length)}` : "" }, { label: "Talent pool", value: pool, sub: "Good candidates not hired yet" }]} />
        <Chips items={[{ id: "all", label: "All" }, ...ops.map((x) => ({ id: x.id, label: x.position }))]} value={chip} onChange={setChip} />
        <ListPanel title="Résumé database" noun="résumés" search={search} onSearch={setSearch} exportName="resume-database" head={["Ref.", "Candidate", "Applied for", "Qualification", "Experience", "Expected", "Source", "Stage"]} exportRows={rows.map((x) => [x.cv_code, x.name, x.position, x.qualification, `${x.experience} yrs`, x.expected_annual, x.source, x.stage])}
          extra={<button type="button" className={small} onClick={() => setAddC(true)}>Add résumés</button>} tableHead={["Ref.", "Candidate", "Applied for", "Qualification", "Experience", "Expected", "Source", "Stage", ...(inHr ? [""] : [])]} empty={cd.loading ? "Loading…" : "No résumés yet."}
          rows={rows.map((x) => [x.cv_code, <span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-slate-500">{[x.current_org, x.city].filter(Boolean).join(" · ")}</span></span>, x.position || "—", x.qualification || "—", `${x.experience} yrs`, x.expected_annual ? lpa(x.expected_annual) : "—", x.source, <Chip key="s" tone={T(x.stage)}>{x.stage}</Chip>, ...(inHr ? [<button key="r" type="button" className={small} onClick={() => setView(x)}>Résumé</button>] : [])])} />
        <Modal open={!!view} title={view ? `${view.cv_code} · ${view.name}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Applied for" v={view.position || "—"} /><Row k="Qualification" v={view.qualification || "—"} /><Row k="Experience" v={`${view.experience} yrs`} /><Row k="Current organisation" v={`${view.current_org || "—"}${view.city ? ` · ${view.city}` : ""}`} /><Row k="Expected pay" v={view.expected_annual ? lpa(view.expected_annual) : "—"} /><Row k="Source" v={view.source} /><Row k="Applied" v={day(view.applied_on)} /></dl><p className="mt-3 text-xs text-slate-500">These are the details entered with the application. No résumé file is stored.</p><Foot close={() => setView(null)} /></>}</Modal>
        {candForm}
      </div>
    );
  }
  if (tab === "shortlisting") {
    const pid = chip !== "all" && ops.some((x) => x.id === chip) ? chip : ops[0]?.id ?? "";
    const rows = cands.filter((x) => x.opening_id === pid && has(x, search)); const cur = ops.find((x) => x.id === pid);
    const saveDemo = async () => { if (view && await act.run(() => schoolFetch(`${H}/candidates/${view.id}/demo`, json("PUT", { score: Number(demo) })))) setView(null); };
    return (
      <div data-report>{err}
        <Chips items={ops.map((x) => ({ id: x.id, label: x.position }))} value={pid} onChange={setChip} />
        <ListPanel title={`${cur?.position ?? "Opening"} · candidates`} noun="candidates" search={search} onSearch={setSearch} exportName="shortlisting" head={["Candidate", "Rule check", "Demo class", "Interview", "Stage"]} exportRows={rows.map((x) => [x.name, `${x.rule_pct}%`, x.demo_score ?? "", x.interview_score ?? "", x.stage])}
          tableHead={["Candidate", "Rule check", "Demo class", "Interview", "Stage", ""]} empty={cd.loading ? "Loading…" : "No candidates for this opening."}
          rows={rows.map((x) => [<span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-slate-500">{x.qualification} · {x.experience} yrs</span></span>, <span key="r" className="flex flex-wrap items-center gap-1"><b className="mr-1">{x.rule_pct}%</b>{x.rules.map((r) => <span key={r.label} className={`rounded border px-1.5 py-0.5 text-[11px] ${r.ok ? "border-[#bfe3d5] bg-[#eef8f3] text-[#065740]" : "border-[#e8b3b0] bg-[#fdf1f0] text-[#ac2c28]"}`}>{r.ok ? "✓" : "✗"} {r.label}</span>)}</span>, x.demo_score !== null ? `${x.demo_score} / 10` : "—", x.interview_score !== null ? `${x.interview_score} / 10` : "—", <Chip key="s" tone={T(x.stage)}>{x.stage}</Chip>,
            <span key="b" className="flex gap-1.5">{x.stage === "Selected" ? <button type="button" className={primaryCls} onClick={() => go("create-offer")}>Make offer</button> : ["New", "Shortlisted", "Interviewed", "Interview scheduled", "On hold"].includes(x.stage) && <>{["New", "On hold"].includes(x.stage) && <button type="button" className={small} disabled={act.busy} onClick={() => void move(x, "shortlist")}>Shortlist</button>}{["Shortlisted", "Interviewed", "Interview scheduled"].includes(x.stage) && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void move(x, "select")}>Select</button>}{x.stage !== "On hold" && <button type="button" className={small} disabled={act.busy} onClick={() => void move(x, "hold")}>Hold</button>}</>}<button type="button" className={small} onClick={() => { setView(x); setDemo(String(x.demo_score ?? "")); }}>View details</button></span>])} />
        <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Qualification" v={view.qualification || "—"} /><Row k="Experience" v={`${view.experience} yrs`} /><Row k="Expected pay" v={view.expected_annual ? lpa(view.expected_annual) : "—"} /><Row k="Rule check" v={`${view.rule_pct}%`} /><Row k="Stage" v={view.stage} /></dl><div className="mt-3"><Field label="Demo class score (out of 10)"><input type="number" min={0} max={10} step={0.5} className={inputCls} value={demo} onChange={(e) => setDemo(e.target.value)} /></Field></div><Foot close={() => setView(null)} left={<button type="button" className={primaryCls} disabled={act.busy || demo === ""} onClick={() => void saveDemo()}>Save score</button>} /></>}</Modal>
      </div>
    );
  }
  if (tab === "background-checks") {
    const rows = (ck.data?.items ?? []).filter((x) => has(x, search));
    const cell = (x: (typeof rows)[number], k: "employer" | "refs" | "police" | "certificates" | "id_address") => x[k] ? <Chip key={k} tone="good">Verified</Chip> : <button key={k} type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${H}/checks/${x.candidate_id}`, json("PUT", { item: k })))}>Mark verified</button>;
    return <div data-report>{err}<ListPanel title="Background checks" noun="candidates" search={search} onSearch={setSearch} exportName="background-checks" head={["Candidate", "Position", "Previous employer", "References", "Police verification", "Certificates", "ID and address", "Overall"]} exportRows={rows.map((x) => [x.name, x.position, x.employer ? "Verified" : "Pending", x.refs ? "Verified" : "Pending", x.police ? "Verified" : "Pending", x.certificates ? "Verified" : "Pending", x.id_address ? "Verified" : "Pending", x.overall])}
      tableHead={["Candidate", "Previous employer", "References", "Police verification", "Certificates", "ID and address", "Overall"]} empty={ck.loading ? "Loading…" : "Checks start when a candidate is selected."}
      rows={rows.map((x) => [<span key="n"><b className="font-semibold text-slate-900">{x.name}</b><span className="block text-[11px] text-slate-500">{x.position}</span></span>, cell(x, "employer"), cell(x, "refs"), cell(x, "police"), cell(x, "certificates"), cell(x, "id_address"), <Chip key="o" tone={T(x.overall)}>{x.overall}</Chip>])} /></div>;
  }
  const O = of.data;
  if (tab === "offer-letters") {
    const all = O?.items ?? []; const rows = all.filter((x) => has(x, search)); const n = (v: string) => all.filter((x) => x.status === v).length;
    const ans = (x: Of, st: string) => void act.run(() => schoolFetch(`${H}/offers/${x.id}`, json("PATCH", { status: st })));
    return (
      <div className="space-y-5" data-report>{err}{okBox(msg)}
        <Tiles items={[{ label: "Offers", value: all.length, sub: "All records" }, { label: "Accepted", value: n("Accepted"), sub: `${pct(n("Accepted"), all.length)} acceptance` }, { label: "Waiting for answer", value: n("Sent"), sub: "" }, { label: "Declined", value: n("Declined"), sub: "" }]} />
        <ListPanel title="Offer letters" noun="offers" search={search} onSearch={setSearch} exportName="offer-letters" head={["Offer", "Candidate", "Annual cost", "Joining", "Probation", "Sent", "Status"]} exportRows={rows.map((x) => [x.code, x.candidate, x.annual_cost, day(x.joining_on), `${x.probation} months`, day(x.sent_on), x.status])}
          tableHead={["Offer", "Candidate", "Annual cost", "Joining", "Probation", "Sent", "Status", ""]} empty={of.loading ? "Loading…" : "No offers yet."}
          rows={rows.map((x) => [x.code, <span key="c"><b className="font-semibold text-slate-900">{x.candidate}</b><span className="block text-[11px] text-slate-500">{x.position}</span></span>, inr(x.annual_cost), day(x.joining_on), `${x.probation} months`, day(x.sent_on), <Chip key="s" tone={x.status === "Sent" ? "warn" : T(x.status)}>{x.status === "Sent" ? "Waiting" : x.status}</Chip>,
            <span key="b" className="flex gap-1.5"><button type="button" className={small} onClick={() => printHtml(offerLetter(O!, x.candidate, x.position, x.annual_cost, x.joining_on, x.probation, x.valid_days, x.split, x.sent_on))}>Letter</button>{x.status === "Sent" && <><button type="button" className={primaryCls} disabled={act.busy} onClick={() => ans(x, "Accepted")}>Accepted</button><button type="button" className={small} disabled={act.busy} onClick={() => ans(x, "Declined")}>Declined</button></>}</span>])} />
      </div>
    );
  }
  if (!O) return <Loading e={of.error} />;
  const sel = O.selected.find((x) => x.id === (f.candidate_id || O.selected[0]?.id)); const annual = Number(f.annual_cost) || sel?.expected || 0; const sp = split(annual);
  const budget = ops.find((x) => x.position === sel?.position)?.budget_annual ?? 0;
  const send = async (e: FormEvent) => { e.preventDefault(); if (sel && await act.run(() => schoolFetch(`${H}/offers`, json("POST", { candidate_id: sel.id, annual_cost: annual, joining_on: f.joining_on, probation: Number(f.probation), valid_days: Number(f.valid_days) })))) { setF({ ...f, annual_cost: "" }); go("offer-letters"); } };
  return (
    <form onSubmit={send} className="rounded-2xl border border-slate-200 bg-white">{err}
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">New offer</h2></div>
      {!O.selected.length ? <p className="p-6 text-center text-sm text-slate-400">Select a candidate in Shortlisting first.</p> : <>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Candidate"><select className={inputCls} value={sel?.id ?? ""} onChange={(e) => setF({ ...f, candidate_id: e.target.value, annual_cost: "" })}>{O.selected.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.position}</option>)}</select></Field>
          <Field label="Annual cost to school (₹)"><input type="number" min={1} required className={inputCls} value={f.annual_cost || (sel?.expected ? String(sel.expected) : "")} onChange={(e) => setF({ ...f, annual_cost: e.target.value })} />{budget > 0 && <span className="mt-1 block text-[11px] text-[#026f9b]">Budget for this post: {inr(budget)}</span>}</Field>
          <Field label="Joining date"><input type="date" required className={inputCls} value={f.joining_on} onChange={(e) => setF({ ...f, joining_on: e.target.value })} /></Field>
          <Field label="Probation"><select className={inputCls} value={f.probation} onChange={(e) => setF({ ...f, probation: e.target.value })}>{[0, 3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}</select></Field>
          <Field label="Offer valid for"><select className={inputCls} value={f.valid_days} onChange={(e) => setF({ ...f, valid_days: e.target.value })}>{[7, 10, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}</select></Field>
        </div>
        <div className="px-5 pb-5"><p className="mb-2 text-[13px] font-semibold text-slate-900">Letter preview</p>
          <div className="rounded-xl border border-slate-200 p-5 text-[13px]"><p><b>{O.school}</b></p><p>{O.address}</p><p className="mt-3">{day(nowIst())}</p><p className="mt-3">Dear {sel?.name},</p><p className="mt-2">We are pleased to offer you the post of <b>{sel?.position}</b> from <b>{day(f.joining_on)}</b>, at an annual cost to the school of <b>{inr(annual)}</b>.</p>
            <table className="my-3 w-full"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-2">Component</th><th className="px-3 py-2">Per month</th></tr></thead><tbody>{([["Basic", sp.basic], ["House rent allowance", sp.hra], ["Special allowance", sp.special], ["Employer PF", sp.pf]] as [string, number][]).map(([k, v]) => <tr key={k} className="border-t border-slate-100"><td className="px-3 py-2">{k}</td><td className="px-3 py-2">{inr(v)}</td></tr>)}</tbody></table>
            <p>You will be on probation for {f.probation} months. Your appointment is subject to satisfactory background verification and original certificates.</p><p className="mt-2">Please accept within {f.valid_days} days.</p><p className="mt-4">{O.principal && <span className="block">{O.principal}</span>}Principal</p></div></div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><span className="mr-auto text-xs text-slate-500">Email is not connected yet. Print the letter from Offer Letters.</span><button type="button" className={small} onClick={() => setF({ candidate_id: "", annual_cost: "", joining_on: nowIst(), probation: "6", valid_days: "7" })}>Clear</button><button type="submit" className={primaryCls} disabled={act.busy}>Create offer</button></div></>}
    </form>
  );
}
