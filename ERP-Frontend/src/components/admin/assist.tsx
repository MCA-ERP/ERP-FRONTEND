"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { adminFetch, json } from "@/lib/admin-api";

interface Msg { role: "user" | "assistant"; content: string }

const KINDS = ["Maintenance notice", "Release notes", "Policy update"];
const IDEAS = [
  "Which schools need attention?",
  "How many schools are active right now?",
  "Which schools are waiting for approval?",
  "Are there overdue invoices?",
  "How do I create a new role?",
];

/** The "Ask AI" button in the corner of the Super Admin portal, with its chat panel. */
export function Assist() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"ask" | "notice">("ask");
  const [kind, setKind] = useState(KINDS[0]);
  const [points, setPoints] = useState("");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setError("");
    setBusy(true);
    try {
      const r = await adminFetch<{ reply: string }>("/assist/chat", json("POST", { messages: next.slice(-12), page: pathname }));
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); void send(text); };

  const makeDraft = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || points.trim().length < 5) return;
    setError("");
    setCopied(false);
    setBusy(true);
    try {
      const r = await adminFetch<{ draft: string }>("/assist/notice", json("POST", { points, kind }));
      setDraft(r.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not draft that.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(draft); setCopied(true); } catch { setError("Could not copy. Select the text and copy it yourself."); } };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#026f9b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#026f9b] print:hidden"
      >
        <Sparkles className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        Ask AI
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside role="dialog" aria-label="MCA Assist" className="fixed inset-y-0 right-0 z-50 flex w-[min(460px,100vw)] flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-br from-[#dceff9] to-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-[#026f9b] text-white"><Sparkles className="size-[18px]" aria-hidden="true" /></span>
                <div><p className="font-semibold text-[#026f9b]">MCA Assist</p><p className="text-xs text-slate-500">Ask about your platform. I answer from live counts and never change anything.</p></div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="size-5" aria-hidden="true" /></button>
            </header>

            <div role="tablist" className="flex gap-1 border-b border-slate-200 px-5">
              {([["ask", "Ask"], ["notice", "Draft a notice"]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setError(""); }}
                  className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${mode === k ? "border-[#0294ce] text-slate-900" : "border-transparent text-slate-500"}`}>{l}</button>
              ))}
            </div>

            {mode === "notice" ? (
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <p className="text-sm text-slate-500">Turn a few points into a notice for school administrators. You review it before it goes anywhere.</p>
                <form onSubmit={makeDraft} className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Type
                    <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      {KINDS.map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">What it is about
                    <textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={5} maxLength={2000} placeholder="One point per line: when, what changes, what schools need to do"
                      className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal outline-none focus:border-[#0294ce] focus:ring-2 focus:ring-[#0294ce]/30" />
                  </label>
                  <button type="submit" disabled={busy || points.trim().length < 5} className="rounded-full bg-[#e53a35] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Drafting…" : "Draft notice"}</button>
                </form>
                {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                {draft && (
                  <div className="space-y-2">
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={14} aria-label="Draft notice" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed" />
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <button type="button" onClick={() => void copy()} className="font-semibold text-[#026f9b] hover:underline">{copied ? "Copied" : "Copy"}</button>
                      <Link href="/super-admin/communication/announcements" onClick={() => setOpen(false)} className="font-semibold text-[#026f9b] hover:underline">Open Announcements to send it</Link>
                    </div>
                    <p className="text-xs text-slate-400">AI-written: check every date and fact before you send.</p>
                  </div>
                )}
              </div>
            ) : (
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!msgs.length && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Try one of these, or type your own question.</p>
                  {IDEAS.map((q) => (
                    <button key={q} type="button" onClick={() => void send(q)} className="block w-full rounded-full border border-slate-200 px-4 py-2 text-left text-sm text-slate-700 hover:border-[#026f9b]">{q}</button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "ml-auto bg-[#026f9b] text-white" : "bg-slate-100 text-slate-800"}`}>{m.content}</div>
              ))}
              {busy && <div className="w-fit rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500" role="status">Thinking…</div>}
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div ref={end} />
            </div>
            )}

            {mode === "ask" && <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 p-3">
              <textarea
                ref={input}
                rows={2}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
                placeholder="Ask anything about the platform…"
                aria-label="Your question"
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0294ce] focus:ring-2 focus:ring-[#0294ce]/30"
              />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-[#026f9b] text-white disabled:opacity-50"><Send className="size-[18px]" aria-hidden="true" /></button>
            </form>}
          </aside>
        </>
      )}
    </>
  );
}
