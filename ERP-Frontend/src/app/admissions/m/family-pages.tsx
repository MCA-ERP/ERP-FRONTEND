"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Field, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { DataTable, Loading, dmy, has, phone, pillBtn } from "./ui";

// ═════════════ Applicant portal: messages from families ═════════════
interface Thread { family_id: string; name: string; mobile: string | null; last: string; at: string; awaiting: boolean; messages: { id: string; mine: boolean; body: string; at: string; enquiry_id: string | null }[] }
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

/** What families write from the Applicant portal (enquiries and messages), and your replies, which they see there. */
export function FamilyMessages() {
  const r = useLoad(() => schoolFetch<{ items: Thread[] }>("/admissions/family/threads"), []);
  const act = useAction(r.reload);
  const [pick, setPick] = useState("");
  const [text, setText] = useState("");
  const items = r.data?.items ?? [];
  const t = items.find((x) => x.family_id === pick) ?? items[0];
  const open = [...(t?.messages ?? [])].reverse().find((m) => !m.mine && m.enquiry_id)?.enquiry_id ?? [...(t?.messages ?? [])].reverse().find((m) => m.enquiry_id)?.enquiry_id ?? null;
  const send = async () => { if (t && text.trim() && await act.run(() => schoolFetch("/admissions/family/reply", json("POST", { family_id: t.family_id, body: text.trim(), enquiry_id: [...t.messages].reverse()[0]?.mine === false ? open : null })))) setText(""); };
  return (
    <div>
      <Head title="Family Messages" subtitle="Questions and messages from families in the Applicant portal. Your reply appears in their Messages and Enquiry pages." />
      <ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : !items.length ? <p className="py-10 text-center text-sm text-slate-400">No family has written yet.</p> : (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <Panel title="Families" sub={`${items.length}`}>
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map((x) => <li key={x.family_id}><button type="button" onClick={() => setPick(x.family_id)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${x.family_id === t?.family_id ? "bg-[#f1f9fd]" : ""}`}><span className="flex justify-between gap-2"><b className="truncate text-[13px] text-slate-900">{x.name || "Family"}</b>{x.awaiting && <span className="shrink-0 rounded-full bg-[#fce0df] px-2 text-[11px] font-semibold text-[#ac2c28]">Waiting</span>}</span><span className="block truncate text-[12px] text-slate-600">{x.last}</span><span className="block text-[11px] text-slate-400">{dmy(x.at)}</span></button></li>)}</ul>
          </Panel>
          {t && (
            <Panel title={t.name || "Family"} sub={phone(t.mobile)}>
              <div className="flex h-[22rem] flex-col gap-2.5 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{t.messages.map((m) => <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}><div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] ${m.mine ? "bg-[#0294CE] text-white" : "bg-[#e8f1f6] text-slate-900"}`}>{m.body}</div><span className="mt-0.5 text-[10.5px] text-slate-400">{m.mine ? "Admissions office" : t.name} · {dmy(m.at)} {hm(m.at)}</span></div>)}</div>
              <form className="flex gap-2 border-t border-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}><input className={inputCls} value={text} maxLength={1000} placeholder="Write a reply…" aria-label="Write a reply" onChange={(e) => setText(e.target.value)} /><button type="submit" className={btnPrimary} disabled={act.busy || !text.trim()}>Send</button></form>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════ Applicant portal: visit and assessment slots ═════════════
interface SlotRow { id: string; kind: string; date: string; time: string; capacity: number; booked: number }
/** The campus-visit and assessment slots families book in the Applicant portal. A booked assessment appears in Test & Interview. */
export function FamilySlots() {
  const r = useLoad(() => schoolFetch<{ items: SlotRow[] }>("/admissions/family/slots"), []);
  const act = useAction(r.reload);
  const [f, setF] = useState({ kind: "Assessment", date: "", date2: "", times: "09:00, 10:00, 11:00", capacity: "1" });
  const [search, setSearch] = useState("");
  const rows = (r.data?.items ?? []).filter((x) => has(x, search));
  const dates = () => { if (!f.date) return []; const out: string[] = []; const end = f.date2 && f.date2 >= f.date ? f.date2 : f.date; for (let d = new Date(f.date + "T00:00:00Z"); d.toISOString().slice(0, 10) <= end && out.length < 31; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };
  const times = f.times.split(",").map((s) => s.trim()).filter((s) => /^\d{2}:\d{2}$/.test(s));
  return (
    <div>
      <Head title="Family Slots" subtitle="Open campus-visit and assessment slots for families to book in the Applicant portal." />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="Open slots">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="For"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option>Assessment</option><option>Visit</option></select></Field>
          <Field label="From date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="To date (optional)"><input type="date" className={inputCls} value={f.date2} onChange={(e) => setF({ ...f, date2: e.target.value })} /></Field>
          <Field label="Times" hint="24-hour, separated by commas"><input className={inputCls} value={f.times} onChange={(e) => setF({ ...f, times: e.target.value })} /></Field>
          <Field label="Families per slot"><input type="number" min={1} max={200} className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" className={btnPrimary} disabled={act.busy || !dates().length || !times.length} onClick={() => void act.run(() => schoolFetch("/admissions/family/slots", json("POST", { kind: f.kind, dates: dates(), times, capacity: Number(f.capacity) || 1 })))}>Open slots</button></div>
      </Panel>
      <div className="mt-5">
        <DataTable title="Upcoming slots" noun="slots" search={search} onSearch={setSearch} exportName="family-slots" exportHead={["For", "Date", "Time", "Booked", "Capacity"]} exportRows={rows.map((x) => [x.kind, dmy(x.date), x.time, x.booked, x.capacity])}
          head={["For", "Date", "Time", "Booked", ""]} empty={r.loading ? "Loading…" : "No slots are open."} rows={rows.map((x) => [x.kind, dmy(x.date), x.time, `${x.booked} / ${x.capacity}`, <button key="d" type="button" className={pillBtn} disabled={act.busy || x.booked > 0} title={x.booked ? "A family has booked this slot" : ""} onClick={() => void act.run(() => schoolFetch(`/admissions/family/slots/${x.id}`, { method: "DELETE" }))}>Remove</button>])} />
      </div>
    </div>
  );
}
