"use client";

import { useEffect, useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { Head, Loading, brandBtn, dmy } from "./kit";

interface Msgs { items: { id: string; mine: boolean; body: string; at: string; application_id: string | null }[] }
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

/** The family's thread with the admissions office. Staff answer from the Admissions portal (Enquiries > Family Portal). */
export function Messages() {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Msgs>("/applicant/messages"), []);
  const contact = useLoad(() => schoolFetch<{ contact: { email: string; phone: string } }>("/applicant/school/overview"), []);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const [text, setText] = useState("");
  useEffect(() => { if (r.data) a.refreshBadges(); }, [r.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => { const body = text.trim(); if (body && await act.run(() => schoolFetch("/applicant/messages", json("POST", { body, application_id: a.active?.id ?? null })))) setText(""); };
  const items = r.data?.items ?? [];
  const c = contact.data?.contact;
  return (
    <div>
      <Head title="Admissions Office" subtitle="Talk to the admissions office. We reply within one working day." />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="Admissions office" sub={[c?.email, c?.phone].filter(Boolean).join(" · ")}>
        <div className="flex max-h-[26rem] min-h-24 flex-col gap-2.5 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!r.data ? <Loading /> : !items.length ? <p className="py-6 text-center text-sm text-slate-400">No messages yet. Ask the office anything about your application.</p> : items.map((m) => (
            <div key={m.id} className={`max-w-[75%] rounded-xl px-4 py-2.5 ${m.mine ? "self-end bg-[#dceff9]" : "self-start bg-[#eef2f5]"}`}>
              <p className="whitespace-pre-wrap text-[13px] text-slate-900">{m.body}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{m.mine ? "You" : "Admissions office"} · {dmy(m.at)} {hm(m.at)}</p>
            </div>
          ))}
        </div>
        <form className="space-y-2 border-t border-slate-100 p-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <label className="block text-xs text-slate-600">Message<textarea className={`${inputCls} mt-1 min-h-20`} value={text} maxLength={1000} placeholder="Type your message" onChange={(e) => setText(e.target.value)} /></label>
          <div className="flex justify-end"><button type="submit" className={brandBtn} disabled={act.busy || !text.trim()}>Send</button></div>
        </form>
      </Panel>
    </div>
  );
}
