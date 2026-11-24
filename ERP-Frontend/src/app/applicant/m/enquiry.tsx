"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Field, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { Chip, DataTable, Head, Loading, brandBtn, dmy, has, toneOf, whiteBtn } from "./kit";

// ═════════════ Make an Enquiry ═════════════
interface Enq { classes: string[]; items: { id: string; code: string; asked: string; child: string; class_sought: string; question: string; answer: string; status: string }[] }
export function MakeEnquiry() {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Enq>("/applicant/enquiries"), []);
  const act = useAction(r.reload);
  const [f, setF] = useState({ child: "", class_sought: "", question: "" });
  const [search, setSearch] = useState("");
  const [done, setDone] = useState("");
  const classes = r.data?.classes ?? [];
  const cls = f.class_sought || classes.find((c) => c === (a.active?.class_sought ?? "").replace(/\s*·.*$/, "")) || classes[0] || "";
  const rows = (r.data?.items ?? []).filter((i) => has(i, search));
  const send = async () => { setDone(""); if (await act.run(() => schoolFetch("/applicant/enquiries", json("POST", { ...f, class_sought: cls })))) { setF({ child: "", class_sought: "", question: "" }); setDone("Your enquiry was sent. We reply within one working day."); } };
  return (
    <div>
      <Head title="Make an Enquiry" subtitle="Ask the admissions office anything before you apply. We reply within one working day." />
      <ErrorBanner message={r.error || act.error} />
      <Panel title="Make an enquiry">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Child's name"><input className={inputCls} value={f.child} onChange={(e) => setF({ ...f, child: e.target.value })} maxLength={150} /></Field>
          <Field label="Class sought"><select className={inputCls} value={cls} onChange={(e) => setF({ ...f, class_sought: e.target.value })}>{classes.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Your question"><textarea className={`${inputCls} min-h-24`} placeholder="For example, Do you have a swimming pool?" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} maxLength={500} /></Field></div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{done && <span className="mr-auto text-[12.5px] text-[#065740]">{done}</span>}<button type="button" className={brandBtn} disabled={act.busy || f.child.trim().length < 2 || f.question.trim().length < 3 || !cls} onClick={() => void send()}>Send enquiry</button></div>
      </Panel>
      <div className="mt-5">
        <DataTable title="My enquiries" noun="enquiries" search={search} onSearch={setSearch} exportName="my-enquiries" exportHead={["Ref.", "Asked", "Question", "Answer", "Status"]} exportRows={rows.map((i) => [i.code, dmy(i.asked), i.question, i.answer, i.status])}
          head={["Ref.", "Asked", "Question", "Answer", "Status"]} empty={r.loading ? "Loading…" : "You have not asked anything yet."}
          rows={rows.map((i) => [<span key="c" className="font-mono text-[12px]">{i.code}</span>, dmy(i.asked), <b key="q" className="font-semibold text-slate-900">{i.question}</b>, <span key="a" className="block max-w-[28rem] whitespace-normal">{i.answer || "—"}</span>, <Chip key="s" tone={toneOf(i.status === "Open" ? "Due" : i.status)}>{i.status}</Chip>])} />
      </div>
    </div>
  );
}

// ═════════════ Campus Visit ═════════════
export interface Slot { id: string; date: string; time: string; left: number; mine: boolean }
const short = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** A grid of slots: Free ones can be chosen, Full ones are greyed out, your own is outlined. */
export function SlotGrid({ slots, onPick }: { slots: Slot[]; onPick: (s: Slot) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5 p-4">
      {slots.map((s) => (
        <button key={s.id} type="button" disabled={s.left === 0 && !s.mine} onClick={() => onPick(s)} className={`w-[100px] rounded-xl border px-3 py-2 text-left ${s.mine ? "border-[#0294CE] bg-[#f1f9fd]" : s.left === 0 ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white hover:border-[#0294CE]"}`}>
          <span className="block text-[12.5px] font-semibold">{short(s.date)} · {s.time}</span><span className="block text-[11.5px] text-slate-500">{s.mine ? "Yours" : s.left === 0 ? "Full" : "Free"}</span>
        </button>
      ))}
    </div>
  );
}

export function CampusVisit() {
  const r = useLoad(() => schoolFetch<{ slots: Slot[] }>("/applicant/visits"), []);
  const act = useAction(r.reload);
  const [pick, setPick] = useState<Slot | null>(null);
  const confirm = async () => { if (pick && await act.run(() => schoolFetch("/applicant/visits/book", json("POST", { slot_id: pick.id })))) setPick(null); };
  return (
    <div>
      <Head title="Campus Visit" subtitle="See the classrooms, labs and play areas with an admissions counsellor. Visits take about 45 minutes." />
      <ErrorBanner message={r.error} />
      <Panel title="Book a campus visit" sub="Saturdays and Sundays">
        {!r.data ? <Loading /> : !r.data.slots.length ? <p className="p-6 text-center text-sm text-slate-400">No visit slots are open right now. Send the admissions office a message to arrange one.</p> : <SlotGrid slots={r.data.slots} onPick={(s) => setPick(s)} />}
      </Panel>
      <Modal open={!!pick} title="Book this visit" onClose={() => setPick(null)}>
        {pick && <div className="space-y-4 text-[13px] text-slate-800"><p>{dmy(pick.date)} at {pick.time}. The admissions office will see your booking.</p><ErrorBanner message={act.error} /><div className="flex justify-end gap-2"><button type="button" className={whiteBtn} onClick={() => setPick(null)}>Cancel</button><button type="button" className={brandBtn} disabled={act.busy} onClick={() => void confirm()}>{pick.mine ? "Keep this slot" : "Book visit"}</button></div></div>}
      </Modal>
    </div>
  );
}
