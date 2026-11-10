"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json, type TicketDetail, type TicketRow } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { TicketThread } from "@/components/admin/ticket-thread";
import { Badge, Card, EmptyRow, ErrorBanner, Field, Modal, PageHeader, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

const statusTone = { Open: "blue", "In progress": "blue", "Waiting on school": "red", Resolved: "green", Closed: "gray" } as const;
interface Cat { name: string; description: string | null; subtopics: string[]; default_priority: string | null }

type Ticket = Pick<TicketRow, "id" | "code" | "subject" | "category" | "priority" | "status" | "created_at" | "updated_at">;

export default function SchoolSupportPage() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ tickets: Ticket[] }>("/school/support/tickets"), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const cats = useLoad(() => schoolFetch<{ categories: Cat[] }>("/school/support/categories"), []);
  const [f, setF] = useState({ subject: "", category: "", subtopic: "", priority: "", body: "" });
  const chosen = cats.data?.categories.find((c) => c.name === (f.category || cats.data?.categories[0]?.name));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const category = f.category || cats.data?.categories[0]?.name || "General";
      const res = await schoolFetch<TicketDetail>("/school/support/tickets", json("POST", { subject: f.subject, body: f.body, category, subtopic: f.subtopic || undefined, priority: f.priority || undefined }));
      setCreating(false);
      setF({ subject: "", category: "", subtopic: "", priority: "", body: "" });
      reload();
      setOpenId(res.ticket.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send the ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Ask the My Class Assist team for help."
        action={<button type="button" className={btnPrimary} onClick={() => { setFormError(""); setCreating(true); }}>+ New ticket</button>}
      />
      <ErrorBanner message={error} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50"><tr><Th>Ticket</Th><Th>Category</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.tickets.length && <EmptyRow cols={4} loading={loading} text="You have not raised any tickets." />}
              {data?.tickets.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(t.id)}>
                  <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setOpenId(t.id)}><span className="block font-semibold text-slate-900">{t.subject}</span><span className="text-xs text-slate-400">{t.code}</span></button></td>
                  <td className="px-4 py-3 text-slate-600">{t.category}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[t.status]}>{t.status === "Waiting on school" ? "Waiting on you" : t.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={creating} title="New support ticket" onClose={() => setCreating(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={formError} />
          <Field label="Subject"><input className={inputCls} required minLength={3} maxLength={255} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><select className={inputCls} value={chosen?.name ?? ""} onChange={(e) => setF({ ...f, category: e.target.value, subtopic: "" })}>{cats.data?.categories.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
            <Field label="Topic">
              <select className={inputCls} value={f.subtopic} onChange={(e) => setF({ ...f, subtopic: e.target.value })}><option value="">Not sure</option>{chosen?.subtopics.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
          </div>
          {chosen?.description && <p className="-mt-1 text-xs text-slate-500">{chosen.description}</p>}
          <Field label="How urgent is it?" hint="Leave on the default unless it is stopping your school from working."><select className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="">{chosen?.default_priority ? "Default (" + chosen.default_priority + ")" : "Default (Medium)"}</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></Field>
          <Field label="What is happening?"><textarea className={`${inputCls} min-h-[8rem]`} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Sending…" : "Send ticket"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={openId !== null} title="Ticket" onClose={() => { setOpenId(null); reload(); }}>
        {openId && <SchoolTicket id={openId} />}
      </Modal>
    </>
  );
}

function SchoolTicket({ id }: { id: string }) {
  const detail = useLoad(() => schoolFetch<TicketDetail>(`/school/support/tickets/${id}`), [id]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [rateError, setRateError] = useState("");
  const rate = async () => {
    setRateError("");
    try {
      await schoolFetch("/school/feedback", json("POST", { rating, comment: comment || null, ticket_id: id }));
      setRated(true);
    } catch (e) {
      setRateError(e instanceof Error ? e.message : "Could not send your rating.");
      if (e instanceof Error && /already rated/i.test(e.message)) setRated(true);
    }
  };
  if (!detail.data) return <p className="py-8 text-center text-sm text-slate-400">{detail.error || "Loading…"}</p>;
  const { ticket, messages } = detail.data;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-400">{ticket.code} · {ticket.category}</p>
        <h3 className="text-lg text-slate-900">{ticket.subject}</h3>
        <p className="mt-1"><Badge tone={statusTone[ticket.status]}>{ticket.status === "Waiting on school" ? "Waiting on you" : ticket.status}</Badge></p>
      </div>
      <TicketThread
        messages={messages}
        onSend={async (body) => {
          await schoolFetch(`/school/support/tickets/${id}/messages`, json("POST", { body }));
          detail.reload();
        }}
        disabled={ticket.status === "Closed"}
      />
      {(ticket.status === "Resolved" || ticket.status === "Closed") && (
        <div className="rounded-xl border border-slate-200 p-3">
          {rated ? <p className="text-sm font-semibold text-mca-green">Thank you for your feedback.</p> : (
            <>
              <p className="text-sm font-semibold text-slate-900">How did we do?</p>
              <div className="my-1 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={n + " star" + (n === 1 ? "" : "s")} onClick={() => setRating(n)} className={"text-2xl " + (n <= rating ? "text-amber-500" : "text-slate-300")}>★</button>)}
              </div>
              <textarea className={inputCls + " min-h-[3.5rem]"} placeholder="Anything to add? (optional)" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
              {rateError && <p className="mt-1 text-xs text-rose-700">{rateError}</p>}
              <div className="mt-2 flex justify-end"><button type="button" className={btnPrimary} disabled={!rating} onClick={rate}>Send rating</button></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
