"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, SimpleTable, fmtDay, num, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { FormCard, Labelled, ToggleRow, small, smallPrimary } from "../schools/pages/shared";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { TicketPanel, type SupportTicket } from "./tickets";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const raised = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const PRI: Record<string, "bad" | "warn" | "info" | "mute"> = { Urgent: "bad", High: "bad", Medium: "warn", Low: "mute" };
const STA: Record<string, "warn" | "info" | "good" | "mute"> = { Open: "warn", "In progress": "info", "Waiting on school": "warn", Resolved: "good", Closed: "mute" };
const agentName = (t: SupportTicket) => (t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : "Unassigned");
interface Agent { id: string; name: string }
const useAgents = () => useLoad(() => adminFetch<{ agents: Agent[] }>("/support/agents"), []);

function TicketTable({ items, loading, extra, search, setSearch, priority, setPriority, placeholder, onReply }: {
  items: SupportTicket[]; loading: boolean; extra?: (t: SupportTicket) => React.ReactNode; search: string; setSearch: (v: string) => void; priority: string; setPriority: (v: string) => void; placeholder: string; onReply?: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
        <input className={`${inputCls} max-w-xs`} placeholder={placeholder} aria-label={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${inputCls} max-w-[10rem]`} aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option>{["Urgent", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
      </div>
      <SimpleTable head={[{ h: "Ticket" }, { h: "Subject" }, { h: "Category" }, { h: "Priority" }, { h: "Status" }, { h: "Agent" }, { h: "Raised" }, { h: "" }]} empty={loading ? "Loading…" : "No tickets here."}
        rows={items.map((t) => [t.code, <div key="s"><p className="font-semibold text-slate-900">{t.subject}</p><p className="text-xs text-slate-400">{t.institutions?.name ?? "No school"}</p></div>, <Tag key="c">{t.category}</Tag>, <Chip key="p" tone={PRI[t.priority] ?? "mute"}>{t.priority}</Chip>,
          <Chip key="st" tone={STA[t.status] ?? "mute"}>{t.status}</Chip>, extra ? extra(t) : agentName(t), raised(t.created_at), onReply ? <button key="r" type="button" className={small} onClick={() => onReply(t.id)}>Reply</button> : ""])} />
    </>
  );
}

// ═════════════ Ticket categories ═════════════
export type CatTab = "technical" | "billing" | "account" | "general";
interface Cat { id: string; name: string; default_priority: string | null; default_agent_id: string | null; is_active: boolean }

export function CategoryPages({ tab }: { tab: CatTab }) {
  const name = tab.charAt(0).toUpperCase() + tab.slice(1);
  const cats = useLoad(() => adminFetch<{ categories: Cat[] }>("/support/categories"), []);
  const tickets = useLoad(() => adminFetch<Paged<SupportTicket>>(`/support/tickets${qs({ category: name, pageSize: 100 })}`), [name]);
  const agents = useAgents();
  const cat = cats.data?.categories.find((c) => c.name.toLowerCase() === tab);
  const [d, setD] = useState({ agent: "", priority: "Medium", show: true });
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const act = useAction(cats.reload);
  const reset = () => cat && setD({ agent: cat.default_agent_id ?? "", priority: cat.default_priority ?? "Medium", show: cat.is_active });
  useEffect(() => { reset(); setSaved(false); }, [cat?.id, cats.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = tickets.data?.items ?? [];
  const items = all.filter((t) => (!priority || t.priority === priority) && has(`${t.subject} ${t.code}`, search));
  const n = (f: (t: SupportTicket) => boolean) => all.filter(f).length;
  return (
    <div className="space-y-5">
      <ErrorBanner message={cats.error || tickets.error || agents.error} />
      <Tiles items={[{ label: "Open", value: tickets.data ? n((t) => t.status === "Open") : "…" }, { label: "In progress", value: tickets.data ? n((t) => t.status === "In progress" || t.status === "Waiting on school") : "…" }, { label: "Resolved", value: tickets.data ? n((t) => t.status === "Resolved" || t.status === "Closed") : "…" }]} />
      <Panel title={`${name} tickets`} sub={`${items.length} tickets`} right={<ExportPrint name={`${tab}-tickets`} head={["Ticket", "Subject", "School", "Priority", "Status", "Agent", "Raised"]} rows={items.map((t) => [t.code, t.subject, t.institutions?.name, t.priority, t.status, agentName(t), raised(t.created_at)])} />}>
        <TicketTable items={items} loading={tickets.loading} search={search} setSearch={setSearch} priority={priority} setPriority={setPriority} placeholder={`Search ${tab} tickets`} onReply={setOpenId} />
      </Panel>
      {cat ? (
        <FormCard title={`${name} category`} saveLabel="Save category" busy={act.busy} saved={saved} error={act.error} onDiscard={reset}
          onSubmit={async (e) => { e.preventDefault(); if (await act.run(() => adminFetch(`/support/categories/${cat.id}`, json("PATCH", { default_agent_id: d.agent || null, default_priority: d.priority, is_active: d.show })))) setSaved(true); }}>
          <div className="-mx-5 -mt-4">
            <div className="flex items-center gap-4 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Default agent</p><p className="text-xs text-slate-500">New tickets go to this person</p></div>
              <select aria-label="Default agent" className={`${inputCls} max-w-[12rem]`} value={d.agent} onChange={(e) => { setD({ ...d, agent: e.target.value }); setSaved(false); }}><option value="">Nobody</option>{agents.data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-3.5"><p className="min-w-0 flex-1 text-[13.5px] font-medium text-slate-900">Default priority</p>
              <select aria-label="Default priority" className={`${inputCls} max-w-[10rem]`} value={d.priority} onChange={(e) => { setD({ ...d, priority: e.target.value }); setSaved(false); }}>{["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="px-5"><ToggleRow label="Show in the school's help form" checked={d.show} onChange={(v) => { setD({ ...d, show: v }); setSaved(false); }} /></div>
          </div>
        </FormCard>
      ) : <p className="text-sm text-slate-500">{cats.loading ? "Loading…" : `There is no “${name}” category yet.`}</p>}
      <Modal open={openId !== null} title="Ticket" onClose={() => { setOpenId(null); tickets.reload(); }}>{openId && <TicketPanel id={openId} />}</Modal>
    </div>
  );
}

// ═════════════ Assignment ═════════════
export type AssignTab = "assign" | "reassign";

export function AssignmentPages({ tab }: { tab: AssignTab }) {
  const tickets = useLoad(() => adminFetch<Paged<SupportTicket>>(`/support/tickets${qs({ pageSize: 200 })}`), []);
  const agents = useAgents();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});
  const act = useAction(tickets.reload);
  const live = (tickets.data?.items ?? []).filter((t) => !["Resolved", "Closed"].includes(t.status));
  const pool = live.filter((t) => (tab === "assign" ? !t.assigned_to : !!t.assigned_to));
  const items = pool.filter((t) => (!priority || t.priority === priority) && has(`${t.subject} ${t.code}`, search));
  const go = (t: SupportTicket) => { const to = pick[t.id] ?? t.assigned_to; if (to) void act.run(() => adminFetch("/support/assign", json("POST", { ticket_ids: [t.id], agent_id: to }))); };
  const sel = (t: SupportTicket) => (
    <span key="a" className="flex items-center gap-2">
      <select aria-label={`Agent for ${t.code}`} className={`${inputCls} max-w-[10rem]`} value={pick[t.id] ?? t.assigned_to ?? ""} onChange={(e) => setPick({ ...pick, [t.id]: e.target.value })}>{tab === "assign" && <option value="">Choose agent</option>}{agents.data?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <button type="button" className={tab === "assign" ? smallPrimary : small} disabled={act.busy || !(pick[t.id] ?? t.assigned_to)} onClick={() => go(t)}>{tab === "assign" ? "Assign" : "Reassign"}</button>
    </span>
  );
  return (
    <div className="space-y-5">
      <ErrorBanner message={tickets.error || agents.error || act.error} />
      {tab === "assign" && (
        <Tiles items={(agents.data?.agents ?? []).slice(0, 4).map((a) => ({ label: a.name, value: live.filter((t) => t.assigned_to === a.id).length, sub: "Open tickets" }))} />
      )}
      <Panel title={tab === "assign" ? "Unassigned tickets" : "Assigned tickets"} sub={`${items.length} tickets`} right={<ExportPrint name={`${tab}-tickets`} head={["Ticket", "Subject", "Category", "Priority", "Status", "Agent", "Raised"]} rows={items.map((t) => [t.code, t.subject, t.category, t.priority, t.status, agentName(t), raised(t.created_at)])} />}>
        <TicketTable items={items} loading={tickets.loading} extra={sel} search={search} setSearch={setSearch} priority={priority} setPriority={setPriority} placeholder={tab === "assign" ? "Search unassigned tickets" : "Search assigned tickets"} />
      </Panel>
    </div>
  );
}

// ═════════════ Knowledge base ═════════════
export type KbTab = "articles" | "faqs" | "tutorials";
interface Kb { id: string; type: "article" | "faq" | "tutorial"; title: string; category: string | null; body: string; video_url: string | null; status: "draft" | "published"; views: number; updated_at?: string; created_at?: string; published_at?: string | null }
const KT = { articles: { type: "article", title: "Articles", one: "article" }, faqs: { type: "faq", title: "FAQs", one: "FAQ" }, tutorials: { type: "tutorial", title: "Tutorials", one: "tutorial" } } as const;

export function KnowledgePages({ tab }: { tab: KbTab }) {
  const t = KT[tab];
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ items: Kb[] }>(`/support/kb${qs({ type: t.type })}`), [t.type]);
  const cats = useLoad(() => adminFetch<{ categories: { name: string }[] }>("/support/categories"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Kb | "new" | null>(null);
  const [view, setView] = useState<Kb | null>(null);
  const blank = { title: "", category: "", body: "", video_url: "", status: "draft" as "draft" | "published" };
  const [f, setF] = useState(blank);
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "support/kb") { setF(blank); setOpen("new"); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = (data?.items ?? []).filter((k) => has(`${k.title} ${k.category ?? ""} ${k.body}`, search));
  const edit = (k: Kb) => { setF({ title: k.title, category: k.category ?? "", body: k.body, video_url: k.video_url ?? "", status: k.status }); setOpen(k); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { type: t.type, title: f.title, category: f.category || null, body: f.body, video_url: t.type === "tutorial" ? f.video_url || null : null, status: f.status };
    if (await act.run(() => (open === "new" ? adminFetch("/support/kb", json("POST", body)) : adminFetch(`/support/kb/${(open as Kb).id}`, json("PATCH", body))))) setOpen(null);
  };
  const upd = (k: Kb) => fmtDay((k.published_at ?? k.updated_at ?? k.created_at ?? "").slice(0, 10));
  const head = tab === "articles" ? [{ h: "Article" }, { h: "Category" }, { h: "Status" }, { h: "Views", right: true }, { h: "Updated" }, { h: "" }] : tab === "faqs" ? [{ h: "Question" }, { h: "Topic" }, { h: "Answer" }, { h: "" }] : [{ h: "Tutorial" }, { h: "Format" }, { h: "Link" }, { h: "Views", right: true }, { h: "" }];
  const rows = items.map((k) => {
    const title = <b key="t" className="font-semibold text-slate-900">{k.title}</b>;
    const cat = k.category ? <Tag key="c">{k.category}</Tag> : "—";
    const det = <button key="v" type="button" className={small} onClick={() => setView(k)}>View details</button>;
    if (tab === "articles") return [title, cat, <Chip key="s" tone={k.status === "published" ? "good" : "mute"}>{k.status === "published" ? "Published" : "Draft"}</Chip>, k.status === "published" ? num(k.views) : "—", upd(k), <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(k)}>Edit</button>{det}</span>];
    if (tab === "faqs") return [title, cat, <span key="b" className="line-clamp-1">{k.body}</span>, <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(k)}>Edit</button>{det}</span>];
    return [title, <Tag key="f">{k.video_url ? "Video" : "Guide"}</Tag>, k.video_url ? <a key="l" href={k.video_url} target="_blank" rel="noreferrer" className="text-[#026f9b] underline">Open</a> : "—", num(k.views), <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => edit(k)}>Edit</button>{det}</span>];
  });
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title={t.title} sub={`${items.length} ${tab === "faqs" ? "questions" : tab}`} right={<ExportPrint name={`kb-${tab}`} head={["Title", "Category", "Status", "Views"]} rows={items.map((k) => [k.title, k.category, k.status, k.views])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={`Search ${tab}`} aria-label={`Search ${tab}`} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={head} rows={rows} empty={loading ? "Loading…" : `No ${tab} yet.`} />
      </Panel>
      <Modal open={open !== null} title={open === "new" ? `New ${t.one}` : `Edit ${t.one}`} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Labelled label={tab === "faqs" ? "Question" : "Title"}><input className={inputCls} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Category"><input className={inputCls} list="kb-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="kb-cats">{cats.data?.categories.map((c) => <option key={c.name} value={c.name} />)}</datalist></Labelled>
            <Labelled label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "draft" | "published" })}><option value="draft">Draft</option><option value="published">Published</option></select></Labelled>
          </div>
          {tab === "tutorials" && <Labelled label="Video link"><input className={inputCls} placeholder="https://" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></Labelled>}
          <Labelled label={tab === "faqs" ? "Answer" : "Content"}><textarea className={`${inputCls} min-h-[8rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 pt-1"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-3 text-sm"><p className="whitespace-pre-wrap text-slate-800">{view.body}</p>{view.video_url && <p><a href={view.video_url} target="_blank" rel="noreferrer" className="text-[#026f9b] underline">Open the video</a></p>}<div className="flex justify-end"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

// ═════════════ Feedback ═════════════
export type FeedbackTab = "school" | "requests";
interface Fb { id: string; rating: number; comment: string | null; submitter_name: string | null; created_at: string; institutions: { name: string } | null; support_tickets: { code: string } | null }
interface FbRes extends Paged<Fb> { summary: { count: number; average: number | null } }
interface Feat { id: string; title: string; description: string | null; status: "new" | "planned" | "in_progress" | "shipped" | "declined"; response: string | null; votes: number; institutions: { name: string } | null }
const stars = (n: number) => <span aria-label={`${n} of 5`} className="whitespace-nowrap text-[13px] text-[#0294ce]">{"★".repeat(n)}<span className="text-slate-800">{"★".repeat(5 - n)}</span></span>;
const FS: Record<string, [string, "info" | "warn" | "good" | "mute" | "bad"]> = { new: ["New", "mute"], planned: ["Planned", "info"], in_progress: ["In progress", "info"], shipped: ["Shipped", "good"], declined: ["Declined", "bad"] };

export function FeedbackPages({ tab }: { tab: FeedbackTab }) {
  return tab === "school" ? <SchoolFeedback /> : <FeatureRequests />;
}

function SchoolFeedback() {
  const { data, error, loading } = useLoad(() => adminFetch<FbRes>(`/support/feedback${qs({ pageSize: 100 })}`), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Fb | null>(null);
  const items = (data?.items ?? []).filter((f) => has(`${f.institutions?.name} ${f.submitter_name} ${f.comment}`, search));
  const unhappy = (data?.items ?? []).filter((f) => f.rating <= 2).length;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Average rating", value: data?.summary.average != null ? `${data.summary.average} / 5` : "—", sub: "All responses" }, { label: "Responses", value: data ? String(data.summary.count) : "…", sub: "From school admins" }, { label: "Unhappy (1–2 stars)", value: data ? String(unhappy) : "…", sub: "Call back within a day" }]} />
      <Panel title="Feedback" sub={`${items.length} responses`} right={<ExportPrint name="school-feedback" head={["School", "From", "Rating", "Comment", "Date"]} rows={items.map((f) => [f.institutions?.name, f.submitter_name, f.rating, f.comment, f.created_at.slice(0, 10)])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search feedback" aria-label="Search feedback" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "School" }, { h: "From" }, { h: "Rating" }, { h: "Comment" }, { h: "Date" }, { h: "" }]} empty={loading ? "Loading…" : "No feedback yet."}
          rows={items.map((f) => [<b key="s" className="font-semibold text-slate-900">{f.institutions?.name}</b>, f.submitter_name ?? "—", stars(f.rating), f.comment ?? "—", fmtDay(f.created_at.slice(0, 10)), <button key="v" type="button" className={small} onClick={() => setView(f)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.institutions?.name ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p>{stars(view.rating)}</p><p>{view.comment ?? "No comment."}</p><p className="text-xs text-slate-500">{view.submitter_name ?? "Unknown"} · {fmtDay(view.created_at.slice(0, 10))}{view.support_tickets ? ` · ticket ${view.support_tickets.code}` : ""}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}

function FeatureRequests() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ items: Feat[] }>("/support/features"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Feat | null>(null);
  const [status, setStatus] = useState("new");
  const items = (data?.items ?? []).filter((f) => has(`${f.title} ${f.description ?? ""}`, search));
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Feature requests" sub={`${items.length} requests`} right={<ExportPrint name="feature-requests" head={["Request", "School", "Votes", "Status"]} rows={items.map((f) => [f.title, f.institutions?.name, f.votes, FS[f.status][0]])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search feature requests" aria-label="Search feature requests" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Request" }, { h: "School" }, { h: "Votes", right: true }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No feature requests yet."}
          rows={items.map((f) => [<b key="t" className="font-semibold text-slate-900">{f.title}</b>, f.institutions?.name ?? "—", num(f.votes), <Chip key="s" tone={FS[f.status][1]}>{FS[f.status][0]}</Chip>, <button key="v" type="button" className={small} onClick={() => { setStatus(f.status); setView(f); }}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>
        {view && <div className="space-y-3 text-sm"><p className="text-slate-800">{view.description ?? "No description."}</p>
          <Labelled label="Status"><select className={`${inputCls} max-w-[12rem]`} value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(FS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Labelled>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setView(null)}>Close</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch(`/support/features/${view.id}`, json("PATCH", { status })))) setView(null); }}>Save status</button></div></div>}
      </Modal>
    </div>
  );
}

// ═════════════ Escalations ═════════════
export type EscTab = "priority" | "history";
interface Pol { priority: string; first_response_hours: number; resolution_hours: number }
interface Esc { id: string; reason: string; from_priority: string; to_priority: string; note: string | null; escalator_name: string | null; created_at: string; support_tickets: { code: string; subject: string; institutions: { name: string } | null } | null }
const NEXT: Record<string, string> = { Low: "Medium", Medium: "High", High: "Urgent" };
const HOURS = [1, 2, 4, 8, 12, 24, 48, 72, 120, 168];
const dur = (h: number) => (h % 24 === 0 && h >= 24 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hour${h === 1 ? "" : "s"}`);
const WHY = { response_overdue: "No reply in time", resolution_overdue: "Not fixed in time", manual: "Escalated by hand" } as const;

export function EscalationPages({ tab }: { tab: EscTab }) {
  return tab === "priority" ? <ServiceLevels /> : <EscalationHistory />;
}

function ServiceLevels() {
  const sla = useLoad(() => adminFetch<{ policies: Pol[] }>("/support/sla"), []);
  const [d, setD] = useState<Record<string, { first: number; fix: number }>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction(sla.reload);
  const reset = () => setD(Object.fromEntries((sla.data?.policies ?? []).map((p) => [p.priority, { first: p.first_response_hours, fix: p.resolution_hours }])));
  useEffect(() => { reset(); setSaved(false); }, [sla.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const opts = (v: number) => [...new Set([...HOURS, v])].sort((a, b) => a - b);
  const change = (p: string, k: "first" | "fix", v: number) => { setD((x) => ({ ...x, [p]: { ...x[p], [k]: v } })); setSaved(false); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(async () => { for (const p of sla.data?.policies ?? []) { const x = d[p.priority]; if (x && (x.first !== p.first_response_hours || x.fix !== p.resolution_hours)) await adminFetch(`/support/sla/${p.priority}`, json("PUT", { first_response_hours: x.first, resolution_hours: x.fix })); } });
    if (ok) setSaved(true);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={sla.error} />
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Service levels</h2></div>
        <ErrorBanner message={act.error} />
        <SimpleTable head={[{ h: "Priority" }, { h: "First response" }, { h: "Resolve within" }, { h: "Escalate to" }]} empty={sla.loading ? "Loading…" : "No service levels."}
          rows={(sla.data?.policies ?? []).map((p) => { const x = d[p.priority] ?? { first: p.first_response_hours, fix: p.resolution_hours }; return [
            <Chip key="p" tone={PRI[p.priority] ?? "mute"}>{p.priority}</Chip>,
            <select key="f" aria-label={`${p.priority} first response`} className={`${inputCls} max-w-[9rem]`} value={x.first} onChange={(e) => change(p.priority, "first", Number(e.target.value))}>{opts(x.first).map((h) => <option key={h} value={h}>{dur(h)}</option>)}</select>,
            <select key="r" aria-label={`${p.priority} resolution`} className={`${inputCls} max-w-[9rem]`} value={x.fix} onChange={(e) => change(p.priority, "fix", Number(e.target.value))}>{opts(x.fix).map((h) => <option key={h} value={h}>{dur(h)}</option>)}</select>,
            <span key="e" className="text-[13px] text-slate-800">{NEXT[p.priority] ? `Raised to ${NEXT[p.priority]} after ${dur(x.first)} without a reply, or ${dur(x.fix)} without a fix` : "Already the highest priority"}</span>]; })} />
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">A ticket that misses a target goes up one priority level automatically. Time is counted on the clock and pauses while a ticket waits on the school.</p>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
          {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
          <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { reset(); setSaved(false); }}>Discard</button>
          <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>{act.busy ? "Saving…" : "Save service levels"}</button>
        </div>
      </form>
    </div>
  );
}

function EscalationHistory() {
  const { data, error, loading } = useLoad(() => adminFetch<Paged<Esc>>("/support/escalations?pageSize=100"), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Esc | null>(null);
  const items = (data?.items ?? []).filter((e) => has(`${e.support_tickets?.code} ${e.support_tickets?.institutions?.name} ${e.note ?? ""}`, search));
  const when = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Panel title="Escalations" sub={`${items.length} escalations`} right={<ExportPrint name="escalations" head={["Ticket", "School", "Priority", "By", "Reason", "When"]} rows={items.map((e) => [e.support_tickets?.code, e.support_tickets?.institutions?.name, e.to_priority, e.escalator_name ?? "System", e.note ?? WHY[e.reason as keyof typeof WHY] ?? e.reason, e.created_at])} />}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search escalations" aria-label="Search escalations" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable head={[{ h: "Ticket" }, { h: "School" }, { h: "Priority" }, { h: "By" }, { h: "Reason" }, { h: "When" }, { h: "" }]} empty={loading ? "Loading…" : "Nothing has been escalated."}
          rows={items.map((e) => [e.support_tickets?.code ?? "—", e.support_tickets?.institutions?.name ?? "—", <Chip key="p" tone={PRI[e.to_priority] ?? "mute"}>{e.to_priority}</Chip>, e.escalator_name ?? "System", e.note || WHY[e.reason as keyof typeof WHY] || e.reason, when(e.created_at), <button key="v" type="button" className={small} onClick={() => setView(e)}>View details</button>])} />
      </Panel>
      <Modal open={!!view} title={view?.support_tickets?.code ?? ""} onClose={() => setView(null)}>{view && <div className="space-y-2 text-sm"><p><b>{view.support_tickets?.subject}</b></p><p>{view.from_priority} → {view.to_priority}</p><p>{view.note || WHY[view.reason as keyof typeof WHY]}</p><p className="text-xs text-slate-500">{view.escalator_name ?? "System"} · {when(view.created_at)}</p><div className="flex justify-end pt-2"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></div>}</Modal>
    </div>
  );
}
