"use client";

import { useState } from "react";
import { adminFetch, json, qs, type TicketMessage, type TicketRow } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { TicketThread } from "@/components/admin/ticket-thread";
import { Badge, Card, EmptyRow, ErrorBanner, Modal, Pagination, Th, btnGhost, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";

export interface Sla { first_response_due: string; resolution_due: string; response_breached: boolean; resolution_breached: boolean; waiting_on_school: boolean }
export type SupportTicket = TicketRow & { subtopic?: string | null; escalation_level?: number; first_response_at?: string | null; sla: Sla | null };
interface Res { items: SupportTicket[]; total: number; page: number; pageSize: number; counts: { all: number; open: number; pending: number; resolved: number } }

export const priorityTone = { Urgent: "red", High: "red", Medium: "blue", Low: "gray" } as const;
const statusTone = { Open: "blue", "In progress": "blue", "Waiting on school": "gray", Resolved: "green", Closed: "gray" } as const;
const STATUSES: TicketRow["status"][] = ["Open", "In progress", "Waiting on school", "Resolved", "Closed"];
const PRIORITIES: TicketRow["priority"][] = ["Low", "Medium", "High", "Urgent"];

export function SlaBadge({ sla }: { sla: Sla | null }) {
  if (!sla) return null;
  if (sla.response_breached) return <Badge tone="red">Reply overdue</Badge>;
  if (sla.resolution_breached) return <Badge tone="red">Fix overdue</Badge>;
  if (sla.waiting_on_school) return <Badge tone="gray">Clock paused</Badge>;
  return null;
}

/** `category` narrows the list (used by the category views). */
export function Tickets({ category, onChanged }: { category?: string; onChanged?: () => void }) {
  const [group, setGroup] = useState<"all" | "open" | "pending" | "resolved">("open");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Res>(`/support/tickets${qs({ group: group === "all" ? undefined : group, search: q, priority, category, page })}`), [group, q, priority, category, page]);
  const c = data?.counts;
  const desc = { all: "Every ticket from schools.", open: "New tickets nobody has replied to yet.", pending: "Tickets being worked on or waiting on the school.", resolved: "Tickets that are fixed or closed." }[group];

  return (
    <>
      <ErrorBanner message={error} />
      <TabBar value={group} onChange={(g) => { setGroup(g); setPage(1); }} tabs={[["all", "All tickets", c?.all], ["open", "Open", c?.open], ["pending", "Pending", c?.pending], ["resolved", "Resolved", c?.resolved]]} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search subject or ticket number…" aria-label="Search tickets" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
          <span className="text-xs text-slate-500">{desc}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>Ticket</Th><Th>School</Th><Th>Priority</Th><Th>Status</Th><Th>Assigned</Th><Th>Raised</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={6} loading={loading} text="No tickets here." />}
              {data?.items.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(t.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setOpenId(t.id)}><span className="block font-semibold text-slate-900">{t.subject}</span><span className="text-xs text-slate-400">{t.code} · {t.category}{t.subtopic ? ` · ${t.subtopic}` : ""}</span></button></td>
                  <td className="px-4 py-3 text-slate-600">{t.institutions?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>{!!t.escalation_level && <span className="ml-1 text-xs text-rose-700" title="Escalated">▲{t.escalation_level}</span>}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[t.status]}>{t.status}</Badge><div className="mt-1"><SlaBadge sla={t.sla} /></div></td>
                  <td className="px-4 py-3 text-slate-600">{t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : "Unassigned"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>
      <Modal open={openId !== null} title="Ticket" onClose={() => { setOpenId(null); reload(); onChanged?.(); }}>{openId && <TicketPanel id={openId} />}</Modal>
    </>
  );
}

interface Detail { ticket: SupportTicket; messages: TicketMessage[]; escalations: { id: string; reason: string; from_priority: string; to_priority: string; note: string | null; escalator_name: string | null; created_at: string }[] }

function TicketPanel({ id }: { id: string }) {
  const detail = useLoad(() => adminFetch<Detail>(`/support/tickets/${id}`), [id]);
  const agents = useLoad(() => adminFetch<{ agents: { id: string; name: string }[] }>("/support/agents"), []);
  const act = useAction(detail.reload);

  if (!detail.data) return <p className="py-8 text-center text-sm text-slate-400">{detail.error || "Loading…"}</p>;
  const { ticket, messages, escalations } = detail.data;
  const patch = (body: Record<string, unknown>) => act.run(() => adminFetch(`/support/tickets/${id}`, json("PATCH", body)));
  const send = async (body: string, internal: boolean) => { await adminFetch(`/support/tickets/${id}/messages`, json("POST", { body, internal })); detail.reload(); };
  const escalate = () => {
    const why = window.prompt("Why is this ticket being escalated? Its priority goes up one level.");
    if (why?.trim()) void act.run(() => adminFetch(`/support/tickets/${id}/escalate`, json("POST", { note: why.trim() })));
  };
  const open = !["Resolved", "Closed"].includes(ticket.status);

  return (
    <div className="space-y-4">
      <ErrorBanner message={act.error} />
      <div>
        <p className="text-xs text-slate-400">{ticket.code} · {ticket.category}{ticket.subtopic ? ` · ${ticket.subtopic}` : ""} · {ticket.institutions?.name ?? "No school"}</p>
        <h3 className="text-lg text-slate-900">{ticket.subject}</h3>
        <p className="text-xs text-slate-500">Raised by {ticket.raised_by_name ?? "unknown"} on {fmtDate(ticket.created_at)}</p>
      </div>
      {ticket.sla && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Reply due: <b className={ticket.sla.response_breached ? "text-rose-700" : ""}>{ticket.first_response_at ? "done" : fmtDate(ticket.sla.first_response_due)}</b></span>
          <span>Fix due: <b className={ticket.sla.resolution_breached ? "text-rose-700" : ""}>{open ? fmtDate(ticket.sla.resolution_due) : "closed"}</b></span>
          {ticket.sla.waiting_on_school && <span>Clock paused while the school replies.</span>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Status<select className={`${inputCls} mt-1 normal-case`} value={ticket.status} onChange={(e) => patch({ status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Priority<select className={`${inputCls} mt-1 normal-case`} value={ticket.priority} onChange={(e) => patch({ priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned to<select className={`${inputCls} mt-1 normal-case`} value={ticket.assigned_to ?? ""} onChange={(e) => patch({ assigned_to: e.target.value || null })}><option value="">Unassigned</option>{agents.data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      </div>
      {open && <div><button type="button" className={`${btnGhost} text-rose-700`} disabled={act.busy} onClick={escalate}>Escalate</button></div>}
      {escalations.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs text-rose-900">
          {escalations.map((e) => <li key={e.id}>▲ {e.reason.replace("_", " ")}: {e.from_priority} → {e.to_priority}{e.note ? ` (${e.note})` : ""} · {e.escalator_name} · {fmtDate(e.created_at)}</li>)}
        </ul>
      )}
      <Panel title="Conversation"><div className="p-4"><TicketThread messages={messages} onSend={send} allowInternal /></div></Panel>
    </div>
  );
}
