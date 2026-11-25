"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, printHtml } from "../../school/s/fo-pages";
import { Row, day } from "../../school/s/dash-pages";
import { inr } from "../../school/s/fee-pages";
import { offerLetter } from "../../school/s/hr-pages3";
import { Head, redBtn } from "../../teacher/t/head";
import { Table, Tile, Tiles, name, pill, solid } from "./ui";

/** HR's own recruitment and onboarding screens. They work on the same records as the School Admin's HR screens. */
const H = "/school/hr";
const CHANNELS = ["School website", "Naukri", "LinkedIn", "Indeed", "WhatsApp"];
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const dialogFoot = "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3";
const note = (text: ReactNode) => <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[13px] text-slate-800">{text}</p>;
const chip = (on: boolean) => `rounded-full border px-3.5 py-1 text-[13px] ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`;
const empty = (text: string) => <p className="py-10 text-center text-sm text-slate-400">{text}</p>;

interface Op { id: string; position: string; department: string; posted_on: string; closes_on: string | null; status: string; req_qualification: string; needs_bed: boolean; needs_tet: boolean; min_experience: number; budget_annual: number; applications: number; channels: string[]; description: string }
interface Ops { ready: boolean; school: string; campuses: number; items: Op[] }
const useOpenings = () => useLoad(() => schoolFetch<Ops>(`${H}/openings`), []);
const notReady = (x: Ops | null | undefined) => (x && !x.ready ? note("Channels, descriptions and the CTET / TET rule can be saved once the latest database update has been applied.") : null);

// ═════════════ job posting ═════════════
export function Postings() {
  const p = useOpenings(); const act = useAction(() => p.reload());
  const [post, setPost] = useState<{ op: Op; channel: string } | null>(null); const [view, setView] = useState<Op | null>(null); const [text, setText] = useState("");
  const items = p.data?.items ?? [];
  const mark = async () => { if (post && await act.run(() => schoolFetch(`${H}/openings/${post.op.id}/channels`, json("POST", { channel: post.channel })))) setPost(null); };
  const patch = async (body: object) => { if (view && await act.run(() => schoolFetch(`${H}/openings/${view.id}`, json("PATCH", body)))) setView(null); };
  return (
    <div className="space-y-5" data-report><Head title="Postings" subtitle="Where each opening is advertised and how many people applied. Applications are kept in the Resume Database." /><ErrorBanner message={p.error || act.error} />
      <Table title="Job postings" noun="postings" exportName="job-postings" empty={p.loading ? "Loading…" : "No openings yet."}
        head={[{ h: "Post" }, { h: "Channels" }, { h: "Views", right: true }, { h: "Applied", right: true }, { h: "Posted" }, { h: "Closes" }, { h: "" }]}
        rows={items.map((x) => { const next = CHANNELS.find((c) => !x.channels.includes(c)); return { key: x.id, find: `${x.position} ${x.department}`, out: [x.position, x.channels.join(", "), "", x.applications, day(x.posted_on), x.closes_on ? day(x.closes_on) : ""], cells: [
          name(x.position, x.department),
          <span key="c" className="flex max-w-[22rem] flex-wrap gap-1">{CHANNELS.map((c) => { const on = x.channels.includes(c); return <span key={c} title={on ? "Posted" : "Not posted"} className={`rounded border px-1.5 py-0.5 text-[11px] ${on ? "border-[#bfe3d5] bg-[#eef8f3] text-[#065740]" : "border-dashed border-slate-300 text-slate-400"}`}>{c}</span>; })}</span>,
          <span key="v" className="block text-right text-slate-400" title="Views are not counted">—</span>, <span key="a" className="block text-right">{x.applications}</span>, day(x.posted_on), x.closes_on ? day(x.closes_on) : "—",
          <span key="b" className="flex justify-end gap-1.5">{next && x.status !== "Closed" && <button type="button" className={solid} onClick={() => setPost({ op: x, channel: next })}>Post on {next}</button>}<button type="button" className={pill} onClick={() => { setView(x); setText(x.description); }}>View details</button></span>,
        ] }; })} />
      {note("Job adverts never show the salary. Job portals are not connected: put the advert on the portal yourself, mark the channel here, and add the applications you receive under Candidates.")}
      {notReady(p.data)}
      <Modal open={!!post} title={post ? `Post on ${post.channel}` : ""} onClose={() => setPost(null)}>{post && <><ErrorBanner message={act.error} /><p className="text-[13px] text-slate-700">Publish the advert for <b>{post.op.position}</b> on {post.channel}, then mark it here. Nothing is sent to {post.channel} from this portal.</p><div className={dialogFoot}><button type="button" className={pill} onClick={() => setPost(null)}>Cancel</button><button type="button" className={solid} disabled={act.busy} onClick={() => void mark()}>Mark as posted</button></div></>}</Modal>
      <Modal open={!!view} title={view?.position ?? ""} onClose={() => setView(null)}>{view && <><ErrorBanner message={act.error} /><dl><Row k="Department" v={view.department || "—"} /><Row k="Posted on" v={view.channels.join(", ") || "Not posted yet"} /><Row k="Applications" v={view.applications} /><Row k="Closes" v={view.closes_on ? day(view.closes_on) : "—"} /><Row k="Status" v={view.status} /></dl>
        <div className="mt-3"><Field label="Description for the careers page"><textarea className={inputCls} rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} /></Field></div>
        <div className={dialogFoot}><button type="button" className={`${pill} mr-auto`} disabled={act.busy} onClick={() => void patch({ status: view.status === "Closed" ? "Open" : "Closed" })}>{view.status === "Closed" ? "Reopen" : "Close opening"}</button><button type="button" className={pill} onClick={() => setView(null)}>Close</button><button type="button" className={solid} disabled={act.busy || text === view.description} onClick={() => void patch({ description: text })}>Save description</button></div></>}</Modal>
    </div>
  );
}

const needs = (x: Op) => [x.req_qualification, x.needs_bed ? "B.Ed." : "", x.needs_tet ? "CTET / TET" : "", x.min_experience ? `${x.min_experience}+ years` : ""].filter(Boolean).join(", ");

export function CareersPage() {
  const p = useOpenings(); const act = useAction(() => p.reload());
  const [dept, setDept] = useState(""); const [apply, setApply] = useState<Op | null>(null); const [msg, setMsg] = useState("");
  const blank = { name: "", current_org: "", city: "", qualification: "", experience: "", expected_annual: "" }; const [f, setF] = useState(blank);
  const open = (p.data?.items ?? []).filter((x) => x.status !== "Closed");
  const depts = [...new Set(open.map((x) => x.department).filter(Boolean))].sort();
  const shown = open.filter((x) => !dept || x.department === dept);
  const send = async (e: FormEvent) => { e.preventDefault(); if (apply && await act.run(() => schoolFetch(`${H}/candidates`, json("POST", { name: f.name, opening_id: apply.id, current_org: f.current_org, city: f.city, qualification: f.qualification, experience: Number(f.experience) || 0, expected_annual: Number(f.expected_annual) || 0, source: "Careers page" })))) { setMsg(`${f.name} added to the Resume Database.`); setF(blank); setApply(null); } };
  const input = (k: keyof typeof blank, label: string, extra: object = {}) => <Field label={label}><input className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} /></Field>;
  return (
    <div className="space-y-4"><Head title="Careers Page" subtitle="A preview of the school's careers page with the open posts. It is not published on a public address yet; applications you enter here go into the Resume Database." /><ErrorBanner message={p.error} />
      {msg && <p className="rounded-xl border border-[#bfe3d5] bg-[#eef8f3] px-4 py-2.5 text-[13px] text-[#065740]">{msg}</p>}
      <div className="rounded-2xl bg-[#026f9b] px-6 py-5 text-white"><p className="text-xl font-bold">{p.data?.school || "School"} · Careers</p><p className="mt-1 text-[13px] text-white/90">Teach where children grow.{p.data?.campuses ? ` ${p.data.campuses} ${p.data.campuses === 1 ? "campus" : "campuses"}` : ""}</p></div>
      <div className="flex flex-wrap gap-2">{["", ...depts].map((d) => <button key={d || "all"} type="button" className={chip(dept === d)} onClick={() => setDept(d)}>{d || "All"}</button>)}</div>
      {!shown.length ? empty(p.loading ? "Loading…" : "No open posts.") : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{shown.map((x) => <div key={x.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[15px] font-bold text-slate-900">{x.position}</p>{x.department && <p className="text-[12px] text-slate-500">{x.department}</p>}{needs(x) && <p className="mt-2 text-[13px] text-slate-700"><b>You need:</b> {needs(x)}</p>}{x.description && <p className="mt-1 text-[13px] text-slate-600">{x.description}</p>}<div className="mt-auto pt-3"><button type="button" className={solid} onClick={() => { setApply(x); setMsg(""); }}>Apply</button></div></div>)}</div>}
      {notReady(p.data)}
      <Modal open={!!apply} title={apply ? `Apply · ${apply.position}` : ""} onClose={() => setApply(null)}><form onSubmit={send} className="space-y-3"><ErrorBanner message={act.error} />{input("name", "Name", { required: true, minLength: 2, maxLength: 120 })}<div className="grid grid-cols-2 gap-3">{input("qualification", "Qualification", { maxLength: 120 })}{input("experience", "Experience (years)", { type: "number", min: 0, max: 50 })}{input("current_org", "Current organisation", { maxLength: 120 })}{input("city", "City", { maxLength: 60 })}{input("expected_annual", "Expected pay a year (₹)", { type: "number", min: 0 })}</div><div className={dialogFoot}><button type="button" className={pill} onClick={() => setApply(null)}>Cancel</button><button type="submit" className={solid} disabled={act.busy}>Add application</button></div></form></Modal>
    </div>
  );
}

// ═════════════ screening rules ═════════════
type Rule = { req_qualification: string; needs_bed: boolean; needs_tet: boolean; min_experience: string; budget_annual: string };
const ruleOf = (x: Op): Rule => ({ req_qualification: x.req_qualification, needs_bed: x.needs_bed, needs_tet: x.needs_tet, min_experience: String(x.min_experience), budget_annual: x.budget_annual ? String(x.budget_annual) : "" });

export function ScreeningRules() {
  const p = useOpenings(); const act = useAction(() => p.reload());
  const [edit, setEdit] = useState<Record<string, Rule>>({}); const [msg, setMsg] = useState("");
  const items = (p.data?.items ?? []).filter((x) => x.status !== "Closed");
  const set = (x: Op, part: Partial<Rule>) => { setMsg(""); setEdit((all) => ({ ...all, [x.id]: { ...(all[x.id] ?? ruleOf(x)), ...part } })); };
  const save = async (e: FormEvent) => {
    e.preventDefault(); const changed = items.filter((x) => edit[x.id]).map((x) => { const r = edit[x.id]; return { id: x.id, req_qualification: r.req_qualification, needs_bed: r.needs_bed, needs_tet: r.needs_tet, min_experience: Number(r.min_experience) || 0, budget_annual: Number(r.budget_annual) || 0 }; });
    if (changed.length && await act.run(() => schoolFetch(`${H}/openings/rules`, json("PUT", { items: changed })))) { setEdit({}); setMsg("Rules saved. Candidates are checked against them now."); }
  };
  const cell = "px-4 py-2.5";
  return (
    <form onSubmit={save} className="space-y-4"><Head title="Screening Rules" subtitle="Minimum requirements for each post. Applications are checked against them automatically, so the shortlist starts with people who qualify." /><ErrorBanner message={p.error || act.error} />
      {msg && <p className="rounded-xl border border-[#bfe3d5] bg-[#eef8f3] px-4 py-2.5 text-[13px] text-[#065740]">{msg}</p>}
      <Panel title="Screening rules" sub={`${items.length} ${items.length === 1 ? "post" : "posts"}`}>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-[13px]"><thead><tr className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">{["Post", "Minimum qualification", "B.Ed. needed", "CTET / TET needed", "Minimum experience", "Maximum salary a year"].map((h) => <th key={h} className={cell}>{h}</th>)}</tr></thead>
          <tbody>{items.map((x) => { const r = edit[x.id] ?? ruleOf(x); return <tr key={x.id} className="border-t border-slate-100"><td className={cell}>{name(x.position, x.department)}</td>
            <td className={cell}><input aria-label={`Minimum qualification for ${x.position}`} className={inputCls} maxLength={120} placeholder="For example, M.Sc, M.A" value={r.req_qualification} onChange={(e) => set(x, { req_qualification: e.target.value })} /></td>
            <td className={cell}><input type="checkbox" aria-label={`B.Ed. needed for ${x.position}`} className="h-4 w-4 accent-[#0294CE]" checked={r.needs_bed} onChange={(e) => set(x, { needs_bed: e.target.checked })} /></td>
            <td className={cell}><input type="checkbox" aria-label={`CTET or TET needed for ${x.position}`} className="h-4 w-4 accent-[#0294CE] disabled:opacity-40" disabled={!p.data?.ready} checked={r.needs_tet} onChange={(e) => set(x, { needs_tet: e.target.checked })} /></td>
            <td className={cell}><span className="flex items-center gap-2"><input type="number" min={0} max={40} aria-label={`Minimum experience for ${x.position}`} className={`${inputCls} !w-20`} value={r.min_experience} onChange={(e) => set(x, { min_experience: e.target.value })} />yrs</span></td>
            <td className={cell}><input type="number" min={0} aria-label={`Maximum salary a year for ${x.position}`} className={`${inputCls} !w-36`} value={r.budget_annual} onChange={(e) => set(x, { budget_annual: e.target.value })} /></td></tr>; })}
            {!items.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">{p.loading ? "Loading…" : "No open posts."}</td></tr>}</tbody></table></div>
        <div className="flex justify-end border-t border-slate-100 px-4 py-3"><button type="submit" className={solid} disabled={act.busy || !Object.keys(edit).length}>Save rules</button></div>
      </Panel>
      {note("CBSE requires B.Ed. for TGT and PGT posts and CTET or state TET for teachers of Classes 1 – 8.")}
      {notReady(p.data)}
    </form>
  );
}

// ═════════════ background checks ═════════════
type CheckKey = "employer" | "refs" | "police" | "certificates" | "id_address";
interface Ck extends Record<CheckKey, boolean> { candidate_id: string; name: string; position: string; overall: string; discrepancy: string }
const CHECKS: [CheckKey, string][] = [["employer", "Previous employer"], ["refs", "References (2)"], ["police", "Police verification"], ["certificates", "Certificates"], ["id_address", "ID and address"]];

export function BackgroundChecks() {
  const p = useLoad(() => schoolFetch<{ ready: boolean; items: Ck[] }>(`${H}/checks`), []);
  const act = useAction(() => p.reload());
  const [view, setView] = useState<Ck | null>(null); const [text, setText] = useState("");
  const items = p.data?.items ?? [];
  const put = (id: string, body: object) => act.run(() => schoolFetch(`${H}/checks/${id}`, json("PUT", body)));
  const flag = async (value: string) => { if (view && await put(view.candidate_id, { discrepancy: value })) setView(null); };
  return (
    <div className="space-y-4" data-report><Head title="Background Checks" subtitle="Checks for every selected candidate before they join: past employers, references, police verification, certificates and ID. Drivers and anyone working with children must have police verification." /><ErrorBanner message={p.error || act.error} />
      <Table title="Background checks" noun="candidates" exportName="background-checks" empty={p.loading ? "Loading…" : "Checks start when a candidate is selected."}
        head={[{ h: "Candidate" }, ...CHECKS.map(([, h]) => ({ h })), { h: "Overall" }]}
        rows={items.map((x) => ({ key: x.candidate_id, find: `${x.name} ${x.position} ${x.overall}`, out: [x.name, ...CHECKS.map(([k]) => (x[k] ? "Verified" : "Pending")), x.overall], cells: [
          name(x.name, x.position),
          ...CHECKS.map(([k]) => (x[k] ? <Chip key={k} tone="good">Verified</Chip> : <button key={k} type="button" className={pill} disabled={act.busy} onClick={() => void put(x.candidate_id, { item: k })}>Mark verified</button>)),
          <button key="o" type="button" title="Record or clear a discrepancy" onClick={() => { setView(x); setText(x.discrepancy); }}><Chip tone={x.overall === "Verified" ? "good" : x.overall === "Discrepancy" ? "bad" : "info"}>{x.overall}</Chip></button>,
        ] }))} />
      {items.filter((x) => x.discrepancy).map((x) => <p key={x.candidate_id} className="rounded-xl border border-[#f1dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px] text-slate-800"><b>{x.name}:</b> {x.discrepancy}</p>)}
      {note("Select the Overall status to record a discrepancy or to clear one.")}
      <Modal open={!!view} title={view ? `Discrepancy · ${view.name}` : ""} onClose={() => setView(null)}>{view && <><ErrorBanner message={act.error} /><Field label="What did not match?"><textarea className={inputCls} rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} /></Field><div className={dialogFoot}>{view.discrepancy && <button type="button" className={`${pill} mr-auto`} disabled={act.busy} onClick={() => void flag("")}>Clear discrepancy</button>}<button type="button" className={pill} onClick={() => setView(null)}>Cancel</button><button type="button" className={solid} disabled={act.busy || !text.trim()} onClick={() => void flag(text.trim())}>Save</button></div></>}</Modal>
    </div>
  );
}

// ═════════════ offer letters ═════════════
interface Of { id: string; code: string; candidate: string; position: string; annual_cost: number; joining_on: string; probation: number; valid_days: number; sent_on: string; status: string; reason: string; split: { basic: number; hra: number; special: number; pf: number } }

export function OfferLetters({ go }: { go: (tab: string) => void }) {
  const p = useLoad(() => schoolFetch<{ school: string; address: string; principal: string; items: Of[] }>(`${H}/offers`), []);
  const act = useAction(() => p.reload());
  const [out, setOut] = useState<Of | null>(null); const [reason, setReason] = useState("");
  const all = p.data?.items ?? []; const n = (v: string) => all.filter((x) => x.status === v).length;
  const why = all.find((x) => x.status === "Declined" && x.reason)?.reason;
  const answer = async (x: Of, status: string, text?: string) => { if (await act.run(() => schoolFetch(`${H}/offers/${x.id}`, json("PATCH", text ? { status, reason: text } : { status })))) setOut(null); };
  return (
    <div className="space-y-5" data-report><Head title="Offer Letters" subtitle="Offers made to selected candidates and their answers. Accepted offers move to Onboarding." action={<button type="button" className={redBtn} onClick={() => go("create-offer")}>Create offer</button>} /><ErrorBanner message={p.error || act.error} />
      <Tiles><Tile label="Offers this term" value={all.length} /><Tile label="Accepted" tone="green" value={n("Accepted")} sub={`${all.length ? Math.round((n("Accepted") / all.length) * 100) : 0}% acceptance`} /><Tile label="Waiting for answer" tone="amber" value={n("Sent")} /><Tile label="Declined" tone="red" value={n("Declined")} sub={why} /></Tiles>
      <Table title="Offer letters" noun="offers" exportName="offer-letters" empty={p.loading ? "Loading…" : "No offers yet."}
        head={[{ h: "Offer" }, { h: "Candidate" }, { h: "Annual cost", right: true }, { h: "Joining" }, { h: "Probation" }, { h: "Sent" }, { h: "Status" }, { h: "" }]}
        rows={all.map((x) => ({ key: x.id, find: `${x.code} ${x.candidate} ${x.position} ${x.status}`, out: [x.code, x.candidate, x.annual_cost, day(x.joining_on), `${x.probation} months`, day(x.sent_on), x.status], cells: [
          x.code, name(x.candidate, x.position), <span key="a" className="block text-right">{inr(x.annual_cost)}</span>, day(x.joining_on), `${x.probation} months`, day(x.sent_on),
          <Chip key="s" tone={x.status === "Accepted" ? "good" : x.status === "Declined" ? "bad" : x.status === "Sent" ? "warn" : "mute"}>{x.status}</Chip>,
          <span key="b" className="flex justify-end gap-1.5"><button type="button" className={pill} onClick={() => printHtml(offerLetter({ school: p.data!.school, address: p.data!.address, principal: p.data!.principal }, x.candidate, x.position, x.annual_cost, x.joining_on, x.probation, x.valid_days, x.split, x.sent_on))}>Letter</button>{x.status === "Sent" && <><button type="button" className={solid} disabled={act.busy} onClick={() => void answer(x, "Accepted")}>Mark accepted</button><button type="button" className={pill} onClick={() => { setOut(x); setReason(""); }}>Withdraw</button></>}</span>,
        ] }))} />
      <Modal open={!!out} title={out ? `${out.code} · ${out.candidate}` : ""} onClose={() => setOut(null)}>{out && <><ErrorBanner message={act.error} /><p className="mb-3 text-[13px] text-slate-700">Withdraw the offer if the school is taking it back; the candidate stays selected. If the candidate said no, record it as declined.</p><Field label="Reason for declining"><input className={inputCls} maxLength={160} value={reason} onChange={(e) => setReason(e.target.value)} /></Field><div className={dialogFoot}><button type="button" className={`${pill} mr-auto`} onClick={() => setOut(null)}>Cancel</button><button type="button" className={pill} disabled={act.busy} onClick={() => void answer(out, "Declined", reason.trim())}>Candidate declined</button><button type="button" className={solid} disabled={act.busy} onClick={() => void answer(out, "Withdrawn")}>Withdraw offer</button></div></>}</Modal>
    </div>
  );
}

// ═════════════ request a vacancy ═════════════
export function RequestVacancy({ go }: { go: (tab: string) => void }) {
  const d = useLoad(() => schoolFetch<{ items: { id: string; name: string }[] }>(`${H}/departments`), []);
  const act = useAction(() => undefined);
  const blank = { post: "", department: "", vtype: "New post", posts: "1", cost_year: "", need_from: "", note: "" }; const [f, setF] = useState(blank);
  const set = (part: Partial<typeof blank>) => setF({ ...f, ...part });
  const send = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/vacancies`, json("POST", { post: f.post, department: f.department, vtype: f.vtype, note: f.note, posts: Number(f.posts), cost_year: Number(f.cost_year) || 0, need_from: f.need_from || null })))) { setF(blank); go("vacancy-requests"); } };
  return (
    <form onSubmit={send}><Head title="Request a Vacancy" subtitle="Ask for a new post or a replacement. It goes to the Principal, then to Finance for budget approval." /><ErrorBanner message={d.error || act.error} />
      <Panel title="New vacancy request">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Post"><input className={inputCls} required minLength={2} maxLength={100} placeholder="For example, TGT Hindi" value={f.post} onChange={(e) => set({ post: e.target.value })} /></Field>
          <Field label="Department"><select className={inputCls} required value={f.department} onChange={(e) => set({ department: e.target.value })}><option value="">Choose a department</option>{d.data?.items.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}</select></Field>
          <Field label="Type"><select className={inputCls} value={f.vtype} onChange={(e) => set({ vtype: e.target.value })}><option>New post</option><option>Replacement</option></select></Field>
          <Field label="Number of posts"><input type="number" min={1} max={50} required className={inputCls} value={f.posts} onChange={(e) => set({ posts: e.target.value })} /></Field>
          <Field label="Annual cost per post (₹)"><input type="number" min={0} required className={inputCls} value={f.cost_year} onChange={(e) => set({ cost_year: e.target.value })} /><span className="mt-1 block text-[11px] text-slate-500">Gross salary plus PF and other employer costs</span></Field>
          <Field label="Needed from"><input type="date" min={nowIst()} className={inputCls} value={f.need_from} onChange={(e) => set({ need_from: e.target.value })} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Why is it needed?"><textarea className={inputCls} rows={3} maxLength={200} placeholder="For example, Ms. X resigning; new section from April" value={f.note} onChange={(e) => set({ note: e.target.value })} /></Field></div>
        </div>
        {d.data && !d.data.items.length && <p className="px-5 pb-3 text-[12px] text-slate-500">Add departments under Organisation → Departments first.</p>}
        <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={pill} onClick={() => setF(blank)}>Clear</button><button type="submit" className={solid} disabled={act.busy}>Send for approval</button></div>
      </Panel>
    </form>
  );
}

// ═════════════ onboarding ═════════════
interface Jn { id: string; name: string; position: string; joining_on: string | null; done: string[]; count: number; total: number; background: string; status: string }
interface Joiners { items_def: { key: string; label: string; owner: string }[]; items: Jn[] }
const useJoiners = () => useLoad(() => schoolFetch<Joiners>(`${H}/joiners`), []);
let chosenJoiner = ""; // the joiner picked with "Open checklist", kept while the tab changes

export function NewJoiners({ go }: { go: (tab: string) => void }) {
  const j = useJoiners(); const items = j.data?.items ?? [];
  return (
    <div data-report><Head title="New Joiners" subtitle="People who accepted an offer, and how far their joining checklist has got. HR, IT and the Principal's office each tick off their part." /><ErrorBanner message={j.error} />
      <Table title="New joiners" noun="joiners" exportName="new-joiners" empty={j.loading ? "Loading…" : "Nobody has accepted an offer yet. Offers are made in Recruitment."}
        head={[{ h: "Joiner" }, { h: "Joining" }, { h: "Checklist" }, { h: "Background check" }, { h: "Status" }, { h: "" }]}
        rows={items.map((i) => ({ key: i.id, find: `${i.name} ${i.position}`, out: [i.name, i.joining_on ? day(i.joining_on) : "", `${i.count} of ${i.total}`, i.background, i.status], cells: [
          name(i.name, i.position), i.joining_on ? day(i.joining_on) : "—",
          <span key="c" className="flex items-center gap-2"><span className="h-1.5 w-24 overflow-hidden rounded bg-slate-100"><span className="block h-full bg-[#026f9b]" style={{ width: `${(i.count / i.total) * 100}%` }} /></span>{i.count} of {i.total}</span>,
          <Chip key="b" tone={i.background === "Verified" ? "good" : i.background === "Discrepancy" ? "bad" : "info"}>{i.background}</Chip>,
          <Chip key="s" tone={i.status === "Ready" ? "good" : "info"}>{i.status === "Ready" ? "Ready to join" : "Joining"}</Chip>,
          <span key="o" className="block text-right"><button type="button" className={pill} onClick={() => { chosenJoiner = i.id; go("joining-checklist"); }}>Open checklist</button></span>,
        ] }))} />
    </div>
  );
}

export function JoiningChecklist() {
  const j = useJoiners(); const act = useAction(() => j.reload()); const [pick, setPick] = useState(() => chosenJoiner);
  const items = j.data?.items ?? []; const cur = items.find((i) => i.id === pick) ?? items[0];
  return (
    <div className="space-y-4"><Head title="Joining Checklist" subtitle="Tick each item as it's done. When everything is ticked, create the joiner's employee record." /><ErrorBanner message={j.error || act.error} />
      <div className="flex flex-wrap gap-2">{items.map((i) => <button key={i.id} type="button" className={chip(cur?.id === i.id)} onClick={() => { chosenJoiner = i.id; setPick(i.id); }}>{i.name}</button>)}</div>
      {!cur ? empty(j.loading ? "Loading…" : "Nobody has accepted an offer yet.") : <Panel title={`${cur.name} · ${cur.position}`} sub={`${cur.joining_on ? `Joining ${day(cur.joining_on)} · ` : ""}${cur.count} of ${cur.total} done`}>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{j.data?.items_def.map((d) => { const on = cur.done.includes(d.key); return <label key={d.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-[13px] ${on ? "border-[#bfe3d5] bg-[#d9efe8]" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0294CE]" checked={on} disabled={act.busy} onChange={(e) => void act.run(() => schoolFetch(`${H}/joiners/${cur.id}`, json("POST", { item: d.key, done: e.target.checked })))} /><span><span className="block text-slate-900">{d.label}</span><span className="block text-[11px] text-slate-500">{d.owner}</span></span></label>; })}</div>
        {cur.status === "Ready" && <p className="border-t border-slate-100 px-5 py-3 text-[13px] text-[#065740]">Everything is ticked. Create the employee record in Employee Registration so they can sign in.</p>}
      </Panel>}
    </div>
  );
}
