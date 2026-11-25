"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { Field } from "../../school/s/fo-pages";
import { Head } from "../../teacher/t/head";
import { pill, solid } from "./ui";

/** The monthly or end-of-probation review. It records a recommendation; HR confirms, extends or ends on the On Probation tab. */
const AREAS = ["Subject knowledge / job skills", "Planning and preparation", "Classroom management / quality of work", "Relationship with students and parents", "Punctuality and attendance", "Follows school policies"];
interface Row { id: string; name: string; status: string }

export function ProbationReview() {
  const p = useLoad(() => schoolFetch<{ items: Row[] }>("/school/hr/probation"), []);
  const act = useAction(() => p.reload());
  const open = (p.data?.items ?? []).filter((i) => ["On probation", "Extended"].includes(i.status));
  const blank = { id: "", kind: "End of probation", recommendation: "Confirm", comments: "" };
  const [f, setF] = useState(blank); const [stars, setStars] = useState<number[]>(AREAS.map(() => 0)); const [msg, setMsg] = useState("");
  const id = f.id || open[0]?.id || "";
  const clear = () => { setF(blank); setStars(AREAS.map(() => 0)); };
  const send = async (e: FormEvent) => {
    e.preventDefault(); setMsg("");
    const who = open.find((i) => i.id === id)?.name ?? "";
    if (await act.run(() => schoolFetch(`/school/hr/probation/${id}/review`, json("POST", { kind: f.kind, ratings: stars, recommendation: f.recommendation, comments: f.comments })))) { clear(); setMsg(`Review of ${who} saved.`); }
  };
  return (
    <form onSubmit={send} className="space-y-4"><Head title="Probation Review" subtitle="Monthly or end-of-probation review by the reporting manager." /><ErrorBanner message={p.error || act.error} />
      {msg && <p className="rounded-xl border border-[#bfe3d5] bg-[#eef8f3] px-4 py-2.5 text-[13px] text-[#065740]">{msg}</p>}
      <Panel title="Probation review">
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Staff"><select className={inputCls} value={id} onChange={(e) => setF({ ...f, id: e.target.value })}>{!open.length && <option value="">{p.loading ? "Loading…" : "Nobody is on probation"}</option>}{open.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
            <Field label="Review"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option>Monthly</option><option>End of probation</option></select></Field>
          </div>
          <ul className="divide-y divide-slate-100 border-b border-slate-100">{AREAS.map((a, k) => <li key={a} className="flex items-center justify-between gap-3 py-2.5 text-[13px] text-slate-900"><span>{a}</span><span className="flex gap-0.5" role="group" aria-label={a}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${a}: ${n} of 5`} aria-pressed={stars[k] === n} onClick={() => setStars(stars.map((v, i) => (i === k ? n : v)))} className={`text-lg leading-none ${n <= stars[k] ? "text-[#d9902f]" : "text-slate-400"}`}>★</button>)}</span></li>)}</ul>
          <div className="max-w-[14rem]"><Field label="Recommendation"><select className={inputCls} value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })}><option value="Confirm">Confirm</option><option value="Extend">Extend 3 months</option><option value="End">End probation</option></select></Field></div>
          <Field label="Comments"><textarea className={inputCls} rows={3} maxLength={500} value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={pill} onClick={() => { clear(); setMsg(""); }}>Clear</button><button type="submit" className={solid} disabled={act.busy || !id || stars.some((n) => !n)}>Submit review</button></div>
      </Panel>
    </form>
  );
}
