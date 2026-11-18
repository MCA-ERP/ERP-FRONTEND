"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type SchoolRow } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, Pagination, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { Labelled, small } from "../schools/pages/shared";
import { TicketPanel, type SupportTicket } from "./tickets";

export type TicketTab = "all" | "open" | "pending" | "resolved";
interface Res { items: SupportTicket[]; total: number; page: number; pageSize: number; counts: { all: number; open: number; pending: number; resolved: number } }
interface Stats { median_first_response_minutes: number | null; resolved_this_month: number; within_sla_percent: number | null; month: string }
const TITLE: Record<TicketTab, string> = { all: "All tickets", open: "Open tickets", pending: "Pending tickets", resolved: "Resolved tickets" };
const PRI: Record<string, "bad" | "warn" | "info" | "mute"> = { Urgent: "bad", High: "bad", Medium: "warn", Low: "mute" };
const STA: Record<string, "warn" | "info" | "good" | "mute"> = { Open: "warn", "In progress": "info", "Waiting on school": "warn", Resolved: "good", Closed: "mute" };
const raised = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const mins = (m: number | null) => (m === null ? "—" : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

/** Support tickets: all, open, pending or resolved. Reply opens the conversation. */
export function TicketPages({ tab }: { tab: TicketTab }) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Res>(`/support/tickets${qs({ group: tab === "all" ? undefined : tab, search: q, priority, page, pageSize: 50 })}`), [tab, q, priority, page]);
  const stats = useLoad(() => (tab === "all" ? adminFetch<Stats>("/support/stats") : Promise.resolve(null)), [tab]);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "support/tickets") setCreating(true); };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const items = data?.items ?? [];
  const c = data?.counts;
  const s = stats.data;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || stats.error} />
      {tab === "all" && (
        <Tiles items={[
          { label: "Open", value: c ? String(c.open) : "…", sub: "Not yet picked up" },
          { label: "Pending", value: c ? String(c.pending) : "…", sub: "Being worked on" },
          { label: "First response", value: s ? mins(s.median_first_response_minutes) : "…", sub: "Median, last 7 days" },
          { label: `Resolved in ${s?.month ?? "…"}`, value: s ? String(s.resolved_this_month) : "…", sub: s?.within_sla_percent != null ? `${s.within_sla_percent}% within SLA` : "No resolved tickets yet" },
        ]} />
      )}
      <Panel title={TITLE[tab]} sub={`${data?.total ?? 0} tickets`} right={<ExportPrint name={`${tab}-tickets`} head={["Ticket", "Subject", "School", "Category", "Priority", "Status", "Agent", "Raised"]} rows={items.map((t) => [t.code, t.subject, t.institutions?.name, t.category, t.priority, t.status, t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : "Unassigned", raised(t.created_at)])} />}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder={`Search ${tab === "all" ? "all" : tab} tickets`} aria-label="Search tickets" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}><option value="">All priorities</option>{["Urgent", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
        </div>
        <SimpleTable head={[{ h: "Ticket" }, { h: "Subject" }, { h: "Category" }, { h: "Priority" }, { h: "Status" }, { h: "Agent" }, { h: "Raised" }, { h: "" }]} empty={loading ? "Loading…" : "No tickets here."}
          rows={items.map((t) => [t.code, <div key="s"><p className="font-semibold text-slate-900">{t.subject}</p><p className="text-xs text-slate-400">{t.institutions?.name ?? "No school"}</p></div>, <Tag key="c">{t.category}</Tag>,
            <Chip key="p" tone={PRI[t.priority] ?? "mute"}>{t.priority}</Chip>, <Chip key="st" tone={STA[t.status] ?? "mute"}>{t.status}</Chip>, t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : "Unassigned", raised(t.created_at),
            <button key="r" type="button" className={small} onClick={() => setOpenId(t.id)}>Reply</button>])} />
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
      <Modal open={openId !== null} title="Ticket" onClose={() => { setOpenId(null); reload(); }}>{openId && <TicketPanel id={openId} />}</Modal>
      <NewTicket open={creating} onClose={() => setCreating(false)} onDone={(id) => { setCreating(false); reload(); setOpenId(id); }} />
    </div>
  );
}

function NewTicket({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const cats = useLoad(() => adminFetch<{ categories: { name: string; is_active: boolean }[] }>("/support/categories"), []);
  const blank = { school: "", category: "", priority: "Medium", subject: "", body: "" };
  const [f, setF] = useState(blank);
  const act = useAction(() => undefined);
  const list = (cats.data?.categories ?? []).filter((c) => c.is_active);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let id = "";
    const ok = await act.run(async () => { const r = await adminFetch<{ ticket?: { id: string }; id?: string }>("/support/tickets", json("POST", { institution_id: f.school || schools.data?.items[0]?.id, category: f.category || list[0]?.name, priority: f.priority, subject: f.subject, body: f.body })); id = r.ticket?.id ?? r.id ?? ""; });
    if (ok) { setF(blank); onDone(id); }
  };
  return (
    <Modal open={open} title="New ticket" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBanner message={act.error || schools.error || cats.error} />
        <div className="grid grid-cols-2 gap-3">
          <Labelled label="School"><select className={inputCls} value={f.school || schools.data?.items[0]?.id || ""} onChange={(e) => setF({ ...f, school: e.target.value })}>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
          <Labelled label="Category"><select className={inputCls} value={f.category || list[0]?.name || ""} onChange={(e) => setF({ ...f, category: e.target.value })}>{list.map((c) => <option key={c.name}>{c.name}</option>)}</select></Labelled>
        </div>
        <Labelled label="Priority"><select className={`${inputCls} max-w-[10rem]`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</select></Labelled>
        <Labelled label="Subject"><input className={inputCls} required minLength={3} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Labelled>
        <Labelled label="Description"><textarea className={`${inputCls} min-h-[6rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
        <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create ticket</button></div>
      </form>
    </Modal>
  );
}
