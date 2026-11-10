"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { SlaBadge, Tickets, priorityTone, type SupportTicket } from "./tickets";

const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>;

interface Cat { id: string; name: string; description: string | null; subtopics: string[]; default_priority: string | null; default_agent_id: string | null; default_agent_name: string | null; is_active: boolean; tickets: number; open: number; avg_resolution_hours: number | null }
interface Agent { id: string; name: string; role: string }

// ═════════════ Categories ═════════════
export function Categories() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ categories: Cat[] }>("/support/categories"), []);
  const agents = useLoad(() => adminFetch<{ agents: Agent[] }>("/support/agents"), []);
  const act = useAction(reload);
  const [view, setView] = useState<string | null>(null);
  const [open, setOpen] = useState<Cat | "new" | null>(null);
  const blank = { name: "", description: "", subtopics: "", default_priority: "", default_agent_id: "" };
  const [f, setF] = useState(blank);

  const openForm = (c: Cat | "new") => { setF(c === "new" ? blank : { name: c.name, description: c.description ?? "", subtopics: c.subtopics.join(", "), default_priority: c.default_priority ?? "", default_agent_id: c.default_agent_id ?? "" }); setOpen(c); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, description: f.description || null, subtopics: f.subtopics.split(",").map((s) => s.trim()).filter(Boolean), default_priority: f.default_priority || null, default_agent_id: f.default_agent_id || null };
    if (await act.run(() => (open === "new" ? adminFetch("/support/categories", json("POST", body)) : adminFetch(`/support/categories/${(open as Cat).id}`, json("PATCH", body))))) setOpen(null);
  };

  if (view) return (
    <>
      <button type="button" className="mb-3 text-sm font-semibold text-mca-blue" onClick={() => setView(null)}>← All categories</button>
      <h2 className="mb-3 text-lg text-slate-900">{view} tickets</h2>
      <Tickets category={view} />
    </>
  );

  return (
    <Panel title="Ticket categories" sub="Schools pick one when they raise a ticket. A category can set the starting priority and who the ticket goes to." right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Add category</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Category</Th><Th>Starts as</Th><Th>Goes to</Th><Th>Tickets</Th><Th>Avg fix time</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.categories.length && <Empty cols={6} loading={loading} text="No categories." />}
          {data?.categories.map((c) => (
            <tr key={c.id} className={c.is_active ? "" : "opacity-60"}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{c.name}{!c.is_active && <span className="ml-2"><Badge tone="gray">Off</Badge></span>}</p><p className="max-w-sm text-xs text-slate-400">{c.description}</p>{c.subtopics.length > 0 && <p className="mt-1 text-xs text-slate-500">{c.subtopics.join(" · ")}</p>}</td>
              <td className="px-4 py-3">{c.default_priority ? <Badge tone={priorityTone[c.default_priority as keyof typeof priorityTone]}>{c.default_priority}</Badge> : <span className="text-slate-400">School chooses</span>}</td>
              <td className="px-4 py-3 text-slate-600">{c.default_agent_name ?? <span className="text-slate-400">Unassigned queue</span>}</td>
              <td className="px-4 py-3 tabular-nums">{c.tickets} <span className="text-xs text-slate-400">({c.open} open)</span></td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{c.avg_resolution_hours === null ? "—" : c.avg_resolution_hours + " h"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right"><div className="flex justify-end gap-2">
                <button type="button" className={small} onClick={() => setView(c.name)}>View tickets</button>
                <button type="button" className={small} onClick={() => openForm(c)}>Edit</button>
                <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/support/categories/${c.id}`, json("PATCH", { is_active: !c.is_active })))}>{c.is_active ? "Turn off" : "Turn on"}</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open !== null} title={open === "new" ? "Add category" : "Edit category"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="Name"><input className={inputCls} required minLength={2} maxLength={50} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Topics" hint="Separated by commas. Schools can pick one."><input className={inputCls} value={f.subtopics} onChange={(e) => setF({ ...f, subtopics: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting priority"><select className={inputCls} value={f.default_priority} onChange={(e) => setF({ ...f, default_priority: e.target.value })}><option value="">School chooses (Medium)</option>{["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Give new tickets to"><select className={inputCls} value={f.default_agent_id} onChange={(e) => setF({ ...f, default_agent_id: e.target.value })}><option value="">Nobody (unassigned queue)</option>{agents.data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </Panel>
  );
}

// ═════════════ Assignment ═════════════
interface Workload { agents: (Agent & { open: number; urgent: number })[]; unassigned: number }

export function Assignment() {
  const [part, setPart] = useState<"assign" | "reassign">("assign");
  const load = useLoad(() => adminFetch<Workload>("/support/workload"), []);
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["assign", "Assign agent", load.data?.unassigned], ["reassign", "Reassign ticket"]]} />
      <ErrorBanner message={load.error} />
      {part === "assign" ? <Assign load={load.data} done={load.reload} /> : <Reassign load={load.data} done={load.reload} />}
    </>
  );
}

function Workload({ load }: { load: Workload | null }) {
  return (
    <Panel title="Team workload" sub="Open tickets per person">
      <ul className="divide-y divide-slate-100">
        {load?.agents.map((a) => <li key={a.id} className="flex justify-between px-5 py-2.5 text-sm"><span className="font-semibold text-slate-800">{a.name} <span className="text-xs font-normal text-slate-400">{a.role}</span></span><span className="tabular-nums text-slate-600">{a.open} open{a.urgent ? <span className="ml-2 text-rose-700">{a.urgent} high or urgent</span> : null}</span></li>)}
        {load && <li className="flex justify-between px-5 py-2.5 text-sm"><span className="text-slate-500">Unassigned</span><span className="tabular-nums font-semibold text-slate-800">{load.unassigned}</span></li>}
      </ul>
    </Panel>
  );
}

function Assign({ load, done }: { load: Workload | null; done: () => void }) {
  const tickets = useLoad(() => adminFetch<Paged<SupportTicket>>(`/support/tickets${qs({ assigned: "none", pageSize: 50 })}`), []);
  const act = useAction(() => { tickets.reload(); done(); });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [agent, setAgent] = useState("");
  const open = (tickets.data?.items ?? []).filter((t) => !["Resolved", "Closed"].includes(t.status));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Panel title="Unassigned tickets" sub="Give them to someone on the team.">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <select className={`${inputCls} max-w-xs`} aria-label="Agent" value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">Choose a person</option>{load?.agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.open} open)</option>)}</select>
          <button type="button" className={btnPrimary} disabled={act.busy || !agent || !picked.size} onClick={() => act.run(async () => { await adminFetch("/support/assign", json("POST", { ticket_ids: [...picked], agent_id: agent })); setPicked(new Set()); })}>Assign {picked.size || ""}</button>
        </div>
        <div className="px-4"><ErrorBanner message={tickets.error || act.error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th><input type="checkbox" aria-label="Select all" className="size-4 accent-mca-blue" checked={!!open.length && open.every((t) => picked.has(t.id))} onChange={(e) => setPicked(e.target.checked ? new Set(open.map((t) => t.id)) : new Set())} /></Th><Th>Ticket</Th><Th>School</Th><Th>Priority</Th><Th>Raised</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!open.length && <Empty cols={5} loading={tickets.loading} text="Everything is assigned." />}
            {open.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select ${t.code}`} className="size-4 accent-mca-blue" checked={picked.has(t.id)} onChange={() => { const n = new Set(picked); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); setPicked(n); }} /></td>
                <td className="px-4 py-2.5"><p className="font-semibold text-slate-900">{t.subject}</p><p className="text-xs text-slate-400">{t.code} · {t.category}</p></td>
                <td className="px-4 py-2.5 text-slate-600">{t.institutions?.name}</td>
                <td className="px-4 py-2.5"><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge> <SlaBadge sla={t.sla} /></td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Workload load={load} />
    </div>
  );
}

function Reassign({ load, done }: { load: Workload | null; done: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const act = useAction(done);
  const mine = load?.agents.find((a) => a.id === from);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Panel title="Reassign tickets" sub="Move all of one person's open tickets to someone else, for example when they are away.">
        <div className="space-y-4 p-5">
          <ErrorBanner message={act.error} />
          {msg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <select className={`${inputCls} max-w-xs`} aria-label="From" value={from} onChange={(e) => { setFrom(e.target.value); setMsg(""); }}><option value="">Move tickets from…</option>{load?.agents.filter((a) => a.open > 0).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.open})</option>)}</select>
            <span className="text-slate-400">→</span>
            <select className={`${inputCls} max-w-xs`} aria-label="To" value={to} onChange={(e) => setTo(e.target.value)}><option value="">…to</option>{load?.agents.filter((a) => a.id !== from).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.open})</option>)}</select>
            <button type="button" className={btnPrimary} disabled={act.busy || !from || !to} onClick={() => window.confirm(`Move ${mine?.open ?? 0} open ticket(s)?`) && act.run(async () => { const r = await adminFetch<{ moved: number }>("/support/reassign", json("POST", { from_agent_id: from, to_agent_id: to })); setMsg(`Moved ${r.moved} ticket${r.moved === 1 ? "" : "s"}.`); })}>Reassign</button>
          </div>
          <p className="text-xs text-slate-400">To move a single ticket, open it and change &quot;Assigned to&quot;.</p>
        </div>
      </Panel>
      <Workload load={load} />
    </div>
  );
}
