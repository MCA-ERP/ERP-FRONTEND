"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json, qs } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { TabBar, useAction } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, Field, Modal, PageHeader, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { useSchool } from "../context";

interface Item { id: string; type: "article" | "faq" | "tutorial"; title: string; category: string | null; body: string; video_url: string | null; helpful_yes: number; helpful_no: number }
interface Feat { id: string; title: string; description: string | null; status: "new" | "planned" | "in_progress" | "shipped" | "declined"; response: string | null; votes: number; voted?: boolean }
const label = { new: "Under review", planned: "Planned", in_progress: "In progress", shipped: "Shipped", declined: "Not planned" } as const;
const tone = { new: "gray", planned: "blue", in_progress: "blue", shipped: "green", declined: "gray" } as const;

export default function HelpCentrePage() {
  const [tab, setTab] = useState<"article" | "faq" | "tutorial" | "ideas">("article");
  return (
    <>
      <PageHeader title="Help centre" subtitle="Guides, answers and videos. Can't find it? Raise a ticket under Support." />
      <TabBar value={tab} onChange={setTab} tabs={[["article", "Articles"], ["faq", "FAQs"], ["tutorial", "Tutorials"], ["ideas", "Ideas & feedback"]]} />
      {tab === "ideas" ? <Ideas /> : <Library type={tab} key={tab} />}
    </>
  );
}

function Library({ type }: { type: "article" | "faq" | "tutorial" }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Item[] }>(`/school/help${qs({ type, search: q })}`), [type, q]);
  const [open, setOpen] = useState<string | null>(null);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const toggle = (it: Item) => {
    const next = open === it.id ? null : it.id;
    setOpen(next);
    if (next) void schoolFetch(`/school/help/${it.id}/view`, { method: "POST" }).catch(() => undefined);
  };
  const vote = (it: Item, helpful: boolean) => {
    setVoted((v) => new Set(v).add(it.id));
    void schoolFetch(`/school/help/${it.id}/vote`, json("POST", { helpful })).catch(() => undefined);
  };

  return (
    <>
      <input className={`${inputCls} mb-4 max-w-md`} placeholder="Search…" aria-label="Search the help centre" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ErrorBanner message={error} />
      <Card>
        <ul className="divide-y divide-slate-100">
          {!data?.items.length && <li className="px-5 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : q ? "Nothing matches your search." : "Nothing here yet."}</li>}
          {data?.items.map((it) => (
            <li key={it.id}>
              <button type="button" aria-expanded={open === it.id} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50" onClick={() => toggle(it)}>
                <span><span className="font-semibold text-slate-900">{it.title}</span>{it.category && <span className="ml-2"><Badge tone="gray">{it.category}</Badge></span>}</span>
                <span className="text-slate-400" aria-hidden="true">{open === it.id ? "−" : "+"}</span>
              </button>
              {open === it.id && (
                <div className="space-y-3 px-5 pb-4">
                  {it.video_url && <a href={it.video_url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-mca-blue-sky px-3 py-1.5 text-sm font-semibold text-mca-blue-dark">▶ Watch the video</a>}
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{it.body}</p>
                  {voted.has(it.id) ? <p className="text-xs text-slate-500">Thanks for letting us know.</p> : (
                    <p className="text-xs text-slate-500">Was this helpful? <button type="button" className="ml-2 font-semibold text-mca-blue" onClick={() => vote(it, true)}>Yes</button> <button type="button" className="ml-2 font-semibold text-mca-blue" onClick={() => vote(it, false)}>No</button></p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function Ideas() {
  const { can } = useSchool();
  const allowed = can("admin.settings.manage");
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Feat[] }>("/school/features"), []);
  const act = useAction(reload);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "" });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [thanks, setThanks] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => schoolFetch("/school/features", json("POST", { title: f.title, description: f.description || null })))) { setOpen(false); setF({ title: "", description: "" }); }
  };
  const sendFeedback = () =>
    act.run(async () => {
      await schoolFetch("/school/feedback", json("POST", { rating, comment: comment || null }));
      setThanks("Thank you for your feedback."); setRating(0); setComment("");
    });

  return (
    <div className="space-y-6">
      <ErrorBanner message={error || act.error} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div><h2 className="text-base text-slate-900">Feature requests</h2><p className="text-xs text-slate-500">Vote for what you need most. Each school has one vote per idea.</p></div>
          {allowed && <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Suggest a feature</button>}
        </div>
        <ul className="divide-y divide-slate-100">
          {!data?.items.length && <li className="px-5 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : "No ideas yet. Be the first."}</li>}
          {data?.items.map((x) => (
            <li key={x.id} className="flex items-start gap-4 px-5 py-3.5">
              <button type="button" disabled={!allowed || act.busy} aria-pressed={!!x.voted} aria-label={`${x.voted ? "Remove your vote from" : "Vote for"} ${x.title}`} onClick={() => act.run(() => schoolFetch(`/school/features/${x.id}/vote`, { method: "POST" }))}
                className={`flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 text-center ${x.voted ? "border-mca-blue bg-mca-blue-sky text-mca-blue-dark" : "border-slate-200 text-slate-600 hover:bg-slate-50"} disabled:opacity-60`}>
                <span aria-hidden="true">▲</span><span className="text-sm font-bold tabular-nums">{x.votes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{x.title} <Badge tone={tone[x.status]}>{label[x.status]}</Badge></p>
                {x.description && <p className="text-sm text-slate-600">{x.description}</p>}
                {x.response && <p className="mt-1 text-xs text-mca-blue-dark">From our team: {x.response}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {allowed && (
        <Card>
          <div className="space-y-3 p-5">
            <h2 className="text-base text-slate-900">Tell us how we are doing</h2>
            {thanks ? <p className="text-sm font-semibold text-mca-green">{thanks}</p> : (
              <>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-500" : "text-slate-300"}`}>★</button>)}
                </div>
                <textarea className={`${inputCls} min-h-[4rem]`} placeholder="What is working, and what is not? (optional)" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
                <button type="button" className={btnPrimary} disabled={!rating || act.busy} onClick={sendFeedback}>Send feedback</button>
              </>
            )}
          </div>
        </Card>
      )}

      <Modal open={open} title="Suggest a feature" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="What would you like?"><input className={inputCls} required minLength={5} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Why would it help? (optional)"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Send</button></div>
        </form>
      </Modal>
    </div>
  );
}
