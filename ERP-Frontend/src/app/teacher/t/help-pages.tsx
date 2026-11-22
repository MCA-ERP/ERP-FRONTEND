"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head, redBtn } from "./head";
import { Loading } from "./dash-pages";

interface Ticket { id: string; code: string; subject: string; category: string; priority: string; assigned_name: string | null; status: string; rating: number | null; details: string | null; attachment_name: string | null; created_at: string; reply_time: string; overdue: boolean; reply_hours: number }
interface Tickets { items: Ticket[]; counts: { open: number; in_progress: number; waiting: number; resolved: number } }
const tone = (s: string) => (s === "Resolved" ? "good" : s === "Waiting on you" ? "warn" : s === "In progress" ? "info" : "mute") as "good" | "warn" | "info" | "mute";
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

const Lbl = ({ label, children }: { label: string; children: ReactNode }) => <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}</label>;

function Details({ t, onClose, onRated }: { t: Ticket; onClose: () => void; onRated: () => void }) {
  const act = useAction(onRated);
  return (
    <Modal open title={`${t.code} · ${t.subject}`} onClose={onClose}>
      <ErrorBanner message={act.error} />
      <dl className="divide-y divide-slate-100 text-[13px]">
        {([["About", t.category], ["Raised", when(t.created_at)], ["With", t.assigned_name ?? "Not assigned yet"], ["Priority", t.priority], ["Reply time", `${t.reply_hours} hours`], ["Attachment", t.attachment_name ?? "None"]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-2"><dt className="text-slate-500">Status</dt><dd><Chip tone={tone(t.status)}>{t.status}</Chip></dd></div>
        <div className="py-2"><dt className="mb-1 text-slate-500">Details</dt><dd className="whitespace-pre-wrap text-slate-900">{t.details || "—"}</dd></div>
      </dl>
      {t.status === "Resolved" && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-[13px]"><span className="text-slate-500">Rate the help you got</span>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" disabled={act.busy} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => void act.run(() => schoolFetch(`/teacher/help/tickets/${t.id}/rate`, json("POST", { rating: n })))} className={`text-xl ${n <= (t.rating ?? 0) ? "text-[#e8a317]" : "text-slate-300 hover:text-[#e8a317]"}`}>★</button>)}
        </div>
      )}
    </Modal>
  );
}

function TicketTable({ items, withMeta, onOpen }: { items: Ticket[]; withMeta: boolean; onOpen: (t: Ticket) => void }) {
  const open = (t: Ticket) => <button key="o" type="button" onClick={() => onOpen(t)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400">Open</button>;
  return withMeta ? (
    <SimpleTable head={[{ h: "Number" }, { h: "Subject" }, { h: "Raised" }, { h: "With" }, { h: "Status" }, { h: "Reply time" }, { h: "" }]} empty="You have not raised a request yet." rows={items.map((t) => [t.code, <div key="s"><p className="font-semibold text-slate-900">{t.subject}</p><p className="text-[11px] text-slate-500">{t.category}</p></div>, when(t.created_at), t.assigned_name ?? "—", <Chip key="st" tone={tone(t.status)}>{t.status}</Chip>, t.status === "Waiting on you" || t.status === "Resolved" ? <span key="r" className="text-slate-500">{t.reply_time}</span> : <Chip key="r" tone={t.overdue ? "bad" : "mute"}>{t.reply_time}</Chip>, open(t)])} />
  ) : (
    <SimpleTable head={[{ h: "Number" }, { h: "Subject" }, { h: "Status" }, { h: "" }]} empty="You have not raised a request yet." rows={items.map((t) => [t.code, t.subject, <Chip key="st" tone={tone(t.status)}>{t.status}</Chip>, open(t)])} />
  );
}

export function RaiseRequest() {
  const cats = useLoad(() => schoolFetch<{ items: { name: string; handled_by: string; reply_hours: number }[] }>("/teacher/help/categories"), []);
  const mine = useLoad(() => schoolFetch<Tickets>("/teacher/help/tickets"), []);
  const blank = { category: "", subject: "", details: "", priority: "Normal", attachment_name: "" };
  const [f, setF] = useState(blank);
  const [fileKey, setFileKey] = useState(0);
  const [done, setDone] = useState("");
  const [view, setView] = useState<Ticket | null>(null);
  const act = useAction(mine.reload);
  const list = cats.data?.items ?? [];
  const cat = list.find((c) => c.name === (f.category || list[0]?.name));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    const ok = await act.run(async () => { const r = await schoolFetch<{ code: string }>("/teacher/help/tickets", json("POST", { ...f, category: cat?.name ?? f.category, attachment_name: f.attachment_name || undefined })); setDone(`Request ${r.code} sent.`); });
    if (ok) { setF(blank); setFileKey((k) => k + 1); }
  };
  return (
    <div data-report>
      <Head title="Raise a Request" subtitle="Ask for help with fees, transport, devices, repairs, payroll or anything else. Each request gets a number, a team and a reply time." />
      <ErrorBanner message={cats.error || mine.error} />
      <Loading on={cats.loading && !cats.data} />
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">New request</h2><span className="text-xs text-slate-500">Goes straight to the right team</span></div>
        <div className="space-y-4 p-5">
          {act.error && <ErrorBanner message={act.error} />}
          <Lbl label="What is it about?"><select className={`${inputCls} w-auto min-w-[14rem]`} value={cat?.name ?? ""} onChange={(e) => setF({ ...f, category: e.target.value })}>{list.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select></Lbl>
          <Lbl label="Subject"><input className={inputCls} required minLength={3} maxLength={250} placeholder="One line, for example: Bus late at my stop" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Lbl>
          <Lbl label="Details"><textarea className={`${inputCls} min-h-[5.5rem]`} required minLength={3} maxLength={4000} placeholder="What happened, when, and what you need" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Lbl>
          <div className="grid gap-4 sm:grid-cols-2">
            <Lbl label="Priority"><select className={`${inputCls} w-auto min-w-[10rem]`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option>Normal</option><option>High</option><option>Low</option></select></Lbl>
            <Lbl label="Attach a photo or file (optional)"><input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]" onChange={(e) => setF({ ...f, attachment_name: e.target.files?.[0]?.name ?? "" })} /></Lbl>
          </div>
          {cat && <p className="text-[12px] text-slate-600"><b>{cat.handled_by}</b> will reply within <b>{cat.reply_hours} hours</b>. If not, it goes to the School Admin automatically.</p>}
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
          {done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}
          <button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFileKey((k) => k + 1); setDone(""); }}>Clear</button>
          <button type="submit" className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !list.length}>{act.busy ? "Sending…" : "Send request"}</button>
        </div>
      </form>
      <div className="mt-5">
        <Panel title="Your latest requests" sub={`${mine.data?.items.length ?? 0} request${mine.data?.items.length === 1 ? "" : "s"}`} right={<ExportPrint name="my-help-desk-requests" head={["Number", "Subject", "Status"]} rows={(mine.data?.items ?? []).map((t) => [t.code, t.subject, t.status])} />}>
          <TicketTable items={(mine.data?.items ?? []).slice(0, 5)} withMeta={false} onOpen={setView} />
        </Panel>
      </div>
      {view && <Details t={view} onClose={() => setView(null)} onRated={() => { mine.reload(); setView(null); }} />}
    </div>
  );
}

export function MyRequests({ go }: { go: (tab: string) => void }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Tickets>("/teacher/help/tickets"), []);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Ticket | null>(null);
  const items = useMemo(() => (data?.items ?? []).filter((t) => !q || `${t.code} ${t.subject} ${t.category} ${t.assigned_name ?? ""} ${t.status}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const c = data?.counts;
  return (
    <div data-report>
      <Head title="My Requests" subtitle="Every request you raised, who is handling it and when they will reply." action={<button type="button" className={redBtn} onClick={() => go("raise-a-request")}>New request</button>} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Open", value: c?.open ?? 0 }, { label: "In progress", value: c?.in_progress ?? 0 }, { label: "Waiting on you", value: c?.waiting ?? 0, sub: c?.waiting ? "Please reply" : undefined }, { label: "Resolved", value: c?.resolved ?? 0, sub: "Rate the help you got" }]} />
          <Panel title="My requests" sub={`${data.items.length} request${data.items.length === 1 ? "" : "s"}`} right={<ExportPrint name="my-requests" head={["Number", "Subject", "Raised", "With", "Status", "Reply time"]} rows={items.map((t) => [t.code, t.subject, when(t.created_at), t.assigned_name, t.status, t.reply_time])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my requests" aria-label="Search my requests" className="w-full bg-transparent outline-none" /></label></div>
            <TicketTable items={items} withMeta onOpen={setView} />
          </Panel>
        </div>
      )}
      {view && <Details t={view} onClose={() => setView(null)} onRated={() => { reload(); setView(null); }} />}
    </div>
  );
}
