"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { TicketMessage } from "@/lib/admin-api";
import { ErrorBanner, btnPrimary, fmtDate, inputCls } from "./ui";

/** Message list plus a reply box, shared by the admin and school support screens. */
export function TicketThread({
  messages,
  onSend,
  allowInternal = false,
  disabled = false,
}: {
  messages: TicketMessage[];
  onSend: (body: string, internal: boolean) => Promise<void>;
  allowInternal?: boolean;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      await onSend(body.trim(), internal);
      setBody("");
      setInternal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => (
          <li key={m.id} className={`rounded-xl border p-3 text-sm ${m.is_internal ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{m.author_name}</span>
              {m.is_internal && <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-900">Internal note</span>}
              <span>{fmtDate(m.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
          </li>
        ))}
        {messages.length === 0 && <li className="text-sm text-slate-400">No messages yet.</li>}
      </ul>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className={`${inputCls} min-h-[5rem]`}
          placeholder={internal ? "Internal note (the school will not see this)…" : "Write a reply…"}
          aria-label="Reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={disabled}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {allowInternal ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="size-4 accent-mca-blue" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              Internal note
            </label>
          ) : (
            <span />
          )}
          <button type="submit" className={btnPrimary} disabled={sending || disabled || !body.trim()}>
            {sending ? "Sending…" : internal ? "Add note" : "Send reply"}
          </button>
        </div>
      </form>
    </div>
  );
}
