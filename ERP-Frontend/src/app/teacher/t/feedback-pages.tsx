"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { Bars, SearchBox, blueBtn } from "./ui";

interface Fb { survey: { title: string; closes_on: string } | null; answers: number; enough: boolean; min: number; overall: number | null; school_average: number | null; groups: string[]; scores: { text: string; average: number; school: number | null }[]; strongest: { text: string; average: number } | null; to_work_on: { text: string; average: number } | null; comments: string[] }

export function StudentFeedback() {
  const { data, error, loading } = useLoad(() => schoolFetch<Fb>("/teacher/my-feedback"), []);
  const d = data;
  return (
    <div data-report>
      <Head title="Student Feedback" subtitle={`What your students said in the ${d?.survey?.title ?? "feedback"} survey. It is anonymous: you see only averages and moderated comments.`} />
      <ErrorBanner message={error} />
      <Loading on={loading && !d} />
      {d && !d.survey && <Panel title="Student feedback"><Empty text="No student feedback survey has results for you yet." /></Panel>}
      {d && d.survey && !d.enough && <Panel title="Student feedback"><Empty text={`Results appear once at least ${d.min} students have answered, so no one can be identified. ${d.answers} ${d.answers === 1 ? "has" : "have"} answered so far.`} /></Panel>}
      {d && d.survey && d.enough && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Your overall", value: <>{d.overall} <span className="text-base font-semibold">/ 5</span></>, sub: d.school_average === null ? undefined : `School average ${d.school_average}` }, { label: "Answers", value: d.answers, sub: d.groups.length ? `From ${d.groups.join(", ")}` : undefined }, { label: "Strongest", value: <span className="text-[22px] leading-tight">{d.strongest?.text ?? "—"}</span>, sub: d.strongest ? `${d.strongest.average} / 5` : undefined }, { label: "To work on", value: <span className="text-[22px] leading-tight">{d.to_work_on?.text ?? "—"}</span>, sub: d.to_work_on ? `${d.to_work_on.average} / 5` : undefined }]} />
          <Panel title="Your scores" sub={d.school_average === null ? undefined : `Compared with the school average ${d.school_average}`}>
            <Bars rows={d.scores.map((s) => ({ label: `${s.text} · ${s.average}`, value: Math.round((s.average / 5) * 100), note: String(Math.round((s.average / 5) * 100)) }))} />
          </Panel>
          <Panel title="What students wrote" sub="Moderated, without names">
            {!d.comments.length ? <Empty text="No comment has been approved for you yet." /> : <ul className="space-y-2 p-4">{d.comments.map((c, i) => <li key={i} className="rounded-lg border-l-[3px] border-[#026f9b] bg-slate-50 px-4 py-2.5 text-[13px] text-slate-900">“{c}”</li>)}</ul>}
          </Panel>
        </div>
      )}
    </div>
  );
}

interface Survey { id: string; title: string; closes_on: string; anonymous: boolean; state: string }
interface Form { id: string; title: string; anonymous: boolean; closes_on: string; questions: { id: string; text: string; kind: string; options: string[] }[] }
type Ans = { rating?: number; choice?: string; text?: string };

export function StaffSurvey() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Survey[] }>("/teacher/surveys"), []);
  const [form, setForm] = useState<Form | null>(null);
  const act = useAction(() => { reload(); setForm(null); });
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Record<string, Ans>>({});
  const [err, setErr] = useState("");
  const items = (data?.items ?? []).filter((s) => !q || s.title.toLowerCase().includes(q.toLowerCase()));
  const open = async (s: Survey) => { setErr(""); try { setAns({}); setForm(await schoolFetch<Form>(`/teacher/surveys/${s.id}`)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the survey."); } };
  const ready = !!form && form.questions.every((x) => (x.kind === "Rating 1 – 5" ? !!ans[x.id]?.rating : x.kind === "Multiple choice" ? !!ans[x.id]?.choice : true));
  return (
    <div data-report>
      <Head title="Staff Survey" subtitle="Surveys from the school. It takes about 3 minutes." />
      <ErrorBanner message={error || err || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Surveys for you" sub={`${data.items.length} surveys`} right={<ExportPrint name="staff-surveys" head={["Survey", "Closes", "Anonymous", "Status"]} rows={items.map((s) => [s.title, s.closes_on, s.anonymous ? "Yes" : "No", s.state])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search surveys for you" /></div>
          <SimpleTable head={[{ h: "Survey" }, { h: "Closes" }, { h: "Anonymous" }, { h: "Status" }, { h: "" }]} empty="No survey has been sent to staff." rows={items.map((s) => [<b key="t" className="font-semibold text-slate-900">{s.title}</b>, day(s.closes_on), s.anonymous ? "Yes" : "No", <Chip key="s" tone={s.state === "Open" ? "warn" : s.state === "Answered" ? "good" : "mute"}>{s.state}</Chip>, s.state === "Open" ? <button key="a" type="button" className={blueBtn} onClick={() => void open(s)}>Answer now</button> : null])} />
        </Panel>
      )}
      {form && (
        <Modal open title={form.title} onClose={() => setForm(null)}>
          <ErrorBanner message={act.error} />
          <p className="mb-3 text-[12px] text-slate-600">{form.anonymous ? "Your answers are anonymous." : "The school can see who answered."} Closes {day(form.closes_on)}.</p>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {form.questions.map((x) => (
              <div key={x.id}><p className="mb-1.5 text-[13px] font-medium text-slate-900">{x.text}</p>
                {x.kind === "Rating 1 – 5" && <span role="radiogroup" aria-label={x.text} className="flex gap-4">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex items-center gap-1 text-[12.5px] text-slate-700"><input type="radio" name={x.id} checked={ans[x.id]?.rating === n} onChange={() => setAns({ ...ans, [x.id]: { rating: n } })} className="size-3.5 accent-[#0294CE]" />{n}</label>)}</span>}
                {x.kind === "Multiple choice" && <span role="radiogroup" aria-label={x.text} className="flex flex-wrap gap-x-4 gap-y-1">{x.options.map((o) => <label key={o} className="flex items-center gap-1.5 text-[12.5px] text-slate-700"><input type="radio" name={x.id} checked={ans[x.id]?.choice === o} onChange={() => setAns({ ...ans, [x.id]: { choice: o } })} className="size-3.5 accent-[#0294CE]" />{o}</label>)}</span>}
                {x.kind === "Written answer" && <textarea className={`${inputCls} min-h-[4rem]`} maxLength={1000} aria-label={x.text} value={ans[x.id]?.text ?? ""} onChange={(e) => setAns({ ...ans, [x.id]: { text: e.target.value } })} />}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => setForm(null)}>Cancel</button><button type="button" disabled={!ready || act.busy} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => void act.run(() => schoolFetch(`/teacher/surveys/${form.id}`, json("POST", { answers: form.questions.map((x) => ({ question_id: x.id, ...ans[x.id] })).filter((a) => a.rating || a.choice || a.text) })))}>Submit</button></div>
        </Modal>
      )}
    </div>
  );
}
