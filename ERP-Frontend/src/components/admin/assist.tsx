"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUp, Download, ExternalLink, Sparkles, X } from "lucide-react";
import { adminFetch, json } from "@/lib/admin-api";
import { downloadCsv } from "./csv";
import { findNavigation } from "@/app/super-admin/s/navigate";

type Cell = string | number | null;
type Action = { kind: "export"; label: string; name: string; head: string[]; rows: Cell[][]; auto?: boolean } | { kind: "link"; label: string; href: string };
interface Msg { role: "user" | "assistant"; content: string; actions?: Action[] }

/** The assistant's text with **bold** shown as bold. Nothing else is interpreted, so no markup can slip in. */
function Rich({ text }: { text: string }) {
  return <>{text.split("**").map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part))}</>;
}

const KINDS =["Maintenance notice", "Release notes", "Policy update"];
const IDEAS = [
  "Export all schools list",
  "Which schools need attention?",
  "How many schools are active right now?",
  "Which schools are waiting for approval?",
  "Export overdue invoices",
  "Show open support tickets",
  "Who signed in most recently?",
  "How many schools are in each state?",
  "Open payment gateway",
  "How do I create a new role?",
];

/** The "Ask AI" button in the corner of the Super Admin portal, with its chat panel. */
export function Assist() {
  const pathname = usePathname();
  const router = useRouter();
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
    setText("");
    setError("");
    // "open payment gateway", "go to schools": take the person there
    const dest = findNavigation(content);
    if (dest?.how) {
      // "how can I open the roles page": the path in bold, and a button, nothing more
      setMsgs([...next, { role: "assistant", content: `Open **${dest.label.replaceAll("›", "→")}**.`, actions: [{ kind: "link", label: "Open it", href: dest.href }] }]);
      return;
    }
    if (dest) {
      setMsgs([...next, { role: "assistant", content: `Opening **${dest.label.replaceAll("›", "→")}**.` }]);
      router.push(dest.href);
      window.setTimeout(() => setOpen(false), 350);
      return;
    }
    setMsgs(next);
    setBusy(true);
    try {
      const r = await adminFetch<{ reply: string; actions?: Action[] }>("/assist/chat", json("POST", { messages: next.slice(-12).map((m) => ({ role: m.role, content: m.content })), page: pathname }));
      setMsgs([...next, { role: "assistant", content: r.reply, actions: r.actions }]);
      // an export that was asked for opens its Excel / PDF / CSV window straight away
      const auto = r.actions?.find((a): a is Extract<Action, { kind: "export" }> => a.kind === "export" && a.auto === true);
      if (auto) downloadCsv(auto.name, auto.head, auto.rows);
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
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-br from-[#dceff9] to-white px-5 py-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#026f9b] text-white"><Sparkles className="size-[18px]" aria-hidden="true" /></span>
                <div className="min-w-0"><p className="font-semibold text-[#026f9b]">MCA Assist</p><p className="text-xs leading-snug text-slate-500">Ask about your platform. I answer from live data and can export lists, but never change anything.</p></div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="size-5" aria-hidden="true" /></button>
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
                    <button key={q} type="button" onClick={() => void send(q)} className="block w-full rounded-full border border-slate-200 px-4 py-2 text-left text-sm text-slate-700 transition hover:border-[#026f9b] hover:bg-[#f3f9fd]">{q}</button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-md bg-[#026f9b] text-white" : "rounded-bl-md bg-slate-100 text-slate-800"}`}>{m.role === "user" ? m.content : <Rich text={m.content} />}</div>
                  {!!m.actions?.length && (
                    <div className="flex max-w-[92%] flex-wrap gap-2">
                      {m.actions.map((a, j) => a.kind === "export"
                        ? <button key={j} type="button" onClick={() => downloadCsv(a.name, a.head, a.rows)} className="inline-flex items-center gap-1.5 rounded-full bg-[#026f9b] px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110"><Download className="size-3.5" aria-hidden="true" />{a.label} ({a.rows.length})</button>
                        : <Link key={j} href={a.href} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#026f9b] hover:border-[#026f9b]"><ExternalLink className="size-3.5" aria-hidden="true" />{a.label}</Link>)}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="w-fit rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500" role="status">Thinking…</div>}
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div ref={end} />
            </div>
            )}

            {mode === "ask" && <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
              <textarea
                ref={input}
                rows={2}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
                placeholder="Ask anything about the platform…"
                aria-label="Your question"
                className="min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0294ce] focus:ring-2 focus:ring-[#0294ce]/30"
              />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-[#026f9b] text-white shadow-sm shadow-sky-900/20 transition hover:bg-[#014a67] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0294ce] disabled:bg-[#c0e4f3] disabled:shadow-none"><ArrowUp className="size-5" strokeWidth={2.5} aria-hidden="true" /></button>
            </form>}
          </aside>
        </>
      )}
    </>
  );
}
