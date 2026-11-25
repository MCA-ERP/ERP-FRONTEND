"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Empty, Loading } from "../../teacher/t/dash-pages";
import { Tile, Tiles } from "../../hr/h/ui";
import { useTransport } from "../context";
import { StepStrip } from "./strip";
import { Track, type Run } from "./trip-pages";
import { Bar, Done, Filtered, L, PillSelect } from "./ui";

const tick = "flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-900 hover:border-slate-400";
const Check = ({ label, checked, disabled, title, onChange }: { label: string; checked: boolean; disabled?: boolean; title?: string; onChange: (v: boolean) => void }) => (
  <label className={`${tick} ${disabled ? "cursor-not-allowed opacity-60" : ""}`} title={title}><input type="checkbox" className="h-4 w-4 accent-[#0294CE]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />{label}</label>
);

// ═════════════ send an update ═════════════
interface Options { types: string[]; channels: { sms: string; whatsapp: string }; families: number; routes: { id: string; name: string; families: number; vehicle: string }[] }
/** A first draft for the chosen kind of update; the desk edits it before sending. */
function draft(type: string, route: { name: string; vehicle: string } | undefined) {
  const bus = route ? `${route.vehicle || "The bus"} on ${route.name}` : "The school bus";
  if (type === "Delay") return `${bus} is running about 15 minutes late. We'll update you when it reaches your stop.`;
  if (type === "Holiday") return "There is no bus service on [date]. It will run as usual from [date].";
  if (type === "Route change") return `From [date], ${route?.name ?? "your route"} will change: [what changes].`;
  if (type === "Substitute bus") return `A substitute bus will run ${route ? `${route.name} ` : ""}today. Registration number: [number].`;
  return "";
}

function SendUpdate({ go }: { go: (tab: string) => void }) {
  const { data: x, error, loading } = useLoad(() => schoolFetch<Options>("/transport/parent-updates"), []);
  const [to, setTo] = useState<string | null>(null);
  const [type, setType] = useState("Delay");
  const [typed, setTyped] = useState<string | null>(null);
  const [by, setBy] = useState({ portal: true, sms: true, whatsapp: false });
  const [done, setDone] = useState("");
  const act = useAction(() => undefined);
  const routeId = to ?? x?.routes[0]?.id ?? "";
  const route = x?.routes.find((r) => r.id === routeId);
  const message = typed ?? draft(type, route);
  const families = route ? route.families : x?.families ?? 0;
  const channels = x ? (["portal", "sms", "whatsapp"] as const).filter((c) => by[c] && (c === "portal" || !x.channels[c])) : [];
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    let text = "";
    if (await act.run(async () => { const r = await schoolFetch<{ families: number; without_parent: number; queued: number }>("/transport/parent-updates", json("POST", { route_id: routeId || null, type, message, channels })); text = `Sent to ${r.families} famil${r.families === 1 ? "y" : "ies"}.${r.queued ? ` ${r.queued} text message(s) queued.` : ""}${r.without_parent ? ` ${r.without_parent} student(s) have no parent on record.` : ""}`; })) { setTyped(null); setDone(text); }
  };
  return (
    <div>
      <Head title="Send Update" subtitle="Send a transport update to parents in the Parent portal, by SMS and on WhatsApp." />
      <StepStrip active="parents" />
      <ErrorBanner message={error} />
      <Done text={done} />
      {done && <p className="mb-4 text-[12.5px]"><button type="button" className="font-semibold text-[#026f9b] underline" onClick={() => go("sent-updates")}>See sent updates</button></p>}
      <Loading on={loading && !x} />
      {x && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New update</h2></div>
          <div className="space-y-4 p-5">
            {act.error && <ErrorBanner message={act.error} />}
            <div className="flex flex-wrap gap-4">
              <L label="Send to"><select className={`${inputCls} w-auto min-w-[12.5rem]`} value={routeId} onChange={(e) => { setTo(e.target.value); setTyped(null); }}>{x.routes.map((r) => <option key={r.id} value={r.id}>{r.name} parents</option>)}<option value="">All transport parents</option></select></L>
              <L label="Type"><select className={`${inputCls} w-auto min-w-[12.5rem]`} value={type} onChange={(e) => { setType(e.target.value); setTyped(null); }}>{x.types.map((t) => <option key={t}>{t}</option>)}</select></L>
            </div>
            <L label="Message"><textarea className={`${inputCls} min-h-[5.5rem]`} required minLength={3} maxLength={500} value={message} onChange={(e) => setTyped(e.target.value)} /></L>
            <div>
              <span className="mb-1 block text-[12.5px] font-medium text-slate-900">Send by</span>
              <div className="flex flex-wrap gap-2">
                <Check label="Parent portal" checked={by.portal} onChange={(v) => setBy({ ...by, portal: v })} />
                {(["sms", "whatsapp"] as const).map((c) => <Check key={c} label={c === "sms" ? "SMS" : "WhatsApp"} checked={by[c] && !x.channels[c]} disabled={!!x.channels[c]} title={x.channels[c] || undefined} onChange={(v) => setBy({ ...by, [c]: v })} />)}
              </div>
              {(x.channels.sms || x.channels.whatsapp) && <p className="mt-1.5 text-[11.5px] text-slate-500">{[x.channels.sms && `SMS: ${x.channels.sms}.`, x.channels.whatsapp && `WhatsApp: ${x.channels.whatsapp}.`].filter(Boolean).join(" ")}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <span className="text-[13px] text-slate-900">{families} famil{families === 1 ? "y" : "ies"}</span>
            <button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !families || !channels.length || /\[[^\]]*\]/.test(message)}>{act.busy ? "Sending…" : "Send update"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ═════════════ sent updates ═════════════
interface Sent { driver: { id: string; time: string; stop: string; message: string }[]; items: { id: string; sent_at: string; to: string; type: string; message: string; by: string; families: number; status: string }[] }
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).replace(",", "");
function SentUpdates() {
  const { data: x, error, loading } = useLoad(() => schoolFetch<Sent>("/transport/sent-updates"), []);
  return (
    <div data-report>
      <Head title="Sent Updates" subtitle="Transport updates already sent to parents." />
      {x && <div className="mb-4"><Panel title="Sent from the driver app" sub="Stop-by-stop alerts, today">
        <SimpleTable head={[{ h: "Time" }, { h: "Stop" }, { h: "Message" }]} empty="No stop alerts yet today." rows={x.driver.map((a) => [a.time, <b key="s" className="font-semibold text-slate-900">{a.stop}</b>, a.message])} />
      </Panel></div>}
      <StepStrip active="parents" />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Sent updates" noun="updates" exportName="transport-sent-updates" empty="No updates have been sent yet." head={["Sent", "To", "Type", "Message", "By", "Families", "Status"]}
        rows={x.items.map((u) => ({ key: u.id, find: `${u.to} ${u.type} ${u.message} ${u.by} ${u.status}`, out: [when(u.sent_at), u.to, u.type, u.message, u.by, u.families, u.status], cells: [
          when(u.sent_at), u.to, u.type, <span key="m" className="block min-w-[16rem] max-w-[22rem] whitespace-normal">{u.message}</span>, u.by, u.families, <Chip key="s" tone={u.status === "Sent" ? "good" : "warn"}>{u.status}</Chip>,
        ] }))} />}
    </div>
  );
}

// ═════════════ what parents see ═════════════
interface Sharing { saved_here: boolean; share_numbers: boolean; share_location: boolean; alert_5min: boolean; alert_late: boolean }
interface View {
  sharing: Sharing; students: { id: string; label: string }[];
  page: null | { student_id: string; parent: string; route: string; vehicle: string; reg_no: string; stop: string; pickup: string; drop: string; today: string; late: number;
    driver: { name: string; mobile: string | null; police: string } | null; attendant: { name: string; mobile: string | null; first_aid: boolean | null } | null; run: Run | null };
}
const SHARE: [keyof Omit<Sharing, "saved_here">, string][] = [["share_numbers", "Driver and attendant mobile numbers"], ["share_location", "Live bus location"], ["alert_5min", "Alert 5 minutes before the bus reaches the stop"], ["alert_late", "Alert when the bus is 10+ minutes late"]];
const Card = ({ title, rows }: { title: string; rows: [string, ReactNode][] }) => (
  <Panel title={title}><dl className="space-y-1.5 px-4 py-3.5 text-[12.5px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}</dl></Panel>
);

function ParentsSee() {
  const { refreshBadges } = useTransport();
  const [pick, setPick] = useState("");
  const { data: x, error, loading, reload } = useLoad(() => schoolFetch<View>(`/transport/parent-view${pick ? `?student_id=${pick}` : ""}`), [pick]);
  const act = useAction(() => { reload(); refreshBadges(); });
  const s = x?.sharing; const p = x?.page ?? null;
  const share = (key: keyof Omit<Sharing, "saved_here">, v: boolean) => { if (!s) return; const { saved_here, ...now } = s; void saved_here; void act.run(() => schoolFetch("/transport/parent-sharing", json("PUT", { ...now, [key]: v }))); };
  return (
    <div>
      <Head title="What Parents See" subtitle="Choose what parents can see, and check the Transport page exactly as a parent sees it." />
      <StepStrip active="parents" />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !x} />
      {x && s && <div className="space-y-4">
        <Panel title="Shared with parents" sub="Applies to every transport family">
          <div className="flex flex-wrap gap-2 px-4 py-3.5">{SHARE.map(([k, label]) => <Check key={k} label={label} checked={s[k]} disabled={act.busy || !s.saved_here} title={s.saved_here ? undefined : "Needs a database update (migration 121)"} onChange={(v) => share(k, v)} />)}</div>
          {s.alert_5min && <p className="px-4 pb-3 text-[11.5px] text-slate-500">Without live GPS, the heads-up goes when the bus reaches the stop before, with the time it is due.</p>}
        </Panel>
        {!p ? <Panel title="Preview"><Empty text="Allocate a student to a route to preview the parent's page." /></Panel> : <>
          <Bar><PillSelect label="Preview for" value={p.student_id} onChange={setPick}>{x.students.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</PillSelect>{p.parent && <span className="ml-auto pr-1 text-[12px] text-slate-500">Parent: {p.parent}</span>}</Bar>
          <div className="space-y-3 rounded-2xl border border-dashed border-[#9fd3ea] bg-[#fbfdff] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#026f9b]">Parent portal · Transport</p>
            <Tiles>
              <Tile label="Route" value={p.route} sub={[p.vehicle, p.reg_no].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ") || "No vehicle yet"} />
              <Tile label="Pickup" value={p.pickup || "—"} sub={p.stop || "No stop yet"} />
              <Tile label="Drop" value={p.drop || "—"} sub={p.stop || "No stop yet"} />
              <Tile tone={p.today === "Delayed" ? "amber" : p.today === "Completed" ? "green" : "blue"} label="Today" value={p.today} sub={p.late ? `${p.late} min late` : undefined} />
            </Tiles>
            <div className="grid items-stretch gap-3 lg:grid-cols-[1.6fr_1fr]">
              <Card title="Driver" rows={p.driver ? [["Name", p.driver.name], ...(p.driver.mobile !== null ? [["Mobile", p.driver.mobile || "—"] as [string, ReactNode]] : []), ["Police verification", p.driver.police ? <Chip key="p" tone={p.driver.police === "Verified" ? "good" : "warn"}>{p.driver.police}</Chip> : "—"]] : [["Name", "Not assigned yet"]]} />
              <Card title="Attendant" rows={p.attendant ? [["Name", p.attendant.name], ...(p.attendant.mobile !== null ? [["Mobile", p.attendant.mobile || "—"] as [string, ReactNode]] : []), ["First aid trained", p.attendant.first_aid === null ? "—" : <Chip key="f" tone={p.attendant.first_aid ? "good" : "info"}>{p.attendant.first_aid ? "Yes" : "No"}</Chip>]] : [["Name", "Not assigned yet"]]} />
            </div>
            {p.run && <Panel title="Live location" sub={p.route}><Track run={p.run} /></Panel>}
          </div>
        </>}
      </div>}
    </div>
  );
}

export function ParentPage({ tab, go }: { tab: "send-update" | "sent-updates" | "what-parents-see"; go: (tab: string) => void }) {
  if (tab === "send-update") return <SendUpdate go={go} />;
  return tab === "sent-updates" ? <SentUpdates /> : <ParentsSee />;
}
