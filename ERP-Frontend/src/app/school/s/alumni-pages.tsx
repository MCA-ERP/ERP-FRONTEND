"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

interface Alum { id: string; full_name: string; batch_year: number; last_class: string | null; studied: string | null; now_at: string | null; email: string | null; phone: string | null; helps_as: "Active" | "Given" | "Upcoming" | null; given_amount: number; given_on: string | null }
interface Ev { id: string; title: string; event_date: string; audience: string | null }
export type AlumniTab = "alumni-directory" | "add-and-events";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const thisYear = new Date().getFullYear();

export function AlumniPages({ tab }: { tab: AlumniTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Alum[]; events: Ev[] }>("/school/alumni"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [invite, setInvite] = useState<Alum | null>(null);
  const [evPick, setEvPick] = useState("");
  const [copied, setCopied] = useState(false);
  const [evOpen, setEvOpen] = useState(false);
  const blank = { full_name: "", batch_year: String(thisYear), last_class: "", now_at: "" };
  const [f, setF] = useState(blank);
  const [ef, setEf] = useState({ title: "", event_date: new Date().toISOString().slice(0, 10), audience: "" });
  const [done, setDone] = useState("");
  const all = data?.items ?? [];
  const events = data?.events ?? [];
  const rows = all.filter((a) => has(a, search));
  const batches = all.map((a) => a.batch_year);
  const given = all.filter((a) => a.given_on && new Date(a.given_on).getFullYear() === thisYear).reduce((s, a) => s + a.given_amount, 0);
  const ev = events.find((e) => e.id === (evPick || events[0]?.id));
  const text = invite ? `Dear ${invite.full_name.split(" ")[0]}, you are invited to ${ev ? `${ev.title} on ${day(ev.event_date)}` : "our next alumni event"}. We would love to see you.` : "";
  const submit = async (e: FormEvent) => { e.preventDefault(); setDone(""); if (await act.run(() => schoolFetch("/school/alumni", json("POST", { full_name: f.full_name, batch_year: Number(f.batch_year), last_class: f.last_class, now_at: f.now_at })))) { setDone(`${f.full_name} added to the directory.`); setF(blank); } };
  const addEvent = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch("/school/alumni/events", json("POST", ef)))) { setEvOpen(false); setEf({ ...ef, title: "", audience: "" }); } };

  if (tab === "alumni-directory") {
    return (
      <div className="space-y-5" data-report>
        <ErrorBanner message={error || act.error} />
        <Tiles items={[
          { label: "Alumni on record", value: all.length.toLocaleString("en-IN"), sub: batches.length ? `batches ${Math.min(...batches)} – ${Math.max(...batches)}` : "No batches yet" },
          { label: "Reachable", value: all.filter((a) => a.email || a.phone).length.toLocaleString("en-IN"), sub: "has an email or phone" },
          { label: "Mentors", value: all.filter((a) => a.helps_as === "Active").length, sub: "career talks and guidance" },
          { label: "Given this year", value: inr(given), sub: "scholarship fund" },
        ]} />
        <ListPanel title="Alumni directory" noun="alumni" search={search} onSearch={setSearch} exportName="alumni-directory" head={["Name", "Batch", "Last class", "Studied", "Now", "Helps as"]}
          exportRows={rows.map((a) => [a.full_name, a.batch_year, a.last_class, a.studied, a.now_at, a.helps_as])}
          tableHead={["Name", "Batch", "Last class", "Studied", "Now", "Helps as", ""]} empty={loading ? "Loading…" : "No alumni yet. Add the first one from Add and Events."}
          rows={rows.map((a) => [<b key="n" className="font-semibold text-slate-900">{a.full_name}</b>, a.batch_year, a.last_class ?? "—", a.studied ?? "—", a.now_at ?? "—", a.helps_as ? <Chip key="h" tone={a.helps_as === "Upcoming" ? "info" : "good"}>{a.helps_as}</Chip> : <span key="h" className="text-slate-400">—</span>, <button key="i" type="button" className={small} onClick={() => { setInvite(a); setCopied(false); }}>Invite to event</button>])} />
        <Modal open={!!invite} title={`Invite ${invite?.full_name ?? ""}`} onClose={() => setInvite(null)}>{invite && <>
          <dl><Row k="Email" v={invite.email || "—"} /><Row k="Phone" v={invite.phone || "—"} /></dl>
          <div className="mt-3 space-y-3">
            <Field label="Event"><select className={inputCls} value={evPick || events[0]?.id || ""} onChange={(e) => { setEvPick(e.target.value); setCopied(false); }}>{!events.length && <option value="">No events yet</option>}{events.map((e) => <option key={e.id} value={e.id}>{e.title} · {day(e.event_date)}</option>)}</select></Field>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">{text}</p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" className={small} onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy invitation"}</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setInvite(null)}>Close</button></div></>}</Modal>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {done && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>}
      <FormCard title="Add alumnus" cols="lg:grid-cols-4" onSubmit={submit} onDiscard={() => { setF(blank); setDone(""); }} busy={act.busy} error={act.error}>
        <Field label="Name"><input className={inputCls} required minLength={2} maxLength={150} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Batch (year left)"><input type="number" min={1900} max={2100} className={inputCls} required value={f.batch_year} onChange={(e) => setF({ ...f, batch_year: e.target.value })} /></Field>
        <Field label="Last class"><input className={inputCls} maxLength={60} placeholder="Class 12 · Science" value={f.last_class} onChange={(e) => setF({ ...f, last_class: e.target.value })} /></Field>
        <Field label="Now studying or working at"><input className={inputCls} maxLength={150} value={f.now_at} onChange={(e) => setF({ ...f, now_at: e.target.value })} /></Field>
      </FormCard>
      <Panel title="Alumni events" right={<button type="button" className={small} onClick={() => setEvOpen(true)}>+ New event</button>}>
        <SimpleTable head={["Event", "Date", "Audience"].map((h) => ({ h }))} empty={loading ? "Loading…" : "No events yet."} rows={events.map((e) => [e.title, day(e.event_date), e.audience || "—"])} />
      </Panel>
      <Modal open={evOpen} title="New alumni event" onClose={() => setEvOpen(false)}>
        <form onSubmit={addEvent} className="space-y-3">
          <Field label="Event"><input className={inputCls} required minLength={2} maxLength={200} value={ef.title} onChange={(e) => setEf({ ...ef, title: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} required value={ef.event_date} onChange={(e) => setEf({ ...ef, event_date: e.target.value })} /></Field>
          <Field label="Audience"><input className={inputCls} maxLength={150} value={ef.audience} onChange={(e) => setEf({ ...ef, audience: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setEvOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}
