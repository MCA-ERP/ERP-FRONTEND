"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { escapeHtml } from "@/components/admin/csv";
import { BarRows, Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Field, printHtml } from "../../school/s/fo-pages";
import { day } from "../../school/s/dash-pages";
import { Head } from "../../teacher/t/head";
import { Table, Tile, Tiles, name, pill, solid } from "./ui";

/** Exit interviews and exit letters, on the same exits HR approves under Staff Exit. */
const H = "/school/hr";
const dialogFoot = "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3";

interface Leaver { id: string; name: string; designation: string; reason: string; status: string; would_rejoin: boolean | null; said: string }
interface Interviews { ready: boolean; year: string; exits: number; attrition: number; would_rejoin: number | null; avg_years: number | null; reasons: [string, number][]; items: Leaver[] }

export function ExitInterviews() {
  const p = useLoad(() => schoolFetch<Interviews>(`${H}/exit-interviews`), []);
  const act = useAction(() => p.reload());
  const [rec, setRec] = useState<Leaver | null>(null); const [f, setF] = useState({ reason: "", would_rejoin: "yes", said: "" });
  const x = p.data; const items = x?.items ?? []; const top = x?.reasons[0];
  const save = async (e: FormEvent) => { e.preventDefault(); if (rec && await act.run(() => schoolFetch(`${H}/exit-interviews/${rec.id}`, json("PUT", { reason: f.reason, would_rejoin: f.would_rejoin === "yes", said: f.said })))) setRec(null); };
  return (
    <div className="space-y-5" data-report><Head title="Exit Interviews" subtitle="Why people leave, in their own words. Answers are seen only by HR and the Principal." /><ErrorBanner message={p.error} />
      <Tiles><Tile label="Exits this year" value={x?.exits ?? 0} sub={x ? `Attrition ${x.attrition}%` : ""} /><Tile label="Top reason" value={top?.[0] ?? "—"} sub={top ? `${top[1]} of ${x!.exits}` : ""} /><Tile label="Would rejoin" value={x?.would_rejoin != null ? `${x.would_rejoin}%` : "—"} /><Tile label="Avg time at school" value={x?.avg_years != null ? `${x.avg_years} years` : "—"} /></Tiles>
      <Panel title="Reasons for leaving" sub={x?.year}><BarRows rows={x?.reasons ?? []} /></Panel>
      <Table title="Exit interviews" noun="interviews" exportName="exit-interviews" empty={p.loading ? "Loading…" : "No approved exits yet."}
        head={[{ h: "Leaver" }, { h: "Reason" }, { h: "Interview" }, { h: "Would rejoin" }, { h: "Said" }, { h: "" }]}
        rows={items.map((i) => { const rejoin = i.would_rejoin === null ? "—" : i.would_rejoin ? "Yes" : "No"; return { key: i.id, find: `${i.name} ${i.reason} ${i.status}`, out: [i.name, i.reason, i.status, rejoin, i.said], cells: [
          name(i.name, i.designation), i.reason || "—", <Chip key="s" tone={i.status === "Closed" ? "mute" : "warn"}>{i.status}</Chip>, rejoin, i.said ? <span key="q" className="block max-w-[28rem]">“{i.said}”</span> : "",
          <span key="b" className="flex justify-end">{i.status === "Pending" ? <button type="button" className={solid} onClick={() => { setRec(i); setF({ reason: i.reason, would_rejoin: "yes", said: "" }); }}>Record interview</button> : <button type="button" className={pill} onClick={() => { setRec(i); setF({ reason: i.reason, would_rejoin: i.would_rejoin ? "yes" : "no", said: i.said }); }}>Edit</button>}</span>,
        ] }; })} />
      {x && !x.ready && <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[13px] text-slate-800">Interviews can be saved once the latest database update has been applied.</p>}
      <Modal open={!!rec} title={rec ? `Exit interview · ${rec.name}` : ""} onClose={() => setRec(null)}><form onSubmit={save} className="space-y-3"><ErrorBanner message={act.error} /><Field label="Reason for leaving"><input className={inputCls} required minLength={2} maxLength={80} list="exit-reasons" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /><datalist id="exit-reasons">{["Relocation", "Higher studies", "Better pay elsewhere", "Retirement", "Workload", "Personal"].map((r) => <option key={r} value={r} />)}</datalist></Field><Field label="Would rejoin"><select className={inputCls} value={f.would_rejoin} onChange={(e) => setF({ ...f, would_rejoin: e.target.value })}><option value="yes">Yes</option><option value="no">No</option></select></Field><Field label="What they said"><textarea className={inputCls} rows={3} maxLength={500} value={f.said} onChange={(e) => setF({ ...f, said: e.target.value })} /></Field><div className={dialogFoot}><button type="button" className={pill} onClick={() => setRec(null)}>Cancel</button><button type="submit" className={solid} disabled={act.busy}>Save interview</button></div></form></Modal>
    </div>
  );
}

interface Letter { id: string; name: string; designation: string; joined_on: string | null; last_day: string; settlement: "Paid" | "Pending"; can_issue: boolean }
interface Letters { school: string; address: string; principal: string; items: Letter[] }

function letterHtml(o: Letters, x: Letter) {
  const e = escapeHtml; const post = x.designation ? ` as <b>${e(x.designation)}</b>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Relieving and experience letter</title><style>body{font:14px/1.6 Arial,sans-serif;color:#111;padding:40px;max-width:620px;margin:auto}h1{font-size:16px;text-align:center;margin:28px 0}</style></head><body><b>${e(o.school)}</b><br>${e(o.address)}<p>${e(day(x.last_day))}</p><h1>Relieving and experience letter</h1><p>This is to certify that <b>${e(x.name)}</b> worked at ${e(o.school)}${post}${x.joined_on ? ` from ${e(day(x.joined_on))}` : ""} to ${e(day(x.last_day))}.</p><p>${e(x.name)} has been relieved from duties with effect from the close of ${e(day(x.last_day))}. The final settlement has been paid and there are no dues outstanding.</p><p>We wish ${e(x.name)} every success.</p><p style="margin-top:48px">${o.principal ? `${e(o.principal)}<br>` : ""}Principal</p></body></html>`;
}

export function ExitLetters() {
  const p = useLoad(() => schoolFetch<Letters>(`${H}/exit-letters`), []);
  const [wait, setWait] = useState<Letter | null>(null);
  const x = p.data; const items = x?.items ?? [];
  const service = (i: Letter) => `${i.joined_on ? day(i.joined_on) : "—"} – ${day(i.last_day)}`;
  return (
    <div data-report><Head title="Exit Letters" subtitle="Relieving and experience letters, issued on the last day once the final settlement is paid." /><ErrorBanner message={p.error} />
      <Table title="Exit letters" noun="leavers" exportName="exit-letters" empty={p.loading ? "Loading…" : "No approved exits yet."}
        head={[{ h: "Leaver" }, { h: "Service" }, { h: "Settlement" }, { h: "" }]}
        rows={items.map((i) => ({ key: i.id, find: `${i.name} ${i.designation} ${i.settlement}`, out: [i.name, service(i), i.settlement], cells: [name(i.name, i.designation), service(i), <Chip key="s" tone={i.settlement === "Paid" ? "good" : "warn"}>{i.settlement}</Chip>,
          <span key="b" className="flex justify-end"><button type="button" className={pill} onClick={() => (i.can_issue ? printHtml(letterHtml(x!, i)) : setWait(i))}>Letter</button></span>] }))} />
      <Modal open={!!wait} title={wait?.name ?? ""} onClose={() => setWait(null)}>{wait && <><p className="text-[13px] text-slate-700">{wait.settlement === "Pending" ? "The letter can be issued after Accounts has paid the final settlement." : `The letter can be issued on the last day, ${day(wait.last_day)}.`}</p><div className={dialogFoot}><button type="button" className={pill} onClick={() => setWait(null)}>Close</button></div></>}</Modal>
    </div>
  );
}
