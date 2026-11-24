"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Field, inputCls, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { sectionHref } from "./menu-config";
import { send as sendDoc, type DocRow } from "./docs";
import { Chip, Head, Loading, Note, brandBtn, dmy, inr, printRows, redBtn, toneOf, whiteBtn } from "./kit";

const classOnly = (c: string) => c.replace(/\s*·.*$/, "");
const go = (m: string, s: string, tab?: string) => `${sectionHref(m, s)}${tab ? `?tab=${tab}` : ""}`;
interface AppFull { id: string; code: string; child: string; class_sought: string; parent: string; mobile: string; details: Record<string, string>; applied_on: string; submitted_at: string | null; fee_status: string; fee_amount: number | null; draft: boolean }

// ═════════════ My Application (read-only) ═════════════
export function MyApplication() {
  const a = useApplicant();
  const router = useRouter();
  const id = a.active?.id;
  const r = useLoad(() => (id ? schoolFetch<AppFull>(`/applicant/applications/${id}`) : Promise.resolve(null)), [id]);
  const x = r.data;
  const d = x?.details ?? {};
  const sections: [string, [string, string][]][] = x ? [
    ["1. Child", [["Name", x.child], ["Date of birth", d.dob ? dmy(d.dob) : ""], ["Gender", d.gender], ["Class sought", x.class_sought], ["Blood group", d.blood_group], ["Current school", d.prev_school], ["Languages at home", d.languages]]],
    ["2. Parents", [["Father", [d.father_name, d.father_occupation].filter(Boolean).join(" · ")], ["Mother", [d.mother_name, d.mother_occupation].filter(Boolean).join(" · ")], ["Parent or guardian", x.parent], ["Mobile", x.mobile], ["Email", d.email], ["Sibling in school", d.sibling || "None"]]],
    ["3. Address and transport", [["Address", d.address], ["School transport", d.transport === "Yes" ? `Yes${d.transport_stop ? ` · ${d.transport_stop}` : ""}` : d.transport === "No" ? "No" : ""], ["Health notes", d.health_notes]]],
  ] : [];
  return (
    <div>
      <Head title="My Application" subtitle={x?.submitted_at ? `The application you submitted on ${dmy(x.submitted_at)}. To correct anything, message the admissions office.` : "The application you submit appears here."} action={x?.submitted_at ? <button type="button" className={whiteBtn} onClick={() => printRows(`application-${x.code}`, sections.flatMap(([t, rows]) => [[t, ""] as [string, string], ...rows.filter(([, v]) => v)]))}>Download PDF</button> : undefined} />
      <ErrorBanner message={r.error} />
      {!id ? <Note>You have no application yet. <button type="button" className="font-semibold text-[#0294CE]" onClick={() => router.push(go("application", "application", "new-application"))}>Start one</button>.</Note> : !x ? <Loading /> : (
        <>
          <Note tone={x.submitted_at ? "green" : "amber"}><b className="font-mono">{x.code}</b> · {x.submitted_at ? `submitted ${dmy(x.submitted_at)}` : "draft, not submitted"} · application fee {x.fee_status === "Paid" ? `${inr(x.fee_amount ?? 0)} paid` : x.fee_status.toLowerCase()}{!x.submitted_at && <> · <button type="button" className="font-semibold text-[#0294CE]" onClick={() => router.push(go("application", "application", "new-application"))}>Continue the form</button></>}</Note>
          <div className="grid gap-5 lg:grid-cols-2">
            {sections.map(([title, rows]) => <Panel key={title} title={title}><dl className="grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-[13px]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v || "—"}</dd></div>)}</dl></Panel>)}
            <Panel title="4. Declaration"><div className="space-y-2 px-5 py-4 text-[13px] text-slate-800"><p>We confirm the information is correct and agree to the school&apos;s admission policy.</p>{d.declared_by ? <p className="text-slate-500">Signed electronically by {d.declared_by} · {dmy(d.declared_on)}</p> : <p className="text-slate-500">Not signed yet. You sign when you submit.</p>}</div></Panel>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════ Eligibility Check ═════════════
interface Prog { name: string; classes: string[]; group: string; left: number; assessment: string; min_age: number; overall_pct: number | null; rule: string }
interface Progs { year: string; items: Prog[] }
const GROUPS = ["Pre-primary", "Primary", "Middle and secondary", "Senior secondary", "Board classes · transfer only"];
export const START_KEY = "applicant-start";

export function EligibilityCheck({ setTab }: { setTab: (t: string) => void }) {
  const r = useLoad(() => schoolFetch<Progs>("/applicant/programmes"), []);
  const [pick, setPick] = useState("");
  const [dob, setDob] = useState("");
  const [out, setOut] = useState<{ state: string; message: string } | null>(null);
  const act = useAction(() => undefined);
  const items = r.data?.items ?? [];
  const prog = items.find((p) => p.name === pick) ?? items[0];
  const check = async () => { setOut(null); if (prog) await act.run(async () => { setOut(await schoolFetch("/applicant/eligibility", json("POST", { programme: prog.name, dob }))); }); };
  const start = () => { try { sessionStorage.setItem(START_KEY, JSON.stringify({ programme: prog?.name, dob })); } catch { /* storage unavailable */ } setTab("new-application"); };
  return (
    <div>
      <Head title="Eligibility Check" subtitle="Choose a programme and check eligibility before you apply. It takes a few seconds and nothing is submitted." />
      <ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : (
        <>
          <Panel title="1. Choose a programme" sub={`Admissions ${r.data.year}`}>
            {!items.length ? <p className="p-6 text-center text-sm text-slate-400">The school has not set up its programmes yet.</p> : (
              <div className="grid gap-4 p-4 lg:grid-cols-5">{GROUPS.map((g) => { const list = items.filter((p) => p.group === g); return list.length ? <div key={g} className="space-y-2.5"><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">{g}</p>{list.map((p) => <button key={p.name} type="button" onClick={() => { setPick(p.name); setOut(null); }} className={`w-full rounded-xl border px-3 py-2.5 text-left ${prog?.name === p.name ? "border-[#0294CE] bg-[#eaf6fc]" : "border-slate-200 bg-white hover:border-slate-400"}`}><b className="block text-[13px] text-slate-900">{p.name}</b><span className="block text-[11.5px] text-slate-600">{p.left} seats left · {p.assessment}</span></button>)}</div> : <div key={g} />; })}</div>
            )}
          </Panel>
          {prog && (
            <div className="mt-5"><Panel title={`2. Check eligibility · ${prog.name}`}>
              <div className="space-y-3 p-5"><Field label="Date of birth"><input type="date" className={`${inputCls} max-w-xs`} value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDob(e.target.value); setOut(null); }} /></Field><p className="text-[12.5px] text-slate-600">Rules: {prog.rule} · assessment: {prog.assessment}.</p>
                {out && <Note tone={out.state === "Eligible" ? "green" : out.state === "Not eligible" ? "amber" : "blue"}><b>{out.state}.</b> {out.message}</Note>}</div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{out && out.state !== "Not eligible" && <button type="button" className={whiteBtn} onClick={start}>Start application</button>}<button type="button" className={brandBtn} disabled={!dob || act.busy} onClick={() => void check()}>Check eligibility</button></div>
            </Panel></div>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════ New Application ═════════════
const STEPS = ["Child", "About your child", "Documents", "Review"];
export function NewApplication() {
  const a = useApplicant();
  const router = useRouter();
  const progs = useLoad(() => schoolFetch<Progs>("/applicant/programmes"), []);
  const draft = a.active?.draft ? a.active : null;
  const [appId, setAppId] = useState<string | null>(draft?.id ?? null);
  const [step, setStep] = useState(1);
  const [programme, setProgramme] = useState("");
  const [cls, setCls] = useState("");
  const [f, setF] = useState<Record<string, string>>({ child: "", gender: "Female" });
  const act = useAction(() => undefined);
  const [saved, setSaved] = useState("");
  const [agree, setAgree] = useState(false);
  const set = (k: string, v: string) => { setF((x) => ({ ...x, [k]: v })); setSaved(""); };
  useEffect(() => { // a draft is picked up where it was left; "Start application" from the eligibility check brings the programme and date of birth
    let live = true;
    (async () => {
      try { const s = sessionStorage.getItem(START_KEY); if (s && !draft) { const v = JSON.parse(s) as { programme?: string; dob?: string }; if (live) { if (v.programme) setProgramme(v.programme); if (v.dob) setF((x) => ({ ...x, dob: v.dob as string })); } } } catch { /* ignore */ }
      if (draft) { try { const x = await schoolFetch<AppFull>(`/applicant/applications/${draft.id}`); if (live) { setF({ ...x.details, child: x.child }); setCls(classOnly(x.class_sought)); } } catch { /* shown on save */ } }
    })();
    return () => { live = false; };
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = progs.data?.items ?? [];
  const prog = items.find((p) => p.name === programme) ?? (draft ? items.find((p) => p.classes.includes(classOnly(draft.class_sought))) : undefined) ?? items[0];
  const klass = cls && prog?.classes.includes(cls) ? cls : prog?.classes[0] ?? "";
  const fees = useLoad(() => (appId ? schoolFetch<{ items: { lines: { key: string; label: string; amount: number; status: string }[] }[] }>(`/applicant/fees?application=${appId}`) : Promise.resolve(null)), [appId, step]);
  const docs = useLoad(() => (appId && step === 3 ? schoolFetch<{ items: DocRow[] }>(`/applicant/applications/${appId}/documents`) : Promise.resolve(null)), [appId, step]);
  const { child, ...details } = f;
  const clean = Object.fromEntries(Object.entries(details).filter(([k, v]) => v && !["declared_by", "declared_on", "stream", "category", "last_reminded_on", "notes"].includes(k)));
  const save = async (next?: number) => {
    const ok = await act.run(async () => {
      if (!appId) { const r = await schoolFetch<{ id: string }>("/applicant/applications", json("POST", { programme: prog?.name, class_sought: klass, child, details: clean })); setAppId(r.id); a.setActive(r.id); a.reloadApps(); }
      else await schoolFetch(`/applicant/applications/${appId}`, json("PATCH", { child, ...clean }));
    });
    if (ok) { setSaved("Saved as a draft."); if (next) setStep(next); }
  };
  const submit = async () => { if (appId && await act.run(() => schoolFetch(`/applicant/applications/${appId}/submit`, json("POST", {})))) { try { sessionStorage.removeItem(START_KEY); } catch { /* ignore */ } a.reloadApps(); a.refreshBadges(); router.push(go("dashboard", "application-status")); } };
  const pickDoc = async (file: File | undefined, docType: string) => {
    if (!file || !appId) return;
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) return setSaved("Upload a PDF, JPG or PNG file.");
    if (file.size > 5 * 1024 * 1024) return setSaved("The file is larger than 5 MB.");
    if (await act.run(() => sendDoc(appId, docType, file))) { setSaved(`${docType} uploaded.`); docs.reload(); }
  };
  const feeLine = fees.data?.items[0]?.lines.find((l) => l.key === "application_fee");
  const txt = (k: string, label: string, ph = "", type = "text") => <Field label={label}><input type={type} className={inputCls} placeholder={ph} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} maxLength={150} /></Field>;
  return (
    <div>
      <Head title="New Application" subtitle={`Apply for ${klass || "a class"}. The form asks only what this programme needs; your answers are saved as a draft as you go.`} />
      <ErrorBanner message={progs.error || act.error} />
      {!progs.data ? <Loading /> : !prog ? <Note>The school has not set up its programmes yet.</Note> : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-[#bfe0f0] bg-[#f1f9fd] px-4 py-1.5 text-[13px] text-[#026f9b]">Programme
              <select className="bg-transparent font-semibold text-slate-900 outline-none" value={prog.name} disabled={!!appId} onChange={(e) => { setProgramme(e.target.value); setCls(""); }}>{items.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
            {prog.classes.length > 1 && <label className="flex items-center gap-2 text-[13px] text-slate-600">Class<select className={`${inputCls} py-1`} value={klass} disabled={!!appId} onChange={(e) => setCls(e.target.value)}>{prog.classes.map((c) => <option key={c}>{c}</option>)}</select></label>}
            <span className="text-[12.5px] text-slate-600">{prog.assessment} · {prog.left} seats left</span>
          </div>
          <ol className="mb-4 flex flex-wrap gap-2">{STEPS.map((s, i) => <li key={s}><button type="button" disabled={!appId && i > 0} onClick={() => setStep(i + 1)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] ${step === i + 1 ? "border-[#0294CE] bg-white font-semibold text-slate-900" : "border-slate-200 bg-white/60 text-slate-600"}`}><span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${step === i + 1 ? "bg-[#026f9b] text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>{s}</button></li>)}</ol>
          {step === 1 && (
            <Panel title="1. Child">
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
                {txt("child", "Child's full name")}{txt("dob", "Date of birth", "", "date")}
                <Field label="Gender"><select className={inputCls} value={f.gender ?? "Female"} onChange={(e) => set("gender", e.target.value)}>{["Female", "Male", "Other"].map((g) => <option key={g}>{g}</option>)}</select></Field>
                {txt("languages", "Languages spoken at home", "For example, English, Telugu")}{txt("prev_school", "Pre-school", "Name and city")}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span className="mr-auto text-[12.5px] text-[#065740]">{saved}</span>}<button type="button" className={brandBtn} disabled={act.busy || (f.child ?? "").trim().length < 2 || !f.dob} onClick={() => void save(2)}>Save and continue</button></div>
            </Panel>
          )}
          {step === 2 && (
            <Panel title="2. About your child">
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {txt("father_name", "Father's name")}{txt("father_occupation", "Father's occupation")}{txt("blood_group", "Blood group")}
                {txt("mother_name", "Mother's name")}{txt("mother_occupation", "Mother's occupation")}{txt("email", "Email", "", "email")}
                {txt("sibling", "Sibling in school", "Name and class, or leave empty")}
                <Field label="School transport"><select className={inputCls} value={f.transport ?? ""} onChange={(e) => set("transport", e.target.value)}><option value="">Choose</option><option>Yes</option><option>No</option></select></Field>
                {f.transport === "Yes" && txt("transport_stop", "Pick-up stop")}
                <div className="sm:col-span-2 lg:col-span-3"><Field label="Address"><textarea className={`${inputCls} min-h-20`} value={f.address ?? ""} maxLength={300} onChange={(e) => set("address", e.target.value)} /></Field></div>
                <div className="sm:col-span-2 lg:col-span-3"><Field label="Health notes (optional)"><input className={inputCls} value={f.health_notes ?? ""} maxLength={300} onChange={(e) => set("health_notes", e.target.value)} /></Field></div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span className="mr-auto text-[12.5px] text-[#065740]">{saved}</span>}<button type="button" className={whiteBtn} onClick={() => setStep(1)}>Back</button><button type="button" className={brandBtn} disabled={act.busy} onClick={() => void save(3)}>Save and continue</button></div>
            </Panel>
          )}
          {step === 3 && (
            <Panel title="3. Documents" sub="PDF, JPG or PNG, up to 5 MB each">
              {!docs.data ? <Loading /> : <ul className="divide-y divide-slate-100">{docs.data.items.map((d) => <li key={d.doc_type} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]"><span className="text-slate-900">{d.doc_type}</span><span className="flex items-center gap-2"><Chip tone={d.required ? "info" : "mute"}>{d.required ? "Required" : "Optional"}</Chip><Chip tone={d.status === "Not uploaded" ? "mute" : d.status === "Under review" ? "info" : toneOf(d.status)}>{d.status}</Chip>{d.status !== "Verified" && <label className={`cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-900 shadow-sm hover:border-slate-400 ${act.busy ? "pointer-events-none opacity-60" : ""}`}>{d.has_file ? "Re-upload" : "Upload"}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg" onChange={(e) => { void pickDoc(e.target.files?.[0], d.doc_type); e.target.value = ""; }} /></label>}</span></li>)}</ul>}
              <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3"><button type="button" className={whiteBtn} onClick={() => setStep(2)}>Back</button><button type="button" className={whiteBtn} onClick={() => router.push(go("documents", "upload-documents"))}>Open Documents</button><button type="button" className={brandBtn} onClick={() => setStep(4)}>Continue</button></div>
            </Panel>
          )}
          {step === 4 && (
            <Panel title="4. Review">
              <div className="space-y-3 p-5 text-[13px] text-slate-800">
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2">{([["Child", f.child], ["Class", klass], ["Date of birth", f.dob ? dmy(f.dob) : ""], ["Gender", f.gender], ["Father", [f.father_name, f.father_occupation].filter(Boolean).join(" · ")], ["Mother", [f.mother_name, f.mother_occupation].filter(Boolean).join(" · ")], ["Address", f.address]] as [string, string][]).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd>{v || "—"}</dd></div>)}</dl>
                {feeLine && feeLine.status === "Due" && <Note tone="amber">The application fee of <b>{inr(feeLine.amount)}</b> must be paid before you submit. <button type="button" className="font-semibold text-[#0294CE]" onClick={() => router.push(go("fees", "fees-and-payment"))}>Pay now</button></Note>}
                {!f.dob && <Note tone="amber">Add the child&apos;s date of birth in step 1.</Note>}
                <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>We confirm the information is correct and agree to the school&apos;s admission policy.</span></label>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3"><button type="button" className={whiteBtn} onClick={() => setStep(3)}>Back</button><button type="button" className={redBtn.replace("px-6 py-2.5 text-[15px]", "px-5 py-2 text-[13px]")} disabled={act.busy || !agree || !f.dob || feeLine?.status === "Due"} onClick={() => void submit()}>Submit application</button></div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════ My Applications ═════════════
interface Mine { items: { id: string; code: string; child: string; class_sought: string; applied_on: string; draft: boolean; label: string; steps: { n: number; label: string; state: string }[] }[] }
export function MyApplications({ setTab }: { setTab: (t: string) => void }) {
  const a = useApplicant();
  const r = useLoad(() => schoolFetch<Mine>("/applicant/applications"), []);
  return (
    <div>
      <Head title="My Applications" subtitle="Every application from your account, each with its own progress. Siblings applying to different classes are tracked separately." action={<button type="button" className={redBtn} onClick={() => { a.setActive(""); setTab("eligibility-check"); }}>New application</button>} />
      <ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : !r.data.items.length ? <Note>You have not started an application yet.</Note> : (
        <div className="space-y-4">{r.data.items.map((x) => (
          <Panel key={x.id} title={`${x.child} · ${classOnly(x.class_sought)}`} sub={`${x.code} · ${x.draft ? "draft" : `submitted ${dmy(x.applied_on)}`}`} right={<span className="flex items-center gap-2"><Chip tone={toneOf(x.label)}>{x.label}</Chip><button type="button" className={whiteBtn.replace("px-4 py-2", "px-3 py-1")} onClick={() => { a.setActive(x.id); setTab(x.draft ? "new-application" : "my-application"); }}>{x.draft ? "Continue" : "Open"}</button></span>}>
            <ol className="grid gap-2 p-4" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{x.steps.slice(1).map((s, i) => <li key={s.n} className="flex flex-col items-center gap-1.5 text-center text-[11px] text-slate-600"><span className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${s.state === "done" ? "bg-[#1b7a55] text-white" : s.state === "current" ? "border-2 border-[#0294CE] text-[#026f9b]" : "border border-slate-300 text-slate-500"}`}>{s.state === "done" ? "✓" : i + 1}</span><span className={s.state === "current" ? "font-semibold text-slate-900" : ""}>{s.label.replace("Application submitted", "Submitted").replace("Admission confirmed", "Confirmed")}</span></li>)}</ol>
          </Panel>
        ))}</div>
      )}
    </div>
  );
}

// ═════════════ Merit and Offer ═════════════
interface Merit { items: { id: string; code: string; child: string; class_sought: string; status: string; rank: number | null; state: string; offer: { status: string; accept_by: string; offered_on: string; category: string; amount: number; expired: boolean } | null }[] }
export function MeritOffer() {
  const router = useRouter();
  const r = useLoad(() => schoolFetch<Merit>("/applicant/merit"), []);
  const act = useAction(r.reload);
  return (
    <div>
      <Head title="Merit and Offer" subtitle="Where each application stands in selection: merit rank or waitlist number, and the offer with its deadline. Accept and pay here to confirm the seat." />
      <ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : (
        <>
          {r.data.items.map((x) => (
            <div key={x.id} className="mb-4"><Panel title={`${x.child} · ${classOnly(x.class_sought)}`} sub={x.code} right={<Chip tone={toneOf(x.state)}>{x.rank && !x.offer ? `Rank ${x.rank} · ${x.state}` : x.state}</Chip>}>
              <div className="space-y-3 px-5 py-4 text-[13px] text-slate-800">
                {x.offer ? <>
                  <p>{x.offer.status === "Fee paid" || x.offer.status === "Confirmed" ? `The seat is confirmed: the admission fee was received. The school will complete registration and class allocation.` : x.offer.expired || x.offer.status === "Expired" ? "This offer has expired." : <>The school has offered {x.child} a seat in <b>{classOnly(x.class_sought)}</b> ({x.offer.category}). Accept by <b>{dmy(x.offer.accept_by)}</b> and pay <b>{inr(x.offer.amount)}</b> (admission fee and caution deposit) to confirm it.</>}</p>
                  {x.offer.status === "Offered" && !x.offer.expired && <div className="flex gap-2"><button type="button" className={brandBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`/applicant/offers/${x.id}/accept`, json("POST", {})))}>Accept offer</button></div>}
                  {x.offer.status === "Accepted" && !x.offer.expired && <div className="flex items-center gap-3"><Chip tone="good">Offer accepted</Chip><button type="button" className={brandBtn} onClick={() => router.push(go("fees", "fees-and-payment"))}>Pay now</button></div>}
                </> : <p>{x.state === "Not yet ranked" ? "The merit list is published after the assessments. You will see the rank here the same day." : x.state === "Waitlisted" ? "Your child is on the waitlist. If a seat opens, the offer appears here." : x.state === "Not selected" ? "Your child was not selected this round." : `Your child is ranked ${x.rank}.`}</p>}
              </div>
            </Panel></div>
          ))}
          <Note>Applications you submit in New Application show their merit rank and offer here.</Note>
        </>
      )}
    </div>
  );
}

// ═════════════ Admission Letter ═════════════
export function AdmissionLetter() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; code: string; child: string; status: string; text: string }[] }>("/applicant/letter"), []);
  return (
    <div>
      <Head title="Admission Letter" subtitle="Your offer letter appears here once results are out." />
      <ErrorBanner message={r.error} />
      {!r.data ? <Loading /> : !r.data.items.length ? <Note>No offer yet. You will see your letter here as soon as results are published.</Note> : r.data.items.map((l) => (
        <div key={l.id} className="mb-4"><Panel title={l.child} sub={l.code} right={<span className="flex items-center gap-2"><Chip tone={toneOf(l.status)}>{l.status}</Chip><button type="button" className={whiteBtn.replace("px-4 py-2", "px-3 py-1")} onClick={() => printRows(`admission-letter-${l.code}`, l.text.split("\n").map((t) => [t, ""] as [string, string]))}>Print</button></span>}>
          <div className="whitespace-pre-line px-5 py-4 text-[13.5px] leading-relaxed text-slate-900">{l.text}</div>
        </Panel></div>
      ))}
    </div>
  );
}
