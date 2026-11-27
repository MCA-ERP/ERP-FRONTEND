"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Lock } from "lucide-react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { ErrorBanner, Modal, inputCls } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { useParent } from "../context";
import { sectionHref } from "./menu-config";
import { Empty, Lbl, Loaded, Note, Pairs, Status, bluePill, dmy, pill, useGet } from "./kit";

const field = `${inputCls} !py-1.5 text-[12.5px]`;
const INCOME = ["Below ₹3 lakh", "₹3 – 6 lakh", "₹6 – 12 lakh", "₹12 – 18 lakh", "₹18 – 24 lakh", "Above ₹24 lakh"];

interface Name { name: string; editable: boolean }
interface Profile { parent_id: string; father: Name; mother: Name; guardian: Name; mobile: string; email: string; occupation: string; income_band: string; address: string; emergency_name: string; emergency_phone: string }
const formOf = (p: Profile) => ({ father_name: p.father.name, mother_name: p.mother.name, guardian_name: p.guardian.name, email: p.email, occupation: p.occupation, income_band: p.income_band, address: p.address, emergency_name: p.emergency_name, emergency_phone: p.emergency_phone });

export function ParentMaster() {
  const r = useGet<Profile>("/parent/profile");
  return (
    <>
      <Head title="Parent Master" subtitle="Your family's details on record with the school. Keep your mobile and emergency contact up to date." />
      <Loaded r={r}>{(p) => <MasterForm key={JSON.stringify(p)} p={p} reload={r.reload} />}</Loaded>
    </>
  );
}

function MasterForm({ p, reload }: { p: Profile; reload: () => void }) {
  const { refreshMe } = useParent();
  const [f, setF] = useState(formOf(p));
  const [done, setDone] = useState("");
  const [mobile, setMobile] = useState(false);
  const act = useAction(() => { reload(); refreshMe(); });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setDone(""); };
  const save = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    // only what changed is sent, so a name the office keeps is never rewritten by accident
    const before = formOf(p); const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== before[k as keyof typeof f]));
    if (!Object.keys(changed).length) { setDone("Nothing has changed."); return; }
    await act.run(async () => { const x = await schoolFetch<{ asked: string[] }>("/parent/profile", json("PUT", changed)); setDone(x.asked.length ? `Saved. The school office was asked to add the ${x.asked.join(" and ")}.` : "Details saved."); });
  };
  const name = (label: string, k: "father_name" | "mother_name" | "guardian_name", n: Name, hint?: string) => (
    <Lbl label={label}><input className={field} maxLength={200} value={f[k]} onChange={set(k)} disabled={!n.editable} placeholder={hint} />{!n.editable && <span className="mt-1 block text-[11px] text-slate-500">Only the school office can change this.</span>}</Lbl>
  );
  return (
    <form onSubmit={save}>
      <Panel title="Parent master information">
        <ErrorBanner message={act.error} />
        <div className="grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Lbl label="Parent ID"><input className={field} value={p.parent_id || "Not given yet"} disabled /></Lbl>
          {name("Father name", "father_name", p.father)}
          {name("Mother name", "mother_name", p.mother)}
          {name("Guardian name (optional)", "guardian_name", p.guardian, "Only if someone else looks after the child")}
          <Lbl label="Mobile number"><input className={field} value={p.mobile || "Not on record"} disabled /><span className="mt-1 block text-[11px] text-slate-500"><Lock className="mr-1 inline h-3 w-3 text-[#b7791f]" aria-hidden="true" />Only the School Admin can change this.<br /><button type="button" className="font-semibold text-[#026f9b] hover:underline" onClick={() => setMobile(true)}>Request a change</button></span></Lbl>
          <Lbl label="Email address"><input className={field} type="email" maxLength={255} value={f.email} onChange={set("email")} /></Lbl>
          <Lbl label="Occupation"><input className={field} maxLength={100} value={f.occupation} onChange={set("occupation")} /></Lbl>
          <Lbl label="Annual income (optional)"><select className={field} value={f.income_band} onChange={set("income_band")}><option value="">Prefer not to say</option>{[...new Set([...INCOME, ...(p.income_band ? [p.income_band] : [])])].map((i) => <option key={i}>{i}</option>)}</select></Lbl>
          <Lbl label="Address" className="sm:col-span-2 lg:col-span-5"><textarea className={`${field} min-h-[5rem]`} maxLength={400} value={f.address} onChange={set("address")} /></Lbl>
          <Lbl label="Emergency contact name"><input className={field} maxLength={150} value={f.emergency_name} onChange={set("emergency_name")} /></Lbl>
          <Lbl label="Emergency contact number"><input className={field} inputMode="tel" maxLength={30} value={f.emergency_phone} onChange={set("emergency_phone")} /></Lbl>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3">
          {done && <span role="status" className="mr-auto text-[13px] font-semibold text-emerald-700">{done}</span>}
          <button type="button" className={`${pill} !py-1.5`} onClick={() => { setF(formOf(p)); setDone(""); }}>Discard</button>
          <button type="submit" className={bluePill} disabled={act.busy}>{act.busy ? "Saving…" : "Save details"}</button>
        </div>
      </Panel>
      {mobile && <MobileChange onClose={() => setMobile(false)} onSent={() => { setMobile(false); setDone("Your request was sent to the school office."); }} />}
    </form>
  );
}

function MobileChange({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");
  const act = useAction(onSent);
  const send = () => void act.run(() => schoolFetch("/parent/profile/mobile", json("POST", { new_number: number, reason: reason || undefined })));
  return (
    <Modal open title="Request a mobile number change" onClose={onClose}>
      <ErrorBanner message={act.error} />
      <div className="space-y-3">
        <Lbl label="New mobile number"><input className={field} inputMode="tel" maxLength={30} value={number} onChange={(e) => setNumber(e.target.value)} /></Lbl>
        <Lbl label="Reason (optional)"><input className={field} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></Lbl>
        <p className="text-[12px] text-slate-500">The school office verifies the new number before it replaces the old one.</p>
        <div className="flex justify-end"><button type="button" className={bluePill} disabled={act.busy || number.replace(/\D/g, "").length < 10} onClick={send}>Send request</button></div>
      </div>
    </Modal>
  );
}

interface Kid { id: string; name: string; class_label: string; registration_no: string; roll_no: string; date_of_birth: string | null; gender: string; class_teacher: string; house: string; transport: string; mess: string; relation: string }
export function LinkedStudents() {
  const r = useGet<{ parent_id: string; classes: string[]; items: Kid[] }>("/parent/linked");
  const { setChild, school } = useParent();
  const router = useRouter();
  const blank = { name: "", admission_no: "", class_name: "" };
  const [f, setF] = useState(blank);
  const [done, setDone] = useState("");
  const act = useAction(() => undefined);
  return (
    <>
      <Head title="Linked Students" subtitle="Children linked to your parent account. Siblings in the same school share one login." />
      <Loaded r={r}>{(d) => (
        <>
          {!d.items.length && <Empty>No child is linked to your account yet.</Empty>}
          <div className="grid gap-3 lg:grid-cols-2">{d.items.map((k) => (
            <Panel key={k.id} title={k.name} sub={k.class_label} right={<button type="button" className={bluePill} onClick={() => { setChild(k.id); router.push(sectionHref("dashboard", "my-dashboard")); }}>Open dashboard</button>}>
              <div className="p-4"><Pairs rows={[["Admission no.", k.registration_no], ["Roll no.", k.roll_no], ["Date of birth", dmy(k.date_of_birth)], ["Gender", k.gender], ["Class teacher", k.class_teacher], ["House", k.house], ["Transport", k.transport || "Not using the school bus"],
                ["Mess", k.mess ? <span key="m" className="flex flex-wrap items-center gap-2"><Status value="Opted" />{k.mess}</span> : <Status key="m" value="Not opted" />], ["Relationship", k.relation], ["Link status", <Status key="l" value="Linked" />]]} /></div>
            </Panel>
          ))}</div>
          <Note>Have another child at {school.name}? Ask the school office to link them{d.parent_id ? <> to parent ID <b>{d.parent_id}</b></> : " to your account"}. They&apos;ll appear here with the same login.</Note>
          <form onSubmit={(e) => { e.preventDefault(); setDone(""); void act.run(async () => { await schoolFetch("/parent/linked", json("POST", { ...f, class_name: f.class_name || d.classes[0] || "" })); setF(blank); setDone("Your request was sent to the school office."); }); }}>
            <Panel title="Request to link another child">
              <ErrorBanner message={act.error} />
              <div className="grid gap-3.5 p-4 sm:grid-cols-3">
                <Lbl label="Child's name"><input className={field} required minLength={2} maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Lbl>
                <Lbl label="Admission number"><input className={field} required minLength={3} maxLength={100} value={f.admission_no} onChange={(e) => setF({ ...f, admission_no: e.target.value })} /></Lbl>
                <Lbl label="Class">{d.classes.length ? <select className={field} value={f.class_name || d.classes[0]} onChange={(e) => setF({ ...f, class_name: e.target.value })}>{d.classes.map((c) => <option key={c}>{c}</option>)}</select> : <input className={field} required maxLength={60} value={f.class_name} onChange={(e) => setF({ ...f, class_name: e.target.value })} />}</Lbl>
              </div>
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3">
                {done && <span role="status" className="mr-auto text-[13px] font-semibold text-emerald-700">{done}</span>}
                <button type="button" className={`${pill} !py-1.5`} onClick={() => { setF(blank); setDone(""); }}>Discard</button>
                <button type="submit" className={bluePill} disabled={act.busy}>Send request</button>
              </div>
            </Panel>
          </form>
        </>
      )}</Loaded>
    </>
  );
}

interface Consents { ready: boolean; note: string; parent: string; children: string; items: { key: string; label: string; note: string; locked: boolean; state: string }[] }
const RIGHTS: [string, "Access copy" | "Correction" | "Erasure" | "Grievance"][] = [["Get a copy of my data", "Access copy"], ["Correct my data", "Correction"], ["Erase data not needed", "Erasure"], ["Raise a grievance", "Grievance"]];
export function MyConsents() {
  const r = useGet<Consents>("/parent/consents");
  const act = useAction(r.reload);
  const [right, setRight] = useState<(typeof RIGHTS)[number] | null>(null);
  const [done, setDone] = useState("");
  return (
    <>
      <Head title="My Consents" subtitle="What you've agreed the school can do with your family's data, under India's Digital Personal Data Protection Act 2023. Change any choice at any time." />
      <Loaded r={r}>{(d) => (
        <>
          {!d.ready && <Note tone="amber">{d.note}</Note>}
          <ErrorBanner message={act.error} />
          <Panel title="My consents" sub={[d.parent, d.children ? `for ${d.children}` : ""].filter(Boolean).join(" · ")}>
            <ul className="divide-y divide-slate-100 px-4 py-1">{d.items.map((c) => (
              <li key={c.key} className="grid items-center gap-3 py-3 sm:grid-cols-[1fr_auto_minmax(0,45%)]">
                <div><p className="text-[12.5px] font-semibold text-slate-900">{c.label}</p><p className="text-[11.5px] text-slate-500">{c.note}</p></div>
                <Status value={c.state} />
                {c.locked ? <p className="text-[11.5px] text-slate-500">Can&apos;t be switched off while the service is used</p>
                  : <button type="button" disabled={act.busy || !d.ready} onClick={() => void act.run(() => schoolFetch("/parent/consents", json("POST", { key: c.key, choice: c.state === "Given" ? "Withdrawn" : "Given" })))} className={`w-full rounded-full border px-3 py-1 text-left text-[11.5px] font-semibold disabled:opacity-60 ${c.state === "Given" ? "border-slate-200 bg-white text-slate-900 hover:border-slate-400" : "border-[#026f9b] bg-[#026f9b] text-white hover:bg-[#014a67]"}`}>{c.state === "Given" ? "Withdraw" : "Give consent"}</button>}
              </li>
            ))}</ul>
          </Panel>
          <Panel title="Your rights">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">{RIGHTS.map((x) => <button key={x[1]} type="button" className={pill} onClick={() => { setDone(""); setRight(x); }}>{x[0]}</button>)}</div>
            <p className="px-4 py-3 text-[12.5px] text-slate-600">{done ? <span role="status" className="font-semibold text-emerald-700">{done}</span> : "Requests about your data go to the school office, which handles data protection for the school."}</p>
          </Panel>
        </>
      )}</Loaded>
      {right && <RightDialog label={right[0]} kind={right[1]} onClose={() => setRight(null)} onSent={(m) => { setRight(null); setDone(m); }} />}
    </>
  );
}

function RightDialog({ label, kind, onClose, onSent }: { label: string; kind: string; onClose: () => void; onSent: (message: string) => void }) {
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const need = kind !== "Access copy";
  const send = async () => {
    setBusy(true); setError("");
    try { const r = await schoolFetch<{ code?: string }>("/parent/rights", json("POST", { kind, details: details || undefined })); onSent(r.code ? `Grievance ${r.code} sent to the school.` : "Your request was sent to the school."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not send."); setBusy(false); }
  };
  return (
    <Modal open title={label} onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-3">
        <Lbl label={need ? "What do you need?" : "Anything to add? (optional)"}><textarea className={`${field} min-h-[5rem]`} maxLength={300} value={details} onChange={(e) => setDetails(e.target.value)} /></Lbl>
        <div className="flex justify-end"><button type="button" className={bluePill} disabled={busy || (need && details.trim().length < 3)} onClick={() => void send()}>Send request</button></div>
      </div>
    </Modal>
  );
}
