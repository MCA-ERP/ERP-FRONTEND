"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "../../teacher/t/head";
import { Empty, Loading, day } from "../../teacher/t/dash-pages";
import { Table, Tile, Tiles, name, pill, solid } from "../../hr/h/ui";
import { useTransport } from "../context";
import { goTo } from "./menu-config";
import { StepStrip } from "./strip";

interface Attention { key: string; kind: "document" | "crew" | "route"; tone: "bad" | "warn"; bold: string; text: string; sub: string; state: "Expired" | "Expiring" | "Pending" | "" }
interface Dash {
  type: string; on_road: number; vehicles: number; in_maintenance: number; students: number; routes: number; trips_done: number; trips_total: number; delayed_now: number;
  live: { route: string; vehicle: string; state: string; note: string }[]; seats: { route: string; used: number; seats: number }[]; attention: Attention[];
}
const short = (route: string) => { const n = route.match(/\d+/)?.[0]; return n ? `R${n}` : route.slice(0, 2).toUpperCase(); };
const stateTone = (s: string) => (s === "Completed" ? "good" : s === "In progress" || s === "Delayed" ? "warn" : "mute") as "good" | "warn" | "mute";
const square = (s: string) => (s === "Completed" ? "bg-[#d9efe8] text-[#065740]" : s === "Delayed" ? "bg-[#fce0df] text-[#ac2c28]" : "bg-[#dceff9] text-[#026f9b]");

// ═════════════ overview ═════════════
export function Overview() {
  const router = useRouter();
  const { data: x, error, loading } = useLoad(() => schoolFetch<Dash>("/transport/dashboard"), []);
  return (
    <div data-report>
      <Head title="Overview" subtitle="Vehicles, trips and everything that needs your attention today." />
      <StepStrip />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (
        <div className="space-y-4">
          <Tiles>
            <Tile label="Vehicles on the road" value={`${x.on_road} / ${x.vehicles}`} sub={`${x.in_maintenance} in maintenance`} />
            <Tile label="Students on transport" value={x.students} sub={`${x.routes} route${x.routes === 1 ? "" : "s"}`} />
            <Tile tone="green" label="Trips today" value={`${x.trips_done} / ${x.trips_total} done`} sub={`${x.delayed_now} delayed now`} />
            <Tile tone="amber" label="Needs attention" value={x.attention.length} sub="Documents, crew, routes" />
          </Tiles>
          <div className="grid items-stretch gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Panel title={`${x.type === "Morning" ? "Morning pickup" : "Afternoon drop"} · live`} right={<button type="button" className={pill} onClick={() => router.push(goTo("tracking"))}>Track trips</button>}>
              {x.live.length ? (
                <ul className="divide-y divide-slate-100">{x.live.map((r) => (
                  <li key={r.route} className="flex items-start gap-3 px-4 py-3">
                    <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${square(r.state)}`}>{short(r.route)}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] text-slate-900"><b>{r.route}</b> · {r.vehicle}</span><span className="block text-[11.5px] text-slate-500">{r.note}</span></span>
                    <Chip tone={stateTone(r.state)}>{r.state}</Chip>
                  </li>
                ))}</ul>
              ) : <Empty text="No active routes yet. Add them under Routes & Stops." />}
            </Panel>
            <Panel title="Seats used" sub="Children / seats on the assigned vehicle">
              {x.seats.length ? (
                <ul className="space-y-2.5 px-4 py-4">{x.seats.map((s) => (
                  <li key={s.route} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-[12.5px]">
                    <span className="truncate text-slate-900">{s.route}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-[#e8f4fb]"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${s.seats ? Math.min(100, (s.used / s.seats) * 100) : 0}%` }} /></span>
                    <span className={`text-right tabular-nums ${s.seats && s.used > s.seats ? "font-semibold text-[#ac2c28]" : "text-slate-900"}`}>{s.used} / {s.seats || "—"}</span>
                  </li>
                ))}</ul>
              ) : <Empty text="No active routes yet." />}
            </Panel>
          </div>
          <Panel title="Needs attention" right={<Link href={goTo("vehicles", "documents")} className={pill}>Documents</Link>}>
            {x.attention.length ? (
              <ul className="divide-y divide-slate-100">{x.attention.map((a) => (
                <li key={a.key}>
                  <Link href={a.kind === "document" ? goTo("vehicles", "documents") : a.kind === "crew" ? goTo("crew", a.sub === "Attendant" ? "attendants" : "drivers") : goTo("assignment")} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                    <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${a.tone === "bad" ? "bg-[#fce0df] text-[#ac2c28]" : "bg-[#f8ecd6] text-[#8a5a0b]"}`}>{a.kind === "route" ? "R" : "!"}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] text-slate-900"><b>{a.bold}</b> · {a.text}</span><span className="block text-[11.5px] text-slate-500">{a.sub}</span></span>
                    {a.state && <Chip tone={a.state === "Expired" ? "bad" : "warn"}>{a.state}</Chip>}
                  </Link>
                </li>
              ))}</ul>
            ) : <Empty text="Nothing needs attention." />}
          </Panel>
        </div>
      )}
    </div>
  );
}

// ═════════════ notifications ═════════════
interface Note { key: string; tone: "bad" | "warn" | "info"; mark: string; title: string; note: string; when: string; href: string; read: boolean }
export function Notifications() {
  const { refreshBadges } = useTransport();
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Note[]; unread: number }>("/transport/notifications"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  const read = (keys?: string[]) => act.run(() => schoolFetch("/transport/notifications/read", json("POST", keys ? { keys } : {})));
  const tone = { warn: "bg-[#f8ecd6] text-[#8a5a0b]", info: "bg-[#dceff9] text-[#026f9b]", bad: "bg-[#fce0df] text-[#ac2c28]" };
  return (
    <div>
      <Head title="Notifications" subtitle="Everything the portal has told you recently. Open one to go straight to it." action={<button type="button" className={whiteBtn} disabled={act.busy || !data?.unread} onClick={() => void read()}>Mark all as read</button>} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="All notifications">
          {data.items.length ? (
            <ul className="divide-y divide-slate-100">{data.items.map((n) => (
              <li key={n.key}>
                <button type="button" onClick={() => { if (!n.read) void read([n.key]); router.push(n.href); }} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-[#f8fbfd]"}`}>
                  <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${tone[n.tone]}`}>{n.mark}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-900">{n.title}</span><span className="block text-[11.5px] text-slate-500">{n.note}</span><span className="block text-[11.5px] text-slate-500">{n.when}</span></span>
                  {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
                </button>
              </li>
            ))}</ul>
          ) : <Empty text="Nothing new. You are up to date." />}
        </Panel>
      )}
    </div>
  );
}

// ═════════════ settings (read only) ═════════════
interface Setting { key: string; setting: string; value: string; where: string }
export function Settings() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Setting[] }>("/transport/settings"), []);
  const [ask, setAsk] = useState<Setting | null>(null);
  const [change, setChange] = useState("");
  const [done, setDone] = useState("");
  const act = useAction(() => undefined);
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (!ask) return;
    let code = "";
    if (await act.run(async () => { code = (await schoolFetch<{ code: string }>("/transport/settings/request", json("POST", { setting: ask.key, change }))).code; })) { setAsk(null); setChange(""); setDone(`Request ${code} sent to the School Admin. Follow it under Help Desk › My Requests.`); }
  };
  return (
    <div data-report>
      <Head title="Settings" subtitle="How this portal is set up. These settings are managed by the School Admin." />
      <p className="mb-4 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">To change a setting, ask the School Admin. Each one is in their Settings menu, shown below.</p>
      {done && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">{done}</p>}
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && <Table title="Settings" noun="settings" exportName="transport-settings" empty="No settings." head={[{ h: "Setting" }, { h: "Current value" }, { h: "Changed in (School Admin)" }, { h: "" }]}
        rows={data.items.map((s) => ({ key: s.key, find: `${s.setting} ${s.value} ${s.where}`, out: [s.setting, s.value, s.where], cells: [<b key="s" className="font-semibold text-slate-900">{s.setting}</b>, s.value, s.where, <button key="b" type="button" className={pill} onClick={() => { setDone(""); setChange(""); setAsk(s); }}>Request a change</button>] }))} />}
      <Modal open={!!ask} title={ask ? `Request a change · ${ask.setting}` : ""} onClose={() => setAsk(null)}>
        {ask && <form onSubmit={send} className="space-y-3">
          <ErrorBanner message={act.error} />
          <p className="text-[13px] text-slate-600">Now: <b className="text-slate-900">{ask.value}</b></p>
          <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">What should change, and why?</span><textarea className={`${inputCls} min-h-[5.5rem]`} required minLength={3} maxLength={1000} value={change} onChange={(e) => setChange(e.target.value)} /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={pill} onClick={() => setAsk(null)}>Cancel</button><button type="submit" className={solid} disabled={act.busy}>Send request</button></div>
        </form>}
      </Modal>
    </div>
  );
}

// ═════════════ sent messages ═════════════
interface Sent { id: string; sent_at: string; to: string; channel: string; message: string; sent: number; delivered: number; status: string }
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
export function SentMessages({ title = "Sent Messages", subtitle = "Messages this portal has sent to parents, students and staff: SMS, email, WhatsApp and app." }: { title?: string; subtitle?: string }) {
  const { data: x, error, loading } = useLoad(() => schoolFetch<{ items: Sent[]; messages: number; recipients: number; delivered_pct: number; not_delivered: number }>("/transport/sent-messages"), []);
  return (
    <div data-report>
      <Head title={title} subtitle={subtitle} />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && (
        <div className="space-y-4">
          <Tiles>
            <Tile label="Messages" value={x.messages} sub="Last 10 days" />
            <Tile label="Recipients" value={x.recipients.toLocaleString("en-IN")} sub="Across all messages" />
            <Tile tone="green" label="Delivered" value={`${x.delivered_pct}%`} sub={`${x.not_delivered} not delivered`} />
          </Tiles>
          <Table title="Sent messages" noun="messages" exportName="transport-sent-messages" empty="No messages have gone out in the last 10 days." head={[{ h: "Sent" }, { h: "To" }, { h: "Channel" }, { h: "Message" }, { h: "Delivered" }, { h: "Status" }]}
            rows={x.items.map((m) => ({ key: m.id, find: `${m.to} ${m.channel} ${m.message} ${m.status}`, out: [when(m.sent_at), m.to, m.channel, m.message, `${m.delivered} of ${m.sent}`, m.status], cells: [when(m.sent_at), <b key="t" className="font-semibold text-slate-900">{m.to}</b>, m.channel, m.message, `${m.delivered} of ${m.sent}`, <Chip key="s" tone={m.status === "Delivered" ? "good" : m.status === "Not delivered" ? "bad" : "warn"}>{m.status}</Chip>] }))} />
        </div>
      )}
    </div>
  );
}

// ═════════════ staff exit clearance ═════════════
interface Leaver { id: string; name: string; designation: string; last_day: string; check: string; state: string }
export function ExitClearance() {
  const { refreshBadges } = useTransport();
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Leaver[] }>("/transport/exit-clearance"), []);
  const act = useAction(() => { reload(); refreshBadges(); });
  return (
    <div data-report>
      <Head title="Staff Exit Clearance" subtitle="Staff leaving the school. Confirm they owe transport nothing (vehicle and documents handed over). HR can't pay the final settlement until every department clears them." />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && <Table title="Staff exit clearance · Transport" noun="leavers" exportName="staff-exit-clearance-transport" empty="Nobody leaving needs transport clearance at the moment." head={[{ h: "Leaver" }, { h: "Last day" }, { h: "Check" }, { h: "Status" }, { h: "" }]}
        rows={data.items.map((m) => ({ key: m.id, find: `${m.name} ${m.designation} ${m.check} ${m.state}`, out: [m.name, day(m.last_day), m.check, m.state], cells: [name(m.name, m.designation), day(m.last_day), m.check, <Chip key="s" tone={m.state === "Cleared" ? "good" : "warn"}>{m.state}</Chip>, m.state === "Pending" ? <button key="b" type="button" className={solid} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/transport/exit-clearance/${m.id}`, json("POST", {})))}>Mark cleared</button> : null] }))} />}
    </div>
  );
}
