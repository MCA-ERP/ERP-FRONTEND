"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { SlotGrid, type Slot } from "./enquiry";
import { Chip, Head, Loading, Note, brandBtn, dmy, printRows, whiteBtn } from "./kit";

interface Assess {
  application: { id: string; code: string; child: string; class_sought: string }; school: string; ready: boolean; rule: string; slots: Slot[];
  booking: { date: string; time: string; panel: string } | null; result: { done: boolean; date: string | null; outcome: string };
}
function useAssessment() {
  const a = useApplicant();
  const id = a.active?.id;
  const r = useLoad(() => (id ? schoolFetch<Assess>(`/applicant/applications/${id}/assessment`) : Promise.resolve(null)), [id]);
  return { id, r, x: r.data, a };
}
const NONE = <Note>Submit an application first. Your assessment is booked here once your documents are verified.</Note>;

// ═════════════ Book a Slot ═════════════
export function BookSlot() {
  const { id, r, x, a } = useAssessment();
  const act = useAction(() => { r.reload(); a.reloadApps(); });
  const [pick, setPick] = useState<Slot | null>(null);
  const confirm = async () => { if (pick && id && await act.run(() => schoolFetch(`/applicant/applications/${id}/assessment/book`, json("POST", { slot_id: pick.id })))) setPick(null); };
  const days = x ? [...new Set(x.slots.map((s) => s.date))] : [];
  return (
    <div>
      <Head title="Book a Slot" subtitle={x ? `For ${x.application.class_sought}: ${x.rule || "an assessment arranged by the school"}.` : "Choose a time for your child's assessment."} />
      <ErrorBanner message={r.error} />
      {!id ? NONE : !x ? <Loading /> : (
        <>
          {x.booking && <Note tone="green">Your slot: <b>{dmy(x.booking.date)}{x.booking.time ? ` at ${x.booking.time}` : ""}</b>. You can change it below until the day.</Note>}
          {!x.ready && <Note tone="amber">Finish your documents first. You can book once every required document is verified.</Note>}
          <Panel title="Choose a slot" sub={days.length ? `${days.length} day${days.length === 1 ? "" : "s"} · ${dmy(days[0])}${days.length > 1 ? ` – ${dmy(days[days.length - 1])}` : ""}` : ""}>
            {!x.slots.length ? <p className="p-6 text-center text-sm text-slate-400">The school has not opened assessment slots yet. You will be notified when they are open.</p> : <div className={x.ready ? "" : "pointer-events-none opacity-60"}><SlotGrid slots={x.slots} onPick={setPick} /></div>}
          </Panel>
          <Modal open={!!pick} title="Book this slot" onClose={() => setPick(null)}>
            {pick && <div className="space-y-4 text-[13px] text-slate-800"><p>{x.application.child}: {dmy(pick.date)} at {pick.time}. The admissions team will see this booking.</p><ErrorBanner message={act.error} /><div className="flex justify-end gap-2"><button type="button" className={whiteBtn} onClick={() => setPick(null)}>Cancel</button><button type="button" className={brandBtn} disabled={act.busy} onClick={() => void confirm()}>{x.booking ? "Change to this slot" : "Book slot"}</button></div></div>}
          </Modal>
        </>
      )}
    </div>
  );
}

// ═════════════ Admit Card ═════════════
export function AdmitCard({ setTab }: { setTab: (t: string) => void }) {
  const { id, r, x } = useAssessment();
  const b = x?.booking;
  return (
    <div>
      <Head title="Admit Card" subtitle="Your admit card appears here after you book a slot." />
      <ErrorBanner message={r.error} />
      {!id ? NONE : !x ? <Loading /> : !b ? <><Note>No slot booked yet.</Note><button type="button" className="w-full rounded-full bg-[#026f9b] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#014a67]" onClick={() => setTab("book-a-slot")}>Book a slot</button></> : (
        <Panel title="Admit card" sub={x.application.code} right={<button type="button" className={whiteBtn} onClick={() => printRows("admit-card", [["School", x.school], ["Application no.", x.application.code], ["Child", x.application.child], ["Class", x.application.class_sought], ["Date", dmy(b.date)], ["Time", b.time], ["Assessment", x.rule]])}>Print</button>}>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-[13px]">{([["School", x.school], ["Application no.", x.application.code], ["Child", x.application.child], ["Class", x.application.class_sought], ["Date", dmy(b.date)], ["Time", b.time], ["Assessment", x.rule]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>
        </Panel>
      )}
    </div>
  );
}

// ═════════════ What to Expect ═════════════
export function WhatToExpect() {
  const { id, r, x } = useAssessment();
  return (
    <div>
      <Head title="What to Expect" subtitle="What happens on the day." />
      <ErrorBanner message={r.error} />
      {!id ? NONE : !x ? <Loading /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><ol className="divide-y divide-slate-100">{([["Arrive 15 minutes early", "Bring the admit card and the originals of your documents."], ["Your child's assessment", x.rule || "The school will tell you how your child is assessed."], ["Parents' conversation", "The school may speak with you about your expectations and its approach."], ["Results", "The school publishes results after the assessment. You see them under Results and in Merit and Offer."]] as [string, string][]).map(([t, d], i) => <li key={t} className="flex gap-3 px-5 py-3.5"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#dceff9] text-[12px] font-bold text-[#026f9b]">{i + 1}</span><span><b className="block text-[13px] text-slate-900">{t}</b><span className="block text-[12px] text-slate-600">{d}</span></span></li>)}</ol></div>
      )}
    </div>
  );
}

// ═════════════ Results ═════════════
export function Results() {
  const { id, r, x } = useAssessment();
  return (
    <div>
      <Head title="Results" subtitle="Assessment results and offers." />
      <ErrorBanner message={r.error} />
      {!id ? NONE : !x ? <Loading /> : (
        <Panel title={x.application.child} sub={x.application.code} right={<Chip tone={x.result.done ? "good" : x.booking ? "info" : "mute"}>{x.result.done ? "Assessment done" : x.booking ? "Booked" : "Not booked"}</Chip>}>
          <p className="px-5 py-4 text-[13px] text-slate-800">{x.result.done ? `The assessment was completed on ${dmy(x.result.date)}. ${x.result.outcome}.` : x.booking ? `Your assessment is on ${dmy(x.booking.date)}${x.booking.time ? ` at ${x.booking.time}` : ""}. Results appear here after the school publishes them.` : "Results are published by the school after the assessment."}</p>
        </Panel>
      )}
    </div>
  );
}
