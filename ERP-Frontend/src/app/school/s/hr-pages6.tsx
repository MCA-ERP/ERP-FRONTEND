"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Tile as HrTile, Tiles as HrTiles } from "../../hr/h/ui";
import { useSchool } from "../context";
import { Field, ListPanel, has, printHtml } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, primaryCls } from "./fee-pages";

const H = "/school/hr";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// ═════════════ onboarding ═════════════
interface Jn { id: string; name: string; position: string; joining_on: string | null; done: string[]; count: number; total: number; background: string; status: string }
export function OnboardingPages({ tab }: { tab: "new-joiners" | "joining-checklist" }) {
  const j = useLoad(() => schoolFetch<{ items_def: { key: string; label: string; owner: string }[]; items: Jn[] }>(`${H}/joiners`), []);
  const act = useAction(() => j.reload());
  const [search, setSearch] = useState(""); const [pick, setPick] = useState("");
  const x = j.data; const items = x?.items ?? [];
  const err = <ErrorBanner message={j.error || act.error} />;
  const open = (id: string) => { setPick(id); window.dispatchEvent(new CustomEvent("hr-onboard-open")); };
  void open;
  if (tab === "new-joiners") {
    const rows = items.filter((i) => has(i, search));
    return <div data-report>{err}<ListPanel title="New joiners" noun="joiners" search={search} onSearch={setSearch} exportName="new-joiners" head={["Joiner", "Joining", "Checklist", "Background check", "Status"]} exportRows={rows.map((i) => [i.name, i.joining_on ? day(i.joining_on) : "", `${i.count} of ${i.total}`, i.background, i.status])}
      tableHead={["Joiner", "Joining", "Checklist", "Background check", "Status"]} empty={j.loading ? "Loading…" : "Nobody has accepted an offer yet. Offers are made in Recruitment."}
      rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.position}</span></span>, i.joining_on ? day(i.joining_on) : "—", <span key="c" className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded bg-slate-100"><span className="block h-full bg-[#026f9b]" style={{ width: `${(i.count / i.total) * 100}%` }} /></span>{i.count} of {i.total}</span>, <Chip key="b" tone={i.background === "Verified" ? "good" : "info"}>{i.background}</Chip>, <Chip key="s" tone={i.status === "Ready" ? "good" : "info"}>{i.status === "Ready" ? "Ready to join" : "Joining"}</Chip>])} />
      <p className="mt-3 text-xs text-slate-500">Open the Joining Checklist tab to tick items.</p></div>;
  }
  const cur = items.find((i) => i.id === (pick || items[0]?.id));
  return (
    <div className="space-y-5">{err}
      <div className="flex flex-wrap gap-2">{items.map((i) => <button key={i.id} type="button" onClick={() => setPick(i.id)} className={`rounded-full border px-3.5 py-1 text-[13px] ${cur?.id === i.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{i.name}</button>)}</div>
      {!cur ? <p className="py-10 text-center text-sm text-slate-400">{j.loading ? "Loading…" : "Nobody has accepted an offer yet."}</p> :
        <div className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{cur.name} · {cur.position}</h2><span className="text-xs text-slate-500">{cur.joining_on ? `Joining ${day(cur.joining_on)} · ` : ""}{cur.count} of {cur.total} done</span></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{x?.items_def.map((d) => { const on = cur.done.includes(d.key); return <label key={d.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-[13px] ${on ? "border-[#bfe3d5] bg-[#d9efe8]" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#026f9b]" checked={on} disabled={act.busy} onChange={(e) => void act.run(() => schoolFetch(`${H}/joiners/${cur.id}`, json("POST", { item: d.key, done: e.target.checked })))} /><span><span className="block text-slate-900">{d.label}</span><span className="block text-[11px] text-slate-500">{d.owner}</span></span></label>; })}</div>
          {cur.status === "Ready" && <p className="border-t border-slate-100 px-5 py-3 text-[13px] text-[#065740]">Everything is ticked. Create the employee record in Employee Registration so they can sign in.</p>}</div>}
    </div>
  );
}

// ═════════════ probation ═════════════
interface Pb { id: string; staff_id: string; name: string; detail: string; started_on: string; ends_on: string; reviewer: string; status: string; reviews: number; rating: number | null; shown: string }
const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
export function ProbationPages() {
  const isHr = useSchool().user.role === "HR";
  const p = useLoad(() => schoolFetch<{ staff: { id: string; name: string }[]; items: Pb[]; on: number; due: number; confirmed: number; extended: number; note: string }>(`${H}/probation`), []);
  const act = useAction(() => p.reload());
  const [search, setSearch] = useState(""); const [adding, setAdding] = useState(false); const [f, setF] = useState({ staff_id: "", started_on: nowIst(), months: "6", reviewer: "" });
  const x = p.data; const rows = (x?.items ?? []).filter((i) => has(i, search));
  const dec = (i: Pb, action: string) => void act.run(() => schoolFetch(`${H}/probation/${i.id}`, json("POST", { action })));
  const letter = (i: Pb) => { const e = escapeHtml; printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Confirmation</title><style>body{font:14px Arial,sans-serif;padding:40px;max-width:600px;margin:auto}</style></head><body><p>${e(day(nowIst()))}</p><p>Dear ${e(i.name)},</p><p>We are pleased to confirm your appointment${i.detail ? ` as ${e(i.detail.split(" · ")[0])}` : ""} with effect from the end of your probation on ${e(day(i.ends_on))}.</p><p>Thank you for your work so far.</p><p><br>Principal</p></body></html>`); };
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${H}/probation`, json("POST", { staff_id: f.staff_id || x?.staff[0]?.id, started_on: f.started_on, months: Number(f.months), reviewer: f.reviewer })))) setAdding(false); };
  return (
    <div className="space-y-5" data-report><ErrorBanner message={p.error || act.error} />
      {isHr ? <HrTiles><HrTile label="On probation" value={x?.on ?? 0} /><HrTile tone="amber" label="Decision due this month" value={x?.due ?? 0} sub="Before probation ends" /><HrTile label="Confirmed this year" value={x?.confirmed ?? 0} /><HrTile label="Extended" value={x?.extended ?? 0} /></HrTiles> : <Tiles items={[{ label: "On probation", value: x?.on ?? 0, sub: "" }, { label: "Decision due", value: x?.due ?? 0, sub: "Within 30 days" }, { label: "Confirmed this year", value: x?.confirmed ?? 0, sub: "" }, { label: "Extended", value: x?.extended ?? 0, sub: "" }]} />}
      <ListPanel title="Probation" noun="staff" search={search} onSearch={setSearch} exportName="probation" head={["Staff", "Joined", "Probation ends", "Reviews", "Latest rating", "Reviewer", "Status"]} exportRows={rows.map((i) => [i.name, day(i.started_on), day(i.ends_on), i.reviews, i.rating ?? "", i.reviewer, i.shown])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add to probation</button>} tableHead={["Staff", "Joined", "Probation ends", "Reviews", "Latest rating", "Reviewer", "Status", ""]} empty={p.loading ? "Loading…" : "Nobody is on probation."}
        rows={rows.map((i) => [<span key="n"><b className="font-semibold text-slate-900">{i.name}</b><span className="block text-[11px] text-slate-500">{i.detail}</span></span>, day(i.started_on), day(i.ends_on), `${i.reviews} done`, i.rating !== null ? <span key="r"><span className="text-[#d9902f]">{stars(i.rating)}</span> {i.rating}</span> : "—", i.reviewer || "—", <Chip key="s" tone={i.shown === "Confirmed" ? "good" : i.shown === "Due for decision" ? "warn" : i.shown === "Ended" ? "bad" : "info"}>{i.shown}</Chip>,
          <span key="b" className="flex gap-1.5">{["On probation", "Extended"].includes(i.status) ? <><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => dec(i, "confirm")}>Confirm</button><button type="button" className={small} disabled={act.busy} onClick={() => dec(i, "extend")}>Extend 3 months</button><button type="button" className={small} disabled={act.busy} onClick={() => dec(i, "end")}>End</button></> : i.status === "Confirmed" ? <button type="button" className={small} onClick={() => letter(i)}>Letter</button> : null}</span>])} />
      {x?.note && <p className="rounded-xl border border-[#f1dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px] text-slate-800">{x.note}</p>}
      <Modal open={adding} title="Add to probation" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label="Staff"><select className={inputCls} value={f.staff_id || x?.staff[0]?.id || ""} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>{x?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><div className="grid grid-cols-3 gap-3"><Field label="Started on"><input type="date" required className={inputCls} value={f.started_on} onChange={(e) => setF({ ...f, started_on: e.target.value })} /></Field><Field label="Months"><select className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })}>{[3, 6, 9, 12].map((m) => <option key={m}>{m}</option>)}</select></Field><Field label="Reviewer"><input className={inputCls} maxLength={100} value={f.reviewer} onChange={(e) => setF({ ...f, reviewer: e.target.value })} /></Field></div><p className="text-xs text-slate-500">Reviews and ratings come from the “Reviews” tab in Staff Performance.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
void Row; void Foot;
