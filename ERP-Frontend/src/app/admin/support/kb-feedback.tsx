"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged } from "@/lib/admin-api";
import { Panel, StatGrid, TabBar, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { priorityTone } from "./tickets";

const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>;

// ═════════════ Knowledge base ═════════════
interface Kb { id: string; type: "article" | "faq" | "tutorial"; title: string; category: string | null; body: string; video_url: string | null; status: "draft" | "published"; views: number; helpful_yes: number; helpful_no: number; sort_order: number }
const TYPE = { article: { tab: "Articles", sub: "Help articles schools see in the help centre.", one: "article" }, faq: { tab: "FAQs", sub: "Short answers to common questions.", one: "question" }, tutorial: { tab: "Tutorials", sub: "Step-by-step guides, with a video if you have one.", one: "tutorial" } } as const;

export function KnowledgeBase() {
  const [type, setType] = useState<"article" | "faq" | "tutorial">("article");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ items: Kb[] }>(`/support/kb${qs({ type })}`), [type]);
  const cats = useLoad(() => adminFetch<{ categories: { name: string }[] }>("/support/categories"), []);
  const act = useAction(reload);
  const [open, setOpen] = useState<Kb | "new" | null>(null);
  const blank = { title: "", category: "", body: "", video_url: "", status: "draft" as "draft" | "published" };
  const [f, setF] = useState(blank);
  const t = TYPE[type];

  const openForm = (k: Kb | "new") => { setF(k === "new" ? blank : { title: k.title, category: k.category ?? "", body: k.body, video_url: k.video_url ?? "", status: k.status }); setOpen(k); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { type, title: f.title, category: f.category || null, body: f.body, video_url: type === "tutorial" ? f.video_url || null : null, status: f.status };
    if (await act.run(() => (open === "new" ? adminFetch("/support/kb", json("POST", body)) : adminFetch(`/support/kb/${(open as Kb).id}`, json("PATCH", body))))) setOpen(null);
  };

  return (
    <>
      <TabBar value={type} onChange={setType} tabs={(Object.keys(TYPE) as (keyof typeof TYPE)[]).map((k) => [k, TYPE[k].tab] as [typeof type, string])} />
      <Panel title={t.tab} sub={t.sub} right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Add {t.one}</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Title</Th><Th>Topic</Th><Th>Status</Th><Th>Views</Th><Th>Helpful</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.items.length && <Empty cols={6} loading={loading} text={`No ${t.tab.toLowerCase()} yet.`} />}
            {data?.items.map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{k.title}</p><p className="line-clamp-1 max-w-md text-xs text-slate-400">{k.body}</p></td>
                <td className="px-4 py-3 text-slate-600">{k.category ?? "—"}</td>
                <td className="px-4 py-3">{k.status === "published" ? <Badge tone="green">Published</Badge> : <Badge tone="gray">Draft</Badge>}</td>
                <td className="px-4 py-3 tabular-nums">{k.views}</td>
                <td className="px-4 py-3 text-xs tabular-nums text-slate-600">👍 {k.helpful_yes} · 👎 {k.helpful_no}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right"><div className="flex justify-end gap-2">
                  <button type="button" className={small} onClick={() => openForm(k)}>Edit</button>
                  <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/support/kb/${k.id}`, json("PATCH", { status: k.status === "published" ? "draft" : "published" })))}>{k.status === "published" ? "Unpublish" : "Publish"}</button>
                  <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Delete "${k.title}"?`) && act.run(() => adminFetch(`/support/kb/${k.id}`, { method: "DELETE" }))}>Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Modal open={open !== null} title={open === "new" ? `Add ${t.one}` : `Edit ${t.one}`} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={act.error} />
            <Field label={type === "faq" ? "Question" : "Title"}><input className={inputCls} required minLength={3} maxLength={255} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Topic"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">None</option>{cats.data?.categories.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
              <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "draft" | "published" })}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
            </div>
            {type === "tutorial" && <Field label="Video link (optional)" hint="A full https:// address."><input className={inputCls} value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></Field>}
            <Field label={type === "faq" ? "Answer" : type === "tutorial" ? "Steps" : "Content"}><textarea className={`${inputCls} min-h-[10rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
          </form>
        </Modal>
      </Panel>
    </>
  );
}

// ═════════════ Feedback ═════════════
interface Fb { id: string; rating: number; comment: string | null; submitter_name: string | null; created_at: string; institutions: { name: string } | null; support_tickets: { code: string; subject: string } | null }
interface FbRes extends Paged<Fb> { summary: { count: number; average: number | null; distribution: { stars: number; count: number }[] } }
interface Feat { id: string; title: string; description: string | null; status: "new" | "planned" | "in_progress" | "shipped" | "declined"; response: string | null; submitter_name: string | null; created_at: string; votes: number; institutions: { name: string } | null }
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const featTone = { new: "gray", planned: "blue", in_progress: "blue", shipped: "green", declined: "red" } as const;
const featLabel = { new: "New", planned: "Planned", in_progress: "In progress", shipped: "Shipped", declined: "Declined" } as const;

export function Feedback() {
  const [part, setPart] = useState<"school" | "features">("school");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["school", "School feedback"], ["features", "Feature requests"]]} />
      {part === "school" ? <SchoolFeedback /> : <Features />}
    </>
  );
}

function SchoolFeedback() {
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => adminFetch<FbRes>(`/support/feedback${qs({ max_rating: low ? 2 : undefined, page })}`), [low, page]);
  const s = data?.summary;
  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <StatGrid items={[{ label: "Average rating", value: s?.average === null || !s ? "—" : `${s.average} / 5`, sub: `${s?.count ?? 0} ratings` }, ...[5, 4, 3, 1].map((n) => ({ label: `${n} star${n === 1 ? "" : "s"}`, value: s?.distribution.find((d) => d.stars === n)?.count ?? 0 }))]} />
      <Panel title="School feedback" sub="Ratings and comments from school admins, mostly after a ticket is resolved" right={<label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} />Only 1–2 stars</label>}>
        <ul className="divide-y divide-slate-100">
          {!data?.items.length && <li className="px-5 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : "No feedback yet."}</li>}
          {data?.items.map((f) => (
            <li key={f.id} className="px-5 py-3 text-sm">
              <p><span className="text-amber-500" aria-label={`${f.rating} stars`}>{stars(f.rating)}</span> <b className="text-slate-900">{f.institutions?.name}</b> <span className="text-xs text-slate-400">{f.submitter_name} · {fmtDate(f.created_at)}</span></p>
              {f.comment && <p className="mt-1 text-slate-600">{f.comment}</p>}
              {f.support_tickets && <p className="mt-1 text-xs text-slate-400">About {f.support_tickets.code}: {f.support_tickets.subject}</p>}
            </li>
          ))}
        </ul>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}

function Features() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ items: Feat[] }>("/support/features"), []);
  const act = useAction(reload);
  const [open, setOpen] = useState<Feat | null>(null);
  const [f, setF] = useState({ status: "new" as Feat["status"], response: "" });
  const openForm = (x: Feat) => { setF({ status: x.status, response: x.response ?? "" }); setOpen(x); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (open && (await act.run(() => adminFetch(`/support/features/${open.id}`, json("PATCH", { status: f.status, response: f.response || null }))))) setOpen(null); };

  return (
    <Panel title="Feature requests" sub="Ideas from schools, with votes. One vote per school.">
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Votes</Th><Th>Request</Th><Th>From</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <Empty cols={5} loading={loading} text="No requests yet. Schools send them from their help centre." />}
          {data?.items.map((x) => (
            <tr key={x.id} className="align-top">
              <td className="px-4 py-3 text-lg font-bold tabular-nums text-slate-900">{x.votes}</td>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{x.title}</p>{x.description && <p className="max-w-md text-xs text-slate-500">{x.description}</p>}{x.response && <p className="mt-1 text-xs text-mca-blue-dark">Our reply: {x.response}</p>}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{x.institutions?.name ?? "—"}<br /><span className="text-slate-400">{fmtDate(x.created_at)}</span></td>
              <td className="px-4 py-3"><Badge tone={featTone[x.status]}>{featLabel[x.status]}</Badge></td>
              <td className="px-4 py-3 text-right"><button type="button" className={small} onClick={() => openForm(x)}>Update</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!open} title={open?.title ?? ""} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Feat["status"] })}>{(Object.keys(featLabel) as Feat["status"][]).map((k) => <option key={k} value={k}>{featLabel[k]}</option>)}</select></Field>
          <Field label="Reply to schools (optional)" hint="Schools see this next to the request."><textarea className={`${inputCls} min-h-[5rem]`} maxLength={1000} value={f.response} onChange={(e) => setF({ ...f, response: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </Panel>
  );
}

// ═════════════ Escalations ═════════════
interface Pol { priority: string; first_response_hours: number; resolution_hours: number }
interface Esc { id: string; reason: string; from_priority: string; to_priority: string; note: string | null; escalator_name: string | null; created_at: string; support_tickets: { id: string; code: string; subject: string; status: string; institutions: { name: string } | null } | null }

export function Escalations() {
  const [part, setPart] = useState<"priority" | "history">("priority");
  const [page, setPage] = useState(1);
  const sla = useLoad(() => adminFetch<{ policies: Pol[] }>("/support/sla"), []);
  const hist = useLoad(() => (part === "history" ? adminFetch<Paged<Esc> & { overdue_now: number }>(`/support/escalations?page=${page}`) : Promise.resolve(null)), [part, page]);
  const act = useAction(sla.reload);
  const [edit, setEdit] = useState<Record<string, { first: string; fix: string }>>({});
  const label = { response_overdue: "No reply in time", resolution_overdue: "Not fixed in time", manual: "Escalated by hand" } as const;

  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["priority", "Priority targets"], ["history", "Escalation history"]]} />
      <ErrorBanner message={sla.error || hist.error || act.error} />
      {part === "priority" ? (
        <Panel title="Response and resolution targets" sub="How fast support promises to reply and to fix, by priority. A ticket that misses a target is escalated automatically: its priority goes up one level.">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Priority</Th><Th>First reply within (hours)</Th><Th>Fixed within (hours)</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {sla.data?.policies.map((p) => {
                const e = edit[p.priority] ?? { first: String(p.first_response_hours), fix: String(p.resolution_hours) };
                const dirty = e.first !== String(p.first_response_hours) || e.fix !== String(p.resolution_hours);
                return (
                  <tr key={p.priority}>
                    <td className="px-4 py-3"><Badge tone={priorityTone[p.priority as keyof typeof priorityTone]}>{p.priority}</Badge></td>
                    <td className="px-4 py-3"><input type="number" min={1} aria-label={`${p.priority} reply hours`} className={`${inputCls} max-w-[8rem]`} value={e.first} onChange={(ev) => setEdit({ ...edit, [p.priority]: { ...e, first: ev.target.value } })} /></td>
                    <td className="px-4 py-3"><input type="number" min={1} aria-label={`${p.priority} fix hours`} className={`${inputCls} max-w-[8rem]`} value={e.fix} onChange={(ev) => setEdit({ ...edit, [p.priority]: { ...e, fix: ev.target.value } })} /></td>
                    <td className="px-4 py-3 text-right">{dirty && <button type="button" className={btnPrimary + " !px-3 !py-1 text-xs"} disabled={act.busy} onClick={async () => { if (await act.run(() => adminFetch(`/support/sla/${p.priority}`, json("PUT", { first_response_hours: Number(e.first), resolution_hours: Number(e.fix) })))) { const n = { ...edit }; delete n[p.priority]; setEdit(n); } }}>Save</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Hours are counted on the clock, not office hours. The timer pauses while a ticket is waiting on the school. Changes apply to tickets already open.</p>
        </Panel>
      ) : (
        <Panel title="Escalation history" sub="Tickets that were escalated, and why" right={hist.data && <span className="text-xs text-slate-500">Overdue right now: <b className={hist.data.overdue_now ? "text-rose-700" : "text-slate-700"}>{hist.data.overdue_now}</b></span>}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Ticket</Th><Th>Why</Th><Th>Priority</Th><Th>By</Th><Th>When</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!hist.data?.items.length && <Empty cols={5} loading={hist.loading} text="Nothing has been escalated." />}
              {hist.data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{e.support_tickets?.subject}</p><p className="text-xs text-slate-400">{e.support_tickets?.code} · {e.support_tickets?.institutions?.name}</p></td>
                  <td className="px-4 py-3 text-slate-600">{label[e.reason as keyof typeof label] ?? e.reason}{e.note && <p className="text-xs text-slate-400">{e.note}</p>}</td>
                  <td className="px-4 py-3 text-xs">{e.from_priority} → <b>{e.to_priority}</b></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{e.escalator_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hist.data && <Pagination page={hist.data.page} pageSize={hist.data.pageSize} total={hist.data.total} onChange={setPage} />}
        </Panel>
      )}
    </>
  );
}
