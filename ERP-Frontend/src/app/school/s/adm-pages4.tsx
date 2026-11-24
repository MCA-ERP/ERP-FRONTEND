"use client";

import { useEffect, useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { BarRows, Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has, pct, printHtml, useRegister } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { ApplicationList, NewApplication } from "./adm-pages";
import { StatusBoard, useApps } from "./adm-pages2";
import { EligibilityChecker } from "./adm-pages3";
import type { App } from "./adm-pages2";

const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const Note = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">{children}</p>;
const Foot = ({ close }: { close: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const Num = ({ v, set, w = "w-16", label }: { v: string | number; set: (s: string) => void; w?: string; label: string }) => <input type="number" min={0} aria-label={label} className={`${w} rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm`} value={v} onChange={(e) => set(e.target.value)} />;

interface Prog { name: string; classes: string; min_age: number; overall_pct: number | null; seats_total: number; assessment: string; test_weight: number; interview_weight: number; seats_on_merit: number; tie_break: string; categories: Record<string, number> }
const useProgs = () => useLoad(() => schoolFetch<{ items: Prog[] }>("/school/front-office/admission/programmes"), []);
interface Offer { id: string; application_id: string; category: string; offered_on: string; accept_by: string; status: "Offered" | "Accepted" | "Fee paid" | "Confirmed" | "Expired"; app: { code: string; child: string; class_sought: string; parent_name: string } | null }
const useOffers = () => useLoad(() => schoolFetch<{ items: Offer[] }>("/school/front-office/admission/offers"), []);
const offerTone = (s: Offer["status"]): "info" | "good" | "bad" | "warn" => (s === "Offered" ? "info" : s === "Expired" ? "bad" : s === "Accepted" ? "good" : s === "Fee paid" ? "good" : "good");
const yearLabel = () => { const y = new Date().getFullYear() + 1; return `${y}–${String(y + 1).slice(2)}`; };

// ═════════════ Merit and seats ═════════════
export type MeritTab = "merit-list" | "ranking-rules" | "seat-matrix" | "seat-tracking";
export function MeritPages({ tab }: { tab: MeritTab }) {
  return tab === "merit-list" ? <MeritList /> : tab === "ranking-rules" ? <RankingRules /> : tab === "seat-matrix" ? <SeatMatrix /> : <SeatTracking />;
}

interface Merit { programmes: string[]; programme: Prog; cutoff: number | null; rows: { id: string; code: string; child: string; category: string; test: number | null; interview: number | null; score: number | null; rank: number; state: string }[] }
function MeritList() {
  const [prog, setProg] = useState("");
  const { data, error, loading } = useLoad(() => schoolFetch<Merit>(`/school/front-office/admission/merit${prog ? `?programme=${encodeURIComponent(prog)}` : ""}`), [prog]);
  const [search, setSearch] = useState("");
  const rows = (data?.rows ?? []).filter((r) => has(r, search));
  const p = data?.programme;
  const n = (s: string) => (data?.rows ?? []).filter((r) => r.state === s).length;
  const scored = (data?.rows ?? []).filter((r) => r.score !== null).length;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Programme
          <select aria-label="Programme" value={p?.name ?? ""} onChange={(e) => setProg(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{(data?.programmes ?? []).map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        {p && <span className="text-[13px] text-slate-600">Score = {p.test_weight ? `test ${p.test_weight}% + ` : ""}interview {p.interview_weight}% · {p.seats_on_merit} seats on merit</span>}
      </div>
      <Note>{p && p.test_weight === 0 ? `${p.name} has no written test. Rank is by the child-and-parent interaction score; ties go to the older child.` : "Rank is by the weighted written-test and interview score; ties go to the older child. A child with no score yet shows as “Not assessed”."}</Note>
      <Tiles items={[{ label: "Ranked", value: scored, sub: "assessment done" }, { label: "Eligible for offer", value: n("Eligible for offer"), sub: `top ${p?.seats_on_merit ?? 0}` }, { label: "Waitlist", value: n("Waitlist"), sub: "in rank order" }, { label: "Cut-off score", value: data?.cutoff ?? "—", sub: data?.cutoff == null ? "no scores yet" : "last seat on merit" }]} />
      <ListPanel title={`Merit list · ${p?.name ?? ""}`} noun="candidates" search={search} onSearch={setSearch} exportName="merit-list" head={["Rank", "Application", "Child", "Category", "Test %", "Interview", "Score", "Status"]}
        exportRows={rows.map((r) => [r.rank, r.code, r.child, r.category, r.test, r.interview, r.score, r.state])}
        tableHead={["Rank", "Application", "Child", "Category", "Test", "Interview", "Score", "Status"]} empty={loading ? "Loading…" : "No candidates for this programme yet."}
        rows={rows.map((r) => [r.rank, r.code, <b key="c" className="font-semibold text-slate-900">{r.child}</b>, r.category, r.test ?? "—", r.interview ?? "—", <b key="s">{r.score ?? "—"}</b>, <Chip key="st" tone={r.state === "Eligible for offer" || r.state === "Offered" ? "info" : r.state === "Waitlist" ? "warn" : "mute"}>{r.state}</Chip>])} />
    </div>
  );
}

function RankingRules() {
  const { data, error, loading, reload } = useProgs();
  const act = useAction(reload);
  const [d, setD] = useState<Record<string, { t: string; i: string; m: string }>>({});
  const [saved, setSaved] = useState(false);
  const rows = (data?.items ?? []).filter((p) => !["Nursery", "LKG", "UKG"].includes(p.name));
  const v = (p: Prog) => d[p.name] ?? { t: String(p.test_weight), i: String(p.interview_weight), m: String(p.seats_on_merit) };
  const set = (p: Prog, k: "t" | "i" | "m", val: string) => { setSaved(false); const cur = v(p); const next = { ...cur, [k]: val }; if (k === "t" && val !== "" && Number(val) <= 100) next.i = String(100 - Number(val)); if (k === "i" && val !== "" && Number(val) <= 100) next.t = String(100 - Number(val)); setD({ ...d, [p.name]: next }); };
  const save = async () => { if (await act.run(() => schoolFetch("/school/front-office/admission/programmes", json("PUT", { rows: Object.entries(d).map(([name, x]) => ({ name, test_weight: Number(x.t), interview_weight: Number(x.i), seats_on_merit: Number(x.m) })) })))) { setSaved(true); setD({}); } };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={`Ranking rules · ${yearLabel()}`}>
        <SimpleTable head={["Programme", "Written test weight", "Interview / interaction weight", "Seats on merit", "Tie-break"].map((h) => ({ h }))} empty={loading ? "Loading…" : "No programmes."}
          rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, p.test_weight === 0 && p.interview_weight === 100 && p.name === "Class 1" ? "No test" : <span key="t" className="flex items-center gap-1"><Num v={v(p).t} set={(x) => set(p, "t", x)} label={`Test weight ${p.name}`} />%</span>,
            <span key="i" className="flex items-center gap-1"><Num v={v(p).i} set={(x) => set(p, "i", x)} label={`Interview weight ${p.name}`} />%</span>, <Num key="m" v={v(p).m} set={(x) => set(p, "m", x)} label={`Seats on merit ${p.name}`} />, p.tie_break])} />
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save()}>Save rules</button></div>
      </Panel>
      <Note>RTE / EWS seats aren&apos;t filled from the merit list. They&apos;re allotted by the state&apos;s online lottery and shown in the seat matrix.</Note>
    </div>
  );
}

interface Matrix { name: string; total: number; open: number; categories: Record<string, { seats: number; confirmed: number }> }
const CATS = ["General", "RTE / EWS", "Staff ward", "Sibling", "Management"];
function SeatMatrix() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Matrix[] }>("/school/front-office/admission/seat-matrix"), []);
  const rows = data?.items ?? [];
  const sum = (c: string) => rows.reduce((s, r) => ({ a: s.a + (r.categories[c]?.confirmed ?? 0), b: s.b + (r.categories[c]?.seats ?? 0) }), { a: 0, b: 0 });
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Tiles items={["General", "RTE / EWS", "Staff ward", "Sibling"].map((c) => { const s = sum(c); return { label: c, value: `${s.a} / ${s.b}`, sub: `${s.b - s.a} open` }; })} />
      <Panel title="Seat matrix · confirmed / seats" sub="Updates as offers are confirmed" right={<ExportPrint name="seat-matrix" head={["Programme", "Total", ...CATS, "Open"]} rows={rows.map((r) => [r.name, r.total, ...CATS.map((c) => (r.categories[c] ? `${r.categories[c].confirmed} / ${r.categories[c].seats}` : "—")), r.open])} />}>
        <SimpleTable head={["Programme", "Total", ...CATS, "Open"].map((h) => ({ h }))} empty={loading ? "Loading…" : "No programmes."} rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.name}</b>, r.total, ...CATS.map((c) => (r.categories[c] ? `${r.categories[c].confirmed} / ${r.categories[c].seats}` : "—")), <b key="o">{r.open}</b>])} />
      </Panel>
    </div>
  );
}

function SeatTracking() {
  const { data, error, loading, reload } = useOffers();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const all = data?.items ?? [];
  const rows = all.filter((r) => has(r, search));
  const n = (s: Offer["status"]) => all.filter((r) => r.status === s).length;
  const late = all.filter((r) => r.status === "Offered" && r.accept_by < new Date().toISOString().slice(0, 10)).length;
  const set = (o: Offer, status: string) => act.run(() => schoolFetch(`/school/front-office/admission/offers/${o.id}`, json("PATCH", { status })));
  const release = async () => { await act.run(async () => { const r = await schoolFetch<{ expired: number; offered: number }>("/school/front-office/admission/release-expired", json("POST", {})); setMsg(`${r.expired} offers expired; ${r.offered} seats offered to the waitlist.`); }); };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={() => void release()} disabled={act.busy} className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white hover:bg-[#ac2c28] disabled:opacity-60">Release expired and offer next{late ? ` (${late})` : ""}</button></div>
      {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>{(["Offered", "Accepted", "Fee paid", "Confirmed", "Expired"] as const).map((s) => <div key={s} className={`rounded-2xl border px-4 py-3 ${s === "Expired" ? "border-[#f3c4c2] bg-[#fff5f4]" : "border-slate-200 bg-white"}`}><p className="text-2xl font-bold text-slate-900">{n(s)}</p><p className="text-xs text-slate-600">{s}</p></div>)}</div>
      <ListPanel title={`Seat offers · ${yearLabel()}`} noun="offers" search={search} onSearch={setSearch} exportName="seat-offers" head={["Application", "Child", "Class", "Category", "Offered", "Accept by", "Status"]}
        exportRows={rows.map((r) => [r.app?.code, r.app?.child, r.app?.class_sought, r.category, day(r.offered_on), day(r.accept_by), r.status])}
        tableHead={["Application", "Child", "Class", "Category", "Offered", "Accept by", "Status", ""]} empty={loading ? "Loading…" : "No offers yet. An offer is made when the last approval level approves an application."}
        rows={rows.map((r) => [r.app?.code ?? "—", <b key="c" className="font-semibold text-slate-900">{r.app?.child}</b>, r.app?.class_sought ?? "—", r.category, day(r.offered_on), day(r.accept_by), <Chip key="s" tone={offerTone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{r.status === "Offered" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(r, "Accepted")}>Mark accepted</button>}{r.status === "Accepted" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(r, "Fee paid")}>Fee paid</button>}{r.status === "Fee paid" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Confirmed")}>Confirm admission</button>}{r.status === "Confirmed" && "—"}</span>])} />
    </div>
  );
}

// ═════════════ Offers ═════════════
export type OfferTab = "offer-letters" | "letter-template" | "automatic-messages";
interface Settings { school: string; template: string; stages: { stage: string; enabled: boolean }[] }
const useSettings = () => useLoad(() => schoolFetch<Settings>("/school/front-office/admission/settings"), []);
const fill = (t: string, v: Record<string, string>) => Object.entries(v).reduce((s, [k, x]) => s.split(`{${k}}`).join(x), t);

export function OfferPages({ tab }: { tab: OfferTab }) {
  return tab === "offer-letters" ? <OfferLetters /> : tab === "letter-template" ? <LetterTemplate /> : <AutoMessages />;
}

function OfferLetters() {
  const offers = useOffers();
  const set = useSettings();
  const progs = useProgs();
  const [pick, setPick] = useState("");
  const all = offers.data?.items ?? [];
  const o = all.find((x) => x.id === pick) ?? all[0];
  const group = (cls: string) => { const i = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, k) => `Class ${k + 1}`)].findIndex((x) => cls === x || cls.startsWith(x + " ")); return i <= 2 ? 0 : i <= 7 ? 1 : i <= 12 ? 2 : 3; };
  const fees = useLoad(() => schoolFetch<{ rows: { admission_fee: number; caution: number }[] }>("/school/front-office/admission/fee-setup"), []);
  const text = o && set.data ? (() => { const f = fees.data?.rows[Math.min(group(o.app?.class_sought ?? ""), (fees.data?.rows.length ?? 1) - 1)]; return fill(set.data.template, { school: set.data.school, child: o.app?.child ?? "", class: o.app?.class_sought ?? "", category: o.category, app: o.app?.code ?? "", date: day(o.offered_on), fee: f ? `₹${(f.admission_fee + f.caution).toLocaleString("en-IN")}` : "the fees", deadline: day(o.accept_by) }); })() : "";
  const download = () => o && printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Offer letter</title><style>@page{margin:20mm}body{font:14px/1.7 system-ui,Arial,sans-serif;color:#111827;white-space:pre-wrap}</style></head><body>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</body></html>`);
  void progs;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={offers.error || set.error || fees.error} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ListPanel title="Offer letters" noun="offers" search="" onSearch={() => undefined} exportName="offer-letters" head={["Child", "Class", "Status"]} exportRows={all.map((r) => [r.app?.child, r.app?.class_sought, r.status])}
          tableHead={["Child", "Class", "Status", ""]} empty={offers.loading ? "Loading…" : "No offers yet."} hideSearch
          rows={all.map((r) => [<b key="c" className="font-semibold text-slate-900">{r.app?.child}</b>, r.app?.class_sought ?? "—", <Chip key="s" tone={offerTone(r.status)}>{r.status}</Chip>, <button key="p" type="button" className={small} onClick={() => setPick(r.id)}>{o?.id === r.id ? "Showing" : "Preview"}</button>])} />
        <Panel title={o ? `Offer letter · ${o.app?.child ?? ""}` : "Offer letter"} right={<button type="button" className={small} disabled={!o} onClick={download}>Download PDF</button>}>
          <pre className="whitespace-pre-wrap p-5 font-sans text-[13px] leading-relaxed text-slate-800">{text || "Choose an offer to preview its letter."}</pre>
        </Panel>
      </div>
    </div>
  );
}

function LetterTemplate() {
  const { data, error, loading, reload } = useSettings();
  const act = useAction(reload);
  const [t, setT] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setT(data.template); }, [data]);
  const save = async (body: object) => { if (await act.run(() => schoolFetch("/school/front-office/admission/settings", json("PUT", body)))) setSaved(true); };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white" data-report>
      <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Offer letter template</h2><span className="text-xs text-slate-500">{"{child} {class} {category} {app} {date} {fee} {deadline} {school}"}</span></div>
      {(error || act.error) && <div className="px-5 pt-4"><ErrorBanner message={error || act.error} /></div>}
      <div className="p-5"><label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">Letter</span><textarea className={`${inputCls} min-h-[14rem] font-mono text-[13px]`} disabled={loading} value={t} onChange={(e) => { setT(e.target.value); setSaved(false); }} /></label></div>
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={() => void save({ reset: true })}>Reset to default</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || t.trim().length < 10} onClick={() => void save({ template: t })}>Save template</button></div>
    </div>
  );
}

const MESSAGES: Record<string, [string, string]> = {
  "Application received": ["Email and app", "Thank you. Your application {app} has been received."], "Documents returned": ["SMS and app", "A document needs a clearer copy. Please re-upload it in the tracker."],
  "Assessment slot booked": ["Email and SMS", "Assessment confirmed for {date} at {time}. Admit card attached."], "Result published": ["Email, SMS and app", "Results are out. See your child's status in the tracker."],
  "Offer made": ["Email, WhatsApp and app", "Offer letter attached. Accept and pay by {deadline}."], "Offer expiring (48 h and 12 h)": ["WhatsApp and SMS", "Your offer for {child} expires on {deadline}."],
  "Fee received": ["Email and app", "Payment received. Receipt attached."], "Admission confirmed": ["Email, SMS and app", "Welcome! Logins for the parent and student apps are below."],
};
function AutoMessages() {
  const { data, error, loading, reload } = useSettings();
  const act = useAction(reload);
  const rows = data?.stages ?? [];
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || act.error} />
      <Panel title="Automatic messages" sub={`${rows.length} stages`} right={<ExportPrint name="automatic-messages" head={["When", "Sent by", "Message", "Status"]} rows={rows.map((r) => [r.stage, MESSAGES[r.stage]?.[0], MESSAGES[r.stage]?.[1], r.enabled ? "On" : "Off"])} />}>
        <SimpleTable head={["When", "Sent by", "Message", "Status"].map((h) => ({ h }))} empty={loading ? "Loading…" : "No stages."}
          rows={rows.map((r) => [<b key="w" className="font-semibold text-slate-900">{r.stage}</b>, MESSAGES[r.stage]?.[0] ?? "", MESSAGES[r.stage]?.[1] ?? "", <span key="t" className="flex items-center gap-2"><Chip tone={r.enabled ? "good" : "mute"}>{r.enabled ? "On" : "Off"}</Chip><Toggle checked={r.enabled} onChange={(v) => void act.run(() => schoolFetch("/school/front-office/admission/settings", json("PUT", { stage: r.stage, enabled: v })))} label={`${r.stage} automatic message`} /></span>])} />
      </Panel>
      <Note>These switches are saved, but messages are not sent yet. Sending starts once email and SMS delivery is connected to the admission steps.</Note>
    </div>
  );
}

// ═════════════ Online application ═════════════
export type OnlineTab = "eligibility-check" | "new-application" | "tracker" | "online-applications" | "programme-rules" | "by-programme";
export function OnlineApplicationPages({ tab }: { tab: OnlineTab }) {
  return tab === "eligibility-check" ? <EligibilityChecker /> : tab === "new-application" ? <NewApplication /> : tab === "tracker" ? <Tracker /> : tab === "online-applications" ? <OnlineList /> : tab === "programme-rules" ? <ProgrammeRules /> : <ByProgramme />;
}

const TRACK = ["Submitted", "Documents verified", "Assessment booked", "Assessment done", "Offer made", "Admission fee paid", "Confirmed"];
function trackStep(a: App): number { return a.status === "Allocated" || a.status === "Registered" ? 7 : a.status === "Fee paid" ? 6 : a.status === "Approved" ? 5 : a.level >= 3 ? 4 : a.level === 2 ? 3 : 2; }
function Tracker() {
  const apps = useApps();
  void StatusBoard;
  const list = apps.rows.filter((a) => a.source === "Online");
  const base = list.length ? list : apps.rows;
  return (
    <div className="space-y-4" data-report>
      <ErrorBanner message={apps.error} />
      {!list.length && !apps.loading && <Note>No online applications yet, so every application is shown with the same 7 steps a family would see.</Note>}
      {base.map((a) => { const s = trackStep(a); return (
        <div key={a.id} className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3"><p className="text-[14px] font-semibold text-slate-900">{a.child} · {a.class_sought} <span className="ml-2 text-xs font-normal text-slate-500">{a.code} · submitted {day(a.applied_on)}</span></p><span className="ml-auto"><Chip tone="info">{TRACK[s - 1]}</Chip></span></div>
          <ol style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="gap-2 px-4 py-4 text-center">{TRACK.map((t, i) => <li key={t} className="flex flex-col items-center gap-1.5"><span className={`grid size-7 place-items-center rounded-full border text-xs font-bold ${i + 1 < s ? "border-[#065740] bg-[#065740] text-white" : i + 1 === s ? "border-[#0294ce] text-[#0294ce]" : "border-slate-300 text-slate-500"}`}>{i + 1 < s ? "✓" : i + 1}</span><span className={`text-[11.5px] ${i + 1 === s ? "font-semibold text-slate-900" : "text-slate-600"}`}>{t}</span></li>)}</ol>
        </div>); })}
      {!base.length && !apps.loading && <Note>No applications yet.</Note>}
    </div>
  );
}

function OnlineList() {
  const apps = useApps();
  const online = apps.rows.filter((a) => a.source === "Online");
  return (
    <div className="space-y-5" data-report>
      <Tiles items={[{ label: "Online applications", value: online.length, sub: "from the online form" }, { label: "Borderline to review", value: "—", sub: "not tracked yet" }, { label: "In progress", value: online.filter((a) => !["Allocated", "Registered"].includes(a.status)).length, sub: "documents to offer" }, { label: "Confirmed", value: online.filter((a) => ["Registered", "Allocated"].includes(a.status)).length, sub: "admission complete" }]} />
      {online.length ? <ApplicationList online /> : <Note>No online applications yet. Open <b>Online Application › New Application</b> and submit one with the source “Online”. It appears here straight away.</Note>}
      <Note>Borderline applications (within 3% of a marks rule or 1 month of the age rule) need approval before they move on. Rules are set in Programme Rules.</Note>
    </div>
  );
}

function ProgrammeRules() {
  const { data, error, loading, reload } = useProgs();
  const act = useAction(reload);
  const [d, setD] = useState<Record<string, Partial<Record<"a" | "p" | "s", string>>>>({});
  const [saved, setSaved] = useState(false);
  const rows = data?.items ?? [];
  const v = (p: Prog, k: "a" | "p" | "s") => d[p.name]?.[k] ?? String(k === "a" ? p.min_age : k === "p" ? (p.overall_pct ?? "") : p.seats_total);
  const set = (p: Prog, k: "a" | "p" | "s", x: string) => { setSaved(false); setD({ ...d, [p.name]: { ...d[p.name], [k]: x } }); };
  const save = async () => { if (await act.run(() => schoolFetch("/school/front-office/admission/programmes", json("PUT", { rows: Object.entries(d).map(([name, x]) => ({ name, ...(x.a !== undefined ? { min_age: Number(x.a) } : {}), ...(x.p !== undefined ? { overall_pct: x.p === "" ? null : Number(x.p) } : {}), ...(x.s !== undefined ? { seats_total: Number(x.s) } : {}) })) })))) { setSaved(true); setD({}); } };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={`Programme rules · ${yearLabel()}`} sub={`${rows.length} programmes`}>
        <SimpleTable head={["Programme", "Min age on 31 Mar", "Overall % (last exam)", "Seats", "Assessment"].map((h) => ({ h }))} empty={loading ? "Loading…" : "No programmes."}
          rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, <span key="a" className="flex items-center gap-1"><Num v={v(p, "a")} set={(x) => set(p, "a", x)} label={`Minimum age ${p.name}`} />yrs</span>,
            p.overall_pct === null && d[p.name]?.p === undefined ? "Not used" : <span key="p" className="flex items-center gap-1"><Num v={v(p, "p")} set={(x) => set(p, "p", x)} label={`Overall % ${p.name}`} />%</span>, <Num key="s" v={v(p, "s")} set={(x) => set(p, "s", x)} w="w-20" label={`Seats ${p.name}`} />, p.assessment])} />
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !Object.keys(d).length} onClick={() => void save()}>Save rules</button></div>
      </Panel>
    </div>
  );
}

function ByProgramme() {
  const progs = useProgs();
  const apps = useApps();
  const offers = useOffers();
  const [view, setView] = useState<Prog | null>(null);
  const P = progs.data?.items ?? [];
  const mine = (p: Prog) => apps.rows.filter((a) => p.classes.split(",").map((x) => x.trim()).includes(a.class_sought.split(" ").slice(0, 2).join(" ").replace(/^(Nursery|LKG|UKG).*/, "$1")) && (!a.details?.stream || p.name.toLowerCase().includes(String(a.details.stream).toLowerCase())));
  const taken = (p: Prog) => (offers.data?.items ?? []).filter((o) => ["Accepted", "Fee paid", "Confirmed"].includes(o.status) && mine(p).some((a) => a.id === o.application_id)).length;
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={progs.error || apps.error || offers.error} />
      <Panel title="Applications by programme" sub={`${P.length} programmes`} right={<ExportPrint name="applications-by-programme" head={["Programme", "Applications", "Offers", "Seats left"]} rows={P.map((p) => [p.name, mine(p).length, (offers.data?.items ?? []).filter((o) => mine(p).some((a) => a.id === o.application_id)).length, `${p.seats_total - taken(p)} / ${p.seats_total}`])} />}>
        <SimpleTable head={["Programme", "Applications", "Approved or later", "Seats left", ""].map((h) => ({ h }))} empty={progs.loading ? "Loading…" : "No programmes."}
          rows={P.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, mine(p).length, mine(p).filter((a) => !["Under review", "Returned", "Rejected"].includes(a.status)).length, `${p.seats_total - taken(p)} / ${p.seats_total}`, <button key="v" type="button" className={small} onClick={() => setView(p)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Classes" v={view.classes.split(",").join(", ")} /><Row k="Minimum age" v={`${view.min_age} years`} /><Row k="Seats" v={view.seats_total} /><Row k="Assessment" v={view.assessment} /><Row k="Applications" v={mine(view).length} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <BarRows rows={P.map((p): [string, number] => [p.name, mine(p).length])} />
    </div>
  );
}
void pct; void useRegister;
